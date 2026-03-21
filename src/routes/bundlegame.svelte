<script>
    import { get } from 'svelte/store';
    import { onMount, onDestroy } from 'svelte';
    import { game, orders, finishedOrders, failedOrders, earned, currLocation, elapsed, uniqueSets, completeOrder, numCols, currentRound, roundStartTime, getCurrentScenario, getOptimalForScenario, saveScenarioProgress, scenarioSetProgress, scenarios, emojisMap, roundTimeLimit, gameMode, endGameSession, notifyTutorialRoundProgress, notifyMainGameComplete, incrementOptimalChoices, saveCurrentProgress, optimalChoices, addScenarioTime, setScenarioInProgress, startScenarioPhase, stopScenarioPhase } from "$lib/bundle.js"
    import { storeConfig, getCityTravelInfo } from "$lib/config.js";
    
    let config = {}; // Will be set properly in onMount()
    let GameState = 0; // 0:Start, 1:Picking, 2:Moving, 3:Success, 4:Error, 5:Delivery
    let curLocation = [0, 0];
    
    let showStoreMap = false; // For store map modal
    
    let bags = [{}, {}, {}];
    let bagInputs = ["", "", ""];
    let wordInput = "";
    
    let dist = 0;
    let correct = false;
    let startTimer = $elapsed;
    let intervalId;
    let startEarnings;
    
    // Aisle movement countdown
    let aisleCountdown = 0;
    let aisleCountdownInterval = null;
    
    // Delivery countdown state
    let deliveryInProgress = false;
    let deliveryCountdown = 0;
    let deliveryCountdownInterval = null;
    let deliveringToCity = "";
    let currentDeliveryTotalTime = 0;
    let roundCompletionInProgress = false;
    let currentDeliveryBreakdown = {
        originCity: "",
        destination: "",
        localTravel: 0,
        crossCity: 0,
        total: 0,
        missingRoute: false
    };
    
    let totalEarnings;
    let curTip = 0;
    $: pickerColumns = Math.max(2, numOrders + 1);
    
    let deliveryLocations = [];
    let currentDeliveryCity = ""; // Tracks where the driver currently is

    // Timer config - now from centralized config
    $: hasRoundTimeLimit = $gameMode !== 'tutorial' && Number.isFinite(Number($roundTimeLimit)) && Number($roundTimeLimit) > 0;
    $: ROUND_TIME_LIMIT = hasRoundTimeLimit ? Number($roundTimeLimit) : null;
    
    $: numOrders = $orders.length;
    $: elapsedTime = $elapsed - startTimer;
    $: countdownTimer = hasRoundTimeLimit ? Math.max(0, ROUND_TIME_LIMIT - elapsedTime) : null;
    $: locationLabel = config["locations"]?.[curLocation[0]]?.[curLocation[1]]?.toLowerCase() || "entrance";
    $: locationRows = Array.isArray(config["locations"]) ? config["locations"] : [];
    $: activeScenario = getCurrentScenario($currentRound);
    $: activeScenarioId = String(activeScenario?.scenario_id ?? '').trim();

    // Auto clear input
    $: if (curLocation) {
        wordInput = "";
        bagInputs = ["", "", ""];
    }

    function updateTip() {
        let tipIndex = Math.floor(elapsedTime / config["tipinterval"])
        let percentIncrease = tipIndex < config["tip"].length ?
        (1 + (config["tip"][tipIndex]/100)) : (config["tip"][config["tip"].length - 1]/100)
        curTip = Math.round(percentIncrease * 100 - 100);
        totalEarnings = Math.round(startEarnings*percentIncrease*100)/100
    }

    const colClassMap = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9' };
    let gridColsClass = colClassMap[numCols] || 'grid-cols-1';

    function getEntrancePosition(nextConfig) {
        const entrance = nextConfig?.Entrance;
        return Array.isArray(entrance) && entrance.length >= 2 ? [...entrance] : [0, 0];
    }

    function getCellValue(rowIndex, colIndex) {
        return String(locationRows?.[rowIndex]?.[colIndex] ?? "");
    }

    function isAtItemAisle(itemName) {
        return String(locationLabel || "").toLowerCase() === String(itemName || "").toLowerCase();
    }

    function stopStorePhases() {
        stopScenarioPhase(activeScenarioId, 'startPickingConfirmationTime');
        stopScenarioPhase(activeScenarioId, 'itemAddToCartTime');
        stopScenarioPhase(activeScenarioId, 'idleOrOtherTime');
    }

    async function persistRoundSnapshot(overrides = {}) {
        if ($gameMode === 'tutorial') return;

        try {
            const progressSnapshot = get(scenarioSetProgress);
            await saveCurrentProgress({
                totalRounds: overrides?.totalRounds ?? get(scenarios).length,
                roundsCompleted: overrides?.roundsCompleted ?? get(uniqueSets),
                optimalChoices: overrides?.optimalChoices ?? get(optimalChoices),
                totalGameTime: overrides?.totalGameTime ?? get(elapsed),
                completedGame: overrides?.completedGame ?? false,
                earnings: overrides?.earnings ?? get(earned),
                scenarioProgress: {
                    ...progressSnapshot,
                    currentRound: overrides?.currentRound ?? get(currentRound),
                    currentLocation: String(overrides?.currentLocation ?? get(currLocation) ?? '').trim(),
                    inProgressScenario: overrides?.inProgressScenario ?? progressSnapshot?.inProgressScenario ?? ''
                }
            });
        } catch (error) {
            console.error("Failed to persist scenario timing summary:", error);
        }
    }

    onMount(() => {
        setScenarioInProgress(activeScenarioId);
        const selOrders = get(orders)
        startEarnings = selOrders.reduce((sum, order) => sum + order.earnings, 0)
        totalEarnings = startEarnings
        config = storeConfig($orders[0].store)
        
        // Safety check for config
        if (!config || !config["Entrance"]) {
            console.error("Invalid store config for:", $orders[0].store);
            config = { Entrance: [0, 0], locations: [[""]], cellDistance: 1000 };
        }
        
        curLocation = getEntrancePosition(config)
        currentDeliveryCity = String(get(currLocation) ?? selOrders[0]?.city ?? "");
        
        if ($game.tip) intervalId = setInterval(updateTip, 1000);
    });

    onDestroy(() => {
        if ($game.tip) clearInterval(intervalId);
        if (aisleCountdownInterval) clearInterval(aisleCountdownInterval);
        if (deliveryCountdownInterval) clearInterval(deliveryCountdownInterval);
        stopStorePhases();
    });

    function handleCell(value, row, col) {
        if (value == "") return;
        
        // Calculate distance and travel time
        dist = Math.abs(row - curLocation[0]) + Math.abs(col - curLocation[1]);
        
        // Safety check: prevent freeze if config is missing or invalid
        if (!config || !config["cellDistance"] || config["cellDistance"] <= 0) {
            console.error("Invalid config or cellDistance:", config);
            curLocation[0] = row;
            curLocation[1] = col;
            return;
        }
        
        curLocation[0] = row;
        curLocation[1] = col;
        GameState = 2;
        
        const travelTime = dist * config["cellDistance"];
        addScenarioTime(activeScenarioId, 'aisleTravelTime', travelTime / 1000);
        
        // Start aisle countdown
        aisleCountdown = travelTime / 1000; // Convert to seconds
        if (aisleCountdownInterval) clearInterval(aisleCountdownInterval);
        aisleCountdownInterval = setInterval(() => {
            aisleCountdown = Math.max(0, aisleCountdown - 0.1);
            if (aisleCountdown <= 0) {
                clearInterval(aisleCountdownInterval);
                aisleCountdownInterval = null;
            }
        }, 100);
        
        setTimeout(() => { GameState = 1; }, travelTime)
    }

    function addBag() {
        let item = getCellValue(curLocation[0], curLocation[1]).toLowerCase()
        
        // Alert if trying to add from entrance or empty location
        if (item == "" || item == "entrance") {
            alert("You must travel to the item first to select it.");
            return;
        }

        let action = { buttonID: "addtobag", itemInput: wordInput, bags: bags.map(b => ({...b})) };
        
        if (wordInput.toLowerCase() != item) {
            alert("Incorrect! You must type the name of the item: " + item)
            action.mistake = "itemtypo"
            wordInput = ""; bagInputs = ["", "", ""];
            return;
        }

        let hasQuantity = false;
        for (let i = 0; i < numOrders; i++) {
            let qty = parseInt(bagInputs[i]);
            if (!isNaN(qty) && qty > 0) {
                hasQuantity = true;
                if (Object.keys(bags[i]).includes(item)) bags[i][item] += qty;
                else bags[i][item] = qty;
                if (bags[i][item] <= 0) delete bags[i][item];
            }
        }

        if (!hasQuantity) {
            alert("Please enter a quantity for at least one order.");
            return;
        }

        bags = [...bags]; // Reactivity trigger
        wordInput = ""; bagInputs = ["", "", ""];
    }

    // Function to remove items from a bag
    function removeFromBag(bagIdx, itemName) {
        if (bags[bagIdx][itemName]) {
            delete bags[bagIdx][itemName];
            bags = [...bags]; // Trigger reactivity
        }
    }

    // Function to decrease quantity of an item
    function decreaseQuantity(bagIdx, itemName) {
        if (bags[bagIdx][itemName]) {
            bags[bagIdx][itemName] -= 1;
            if (bags[bagIdx][itemName] <= 0) {
                delete bags[bagIdx][itemName];
            }
            bags = [...bags]; // Trigger reactivity
        }
    }

    // Function to increase quantity of an item
    function increaseQuantity(bagIdx, itemName) {
        if (!isAtItemAisle(itemName)) return;
        if (bags[bagIdx][itemName]) {
            bags[bagIdx][itemName] += 1;
            bags = [...bags]; // Trigger reactivity
        }
    }

    function start() {
        const selOrders = get(orders);
        startTimer = $elapsed;
        config = storeConfig(selOrders[0].store);
        
        // Safety check and reset location
        if (!config || !config["Entrance"]) {
            console.error("Invalid store config for:", selOrders[0].store);
            config = { Entrance: [0, 0], locations: [[""]], cellDistance: 1000 };
        }
        
        curLocation = getEntrancePosition(config); // Reset to entrance when starting
        GameState = 1;
    }
    
    function retry() { GameState = 1; }

    async function giveUp() {
        if(confirm("Are you sure? Penalty will apply.")) {
            $game.penaltyTriggered = true;
            totalEarnings = 0;
            stopStorePhases();
            logRoundCompletion(false);
            await persistRoundSnapshot({
                currentRound: get(currentRound),
                currentLocation: String(get(currLocation) ?? '').trim()
            });
            exit();
        }
    }
    
    function getDeliveryTravelTime(orderLike) {
        return getDeliveryTimeBreakdown(orderLike).total;
    }

    function getDeliveryTimeBreakdown(orderLike) {
        const destination = String(orderLike?.destination || orderLike?.city || "");
        const localTravel = Math.max(0, Number(orderLike?.localTravelTime) || 0);
        if (!destination) {
            return {
                originCity: String(currentDeliveryCity || ""),
                destination,
                localTravel,
                crossCity: 0,
                total: localTravel,
                missingRoute: false
            };
        }
        // Runtime delivery time is local delivery plus cross-city travel from the player's actual city.
        const originCity = String(currentDeliveryCity || get(currLocation) || "");
        const routeInfo = getCityTravelInfo(originCity, destination);
        const crossCity = routeInfo.seconds;
        return {
            originCity,
            destination,
            localTravel,
            crossCity,
            total: Math.max(0, localTravel + crossCity),
            missingRoute: routeInfo.missingRoute
        };
    }

    function exit() {
        console.log("exit() called - switching back to home");
        console.log("Before: $game.inSelect =", $game.inSelect, "$game.inStore =", $game.inStore);
        
        // Reset local component state for next round
        GameState = 0;
        bags = [{}, {}, {}];
        bagInputs = ["", "", ""];
        wordInput = "";
        dist = 0;
        totalEarnings = 0;
        curTip = 0;
        deliveryLocations = [];
        currentDeliveryBreakdown = {
            originCity: "",
            destination: "",
            localTravel: 0,
            crossCity: 0,
            total: 0,
            missingRoute: false
        };

        // Keep `currLocation` as whatever you last delivered to;
        // Home uses `$currLocation` to decide which city's orders to show,
        // and you already set it in `deliverTo`.

        // Switch back to the selection screen
        game.update(g => {
            g.inSelect = true;
            g.inStore = false;
            return g;
        });
        
        console.log("After: $game.inSelect =", $game.inSelect, "$game.inStore =", $game.inStore);
    }

    async function checkoutOrders() {
        const selOrders = get(orders);
        const numOrders = selOrders.length;
        
        // Efficient validation without permutations - O(n²) instead of O(n!)
        const usedBags = new Set();
        correct = true;
        
        // For each order, try to find a matching bag
        for (let orderIdx = 0; orderIdx < numOrders; orderIdx++) {
            const order = selOrders[orderIdx];
            
            // Normalize order items to lowercase for comparison
            const normalizedOrderItems = {};
            for (const [key, val] of Object.entries(order.items)) {
                normalizedOrderItems[key.toLowerCase()] = val;
            }
            
            let foundMatch = false;
            
            // Try to find an unused bag that matches this order
            for (let bagIdx = 0; bagIdx < numOrders; bagIdx++) {
                if (usedBags.has(bagIdx)) continue; // Skip already used bags
                
                const bag = bags[bagIdx];
                
                // Check if bag matches order
                if (Object.keys(bag).length !== Object.keys(normalizedOrderItems).length) continue;
                
                let bagMatches = true;
                for (const item of Object.keys(bag)) {
                    if (normalizedOrderItems[item] !== bag[item]) {
                        bagMatches = false;
                        break;
                    }
                }
                
                if (bagMatches) {
                    usedBags.add(bagIdx);
                    foundMatch = true;
                    break;
                }
            }
            
            if (!foundMatch) {
                correct = false;
                break;
            }
        }

        if (correct) {
            bags = [{}, {}, {}];
            // Prepare Delivery Data
            // Assuming 'city' is the destination
            currentDeliveryCity = String(get(currLocation) ?? "");
            deliveryLocations = selOrders.map(o => ({
                id: o.id,
                destination: o.city, // Use city field as destination
                name: o.id || o.store || o.city,
                delivered: false,
                localTravelTime: Number(o?.localTravelTime) || 0
            }));
            currentDeliveryBreakdown = {
                originCity: "",
                destination: "",
                localTravel: 0,
                crossCity: 0,
                total: 0,
                missingRoute: false
            };
            
            // Start Delivery Phase
            GameState = 5;
        } else {
            stopStorePhases();
            logRoundCompletion(false);
            GameState = 4;
            await persistRoundSnapshot({
                currentRound: get(currentRound),
                currentLocation: String(get(currLocation) ?? '').trim()
            });
        }
    }

    function deliverTo(idx) {
        console.log("deliverTo called with idx:", idx, "deliveryLocations:", deliveryLocations);
        if (!deliveryLocations.length || deliveryInProgress) {
            console.log("Early return: deliveryLocations.length:", deliveryLocations.length, "deliveryInProgress:", deliveryInProgress);
            return;
        }
        
        const targetLoc = deliveryLocations[idx];
        console.log("targetLoc:", targetLoc);
        if (!targetLoc || targetLoc.delivered) {
            console.log("Early return: targetLoc:", targetLoc, "delivered:", targetLoc?.delivered);
            return;
        }

        const breakdown = getDeliveryTimeBreakdown(targetLoc);
        if (breakdown.missingRoute) {
            alert(`Missing city travel route from ${breakdown.originCity} to ${breakdown.destination}. Update Admin > Cities before delivering this order.`);
            return;
        }
        const travelTime = breakdown.total;
        addScenarioTime(activeScenarioId, 'cityTravelTime', breakdown.crossCity);
        addScenarioTime(activeScenarioId, 'localDeliveryTime', breakdown.localTravel);

        // Start delivery countdown (auto-completes after time)
        deliveryInProgress = true;
        deliveringToCity = targetLoc.destination;
        deliveryCountdown = travelTime;
        currentDeliveryTotalTime = travelTime;
        currentDeliveryBreakdown = breakdown;
        
        if (deliveryCountdownInterval) clearInterval(deliveryCountdownInterval);
        if (travelTime <= 0) {
            completeDelivery(idx, targetLoc);
            return;
        }
        deliveryCountdownInterval = setInterval(() => {
            deliveryCountdown = Math.max(0, deliveryCountdown - 0.1);
            if (deliveryCountdown <= 0) {
                clearInterval(deliveryCountdownInterval);
                deliveryCountdownInterval = null;
                completeDelivery(idx, targetLoc);
            }
        }, 100);
    }
    
    function completeDelivery(idx, targetLoc) {
        // Update State - use reassignment to trigger Svelte reactivity
        targetLoc.delivered = true;
        currentDeliveryCity = targetLoc.destination;
        currLocation.set(targetLoc.destination);
        deliveryInProgress = false;
        deliveringToCity = "";
        currentDeliveryTotalTime = 0;
        currentDeliveryBreakdown = {
            originCity: "",
            destination: "",
            localTravel: 0,
            crossCity: 0,
            total: 0,
            missingRoute: false
        };
        
        // Force array update to trigger reactivity
        deliveryLocations = [...deliveryLocations];
        
        console.log("After delivery update:", deliveryLocations.map(d => ({name: d.name, delivered: d.delivered})));
        
        // Check if all deliveries complete
        const allDelivered = deliveryLocations.every(d => d.delivered);
        console.log("All delivered?", allDelivered, "Count:", deliveryLocations.filter(d => d.delivered).length, "/", deliveryLocations.length);
        
        if (allDelivered) {
            console.log("All deliveries complete! Calling finishSuccess()");
            void finishSuccess();
        }
    }

    async function finishSuccess() {
        if (roundCompletionInProgress) return;
        roundCompletionInProgress = true;
        console.log("finishSuccess() called - completing round");
        
        // 1. Never let logging crash the game
        let completedGame = false;
        try {
            completedGame = logRoundCompletion(true);
        } catch (err) {
            console.error("logRoundCompletion failed", err);
        }

        // 2. Award earnings / mark orders complete
        $earned += totalEarnings;
        $uniqueSets += 1;
        const completedRounds = get(uniqueSets);
        const totalRounds = get(scenarios).length;
        if ($gameMode === 'tutorial') {
            notifyTutorialRoundProgress(completedRounds, totalRounds);
        }
        
        const selOrders = get(orders);
        selOrders.forEach(order => {
            try {
                completeOrder(order.id);          // may talk to Firestore
            } catch (err) {
                console.error("completeOrder failed", err, order);
            }
            $finishedOrders.push(order);
        });
        
        // Clear current round's orders from the selection store
        let len = $orders.length;
        for (let i = 0; i < len; i++) $orders.shift();
        
        // Ensure currLocation persists to next round (already set in deliverTo)
        // The next round's orders will be generated from $currLocation in home.svelte
        
        // 3. Immediately advance to next round (no Round Complete screen)
        if (completedGame) {
            console.log("Final round complete - ending session");
            endGameSession();
            try {
                if ($gameMode !== 'tutorial') {
                    await persistRoundSnapshot({
                        totalRounds,
                        roundsCompleted: completedRounds,
                        totalGameTime: get(elapsed),
                        earnings: get(earned),
                        completedGame: true,
                        currentRound: get(currentRound),
                        currentLocation: String(get(currLocation) ?? '').trim()
                    });
                }
                if ($gameMode !== 'tutorial') {
                    notifyMainGameComplete('all_rounds_complete', completedRounds, totalRounds);
                }
            } finally {
                roundCompletionInProgress = false;
            }
            return;
        }

        const nextRound = get(currentRound);
        const nextLocation = String(get(currLocation) ?? '').trim();

        console.log("Round complete - immediately advancing to next round");
        exit();

        try {
            await persistRoundSnapshot({
            totalRounds,
            roundsCompleted: completedRounds,
            totalGameTime: get(elapsed),
            earnings: get(earned),
            completedGame: false,
                currentRound: nextRound,
                currentLocation: nextLocation
            });
        } finally {
            roundCompletionInProgress = false;
        }
    }

    function logRoundCompletion(success) {
        const scenario = getCurrentScenario($currentRound);
        const scenarioId = String(scenario?.scenario_id ?? scenario?.phase ?? `round_${$currentRound}`).trim();
        const duration = $elapsed - startTimer; // Calculate directly
        const chosenOrderIds = $orders.map(o => o.id);
        const optimal = getOptimalForScenario(scenarioId);
        const chosenSorted = [...chosenOrderIds].map((id) => String(id ?? '').trim()).sort();
        const bestSorted = Array.isArray(optimal?.best_bundle_ids)
            ? optimal.best_bundle_ids.map((id) => String(id ?? '').trim()).sort()
            : [];
        const isOptimalChoice = success
            && bestSorted.length > 0
            && bestSorted.length === chosenSorted.length
            && bestSorted.every((id, index) => id === chosenSorted[index]);
        if (isOptimalChoice) {
            incrementOptimalChoices();
        }
        const totalRounds = get(scenarios).length;
        const completedGame = success && totalRounds > 0 && $currentRound >= totalRounds;
        
        saveScenarioProgress({
            scenarioId,
            roundIndex: $currentRound,
            chosenOrders: chosenOrderIds,
            chosenCount: chosenOrderIds.length,
            isOptimalChoice,
            success,
            duration,
            finalLocation: $currLocation,
            completedGame,
            roundsCompleted: get(uniqueSets) + (success ? 1 : 0),
            optimalChoices: get(optimalChoices),
            earnings: get(earned) + (success ? totalEarnings : 0)
        });

        if (success && !completedGame) currentRound.update(r => r + 1);
        return completedGame;
    }

    $: if ($gameMode !== 'tutorial' && $game.inStore && activeScenarioId) {
        if (GameState === 0) {
            startScenarioPhase(activeScenarioId, 'startPickingConfirmationTime');
        } else if (GameState === 1) {
            startScenarioPhase(activeScenarioId, 'itemAddToCartTime');
        } else if (GameState === 5 && !deliveryInProgress) {
            startScenarioPhase(activeScenarioId, 'idleOrOtherTime');
        } else {
            stopStorePhases();
        }
    } else {
        stopStorePhases();
    }
