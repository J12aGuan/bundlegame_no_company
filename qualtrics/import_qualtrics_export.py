#!/usr/bin/env python3
"""Turn a Qualtrics CSV export into the same tables as the data archive.

    python3 qualtrics/import_qualtrics_export.py responses.csv --out ./out \
            --sequences "<archive>/01_order_sequences"

Emits, matching 02_participant_data/ in the archive so existing analysis works:
    participants.csv
    round_decisions.csv
    round_timing.csv
    detailed_action_timeline.csv
    qa_issues.csv                 <- anything that needs a human look

Pass --sequences to join the chosen bundle against the candidate-bundle tables
and recover reward / rank / regret, which the game deliberately does not compute
client-side. Without it those columns are left blank.

Standard library only.
"""
import argparse
import csv
import json
import os
import sys

TIMING_KEYS = ['thinkingTime', 'startPickingConfirmationTime', 'aisleTravelTime',
               'itemAddToCartTime', 'localDeliveryTime', 'cityTravelTime',
               'penaltyTime', 'idleOrOtherTime']


def read_qualtrics_csv(path):
    """Qualtrics exports carry three header rows: names, question text, importIds."""
    with open(path, newline='', encoding='utf-8-sig') as f:
        rows = list(csv.reader(f))
    if not rows:
        return []
    header = rows[0]
    body = rows[1:]
    # drop the question-text and importId rows if present
    while body and body[0] and (body[0][0].startswith('{"ImportId"') or
                                (len(body) > 1 and body[1] and body[1][0].startswith('{"ImportId"'))):
        body.pop(0)
        if not body or not body[0]:
            break
        if not body[0][0].startswith('{"ImportId"'):
            break
    return [dict(zip(header, r)) for r in body if any(c.strip() for c in r)]


def jload(raw, default):
    raw = (raw or '').strip()
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def reassemble_events(row, max_chunks=32):
    """Chunks must be concatenated in order. Missing middle chunks are fatal."""
    parts, gaps = [], []
    for i in range(1, max_chunks + 1):
        key = f'bg_events_{i}'
        if key not in row:
            break
        val = row.get(key) or ''
        if val == '' and parts and any((row.get(f'bg_events_{j}') or '') for j in range(i + 1, max_chunks + 1)):
            gaps.append(i)          # a hole between populated chunks
        parts.append(val)
    packed = ''.join(parts)
    if not packed:
        return [], gaps, None
    try:
        return json.loads(packed), gaps, None
    except json.JSONDecodeError as e:
        return [], gaps, f'{e}'


