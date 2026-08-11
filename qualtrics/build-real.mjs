#!/usr/bin/env node
/* Assembles the Qualtrics file that runs the REAL bundled Svelte game.
 *   node qualtrics/build-real.mjs --datasets chi_dynamic_v2 --default chi_dynamic_v2 --out bundlegame.real.js
 * Requires: npx vite build --config qualtrics/embed/vite.config.js
 */
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };

// The repo reorganised `data analysis/` into `publishing/data_analysis/`.
// Resolve whichever exists, newest snapshot first, so the build works on any
// checkout without a hand-edited path.
function findExportDir(here) {
  const roots = [
    path.join(here, '..', 'publishing', 'data_analysis', 'firestore_raw_export'),
    path.join(here, '..', 'data analysis', 'firestore_raw_export')
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const snaps = fs.readdirSync(root)
      .filter(d => /^\d{4}-\d{2}-\d{2}T/.test(d) && fs.existsSync(path.join(root, d, 'collections')))
      .sort();
    if (snaps.length) return path.join(root, snaps[snaps.length - 1], 'collections');
  }
  return null;
}

const EXPORT_DIR = arg('export', findExportDir(HERE));
if (!EXPORT_DIR) { console.error('  ! no Firestore export found. Run: npm run firestore:export:raw'); process.exit(1); }

const WANTED = arg('datasets', 'chi_dynamic_v2').split(',').map(s => s.trim()).filter(Boolean);
const DEFAULT_DS = arg('default', WANTED[0]);
const OUT = arg('out', 'bundlegame.real.js');

const real = path.join(HERE, 'embed', 'dist', 'real.js');
if (!fs.existsSync(real)) { console.error('  ! run: npx vite build --config qualtrics/embed/vite.config.js'); process.exit(1); }

const md = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'MasterData.json'), 'utf8')).documents.map(d => [d.id, d.data]));
const all = md.datasets.datasets;
const SCEN = ['round','scenario_id','order_ids','max_bundle','phase','block','block_kind','test_set','feedback_enabled','stress','classification'];
const ORD = ['id','city','store','items','earnings','estimatedTime','localTravelTime'];
const pick = (o, k) => Object.fromEntries(k.filter(x => o[x] !== undefined).map(x => [x, o[x]]));

const datasets = {};
for (const root of WANTED) {
  const ds = all[root];
  if (!ds) { console.error('  ! unknown dataset', root); process.exit(1); }
  const pool = new Map((ds.orders || []).map(o => [String(o.id), o]));
  for (const s of ds.scenarios || []) for (const o of (s.orders || [])) if (!pool.has(String(o.id))) pool.set(String(o.id), o);
  datasets[root] = { scenarios: (ds.scenarios || []).map(s => pick(s, SCEN)), orders: [...pool.values()].map(o => pick(o, ORD)) };
  console.log(`  + ${root}: ${datasets[root].scenarios.length} scenarios, ${datasets[root].orders.length} orders`);
}
const grid = l => (Array.isArray(l) ? l : []).map(r => (Array.isArray(r) ? r : Array.isArray(r?.cells) ? r.cells : []).map(c => String(c ?? '').trim()));
const used = new Set(); for (const d of Object.values(datasets)) for (const o of d.orders) used.add(String(o.store));
const stores = { stores: (md.store.stores || []).filter(s => used.has(String(s.store)))
  .map(s => ({ store: s.store, city: s.city, Entrance: s.Entrance || [0,0], cellDistance: Number(s.cellDistance) || 1000, locations: grid(s.locations) })) };

const payload = { datasets, stores, cities: { startinglocation: md.cities.startinglocation, travelTimes: md.cities.travelTimes || {} }, emojis: (md.emojis && md.emojis.emojis) || {} };

const cssDir = path.join(HERE, '..', 'build', '_app', 'immutable', 'assets');
const css = fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).sort().map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n');
console.log(`  + app css: ${(css.length/1024).toFixed(0)} KB`);

