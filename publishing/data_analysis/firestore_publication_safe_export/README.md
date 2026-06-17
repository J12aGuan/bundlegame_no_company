# Publication-Safe Firestore Export Folder

This folder is for redacted Firestore exports created by:

```bash
npm run firestore:export:publication
```

or from a prior raw dump:

```bash
npm run firestore:export:publication -- --input "publishing/data_analysis/firestore_raw_export/<timestamp>"
```

Generated timestamp folders are ignored by Git.

## Required Private Values

Set a private pseudonym salt before exporting:

```bash
export PUBLICATION_PSEUDONYM_SALT="private-long-random-value"
```

Use Application Default Credentials or a service-account JSON path as described
in the raw export README.

## Redacted

Publication-safe exports remove or pseudonymize:

- direct participant IDs and display names
- student names and email-style fields
- result access keys and result codes
- Qualtrics response IDs, user IDs, finished IDs, and match keys
- raw survey payload fields

## Retained

When present in Firestore, the export keeps research-useful gameplay fields such
as phase, arm, scenario, recommendation source, shown recommendation bundles,
chosen bundles, oracle/optimal bundle fields, reward, timestamps, and legal action
mask metadata.
