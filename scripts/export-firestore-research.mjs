import fs from "node:fs/promises";
import path from "node:path";

import {
  closeAdminApp,
  exportCollectionRecursive,
  getCredentialPreflight,
  initializeAdminFirestore,
  loadDotEnv,
  makeTimestampId,
  parseCliArgs,
  printCredentialReport,
  RAW_FIRESTORE_EXPORT_SCHEMA_VERSION,
  repoRoot,
  TARGET_FIRESTORE_COLLECTIONS,
} from "./firestore-admin-export-common.mjs";

function shouldLogProgress(event = {}) {
  if (event.type === "collection_start" || event.type === "collection_done") return event.depth === 0;
  if (event.type === "document_progress") return event.depth === 0;
  return false;
}

function logProgress(event = {}) {
  if (!shouldLogProgress(event)) return;
  if (event.type === "collection_start") {
    console.log(`Starting ${event.path}: ${event.document_count} documents`);
  } else if (event.type === "document_progress") {
    console.log(`Progress ${event.path}: ${event.completed}/${event.total} documents`);
  } else if (event.type === "collection_done") {
    console.log(`Finished ${event.path}: ${event.total_document_count} documents including nested`);
  }
}

async function writeRawExportIncrementally({
  projectId = "",
  outputDir = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const absoluteOutputDir = path.resolve(repoRoot, outputDir);
  const collectionsDir = path.join(absoluteOutputDir, "collections");
  await fs.mkdir(collectionsDir, { recursive: true });

  const { app, db, projectId: resolvedProjectId } = initializeAdminFirestore({ projectId });
  const collectionCounts = {};
  const collectionManifest = {};

  try {
    for (const collectionName of TARGET_FIRESTORE_COLLECTIONS) {
      const collectionExport = await exportCollectionRecursive(db.collection(collectionName), {
        onProgress: logProgress,
        progressEvery: 25,
      });
      const relativePath = `collections/${collectionName}.json`;
      await fs.writeFile(
        path.join(absoluteOutputDir, relativePath),
        `${JSON.stringify(collectionExport, null, 2)}\n`,
        "utf8",
      );
      collectionCounts[collectionName] = {
        documents: collectionExport.document_count,
        nested_documents: collectionExport.nested_document_count,
        total_documents: collectionExport.total_document_count,
      };
      collectionManifest[collectionName] = relativePath;
      console.log(`Wrote ${relativePath}`);
    }

    const manifest = {
      schema_version: RAW_FIRESTORE_EXPORT_SCHEMA_VERSION,
      export_mode: "firestore_raw_export",
      generated_at: generatedAt,
      project_id: resolvedProjectId,
      target_collections: TARGET_FIRESTORE_COLLECTIONS,
      collection_counts: collectionCounts,
      collections: collectionManifest,
    };
    await fs.writeFile(
      path.join(absoluteOutputDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    return {
      outputDir: absoluteOutputDir,
      manifest,
    };
  } finally {
    await closeAdminApp(app);
  }
}

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
  const timestamp = options.timestamp || makeTimestampId(new Date(generatedAt));
  const outputDir = options.out
    ? path.resolve(repoRoot, options.out)
    : path.join(repoRoot, "publishing", "data_analysis", "firestore_raw_export", timestamp);
  const { outputDir: absoluteOutputDir, manifest } = await writeRawExportIncrementally({
    projectId: options.projectId,
    outputDir,
    generatedAt,
  });

  console.log(`Wrote raw Firestore export to ${absoluteOutputDir}`);
  for (const [collectionName, count] of Object.entries(manifest.collection_counts || {})) {
    console.log(`${collectionName}: ${count.total_documents} documents including nested subcollections`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