let config = fs.readFileSync(path.join(HERE, 'src', 'config.js'), 'utf8').replace(/(DATASET:\s*)'[^']*'/, `$1'${DEFAULT_DS}'`);
for (const kv of process.argv.reduce((a,x,i)=>(x==='--set'&&process.argv[i+1])?a.concat([process.argv[i+1]]):a,[])) {
  const i = kv.indexOf('='); const k = kv.slice(0,i), v = kv.slice(i+1);
  const re = new RegExp(`(\\n  ${k}:\\s*)([^,\\n]*)`); const m = config.match(re);
  if (!m) { console.error('  ! no such CONFIG key:', k); process.exit(1); }
  const q = /^['"]/.test(m[2].trim()) && !/^['"]/.test(v) ? `'${v}'` : v;
  config = config.replace(re, `$1${q}`); console.log(`  + override ${k} = ${q}`);
}

const out = [
  `/* BundleGame — Qualtrics build running the REAL Svelte components.\n * UI is the app itself, not a reproduction. Datasets: ${WANTED.join(', ')}\n */`,
  config,
  'var BUNDLEGAME_DATA = ' + JSON.stringify(payload) + ';\n',
  'var BUNDLEGAME_APP_CSS = ' + JSON.stringify(css) + ';\n',
  '/* ---- REAL SVELTE BUNDLE ---- */',
  fs.readFileSync(real, 'utf8'),
  fs.readFileSync(path.join(HERE, 'embed', 'adapter.js'), 'utf8'),
  `Qualtrics.SurveyEngine.addOnload(function () {
  var page = this;
  try { page.hideNextButton(); } catch (e) {}
  var esc = Number(BUNDLEGAME_CONFIG.ESCAPE_HATCH_SECONDS || 0);
  if (esc > 0) setTimeout(function(){ try { page.showNextButton(); } catch(e){} }, esc*1000);
  // The hosted index.html loads Leaflet + MapTiler from CDNs for the map panel.
  // Load them the same way so the selection screen matches exactly.
  function addCss(href){ if(document.querySelector('link[href="'+href+'"]'))return;
    var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l); }
  function addJs(src, cb){ if(document.querySelector('script[src="'+src+'"]')){cb&&cb();return;}
    var t=document.createElement('script'); t.src=src; t.onload=function(){cb&&cb()};
    t.onerror=function(){ try{Qualtrics.SurveyEngine.setEmbeddedData('bg_map_load_failed',1);}catch(e){} cb&&cb(); };
    document.head.appendChild(t); }
  addCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  addCss('https://cdn.maptiler.com/maptiler-sdk-js/v2.0.3/maptiler-sdk.css');

  if (!document.getElementById('bg-style')) {
    var st = document.createElement('style'); st.id = 'bg-style';
    st.textContent = BUNDLEGAME_APP_CSS; document.head.appendChild(st);
  }
  var host = document.createElement('div');
  var c = page.getQuestionContainer ? (page.getQuestionContainer().querySelector('.QuestionText') || page.getQuestionContainer()) : document.body;
  c.appendChild(host);
  // Chain the map libraries in the same order index.html does, then mount.
  addJs('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', function () {
    addJs('https://cdn.maptiler.com/maptiler-sdk-js/v2.0.3/maptiler-sdk.umd.min.js', function () {
      addJs('https://cdn.maptiler.com/leaflet-maptilersdk/v2.0.0/leaflet-maptilersdk.js', function () {
        BundleGameQualtrics.boot(host, BUNDLEGAME_DATA, BUNDLEGAME_CONFIG, page);
      });
    });
  });
});`
].join('\n');

fs.mkdirSync(path.join(HERE, 'dist'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'dist', OUT), out);
console.log(`\n  built qualtrics/dist/${OUT}  (${(out.length/1024).toFixed(0)} KB)`);
