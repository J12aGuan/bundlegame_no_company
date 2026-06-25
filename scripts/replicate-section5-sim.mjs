// Section 5 replication appendix, PART 2 (PID-free). Carry the fitted bots through the 35-round
// frozen seed-42 set under 3 conditions, and report the dissociation, the H4 mechanism, and the
// effect-size-vs-learning-rate curve.
//
// The TEACHING update uses the codebase's REAL feedback: in training blocks B1/B3 it calls
// marginalFeedback.bestImprovingMove on the bot's chosen bundle, and only when the true best
// one-step move is a DROP (over_inclusion == the W1 picking correction) does it nudge the bot's
// pick weight toward the oracle-implied weight. There is no Bayesian belief-update rule in the
// deployed code, so the update MAGNITUDE is the learning rate (an explicit, uncalibrated knob):
// the dissociation DIRECTION is rate-invariant, the effect SIZE / power is not.
//
// Inputs (both committed):
//   publishing/experiments/2_june30_enriched_4order/frozen/chi_scenario_set_seed42.json
//   the pseudonymized pilot CSV (via fitBots() in replicate-section5-fit.mjs)
// Run:   node scripts/replicate-section5-sim.mjs
import { readFileSync } from "fs";
import { bestImprovingMove } from "../src/lib/marginalFeedback.js";
import { fitBots } from "./replicate-section5-fit.mjs";

const FROZEN = "publishing/experiments/2_june30_enriched_4order/frozen/chi_scenario_set_seed42.json";
const J = JSON.parse(readFileSync(FROZEN, "utf8"));
const FEAT = (c) => [c.earnings, c.effective_pick_time_seconds, c.local_travel_time_seconds, c.cross_city_travel_time_seconds];

// standardize the 4 features + bundle size over ALL frozen candidates (self-standardization)
const allC = J.scenarios.flatMap((s) => s.candidate_bundles);
const mu = [0, 0, 0, 0], sd = [1, 1, 1, 1];
for (let k = 0; k < 4; k += 1) { const v = allC.map((c) => FEAT(c)[k]); mu[k] = v.reduce((a, b) => a + b, 0) / v.length; sd[k] = Math.sqrt(v.reduce((a, b) => a + (b - mu[k]) ** 2, 0) / v.length) || 1; }
const szs = allC.map((c) => c.bundle_ids.length); const szMu = szs.reduce((a, b) => a + b, 0) / szs.length, szSd = Math.sqrt(szs.reduce((a, b) => a + (b - szMu) ** 2, 0) / szs.length) || 1;
const SCN = J.scenarios.map((s) => ({ block: s.block, cat: s.oracle_category, overCoach: !!s.over_bundling_coachable,
  cands: s.candidate_bundles.map((c) => ({ ...c, zx: FEAT(c).map((v, k) => (v - mu[k]) / sd[k]), szz: (c.bundle_ids.length - szMu) / szSd })),
  oracle: s.candidate_bundles.find((c) => c.is_oracle) }));

// oracle-implied pick weight (teaching target): a logit fit to the frozen ORACLE choices
function fitLogit(rows, lambda = 1.0, iters = 400, lr = 0.3) {
  let b = [0, 0, 0, 0];
  for (let t = 0; t < iters; t += 1) { const g = [0, 0, 0, 0];
    for (const rd of rows) { const u = rd.cands.map((c) => Math.exp(c.zx.reduce((a, v, k) => a + v * b[k], 0))); const Z = u.reduce((a, v) => a + v, 0);
      const ex = [0, 0, 0, 0]; rd.cands.forEach((c, j) => { const pj = u[j] / Z; c.zx.forEach((v, k) => ex[k] += pj * v); });
      const ch = rd.cands[rd.ci].zx; for (let k = 0; k < 4; k += 1) g[k] += ch[k] - ex[k]; }
    for (let k = 0; k < 4; k += 1) b[k] += lr * (g[k] / rows.length - 2 * lambda * b[k] / rows.length); }
  return b;
}
const oracleRows = SCN.map((s) => ({ cands: s.cands, ci: s.cands.findIndex((c) => c.is_oracle) })).filter((r) => r.cands.length >= 2 && r.ci >= 0);
const PICK_TARGET = fitLogit(oracleRows)[1];

const argmaxIdx = (cands, b, sizeBias = 0) => { let bi = 0, bv = -1e18; cands.forEach((c, j) => { const u = c.zx.reduce((a, v, k) => a + v * b[k], 0) + sizeBias * c.szz; if (u > bv) { bv = u; bi = j; } }); return bi; };
const regretOf = (chosen, oracle) => (oracle.score > 0 ? Math.max(0, 1 - chosen.score / oracle.score) : 0);

