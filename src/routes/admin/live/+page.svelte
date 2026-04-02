<script>
	import { onMount, tick } from 'svelte';
	import Chart from 'chart.js/auto';
	import {
		getCentralConfig,
		getScenarioDatasetBundle,
		startLiveSession,
		endLiveSession,
		subscribeToActiveLiveSession,
		subscribeToLiveSessionParticipants
	} from '$lib/firebaseDB.js';

	let loading = true;
	let actionLoading = false;
	let error = '';
	let success = '';
	let activeSession = null;
	let participants = [];
	let sessionDefaults = {
		label: '',
		scenarioSetName: '',
		scenarioSetVersionId: ''
	};
	let sessionLabelDraft = '';
	let leaderboardCanvas;
	let leaderboardChart = null;
	let unsubscribeActiveSession = () => {};
	let unsubscribeParticipants = () => {};

	function toNumber(value, fallback = 0) {
		const numeric = Number(value);
		return Number.isFinite(numeric) ? numeric : fallback;
	}

	function toMillis(value = '') {
		const normalized = String(value ?? '').trim();
		if (!normalized) return 0;
		const millis = Date.parse(normalized);
		return Number.isFinite(millis) ? millis : 0;
	}

	function formatMoney(value = 0) {
		return `$${toNumber(value, 0).toFixed(2)}`;
	}

	function formatDateTime(value = '') {
		const millis = toMillis(value);
		if (!millis) return '—';
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(millis));
	}

	function formatRelativeTime(value = '') {
		const millis = toMillis(value);
		if (!millis) return 'No update yet';
		const diffSeconds = Math.max(0, Math.round((Date.now() - millis) / 1000));
		if (diffSeconds < 60) return `${diffSeconds}s ago`;
		const diffMinutes = Math.floor(diffSeconds / 60);
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		const diffHours = Math.floor(diffMinutes / 60);
		return `${diffHours}h ago`;
	}

	function formatRuntime(seconds = 0) {
		const total = Math.max(0, Math.floor(toNumber(seconds, 0)));
		const mins = Math.floor(total / 60);
		const secs = total % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function buildDefaultLabel() {
		return `Class Session ${new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date())}`;
	}

	function normalizeParticipant(participant = {}) {
		const normalizedStatus = String(participant?.status ?? '').trim() || 'joined';
		return {
			participantId: String(participant?.participantId ?? '').trim(),
			displayName: String(participant?.displayName ?? participant?.participantId ?? '').trim() || 'Unknown',
			earnings: Math.max(0, toNumber(participant?.earnings, 0)),
			roundsCompleted: Math.max(0, toNumber(participant?.roundsCompleted, 0)),
			optimalChoices: Math.max(0, toNumber(participant?.optimalChoices, 0)),
			totalGameTime: Math.max(0, toNumber(participant?.totalGameTime, 0)),
			completedGame: Boolean(participant?.completedGame),
			status: normalizedStatus,
			joinedAt: String(participant?.joinedAt ?? '').trim(),
			lastActivityAt: String(participant?.lastActivityAt ?? '').trim(),
			finalizedAt: String(participant?.finalizedAt ?? '').trim()
		};
	}

	function compareParticipants(left, right) {
		if (right.earnings !== left.earnings) return right.earnings - left.earnings;
		if (right.roundsCompleted !== left.roundsCompleted) return right.roundsCompleted - left.roundsCompleted;
		if (left.totalGameTime !== right.totalGameTime) return left.totalGameTime - right.totalGameTime;
		return left.displayName.localeCompare(right.displayName);
	}

	function statusLabel(status = '') {
		switch (String(status ?? '').trim()) {
			case 'completed':
				return 'Completed';
			case 'in_progress':
				return 'In Progress';
			default:
				return 'Joined';
		}
	}

	function statusClasses(status = '') {
		switch (String(status ?? '').trim()) {
			case 'completed':
				return 'border-emerald-200 bg-emerald-50 text-emerald-700';
			case 'in_progress':
				return 'border-sky-200 bg-sky-50 text-sky-700';
			default:
				return 'border-amber-200 bg-amber-50 text-amber-700';
		}
	}

	async function loadSessionDefaults() {
		try {
			const centralConfig = await getCentralConfig();
			const datasetId = String(centralConfig?.scenario_set ?? 'experiment').trim() || 'experiment';
			const datasetBundle = await getScenarioDatasetBundle(datasetId);
			sessionDefaults = {
				label: buildDefaultLabel(),
				scenarioSetName: String(datasetBundle?.metadata?.datasetName ?? datasetId ?? '').trim() || datasetId,
				scenarioSetVersionId: String(datasetBundle?.metadata?.scenarioSetVersionId ?? '').trim()
			};
			if (!sessionLabelDraft) {
				sessionLabelDraft = sessionDefaults.label;
			}
		} catch (loadError) {
			console.error('Unable to load live-session defaults:', loadError);
			sessionDefaults = {
				label: buildDefaultLabel(),
				scenarioSetName: 'experiment',
				scenarioSetVersionId: ''
			};
			if (!sessionLabelDraft) {
				sessionLabelDraft = sessionDefaults.label;
			}
		}
	}

	function destroyChart() {
		if (!leaderboardChart) return;
		try {
			leaderboardChart.destroy();
		} catch {
			// no-op
		}
		leaderboardChart = null;
	}

	function renderLeaderboardChart() {
		destroyChart();
		if (!leaderboardCanvas || rankedParticipants.length === 0) return;
		const topEntries = rankedParticipants.slice(0, 10);
		leaderboardChart = new Chart(leaderboardCanvas, {
			type: 'bar',
			data: {
				labels: topEntries.map((participant) => participant.displayName),
				datasets: [
					{
						label: 'Earnings',
						data: topEntries.map((participant) => participant.earnings),
						backgroundColor: topEntries.map((_, index) => {
							if (index === 0) return '#f59e0b';
							if (index === 1) return '#94a3b8';
							if (index === 2) return '#fb7185';
							return '#38bdf8';
						}),
						borderRadius: 12,
						borderSkipped: false
					}
				]
			},
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: '#0f172a',
						titleColor: '#f8fafc',
						bodyColor: '#e2e8f0',
						callbacks: {
							label(context) {
								return ` ${formatMoney(context.parsed.x)}`;
							}
						}
					}
				},
				scales: {
					x: {
						grid: { color: 'rgba(148, 163, 184, 0.18)' },
						ticks: {
							color: '#475569',
							callback(value) {
								return formatMoney(value);
							}
						}
					},
					y: {
						grid: { display: false },
						ticks: {
							color: '#0f172a',
							font: {
								family: 'IBM Plex Mono, monospace',
								size: 11
							}
						}
					}
				}
			}
		});
	}

	function resetParticipantSubscription() {
		unsubscribeParticipants?.();
		unsubscribeParticipants = () => {};
	}

	function attachParticipantSubscription(sessionId = '') {
		resetParticipantSubscription();
		if (!sessionId) {
			participants = [];
			destroyChart();
			return;
		}
		unsubscribeParticipants = subscribeToLiveSessionParticipants(sessionId, async (nextParticipants, subscriptionError) => {
			if (subscriptionError) {
				error = subscriptionError?.message || 'Unable to stream leaderboard participants.';
				return;
			}
			participants = Array.isArray(nextParticipants) ? nextParticipants.map(normalizeParticipant) : [];
			await tick();
			renderLeaderboardChart();
		});
	}

	async function startSessionNow() {
		actionLoading = true;
		error = '';
		success = '';
		try {
			await loadSessionDefaults();
			const nextSession = await startLiveSession({
				label: String(sessionLabelDraft ?? '').trim() || sessionDefaults.label,
				scenarioSetName: sessionDefaults.scenarioSetName,
				scenarioSetVersionId: sessionDefaults.scenarioSetVersionId
			});
			sessionLabelDraft = nextSession.label || sessionDefaults.label;
			success = 'Live class session started.';
		} catch (startError) {
			error = startError?.message || 'Unable to start the live class session.';
		} finally {
			actionLoading = false;
		}
	}

	async function endSessionNow() {
		if (!activeSession?.sessionId) return;
		actionLoading = true;
		error = '';
		success = '';
		try {
			await endLiveSession(activeSession.sessionId);
			success = 'Live class session ended.';
		} catch (endError) {
			error = endError?.message || 'Unable to end the live class session.';
		} finally {
			actionLoading = false;
		}
	}

	onMount(() => {
		void loadSessionDefaults().then(() => {
			unsubscribeActiveSession = subscribeToActiveLiveSession(async (session, subscriptionError) => {
				if (subscriptionError) {
					error = subscriptionError?.message || 'Unable to stream live class session state.';
				}
				activeSession = session;
				if (!activeSession?.sessionId) {
					participants = [];
					sessionLabelDraft = sessionDefaults.label;
				}
				attachParticipantSubscription(activeSession?.sessionId || '');
				loading = false;
				await tick();
				renderLeaderboardChart();
			});
		});

		return () => {
			unsubscribeActiveSession?.();
			resetParticipantSubscription();
			destroyChart();
		};
	});

	$: rankedParticipants = [...participants].sort(compareParticipants).map((participant, index) => ({
		...participant,
		rank: index + 1
	}));

	$: podiumParticipants = [
		rankedParticipants[1] || null,
		rankedParticipants[0] || null,
		rankedParticipants[2] || null
	];

	$: leaderboardSummary = {
		totalJoined: rankedParticipants.length,
		inProgress: rankedParticipants.filter((participant) => participant.status === 'in_progress').length,
		completed: rankedParticipants.filter((participant) => participant.status === 'completed' || participant.completedGame).length,
		totalEarnings: rankedParticipants.reduce((sum, participant) => sum + participant.earnings, 0)
	};

	$: chartSignature = `${activeSession?.sessionId || 'none'}:${rankedParticipants
		.map((participant) => `${participant.participantId}:${participant.earnings}:${participant.roundsCompleted}:${participant.totalGameTime}`)
		.join('|')}`;

	$: if (leaderboardCanvas && chartSignature) {
		void tick().then(() => {
			renderLeaderboardChart();
		});
	}
