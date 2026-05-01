import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applicationDefault, deleteApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..");
export const DEFAULT_FIREBASE_PROJECT_ID = "bundling-63c10";
export const RAW_FIRESTORE_EXPORT_SCHEMA_VERSION = "bundlegame_firestore_raw_export_v1";
export const PUBLICATION_FIRESTORE_EXPORT_SCHEMA_VERSION = "bundlegame_firestore_publication_export_v1";
export const ADMIN_EXPORT_APP_NAME = "bundlegame-admin-export";

export const TARGET_FIRESTORE_COLLECTIONS = [
  "MasterData",
  "Configs",
  "Users",
  "ResearchSnapshots",
  "ResearchJobs",
  "ResearchProtocols",
  "ResearchModels",
  "QualtricsResponses",
  "QualtricsSyncRuns",
  "LiveSessions",
  "PublicResults",
];

const RESULT_KEY_NAMES = new Set([
  "resultaccesskey",
  "result_access_key",
  "accesskey",
  "bundlegameresultcode",
  "resultcode",
  "result_code",
  "qualtricsresultcode",
  "qualtrics_result_code",
  "matchkey",
  "match_key",
  "qualtricsmatchkey",
  "qualtrics_match_key",
]);

const QUALTRICS_ID_NAMES = new Set([
  "qualtricsresponseid",
  "qualtrics_response_id",
  "responseid",
  "response_id",
  "qualtricsuserid",
  "qualtrics_user_id",
  "finishedid",
  "finished_id",
  "qualtricsfinishedid",
  "qualtrics_finished_id",
]);

const PARTICIPANT_ID_NAMES = new Set([
  "participantid",
  "participant_id",
  "userid",
  "user_id",
  "gameuserid",
  "game_user_id",
  "bundlegameuserid",
]);

const PERSON_NAME_NAMES = new Set([
  "displayname",
  "display_name",
  "studentname",
  "student_name",
  "firstname",
  "first_name",
  "lastname",
  "last_name",
  "fullname",
  "full_name",
  "email",
  "emailaddress",
  "email_address",
]);

const RAW_SURVEY_PAYLOAD_NAMES = new Set([
  "rawfields",
  "raw_fields",
  "rawfieldsjson",
  "raw_fields_json",
  "rawpayload",
  "raw_payload",
  "rawresponse",
  "raw_response",
  "surveyrawpayload",
  "survey_raw_payload",
]);

const FORBIDDEN_PUBLICATION_KEY_NAMES = new Set([
  ...RESULT_KEY_NAMES,
  ...QUALTRICS_ID_NAMES,
  ...PARTICIPANT_ID_NAMES,
  ...PERSON_NAME_NAMES,
  ...RAW_SURVEY_PAYLOAD_NAMES,
  "resultaccesskey",
  "live_session_id",
  "livesessionid",
  "sessionlabel",
  "session_label",
]);

function normalizeKey(value = "") {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

function parseEnvText(text = "") {
  const values = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) values[key] = value;
  }
  return values;
}

export async function loadDotEnv(rootDir = repoRoot) {
  const envPath = path.join(rootDir, ".env");
  let parsed = {};
  try {
    parsed = parseEnvText(await fs.readFile(envPath, "utf8"));
  } catch {
    parsed = {};
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) process.env[key] = value;
  }
  return parsed;
}

export function parseCliArgs(argv = []) {
  const options = {
    out: "",
    input: "",
    projectId: "",
    checkCredentials: false,
    timestamp: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      options.out = String(argv[index + 1] || "").trim();
      index += 1;
    } else if (arg === "--input") {
      options.input = String(argv[index + 1] || "").trim();
      index += 1;
    } else if (arg === "--project-id") {
      options.projectId = String(argv[index + 1] || "").trim();
      index += 1;
    } else if (arg === "--timestamp") {
      options.timestamp = String(argv[index + 1] || "").trim();
      index += 1;
    } else if (arg === "--check-credentials" || arg === "--check") {
      options.checkCredentials = true;
    }
  }
  return options;
}

export function resolveProjectId(projectId = "") {
  return (
    String(projectId || "").trim() ||
    String(process.env.FIREBASE_PROJECT_ID || "").trim() ||
    String(process.env.GOOGLE_CLOUD_PROJECT || "").trim() ||
    String(process.env.GCLOUD_PROJECT || "").trim() ||
    String(process.env.VITE_FIREBASE_PROJECT_ID || "").trim() ||
    DEFAULT_FIREBASE_PROJECT_ID
  );
}

