<script>
    import { get } from 'svelte/store';
    import { onMount, onDestroy } from 'svelte';
    import { game, orders, finishedOrders, failedOrders, earned, currLocation, elapsed, uniqueSets, completeOrder, logAction, numCols } from "$lib/bundle.js"
    import { storeConfig } from "$lib/config.js";
    import emojis from "$lib/emojis.json"
    
    let config = storeConfig($orders[0].store)
    let GameState = 0;
    let curLocation = [0, 0];
    let bag1Input = "";
    let bag2Input = "";
    let wordInput = "";
    let bag1 = {}
    let bag2 = {}
    let dist = 0;
    let correct = false;
    let startTimer = $elapsed;
    let intervalId;
    let startEarnings;
    let totalEarnings;
    let curTip = 0;
    
    $: endTimer = $elapsed - startTimer;
    $: bag1Count = Object.values(bag1).reduce((a, b) => a + b, 0);
    $: bag2Count = Object.values(bag2).reduce((a, b) => a + b, 0);
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
        if ($game.bundled) {
            startEarnings = selOrders[0].earnings + selOrders[1].earnings
        } else {
            startEarnings = selOrders[0].earnings
        }
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
        let bag1InputInt;
        let bag2InputInt;
        let action = {
            buttonID: "addtobag",
            buttonContent: "Add to bag",
            bagInput1: bag1Input,
            bagInput2: bag2Input,
            itemInput: wordInput,
            bag1_: bag1,
            bag2_: bag2,
            order1: selOrders[0]
        }
        if (!$game.bundled) {
            bag2Input = "0";
        } else {
            action.order2 = selOrders[1]
        }
        
        if (item == "" || item == "entrance") {
            return;
        }
        try {
            bag1InputInt = parseInt(bag1Input)
            bag2InputInt = parseInt(bag2Input)
        } catch {
            alert("Error: Quantity inputs must be numbers")
            action.mistake = "numbertypo"
            bag1Input = "";
            bag2Input = "";
            wordInput = "";
            logAction(action)
            return;
        }
        if (isNaN(bag1InputInt) || isNaN(bag2InputInt)) {
            alert("Error: Quantity inputs must be numbers")
            action.mistake = "numberempty"
            bag1Input = "";
            bag2Input = "";
            wordInput = "";
            logAction(action)
            return;
        }
        if (wordInput.toLowerCase() != item.toLowerCase()) {
            alert("Incorrect! You must type the name of the item")
            action.mistake = "itemtypo"
            bag1Input = "";
            bag2Input = "";
            wordInput = "";
            logAction(action)
            return;
        }
        if (Object.keys(bag1).includes(item)) {
            bag1[item] += bag1InputInt
        } else {
            bag1[item] = bag1InputInt
        }
        if (Object.keys(bag2).includes(item)) {
            bag2[item] += bag2InputInt
        } else {
            bag2[item] = bag2InputInt
        }
        if (bag1[item] <= 0) {
            delete bag1[item];
        }
        if (bag2[item] <= 0) {
            delete bag2[item];
        }
        bag1Input = "";
        bag2Input = "";
        wordInput = "";
        logAction(action)
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

    function checkoutSingle() {
        const selOrders = get(orders)
        let c1 = true;
        Object.keys(bag1).forEach((key) => {
            if(selOrders[0].items[key] != bag1[key]) {
                c1 = false;
            }
        })
        if (Object.keys(bag1).length != Object.keys(selOrders[0].items).length) {
            c1 = false;
        }
        correct = c1;
        bag1 = {}
        if (correct) {
            $earned += totalEarnings;
            $uniqueSets += 1
            completeOrder(selOrders[0].id)
            $finishedOrders.push(selOrders[0]);
            $orders.splice(0, 1)
            GameState = 3;
        } else {
            GameState = 4;
        }
    }

    function checkoutBundle() {
        const selOrders = get(orders)
        let c1 = true;
        let c2 = true;
        Object.keys(bag1).forEach((key) => {
            if(selOrders[0].items[key] != bag1[key]) {
                c1 = false;
            }
        })
        if (Object.keys(bag1).length != Object.keys(selOrders[0].items).length) {
            c1 = false;
        }
        Object.keys(bag2).forEach((key) => {
            if(selOrders[1].items[key] != bag2[key]) {
                c1 = false;
            }
        })
        if (Object.keys(bag2).length != Object.keys(selOrders[1].items).length) {
            c1 = false;
        }

        Object.keys(bag1).forEach((key) => {
            if(selOrders[1].items[key] != bag1[key]) {
                c2 = false;
            }
        })
        if (Object.keys(bag1).length != Object.keys(selOrders[1].items).length) {
            c2 = false;
        }
        Object.keys(bag2).forEach((key) => {
            if(selOrders[0].items[key] != bag2[key]) {
                c2 = false;
            }
        })
        if (Object.keys(bag2).length != Object.keys(selOrders[0].items).length) {
            c2 = false;
        }
        correct = c1 || c2;
        bag1 = {}
        bag2 = {}
        if (correct) {
            $earned += totalEarnings;
            $uniqueSets += 1
            completeOrder(selOrders[0].id)
            completeOrder(selOrders[1].id)
            $finishedOrders.push(selOrders[0]);
            $finishedOrders.push(selOrders[1]);
            $orders.splice(0, 2)
            GameState = 3;
        } else {
            GameState = 4;
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
                <p class="text-xs text-slate-500">Orders: {$orders.length}</p>
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
            {#each $orders as order}
                <div class="flex-1 min-w-[200px] rounded-lg bg-slate-50 p-3 text-xs">
                    <p class="font-semibold text-slate-900 mb-1">Order for {order.name}</p>
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
            {#if $game.bundled}
                <button 
                    class="rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition" 
                    id="startbundle" 
                    on:click={start}
                >
                    Start Bundle Picking
                </button>
            {:else}
                <button 
                    class="rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition" 
                    id="startsingle" 
                    on:click={start}
                >
                    Start Picking
                </button>
            {/if}
        </div>
        
    {:else if GameState == 1}
        <!-- Active picking -->
        <div class="grid md:grid-cols-[2fr,3fr] gap-4">
            <!-- Left: Bags -->
            <section class="rounded-2xl bg-white shadow-sm border p-4 space-y-3">
                <h3 class="text-sm font-semibold text-slate-900">Your bags</h3>
                
                <div class="space-y-3">
                    <div>
                        <h5 class="text-xs font-medium text-slate-700 mb-1">{$game.bundled ? 'Bag 1' : 'Bag'}</h5>
                        <ul class="text-xs text-slate-600 space-y-0.5">
                            {#each Object.keys(bag1) as key}
                                <li class="flex justify-between">
                                    <span>{key}</span>
                                    <span class="font-medium">{bag1[key]}</span>
                                </li>
                            {/each}
                            {#if Object.keys(bag1).length === 0}
                                <li class="text-slate-400 italic">Empty</li>
                            {/if}
                        </ul>
                    </div>
                    
                    {#if $game.bundled}
                        <div>
                            <h5 class="text-xs font-medium text-slate-700 mb-1">Bag 2</h5>
                            <ul class="text-xs text-slate-600 space-y-0.5">
                                {#each Object.keys(bag2) as key}
                                    <li class="flex justify-between">
                                        <span>{key}</span>
                                        <span class="font-medium">{bag2[key]}</span>
                                    </li>
                                {/each}
                                {#if Object.keys(bag2).length === 0}
                                    <li class="text-slate-400 italic">Empty</li>
                                {/if}
                            </ul>
                        </div>
                    {/if}
                </div>

                <!-- Add to bag form -->
                <div class="pt-3 border-t space-y-2">
                    <input 
                        class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" 
                        bind:value={wordInput}
                        placeholder="Item name"
                    />
                    <div class="flex gap-2">
                        <input 
                            class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" 
                            bind:value={bag1Input}
                            placeholder="Qty 1"
                            type="number"
                        />
                        {#if $game.bundled}
                            <input 
                                class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" 
                                bind:value={bag2Input}
                                placeholder="Qty 2"
                                type="number"
                            />
                        {/if}
                    </div>
                    <button 
                        id="addtobag" 
                        class="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition" 
                        on:click={addBag}
                    >
                        Add to bag
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
                    <p>Items: Bag 1 ({bag1Count}) {#if $game.bundled}· Bag 2 ({bag2Count}){/if}</p>
                </div>
                {#if $game.bundled}
                    <button
                        id="checkout"
                        class="rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition"
                        on:click={checkoutBundle}
                    >
                        Checkout and Exit
                    </button>
                {:else}
                    <button
                        id="checkout"
                        class="rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition"
                        on:click={checkoutSingle}
                    >
                        Checkout and Exit
                    </button>
                {/if}
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
            </div>
            <button 
                class="rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition" 
                id="ordersuccess" 
                on:click={exit}
            >
                Back to Batches
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
