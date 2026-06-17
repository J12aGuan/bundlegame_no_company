# Raw Firestore Export Folder

This folder is for local, restricted Firestore dumps created by:

```bash
npm run firestore:export:raw
```

Generated timestamp folders are ignored by Git because they may contain direct
human-subject identifiers, Qualtrics linkage values, result access keys, and raw
survey payloads.

## Credentials

Use project `bundling-63c10`.

Preferred local setup:

```bash
gcloud auth application-default login
firebase login
firebase use bundling-63c10
```

Fallback setup:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

The account or service account must have Firestore read access for the research
collections. Do not commit service-account JSON files or raw exports.

## Optional Firebase MCP

If your coding environment supports stdio MCP servers and Node tooling is on
PATH, the official Firebase MCP server can be started with:

```bash
npx -y firebase-tools@latest mcp --dir "$PWD" --only firestore,auth,storage
```
