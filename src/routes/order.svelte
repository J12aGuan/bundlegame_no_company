<script>
    import { orders, currLocation, gameText, orderList, game } from "$lib/bundle.js"
    import { onMount, onDestroy } from 'svelte';
    import { queueNFixedOrders, storeConfig } from "$lib/config.js";
   
    export let orderData;
    export let index;
    export let updateEarnings;
    let selected = false;
    let timer = 0; // Timer value
    let intervalId; // To store the interval ID for cleanup
    let taken = false;
    let config = storeConfig(orderData.store)

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

<style>
    .order {
        margin: 2px;
        display: flex;
    }

    .order-content {
        width: 300px;
        height: 180px;
        text-align: center;
        border-radius: 3px; /* Rounded corners */
    }
    .unselected {
        background-color: darkgray;
    }
    .selected {
        background-color: gray;
    }
    .header {
        margin-top: 0.5em;
        margin-bottom: 0em;
    }
    .innerText {
        margin-top: 0.2em;
        margin-bottom: 0em;
    }
    .headerTaken {
        margin-top: 0.5em;
        margin-bottom: 0em;
        color: red;
    }
</style>

<div class="order">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
    {#if taken}
    <div class="order-content unselected">
        <p class="headerTaken">{orderData.store} for {orderData.name} taken! Please wait for a new order</p>
        <div style="display: inline;">
            <div style="float:left">
                <p class="innerText">$ {orderData.earnings}</p>
                <p class="innerText">{orderData.city}</p>
            </div>
            <div style="float:right">
                <p class="innerText">
                {#each Object.keys(orderData.items) as item}
                    {orderData.items[item]} - {item}<br>
                {/each}
                </p>
            </div>
        </div>
    </div>
    {:else}
        
     
    <div id={index + "Selected" + selected} 
    class="w-full max-w-sm mx-auto p-4 rounded-md shadow-md cursor-pointer select-none transition-all border border-gray-400" class:bg-gray-400={selected}
    class:bg-gray-300={!selected} on:click={select}>
        <p class="text-lg font-semibold text-center mb-2">{orderData.store} for {orderData.name}</p>
        <div class="flex justify-between text-sm text-gray-800">
            <div>
                <p class="mb-1 font-medium">$ {orderData.earnings}</p>
                <p>{orderData.city}</p>
            </div>
            <div class="text-right">
                <p>
                {#each Object.keys(orderData.items) as item}
                    {orderData.items[item]} - {item}<br>
                {/each}
                </p>
            </div>
        </div>
    </div>
    {/if}
</div>