<script>
    import { orders, currLocation, gameText, orderList, game } from "$lib/tutorial.js"
    import { onMount, onDestroy } from 'svelte';
    import { queueNFixedOrders, storeConfig } from "$lib/config.js";
   
    export let orderData;
    export let index;
    export let updateEarnings;
    let selected = false;
    let timer = 0;
    let intervalId;
    let taken = false;
    let config = storeConfig(orderData.store)
    
    $: totalItems = Object.values(orderData.items).reduce((sum, qty) => sum + qty, 0);

    function updateTimer() {
        timer += 1; // Increment timer by 1 second (or any other logic)
        //percent increase based on waiting
        if ($game.waiting) {
            let waitingIndex = Math.floor(timer / config["waitinginterval"])
            let percentIncrease = waitingIndex < config["waiting"].length ? (1 + (config["waiting"][waitingIndex]/100)) : (config["waiting"][config["waiting"].length - 1]/100)
            orderData.earnings = Math.round(orderData.startingearnings*percentIncrease*100)/100
            updateEarnings(index, orderData.earnings);
        }
        if ($game.refresh && orderData.demand > Math.random()*100) {
            //order taken!

            //unselect if selected
            if (selected) {
                for (let i=0; i<$orders.length; i++) {
                    if ($orders[i].id == orderData.id) {
                        $orders.splice(i, 1)
                        break;
                    }
                }
                selected = false
            }
            taken = true
            //remove from orderList and add a new one
            setTimeout(replaceOrder, config["refresh"]*1000); // TODO: maybe make this amount of time customizable?
        }
    }

    function replaceOrder() {
        clearInterval(intervalId);
        $orderList = [...$orderList, ...queueNFixedOrders(1)]
        
        $orderList.splice(index, 1)
    }

    onMount(() => {
        if ($game.waiting || $game.refresh) {
            timer = 0
            config = storeConfig(orderData.store)
        
            intervalId = setInterval(updateTimer, 1000); // Run updateTimer every 1000ms (1 second)
        }
    });

    onDestroy(() => {
        if ($game.waiting || $game.refresh) {
            clearInterval(intervalId);
            timer = 0
        }
    });

    
    function select() {
        if (!selected) {
            //selects it
            if ($orders.length >= 2) {
                return;
            }
            $orders.push(orderData)
            selected = true
        } else {
            for (let i=0; i<$orders.length; i++) {
                if ($orders[i].id == orderData.id) {
                    $orders.splice(i, 1)
                    break;
                }
            }
            selected = false
        }
        //change text
        if ($orders.length > 0) {
            if ($orders[0].city == $currLocation) {
                $gameText.selector = "Go to store"
            } else {
                $gameText.selector = "Travel to " + $orders[0].city + ". Then go to store"
            }
        } else {
            $gameText.selector = "None selected"
        }
        console.log($orders)
    }
</script>

<!-- Instacart-style order card -->
<button 
    on:click={select}
    disabled={taken}
    id={index + "Selected" + selected}
    class="group w-full text-left rounded-2xl border-2 bg-white shadow-sm transition-all hover:shadow-md {selected ? 'ring-2 ring-green-500 border-green-300' : 'border-slate-200'} {taken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
>
    <div class="p-4 space-y-3">
        <!-- Header -->
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <span class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Batch</span>
                    {#if orderData.demand && orderData.demand > 70}
                        <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">High demand</span>
                    {/if}
                </div>
                <h3 class="text-sm font-semibold text-slate-900">{orderData.store}</h3>
                <p class="text-xs text-slate-600 mt-0.5">{orderData.city}</p>
            </div>
            <div class="text-right">
                <p class="text-lg font-bold text-slate-900">${orderData.earnings}</p>
            </div>
        </div>

        {#if taken}
            <div class="rounded-lg bg-red-50 border border-red-200 p-2 text-center">
                <p class="text-xs font-semibold text-red-700">Order taken! Waiting for replacement...</p>
            </div>
        {:else}
            <!-- Customer & Items -->
            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-600">Customer: <span class="font-medium text-slate-900">{orderData.name}</span></span>
                    <span class="text-slate-600">{totalItems} items</span>
                </div>
                
                <div class="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                    {#each Object.entries(orderData.items) as [item, qty]}
                        <p class="py-0.5">{qty}× {item}</p>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</button>