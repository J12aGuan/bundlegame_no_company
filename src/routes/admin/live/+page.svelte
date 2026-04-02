<script>
	import { onMount } from 'svelte';
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

	function formatMoneyCompact(value = 0) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(toNumber(value, 0));
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

	function getInitials(name = '') {
		const normalized = String(name ?? '').trim();
		if (!normalized) return '?';
		const words = normalized.split(/[\s_-]+/).filter(Boolean);
		if (words.length >= 2) {
			return `${words[0][0]}${words[1][0]}`.toUpperCase();
		}
		const alphanumeric = normalized.replace(/[^a-zA-Z0-9]/g, '');
		return (alphanumeric.slice(0, 2) || normalized.slice(0, 2)).toUpperCase();
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
				return 'border-slate-200 bg-slate-100 text-slate-600';
		}
	}

	function getAvatarClasses(rank = 0) {
		if (rank === 1) return 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-100 text-amber-700';
		if (rank === 2) return 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-100 text-sky-700';
		if (rank === 3) return 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-100 text-emerald-700';
		return 'border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-700';
	}

	function getRankBadgeClasses(rank = 0) {
		if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-yellow-300 text-white shadow-lg shadow-amber-200';
		if (rank === 2) return 'bg-gradient-to-br from-sky-400 to-cyan-300 text-white shadow-lg shadow-sky-200';
		if (rank === 3) return 'bg-gradient-to-br from-emerald-400 to-teal-300 text-white shadow-lg shadow-emerald-200';
		return 'bg-slate-200 text-slate-700';
	}

	function getBarFillClasses(rank = 0) {
		if (rank === 1) return 'bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-300';
		if (rank === 2) return 'bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-300';
		if (rank === 3) return 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300';
		return 'bg-gradient-to-r from-sky-400 via-blue-300 to-cyan-300';
	}

	function getRowShellClasses(rank = 0) {
		if (rank === 1) return 'border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-yellow-50 shadow-md shadow-amber-100/70';
		if (rank === 2) return 'border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 shadow-md shadow-sky-100/70';
		if (rank === 3) return 'border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 shadow-md shadow-emerald-100/70';
		return 'border border-slate-200 bg-white shadow-sm';
	}

	function getPodiumCardClasses(slot = '') {
		if (slot === '1st') return 'border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 shadow-xl shadow-amber-100/80';
		if (slot === '2nd') return 'border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 shadow-lg shadow-sky-100/70';
		return 'border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-lg shadow-emerald-100/70';
	}

	function computeGoalTarget(maxValue = 0) {
		const safeValue = Math.max(toNumber(maxValue, 0) * 1.08, 10);
		const magnitude = 10 ** Math.floor(Math.log10(safeValue));
		const normalized = safeValue / magnitude;
		const steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10];
		const nextStep = steps.find((step) => normalized <= step) ?? 10;
		return nextStep * magnitude;
	}

	function getProgressPercent(value = 0, total = 0) {
		if (total <= 0) return 0;
		return Math.max(0, Math.min(100, (toNumber(value, 0) / total) * 100));
	}

	function getDisplayBarWidth(value = 0, total = 0) {
		const basePercent = getProgressPercent(value, total);
		if (basePercent === 0) return 12;
		return Math.min(100, Math.max(basePercent, 18));
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

	function resetParticipantSubscription() {
		unsubscribeParticipants?.();
		unsubscribeParticipants = () => {};
	}

	function attachParticipantSubscription(sessionId = '') {
		resetParticipantSubscription();
		if (!sessionId) {
			participants = [];
			return;
		}
		unsubscribeParticipants = subscribeToLiveSessionParticipants(sessionId, (nextParticipants, subscriptionError) => {
			if (subscriptionError) {
				error = subscriptionError?.message || 'Unable to stream leaderboard participants.';
				return;
			}
			participants = Array.isArray(nextParticipants) ? nextParticipants.map(normalizeParticipant) : [];
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
			unsubscribeActiveSession = subscribeToActiveLiveSession((session, subscriptionError) => {
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
			});
		});

		return () => {
			unsubscribeActiveSession?.();
			resetParticipantSubscription();
		};
	});

	$: rankedParticipants = [...participants].sort(compareParticipants).map((participant, index) => ({
		...participant,
		rank: index + 1
	}));

	$: leader = rankedParticipants[0] || null;

	$: goalTarget = computeGoalTarget(rankedParticipants.reduce((maxValue, participant) => Math.max(maxValue, participant.earnings), 0));

	$: podiumCards = [
		{ slot: '2nd', participant: rankedParticipants[1] || null },
		{ slot: '1st', participant: rankedParticipants[0] || null },
		{ slot: '3rd', participant: rankedParticipants[2] || null }
	];

	$: leaderboardSummary = {
		totalJoined: rankedParticipants.length,
		inProgress: rankedParticipants.filter((participant) => participant.status === 'in_progress').length,
		completed: rankedParticipants.filter((participant) => participant.status === 'completed' || participant.completedGame).length,
		totalEarnings: rankedParticipants.reduce((sum, participant) => sum + participant.earnings, 0)
	};

	$: leaderSpread = leader && rankedParticipants[1]
		? Math.max(0, leader.earnings - rankedParticipants[1].earnings)
		: 0;

	$: averageEarnings = rankedParticipants.length
		? leaderboardSummary.totalEarnings / rankedParticipants.length
		: 0;

	$: ladderTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
		ratio,
		value: goalTarget * ratio
	}));

	$: leaderboardSplitIndex = Math.ceil(rankedParticipants.length / 2);

	$: leaderboardColumns = rankedParticipants.length > 10
		? [
			rankedParticipants.slice(0, leaderboardSplitIndex),
			rankedParticipants.slice(leaderboardSplitIndex)
		]
		: [rankedParticipants];
