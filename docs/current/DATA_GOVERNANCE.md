# Data Governance

BundleGame collects human-subject gameplay and survey-linked data. Treat raw data as restricted research data unless an approved sharing plan says otherwise.

## Data Categories

| Category | Examples | Default Handling |
| --- | --- | --- |
| Runtime identifiers | participant IDs, display names, result access keys | Internal only |
| Survey identifiers | Qualtrics response IDs, user IDs, match keys, result codes | Internal only |
| Gameplay decisions | scenario, phase, chosen bundle, reward, timing, optimality | Share only after pseudonymization and review |
| Survey responses | trust/usefulness/workload, free text | Share only after review; free text may need redaction |
| Admin credentials | Firebase admin email/password, API tokens, pseudonym salt | Never share |
| Model artifacts | configs, checkpoints, evaluation summaries | Share according to source-data tier |

## Publication Export Rules

Use:

```bash
npm run scores:export -- --mode publication_export
```

Publication exports:

- replace direct participant IDs with stable pseudonyms
- exclude display names
- exclude result access keys
- exclude Qualtrics response IDs
- exclude Qualtrics user IDs
- exclude match keys and result codes
- exclude raw survey payloads

Set `PUBLICATION_PSEUDONYM_SALT` privately when pseudonyms need to remain stable across export runs. Never commit or share the salt.

## Raw Export Rules

Use `raw_research_export` only for internal QA:

```bash
npm run scores:export -- --mode raw_research_export
```

Raw exports may include operational identifiers needed to debug linkage. Do not attach raw exports to public repositories, shared supplements, reviewer packages, or screenshots.

Full recursive Firestore dumps are even more sensitive. Use them only for local
research operations:

```bash
npm run firestore:connection:check
npm run firestore:export:raw
```

These commands use the Firebase Admin SDK with Application Default Credentials
or `GOOGLE_APPLICATION_CREDENTIALS`; they do not use browser-exposed `VITE_`
secrets. Generated timestamp folders under `data analysis/firestore_raw_export/`
are ignored by Git.

To derive a shareable Firestore-level export, set a private
`PUBLICATION_PSEUDONYM_SALT` and run:

```bash
npm run firestore:export:publication
```

The derived export removes names, result access keys/codes, Qualtrics IDs, match
keys, and raw survey payloads while keeping gameplay/recommendation fields needed
for analysis.

## Qualtrics Linkage

Qualtrics credentials must stay server/local-script only:

- `QUALTRICS_API_TOKEN`
- `QUALTRICS_DATACENTER_ID`
- `QUALTRICS_SURVEY_ID`

Never prefix these with `VITE_`. Any token pasted into chat, tickets, or commits should be rotated.

## Firestore Access

Admin and downloader access use Firebase Auth and the `admin: true` custom claim. Firestore rules should prevent participant data, survey links, research models, and snapshots from being world-readable or writable.

Before collecting data:

1. Publish `firestore.rules`.
2. Create named researcher Firebase Auth users.
3. Grant `admin: true` only to approved users.
4. Remove any old client-side downloader password variables.
5. Confirm admin pages work only after sign-in.

For local privileged Firestore exports, prefer:

```bash
gcloud auth application-default login
firebase login
firebase use bundling-63c10
```

If your coding environment supports stdio MCP servers, the optional Firebase MCP
command is:

```bash
npx -y firebase-tools@latest mcp --dir "$PWD" --only firestore,auth,storage
```

## Sharing Checklist

Before sharing any artifact:

- Confirm it was generated from `publication_export` or an approved analytics snapshot.
- Check that no direct identifiers remain.
- Check that free-text survey fields were reviewed.
- Include `dataset_snapshot.json`, `paper_manifest.json`, and schema documentation.
- Include limitations for missing timestamps, reconstructed rows, or missing treatment labels.
- Keep raw Firestore, raw Qualtrics, `.env`, and credentials out of the package.
