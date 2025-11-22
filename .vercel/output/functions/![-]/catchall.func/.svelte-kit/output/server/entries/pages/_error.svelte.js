import { D as noop, E as getContext, F as escape_html, G as store_get, I as unsubscribe_stores, C as pop, z as push } from "../../chunks/index.js";
import "clsx";
import "../../chunks/exports.js";
function get(key, parse = JSON.parse) {
  try {
    return parse(sessionStorage[key]);
  } catch {
  }
}
const SNAPSHOT_KEY = "sveltekit:snapshot";
const SCROLL_KEY = "sveltekit:scroll";
const is_legacy = noop.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop.toString());
if (is_legacy) {
  ({
    data: {},
    form: null,
    error: null,
    params: {},
    route: { id: null },
    state: {},
    status: -1,
    url: new URL("https://example.com")
  });
}
get(SCROLL_KEY) ?? {};
get(SNAPSHOT_KEY) ?? {};
const getStores = () => {
  const stores = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function _error($$payload, $$props) {
  push();
  var $$store_subs;
  $$payload.out += `<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div class="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8"><h1 class="text-3xl font-bold text-red-600 mb-4">${escape_html(store_get($$store_subs ??= {}, "$page", page).status)}: ${escape_html(store_get($$store_subs ??= {}, "$page", page).error?.message || "An error occurred")}</h1> `;
  if (store_get($$store_subs ??= {}, "$page", page).error?.stack) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<details class="mt-4"><summary class="cursor-pointer text-sm font-semibold text-gray-700">Show error details</summary> <pre class="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">${escape_html(store_get($$store_subs ??= {}, "$page", page).error.stack)}</pre></details>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <a href="/" class="mt-6 inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Go Home</a></div></div>`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _error as default
};
