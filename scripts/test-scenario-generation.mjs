import assert from 'node:assert/strict';

import { generateScenarioSetPayload } from '../src/lib/scripts/generateScenarios.js';

const storeDataset = {
  stores: [
    {
      store: 'Berkeley Bowl',
      city: 'Berkeley',
      Entrance: [0, 0],
      cellDistance: 1000,
      items: ['apples', 'bananas', 'rice', 'milk'],
      locations: [
        ['Entrance', 'apples', 'bananas'],
        ['rice', 'milk', 'apples']
      ]
    },
    {
      store: 'Oakland Market',
      city: 'Oakland',
      Entrance: [0, 0],
      cellDistance: 1000,
      items: ['tofu', 'noodles', 'tea', 'beans'],
      locations: [
        ['Entrance', 'tofu', 'noodles'],
        ['tea', 'beans', 'tofu']
      ]
    }
  ]
};

const citiesDataset = {
  startinglocation: 'Berkeley',
  travelTimes: {
    Berkeley: { Oakland: 10 },
    Oakland: { Berkeley: 10 }
  }
};

const baseOptions = {
  datasetName: 'generator_test',
  totalRounds: 50,
  maxBundle: 3,
  payMin: 8,
  payMax: 24,
  seed: 'route-aware-seed',
  generatedAt: '2026-04-28T00:00:00.000Z',
  scenarioSetVersionId: 'generator_test_fixed'
};

const first = generateScenarioSetPayload(baseOptions, { storeDataset, citiesDataset });
const second = generateScenarioSetPayload(baseOptions, { storeDataset, citiesDataset });
assert.deepEqual(first.serialized, second.serialized);

const differentSeed = generateScenarioSetPayload(
  { ...baseOptions, seed: 'different-seed' },
  { storeDataset, citiesDataset }
);
assert.notDeepEqual(first.serialized.orders.orders, differentSeed.serialized.orders.orders);

assert.equal(first.serialized.scenarios.scenarios.length, 50);
assert.equal(first.serialized.optimal.optimal.length, 50);

const allCandidates = first.serialized.optimal.optimal.flatMap((row) => row.candidate_bundles || []);
assert.ok(allCandidates.length > 50);
assert.ok(allCandidates.every((candidate) => Array.isArray(candidate.bundle_ids)));
assert.ok(allCandidates.every((candidate) => Array.isArray(candidate.delivery_sequence_ids)));
assert.ok(allCandidates.every((candidate) => Number.isFinite(Number(candidate.earnings))));
assert.ok(allCandidates.every((candidate) => Number.isFinite(Number(candidate.total_time_seconds))));
assert.ok(allCandidates.every((candidate) => Number.isFinite(Number(candidate.travel_time_seconds))));
assert.ok(allCandidates.some((candidate) => Number(candidate.cross_city_travel_time_seconds) > 0));

const firstOptimal = first.serialized.optimal.optimal[0];
assert.deepEqual(firstOptimal.best_bundle_ids, firstOptimal.candidate_bundles[0].bundle_ids);
assert.equal(firstOptimal.candidate_bundles[0].regret_to_best, 0);
assert.equal(firstOptimal.reward_model_version, 'route_aware_pay_per_second_v2');
assert.equal(first.serialized.metadata.seed, 'route-aware-seed');

console.log('scenario generation tests passed');
