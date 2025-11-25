<script>
    import { get } from 'svelte/store';
    import { game, orders, gameText, currLocation, logOrders, orderList, thinkTime, currentRound, getCurrentScenario, roundStartTime, elapsed } from "$lib/bundle.js";
    import { getDistances } from "$lib/config.js";
    import Order from "./order.svelte";
    import { onMount, onDestroy } from "svelte";

    // Experiment Data
    $: scenario = getCurrentScenario($currentRound);
    $: maxBundle = scenario.max_bundle ?? 3;
    $: experimentOrders = scenario.orders;
    
    // REACTIVE: Orders available in current location
    // If we are in the target city, show experiment orders.
    // If we are elsewhere, show generated dummy orders so the UI isn't empty.
    let localOrders = [];
    $: {
        if (experimentOrders.length > 0 && experimentOrders[0].city === $currLocation) {
            localOrders = experimentOrders;
        } else {
            localOrders = generateDummyOrders($currLocation);
        }
    }

    // Helper: Generate dummy orders for non-scenario cities
    function generateDummyOrders(city) {
        const storeNames = {
            "Berkeley": "Berkeley Bowl",
            "Oakland": "Sprouts", 
            "Emeryville": "Target",
            "Piedmont": "Safeway"
        };
        return [
            {
                id: `dummy_${city}_1`, name: "Local Customer A", city: city, store: storeNames[city] || "Local Store",
                earnings: 5, items: { "Apple": 1, "Banana": 2 }, recommended: false
            },
            {
                id: `dummy_${city}_2`, name: "Local Customer B", city: city, store: storeNames[city] || "Local Store",
                earnings: 4, items: { "Watermelon": 1 }, recommended: false
            }
        ];
    }

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

    // Map variables
    let map;
    const API_KEY = 'iMsEUcFHOj2pHKXd7NO0';
    const cityCoords = {
        "Berkeley": [37.8715, -122.2730],
        "Oakland": [37.8044, -122.2712],
        "Emeryville": [37.8313, -122.2852],
        "Piedmont": [37.8238, -122.2316]
    };

    function clearTimers() {
        if (travelTimer) clearInterval(travelTimer);
        if (thinkInterval) clearInterval(thinkInterval);
        if (penaltyInterval) clearInterval(penaltyInterval);
    }

    function start() {
        const selOrders = get(orders)
        
        if (selOrders.length < 1) {
            alert(`Please select at least 1 order.`)
            return;
        }
        if (selOrders.length > maxBundle) {
            alert(`You can only select up to ${maxBundle} orders this round!`)
            return;
        }

        // Validate bundling (same store)
        const firstStore = selOrders[0].store;
        if (!selOrders.every(o => o.store === firstStore)) {
            alert("All bundled orders must be from the same store!");
            return;
        }

        clearTimers();
        // Use selected orders (mixed real/dummy is fine for gameplay, logic handles it)
        logOrders(selOrders, localOrders);
        $game.inStore = true;
        $game.inSelect = false;
    }

    function travel(city) {
        if (city === $currLocation) return;
        
        // Find distance
        let index = distances["destinations"].indexOf(city);
        if (index == -1) {
            console.error(`Cannot travel to ${city} from ${$currLocation}`);
            return;
        }
        
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
        
        // Re-init map if needed or update view (handled by reactive statements usually, but we remount on state change)
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

    function initMap() {
        // Wait for DOM
        if (!document.getElementById('map')) return;

        // Cleanup existing map
        if (map && map.remove) {
            map.remove();
            map = null;
        }

        const currentCoords = cityCoords[$currLocation] || cityCoords["Berkeley"];

        // Initialize Leaflet with MapTiler
        map = L.map('map', {
            center: currentCoords,
            zoom: 12
        });

        // Add MapTiler Vector Layer
        const mtLayer = L.maptilerLayer({
            apiKey: API_KEY,
            style: L.MaptilerStyle.STREETS
        }).addTo(map);

        // Add City Markers
        Object.entries(cityCoords).forEach(([city, coords]) => {
            const isCurrent = city === $currLocation;
            
            const marker = L.circleMarker(coords, {
                color: isCurrent ? '#16a34a' : '#3b82f6',
                fillColor: isCurrent ? '#22c55e' : '#60a5fa',
                fillOpacity: 0.8,
                radius: isCurrent ? 10 : 8
            }).addTo(map);

            marker.bindTooltip(city, { 
                permanent: true, 
                direction: 'top',
                className: 'font-bold text-slate-700' 
            });

            marker.on('click', () => {
                travel(city);
            });
        });
    }

    onMount(() => {
        if ($game.penaltyTriggered) {
            startPenalty();
        } else {
            startThinkingTimer();
        }
        
        roundStartTime.set($elapsed);
        orderList.set(experimentOrders);

        // Delay map init slightly to ensure div is ready
        setTimeout(initMap, 100);
    });

    // Re-init map when penalty/waiting state ends to ensure it renders correctly
    $: if (!waiting && !isPenalty && $game.inSelect) {
        setTimeout(initMap, 100);
    }

    onDestroy(() => {
        clearTimers();
        if (map) map.remove();
    });
</script>

{#if $game.inSelect}
<section class="mx-auto max-w-6xl px-4 py-6 space-y-6">

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
                <p class="text-slate-500">Driving time...</p>
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
                <h1 class="text-2xl font-bold text-slate-900">Round {$currentRound}</h1>
                <p class="text-slate-500">Current Location: <span class="font-bold text-blue-600">{$currLocation}</span></p>
            </div>
            {#if thinking}
                <div class="bg-blue-50 px-4 py-2 rounded-lg text-blue-800 text-sm font-medium border border-blue-100">
                    ⏱️ Review Time: {thinkRemaining}s
                    <button class="ml-2 text-xs underline opacity-60 hover:opacity-100" on:click={() => thinkRemaining = 0}>Skip</button>
                </div>
            {/if}
        </div>

        <div class="grid lg:grid-cols-[1fr,1fr] gap-8 mt-4">
            <div class="space-y-4">
                <h2 class="text-lg font-semibold text-slate-800">Orders in {$currLocation}</h2>
                
                {#if localOrders.length > 0}
                    <div class="grid gap-4">
                        {#each localOrders as order, i (order.id)}
                            <Order orderData={order} index={i} updateEarnings={updateEarnings}/>
                        {/each}
                    </div>
                {:else}
                    <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p class="text-slate-500">No orders available here.</p>
                    </div>
                {/if}

                <div class="bg-slate-50 p-6 rounded-2xl border flex flex-col items-center gap-3 mt-4">
                    <button id="startorder"
                        class="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        on:click={start}
                        disabled={$orders.length === 0}
                    >
                        {$gameText.selector === "None selected" ? "Select Orders to Start" : $gameText.selector}
                    </button>
                </div>
            </div>

            <div class="h-[500px] bg-slate-100 rounded-2xl border shadow-sm overflow-hidden relative">
                <div id="map" class="w-full h-full z-0"></div>
                <div class="absolute bottom-4 left-4 bg-white/90 p-2 rounded shadow text-xs z-[1000] pointer-events-none">
                    Click a city circle to travel
                </div>
            </div>
        </div>
    {/if}

</section>
{/if}