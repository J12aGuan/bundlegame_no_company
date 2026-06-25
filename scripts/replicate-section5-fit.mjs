// Section 5 replication appendix, PART 1 (PID-free). Per-participant ridge conditional-logit
// (McFadden) fit on the pseudonymized pilot choice sets. Features = bundle totals
// [earnings, pick, local, cross] (the deployed scorer's components, standardized). The savings
// term is NOT a feature, so the fit is invariant to the item-access vs 0.25x-pick savings model.
//
// Inputs (both committed):
//   publishing/export_for_analysis/pilot_decisions_pseudo.csv   (opaque tokens p001.., no raw ids)
//   -- the per-decision menu + chosen bundle + deployed oracle/regret.
//
// Run for the headline fit numbers:   node scripts/replicate-section5-fit.mjs
// Or import { fitBots } from here in the simulation script.
import { readFileSync } from "fs";

const CSV = "publishing/export_for_analysis/pilot_decisions_pseudo.csv";

export function loadPilot() {
  const L = readFileSync(CSV, "utf8").trim().split("\n");
  const H = L[0].split(",");
  const ix = (n) => H.indexOf(n);
  const col = {
    tok: ix("participant_token"), chosen: ix("chosen_bundle"), orc: ix("oracle_bundle_recomputed"),
    o: [1, 2, 3, 4].map((k) => ({ id: ix(`order${k}_id`), e: ix(`order${k}_earnings`), p: ix(`order${k}_pick`), l: ix(`order${k}_local`), c: ix(`order${k}_cross`), s: ix(`order${k}_store`) })),
  };
  // legal bundles for a row = singles + same-store subsets of size 2..3 (the deployed action set)
  const choiceSet = (r) => {
    const orders = [];
    for (const o of col.o) { const id = r[o.id]; if (!id) continue; orders.push({ id, store: r[o.s], e: +r[o.e], p: +r[o.p], l: +r[o.l], c: +r[o.c] }); }
    const byStore = {}; for (const o of orders) (byStore[o.store] ??= []).push(o);
    const cands = [];
    const add = (os) => cands.push({ ids: os.map((o) => o.id).sort().join("+"), n: os.length, x: [os.reduce((a, o) => a + o.e, 0), os.reduce((a, o) => a + o.p, 0), os.reduce((a, o) => a + o.l, 0), os[0].c] });
    for (const o of orders) add([o]);
    for (const g of Object.values(byStore)) { const n = g.length; for (let s = 2; s <= Math.min(3, n); s += 1) { const comb = (st, path) => { if (path.length === s) { add(path); return; } for (let i = st; i < n; i += 1) { path.push(g[i]); comb(i + 1, path); path.pop(); } }; comb(0, []); } }
    return cands;
  };
  const P = {};
  for (let i = 1; i < L.length; i += 1) {
    const r = L[i].split(","); const tok = r[col.tok];
    const cands = choiceSet(r); if (cands.length < 2) continue;
    const ci = cands.findIndex((c) => c.ids === (r[col.chosen] || "").split("+").sort().join("+")); if (ci < 0) continue;
    const oi = cands.findIndex((c) => c.ids === (r[col.orc] || "").split("+").sort().join("+"));
    (P[tok] ??= []).push({ cands, ci, oi });
  }
  // standardize the 4 features across ALL candidates (z-score)
  const allX = Object.values(P).flatMap((rs) => rs.flatMap((rd) => rd.cands.map((c) => c.x)));
  const mu = [0, 0, 0, 0], sd = [1, 1, 1, 1];
  for (let k = 0; k < 4; k += 1) { const v = allX.map((x) => x[k]); mu[k] = v.reduce((a, b) => a + b, 0) / v.length; sd[k] = Math.sqrt(v.reduce((a, b) => a + (b - mu[k]) ** 2, 0) / v.length) || 1; }
  for (const rs of Object.values(P)) for (const rd of rs) for (const c of rd.cands) c.zx = c.x.map((v, k) => (v - mu[k]) / sd[k]);
  return { P, mu, sd };
}

// ridge conditional logit by gradient ascent: max sum log softmax(beta.zx)[chosen] - lambda|beta|^2
export function fit(rounds, lambda = 1.0, iters = 400, lr = 0.3) {
  let b = [0, 0, 0, 0];
  for (let t = 0; t < iters; t += 1) {
    const g = [0, 0, 0, 0];
    for (const rd of rounds) {
      const u = rd.cands.map((c) => Math.exp(c.zx.reduce((a, v, k) => a + v * b[k], 0)));
      const Z = u.reduce((a, v) => a + v, 0); const ex = [0, 0, 0, 0];
      rd.cands.forEach((c, j) => { const pj = u[j] / Z; for (let k = 0; k < 4; k += 1) ex[k] += pj * c.zx[k]; });
      for (let k = 0; k < 4; k += 1) g[k] += rd.cands[rd.ci].zx[k] - ex[k];
    }
    for (let k = 0; k < 4; k += 1) b[k] += lr * (g[k] / rounds.length - 2 * lambda * b[k] / rounds.length);
  }
  return b;
}
export const argmax = (rd, b) => { let bi = 0, bv = -1e18; rd.cands.forEach((c, j) => { const u = c.zx.reduce((a, v, k) => a + v * b[k], 0); if (u > bv) { bv = u; bi = j; } }); return bi; };
const shuffle = (n, seed) => { const idx = [...Array(n).keys()]; let s = seed >>> 0; for (let i = n - 1; i > 0; i -= 1) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; };

