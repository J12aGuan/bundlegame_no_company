import { a as store_get, e as ensure_array_like, u as unsubscribe_stores, b as attr_class, c as stringify, d as bind_props } from "../../chunks/index2.js";
import { s as storeConfig, o as onDestroy, g as getDistances, a as globalError } from "../../chunks/config.js";
import { V as escape_html, W as attr } from "../../chunks/utils2.js";
import "clsx";
import { o as orders, e as elapsed, g as game, a as getCurrentScenario, c as currentRound, b as currLocation, d as orderList, f as gameText, F as FullTimeLimit, r as remainingTime, G as GameOver, h as earned, i as finishedOrders } from "../../chunks/app.js";
import "firebase/app";
import "firebase/analytics";
import "firebase/firestore";
function Bundlegame($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let numOrders, locationLabel;
    let config = storeConfig(store_get($$store_subs ??= {}, "$orders", orders)[0].store);
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
    locationLabel = config["locations"]?.[curLocation[0]]?.[curLocation[1]] || "Entrance";
    $$renderer2.push(`<main class="mx-auto max-w-5xl px-4 py-6 space-y-5"><section class="rounded-2xl bg-white shadow-sm border p-4 space-y-3"><div class="flex items-start justify-between"><div><h2 class="text-base font-semibold text-slate-900">${escape_html(store_get($$store_subs ??= {}, "$orders", orders)[0].store)}</h2> <p class="text-xs text-slate-500">Current location: ${escape_html(locationLabel)}</p></div> <div class="text-right text-sm"><p class="font-semibold text-slate-900">Total earnings: $${escape_html(totalEarnings)}</p> `);
    if (store_get($$store_subs ??= {}, "$game", game).tip && curTip > 0) ;
    else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <p class="text-xs text-slate-500">Orders: ${escape_html(numOrders)}</p></div></div> <div class="flex flex-wrap gap-2 text-[10px]">`);
    {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="flex flex-wrap gap-2"><!--[-->`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$orders", orders));
    for (let idx = 0, $$length = each_array.length; idx < $$length; idx++) {
      let order = each_array[idx];
      $$renderer2.push(`<div class="flex-1 min-w-[180px] rounded-lg bg-slate-50 p-3 text-xs"><p class="font-semibold text-slate-900 mb-1">Order ${escape_html(idx + 1)} for ${escape_html(order.name)}</p> <p class="text-slate-600 mb-2">Pay: $${escape_html(order.earnings)}</p> <ul class="space-y-0.5 text-slate-600"><!--[-->`);
      const each_array_1 = ensure_array_like(Object.keys(order.items));
      for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
        let item = each_array_1[$$index];
        $$renderer2.push(`<li>${escape_html(order.items[item])}x ${escape_html(item)}</li>`);
      }
      $$renderer2.push(`<!--]--></ul></div>`);
    }
    $$renderer2.push(`<!--]--></div></section> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="text-center py-8"><button class="rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition" id="startpicking">Start Picking (${escape_html(numOrders)} ${escape_html(numOrders === 1 ? "Order" : "Orders")})</button></div>`);
    }
    $$renderer2.push(`<!--]--></main>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Order($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div${attr("id", index + "Selected" + selected)}${attr_class(`relative rounded-2xl bg-white shadow-sm border transition cursor-pointer select-none ${stringify("hover:shadow-md")}`)}>`);
      if (orderData.recommended) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="absolute top-3 right-3 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 flex items-center gap-1 shadow-sm"><span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span> Recommended</div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <div class="flex flex-col gap-3 p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-semibold text-slate-900">${escape_html(orderData.store)}</p> <p class="text-xs text-slate-500">${escape_html(orderData.city)}</p></div> <div${attr_class(`flex flex-wrap gap-1 justify-end ${stringify(orderData.recommended ? "mr-24" : "")}`)}><span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">Batch</span> `);
      if (orderData.demand > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">High demand</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div> <div class="flex items-baseline gap-2"><p class="text-xs text-slate-500">Pay</p> <p class="text-lg font-semibold text-slate-900">$${escape_html(orderData.earnings)}</p></div> <div class="flex justify-between gap-4"><div class="space-y-0.5 text-xs text-slate-600 flex-1"><p>${escape_html(totalItems)} total items</p> <p>Customer: ${escape_html(orderData.name)}</p> <p>Zone: ${escape_html(store_get($$store_subs ??= {}, "$currLocation", currLocation))}</p></div> <div class="text-right text-xs text-slate-600 max-w-[120px]"><!--[-->`);
      const each_array = ensure_array_like(Object.keys(orderData.items));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let item = each_array[$$index];
        $$renderer2.push(`<p class="truncate">${escape_html(orderData.items[item])}x ${escape_html(item)}</p>`);
      }
      $$renderer2.push(`<!--]--></div></div> <div class="mt-2 flex justify-end"><button${attr_class(`rounded-full px-4 py-1.5 text-xs font-semibold transition ${stringify("bg-slate-100 text-slate-800 hover:bg-slate-200")}`)} type="button">${escape_html("Select order")}</button></div></div></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { orderData, index, updateEarnings });
  });
}
function Home($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="mx-auto max-w-5xl px-4 py-6 space-y-4">`);
      {
        $$renderer2.push("<!--[!-->");
        {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="flex items-baseline justify-between"><h2 class="text-lg font-semibold text-slate-900">Available batches</h2> <p class="text-xs text-slate-500">Round ${escape_html(store_get($$store_subs ??= {}, "$currentRound", currentRound))} • Select up to ${escape_html(maxBundle)} ${escape_html(maxBundle === 1 ? "order" : "orders")}</p></div> <div class="mt-3 grid gap-4 md:grid-cols-2"><!--[-->`);
        const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$orderList", orderList));
        for (let i = 0, $$length = each_array.length; i < $$length; i++) {
          let order = each_array[i];
          Order($$renderer2, { orderData: order, index: i, updateEarnings });
        }
        $$renderer2.push(`<!--]--></div> `);
        {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="mt-6 flex flex-wrap items-center justify-center gap-3"><button id="startorder" class="rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"${attr("disabled", store_get($$store_subs ??= {}, "$orders", orders).length === 0, true)}>${escape_html(store_get($$store_subs ??= {}, "$gameText", gameText).selector)}</button> `);
          if (distances && distances.destinations) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(distances.destinations);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let dest = each_array_1[$$index_1];
              $$renderer2.push(`<button class="rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition" id="travel">Travel to ${escape_html(dest)}</button>`);
            }
            $$renderer2.push(`<!--]-->`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let inSelect, inStore, formattedRemaining;
    let userInput = "";
    let userPass = "";
    let completed = "";
    let completed2 = "";
    function formatTime(seconds) {
      const s = Math.max(0, Math.floor(seconds));
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    inSelect = store_get($$store_subs ??= {}, "$game", game).inSelect;
    inStore = store_get($$store_subs ??= {}, "$game", game).inStore;
    store_get($$store_subs ??= {}, "$game", game).bundled;
    formattedRemaining = formatTime(store_get($$store_subs ??= {}, "$remainingTime", remainingTime) ?? FullTimeLimit);
    if (store_get($$store_subs ??= {}, "$globalError", globalError)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="min-h-screen bg-slate-50 flex items-center justify-center px-4"><div class="text-red-600 font-bold bg-red-100 p-4 rounded-xl max-w-2xl">⚠️ Error: ${escape_html(store_get($$store_subs ??= {}, "$globalError", globalError))}</div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (!store_get($$store_subs ??= {}, "$GameOver", GameOver)) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<main class="min-h-screen bg-slate-950 flex items-center justify-center px-4"><div class="bg-white rounded-3xl shadow-2xl p-8 md:p-10 w-full max-w-md"><h1 class="text-center text-2xl font-semibold text-slate-900 mb-6">User Access</h1> `);
        {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="space-y-4"><div class="space-y-1"><label class="text-sm font-medium text-slate-700">User ID</label> <input class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition" type="text"${attr("value", userInput)} placeholder="Enter user ID"/></div> <div class="space-y-1"><label class="text-sm font-medium text-slate-700">Token (include dashes)</label> <input class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition" type="password"${attr("value", userPass)} placeholder="XXXX-XXXX-XXXX"/></div> <button id="start" class="mt-4 w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition">Enter Simulation</button> <button type="button" class="w-full text-center text-xs text-slate-500 hover:text-slate-700 mt-2 transition">Return to overview</button></div>`);
        }
        $$renderer2.push(`<!--]--></div></main>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (store_get($$store_subs ??= {}, "$GameOver", GameOver)) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="min-h-screen bg-slate-50 flex items-center justify-center px-4"><div class="max-w-xl w-full p-6 bg-white rounded-2xl shadow-md text-center space-y-6"><h3 class="text-2xl font-bold text-red-600">Game Over!</h3> <div><h4 class="text-xl font-semibold text-gray-800">Your Stats:</h4> <ul class="list-disc list-inside text-left text-gray-700 mt-2 space-y-1"><li><span class="font-medium">Earnings:</span> $${escape_html(store_get($$store_subs ??= {}, "$earned", earned))}</li> <li><span class="font-medium">Finished Orders:</span> ${escape_html(store_get($$store_subs ??= {}, "$finishedOrders", finishedOrders).length)}</li></ul></div> `);
          {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div class="bg-yellow-100 p-4 rounded-xl border border-yellow-400"><h3 class="text-lg font-semibold text-yellow-800 mb-2">Please copy the following two codes back into the Qualtrics survey:</h3> <p class="text-gray-800"><span class="font-semibold">Code #1:</span><span class="text-blue-600 font-mono">${escape_html(completed)}</span></p> <p class="text-gray-800"><span class="font-semibold">Code #2:</span><span class="text-blue-600 font-mono">${escape_html(completed2)}</span></p></div> <h5 class="text-sm text-gray-600">You may close this page once you have successfully continued to the next step in the survey.</h5>`);
          }
          $$renderer2.push(`<!--]--></div></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="min-h-screen bg-slate-50"><header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100"><div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-xs sm:text-sm text-slate-700 flex-wrap gap-2"><span class="font-semibold text-red-600">Please do not refresh or close the page!</span> <div class="flex flex-wrap gap-4"><span><span class="font-semibold text-slate-900">Time left:</span> ${escape_html(formattedRemaining)}</span> <span><span class="font-semibold text-slate-900">Earned:</span> $${escape_html(store_get($$store_subs ??= {}, "$earned", earned))}</span> <span><span class="font-semibold text-slate-900">Location:</span> ${escape_html(store_get($$store_subs ??= {}, "$currLocation", currLocation))}</span></div></div></header> `);
          if (inSelect) {
            $$renderer2.push("<!--[-->");
            Home($$renderer2);
          } else {
            $$renderer2.push("<!--[!-->");
            if (inStore) {
              $$renderer2.push("<!--[-->");
              Bundlegame($$renderer2);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
