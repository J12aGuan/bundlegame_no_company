<script>
    import { orders, currLocation, gameText, orderList, game, currentRound, getCurrentScenario, gameMode } from "$lib/bundle.js"
    import { onMount, onDestroy } from 'svelte';
    import { queueNFixedOrders, storeConfig, getCityTravelInfo } from "$lib/config.js";
    import { applySharedItemBundleSavings } from "$lib/bundleTime.js";
   
    export let orderData;
    export let index;
    export let updateEarnings;
    export let disabled = false;
    let selected = false;
    let timer = 0;
    let intervalId;
    let taken = false;
    let config = storeConfig(orderData.store)

    $: scenario = getCurrentScenario($currentRound);
    $: maxBundle = scenario.max_bundle ?? 3;
    $: isTutorialRoundOne = $gameMode === 'tutorial' && $currentRound === 1;
    function getModeledOrderTimeBreakdown(orderLike, originCity = "") {
        const baseEstimate = Math.max(0, Number(orderLike?.estimatedTime) || 0);
        const destinationCity = String(orderLike?.city || "");
        const routeInfo = getCityTravelInfo(originCity, destinationCity);
        return {
            originCity: routeInfo.fromCity,
            destinationCity,
            baseEstimate,
            cityTravel: routeInfo.seconds,
            total: Math.max(0, baseEstimate + routeInfo.seconds),
            missingRoute: routeInfo.missingRoute
        };
    }

    function getModeledBundleSummary(selectedOrders = [], startCity = "") {
        let simulatedCity = String(startCity || "");
        let missingRoute = null;
        let totalCityTravel = 0;

        const orderTimes = (selectedOrders || []).map((order) => {
            const breakdown = getModeledOrderTimeBreakdown(order, simulatedCity);
            if (!missingRoute && breakdown.missingRoute) {
                missingRoute = breakdown;
            }
            totalCityTravel += breakdown.cityTravel;
            if (order?.city) {
                simulatedCity = String(order.city);
            }
            return breakdown.total;
        });

        const discounted = applySharedItemBundleSavings(
            selectedOrders,
            orderTimes,
            { getStoreConfig: (name) => storeConfig(name) }
        );

        return {
            discountedTotalTime: discounted.discountedTotalTime,
            savingsSeconds: discounted.savingsSeconds,
            totalCityTravel,
            missingRoute
        };
    }

    // `estimatedTime` is modeled base time. Cross-city travel is layered on top from the Cities matrix.
    $: modeledBreakdown = getModeledOrderTimeBreakdown(orderData, $currLocation);
    $: baseEstimateSeconds = modeledBreakdown.baseEstimate;
    $: extraCrossCitySeconds = modeledBreakdown.cityTravel;
    $: displayEstimateSeconds = Math.max(0, Math.round(modeledBreakdown.total));
    $: hasMissingCityRoute = modeledBreakdown.missingRoute;

    function updateTimer() {
        timer += 1;
        if ($game.waiting) {
            let waitingIndex = Math.floor(timer / config["waitinginterval"])
            let percentIncrease = waitingIndex < config["waiting"].length ? (1 + (config["waiting"][waitingIndex]/100)) : (config["waiting"][config["waiting"].length - 1]/100)
            orderData.earnings = Math.round(orderData.startingearnings*percentIncrease*100)/100
            updateEarnings(index, orderData.earnings);
        }
        if ($game.refresh && Number(orderData.refreshChance ?? 0) > Math.random()*100) {
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
        if (disabled) return;
        if (!selected) {
            if (isTutorialRoundOne && $orders.length >= 1) {
                alert("Round 1 of the tutorial only allows 1 order.");
                return;
            }
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

        if ($orders.length > 0) {
            const bundleSummary = getModeledBundleSummary($orders, $currLocation);
            if (bundleSummary.missingRoute) {
                const missing = bundleSummary.missingRoute;
                $gameText.selector = `Missing city route (${missing.originCity} to ${missing.destinationCity})`;
                return;
            }

            const roundedTime = Math.max(0, Math.round(bundleSummary.discountedTotalTime));
            const roundedSave = Math.max(0, Math.round(bundleSummary.savingsSeconds));
            const roundedCityTravel = Math.max(0, Math.round(bundleSummary.totalCityTravel));
            const orderLabel = `${$orders.length} ${$orders.length === 1 ? "order" : "orders"}`;
            const savingsLabel = roundedSave > 0 ? `, save ${roundedSave}s` : "";
            const cityTravelLabel = roundedCityTravel > 0 ? `, city ${roundedCityTravel}s` : "";
            $gameText.selector = `Start Picking (${orderLabel}, modeled ${roundedTime}s${cityTravelLabel}${savingsLabel})`;
        } else {
            $gameText.selector = "None selected";
        }
    }

</script>

{#if !taken}
    <div class="relative rounded-lg bg-white border transition-all cursor-pointer select-none overflow-hidden
        {disabled ? 'opacity-60 cursor-not-allowed' : ''}
        {selected ? 'ring-2 ring-green-500 shadow-md transform scale-[1.01]' : (!disabled ? 'hover:shadow-md hover:border-blue-300' : '')}"
        on:click={select}
    >
        <div class="p-2 space-y-1">
            <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-slate-800 text-sm truncate">{orderData.store}</h3>
                    <p class="text-xs text-slate-500">📍 {orderData.city}</p>
                </div>
                <div class="text-right ml-2">
                    <span class="block font-bold text-green-600 text-base">${orderData.earnings}</span>
                    <span class="block text-xs text-slate-500">⏱ modeled {displayEstimateSeconds}s</span>
                    {#if hasMissingCityRoute}
                        <span class="block text-[10px] text-amber-700">missing city route</span>
                    {:else}
                        <span class="block text-[10px] text-slate-400">
                            base {Math.round(baseEstimateSeconds)}s{extraCrossCitySeconds > 0 ? ` + city ${Math.round(extraCrossCitySeconds)}s` : ''}
                        </span>
                    {/if}
                </div>
            </div>

            <div class="bg-slate-50 rounded p-1.5 text-xs text-slate-600 space-y-0.5 max-h-[60px] overflow-y-auto">
                {#each Object.entries(orderData.items) as [item, qty]}
                    <div class="flex justify-between border-b border-slate-100 last:border-0 pb-0.5 last:pb-0">
                        <span class="truncate">{item.toLowerCase()}</span>
                        <span class="font-medium ml-1">x{qty}</span>
                    </div>
                {/each}
            </div>

            <div class="pt-1">
                <button class="w-full py-1.5 text-xs font-bold rounded-md transition-colors
                    {selected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                    {selected ? 'Selected ✓' : 'Add to Tasks'}
                </button>
            </div>
        </div>
    </div>
{/if}
