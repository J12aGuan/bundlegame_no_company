<script>
    import { onMount } from 'svelte';
    import { retrieveData, getActiveLiveSession, listQualtricsResponses, listQualtricsSyncRuns, importQualtricsResponses } from '$lib/firebaseDB.js';
    import { generateAuthToken } from '$lib/authToken.js';
    import { deriveUserRunMetrics } from '$lib/userRunMetrics.js';
    import { buildAdminScoreSheet, getAdminScoreClassAverageExportRows, getAdminScoreExportRows } from '$lib/adminScores.js';
    import { normalizeQualtricsResponsesFromCsv } from '$lib/qualtrics.js';

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
    let users = [];
    let qualtricsResponses = [];
    let qualtricsSyncRuns = [];
    let csvImporting = false;
    let csvImportMessage = '';
    let csvImportTone = 'text-slate-600';

    $: normalizedTokenUserId = tokenUserId.trim();
    $: generatedToken = normalizedTokenUserId ? generateAuthToken(normalizedTokenUserId) : '';
    $: if (generatedToken !== lastCopiedToken) {
        copyMessage = '';
        copyMessageTone = 'text-slate-600';
    }
    $: scoreSheet = buildAdminScoreSheet(users, qualtricsResponses);
    $: scoreRows = scoreSheet.rows;
    $: scoreStats = scoreSheet.stats;
    $: classAverages = scoreSheet.classAverages || {};
    $: scoreRoundColumns = Array.from({ length: scoreSheet.maxRound }, (_, index) => index + 1);
    $: latestQualtricsSync = qualtricsSyncRuns[0] || null;
    
    onMount(async () => {
        try {
            const [data, liveSession, syncedResponses, syncRuns] = await Promise.all([
                retrieveData(),
                getActiveLiveSession(),
                listQualtricsResponses(),
                listQualtricsSyncRuns()
            ]);
            users = data;
            qualtricsResponses = syncedResponses;
            qualtricsSyncRuns = syncRuns;
            stats.totalUsers = data.length;
            activeLiveSession = liveSession;
            
            let totalEarnings = 0;
            let totalOrders = 0;
            let completedCount = 0;
            
            data.forEach(user => {
                const metrics = deriveUserRunMetrics(user);
                totalEarnings += metrics.earnings || 0;
                totalOrders += (metrics.roundsCompleted || 0);
                if (metrics.completedGame) completedCount++;
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

    function formatDateTime(value = '') {
        const millis = Date.parse(String(value || ''));
        if (!Number.isFinite(millis)) return '-';
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(millis));
    }

    function formatPercent(value, digits = 1) {
        if (value == null || value === '') return '-';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '-';
        return `${(numeric * 100).toFixed(digits)}%`;
    }

    function formatNumber(value, digits = 2) {
        if (value == null || value === '') return '-';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '-';
        return numeric.toFixed(digits);
    }

    function formatTime(seconds = 0) {
        const safe = Math.max(0, Math.floor(Number(seconds) || 0));
        const mins = Math.floor(safe / 60);
        const secs = safe % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function csvEscape(value) {
        if (value == null) return '';
        if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    function downloadCsv(filename, rows = []) {
        const fieldnames = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
        const csv = [
            fieldnames.join(','),
            ...rows.map((row) =>
                fieldnames
                    .map((field) => `"${csvEscape(row?.[field]).replaceAll('"', '""')}"`)
                    .join(',')
            )
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    function exportScores() {
        downloadCsv(
            `bundlegame-scores-${new Date().toISOString().slice(0, 10)}.csv`,
            getAdminScoreExportRows(scoreRows, scoreSheet.maxRound)
        );
    }

    function exportClassAverages() {
        downloadCsv(
            `bundlegame-score-class-averages-${new Date().toISOString().slice(0, 10)}.csv`,
            getAdminScoreClassAverageExportRows(classAverages)
        );
    }

    function getRoundScore(row, round) {
        return row.roundScores?.find((entry) => entry.roundIndex === round)?.scoreRatio ?? null;
    }

    async function importQualtricsCsv(event) {
        const file = event?.currentTarget?.files?.[0] || null;
        if (!file) return;
        csvImporting = true;
        csvImportMessage = '';
        csvImportTone = 'text-slate-600';
        try {
            const csvText = await file.text();
            const parsed = normalizeQualtricsResponsesFromCsv(csvText, {
                source: 'admin_csv'
            });
            await importQualtricsResponses(parsed.completed, 'admin_csv');
            const [syncedResponses, syncRuns] = await Promise.all([
                listQualtricsResponses(),
                listQualtricsSyncRuns()
            ]);
            qualtricsResponses = syncedResponses;
            qualtricsSyncRuns = syncRuns;
            csvImportMessage = `Imported ${parsed.completed.length} completed Qualtrics rows (${parsed.matchReady.length} ready to match).`;
            csvImportTone = 'text-emerald-700';
        } catch (err) {
            console.error('Qualtrics CSV import failed:', err);
            csvImportMessage = err?.message || 'Unable to import Qualtrics CSV.';
            csvImportTone = 'text-red-700';
        } finally {
            csvImporting = false;
            if (event?.currentTarget) event.currentTarget.value = '';
        }
    }

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

        <div class="overflow-hidden rounded-lg bg-white shadow">
            <div class="border-b border-slate-200 px-4 py-5 sm:px-6">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <h3 class="text-lg font-medium text-gray-900">Scores</h3>
                        <p class="mt-1 text-sm text-gray-600">
                            Completed game runs matched to completed Qualtrics responses.
                        </p>
                        <p class="mt-2 text-xs text-gray-500">
                            Admin total = 70% outcome + 20% normalized optimal-rate + 10% normalized progress. Paper analyses should use decomposed research metrics.
                        </p>
                        <p class="mt-2 text-xs text-gray-500">
                            Run <span class="font-mono">npm run qualtrics:sync</span> after setting private Qualtrics env vars, or import a Qualtrics CSV as a fallback.
                        </p>
                    </div>
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label class="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            {csvImporting ? 'Importing...' : 'Import Qualtrics CSV'}
                            <input
                                class="sr-only"
                                type="file"
                                accept=".csv,text/csv"
                                on:change={importQualtricsCsv}
                                disabled={csvImporting}
                            />
                        </label>
                        <button
                            type="button"
                            class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            on:click={exportScores}
                            disabled={scoreRows.length === 0}
                        >
                            Export Scores CSV
                        </button>
                        <button
                            type="button"
                            class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                            on:click={exportClassAverages}
                            disabled={scoreRows.length === 0}
                        >
                            Export Class Average CSV
                        </button>
                    </div>
                </div>

                <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <p class="text-xs font-medium uppercase text-slate-500">Score Rows</p>
                        <p class="mt-1 text-2xl font-semibold text-slate-900">{scoreStats.matchedScoreCount}</p>
                    </div>
                    <div class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <p class="text-xs font-medium uppercase text-slate-500">Completed Game</p>
                        <p class="mt-1 text-2xl font-semibold text-slate-900">{scoreStats.completedGameCount}</p>
                    </div>
                    <div class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <p class="text-xs font-medium uppercase text-slate-500">Missing Qualtrics</p>
                        <p class="mt-1 text-2xl font-semibold text-slate-900">{scoreStats.missingQualtricsCount}</p>
                    </div>
                    <div class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <p class="text-xs font-medium uppercase text-slate-500">Last Sync</p>
                        <p class="mt-1 text-sm font-semibold text-slate-900">
                            {latestQualtricsSync ? formatDateTime(latestQualtricsSync.completed_at || latestQualtricsSync.started_at) : '-'}
                        </p>
                        {#if latestQualtricsSync?.status}
                            <p class="text-xs text-slate-500">{latestQualtricsSync.status}</p>
                        {/if}
                    </div>
                </div>

                {#if csvImportMessage}
                    <p class={`mt-3 text-sm ${csvImportTone}`}>{csvImportMessage}</p>
                {/if}

                <div class="mt-5 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
                    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h4 class="text-sm font-semibold text-cyan-950">Class Averages</h4>
                            <p class="text-xs text-cyan-800">Separate summary across matched students only.</p>
                        </div>
                        <p class="text-xs font-medium text-cyan-800">
                            {classAverages.matched_student_count || 0} matched students
                        </p>
                    </div>
                    <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <p class="text-xs font-medium uppercase text-cyan-700">Avg Total</p>
                            <p class="text-lg font-semibold text-cyan-950">{formatNumber(classAverages.average_total_score, 2)}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium uppercase text-cyan-700">Median Total</p>
                            <p class="text-lg font-semibold text-cyan-950">{formatNumber(classAverages.median_total_score, 2)}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium uppercase text-cyan-700">Avg Earnings</p>
                            <p class="text-lg font-semibold text-cyan-950">${formatNumber(classAverages.average_earnings, 2)}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium uppercase text-cyan-700">Avg Optimal</p>
                            <p class="text-lg font-semibold text-cyan-950">{formatPercent(classAverages.average_optimal_rate, 1)}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium uppercase text-cyan-700">Avg Rounds</p>
                            <p class="text-lg font-semibold text-cyan-950">{formatNumber(classAverages.average_rounds_completed, 2)}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium uppercase text-cyan-700">Avg Outcome</p>
                            <p class="text-lg font-semibold text-cyan-950">{formatPercent(classAverages.average_outcome_score, 1)}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium uppercase text-cyan-700">Avg Progress</p>
                            <p class="text-lg font-semibold text-cyan-950">{formatPercent(classAverages.average_progress_score, 1)}</p>
                        </div>
                        <div>
                            <p class="text-xs font-medium uppercase text-cyan-700">Avg Time</p>
                            <p class="text-lg font-semibold text-cyan-950">{formatTime(classAverages.average_total_game_time_seconds)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-200">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Student</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Total</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Performance</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Outcome</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Avg Ratio</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Optimal</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Progress</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Rounds</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Time</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Earnings</th>
                            <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Qualtrics</th>
                            {#each scoreRoundColumns as round}
                                <th class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">R{round}</th>
                            {/each}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 bg-white">
                        {#each scoreRows as row (row.participantId)}
                            <tr class="hover:bg-slate-50">
                                <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                                    <div>{row.displayName}</div>
                                    <div class="text-xs font-normal text-slate-500">{row.participantId}</div>
                                </td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">{row.totalScore}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                                    <div>{row.performanceLabel}</div>
                                    <div class="text-xs text-slate-500">{row.outcomeScoreBasis === 'average_score_ratio' ? 'round ratio' : 'earnings'} outcome</div>
                                </td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatPercent(row.outcomeScore, 0)}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatNumber(row.averageScoreRatio, 3)}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatPercent(row.optimalRate, 0)}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatPercent(row.progressScore, 0)}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.roundsCompleted}/{row.totalRounds || row.roundsCompleted}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatTime(row.totalGameTime)}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">${formatNumber(row.earnings, 2)}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                                    <div>{row.qualtricsResponseId}</div>
                                    <div class="text-xs text-slate-500">{formatDateTime(row.qualtricsRecordedAt)}</div>
                                    <div class="text-xs text-slate-500">{row.qualtricsMatchMethod === 'result_code' ? 'result code' : 'userID'} match</div>
                                </td>
                                {#each scoreRoundColumns as round}
                                    {@const roundScore = getRoundScore(row, round)}
                                    <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{roundScore == null ? '-' : formatNumber(roundScore, 3)}</td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            {#if !loading && scoreRows.length === 0}
                <div class="px-4 py-10 text-center text-sm text-slate-500">
                    No matched score rows yet. Sync or import Qualtrics responses after students complete the survey.
                </div>
            {/if}
        </div>

	    <!-- Quick Actions -->
    <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-5">
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
                    href="/admin/research"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-700 hover:bg-cyan-800"
                >
                    Research Lab
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
