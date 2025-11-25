<script>
    import { orders, currLocation, gameText, orderList, game, currentRound, getCurrentScenario } from "$lib/bundle.js"
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
            if ($orders.length >= maxBundle) return;
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
        $orders = $orders; 
    }
</script>

{#if !taken}
    <div class="relative rounded-xl bg-white border transition-all cursor-pointer select-none overflow-hidden
        {selected ? 'ring-2 ring-green-500 shadow-md transform scale-[1.02]' : 'hover:shadow-lg hover:border-blue-300'}
        {orderData.recommended ? 'border-yellow-400' : ''}"
        on:click={select}
    >
        {#if orderData.recommended}
            <div class="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10 flex items-center gap-1">
                <span>★ Recommended</span>
            </div>
        {/if}
        
        <div class="p-4 space-y-2">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-slate-800 text-sm">{orderData.store}</h3>
                    <p class="text-xs text-slate-500">{orderData.city}</p>
                </div>
                <div class="text-right mt-3">
                    <span class="block font-bold text-green-600 text-lg">${orderData.earnings}</span>
                </div>
            </div>

            <div class="bg-slate-50 rounded p-2 text-xs text-slate-600 space-y-1">
                {#each Object.entries(orderData.items) as [item, qty]}
                    <div class="flex justify-between border-b border-slate-100 last:border-0 pb-0.5 last:pb-0">
                        <span>{item}</span>
                        <span class="font-medium">x{qty}</span>
                    </div>
                {/each}
            </div>

            <div class="pt-2">
                <button class="w-full py-1.5 text-xs font-bold rounded-lg transition-colors
                    {selected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                    {selected ? 'Selected ✓' : 'Add to Bundle'}
                </button>
            </div>
        </div>
    </div>
{/if}