import { G as store_get, J as ensure_array_like, F as escape_html, I as unsubscribe_stores, C as pop, z as push, K as attr, M as attr_class, N as stringify, O as bind_props } from "../../../chunks/index.js";
import { s as storeConfig, o as onDestroy, g as getDistances, a as globalError } from "../../../chunks/config.js";
import "clsx";
import { d as derived, w as writable, g as get } from "../../../chunks/index2.js";
import { u as updateFields, j as experimentScenarios } from "../../../chunks/app.js";
import "firebase/app";
import "firebase/analytics";
import "firebase/firestore";
const timeLimit = 120;
const tips = false;
const waiting = false;
const refresh = false;
const config = {
  timeLimit,
  tips,
  waiting,
  refresh
};
const configModules = /* @__PURE__ */ Object.assign({ "./tutorialconfigs/order.json": () => import("../../../chunks/order.js"), "./tutorialconfigs/stores.json": () => import("../../../chunks/stores.js") });
Object.keys(configModules).map((path) => {
  const name = path.split("/").pop();
  return { name, importFn: configModules[path] };
});
let start;
const uniqueSets = writable(0);
const orderList = writable([]);
const FullTimeLimit = config["timeLimit"];
const currentRound = writable(1);
const scenarios = experimentScenarios;
function getCurrentScenario(round) {
  return scenarios.find((s) => s.round === round) ?? scenarios[scenarios.length - 1];
}
const GameOver = writable(false);
const gameText = writable({
  selector: "None selected"
});
const game = writable({
  inSelect: false,
  inStore: false,
  bundled: false,
  tip: config["tips"],
  waiting: config["waiting"],
  refresh: config["refresh"]
});
const time = writable(/* @__PURE__ */ new Date());
let pauseDuration = 0;
const timeStamp = derived(time, ($time) => {
  const now = $time.getTime();
  return now - start - pauseDuration;
});
timeStamp.subscribe((v) => {
  if (get(GameOver)) ;
});
const orders = writable([]);
const finishedOrders = writable([]);
const id = writable("");
const earned = writable(0);
const currLocation = writable("");
const elapsed = derived(timeStamp, ($timeStamp, set) => {
  const elapsedSeconds = Math.round($timeStamp / 1e3);
  if (elapsedSeconds >= FullTimeLimit && elapsedSeconds <= FullTimeLimit + 2) {
    updateFields(get(id), {
      earnings: get(earned),
      ordersComplete: get(finishedOrders).length,
      uniqueSetsComplete: get(uniqueSets),
      gametime: FullTimeLimit
    });
    GameOver.set(true);
    set(FullTimeLimit);
    console.log("game over");
    return;
  }
  set(elapsedSeconds);
});
derived(
  elapsed,
  ($elapsed) => Math.max(FullTimeLimit - $elapsed, 0)
);
function Bundlegame($$payload, $$props) {
  push();
  var $$store_subs;
  let numOrders, locationLabel;
  let config2 = storeConfig(store_get($$store_subs ??= {}, "$orders", orders)[0].store);
  let curLocation = [0, 0];
  let bags = [{}, {}, {}];
  let startTimer = store_get($$store_subs ??= {}, "$elapsed", elapsed);
  let intervalId;
  let totalEarnings;
  let curTip = 0;
  onDestroy(() => {
    if (store_get($$store_subs ??= {}, "$game", game).tip) {
      clearInterval(intervalId);
    }
  });
  numOrders = store_get($$store_subs ??= {}, "$orders", orders).length;
  store_get($$store_subs ??= {}, "$elapsed", elapsed) - startTimer;
  bags.map((bag) => Object.values(bag).reduce((a, b) => a + b, 0));
  locationLabel = config2["locations"]?.[curLocation[0]]?.[curLocation[1]] || "Entrance";
  const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$orders", orders));
  $$payload.out += `<main class="mx-auto max-w-5xl px-4 py-6 space-y-5"><section class="rounded-2xl bg-white shadow-sm border p-4 space-y-3"><div class="flex items-start justify-between"><div><h2 class="text-base font-semibold text-slate-900">${escape_html(store_get($$store_subs ??= {}, "$orders", orders)[0].store)}</h2> <p class="text-xs text-slate-500">Current location: ${escape_html(locationLabel)}</p></div> <div class="text-right text-sm"><p class="font-semibold text-slate-900">Total earnings: $${escape_html(totalEarnings)}</p> `;
  if (store_get($$store_subs ??= {}, "$game", game).tip && curTip > 0) ;
  else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <p class="text-xs text-slate-500">Orders: ${escape_html(numOrders)}</p></div></div> <div class="flex flex-wrap gap-2 text-[10px]">`;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div> <div class="flex flex-wrap gap-2"><!--[-->`;
  for (let idx = 0, $$length = each_array.length; idx < $$length; idx++) {
    let order = each_array[idx];
    const each_array_1 = ensure_array_like(Object.keys(order.items));
    $$payload.out += `<div class="flex-1 min-w-[180px] rounded-lg bg-slate-50 p-3 text-xs"><p class="font-semibold text-slate-900 mb-1">Order ${escape_html(idx + 1)} for ${escape_html(order.name)}</p> <p class="text-slate-600 mb-2">Pay: $${escape_html(order.earnings)}</p> <ul class="space-y-0.5 text-slate-600"><!--[-->`;
    for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
      let item = each_array_1[$$index];
      $$payload.out += `<li>${escape_html(order.items[item])}x ${escape_html(item)}</li>`;
    }
    $$payload.out += `<!--]--></ul></div>`;
  }
  $$payload.out += `<!--]--></div></section> `;
  {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="text-center py-8"><button class="rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition" id="startpicking">Start Picking (${escape_html(numOrders)} ${escape_html(numOrders === 1 ? "Order" : "Orders")})</button></div>`;
  }
  $$payload.out += `<!--]--></main>`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function Order($$payload, $$props) {
  push();
  var $$store_subs;
  let totalItems, scenario;
  let orderData = $$props["orderData"];
  let index = $$props["index"];
  let updateEarnings = $$props["updateEarnings"];
  let selected = false;
  let intervalId;
  storeConfig(orderData.store);
  onDestroy(() => {
    if (store_get($$store_subs ??= {}, "$game", game).waiting || store_get($$store_subs ??= {}, "$game", game).refresh) {
      clearInterval(intervalId);
    }
  });
  totalItems = Object.values(orderData.items || {}).reduce((a, b) => a + b, 0);
  scenario = getCurrentScenario(store_get($$store_subs ??= {}, "$currentRound", currentRound));
  scenario.max_bundle ?? 3;
  {
    $$payload.out += "<!--[!-->";
    const each_array = ensure_array_like(Object.keys(orderData.items));
    $$payload.out += `<div${attr("id", index + "Selected" + selected)}${attr_class(`relative rounded-2xl bg-white shadow-sm border transition cursor-pointer select-none ${stringify("hover:shadow-md")}`)}>`;
    if (orderData.recommended) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div class="absolute top-3 right-3 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 flex items-center gap-1 shadow-sm"><span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span> Recommended</div>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--> <div class="flex flex-col gap-3 p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-semibold text-slate-900">${escape_html(orderData.store)}</p> <p class="text-xs text-slate-500">${escape_html(orderData.city)}</p></div> <div${attr_class(`flex flex-wrap gap-1 justify-end ${stringify(orderData.recommended ? "mr-24" : "")}`)}><span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">Batch</span> `;
    if (orderData.demand > 0) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">High demand</span>`;
    } else {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div></div> <div class="flex items-baseline gap-2"><p class="text-xs text-slate-500">Pay</p> <p class="text-lg font-semibold text-slate-900">$${escape_html(orderData.earnings)}</p></div> <div class="flex justify-between gap-4"><div class="space-y-0.5 text-xs text-slate-600 flex-1"><p>${escape_html(totalItems)} total items</p> <p>Customer: ${escape_html(orderData.name)}</p> <p>Zone: ${escape_html(store_get($$store_subs ??= {}, "$currLocation", currLocation))}</p></div> <div class="text-right text-xs text-slate-600 max-w-[120px]"><!--[-->`;
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$payload.out += `<p class="truncate">${escape_html(orderData.items[item])}x ${escape_html(item)}</p>`;
    }
    $$payload.out += `<!--]--></div></div> <div class="mt-2 flex justify-end"><button${attr_class(`rounded-full px-4 py-1.5 text-xs font-semibold transition ${stringify("bg-slate-100 text-slate-800 hover:bg-slate-200")}`)} type="button">${escape_html("Select order")}</button></div></div></div>`;
  }
  $$payload.out += `<!--]-->`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  bind_props($$props, { orderData, index, updateEarnings });
  pop();
}
function Home($$payload, $$props) {
  push();
  var $$store_subs;
  let scenario, maxBundle, distances;
  function updateEarnings(index, newEarnings) {
    console.log("updated: " + index + " " + newEarnings);
    orderList.update((list) => {
      list[index].earnings = newEarnings;
      return list;
    });
  }
  onDestroy(() => {
  });
  scenario = getCurrentScenario(store_get($$store_subs ??= {}, "$currentRound", currentRound));
  maxBundle = scenario.max_bundle ?? 3;
  scenario.orders;
  distances = getDistances(store_get($$store_subs ??= {}, "$currLocation", currLocation));
  if (store_get($$store_subs ??= {}, "$game", game).inSelect) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<section class="mx-auto max-w-5xl px-4 py-6 space-y-4">`;
    {
      $$payload.out += "<!--[!-->";
      const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$orderList", orderList));
      {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--> <div class="flex items-baseline justify-between"><h2 class="text-lg font-semibold text-slate-900">Available batches</h2> <p class="text-xs text-slate-500">Round ${escape_html(store_get($$store_subs ??= {}, "$currentRound", currentRound))} • Select up to ${escape_html(maxBundle)} ${escape_html(maxBundle === 1 ? "order" : "orders")}</p></div> <div class="mt-3 grid gap-4 md:grid-cols-2"><!--[-->`;
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        let order = each_array[i];
        Order($$payload, { orderData: order, index: i, updateEarnings });
      }
      $$payload.out += `<!--]--></div> `;
      {
        $$payload.out += "<!--[-->";
        $$payload.out += `<div class="mt-6 flex flex-wrap items-center justify-center gap-3"><button id="startorder" class="rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"${attr("disabled", store_get($$store_subs ??= {}, "$orders", orders).length === 0, true)}>${escape_html(store_get($$store_subs ??= {}, "$gameText", gameText).selector)}</button> `;
        if (distances && distances.destinations) {
          $$payload.out += "<!--[-->";
          const each_array_1 = ensure_array_like(distances.destinations);
          $$payload.out += `<!--[-->`;
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let dest = each_array_1[$$index_1];
            $$payload.out += `<button class="rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition" id="travel">Travel to ${escape_html(dest)}</button>`;
          }
          $$payload.out += `<!--]-->`;
        } else {
          $$payload.out += "<!--[!-->";
        }
        $$payload.out += `<!--]--></div>`;
      }
      $$payload.out += `<!--]-->`;
    }
    $$payload.out += `<!--]--></section>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let inSelect, inStore;
  inSelect = store_get($$store_subs ??= {}, "$game", game).inSelect;
  inStore = store_get($$store_subs ??= {}, "$game", game).inStore;
  store_get($$store_subs ??= {}, "$game", game).bundled;
  if (store_get($$store_subs ??= {}, "$globalError", globalError)) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="container mx-auto px-4 py-6"><div class="text-red-600 font-bold bg-red-100 p-4 rounded">⚠️ Error: ${escape_html(store_get($$store_subs ??= {}, "$globalError", globalError))}</div></div>`;
  } else if (!store_get($$store_subs ??= {}, "$GameOver", GameOver)) {
    $$payload.out += "<!--[1-->";
    $$payload.out += `<div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"><div class="bg-white rounded-3xl shadow-2xl px-12 py-10 w-full max-w-lg"><h1 class="text-3xl font-bold text-center mb-8 text-slate-900">User Access</h1> `;
    {
      $$payload.out += "<!--[!-->";
      $$payload.out += `<button id="start" class="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all">Enter Simulation</button>`;
    }
    $$payload.out += `<!--]--></div></div>`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div class="container mx-auto px-4 py-6">`;
    if (store_get($$store_subs ??= {}, "$GameOver", GameOver)) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<div class="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md text-center space-y-6"><h3 class="text-2xl font-bold text-red-600">Game Over!</h3> <div><h4 class="text-xl font-semibold text-gray-800">Your Stats:</h4> <ul class="list-disc list-inside text-left text-gray-700 mt-2 space-y-1"><li><span class="font-medium">Earnings:</span> $${escape_html(store_get($$store_subs ??= {}, "$earned", earned))}</li> <li><span class="font-medium">Finished Orders:</span> ${escape_html(store_get($$store_subs ??= {}, "$finishedOrders", finishedOrders).length)}</li></ul></div> `;
      {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--></div>`;
    } else {
      $$payload.out += "<!--[!-->";
      $$payload.out += `<header class="sticky top-0 z-50 bg-white/90 backdrop-blur shadow-sm border-b border-slate-200"><div class="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between"><div class="text-sm font-semibold text-red-600">Do not refresh or close the page!</div> `;
      {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--></div></header> <div class="min-h-screen bg-slate-50 py-6">`;
      if (inSelect) {
        $$payload.out += "<!--[-->";
        Home($$payload);
      } else if (inStore) {
        $$payload.out += "<!--[1-->";
        Bundlegame($$payload);
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--></div>`;
    }
    $$payload.out += `<!--]--></div>`;
  }
  $$payload.out += `<!--]-->`;
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
