import { f as ssr_context } from "./index2.js";
import { w as writable } from "./index.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
const globalError = writable(null);
const originalConsoleError = console.error;
console.error = function(...args) {
  globalError.set(args.map(String).join(" "));
  originalConsoleError.apply(console, args);
};
let default_job = {};
function storeConfig(store) {
  let r = "";
  default_job["stores"].forEach((e) => {
    if (e["store"] === store) {
      r = e;
    }
  });
  return r;
}
function getDistances(location) {
  return default_job["distances"][location];
}
export {
  globalError as a,
  getDistances as g,
  onDestroy as o,
  storeConfig as s
};
