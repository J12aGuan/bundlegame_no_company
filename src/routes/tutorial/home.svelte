<script>
    import { get } from 'svelte/store';
    import { game, orders, gameText, currLocation, logOrder, logBundledOrder, orderList, ordersShown, thinkTime, toggleTime } from "$lib/tutorial.js";
    import { queueNFixedOrders, getDistances } from "$lib/config.js";
    import Order from "./order.svelte";
    import { onMount } from "svelte";

    let waiting = false;
    $: distances = getDistances($currLocation);
    let duration = 0;
    let travelingTo = ""
    let thinking = false;

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
        thinking = true
        toggleTime()
        setTimeout(() => {
            thinking = false
            toggleTime()
        }, thinkTime*1000) //ten second wait time
    });
</script>

<style>

</style>
{#if $game.inSelect}

{#if waiting}
    <p class="text-lg font-medium text-gray-700 my-4">Traveling to {travelingTo}. Travel duration: {duration}</p>
{:else}
    {#if thinking}
    <p class="text-blue-600 font-semibold my-4">Game timer stopped! Take {thinkTime} free seconds to look through the available orders</p>
    {/if}
    <div class="grid grid-cols-2 gap-4 mb-6">
        {#each $orderList as order, i (order.id)}
            <Order orderData={order} index={i} updateEarnings={updateEarnings}/>
        {/each}
    </div>
    <div class="flex flex-row justify-center items-center">
        {#if !thinking}
        <button class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition" id="startorder" on:click={start}>{$gameText.selector}</button>
        {/if}
    </div>
    {#if !thinking}
    {#if distances}
    <div class="flex flex-row justify-center items-center">
        {#each distances["destinations"] as dest}
            <button class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-sm font-medium rounded-md shadow-sm transition" id="travel" on:click={() => travel(dest, false)}>Travel to {dest}</button>
        {/each}
    </div>
    {/if}
    {/if}
{/if}
{/if}