<script>
    import { get } from 'svelte/store';
    import { onMount, onDestroy } from 'svelte';
    import { game, orders, finishedOrders, failedOrders, earned, currLocation, elapsed, uniqueSets, completeOrder, logAction, numCols, currentRound, roundStartTime, getCurrentScenario, emojisMap } from "$lib/tutorial.js"
    import { storeConfig } from "$lib/config.js";
    
    let config = storeConfig($orders[0].store)
    let GameState = 0;
    let curLocation = [0, 0];
    
    // Support up to 3 bags
    let bags = [{}, {}, {}];
    let selectedBagIndex = 0;
    let bagInputs = ["", "", ""];
    let wordInput = "";
    
    let dist = 0;
    let correct = false;
    let startTimer = $elapsed;
    let intervalId;
    let startEarnings;
    let totalEarnings;
    let curTip = 0;
    
    $: numOrders = $orders.length;
    $: endTimer = $elapsed - startTimer;
    $: bagCounts = bags.map(bag => Object.values(bag).reduce((a, b) => a + b, 0));
    $: locationLabel = config["locations"]?.[curLocation[0]]?.[curLocation[1]] || "Entrance";

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
    });

    function handleCell(value, row, col) {
        if (value == "") {
            return;
        }
        dist = Math.abs(row - curLocation[0]) + Math.abs(col - curLocation[1]);
        curLocation[0] = row;
        curLocation[1] = col;
        GameState = 2;
        setTimeout(() => {
            GameState = 1;
        }, dist*config["cellDistance"])
    }

    function addBag() {
        const selOrders = get(orders)
        let item = config["locations"][curLocation[0]][curLocation[1]].toLowerCase()
        
        if (item == "" || item == "entrance") {
            return;
        }

        // Build action for logging
        let action = {
            buttonID: "addtobag",
            buttonContent: "Add to bag",
            itemInput: wordInput,
            selectedBag: selectedBagIndex + 1,
            bags: bags.map(b => ({...b}))
        }
        
        // Validate item name
        if (wordInput.toLowerCase() != item.toLowerCase()) {
            alert("Incorrect! You must type the name of the item")
            action.mistake = "itemtypo"
            wordInput = "";
            bagInputs = ["", "", ""];
            logAction(action)
            return;
        }

        // Process quantities for each bag
        let quantities = [];
        for (let i = 0; i < numOrders; i++) {
            let inputVal = bagInputs[i].trim();
            if (inputVal === "") {
                quantities.push(0);
            } else {
                let qty = parseInt(inputVal);
                if (isNaN(qty)) {
                    alert("Error: Quantity inputs must be numbers")
                    action.mistake = "numberempty"
                    wordInput = "";
                    bagInputs = ["", "", ""];
                    logAction(action)
                    return;
                }
                quantities.push(qty);
            }
        }

        // Add to bags
        for (let i = 0; i < numOrders; i++) {
            if (quantities[i] !== 0) {
                if (Object.keys(bags[i]).includes(item)) {
                    bags[i][item] += quantities[i];
                } else {
                    bags[i][item] = quantities[i];
                }
                if (bags[i][item] <= 0) {
                    delete bags[i][item];
                }
            }
        }

        wordInput = "";
        bagInputs = ["", "", ""];
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

        // Clear bags
        bags = [{}, {}, {}];

        if (correct) {
            // Log round completion
            logRoundCompletion(true);
            
            $earned += totalEarnings;
            $uniqueSets += 1;
            
            selOrders.forEach(order => {
                completeOrder(order.id);
                $finishedOrders.push(order);
            });
            
            // Remove completed orders
            for (let i = 0; i < numOrders; i++) {
                $orders.shift();
            }
            
            GameState = 3;
        } else {
            logRoundCompletion(false);
            GameState = 4;
        }
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
        <div class="grid md:grid-cols-[2fr,3fr] gap-4">
            <!-- Left: Bags with tabs -->
            <section class="rounded-2xl bg-white shadow-sm border p-4 space-y-3">
                <!-- Bag tabs -->
                <div class="flex gap-1 border-b pb-2">
                    {#each Array(numOrders) as _, idx}
                        <button
                            class="flex-1 rounded-t-lg px-3 py-1.5 text-xs font-medium transition {selectedBagIndex === idx ? 'bg-green-100 text-green-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}"
                            on:click={() => selectedBagIndex = idx}
                        >
                            Bag {idx + 1}
                            {#if bagCounts[idx] > 0}
                                <span class="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px]">
                                    {bagCounts[idx]}
                                </span>
                            {/if}
                        </button>
                    {/each}
                </div>

                <!-- Show all bags -->
                <div class="space-y-3">
                    {#each Array(numOrders) as _, idx}
                        <div>
                            <h5 class="text-xs font-medium text-slate-700 mb-1">
                                Bag {idx + 1} - {$orders[idx].name}
                            </h5>
                            <ul class="text-xs text-slate-600 space-y-0.5 pl-2">
                                {#each Object.keys(bags[idx]) as key}
                                    <li class="flex justify-between">
                                        <span>{key}</span>
                                        <span class="font-medium">{bags[idx][key]}</span>
                                    </li>
                                {/each}
                                {#if Object.keys(bags[idx]).length === 0}
                                    <li class="text-slate-400 italic text-[10px]">Empty</li>
                                {/if}
                            </ul>
                        </div>
                    {/each}
                </div>

                <!-- Add to bag form -->
                <div class="pt-3 border-t space-y-2">
                    <input 
                        class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" 
                        bind:value={wordInput}
                        placeholder="Item name"
                    />
                    <div class="grid gap-2" style="grid-template-columns: repeat({numOrders}, 1fr);">
                        {#each Array(numOrders) as _, idx}
                            <input 
                                class="rounded-lg border border-slate-200 px-2 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                bind:value={bagInputs[idx]}
                                placeholder="Bag {idx + 1}"
                                type="number"
                            />
                        {/each}
                    </div>
                    <button 
                        id="addtobag" 
                        class="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition" 
                        on:click={addBag}
                    >
                        Add to bags
                    </button>
                </div>
            </section>

            <!-- Right: Store layout -->
            <section class="rounded-2xl bg-white shadow-sm border p-4 space-y-3">
                <h3 class="text-sm font-semibold text-slate-900">Store layout</h3>
                <div class={`grid gap-2 ${gridColsClass}`}>
                    {#each config["locations"] as row, rowIndex}
                        {#each row as cell, colIndex}
                            <button
                                id="moveinstore"
                                class="flex min-h-[60px] flex-col items-center justify-center rounded-xl text-xs font-medium transition {rowIndex === curLocation[0] && colIndex === curLocation[1] ? 'bg-green-100 border-2 border-green-500 text-green-900' : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'}"
                                on:click={() => handleCell(cell, rowIndex, colIndex)}
                            >
                                <span>{cell}</span>
                                {#if $emojisMap[cell]}
                                    <span class="text-lg">{$emojisMap[cell]}</span>
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
                    <p>Items: {#each bagCounts as count, idx}Bag {idx + 1} ({count}){idx < numOrders - 1 ? ' · ' : ''}{/each}</p>
                </div>
                <button
                    id="checkout"
                    class="rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition"
                    on:click={checkoutOrders}
                >
                    Checkout and Exit
                </button>
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
                <p class="text-sm text-green-700">All items collected correctly</p>
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
                on:click={start}
            >
                Try Again
            </button>
        </div>
    {/if}
</main>
