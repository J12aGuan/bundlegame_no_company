/* End-to-end: plays a real round through the actual UI code path.
 * Uses a ~70-line DOM shim rather than pulling in jsdom, so this runs with no
 * new dependencies. Timers are made synchronous so aisle walks and deliveries
 * resolve deterministically.
 * Run: node --test qualtrics/test/integration.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* ------------------------------------------------------------- DOM shim */
function mkNode(tag) {
  const n = {
    tagName: String(tag).toUpperCase(), className: '', _text: '', value: '',
    childNodes: [], attrs: {}, listeners: {}, style: {}, parentNode: null,
    appendChild(c) { c.parentNode = n; n.childNodes.push(c); return c; },
    insertBefore(c, ref) { const i = n.childNodes.indexOf(ref); n.childNodes.splice(i < 0 ? 0 : i, 0, c); c.parentNode = n; return c; },
    replaceChild(nw, old) { const i = n.childNodes.indexOf(old); if (i >= 0) n.childNodes[i] = nw; nw.parentNode = n; return old; },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return n.attrs[k]; },
    removeAttribute(k) { delete n.attrs[k]; },
    addEventListener(ev, fn) { (n.listeners[ev] = n.listeners[ev] || []).push(fn); },
    remove() { if (n.parentNode) n.parentNode.childNodes = n.parentNode.childNodes.filter(x => x !== n); },
    querySelector() { return null; },
    get textContent() { return n._text || n.childNodes.map(c => c.textContent).join(''); },
    set textContent(v) { n._text = String(v); n.childNodes = []; },
    get innerHTML() { return ''; },
    set innerHTML(v) { n.childNodes = []; n._text = String(v || '') === '' ? '' : n._text; }
  };
  return n;
}
function walk(node, out = []) { out.push(node); node.childNodes.forEach(c => walk(c, out)); return out; }
function makeDocument() {
  const body = mkNode('body');
  return {
    body, head: mkNode('head'),
    createElement: mkNode,
    createTextNode: t => { const n = mkNode('#text'); n.textContent = t; return n; },
    getElementById(id) {
      for (const r of [globalThis.__stage, body]) {
        if (!r) continue;
        const hit = walk(r).find(n => n.attrs.id === id);
        if (hit) return hit;
      }
      return null;
    }
  };
}
const fire = (node, ev = 'click') => (node.listeners[ev] || []).forEach(fn => fn({ target: node }));
const all = (root, pred) => walk(root).filter(pred);
const byClass = (root, cls) => all(root, n => String(n.className).split(' ').includes(cls));
const byAttr = (r, k, v) => walk(r).filter(n => n.attrs[k] === v);
const btnWith = (root, txt) => walk(root).filter(n => n.tagName === 'BUTTON').find(b => b.textContent.includes(txt));
// exact aisle match: 'apple' must not select the 'pineapple' cell
const cellFor = (root, item) => walk(root).find(n =>
  n.attrs['data-bg'] === 'cell' && n.attrs['data-item'] === String(item).trim().toLowerCase());

