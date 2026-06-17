/**
 * Render store-interior + overlap-pair figures from the DEPLOYED MasterData grids.
 *
 * These are deterministic renders of the exact store `locations` grids, entrance,
 * and cellDistance used by the live game (export_for_analysis/_raw_pull/stores.json,
 * surfaced in time_model.json). They are produced headlessly because the live game
 * UI requires a participant token + Firestore session (and the older window.__bundle
 * dev hook is no longer in the codebase). Every figure uses an IDENTICAL framing:
 * viewport 1440x900, deviceScaleFactor 2 (=> 2880x1800 px), full viewport, no crop.
 *
 * Run (no dev server needed): node paper/raw_materials/render_store_figures.mjs
 */
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));   // .../raw_materials/scripts
const BUNDLE = path.dirname(HERE);                           // .../raw_materials
const OUT = path.join(BUNDLE, "figures", "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const VIEWPORT = { width: 1440, height: 900 };
const SCALE = 2;

const tm = JSON.parse(fs.readFileSync(path.join(BUNDLE, "data", "time_model.json"), "utf-8"));
const pairs = JSON.parse(fs.readFileSync(path.join(HERE, "_overlap_pairs.json"), "utf-8"));
const byStore = Object.fromEntries(tm.stores.map((s) => [s.store, s]));

const KEYS = {
  berkeley_bowl: { store: "Berkeley Bowl", round: 3, ids: ["mainGameOrder9", "mainGameOrder11"] },
  sprouts: { store: "Sprouts Farmers Market", round: 20, ids: ["mainGameOrder77", "mainGameOrder78"] },
  target: { store: "Target", round: 12, ids: ["mainGameOrder45", "mainGameOrder46"] },
  safeway: { store: "Safeway", round: 23, ids: ["mainGameOrder89", "mainGameOrder91"] },
};

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const access = (s, item) => s.item_access[item.toLowerCase()]?.nearest_access_seconds ?? null;

function gridHTML(s, highlight = {}) {
  // highlight: { itemLower -> 'shared'|'A'|'B' }
  let html = `<div class="grid" style="grid-template-columns:repeat(${s.grid_cols},1fr)">`;
  s.grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      const name = String(cell || "").trim();
      const low = name.toLowerCase();
      if (low === "entrance") {
        html += `<div class="cell entrance"><div class="tag">ENTRANCE</div><div class="rc">[${r},${c}]</div></div>`;
      } else if (!name) {
        html += `<div class="cell empty"><div class="rc">[${r},${c}]</div></div>`;
      } else {
        const hl = highlight[low] || "";
        const acc = access(s, low);
        html += `<div class="cell item ${hl}">
          <div class="name">${esc(name)}</div>
          <div class="acc">${acc != null ? acc.toFixed(2) + "s" : ""}</div>
          <div class="rc">[${r},${c}]</div></div>`;
      }
    });
  });
  return html + `</div>`;
}

