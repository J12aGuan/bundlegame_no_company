<script>
    import { globalError } from "$lib/globalError.js"
    import Bundlegame from "./bundlegame.svelte";
    import { game, elapsed, resetTimer, earned, currLocation, id, GameOver, authUser, orderList, ordersShown, startTimer, completedOrdersCount, createNewUser, needsAuth, loadGame, remainingTime, FullTimeLimit, participantResultUrl, currentRound, scenarios, saveProgressAndEndSession, resumeElapsedSeconds } from "$lib/bundle.js";
	import Home from "./home.svelte";
	import { onMount } from "svelte";
    import { queueNFixedOrders } from "$lib/config.js";
    import '../app.css';

    $: inSelect = $game.inSelect;
	$: inStore = $game.inStore;
    $: bundled = $game.bundled;
    $: canSaveProgress = started && inSelect && !$game.penaltyTriggered && !$GameOver && !savingProgress;
    let userInput = '';
    let userPass = '';

    let started = false;
    let authResolved = false;
    let savingProgress = false;
    
    async function copyResultCode() {
        const resultCode = displayResultCode($participantResultUrl);
        if (!resultCode) return;
        try {
            await navigator.clipboard.writeText(resultCode);
        } catch (err) {
            console.error('Failed to copy result code:', err);
        }
    }

    function displayResultCode(url) {
        if (!url) return '';
        const queryIndex = url.indexOf('?');
        return queryIndex >= 0 ? url.slice(queryIndex + 1) : url;
    }

    async function saveAndExit() {
        if (!inSelect || $game.penaltyTriggered) {
            alert("Progress can only be saved from the main order selection screen when no penalty is active.");
            return;
        }
        try {
            savingProgress = true;
            await saveProgressAndEndSession();
        } catch (err) {
            console.error('Save progress failed:', err);
            alert(`Unable to save progress: ${err?.message || 'Unknown error'}`);
        } finally {
            savingProgress = false;
        }
    }
    
    $: formattedRemaining = formatTime($remainingTime ?? $FullTimeLimit);

    function formatTime(seconds) {
        const numeric = Number(seconds);
        const safe = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
        const wholeSeconds = Math.floor(safe);
        const mins = Math.floor(wholeSeconds / 60);
        const secs = wholeSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    
    async function start() {
        try {
            const auth = await authUser(userInput, userPass)
            if (auth === 1) {
                const user = await createNewUser(userInput)
                if (user != -1) {
                    startTimer();
                    resetTimer($resumeElapsedSeconds);
                    game.update((g) => ({ ...g, inSelect: true, inStore: false }));
                    $id = userInput
                    started = true;
                    $orderList = queueNFixedOrders($ordersShown)
                    return;
                }
            }
            alert("id and token do not match")
        } catch (err) {
            console.error("Start failed:", err);
            alert(`Unable to enter simulation: ${err?.message || "Unknown error"}`);
        }
    }

    async function startNoAuth() {
        try {
            const user = await loadGame()
            if (user != -1) {
                startTimer();
                resetTimer();
                game.update((g) => ({ ...g, inSelect: true, inStore: false }));
                started = true;
                $orderList = queueNFixedOrders($ordersShown)
                return;
            }
            alert("Unable to load game configuration.");
        } catch (err) {
            console.error("Start (no auth) failed:", err);
            alert(`Unable to enter simulation: ${err?.message || "Unknown error"}`);
        }
    }

    onMount(() => {
        // Preload main config so auth gate reflects Firebase before rendering login UI.
        loadGame()
            .catch((err) => console.error("Main preload failed:", err))
            .finally(() => {
                authResolved = true;
            });
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
            
            {#if !authResolved}
                <p class="text-sm text-slate-600 text-center">Loading configuration...</p>
            {:else if $needsAuth}
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
                    <li><span class="font-medium">Finished Orders:</span> {$completedOrdersCount}</li>
                    </ul>
                </div>
                {#if $participantResultUrl}
                <div class="bg-slate-100 p-4 rounded-xl border border-slate-200 text-left">
                    <h3 class="text-lg font-semibold text-slate-900 mb-2">Participant Result Code</h3>
                    <p class="break-all text-sm text-slate-700 font-mono">{displayResultCode($participantResultUrl)}</p>
                    <p class="mt-2 text-sm text-slate-600">
                        Copy this code into the Qualtrics survey submission.
                    </p>
                    <button
                        type="button"
                        class="mt-3 w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
                        on:click={copyResultCode}
                    >
                        Copy Result Code
                    </button>
                </div>
                {/if}
            </div>
        </div>
    {:else}
        <!-- Main Game View with sticky header -->
        <div class="min-h-screen bg-slate-50">
            <header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100">
                <div class="flex items-center justify-between px-4 py-3 text-xs sm:text-sm text-slate-700 flex-wrap gap-2">
                    <span class="font-semibold text-red-600">Please do not refresh or close the page!</span>
                    <div class="flex flex-wrap gap-4">
                        <span><span class="font-semibold text-slate-900">Round:</span> {$currentRound} / {$scenarios.length || 0}</span>
                        <span><span class="font-semibold text-slate-900">Time left:</span> {formattedRemaining}</span>
                        <span><span class="font-semibold text-slate-900">Earned:</span> ${$earned}</span>
                        <span><span class="font-semibold text-slate-900">Location:</span> {$currLocation}</span>
                        <button
                            id="saveprogress"
                            type="button"
                            class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
                            on:click={saveAndExit}
                            disabled={!canSaveProgress}
                            title={!inSelect || $game.penaltyTriggered ? 'Return to the main order selection screen after penalty to save progress' : ''}
                        >
                            {savingProgress ? 'Saving...' : 'Save Progress'}
                        </button>
                    </div>
                </div>
            </header>
            
            <div class="min-h-screen bg-slate-50 py-4">
                {#if inSelect}
                    <Home />
                {:else if inStore}
                    <Bundlegame />
                {/if}
            </div>
        </div>
    {/if}
{/if}
