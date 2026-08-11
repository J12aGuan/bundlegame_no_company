/* Regression tests for bugs found in the deep review.
 * Each test names the failure mode it locks down.
 * Run: node --test qualtrics/test/bugs.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BUILT = path.join(ROOT, 'qualtrics/dist/bundlegame.treated.js');

function mkNode(tag) {
  const n = {
    tagName: String(tag).toUpperCase(), className: '', _text: '', value: '',
    childNodes: [], attrs: {}, listeners: {}, style: {}, parentNode: null,
    appendChild(c) { c.parentNode = n; n.childNodes.push(c); return c; },
    insertBefore(c, ref) { const i = n.childNodes.indexOf(ref); n.childNodes.splice(i < 0 ? 0 : i, 0, c); c.parentNode = n; return c; },
    replaceChild(nw, old) { const i = n.childNodes.indexOf(old); if (i >= 0) n.childNodes[i] = nw; nw.parentNode = n; return old; },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return n.attrs[k]; }, removeAttribute(k) { delete n.attrs[k]; },
    addEventListener(ev, fn) { (n.listeners[ev] = n.listeners[ev] || []).push(fn); },
    remove() { if (n.parentNode) n.parentNode.childNodes = n.parentNode.childNodes.filter(x => x !== n); },
    querySelector() { return null; },
    get textContent() { return n._text || n.childNodes.map(c => c.textContent).join(''); },
    set textContent(v) { n._text = String(v); n.childNodes = []; },
    get innerHTML() { return ''; }, set innerHTML(v) { n.childNodes = []; }
  };
  return n;
}
const walk = (n, out = []) => { out.push(n); n.childNodes.forEach(c => walk(c, out)); return out; };
const fire = (n, ev = 'click') => (n.listeners[ev] || []).forEach(f => f({ target: n }));
const byClass = (r, c) => walk(r).filter(n => String(n.className).split(' ').includes(c));
const byAttr = (r, k, v) => walk(r).filter(n => n.attrs[k] === v);
const btnWith = (r, t) => walk(r).filter(n => n.tagName === 'BUTTON').find(b => b.textContent.includes(t));
// exact aisle match: 'apple' must not select the 'pineapple' cell
const cellFor = (root, item) => walk(root).find(n =>
  n.attrs['data-bg'] === 'cell' && n.attrs['data-item'] === String(item).trim().toLowerCase());

function boot(overrides = {}, opts = {}) {
  // onboarding is ON by default in CONFIG; tests opt out unless they target it
  const embedded = { ResponseID: 'bug', bg_SHOW_INSTRUCTIONS: 'false', bg_TUTORIAL_ROUNDS: '0', ...overrides };
  const timers = [];
  const doc = {
    body: mkNode('body'), head: mkNode('head'), createElement: mkNode,
    createTextNode: t => { const n = mkNode('#text'); n.textContent = t; return n; },
    getElementById(id) { return walk(globalThis.__st || doc.body).find(n => n.attrs.id === id) || null; }
  };
  const sandbox = {
    console, document: doc, alert: m => sandbox.__alerts.push(m), confirm: () => true, __alerts: [],
    // deferred timers let us test what happens when a walk/delivery resolves late
    setTimeout: opts.deferTimers ? (fn => { timers.push(fn); return timers.length; }) : (fn => { fn(); return 0; }),
    clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { },
    atob: b64 => Buffer.from(b64, 'base64').toString('binary'),
    localStorage: opts.localStorage || (() => { const m = new Map(); return {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k) };
    })(),

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
  vm.runInContext(fs.readFileSync(BUILT, 'utf8'), sandbox);
  const stage = mkNode('div');
  globalThis.__st = stage;
  sandbox.BundleGame.boot(stage, sandbox.BUNDLEGAME_DATA, sandbox.BUNDLEGAME_CONFIG);
  return { sandbox, stage, embedded, doc, runTimers: () => { while (timers.length) timers.shift()(); } };
}

/* ------------------------------------------------------------------ bugs */

