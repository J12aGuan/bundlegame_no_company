#!/usr/bin/env node
/* =============================================================================
 * Builds the single pasteable Qualtrics JS file.
 *
 *   node qualtrics/build.mjs --export "<raw firestore export>/collections" \
 *                            --datasets mainGame,chi_dynamic_v2 \
 *                            --default mainGame
 *
 * Output: qualtrics/dist/bundlegame.qualtrics.js
 * Layout: CONFIG block first (so every knob is at the top of the JS editor),
 *         then the generated data block, styles, engine, and Qualtrics boot.
 * ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

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

let WANTED = arg('datasets', 'mainGame').split(',').map(s => s.trim()).filter(Boolean);
// The warm-up dataset must ship too, or TUTORIAL_ROUNDS silently does nothing.
const TUT = arg('tutorial', 'tutorial');
if (TUT && TUT !== 'none' && !WANTED.includes(TUT)) WANTED = WANTED.concat([TUT]);
const DEFAULT_DS = arg('default', WANTED[0]);
// Oracle ids are what a treated arm shows as its recommendation. They are OFF by
// default because anything in the built file is readable by a participant.
const WITH_ORACLE = process.argv.includes('--with-oracle');
// Two-survey design: control and treated are separate builds, so the control
// file never contains the answer key at all.
const OUT_NAME = arg('out', 'bundlegame.qualtrics.js');
const FORCE_ARM = arg('arm', '');
// Repeatable --set KEY=VALUE, so a survey-specific build can override any CONFIG
// key without editing the shared defaults.
const SETS = process.argv.reduce((acc, a, i) => (a === '--set' && process.argv[i + 1])
  ? acc.concat([process.argv[i + 1]]) : acc, []);

// Firebase web config comes from .env. The web API key is not a secret (it ships
// in any Firebase web app); firestore.rules is what enforces access.
const dotenv = Object.fromEntries(
  fs.readFileSync(path.join(HERE, '..', '.env'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);

const master = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'MasterData.json'), 'utf8'));
const md = Object.fromEntries(master.documents.map(d => [d.id, d.data]));
const allDatasets = md.datasets.datasets;

// Only the fields the runtime actually reads. Keeps the pasted file small and
// avoids shipping oracle/design metadata that would let a curious participant
// read the optimal answer out of the page source.
// The CHI block design drives WHEN feedback is on. Shipping these is mandatory:
// without them the retention (B2) and transfer (B4) blocks would wrongly get help.
const SCEN_KEYS = ['round', 'scenario_id', 'order_ids', 'max_bundle', 'phase',
  'block', 'block_kind', 'test_set', 'feedback_enabled', 'stress']
  .concat(WITH_ORACLE ? ['oracle_bundle_ids'] : []);
const ORDER_KEYS = ['id', 'city', 'store', 'items', 'earnings', 'estimatedTime', 'localTravelTime'];
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));

const datasets = {};
for (const root of WANTED) {
  const ds = allDatasets[root];
  if (!ds) { console.error(`  ! unknown dataset root: ${root}`); process.exit(1); }

  // CHI datasets embed their orders on each scenario row; legacy ones use a shared pool.
  const pool = new Map((ds.orders || []).map(o => [String(o.id), o]));
  for (const s of ds.scenarios || []) for (const o of (s.orders || [])) if (!pool.has(String(o.id))) pool.set(String(o.id), o);

  datasets[root] = {
    scenarios: (ds.scenarios || []).map(s => {
      const row = pick(s, SCEN_KEYS);
      // Obscure the answer key so it is not plainly greppable in page source.
      // This is obfuscation, NOT security - see README.
      if (row.oracle_bundle_ids) {
        row.k = Buffer.from(JSON.stringify(row.oracle_bundle_ids)).toString('base64');
        delete row.oracle_bundle_ids;
      }
      return row;
    }),
    orders: [...pool.values()].map(o => pick(o, ORDER_KEYS))
  };
  const withOracle = datasets[root].scenarios.filter(s => s.k).length;
  console.log(`  + ${root}: ${datasets[root].scenarios.length} scenarios, ${datasets[root].orders.length} orders`
    + (WITH_ORACLE ? `, ${withOracle} with oracle ids` : ''));
  if (WITH_ORACLE && !withOracle) console.warn(`    ! ${root} has no oracle_bundle_ids — a treated arm will have nothing to show`);
  const fb = datasets[root].scenarios.filter(s => s.feedback_enabled).length;
  if (fb) console.log(`    feedback-on rounds: ${datasets[root].scenarios.filter(s => s.feedback_enabled).map(s => s.round).join(',')}`);
}

// Only ship store layouts actually referenced by the selected datasets.
// Firestore stores rows as either ["a","b"] or {cells:["a","b"]}; normalise to a
// plain 2-D string grid so the engine never has to care.
const normaliseGrid = (locations = []) =>
  (Array.isArray(locations) ? locations : []).map(row =>
    (Array.isArray(row) ? row : Array.isArray(row?.cells) ? row.cells : [])
      .map(c => String(c ?? '').trim()));

const usedStores = new Set();
for (const d of Object.values(datasets)) for (const o of d.orders) usedStores.add(String(o.store));
const stores = {
  stores: (md.store.stores || [])
    .filter(s => usedStores.has(String(s.store)))
    .map(s => ({
      store: s.store, city: s.city,
      Entrance: Array.isArray(s.Entrance) ? s.Entrance : [0, 0],
      cellDistance: Number(s.cellDistance) || 1000,
      locations: normaliseGrid(s.locations)
    }))
};
console.log(`  + stores: ${stores.stores.length} of ${(md.store.stores || []).length} (${[...usedStores].join(', ')})`);

// Fail the build rather than ship a dataset a participant cannot complete.
{
  const byName = new Map(stores.stores.map(s => [String(s.store), s]));
  const problems = [];
  for (const [root, ds] of Object.entries(datasets)) {
    const ids = new Set(ds.orders.map(o => String(o.id)));
    for (const s of ds.scenarios) for (const oid of s.order_ids || [])
      if (!ids.has(String(oid))) problems.push(`${root}/${s.scenario_id}: missing order ${oid}`);
    for (const o of ds.orders) {
      const cfg = byName.get(String(o.store));
      if (!cfg) { problems.push(`${root}/${o.id}: no layout for store ${o.store}`); continue; }
      const cells = new Set(cfg.locations.flat().map(c => c.toLowerCase()));
      for (const item of Object.keys(o.items || {}))
        if (!cells.has(String(item).toLowerCase().trim()))
          problems.push(`${root}/${o.id}: item "${item}" is not on the ${o.store} grid`);
    }
    const cities = [...new Set(ds.orders.map(o => String(o.city)))];
    for (const a of cities) for (const b of cities)
      if (a !== b && !(Number((md.cities.travelTimes?.[a] || {})[b]) > 0))
        problems.push(`${root}: no travel time ${a} -> ${b}`);
  }
  if (problems.length) {
    console.error(`\n  BUILD FAILED — ${problems.length} problem(s):`);
    problems.slice(0, 20).forEach(p => console.error('    ' + p));
    if (problems.length > 20) console.error(`    ... and ${problems.length - 20} more`);
    process.exit(1);
  }
  console.log('  + validation: order ids, store grids, item reachability, city routes all OK');
}

const payload = {
  built_at_note: 'generated by qualtrics/build.mjs — do not hand-edit',
  source_export: path.basename(path.dirname(EXPORT_DIR)),
  datasets,
  stores,
  cities: { startinglocation: md.cities.startinglocation, travelTimes: md.cities.travelTimes || {} },
  emojis: (md.emojis && md.emojis.emojis) || {}
};

// Pull the app's own compiled Tailwind so the Qualtrics UI is styled by exactly
// the same CSS the Vercel build uses. Run `npm run build` to refresh it.
function realAppCss() {
  const dir = path.join(HERE, '..', 'build', '_app', 'immutable', 'assets');
  if (!fs.existsSync(dir)) {
    console.warn('  ! build/ not found - run `npm run build` first');
    return '';
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.css')).sort();
  const css = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  console.log(`  + app css: ${files.length} files, ${(css.length / 1024).toFixed(0)} KB (real Tailwind build)`);
  return css;
}

const read = f => fs.readFileSync(path.join(HERE, 'src', f), 'utf8');
let config = read('config.js');
// Make the built file's default dataset match what was requested.
config = config.replace(/(DATASET:\s*)'[^']*'/, `$1'${DEFAULT_DS}'`);
// Baking the arm in means a missing bg_ARM cannot accidentally put someone in
// the wrong condition for this survey.
if (FORCE_ARM) config = config.replace(/(ARM:\s*)'[^']*'/, `$1'${FORCE_ARM}'`);
for (const kv of SETS) {
  const i = kv.indexOf('=');
  const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
  const re = new RegExp(`(\\n  ${k}:\\s*)([^,\\n]*)`);
  const m = config.match(re);
  if (!m) { console.error(`  ! --set ${k}: no such CONFIG key`); process.exit(1); }
  // Match the existing literal's type. Shells strip quotes, so a string value
  // arriving bare must be re-quoted or the built file is syntactically invalid.
  const wasQuoted = /^['"]/.test(m[2].trim());
  const isQuoted = /^['"]/.test(v);
  const val = (wasQuoted && !isQuoted) ? `'${v.replace(/'/g, "\\'")}'` : v;
  config = config.replace(re, `$1${val}`);
  console.log(`  + override ${k} = ${val}`);
}

// inject Firebase config unless the caller explicitly disabled it
if (!/FIREBASE_ENABLED:\s*false/.test(config)) {
  const pid = dotenv.VITE_FIREBASE_PROJECT_ID || dotenv.FIREBASE_PROJECT_ID || '';
  const key = dotenv.VITE_FIREBASE_API_KEY || '';
  if (!pid || !key) {
    console.warn('  ! FIREBASE_ENABLED is true but .env has no project id / web api key — live transmission will be inert');
  } else {
    config = config.replace(/(FIREBASE_PROJECT_ID:\s*)'[^']*'/, `$1'${pid}'`);
    config = config.replace(/(FIREBASE_API_KEY:\s*)'[^']*'/, `$1'${key}'`);
    console.log(`  + firebase: live transmission to ${pid}`);
  }
}

const banner = `/* BundleGame — self-contained Qualtrics build
 * Generated ${'by qualtrics/build.mjs'} from ${payload.source_export}
 * Datasets: ${WANTED.join(', ')}   Default: ${DEFAULT_DS}
 * Arm: ${FORCE_ARM || 'set by bg_ARM'}   Answer key: ${WITH_ORACLE ? 'EMBEDDED (treated survey)' : 'absent (control survey)'}
 * Paste this whole file into a Text/Graphic question's JavaScript editor.
 * Edit only the CONFIG block below, or override any key from the survey flow
 * with an Embedded Data field named bg_<KEY>.
 */\n`;

const out = [
  banner,
  config,
  '\n/* ---- GENERATED DATA (do not hand-edit; rerun qualtrics/build.mjs) ---- */',
  'var BUNDLEGAME_DATA = ' + JSON.stringify(payload) + ';\n',
  '/* ---- REAL COMPILED TAILWIND FROM THE APP BUILD (do not hand-edit) ---- */',
  'var BUNDLEGAME_APP_CSS = ' + JSON.stringify(realAppCss()) + ';\n',
  read('styles.js'),
  read('engine.js'),
  read('boot.js')
].join('\n');

fs.mkdirSync(path.join(HERE, 'dist'), { recursive: true });
const dest = path.join(HERE, 'dist', OUT_NAME);
fs.writeFileSync(dest, out);
console.log(`\n  built ${path.relative(path.join(HERE, '..'), dest)}  (${(out.length / 1024).toFixed(0)} KB)`);
if (WITH_ORACLE) console.log('  ! oracle ids are embedded and READABLE in the page source — only use this\n'
  + '    build for arms that are meant to see a recommendation.');
else console.log('  i oracle ids omitted (participant-safe). Treated arms need --with-oracle.');
