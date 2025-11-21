<script>
    import { globalError } from "$lib/globalError.js"
    import Bundlegame from "./bundlegame.svelte";
    import { game, elapsed, resetTimer, earned, currLocation, id, logAction, GameOver, authUser, orderList, ordersShown, startTimer, finishedOrders, createNewUser, needsAuth, loadGame, remainingTime, FullTimeLimit } from "$lib/tutorial.js";
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

{#if $globalError}
    <div class="container mx-auto px-4 py-6">
        <div class="text-red-600 font-bold bg-red-100 p-4 rounded">
            ⚠️ Error: {$globalError}
        </div>
    </div>
{:else if !started && !$GameOver}
    <!-- Login Screen - Full screen -->
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div class="bg-white rounded-3xl shadow-2xl px-12 py-10 w-full max-w-lg">
            <h1 class="text-3xl font-bold text-center mb-8 text-slate-900">User Access</h1>
            
            {#if needsAuth}
                <div class="space-y-5">
                    <div>
                        <label class="block text-base font-medium text-slate-700 mb-2">User ID</label>
                        <input
                            class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            type="text"
                            bind:value={userInput}
                            placeholder="Enter user ID"
                        />
                    </div>

                    <div>
                        <label class="block text-base font-medium text-slate-700 mb-2">Token (include dashes)</label>
                        <input
                            class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            type="password"
                            bind:value={userPass}
                            placeholder="XXXX-XXXX-XXXX"
                        />
                    </div>

                    <button
                        id="start"
                        on:click={start}
                        class="w-full mt-6 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        Enter Simulation
                    </button>

                    <button
                        type="button"
                        class="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition mt-3"
                        on:click={() => window.location.href = '/'}
                    >
                        Return to overview
                    </button>
                </div>
            {:else}
                <button
                    id="start"
                    on:click={startNoAuth}
                    class="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                    Enter Simulation
                </button>
            {/if}
        </div>
    </div>
{:else}
    <!-- Game View or Game Over - Container layout -->
    <div class="container mx-auto px-4 py-6">
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
            <!-- Main Game View -->
            <div class="mt-2 mb-4 flex flex-wrap items-center gap-6 text-base">
                <span class="font-semibold text-red-600">Please do not refresh or close the page!</span>

                {#if started}
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-slate-700">Time left:</span>
                        <span class="font-mono text-lg text-indigo-600">{$remainingTime}s</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-slate-700">Earned:</span>
                        <span class="font-mono text-lg text-green-600">${$earned}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-slate-700">Location:</span>
                        <span class="text-slate-900">{$currLocation}</span>
                    </div>
                {/if}
            </div>
            
            {#if inSelect}
                <Home />
            {:else if inStore}
                <Bundlegame />
            {/if}
        {/if}
    </div>
{/if}