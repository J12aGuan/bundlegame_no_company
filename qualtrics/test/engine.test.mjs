/* Tests for the Qualtrics port.
 * Two kinds:
 *   1. unit tests of the ported pure logic
 *   2. cross-checks against the original SvelteKit implementation, so the port
 *      is verified against the real thing rather than against my re-reading
 * Run: node --test qualtrics/test/engine.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { crossCityExtraTime } from '../../src/lib/scripts/scenarioTime.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');

/* Load the built bundle into a sandbox with just enough globals. */
function loadBundle() {
  const code = fs.readFileSync(path.join(ROOT, 'qualtrics/dist/bundlegame.treated.js'), 'utf8');
  const embedded = {};
  const sandbox = {
    console,
    document: { getElementById: () => null, createElement: () => ({ style: {}, appendChild() { }, setAttribute() { }, addEventListener() { } }), head: { appendChild() { } }, body: { appendChild() { } } },
    alert: () => { }, confirm: () => true,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Qualtrics: {
      SurveyEngine: {
        addOnload: () => { }, addOnUnload: () => { },
        getEmbeddedData: k => (k in embedded ? embedded[k] : null),
        setEmbeddedData: (k, v) => { embedded[k] = v; }
      }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return { sandbox, embedded };
}

const { sandbox } = loadBundle();
const I = sandbox.BundleGame._internals;
const DATA = sandbox.BUNDLEGAME_DATA;
const CFG = sandbox.BUNDLEGAME_CONFIG;

/* ---------------------------------------------------------- shipped data */

test('built payload carries the datasets and a default that exists', () => {
  assert.ok(DATA.datasets.mainGame, 'mainGame present');
  assert.equal(DATA.datasets.mainGame.scenarios.length, 50);
  assert.equal(DATA.datasets.mainGame.orders.length, 200);
  assert.ok(DATA.datasets[CFG.DATASET], 'CONFIG.DATASET resolves to a shipped dataset');
});

test('every scenario order id resolves to a shipped order', () => {
  for (const [root, ds] of Object.entries(DATA.datasets)) {
    const ids = new Set(ds.orders.map(o => String(o.id)));
    for (const s of ds.scenarios) {
      for (const oid of s.order_ids || []) {
        assert.ok(ids.has(String(oid)), `${root} ${s.scenario_id} references missing order ${oid}`);
      }
    }
  }
});

test('every referenced store has a layout with an entrance and a grid', () => {
  const byName = new Map(DATA.stores.stores.map(s => [String(s.store), s]));
  for (const [root, ds] of Object.entries(DATA.datasets)) {
    for (const o of ds.orders) {
      const cfg = byName.get(String(o.store));
      assert.ok(cfg, `${root}: no layout for store ${o.store}`);
      assert.ok(Array.isArray(cfg.Entrance), `${o.store} missing Entrance`);
      assert.ok(Array.isArray(cfg.locations) && cfg.locations.length, `${o.store} missing locations grid`);
    }
  }
});

test('every item a scenario asks for exists somewhere in that store grid', () => {
  const byName = new Map(DATA.stores.stores.map(s => [String(s.store), s]));
  const missing = [];
  for (const [root, ds] of Object.entries(DATA.datasets)) {
    for (const o of ds.orders) {
      const cfg = byName.get(String(o.store));
      const cells = new Set(I.gridOf(cfg).flat().map(c => c.toLowerCase()));
      for (const item of Object.keys(o.items || {})) {
        if (!cells.has(String(item).toLowerCase().trim())) missing.push(`${root}/${o.id}: "${item}" not in ${o.store}`);
      }
    }
  }
  // An unreachable item would make the round impossible to complete.
  assert.deepEqual(missing, [], `unreachable items:\n${missing.slice(0, 10).join('\n')}`);
});

test('every cross-city hop a dataset can require has a travel time', () => {
  const gaps = [];
  for (const [root, ds] of Object.entries(DATA.datasets)) {
    const cities = [...new Set(ds.orders.map(o => String(o.city)))];
    for (const a of cities) for (const b of cities) {
      if (a === b) continue;
      const t = (DATA.cities.travelTimes[a] || {})[b];
      if (!(Number(t) > 0)) gaps.push(`${root}: ${a} -> ${b}`);
    }
  }
  assert.deepEqual(gaps, [], `missing city routes:\n${gaps.join('\n')}`);
});

/* --------------------------------------------------------- ported logic */

test('bundle legality: same-store rule matches getBundleLegality', () => {
  I.setConfig({ ...CFG, SAME_STORE_BUNDLES_ONLY: true });
  const A = { id: 'a', store: 'S1' }, B = { id: 'b', store: 'S1' }, C = { id: 'c', store: 'S2' };
  assert.equal(I.bundleLegal([]), false, 'empty bundle illegal');
  assert.equal(I.bundleLegal([A]), true, 'single order always legal');
  assert.equal(I.bundleLegal([A, B]), true, 'same store legal');
  assert.equal(I.bundleLegal([A, C]), false, 'cross store illegal');
  assert.equal(I.bundleLegal([A, B, C]), false, 'any cross store illegal');
  assert.equal(I.bundleLegal([{ id: 'x', store: '' }, { id: 'y', store: '' }]), false, 'missing store illegal');
});

test('checkout matching requires one distinct exact-match bag per order', () => {
  const ok = (orders, bags) => I.bagsMatchOrders(orders, bags);
  const o = items => ({ items });
  assert.equal(ok([o({ Apple: 2 })], [{ apple: 2 }]), true, 'case-insensitive exact match');
  assert.equal(ok([o({ Apple: 2 })], [{ apple: 1 }]), false, 'wrong quantity fails');
  assert.equal(ok([o({ Apple: 2 })], [{ apple: 2, pear: 1 }]), false, 'extra item fails');
  assert.equal(ok([o({ Apple: 1, Pear: 1 })], [{ apple: 1 }]), false, 'missing item fails');
  // two identical orders need two bags, not one reused
  assert.equal(ok([o({ Apple: 1 }), o({ Apple: 1 })], [{ apple: 1 }, { apple: 1 }]), true);
  assert.equal(ok([o({ Apple: 1 }), o({ Apple: 1 })], [{ apple: 1 }, {}]), false, 'bag cannot be reused');
  // order of bags must not matter
  assert.equal(ok([o({ Apple: 1 }), o({ Pear: 2 })], [{ pear: 2 }, { apple: 1 }]), true, 'bag order irrelevant');
});

test('cross-city travel agrees with the original crossCityExtraTime', () => {
  const cities = DATA.cities;
  const names = Object.keys(cities.travelTimes);
  let compared = 0;
  for (const from of names) for (const to of names) {
    const mine = I.cityTravel(from, to, cities);
    // original signature is (orderCity, currentCity, context)
    const theirs = crossCityExtraTime(to, from, { citiesDataset: cities });
    assert.equal(mine, theirs, `${from} -> ${to}`);
    compared++;
  }
  assert.ok(compared >= 16, `compared ${compared} city pairs`);
});

/* ------------------------------------------------------------ telemetry */

test('event chunking splits, reports truncation, and never silently drops', () => {
  const s = 'x'.repeat(1000);
  let r = I.chunkString(s, 300, 8);
  assert.equal(r.chunks.length, 4);
  assert.equal(r.chunks.join(''), s, 'chunks reassemble exactly');
  assert.equal(r.truncated, false);
  assert.equal(r.droppedChars, 0);

  r = I.chunkString('y'.repeat(1000), 300, 2);   // only room for 600 chars
  assert.equal(r.chunks.length, 2);
  assert.equal(r.truncated, true, 'overflow is reported');
  assert.equal(r.droppedChars, 400, 'dropped count is exact');
});

test('a heaviest-case event payload fits the configured chunk budget', () => {
  // june-p001 produced ~51 KB of events; confirm the default budget covers it.
  const budget = CFG.EVENT_CHUNK_CHARS * CFG.MAX_EVENT_CHUNKS;
  assert.ok(budget >= 51 * 1024, `budget ${budget} chars must cover the ~51KB heaviest observed run`);
});

/* --------------------------------------------------------------- config */

test('embedded data overrides CONFIG, with type coercion', () => {
  const { sandbox: s2 } = loadBundle();
  const QSE = s2.Qualtrics.SurveyEngine;
  QSE.setEmbeddedData('bg_TOTAL_ROUNDS', '30');
  QSE.setEmbeddedData('bg_DETAILED_TELEMETRY', 'false');
  QSE.setEmbeddedData('bg_ARM', 'counterfactual');
  QSE.setEmbeddedData('bg_RECOMMENDATION_ROUNDS', '[11,20]');
  const out = s2.BundleGame._internals.resolveConfig(s2.BUNDLEGAME_CONFIG);
  assert.equal(out.TOTAL_ROUNDS, 30, 'number coerced');
  assert.equal(out.DETAILED_TELEMETRY, false, 'boolean coerced');
  assert.equal(out.ARM, 'counterfactual', 'string passed through');
  // arrays cross the vm realm boundary, so compare by value not prototype
  assert.deepEqual([...out.RECOMMENDATION_ROUNDS], [11, 20], 'array parsed');
  assert.equal(out.SESSION_TIME_LIMIT, s2.BUNDLEGAME_CONFIG.SESSION_TIME_LIMIT, 'unset keys keep their default');
});

test('blank or absent embedded data does not clobber a default', () => {
  const { sandbox: s3 } = loadBundle();
  s3.Qualtrics.SurveyEngine.setEmbeddedData('bg_DATASET', '');
  const out = s3.BundleGame._internals.resolveConfig(s3.BUNDLEGAME_CONFIG);
  assert.equal(out.DATASET, s3.BUNDLEGAME_CONFIG.DATASET);
});
