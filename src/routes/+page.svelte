<script>
    import { globalError } from "$lib/globalError.js"
    import Bundlegame from "./bundlegame.svelte";
    import { game, elapsed, resetTimer, earned, currLocation, id, logAction, GameOver, authUser, orderList, ordersShown, startTimer, finishedOrders, createNewUser, needsAuth, loadGame, remainingTime, FullTimeLimit } from "$lib/bundle.js";
    import { generateCompleteId } from "$lib/firebaseDB.js";
	import Home from "./home.svelte";
	import { onMount } from "svelte";
    import { queueNFixedOrders, getDistances } from "$lib/config.js";
    import '../app.css';

    $: inSelect = $game.inSelect;
	$: inStore = $game.inStore;
    $: bundled = $game.bundled;
    let userInput = '';
    let userPass = '';

    let started = false;
    let completed = ""
    let completed2 = ""
    
    $: formattedRemaining = formatTime($remainingTime ?? $FullTimeLimit);

    function formatTime(seconds) {
        const numeric = Number(seconds);
        const s = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    
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
    <div class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div class="text-red-600 font-bold bg-red-100 p-4 rounded-xl max-w-2xl">
            ⚠️ Error: {$globalError}
        </div>
    </div>
{:else if !started && !$GameOver}
    <!-- Login Screen - Full screen delivery app style -->
    <main class="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div class="bg-white rounded-3xl shadow-2xl p-8 md:p-10 w-full max-w-md">
            <h1 class="text-center text-2xl font-semibold text-slate-900 mb-6">
                User Access
            </h1>
            
            {#if needsAuth}
                <div class="space-y-4">
                    <div class="space-y-1">
                        <label class="text-sm font-medium text-slate-700">User ID</label>
                        <input
                            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                            type="text"
                            bind:value={userInput}
                            placeholder="Enter user ID"
                        />
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm font-medium text-slate-700">Token (include dashes)</label>
                        <input
                            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                            type="password"
                            bind:value={userPass}
                            placeholder="XXXX-XXXX-XXXX"
                        />
                    </div>

                    <button
                        id="start"
                        on:click={start}
                        class="mt-4 w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition"
                    >
                        Enter Simulation
                    </button>

                    <button
                        type="button"
                        class="w-full text-center text-xs text-slate-500 hover:text-slate-700 mt-2 transition"
                        on:click={() => window.location.href = '/'}
                    >
                        Return to overview
                    </button>
                </div>
            {:else}
                <button
                    id="start"
                    on:click={startNoAuth}
                    class="w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-green-700 transition"
                >
                    Enter Simulation
                </button>
            {/if}
        </div>
    </main>
{:else}
    <!-- Game View or Game Over -->
    {#if $GameOver}
        <div class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div class="max-w-xl w-full p-6 bg-white rounded-2xl shadow-md text-center space-y-6">
                <h3 class="text-2xl font-bold text-red-600">Game Over!</h3>

                <div>
                    <h4 class="text-xl font-semibold text-gray-800">Your Stats:</h4>
                    <ul class="list-disc list-inside text-left text-gray-700 mt-2 space-y-1">
                    <li><span class="font-medium">Earnings:</span> ${$earned}</li>
                    <li><span class="font-medium">Finished Orders:</span> {$finishedOrders.length}</li>
                    </ul>
                </div>
                {#if needsAuth}
                <div class="bg-yellow-100 p-4 rounded-xl border border-yellow-400">
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
        </div>
    {:else}
        <!-- Main Game View with sticky header -->
        <div class="min-h-screen bg-slate-50">
            <header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100">
                <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-xs sm:text-sm text-slate-700 flex-wrap gap-2">
                    <span class="font-semibold text-red-600">Please do not refresh or close the page!</span>
                    <div class="flex flex-wrap gap-4">
                        <span><span class="font-semibold text-slate-900">Time left:</span> {formattedRemaining}</span>
                        <span><span class="font-semibold text-slate-900">Earned:</span> ${$earned}</span>
                        <span><span class="font-semibold text-slate-900">Location:</span> {$currLocation}</span>
                    </div>
                </div>
            </header>
            
            {#if inSelect}
                <Home />
            {:else if inStore}
                <Bundlegame />
            {/if}
        </div>
    {/if}
{/if}
