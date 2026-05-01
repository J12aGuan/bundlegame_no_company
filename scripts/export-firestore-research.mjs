import path from "node:path";

import {
  exportFirestoreCollections,
  getCredentialPreflight,
  loadDotEnv,
  makeTimestampId,
  parseCliArgs,
  printCredentialReport,
  repoRoot,
  TARGET_FIRESTORE_COLLECTIONS,
  writeFirestoreExportDirectory,
} from "./firestore-admin-export-common.mjs";

async function main() {
  await loadDotEnv();
  const options = parseCliArgs(process.argv.slice(2));
  const preflight = await getCredentialPreflight({ projectId: options.projectId });
  printCredentialReport(preflight);

  if (options.checkCredentials) {
    process.exitCode = preflight.ok ? 0 : 1;
    return;
  }

  const generatedAt = new Date().toISOString();
  const exportData = await exportFirestoreCollections({
    projectId: options.projectId,
    collectionNames: TARGET_FIRESTORE_COLLECTIONS,
    generatedAt,
  });
  const timestamp = options.timestamp || makeTimestampId(new Date(generatedAt));
  const outputDir = options.out
    ? path.resolve(repoRoot, options.out)
    : path.join(repoRoot, "data analysis", "firestore_raw_export", timestamp);
  const absoluteOutputDir = await writeFirestoreExportDirectory(exportData, outputDir);

  console.log(`Wrote raw Firestore export to ${absoluteOutputDir}`);
  for (const [collectionName, count] of Object.entries(exportData.collection_counts || {})) {
    console.log(`${collectionName}: ${count.total_documents} documents including nested subcollections`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

