<script>
    import { globalError } from "$lib/globalError.js"
    import Bundlegame from "./bundlegame.svelte";
    import { game, elapsed, resetTimer, earned, currLocation, id, logAction, GameOver, authUser, orderList, ordersShown, startTimer, finishedOrders, createNewUser, needsAuth, loadGame } from "$lib/tutorial.js";
    import { generateCompleteId } from "$lib/firebaseDB.js";
	import Home from "./home.svelte";
	import { onMount } from "svelte";
    import { queueNFixedOrders, getDistances } from "$lib/config.js";
    import '../../app.css';

    $: inSelect = $game.inSelect;
	$: inStore = $game.inStore;
    $: bundled = $game.bundled;
    let userInput = '';
    let userPass = '';

    let started = false;
    let completed = ""
    let completed2 = ""
    async function start() {
        const auth = await authUser(userInput, userPass)
        if (auth === 1) {
            const user = await createNewUser(userInput)
            if (user != -1) {
                startTimer();
                resetTimer();
                $game.inSelect = true;
                $id = userInput
                started = true;
                $orderList = queueNFixedOrders(ordersShown)
                completed = generateCompleteId(userInput)
                completed2 = user
            }
        } else {
            alert("id and token do not match")
        }
        
    }

    async function startNoAuth() {
        const user = await loadGame()
        if (user != -1) {
            startTimer();
            resetTimer();
            $game.inSelect = true;
            started = true;
            $orderList = queueNFixedOrders(ordersShown)
        }
    }

    function handleClick(event) {
        if (needsAuth) {
            if (event.target.id === 'start' || event.target.id === 'addtobag') {
                return;
            }
            if (event.target.tagName == 'BUTTON') {
                let action = {
                    buttonID: event.target.id,
                    buttonContent: event.target.textContent.trim()
                }
                logAction(action)
            } else if (event.target.classList.contains("order-content")) {
                let action = {
                    buttonID: event.target.id,
                    buttonContent: event.target.textContent.trim()
                }
                logAction(action)
            }
        }
    }

    onMount(() => {
        window.addEventListener('click', handleClick)
        return () => {
            console.log("listener removed")
            window.removeEventListener('click', handleClick);
        };
    })
</script>

<div class="container mx-auto px-4 py-6">
{#if $globalError}
    <div class="text-red-600 font-bold bg-red-100 p-4 rounded">
        ⚠️ Error: {$globalError}
    </div>
{:else}
    {#if $GameOver}
        <div class="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md text-center space-y-6">
            <h3 class="text-2xl font-bold text-red-600">Game Over!</h3>

            <div>
                <h4 class="text-xl font-semibold text-gray-800">Your Stats:</h4>
                <ul class="list-disc list-inside text-left text-gray-700 mt-2 space-y-1">
                <li><span class="font-medium">Earnings:</span> ${$earned}</li>
                <li><span class="font-medium">Finished Orders:</span> {$finishedOrders.length}</li>
                </ul>
            </div>
            {#if needsAuth}
            <div class="bg-yellow-100 p-4 rounded border border-yellow-400">
                <h3 class="text-lg font-semibold text-yellow-800 mb-2">
                Please copy the following two codes back into the Qualtrics survey:
                </h3>
                <p class="text-gray-800">
                <span class="font-semibold">Code #1:</span><span class="text-blue-600 font-mono">{completed}</span>
                </p>
                <p class="text-gray-800">
                <span class="font-semibold">Code #2:</span><span class="text-blue-600 font-mono">{completed2}</span>
                </p>
            </div>

            <h5 class="text-sm text-gray-600">
                You may close this page once you have successfully continued to the next step in the survey.
            </h5>
            {/if}
        </div>
    {:else}
        <h4 class="font-bold py-2">Please do not refresh or close the page!</h4>
        {#if started}
            {#if $elapsed}
            <p><b>Time</b>: {$elapsed}s</p>
            {:else}
            <p><b>Time</b>: 0s</p>
            {/if}
            <p><b>Earned</b>: ${$earned}</p>
            <p><b>Location</b>: {$currLocation}</p>
        {/if}
        {#if !started}
            {#if needsAuth}
                <div class="flex flex-col gap-2 items-start">
                    <p>Input your ID</p>
                    <input class="w-1/4 border rounded" type="text" bind:value={userInput} placeholder="Enter" />
                    <p>Input your token (include dashes)</p>
                    <input class="w-1/4 border rounded" type="password" bind:value={userPass} placeholder="Enter" />
                    <button class="w-1/4 px-4 py-2 bg-green-600 hover:bg-green-700 text-sm font-medium rounded-md shadow-sm transition" id="start" onclick={start}>Start</button>
                </div>
            {:else}
                <button class="w-1/4 px-4 py-2 bg-green-600 hover:bg-green-700 text-sm font-medium rounded-md shadow-sm transition" id="start" onclick={startNoAuth}>Start</button>
            {/if}
        {:else if inSelect}
            <Home />
        {:else if inStore}
            <Bundlegame />
        {/if}
    {/if}
{/if}
</div>