function getKnownAdcPaths() {
  return [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(os.homedir(), ".config", "gcloud", "application_default_credentials.json"),
    path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "gcloud",
      "application_default_credentials.json",
    ),
  ].filter(Boolean);
}

async function fileExists(filename = "") {
  if (!filename) return false;
  try {
    const stat = await fs.stat(filename);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function getCredentialPreflight({
  requireFirebaseCredential = true,
  requirePseudonymSalt = false,
  projectId = "",
} = {}) {
  const resolvedProjectId = resolveProjectId(projectId);
  const serviceAccountPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  const serviceAccountExists = await fileExists(serviceAccountPath);
  const adcPath = (
    await Promise.all(getKnownAdcPaths().map(async (candidate) => [candidate, await fileExists(candidate)]))
  ).find(([candidate, exists]) => candidate !== serviceAccountPath && exists)?.[0] || "";
  const missing = [];

  if (serviceAccountPath && !serviceAccountExists) {
    missing.push(
      "GOOGLE_APPLICATION_CREDENTIALS is set, but the service-account JSON file was not found.",
    );
  } else if (requireFirebaseCredential && !serviceAccountExists && !adcPath) {
    missing.push(
      "Application Default Credentials are not configured. Run `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json`.",
    );
  }
  if (requirePseudonymSalt && !String(process.env.PUBLICATION_PSEUDONYM_SALT || "").trim()) {
    missing.push("PUBLICATION_PSEUDONYM_SALT is required for publication-safe Firestore exports.");
  }

  return {
    ok: missing.length === 0,
    projectId: resolvedProjectId,
    credentialMode: serviceAccountPath
      ? "GOOGLE_APPLICATION_CREDENTIALS"
      : adcPath
        ? "application_default_credentials_file"
        : "application_default_credentials_expected",
    serviceAccountPathConfigured: Boolean(serviceAccountPath),
    serviceAccountPathExists: serviceAccountExists,
    adcFileDetected: Boolean(adcPath),
    pseudonymSaltConfigured: Boolean(String(process.env.PUBLICATION_PSEUDONYM_SALT || "").trim()),
    missing,
  };
}

export function printCredentialReport(preflight, { includeSuccess = true } = {}) {
  if (includeSuccess) {
    console.log(`Firebase project id: ${preflight.projectId}`);
    console.log(`Credential mode: ${preflight.credentialMode}`);
    console.log(`Service account path configured: ${preflight.serviceAccountPathConfigured ? "yes" : "no"}`);
    console.log(`Service account file exists: ${preflight.serviceAccountPathExists ? "yes" : "no"}`);
    console.log(`ADC file detected: ${preflight.adcFileDetected ? "yes" : "no"}`);
    console.log(`Publication pseudonym salt configured: ${preflight.pseudonymSaltConfigured ? "yes" : "no"}`);
  }
  if (preflight.missing.length > 0) {
    console.log("Missing credentials/setup:");
    for (const item of preflight.missing) console.log(`- ${item}`);
  } else {
    console.log("Missing credentials/setup: none detected");
  }
}

export function initializeAdminFirestore({ projectId = "" } = {}) {
  const resolvedProjectId = resolveProjectId(projectId);
  const existing = getApps().find((app) => app.name === ADMIN_EXPORT_APP_NAME);
  const app = existing || initializeApp({
    credential: applicationDefault(),
    projectId: resolvedProjectId,
  }, ADMIN_EXPORT_APP_NAME);
  return {
    app,
    db: getFirestore(app),
    projectId: resolvedProjectId,
  };
}

export async function closeAdminApp(app) {
  if (!app) return;
  try {
    await deleteApp(app);
  } catch {
    // no-op: Firebase Admin throws if another caller already deleted it.
  }
}

export function makeTimestampId(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function serializeFirestoreValue(value) {
  if (value == null) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return { __type: "date", iso: value.toISOString() };
  if (Buffer.isBuffer(value)) return { __type: "bytes", base64: value.toString("base64") };
  if (value instanceof Uint8Array) {
    return { __type: "bytes", base64: Buffer.from(value).toString("base64") };
  }
  if (typeof value.toBase64 === "function") {
    return { __type: "bytes", base64: value.toBase64() };
  }
  if (
    typeof value.toDate === "function" &&
    (Number.isFinite(Number(value.seconds)) || Number.isFinite(Number(value._seconds)))
  ) {
    const seconds = Number(value.seconds ?? value._seconds);
    const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    return {
      __type: "timestamp",
      iso: value.toDate().toISOString(),
      seconds,
      nanoseconds,
    };
  }
  if (typeof value.latitude === "number" && typeof value.longitude === "number") {
    return {
      __type: "geo_point",
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }
  if (typeof value.path === "string" && value.firestore) {
    return {
      __type: "document_reference",
      path: value.path,
    };
  }
  if (Array.isArray(value)) return value.map((entry) => serializeFirestoreValue(entry));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeFirestoreValue(entry)]),
    );
  }
  return String(value);
}

