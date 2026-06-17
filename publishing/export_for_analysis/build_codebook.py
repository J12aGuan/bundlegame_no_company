#!/usr/bin/env python3
"""
Survey codebook + comprehension key for interpreting survey.csv.

Adds two METADATA files (no participant rows, no PII):
  survey_codebook.csv     - question wording + answer-option labels per Qualtrics qid
  comprehension_key.csv   - comprehension items + correct response (where determinable)

Wording/options are read VERBATIM from the Qualtrics survey definition
(authoritative; same datacenter/token the repo's sync uses). No imputation: if an
item is not in the definition, question_text is left blank and noted.

The Qualtrics survey has NO answer key (GradingData is empty for every graded
item), so `correct_response` is NOT from the QSF. It is filled only where the
correct answer is objectively determined by verified game rules or by the logged
in-game event mechanics, with provenance in `correct_response_source`; otherwise
it is left blank and noted.

Run:  python publishing/export_for_analysis/build_codebook.py
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE / "_raw_pull"
sys.path.insert(0, str(HERE))
import firestore_pull as fp  # only used to load .env (no Firestore call needed)


def fetch_definition() -> dict:
    cache = RAW / "qualtrics_survey_definition.json"
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    fp.load_dotenv()
    tok = os.environ.get("QUALTRICS_API_TOKEN")
    sid = os.environ.get("QUALTRICS_SURVEY_ID")
    dc = os.environ.get("QUALTRICS_DATACENTER_ID")
    if not (tok and sid and dc):
        raise RuntimeError("QUALTRICS_API_TOKEN / SURVEY_ID / DATACENTER_ID not set in .env")
    url = f"https://{dc}.qualtrics.com/API/v3/survey-definitions/{sid}"
    req = urllib.request.Request(url, headers={"X-API-TOKEN": tok})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    RAW.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(data), encoding="utf-8")
    return data


def clean_text(s: str) -> str:
    s = re.sub(r"<br\s*/?>", " ", str(s or ""), flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)            # strip remaining HTML tags
    s = s.replace(" ", " ").replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", s).strip()


def base_tag(col: str) -> str:
    """survey_q_Q42_1 -> Q42 ; survey_q_comp5_6 -> comp5 ; survey_q_age -> age."""
    key = col[len("survey_q_"):] if col.startswith("survey_q_") else col
    m = re.match(r"^(.*)_(\d+)$", key)
    return m.group(1) if m else key


# Comprehension answer key. provenance is explicit; NONE come from Qualtrics
# (GradingData is empty). Filled only where objectively determined.
COMP_KEY = {
    "comp1": ("1", "game_rule",
              "Bundles are 1-3 orders from the SAME store (maxBundle=3 + single-store "
              "legality, src/lib/researchStudy.js / legal_bundle_mask_v1)."),
    "comp2": ("", "not_recoverable",
              "GradingData empty; the set of valid travel actions is a UI detail not "
              "encoded in the QSF or the logged event vocabulary - verify in-app."),
    "comp3": ("4", "game_rule",
              "A bundle's pay is the SUM of its orders' earnings (reward model: "
              "earnings = sum(order.earnings))."),
    "comp4": ("3", "game_event_log",
              "Items are added by typing the name, choosing a quantity, then Add to bag "
              "(DetailedAction vocab: item entry -> add_item_to_bag)."),
    "comp5_6": ("selected", "game_event_log",
                "Correct set for this 'select all that apply' item is {6,7}: the minus "
                "button decreases quantity (decrease_item_quantity) - a valid removal."),
    "comp5_7": ("selected", "game_event_log",
                "Correct set is {6,7}: the red X removes the item (remove_item_from_bag) "
                "- a valid removal. Option 8 (plus) is incorrect (it adds)."),
}
# Items the user explicitly requested for the codebook.
REQUESTED_CODEBOOK_BASES = ["post_difficult", "post_finalstrategy", "post_initialstrategy",
                            "Q42", "Q44", "Q50", "Q54"]
COMP_BASES = ["comp1", "comp2", "comp3", "comp4", "comp5"]


def main() -> int:
    result = fetch_definition()["result"]
    questions = result["Questions"]
    by_tag = {}
    for qid, q in questions.items():
        by_tag[q.get("DataExportTag") or qid] = (qid, q)

    # Which base tags appear in survey.csv (so the whole survey is documented).
    survey_csv = HERE / "survey.csv"
    survey_bases = []
    if survey_csv.exists():
        header = next(csv.reader(survey_csv.open(encoding="utf-8")))
        survey_bases = sorted({base_tag(c) for c in header if c.startswith("survey_q_")})
    # Ensure the explicitly-requested items are covered even if absent from survey.csv.
    bases = sorted(set(survey_bases) | set(REQUESTED_CODEBOOK_BASES) | set(COMP_BASES))

    # ---- survey_codebook.csv ----
    cb_rows = []
    for tag in bases:
        entry = by_tag.get(tag)
        if not entry:
            cb_rows.append({"qualtrics_qid": tag, "internal_qid": "", "question_text": "",
                            "response_option_index": "", "response_option_label": "",
                            "note": "not found in Qualtrics survey definition"})
            continue
        internal_qid, q = entry
        qtext = clean_text(q.get("QuestionText"))
        choices = q.get("Choices") or {}
        order = q.get("ChoiceOrder") or list(choices.keys())
        if not choices:
            cb_rows.append({"qualtrics_qid": tag, "internal_qid": internal_qid,
                            "question_text": qtext, "response_option_index": "",
                            "response_option_label": "",
                            "note": "no choice options (free-text or numeric entry)"})
            continue
        for idx in order:
            ch = choices.get(str(idx)) or choices.get(idx) or {}
            cb_rows.append({
                "qualtrics_qid": tag, "internal_qid": internal_qid,
                "question_text": qtext, "response_option_index": idx,
                "response_option_label": clean_text(ch.get("Display") if isinstance(ch, dict) else ch),
                "note": "",
            })

    with (HERE / "survey_codebook.csv").open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["qualtrics_qid", "internal_qid", "question_text",
                                           "response_option_index", "response_option_label", "note"])
        w.writeheader(); w.writerows(cb_rows)

    # ---- comprehension_key.csv ----
    ck_rows = []
    for qid in ["comp1", "comp2", "comp3", "comp4", "comp5_6", "comp5_7"]:
        base = base_tag(f"survey_q_{qid}")
        entry = by_tag.get(base)
        qtext = clean_text(entry[1].get("QuestionText")) if entry else ""
        correct, source, note = COMP_KEY.get(qid, ("", "not_recoverable", ""))
        ck_rows.append({
            "qid": qid,
            "question_text": qtext if entry else "",
            "correct_response": correct,
            "correct_response_source": source,
            "note": note if entry else "not found in Qualtrics survey definition",
        })
    with (HERE / "comprehension_key.csv").open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["qid", "question_text", "correct_response",
                                           "correct_response_source", "note"])
        w.writeheader(); w.writerows(ck_rows)

    # ---- documentation (idempotent marked block) ----
    doc = f"""## Survey codebook & comprehension key (metadata only)

