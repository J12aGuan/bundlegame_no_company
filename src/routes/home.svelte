<script>
    import { get } from 'svelte/store';
    import { game, orders, gameText, currLocation, logOrders, orderList, thinkTime, currentRound, getCurrentScenario, roundStartTime, elapsed } from "$lib/bundle.js";
    import { getDistances } from "$lib/config.js";
    import Order from "./order.svelte";
    import { onMount, onDestroy } from "svelte";

    // --- EXPERIMENT DATA ---
    $: scenario = getCurrentScenario($currentRound);
    $: maxBundle = scenario.max_bundle ?? 3;
    $: scenarioOrders = scenario.orders;

    // Filter orders: Only show orders belonging to the current city
    $: localOrders = scenarioOrders.filter(o => o.city === $currLocation);
    
    // Detect where the orders actually are if not here
    $: activeOrderCity = scenarioOrders.length > 0 ? scenarioOrders[0].city : "";

    // --- STATE ---
    let waiting = false;
    $: distances = getDistances($currLocation);
    let duration = 0;
    let travelProgress = 0;
    let travelingTo = "";
    let travelTimer;
    
    let thinking = false;
    let thinkRemaining = thinkTime;
    let thinkInterval;

    // Penalty Logic
    let isPenalty = false;
    let penaltyTime = 30; 
    let penaltyRemaining = 0;
    let penaltyInterval;

    // Map Config
    let map;
    const API_KEY = 'iMsEUcFHOj2pHKXd7NO0';
    const cityCoords = {
        "Berkeley": [37.8715, -122.2730],
        "Oakland": [37.8044, -122.2712],
        "Emeryville": [37.8313, -122.2852],
        "Piedmont": [37.8238, -122.2316]
    };

    // --- HELPERS ---
    function clearTimers() {
        if (travelTimer) clearInterval(travelTimer);
        if (thinkInterval) clearInterval(thinkInterval);
        if (penaltyInterval) clearInterval(penaltyInterval);
    }

    function start() {
        const selOrders = get(orders);
        
        if (selOrders.length < 1) {
            alert(`Please select at least 1 order.`);
            return;
        }
        if (selOrders.length > maxBundle) {
            alert(`You can only select up to ${maxBundle} orders this round!`);
            return;
        }

        // Validate bundling (must be same store)
        const firstStore = selOrders[0].store;
        if (!selOrders.every(o => o.store === firstStore)) {
            alert("All bundled orders must be from the same store!");
            return;
        }

        clearTimers();
        // Log the selected orders against the scenario
        logOrders(selOrders, scenarioOrders);
        $game.inStore = true;
        $game.inSelect = false;
    }

    function travel(city) {
        if (city === $currLocation) return;
        
        // Find travel duration from config
        let index = distances["destinations"].indexOf(city);
        if (index == -1) return; 
        
        duration = distances["distances"][index];
        clearTimers();
        
        waiting = true;
        travelingTo = city;
        travelProgress = duration;

        travelTimer = setInterval(() => {
            travelProgress -= 1;
            if (travelProgress <= 0) {
                completeTravel(city);
            }
        }, 1000);
    }

    function completeTravel(city) {
        clearTimers();
        waiting = false;
        currLocation.set(city);
        $orders = []; // Clear selection
        $gameText.selector = "None selected";
        startThinkingTimer();
    }

    function startThinkingTimer() {
        clearTimers();
        thinking = true;
        thinkRemaining = thinkTime;
        thinkInterval = setInterval(() => {
            thinkRemaining -= 1;
            if (thinkRemaining <= 0) {
                thinking = false;
                clearInterval(thinkInterval);
            }
        }, 1000);
    }

    function startPenalty() {
        isPenalty = true;
        penaltyRemaining = penaltyTime;
        clearTimers();
        penaltyInterval = setInterval(() => {
            penaltyRemaining -= 1;
            if (penaltyRemaining <= 0) {
                isPenalty = false;
                clearInterval(penaltyInterval);
                $game.penaltyTriggered = false; 
            }
        }, 1000);
    }

    function updateEarnings(index, newEarnings) {
        orderList.update(list => {
            list[index].earnings = newEarnings;
            return list;
        });
    }

    // --- MAP INIT ---
    function initMap() {
        if (!document.getElementById('map')) return;
        if (map && map.remove) { map.remove(); map = null; }

        const currentCoords = cityCoords[$currLocation] || cityCoords["Berkeley"];

        map = L.map('map', {
            center: currentCoords,
            zoom: 12
        });

        L.maptilerLayer({
            apiKey: API_KEY,
            style: L.MaptilerStyle.STREETS
        }).addTo(map);

        Object.entries(cityCoords).forEach(([city, coords]) => {
            const isCurrent = city === $currLocation;
            const isActiveTarget = city === activeOrderCity && localOrders.length === 0;

            const marker = L.circleMarker(coords, {
                color: isCurrent ? '#16a34a' : (isActiveTarget ? '#ef4444' : '#3b82f6'),
                fillColor: isCurrent ? '#22c55e' : (isActiveTarget ? '#f87171' : '#60a5fa'),
                fillOpacity: 0.8,
                radius: isCurrent ? 10 : 8
            }).addTo(map);

            // Tooltip
            let label = city;
            if (isCurrent) label += " (You)";
            if (isActiveTarget) label += " (Orders Here!)";

            marker.bindTooltip(label, { 
                permanent: true, 
                direction: 'top',
                className: 'font-bold text-slate-700' 
            });

            marker.on('click', () => travel(city));
        });
    }

    // --- LIFECYCLE ---
    onMount(() => {
        if ($game.penaltyTriggered) startPenalty();
        else startThinkingTimer();
        
        roundStartTime.set($elapsed);
        orderList.set(scenarioOrders);

        setTimeout(initMap, 100);
    });

    // Re-render map when state changes to selection mode
    $: if (!waiting && !isPenalty && $game.inSelect) {
        setTimeout(initMap, 100);
    }

    onDestroy(() => {
        clearTimers();
        if (map) map.remove();
    });
