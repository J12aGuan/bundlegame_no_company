import path from "node:path";

import {
  exportFirestoreCollections,
  getCredentialPreflight,
  loadDotEnv,
  makeTimestampId,
  parseCliArgs,
  printCredentialReport,
  readFirestoreExportDirectory,
  repoRoot,
  sanitizeFirestoreExportForPublication,
  TARGET_FIRESTORE_COLLECTIONS,
  writeFirestoreExportDirectory,
} from "./firestore-admin-export-common.mjs";

async function loadRawExport(options = {}) {
  if (options.input) {
    return readFirestoreExportDirectory(options.input);
  }
  return exportFirestoreCollections({
    projectId: options.projectId,
    collectionNames: TARGET_FIRESTORE_COLLECTIONS,
    generatedAt: new Date().toISOString(),
  });
}

async function main() {
  await loadDotEnv();
  const options = parseCliArgs(process.argv.slice(2));
  const preflight = await getCredentialPreflight({
    projectId: options.projectId,
    requireFirebaseCredential: !options.input,
    requirePseudonymSalt: true,
  });
  printCredentialReport(preflight);

  if (options.checkCredentials) {
    process.exitCode = preflight.ok ? 0 : 1;
    return;
  }

  if (!String(process.env.PUBLICATION_PSEUDONYM_SALT || "").trim()) {
    throw new Error("PUBLICATION_PSEUDONYM_SALT is required before writing a publication-safe export.");
  }

  const rawExport = await loadRawExport(options);
  const generatedAt = new Date().toISOString();
  const publicationExport = sanitizeFirestoreExportForPublication(rawExport, {
    pseudonymSalt: process.env.PUBLICATION_PSEUDONYM_SALT,
    generatedAt,
  });
  const timestamp = options.timestamp || makeTimestampId(new Date(generatedAt));
  const outputDir = options.out
    ? path.resolve(repoRoot, options.out)
    : path.join(repoRoot, "data analysis", "firestore_publication_safe_export", timestamp);
  const absoluteOutputDir = await writeFirestoreExportDirectory(publicationExport, outputDir);

  console.log(`Wrote publication-safe Firestore export to ${absoluteOutputDir}`);
  for (const [collectionName, count] of Object.entries(publicationExport.collection_counts || {})) {
    console.log(`${collectionName}: ${count.total_documents} documents including nested subcollections`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