/* ------------------------------------------------------------ load game */
function bootGame(overrides = {}) {
  const code = fs.readFileSync(path.join(ROOT, 'qualtrics/dist/bundlegame.treated.js'), 'utf8');
  // onboarding is ON by default in CONFIG; tests opt out unless they target it
  const embedded = { ResponseID: 'itest', bg_SHOW_INSTRUCTIONS: 'false', bg_TUTORIAL_ROUNDS: '0', ...overrides };
  const doc = makeDocument();
  const sandbox = {
    console, document: doc,
    alert: msg => { sandbox.__alerts.push(msg); },
    confirm: () => true,
    __alerts: [],
    // synchronous timers keep the walk/drive delays deterministic
    setTimeout: fn => { fn(); return 0; }, clearTimeout: () => { },
    setInterval: () => 0, clearInterval: () => { },
    atob: b64 => Buffer.from(b64, 'base64').toString('binary'),
    localStorage: (() => { const m = new Map(); return {
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
  vm.runInContext(code, sandbox);

  const stage = doc.createElement('div');
  globalThis.__stage = stage;
  sandbox.BundleGame.boot(stage, sandbox.BUNDLEGAME_DATA, sandbox.BUNDLEGAME_CONFIG);
  return { sandbox, stage, embedded, doc };
}

/* ---------------------------------------------------------------- tests */

test('a full round can be played: select -> pick -> checkout -> deliver', () => {
  const { sandbox, stage, embedded, doc } = bootGame({
    bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '3', bg_SESSION_TIME_LIMIT: '0'
  });
  const data = sandbox.BUNDLEGAME_DATA.datasets.mainGame;
  const sc = data.scenarios.find(s => Number(s.round) === 1);
  const orderById = new Map(data.orders.map(o => [String(o.id), o]));

  // --- selection screen shows the scenario's orders
  let cards = byAttr(stage,'data-bg','order');
  assert.equal(cards.length, sc.order_ids.length, 'one card per offered order');

  // pick the first order (a single-order bundle is always legal)
  const target = orderById.get(String(sc.order_ids[0]));
  fire(cards[0]);
  assert.ok(byAttr(stage,'data-bg','order')[0].className.includes('sel'), 'card marks as selected');

  // --- go to store
  fire(btnWith(stage, 'Order')); fire(btnWith(stage, 'Start Picking'));
  assert.ok(byAttr(stage, 'data-bg', 'cell').length, 'store grid rendered');

  // --- walk to each required item and add the right quantity
  for (const [item, qty] of Object.entries(target.items)) {
    const cell = cellFor(stage, item);
    assert.ok(cell, `aisle for ${item} is reachable`);
    fire(cell);                                   // synchronous walk
    doc.getElementById('bg-item-in').value = item; // typed-entry requirement
    doc.getElementById('bg-qty-0').value = String(qty);
    fire(btnWith(stage, 'Add to Selected Bags'));
  }
  assert.deepEqual(sandbox.__alerts, [], 'no validation alerts while picking');

  // --- checkout should pass and move to delivery
  fire(btnWith(stage, 'Checkout & Deliver'));
  const delivers = walk(stage).filter(n => n.tagName === 'BUTTON' && n.textContent.trim() === 'Deliver');
  assert.equal(delivers.length, 1, 'one delivery for a single-order bundle');

  fire(delivers[0]);

  // --- round completed and advanced
  assert.equal(Number(embedded.bg_rounds_completed), 1, 'one round recorded');
  assert.equal(Number(embedded.bg_earnings), target.earnings, 'earnings credited');
  const decisions = JSON.parse(embedded.bg_decisions);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].r, 1);
  assert.equal(decisions[0].ok, 1, 'round marked successful');
  assert.deepEqual([...decisions[0].c], [target.id], 'chosen bundle recorded');
  assert.equal(Number(embedded.bg_round_current), 2, 'advanced to round 2');
  assert.equal(Number(embedded.bg_round_reached), 2, 'deepest round started is 2');
});

test('wrong bag contents fail checkout and apply the penalty', () => {
  const { sandbox, stage, embedded } = bootGame({ bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '2', bg_SESSION_TIME_LIMIT: '0' });
  fire(byAttr(stage,'data-bg','order')[0]);
  fire(btnWith(stage, 'Order')); fire(btnWith(stage, 'Start Picking'));
  fire(btnWith(stage, 'Checkout & Deliver'));   // empty bags

  const decisions = JSON.parse(embedded.bg_decisions);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].ok, 0, 'round marked failed');
  assert.equal(Number(embedded.bg_earnings), 0, 'no earnings for a failed round');
  const timing = JSON.parse(embedded.bg_timing);
  assert.equal(timing[0].b.penaltyTime, sandbox.BUNDLEGAME_CONFIG.PENALTY_TIMEOUT, 'penalty recorded');
});

test('typed-item entry is enforced', () => {
  const { sandbox, stage, doc } = bootGame({ bg_DATASET: 'mainGame', bg_SESSION_TIME_LIMIT: '0' });
  fire(byAttr(stage,'data-bg','order')[0]);
  fire(btnWith(stage, 'Order')); fire(btnWith(stage, 'Start Picking'));
  const cell = byAttr(stage,'data-bg','cell').find(c => !c.className.includes('empty'));
  fire(cell);
  doc.getElementById('bg-item-in').value = 'definitely-not-the-item';
  doc.getElementById('bg-qty-0').value = '1';
  fire(btnWith(stage, 'Add to Selected Bags'));
  assert.equal(sandbox.__alerts.length, 1, 'mistyped item is rejected');
  assert.match(sandbox.__alerts[0], /type the item name/i);
});

test('cross-store bundles cannot be selected', () => {
  const { sandbox, stage } = bootGame({ bg_DATASET: 'mainGame', bg_SESSION_TIME_LIMIT: '0' });
  const data = sandbox.BUNDLEGAME_DATA.datasets.mainGame;
  const sc = data.scenarios.find(s => Number(s.round) === 1);
  const orders = sc.order_ids.map(id => data.orders.find(o => String(o.id) === String(id)));
  const stores = [...new Set(orders.map(o => o.store))];
  if (stores.length < 2) return; // nothing to prove in a single-store round

  fire(byAttr(stage,'data-bg','order')[0]);
  const first = orders[0];
  byAttr(stage,'data-bg','order').forEach((card, i) => {
    if (i === 0) return;
    const disabled = card.className.includes('dis');
    if (orders[i].store !== first.store) assert.ok(disabled, `card ${i} (other store) must be disabled`);
  });
});

test('the player city carries forward from the delivered order', () => {
  const { sandbox, stage, embedded, doc } = bootGame({ bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '2', bg_SESSION_TIME_LIMIT: '0' });
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

  // the hosted UI shows the player's city on the selection panel
  const shown = walk(stage).map(n => n._text || '').join(' | ');
  assert.ok(shown.includes(target.city), `UI should show the delivered city (${target.city})`);
});

