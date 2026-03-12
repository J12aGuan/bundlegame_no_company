<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { getParticipantResultSummary } from '$lib/firebaseDB.js';
    import '../../app.css';

    let loading = true;
    let error = '';
    let summary = null;
    let userId = '';

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

    onMount(async () => {
        try {
            userId = $page.url.searchParams.get('userId') || '';
            const accessKey = $page.url.searchParams.get('key') || '';

            if (!userId || !accessKey) {
                error = 'Invalid or expired result link.';
                return;
            }

            summary = await getParticipantResultSummary(userId, accessKey);
            if (!summary) {
                error = 'Invalid or expired result link.';
            }
        } catch (err) {
            console.error('Error loading participant result:', err);
            error = err?.message || 'Unable to load result.';
        } finally {
            loading = false;
        }
    });
</script>

<div class="min-h-screen bg-black flex items-center justify-center px-4 py-8">
    <div class="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        {#if loading}
            <p class="text-center text-slate-600">Loading result...</p>
        {:else if error}
            <div class="space-y-3 text-center">
                <h1 class="text-2xl font-bold text-red-600">Result Unavailable</h1>
                <p class="text-slate-600">{error}</p>
            </div>
        {:else}
            <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Participant: {userId}</h3>
                <div class="space-y-3 mb-6">
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Earnings</p>
                        <p class="text-lg text-gray-900">${toNumber(summary.earnings, 0)}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Rounds Completed</p>
                        <p class="text-lg text-gray-900">{toNumber(summary.roundsCompleted, 0)}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Optimal Choices</p>
                        <p class="text-lg text-gray-900">
                            {toNumber(summary.optimalChoices, 0)}
                            {#if toNumber(summary.roundsCompleted, 0) > 0}
                                <span class="text-gray-500">
                                    ({((toNumber(summary.optimalChoices, 0) / toNumber(summary.roundsCompleted, 0)) * 100).toFixed(1)}%)
                                </span>
                            {/if}
                        </p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Total Game Time</p>
                        <p class="text-lg text-gray-900">{formatTime(summary.totalGameTime)}</p>
                    </div>
                    <div>
                        <p class="block text-sm font-medium text-gray-700">Completed Game</p>
                        <p class="text-lg text-gray-900">{summary.completedGame ? 'Yes' : 'No'}</p>
                    </div>
                </div>
                <a
                    href="/"
                    class="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-center"
                >
                    Close
                </a>
            </div>
        {/if}
    </div>
</div>
