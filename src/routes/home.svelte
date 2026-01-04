<script>
    import { get } from 'svelte/store';
    import { game, orders, gameText, currLocation, logOrders, orderList, thinkTime, currentRound, getCurrentScenario, roundStartTime, elapsed } from "$lib/bundle.js";
    import { getDistances, storeConfig, PENALTY_TIMEOUT } from "$lib/config.js";
    import Order from "./order.svelte";
    import { onMount, onDestroy } from "svelte";

    // --- EXPERIMENT DATA PROCESSING ---
    $: scenario = getCurrentScenario($currentRound);
    $: maxBundle = scenario.max_bundle ?? 3;
    
    // Cache for hydrated orders to prevent infinite reactive loops
    let hydratedOrdersCache = new Map();
    
    // 1. Get Experiment Orders (and fix missing 'items' - CRITICAL FIX for Emeryville freeze)
    $: experimentOrders = (scenario.orders || []).map(order => {
        // Use cache to prevent regenerating random items
        if (!hydratedOrdersCache.has(order.id)) {
            hydratedOrdersCache.set(order.id, hydrateOrder(order));
        }
        return hydratedOrdersCache.get(order.id);
    });

    // 2. Generate Orders for ALL cities (4 orders per city)
    let cityOrderMap = {};
    let lastRound = -1; // Track round to only regenerate when needed
    
    // Reactive block to regenerate orders when round changes
    $: {
        // Only regenerate if round actually changed
        if ($currentRound !== lastRound) {
            lastRound = $currentRound;
            
            const cities = ["Berkeley", "Oakland", "Emeryville", "Piedmont"];
            let map = {};
            
            // Identify the "Active" city for this round
            const activeCity = experimentOrders.length > 0 ? experimentOrders[0].city : "Berkeley";

            cities.forEach(city => {
                if (city === activeCity) {
                    // Use specific experiment data for the active city
                    map[city] = experimentOrders;
                } else {
                    // Generate consistent filler data for other cities
                    map[city] = generateFillerOrders(city, $currentRound);
                }
            });
            cityOrderMap = map;
        }
    }

    // 3. Display orders for CURRENT location
    $: localOrders = cityOrderMap[$currLocation] || [];
    
    // Detect where the experiment orders actually are
    $: activeOrderCity = experimentOrders.length > 0 ? experimentOrders[0].city : "";

    // --- HELPER: Hydrate Orders (Fixes Freeze caused by missing items) ---
    function hydrateOrder(order) {
        // If items already exist, keep them
        if (order.items && Object.keys(order.items).length > 0) return order;

        // Generate items from store config or fallback
        const config = storeConfig(order.store);
        let generatedItems = {};
        
        if (config && config.items && config.items.length > 0) {
            // Use deterministic selection based on order ID to prevent random changes
            const seed = order.id ? order.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
            const count = 1 + (seed % 3);
            
            for (let i = 0; i < count; i++) {
                const itemIndex = (seed + i * 7) % config.items.length;
                const item = config.items[itemIndex];
                const quantity = 1 + ((seed + i) % 2);
                generatedItems[item] = quantity;
            }
        } else {
            // Fallback items if config is missing
            generatedItems = { "Apple": 1, "Banana": 2 };
        }

        return {
            ...order,
            items: generatedItems,
            name: order.name || `Customer ${order.id}`
        };
    }

    // --- HELPER: Generate Filler Orders for non-active cities ---
    function generateFillerOrders(city, round) {
        const storeNames = {
            "Berkeley": "Berkeley Bowl",
            "Oakland": "Sprouts Farmers Market", 
            "Emeryville": "Target",
            "Piedmont": "Safeway"
        };
        
        // Use seeded random based on city and round for consistency
        const seed = (city.charCodeAt(0) + round * 1000);
        
        let fillers = [];
        for (let i = 1; i <= 4; i++) {
            // Deterministic earnings based on seed
            const earnings = 8 + ((seed + i * 7) % 13);
            
            fillers.push({
                id: `fill_${round}_${city}_${i}`,
                store: storeNames[city],
                city: city,
                earnings: earnings,
                items: { "Apple": 1, "Watermelon": 1 },
                recommended: false,
                name: `Local Order ${i}`
            });
        }
        return fillers;
    }

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

    // Penalty Logic (uses PENALTY_TIMEOUT from config.js)
    let isPenalty = false;
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
        // Log the selected orders against all available orders
        logOrders(selOrders, localOrders);
        $game.inStore = true;
        $game.inSelect = false;
    }

    function travel(city) {
        if (city === $currLocation) return;
        
        // Find travel duration from config
        let index = distances["destinations"].indexOf(city);
        if (index == -1) {
            console.warn("Distance not found for", city);
            duration = 5; // fallback
        } else {
            duration = distances["distances"][index] || 5;
        }
        
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
        clearInterval(travelTimer);
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
        penaltyRemaining = PENALTY_TIMEOUT;
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
        // Helper to update UI if needed
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
            const hasExpOrders = experimentOrders.length > 0 && experimentOrders[0].city === city;

            const marker = L.circleMarker(coords, {
                color: isCurrent ? '#16a34a' : (hasExpOrders ? '#ef4444' : '#3b82f6'),
                fillColor: isCurrent ? '#22c55e' : (hasExpOrders ? '#f87171' : '#60a5fa'),
                fillOpacity: 0.8,
                radius: 10
            }).addTo(map);

            let label = city;
            if (isCurrent) label += " (You)";

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

        setTimeout(initMap, 200);
    });

    // Re-render map when state changes to selection mode
    $: if (!waiting && !isPenalty && $game.inSelect) {
        setTimeout(initMap, 200);
    }

    onDestroy(() => {
        clearTimers();
        if (map) map.remove();
    });
