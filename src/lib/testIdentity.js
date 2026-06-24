// Reserved TEST/QA participant identities.
//
// Ids whose (lower-cased) form starts with one of these prefixes are treated as test runs: they are
// EXCLUDED from research exports/analysis (so an admin playthrough never lands in the dataset) and
// are the only ids the reset tool is allowed to wipe. Keep this list short and obvious; it is the
// single source of truth shared by the export pipeline and scripts/_run-live-reset-test-user.mjs.
export const RESERVED_TEST_ID_PREFIXES = ["qa-", "qa_", "test-", "test_", "admin-", "admin_"];

/** True when `id` is a reserved test/QA identity (case-insensitive, leading/trailing space ignored). */
export function isReservedTestId(id = "") {
  const s = String(id ?? "").trim().toLowerCase();
  if (!s) return false;
  return RESERVED_TEST_ID_PREFIXES.some((p) => s.startsWith(p));
}