</script>

<div class="space-y-6">
	<div class="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 shadow-2xl">
		<div class="grid gap-6 px-6 py-8 text-white lg:grid-cols-[1.6fr,1fr] lg:px-8">
			<div class="space-y-4">
				<div class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
					<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
					Live Class Leaderboard
				</div>
				<div>
					<h2 class="text-3xl font-black tracking-tight">Project the class standings in real time.</h2>
					<p class="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
						Start a live class session before tomorrow’s run. Only students who enter while this session is active will appear on the board.
						The planned duration is 20 minutes, but the session never auto-removes students or stops updating until you end it here.
					</p>
				</div>
				<div class="grid gap-3 sm:grid-cols-4">
					<div class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-300">Joined</p>
						<p class="mt-2 text-3xl font-black">{leaderboardSummary.totalJoined}</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-300">In Progress</p>
						<p class="mt-2 text-3xl font-black">{leaderboardSummary.inProgress}</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-300">Completed</p>
						<p class="mt-2 text-3xl font-black">{leaderboardSummary.completed}</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-300">Class Total</p>
						<p class="mt-2 text-3xl font-black">{formatMoney(leaderboardSummary.totalEarnings)}</p>
					</div>
				</div>
			</div>

			<div class="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs uppercase tracking-[0.22em] text-slate-300">Session Control</p>
						<h3 class="mt-2 text-xl font-bold">
							{#if activeSession?.sessionId}
								{activeSession.label || activeSession.sessionId}
							{:else}
								No Live Session Running
							{/if}
						</h3>
					</div>
					<span class={`rounded-full px-3 py-1 text-xs font-semibold ${activeSession?.sessionId ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-slate-200'}`}>
						{activeSession?.sessionId ? 'Active' : 'Idle'}
					</span>
				</div>

				<div class="mt-5 space-y-4">
					<label class="block text-sm font-medium text-slate-100" for="live-session-label">Session label</label>
					<input
						id="live-session-label"
						type="text"
						bind:value={sessionLabelDraft}
						class="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
						placeholder="Class Session"
						disabled={Boolean(activeSession?.sessionId)}
					/>

					<div class="grid gap-3 sm:grid-cols-2">
						<button
							type="button"
							class="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
							on:click={startSessionNow}
							disabled={actionLoading || Boolean(activeSession?.sessionId)}
						>
							{actionLoading && !activeSession?.sessionId ? 'Starting…' : 'Start Class Session'}
						</button>
						<button
							type="button"
							class="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
							on:click={endSessionNow}
							disabled={actionLoading || !activeSession?.sessionId}
						>
							{actionLoading && activeSession?.sessionId ? 'Ending…' : 'End Class Session'}
						</button>
					</div>

					<div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
						<p><span class="font-semibold text-white">Dataset:</span> {sessionDefaults.scenarioSetName || 'Unknown'}</p>
						<p class="mt-1"><span class="font-semibold text-white">Version:</span> {sessionDefaults.scenarioSetVersionId || 'Unavailable'}</p>
						<p class="mt-1"><span class="font-semibold text-white">Planned duration:</span> 20 minutes</p>
						{#if activeSession?.startedAt}
							<p class="mt-1"><span class="font-semibold text-white">Started:</span> {formatDateTime(activeSession.startedAt)}</p>
						{/if}
						<p class="mt-3 text-xs text-slate-400">
							Students stay on this leaderboard until you end the session manually. The 20-minute duration is informational only.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	{#if error}
		<div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
			{success}
		</div>
	{/if}

	{#if loading}
		<div class="rounded-3xl bg-white p-10 text-center text-slate-600 shadow">Loading live class dashboard...</div>
	{:else if !activeSession?.sessionId}
		<div class="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
			<h3 class="text-2xl font-bold text-slate-900">No active class session</h3>
			<p class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
				Start the session here before class begins. Only students who enter while that session is active will be added to the live leaderboard,
				so old historical data will stay out of tomorrow’s board automatically.
			</p>
		</div>
	{:else}
		<div class="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
			<section class="rounded-3xl bg-white p-6 shadow">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Leaderboard Graph</p>
						<h3 class="mt-1 text-2xl font-bold text-slate-900">Top earners live</h3>
					</div>
					<p class="text-xs font-medium text-slate-500">Streaming current session data</p>
				</div>
				<div class="mt-6 h-[360px]">
					{#if rankedParticipants.length > 0}
						<canvas bind:this={leaderboardCanvas}></canvas>
					{:else}
						<div class="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
							Waiting for students to join this class session...
						</div>
					{/if}
				</div>
			</section>

			<section class="space-y-6">
				<div class="rounded-3xl bg-white p-6 shadow">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Podium</p>
							<h3 class="mt-1 text-2xl font-bold text-slate-900">Class ranking</h3>
						</div>
						<p class="text-xs font-medium text-slate-500">Sorted by earnings</p>
					</div>

					<div class="mt-6 grid gap-4 md:grid-cols-3">
						{#each podiumParticipants as participant, index}
							<div class={`rounded-3xl p-5 ${index === 1 ? 'bg-gradient-to-br from-amber-200 via-amber-100 to-white border border-amber-300 shadow-lg' : 'border border-slate-200 bg-slate-50'}`}>
								<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									{index === 1 ? '1st' : index === 0 ? '2nd' : '3rd'}
								</p>
								{#if participant}
									<p class="mt-4 text-xl font-black text-slate-900">{participant.displayName}</p>
									<p class="mt-2 text-3xl font-black text-slate-950">{formatMoney(participant.earnings)}</p>
									<p class="mt-2 text-sm text-slate-600">
										{participant.roundsCompleted} rounds • {participant.optimalChoices} optimal
									</p>
								{:else}
									<p class="mt-6 text-sm text-slate-500">No student in this podium slot yet.</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div class="rounded-3xl bg-white p-6 shadow">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">In The Game</p>
							<h3 class="mt-1 text-2xl font-bold text-slate-900">Current class roster</h3>
						</div>
						<p class="text-xs font-medium text-slate-500">Students remain listed until you end the session.</p>
					</div>

					{#if rankedParticipants.length === 0}
						<div class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
							No students have joined this session yet.
						</div>
					{:else}
						<div class="mt-6 flex flex-wrap gap-3">
							{#each rankedParticipants as participant}
								<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
									<div class="flex items-center gap-3">
										<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
											{participant.rank}
										</span>
										<div>
											<p class="font-semibold text-slate-900">{participant.displayName}</p>
											<p class="text-xs text-slate-500">{formatMoney(participant.earnings)} • updated {formatRelativeTime(participant.lastActivityAt)}</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</section>
		</div>

		<section class="rounded-3xl bg-white p-6 shadow">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Leaderboard Table</p>
					<h3 class="mt-1 text-2xl font-bold text-slate-900">All students in this live class session</h3>
				</div>
				<p class="text-sm text-slate-500">
					Started {formatDateTime(activeSession.startedAt)} • planned 20m • manual end only
				</p>
			</div>

			<div class="mt-6 overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200">
					<thead class="bg-slate-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rank</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Student</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Earnings</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rounds</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Optimal</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Runtime</th>
							<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Last Update</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200">
						{#each rankedParticipants as participant}
							<tr class="hover:bg-slate-50">
								<td class="px-4 py-4 text-sm font-black text-slate-900">#{participant.rank}</td>
								<td class="px-4 py-4">
									<p class="text-sm font-semibold text-slate-900">{participant.displayName}</p>
									<p class="text-xs text-slate-500">Joined {formatDateTime(participant.joinedAt)}</p>
								</td>
								<td class="px-4 py-4">
									<span class={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(participant.status)}`}>
										{statusLabel(participant.status)}
									</span>
								</td>
								<td class="px-4 py-4 text-sm font-semibold text-slate-900">{formatMoney(participant.earnings)}</td>
								<td class="px-4 py-4 text-sm text-slate-600">{participant.roundsCompleted}</td>
								<td class="px-4 py-4 text-sm text-slate-600">{participant.optimalChoices}</td>
								<td class="px-4 py-4 text-sm text-slate-600">{formatRuntime(participant.totalGameTime)}</td>
								<td class="px-4 py-4 text-sm text-slate-600">
									<div>{formatRelativeTime(participant.lastActivityAt)}</div>
									<div class="text-xs text-slate-400">{formatDateTime(participant.lastActivityAt)}</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>