async function countCollectionDocs(collectionRef) {
  try {
    const aggregate = await collectionRef.count().get();
    return {
      count: Number(aggregate.data().count || 0),
      method: "aggregate_count",
    };
  } catch {
    const snap = await collectionRef.get();
    return {
      count: snap.size,
      method: "snapshot_size",
    };
  }
}

export async function checkFirestoreConnection({
  projectId = "",
  collectionNames = TARGET_FIRESTORE_COLLECTIONS,
} = {}) {
  const { app, db, projectId: resolvedProjectId } = initializeAdminFirestore({ projectId });
  try {
    const collections = [];
    for (const collectionName of collectionNames) {
      try {
        const count = await countCollectionDocs(db.collection(collectionName));
        collections.push({
          collection: collectionName,
          ok: true,
          count: count.count,
          count_method: count.method,
        });
      } catch (error) {
        collections.push({
          collection: collectionName,
          ok: false,
          error_code: String(error?.code || ""),
          error_message: String(error?.message || error),
        });
      }
    }
    return {
      ok: collections.every((entry) => entry.ok),
      projectId: resolvedProjectId,
      collections,
    };
  } finally {
    await closeAdminApp(app);
  }
}

export async function exportCollectionRecursive(collectionRef) {
  const snap = await collectionRef.get();
  const documents = [];
  let nestedDocumentCount = 0;

  for (const docSnap of snap.docs) {
    const subcollectionRefs = (await docSnap.ref.listCollections()).sort((left, right) =>
      left.id.localeCompare(right.id),
    );
    const subcollections = {};
    for (const subcollectionRef of subcollectionRefs) {
      const subcollection = await exportCollectionRecursive(subcollectionRef);
      subcollections[subcollectionRef.id] = subcollection;
      nestedDocumentCount += subcollection.total_document_count;
    }
    documents.push({
      id: docSnap.id,
      path: docSnap.ref.path,
      data: serializeFirestoreValue(docSnap.data() || {}),
      subcollections,
    });
  }

  return {
    id: collectionRef.id,
    path: collectionRef.path,
    document_count: snap.size,
    nested_document_count: nestedDocumentCount,
    total_document_count: snap.size + nestedDocumentCount,
    documents,
  };
}

export async function exportFirestoreCollections({
  projectId = "",
  collectionNames = TARGET_FIRESTORE_COLLECTIONS,
  generatedAt = new Date().toISOString(),
} = {}) {
  const { app, db, projectId: resolvedProjectId } = initializeAdminFirestore({ projectId });
  try {
    const collections = {};
    for (const collectionName of collectionNames) {
      collections[collectionName] = await exportCollectionRecursive(db.collection(collectionName));
    }
    const collectionCounts = Object.fromEntries(
      Object.entries(collections).map(([name, collectionExport]) => [
        name,
        {
          documents: collectionExport.document_count,
          nested_documents: collectionExport.nested_document_count,
          total_documents: collectionExport.total_document_count,
        },
      ]),
    );
    return {
      schema_version: RAW_FIRESTORE_EXPORT_SCHEMA_VERSION,
      export_mode: "firestore_raw_export",
      generated_at: generatedAt,
      project_id: resolvedProjectId,
      target_collections: collectionNames,
      collection_counts: collectionCounts,
      collections,
    };
  } finally {
    await closeAdminApp(app);
  }
}