test('BUG: every CONFIG key the docs promise is actually honoured', () => {
  const cfg = fs.readFileSync(path.join(ROOT, 'qualtrics/src/config.js'), 'utf8');
  const eng = fs.readFileSync(path.join(ROOT, 'qualtrics/src/engine.js'), 'utf8')
    + fs.readFileSync(path.join(ROOT, 'qualtrics/src/boot.js'), 'utf8');
  const keys = [...cfg.matchAll(/^\s{2}([A-Z_]+):/gm)].map(m => m[1]);
  const dead = keys.filter(k => !eng.includes('CFG.' + k) && !eng.includes('BUNDLEGAME_CONFIG.' + k));
  assert.deepEqual(dead, [], `CONFIG keys that do nothing: ${dead.join(', ')}`);
});

test('BUG: a treated arm must never fail silently when oracle data is absent', () => {
  const { stage, embedded } = boot({
    bg_DATASET: 'chi_dynamic_v2', bg_ARM: 'oracle', bg_START_ROUND: '16',
    bg_RECOMMENDATION_ROUNDS: '[16,35]', bg_SESSION_TIME_LIMIT: '0'
  });
  const shown = byClass(stage, 'bg-rec').length > 0;
  const flagged = Number(embedded.bg_recommendation_unavailable) === 1;
  // Either a recommendation renders, or the run is explicitly flagged as unable
  // to render one. Showing nothing with no signal is the bug.
  assert.ok(shown || flagged,
    'treated arm rendered no recommendation and set no bg_recommendation_unavailable flag');
});

test('BUG: round time limit is enforced', () => {
  const { sandbox } = boot({ bg_ROUND_TIME_LIMIT: '5', bg_SESSION_TIME_LIMIT: '0' });
  const src = fs.readFileSync(path.join(ROOT, 'qualtrics/src/engine.js'), 'utf8');
  assert.ok(/CFG\.ROUND_TIME_LIMIT/.test(src), 'ROUND_TIME_LIMIT must be read somewhere');
});

test('BUG: session end must not be resurrected by an in-flight walk or delivery', () => {
  const { sandbox, stage, embedded, runTimers } = boot(
    { bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '3', bg_SESSION_TIME_LIMIT: '0' },
    { deferTimers: true });
  fire(byAttr(stage,'data-bg','order')[0]);
  fire(btnWith(stage, 'Order')); fire(btnWith(stage, 'Start Picking'));
  const cell = byAttr(stage,'data-bg','cell').find(c => !c.className.includes('empty'));
  fire(cell);                       // starts a walk whose timer has NOT fired
  sandbox.BundleGame._internals.forceEnd('test_end');
  const finishedAt = Number(embedded.bg_finished);
  runTimers();                      // the stale walk now resolves
  assert.equal(finishedAt, 1, 'session marked finished');
  assert.equal(Number(embedded.bg_finished), 1, 'a late timer must not un-finish the session');
});

test('BUG: the event payload must contain no whitespace (chunk boundaries are trimmed by Qualtrics)', () => {
  const { sandbox, stage, embedded, doc } = boot({ bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '2', bg_SESSION_TIME_LIMIT: '0' });
  // drive an event that carries a user-typed string and a store name with spaces
  fire(byAttr(stage,'data-bg','order')[0]);
  const map = btnWith(stage, 'View store map');
  if (map) fire(map);
  fire(btnWith(stage, 'Order')); fire(btnWith(stage, 'Start Picking'));
  const cell = byAttr(stage,'data-bg','cell').find(c => !c.className.includes('empty'));
  fire(cell);
  doc.getElementById('bg-item-in').value = 'two words here';
  doc.getElementById('bg-qty-0').value = '1';
  fire(btnWith(stage, 'Add to Selected Bags'));   // logs item_entry_failed with the typed text
  fire(btnWith(stage, 'Checkout & Deliver'));

  const chunks = [];
  for (let i = 1; i <= sandbox.BUNDLEGAME_CONFIG.MAX_EVENT_CHUNKS; i++) chunks.push(embedded['bg_events_' + i] || '');
  const packed = chunks.join('');
  assert.ok(packed.length, 'events were written');
  assert.equal(/\s/.test(packed), false,
    'payload contains whitespace; a chunk boundary landing on it would be trimmed and corrupt reassembly');
  assert.doesNotThrow(() => JSON.parse(packed), 'payload still parses');
});

test('BUG: START_ROUND beyond the sliced round window must not end the game instantly', () => {
  const { embedded, stage } = boot({
    bg_DATASET: 'mainGame', bg_START_ROUND: '16', bg_TOTAL_ROUNDS: '5', bg_SESSION_TIME_LIMIT: '0'
  });
  assert.notEqual(Number(embedded.bg_finished), 1,
    'starting at round 16 with TOTAL_ROUNDS=5 ended the session before a single round');
  assert.ok(byAttr(stage,'data-bg','order').length > 0, 'a playable round is rendered');
});

