import assert from "node:assert/strict";
import { test } from "node:test";

import {
  enumerateLegalBundles,
  generateScenarioSetPayload,
  getBundleLegality,
} from "../../src/lib/scripts/generateScenarios.js";
import {
  baseGeneratorOptions,
  citiesDataset,
  storeDataset,
} from "./fixtures.mjs";

test("bundle legality enumeration excludes cross-store multi-order bundles", () => {
  const orders = [
    { id: "A", store: "Berkeley Bowl" },
    { id: "B", store: "Berkeley Bowl" },
    { id: "C", store: "Oakland Market" },
    { id: "D", store: "Oakland Market" },
  ];

  assert.deepEqual(getBundleLegality([orders[0]]), {
    legal: true,
    reason: "single_order",
  });
  assert.deepEqual(getBundleLegality([orders[0], orders[1]]), {
    legal: true,
    reason: "same_store_multi_order",
  });
  assert.deepEqual(getBundleLegality([orders[0], orders[2]]), {
    legal: false,
    reason: "multi_store_bundle",
  });

  const legalBundleIds = enumerateLegalBundles(orders, 3)
    .map((entry) => entry.bundle.map((order) => order.id).join("+"))
    .sort();

  assert.deepEqual(legalBundleIds, [
    "A",
    "A+B",
    "B",
    "C",
    "C+D",
    "D",
  ]);
});

test("scenario generation is deterministic for a seed and preserves candidate metadata", () => {
  const first = generateScenarioSetPayload(baseGeneratorOptions, {
    storeDataset,
    citiesDataset,
  });
  const second = generateScenarioSetPayload(baseGeneratorOptions, {
    storeDataset,
    citiesDataset,
  });
  const differentSeed = generateScenarioSetPayload(
    { ...baseGeneratorOptions, seed: "different-seed" },
    { storeDataset, citiesDataset },
  );

  assert.deepEqual(first.serialized, second.serialized);
  assert.notDeepEqual(
    first.serialized.orders.orders,
    differentSeed.serialized.orders.orders,
  );
  assert.equal(first.serialized.scenarios.scenarios.length, 50);
  assert.equal(first.serialized.optimal.optimal.length, 50);

  const allCandidates = first.serialized.optimal.optimal.flatMap(
    (row) => row.candidate_bundles || [],
  );
  assert.ok(allCandidates.length > 50);
  assert.ok(allCandidates.every((candidate) => candidate.legal === true));
  assert.ok(allCandidates.every((candidate) => Array.isArray(candidate.bundle_ids)));
  assert.ok(
    allCandidates.every((candidate) =>
      Array.isArray(candidate.delivery_sequence_ids),
    ),
  );
  assert.ok(
    allCandidates.every((candidate) =>
      Number.isFinite(Number(candidate.total_time_seconds)),
    ),
  );
  assert.ok(
    allCandidates.some(
      (candidate) => Number(candidate.cross_city_travel_time_seconds) > 0,
    ),
  );

  const firstOptimal = first.serialized.optimal.optimal[0];
  assert.deepEqual(
    firstOptimal.best_bundle_ids,
    firstOptimal.candidate_bundles[0].bundle_ids,
  );
  assert.equal(firstOptimal.candidate_bundles[0].regret_to_best, 0);
  assert.equal(firstOptimal.legal_bundle_model_version, "same_store_multi_order_v1");
  assert.equal(firstOptimal.route_optimizer_version, "exhaustive_permutation_v1");
  assert.equal(firstOptimal.reward_model_version, "route_aware_pay_per_second_v2");
  assert.equal(first.serialized.metadata.seed, "route-aware-seed");
});
