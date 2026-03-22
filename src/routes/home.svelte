<script>
    import { get } from 'svelte/store';
    import { game, orders, gameText, currLocation, orderList, thinkTime, currentRound, getCurrentScenario, roundStartTime, elapsed, gameMode, scenarios, addScenarioTime, setScenarioInProgress, startScenarioPhase, stopScenarioPhase, recordDetailedAction, beginOrderSelectionThinking, stopOrderSelectionThinking, recordOrderSelectionAction } from "$lib/bundle.js";
    import { getDistances, getCityTravelInfo, storeConfig, PENALTY_TIMEOUT } from "$lib/config.js";
    import Order from "./order.svelte";
    import { onMount, onDestroy } from "svelte";

    // --- EXPERIMENT DATA PROCESSING ---
    $: scenario = getCurrentScenario($currentRound);
    $: activeScenarioId = String(scenario?.scenario_id ?? '').trim();
    $: maxBundle = scenario.max_bundle ?? 3;
    $: isTutorialRoundOne = $gameMode === 'tutorial' && $currentRound === 1;
    $: isTutorialRoundTwo = $gameMode === 'tutorial' && $currentRound === 2;
    $: selectorPrompt = isTutorialRoundOne
        ? "Select 1 Order to Start"
        : (isTutorialRoundTwo ? "Select 2+ Orders to Start" : "Select Orders to Start");
    
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

    // 2. Show current round scenario orders directly (no city-based filler filtering)
    $: localOrders = experimentOrders;

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
            items: generatedItems
        };
    }

    // --- STATE ---
    let waiting = false;
    $: distances = getDistances($currLocation);
    let duration = 0;
    let travelProgress = 0;
    let travelingTo = "";
    let travelTimer;
    
    let thinking = false;
    let thinkRemaining = 0;
    let thinkInterval;

    // Penalty Logic (uses PENALTY_TIMEOUT from config.js)
    let isPenalty = false;
    let penaltyRemaining = 0;
    let penaltyInterval;

    // Map Config
    let map;
    let mapInitRetryCount = 0;
    let mapInitRetryTimer;
    const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
    const cityCoords = {
        "Berkeley": [37.8715, -122.2730],
        "Oakland": [37.8044, -122.2712],
        "Emeryville": [37.8313, -122.2852],
        "Piedmont": [37.8238, -122.2316]
    };
    const cityTooltipConfig = {
        "Berkeley": { direction: 'top', offset: [0, -12] },
        "Oakland": { direction: 'left', offset: [-16, 0] },
        "Emeryville": { direction: 'bottom', offset: [0, 12] },
        "Piedmont": { direction: 'right', offset: [16, 0] }
    };

    // --- HELPERS ---
    function stopSelectionPhases() {
        stopScenarioPhase(activeScenarioId, 'thinkingTime');
        stopScenarioPhase(activeScenarioId, 'penaltyTime');
    }

    function clearTimers() {
        if (travelTimer) clearInterval(travelTimer);
        if (thinkInterval) clearInterval(thinkInterval);
        if (penaltyInterval) clearInterval(penaltyInterval);
        travelTimer = null;
        thinkInterval = null;
        penaltyInterval = null;
        stopSelectionPhases();
    }

    function findMissingSelectionRoute(selectedOrders = [], startCity = "") {
        const selectedCities = [...new Set(
            (selectedOrders || [])
                .map((order) => String(order?.city || "").trim())
                .filter(Boolean)
        )];

        for (const destination of selectedCities) {
            const routeInfo = getCityTravelInfo(startCity, destination);
            if (routeInfo.missingRoute) return routeInfo;
        }

        for (const fromCity of selectedCities) {
            for (const destination of selectedCities) {
                if (fromCity === destination) continue;
                const routeInfo = getCityTravelInfo(fromCity, destination);
                if (routeInfo.missingRoute) return routeInfo;
            }
        }

        return null;
    }

    function start() {
        const selOrders = get(orders);
        
        if (selOrders.length < 1) {
            alert(`Please select at least 1 order.`);
            return;
        }
        if (isTutorialRoundOne && selOrders.length !== 1) {
            alert("Round 1 of the tutorial only allows 1 order.");
            return;
        }
        if (isTutorialRoundTwo && selOrders.length < 2) {
            alert("Round 2 of the tutorial requires bundling at least 2 orders.");
            return;
        }
        if (selOrders.length > maxBundle) {
            alert(`You can only select up to ${maxBundle} orders this round!`);
            return;
        }

        // Validate bundling (must be same store)
        const firstStore = selOrders[0].store;
        if (!selOrders.every(o => o.store === firstStore)) {
            recordOrderSelectionAction(activeScenarioId, 'store_mismatch_failed', 'button', 'confirmorder', {
                resumeThinking: true
            });
            alert("All bundled orders must be from the same store!");
            return;
        }

        const firstCity = selOrders[0].city;
        if (!selOrders.every(o => o.city === firstCity)) {
            recordOrderSelectionAction(activeScenarioId, 'city_mismatch_failed', 'button', 'confirmorder', {
                resumeThinking: true
            });
            alert("All bundled orders must be from the same city!");
            return;
        }

        const missingRoute = findMissingSelectionRoute(selOrders, String($currLocation || ""));
        if (missingRoute) {
            alert(`Missing city travel route from ${missingRoute.fromCity} to ${missingRoute.toCity}. Update Admin > Cities before starting this order.`);
            return;
        }

        clearTimers();
        recordOrderSelectionAction(activeScenarioId, 'confirm_order', 'button', 'confirmorder', {
            resumeThinking: false
        });
        $game.inStore = true;
        $game.inSelect = false;
    }

    function travel(city) {
        if (city === $currLocation) return;
        
        // Find travel duration from config
        let index = distances["destinations"].indexOf(city);
        if (index == -1) {
            console.warn("Distance not found for", city);
            duration = 0;
        } else {
            duration = Number(distances["distances"][index]) || 0;
        }
        
        stopOrderSelectionThinking(activeScenarioId);
        clearTimers();
        waiting = true;
        travelingTo = city;
        travelProgress = duration;
        addScenarioTime(activeScenarioId, 'cityTravelTime', duration);

        if (duration <= 0) {
            completeTravel(city);
            return;
        }

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
        beginOrderSelectionThinking(activeScenarioId);
        thinkRemaining = Number($thinkTime) || 0;
        if (thinkRemaining <= 0) {
            thinking = false;
            thinkInterval = null;
            return;
        }
        thinking = true;
        thinkInterval = setInterval(() => {
            thinkRemaining -= 1;
            if (thinkRemaining <= 0) {
                thinking = false;
                clearInterval(thinkInterval);
                thinkInterval = null;
            }
        }, 1000);
    }

    function skipThinking() {
        thinking = false;
        thinkRemaining = 0;
        if (thinkInterval) {
            clearInterval(thinkInterval);
            thinkInterval = null;
        }
    }

    function startPenalty() {
        isPenalty = true;
        penaltyRemaining = PENALTY_TIMEOUT;
        stopOrderSelectionThinking(activeScenarioId);
        clearTimers();
        penaltyInterval = setInterval(() => {
            penaltyRemaining -= 1;
            if (penaltyRemaining <= 0) {
                stopScenarioPhase(activeScenarioId, 'penaltyTime');
                recordDetailedAction(activeScenarioId, 'give_up', 'button', 'giveup', {
                    metadata: {
                        penaltyDuration: PENALTY_TIMEOUT
                    }
                });
                isPenalty = false;
                clearInterval(penaltyInterval);
                penaltyInterval = null;
                game.update((current) => ({
                    ...current,
                    penaltyTriggered: false
                }));
                startThinkingTimer();
            }
        }, 1000);
    }

    function updateEarnings(index, newEarnings) {
        // Helper to update UI if needed
    }

    function isTransientStyleError(error) {
        const msg = String(error?.message || error || "").toLowerCase();
        return msg.includes("style is not done loading");
    }

    function isValidCoords(coords) {
        return Array.isArray(coords)
            && coords.length >= 2
            && Number.isFinite(Number(coords[0]))
            && Number.isFinite(Number(coords[1]));
    }

    function scheduleMapRetry() {
        if (mapInitRetryCount >= 5) return;
        mapInitRetryCount += 1;
        if (mapInitRetryTimer) clearTimeout(mapInitRetryTimer);
        mapInitRetryTimer = setTimeout(initMap, 250 * mapInitRetryCount);
    }

    // --- MAP INIT ---
    function initMap() {
        try {
            if (!document.getElementById('map')) return;
            if (map && map.remove) { map.remove(); map = null; }

            const fallbackCoords = cityCoords["Berkeley"];
            const rawCurrentCoords = cityCoords[$currLocation];
            const currentCoords = isValidCoords(rawCurrentCoords) ? rawCurrentCoords : fallbackCoords;

            map = L.map('map', {
                center: currentCoords,
                zoom: 12,
                zoomControl: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                boxZoom: false,
                keyboard: false,
                touchZoom: false
            });

            L.maptilerLayer({
                apiKey: API_KEY,
                style: L.MaptilerStyle.STREETS
            }).addTo(map);

            Object.entries(cityCoords).forEach(([city, coords]) => {
                if (!isValidCoords(coords)) return;
                const isCurrent = city === $currLocation;
                const hasExpOrders = experimentOrders.some((order) => order.city === city);
                const tooltipConfig = cityTooltipConfig[city] || { direction: 'top', offset: [0, -12] };

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
                    direction: tooltipConfig.direction,
                    offset: tooltipConfig.offset,
                    className: 'font-bold text-slate-700'
                });

                marker.on('click', () => travel(city));
            });

            const validCoords = Object.values(cityCoords).filter(isValidCoords);
            if (validCoords.length > 0) {
                const bounds = L.latLngBounds(validCoords);
                map.fitBounds(bounds, {
                    padding: [56, 56],
                    maxZoom: 13
                });
            }
            map.setMinZoom(map.getZoom());
            map.setMaxZoom(map.getZoom());
            map.invalidateSize();

            mapInitRetryCount = 0;
        } catch (error) {
            if (map && map.remove) { map.remove(); map = null; }
            if (isTransientStyleError(error)) {
                scheduleMapRetry();
                return;
            }
            console.error("Map init failed:", error);
        }
    }

    // --- LIFECYCLE ---
    onMount(() => {
        setScenarioInProgress(activeScenarioId);
        roundStartTime.set($elapsed);

        if ($game.penaltyTriggered) startPenalty();
        else startThinkingTimer();

        // Start selection timing immediately on the first mount so round 1
        // does not depend on a later reactive pass to begin tracking.
        if ($gameMode !== 'tutorial' && $game.inSelect && activeScenarioId) {
            if ($game.penaltyTriggered || isPenalty) {
                startScenarioPhase(activeScenarioId, 'penaltyTime');
            } else {
                startScenarioPhase(activeScenarioId, 'thinkingTime');
            }
        }

        setTimeout(initMap, 200);
    });

    // Re-render map when state changes to selection mode
    $: if (!waiting && !isPenalty && !$game.penaltyTriggered && $game.inSelect) {
        setTimeout(initMap, 200);
    }

    $: if ($gameMode !== 'tutorial' && $game.inSelect && activeScenarioId) {
        if ($game.penaltyTriggered || isPenalty) {
            stopOrderSelectionThinking(activeScenarioId);
            startScenarioPhase(activeScenarioId, 'penaltyTime');
        } else if (!waiting) {
            beginOrderSelectionThinking(activeScenarioId);
            startScenarioPhase(activeScenarioId, 'thinkingTime');
        } else {
            stopOrderSelectionThinking(activeScenarioId);
            stopSelectionPhases();
        }
    } else {
        stopOrderSelectionThinking(activeScenarioId);
        stopSelectionPhases();
    }

    onDestroy(() => {
        clearTimers();
        if (map) map.remove();
        if (mapInitRetryTimer) clearTimeout(mapInitRetryTimer);
    });