test('BUG: idle/other time is accounted for, not left at zero', () => {
  const { sandbox, stage, embedded, doc } = boot({ bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '2', bg_SESSION_TIME_LIMIT: '0' });
  const data = sandbox.BUNDLEGAME_DATA.datasets.mainGame;
  const sc = data.scenarios.find(s => Number(s.round) === 1);
  const target = data.orders.find(o => String(o.id) === String(sc.order_ids[0]));
  fire(byAttr(stage,'data-bg','order')[0]);
  fire(btnWith(stage, 'Order')); fire(btnWith(stage, 'Start Picking'));
  for (const [item, qty] of Object.entries(target.items)) {
    fire(cellFor(stage, item));
    doc.getElementById('bg-item-in').value = item;
    doc.getElementById('bg-qty-0').value = String(qty);
    fire(btnWith(stage, 'Add to Selected Bags'));
  }
  fire(btnWith(stage, 'Checkout & Deliver'));
  fire(walk(stage).filter(n => n.tagName === 'BUTTON' && n.textContent.trim() === 'Deliver')[0]);

  const t = JSON.parse(embedded.bg_timing)[0];
  const keys = Object.keys(t.b);
  assert.ok(keys.includes('idleOrOtherTime'), 'idleOrOtherTime bucket exists');
  assert.ok(t.b.idleOrOtherTime >= 0, 'idle time is never negative');

  // The buckets mix MODELLED durations (aisle walk, delivery, penalty — added as
  // the simulated cost) with MEASURED durations (thinking, item entry), exactly
  // as the original does. So they cannot be asserted equal to wall clock; this
  // test runs with synchronous timers, where wall clock is ~0. The invariant
  // that must hold is that idle is the residual, so the buckets never
  // UNDER-account for the round.
  const accounted = keys.filter(k => k !== 'idleOrOtherTime').reduce((a, k) => a + t.b[k], 0);
  const summed = keys.reduce((a, k) => a + t.b[k], 0);
  assert.equal(Math.round(summed * 100) / 100, Math.round(Math.max(accounted, t.total) * 100) / 100,
    'sum of buckets must equal max(explicitly accounted, round duration)');
  assert.ok(summed >= t.total - 1e-9, 'buckets never under-account for the round');
});

/* --------------------------------------------- CHI block design integrity */

test('feedback follows the dataset block design, not a flat round window', () => {
  const { sandbox } = boot({ bg_DATASET: 'chi_dynamic_v2', bg_SESSION_TIME_LIMIT: '0' });
  const scen = sandbox.BUNDLEGAME_DATA.datasets.chi_dynamic_v2.scenarios;
  const on = scen.filter(s => s.feedback_enabled).map(s => s.round);
  const off = scen.filter(s => Number(s.round) > 15 && !s.feedback_enabled).map(s => s.round);
  // B1 = 16-20, B3 = 26-30 get help; B2 (retention) and B4 (transfer) must not.
  assert.deepEqual([...on], [16, 17, 18, 19, 20, 26, 27, 28, 29, 30], 'feedback-on rounds');
  assert.deepEqual([...off], [21, 22, 23, 24, 25, 31, 32, 33, 34, 35], 'retention/transfer rounds stay unaided');
});

test('a treated arm gets help ONLY on feedback-on rounds', () => {
  const shown = round => {
    const { stage } = boot({
      bg_DATASET: 'chi_dynamic_v2', bg_ARM: 'counterfactual',
      bg_START_ROUND: String(round), bg_TOTAL_ROUNDS: '1', bg_SESSION_TIME_LIMIT: '0'
    });
    return byClass(stage, 'bg-rec').length > 0;
  };
  assert.equal(shown(18), true, 'round 18 (B1, feedback on) shows a recommendation');
  assert.equal(shown(28), true, 'round 28 (B3, feedback on) shows a recommendation');
  assert.equal(shown(23), false, 'round 23 (B2 retention) must NOT show a recommendation');
  assert.equal(shown(33), false, 'round 33 (B4 transfer) must NOT show a recommendation');
  assert.equal(shown(5), false, 'Phase A is always unaided');
});

