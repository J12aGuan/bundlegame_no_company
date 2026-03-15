<script>
    import { globalError } from "$lib/globalError.js"
    import Bundlegame from "../bundlegame.svelte";
    import { game, elapsed, resetTimer, earned, currLocation, id, logAction, GameOver, authUser, orderList, ordersShown, startTimer, finishedOrders, createNewUser, needsAuth, loadGame, remainingTime, participantResultUrl, gameMode, uniqueSets, currentRound, scenarios } from "$lib/bundle.js";
	import Home from "../home.svelte";
	import { onMount } from "svelte";
    import { queueNFixedOrders } from "$lib/config.js";
    import '../../app.css';

    function formatTime(seconds) {
        if (seconds == null) return "None";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    $: inSelect = $game.inSelect;
	$: inStore = $game.inStore;
    $: bundled = $game.bundled;
    let userInput = '';
    let userPass = '';

    let started = false;
    let authResolved = false;
    let showPracticeChoice = false;
    let practiceChoiceHandled = false;

    $: if (started && !$GameOver && $uniqueSets >= 2 && !practiceChoiceHandled) {
        showPracticeChoice = true;
    }

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

    function dismissPracticeChoice() {
        practiceChoiceHandled = true;
        showPracticeChoice = false;
    }

    async function start() {
        const auth = await authUser(userInput, userPass)
        if (auth === 1) {
            const user = await createNewUser(userInput, 'tutorial')
            if (user != -1) {
                startTimer();
                resetTimer();
                $game.inSelect = true;
                $id = userInput
                started = true;
                $orderList = queueNFixedOrders(ordersShown)
            }
        } else {
            alert("id and token do not match")
        }
    }

    async function startNoAuth() {
        const user = await loadGame('tutorial')
        if (user != -1) {
            startTimer();
            resetTimer();
            $game.inSelect = true;
            started = true;
            $orderList = queueNFixedOrders(ordersShown)
        }
    }

    function handleClick(event) {
        if ($needsAuth) {
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
        // Preload tutorial config so auth gate matches Firebase before rendering entry UI.
        loadGame('tutorial')
            .catch((err) => console.error("Tutorial preload failed:", err))
            .finally(() => {
                authResolved = true;
            });

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
    <!-- Entry Screen -->
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div class="bg-white rounded-3xl shadow-2xl px-12 py-10 w-full max-w-lg">
            <h1 class="text-3xl font-bold text-center mb-8 text-slate-900">Tutorial</h1>
            {#if !authResolved}
                <p class="text-sm text-slate-600 text-center">Loading configuration...</p>
            {:else if $needsAuth}
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
                        class="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        Enter Simulation
                    </button>
                </div>
            {:else}
                <button
                    id="start"
                    on:click={startNoAuth}
                    class="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                    Enter Simulation
                </button>
            {/if}
        </div>
    </div>
{:else}
    <!-- Game View or Game Over -->
    {#if $GameOver}
        <div class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div class="max-w-xl w-full p-8 bg-white rounded-2xl shadow-md text-center">
                <h3 class="text-2xl font-bold text-green-700">Tutorial Complete</h3>
            </div>
        </div>
    {:else}
        <div class="min-h-screen bg-slate-50">
            <header class="sticky top-0 z-50 bg-white/90 backdrop-blur shadow-sm border-b border-slate-200">
                <div class="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
                    <div class="text-sm font-semibold text-red-600">Do not refresh or close the page!</div>
                    {#if started}
                        <div class="flex items-center gap-4 text-sm">
                            <div class="flex items-center gap-1.5">
                                <span class="text-slate-700">Round:</span>
                                <span class="font-semibold text-slate-900">{$currentRound} / {$scenarios.length || 0}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-slate-700">Time:</span>
                                <span class="font-mono font-semibold text-green-600">{$gameMode === 'tutorial' ? 'None' : formatTime($remainingTime)}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-slate-700">Earned:</span>
                                <span class="font-mono font-semibold text-green-600">${$earned}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-slate-700">Location:</span>
                                <span class="text-slate-900">{$currLocation}</span>
                            </div>
                        </div>
                    {/if}
                </div>
            </header>
            
            <!-- Main content with bg -->
            <div class="min-h-screen bg-slate-50 py-6">
                {#if inSelect}
                    <Home />
                {:else if inStore}
                    <Bundlegame />
                {/if}
            </div>

            {#if showPracticeChoice}
                <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4">
                    <div class="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">
                        <h2 class="text-2xl font-bold text-slate-900">You finished 2 tutorial rounds</h2>
                        <p class="mt-3 text-base leading-7 text-slate-600">
                            You may now move on to the Qualtrics survey, or continue playing if you would like more practice.
                        </p>
                        <div class="mt-6 flex justify-end">
                            <button
                                type="button"
                                class="rounded-2xl bg-slate-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
                                on:click={dismissPracticeChoice}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
{/if}
