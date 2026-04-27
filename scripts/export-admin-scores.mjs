import fs from "node:fs/promises";
import path from "node:path";

import { collection, getDocs } from "firebase/firestore";

import { closeDb, getDb, retrieveParticipants, repoRoot } from "./research-common.mjs";
import {
  buildAdminScoreSheet,
  getAdminScoreClassAverageExportRows,
  getAdminScoreExportRows,
} from "../src/lib/adminScores.js";
import { normalizeQualtricsResponseDocument } from "../src/lib/qualtrics.js";

function parseArgs(argv = []) {
  const options = {
    out: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      options.out = String(argv[index + 1] || "").trim();
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

function toCsv(rows = []) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = await getDb();
  const [users, qualtricsResponses] = await Promise.all([
    retrieveParticipants(db),
    listQualtricsResponses(db),
  ]);
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
