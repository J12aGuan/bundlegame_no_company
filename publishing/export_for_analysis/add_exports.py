#!/usr/bin/env python3
"""
Supplementary BundleGame exports to defend that observed suboptimality is a real
decision-quality phenomenon (not indifference, not rushing/inattention).

ADDS new files to publishing/export_for_analysis/ WITHOUT modifying or recomputing any
existing output. Uses the SAME de-identified user_id as export.py (so
user_id + round_index + scenario_id join the new files to rounds/candidates),
and never invents or imputes: if a field is not in Firestore it is emitted as an
empty column and noted in DATA_DICTIONARY.md.

New files:
  events.csv            - one row per UI interaction (DetailedAction timeline)
  deliberation_round.csv- one row per (user,round): effort/edit aggregates
  round_timing.csv      - one row per (user,round): session-relative timing
  scenario_design.csv   - one row per scenario_id (all 50): design intent + provenance
  survey.csv            - one row per surveyed user (de-identified Qualtrics)
  sessions.csv          - one row per user: session covariates (device fields null = not logged)
  practice_rounds.csv   - header-only (no practice/tutorial rounds were logged)
  scoring_and_oracle.txt- exact source functions for score / time / oracle
  pick_time_rule.txt    - exact source rule for per-item pick time + shared savings

Run:
  python publishing/export_for_analysis/add_exports.py
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PUBLISHING_DIR = HERE.parent
REPO = PUBLISHING_DIR.parent
RAW = HERE / "_raw_pull"
sys.path.insert(0, str(HERE))

import firestore_pull as fp  # auth + fetch helpers (read-only)
from export import DEFAULT_PSEUDONYM_SALT, hash_user_id, jdump, phase_for_round, round_or_none  # noqa: E402

SALT = os.environ.get("BUNDLEGAME_PSEUDONYM_SALT", DEFAULT_PSEUDONYM_SALT)


def uid(raw_id: str) -> str:
    return hash_user_id(str(raw_id), SALT)


# --------------------------------------------------------------------------- #
# Caching live pulls (DetailedAction, Qualtrics) so reruns are reproducible.   #
# --------------------------------------------------------------------------- #
def pull_supplementary():
    fp.load_dotenv()
    proj = fp.project_id()
    token = fp.sign_in_email_password().get("idToken", "")
    if fp.decode_claims(token).get("admin") is not True:
        raise RuntimeError("signed-in account lacks admin=true; cannot read /Users.")

    det_path = RAW / "detailed_actions.json"
    qual_path = RAW / "qualtrics_raw.json"

    if det_path.exists():
        detailed = json.loads(det_path.read_text(encoding="utf-8"))
    else:
        users = fp.list_collection(proj, "Users", token)
        detailed = {}
        for i, u in enumerate(users, 1):
            doc = fp.get_document(proj, f"Users/{u['id']}/DetailedAction/actions", token)
            if doc:
                detailed[u["id"]] = doc.get("detailedActionsByScenarioSetVersionId", {})
            if i % 25 == 0:
                print(f"[pull] DetailedAction {i}/{len(users)}")
        det_path.write_text(json.dumps(detailed), encoding="utf-8")

    if qual_path.exists():
        qualtrics = json.loads(qual_path.read_text(encoding="utf-8"))
    else:
        qualtrics = fp.list_collection(proj, "QualtricsResponses", token)
        qual_path.write_text(json.dumps(qualtrics), encoding="utf-8")
    print(f"[pull] detailed users={len(detailed)} qualtrics={len(qualtrics)}")
    return detailed, qualtrics


def write_csv(path: Path, columns, rows):
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: ("" if r.get(c) is None else r.get(c)) for c in columns})


# --------------------------------------------------------------------------- #
# Time parsing for the DetailedAction game clock ("HH:MM:SS.s", session-rel).  #
# --------------------------------------------------------------------------- #
def clock_ms(value) -> float | None:
    s = str(value or "").strip()
    if not s:
        return None
    m = re.match(r"^(\d+):(\d+):(\d+(?:\.\d+)?)$", s)
    if not m:
        return None
    h, mi, se = m.groups()
    return (int(h) * 3600 + int(mi) * 60 + float(se)) * 1000.0


EVENT_TYPE_MAP = {
    "select_order": "order_add",
    "deselect_order": "order_remove",
    "confirm_order": "submit",
    "try_again": "reset",
    # everything else maps to "other"; raw_action_type preserves the exact source.
}
DECISION_ADD = "select_order"
DECISION_REMOVE = "deselect_order"
DECISION_SUBMIT = "confirm_order"


def iter_scenario_timelines(detailed):
    """Yield (raw_uid, scenario_id, [events]) for every logged scenario."""
    for raw_uid, by_version in detailed.items():
        for _ver, entry in (by_version or {}).items():
            for sid, e in (entry.get("actionsByScenarioId") or {}).items():
                tl = e.get("timeline") or []
                if tl:
                    yield raw_uid, str(sid), tl


# --------------------------------------------------------------------------- #
# Builders.                                                                    #
# --------------------------------------------------------------------------- #
def build_events_and_deliberation(detailed, scenario_round):
    events_rows = []
    delib_rows = []
    timing_rows = []
    for raw_uid, sid, tl in iter_scenario_timelines(detailed):
        round_index = scenario_round.get(sid)
        # sort by start time, keep original order on ties
        parsed = []
        for ev in tl:
            t0 = clock_ms(ev.get("startTime"))
            parsed.append((t0, ev))
        parsed = [p for p in parsed if p[0] is not None]
        parsed.sort(key=lambda p: p[0])
        if not parsed:
            continue
        round_start = parsed[0][0]

        n_add = n_remove = n_edits = n_think = 0
        think_ms = 0.0
        first_action_ms = None
        submit_ms = None
        sel = set()
        considered = set()
        for idx, (t0, ev) in enumerate(parsed):
            at = str(ev.get("actionType") or "")
            tt = str(ev.get("targetType") or "")
            tid = str(ev.get("targetId") or "")
            order_id = tid if tt == "order" else ""
            events_rows.append({
                "user_id": uid(raw_uid),
                "round_index": round_index,
                "scenario_id": sid,
                "event_index": idx,
                "event_type": EVENT_TYPE_MAP.get(at, "other"),
                "raw_action_type": at,
                "target_type": tt,
                "order_id": order_id,
                "client_timestamp_ms": round(t0, 1),
                "ms_since_round_start": round(t0 - round_start, 1),
            })
            if at == DECISION_ADD:
                n_add += 1; n_edits += 1
                if order_id:
                    sel.add(order_id)
                considered.add(frozenset(sel))
                if first_action_ms is None:
                    first_action_ms = t0 - round_start
            elif at == DECISION_REMOVE:
                n_remove += 1; n_edits += 1
                sel.discard(order_id)
                considered.add(frozenset(sel))
                if first_action_ms is None:
                    first_action_ms = t0 - round_start
            elif at == DECISION_SUBMIT and submit_ms is None:
                submit_ms = t0 - round_start
            elif at == "thinking":
                n_think += 1
                e1 = clock_ms(ev.get("endTime"))
                if e1 is not None:
                    think_ms += max(0.0, e1 - t0)

        considered.discard(frozenset())
        delib_rows.append({
            "user_id": uid(raw_uid), "round_index": round_index, "scenario_id": sid,
            "n_add_events": n_add, "n_remove_events": n_remove,
            "n_edits_before_submit": n_edits,
            "n_distinct_bundles_considered": len(considered),
            "time_to_first_action_ms": round(first_action_ms, 1) if first_action_ms is not None else None,
            "time_to_submit_ms": round(submit_ms, 1) if submit_ms is not None else None,
            "n_thinking_events": n_think,
            "thinking_ms": round(think_ms, 1),
        })
        timing_rows.append({
            "user_id": uid(raw_uid), "round_index": round_index, "scenario_id": sid,
            "round_start_ms_session": round(round_start, 1),
            "submit_ms_session": round(parsed[-1][0], 1),
        })
    return events_rows, delib_rows, timing_rows


def build_round_timing(participants, scenario_round, timing_session):
    """Merge session-relative timing (from events) with round_summary duration
    and the per-scenario idle time from Action/actions timeSummary."""
    sess = {(r["user_id"], r["scenario_id"]): r for r in timing_session}
    rows = []
    for p in participants:
        raw_uid = str(p.get("id", ""))
        hid = uid(raw_uid)
        # idle from compact Action summary
        idle_by_sid = {}
        sad = p.get("scenarioActionsDoc") or {}
        for _ver, entry in (sad.get("actionsByScenarioSetVersionId") or {}).items():
            for sid, e in (entry.get("actionsByScenarioId") or {}).items():
                ts = e.get("timeSummary") if isinstance(e, dict) else None
                if isinstance(ts, dict):
                    idle_by_sid[str(sid)] = ts.get("idleOrOtherTime")
        for a in (p.get("actions") or []):
            if a.get("type") != "round_summary":
                continue
            try:
                ri = int(a.get("round_index"))
            except Exception:
                continue
            sid = str(a.get("scenario_id") or "")
            s = sess.get((hid, sid), {})
            rows.append({
                "user_id": hid,
                "round_index": ri,
                "scenario_id": sid,
                "phase": str(a.get("phase") or phase_for_round(ri)),
                "duration_s": round_or_none(a.get("duration"), 3),
                "round_start_ms_session": s.get("round_start_ms_session"),
                "submit_ms_session": s.get("submit_ms_session"),
                "active_ms": None,  # tab-focus time is NOT logged in Firestore
                "idle_ms": (round(float(idle_by_sid[sid]) * 1000, 1)
                            if idle_by_sid.get(sid) is not None else None),
            })
    return rows


def build_scenario_design(sb, scenario_round, commit):
    meta = sb.get("metadata", {})
    by_id = {str(o["id"]): o for o in sb.get("orders", [])}
    rows = []
    for sc in sb.get("scenarios", []):
        sid = str(sc.get("scenario_id", ""))
        r = scenario_round.get(sid)
        ords = [by_id.get(o, {}) for o in sc.get("order_ids", [])]
        stores = [o.get("store") for o in ords if o.get("store")]
        cities = [o.get("city") for o in ords if o.get("city")]
        # The generator's only structured axis is the per-round city rule
        # (odd round -> random/fair target city; even round -> anchored to prev best).
        city_rule = "random_fair_target_city" if (r and r % 2 == 1) else "anchored_to_prev_best_city"
        rows.append({
            "scenario_id": sid,
            "round_index": r,
            "phase": phase_for_round(r) if r else "",
            "intended_difficulty": None,         # generator does not target difficulty
            "trap_designed": False,              # generator does not design traps
            "trap_target_amount": None,
            "dispersion_designed": True,         # varied via the city rule (below)
            "overlap_designed": False,           # store overlap is NOT controlled
            "generator_city_rule": city_rule,
            "realized_n_distinct_stores": len(set(stores)),
            "realized_n_distinct_cities": len(set(cities)),
            "rng_seed": meta.get("seed"),
            "scenario_set_version_id": meta.get("scenarioSetVersionId"),
            "generator_schema_version": meta.get("generatorSchemaVersion"),
            "reward_model_version": meta.get("rewardModelVersion"),
            "route_optimizer_version": meta.get("routeOptimizerVersion"),
            "legal_bundle_model_version": meta.get("legalBundleModelVersion"),
            "source_file": "src/lib/scripts/generateScenarios.js",
            "source_commit": commit,
        })
    rows.sort(key=lambda x: (x["round_index"] or 0))
    return rows


PII_SUBSTRINGS = (
    "name", "email", "recipient", "ipaddress", "ip_address", "location",
    "latitude", "longitude", "finishedid", "responseid", "response_id",
    "match", "result", "user_key", "userkey", "student", "externaldata",
    "distributionchannel", "startdate", "enddate", "recordeddate", "userid",
    "user_id", "survey_id", "surveyid",
)
# Free-text fields withheld pending PII review (per DATA_SCHEMA governance).
FREE_TEXT_KEYS = {"post_strategy", "post_besttip", "feedback"}


def _is_pii_key(k: str) -> bool:
    kl = k.lower()
    return any(p in kl for p in PII_SUBSTRINGS)


def _scrub(value):
    """Value-level safety: never emit anything containing an email address."""
    if isinstance(value, str) and "@" in value:
        return None
    return value


def build_survey(qualtrics, game_ids):
    # Decide which raw_fields keys are safe to export (numeric / short-categorical,
    # not PII, not free-text), based on observed value types across all docs.
    field_vals: dict[str, list] = {}
    for d in qualtrics:
        rf = d.get("raw_fields")
        if isinstance(rf, str):
            try:
                rf = json.loads(rf)
            except Exception:
                rf = None
        if isinstance(rf, dict):
            for k, v in rf.items():
                field_vals.setdefault(k, []).append(v)
    safe_keys, withheld = [], []
    for k, vals in field_vals.items():
        if _is_pii_key(k) or k in FREE_TEXT_KEYS:
            withheld.append(k); continue
        maxlen = max((len(str(v)) for v in vals if v is not None), default=0)
        # Structured codes / Likert labels / Qualtrics choice objects are <= ~40
        # chars here; genuine open free-text (strategy, feedback) is 500-750 chars.
        if maxlen <= 40:
            safe_keys.append(k)
        else:
            withheld.append(k)
    safe_keys.sort()

    rows = []
    for d in qualtrics:
        suid = str(d.get("user_id") or "")
        if suid not in game_ids:
            continue  # only rows that join to a logged game participant
        rf = d.get("raw_fields")
        if isinstance(rf, str):
            try:
                rf = json.loads(rf)
            except Exception:
                rf = {}
        rf = rf if isinstance(rf, dict) else {}
        row = {
            "user_id": uid(suid),
            "survey_finished": int(bool(d.get("finished"))),
            "survey_progress": d.get("progress"),
            "survey_duration_seconds": d.get("duration_seconds"),
            # Requested derived fields we cannot fill WITHOUT inventing -> left blank:
            "self_reported_strategy_text": None,   # WITHHELD: free-text, PII review required
            "perceived_difficulty": None,          # WITHHELD: Q->construct map needs Qualtrics codebook
            "perceived_effort": None,              # WITHHELD: same
            "comprehension_check_passed": None,    # WITHHELD: answer key not in Firestore
            "attention_check_passed": None,        # WITHHELD: answer key not in Firestore
        }
        for k in safe_keys:
            row[f"survey_q_{k}"] = _scrub(rf.get(k))
        rows.append(row)
    base_cols = ["user_id", "survey_finished", "survey_progress", "survey_duration_seconds",
                 "self_reported_strategy_text", "perceived_difficulty", "perceived_effort",
                 "comprehension_check_passed", "attention_check_passed"]
    cols = base_cols + [f"survey_q_{k}" for k in safe_keys]
    return cols, rows, withheld


def build_sessions(participants, scenario_set_version_id):
    rows = []
    for p in participants:
        raw_uid = str(p.get("id", ""))
        summ_map = (p.get("summaryDoc") or p.get("progressSummary") or {}).get(
            "summaryByScenarioSetVersionId", {})
        entry = summ_map.get(scenario_set_version_id) or (
            next(iter(summ_map.values()), {}) if len(summ_map) == 1 else {})
        n_done = entry.get("roundsCompleted")
        total = entry.get("totalRounds")
        completed = entry.get("completedGame")
        rows.append({
            "user_id": uid(raw_uid),
            "device_type": None,      # not logged in Firestore
            "browser": None,          # not logged
            "screen_size": None,      # not logged
            "local_time_of_day": None,  # withheld (would require raw wall-clock timestamp)
            "total_session_ms": (round(float(entry.get("totalGameTime")) * 1000)
                                 if entry.get("totalGameTime") is not None else None),
            "n_rounds_completed": int(n_done) if isinstance(n_done, (int, float)) else None,
            "dropout": (int(not bool(completed)) if completed is not None else None),
            "quality_flag_completed_game_mismatch": (
                int(bool(completed) and isinstance(n_done, (int, float))
                    and isinstance(total, (int, float)) and n_done < total)
                if completed is not None else None),
        })
    return rows


# --------------------------------------------------------------------------- #
# Source-function extraction for the .txt deliverables (faithful to source).   #
# --------------------------------------------------------------------------- #
def extract_js_function(src: str, name: str) -> str:
    m = re.search(rf"(?m)^(export\s+)?function\s+{re.escape(name)}\s*\(", src)
    if not m:
        return f"// [not found in source: {name}]\n"
    start = m.start()
    # Match the parameter-list parens first so default params like `= {}` don't
    # prematurely terminate the body brace-matching.
    p = src.index("(", m.end() - 1)
    depth = 0
    i = p
    while i < len(src):
        if src[i] == "(":
            depth += 1
        elif src[i] == ")":
            depth -= 1
            if depth == 0:
                break
        i += 1
    body = src.index("{", i)  # first brace after the closing param paren = body
    depth = 0
    for j in range(body, len(src)):
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0:
                return src[start:j + 1] + "\n"
    return src[start:] + "\n"


def extract_consts(src: str, names) -> str:
    out = []
    for n in names:
        m = re.search(rf"(?m)^.*\b{re.escape(n)}\b\s*=.*$", src)
        if m:
            out.append(m.group(0).strip())
    return "\n".join(out) + ("\n" if out else "")


def write_source_txts(commit: str):
    bt = (REPO / "src/lib/bundleTime.js").read_text(encoding="utf-8")
    gen = (REPO / "src/lib/scripts/generateScenarios.js").read_text(encoding="utf-8")
    tm = (PUBLISHING_DIR / "data_analysis/analytics_v1/analytics/model/time_model.py").read_text(encoding="utf-8")

    header = (
        "BundleGame scoring / completion-time / oracle — EXACT SERVER-SIDE SOURCE\n"
        f"Extracted verbatim at commit {commit}. Do not edit by hand.\n"
        "Provenance: src/lib/bundleTime.js, src/lib/scripts/generateScenarios.js,\n"
        "and the mirrored offline reference publishing/data_analysis/analytics_v1/analytics/model/time_model.py\n"
        + "=" * 78 + "\n\n"
    )
    soo = header
    soo += "## (a) BUNDLE SCORE  (src/lib/scripts/generateScenarios.js)\n\n"
    soo += extract_js_function(gen, "scoreBundleSequence")
    soo += "\n" + extract_js_function(gen, "scoreBundleBestSequence")
    soo += "\n## (b) COMPLETION TIME = pick + local + cross-city - shared savings  (src/lib/bundleTime.js)\n\n"
    soo += extract_js_function(bt, "applySharedItemBundleSavings")
    soo += "\n" + extract_js_function(bt, "calculateSharedItemTravelSavings")
    soo += "\n## (c) ORACLE / best & second selection  (src/lib/scripts/generateScenarios.js)\n\n"
    soo += extract_js_function(gen, "solveBestAndSecondBundle")
    soo += "\n" + extract_js_function(gen, "enrichCandidateRegret")
    soo += "\n## Offline reference mirror (Python; what the export uses)\n\n"
    soo += "# publishing/data_analysis/analytics_v1/analytics/model/time_model.py :: compute_modeled_bundle_time\n"
    m = re.search(r"(?ms)^def compute_modeled_bundle_time\(.*?\n(?=\S|\Z)", tm)
    soo += (m.group(0) if m else "# [not found]\n")
    (HERE / "scoring_and_oracle.txt").write_text(soo, encoding="utf-8")

    pick = (
        "BundleGame per-item PICK-TIME rule + shared-store savings — EXACT SOURCE\n"
        f"Extracted verbatim at commit {commit}. Provenance: src/lib/bundleTime.js,\n"
        "src/lib/scripts/generateScenarios.js.\n" + "=" * 78 + "\n\n"
    )
    pick += "## Constants\n" + extract_consts(bt, ["SHARED_ITEM_ACCESS_SAVE_RATE"])
    pick += extract_consts(gen, ["SECONDS_PER_UNIQUE_ITEM", "SECONDS_PER_CELL", "BASE_PICK"])
    pick += ("\n# Per item: nearest shelf cell is Manhattan distance (entrance->item) x\n"
             "# secondsPerCell, where secondsPerCell = store.cellDistance/1000.\n\n")
    pick += "## itemAccessSeconds  (src/lib/bundleTime.js)\n\n" + extract_js_function(bt, "itemAccessSeconds")
    pick += "\n## findItemPositions / manhattanDistance  (src/lib/bundleTime.js)\n\n"
    pick += extract_js_function(bt, "findItemPositions") + "\n" + extract_js_function(bt, "manhattanDistance")
    pick += "\n## estimateBaseOrderTime (pick + local per order)  (src/lib/scripts/generateScenarios.js)\n\n"
    pick += extract_js_function(gen, "estimateBaseOrderTime")
    pick += "\n## Shared-store savings  (src/lib/bundleTime.js)\n\n"
    pick += extract_js_function(bt, "calculateSharedItemTravelSavings")
    (HERE / "pick_time_rule.txt").write_text(pick, encoding="utf-8")


# --------------------------------------------------------------------------- #
# Idempotent documentation appends (marker-bounded; survive reruns).           #
# --------------------------------------------------------------------------- #
MARK_BEGIN = "<!-- BEGIN SUPPLEMENTARY EXPORTS (add_exports.py) -->"
MARK_END = "<!-- END SUPPLEMENTARY EXPORTS (add_exports.py) -->"


def update_marked_section(path: Path, body: str) -> None:
    block = f"{MARK_BEGIN}\n{body.rstrip()}\n{MARK_END}\n"
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    if MARK_BEGIN in text and MARK_END in text:
        pre = text.split(MARK_BEGIN)[0].rstrip()
        post = text.split(MARK_END, 1)[1].lstrip("\n")
        text = f"{pre}\n\n{block}{post}"
    else:
        text = text.rstrip() + "\n\n" + block
    path.write_text(text, encoding="utf-8")


def write_docs(counts: dict, survey_withheld, commit: str) -> None:
    dict_body = f"""## Supplementary exports (decision-quality robustness)

