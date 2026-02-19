<script>
    import { onMount } from 'svelte';
    import { retrieveData, getCounter } from '$lib/firebaseDB.js';
    
    let stats = {
        totalUsers: 0,
        totalOrders: 0,
        avgEarnings: 0,
        completedSessions: 0
    };
    let loading = true;
    let error = null;
    
    onMount(async () => {
        try {
            const data = await retrieveData();
            stats.totalUsers = data.length;
            
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
            <h2 class="text-lg font-medium text-gray-900">System Overview</h2>
            <p class="mt-1 text-sm text-gray-500">Real-time experiment statistics</p>
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
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <a 
                    href="/admin/experiments"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                    Manage Experiments
                </a>
                <a 
                    href="/admin/results"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                    View Results
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
