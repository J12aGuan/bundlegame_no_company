<script>
    import { get } from 'svelte/store';
    import { game, orders, gameText, currLocation, logOrder, logBundledOrder, logOrders, orderList, ordersShown, thinkTime, currentRound, getCurrentScenario, roundStartTime, elapsed } from "$lib/bundle.js";
    import { queueNFixedOrders, getDistances } from "$lib/config.js";
    import Order from "./order.svelte";
    import { onMount, onDestroy } from "svelte";

    let waiting = false;
    $: distances = getDistances($currLocation);
    let duration = 0;
    let travelingTo = ""
    let thinking = false;
    let thinkRemaining = thinkTime;
    let thinkInterval;

    // Experiment: Load orders from scenario
    $: scenario = getCurrentScenario($currentRound);
    $: maxBundle = scenario.max_bundle ?? 3;
    $: scenarioOrders = scenario.orders;

    let waiting = false;
    $: distances = getDistances($currLocation);
    let duration = 0;
    let travelingTo = ""
    let thinking = false;
    let thinkRemaining = thinkTime;
    let thinkInterval;

    function start() {
        const selOrders = get(orders)
        const curGame = get(game)
        const curLoc = get(currLocation)
        
        if (selOrders.length < 1) {
            alert(`Please select 1 to ${maxBundle} orders!`)
            return;
        }
        
        if (selOrders.length > maxBundle) {
            alert(`You can only select up to ${maxBundle} orders this round!`)
            return;
        }
        
        // Check all orders are from same store/city
        if (selOrders.length > 1) {
            const firstStore = selOrders[0].store
            const firstCity = selOrders[0].city
            for (let order of selOrders) {
                if (order.store !== firstStore || order.city !== firstCity) {
                    alert("Cannot bundle orders from different stores/cities!")
                    return;
                }
            }
            curGame.bundled = true;
        } else {
            curGame.bundled = false;
        }

        // For experiment mode, don't modify orderList - it's fixed per round
        // Just proceed with the selected orders

        if (selOrders[0].city != curLoc) {
            travel(selOrders[0].city, true)
        } else {
            gameWindow()
        }
    }

    function travel(city, visitStore) {
        //find index of city
        let index = distances["destinations"].indexOf(city)
        if (index == -1) {
            return;
        }
        duration = distances["distances"][index]
        waiting = true;
        travelingTo = city;
        setTimeout(() => {
            waiting = false;
            currLocation.set(city)
            if (visitStore) {
                gameWindow()
            } else {
                // Clear selected orders but keep orderList intact for experiment
                $orders = []
                distances = getDistances(city)
                $gameText.selector = "None selected"
            }
        }, duration * 1000)
    }

    function gameWindow() {
        const selOrders = get(orders)
        // Use new logOrders function that handles 1-3 orders
        logOrders(selOrders, scenarioOrders)
        $game.inStore = true;
        $game.inSelect= false;
    }
    function updateEarnings(index, newEarnings) {
        console.log("updated: " + index + " " + newEarnings)
        orderList.update(list => {
            list[index].earnings = newEarnings;
            return list;
        });
    }

    onMount(() => {
        // Set round start time for tracking
        roundStartTime.set($elapsed);
        
        // Load scenario orders into orderList
        orderList.set(scenarioOrders);
        
        thinking = true;
        thinkRemaining = thinkTime;

        thinkInterval = setInterval(() => {
            thinkRemaining -= 1;
            if (thinkRemaining <= 0) {
                clearInterval(thinkInterval);
                thinking = false;
            }
        }, 1000);
    });

    onDestroy(() => {
        if (thinkInterval) {
            clearInterval(thinkInterval);
        }
    });
</script>

{#if $game.inSelect}
<section class="mx-auto max-w-5xl px-4 py-6 space-y-4">
    {#if waiting}
        <div class="rounded-2xl bg-white shadow-sm border p-6 text-center space-y-2">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
                <svg class="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
            <p class="text-lg font-semibold text-slate-900">Traveling to {travelingTo}</p>
            <p class="text-sm text-slate-500">Est. travel time: {duration}s</p>
        </div>
    {:else}
        {#if thinking}
            <div class="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-4">
                <p class="text-sm font-medium text-blue-900 text-center">
                    📋 Review available batches ({thinkRemaining}s remaining)
                </p>
            </div>
        {/if}

        <div class="flex items-baseline justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Available batches</h2>
            <p class="text-xs text-slate-500">Round {$currentRound} • Select up to {maxBundle} {maxBundle === 1 ? 'order' : 'orders'}</p>
        </div>

        <div class="mt-3 grid gap-4 md:grid-cols-2">
            {#each $orderList as order, i (order.id)}
                <Order orderData={order} index={i} updateEarnings={updateEarnings}/>
            {/each}
        </div>

        {#if !thinking}
            <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                    id="startorder"
                    class="rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={start}
                    disabled={$orders.length === 0}
                >
                    {$gameText.selector}
                </button>

                {#if distances && distances.destinations}
                    {#each distances.destinations as dest}
                        <button
                            class="rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                            id="travel"
                            on:click={() => travel(dest, false)}
                        >
                            Travel to {dest}
                        </button>
                    {/each}
                {/if}
            </div>
        {/if}
    {/if}
</section>
{/if}