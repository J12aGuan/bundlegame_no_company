<script>
    import { onMount } from 'svelte';
    import { retrieveData } from '$lib/firebaseDB.js';
    
    let users = [];
    let loading = true;
    let error = null;
    let filterText = '';
    let sortField = 'id';
    let sortAsc = true;
    let selectedUser = null;
    
    onMount(async () => {
        try {
            users = await retrieveData();
            loading = false;
        } catch (err) {
            console.error('Error loading results:', err);
            error = err.message;
            loading = false;
        }
    });
    
    $: filteredUsers = users.filter(u => 
        u.id.toLowerCase().includes(filterText.toLowerCase())
    );
    
    $: sortedUsers = [...filteredUsers].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
    });
    
    function toggleSort(field) {
        if (sortField === field) {
            sortAsc = !sortAsc;
        } else {
            sortField = field;
            sortAsc = true;
        }
    }
    
    function exportResults() {
        const csv = [
            ['ID', 'Earnings', 'Orders Complete', 'Unique Sets', 'Configuration', 'Created At'],
            ...sortedUsers.map(u => [
                u.id,
                u.earnings || 0,
                u.ordersComplete || 0,
                u.uniqueSetsComplete || 0,
                u.configuration || '-',
                u.createdAt?.toDate?.().toISOString() || '-'
            ])
        ]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }
</script>

<div class="space-y-6">
    <div class="flex justify-between items-center">
        <div>
            <h2 class="text-2xl font-bold text-gray-900">Experiment Results</h2>
            <p class="mt-1 text-sm text-gray-600">Participant results and performance data</p>
        </div>
        <button 
            on:click={exportResults}
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
            Export CSV
        </button>
    </div>
    
    {#if loading}
        <div class="text-center py-12">
            <div class="text-gray-600">Loading results...</div>
        </div>
    {:else if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error: {error}
        </div>
    {:else}
        <!-- Search and Filter -->
        <div class="bg-white shadow rounded-lg p-4">
            <input 
                type="text" 
                placeholder="Search by participant ID..."
                bind:value={filterText}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
        
        <!-- Results Table -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left">
                                <button 
                                    on:click={() => toggleSort('id')}
                                    class="text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    ID {sortField === 'id' ? (sortAsc ? '↑' : '↓') : ''}
                                </button>
                            </th>
                            <th class="px-6 py-3 text-left">
                                <button 
                                    on:click={() => toggleSort('earnings')}
                                    class="text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Earnings {sortField === 'earnings' ? (sortAsc ? '↑' : '↓') : ''}
                                </button>
                            </th>
                            <th class="px-6 py-3 text-left">
                                <button 
                                    on:click={() => toggleSort('ordersComplete')}
                                    class="text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Orders {sortField === 'ordersComplete' ? (sortAsc ? '↑' : '↓') : ''}
                                </button>
                            </th>
                            <th class="px-6 py-3 text-left">
                                <button 
                                    on:click={() => toggleSort('uniqueSetsComplete')}
                                    class="text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Unique Sets {sortField === 'uniqueSetsComplete' ? (sortAsc ? '↑' : '↓') : ''}
                                </button>
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Config
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        {#each sortedUsers as user (user.id)}
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {user.id}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    ${user.earnings || 0}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {user.ordersComplete || 0}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {user.uniqueSetsComplete || 0}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    Config {user.configuration !== undefined ? user.configuration : '-'}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <button 
                                        on:click={() => selectedUser = user}
                                        class="text-blue-600 hover:text-blue-900"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            {#if sortedUsers.length === 0}
                <div class="text-center py-12 text-gray-600">
                    No participants found
                </div>
            {/if}
        </div>
        
        <!-- Results Summary -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Participants</dt>
                    <dd class="mt-1 text-3xl font-semibold text-gray-900">{sortedUsers.length}</dd>
                </div>
            </div>
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Earnings</dt>
                    <dd class="mt-1 text-3xl font-semibold text-gray-900">
                        ${(sortedUsers.reduce((sum, u) => sum + (u.earnings || 0), 0)).toFixed(2)}
                    </dd>
                </div>
            </div>
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Avg Earnings</dt>
                    <dd class="mt-1 text-3xl font-semibold text-gray-900">
                        ${(sortedUsers.length > 0 
                            ? (sortedUsers.reduce((sum, u) => sum + (u.earnings || 0), 0) / sortedUsers.length).toFixed(2)
                            : 0)}
                    </dd>
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Detail Modal -->
    {#if selectedUser}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Participant: {selectedUser.id}</h3>
                
                <div class="space-y-3 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Earnings</label>
                        <p class="text-lg text-gray-900">${selectedUser.earnings || 0}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Orders Completed</label>
                        <p class="text-lg text-gray-900">{selectedUser.ordersComplete || 0}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Unique Sets Completed</label>
                        <p class="text-lg text-gray-900">{selectedUser.uniqueSetsComplete || 0}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Configuration</label>
                        <p class="text-lg text-gray-900">Config {selectedUser.configuration !== undefined ? selectedUser.configuration : '-'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Total Orders</label>
                        <p class="text-lg text-gray-900">{selectedUser.orders?.length || 0}</p>
                    </div>
                </div>
                
                <button 
                    on:click={() => selectedUser = null}
                    class="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                    Close
                </button>
            </div>
        </div>
    {/if}
</div>
