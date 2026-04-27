import { inflateRawSync } from "node:zlib";

import { collection, doc, setDoc } from "firebase/firestore";

import { closeDb, getDb, loadDotEnv } from "./research-common.mjs";
import { normalizeQualtricsResponsesFromCsv } from "../src/lib/qualtrics.js";

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_MAX_POLLS = 90;

function parseArgs(argv = []) {
  const options = {
    endpoint: "auto",
    startDate: "",
    endDate: "",
    dryRun: false,
    useLabels: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--endpoint") {
      options.endpoint = String(argv[index + 1] || "auto").trim() || "auto";
      index += 1;
    } else if (arg === "--start-date") {
      options.startDate = String(argv[index + 1] || "").trim();
      index += 1;
    } else if (arg === "--end-date") {
      options.endDate = String(argv[index + 1] || "").trim();
      index += 1;
    } else if (arg === "--use-labels") {
      options.useLabels = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    }
  }

  return options;
}

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizeDatacenterId(value = "") {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\.qualtrics\.com.*$/i, "")
    .replace(/\/.*$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResponseText(response) {
  try {
    return await response.text();
  } catch (_error) {
    return "";
  }
}

async function qualtricsJsonFetch(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-TOKEN": token,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await readResponseText(response);
    throw new Error(`Qualtrics request failed ${response.status} ${response.statusText}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function qualtricsFileFetch(url, token) {
  const response = await fetch(url, {
    headers: {
      "X-API-TOKEN": token,
    },
  });
  if (!response.ok) {
    const body = await readResponseText(response);
    throw new Error(`Qualtrics file download failed ${response.status} ${response.statusText}: ${body.slice(0, 500)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function getEndpoints(baseUrl, surveyId, endpointMode) {
  if (endpointMode === "legacy") {
    return {
      mode: "legacy",
      createUrl: `${baseUrl}/responseexports`,
      progressUrl: (progressId) => `${baseUrl}/responseexports/${encodeURIComponent(progressId)}`,
      fileUrl: (fileId) => `${baseUrl}/responseexports/${encodeURIComponent(fileId)}/file`,
    };
  }
  return {
    mode: "survey",
    createUrl: `${baseUrl}/surveys/${encodeURIComponent(surveyId)}/export-responses`,
    progressUrl: (progressId) => `${baseUrl}/surveys/${encodeURIComponent(surveyId)}/export-responses/${encodeURIComponent(progressId)}`,
    fileUrl: (fileId) => `${baseUrl}/surveys/${encodeURIComponent(surveyId)}/export-responses/${encodeURIComponent(fileId)}/file`,
  };
}

function buildExportBody({ surveyId, options, endpointMode }) {
  const body = {
    format: "csv",
    useLabels: Boolean(options.useLabels),
  };
  if (endpointMode === "legacy") {
    body.surveyId = surveyId;
  }
  if (options.startDate) body.startDate = options.startDate;
  if (options.endDate) body.endDate = options.endDate;
  return body;
}

function getProgressId(payload = {}) {
  return String(payload?.result?.progressId || payload?.result?.id || payload?.progressId || payload?.id || "").trim();
}

function getProgressState(payload = {}) {
  const result = payload?.result || payload || {};
  return {
    status: String(result.status || result.exportStatus || "").toLowerCase(),
    percentComplete: Number(result.percentComplete ?? result.percent ?? 0) || 0,
    fileId: String(result.fileId || result.fileID || result.id || "").trim(),
  };
}

async function createExportJob({ baseUrl, token, surveyId, options, endpointMode }) {
  const endpoints = getEndpoints(baseUrl, surveyId, endpointMode);
  const body = buildExportBody({ surveyId, options, endpointMode });
  const payload = await qualtricsJsonFetch(endpoints.createUrl, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const progressId = getProgressId(payload);
  if (!progressId) {
    throw new Error(`Qualtrics export response did not include a progress id: ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return {
    endpoints,
    progressId,
  };
}

async function createExportJobWithFallback({ baseUrl, token, surveyId, options }) {
  const requested = String(options.endpoint || "auto").toLowerCase();
  if (requested === "survey" || requested === "legacy") {
    return createExportJob({ baseUrl, token, surveyId, options, endpointMode: requested });
  }
  try {
    return await createExportJob({ baseUrl, token, surveyId, options, endpointMode: "survey" });
  } catch (error) {
    console.warn(`Survey export endpoint failed, trying legacy responseexports endpoint: ${error.message}`);
    return createExportJob({ baseUrl, token, surveyId, options, endpointMode: "legacy" });
  }
}

async function waitForExportFile({ endpoints, progressId, token }) {
  for (let attempt = 1; attempt <= DEFAULT_MAX_POLLS; attempt += 1) {
    const payload = await qualtricsJsonFetch(endpoints.progressUrl(progressId), token);
    const state = getProgressState(payload);
    if (state.fileId && (state.status === "complete" || state.status === "completed" || state.percentComplete >= 100)) {
      return state.fileId;
    }
    if (["failed", "error"].includes(state.status)) {
      throw new Error(`Qualtrics export failed while polling progress id ${progressId}.`);
    }
    await sleep(DEFAULT_POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for Qualtrics export progress id ${progressId}.`);
}

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function extractZipEntries(buffer) {
  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) throw new Error("Downloaded Qualtrics file looked like a zip, but no central directory was found.");
  const totalEntries = buffer.readUInt16LE(eocd + 10);
  let centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = [];

  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(centralOffset + 24);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer.slice(centralOffset + 46, centralOffset + 46 + nameLength).toString("utf8");

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Zip entry "${name}" has an invalid local header.`);
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.slice(dataStart, dataStart + compressedSize);
    let content;
    if (method === 0) {
      content = compressed;
    } else if (method === 8) {
      content = inflateRawSync(compressed);
    } else {
      throw new Error(`Zip entry "${name}" used unsupported compression method ${method}.`);
    }
    if (uncompressedSize && content.length !== uncompressedSize) {
      console.warn(`Zip entry "${name}" size mismatch; continuing with extracted content.`);
    }
    entries.push({ name, content });
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function responseFileToCsvText(buffer) {
  if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50) {
    const entries = extractZipEntries(buffer);
    const csvEntry = entries.find((entry) => /\.csv$/i.test(entry.name)) || entries[0];
    if (!csvEntry) throw new Error("Qualtrics zip file did not contain a response export file.");
    return csvEntry.content.toString("utf8");
  }
  return buffer.toString("utf8");
}

async function writeSyncRun(db, runId, payload = {}) {
  await setDoc(doc(collection(db, "QualtricsSyncRuns"), runId), {
    run_id: runId,
    ...payload,
  }, { merge: true });
}

async function writeResponses(db, responses = []) {
  await Promise.all(
    responses.map((response) =>
      setDoc(doc(collection(db, "QualtricsResponses"), response.id), response, { merge: true }),
    ),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await loadDotEnv();
  const apiToken = requireEnv("QUALTRICS_API_TOKEN");
  const surveyId = requireEnv("QUALTRICS_SURVEY_ID");
  const datacenterId = normalizeDatacenterId(requireEnv("QUALTRICS_DATACENTER_ID"));
  if (!datacenterId) throw new Error("QUALTRICS_DATACENTER_ID could not be normalized.");

  const baseUrl = `https://${datacenterId}.qualtrics.com/API/v3`;
  const runId = `qualtrics_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const startedAt = new Date().toISOString();
  const db = await getDb();

  await writeSyncRun(db, runId, {
    source: "qualtrics_api",
    status: "running",
    survey_id: surveyId,
    datacenter_id: datacenterId,
    endpoint: options.endpoint,
    started_at: startedAt,
    completed_at: "",
    error_summary: "",
  });

  try {
    const job = await createExportJobWithFallback({ baseUrl, token: apiToken, surveyId, options });
    const fileId = await waitForExportFile({ ...job, token: apiToken });
    const fileBuffer = await qualtricsFileFetch(job.endpoints.fileUrl(fileId), apiToken);
    const csvText = responseFileToCsvText(fileBuffer);
    const normalized = normalizeQualtricsResponsesFromCsv(csvText, {
      surveyId,
      source: "qualtrics_api",
      importedAt: new Date().toISOString(),
    });
    const completedRows = normalized.completed;

    if (!options.dryRun) {
      await writeResponses(db, completedRows);
    }

    const completedAt = new Date().toISOString();
    await writeSyncRun(db, runId, {
      status: "completed",
      completed_at: completedAt,
      endpoint: job.endpoints.mode,
      progress_id: job.progressId,
      file_id: fileId,
      response_count: normalized.rows.length,
      completed_response_count: completedRows.length,
      matched_response_count: normalized.matchReady.length,
      unmatched_response_count: normalized.unmatched.length,
      dry_run: options.dryRun,
      error_summary: "",
    });

    console.log(`Qualtrics sync completed${options.dryRun ? " (dry run)" : ""}.`);
    console.log(`Rows parsed: ${normalized.rows.length}`);
    console.log(`Completed responses: ${completedRows.length}`);
    console.log(`Match-ready responses: ${normalized.matchReady.length}`);
    console.log(`Unmatched responses: ${normalized.unmatched.length}`);
  } catch (error) {
    await writeSyncRun(db, runId, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error_summary: String(error?.message || error || "").slice(0, 1000),
    });
    throw error;
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