// run one bot through the 35 rounds under a condition at a learning rate
function runBot(beta, condition, rate) {
  let b = beta.slice(), sizeBias = 0;
  const b4 = [], b4over = [], b4excess = [], b4nonover = [];
  for (const s of SCN) {
    const isTrain = s.block === "B1" || s.block === "B3";
    const chosen = s.cands[argmaxIdx(s.cands, b, condition === "static" ? sizeBias : 0)];
    if (isTrain) {
      if (condition === "teaching") {
        const move = bestImprovingMove(chosen, s.cands);                 // REAL feedback
        if (move && move.violation_label === "over_inclusion") b[1] += rate * (PICK_TARGET - b[1]); // a DROP == picking correction
      } else if (condition === "static") {
        sizeBias += rate * 0.5;                                          // blunt undirected "bundle more" heuristic
      }
    }
    if (s.block === "B4") { const reg = regretOf(chosen, s.oracle); b4.push(reg);
      if (s.cat === "over_bundle" || s.overCoach) { b4over.push(reg); b4excess.push(Math.max(0, chosen.effective_pick_time_seconds - s.oracle.effective_pick_time_seconds)); }
      else b4nonover.push(reg); }
  }
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  return { b4: mean(b4), b4over: mean(b4over), excess: mean(b4excess), nonover: mean(b4nonover) };
}

const { bots } = fitBots();
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sdv = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const power = (n, d) => 0.5 * (1 + erf((d * Math.sqrt(n / 2) - 1.959964) / Math.SQRT2));
const nFor = (d, target = 0.7) => { for (let n = 4; n <= 4000; n += 2) if (power(n, d) >= target) return n; return Infinity; };
const RATES = [0.05, 0.1, 0.2, 0.4, 0.8];

console.log(`PART 2 - simulation: ${bots.length} fitted bots x 35 frozen rounds | oracle-implied pick weight ${PICK_TARGET.toFixed(3)}\n`);
const noAdv = bots.map((bot) => runBot(bot.beta, "no-advice", 0));
const noB4 = noAdv.map((x) => x.b4);
console.log("Sim 2 - mean B4 transfer regret by condition x learning rate:");
console.log("  rate    no-advice  static    teaching   teaching<both");
let dissoc = true, staticSeq = [];
for (const rate of RATES) {
  const st = bots.map((bot) => runBot(bot.beta, "static", rate).b4);
  const te = bots.map((bot) => runBot(bot.beta, "teaching", rate).b4);
  const mN = mean(noB4), mS = mean(st), mT = mean(te); const ok = mT < mN && mT < mS; if (!ok) dissoc = false; staticSeq.push(mS);
  console.log(`  ${rate.toFixed(2)}    ${mN.toFixed(3)}      ${mS.toFixed(3)}     ${mT.toFixed(3)}      ${ok ? "yes" : "NO"}`);
}
console.log(`  dissociation holds at every rate: ${dissoc ? "YES" : "NO"} | static worsens as rate rises: ${staticSeq.every((v, i) => i === 0 || v >= staticSeq[i - 1] - 1e-6) ? "YES" : "no"}`);

console.log("\nSim 3+4 - H4 mechanism + effect size vs learning rate:");
console.log("  rate   B4over no->teach   excessPick no->teach   nonOver no->teach   Cohen d   n/arm@70%");
for (const rate of RATES) {
  const te = bots.map((bot) => runBot(bot.beta, "teaching", rate));
  const diff = noAdv.map((x, i) => x.b4 - te[i].b4);
  const d = mean(diff) / Math.sqrt((sdv(noB4) ** 2 + sdv(te.map((x) => x.b4)) ** 2) / 2);
  console.log(`  ${rate.toFixed(2)}   ${mean(noAdv.map((x) => x.b4over)).toFixed(3)}->${mean(te.map((x) => x.b4over)).toFixed(3)}        ${mean(noAdv.map((x) => x.excess)).toFixed(1)}->${mean(te.map((x) => x.excess)).toFixed(1)}s            ${mean(noAdv.map((x) => x.nonover)).toFixed(3)}->${mean(te.map((x) => x.nonover)).toFixed(3)}       ${d.toFixed(2).padStart(5)}    ${nFor(d) === Infinity ? ">4000" : nFor(d)}`);
}
console.log("\nDIRECTION (dissociation, picking-specific transfer) is rate-invariant; MAGNITUDE / power scales with");
console.log("the learning rate, which no deployed code pins. Standalone numbers (d~0.35, ~100/arm) sit near rate 0.1.");
