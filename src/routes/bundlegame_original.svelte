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
            intervalId = setInterval(updateTip, 1000); // Run updateTimer every 1000ms (1 second)
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
        
        
        if (item == "" || item == "Entrance") {
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
        //verify if it is correct
        const selOrders = get(orders)
        let c1 = true;
        Object.keys(bag1).forEach((key) => {
            console.log(selOrders[0].items[key])
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
        //verify if it is correct
        let c1 = true;
        let c2 = true;
        //check bag1 -> order1, bag2 -> order2
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

        //check bag1 -> order1, bag2 -> order2
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
        console.log(c1)
        console.log(c2)
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

<div class="bundlegame max-w-4xl mx-auto px-6 py-4 space-y-4 text-gray-800">
    <div class="space-y-2 bg-gray-100 p-4 rounded shadow">
        <h5 class="text-lg font-semibold">{$orders[0].store}</h5>
        {#if $game.tip}
        <div class="text-lg font-semibold">Total Earnings: ${totalEarnings} (${startEarnings} + {curTip}% tip)</div>
        {:else}
        <div class="text-lg font-semibold">Total Earnings: ${totalEarnings}</div>
        {/if}
        <div class="flex flex-row text-md font-semibold">
            {#each $orders as order}
                <div class="bg-white border p-3 rounded shadow w-full md:w-1/2">
                    <p>
                        Order for {order.name}
                        <br>
                        Earnings: {order.earnings}
                    </p>
                    <ul>
                        {#each Object.keys(order.items) as item}
                            <li>{order.items[item]} - {item}</li>
                        {/each}
                    </ul>
                </div>
            {/each}
        </div>
        {#if GameState == 1 || GameState == 2}
            <p>Time spent: {endTimer}</p>
        {/if}
    </div>
    {#if GameState == 0}
        <!-- shop/browse -->
        {#if $game.bundled}
            <button class="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded transition" id="startbundle" on:click={start}>Start</button>
        {:else}
            <button class="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded transition" id="startsingle" on:click={start}>Start</button>
        {/if}
        
    {:else if GameState == 1}
        <h3 class="font-bold">Current Location: {config["locations"][curLocation[0]][curLocation[1]]}</h3>
        <div>
            <div class="flex items-center gap-2 mb-4">
                Item: <input class="border rounded px-2 py-1 w-32" bind:value={wordInput}>
                Quantities: <input class="border rounded px-2 py-1 w-8" bind:value={bag1Input}>
                {#if $game.bundled}
                    <input class="border rounded px-2 py-1 w-8" bind:value={bag2Input}>
                {/if}
                <button id="addtobag" class="bg-blue-500 hover:bg-blue-600 text-white font-medium px-3 py-1 rounded" on:click={addBag}>Add to bag</button>
            </div>
            <div class={`grid gap-3 my-4 ${gridColsClass}`}>
                {#each config["locations"] as row, rowIndex}
                    {#each row as cell, colIndex}
                        {#if rowIndex == curLocation[0] && colIndex == curLocation[1]}
                            <button id="moveinstore" class="cell rounded-md border text-sm p-3 bg-gray-100 hover:bg-gray-200 transition" class:selected={(rowIndex == curLocation[0] && colIndex == curLocation[1])} on:click={() => handleCell(cell, rowIndex, colIndex)}>
                                {cell} <p class="text-lg">{emojis[cell]}</p>
                            </button>
                        {:else}
                        <button id="moveinstore" class="cell rounded-md border text-sm p-3 bg-gray-300 hover:bg-gray-400 transition" class:selected={(rowIndex == curLocation[0] && colIndex == curLocation[1])} on:click={() => handleCell(cell, rowIndex, colIndex)}>
                            {cell} <p class="text-lg">{emojis[cell]}</p>
                        </button>
                        {/if}
                    {/each}
                {/each}
            </div>
        </div>
        {#if $game.bundled}
            <button class="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition" id="checkout" on:click={checkoutBundle}>Checkout and Exit</button>
        {:else}
            <button class="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition" id="checkout" on:click={checkoutSingle}>Checkout and Exit</button>
        {/if}
    {:else if GameState == 2}
    <h3 class="text-md font-bold">Walking to {config["locations"][curLocation[0]][curLocation[1]]}</h3>
    <h5 class="text-md">Travel Time: {dist*config["cellDistance"]/1000} seconds</h5>
    {:else if GameState == 3}
    <p class="text-green-600 font-semibold">Correct!</p>
        <button class="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition" id="ordersuccess" on:click={exit}>Go Back</button>
    {:else}
    <p class="text-red-600 font-semibold">Incorrect</p>
        <button class="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition" id="orderretry" on:click={start}>Try Again</button>
    {/if}
    <div class="flex gap-6 mt-6">
        <div>
            {#if $game.bundled}
                <h5 class="font-bold">Bag 1</h5>
            {:else}
                <h5 class="font-bold">Bag</h5>
            {/if}
            <ul class="list-disc pl-5 text-sm">
                {#each Object.keys(bag1) as key}
                    <li>{key}: {bag1[key]}</li>
                {/each}
            </ul>
        </div>
        {#if $game.bundled}
            <div>
                <h5 class="font-bold">Bag2</h5>
                <ul class="list-disc pl-5 text-sm">
                    {#each Object.keys(bag2) as key}
                        <li>{key}: {bag2[key]}</li>
                    {/each}
                </ul>
            </div>
        {/if}
    </div>
</div>