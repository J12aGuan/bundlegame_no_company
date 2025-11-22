import { P as current_component } from "./index.js";
import { w as writable } from "./index2.js";
function onDestroy(fn) {
  var context = (
    /** @type {Component} */
    current_component
  );
  (context.d ??= []).push(fn);
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
