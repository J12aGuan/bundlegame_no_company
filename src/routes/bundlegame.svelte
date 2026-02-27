<script>
    import { get } from 'svelte/store';
    import { onMount, onDestroy } from 'svelte';
    import { game, orders, finishedOrders, failedOrders, earned, currLocation, elapsed, uniqueSets, completeOrder, logAction, numCols, currentRound, roundStartTime, getCurrentScenario, emojisMap, roundTimeLimit } from "$lib/bundle.js"
    import { storeConfig, getDistances } from "$lib/config.js"; // Import getDistances
    
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
    
    let totalEarnings;
    let curTip = 0;
    
    // DELIVERY STATE
    let deliveryMap;
    let deliveryLocations = [];
    let currentDeliveryCity = ""; // Tracks where the driver currently is
    const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
    const cityCoords = {
        "Berkeley": [37.8715, -122.2730],
        "Oakland": [37.8044, -122.2712],
        "Emeryville": [37.8313, -122.2852],
        "Piedmont": [37.8238, -122.2316]
    };

    // Timer config - now from centralized config
    $: ROUND_TIME_LIMIT = $roundTimeLimit || 300;
    
    $: numOrders = $orders.length;
    $: elapsedTime = $elapsed - startTimer;
    $: countdownTimer = Math.max(0, ROUND_TIME_LIMIT - elapsedTime);
    $: locationLabel = config["locations"]?.[curLocation[0]]?.[curLocation[1]]?.toLowerCase() || "entrance";

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
        if (aisleCountdownInterval) clearInterval(aisleCountdownInterval);
        if (deliveryCountdownInterval) clearInterval(deliveryCountdownInterval);
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

    // Function to remove items from a bag
    function removeFromBag(bagIdx, itemName) {
        if (bags[bagIdx][itemName]) {
            delete bags[bagIdx][itemName];
            bags = [...bags]; // Trigger reactivity
            logAction({ buttonID: "removefromBag", bagIndex: bagIdx, item: itemName });
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
            logAction({ buttonID: "decreaseQty", bagIndex: bagIdx, item: itemName });
        }
    }

    // Function to increase quantity of an item
    function increaseQuantity(bagIdx, itemName) {
        if (bags[bagIdx][itemName]) {
            bags[bagIdx][itemName] += 1;
            bags = [...bags]; // Trigger reactivity
            logAction({ buttonID: "increaseQty", bagIndex: bagIdx, item: itemName });
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

    // Map layer references for updating
    let truckMarker = null;
    let routeLines = [];
    let distanceLabels = [];
    let destinationMarkers = [];

    function initDeliveryMap() {
        try {
            if (deliveryMap) deliveryMap.remove();
            
            deliveryMap = L.map('delivery-map', {
                center: [37.84, -122.25],
                zoom: 12
            });

            L.maptilerLayer({
                apiKey: API_KEY,
                style: L.MaptilerStyle.STREETS
            }).addTo(deliveryMap);

            updateDeliveryMapLayers();
        } catch (error) {
            console.error('Error initializing delivery map:', error);
            // Don't throw - allow game to continue without map
            deliveryMap = null;
        }
    }
    
    function updateDeliveryMapLayers() {
        if (!deliveryMap) return;
        
        // Clear existing layers
        routeLines.forEach(line => deliveryMap.removeLayer(line));
        distanceLabels.forEach(label => deliveryMap.removeLayer(label));
        destinationMarkers.forEach(marker => deliveryMap.removeLayer(marker));
        if (truckMarker) deliveryMap.removeLayer(truckMarker);
        
        routeLines = [];
        distanceLabels = [];
        destinationMarkers = [];
        
        // Get current location coordinates
        const currentCoords = cityCoords[currentDeliveryCity] || cityCoords["Berkeley"];
        
        // Add Truck Marker at current location
        const truckIcon = L.divIcon({
            html: '<div style="font-size:28px;text-shadow:2px 2px 4px rgba(0,0,0,0.3);">🚚</div>',
            className: 'truck-marker',
            iconSize: [35, 35],
            iconAnchor: [17, 17]
        });
        truckMarker = L.marker(currentCoords, { icon: truckIcon, zIndexOffset: 1000 }).addTo(deliveryMap);
        truckMarker.bindPopup(`<b>📍 You are here</b><br>${currentDeliveryCity}`);
        
        // Add Destination Markers and Route Lines
        deliveryLocations.forEach((loc, idx) => {
            const destCoords = cityCoords[loc.destination] || cityCoords["Berkeley"];
            
            // Calculate travel time from current location
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
            
            if (!loc.delivered) {
                // Draw route line from current location to destination
                const routeLine = L.polyline([currentCoords, destCoords], {
                    color: '#3b82f6',
                    weight: 3,
                    opacity: 0.7,
                    dashArray: '10, 10'
                }).addTo(deliveryMap);
                routeLines.push(routeLine);
                
                // Add distance/time label at midpoint of line
                const midLat = (currentCoords[0] + destCoords[0]) / 2;
                const midLng = (currentCoords[1] + destCoords[1]) / 2;
                
                const labelIcon = L.divIcon({
                    html: `<div style="background:#3b82f6;color:white;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.2);">🚗 ${travelTime}s</div>`,
                    className: 'distance-label',
                    iconSize: [60, 20],
                    iconAnchor: [30, 10]
                });
                const label = L.marker([midLat, midLng], { icon: labelIcon, interactive: false }).addTo(deliveryMap);
                distanceLabels.push(label);
            }
            
            // Destination marker
            const markerIcon = L.divIcon({
                html: `<div style="font-size:24px;${loc.delivered ? 'opacity:0.4;' : ''}">${loc.delivered ? '✅' : '📦'}</div>`,
                className: 'dest-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            const marker = L.marker(destCoords, { icon: markerIcon }).addTo(deliveryMap);
            destinationMarkers.push(marker);
            
            // Popup with delivery info
            if (!loc.delivered) {
                marker.bindPopup(`
                    <div style="text-align:center;min-width:120px;">
                        <b style="font-size:14px;">${loc.name}</b><br>
                        <span style="color:#666;">📍 ${loc.destination}</span><br>
                        <div style="background:#e0f2fe;padding:4px 8px;border-radius:6px;margin:6px 0;">
                            <span style="font-size:16px;font-weight:bold;color:#0369a1;">🚗 ${travelTime}s</span>
                        </div>
                        <div style="font-size:11px;color:#16a34a;font-weight:bold;">
                            Click to deliver
                        </div>
                    </div>
                `);
                
                marker.on('click', () => {
                    console.log("Marker clicked for idx:", idx);
                    deliverTo(idx);
                });
            } else {
                marker.bindPopup(`
                    <div style="text-align:center;">
                        <b>${loc.name}</b><br>
                        <span style="color:#16a34a;">✅ Delivered</span>
                    </div>
                `);
            }
        });
        
        // Fit map to show all points
        const allCoords = [currentCoords, ...deliveryLocations.map(loc => cityCoords[loc.destination] || cityCoords["Berkeley"])];
        const bounds = L.latLngBounds(allCoords);
        deliveryMap.fitBounds(bounds, { padding: [30, 30] });
    }

    function deliverTo(idx) {
        console.log("deliverTo called with idx:", idx, "deliveryLocations:", deliveryLocations);
        if (!deliveryMap || !deliveryLocations.length || deliveryInProgress) {
            console.log("Early return: deliveryMap:", deliveryMap, "deliveryLocations.length:", deliveryLocations.length, "deliveryInProgress:", deliveryInProgress);
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
        
        // Start delivery countdown (auto-completes after time)
        deliveryInProgress = true;
        deliveringToCity = targetLoc.destination;
        deliveryCountdown = travelTime;
        
        if (deliveryCountdownInterval) clearInterval(deliveryCountdownInterval);
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
        
        // Force array update to trigger reactivity
        deliveryLocations = [...deliveryLocations];
        
        console.log("After delivery update:", deliveryLocations.map(d => ({name: d.name, delivered: d.delivered})));
        
        // Safely close popup
        if (deliveryMap && deliveryMap.closePopup) {
            try {
                deliveryMap.closePopup();
            } catch (err) {
                console.error("Failed to close popup", err);
            }
        }
        
        // Update map to show new current location and recalculate distances
        updateDeliveryMapLayers();
        
        // Check if all deliveries complete
        const allDelivered = deliveryLocations.every(d => d.delivered);
        console.log("All delivered?", allDelivered, "Count:", deliveryLocations.filter(d => d.delivered).length, "/", deliveryLocations.length);
        
        if (allDelivered) {
            console.log("All deliveries complete! Calling finishSuccess()");
            finishSuccess();
        }
    }

    function finishSuccess() {
        console.log("finishSuccess() called - completing round");
        
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
        
        // 3. Immediately advance to next round (no Round Complete screen)
        console.log("Round complete - immediately advancing to next round");
        exit();
    }

    function logRoundCompletion(success) {
        const scenario = getCurrentScenario($currentRound);
        const duration = $elapsed - startTimer; // Calculate directly
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

<main class="mx-auto max-w-6xl px-4 py-2 space-y-3">
    <div class="flex items-center justify-between bg-white p-2 rounded-xl border shadow-sm">
        <div>
            <h1 class="text-base font-bold text-slate-800">{$orders[0].store}</h1>
            <p class="text-xs text-slate-500">Aisle: {locationLabel}</p>
        </div>
        <div class="text-right">
             <div class="text-lg font-bold text-green-600">${totalEarnings}</div>
             <div class="text-xs text-slate-400 font-mono {countdownTimer < 60 ? 'text-red-500 font-bold' : ''}">
                 ⏱️ {Math.floor(countdownTimer / 60)}:{(countdownTimer % 60).toString().padStart(2, '0')}
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
        <div class="grid lg:grid-cols-[1fr,2fr] gap-4">
            <div class="space-y-3">
                <div class="bg-white p-3 rounded-xl border shadow-sm space-y-2 sticky top-2 z-10">
                    <label class="block text-xs font-bold text-slate-700 uppercase">1. Identify Item</label>
                    <input class="w-full text-base border-2 border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none" 
                        bind:value={wordInput} placeholder="Type item name..."/>
                    <button class="w-full bg-blue-600 text-white font-bold py-2 rounded-lg shadow hover:bg-blue-700 transition text-sm"
                        on:click={addBag}>Add to Selected Bags</button>
                    <button class="w-full bg-slate-500 text-white font-bold py-1.5 rounded-lg shadow hover:bg-slate-600 transition text-xs"
                        on:click={() => showStoreMap = true}>📍 Show Store Map</button>
                </div>
                
                {#each $orders as order, idx}
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="font-bold text-slate-800 text-sm">Order {idx+1}: {order.id || `#${idx + 1}`}</h3>
                                <p class="text-[10px] text-slate-500">📍 Deliver to: {order.city}</p>
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
                                    <div class="flex justify-between"><span>{item.toLowerCase()}</span><span>x{qty}</span></div>
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
                                            <button class="w-4 h-4 bg-slate-200 rounded text-[10px] hover:bg-slate-300" 
                                                on:click|stopPropagation={() => increaseQuantity(idx, item)}>+</button>
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
                 <div class={`grid gap-1.5 ${gridColsClass}`}>
                    {#each config["locations"] as row, rowIndex}
                        {#each row as cell, colIndex}
                            <button class="flex min-h-[60px] flex-col items-center justify-center rounded-lg text-xs font-medium transition
                                {rowIndex === curLocation[0] && colIndex === curLocation[1] ? 'bg-green-100 border-2 border-green-500 text-green-900 transform scale-105' : 'border border-slate-200 bg-white hover:bg-slate-50'}"
                                on:click={() => handleCell(cell, rowIndex, colIndex)}>
                                <span>{cell.toLowerCase()}</span>{#if $emojisMap[cell]}<span class="text-xl mt-0.5">{$emojisMap[cell]}</span>{/if}
                            </button>
                        {/each}
                    {/each}
                </div>
                <div class="flex justify-between pt-2 border-t">
                    <button class="text-red-500 font-bold text-sm" on:click={giveUp}>Give Up</button>
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
                    <div class="w-48 h-2 bg-slate-200 rounded-full mt-3 mx-auto overflow-hidden">
                        <div class="h-full bg-blue-500 transition-all duration-100 rounded-full"
                             style="width: {(deliveryCountdown / (getDistances(currentDeliveryCity).distances[getDistances(currentDeliveryCity).destinations.indexOf(deliveringToCity)] || 2)) * 100}%"></div>
                    </div>
                </div>
            {:else}
                <!-- Delivery List with Distance/Time Info -->
                <div class="p-3 bg-slate-50 border-b">
                    <p class="text-xs font-semibold text-slate-600 mb-2">Deliveries Remaining:</p>
                    <div class="grid gap-2">
                        {#each deliveryLocations as loc, idx}
                            {@const distData = getDistances(currentDeliveryCity)}
                            {@const destIndex = distData.destinations.indexOf(loc.destination)}
                            {@const travelTime = currentDeliveryCity === loc.destination ? 2 : (destIndex !== -1 ? distData.distances[destIndex] : 2)}
                            <div class="flex items-center justify-between bg-white p-2 rounded-lg border text-sm
                                {loc.delivered ? 'opacity-50' : ''}">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg">{loc.delivered ? '✅' : '📦'}</span>
                                    <div>
                                        <p class="font-medium text-slate-800">{loc.name}</p>
                                        <p class="text-xs text-slate-500">📍 {loc.destination}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    {#if !loc.delivered}
                                        <p class="text-xs text-slate-600">🚗 {travelTime}s away</p>
                                        <button class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 mt-1"
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
            
            <!-- Smaller Map -->
            <div class="relative h-[280px] w-full">
                <div id="delivery-map" class="w-full h-full"></div>
            </div>
            <div class="p-3">
                <div class="text-center text-xs text-slate-500">
                    Click delivery buttons above or markers on map. Your location updates after each delivery.
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
                <div class={`grid gap-1.5 ${gridColsClass}`}>
                    {#each config["locations"] as row, rowIndex}
                        {#each row as cell, colIndex}
                            <div class="flex min-h-[50px] flex-col items-center justify-center rounded-lg text-xs font-medium border
                                {rowIndex === curLocation[0] && colIndex === curLocation[1] ? 'bg-green-100 border-2 border-green-500 text-green-900' : 'border-slate-200 bg-slate-50'}">
                                <span class="font-bold">{cell.toLowerCase()}</span>
                                {#if $emojisMap[cell]}<span class="text-lg mt-0.5">{$emojisMap[cell]}</span>{/if}
                            </div>
                        {/each}
                    {/each}
                </div>
                <p class="text-center text-xs text-slate-500 mt-3">Your current location is highlighted in green</p>
            </div>
        </div>
    {/if}
</main>