Added by `publishing/export_for_analysis/add_exports.py` (commit `{commit}`). Pure transforms
of logged Firestore data — join to `rounds.csv`/`candidates.csv` on `user_id`
(+ `round_index` / `scenario_id`). `user_id` is the SAME salted SHA-256 pseudonym
as the core files. "EMPTY" below = not present in Firestore, emitted blank (never imputed).

### `events.csv` — one row per UI interaction ({counts['events']} rows)
Provenance: `Users/{{id}}/DetailedAction/actions` → `detailedActionsByScenarioSetVersionId[ver].actionsByScenarioId[scenario_id].timeline[]`.
- `user_id`,`round_index`,`scenario_id` — join keys (round resolved from the scenario set).
- `event_index` — 0-based, sorted by event start time within the round.
- `event_type` — mapped vocabulary {{order_add, order_remove, submit, reset, other}}: select_order→order_add, deselect_order→order_remove, confirm_order→submit, try_again→reset, all else→other.
- `raw_action_type` — exact source `actionType` (19 values incl. `thinking` = deliberation/dwell; kept so no signal is lost).
- `target_type` — screen|order|button|system|item. `order_id` — `targetId` when target is an order, else EMPTY.
- `client_timestamp_ms` — event start on the **session game-clock** (session-relative; absolute wall-clock is NOT exported, for de-identification).
- `ms_since_round_start` — `client_timestamp_ms` minus the round's first event.
Coverage: 85/105 participants have a logged timeline (20 have none).

