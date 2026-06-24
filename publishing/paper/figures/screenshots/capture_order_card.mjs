/**
 * Vector-PDF re-capture of the EC.4 order card (order_card.pdf).
 *
 * The order card (src/routes/order.svelte) is plain Tailwind HTML with no map or
 * canvas, so it can be rendered in isolation and exported with page.pdf() to a
 * true vector PDF (selectable text, no rasterization) that stays sharp at any
 * size -- unlike a clipped screenshot. This script reproduces the card markup
 * verbatim with the REAL deployed order data (mainGameOrder37: Safeway / Piedmont,
 * $14, the exact card shown in the existing order_card.png), so no live game, no
 * dev server, no Firebase, and no participant token are involved (read-only).
 *
 * Modeled time matches the deployed model: base round(13.1)=13s + Berkeley->Piedmont
 * city travel 11s => "modeled 24s" (cities.json startinglocation = Berkeley).
 *
 * Run:  node publishing/paper/figures/screenshots/capture_order_card.mjs
 * Fallback: if page.pdf() is unavailable, set FALLBACK_RASTER=1 to instead capture
 * the card element at deviceScaleFactor 8 (~475 ppi at the paper display size).
 */
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.dirname(fileURLToPath(import.meta.url));
const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Faithful redraw of order.svelte (unselected state) with real Order37 data.
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#ffffff}
  body{font-family:${FONT};-webkit-font-smoothing:antialiased;padding:0}
  #card{width:340px;border-radius:.5rem;background:#fff;border:1px solid #e5e7eb;overflow:hidden}
  .body{padding:.5rem}
  .body > * + *{margin-top:.25rem}
  .row{display:flex;justify-content:space-between;align-items:flex-start}
  .flex1{flex:1 1 0%;min-width:0}
  .store{font-weight:700;color:#1e293b;font-size:.875rem;line-height:1.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .city{font-size:.75rem;line-height:1rem;color:#64748b}
  .right{text-align:right;margin-left:.5rem}
  .pay{display:block;font-weight:700;color:#16a34a;font-size:1rem;line-height:1.5rem}
  .time{display:block;font-size:.75rem;line-height:1rem;color:#64748b}
  .sub{display:block;font-size:10px;color:#94a3b8}
  .items{background:#f8fafc;border-radius:.25rem;padding:.375rem;font-size:.75rem;line-height:1rem;color:#475569}
  .items > * + *{margin-top:.125rem}
  .item{display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:.125rem}
  .item:last-child{border-bottom:0;padding-bottom:0}
  .iname{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .iqty{font-weight:500;margin-left:.25rem}
  .btnwrap{padding-top:.25rem}
  .btn{width:100%;padding:.375rem 0;font-size:.75rem;line-height:1rem;font-weight:700;border-radius:.375rem;background:#f1f5f9;color:#475569;border:0}
</style></head><body>
  <div id="card"><div class="body">
    <div class="row">
      <div class="flex1">
        <h3 class="store">Safeway</h3>
        <p class="city">&#128205; Piedmont</p>
      </div>
      <div class="right">
        <span class="pay">$14</span>
        <span class="time">&#9201; modeled 24s</span>
        <span class="sub">base 13s + city 11s</span>
      </div>
    </div>
    <div class="items">
      <div class="item"><span class="iname">apple</span><span class="iqty">x1</span></div>
      <div class="item"><span class="iname">watermelon</span><span class="iqty">x3</span></div>
    </div>
    <div class="btnwrap"><button class="btn">Add to Tasks</button></div>
  </div></div>
</body></html>`;

async function launch() {
  try {
    return await chromium.launch({ headless: true });
  } catch (e) {
    console.log("[order_card] bundled chromium launch failed, trying system Chrome:", e.message);
    return await chromium.launch({ headless: true, channel: "chrome" });
  }
}

async function main() {
  const fallbackRaster = process.env.FALLBACK_RASTER === "1";
  const browser = await launch();
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 360 },
    deviceScaleFactor: fallbackRaster ? 8 : 1,
  });
  const page = await ctx.newPage();
  await page.setContent(HTML, { waitUntil: "networkidle" });
  const card = await page.$("#card");
  const box = await card.boundingBox();
  const w = Math.ceil(box.width);
  const h = Math.ceil(box.height);
  console.log(`[order_card] card box ${w}x${h} css px`);

  if (!fallbackRaster) {
    // Vector path: page.pdf() sized exactly to the card (card sits at 0,0).
    await page.emulateMedia({ media: "screen" });
    await page.pdf({
      path: path.join(OUT, "order_card.pdf"),
      width: `${w}px`,
      height: `${h}px`,
      printBackground: true,
      pageRanges: "1",
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    console.log("[order_card] saved order_card.pdf (vector via page.pdf)");
  } else {
    await card.screenshot({ path: path.join(OUT, "order_card.png") });
    console.log("[order_card] saved order_card.png (raster fallback, deviceScaleFactor 8)");
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
