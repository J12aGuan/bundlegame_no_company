<script>
    import { get } from 'svelte/store';
    import { game, orders, gameText, currLocation, logOrder, logBundledOrder, orderList, ordersShown, thinkTime } from "$lib/tutorial.js";
    import { queueNFixedOrders, getDistances } from "$lib/config.js";
    import Order from "./order.svelte";
    import { onMount, onDestroy } from "svelte";

    let waiting = false;
    $: distances = getDistances($currLocation);
    let duration = 0;
    let travelingTo = ""
    let thinking = false;
    let thinkRemaining = thinkTime;
    let thinkInterval;

    function start() {
        const selOrders = get(orders)
        const curGame = get(game)
        const curLoc = get(currLocation)
        if (selOrders.length < 1) {
            alert("Please select 1 or 2 orders!")
            return;
        }
        if (selOrders.length > 1) {
            if (selOrders[0].store != selOrders[1].store || selOrders[0].city != selOrders[1].city) {
                alert("Cannot bundle different stores/cities!")
                return;
            }
            curGame.bundled = true;
        } else {
            curGame.bundled = false;
        }

        const selOrderIds = selOrders.map(order => order["id"])
        let temp = $orderList.filter(order => !selOrderIds.includes(order["id"]));
        temp = temp.map(order => {
            return { ...order, "expire": order["expire"] - 1 };
        });
        temp = temp.filter(order => order.expire > 0);
        console.log(temp)
        $orderList = [...temp, ...queueNFixedOrders(ordersShown-temp.length)]

        if (selOrders[0].city != curLoc) {
            travel(selOrders[0].city, true)
        } else {
            gameWindow()
        }
    }

    function travel(city, visitStore) {
        //find index of city
        let index = distances["destinations"].indexOf(city)
        if (index == -1) {
            return;
        }
        duration = distances["distances"][index]
        waiting = true;
        travelingTo = city;
        setTimeout(() => {
            waiting = false;
            currLocation.set(city)
            if (visitStore) {
                gameWindow()
            } else {
                $orders.splice(0, 2)
                distances = getDistances(city)
                $gameText.selector = "None selected"
            }
        }, duration * 1000)
    }

    function gameWindow() {
        const selOrders = get(orders)
        if (get(game).bundled) {
            logBundledOrder(selOrders[0], selOrders[1], selOrders)
        } else {
            logOrder(selOrders[0], selOrders)
        }
        $game.inStore = true;
        $game.inSelect= false;
    }
    function updateEarnings(index, newEarnings) {
        console.log("updated: " + index + " " + newEarnings)
        orderList.update(list => {
            list[index].earnings = newEarnings;
            return list;
        });
    }

    onMount(() => {
        thinking = true;
        thinkRemaining = thinkTime;

        thinkInterval = setInterval(() => {
            thinkRemaining -= 1;
            if (thinkRemaining <= 0) {
                clearInterval(thinkInterval);
                thinking = false;
            }
        }, 1000);
    });

    onDestroy(() => {
        if (thinkInterval) {
            clearInterval(thinkInterval);
        }
    });
</script>

<style>

</style>
{#if $game.inSelect}

<main class="mx-auto max-w-5xl px-4 space-y-6">
    {#if waiting}
        <div class="rounded-2xl bg-blue-50 border border-blue-200 p-6 text-center space-y-2">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
                <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </div>
            <h3 class="text-base font-semibold text-blue-900">Traveling to {travelingTo}</h3>
            <p class="text-sm text-blue-700">Travel time: {duration}s</p>
        </div>
    {:else}
        {#if thinking}
            <div class="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
                <p class="text-sm font-semibold text-green-900">You have {thinkRemaining}s to look through available orders</p>
            </div>
        {/if}
        
        <div class="grid md:grid-cols-2 gap-4">
            {#each $orderList as order, i (order.id)}
                <Order orderData={order} index={i} updateEarnings={updateEarnings}/>
            {/each}
        </div>
        
        {#if !thinking}
            <div class="flex justify-center py-4">
                <button 
                    class="rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition" 
                    id="startorder" 
                    on:click={start}
                >
                    {$gameText.selector}
                </button>
            </div>
            
            {#if distances}
                <div class="flex justify-center gap-3 flex-wrap">
                    {#each distances["destinations"] as dest}
                        <button 
                            class="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm" 
                            id="travel" 
                            on:click={() => travel(dest, false)}
                        >
                            Travel to {dest}
                        </button>
                    {/each}
                </div>
            {/if}
        {/if}
    {/if}
</main>
{/if}