### `deliberation_round.csv` — one row per (user, round) ({counts['delib']} rows)
Provenance: derived from `events.csv`. `n_add_events`/`n_remove_events` (select/deselect counts), `n_edits_before_submit`, `n_distinct_bundles_considered` (distinct non-empty selected sets reached), `time_to_first_action_ms`, `time_to_submit_ms` (confirm, relative to round start), `n_thinking_events`/`thinking_ms` (deliberation dwell).

### `round_timing.csv` — one row per (user, round) ({counts['timing']} rows)
Provenance: `round_summary.duration`; DetailedAction timeline (session timing); `Action/actions.timeSummary.idleOrOtherTime`.
- `duration_s` — round_summary.duration. `round_start_ms_session`/`submit_ms_session` — first/last event on session clock. `idle_ms` — timeSummary idle ×1000.
- `active_ms` — **EMPTY**: tab-focus time is NOT logged in Firestore.

### `scenario_design.csv` — one row per scenario_id (all 50)
Provenance: `MasterData/datasets.mainGame` (metadata+orders) and `src/lib/scripts/generateScenarios.js`.
- `intended_difficulty` — **EMPTY**: the generator does NOT target a difficulty. `trap_designed`/`trap_target_amount` — **false/EMPTY**: traps are NOT designed.
- `dispersion_designed` — **true**: dispersion is varied via the per-round city rule. `overlap_designed` — **false**: store overlap is NOT controlled.
- `generator_city_rule` — `random_fair_target_city` (odd rounds) | `anchored_to_prev_best_city` (even rounds) — the generator's only structured variation axis.
- `realized_n_distinct_stores`/`_cities` — computed from the menu's orders (audit). `rng_seed`,`scenario_set_version_id`,`*_version`,`source_file`,`source_commit` — provenance. (Realized overlap/dispersion/score_gap are already in `scenarios.csv`.)

