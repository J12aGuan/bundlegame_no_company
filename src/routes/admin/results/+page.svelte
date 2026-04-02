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

    function toNumber(value, fallback = 0) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    }

    function formatTime(seconds) {
        const total = Math.max(0, Math.floor(toNumber(seconds, 0)));
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function getVersionMap(source, field) {
        const value = source?.[field];
        return value && typeof value === 'object' ? value : {};
    }

    function rankVersionEntry(entry = {}) {
        const confirmedAt = Date.parse(
            entry?.completionMeta?.finalSaveConfirmedAt
            || entry?.completionMeta?.handoffPostedAt
            || entry?.completionMeta?.copyVerificationAt
            || ''
        );
        const roundsCompleted = toNumber(entry?.roundsCompleted, 0);
        const totalGameTime = toNumber(entry?.totalGameTime, 0);
        const actionCount = entry?.actionsByScenarioId && typeof entry.actionsByScenarioId === 'object'
            ? Object.keys(entry.actionsByScenarioId).length
            : 0;
        return (Number.isFinite(confirmedAt) ? confirmedAt : 0) + (totalGameTime * 1000) + (roundsCompleted * 100) + actionCount;
    }

    function pickPrimaryVersionEntry(versionMap = {}) {
        const entries = Object.entries(versionMap || {}).filter(([versionId]) => String(versionId || '').trim().length > 0);
        if (entries.length === 0) return ['', {}];
        return entries
            .sort(([, left], [, right]) => rankVersionEntry(right) - rankVersionEntry(left))[0];
    }

    function hydrateUser(user) {
        const summaryMap = getVersionMap(user.summaryDoc || user.progressSummary, 'summaryByScenarioSetVersionId');
        const progressMap = getVersionMap(user.scenarioSetProgressDoc, 'progressByScenarioSetVersionId');
        const actionsMap = getVersionMap(user.scenarioActionsDoc, 'actionsByScenarioSetVersionId');
        const detailedActionsMap = getVersionMap(user.scenarioDetailedActionsDoc, 'detailedActionsByScenarioSetVersionId');
        const [primaryVersionId, primarySummary = {}] = pickPrimaryVersionEntry(summaryMap);
        const progress = progressMap?.[primaryVersionId] || {};
        const actionSummary = actionsMap?.[primaryVersionId] || {};
        const detailedActionSummary = detailedActionsMap?.[primaryVersionId] || {};
        const completionMeta = primarySummary?.completionMeta || {};
        const roundsCompleted = toNumber(primarySummary.roundsCompleted, user.uniqueSetsComplete || 0);
        const optimalChoices = toNumber(primarySummary.optimalChoices, 0);
        const totalGameTime = toNumber(primarySummary.totalGameTime, user.gametime || 0);
        const completedGame = Boolean(primarySummary.completedGame);
        const totalRounds = toNumber(primarySummary.totalRounds, 0);
        const optimalRate = roundsCompleted > 0 ? (optimalChoices / roundsCompleted) * 100 : 0;
        const hasProgress = Object.keys(progress || {}).length > 0;
        const hasActionSummary = Object.keys(actionSummary?.actionsByScenarioId || {}).length > 0;
        const hasDetailedActionSummary = Object.keys(detailedActionSummary?.actionsByScenarioId || {}).length > 0;
        let auditStatus = 'partial_firebase_data';

        if (completionMeta?.finalSaveStatus === 'recovery_required') {
            auditStatus = 'recovery_required';
        } else if (completionMeta?.finalSaveStatus === 'confirmed' && hasProgress && hasActionSummary && hasDetailedActionSummary) {
            auditStatus = completionMeta?.copyVerificationMethod && completionMeta.copyVerificationMethod !== 'none'
                ? 'fully_confirmed'
                : 'missing_copy_verification';
        } else if (completionMeta?.copyVerificationMethod && completionMeta.copyVerificationMethod !== 'none' && (!hasActionSummary || !hasDetailedActionSummary || !hasProgress)) {
            auditStatus = 'partial_firebase_data';
        }

        return {
            ...user,
            primaryVersionId,
            progressSummary: primarySummary,
            roundsCompleted,
            optimalChoices,
            totalGameTime,
            completedGame,
            totalRounds,
            optimalRate,
            completionMeta,
            auditStatus
        };
    }
    
    onMount(async () => {
        try {
            users = (await retrieveData()).map(hydrateUser);
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

    function normalizeExportValue(value) {
        if (value?.toDate && typeof value.toDate === 'function') {
            return value.toDate().toISOString();
        }
        if (Array.isArray(value)) {
            return JSON.stringify(value.map((item) => normalizeExportValue(item)));
        }
        if (value && typeof value === 'object') {
            return JSON.stringify(
                Object.fromEntries(
                    Object.entries(value).map(([key, nested]) => [key, normalizeExportValue(nested)])
                )
            );
        }
        if (value === undefined || value === null) {
            return '';
        }
        return String(value);
    }
    
    function exportResults() {
        const exportKeys = Array.from(
            sortedUsers.reduce((keys, user) => {
                Object.keys(user || {}).forEach((key) => keys.add(key));
                return keys;
            }, new Set())
        ).sort();

        const csv = [
            exportKeys,
            ...sortedUsers.map((user) => exportKeys.map((key) => normalizeExportValue(user?.[key])))
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
                                    on:click={() => toggleSort('roundsCompleted')}
                                    class="text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Rounds {sortField === 'roundsCompleted' ? (sortAsc ? '↑' : '↓') : ''}
                                </button>
                            </th>
                            <th class="px-6 py-3 text-left">
                                <button 
                                    on:click={() => toggleSort('optimalChoices')}
                                    class="text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Optimal {sortField === 'optimalChoices' ? (sortAsc ? '↑' : '↓') : ''}
                                </button>
                            </th>
                            <th class="px-6 py-3 text-left">
                                <button 
                                    on:click={() => toggleSort('totalGameTime')}
                                    class="text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Time {sortField === 'totalGameTime' ? (sortAsc ? '↑' : '↓') : ''}
                                </button>
                            </th>
                            <th class="px-6 py-3 text-left">
                                <button
                                    on:click={() => toggleSort('auditStatus')}
                                    class="text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Audit {sortField === 'auditStatus' ? (sortAsc ? '↑' : '↓') : ''}
                                </button>
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
                                    {user.roundsCompleted || 0}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {user.optimalChoices || 0} ({(user.optimalRate || 0).toFixed(0)}%)
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {formatTime(user.totalGameTime || 0)}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {user.auditStatus}
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
                    <dt class="text-sm font-medium text-gray-500 truncate">Avg Optimal Rate</dt>
                    <dd class="mt-1 text-3xl font-semibold text-gray-900">
                        {(sortedUsers.length > 0 
                            ? (sortedUsers.reduce((sum, u) => sum + (u.optimalRate || 0), 0) / sortedUsers.length).toFixed(1)
                            : 0)}%
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
                        <p class="block text-sm font-medium text-gray-700">Earnings</p>
                        <p class="text-lg text-gray-900">${selectedUser.earnings || 0}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Orders Completed</p>
                        <p class="text-lg text-gray-900">{selectedUser.ordersComplete || 0}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Rounds Completed</p>
                        <p class="text-lg text-gray-900">{selectedUser.roundsCompleted || 0}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Optimal Choices</p>
                        <p class="text-lg text-gray-900">{selectedUser.optimalChoices || 0} ({(selectedUser.optimalRate || 0).toFixed(1)}%)</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Total Game Time</p>
                        <p class="text-lg text-gray-900">{formatTime(selectedUser.totalGameTime || 0)}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Completed Game</p>
                        <p class="text-lg text-gray-900">{selectedUser.completedGame ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Audit Status</p>
                        <p class="text-lg text-gray-900">{selectedUser.auditStatus}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Scenario Version</p>
                        <p class="text-lg text-gray-900">{selectedUser.primaryVersionId || 'Unknown'}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Final Save Status</p>
                        <p class="text-lg text-gray-900">{selectedUser.completionMeta?.finalSaveStatus || 'Unknown'}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Copy Verification</p>
                        <p class="text-lg text-gray-900">{selectedUser.completionMeta?.copyVerificationMethod || 'none'}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Last Save Error</p>
                        <p class="text-sm text-gray-900 break-words">{selectedUser.completionMeta?.lastSaveError || 'None'}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Total Orders</p>
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