const CSS = `
*{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
body{margin:0;background:#f1f5f9;color:#0f172a;width:1440px;height:900px;overflow:hidden}
.wrap{padding:28px 36px;height:100%;display:flex;flex-direction:column}
.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #e2e8f0;padding-bottom:12px;margin-bottom:18px}
.title{font-size:30px;font-weight:800}
.sub{font-size:15px;color:#64748b;margin-top:4px}
.badge{font-size:13px;color:#475569;background:#e2e8f0;border-radius:999px;padding:6px 14px;font-weight:600}
.body{display:flex;gap:34px;flex:1;min-height:0}
.gridwrap{flex:0 0 660px}
.gridlabel{font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px}
.grid{display:grid;gap:12px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px}
.cell{height:198px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;border:2px solid transparent}
.cell .rc{position:absolute;top:6px;left:8px;font-size:11px;color:#94a3b8;font-family:ui-monospace,monospace}
.cell.empty{background:#f8fafc;border:2px dashed #e2e8f0}
.cell.entrance{background:#dcfce7;border-color:#16a34a}
.cell.entrance .tag{font-weight:800;color:#15803d;font-size:18px;letter-spacing:.04em}
.cell.item{background:#eff6ff;border-color:#bfdbfe}
.cell.item .name{font-weight:700;font-size:21px;text-transform:capitalize}
.cell.item .acc{font-size:13px;color:#3b82f6;font-family:ui-monospace,monospace;margin-top:3px}
.cell.item.A{background:#eef2ff;border-color:#6366f1}
.cell.item.B{background:#fff7ed;border-color:#fb923c}
.cell.item.shared{background:#fef9c3;border-color:#eab308;border-width:3px}
.cell.item.shared .acc{color:#a16207}
.side{flex:1;min-width:0;display:flex;flex-direction:column;gap:16px}
.panel{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px}
.panel h3{margin:0 0 8px;font-size:15px}
.panel.A h3{color:#4338ca}.panel.B h3{color:#c2410c}
.li{display:flex;justify-content:space-between;font-size:15px;padding:3px 0;border-bottom:1px solid #f1f5f9}
.li.sh{background:#fef9c3;border-radius:6px;padding:3px 8px;font-weight:700}
.note{font-size:14px;color:#334155;line-height:1.5}
.note b{color:#a16207}
.legend{display:flex;gap:16px;font-size:13px;color:#475569;margin-top:auto;padding-top:12px}
.sw{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px;margin-right:6px;border:2px solid}
.sw.e{background:#dcfce7;border-color:#16a34a}.sw.i{background:#eff6ff;border-color:#bfdbfe}.sw.s{background:#fef9c3;border-color:#eab308}
.foot{font-size:12px;color:#94a3b8;margin-top:10px}
`;

function pageInterior(key) {
  const meta = KEYS[key]; const s = byStore[meta.store];
  return `<!doctype html><meta charset=utf-8><style>${CSS}</style><div class=wrap>
   <div class=head><div>
     <div class=title>${esc(s.store)}</div>
     <div class=sub>${esc(s.city)} &middot; store interior (aisle layout) &middot; deployed MasterData grid</div>
   </div><div class=badge>cellDistance ${s.cell_distance_ms} ms &rarr; ${s.seconds_per_cell}s / cell</div></div>
   <div class=body>
     <div class=gridwrap><div class=gridlabel>Aisle grid (${s.grid_rows}&times;${s.grid_cols}); numbers = nearest-access seconds from entrance</div>${gridHTML(s)}</div>
     <div class=side>
       <div class=panel><h3>Layout spread</h3>
         <div class=note>Items: <b>${s.layout_spread.n_items}</b><br>Mean nearest-access: <b>${s.layout_spread.mean_access_seconds}s</b><br>Max nearest-access: <b>${s.layout_spread.max_access_seconds}s</b><br>
         Pick-walk = sum of Manhattan steps between consecutive items &times; ${s.seconds_per_cell}s/cell, + 3s handling per unique item.</div></div>
       <div class=legend><span><span class="sw e"></span>Entrance</span><span><span class="sw i"></span>Item shelf</span></div>
     </div></div>
   <div class=foot>Rendered from export_for_analysis/_raw_pull/stores.json (mainGame_2026_03_20_14_26_36). Identical viewport ${VIEWPORT.width}&times;${VIEWPORT.height}, DPR ${SCALE}.</div>
   </div>`;
}