def load_candidate_bundles(seq_dir):
    """{(dataset_root, scenario_id, frozenset(bundle_ids)) -> candidate row}"""
    if not seq_dir:
        return {}
    if not os.path.isdir(seq_dir):
        # A bad --sequences path must not look identical to omitting it.
        print(f'  ! --sequences path does not exist: {seq_dir}', file=sys.stderr)
        return {}
    table = {}
    for fn in os.listdir(seq_dir):
        if not fn.startswith('candidate_bundles_') or not fn.endswith('.csv'):
            continue
        root = fn[len('candidate_bundles_'):-len('.csv')].replace('__AS_RUN', '')
        with open(os.path.join(seq_dir, fn), newline='') as f:
            for r in csv.DictReader(f):
                ids = frozenset(x for x in (r.get('bundle_ids') or '').split('|') if x)
                table[(root, r.get('scenario_id', ''), ids)] = r
    return table


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv_path')
    ap.add_argument('--out', default='./qualtrics_import')
    ap.add_argument('--sequences', default='', help='archive 01_order_sequences dir')
    args = ap.parse_args()

    rows = read_qualtrics_csv(args.csv_path)
    os.makedirs(args.out, exist_ok=True)
    cands = load_candidate_bundles(args.sequences)

    participants, decisions, timings, events_out, qa = [], [], [], [], []

    for row in rows:
        pid = (row.get('bg_participant_id') or row.get('ResponseId')
               or row.get('ResponseID') or '').strip()
        if not pid:
            continue
        dataset = (row.get('bg_dataset') or '').strip()
        finished = row.get('bg_finished') or ''

        def qa_add(kind, msg):
            qa.append({'participant_id': pid, 'issue_type': kind, 'message': msg})

        decs = jload(row.get('bg_decisions'), [])
        tims = jload(row.get('bg_timing'), [])
        evs, gaps, err = reassemble_events(row)

        if row.get('bg_events_truncated') == '1':
            qa_add('events_truncated',
                   f"payload exceeded the chunk budget; {row.get('bg_events_dropped_chars')} chars lost")
        if gaps:
            qa_add('event_chunk_gap', f'empty chunk(s) {gaps} between populated ones — reassembly unreliable')
        if err:
            qa_add('event_parse_failed', err)
        if row.get('bg_recommendation_unavailable') == '1':
            qa_add('recommendation_unavailable', 'treated arm had no oracle data to show')
        if decs and str(finished) != '1':
            qa_add('incomplete_run', f"{len(decs)} rounds recorded but bg_finished != 1")
        if not decs:
            qa_add('no_rounds', 'no decision rows recorded')

        participants.append({
            'participant_id': pid,
            'dataset': dataset,
            'arm': row.get('bg_arm', ''),
            'rounds_completed': row.get('bg_rounds_completed', ''),
            'round_reached': row.get('bg_round_reached', ''),
            'earnings': row.get('bg_earnings', ''),
            'session_seconds': row.get('bg_session_seconds', ''),
            'finished': finished,
            'n_events': row.get('bg_events_count', ''),
            'events_truncated': row.get('bg_events_truncated', ''),
            'recommendation_unavailable': row.get('bg_recommendation_unavailable', ''),
            'qualtrics_response_id': row.get('ResponseId') or row.get('ResponseID', ''),
            'qualtrics_finished': row.get('Finished', ''),
            'qualtrics_recorded_at': row.get('RecordedDate', ''),
            'qualtrics_duration_seconds': row.get('Duration (in seconds)', ''),
        })

        for d in decs:
            chosen = d.get('c') or []
            key = (dataset, d.get('s', ''), frozenset(chosen))
            cand = cands.get(key)
            if cands and not cand:
                qa_add('bundle_not_in_candidates',
                       f"round {d.get('r')}: {'|'.join(chosen)} not found for {d.get('s')}")
            decisions.append({
                'participant_id': pid,
                'dataset': dataset,
                'round_index': d.get('r', ''),
                'scenario_id': d.get('s', ''),
                'phase': d.get('p', ''),
                'chosen_orders': '|'.join(chosen),
                'chosen_bundle_size': len(chosen),
                'success': d.get('ok', ''),
                'earnings': d.get('e', ''),
                'duration_seconds': d.get('d', ''),
                'end_reason': d.get('end', ''),
                'city_after': d.get('city', ''),
                'policy_arm': d.get('arm', ''),
                'shown_recommendation_bundle_ids': '|'.join(d.get('rec') or []),
                'matched_oracle': d.get('opt', ''),
                # recovered by joining to the candidate-bundle table
                'score_pay_per_second': (cand or {}).get('score_pay_per_second', ''),
                'score_ratio_to_best': (cand or {}).get('score_ratio_to_best', ''),
                'regret_to_best': (cand or {}).get('regret_to_best', ''),
                'candidate_rank': (cand or {}).get('rank', ''),
            })

        for t in tims:
            b = t.get('b') or {}
            timings.append({
                'participant_id': pid, 'dataset': dataset,
                'round_index': t.get('r', ''),
                'total_time_seconds': t.get('total', ''),
                **{f'time_{k}': b.get(k, '') for k in TIMING_KEYS}
            })

        for i, e in enumerate(evs):
            meta = e[4] if len(e) > 4 else None
            events_out.append({
                'participant_id': pid, 'dataset': dataset, 'event_index': i,
                'session_seconds': e[0] if len(e) > 0 else '',
                'action_type': e[1] if len(e) > 1 else '',
                'target_type': e[2] if len(e) > 2 else '',
                'target_id': e[3] if len(e) > 3 else '',
                'metadata_json': json.dumps(meta) if meta is not None else '',
            })

    def write(name, data):
        path = os.path.join(args.out, name)
        if not data:
            open(path, 'w').close()
            return 0
        cols = list(dict.fromkeys(k for r in data for k in r))
        with open(path, 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(data)
        return len(data)

    counts = {
        'participants.csv': write('participants.csv', participants),
        'round_decisions.csv': write('round_decisions.csv', decisions),
        'round_timing.csv': write('round_timing.csv', timings),
        'detailed_action_timeline.csv': write('detailed_action_timeline.csv', events_out),
        'qa_issues.csv': write('qa_issues.csv', qa),
    }
    for k, v in counts.items():
        print(f'  {k:34s} {v:>7} rows')
    if not cands:
        why = 'not supplied' if not args.sequences else 'supplied but no candidate_bundles_*.csv found'
        print(f'\n  note: --sequences {why}, so reward/regret columns are blank')
    if qa:
        print(f'\n  {len(qa)} QA issue(s) — review qa_issues.csv before analysing')
    return 1 if any(q['issue_type'] in ('event_parse_failed', 'event_chunk_gap') for q in qa) else 0


if __name__ == '__main__':
    sys.exit(main())