export async function writeFirestoreExportDirectory(exportData, outputDir) {
  const absoluteOutputDir = path.resolve(repoRoot, outputDir);
  const collectionsDir = path.join(absoluteOutputDir, "collections");
  await fs.mkdir(collectionsDir, { recursive: true });
  const collections = exportData.collections || {};
  const manifest = {
    ...exportData,
    collections: Object.fromEntries(
      Object.keys(collections).map((collectionName) => [
        collectionName,
        `collections/${collectionName}.json`,
      ]),
    ),
  };
  await fs.writeFile(
    path.join(absoluteOutputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  for (const [collectionName, collectionExport] of Object.entries(collections)) {
    await fs.writeFile(
      path.join(collectionsDir, `${collectionName}.json`),
      `${JSON.stringify(collectionExport, null, 2)}\n`,
      "utf8",
    );
  }
  return absoluteOutputDir;
}

export async function readFirestoreExportDirectory(inputDir) {
  const absoluteInputDir = path.resolve(repoRoot, inputDir);
  const manifest = JSON.parse(await fs.readFile(path.join(absoluteInputDir, "manifest.json"), "utf8"));
  const collections = {};
  for (const [collectionName, relativePath] of Object.entries(manifest.collections || {})) {
    collections[collectionName] = JSON.parse(
      await fs.readFile(path.join(absoluteInputDir, relativePath), "utf8"),
    );
  }
  return {
    ...manifest,
    collections,
  };
}

function hmacId(value = "", salt = "", prefix = "bgp") {
  const digest = crypto
    .createHmac("sha256", String(salt))
    .update(String(value || "missing"))
    .digest("hex")
    .slice(0, 16);
  return `${prefix}_${digest}`;
}

export function getPublicationPseudonym(participantId = "", salt = "") {
  if (!String(salt || "").trim()) {
    throw new Error("PUBLICATION_PSEUDONYM_SALT is required for publication-safe pseudonyms.");
  }
  return hmacId(participantId, salt, "bgp");
}

function walkValue(value, visitor, context = {}) {
  visitor(value, context);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkValue(entry, visitor, { ...context, key: String(index) }));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      walkValue(entry, visitor, { ...context, key });
    }
  }
}

function addString(set, value = "") {
  const normalized = String(value || "").trim();
  if (normalized.length >= 4) set.add(normalized);
}

function collectPathIdentifiers(pathValue = "", context) {
  const segments = String(pathValue || "").split("/").filter(Boolean);
  for (let index = 0; index < segments.length - 1; index += 1) {
    if (segments[index] === "Users" || segments[index] === "participants") {
      addString(context.participantIds, segments[index + 1]);
    }
    if (segments[index] === "QualtricsResponses") {
      addString(context.forbiddenValues, segments[index + 1]);
    }
  }
}

export function collectPublicationIdentifierContext(rawExport = {}, { pseudonymSalt = "" } = {}) {
  const context = {
    pseudonymSalt,
    participantIds: new Set(),
    forbiddenValues: new Set(),
    participantMap: new Map(),
  };

  walkValue(rawExport, (value, walkContext) => {
    const normalizedKey = normalizeKey(walkContext.key || "");
    if (normalizedKey === "path" && typeof value === "string") {
      collectPathIdentifiers(value, context);
    }
    if (typeof value !== "string" && typeof value !== "number") return;
    const stringValue = String(value).trim();
    if (!stringValue) return;
    if (PARTICIPANT_ID_NAMES.has(normalizedKey)) addString(context.participantIds, stringValue);
    if (
      QUALTRICS_ID_NAMES.has(normalizedKey) ||
      RESULT_KEY_NAMES.has(normalizedKey) ||
      PERSON_NAME_NAMES.has(normalizedKey)
    ) {
      addString(context.forbiddenValues, stringValue);
    }
  });

  for (const participantId of context.participantIds) {
    context.participantMap.set(participantId, getPublicationPseudonym(participantId, pseudonymSalt));
  }

  return context;
}

function replaceKnownDirectValues(value = "", context) {
  let next = String(value);
  const participantEntries = [...context.participantMap.entries()]
    .filter(([rawId]) => rawId.length >= 4)
    .sort((left, right) => right[0].length - left[0].length);
  for (const [rawId, pseudonym] of participantEntries) {
    next = next.replaceAll(rawId, pseudonym);
  }

  const forbiddenValues = [...context.forbiddenValues]
    .filter((entry) => entry.length >= 6)
    .sort((left, right) => right.length - left.length);
  for (const forbiddenValue of forbiddenValues) {
    next = next.replaceAll(forbiddenValue, hmacId(forbiddenValue, context.pseudonymSalt, "redacted"));
  }
  return next;
}

function sanitizeValueForPublication(value, context, key = "") {
  if (value == null) return value;
  if (typeof value === "string") return replaceKnownDirectValues(value, context);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((entry) => sanitizeValueForPublication(entry, context, key));
  if (typeof value === "object") return sanitizeObjectForPublication(value, context);
  return String(value);
}

function sanitizeObjectForPublication(object = {}, context) {
  const sanitized = {};
  for (const [key, value] of Object.entries(object || {})) {
    const normalizedKey = normalizeKey(key);
    if (
      RESULT_KEY_NAMES.has(normalizedKey) ||
      QUALTRICS_ID_NAMES.has(normalizedKey) ||
      PERSON_NAME_NAMES.has(normalizedKey) ||
      RAW_SURVEY_PAYLOAD_NAMES.has(normalizedKey)
    ) {
      continue;
    }
    if (PARTICIPANT_ID_NAMES.has(normalizedKey)) {
      sanitized.publication_participant_id = sanitizeValueForPublication(value, context, key);
      continue;
    }
    sanitized[key] = sanitizeValueForPublication(value, context, key);
  }
  return sanitized;
}

