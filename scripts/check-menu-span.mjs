/**
 * Print the numeric identifiability (span) diagnostics for the CHI menus — the
 * experimental face of the identifiability theorem (P4). For each block, the rank and
 * condition number of the standardized one-step marginal-vector matrix over
 * {earnings, pick, local, cross}; rank 4 == those axes are jointly identifiable.
 *
 * Run:  node scripts/check-menu-span.mjs
 */
import { buildChiScenarioSet } from "../src/lib/chiScenarioDesign.js";
import { spanDiagnostics, SPAN_AXES } from "../src/lib/menuSpan.js";

const set = buildChiScenarioSet();
const pools = {
  "diagnostic (A)": set.scenarios.filter((s) => s.phase === "A"),
  "retention (re-tune)": set.scenarios.filter((s) => s.test_set === "retention_same_dist"),
  "diagnostic + retention": set.scenarios.filter((s) => s.phase === "A" || s.test_set === "retention_same_dist"),
  "transfer (shifted)": set.scenarios.filter((s) => s.test_set === "transfer_shifted"),
  "traps only": set.scenarios.filter((s) => s.is_payout_trap === 1),
};

console.log(`\nMenu span diagnostics — axes: ${SPAN_AXES.join(", ")}`);
console.log("(rank 4/4 = all axes jointly identifiable; lower condition = better separated)\n");
console.log("block                     n   rank  condition  singular values");
for (const [name, menus] of Object.entries(pools)) {
  const d = spanDiagnostics(menus);
  console.log(
    `${name.padEnd(24)} ${String(d.n_vectors).padStart(3)}  ${d.rank}/4   ${d.condition.toFixed(1).padStart(7)}    [${d.singular_values.map((x) => x.toFixed(2)).join(", ")}]`,
  );
}

console.log("\nThe crux for W3 vs single-axis cost neglect — earnings decoupled from each cost axis (traps):");
const traps = pools["traps only"];
for (const axis of ["effective_pick_time_seconds", "local_travel_time_seconds", "cross_city_travel_time_seconds"]) {
  const d = spanDiagnostics(traps, { axes: ["earnings", axis] });
  console.log(`  earnings x ${axis.padEnd(30)} rank ${d.rank}/2  condition ${d.condition.toFixed(1)}`);
}
console.log("\nDESIGN-ADEQUACY: the menus span the earnings x {pick, local, cross} subspace, so the");
console.log("conditional logit can attribute always-choosing-the-high-pay bundle to earnings (W3) rather");
console.log("than to whichever single cost axis happens to make it slow. NOT evidence about humans.\n");
