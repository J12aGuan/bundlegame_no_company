#!/usr/bin/env node
/* Plays N headless runs and writes a Qualtrics-format CSV export (3 header rows),
 * so the importer can be round-trip tested without a Qualtrics account.
 *   node qualtrics/test/make-fake-export.mjs <out.csv> [dataset] [rounds] [nParticipants]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.argv[2] || path.join(ROOT, 'qualtrics/test/tmp/fake_export.csv');
const DATASET = process.argv[3] || 'mainGame';
const ROUNDS = Number(process.argv[4] || 6);
const N = Number(process.argv[5] || 3);

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


function playOne(pid, rounds, makeMistake) {
  const embedded = {
    ResponseID: pid, ResponseId: pid,
    bg_DATASET: DATASET, bg_TOTAL_ROUNDS: String(rounds), bg_SESSION_TIME_LIMIT: '0',
    bg_SHOW_INSTRUCTIONS: 'false', bg_TUTORIAL_ROUNDS: '0'
  };
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

  for (let r = 1; r <= rounds; r++) {
    const cards = byAttr(stage,'data-bg','order');
    if (!cards.length) break;
    const scen = ds.scenarios.find(s => Number(s.round) === Number(embedded.bg_round_current || r));
    if (!scen) break;
    const offered = (scen.order_ids || []).map(id => orderById.get(String(id))).filter(Boolean);
    fire(cards[0]);
    const target = offered[0];
    const go = btn(stage, 'Order');
    if (!go || go.attrs.disabled) break;
    fire(go);
    const startBtn = btn(stage, 'Start Picking'); if (startBtn) fire(startBtn);

    // one participant deliberately fails a round, to exercise the failure path
    if (!(makeMistake && r === 2)) {
      for (const [item, qty] of Object.entries(target.items || {})) {
        const cell = cellFor(stage, item);
        if (!cell) continue;
        fire(cell);
        const inp = doc.getElementById('bg-item-in'); if (!inp) continue;
        inp.value = item;
        const q0 = doc.getElementById('bg-qty-0'); if (q0) q0.value = String(qty);
        const add = btn(stage, 'Add to Selected Bags'); if (add) fire(add);
      }
    }
    const co = btn(stage, 'Checkout & Deliver'); if (!co) break;
    fire(co);
    let guard = 0;
    while (guard++ < 8) {
      const d = walk(stage).filter(n => n.tagName === 'BUTTON' && n.textContent.trim() === 'Deliver');
      if (!d.length) break;
      fire(d[0]);
    }
    const next = btn(stage, 'Next round'); if (next) fire(next);
  }
  embedded.Finished = '1';
  embedded.RecordedDate = '2026-08-09 12:00:00';
  embedded['Duration (in seconds)'] = String(120 + rounds * 10);
  return embedded;
}

const runs = [];
for (let i = 0; i < N; i++) runs.push(playOne('R_fake' + i, ROUNDS, i === 1));

const cols = [...new Set(runs.flatMap(r => Object.keys(r)))].sort();
const esc = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const lines = [
  cols.join(','),                                                   // 1: field names
  cols.map(c => esc('Label for ' + c)).join(','),                   // 2: question text
  cols.map(c => esc(JSON.stringify({ ImportId: c }))).join(','),    // 3: importIds
  ...runs.map(r => cols.map(c => esc(r[c])).join(','))
];
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`  wrote ${OUT}  (${runs.length} responses, ${cols.length} columns)`);
