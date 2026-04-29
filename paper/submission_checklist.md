# Submission Checklist

This checklist is split into a CHI submission path and a RecSys follow-on path. It does not include dates or page limits because those change; recheck the official venue call before submission.

## CHI Submission Path

Primary contribution:

- Human decision support in delivery bundling.
- Behavioral findings from repeated decisions.
- Burden, trust, usefulness, workload, and survey-linked experience.
- Transfer from recommendation-supported to unsupported phases.
- Reproducible, privacy-aware analysis pipeline.

### Before Writing

- [ ] Freeze the study snapshot and record the code commit.
- [ ] Run `npm run paper:artifacts` and save `output_manifest.json`.
- [ ] Confirm `dataset_snapshot.qa_report.paper_ready` for the claims being made.
- [ ] Decide which claims are descriptive and which are treatment-aware.
- [ ] Confirm consent/IRB/course-study approval language.
- [ ] Confirm Qualtrics survey rows are synced and matched.
- [ ] Confirm publication export contains no direct identifiers.

### Main Paper Evidence

- [ ] Completion/drop-off figure included.
- [ ] Phase A/B/C decision-quality comparison included.
- [ ] Timing/burden evidence included where QA permits.
- [ ] Trust/usefulness/workload table included if survey rows are complete.
- [ ] Recommendation-adoption figure included only if Phase B labels are complete.
- [ ] All simulator-only and model-only results are excluded from the human-evidence narrative or labeled as appendix material.

### Writing Checks

- [ ] Abstract states human decision-support framing.
- [ ] Introduction does not overclaim causal recommendation effects.
- [ ] Methods includes protocol, phases, arms, metrics, survey linkage, and exclusion rules.
- [ ] Results use decomposed metrics rather than admin `total_score`.
- [ ] Discussion includes burden, trust, transfer, and deployment caution.
- [ ] Limitations clearly separate benchmark/pilot rows from treatment-aware rows.
- [ ] Ethics section covers consent, anonymization, data access, and non-shareable fields.
- [ ] Accessibility pass completed for figures, captions, and tables.
- [ ] Any LLM assistance beyond editing is disclosed according to venue policy.

### Supplement / Artifact Package

- [ ] `dataset_snapshot.json`
- [ ] `paper_manifest.json`
- [ ] `output_manifest.json`
- [ ] publication-safe CSV exports
- [ ] figure-generation command
- [ ] table/figure source map
- [ ] model configs if appendix model results are included
- [ ] data-governance note explaining what cannot be shared

## RecSys Follow-On Path

Primary contribution:

- Benchmark/resource framing.
- Logged human choices with legal action masks.
- Route-aware candidate bundles and oracle comparisons.
- OPE and model-comparison tables.
- Offline-RL baseline artifacts where trained.

### Before Writing

- [ ] Confirm the publication export schema is stable.
- [ ] Confirm `policy_training.csv` has full state/action/reward tuples.
- [ ] Confirm every state has legal candidate actions and one observed action when recoverable.
- [ ] Confirm participant-level train/validation/test splits.
- [ ] Train or import final CQL/IQL artifacts only after schema validation passes.
- [ ] Run `npm run paper:artifacts` with model directories included.

### Main RecSys Evidence

- [ ] Dataset/schema table.
- [ ] Legal action mask and candidate-bundle description.
- [ ] Baseline ladder table.
- [ ] Policy comparison table.
- [ ] OPE table with IPS, SNIPS, DR, confidence intervals, match rate, and effective sample size.
- [ ] Ablation table clearly marked simulation/model appendix if not human evidence.
- [ ] Model registry / snapshot manifest table.

### Writing Checks

- [ ] Abstract frames BundleGame as a benchmark/resource.
- [ ] Methods define state, action, reward, mask, split, and logging assumptions.
- [ ] OPE section discusses support and propensity limitations.
- [ ] Model section distinguishes heuristic, behavior cloning, reward model, contextual bandit, and true offline-RL artifacts.
- [ ] No linear OPE proxy is labeled as DRL.
- [ ] Simulator-only rows are not mixed with human-evidence tables.
- [ ] Artifact package instructions are runnable from a clean checkout.

## Anonymization Checklist

- [ ] Use `publication_export`, not raw Firestore or raw Qualtrics exports.
- [ ] Use stable pseudonymous participant IDs.
- [ ] Do not share `PUBLICATION_PSEUDONYM_SALT`.
- [ ] Remove names, display names, raw participant IDs, result access keys, Qualtrics response IDs, Qualtrics user IDs, match keys, and raw survey payloads.
- [ ] Review free-text survey responses before sharing.
- [ ] Keep `.env`, API tokens, admin credentials, and Firestore raw dumps out of supplements.
- [ ] Document any suppressed fields in the artifact README.

## Venue Guidance To Recheck

- CHI papers guidance and accessibility/reproducibility expectations: https://chi2026.acm.org/for-authors/papers/
- CHI publication format workflow: https://chi2026.acm.org/chi-publication-formats/
- RecSys contribution categories and reproducibility track guidance: https://recsys.acm.org/recsys26/call/