</script>

{#if $game.inSelect}
<section class="mx-auto max-w-7xl px-3 py-3 space-y-3">

    {#if isPenalty}
        <div class="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center space-y-3 shadow-lg">
            <h2 class="text-xl font-bold text-red-800">Penalty Timeout</h2>
            <p class="text-red-600 text-sm">You gave up the previous round.</p>
            <div class="text-3xl font-mono font-bold text-red-900">{penaltyRemaining}s</div>
        </div>

    {:else if waiting}
        <div class="bg-white rounded-xl shadow-xl border p-6 text-center space-y-4">
            <div class="animate-spin text-3xl text-blue-600 mx-auto w-min">⚙️</div>
            <div>
                <h2 class="text-xl font-bold text-slate-800">Traveling to {travelingTo}</h2>
                <p class="text-slate-500 text-sm">Driving...</p>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden max-w-md mx-auto">
                <div class="bg-blue-600 h-full transition-all duration-1000 ease-linear" 
                     style="width: {((duration - travelProgress) / duration) * 100}%"></div>
            </div>
            <p class="font-mono text-slate-400 text-sm">{travelProgress}s remaining</p>
        </div>

    {:else}
        <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
                <h1 class="text-xl font-bold text-slate-900">Round {$currentRound} / 50</h1>
                <p class="text-sm text-slate-500">Current Location: <span class="font-bold text-blue-600">{$currLocation}</span></p>
            </div>
            {#if thinking}
                <div class="bg-blue-50 px-3 py-1.5 rounded-lg text-blue-800 text-xs font-medium border border-blue-100">
                    ⏱️ Review Time: {thinkRemaining}s
                    <button class="ml-2 text-xs underline opacity-60 hover:opacity-100" on:click={() => thinkRemaining = 0}>Skip</button>
                </div>
            {/if}
        </div>

        <div class="grid lg:grid-cols-[55%_45%] gap-4 mt-2">
            <div class="space-y-2">
                <h2 class="text-base font-semibold text-slate-800">Orders in {$currLocation}</h2>
                
                <!-- Fixed height grid for 4 orders without scrolling -->
                <div class="grid grid-cols-2 gap-2">
                    {#each localOrders as order, i (order.id)}
                        <Order orderData={order} index={i} updateEarnings={updateEarnings}/>
                    {/each}
                </div>

                <div class="bg-slate-50 p-3 rounded-xl border flex flex-col items-center gap-2 sticky bottom-2">
                    <button id="startorder"
                        class="w-full bg-green-600 text-white font-bold py-2.5 rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                        on:click={start}
                        disabled={$orders.length === 0}
                    >
                        {$gameText.selector === "None selected" ? "Select Orders to Start" : $gameText.selector}
                    </button>
                </div>
            </div>

            <div class="h-[400px] bg-slate-100 rounded-xl border shadow-sm overflow-hidden relative">
                <div id="map" class="w-full h-full z-0"></div>
            </div>
        </div>
    {/if}

</section>
{/if}