import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeApp, getApps } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  terminate,
  where,
} from "firebase/firestore";

import {
  computeAnalytics,
  getAnalysisMasterExportColumns,
  getDecisionFactExportColumns,
  getHumanPolicyEvalExportColumns,
  getOpeSummaryExportColumns,
  getParticipantSurveyExportColumns,
  getPolicyComparisonExportColumns,
  getPolicyTrainingExportColumns,
  getRecommendationSummaryExportColumns,
  getRecommendationWorkbenchExportColumns,
  getSandboxSummaryExportColumns,
  getStudyRandomizationExportColumns,
} from "../src/lib/analysis/engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "..");

let firestoreDb = null;

function parseEnvText(text = "") {
  const values = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
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

function requireFirebaseConfig() {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
  for (const [key, value] of Object.entries(config)) {
    if (!String(value || "").trim()) {
      throw new Error(`Missing Firebase config: ${key}`);
    }
  }
  return config;
}

export async function getDb() {
  if (firestoreDb) return firestoreDb;
  await loadDotEnv();
  const firebaseConfig = requireFirebaseConfig();
  const app = getApps()[0] || initializeApp(firebaseConfig);
  firestoreDb = getFirestore(app);
  return firestoreDb;
}

export async function closeDb() {
  if (!firestoreDb) return;
  try {
    await terminate(firestoreDb);
  } catch {
    // no-op
  } finally {
    firestoreDb = null;
  }
}

async function getSubcollectionDocs(db, userId, subcollection) {
  const snap = await getDocs(collection(db, "Users", userId, subcollection));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
}

async function getCollectionDocs(db, collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
}

export async function retrieveParticipants(db) {
  const querySnapshot = await getDocs(collection(db, "Users"));
  const participants = [];

  for (const userDoc of querySnapshot.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data() || {};
    const [
      orders,
      actions,
      summaryDocs,
      progressDocs,
      legacyScenarioSetDocs,
      actionSummaryDocs,
      detailedActionSummaryDocs,
    ] = await Promise.all([
      getSubcollectionDocs(db, userId, "Orders"),
      getSubcollectionDocs(db, userId, "Actions"),
      getSubcollectionDocs(db, userId, "Summary"),
      getSubcollectionDocs(db, userId, "Progress"),
      getSubcollectionDocs(db, userId, "ScenarioSet"),
      getSubcollectionDocs(db, userId, "Action"),
      getSubcollectionDocs(db, userId, "DetailedAction"),
    ]);

    const summaryDoc = summaryDocs.find((entry) => entry.id === "summary") || null;
    const scenarioSetProgressDoc =
      progressDocs.find((entry) => entry.id === "progress") ||
      legacyScenarioSetDocs.find((entry) => entry.id === "progress") ||
      null;
    const scenarioActionsDoc =
      actionSummaryDocs.find((entry) => entry.id === "actions") || null;
    const scenarioDetailedActionsDoc =
      detailedActionSummaryDocs.find((entry) => entry.id === "actions") || null;

    participants.push({
      id: userId,
      ...userData,
      orders,
      actions,
      progressSummary: summaryDoc,
      summaryDoc,
      scenarioSetProgressDoc,
      scenarioActionsDoc,
      scenarioDetailedActionsDoc,
    });
  }

  return participants;
}

function normalizeMasterDataId(value = "") {
  return String(value || "").trim().replace(/\.json$/i, "");
}

function resolveDatasetRootFromId(id = "") {
  const normalized = normalizeMasterDataId(id);
  if (!normalized) return "";
  return normalized
    .replace(/(Scenarios|Orders|Optimal)(?=_|$)/gi, "")
    .replace(/(_scenarios|_orders|_optimal)$/i, "")
    .replace(/__+/g, "_")
    .replace(/^_|_$/g, "")
    .trim();
}

function getDatasetsMap(docData = {}) {
  return docData?.datasets && typeof docData.datasets === "object"
    ? docData.datasets
    : {};
}

export async function getScenarioDatasetBundle(db, datasetRoot = "mainGame") {
  const root = resolveDatasetRootFromId(datasetRoot);
  if (!root) return null;
  const snap = await getDoc(doc(db, "MasterData", "datasets"));
  if (!snap.exists()) return null;
  const datasets = getDatasetsMap(snap.data() || {});
  const entry = datasets[root];
  if (!entry || typeof entry !== "object") return null;
  return {
    scenarios: Array.isArray(entry.scenarios) ? entry.scenarios : [],
    orders: Array.isArray(entry.orders) ? entry.orders : [],
    optimal: Array.isArray(entry.optimal) ? entry.optimal : [],
    metadata: entry.metadata && typeof entry.metadata === "object" ? entry.metadata : {},
    type: entry.type ?? "",
    version: entry.version ?? 1,
  };
}

export async function getStoresData(db, storesId = "store") {
  const snap = await getDoc(doc(db, "MasterData", storesId));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return Array.isArray(data)
    ? { stores: data }
    : {
        ...data,
        stores: Array.isArray(data.stores) ? data.stores : [],
      };
}

export async function getCitiesData(db, citiesId = "cities") {
  const snap = await getDoc(doc(db, "MasterData", citiesId));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return {
    startinglocation: data.startinglocation ?? "",
    travelTimes: data.travelTimes ?? {},
  };
}

export async function getResearchSnapshot(db, snapshotId = "") {
  const normalizedId = String(snapshotId || "").trim();
  if (!normalizedId) return null;
  const snap = await getDoc(doc(db, "ResearchSnapshots", normalizedId));
  return snap.exists() ? { snapshot_id: snap.id, ...(snap.data() || {}) } : null;
}

export async function getResearchJob(db, jobId = "") {
  const normalizedId = String(jobId || "").trim();
  if (!normalizedId) return null;
  const snap = await getDoc(doc(db, "ResearchJobs", normalizedId));
  return snap.exists() ? { job_id: snap.id, ...(snap.data() || {}) } : null;
}

export async function listQueuedResearchJobs(db) {
  const jobsQuery = query(
    collection(db, "ResearchJobs"),
    where("status", "==", "queued"),
  );
  const snap = await getDocs(jobsQuery);
  return snap.docs
    .map((docSnap) => ({ job_id: docSnap.id, ...(docSnap.data() || {}) }))
    .sort((left, right) =>
      String(left?.created_at || "").localeCompare(String(right?.created_at || "")),
    );
}

export async function updateResearchJob(db, jobId = "", payload = {}) {
  const normalizedId = String(jobId || "").trim();
  if (!normalizedId) return null;
  const jobRef = doc(db, "ResearchJobs", normalizedId);
  const existing = await getDoc(jobRef);
  const next = {
    ...(existing.exists() ? existing.data() || {} : {}),
    ...payload,
    job_id: normalizedId,
    updated_at: new Date().toISOString(),
  };
  await setDoc(jobRef, next, { merge: true });
  return next;
}

function escapeCsvCell(value) {
  if (value == null) return "";
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function toCsv(rows = [], columns = []) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const fieldnames =
    Array.isArray(columns) && columns.length > 0
      ? columns
      : [...new Set(normalizedRows.flatMap((row) => Object.keys(row || {})))];
  if (fieldnames.length === 0) return "";
  return [
    fieldnames.join(","),
    ...normalizedRows.map((row) =>
      fieldnames
        .map((field) => `"${escapeCsvCell(row?.[field]).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
}

export async function writeAnalysisArtifacts({
  outDir,
  analysis,
  cohortField = "configuration",
} = {}) {
  const absoluteOutDir = path.resolve(repoRoot, outDir);
  await fs.mkdir(absoluteOutDir, { recursive: true });
  const writes = [
    [
      "decision_fact.csv",
      toCsv(analysis.decisionFacts, getDecisionFactExportColumns(cohortField)),
    ],
    [
      "analysis_master.csv",
      toCsv(
        analysis.analysisMasterRows,
        getAnalysisMasterExportColumns(cohortField, analysis.metadataFields || []),
      ),
    ],
    ["analysis_master.json", JSON.stringify({ rows: analysis.analysisMasterRows }, null, 2)],
    [
      "policy_training.csv",
      toCsv(
        analysis.policyTrainingRows,
        getPolicyTrainingExportColumns([cohortField, ...(analysis.metadataFields || [])]),
      ),
    ],
    [
      "study_randomization.csv",
      toCsv(
        analysis.studyRandomizationRows,
        getStudyRandomizationExportColumns(),
      ),
    ],
    [
      "participant_survey.csv",
      toCsv(
        analysis.participantSurveyRows,
        getParticipantSurveyExportColumns(),
      ),
    ],
    [
      "human_policy_eval.csv",
      toCsv(
        analysis.humanPolicyEvalRows,
        getHumanPolicyEvalExportColumns(),
      ),
    ],
    [
      "recommendation_workbench.csv",
      toCsv(
        analysis.recommendationWorkbenchRows,
        getRecommendationWorkbenchExportColumns(),
      ),
    ],
    [
      "recommendation_summary.csv",
      toCsv(
        analysis.recommendationSummary,
        getRecommendationSummaryExportColumns(),
      ),
    ],
    [
      "policy_comparison.csv",
      toCsv(analysis.policyComparisons, getPolicyComparisonExportColumns()),
    ],
    ["ope_summary.csv", toCsv(analysis.opeSummary, getOpeSummaryExportColumns())],
    [
      "sandbox_summary.csv",
      toCsv(analysis.sandboxSummary, getSandboxSummaryExportColumns()),
    ],
    ["dataset_snapshot.json", JSON.stringify(analysis.datasetSnapshot, null, 2)],
    ["paper_manifest.json", JSON.stringify(analysis.paperManifest, null, 2)],
    ["run_metadata.json", JSON.stringify(analysis.metadata, null, 2)],
  ];

  await Promise.all(
    writes.map(([filename, content]) =>
      fs.writeFile(path.join(absoluteOutDir, filename), content, "utf8"),
    ),
  );

  return writes.map(([filename]) => path.join(absoluteOutDir, filename));
}

export async function computeFirestoreAnalysis({
  datasetRoot = "mainGame",
  cohortField = "configuration",
  storesId = "store",
  citiesId = "cities",
  studyProtocolId = "",
} = {}) {
  const db = await getDb();
  const optionalCollection = async (collectionName) => {
    try {
      return await getCollectionDocs(db, collectionName);
    } catch (error) {
      if (String(error?.code || "") === "permission-denied") {
        return [];
      }
      throw error;
    }
  };
  const [participants, scenarioBundle, storeDataset, citiesDataset, protocols, models] = await Promise.all([
    retrieveParticipants(db),
    getScenarioDatasetBundle(db, datasetRoot),
    getStoresData(db, storesId),
    getCitiesData(db, citiesId),
    optionalCollection("ResearchProtocols"),
    optionalCollection("ResearchModels"),
  ]);

  if (!scenarioBundle) {
    throw new Error(`Dataset "${datasetRoot}" was not found in MasterData/datasets.`);
  }

  const normalizedStudyProtocolId = String(studyProtocolId || "").trim();
  const selectedProtocol =
    protocols.find(
      (entry) =>
        String(entry?.protocol_id || entry?.id || "").trim() ===
        normalizedStudyProtocolId,
    ) ||
    protocols.find(
      (entry) =>
        Boolean(entry?.enabled) &&
        (!String(entry?.dataset_root || "").trim() ||
          String(entry?.dataset_root || "").trim() === datasetRoot),
    ) ||
    null;

  return computeAnalytics({
    participants,
    scenarioBundle,
    datasetRoot,
    citiesDataset: citiesDataset || {},
    storeDataset: storeDataset || {},
    cohortField,
    metadataRows: [],
    metadataJoinOptions: {
      metadataJoinKey: "participant_id",
      metadataSessionKey: "",
    },
    studyProtocol: selectedProtocol,
    researchModels: models,
  });
}

function mean(values = []) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildRecentTimestampSummary(analysis, days = 60) {
  const cutoff = Date.now() - Math.max(1, Number(days) || 60) * 24 * 60 * 60 * 1000;
  const rows = (analysis?.analysisMasterRows || []).filter((row) => {
    if (String(row?.decision_source || "") !== "round_summary") return false;
    const timestamp = Date.parse(String(row?.decision_timestamp || ""));
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });

  return {
    days: Math.max(1, Number(days) || 60),
    participants: new Set(rows.map((row) => String(row?.participant_id || ""))).size,
    timestamped_decisions: rows.length,
    exact_optimal_rate: mean(rows.map((row) => Number(row?.is_exact_optimal) || 0)),
    failure_rate: mean(rows.map((row) => Number(row?.is_failure) || 0)),
    mean_score_ratio: mean(
      rows
        .map((row) => (row?.score_ratio_to_best == null ? null : Number(row.score_ratio_to_best)))
        .filter((value) => value != null),
    ),
    mean_regret: mean(
      rows
        .map((row) => (row?.percent_regret == null ? null : Number(row.percent_regret)))
        .filter((value) => value != null),
    ),
  };
}

export function buildDataSummary(analysis, { days = 60 } = {}) {
  const overall = analysis?.kpiOverall?.[0] || {};
  const overallRecommendation =
    (analysis?.recommendationSummary || []).find(
      (row) => row.scope === "overall" && row.group_value === "overall",
    ) || {};
  const overallPolicies = Object.fromEntries(
    (analysis?.policyComparisons || [])
      .filter((row) => row.scope === "overall" && row.group_value === "overall")
      .map((row) => [
        row.policy_name,
        {
          mean_reward: row.mean_reward,
          mean_regret: row.mean_regret,
          optimal_rate: row.optimal_rate,
          mean_lift_vs_historical: row.mean_lift_vs_historical,
        },
      ]),
  );

  return {
    dataset_root: analysis?.metadata?.dataset_root || "",
    snapshot_id: analysis?.datasetSnapshot?.snapshot_id || "",
    dataset_version: analysis?.datasetSnapshot?.dataset_version || "",
    feature_version: analysis?.metadata?.feature_version || "",
    paper_ready: Boolean(analysis?.datasetSnapshot?.qa_report?.paper_ready),
    benchmark_only_dataset: Boolean(analysis?.datasetSnapshot?.benchmark_only_dataset),
    blockers: analysis?.datasetSnapshot?.qa_report?.blockers || [],
    participants_loaded: analysis?.metadata?.input_counts?.participants || 0,
    decision_rows: analysis?.metadata?.input_counts?.decisions || 0,
    analysis_master_rows: analysis?.metadata?.input_counts?.analysis_master_rows || 0,
    policy_training_rows: analysis?.metadata?.input_counts?.policy_training_rows || 0,
    row_source_counts: analysis?.metadata?.data_health?.rowSourceCounts || {},
    timestamped_rows: analysis?.metadata?.data_health?.timestampedDecisionRows || 0,
    reconstructed_rows: analysis?.metadata?.data_health?.reconstructedDecisionRows || 0,
    overall_exact_optimal_rate: overall.exact_optimal_rate ?? null,
    overall_near_optimal_rate: overall.near_optimal_rate ?? null,
    overall_failure_rate: overall.failure_rate ?? null,
    overall_mean_score_ratio: overall.score_ratio_to_best_mean ?? null,
    overall_mean_regret: overall.percent_regret_mean ?? null,
    recommendation_mean_lift_vs_baseline:
      overallRecommendation.mean_predicted_lift_vs_baseline ?? null,
    recommendation_optimal_rate:
      overallRecommendation.recommended_optimal_rate ?? null,
    policies: overallPolicies,
    recent_timestamped_summary: buildRecentTimestampSummary(analysis, days),
  };
}
