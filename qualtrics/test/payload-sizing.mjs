#!/usr/bin/env node
/* Plays a complete run headlessly and measures the real embedded-data payload,
 * so MAX_EVENT_CHUNKS is set from evidence rather than a guess.
 *   node qualtrics/test/payload-sizing.mjs [dataset] [rounds]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATASET = process.argv[2] || 'mainGame';
const ROUNDS = Number(process.argv[3] || 50);

function mkNode(tag) {
  const n = {
    tagName: String(tag).toUpperCase(), className: '', _text: '', value: '',
    childNodes: [], attrs: {}, listeners: {}, style: {}, parentNode: null,
    appendChild(c) { c.parentNode = n; n.childNodes.push(c); return c; },
    insertBefore(c, ref) { const i = n.childNodes.indexOf(ref); n.childNodes.splice(i < 0 ? 0 : i, 0, c); c.parentNode = n; return c; },
    replaceChild(nw, old) { const i = n.childNodes.indexOf(old); if (i >= 0) n.childNodes[i] = nw; nw.parentNode = n; return old; },
    setAttribute(k, v) { n.attrs[k] = String(v); }, getAttribute(k) { return n.attrs[k]; },
    removeAttribute(k) { delete n.attrs[k]; },
    addEventListener(e, f) { (n.listeners[e] = n.listeners[e] || []).push(f); },
    remove() { if (n.parentNode) n.parentNode.childNodes = n.parentNode.childNodes.filter(x => x !== n); },
    querySelector() { return null; },
    get textContent() { return n._text || n.childNodes.map(c => c.textContent).join(''); },
    set textContent(v) { n._text = String(v); n.childNodes = []; },
    get innerHTML() { return ''; }, set innerHTML(v) { n.childNodes = []; }
  };
  return n;
}
const walk = (n, o = []) => { o.push(n); n.childNodes.forEach(c => walk(c, o)); return o; };
const fire = (n, e = 'click') => (n.listeners[e] || []).forEach(f => f({ target: n }));
const byClass = (r, c) => walk(r).filter(n => String(n.className).split(' ').includes(c));
const byAttr = (r, k, v) => walk(r).filter(n => n.attrs[k] === v);
const btn = (r, t) => walk(r).filter(n => n.tagName === 'BUTTON').find(b => b.textContent.includes(t));
// exact aisle match: 'apple' must not select the 'pineapple' cell
const cellFor = (root, item) => walk(root).find(n =>
  n.attrs['data-bg'] === 'cell' && n.attrs['data-item'] === String(item).trim().toLowerCase());


const embedded = { ResponseID: 'sizing', bg_DATASET: DATASET, bg_TOTAL_ROUNDS: String(ROUNDS), bg_SESSION_TIME_LIMIT: '0',
  bg_SHOW_INSTRUCTIONS: 'false', bg_TUTORIAL_ROUNDS: '0' };
const doc = {
  body: mkNode('body'), head: mkNode('head'), createElement: mkNode,
  createTextNode: t => { const n = mkNode('#text'); n.textContent = t; return n; },
  getElementById(id) { return walk(globalThis.__st || doc.body).find(n => n.attrs.id === id) || null; }
};
const sandbox = {
  console: { log() { }, warn() { }, error() { } }, document: doc,
  alert: () => { }, confirm: () => true,
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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'qualtrics/dist/bundlegame.treated.js'), 'utf8'), sandbox);

const stage = mkNode('div');
globalThis.__st = stage;
sandbox.BundleGame.boot(stage, sandbox.BUNDLEGAME_DATA, sandbox.BUNDLEGAME_CONFIG);

const ds = sandbox.BUNDLEGAME_DATA.datasets[DATASET];
const orderById = new Map(ds.orders.map(o => [String(o.id), o]));
let played = 0;

for (let r = 0; r < ROUNDS; r++) {
  const cards = byAttr(stage,'data-bg','order');
  if (!cards.length) break;

  // Worst case for telemetry: take the largest legal bundle, which means the
  // most aisle walks, the most item entries and the most deliveries.
  const scen = ds.scenarios.find(s => Number(s.round) === Number(embedded.bg_round_current || r + 1));
  if (!scen) break;
  const offered = (scen.order_ids || []).map(id => orderById.get(String(id))).filter(Boolean);
  const byStore = new Map();
  offered.forEach(o => { const k = String(o.store); byStore.set(k, (byStore.get(k) || []).concat([o])); });
  let group = [...byStore.values()].sort((a, b) => b.length - a.length)[0] || [offered[0]];
  group = group.slice(0, Number(scen.max_bundle) || 3);

  group.forEach(o => {
    const idx = offered.findIndex(x => x.id === o.id);
    const card = byAttr(stage,'data-bg','order')[idx];
    if (card && !card.className.includes('bg-dis')) fire(card);
  });
  const go = btn(stage, 'Order');
  if (!go || go.attrs.disabled) break;
  fire(go);
  const startBtn = btn(stage, 'Start Picking'); if (startBtn) fire(startBtn);

  // pick every item for every selected order
  const sel = group;
  const need = new Map();
  sel.forEach((o, i) => Object.entries(o.items || {}).forEach(([it, q]) => {
    const k = it.toLowerCase();
    need.set(k, (need.get(k) || []).concat([{ bag: i, qty: q }]));
  }));
  for (const [item, entries] of need) {
    const cell = cellFor(stage, item);
    if (!cell) continue;
    fire(cell);
    const inp = doc.getElementById('bg-item-in');
    if (!inp) continue;
    inp.value = item;
    sel.forEach((_, i) => { const q = doc.getElementById('bg-qty-' + i); if (q) q.value = '0'; });
    entries.forEach(e => { const q = doc.getElementById('bg-qty-' + e.bag); if (q) q.value = String(e.qty); });
    const add = btn(stage, 'Add to Selected Bags'); if (add) fire(add);
  }
  const co = btn(stage, 'Checkout & Deliver'); if (!co) break;
  fire(co);

  let guard = 0;
  while (guard++ < 10) {
    const d = walk(stage).filter(n => n.tagName === 'BUTTON' && n.textContent.trim() === 'Deliver');
    if (!d.length) break;
    fire(d[0]);
  }
  const next = btn(stage, 'Next round'); if (next) fire(next);
  played++;
}

const CFG = sandbox.BUNDLEGAME_CONFIG;
const chunks = [];
for (let i = 1; i <= CFG.MAX_EVENT_CHUNKS; i++) chunks.push(embedded['bg_events_' + i] || '');
const packed = chunks.join('');
const sizes = {
  dataset: DATASET,
  rounds_played: played,
  rounds_completed: Number(embedded.bg_rounds_completed),
  events: Number(embedded.bg_events_count),
  bg_decisions: (embedded.bg_decisions || '').length,
  bg_timing: (embedded.bg_timing || '').length,
  events_packed: packed.length,
  truncated: Number(embedded.bg_events_truncated),
  dropped_chars: Number(embedded.bg_events_dropped_chars)
};
const budget = CFG.EVENT_CHUNK_CHARS * CFG.MAX_EVENT_CHUNKS;
const needChunks = Math.ceil((sizes.events_packed + sizes.dropped_chars) / CFG.EVENT_CHUNK_CHARS);

console.log(JSON.stringify(sizes, null, 2));
console.log(`\n  largest single field : ${Math.max(sizes.bg_decisions, sizes.bg_timing, CFG.EVENT_CHUNK_CHARS)} chars`);
console.log(`  event budget         : ${budget} chars (${CFG.MAX_EVENT_CHUNKS} x ${CFG.EVENT_CHUNK_CHARS})`);
console.log(`  chunks actually needed: ${needChunks}`);
if (sizes.truncated) console.log(`  *** TRUNCATED: raise MAX_EVENT_CHUNKS to at least ${needChunks} ***`);
else console.log(`  fits with ${CFG.MAX_EVENT_CHUNKS - needChunks} chunk(s) to spare`);
if (sizes.bg_decisions > 19000 || sizes.bg_timing > 19000)
  console.log(`  *** WARNING: bg_decisions/bg_timing approaching the ~20k single-field limit ***`);