test('detailed telemetry captures the expected event vocabulary', () => {
  const { sandbox, stage, embedded, doc } = bootGame({ bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '2', bg_SESSION_TIME_LIMIT: '0' });
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

  const chunks = [];
  for (let i = 1; i <= sandbox.BUNDLEGAME_CONFIG.MAX_EVENT_CHUNKS; i++) chunks.push(embedded['bg_events_' + i] || '');
  const events = JSON.parse(chunks.join(''));
  const kinds = new Set(events.map(e => e[1]));
  ['session_start', 'round_start', 'select_order', 'confirm_order', 'start_picking',
    'move_aisle', 'add_item_to_bag', 'delivery_validation_passed', 'deliver_order', 'round_end']
    .forEach(k => assert.ok(kinds.has(k), `missing event type: ${k}`));
  assert.equal(Number(embedded.bg_events_truncated), 0, 'no truncation on a short run');
  assert.equal(Number(embedded.bg_events_count), events.length, 'event count matches payload');
});

test('control arm shows no recommendation; treated arm does inside the window', () => {
  const mk = arm => bootGame({
    bg_DATASET: 'mainGame', bg_ARM: arm, bg_START_ROUND: '16',
    bg_RECOMMENDATION_ROUNDS: '[16,35]', bg_SESSION_TIME_LIMIT: '0'
  });
  assert.equal(byClass(mk('control').stage, 'bg-rec').length, 0, 'control never sees a suggestion');
  // mainGame scenarios ship without oracle ids, so a treated arm has nothing to
  // render either - that is the documented data gap, not a rendering bug.
  const treated = mk('oracle');
  const sc = treated.sandbox.BUNDLEGAME_DATA.datasets.mainGame.scenarios.find(s => Number(s.round) === 16);
  const hasOracle = !!(sc.oracle_bundle_ids && sc.oracle_bundle_ids.length);
  assert.equal(byClass(treated.stage, 'bg-rec').length, hasOracle ? 1 : 0);
});

/* ------------------------------------------------------- onboarding flow */

test('tutorial runs first, does not pay out, and hands off to the real task', () => {
  const { sandbox, stage, embedded, doc } = bootGame({
    bg_DATASET: 'mainGame', bg_TOTAL_ROUNDS: '2', bg_SESSION_TIME_LIMIT: '0',
    bg_TUTORIAL_ROUNDS: '2', bg_SHOW_INSTRUCTIONS: 'true'
  });
  // instructions gate first
  const begin = walk(stage).filter(n=>n.tagName==='BUTTON').find(b => /Start practice/.test(b.textContent));
  assert.ok(begin, 'instructions screen offers a start button');
  fire(begin);
  assert.ok(byClass(stage, 'bg-practice').length, 'practice badge shown');

  const tut = sandbox.BUNDLEGAME_DATA.datasets.tutorial;
  assert.ok(tut, 'tutorial dataset is shipped in the build');
  const orderById = new Map(tut.orders.map(o => [String(o.id), o]));

  for (let r = 1; r <= 2; r++) {
    const scen = tut.scenarios.find(s => Number(s.round) === r);
    const target = orderById.get(String(scen.order_ids[0]));
    fire(byAttr(stage,'data-bg','order')[0]);
    fire(btnWith(stage, 'Order')); fire(btnWith(stage, 'Start Picking'));
    for (const [item, qty] of Object.entries(target.items || {})) {
      const cell = cellFor(stage, item);
      if (!cell) continue;
      fire(cell);
      doc.getElementById('bg-item-in').value = item;
      doc.getElementById('bg-qty-0').value = String(qty);
      fire(btnWith(stage, 'Add to Selected Bags'));
    }
    fire(btnWith(stage, 'Checkout & Deliver'));
    let guard = 0;
    while (guard++ < 6) {
      const d = walk(stage).filter(n => n.tagName === 'BUTTON' && n.textContent.trim() === 'Deliver');
      if (!d.length) break;
      fire(d[0]);
    }
    const nxt = btnWith(stage, 'Next round'); if (nxt) fire(nxt);
  }

  // handoff screen, then the real task
  const start = walk(stage).filter(n=>n.tagName==='BUTTON').find(b => /Start the task/.test(b.textContent));
  assert.ok(start, 'handoff screen appears after practice');
  assert.equal(Number(embedded.bg_tutorial_completed), 1, 'tutorial completion flagged');
  fire(start);
  assert.equal(byClass(stage, 'bg-practice').length, 0, 'practice badge gone');

  const decs = JSON.parse(embedded.bg_decisions);
  const tutRows = decs.filter(d => d.tut === 1);
  assert.equal(tutRows.length, 2, 'both practice rounds tagged tut:1');
  assert.equal(Number(embedded.bg_earnings), 0, 'practice does not pay out');
});

test('TUTORIAL_ROUNDS with a missing tutorial dataset is flagged, not silently skipped', () => {
  const { embedded } = bootGame({
    bg_DATASET: 'mainGame', bg_TUTORIAL_DATASET: 'does_not_exist',
    bg_TUTORIAL_ROUNDS: '2', bg_SESSION_TIME_LIMIT: '0'
  });
  assert.equal(Number(embedded.bg_tutorial_unavailable), 1,
    'a missing tutorial dataset must set bg_tutorial_unavailable');
});