function pageOverlap(key) {
  const meta = KEYS[key]; const s = byStore[meta.store]; const p = pairs[key];
  const itemsA = p.A.items, itemsB = p.B.items;
  const setA = new Set(Object.keys(itemsA).map((x) => x.toLowerCase()));
  const setB = new Set(Object.keys(itemsB).map((x) => x.toLowerCase()));
  const shared = [...setA].filter((x) => setB.has(x));
  const hl = {};
  for (const it of setA) hl[it] = setB.has(it) ? "shared" : "A";
  for (const it of setB) if (!setA.has(it)) hl[it] = "B";
  const savings = shared.reduce((t, it) => t + (access(s, it) || 0), 0);
  const li = (items) => Object.entries(items).map(([it, q]) =>
    `<div class="li ${shared.includes(it.toLowerCase()) ? "sh" : ""}"><span>${esc(it)}</span><span>x${q}${shared.includes(it.toLowerCase()) ? " &nbsp;shared" : ""}</span></div>`).join("");
  return `<!doctype html><meta charset=utf-8><style>${CSS}</style><div class=wrap>
   <div class=head><div>
     <div class=title>${esc(s.store)} &mdash; overlapping orders</div>
     <div class=sub>${esc(s.city)} &middot; round ${meta.round} &middot; ${esc(p.A.id)} + ${esc(p.B.id)} &middot; shared items highlighted</div>
   </div><div class=badge>redundant-pick savings ${savings.toFixed(2)}s</div></div>
   <div class=body>
     <div class=gridwrap><div class=gridlabel>Aisle grid &mdash; <span style="color:#a16207">amber = shared</span>, <span style="color:#4338ca">indigo = order A only</span>, <span style="color:#c2410c">orange = order B only</span></div>${gridHTML(s, hl)}</div>
     <div class=side>
       <div class="panel A"><h3>Order A &middot; ${esc(p.A.id)}</h3>${li(itemsA)}</div>
       <div class="panel B"><h3>Order B &middot; ${esc(p.B.id)}</h3>${li(itemsB)}</div>
       <div class=panel><div class=note>Shared items: <b>${shared.map(esc).join(", ") || "none"}</b>.<br>
         Bundled at the same store, each shared shelf is visited <b>once</b>, not twice &rarr; deployed redundant-pick savings = sum of shared nearest-access = <b>${savings.toFixed(2)}s</b> (rate 1.0).</div></div>
       <div class=legend><span><span class="sw e"></span>Entrance</span><span><span class="sw i"></span>Item</span><span><span class="sw s"></span>Shared</span></div>
     </div></div>
   <div class=foot>Rendered from deployed MasterData + scenario orders. Identical viewport ${VIEWPORT.width}&times;${VIEWPORT.height}, DPR ${SCALE}.</div>
   </div>`;
}

function sidecar(name, key, mode) {
  const meta = KEYS[key]; const s = byStore[meta.store]; const p = pairs[key];
  const ids = mode === "overlap" ? meta.ids : [meta.ids[0]];
  const shared = mode === "overlap"
    ? [...new Set(Object.keys(p.A.items).map((x) => x.toLowerCase()))]
        .filter((x) => new Set(Object.keys(p.B.items).map((y) => y.toLowerCase())).has(x))
    : [];
  fs.writeFileSync(path.join(OUT, `${name}.txt`), [
    `file: ${name}.png`,
    `figure_type: ${mode === "overlap" ? "overlap_pair" : "store_interior"}`,
    `store: ${s.store}`,
    `city: ${s.city}`,
    `scenario_set: mainGame_2026_03_20_14_26_36`,
    `round_index: ${meta.round}`,
    `order_ids: ${JSON.stringify(ids)}`,
    `shared_items: ${JSON.stringify(shared)}`,
    `entrance_rc: ${JSON.stringify(s.entrance_rc)}`,
    `cell_distance_ms: ${s.cell_distance_ms}`,
    `seconds_per_cell: ${s.seconds_per_cell}`,
    `viewport: ${VIEWPORT.width}x${VIEWPORT.height}`,
    `device_pixel_ratio: ${SCALE}`,
    `rendered_pixels: ${VIEWPORT.width * SCALE}x${VIEWPORT.height * SCALE}`,
    `zoom: 1.0`,
    `crop: none (full viewport, identical dimensions across all panels)`,
    `source: rendered from export_for_analysis/_raw_pull/stores.json (deployed grids); not a live authenticated play-through`,
    `renderer: paper/raw_materials/render_store_figures.mjs`,
  ].join("\n") + "\n");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  for (const key of Object.keys(KEYS)) {
    for (const [mode, builder] of [["interior", pageInterior], ["overlap", pageOverlap]]) {
      const name = mode === "interior" ? `store_interior_${key}_annotated` : `overlap_pair_${key}`;
      await page.setContent(builder(key), { waitUntil: "networkidle" });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      sidecar(name, key, mode);
      console.log("saved", name + ".png", "+ .txt");
    }
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
