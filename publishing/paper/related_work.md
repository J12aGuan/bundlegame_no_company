# Related-Work Map

This is a map for building the bibliography. It intentionally avoids final citation claims until the manuscript bibliography is assembled and checked.

## CHI Primary Framing

### Human Decision Support

Use for:

- Positioning BundleGame as a decision-support system rather than only an optimizer.
- Arguing that adoption, trust, and burden matter alongside objective reward.

Search areas:

- human-AI decision support
- algorithmic advice and reliance
- trust calibration
- decision aids under time pressure
- explanations and recommendation uptake

BundleGame evidence:

- recommendation exposure and adoption rows
- survey-linked trust/usefulness/workload
- phase comparisons and transfer patterns

Claim boundary:

- Do not claim real-world delivery-worker deployment unless the sample and study context support it.

### Behavioral Findings In Repeated Decisions

Use for:

- Learning curves.
- Repeated decision quality.
- Over-bundling or under-bundling behavior.
- Transfer from supported to unsupported phases.

Search areas:

- repeated decision-making in HCI
- human learning with algorithmic support
- cognitive load and strategy formation
- bounded rationality in interactive systems

BundleGame evidence:

- `analysis_master.csv`
- `phase_decision_quality.csv`
- `participant_completion_dropoff.svg`
- timing and burden tables

Claim boundary:

- Transfer claims require clean Phase C rows and a justified comparison to Phase A/B.

### Gig Work, Delivery, And Labor Context

Use for:

- Motivating why delivery bundling is a meaningful task.
- Discussing labor burden, route complexity, and decision opacity.

Search areas:

- gig work platforms
- delivery labor and algorithmic management
- route planning and worker autonomy
- platform-mediated decision support

BundleGame evidence:

- task design and timing decomposition
- participant burden/survey results
- limitations/ethics discussion

Claim boundary:

- Treat BundleGame as a controlled abstraction unless participants are recruited from the target worker population.

### Research Reproducibility In HCI

Use for:

- Explaining artifact package, snapshot manifests, and publication-safe exports.
- Justifying why decomposed metrics are reported instead of a single class score.

Search areas:

- HCI reproducibility
- open materials and artifact packages
- anonymized human-subjects data sharing
- accessible figures and supplementary materials

BundleGame evidence:

- `ARTIFACTS.md`
- `DATA_SCHEMA.md`
- `publishing/paper_artifacts/output_manifest.json`
- publication export redaction rules

## RecSys Follow-On Framing

### Interactive Recommendation Benchmarks

Use for:

- Positioning BundleGame as a benchmark/resource with logged human choices and legal action masks.
- Comparing against existing recommender datasets that lack interactive route-aware action constraints.

Search areas:

- interactive recommender systems
- slate recommendation benchmarks
- logged bandit feedback
- recommendation datasets with action constraints
- simulation vs logged human decisions

BundleGame evidence:

- `policy_training.csv`
- `optimal[].candidate_bundles[]`
- `publication_export`
- participant-level splits

Claim boundary:

- Do not claim general recommender benchmark superiority; focus on the specific delivery-bundling action structure.

### Off-Policy Evaluation

Use for:

- Framing IPS, SNIPS, doubly robust, direct method, and FQE-style estimates.
- Explaining support, match rate, and effective sample size limitations.

Search areas:

- off-policy evaluation recommender systems
- inverse propensity scoring
- self-normalized IPS
- doubly robust estimators
- fitted Q evaluation
- support mismatch

BundleGame evidence:

- `ope_summary.csv`
- `tables/ope_comparison.csv`
- legal action masks and logged-action flags

Claim boundary:

- OPE estimates are only as strong as logging propensity/support assumptions; state this directly.

### Offline RL With Discrete Masked Actions

Use for:

- RecSys appendix and follow-on model paper.
- CQL/IQL baseline framing.
- Legal-action masking and participant-level train/test splits.

Search areas:

- conservative Q-learning
- implicit Q-learning
- offline reinforcement learning in recommendation
- slate recommendation with action masks
- logged feedback and constrained action spaces

BundleGame evidence:

- `offline_rl/`
- trained artifact `config.json`
- `evaluation_summary.json`
- `recommendation_map.json`
- model registry rows

Claim boundary:

- Only call CQL/IQL trained models when artifact provenance exists. Otherwise label them planned.

### Resource And Reproducibility Papers

Use for:

- RecSys follow-on resource contribution.
- Artifact-review positioning.
- Reproducible pipeline and schema documentation.

Search areas:

- recommender-system resource papers
- reproducibility papers
- artifact review and dataset documentation
- benchmark documentation

BundleGame evidence:

- `DATA_SCHEMA.md`
- `ARTIFACTS.md`
- `publishing/paper_artifacts/`
- `output_manifest.json`
- `publication_export`

## Citation Collection Checklist

- Add 3-5 core HCI decision-support citations.
- Add 2-4 trust/reliance/advice-taking citations.
- Add 2-4 gig work or platform labor citations.
- Add 3-5 RecSys/OPE citations.
- Add CQL and IQL citations if trained offline-RL results are included.
- Add artifact/reproducibility guidance citations if making a resource contribution.
- For each citation, write one sentence explaining why it is included.
- Remove any citation that is only decorative.

## Venue Guidance Checked

- CHI 2026 papers guidance emphasizes accessible submissions and encourages reproducibility materials where relevant: https://chi2026.acm.org/for-authors/papers/
- CHI 2026 publication formats describe the ACM workflow and accessibility expectations: https://chi2026.acm.org/chi-publication-formats/
- RecSys 2026 call includes contribution categories and an explicit reproducibility-paper direction: https://recsys.acm.org/recsys26/call/

These links are planning references only. Recheck the active call for papers before final submission.
