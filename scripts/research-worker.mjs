import path from "node:path";

import {
  buildDataSummary,
  closeDb,
  computeFirestoreAnalysis,
  getDb,
  getResearchJob,
  getResearchSnapshot,
  listQueuedResearchJobs,
  repoRoot,
  updateResearchJob,
  writeAnalysisArtifacts,
} from "./research-common.mjs";

function parseArgs(argv = []) {
  const out = {
    once: false,
    jobId: "",
    pollMs: 30000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--once") out.once = true;
    else if (arg === "--job") out.jobId = String(argv[index + 1] || "").trim();
    else if (arg === "--poll-ms") out.pollMs = Math.max(1000, Number(argv[index + 1]) || 30000);
  }
  return out;
}

function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupportedPolicyName(algorithm = "") {
  const normalized = String(algorithm || "").trim();
  if (normalized === "behavior_clone") return "behavior_clone";
  if (normalized === "reward_model") return "reward_model";
  if (normalized === "contextual_bandit") return "contextual_bandit";
  return "";
}

function extractAlgorithmMetrics(analysis, algorithm = "") {
  const supportedPolicy = getSupportedPolicyName(algorithm);
  const overallPolicies = Array.isArray(analysis?.policyComparisons)
    ? analysis.policyComparisons.filter(
        (row) => row.scope === "overall" && row.group_value === "overall",
      )
    : [];
  const overallOpe = Array.isArray(analysis?.opeSummary)
    ? analysis.opeSummary.filter(
        (row) => row.scope === "overall" && row.group_value === "overall",
      )
    : [];

  if (!supportedPolicy) {
    const fallback =
      overallPolicies.find((row) => row.policy_name === "contextual_bandit") || null;
    return {
      trainer_available: false,
      execution_mode: "analysis_only",
      note: `No dedicated trainer is registered in the local worker for "${algorithm}". Dataset exports were generated successfully.`,
      fallback_policy_name: fallback?.policy_name || "",
      fallback_mean_reward: fallback?.mean_reward ?? null,
      fallback_mean_regret: fallback?.mean_regret ?? null,
      fallback_optimal_rate: fallback?.optimal_rate ?? null,
    };
  }

  const policyRow =
    overallPolicies.find((row) => row.policy_name === supportedPolicy) || null;
  const opeRow = overallOpe.find((row) => row.policy_name === supportedPolicy) || null;

  return {
    trainer_available: true,
    execution_mode: "evaluation_worker",
    policy_name: supportedPolicy,
    mean_reward: policyRow?.mean_reward ?? null,
    mean_regret: policyRow?.mean_regret ?? null,
    optimal_rate: policyRow?.optimal_rate ?? null,
    mean_lift_vs_historical: policyRow?.mean_lift_vs_historical ?? null,
    ips: opeRow?.ips ?? null,
    snips: opeRow?.snips ?? null,
    direct_method: opeRow?.direct_method ?? null,
    doubly_robust: opeRow?.doubly_robust ?? null,
    fqe_one_step: opeRow?.fqe_one_step ?? null,
  };
}

async function processJob(db, job) {
  const jobId = String(job?.job_id || "").trim();
  const snapshotId = String(job?.dataset_snapshot_id || "").trim();
  if (!jobId || !snapshotId) return false;

  await updateResearchJob(db, jobId, {
    status: "running",
    started_at: new Date().toISOString(),
    error_summary: "",
  });

  try {
    const snapshot = await getResearchSnapshot(db, snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot "${snapshotId}" was not found.`);
    }
    if (!snapshot.job_runnable) {
      throw new Error(
        `Snapshot "${snapshotId}" is marked offline-only and cannot be executed by the Firestore worker.`,
      );
    }
    if (String(snapshot?.source_type || "") !== "firestore") {
      throw new Error(
        `Snapshot "${snapshotId}" is "${snapshot?.source_type || "unknown"}"; the worker currently supports Firestore-backed snapshots only.`,
      );
    }

    const descriptor = snapshot?.source_descriptor || {};
    const datasetRoot =
      String(descriptor?.dataset_root || snapshot?.dataset_root || "").trim() || "mainGame";
    const cohortField =
      String(descriptor?.cohort_field || "").trim() || "configuration";
    const storesId = String(descriptor?.stores_id || "").trim() || "store";
    const citiesId = String(descriptor?.cities_id || "").trim() || "cities";
    const studyProtocolId =
      String(descriptor?.study_protocol_id || "").trim() || "";

    const analysis = await computeFirestoreAnalysis({
      datasetRoot,
      cohortField,
      storesId,
      citiesId,
      studyProtocolId,
    });
    const outputDir = path.join(
      repoRoot,
      "data analysis",
      "research_jobs",
      jobId,
    );
    const artifactUris = await writeAnalysisArtifacts({
      outDir: outputDir,
      analysis,
      cohortField,
    });
    const summary = buildDataSummary(analysis, { days: 60 });
    const algorithmMetrics = extractAlgorithmMetrics(
      analysis,
      String(job?.algorithm || ""),
    );

    await updateResearchJob(db, jobId, {
      status: "completed",
      ended_at: new Date().toISOString(),
      metrics: {
        dataset_root: datasetRoot,
        snapshot_id: snapshotId,
        ...summary,
        algorithm: String(job?.algorithm || ""),
        algorithm_metrics: algorithmMetrics,
      },
      artifact_uris: artifactUris,
      error_summary: "",
    });
    return true;
  } catch (error) {
    await updateResearchJob(db, jobId, {
      status: "failed",
      ended_at: new Date().toISOString(),
      error_summary: error?.message || String(error),
    });
    return false;
  }
}

async function runOnce(options) {
  const db = await getDb();
  if (options.jobId) {
    const job = await getResearchJob(db, options.jobId);
    if (!job) {
      console.error(`Research job "${options.jobId}" was not found.`);
      return false;
    }
    return processJob(db, job);
  }

  const jobs = await listQueuedResearchJobs(db);
  if (jobs.length === 0) {
    console.log("No queued research jobs.");
    return true;
  }

  let allSucceeded = true;
  for (const job of jobs) {
    const succeeded = await processJob(db, job);
    allSucceeded = allSucceeded && succeeded;
  }
  return allSucceeded;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.once) {
    try {
      const ok = await runOnce(options);
      process.exitCode = ok ? 0 : 1;
      return;
    } finally {
      await closeDb();
    }
  }

  for (;;) {
    await runOnce(options);
    await sleep(options.pollMs);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