### `survey.csv` — one row per surveyed user ({counts['survey']}; de-identified)
Provenance: `QualtricsResponses` (62 docs; {counts['survey']} join to a logged game user via `user_id`).
- `survey_finished`,`survey_progress`,`survey_duration_seconds` — completion/time.
- `survey_q_<key>` — raw Qualtrics responses kept verbatim: Likert (Q42/Q44/Q50/Q54), comprehension (`comp*`), demographics (age/gender/education/employment), strategy multiple-choice (`post_initialstrategy_*`,`post_finalstrategy_*`), in-survey timing. Map codes via the Qualtrics codebook.
- `self_reported_strategy_text` — **EMPTY (WITHHELD)**: free-text (`post_strategy`/`post_besttip`/`feedback`) withheld pending PII review per `DATA_SCHEMA.md` governance.
- `perceived_difficulty`,`perceived_effort` — **EMPTY**: mapping Q-ids→constructs needs the Qualtrics codebook (not inferred).
- `comprehension_check_passed`,`attention_check_passed` — **EMPTY**: scoring key lives in the Qualtrics design, not Firestore (not inferred).
- WITHHELD raw keys (PII/free-text): {sorted(survey_withheld)}.

### `sessions.csv` — one row per user (105)
Provenance: `Users/{{id}}/Summary.summaryByScenarioSetVersionId[ver]`.
- `total_session_ms` (totalGameTime×1000), `n_rounds_completed` (roundsCompleted), `dropout` (NOT completedGame), `quality_flag_completed_game_mismatch`.
- `device_type`,`browser`,`screen_size` — **EMPTY**: NOT logged. `local_time_of_day` — **EMPTY**: withheld (needs raw wall-clock).

