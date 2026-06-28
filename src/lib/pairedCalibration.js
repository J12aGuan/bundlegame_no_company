/**
 * Paired pilot -> 35-round aided calibration study (within-person link).
 *
 * One sitting, ONE participant token:
 *   part 1  "pilot_unaided"    : the 27 frozen-data menus, unaided, scored under the frozen pilot-era
 *                                inputs (Gate A: reproduces the frozen artifact exactly).
 *   part 2  "enriched35_aided" : the 35-round set, aided with DIRECTED TEACHING for everyone
 *                                (the marginal arm is forced; Gate B).
 *
 * The scientific value is the LINK between a person's two parts, so the identity marker is sacred:
 * every saved round-action row carries `study_id` + `study_part`, and the two parts must join by token
 * with zero orphans. This module is the single source of truth for that contract and is import-free
 * (pure) so it is unit-testable under `node --test` and callable from the runtime and from harnesses.
 */

export const PAIRED_STUDY_ID = "paired_calibration_v1";

export const PAIRED_PART_PILOT = "pilot_unaided";
export const PAIRED_PART_AIDED = "enriched35_aided";

// Straight-lining floor on per-decision deliberation time (thinkingTime), in seconds: flag (NEVER
// delete) decisions faster than this. Calibrated from the recovered pilot distribution (85
// participants / 1261 decisions; median 9.64s, ~0.08% under 2s, confirming the 10.8s ground truth).
// 3.0s is the 1st percentile of that distribution (the fastest ~1% of deliberations).
export const STRAIGHT_LINE_FLOOR_SECONDS = 3.0;

// Ordered plan: pilot first, then the aided 35-round set, in one continuous sitting.
export const PAIRED_PLAN = [
  {
    part: PAIRED_PART_PILOT,
    scenario_set: "paired_pilot_unaided_v1",
    aided: false,
    forced_arm: null, // unaided: no recommendation, no feedback
    reuse_comprehension_from: "pilot",
    reuse_exit_survey_from: "pilot",
  },
  {
    part: PAIRED_PART_AIDED,
    scenario_set: "paired_enriched35_aided_v1",
    aided: true,
    forced_arm: "marginal", // directed teaching for EVERY participant (Gate B)
    reuse_comprehension_from: null, // comprehension is gated once, before part 1
    reuse_exit_survey_from: "pilot",
  },
];

const findEntry = (key) =>
  PAIRED_PLAN.find((p) => p.part === key || p.scenario_set === key) || null;

/** The plan entry that serves this scenario_set id, or null if it is not a paired-study set. */
export function partForScenarioSet(scenarioSetId) {
  return PAIRED_PLAN.find((p) => p.scenario_set === String(scenarioSetId)) || null;
}

/** The next plan entry after `current` (a part id or scenario_set id), or null at the end. */
export function nextPart(current) {
  const i = PAIRED_PLAN.findIndex((p) => p.part === current || p.scenario_set === current);
  return i >= 0 && i < PAIRED_PLAN.length - 1 ? PAIRED_PLAN[i + 1] : null;
}

/** True when `current` is the last part (session completes after it). */
export function isFinalPart(current) {
  const i = PAIRED_PLAN.findIndex((p) => p.part === current || p.scenario_set === current);
  return i === PAIRED_PLAN.length - 1;
}

/** The arm that must be forced for `part` (or null to leave unaided / unforced). */
export function forcedArmForPart(part) {
  const e = findEntry(part);
  return e ? e.forced_arm : null;
}

/**
 * Stamp a round-action record with the study identity + phase marker. Returns a NEW object.
 * Both fields are on the firestore.rules participantRoundActionWrite allowlist; without them the
 * write is rejected by hasOnly and the row silently fails to persist.
 */
export function tagPairedRoundAction(record = {}, { part } = {}) {
  return { ...record, study_id: PAIRED_STUDY_ID, study_part: String(part || "") };
}

// --------------------------------------------------------------------------- //
// Analysis-time join + integrity (the Gate C invariants, as pure functions).  //
// --------------------------------------------------------------------------- //

const tokenOf = (r) => String(r?.participant_token ?? r?.userId ?? r?.token ?? "");

/** Group rows by token into { token, pilot:[], enriched35:[] }. */
export function joinPairedByToken(rows = []) {
  const byToken = new Map();
  for (const r of rows) {
    const tok = tokenOf(r);
    if (!tok) continue;
    const e = byToken.get(tok) || { token: tok, pilot: [], enriched35: [] };
    if (r.study_part === PAIRED_PART_PILOT) e.pilot.push(r);
    else if (r.study_part === PAIRED_PART_AIDED) e.enriched35.push(r);
    byToken.set(tok, e);
  }
  return byToken;
}

/**
 * Integrity report over a set of round-action rows.
 *  - completers      : tokens carrying BOTH parts (eligible for the paired analysis)
 *  - incomplete      : tokens with exactly one part (expected attrition; flagged, not deleted)
 *  - orphans         : tokens with one part but not the other (the linkage-regression signal;
 *                      with one-token-per-session this is IMPOSSIBLE unless the token changed)
 *  - non_monotonic   : token:part keys whose round indices are not strictly increasing
 *  - unmarked_rows    : rows missing a recognized study_part (must be zero)
 *  - clean           : no orphans, no non-monotonic parts, no unmarked rows
 */
export function pairedIntegrity(rows = []) {
  const joined = joinPairedByToken(rows);
  const orphans = [], incomplete = [], nonMonotonic = [];
  let completers = 0;
  for (const [tok, e] of joined) {
    const hasPilot = e.pilot.length > 0;
    const hasAided = e.enriched35.length > 0;
    if (hasPilot && hasAided) completers++;
    else { incomplete.push(tok); orphans.push(tok); }
    for (const part of ["pilot", "enriched35"]) {
      const idx = e[part]
        .map((r) => Number(r.round_index))
        .filter((n) => Number.isFinite(n));
      for (let i = 1; i < idx.length; i++) {
        if (idx[i] <= idx[i - 1]) { nonMonotonic.push(`${tok}:${part}`); break; }
      }
    }
  }
  const unmarkedRows = rows.filter(
    (r) => r.study_part !== PAIRED_PART_PILOT && r.study_part !== PAIRED_PART_AIDED,
  ).length;
  return {
    tokens: joined.size,
    completers,
    incomplete,
    orphans,
    non_monotonic: nonMonotonic,
    unmarked_rows: unmarkedRows,
    clean: orphans.length === 0 && nonMonotonic.length === 0 && unmarkedRows === 0,
  };
}

/**
 * Straight-lining flag (apply at analysis; never delete raw). A decision is implausibly fast if its
 * duration is below `minSecondsPerRound`, the per-round floor calibrated from the pilot's own decision
 * -time distribution (a low percentile). The floor is passed in so this stays pure; calibrate it once
 * from the pilot durations, then freeze.
 */
export function flagStraightLining(rows = [], { minSecondsPerRound = STRAIGHT_LINE_FLOOR_SECONDS } = {}) {
  if (!(minSecondsPerRound > 0)) return [];
  return rows
    .filter((r) => Number.isFinite(Number(r?.duration)) && Number(r.duration) < minSecondsPerRound)
    .map((r) => ({ token: tokenOf(r), study_part: r.study_part, round_index: r.round_index, duration: Number(r.duration) }));
}
