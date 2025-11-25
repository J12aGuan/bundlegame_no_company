<script>
    import { get } from 'svelte/store';
    import { game, orders, gameText, currLocation, logOrder, logBundledOrder, logOrders, orderList, ordersShown, thinkTime, currentRound, getCurrentScenario, roundStartTime, elapsed } from "$lib/bundle.js";
    import { queueNFixedOrders, getDistances } from "$lib/config.js";
    import Order from "./order.svelte";
    import { onMount, onDestroy } from "svelte";

    // Experiment: Load orders from scenario
    $: scenario = getCurrentScenario($currentRound);
    $: maxBundle = scenario.max_bundle ?? 3;
    $: scenarioOrders = scenario.orders;

    let waiting = false;
    $: distances = getDistances($currLocation);
    let duration = 0;
    let travelProgress = 0; // For visual feedback
    let travelingTo = ""
    let thinking = false;
    let thinkRemaining = thinkTime;
    let thinkInterval;
    let travelTimer;

    // Hardcoded map coordinates for visualization (approximate relative positions)
    const mapCoords = {
        "Berkeley": { cx: 50, cy: 30 },
        "Oakland": { cx: 50, cy: 80 },
        "Emeryville": { cx: 20, cy: 55 },
        "Piedmont": { cx: 80, cy: 55 }
    };

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
        if (city === $currLocation) return;
        
        //find index of city
        let index = distances["destinations"].indexOf(city)
        if (index == -1) {
            return;
        }
        duration = distances["distances"][index]
        waiting = true;
        travelingTo = city;
        travelProgress = duration;

        // Visual countdown for travel progress
        travelTimer = setInterval(() => {
            travelProgress -= 1;
            if (travelProgress <= 0) clearInterval(travelTimer);
        }, 1000);

        setTimeout(() => {
            waiting = false;
            if (travelTimer) clearInterval(travelTimer);
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

    function skipThinking() {
        thinkRemaining = 0;
        if (thinkInterval) clearInterval(thinkInterval);
        thinking = false;
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
        if (travelTimer) {
            clearInterval(travelTimer);
        }
    });
</script>

{#if $game.inSelect}
<section class="mx-auto max-w-5xl px-4 py-6 space-y-4">
    {#if waiting}
        <div class="rounded-2xl bg-white shadow-sm border p-6 text-center space-y-4">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
                <svg class="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
            <h2 class="text-lg font-semibold text-slate-900">Traveling to {travelingTo}</h2>
            <div class="w-full bg-gray-200 rounded-full h-2.5 max-w-md mx-auto">
                <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style="width: {((duration - travelProgress) / duration) * 100}%"></div>
            </div>
            <p class="text-sm text-slate-500">Arriving in {Math.max(travelProgress, 0)}s</p>
        </div>
    {:else}
        {#if thinking}
            <div class="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-4 flex justify-between items-center">
                <p class="text-sm font-medium text-blue-900">
                    📋 Review available orders ({thinkRemaining}s remaining)
                </p>
                <button class="text-xs bg-blue-200 hover:bg-blue-300 text-blue-800 px-3 py-1 rounded transition" on:click={skipThinking}>
                    Skip Wait
                </button>
            </div>
        {/if}

        <div class="flex items-baseline justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Available orders</h2>
            <p class="text-xs text-slate-500">Round {$currentRound} • Select up to {maxBundle} {maxBundle === 1 ? 'order' : 'orders'}</p>
        </div>

        <div class="mt-3 grid gap-4 md:grid-cols-2">
            {#each $orderList as order, i (order.id)}
                <Order orderData={order} index={i} updateEarnings={updateEarnings}/>
            {/each}
        </div>

        {#if !thinking}
            <div class="mt-8 grid md:grid-cols-2 gap-8 items-start">
                <div class="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-2xl border">
                    <h3 class="font-semibold text-slate-900">Current Location: {$currLocation}</h3>
                    
                    <button
                        id="startorder"
                        class="w-full max-w-xs rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        on:click={start}
                        disabled={$orders.length === 0}
                    >
                        {$gameText.selector}
                    </button>
                    
                    <p class="text-xs text-slate-500 text-center max-w-xs">
                        Select orders above, then click start. Or click a city on the map to travel.
                    </p>
                </div>

                <div class="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center">
                    <h3 class="text-sm font-semibold mb-2 text-slate-700">Area Map</h3>
                    <svg viewBox="0 0 100 100" class="w-full max-w-[300px] h-auto border rounded-lg bg-blue-50/30">
                        <!-- Connection lines -->
                        <line x1="50" y1="30" x2="20" y2="55" stroke="#cbd5e1" stroke-width="2" />
                        <line x1="50" y1="30" x2="80" y2="55" stroke="#cbd5e1" stroke-width="2" />
                        <line x1="50" y1="30" x2="50" y2="80" stroke="#cbd5e1" stroke-width="2" />
                        <line x1="20" y1="55" x2="50" y2="80" stroke="#cbd5e1" stroke-width="2" />
                        <line x1="80" y1="55" x2="50" y2="80" stroke="#cbd5e1" stroke-width="2" />
                        
                        <!-- City nodes -->
                        {#each Object.entries(mapCoords) as [city, coords]}
                            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                            <g class="cursor-pointer hover:opacity-80 transition" role="button" tabindex="0" on:click={() => travel(city, false)} on:keydown={(e) => e.key === 'Enter' && travel(city, false)}>
                                <circle cx={coords.cx} cy={coords.cy} r="8" 
                                    fill={city === $currLocation ? '#16a34a' : '#fff'} 
                                    stroke={city === $currLocation ? '#166534' : '#64748b'} 
                                    stroke-width="2" />
                                <text x={coords.cx} y={coords.cy + 15} font-size="6" text-anchor="middle" fill="#334155" font-weight="bold">
                                    {city}
                                </text>
                                {#if city === $currLocation}
                                    <circle cx={coords.cx} cy={coords.cy} r="3" fill="white" />
                                {/if}
                            </g>
                        {/each}
                    </svg>
                </div>
            </div>
        {/if}
    {/if}
</section>
{/if}