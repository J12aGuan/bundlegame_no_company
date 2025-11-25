<script>
    import { get } from 'svelte/store';
    import { onMount, onDestroy } from 'svelte';
    import { game, orders, finishedOrders, failedOrders, earned, currLocation, elapsed, uniqueSets, completeOrder, logAction, numCols, currentRound, roundStartTime, getCurrentScenario, penaltyEndTime } from "$lib/bundle.js"
    import { storeConfig, getDistances } from "$lib/config.js";
    import emojis from "$lib/emojis.json"
    
    let config = storeConfig($orders[0].store)
    let GameState = 0;
    let curLocation = [0, 0];
    
    // Support up to 3 bags
    let bags = [{}, {}, {}];
    let orderInputs = [{}, {}, {}]; // Per-order inputs for each item
    let wordInput = "";
    
    let dist = 0;
    let correct = false;
    let startTimer = $elapsed;
    let intervalId;
    let startEarnings;
    let totalEarnings;
    let curTip = 0;
    
    // Delivery phase tracking
    let deliveryIndex = 0;
    let deliveryProgress = 0;
    let deliveryTimer;
    
    // Map coordinates for delivery visualization
    const mapCoords = {
        "Berkeley": { cx: 50, cy: 30 },
        "Oakland": { cx: 50, cy: 80 },
        "Emeryville": { cx: 20, cy: 55 },
        "Piedmont": { cx: 80, cy: 55 }
    };
    
    $: numOrders = $orders.length;
    $: endTimer = $elapsed - startTimer;
    $: bagCounts = bags.map(bag => Object.values(bag).reduce((a, b) => a + b, 0));
    $: locationLabel = config["locations"]?.[curLocation[0]]?.[curLocation[1]] || "Entrance";
    $: currentItem = config["locations"]?.[curLocation[0]]?.[curLocation[1]]?.toLowerCase() || "";

    function updateTip() {
        let tipIndex = Math.floor(endTimer / config["tipinterval"])
        let percentIncrease = tipIndex < config["tip"].length ? (1 + (config["tip"][tipIndex]/100)) : (config["tip"][config["tip"].length - 1]/100)
        curTip = Math.round(percentIncrease * 100 - 100);
        totalEarnings = Math.round(startEarnings*percentIncrease*100)/100
    }

    const colClassMap = {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-4',
		5: 'grid-cols-5',
		6: 'grid-cols-6',
		7: 'grid-cols-7',
		8: 'grid-cols-8',
		9: 'grid-cols-9'
	};

	let gridColsClass = colClassMap[numCols] || 'grid-cols-1';

    onMount(() => {
        const selOrders = get(orders)
        startEarnings = selOrders.reduce((sum, order) => sum + order.earnings, 0)
        totalEarnings = startEarnings
        config = storeConfig($orders[0].store)
        curLocation = config["Entrance"]
        if ($game.tip) {
            intervalId = setInterval(updateTip, 1000);
        }
    });

    onDestroy(() => {
        if ($game.tip) {
            clearInterval(intervalId);
        }
        if (deliveryTimer) {
            clearInterval(deliveryTimer);
        }
    });

    function clearInputs() {
        wordInput = "";
        orderInputs = [{}, {}, {}];
    }

    function handleCell(value, row, col) {
        if (value == "") {
            return;
        }
        dist = Math.abs(row - curLocation[0]) + Math.abs(col - curLocation[1]);
        curLocation[0] = row;
        curLocation[1] = col;
        
        // Clear inputs when moving to new location
        clearInputs();
        
        GameState = 2;
        setTimeout(() => {
            GameState = 1;
        }, dist*config["cellDistance"])
    }

    function addItemToOrder(orderIdx) {
        const selOrders = get(orders)
        let item = config["locations"][curLocation[0]][curLocation[1]].toLowerCase()
        
        if (item == "" || item == "entrance") {
            return;
        }

        const qtyInput = orderInputs[orderIdx][item] || "";
        
        // Build action for logging
        let action = {
            buttonID: "addtoorder",
            buttonContent: "Add to order",
            itemInput: item,
            selectedOrder: orderIdx + 1,
            quantity: qtyInput,
            bags: bags.map(b => ({...b}))
        }
        
        if (qtyInput === "" || qtyInput === "0") {
            alert("Please enter a quantity")
            action.mistake = "noquantity"
            logAction(action)
            return;
        }

        let qty = parseInt(qtyInput);
        if (isNaN(qty)) {
            alert("Error: Quantity must be a number")
            action.mistake = "numberempty"
            logAction(action)
            return;
        }

        // Add to bag
        if (Object.keys(bags[orderIdx]).includes(item)) {
            bags[orderIdx][item] += qty;
        } else {
            bags[orderIdx][item] = qty;
        }
        if (bags[orderIdx][item] <= 0) {
            delete bags[orderIdx][item];
        }

        // Clear the input for this item/order
        orderInputs[orderIdx][item] = "";
        orderInputs = orderInputs; // Trigger reactivity
        
        logAction(action)
        
        // Trigger reactivity
        bags = bags;
    }

    function start() {
        const selOrders = get(orders)
        startTimer = $elapsed;
        config = storeConfig(selOrders[0].store)
        GameState = 1;
    }
    
    // FIX: Retry without resetting timer
    function retry() {
        GameState = 1;
    }

    function giveUp() {
        if(confirm("Are you sure you want to give up? You will incur a 30 second penalty.")) {
            totalEarnings = 0; // Penalty: 0 earnings
            logRoundCompletion(false);
            
            // Set penalty end time (30 seconds from now)
            penaltyEndTime.set($elapsed + 30);
            
            exit();
        }
    }
    
    function exit() {
        GameState = 0;
        $game.inSelect = true;
        $game.inStore = false;
    }

    function checkoutOrders() {
        const selOrders = get(orders);
        const numOrders = selOrders.length;
        
        // Generate all possible permutations of bag-to-order mappings
        function getPermutations(arr) {
            if (arr.length <= 1) return [arr];
            const result = [];
            for (let i = 0; i < arr.length; i++) {
                const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
                const perms = getPermutations(rest);
                for (const perm of perms) {
                    result.push([arr[i], ...perm]);
                }
            }
            return result;
        }

        const orderIndices = Array.from({length: numOrders}, (_, i) => i);
        const permutations = getPermutations(orderIndices);
        
        // Check if any permutation matches
        correct = false;
        for (const perm of permutations) {
            let allMatch = true;
            for (let bagIdx = 0; bagIdx < numOrders; bagIdx++) {
                const orderIdx = perm[bagIdx];
                const order = selOrders[orderIdx];
                const bag = bags[bagIdx];
                
                // Check if bag contents match order items
                if (Object.keys(bag).length !== Object.keys(order.items).length) {
                    allMatch = false;
                    break;
                }
                
                for (const item of Object.keys(bag)) {
                    if (order.items[item] !== bag[item]) {
                        allMatch = false;
                        break;
                    }
                }
                
                if (!allMatch) break;
            }
            
            if (allMatch) {
                correct = true;
                break;
            }
        }

        if (correct) {
            // Clear bags on success
            bags = [{}, {}, {}];
            // Start Delivery Phase with interactive map
            startDeliveryPhase();
        } else {
            // Keep bags for retry - don't clear them
            logRoundCompletion(false);
            GameState = 4;
        }
    }

    function startDeliveryPhase() {
        deliveryIndex = 0;
        GameState = 5;
    }

    function deliverToCustomer(city) {
        const selOrders = get(orders);
        const targetCity = selOrders[deliveryIndex]?.deliveryCity || selOrders[deliveryIndex]?.city;
        
        if (city === targetCity) {
            deliveryIndex++;
            if (deliveryIndex >= numOrders) {
                // All deliveries complete
                finishSuccess();
            }
        }
    }

    function finishSuccess() {
        // Log round completion
        logRoundCompletion(true);
        
        $earned += totalEarnings;
        $uniqueSets += 1;
        
        const selOrders = get(orders);
        selOrders.forEach(order => {
            completeOrder(order.id);
            $finishedOrders.push(order);
        });
        
        // Remove completed orders
        for (let i = 0; i < numOrders; i++) {
            $orders.shift();
        }
        
        GameState = 3;
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
            scenario_id: scenario.scenario_id,
            available_orders: scenario.orders.map(o => o.id),
            recommended_orders: recommendedOrderIds,
            chosen_orders: chosenOrderIds,
            bundle_size: chosenOrderIds.length,
            round_duration_s: duration,
            round_earnings: success ? totalEarnings : 0,
            success: success,
            gametime_elapsed_s: $elapsed
        });

        if (success) {
            // Increment round counter
            currentRound.update(r => r + 1);
        }
    }