function sanitizeDocumentForPublication(documentExport = {}, context) {
  return {
    id: replaceKnownDirectValues(documentExport.id || "", context),
    path: replaceKnownDirectValues(documentExport.path || "", context),
    data: sanitizeObjectForPublication(documentExport.data || {}, context),
    subcollections: sanitizeCollectionsForPublication(documentExport.subcollections || {}, context),
  };
}

function sanitizeCollectionForPublication(collectionExport = {}, context) {
  const documents = (collectionExport.documents || []).map((documentExport) =>
    sanitizeDocumentForPublication(documentExport, context),
  );
  return {
    id: collectionExport.id || "",
    path: replaceKnownDirectValues(collectionExport.path || "", context),
    document_count: documents.length,
    nested_document_count: Number(collectionExport.nested_document_count || 0),
    total_document_count: Number(collectionExport.total_document_count || documents.length),
    documents,
  };
}

function sanitizeCollectionsForPublication(collections = {}, context) {
  return Object.fromEntries(
    Object.entries(collections || {}).map(([collectionName, collectionExport]) => [
      collectionName,
      sanitizeCollectionForPublication(collectionExport, context),
    ]),
  );
}

export function sanitizeFirestoreExportForPublication(rawExport = {}, {
  pseudonymSalt = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!String(pseudonymSalt || "").trim()) {
    throw new Error("PUBLICATION_PSEUDONYM_SALT is required for publication-safe Firestore exports.");
  }
  const context = collectPublicationIdentifierContext(rawExport, { pseudonymSalt });
  const collections = sanitizeCollectionsForPublication(rawExport.collections || {}, context);
  const collectionCounts = Object.fromEntries(
    Object.entries(collections).map(([name, collectionExport]) => [
      name,
      {
        documents: collectionExport.document_count,
        nested_documents: collectionExport.nested_document_count,
        total_documents: collectionExport.total_document_count,
      },
    ]),
  );
  const exportData = {
    schema_version: PUBLICATION_FIRESTORE_EXPORT_SCHEMA_VERSION,
    export_mode: "firestore_publication_safe_export",
    generated_at: generatedAt,
    source_export_mode: rawExport.export_mode || "",
    source_generated_at: rawExport.generated_at || "",
    project_id: rawExport.project_id || DEFAULT_FIREBASE_PROJECT_ID,
    redaction: "participant IDs replaced with salted pseudonyms; names, result keys/codes, Qualtrics IDs, match keys, and raw survey payloads removed",
    pseudonym_strategy: "HMAC-SHA256 over private PUBLICATION_PSEUDONYM_SALT, truncated to 16 hex chars",
    target_collections: rawExport.target_collections || Object.keys(collections),
    collection_counts: collectionCounts,
    collections,
  };
  const validation = validatePublicationSafeFirestoreExport(exportData, { rawExport, context });
  if (!validation.ok) {
    throw new Error(`Publication-safe Firestore export validation failed:\n${validation.errors.join("\n")}`);
  }
  return exportData;
}

export function validatePublicationSafeFirestoreExport(publicationExport = {}, { rawExport = {}, context = null } = {}) {
  const identifierContext = context || collectPublicationIdentifierContext(rawExport, {
    pseudonymSalt: process.env.PUBLICATION_PSEUDONYM_SALT || "validation_only",
  });
  const errors = [];

  walkValue(publicationExport, (value, walkContext) => {
    const normalizedKey = normalizeKey(walkContext.key || "");
    if (FORBIDDEN_PUBLICATION_KEY_NAMES.has(normalizedKey)) {
      errors.push(`Forbidden publication key remains: ${walkContext.key}`);
    }
    if (typeof value !== "string") return;
    for (const rawId of identifierContext.participantIds) {
      if (rawId.length >= 4 && value.includes(rawId)) {
        errors.push(`Direct participant identifier remains in publication export: ${rawId}`);
      }
    }
    for (const forbiddenValue of identifierContext.forbiddenValues) {
      if (forbiddenValue.length >= 6 && value.includes(forbiddenValue)) {
        errors.push(`Direct restricted identifier remains in publication export: ${forbiddenValue}`);
      }
    }
  });

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
  };
}