Added by `publishing/export_for_analysis/build_codebook.py`. Question wording + answer-option
labels are read VERBATIM from the Qualtrics survey definition
(`survey-definitions/{{SURVEY_ID}}`), cached to `_raw_pull/qualtrics_survey_definition.json`.
No participant rows, no PII.

### `survey_codebook.csv` - one row per (qualtrics_qid, response_option_index)
`qualtrics_qid` (the export tag, e.g. `post_difficult`, `Q42`; matches the
`survey_q_<qid>` columns in `survey.csv`), `internal_qid`, `question_text`
(HTML stripped), `response_option_index`, `response_option_label`, `note`.
Covers every `survey_q_*` question in `survey.csv` plus the requested items.
Notes: `post_difficult` is a **7-point** scale (Extremely easy..Extremely difficult),
not 1-6. `Q44`/`Q50`/`Q54` are the embedded **best-choice quiz** items (not Likert);
`Q42` is a delivery-platform-use demographic. `question_text` is blank only if a tag
is absent from the survey definition (noted).

### `comprehension_key.csv` - one row per comprehension item
`qid`, `question_text` (from the QSF), `correct_response`, `correct_response_source`,
`note`. **The QSF contains no answer key** (`GradingData` is empty for every graded
item), so `correct_response` is **not** from Qualtrics. It is filled only where the
answer is objectively determined: `game_rule` (comp1, comp3 - from the verified
bundle/earnings rules) or `game_event_log` (comp4, comp5 - from the logged in-game
action vocabulary). `comp2` is left **blank** (`not_recoverable`). Always check
`correct_response_source` before scoring; supply any blank/UI items from the app."""

    dd = HERE / "DATA_DICTIONARY.md"
    if dd.exists():
        text = dd.read_text(encoding="utf-8")
        B, E = "<!-- BEGIN SURVEY CODEBOOK -->", "<!-- END SURVEY CODEBOOK -->"
        block = f"{B}\n{doc}\n{E}\n"
        if B in text and E in text:
            text = text.split(B)[0].rstrip() + "\n\n" + block + text.split(E, 1)[1].lstrip("\n")
        else:
            text = text.rstrip() + "\n\n" + block
        dd.write_text(text, encoding="utf-8")

    print(f"[done] survey_codebook.csv rows={len(cb_rows)} (questions={len(bases)}) "
          f"comprehension_key.csv rows={len(ck_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
