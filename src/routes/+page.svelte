<script>
    import Bundlegame from "./bundlegame.svelte";
    import { game, resetTimer, earned, currLocation, id, GameOver, authUser, orderList, ordersShown, startTimer, completedOrdersCount, createNewUser, needsAuth, loadGame, remainingTime, FullTimeLimit, participantResultUrl, currentRound, scenarios, saveProgressAndEndSession, resumeElapsedSeconds, completionState, recordResultCodeVerification, retryFinalResultsSave, resendRecoveryCompletionPayload } from "$lib/bundle.js";
	import Home from "./home.svelte";
	import { onMount } from "svelte";
    import { queueNFixedOrders } from "$lib/config.js";
    import '../app.css';

    $: inSelect = $game.inSelect;
	$: inStore = $game.inStore;
    $: bundled = $game.bundled;
    $: canSaveProgress = started && inSelect && !$game.penaltyTriggered && !$GameOver && !savingProgress;
    $: completionPhase = $completionState?.phase || 'idle';
    $: completionPayload = $completionState?.payload || {};
    $: completionReason = $completionState?.reason || '';
    $: resultCode = displayResultCode($participantResultUrl);
    $: copyVerificationMethod = completionPayload.copyVerificationMethod || 'none';
    $: if (!resultCode || completionPhase === 'saving') {
        copyStatus = 'idle';
        copyErrorMessage = '';
        copyActionMessage = '';
    }
    $: if (copyVerificationMethod !== 'none' && copyStatus === 'idle') {
        copyStatus = 'confirmed';
    }
    let userInput = '';
    let userPass = '';

    let started = false;
    let authResolved = false;
    let savingProgress = false;
    let copyStatus = 'idle';
    let copyErrorMessage = '';
    let copyActionMessage = '';
    let resultCodeField;
    let recordingCode = false;
    let retryingFinalSave = false;
    let resendingBackup = false;

    function focusResultCodeField() {
        resultCodeField?.focus?.();
        resultCodeField?.select?.();
    }
    
    async function copyResultCode() {
        if (!resultCode) return;
        copyStatus = 'copying';
        copyErrorMessage = '';
        copyActionMessage = '';
        try {
            await navigator.clipboard.writeText(resultCode);
            copyStatus = 'copied';
            copyActionMessage = 'Result code copied. Please still keep it as a backup.';
            await recordResultCodeVerification('clipboard_success');
        } catch (err) {
            copyStatus = 'manual_required';
            copyErrorMessage = 'Copy was blocked by Qualtrics or browser permissions. Please copy the code manually from the field below.';
            focusResultCodeField();
        }
    }

    function displayResultCode(url) {
        if (!url) return '';
        const queryIndex = url.indexOf('?');
        return queryIndex >= 0 ? url.slice(queryIndex + 1) : url;
    }

    async function confirmResultCodeRecorded() {
        if (!resultCode) return;
        recordingCode = true;
        copyErrorMessage = '';
        copyActionMessage = '';
        try {
            await recordResultCodeVerification(copyStatus === 'copied' ? 'clipboard_success' : 'manual_confirm');
            copyStatus = 'confirmed';
            copyActionMessage = 'Thanks. We recorded that you kept the result code.';
        } catch (err) {
            copyErrorMessage = err?.message || 'Unable to store the verification signal right now, but you can still continue with the code shown above.';
        } finally {
            recordingCode = false;
        }
    }

    async function retryFinalSave() {
        retryingFinalSave = true;
        copyErrorMessage = '';
        copyActionMessage = '';
        try {
            await retryFinalResultsSave();
        } catch (err) {
            copyErrorMessage = err?.message || 'Retrying the final Firebase save failed.';
        } finally {
            retryingFinalSave = false;
        }
    }

    async function resendBackupPayload() {
        resendingBackup = true;
        copyErrorMessage = '';
        copyActionMessage = '';
        try {
            await resendRecoveryCompletionPayload();
            copyActionMessage = 'Backup completion payload sent to the parent survey again.';
        } catch (err) {
            copyErrorMessage = err?.message || 'Unable to resend the backup completion payload right now.';
        } finally {
            resendingBackup = false;
        }
    }

    function returnToSignIn() {
        userInput = '';
        userPass = '';
        started = false;
        authResolved = true;
        savingProgress = false;
        copyStatus = 'idle';
        copyErrorMessage = '';
        copyActionMessage = '';
        recordingCode = false;
        retryingFinalSave = false;
        resendingBackup = false;
        participantResultUrl.set('');
        id.set('');
        completionState.set({
            phase: 'idle',
            reason: '',
            saveStatus: '',
            saveAttempts: 0,
            error: '',
            payload: null,
            retryRequest: null,
            recoveryPosted: false
        });
        GameOver.set(false);
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

    function statusTone(type = '') {
        if (type === 'success') return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
        if (type === 'warning') return 'text-amber-800 bg-amber-50 border border-amber-200';
        return 'text-slate-700 bg-slate-50 border border-slate-200';
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

{#if !started && !$GameOver}
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
                        <label class="text-sm font-medium text-slate-700" for="main-user-id">User ID</label>
                        <input
                            id="main-user-id"
                            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                            type="text"
                            bind:value={userInput}
                            placeholder="Enter user ID"
                        />
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm font-medium text-slate-700" for="main-user-token">Token (include dashes)</label>
                        <input
                            id="main-user-token"
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
                {#if completionPhase === 'saving'}
                    <h3 class="text-2xl font-bold text-slate-900">Saving Final Results</h3>
                    <p class="text-sm leading-6 text-slate-600">
                        Please keep this page open while we confirm the final Firebase save and survey handoff.
                    </p>
                    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
                        <p class="text-sm text-slate-700">
                            Attempt {$completionState?.saveAttempts || 0} of 3 in progress.
                        </p>
                    </div>
                {:else}
                    <h3 class="text-2xl font-bold {completionPhase === 'recovery' ? 'text-amber-700' : 'text-red-600'}">
                        {completionPhase === 'recovery'
                            ? 'Backup Submission Ready'
                            : completionReason === 'all_rounds_complete'
                                ? 'Results Saved'
                                : 'Game Over!'}
                    </h3>

                    <div>
                        <h4 class="text-xl font-semibold text-gray-800">Your Stats:</h4>
                        <ul class="list-disc list-inside text-left text-gray-700 mt-2 space-y-1">
                        <li><span class="font-medium">Earnings:</span> ${$earned}</li>
                        <li><span class="font-medium">Finished Orders:</span> {$completedOrdersCount}</li>
                        </ul>
                    </div>

                    <div class={`rounded-xl p-4 text-left ${statusTone(completionPhase === 'recovery' ? 'warning' : 'success')}`}>
                        <p class="text-sm font-semibold">
                            {completionPhase === 'recovery'
                                ? 'We could not fully confirm the final Firebase save. A backup completion payload has been prepared for Qualtrics.'
                                : completionPhase === 'ready'
                                    ? 'Firebase save confirmed. Qualtrics handoff can happen automatically, and the code below remains as your backup.'
                                    : 'Keep the result code below for your survey submission.'}
                        </p>
                        {#if completionPayload?.saveError}
                            <p class="mt-2 text-xs leading-5">
                                Last save error: {completionPayload.saveError}
                            </p>
                        {/if}
                    </div>

                    {#if resultCode}
                    <div class="bg-slate-100 p-4 rounded-xl border border-slate-200 text-left space-y-3">
                        <div>
                            <h3 class="text-lg font-semibold text-slate-900 mb-2">Participant Result Code</h3>
                            <p class="text-sm text-slate-600">
                                Keep this code as a second verification, even if Qualtrics receives the result automatically.
                            </p>
                        </div>
                        <textarea
                            bind:this={resultCodeField}
                            class="w-full min-h-[88px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                            readonly
                            on:focus={focusResultCodeField}
                            on:click={focusResultCodeField}
                        >{resultCode}</textarea>
                        <div class="grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                class="rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
                                on:click={copyResultCode}
                            >
                                {copyStatus === 'copying' ? 'Copying...' : 'Copy Result Code'}
                            </button>
                            <button
                                type="button"
                                class="rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition disabled:opacity-60"
                                on:click={confirmResultCodeRecorded}
                                disabled={recordingCode || copyVerificationMethod !== 'none' || copyStatus === 'confirmed'}
                            >
                                {recordingCode
                                    ? 'Recording...'
                                    : copyVerificationMethod !== 'none' || copyStatus === 'confirmed'
                                        ? 'Code Recorded'
                                        : 'I Recorded This Code'}
                            </button>
                        </div>
                        {#if copyActionMessage}
                            <p class="text-sm text-emerald-700">{copyActionMessage}</p>
                        {/if}
                        {#if copyErrorMessage}
                            <p class="text-sm text-amber-700">{copyErrorMessage}</p>
                        {/if}
                    </div>
                    {/if}

                    {#if completionPhase === 'recovery'}
                        <div class="grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                class="rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition"
                                on:click={retryFinalSave}
                            >
                                {retryingFinalSave ? 'Retrying Save...' : 'Retry Firebase Save'}
                            </button>
                            <button
                                type="button"
                                class="rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                                on:click={resendBackupPayload}
                            >
                                {resendingBackup ? 'Sending Backup...' : 'Send Backup Again'}
                            </button>
                        </div>
                    {/if}

                    <button
                        type="button"
                        class="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                        on:click={returnToSignIn}
                    >
                        Back to Sign In
                    </button>
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

            {#if completionPhase === 'saving'}
                <div class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4">
                    <div class="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl text-center space-y-4">
                        <h2 class="text-2xl font-bold text-slate-900">Saving Final Results</h2>
                        <p class="text-sm leading-6 text-slate-600">
                            Please keep this page open while we confirm the final Firebase save and prepare the Qualtrics handoff.
                        </p>
                        <p class="text-sm font-medium text-slate-700">
                            Attempt {$completionState?.saveAttempts || 0} of 3
                        </p>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
{/if}