</script>

<main class="mx-auto max-w-6xl px-4 py-2 space-y-3">
    <div class="flex items-center justify-between bg-white p-2 rounded-xl border shadow-sm">
        <div>
            <h1 class="text-base font-bold text-slate-800">{$orders[0].store}</h1>
            <p class="text-xs text-slate-500">Aisle: {locationLabel}</p>
        </div>
        <div class="text-right">
             <div class="text-lg font-bold text-green-600">${totalEarnings}</div>
             <div class="text-xs text-slate-400 font-mono {hasRoundTimeLimit && countdownTimer < 60 ? 'text-red-500 font-bold' : ''}">
                 {#if hasRoundTimeLimit}
                    ⏱️ {Math.floor(countdownTimer / 60)}:{(countdownTimer % 60).toString().padStart(2, '0')}
                 {:else}
                    ⏱️ No time limit
                 {/if}
             </div>
        </div>
    </div>

    {#if GameState == 0}
        <div class="text-center py-8">
            <button class="bg-green-600 text-white px-6 py-3 rounded-full text-base font-bold shadow-lg hover:bg-green-700 transition" 
                on:click={start}>
                Start Picking ({numOrders} Orders)
            </button>
        </div>
        
    {:else if GameState == 1}
        <div class="space-y-4">
            <div
                class="grid gap-3"
                style={`grid-template-columns: repeat(${pickerColumns}, minmax(0, 1fr));`}
            >
                    <div class="min-w-0 bg-white p-3 rounded-xl border shadow-sm space-y-2">
                        <label class="block text-xs font-bold text-slate-700 uppercase">Item to Be Picked</label>
                        <input class="w-full text-base border-2 border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none" 
                            bind:value={wordInput} placeholder="Type item name..."/>
                        <button class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg shadow hover:bg-blue-700 transition text-sm"
                            on:click={addBag}>Add to Selected Bags</button>
                    </div>

                    {#each $orders as order, idx}
                        <div class="min-w-0 bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                            <div class="flex justify-between items-start">
                                <div class="min-w-0">
                                    <h3 class="font-bold text-slate-800 text-sm">Order {idx+1}: {order.id || `#${idx + 1}`}</h3>
                                    <p class="text-[10px] text-slate-500 truncate">📍 Deliver to: {order.city}</p>
                                    <p class="text-[10px] text-slate-400 truncate">
                                        modeled base {Math.round(Number(order.estimatedTime) || 0)}s · local delivery {Math.round(Number(order.localTravelTime) || 0)}s
                                    </p>
                                </div>
                                <div class="flex flex-col items-end">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                                    <input type="number" min="0" class="w-14 text-center font-bold border rounded p-1 text-sm" bind:value={bagInputs[idx]} placeholder="0"/>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-1 text-xs">
                                <div class="bg-white p-1.5 rounded border">
                                    <p class="font-semibold text-slate-500 text-[10px]">Shopping List</p>
                                    {#each Object.entries(order.items) as [item, qty]}
                                        <div class="flex justify-between gap-1"><span class="truncate">{item.toLowerCase()}</span><span class="shrink-0">x{qty}</span></div>
                                    {/each}
                                </div>
                                <div class="bg-blue-50 p-1.5 rounded border border-blue-100">
                                    <p class="font-semibold text-blue-600 text-[10px]">In Bag</p>
                                    {#each Object.entries(bags[idx]) as [item, qty]}
                                        <div class="flex justify-between items-center gap-1">
                                            <span class="truncate">{item}</span>
                                            <div class="flex items-center gap-0.5">
                                                <button class="w-4 h-4 bg-slate-200 rounded text-[10px] hover:bg-slate-300" 
                                                    on:click|stopPropagation={() => decreaseQuantity(idx, item)}>-</button>
                                                <span class="min-w-[16px] text-center">{qty}</span>
                                                <button
                                                    class={`w-4 h-4 rounded text-[10px] ${
                                                        isAtItemAisle(item)
                                                            ? "bg-slate-200 hover:bg-slate-300"
                                                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    }`}
                                                    disabled={!isAtItemAisle(item)}
                                                    title={isAtItemAisle(item) ? "Add one more" : `Go to the ${item} aisle to add more`}
                                                    on:click|stopPropagation={() => increaseQuantity(idx, item)}
                                                >+</button>
                                                <button class="w-4 h-4 bg-red-100 text-red-600 rounded text-[10px] hover:bg-red-200 ml-0.5" 
                                                    on:click|stopPropagation={() => removeFromBag(idx, item)}>×</button>
                                            </div>
                                        </div>
                                    {/each}
                                    {#if Object.keys(bags[idx]).length === 0}
                                        <p class="text-slate-400 text-[10px] italic">Empty</p>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
            </div>

            <div class="space-y-3">
                 <div class="space-y-1.5">
                    {#each locationRows as row, rowIndex}
                        <div
                            class="grid gap-1.5"
                            style={`grid-template-columns: repeat(${Math.max(1, row.length)}, minmax(0, 1fr));`}
                        >
                            {#each row as cell, colIndex}
                                <button class="flex min-h-[60px] flex-col items-center justify-center rounded-lg text-xs font-medium transition
                                    {rowIndex === curLocation[0] && colIndex === curLocation[1] ? 'bg-green-100 border-2 border-green-500 text-green-900 shadow-sm' : 'border border-slate-200 bg-white hover:bg-slate-50'}"
                                    on:click={() => handleCell(cell, rowIndex, colIndex)}>
                                    <span>{cell.toLowerCase()}</span>{#if $emojisMap[cell]}<span class="text-xl mt-0.5">{$emojisMap[cell]}</span>{/if}
                                </button>
                            {/each}
                        </div>
                    {/each}
                </div>
                <div class="flex justify-between pt-2 border-t">
                    {#if $gameMode !== 'tutorial'}
                    <button class="text-red-500 font-bold text-sm" on:click={giveUp}>Give Up</button>
                    {/if}
                    <button class="bg-green-600 text-white px-5 py-2 rounded-full font-bold shadow text-sm" on:click={checkoutOrders}>Checkout & Deliver</button>
                </div>
            </div>
        </div>

    {:else if GameState == 5}
        <div class="bg-white rounded-xl shadow-lg border overflow-hidden">
            <div class="bg-slate-800 p-3 text-white flex justify-between items-center">
                <h2 class="text-base font-bold">🚚 Deliver Orders</h2>
                <span class="text-xs bg-slate-700 px-2 py-1 rounded">📍 Current: {currentDeliveryCity}</span>
            </div>
            
            <!-- Delivery Countdown Overlay -->
            {#if deliveryInProgress}
                <div class="p-6 bg-blue-50 border-b text-center">
                    <div class="animate-bounce text-4xl mb-2">🚗</div>
                    <h3 class="font-bold text-lg text-slate-800">Driving to {deliveringToCity}...</h3>
                    <div class="text-4xl font-mono font-bold text-blue-600 tabular-nums mt-2">
                        {deliveryCountdown.toFixed(1)}s
                    </div>
                    <p class="mt-2 text-xs text-slate-600">
                        local {Math.round(currentDeliveryBreakdown.localTravel)}s
                        {#if currentDeliveryBreakdown.crossCity > 0}
                            {" "}+ city {Math.round(currentDeliveryBreakdown.crossCity)}s from {currentDeliveryBreakdown.originCity}
                        {/if}
                    </p>
                    <div class="w-48 h-2 bg-slate-200 rounded-full mt-3 mx-auto overflow-hidden">
                        <div class="h-full bg-blue-500 transition-all duration-100 rounded-full"
                             style="width: {(deliveryCountdown / Math.max(currentDeliveryTotalTime, 0.1)) * 100}%"></div>
                    </div>
                </div>
            {:else}
                <!-- Delivery List with Distance/Time Info -->
                <div class="p-3 bg-slate-50 border-b">
                    <p class="text-xs font-semibold text-slate-600 mb-2">Deliveries Remaining:</p>
                    <div class="grid gap-2">
                        {#each deliveryLocations as loc, idx}
                            {@const breakdown = getDeliveryTimeBreakdown(loc)}
                            {@const travelTime = breakdown.total}
                            <div class="flex items-center justify-between bg-white p-2 rounded-lg border text-sm
                                {loc.delivered ? 'opacity-50' : ''}">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg">{loc.delivered ? '✅' : '📦'}</span>
                                    <div>
                                        <p class="font-medium text-slate-800">{loc.name}</p>
                                        <p class="text-xs text-slate-500">📍 {loc.destination}</p>
                                        <p class="text-[11px] text-slate-400">
                                            local {Math.round(breakdown.localTravel)}s{breakdown.crossCity > 0 ? ` + city ${Math.round(breakdown.crossCity)}s` : ''}
                                        </p>
                                        {#if breakdown.missingRoute}
                                            <p class="text-[11px] text-amber-700">
                                                Missing route: {breakdown.originCity} to {breakdown.destination}
                                            </p>
                                        {/if}
                                    </div>
                                </div>
                                <div class="text-right">
                                    {#if !loc.delivered}
                                        <p class="text-xs text-slate-600">🚗 {travelTime}s delivery time</p>
                                        <button class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={breakdown.missingRoute}
                                            on:click={() => deliverTo(idx)}>
                                            Deliver
                                        </button>
                                    {:else}
                                        <span class="text-xs text-green-600 font-medium">Delivered ✓</span>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
            <div class="p-3">
                <div class="text-center text-xs text-slate-500">
                    Delivery time uses local delivery time plus city travel from your current city. Your location updates after each delivery.
                </div>
            </div>
        </div>


    {:else if GameState == 4}
        <div class="rounded-xl bg-red-50 border border-red-200 p-6 text-center space-y-4 max-w-lg mx-auto">
            <div class="text-5xl">⚠️</div>
            <h2 class="text-xl font-bold text-red-900">Incorrect Items</h2>
            <button class="w-full bg-red-600 text-white font-bold py-2.5 rounded-xl shadow text-sm" on:click={retry}>Try Again</button>
        </div>
    {:else if GameState == 2}
        <div class="flex flex-col items-center justify-center h-48 space-y-3">
            <div class="animate-bounce text-3xl">🚶</div>
            <h2 class="font-bold text-lg">Moving to aisle...</h2>
            <div class="text-slate-500">
                <div class="text-4xl font-mono font-bold text-blue-600 tabular-nums">
                    {aisleCountdown.toFixed(1)}s
                </div>
                <div class="w-32 h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div class="h-full bg-blue-500 transition-all duration-100 rounded-full"
                         style="width: {(aisleCountdown / (dist * config['cellDistance'] / 1000)) * 100}%"></div>
                </div>
                <p class="text-xs mt-2">({dist} {dist === 1 ? 'aisle' : 'aisles'})</p>
            </div>
        </div>
    {/if}
    
    <!-- Store Map Modal -->
    {#if showStoreMap}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
             on:click={() => showStoreMap = false}>
            <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-4"
                 on:click|stopPropagation>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-bold text-slate-800">📍 Store Layout: {$orders[0].store}</h2>
                    <button class="text-slate-400 hover:text-slate-600 text-2xl" on:click={() => showStoreMap = false}>&times;</button>
                </div>
                <div class="space-y-1.5">
                    {#each locationRows as row, rowIndex}
                        <div
                            class="grid gap-1.5"
                            style={`grid-template-columns: repeat(${Math.max(1, row.length)}, minmax(0, 1fr));`}
                        >
                            {#each row as cell, colIndex}
                                <div class="flex min-h-[50px] flex-col items-center justify-center rounded-lg text-xs font-medium border
                                    {rowIndex === curLocation[0] && colIndex === curLocation[1] ? 'bg-green-100 border-2 border-green-500 text-green-900' : 'border-slate-200 bg-slate-50'}">
                                    <span class="font-bold">{cell.toLowerCase()}</span>
                                    {#if $emojisMap[cell]}<span class="text-lg mt-0.5">{$emojisMap[cell]}</span>{/if}
                                </div>
                            {/each}
                        </div>
                    {/each}
                </div>
                <p class="text-center text-xs text-slate-500 mt-3">Your current location is highlighted in green</p>
            </div>
        </div>
    {/if}
</main>