### `practice_rounds.csv` — header only (0 rows)
No practice/tutorial rounds were logged as decisions (all 60 summaries are `mainGame`; the tutorial dataset exists but per-round practice decisions are not recorded). Columns mirror `rounds.csv` + `is_practice`; emitted empty, not imputed.

### `scoring_and_oracle.txt` / `pick_time_rule.txt`
Exact server-side source for (a) bundle score, (b) completion time = pick+local+cross-city−shared savings, (c) oracle/best-second selection, and the per-item pick-time + shared-savings rule — extracted **verbatim at commit `{commit}`** from `src/lib/bundleTime.js` and `src/lib/scripts/generateScenarios.js` (+ the Python mirror `time_model.py`). Confirms the reconstructed score/oracle match the source."""

    qual_body = f"""## Supplementary exports — provenance & integrity

The supplementary files (`events.csv` {counts['events']} rows, `deliberation_round.csv`
{counts['delib']}, `round_timing.csv` {counts['timing']}, `scenario_design.csv` 50,
`survey.csv` {counts['survey']}, `sessions.csv` 105, `practice_rounds.csv` 0; plus
`scoring_and_oracle.txt`, `pick_time_rule.txt`) are **pure transforms of logged
Firestore data — no RNG, no faker, no imputation**, mirroring the core report. Every
value is read directly from a participant's logged `DetailedAction` interaction
timeline, `Action` timing summary, `round_summary`, `Summary`, `MasterData`
scenario/generator metadata, or `QualtricsResponses`. Fields that are genuinely not
logged — tab-focus `active_ms`, device/browser/screen, comprehension/attention answer
keys, the perceived-difficulty/effort construct mapping, practice rounds, and B/C
recommendation arms (the pilot is unaided) — are emitted as **EMPTY columns and flagged
in `DATA_DICTIONARY.md`**, not filled. De-identification matches the core export (salted
SHA-256 `user_id`; names, emails, IPs, geolocation, raw ids/timestamps, and Qualtrics
free-text are stripped or withheld). **No existing analysis output was modified.**"""

    update_marked_section(HERE / "DATA_DICTIONARY.md", dict_body)
    update_marked_section(HERE / "QUALITY_REPORT.md", qual_body)


# --------------------------------------------------------------------------- #
# Main.                                                                        #
# --------------------------------------------------------------------------- #
def main() -> int:
    import subprocess
    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO,
                            capture_output=True, text=True).stdout.strip() or "unknown"

    sb = json.loads((RAW / "scenario_bundle.json").read_text(encoding="utf-8"))
    participants = json.loads((RAW / "participants.json").read_text(encoding="utf-8"))
    scenario_round = {str(s["scenario_id"]): int(s["round"]) for s in sb["scenarios"]}
    ssv = str(sb.get("metadata", {}).get("scenarioSetVersionId") or "")
    game_ids = {str(p.get("id", "")) for p in participants}

    detailed, qualtrics = pull_supplementary()

    events_rows, delib_rows, timing_session = build_events_and_deliberation(detailed, scenario_round)
    timing_rows = build_round_timing(participants, scenario_round, timing_session)
    design_rows = build_scenario_design(sb, scenario_round, commit)
    survey_cols, survey_rows, survey_withheld = build_survey(qualtrics, game_ids)
    session_rows = build_sessions(participants, ssv)

    write_csv(HERE / "events.csv",
              ["user_id", "round_index", "scenario_id", "event_index", "event_type",
               "raw_action_type", "target_type", "order_id", "client_timestamp_ms",
               "ms_since_round_start"], events_rows)
    write_csv(HERE / "deliberation_round.csv",
              ["user_id", "round_index", "scenario_id", "n_add_events", "n_remove_events",
               "n_edits_before_submit", "n_distinct_bundles_considered",
               "time_to_first_action_ms", "time_to_submit_ms", "n_thinking_events",
               "thinking_ms"], delib_rows)
    write_csv(HERE / "round_timing.csv",
              ["user_id", "round_index", "scenario_id", "phase", "duration_s",
               "round_start_ms_session", "submit_ms_session", "active_ms", "idle_ms"],
              timing_rows)
    write_csv(HERE / "scenario_design.csv",
              ["scenario_id", "round_index", "phase", "intended_difficulty", "trap_designed",
               "trap_target_amount", "dispersion_designed", "overlap_designed",
               "generator_city_rule", "realized_n_distinct_stores", "realized_n_distinct_cities",
               "rng_seed", "scenario_set_version_id", "generator_schema_version",
               "reward_model_version", "route_optimizer_version", "legal_bundle_model_version",
               "source_file", "source_commit"], design_rows)
    write_csv(HERE / "survey.csv", survey_cols, survey_rows)
    write_csv(HERE / "sessions.csv",
              ["user_id", "device_type", "browser", "screen_size", "local_time_of_day",
               "total_session_ms", "n_rounds_completed", "dropout",
               "quality_flag_completed_game_mismatch"], session_rows)
    # No practice/tutorial rounds were logged: emit header-only file (no imputation).
    write_csv(HERE / "practice_rounds.csv",
              ["user_id", "round_index", "scenario_id", "phase", "is_practice",
               "chosen_orders", "bundle_size", "success", "earnings", "duration",
               "regret_to_best", "score_ratio_to_best", "exact_optimal"], [])

    write_source_txts(commit)
    write_docs({"events": len(events_rows), "delib": len(delib_rows),
                "timing": len(timing_rows), "survey": len(survey_rows)},
               survey_withheld, commit)

    print(f"[done] events={len(events_rows)} deliberation={len(delib_rows)} "
          f"round_timing={len(timing_rows)} scenario_design={len(design_rows)} "
          f"survey={len(survey_rows)} sessions={len(session_rows)} practice=0")
    print(f"[survey] withheld raw_fields keys (PII/free-text): {sorted(survey_withheld)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
