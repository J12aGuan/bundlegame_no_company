<script>
    import { onMount } from 'svelte';
    import { retrieveData, getActiveLiveSession } from '$lib/firebaseDB.js';
    
    let stats = {
        totalUsers: 0,
        totalOrders: 0,
        avgEarnings: 0,
        completedSessions: 0
    };
    let loading = true;
    let error = null;
    let activeLiveSession = null;
    
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