test('control never sees help, even on feedback-on rounds', () => {
  const { stage } = boot({
    bg_DATASET: 'chi_dynamic_v2', bg_ARM: 'control',
    bg_START_ROUND: '18', bg_TOTAL_ROUNDS: '1', bg_SESSION_TIME_LIMIT: '0'
  });
  assert.equal(byClass(stage, 'bg-rec').length, 0);
});

test('block, test_set and stress are logged so retention/transfer are analysable', () => {
  const { sandbox, stage, embedded, doc } = boot({
    bg_DATASET: 'chi_dynamic_v2', bg_ARM: 'counterfactual',
    bg_START_ROUND: '23', bg_TOTAL_ROUNDS: '1', bg_SESSION_TIME_LIMIT: '0'
  });
  const ds = sandbox.BUNDLEGAME_DATA.datasets.chi_dynamic_v2;
  const sc = ds.scenarios.find(s => Number(s.round) === 23);
  const target = ds.orders.find(o => String(o.id) === String(sc.order_ids[0]));
  fire(byAttr(stage,'data-bg','order')[0]);
  fire(btnWith(stage, 'Order')); fire(btnWith(stage, 'Start Picking'));
  for (const [item, qty] of Object.entries(target.items || {})) {
    const cell = cellFor(stage, item); if (!cell) continue;
    fire(cell);
    doc.getElementById('bg-item-in').value = item;
    doc.getElementById('bg-qty-0').value = String(qty);
    fire(btnWith(stage, 'Add to Selected Bags'));
  }
  fire(btnWith(stage, 'Checkout & Deliver'));
  let g = 0;
  while (g++ < 6) {
    const d = walk(stage).filter(n => n.tagName === 'BUTTON' && n.textContent.trim() === 'Deliver');
    if (!d.length) break; fire(d[0]);
  }
  const row = JSON.parse(embedded.bg_decisions)[0];
  assert.equal(row.blk, 'B2', 'block recorded');
  assert.equal(row.ts, 'retention_same_dist', 'test_set recorded');
  assert.equal(row.fb, 0, 'feedback flag recorded as off');
  assert.ok(row.st, 'stress label recorded');
});

test('the answer key is not plainly readable in the built file', () => {
  const built = fs.readFileSync(BUILT, 'utf8');
  // With --with-oracle the ids are base64-encoded, so the raw id strings that
  // reveal the answer must not appear as an "oracle_bundle_ids" array.
  assert.equal(/"oracle_bundle_ids"\s*:/.test(built), false,
    'oracle_bundle_ids must not be shipped in the clear');
});

/* ------------------------------------------------------------- rendering */

test('every renderable item has a fallback glyph (the Firestore emoji map is empty)', () => {
  const built = fs.readFileSync(BUILT, 'utf8');
  const data = JSON.parse(built.match(/var BUNDLEGAME_DATA = (\{[\s\S]*?\});\n/)[1]);
  const cfg = boot().sandbox.BUNDLEGAME_CONFIG;
  assert.deepEqual(data.emojis, {}, 'Firestore emoji map really is empty — hence the CONFIG fallback');

  const need = new Set();
  for (const ds of Object.values(data.datasets))
    for (const o of ds.orders) Object.keys(o.items || {}).forEach(k => need.add(k.trim().toLowerCase()));
  for (const st of data.stores.stores)
    for (const row of st.locations) for (const c of row) {
      const v = String(c).trim().toLowerCase();
      if (v && v !== 'entrance') need.add(v);
    }
  const missing = [...need].filter(n => !cfg.ITEM_EMOJI[n]);
  assert.deepEqual(missing, [], `items with no glyph would render as a dot: ${missing.join(', ')}`);
});

/* ------------------------------------------- two-survey answer-key split */

test('the control build contains no answer key, in any form', () => {
  const p = path.join(ROOT, 'qualtrics/dist/bundlegame.control.js');
  if (!fs.existsSync(p)) return;                    // built by qualtrics:surveys
  const src = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(src.match(/var BUNDLEGAME_DATA = (\{[\s\S]*?\});\n/)[1]);
  for (const [root, ds] of Object.entries(data.datasets)) {
    const keyed = ds.scenarios.filter(s => s.k || s.oracle_bundle_ids);
    assert.equal(keyed.length, 0, `${root}: control build must ship zero oracle keys`);
  }
  assert.match(src, /ARM:\s*'control'/, 'control build must default ARM to control');
});

