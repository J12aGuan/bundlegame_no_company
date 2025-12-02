<script>
    import { get } from 'svelte/store';
    import { onMount, onDestroy } from 'svelte';
    import { game, orders, finishedOrders, failedOrders, earned, currLocation, elapsed, uniqueSets, completeOrder, logAction, numCols, currentRound, roundStartTime, getCurrentScenario } from "$lib/bundle.js"
    import { storeConfig, getDistances } from "$lib/config.js"; // Import getDistances
    import emojis from "$lib/emojis.json"
    
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
    let totalEarnings;
    let curTip = 0;
    
    // DELIVERY STATE
    let deliveryMap;
    let deliveryLocations = [];
    let currentDeliveryCity = ""; // Tracks where the driver currently is
    const API_KEY = 'iMsEUcFHOj2pHKXd7NO0';
    const cityCoords = {
        "Berkeley": [37.8715, -122.2730],
        "Oakland": [37.8044, -122.2712],
        "Emeryville": [37.8313, -122.2852],
        "Piedmont": [37.8238, -122.2316]
    };

    $: numOrders = $orders.length;
    $: endTimer = $elapsed - startTimer;
    $: locationLabel = config["locations"]?.[curLocation[0]]?.[curLocation[1]] || "Entrance";

    // Auto clear input
    $: if (curLocation) {
        wordInput = "";
        bagInputs = ["", "", ""];
    }

    function updateTip() {
        let tipIndex = Math.floor(endTimer / config["tipinterval"])
        let percentIncrease = tipIndex < config["tip"].length ?
        (1 + (config["tip"][tipIndex]/100)) : (config["tip"][config["tip"].length - 1]/100)
        curTip = Math.round(percentIncrease * 100 - 100);
        totalEarnings = Math.round(startEarnings*percentIncrease*100)/100
    }

    const colClassMap = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9' };
    let gridColsClass = colClassMap[numCols] || 'grid-cols-1';

    onMount(() => {
        const selOrders = get(orders)
        startEarnings = selOrders.reduce((sum, order) => sum + order.earnings, 0)
        totalEarnings = startEarnings
        config = storeConfig($orders[0].store)
        
        // Safety check for config
        if (!config || !config["Entrance"]) {
            console.error("Invalid store config for:", $orders[0].store);
            config = { Entrance: [0, 0], locations: [[""]], cellDistance: 1000 };
        }
        
        curLocation = config["Entrance"]
        currentDeliveryCity = selOrders[0].city; // Start delivery from Store City
        
        if ($game.tip) intervalId = setInterval(updateTip, 1000);
    });

    onDestroy(() => {
        if ($game.tip) clearInterval(intervalId);
        if (deliveryMap) deliveryMap.remove();
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
        setTimeout(() => { GameState = 1; }, travelTime)
    }

    function addBag() {
        let item = config["locations"][curLocation[0]][curLocation[1]].toLowerCase()
        
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
            logAction(action)
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
        logAction(action)
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
        
        curLocation = config["Entrance"]; // Reset to entrance when starting
        GameState = 1;
    }
    
    function retry() { GameState = 1; }

    function giveUp() {
        if(confirm("Are you sure? Penalty will apply.")) {
            $game.penaltyTriggered = true;
            totalEarnings = 0;
            logRoundCompletion(false);
            exit();
        }
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

        // Make sure delivery map is fully torn down
        if (deliveryMap) {
            try {
                deliveryMap.remove();
            } catch (err) {
                console.error("Failed to remove delivery map", err);
            }
            deliveryMap = null;
        }

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

    function checkoutOrders() {
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
            deliveryLocations = selOrders.map(o => ({
                id: o.id,
                destination: o.city, // Use city field as destination
                name: o.name,
                delivered: false
            }));
            
            // Start Delivery Phase
            GameState = 5;
            setTimeout(initDeliveryMap, 100);
        } else {
            logRoundCompletion(false);
            GameState = 4;
        }
    }

    function initDeliveryMap() {
        if (deliveryMap) deliveryMap.remove();
        
        deliveryMap = L.map('delivery-map', {
            center: [37.84, -122.25],
            zoom: 11
        });

        L.maptilerLayer({
            apiKey: API_KEY,
            style: L.MaptilerStyle.STREETS
        }).addTo(deliveryMap);

        // Add User Marker (Truck)
        const truckIcon = L.divIcon({
            html: '🚚',
            className: 'text-2xl',
            iconSize: [30, 30]
        });
        
        // Add Destination Markers with Travel Times
        deliveryLocations.forEach((loc, idx) => {
            const coords = cityCoords[loc.destination] || cityCoords["Berkeley"];
            
            // Calculate travel time from current location to this destination
            const distData = getDistances(currentDeliveryCity);
            let travelTime = 0;
            if (currentDeliveryCity !== loc.destination) {
                const destIndex = distData.destinations.indexOf(loc.destination);
                if (destIndex !== -1) {
                    travelTime = distData.distances[destIndex];
                } else {
                    travelTime = 2;
                }
            } else {
                travelTime = 2;
            }
            
            const marker = L.marker(coords).addTo(deliveryMap);
            
            // Create popup content with a unique button ID
            const buttonId = `deliver-btn-${idx}`;
            marker.bindPopup(`
                <div class="text-center">
                    <b>${loc.name}</b><br>${loc.destination}<br>
                    <div style="font-size:12px;color:#666;margin:4px 0;">Travel Time: ${travelTime}s</div>
                    <button id="${buttonId}" 
                        style="background:#16a34a;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;margin-top:6px;font-weight:bold;">
                        Deliver Here
                    </button>
                </div>
            `);
            
            // Attach click handler after popup opens
            marker.on('popupopen', () => {
                const btn = document.getElementById(buttonId);
                if (btn) {
                    btn.onclick = () => {
                        console.log("Button clicked for idx:", idx);
                        deliverTo(idx);
                    };
                }
            });
        });
    }

    function deliverTo(idx) {
        console.log("deliverTo called with idx:", idx, "deliveryLocations:", deliveryLocations);
        if (!deliveryMap || !deliveryLocations.length) {
            console.log("Early return: deliveryMap:", deliveryMap, "deliveryLocations.length:", deliveryLocations.length);
            return;
        }
        
        const targetLoc = deliveryLocations[idx];
        console.log("targetLoc:", targetLoc);
        if (!targetLoc || targetLoc.delivered) {
            console.log("Early return: targetLoc:", targetLoc, "delivered:", targetLoc?.delivered);
            return;
        }

        // Calculate Travel Time from Current City -> Target City
        const distData = getDistances(currentDeliveryCity);
        let travelTime = 0;
        
        if (currentDeliveryCity !== targetLoc.destination) {
            const destIndex = distData.destinations.indexOf(targetLoc.destination);
            if (destIndex !== -1) {
                travelTime = distData.distances[destIndex];
            } else {
                travelTime = 2; // Fallback for same city
            }
        } else {
            travelTime = 2; // Intra-city travel
        }
        
        alert(`Driving to ${targetLoc.destination}...\nTravel Time: ${travelTime}s`);
        
        // Update State
        targetLoc.delivered = true;
        currentDeliveryCity = targetLoc.destination;
        currLocation.set(targetLoc.destination); // Update global location for next round start
        
        // Safely close popup
        if (deliveryMap && deliveryMap.closePopup) {
            try {
                deliveryMap.closePopup();
            } catch (err) {
                console.error("Failed to close popup", err);
            }
        }
        
        // Check if all deliveries complete
        if (deliveryLocations.every(d => d.delivered)) {
            finishSuccess();
        }
    }

    function finishSuccess() {
        // 1. Never let logging crash the game
        try {
            logRoundCompletion(true);
        } catch (err) {
            console.error("logRoundCompletion failed", err);
        }

        // 2. Award earnings / mark orders complete
        $earned += totalEarnings;
        $uniqueSets += 1;
        
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
        
        // 3. Show Round Complete
        GameState = 3;

        // 4. Safety net: auto-advance if button never works
        setTimeout(() => {
            // Only auto-exit if the user hasn't already left
            if (GameState === 3) {
                console.log("Auto-advancing from Round Complete screen");
                exit();
            }
        }, 2000);  // 2 second delay to show success screen
    }

    function logRoundCompletion(success) {
        const scenario = getCurrentScenario($currentRound);
        const duration = $elapsed - $roundStartTime;
        const chosenOrderIds = $orders.map(o => o.id);
        const recommendedOrderIds = scenario.orders.filter(o => o.recommended).map(o => o.id);
        
        logAction({
            type: "round_summary",
            round_index: $currentRound,
            phase: scenario.phase,
            chosen_orders: chosenOrderIds,
            recommended_orders: recommendedOrderIds,  // Include for analysis
            success: success,
            earnings: success ? totalEarnings : 0,
            final_location: $currLocation,
            duration: duration
        });

        if (success) currentRound.update(r => r + 1);
    }
</script>

<main class="mx-auto max-w-6xl px-4 py-4 space-y-4">
    <div class="flex items-center justify-between bg-white p-3 rounded-xl border shadow-sm">
        <div>
            <h1 class="text-lg font-bold text-slate-800">{$orders[0].store}</h1>
            <p class="text-sm text-slate-500">Aisle: {locationLabel}</p>
        </div>
        <div class="text-right">
             <div class="text-xl font-bold text-green-600">${totalEarnings}</div>
             <div class="text-xs text-slate-400">Time: {endTimer}s</div>
        </div>
    </div>

    {#if GameState == 0}
        <div class="text-center py-12">
            <button class="bg-green-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:bg-green-700 transition" 
                on:click={start}>
                Start Picking ({numOrders} Orders)
            </button>
        </div>
        
    {:else if GameState == 1}
        <div class="grid lg:grid-cols-[1fr,2fr] gap-6">
            <div class="space-y-4">
                <div class="bg-white p-4 rounded-xl border shadow-sm space-y-3 sticky top-4 z-10">
                    <label class="block text-xs font-bold text-slate-700 uppercase">1. Identify Item</label>
                    <input class="w-full text-lg border-2 border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none" 
                        bind:value={wordInput} placeholder="Item name..."/>
                    <button class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow hover:bg-blue-700 transition"
                        on:click={addBag}>Add to Selected Bags</button>
                    <button class="w-full bg-slate-500 text-white font-bold py-2 rounded-lg shadow hover:bg-slate-600 transition text-sm"
                        on:click={() => showStoreMap = true}>📍 Show Store Map</button>
                </div>
                
                {#each $orders as order, idx}
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                        <div class="flex justify-between items-start">
                            <div><h3 class="font-bold text-slate-800">Order {idx+1}: {order.name}</h3></div>
                            <div class="flex flex-col items-end">
                                <label class="text-[10px] font-bold text-slate-500 uppercase">Qty Add</label>
                                <input type="number" min="0" class="w-16 text-center font-bold border rounded p-1" bind:value={bagInputs[idx]} placeholder="0"/>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="bg-white p-2 rounded border">
                                <p class="font-semibold text-slate-500">List</p>
                                {#each Object.entries(order.items) as [item, qty]}<div class="flex justify-between"><span>{item}</span><span>x{qty}</span></div>{/each}
                            </div>
                            <div class="bg-blue-50 p-2 rounded border border-blue-100">
                                <p class="font-semibold text-blue-600">Bag</p>
                                {#each Object.entries(bags[idx]) as [item, qty]}<div class="flex justify-between"><span>{item}</span><span>x{qty}</span></div>{/each}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <div class="space-y-4">
                 <div class={`grid gap-2 ${gridColsClass}`}>
                    {#each config["locations"] as row, rowIndex}
                        {#each row as cell, colIndex}
                            <button class="flex min-h-[80px] flex-col items-center justify-center rounded-xl text-sm font-medium transition
                                {rowIndex === curLocation[0] && colIndex === curLocation[1] ? 'bg-green-100 border-2 border-green-500 text-green-900 transform scale-105' : 'border border-slate-200 bg-white hover:bg-slate-50'}"
                                on:click={() => handleCell(cell, rowIndex, colIndex)}>
                                <span>{cell}</span>{#if emojis[cell]}<span class="text-2xl mt-1">{emojis[cell]}</span>{/if}
                            </button>
                        {/each}
                    {/each}
                </div>
                <div class="flex justify-between pt-4 border-t">
                    <button class="text-red-500 font-bold" on:click={giveUp}>Give Up</button>
                    <button class="bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow" on:click={checkoutOrders}>Checkout & Deliver</button>
                </div>
            </div>
        </div>

    {:else if GameState == 5}
        <div class="bg-white rounded-2xl shadow-lg border overflow-hidden">
            <div class="bg-slate-800 p-4 text-white flex justify-between items-center">
                <h2 class="text-lg font-bold">🚚 Deliver Orders</h2>
                <span class="text-xs bg-slate-700 px-2 py-1 rounded">Current Loc: {currentDeliveryCity}</span>
            </div>
            <div class="relative h-[500px] w-full">
                <div id="delivery-map" class="w-full h-full"></div>
            </div>
            <div class="p-4 text-center text-sm text-slate-500 bg-slate-50">
                Click markers on the map to drive to customers. Route matters!
            </div>
        </div>

    {:else if GameState == 3}
        <div class="rounded-2xl bg-green-50 border border-green-200 p-8 text-center space-y-6 max-w-lg mx-auto">
            <div class="text-6xl">🎉</div>
            <h2 class="text-2xl font-bold text-green-900">Round Complete!</h2>
            <button class="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow" on:click={exit}>Next Round</button>
        </div>

    {:else if GameState == 4}
        <div class="rounded-2xl bg-red-50 border border-red-200 p-8 text-center space-y-6 max-w-lg mx-auto">
            <div class="text-6xl">⚠️</div>
            <h2 class="text-2xl font-bold text-red-900">Incorrect Items</h2>
            <button class="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow" on:click={retry}>Try Again</button>
        </div>
    {:else if GameState == 2}
        <div class="flex flex-col items-center justify-center h-64 space-y-4">
            <div class="animate-bounce text-4xl">🚶</div>
            <h2 class="font-bold text-xl">Moving...</h2>
            <div class="text-slate-500">
                <span class="text-2xl font-mono font-bold text-blue-600">{dist * config["cellDistance"] / 1000}s</span>
                <p class="text-sm mt-1">({dist} {dist === 1 ? 'aisle' : 'aisles'})</p>
            </div>
        </div>
    {/if}
    
    <!-- Store Map Modal -->
    {#if showStoreMap}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
             on:click={() => showStoreMap = false}>
            <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-6"
                 on:click|stopPropagation>
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold text-slate-800">📍 Store Layout: {$orders[0].store}</h2>
                    <button class="text-slate-400 hover:text-slate-600 text-3xl" on:click={() => showStoreMap = false}>&times;</button>
                </div>
                <div class={`grid gap-2 ${gridColsClass}`}>
                    {#each config["locations"] as row, rowIndex}
                        {#each row as cell, colIndex}
                            <div class="flex min-h-[70px] flex-col items-center justify-center rounded-lg text-sm font-medium border
                                {rowIndex === curLocation[0] && colIndex === curLocation[1] ? 'bg-green-100 border-2 border-green-500 text-green-900' : 'border-slate-200 bg-slate-50'}">
                                <span class="font-bold">{cell}</span>
                                {#if emojis[cell]}<span class="text-xl mt-1">{emojis[cell]}</span>{/if}
                            </div>
                        {/each}
                    {/each}
                </div>
                <p class="text-center text-xs text-slate-500 mt-4">Your current location is highlighted in green</p>
            </div>
        </div>
    {/if}
</main>

