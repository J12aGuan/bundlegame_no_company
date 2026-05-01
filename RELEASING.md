# Releasing BundleGame

This guide describes how to create a clean archival ZIP for reviewers or reproducibility packages. Do not archive a local working directory directly; it can contain `.env`, `node_modules`, build outputs, Firebase logs, local history, cache folders, and restricted research data.

## 1. Start From A Fresh Clone

```bash
git clone https://github.com/nnicholas-c/bundlegame_no_company.git bundlegame_release
cd bundlegame_release
git fetch origin
git switch main
git pull --ff-only origin main
```

For a release candidate branch, replace `main` with the branch or tag being archived.

## 2. Verify The Clean Checkout

```bash
npm ci
npm run build
npm run test:js
make PYTHON=python3.11 test-python
```

If `python3.11` is not available under that name, pass the absolute path to a Python 3.10+ interpreter:

```bash
make PYTHON=/path/to/python3.11 test-python
```

Record the final commit hash:

```bash
git rev-parse HEAD
```

## 3. Confirm No Machine-Local Files Are Tracked

```bash
git ls-files | rg '(^|/)(node_modules|\.svelte-kit|build|\.history|\.vercel|__MACOSX|firebase-debug\.log)'
```

This command should print nothing. If it prints any path, remove that path from version control before releasing.

## 4. Create The Archive

Use `git archive` so the ZIP contains only tracked repository files:

```bash
VERSION="$(git rev-parse --short HEAD)"
git archive \
  --format=zip \
  --prefix="bundlegame_no_company-${VERSION}/" \
  -o "../bundlegame_no_company-${VERSION}.zip" \
  HEAD
```

This excludes `.git`, `.env`, `node_modules`, `.svelte-kit`, `.vercel`, `.history`, `build`, cache folders, raw Firestore exports, Qualtrics exports, generated analysis outputs, and generated paper-artifact outputs because those files are not tracked.

## 5. What To Include Separately

Share only reviewed artifacts alongside the source ZIP:

- publication-safe derived exports
- synthetic fixtures
- aggregate tables and generated figures
- model configs and artifacts approved for sharing
- `output_manifest.json`, `dataset_snapshot.json`, and `paper_manifest.json` when they contain no restricted identifiers

Do not include:

- `.env`
- API tokens or Firebase credentials
- raw Firestore dumps
- raw Qualtrics exports
- direct participant identifiers
- `PUBLICATION_PSEUDONYM_SALT`
- unreviewed free-text survey responses

## 6. Release Checklist

- [ ] Release commit or tag is recorded.
- [ ] `npm ci` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:js` passes.
- [ ] `make PYTHON=python3.11 test-python` passes.
- [ ] `git archive` created the ZIP from the intended commit.
- [ ] No restricted data or credentials are bundled with the source archive.
- [ ] Any accompanying data package was generated from `publication_export` or another approved publication-safe pipeline.