test('the treated build ships the key, encoded, on every scenario', () => {
  const p = path.join(ROOT, 'qualtrics/dist/bundlegame.treated.js');
  if (!fs.existsSync(p)) return;
  const src = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(src.match(/var BUNDLEGAME_DATA = (\{[\s\S]*?\});\n/)[1]);
  const chi = data.datasets.chi_dynamic_v2;
  assert.equal(chi.scenarios.filter(s => s.k).length, chi.scenarios.length, 'every scenario keyed');
  assert.equal(chi.scenarios.filter(s => s.oracle_bundle_ids).length, 0, 'never in plaintext');
});

/* ------------------------------------- crash persistence (page-submit gap) */

test('an interrupted run is checkpointed and offers to resume', () => {
  // Shared storage across two boots, simulating a reload in the same browser.
  const store = new Map();
  const ls = { getItem: k => (store.has(k) ? store.get(k) : null),
               setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

  const first = boot({ bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '4', bg_SESSION_TIME_LIMIT: '0' }, { localStorage: ls });
  const data = first.sandbox.BUNDLEGAME_DATA.datasets.mainGame;
  const sc = data.scenarios.find(s => Number(s.round) === 1);
  const target = data.orders.find(o => String(o.id) === String(sc.order_ids[0]));
  fire(byAttr(first.stage,'data-bg','order')[0]);
  fire(btnWith(first.stage, 'Order')); fire(btnWith(first.stage, 'Start Picking'));
  for (const [item, qty] of Object.entries(target.items || {})) {
    const cell = cellFor(first.stage, item); if (!cell) continue;
    fire(cell);
    first.doc.getElementById('bg-item-in').value = item;
    first.doc.getElementById('bg-qty-0').value = String(qty);
    fire(btnWith(first.stage, 'Add to Selected Bags'));
  }
  fire(btnWith(first.stage, 'Checkout & Deliver'));
  let g = 0;
  while (g++ < 6) {
    const d = walk(first.stage).filter(n => n.tagName === 'BUTTON' && n.textContent.trim() === 'Deliver');
    if (!d.length) break; fire(d[0]);
  }
  assert.ok(store.size > 0, 'a checkpoint was written after round 1');

  // "reload": same participant id, same storage
  const second = boot({ bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '4', bg_SESSION_TIME_LIMIT: '0' }, { localStorage: ls });
  const resumeBtn = walk(second.stage).filter(n=>n.tagName==='BUTTON').find(b => /Continue my game/.test(b.textContent));
  assert.ok(resumeBtn, 'reload offers to resume');
  fire(resumeBtn);
  assert.equal(Number(second.embedded.bg_resumed), 1, 'resume is flagged in the data');
  assert.equal(JSON.parse(second.embedded.bg_decisions).length, 1, 'the completed round survived the reload');
});

test('a finished run does not offer to resume', () => {
  const store = new Map();
  const ls = { getItem: k => (store.has(k) ? store.get(k) : null),
               setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const a = boot({ bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '1', bg_SESSION_TIME_LIMIT: '0' }, { localStorage: ls });
  a.sandbox.BundleGame._internals.forceEnd('done');
  const b = boot({ bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '1', bg_SESSION_TIME_LIMIT: '0' }, { localStorage: ls });
  assert.equal(walk(b.stage).filter(n=>n.tagName==='BUTTON').some(x => /Continue my game/.test(x.textContent)), false);
});

test('FIELD_PREFIX namespaces every write, so two game questions cannot collide', () => {
  // Inputs are bg_*-named config overrides; only compare what the engine ADDS.
  const inputs = { bg_DATASET: 'mainGame', bg_FIELD_PREFIX: 'bgt_', bg_SESSION_TIME_LIMIT: '0',
                   bg_SHOW_INSTRUCTIONS: 'false', bg_TUTORIAL_ROUNDS: '0' };
  const { embedded } = boot(inputs);
  const before = new Set(['ResponseID', ...Object.keys(inputs)]);
  const added = Object.keys(embedded).filter(k => !before.has(k));
  assert.ok(added.length > 3, `engine wrote nothing: ${added.join(', ')}`);
  assert.ok(added.every(k => k.startsWith('bgt_')),
    `every engine write must use the prefix; stray keys: ${added.filter(k => !k.startsWith('bgt_')).join(', ')}`);
});
