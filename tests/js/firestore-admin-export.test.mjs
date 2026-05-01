import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCredentialPreflight,
  getPublicationPseudonym,
  sanitizeFirestoreExportForPublication,
  serializeFirestoreValue,
  validatePublicationSafeFirestoreExport,
} from "../../scripts/firestore-admin-export-common.mjs";

function makeRawFirestoreExport() {
  return {
    export_mode: "firestore_raw_export",
    generated_at: "2026-04-30T20:00:00.000Z",
    project_id: "bundling-63c10",
    target_collections: ["Users", "QualtricsResponses", "LiveSessions"],
    collections: {
      Users: {
        id: "Users",
        path: "Users",
        document_count: 1,
        nested_document_count: 1,
        total_document_count: 2,
        documents: [
          {
            id: "student_1",
            path: "Users/student_1",
            data: {
              displayName: "Jane Student",
              resultAccessKey: "secret_result_key",
              researchStudy: {
                policy_arm: "contextual_bandit",
                phase: "B",
              },
            },
            subcollections: {
              Actions: {
                id: "Actions",
                path: "Users/student_1/Actions",
                document_count: 1,
                nested_document_count: 0,
                total_document_count: 1,
                documents: [
                  {
                    id: "round_16",
                    path: "Users/student_1/Actions/round_16",
                    data: {
                      type: "round_summary",
                      participantId: "student_1",
                      phase: "B",
                      policy_arm: "contextual_bandit",
                      scenario_id: "scenario_16",
                      recommendation_source: "model_registry",
                      shown_recommendation_bundle_ids: ["o1", "o2"],
                      chosen_orders: ["o1", "o2"],
                      best_bundle_ids: ["o1", "o2"],
                      reward: 0.91,
                      legal_action_mask_version: "legal_bundle_mask_v1",
                    },
                    subcollections: {},
                  },
                ],
              },
            },
          },
        ],
      },
      QualtricsResponses: {
        id: "QualtricsResponses",
        path: "QualtricsResponses",
        document_count: 1,
        nested_document_count: 0,
        total_document_count: 1,
        documents: [
          {
            id: "R_abc123secret",
            path: "QualtricsResponses/R_abc123secret",
            data: {
              response_id: "R_abc123secret",
              user_id: "student_1",
              result_access_key: "secret_result_key",
              match_key: "student_1::secret_result_key",
              raw_fields: {
                studentName: "Jane Student",
                freeText: "private comment",
              },
              finished: true,
              progress: 100,
              save_status: "saved",
            },
            subcollections: {},
          },
        ],
      },
      LiveSessions: {
        id: "LiveSessions",
        path: "LiveSessions",
        document_count: 1,
        nested_document_count: 1,
        total_document_count: 2,
        documents: [
          {
            id: "session_a",
            path: "LiveSessions/session_a",
            data: { status: "active" },
            subcollections: {
              participants: {
                id: "participants",
                path: "LiveSessions/session_a/participants",
                document_count: 1,
                nested_document_count: 0,
                total_document_count: 1,
                documents: [
                  {
                    id: "student_1",
                    path: "LiveSessions/session_a/participants/student_1",
                    data: {
                      participantId: "student_1",
                      displayName: "Jane Student",
                      earnings: 120,
                    },
                    subcollections: {},
                  },
                ],
              },
            },
          },
        ],
      },
    },
  };
}

test("Firestore serialization preserves special values in JSON-safe form", () => {
  const serialized = serializeFirestoreValue({
    createdAt: {
      seconds: 1,
      nanoseconds: 2000000,
      toDate: () => new Date("1970-01-01T00:00:01.002Z"),
    },
    point: { latitude: 37.87, longitude: -122.27 },
    bytes: new Uint8Array([1, 2, 3]),
    ref: { path: "Users/student_1", firestore: {} },
  });

  assert.deepEqual(serialized.createdAt, {
    __type: "timestamp",
    iso: "1970-01-01T00:00:01.002Z",
    seconds: 1,
    nanoseconds: 2000000,
  });
  assert.equal(serialized.point.__type, "geo_point");
  assert.equal(serialized.bytes.__type, "bytes");
  assert.equal(serialized.ref.__type, "document_reference");
});

test("credential preflight reports missing publication salt without printing secrets", async () => {
  const previousSalt = process.env.PUBLICATION_PSEUDONYM_SALT;
  delete process.env.PUBLICATION_PSEUDONYM_SALT;
  try {
    const preflight = await getCredentialPreflight({
      projectId: "bundling-63c10",
      requirePseudonymSalt: true,
    });
    assert.equal(preflight.projectId, "bundling-63c10");
    assert.equal(preflight.pseudonymSaltConfigured, false);
    assert.ok(preflight.missing.some((entry) => entry.includes("PUBLICATION_PSEUDONYM_SALT")));
  } finally {
    if (previousSalt == null) {
      delete process.env.PUBLICATION_PSEUDONYM_SALT;
    } else {
      process.env.PUBLICATION_PSEUDONYM_SALT = previousSalt;
    }
  }
});

test("publication-safe Firestore export pseudonymizes participants and removes identifiers", () => {
  const rawExport = makeRawFirestoreExport();
  const safeExport = sanitizeFirestoreExportForPublication(rawExport, {
    pseudonymSalt: "unit-test-private-salt",
    generatedAt: "2026-04-30T20:01:00.000Z",
  });
  const serialized = JSON.stringify(safeExport);
  const pseudonym = getPublicationPseudonym("student_1", "unit-test-private-salt");

  assert.equal(safeExport.export_mode, "firestore_publication_safe_export");
  assert.ok(serialized.includes(pseudonym));
  assert.equal(serialized.includes("student_1"), false);
  assert.equal(serialized.includes("Jane Student"), false);
  assert.equal(serialized.includes("secret_result_key"), false);
  assert.equal(serialized.includes("R_abc123secret"), false);
  assert.equal(serialized.includes("raw_fields"), false);
  assert.equal(serialized.includes("private comment"), false);
  assert.ok(serialized.includes("contextual_bandit"));
  assert.ok(serialized.includes("legal_bundle_mask_v1"));

  const validation = validatePublicationSafeFirestoreExport(safeExport, { rawExport });
  assert.equal(validation.ok, true);
});