</script>

<div class="space-y-6">
	<div class="overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] shadow-xl">
		<div class="grid gap-5 px-5 py-6 text-slate-900 lg:grid-cols-[1.45fr,0.95fr] lg:px-7">
			<div class="space-y-3">
				<div class="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 shadow-sm">
					<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
					Live Class Leaderboard
				</div>
				<div>
					<h2 class="text-3xl font-black tracking-tight text-slate-950">Project the class standings in real time.</h2>
					<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
						Start a live class session before tomorrow’s run. Only students who enter while this session is active will appear on the board.
						The planned duration is 20 minutes, but the session never auto-removes students or stops updating until you end it here.
					</p>
				</div>
				<div class="grid gap-3 sm:grid-cols-4">
					<div class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-500">Joined</p>
						<p class="mt-1.5 text-3xl font-black text-slate-950">{leaderboardSummary.totalJoined}</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-500">In Progress</p>
						<p class="mt-1.5 text-3xl font-black text-slate-950">{leaderboardSummary.inProgress}</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-500">Completed</p>
						<p class="mt-1.5 text-3xl font-black text-slate-950">{leaderboardSummary.completed}</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-500">Total Money</p>
						<p class="mt-1.5 text-3xl font-black text-emerald-700">{formatMoney(leaderboardSummary.totalEarnings)}</p>
					</div>
				</div>
			</div>

			<div class="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs uppercase tracking-[0.22em] text-slate-500">Session Control</p>
						<h3 class="mt-2 text-xl font-bold text-slate-950">
							{#if activeSession?.sessionId}
								{activeSession.label || activeSession.sessionId}
							{:else}
								No Live Session Running
							{/if}
						</h3>
					</div>
					<span class={`rounded-full px-3 py-1 text-xs font-semibold ${activeSession?.sessionId ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
						{activeSession?.sessionId ? 'Active' : 'Idle'}
					</span>
				</div>

				<div class="mt-5 space-y-4">
					<label class="block text-sm font-medium text-slate-700" for="live-session-label">Session label</label>
					<input
						id="live-session-label"
						type="text"
						bind:value={sessionLabelDraft}
						class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
						placeholder="Class Session"
						disabled={Boolean(activeSession?.sessionId)}
					/>

					<div class="grid gap-3 sm:grid-cols-2">
						<button
							type="button"
							class="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
							on:click={startSessionNow}
							disabled={actionLoading || Boolean(activeSession?.sessionId)}
						>
							{actionLoading && !activeSession?.sessionId ? 'Starting…' : 'Start Class Session'}
						</button>
						<button
							type="button"
							class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
							on:click={endSessionNow}
							disabled={actionLoading || !activeSession?.sessionId}
						>
							{actionLoading && activeSession?.sessionId ? 'Ending…' : 'End Class Session'}
						</button>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
						<p><span class="font-semibold text-slate-950">Dataset:</span> {activeSession?.scenarioSetName || sessionDefaults.scenarioSetName || 'Unknown'}</p>
						<p class="mt-1"><span class="font-semibold text-slate-950">Version:</span> {activeSession?.scenarioSetVersionId || sessionDefaults.scenarioSetVersionId || 'Unavailable'}</p>
						<p class="mt-1"><span class="font-semibold text-slate-950">Planned duration:</span> 20 minutes</p>
						{#if activeSession?.startedAt}
							<p class="mt-1"><span class="font-semibold text-slate-950">Started:</span> {formatDateTime(activeSession.startedAt)}</p>
						{/if}
						<p class="mt-3 text-xs text-slate-500">
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
		<div class="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_340px]">
			<section class="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
				<div class="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] p-5 lg:p-6">
					<div class="flex flex-col gap-4">
						<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">Leaderboard Ladder</p>
								<h3 class="mt-2 text-3xl font-black tracking-tight text-slate-950">See the whole class at a glance.</h3>
								<p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
									This board is easy to project, fits a full class, and updates live as students play. Rankings use earnings first, then rounds completed, then fastest time.
								</p>
							</div>
							<div class="inline-flex items-center gap-3 self-start rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 shadow-sm">
								<span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
								Live updates
							</div>
						</div>

						<div class="grid gap-3 sm:grid-cols-4">
							<div class="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
								<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Students</p>
								<p class="mt-2 text-3xl font-black text-slate-950">{leaderboardSummary.totalJoined}</p>
							</div>
							<div class="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
								<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Playing</p>
								<p class="mt-2 text-3xl font-black text-slate-950">{leaderboardSummary.inProgress}</p>
							</div>
							<div class="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
								<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Total Money</p>
								<p class="mt-2 text-3xl font-black text-emerald-700">{formatMoneyCompact(leaderboardSummary.totalEarnings)}</p>
							</div>
							<div class="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
								<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Lead Margin</p>
								<p class="mt-2 text-3xl font-black text-sky-700">{formatMoneyCompact(leaderSpread)}</p>
							</div>
						</div>
					</div>
				</div>

				<div class="p-4">
					<div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
							<span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">Sorted by earnings</span>
							<span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">Tie-breaker: rounds, then time</span>
						</div>
						<p class="text-xs text-slate-500">
							{leaderboardColumns.length > 1 ? 'Two-column ladder layout is on for a full class.' : 'Single-column ladder layout is on for a smaller group.'}
						</p>
					</div>

					<div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 shadow-sm">
						{#if rankedParticipants.length === 0}
							<div class="m-4 rounded-[1.25rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
								No students have joined this live session yet.
							</div>
						{:else}
							<div class={`grid gap-px ${leaderboardColumns.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
								{#each leaderboardColumns as column}
									<div class="min-w-0">
										<div class="rounded-t-[1.35rem] border-b border-slate-200 bg-white px-3 py-3">
											<div class="grid grid-cols-[44px,minmax(0,1fr),84px] items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
												<div>Rank</div>
												<div>Student</div>
												<div class="text-right">Score</div>
											</div>
											<div class="ml-[56px] mr-[84px] mt-3 grid grid-cols-5 text-[10px] font-medium text-slate-400">
												{#each ladderTicks as tick}
													<span class={tick.ratio === 0 ? 'text-left' : tick.ratio === 1 ? 'text-right' : 'text-center'}>
														{formatMoneyCompact(tick.value)}
													</span>
												{/each}
											</div>
										</div>
										<div class="space-y-2 bg-white p-3">
										{#each column as participant}
											<article class={`rounded-[1.15rem] px-3 py-2.5 ${getRowShellClasses(participant.rank)}`}>
												<div class="grid grid-cols-[44px,minmax(0,1fr),84px] items-center gap-3">
													<div class="flex items-center justify-center">
														<div class={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${getRankBadgeClasses(participant.rank)}`}>
															{participant.rank}
														</div>
													</div>

													<div class="min-w-0">
														<div class="flex min-w-0 items-center gap-2.5">
														<div class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[11px] font-black shadow ${getAvatarClasses(participant.rank)}`}>
															{getInitials(participant.displayName)}
														</div>
														<div class="min-w-0">
															<div class="flex flex-wrap items-center gap-2">
																<h4 class="truncate text-sm font-black text-slate-950">{participant.displayName}</h4>
																<span class={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusClasses(participant.status)}`}>
																	{statusLabel(participant.status)}
																</span>
															</div>
															<p class="mt-1 text-[10px] text-slate-500">
																{participant.roundsCompleted} rounds • {participant.optimalChoices} optimal • {formatRuntime(participant.totalGameTime)} • updated {formatRelativeTime(participant.lastActivityAt)}
															</p>
														</div>
														</div>
														<div class="relative mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
															<div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[length:25%_100%] opacity-80"></div>
															<div
																class={`h-full rounded-full ${getBarFillClasses(participant.rank)}`}
																style={`width: ${Math.max(getDisplayBarWidth(participant.earnings, goalTarget), 6)}%;`}
															></div>
														</div>
													</div>

													<div class="text-right">
														<p class={`font-mono text-sm font-black ${participant.rank === 1 ? 'text-emerald-700' : participant.rank === 2 ? 'text-sky-700' : participant.rank === 3 ? 'text-amber-700' : 'text-slate-900'}`}>
															{formatMoneyCompact(participant.earnings)}
														</p>
														<p class="mt-1 text-[10px] text-slate-500">
															{participant.rank === 1 ? 'Leader' : `${formatMoneyCompact(Math.max(0, leader?.earnings - participant.earnings))} back`}
														</p>
													</div>
												</div>
											</article>
										{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</section>

			<section class="space-y-4">
				<div class="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
					<div class="bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] p-5">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Session Snapshot</p>
								<h3 class="mt-2 text-xl font-black text-slate-950">
									{activeSession.label || activeSession.sessionId}
								</h3>
							</div>
							<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
								Active
							</span>
						</div>

						<div class="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
							<p><span class="font-semibold text-slate-950">Dataset:</span> {activeSession?.scenarioSetName || sessionDefaults.scenarioSetName || 'Unknown'}</p>
							<p class="mt-1"><span class="font-semibold text-slate-950">Version:</span> {activeSession?.scenarioSetVersionId || sessionDefaults.scenarioSetVersionId || 'Unavailable'}</p>
							<p class="mt-1"><span class="font-semibold text-slate-950">Started:</span> {formatDateTime(activeSession.startedAt)}</p>
							<p class="mt-1"><span class="font-semibold text-slate-950">Duration:</span> 20 minutes planned</p>
							<p class="mt-3 text-xs text-slate-500">
								Students stay listed until you manually end the session.
							</p>
						</div>
					</div>
				</div>

				<div class="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
					<div class="border-b border-slate-200 p-5">
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Top 3</p>
						<h3 class="mt-2 text-xl font-black text-slate-950">Leading students right now</h3>
					</div>
					<div class="space-y-3 p-4">
						{#each podiumCards as card}
							<div class={`rounded-[1.25rem] p-4 ${getPodiumCardClasses(card.slot)}`}>
								<div class="flex items-start justify-between gap-3">
									<div>
										<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{card.slot}</p>
										{#if card.participant}
											<p class="mt-2 truncate text-lg font-black text-slate-950">{card.participant.displayName}</p>
											<p class="mt-1 text-[11px] text-slate-500">{card.participant.roundsCompleted} rounds • {card.participant.optimalChoices} optimal</p>
										{:else}
											<p class="mt-2 text-sm text-slate-500">Waiting for a student to claim this slot.</p>
										{/if}
									</div>
									{#if card.participant}
										<div class={`flex h-10 w-10 items-center justify-center rounded-xl border text-[11px] font-black ${getAvatarClasses(card.participant.rank)}`}>
											{getInitials(card.participant.displayName)}
										</div>
									{/if}
								</div>
								{#if card.participant}
									<p class="mt-4 font-mono text-2xl font-black text-emerald-700">{formatMoneyCompact(card.participant.earnings)}</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Class Pulse</p>
							<h3 class="mt-2 text-xl font-black text-slate-950">Quick read</h3>
						</div>
						<p class="text-xs font-medium text-slate-500">Built for a full class</p>
					</div>

					<div class="mt-4 grid gap-3">
						<div class="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Students</p>
							<p class="mt-1.5 text-2xl font-black text-slate-950">{leaderboardSummary.totalJoined}</p>
						</div>
						<div class="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Completed</p>
							<p class="mt-1.5 text-2xl font-black text-slate-950">{leaderboardSummary.completed}</p>
						</div>
						<div class="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Average earnings</p>
							<p class="mt-1.5 font-mono text-2xl font-black text-sky-700">{formatMoneyCompact(averageEarnings)}</p>
						</div>
						<div class="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Lead margin</p>
							<p class="mt-1.5 font-mono text-2xl font-black text-emerald-700">{formatMoneyCompact(leaderSpread)}</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	{/if}
</div>
