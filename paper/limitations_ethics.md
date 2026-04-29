# Limitations, Ethics, And Anonymisation

This document provides manuscript-ready planning notes for limitations, ethics, consent, anonymisation, and artifact sharing.

## Limitations To Include

### Controlled Task Abstraction

BundleGame is a controlled delivery-bundling task. It captures route, reward, timing, and recommendation tradeoffs, but it is not a full deployment study of real delivery labor.

Use this limitation when:

- participants are students or convenience-sample participants
- compensation, platform pressure, and real-world risk are not represented
- route and store interactions are simplified

### Historical Benchmark Rows

Historical `mainGame` rows are useful for descriptive behavior and benchmark validation, but they may lack complete treatment labels, survey rows, or timestamps.

Do not use these rows for:

- causal recommendation-treatment claims
- timestamp-based learning claims when timestamps are missing
- headline completion claims when `completed_game_mismatch` is present

### Recommendation Treatment Claims

Treatment claims require:

- stable participant-level arm assignment
- Phase B recommendation labels
- shown bundle/ranking fields
- policy name/version
- legal action mask version
- timestamp-complete rows
- matched survey rows or reported missingness

If any of these are absent, frame results as descriptive or benchmark-only.

### Off-Policy Evaluation

OPE estimates depend on support and logging assumptions.

Report:

- match rate
- effective sample size
- estimator family
- confidence intervals
- whether propensities are known, estimated, or proxy assumptions

Do not present OPE values as online deployment results.

### Simulator And Model Outputs

Simulator-only and offline model outputs are not human outcomes. Keep them in appendix/model sections unless explicitly framed as model behavior.

## Ethics And Consent Notes

Before data collection:

- confirm IRB, course-study, or exempt-status handling
- provide participants with consent or information sheet language
- describe what gameplay and survey data are collected
- state whether participation affects course standing or compensation
- provide withdrawal/contact instructions where required
- describe how data are stored, accessed, anonymized, and shared

Manuscript methods should report:

- participant recruitment context
- consent/approval pathway
- exclusion criteria
- compensation or course-credit handling, if any
- data retention and access control
- privacy-preserving export process

## Data Governance

Raw data should be treated as restricted research data. The shareable path is `publication_export`, not Firestore raw export.

Non-shareable fields include:

- names and display names
- raw participant IDs when identifying
- game result access keys
- Qualtrics response IDs
- Qualtrics user IDs
- Qualtrics match keys
- Qualtrics result codes
- raw survey payloads
- unreviewed free-text survey responses
- Firebase Auth emails
- admin passwords
- API tokens
- `PUBLICATION_PSEUDONYM_SALT`

## Anonymisation Workflow

1. Run the private raw QA export only inside the approved research environment.
2. Resolve linkage and QA issues.
3. Set `PUBLICATION_PSEUDONYM_SALT` privately if stable pseudonyms are needed.
4. Run:

```bash
npm run scores:export -- --mode publication_export
```

5. Inspect the generated `schema.json` and publication CSVs.
6. Confirm no direct identifiers remain.
7. Review free-text fields separately; do not share them by default.
8. Include `DATA_SCHEMA.md`, `ARTIFACTS.md`, and `output_manifest.json` in any artifact package.

## Artifact-Sharing Notes

Shareable by default after review:

- source code
- synthetic fixtures
- paper-artifact generation scripts
- publication-safe derived tables
- model configs that do not encode private data
- aggregate tables and SVG figures

Restricted unless explicitly approved:

- raw Firestore exports
- raw Qualtrics exports
- raw survey free text
- admin credentials
- pseudonym salt
- any dataset where participant IDs remain identifying

## Manuscript Language Guardrails

Safe wording:

- "In our controlled BundleGame task..."
- "Participants in this study..."
- "This benchmark supports..."
- "The current snapshot supports descriptive analysis..."
- "Treatment claims require snapshots that pass the recommendation-label and timestamp gates."

Avoid:

- "Delivery workers behave..." unless the sample is actual delivery workers.
- "Recommendations caused..." without randomized, complete treatment data.
- "The DRL policy improves human decisions..." unless a trained policy was deployed or evaluated under a supported design.
- "Public dataset" if sharing is restricted or mediated.

## Ethics Checklist

- [ ] Approval/consent pathway documented.
- [ ] Recruitment and compensation described.
- [ ] Data collected by the game and survey listed.
- [ ] Raw and publication-safe data boundaries explained.
- [ ] Direct identifiers removed from shared artifacts.
- [ ] Free text reviewed or excluded.
- [ ] Model outputs separated from human outcomes.
- [ ] Missingness and exclusions reported.
- [ ] Limitations include ecological validity and OPE support assumptions.
