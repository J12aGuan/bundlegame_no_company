import {
  buildDataSummary,
  closeDb,
  computeFirestoreAnalysis,
} from "./research-common.mjs";

function parseArgs(argv = []) {
  const options = {
    datasetRoot: "mainGame",
    days: 60,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dataset-root") {
      options.datasetRoot = String(argv[index + 1] || "mainGame").trim() || "mainGame";
    } else if (arg === "--days") {
      options.days = Math.max(1, Number(argv[index + 1]) || 60);
    } else if (arg === "--json") {
      options.json = true;
    }
  }

  return options;
}

function formatPct(value) {
  return value == null ? "-" : `${(Number(value) * 100).toFixed(1)}%`;
}

function formatNum(value, digits = 3) {
  return value == null ? "-" : Number(value).toFixed(digits);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const analysis = await computeFirestoreAnalysis({
      datasetRoot: options.datasetRoot,
      cohortField: "configuration",
    });
    const summary = buildDataSummary(analysis, { days: options.days });

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    console.log(`Dataset: ${summary.dataset_root}`);
    console.log(`Snapshot: ${summary.snapshot_id || "-"}`);
    console.log(`Version: ${summary.dataset_version || "-"}`);
    console.log(
      `Paper ready: ${summary.paper_ready ? "yes" : "no"} | Benchmark-only: ${
        summary.benchmark_only_dataset ? "yes" : "no"
      }`,
    );
    console.log(`Blockers: ${(summary.blockers || []).join(", ") || "-"}`);
    console.log(
      `Rows: ${summary.analysis_master_rows} master | ${summary.policy_training_rows} policy | ${summary.decision_rows} decisions`,
    );
    console.log(
      `Participants: ${summary.participants_loaded} | Timestamped: ${summary.timestamped_rows} | Reconstructed: ${summary.reconstructed_rows}`,
    );
    console.log(
      `Overall exact-optimal: ${formatPct(summary.overall_exact_optimal_rate)} | Near-optimal: ${formatPct(summary.overall_near_optimal_rate)} | Failure: ${formatPct(summary.overall_failure_rate)}`,
    );
    console.log(
      `Overall mean score ratio: ${formatNum(summary.overall_mean_score_ratio)} | Mean regret: ${formatPct(summary.overall_mean_regret)}`,
    );
    console.log(
      `Recommendation lift vs baseline: ${formatNum(summary.recommendation_mean_lift_vs_baseline)} | Recommendation optimal-rate: ${formatPct(summary.recommendation_optimal_rate)}`,
    );
    console.log(
      `${summary.recent_timestamped_summary.days}-day live summary: ${summary.recent_timestamped_summary.participants} participants | ${summary.recent_timestamped_summary.timestamped_decisions} timestamped decisions | exact-optimal ${formatPct(summary.recent_timestamped_summary.exact_optimal_rate)} | failure ${formatPct(summary.recent_timestamped_summary.failure_rate)}`,
    );
    console.log("Policies:");
    for (const [policyName, metrics] of Object.entries(summary.policies || {})) {
      console.log(
        `  - ${policyName}: reward ${formatNum(metrics.mean_reward)} | regret ${formatPct(metrics.mean_regret)} | optimal ${formatPct(metrics.optimal_rate)} | lift ${formatNum(metrics.mean_lift_vs_historical)}`,
      );
    }
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
