import {
  checkFirestoreConnection,
  getCredentialPreflight,
  loadDotEnv,
  parseCliArgs,
  printCredentialReport,
  TARGET_FIRESTORE_COLLECTIONS,
} from "./firestore-admin-export-common.mjs";

async function main() {
  await loadDotEnv();
  const options = parseCliArgs(process.argv.slice(2));
  const preflight = await getCredentialPreflight({ projectId: options.projectId });
  printCredentialReport(preflight);

  if (!preflight.ok) {
    process.exitCode = 1;
    return;
  }

  const result = await checkFirestoreConnection({
    projectId: options.projectId,
    collectionNames: TARGET_FIRESTORE_COLLECTIONS,
  });

  console.log(`Firestore connection: ${result.ok ? "ok" : "failed"}`);
  for (const entry of result.collections) {
    if (entry.ok) {
      console.log(`${entry.collection}: ${entry.count} documents (${entry.count_method})`);
    } else {
      console.log(`${entry.collection}: failed ${entry.error_code} ${entry.error_message}`);
    }
  }

  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

