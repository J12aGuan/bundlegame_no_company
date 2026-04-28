import fs from "node:fs/promises";
import path from "node:path";

import { collection, getDocs } from "firebase/firestore";

import { closeDb, getDb, loadDotEnv, retrieveParticipants, repoRoot } from "./research-common.mjs";
import {
  buildAdminScoreSheet,
  buildResearchExport,
  getAdminScoreClassAverageExportRows,
  getAdminScoreExportRows,
  validatePublicationExport,
} from "../src/lib/adminScores.js";
import { normalizeQualtricsResponseDocument } from "../src/lib/qualtrics.js";

function parseArgs(argv = []) {
  const options = {
    mode: "admin_scores",
    out: "",
    inputJson: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--mode") {
      options.mode = String(argv[index + 1] || "admin_scores").trim() || "admin_scores";
      index += 1;
    } else if (arg === "--out") {
      options.out = String(argv[index + 1] || "").trim();
      index += 1;
    } else if (arg === "--input-json") {
      options.inputJson = String(argv[index + 1] || "").trim();
      index += 1;
    }
  }
  return options;
}

function csvEscape(value) {
  if (value == null) return "";
  const stringValue = Array.isArray(value) || typeof value === "object"
    ? JSON.stringify(value)
    : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function normalizeMode(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (["score", "scores", "admin", "admin_scores"].includes(normalized)) return "admin_scores";
  if (["raw", "raw_research", "raw_research_export"].includes(normalized)) return "raw_research_export";
  if (["publication", "publication_export", "paper"].includes(normalized)) return "publication_export";
  throw new Error(`Unknown export mode: ${value}`);
}

function toCsv(rows = [], schemaColumns = []) {
  const columns = schemaColumns.length
    ? schemaColumns
    : [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row?.[column])).join(",")),
  ].join("\n");
}

function getClassAverageOutputPath(scoreOutputPath) {
  const parsed = path.parse(scoreOutputPath);
  const dateMatch = parsed.name.match(/(\d{4}-\d{2}-\d{2})$/);
  const filename = dateMatch
    ? `bundlegame-score-class-averages-${dateMatch[1]}${parsed.ext || ".csv"}`
    : `${parsed.name}-class-averages${parsed.ext || ".csv"}`;
  return path.join(parsed.dir, filename);
}

async function listQualtricsResponses(db) {
  const snap = await getDocs(collection(db, "QualtricsResponses"));
  return snap.docs.map((docSnap) => normalizeQualtricsResponseDocument(docSnap.id, docSnap.data()));
}

function normalizeInputPayload(payload = {}) {
  if (Array.isArray(payload)) {
    return { users: payload, qualtricsResponses: [] };
  }
  const users = Array.isArray(payload.users)
    ? payload.users
    : Array.isArray(payload.participants)
      ? payload.participants
      : Array.isArray(payload.data)
        ? payload.data
        : [];
  const qualtricsResponses = (
    Array.isArray(payload.qualtricsResponses)
      ? payload.qualtricsResponses
      : Array.isArray(payload.qualtrics_responses)
        ? payload.qualtrics_responses
        : []
  ).map((row) => normalizeQualtricsResponseDocument(row?.id, row));
  return { users, qualtricsResponses };
}

async function loadExportData(options = {}) {
  if (options.inputJson) {
    const inputPath = path.resolve(repoRoot, options.inputJson);
    const payload = JSON.parse(await fs.readFile(inputPath, "utf8"));
    return normalizeInputPayload(payload);
  }

  const db = await getDb();
  const [users, qualtricsResponses] = await Promise.all([
    retrieveParticipants(db),
    listQualtricsResponses(db),
  ]);
  return { users, qualtricsResponses };
}

async function writeResearchExport(exportData, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, `${exportData.export_mode}.json`),
    `${JSON.stringify(exportData, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(outputDir, "schema.json"),
    `${JSON.stringify({
      schema_version: exportData.schema_version,
      export_mode: exportData.export_mode,
      schemas: exportData.schemas,
      redaction: exportData.redaction,
      pseudonym_strategy: exportData.pseudonym_strategy,
    }, null, 2)}\n`,
    "utf8",
  );
  for (const [tableName, rows] of Object.entries(exportData.tables || {})) {
    await fs.writeFile(
      path.join(outputDir, `${tableName}.csv`),
      `${toCsv(rows, exportData.schemas?.[tableName] || [])}\n`,
      "utf8",
    );
  }
}

async function main() {
  await loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  const mode = normalizeMode(options.mode);
  const { users, qualtricsResponses } = await loadExportData(options);

  if (mode === "raw_research_export" || mode === "publication_export") {
    const exportData = buildResearchExport(users, qualtricsResponses, {
      mode,
      pseudonymSalt: process.env.PUBLICATION_PSEUDONYM_SALT || "",
    });
    if (mode === "publication_export") {
      const validation = validatePublicationExport(exportData);
      if (!validation.ok) {
        throw new Error(`Publication export validation failed:\n${validation.errors.join("\n")}`);
      }
    }
    const outputDir = path.resolve(
      repoRoot,
      options.out || `data analysis/${mode}-${new Date().toISOString().slice(0, 10)}`,
    );
    await writeResearchExport(exportData, outputDir);
    console.log(`Wrote ${mode} to ${outputDir}`);
    for (const [tableName, count] of Object.entries(exportData.row_counts || {})) {
      console.log(`${tableName}: ${count} rows`);
    }
    return;
  }

  const scoreSheet = buildAdminScoreSheet(users, qualtricsResponses);
  const rows = getAdminScoreExportRows(scoreSheet.rows, scoreSheet.maxRound);
  const averageRows = getAdminScoreClassAverageExportRows(scoreSheet.classAverages);
  const outputPath = path.resolve(
    repoRoot,
    options.out || `data analysis/bundlegame-scores-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  const classAverageOutputPath = getClassAverageOutputPath(outputPath);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${toCsv(rows)}\n`, "utf8");
  await fs.writeFile(classAverageOutputPath, `${toCsv(averageRows)}\n`, "utf8");

  console.log(`Wrote ${rows.length} score rows to ${outputPath}`);
  console.log(`Wrote class averages to ${classAverageOutputPath}`);
  console.log(`Completed game runs: ${scoreSheet.stats.completedGameCount}`);
  console.log(`Completed Qualtrics responses: ${scoreSheet.stats.qualtricsResponseCount}`);
  console.log(`Missing Qualtrics match: ${scoreSheet.stats.missingQualtricsCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