</script>

<main class="mx-auto max-w-5xl px-4 py-6 space-y-5">
    <!-- Summary card at top -->
    <section class="rounded-2xl bg-white shadow-sm border p-4 space-y-3">
        <div class="flex items-start justify-between">
            <div>
                <h2 class="text-base font-semibold text-slate-900">{$orders[0].store}</h2>
                <p class="text-xs text-slate-500">Current location: {locationLabel}</p>
            </div>
            <div class="text-right text-sm">
                <p class="font-semibold text-slate-900">Total earnings: ${totalEarnings}</p>
                {#if $game.tip && curTip > 0}
                    <p class="text-xs text-green-600">+{curTip}% tip</p>
                {/if}
                <p class="text-xs text-slate-500">Orders: {numOrders}</p>
            </div>
        </div>

        <div class="flex flex-wrap gap-2 text-[10px]">
            {#if GameState === 1}
                <span class="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                    Picking items
                </span>
            {:else if GameState === 2}
                <span class="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                    Moving...
                </span>
            {/if}
            {#if GameState == 1 || GameState == 2}
                <span class="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                    Time in store: {endTimer}s
                </span>
            {/if}
        </div>

        <!-- Order details -->
        <div class="flex flex-wrap gap-2">
            {#each $orders as order, idx}
                <div class="flex-1 min-w-[180px] rounded-lg bg-slate-50 p-3 text-xs">
                    <p class="font-semibold text-slate-900 mb-1">Order {idx + 1} for {order.name}</p>
                    <p class="text-slate-600 mb-2">Pay: ${order.earnings}</p>
                    <ul class="space-y-0.5 text-slate-600">
                        {#each Object.keys(order.items) as item}
                            <li>{order.items[item]}x {item}</li>
                        {/each}
                    </ul>
                </div>
            {/each}
        </div>
    </section>

    {#if GameState == 0}
        <!-- Start picking -->
        <div class="text-center py-8">
            <button 
                class="rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition" 
                id="startpicking" 
                on:click={start}
            >
                Start Picking ({numOrders} {numOrders === 1 ? 'Order' : 'Orders'})
            </button>
        </div>
        
    {:else if GameState == 1}
        <!-- Active picking -->
        <div class="grid md:grid-cols-[3fr,2fr] gap-4">
            <!-- Left: Order cards with integrated inputs -->
            <section class="space-y-4">
                {#each $orders as order, idx}
                    <div class="rounded-2xl bg-white shadow-sm border p-4 space-y-3">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-sm font-semibold text-slate-900">Order {idx + 1} - {order.name}</p>
                                <p class="text-xs text-slate-500">Pay: ${order.earnings}</p>
                            </div>
                            <div class="text-right">
                                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                    Bag: {bagCounts[idx]} items
                                </span>
                            </div>
                        </div>
                        
                        <!-- Items needed with inline input -->
                        <div class="space-y-2">
                            {#each Object.keys(order.items) as item}
                                {@const collected = bags[idx][item] || 0}
                                {@const needed = order.items[item]}
                                {@const isCurrentItem = currentItem === item.toLowerCase()}
                                <div class="flex items-center justify-between gap-2 p-2 rounded-lg {isCurrentItem ? 'bg-green-50 border border-green-200' : 'bg-slate-50'}">
                                    <div class="flex items-center gap-2 flex-1">
                                        {#if emojis[item.charAt(0).toUpperCase() + item.slice(1)]}
                                            <span class="text-lg">{emojis[item.charAt(0).toUpperCase() + item.slice(1)]}</span>
                                        {/if}
                                        <span class="text-xs font-medium text-slate-700">{item}</span>
                                        <span class="text-xs text-slate-500">
                                            ({collected}/{needed})
                                        </span>
                                        {#if collected >= needed}
                                            <span class="text-green-600 text-xs">✓</span>
                                        {/if}
                                    </div>
                                    
                                    {#if isCurrentItem}
                                        <div class="flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                class="w-16 rounded border border-green-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                                                bind:value={orderInputs[idx][item]}
                                                placeholder="qty"
                                            />
                                            <button 
                                                class="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 transition"
                                                on:click={() => addItemToOrder(idx)}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                        
                        <!-- Bag contents summary -->
                        {#if Object.keys(bags[idx]).length > 0}
                            <div class="pt-2 border-t">
                                <p class="text-[10px] text-slate-500 mb-1">In bag:</p>
                                <div class="flex flex-wrap gap-1">
                                    {#each Object.keys(bags[idx]) as bagItem}
                                        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                                            {bagItem}: {bags[idx][bagItem]}
                                        </span>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </section>

            <!-- Right: Store layout -->
            <section class="rounded-2xl bg-white shadow-sm border p-4 space-y-3 sticky top-4 h-fit">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-slate-900">Store layout</h3>
                    <span class="text-xs text-slate-500">At: {locationLabel}</span>
                </div>
                <div class={`grid gap-2 ${gridColsClass}`}>
                    {#each config["locations"] as row, rowIndex}
                        {#each row as cell, colIndex}
                            <button
                                id="moveinstore"
                                class="flex min-h-[60px] flex-col items-center justify-center rounded-xl text-xs font-medium transition {rowIndex === curLocation[0] && colIndex === curLocation[1] ? 'bg-green-100 border-2 border-green-500 text-green-900' : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'}"
                                on:click={() => handleCell(cell, rowIndex, colIndex)}
                            >
                                <span>{cell}</span>
                                {#if emojis[cell]}
                                    <span class="text-lg">{emojis[cell]}</span>
                                {/if}
                            </button>
                        {/each}
                    {/each}
                </div>
            </section>
        </div>

        <!-- Checkout footer -->
        <footer class="sticky bottom-0 mt-4 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg">
            <div class="flex items-center justify-between px-4 py-3">
                <div class="text-xs text-slate-600">
                    <p>Items: {#each bagCounts as count, idx}Order {idx + 1} ({count}){idx < numOrders - 1 ? ' · ' : ''}{/each}</p>
                </div>
                <div class="flex gap-2">
                    <button
                        class="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-200 transition"
                        on:click={giveUp}
                    >
                        Give Up
                    </button>
                    <button
                        id="checkout"
                        class="rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition"
                        on:click={checkoutOrders}
                    >
                        Checkout and Deliver
                    </button>
                </div>
            </div>
        </footer>

    {:else if GameState == 2}
        <!-- Moving between locations -->
        <div class="rounded-2xl bg-blue-50 border border-blue-200 p-6 text-center space-y-2">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
                <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </div>
            <h3 class="text-sm font-semibold text-blue-900">Walking to {config["locations"][curLocation[0]][curLocation[1]]}</h3>
            <p class="text-xs text-blue-700">Travel time: {dist*config["cellDistance"]/1000}s</p>
        </div>

    {:else if GameState == 5}
        <!-- Delivering with interactive map -->
        <div class="rounded-2xl bg-purple-50 border border-purple-200 p-6 text-center space-y-4">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100">
                <svg class="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>
            <div>
                <p class="text-lg font-semibold text-purple-900">Delivery Phase</p>
                <p class="text-sm text-purple-700">
                    Click on <span class="font-bold">{$orders[deliveryIndex]?.deliveryCity || $orders[deliveryIndex]?.city}</span> to deliver to {$orders[deliveryIndex]?.name}
                </p>
                <p class="text-xs text-purple-500 mt-1">Delivery {deliveryIndex + 1} of {numOrders}</p>
            </div>
            
            <!-- Interactive delivery map -->
            <div class="bg-white p-4 rounded-2xl border shadow-sm inline-block">
                <svg viewBox="0 0 100 100" class="w-64 h-64 border rounded-lg bg-blue-50/30">
                    <!-- Connection lines -->
                    <line x1="50" y1="30" x2="20" y2="55" stroke="#cbd5e1" stroke-width="2" />
                    <line x1="50" y1="30" x2="80" y2="55" stroke="#cbd5e1" stroke-width="2" />
                    <line x1="50" y1="30" x2="50" y2="80" stroke="#cbd5e1" stroke-width="2" />
                    <line x1="20" y1="55" x2="50" y2="80" stroke="#cbd5e1" stroke-width="2" />
                    <line x1="80" y1="55" x2="50" y2="80" stroke="#cbd5e1" stroke-width="2" />
                    
                    <!-- City nodes -->
                    {#each Object.entries(mapCoords) as [city, coords]}
                        {@const isTarget = city === ($orders[deliveryIndex]?.deliveryCity || $orders[deliveryIndex]?.city)}
                        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                        <g class="cursor-pointer hover:opacity-80 transition" role="button" tabindex="0" on:click={() => deliverToCustomer(city)} on:keydown={(e) => e.key === 'Enter' && deliverToCustomer(city)}>
                            <circle cx={coords.cx} cy={coords.cy} r="8" 
                                fill={isTarget ? '#a855f7' : '#fff'} 
                                stroke={isTarget ? '#7e22ce' : '#64748b'} 
                                stroke-width="2"
                                class={isTarget ? 'animate-pulse' : ''} />
                            <text x={coords.cx} y={coords.cy + 15} font-size="6" text-anchor="middle" fill="#334155" font-weight="bold">
                                {city}
                            </text>
                            {#if isTarget}
                                <text x={coords.cx} y={coords.cy + 3} font-size="6" text-anchor="middle" fill="white">📦</text>
                            {/if}
                        </g>
                    {/each}
                </svg>
            </div>
        </div>

    {:else if GameState == 3}
        <!-- Success -->
        <div class="rounded-2xl bg-green-50 border border-green-200 p-6 text-center space-y-4">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <div>
                <p class="text-lg font-semibold text-green-900">Order Complete!</p>
                <p class="text-sm text-green-700">All items collected and delivered</p>
                <p class="text-xs text-slate-500 mt-2">Round {$currentRound - 1} finished</p>
            </div>
            <button 
                class="rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition" 
                id="ordersuccess" 
                on:click={exit}
            >
                Next Round →
            </button>
        </div>

    {:else}
        <!-- Error -->
        <div class="rounded-2xl bg-red-50 border border-red-200 p-6 text-center space-y-4">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                <svg class="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <div>
                <p class="text-lg font-semibold text-red-900">Incorrect Items</p>
                <p class="text-sm text-red-700">Please check your bags and try again</p>
            </div>
            <button 
                class="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-red-700 transition" 
                id="orderretry" 
                on:click={retry}
            >
                Try Again
            </button>
        </div>
    {/if}
</main>
