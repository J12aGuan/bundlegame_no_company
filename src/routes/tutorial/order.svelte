<script>
    import { orders, currLocation, gameText, orderList, game, currentRound, getCurrentScenario } from "$lib/tutorial.js"
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

    $: totalItems = Object.values(orderData.items || {}).reduce((a, b) => a + b, 0);
    $: scenario = getCurrentScenario($currentRound);
    $: maxBundle = scenario.max_bundle ?? 3;

    function updateTimer() {
        timer += 1;
        if ($game.waiting) {
            let waitingIndex = Math.floor(timer / config["waitinginterval"])
            let percentIncrease = waitingIndex < config["waiting"].length ? (1 + (config["waiting"][waitingIndex]/100)) : (config["waiting"][config["waiting"].length - 1]/100)
            orderData.earnings = Math.round(orderData.startingearnings*percentIncrease*100)/100
            updateEarnings(index, orderData.earnings);
        }
        if ($game.refresh && orderData.demand > Math.random()*100) {
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
            setTimeout(replaceOrder, config["refresh"]*1000);
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
            intervalId = setInterval(updateTimer, 1000);
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
            if ($orders.length >= maxBundle) {
                // Silently ignore if already at max
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
        if ($orders.length > 0) {
            if ($orders[0].city == $currLocation) {
                $gameText.selector = `Go to store (${$orders.length} ${$orders.length === 1 ? 'order' : 'orders'})`
            } else {
                $gameText.selector = `Travel to ${$orders[0].city} (${$orders.length} ${$orders.length === 1 ? 'order' : 'orders'})`
            }
        } else {
            $gameText.selector = "None selected"
        }
        console.log($orders)
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if taken}
    <div class="rounded-2xl bg-red-50 border border-red-200 shadow-sm p-4">
        <p class="text-sm font-semibold text-red-800 text-center">
            🚫 {orderData.store} batch taken!
        </p>
        <p class="text-xs text-red-600 text-center mt-1">
            Waiting for new order...
        </p>
    </div>
{:else}
    <div
        id={index + "Selected" + selected}
        class="relative rounded-2xl bg-white shadow-sm border transition cursor-pointer select-none {selected ? 'ring-2 ring-green-500 shadow-md' : 'hover:shadow-md'}"
        on:click={select}
    >
        <!-- Recommendation badge -->
        {#if orderData.recommended}
            <div class="absolute top-3 right-3 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 flex items-center gap-1 shadow-sm">
                <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                Recommended
            </div>
        {/if}
        
        <div class="flex flex-col gap-3 p-4">
            <!-- Header row: store name + chips -->
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-sm font-semibold text-slate-900">
                        {orderData.store}
                    </p>
                    <p class="text-xs text-slate-500">{orderData.city}</p>
                </div>

                <div class="flex flex-wrap gap-1 justify-end {orderData.recommended ? 'mr-24' : ''}">
                    <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                        Batch
                    </span>
                    {#if orderData.demand > 0}
                        <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            High demand
                        </span>
                    {/if}
                </div>
            </div>

            <!-- Pay row -->
            <div class="flex items-baseline gap-2">
                <p class="text-xs text-slate-500">Pay</p>
                <p class="text-lg font-semibold text-slate-900">${orderData.earnings}</p>
            </div>

            <!-- Details -->
            <div class="flex justify-between gap-4">
                <div class="space-y-0.5 text-xs text-slate-600 flex-1">
                    <p>{totalItems} total items</p>
                    <p>Customer: {orderData.name}</p>
                    <p>Zone: {$currLocation}</p>
                </div>

                <div class="text-right text-xs text-slate-600 max-w-[120px]">
                    {#each Object.keys(orderData.items) as item}
                        <p class="truncate">{orderData.items[item]}x {item}</p>
                    {/each}
                </div>
            </div>

            <!-- Select button -->
            <div class="mt-2 flex justify-end">
                <button
                    class="rounded-full px-4 py-1.5 text-xs font-semibold transition {selected ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}"
                    type="button"
                >
                    {selected ? 'Selected ✓' : 'Select order'}
                </button>
            </div>
        </div>
    </div>
{/if}