</script>

{#if $game.inSelect}
<section class="mx-auto max-w-7xl px-4 py-6 space-y-6">

    {#if isPenalty}
        <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-lg">
            <h2 class="text-2xl font-bold text-red-800">Penalty Timeout</h2>
            <p class="text-red-600">You gave up the previous round.</p>
            <div class="text-4xl font-mono font-bold text-red-900">{penaltyRemaining}s</div>
            <div class="mt-4">
                <label class="text-xs font-bold uppercase text-red-400">Customize Penalty (s)</label>
                <input type="number" bind:value={penaltyTime} class="w-20 text-center border rounded p-1 ml-2" />
            </div>
        </div>

    {:else if waiting}
        <div class="bg-white rounded-2xl shadow-xl border p-8 text-center space-y-6">
            <div class="animate-spin text-4xl text-blue-600 mx-auto w-min">⚙️</div>
            <div>
                <h2 class="text-2xl font-bold text-slate-800">Traveling to {travelingTo}</h2>
                <p class="text-slate-500">Driving...</p>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-4 overflow-hidden max-w-md mx-auto">
                <div class="bg-blue-600 h-full transition-all duration-1000 ease-linear" 
                     style="width: {((duration - travelProgress) / duration) * 100}%"></div>
            </div>
            <p class="font-mono text-slate-400">{travelProgress}s remaining</p>
        </div>

    {:else}
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-slate-900">Round {$currentRound} / 50</h1>
                <p class="text-slate-500">Current Location: <span class="font-bold text-blue-600">{$currLocation}</span></p>
            </div>
            {#if thinking}
                <div class="bg-blue-50 px-4 py-2 rounded-lg text-blue-800 text-sm font-medium border border-blue-100">
                    ⏱️ Review Time: {thinkRemaining}s
                    <button class="ml-2 text-xs underline opacity-60 hover:opacity-100" on:click={() => thinkRemaining = 0}>Skip</button>
                </div>
            {/if}
        </div>

        <div class="grid lg:grid-cols-[40%_60%] gap-8 mt-4">
            <div class="space-y-4">
                <h2 class="text-lg font-semibold text-slate-800">Orders in {$currLocation}</h2>
                
                {#if localOrders.length > 0}
                    <div class="grid gap-4">
                        {#each localOrders as order, i (order.id)}
                            <Order orderData={order} index={i} updateEarnings={updateEarnings}/>
                        {/each}
                    </div>
                    <div class="bg-white p-4 rounded-2xl border shadow-sm sticky bottom-4">
                        <button id="startorder"
                            class="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            on:click={start}
                            disabled={$orders.length === 0}
                        >
                            {$gameText.selector === "None selected" ? "Select Orders to Start" : $gameText.selector}
                        </button>
                    </div>
                {:else}
                    <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                        <p class="text-slate-500">No active orders in {$currLocation}.</p>
                        <p class="text-red-600 font-bold">Round {$currentRound} orders are in {activeOrderCity}.</p>
                        <p class="text-sm text-slate-400">Please travel to {activeOrderCity} using the map.</p>
                    </div>
                {/if}
            </div>

            <div class="h-[600px] bg-slate-100 rounded-2xl border shadow-sm overflow-hidden relative">
                <div id="map" class="w-full h-full z-0"></div>
                <div class="absolute top-4 right-4 bg-white/90 p-3 rounded-lg shadow text-xs z-[1000] backdrop-blur">
                    <p class="font-bold mb-1">Navigation</p>
                    <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-green-500"></div> You are here</div>
                    {#if activeOrderCity && activeOrderCity !== $currLocation}
                        <div class="flex items-center gap-2 mt-1"><div class="w-3 h-3 rounded-full bg-red-400"></div> Orders here</div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}

</section>
{/if}