</script>

{#if $game.inSelect}
<section class="mx-auto max-w-7xl px-3 pt-0 pb-3 space-y-3">

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
        {#if thinking}
            <div class="flex flex-wrap items-end justify-between gap-2">
                <div class="bg-blue-50 px-3 py-1.5 rounded-lg text-blue-800 text-xs font-medium border border-blue-100">
                    ⏱️ Review Time: {thinkRemaining}s
                    <button class="ml-2 text-xs underline opacity-60 hover:opacity-100" on:click={skipThinking}>Skip</button>
                </div>
            </div>
        {/if}

        <div class="grid lg:grid-cols-[55%_45%] gap-4">
            <div class="space-y-2">
                <h2 class="text-base font-semibold text-slate-800">Available Orders</h2>
                
                <!-- Fixed height grid for 4 orders without scrolling -->
                <div class="grid grid-cols-2 gap-2">
                    {#each localOrders as order, i (order.id)}
                        <Order orderData={order} index={i} updateEarnings={updateEarnings} disabled={thinking}/>
                    {/each}
                </div>

                <div class="bg-slate-50 p-3 rounded-xl border flex flex-col items-center gap-2 sticky bottom-2">
                    <button id="confirmorder"
                        class="w-full bg-green-600 text-white font-bold py-2.5 rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                        on:click={start}
                        disabled={$orders.length === 0 || thinking}
                    >
                        {$gameText.selector === "None selected" ? selectorPrompt : $gameText.selector}
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