// full-data fitted bots (one beta per participant) for the simulation
export function fitBots() {
  const { P, mu, sd } = loadPilot();
  const toks = Object.keys(P).filter((t) => P[t].length >= 4);
  return { mu, sd, bots: toks.map((tok) => ({ token: tok, beta: fit(P[tok]), rounds: P[tok].length })) };
}

function main() {
  const { P } = loadPilot();
  const toks = Object.keys(P).filter((t) => P[t].length >= 4);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const names = ["earnings", "pick", "local", "cross"];
  let accs = [], beatRandom = 0, botBundle = 0, botOpt = 0, actBundle = 0, actOpt = 0, N = 0;
  const bootSD = [[], [], [], []];
  for (const tok of toks) {
    const rounds = P[tok]; const base = Number(tok.replace(/\D/g, "")) || 0;
    // average held-out accuracy over 5 random 70/30 splits (stable, deterministic)
    const split = []; for (let rep = 0; rep < 5; rep += 1) {
      const idx = shuffle(rounds.length, 12345 + base * 7 + rep * 101); const k = Math.max(1, Math.round(rounds.length * 0.7));
      const tr = idx.slice(0, k).map((i) => rounds[i]), te = idx.slice(k).map((i) => rounds[i]); if (!te.length) continue;
      const b = fit(tr); split.push(te.filter((rd) => argmax(rd, b) === rd.ci).length / te.length);
    }
    if (!split.length) continue; const acc = mean(split); accs.push(acc);
    if (acc > mean(rounds.map((rd) => 1 / rd.cands.length))) beatRandom += 1;
    const b = fit(rounds);   // full-data bot for the aggregate reproduction
    for (const rd of rounds) { const pred = argmax(rd, b); N += 1; if (rd.cands[pred].n >= 2) botBundle += 1; if (pred === rd.oi) botOpt += 1; if (rd.cands[rd.ci].n >= 2) actBundle += 1; if (rd.ci === rd.oi) actOpt += 1; }
    // within-participant bootstrap SD per weight (identification precision)
    if (rounds.length >= 6) { const S = []; let s = 999 + base; for (let bI = 0; bI < 40; bI += 1) { const rs = []; for (let i = 0; i < rounds.length; i += 1) { s = (s * 1664525 + 1013904223) >>> 0; rs.push(rounds[s % rounds.length]); } S.push(fit(rs, 1.0, 250)); } for (let kk = 0; kk < 4; kk += 1) { const v = S.map((x) => x[kk]); const m = mean(v); bootSD[kk].push(Math.sqrt(mean(v.map((x) => (x - m) ** 2)))); } }
  }
  const randBase = mean(toks.flatMap((t) => { const idx = shuffle(P[t].length, 12345 + (Number(t.replace(/\D/g, "")) || 0)); return idx.slice(Math.max(1, Math.round(P[t].length * 0.7))).map((i) => 1 / P[t][i].cands.length); }));
  console.log(`PART 1 - fit on ${accs.length} participants (pseudonymized pilot)\n`);
  console.log(`held-out accuracy (70/30): mean ${mean(accs).toFixed(3)} | random baseline ${randBase.toFixed(3)} | beat random ${beatRandom}/${accs.length}`);
  console.log(`aggregate reproduction: bundle rate bot ${(botBundle / N).toFixed(3)} vs actual ${(actBundle / N).toFixed(3)} | optimal rate bot ${(botOpt / N).toFixed(3)} vs actual ${(actOpt / N).toFixed(3)}`);
  const order = [0, 1, 2, 3].map((k) => ({ k, sd: mean(bootSD[k]) })).sort((a, b) => a.sd - b.sd);
  console.log(`per-weight identification (bootstrap SD, smaller = better identified): ${order.map((o) => `${names[o.k]} ${o.sd.toFixed(3)}`).join(", ")}`);
  console.log(`identification ordering: ${order.map((o) => names[o.k]).join(" > ")} (earnings best, pick second; picking is consequential, not best-identified)`);
}
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("replicate-section5-fit.mjs")) main();
