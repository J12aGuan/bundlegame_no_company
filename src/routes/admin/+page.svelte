<script>
    import { onMount } from 'svelte';
    import { retrieveData, getActiveLiveSession } from '$lib/firebaseDB.js';
    import { generateAuthToken } from '$lib/authToken.js';
    
    let stats = {
        totalUsers: 0,
        totalOrders: 0,
        avgEarnings: 0,
        completedSessions: 0
    };
    let loading = true;
    let error = null;
    let activeLiveSession = null;
    let tokenUserId = '';
    let copyMessage = '';
    let copyMessageTone = 'text-slate-600';
    let lastCopiedToken = '';

    $: normalizedTokenUserId = tokenUserId.trim();
    $: generatedToken = normalizedTokenUserId ? generateAuthToken(normalizedTokenUserId) : '';
    $: if (generatedToken !== lastCopiedToken) {
        copyMessage = '';
        copyMessageTone = 'text-slate-600';
    }
    
    onMount(async () => {
        try {
            const [data, liveSession] = await Promise.all([
                retrieveData(),
                getActiveLiveSession()
            ]);
            stats.totalUsers = data.length;
            activeLiveSession = liveSession;
            
            let totalEarnings = 0;
            let totalOrders = 0;
            let completedCount = 0;
            
            data.forEach(user => {
                totalEarnings += user.earnings || 0;
                totalOrders += (user.ordersComplete || 0);
                if (user.ordersComplete > 0) completedCount++;
            });
            
            stats.totalOrders = totalOrders;
            stats.avgEarnings = stats.totalUsers > 0 ? (totalEarnings / stats.totalUsers).toFixed(2) : 0;
            stats.completedSessions = completedCount;
            
            loading = false;
        } catch (err) {
            console.error('Error loading stats:', err);
            error = err.message;
            loading = false;
        }
    });

    async function copyGeneratedToken() {
        if (!generatedToken) return;
        try {
            await navigator.clipboard.writeText(generatedToken);
            lastCopiedToken = generatedToken;
            copyMessage = 'Token copied to clipboard.';
            copyMessageTone = 'text-emerald-600';
        } catch (err) {
            console.error('Unable to copy generated token:', err);
            lastCopiedToken = generatedToken;
            copyMessage = 'Copy failed. You can still highlight and copy the token manually.';
            copyMessageTone = 'text-amber-600';
        }
    }
</script>

<div class="space-y-6">
    <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:px-6">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 class="text-lg font-medium text-gray-900">System Overview</h2>
                    <p class="mt-1 text-sm text-gray-500">Real-time experiment statistics</p>
                </div>
                <a
                    href="/admin/live"
                    class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                    {#if activeLiveSession?.sessionId}
                        Open Live Class Leaderboard
                    {:else}
                        Start Live Class Leaderboard
                    {/if}
                </a>
            </div>
        </div>
    </div>

    <div class="overflow-hidden rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow">
        <div class="px-4 py-5 sm:px-6">
            <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div class="max-w-2xl">
                    <h3 class="text-lg font-medium text-slate-900">User Token Generator</h3>
                    <p class="mt-1 text-sm text-slate-600">
                        Enter any username to generate the deterministic access token used by the game login screen.
                    </p>
                </div>
                <div class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    Admin Helper
                </div>
            </div>

            <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div>
                    <label class="block text-sm font-medium text-slate-700" for="token-user-id">Username</label>
                    <input
                        id="token-user-id"
                        bind:value={tokenUserId}
                        class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        type="text"
                        placeholder="Enter username"
                        autocomplete="off"
                        spellcheck="false"
                    />
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700" for="generated-token">Generated Token</label>
                    <input
                        id="generated-token"
                        class="mt-1 w-full rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm tracking-[0.18em] text-emerald-300 shadow-sm focus:outline-none"
                        type="text"
                        value={generatedToken}
                        readonly
                        placeholder="Token appears here"
                    />
                </div>

                <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    on:click={copyGeneratedToken}
                    disabled={!generatedToken}
                >
                    Copy Token
                </button>
            </div>

            <div class="mt-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p class="text-slate-500">
                    {#if generatedToken}
                        Login pair: <span class="font-medium text-slate-700">{normalizedTokenUserId}</span> / <span class="font-mono text-slate-900">{generatedToken}</span>
                    {:else}
                        Enter a username to generate its login token.
                    {/if}
                </p>
                {#if copyMessage}
                    <p class={copyMessageTone}>{copyMessage}</p>
                {/if}
            </div>
        </div>
    </div>
    
    {#if loading}
        <div class="text-center py-12">
            <div class="text-gray-600">Loading statistics...</div>
        </div>
    {:else if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error: {error}
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div class="overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 shadow">
                <div class="px-4 py-5 sm:p-6 text-white">
                    <dt class="text-sm font-medium text-slate-200 truncate">Live Class Session</dt>
                    <dd class="mt-2 text-2xl font-semibold">
                        {#if activeLiveSession?.sessionId}
                            Active
                        {:else}
                            Inactive
                        {/if}
                    </dd>
                    <p class="mt-2 text-sm text-slate-200/90">
                        {#if activeLiveSession?.sessionId}
                            {activeLiveSession.label || activeLiveSession.sessionId}
                        {:else}
                            Start a session before class to capture only tomorrow’s players.
                        {/if}
                    </p>
                </div>
            </div>

            <!-- Total Users Card -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Participants</dt>
                    <dd class="mt-1 text-3xl font-semibold text-gray-900">{stats.totalUsers}</dd>
                </div>
            </div>
            
            <!-- Total Orders Card -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Orders Completed</dt>
                    <dd class="mt-1 text-3xl font-semibold text-gray-900">{stats.totalOrders}</dd>
                </div>
            </div>
            
            <!-- Average Earnings Card -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Avg Earnings per User</dt>
                    <dd class="mt-1 text-3xl font-semibold text-gray-900">${stats.avgEarnings}</dd>
                </div>
            </div>
            
            <!-- Completed Sessions Card -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Completed Sessions</dt>
                    <dd class="mt-1 text-3xl font-semibold text-gray-900">{stats.completedSessions}</dd>
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Quick Actions -->
    <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <a 
                    href="/admin/live"
                    class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-900 hover:bg-slate-800"
                >
                    Live Class
                </a>
                <a 
                    href="/admin/results"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                    View Results
                </a>
                <a 
                    href="/admin/analysis"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    View Analysis
                </a>
                <a 
                    href="/"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                    Play Game
                </a>
            </div>
        </div>
    </div>
</div>

<style>
    :global(body) {
        background-color: #f9fafb;
    }
</style>
