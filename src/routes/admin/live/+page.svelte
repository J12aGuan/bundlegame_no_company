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
				return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
			case 'in_progress':
				return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200';
			default:
				return 'border-slate-500/30 bg-slate-400/10 text-slate-200';
		}
	}

	function getAvatarClasses(rank = 0) {
		if (rank === 1) return 'border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 via-slate-900 to-cyan-500/10 text-emerald-100';
		if (rank === 2) return 'border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 via-slate-900 to-sky-500/10 text-cyan-100';
		if (rank === 3) return 'border-slate-500/35 bg-gradient-to-br from-slate-500/20 via-slate-900 to-slate-700/20 text-slate-100';
		return 'border-slate-700 bg-gradient-to-br from-slate-800 via-slate-950 to-slate-900 text-slate-100';
	}

	function getRankBadgeClasses(rank = 0) {
		if (rank === 1) return 'bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/20';
		if (rank === 2) return 'bg-gradient-to-br from-cyan-300 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/20';
		if (rank === 3) return 'bg-gradient-to-br from-slate-300 to-slate-100 text-slate-950 shadow-lg shadow-slate-500/20';
		return 'bg-slate-800 text-slate-300';
	}

	function getBarFillClasses(rank = 0) {
		if (rank === 1) return 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-300';
		if (rank === 2) return 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400';
		if (rank === 3) return 'bg-gradient-to-r from-slate-300 via-slate-200 to-slate-100';
		return 'bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-400';
	}

	function getRowShellClasses(rank = 0) {
		if (rank === 1) return 'border border-emerald-400/18 bg-gradient-to-r from-emerald-500/8 via-slate-900/50 to-slate-950/80 shadow-lg shadow-emerald-950/25';
		if (rank === 2) return 'border border-cyan-400/18 bg-gradient-to-r from-cyan-500/8 via-slate-900/50 to-slate-950/80 shadow-md shadow-cyan-950/20';
		if (rank === 3) return 'border border-slate-400/20 bg-gradient-to-r from-slate-400/8 via-slate-900/50 to-slate-950/80 shadow-md shadow-slate-950/20';
		return 'border border-white/6 bg-slate-950/35';
	}

	function getPodiumCardClasses(slot = '') {
		if (slot === '1st') return 'border border-emerald-400/25 bg-gradient-to-br from-emerald-500/14 via-slate-950 to-cyan-500/8 shadow-xl shadow-emerald-950/30';
		if (slot === '2nd') return 'border border-cyan-400/20 bg-gradient-to-br from-cyan-500/12 via-slate-950 to-sky-500/8 shadow-lg shadow-cyan-950/25';
		return 'border border-slate-400/18 bg-gradient-to-br from-slate-400/10 via-slate-950 to-slate-700/10 shadow-lg shadow-slate-950/20';
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

	$: leaderboardSplitIndex = Math.ceil(rankedParticipants.length / 2);

	$: leaderboardColumns = rankedParticipants.length > 10
		? [
			rankedParticipants.slice(0, leaderboardSplitIndex),
			rankedParticipants.slice(leaderboardSplitIndex)
		]
		: [rankedParticipants];
</script>

<div class="space-y-6">
	<div class="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 shadow-2xl">
		<div class="grid gap-5 px-5 py-6 text-white lg:grid-cols-[1.45fr,0.95fr] lg:px-7">
			<div class="space-y-3">
				<div class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
					<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
					Live Class Leaderboard
				</div>
				<div>
					<h2 class="text-3xl font-black tracking-tight">Project the class standings in real time.</h2>
					<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
						Start a live class session before tomorrow’s run. Only students who enter while this session is active will appear on the board.
						The planned duration is 20 minutes, but the session never auto-removes students or stops updating until you end it here.
					</p>
				</div>
				<div class="grid gap-3 sm:grid-cols-4">
					<div class="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-300">Joined</p>
						<p class="mt-1.5 text-3xl font-black">{leaderboardSummary.totalJoined}</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-300">In Progress</p>
						<p class="mt-1.5 text-3xl font-black">{leaderboardSummary.inProgress}</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-300">Completed</p>
						<p class="mt-1.5 text-3xl font-black">{leaderboardSummary.completed}</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-300">Total Money</p>
						<p class="mt-1.5 text-3xl font-black">{formatMoney(leaderboardSummary.totalEarnings)}</p>
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
						<p><span class="font-semibold text-white">Dataset:</span> {activeSession?.scenarioSetName || sessionDefaults.scenarioSetName || 'Unknown'}</p>
						<p class="mt-1"><span class="font-semibold text-white">Version:</span> {activeSession?.scenarioSetVersionId || sessionDefaults.scenarioSetVersionId || 'Unavailable'}</p>
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
		<div class="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_340px]">
			<section class="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 shadow-2xl">
				<div class="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_25%),linear-gradient(180deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_100%)] p-5 lg:p-6">
					<div class="flex flex-col gap-4">
						<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Live Market Board</p>
								<h3 class="mt-2 text-3xl font-black tracking-tight text-white">Class earnings ranked like a trading desk.</h3>
								<p class="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
									Dense, projection-friendly, and optimized for around 20 students. Rankings update live from the current session using earnings, rounds completed, and fastest time.
								</p>
							</div>
							<div class="inline-flex items-center gap-3 self-start rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100 shadow-lg shadow-emerald-950/30">
								<span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
								Market open
							</div>
						</div>

						<div class="grid gap-3 sm:grid-cols-4">
							<div class="rounded-[1.35rem] border border-white/8 bg-white/5 p-4 backdrop-blur">
								<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Students</p>
								<p class="mt-2 text-3xl font-black text-white">{leaderboardSummary.totalJoined}</p>
							</div>
							<div class="rounded-[1.35rem] border border-white/8 bg-white/5 p-4 backdrop-blur">
								<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">In Market</p>
								<p class="mt-2 text-3xl font-black text-white">{leaderboardSummary.inProgress}</p>
							</div>
							<div class="rounded-[1.35rem] border border-white/8 bg-white/5 p-4 backdrop-blur">
								<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Total Money</p>
								<p class="mt-2 text-3xl font-black text-emerald-300">{formatMoneyCompact(leaderboardSummary.totalEarnings)}</p>
							</div>
							<div class="rounded-[1.35rem] border border-white/8 bg-white/5 p-4 backdrop-blur">
								<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Leader Spread</p>
								<p class="mt-2 text-3xl font-black text-cyan-300">{formatMoneyCompact(leaderSpread)}</p>
							</div>
						</div>
					</div>
				</div>

				<div class="p-4">
					<div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
							<span class="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-slate-300">Sorted by earnings</span>
							<span class="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-slate-300">Tie-breaker: rounds, then time</span>
						</div>
						<p class="text-xs text-slate-500">
							{leaderboardColumns.length > 1 ? 'Two-column board enabled for larger classes.' : 'Single-column board for smaller groups.'}
						</p>
					</div>

					<div class="rounded-[1.5rem] border border-white/8 bg-slate-900/75 shadow-xl shadow-slate-950/30">
						{#if rankedParticipants.length === 0}
							<div class="m-4 rounded-[1.25rem] border border-dashed border-white/10 bg-slate-950/40 p-8 text-center text-sm text-slate-400">
								No students have joined this live session yet.
							</div>
						{:else}
							<div class={`grid gap-px ${leaderboardColumns.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
								{#each leaderboardColumns as column}
									<div class="min-w-0">
										<div class="grid grid-cols-[44px,minmax(0,1.45fr),96px,54px,58px,72px] items-center gap-2 border-b border-white/8 bg-slate-900/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
											<div>Rank</div>
											<div>Student</div>
											<div class="text-right">P&amp;L</div>
											<div class="text-center">Rd</div>
											<div class="text-center">Opt</div>
											<div class="text-right">Time</div>
										</div>
										<div class="space-y-2 p-3">
										{#each column as participant}
											<article class={`rounded-[1.15rem] px-3 py-2.5 ${getRowShellClasses(participant.rank)}`}>
												<div class="grid grid-cols-[44px,minmax(0,1.45fr),96px,54px,58px,72px] items-center gap-2">
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
																<h4 class="truncate text-sm font-black text-white">{participant.displayName}</h4>
																<span class={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusClasses(participant.status)}`}>
																	{statusLabel(participant.status)}
																</span>
															</div>
															<p class="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
																Updated {formatRelativeTime(participant.lastActivityAt)}
															</p>
														</div>
														</div>
														<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
															<div
																class={`h-full rounded-full ${getBarFillClasses(participant.rank)}`}
																style={`width: ${Math.max(getDisplayBarWidth(participant.earnings, goalTarget), 6)}%;`}
															></div>
														</div>
													</div>

													<div class="text-right">
														<p class={`font-mono text-sm font-black ${participant.rank === 1 ? 'text-emerald-300' : participant.rank === 2 ? 'text-cyan-300' : 'text-white'}`}>
															{formatMoneyCompact(participant.earnings)}
														</p>
														<p class="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
															{participant.rank === 1 ? 'Leader' : formatMoneyCompact(Math.max(0, leader?.earnings - participant.earnings))}
														</p>
													</div>

													<div class="text-center font-mono text-sm font-semibold text-slate-200">{participant.roundsCompleted}</div>
													<div class="text-center font-mono text-sm font-semibold text-slate-200">{participant.optimalChoices}</div>
													<div class="text-right font-mono text-sm font-semibold text-slate-300">{formatRuntime(participant.totalGameTime)}</div>
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
				<div class="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl">
					<div class="bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(2,6,23,0.98)_100%)] p-5">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Session Snapshot</p>
								<h3 class="mt-2 text-xl font-black">
									{activeSession.label || activeSession.sessionId}
								</h3>
							</div>
							<span class="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
								Active
							</span>
						</div>

						<div class="mt-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
							<p><span class="font-semibold text-white">Dataset:</span> {activeSession?.scenarioSetName || sessionDefaults.scenarioSetName || 'Unknown'}</p>
							<p class="mt-1"><span class="font-semibold text-white">Version:</span> {activeSession?.scenarioSetVersionId || sessionDefaults.scenarioSetVersionId || 'Unavailable'}</p>
							<p class="mt-1"><span class="font-semibold text-white">Started:</span> {formatDateTime(activeSession.startedAt)}</p>
							<p class="mt-1"><span class="font-semibold text-white">Duration:</span> 20 minutes planned</p>
							<p class="mt-3 text-xs text-slate-400">
								Students stay listed until you manually end the session.
							</p>
						</div>
					</div>
				</div>

				<div class="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 text-white shadow-xl">
					<div class="border-b border-white/8 p-5">
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Top Desks</p>
						<h3 class="mt-2 text-xl font-black">Leader stack</h3>
					</div>
					<div class="space-y-3 p-4">
						{#each podiumCards as card}
							<div class={`rounded-[1.25rem] p-4 ${getPodiumCardClasses(card.slot)}`}>
								<div class="flex items-start justify-between gap-3">
									<div>
										<p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{card.slot}</p>
										{#if card.participant}
											<p class="mt-2 truncate text-lg font-black text-white">{card.participant.displayName}</p>
											<p class="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">{card.participant.roundsCompleted} rounds • {card.participant.optimalChoices} optimal</p>
										{:else}
											<p class="mt-2 text-sm text-slate-400">Waiting for a student to claim this slot.</p>
										{/if}
									</div>
									{#if card.participant}
										<div class={`flex h-10 w-10 items-center justify-center rounded-xl border text-[11px] font-black ${getAvatarClasses(card.participant.rank)}`}>
											{getInitials(card.participant.displayName)}
										</div>
									{/if}
								</div>
								{#if card.participant}
									<p class="mt-4 font-mono text-2xl font-black text-emerald-300">{formatMoneyCompact(card.participant.earnings)}</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div class="rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-xl">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Class Pulse</p>
							<h3 class="mt-2 text-xl font-black">Desk readout</h3>
						</div>
						<p class="text-xs font-medium text-slate-500">Built for larger cohorts</p>
					</div>

					<div class="mt-4 grid gap-3">
						<div class="rounded-[1.15rem] border border-white/8 bg-white/5 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Students</p>
							<p class="mt-1.5 text-2xl font-black text-white">{leaderboardSummary.totalJoined}</p>
						</div>
						<div class="rounded-[1.15rem] border border-white/8 bg-white/5 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Completed</p>
							<p class="mt-1.5 text-2xl font-black text-white">{leaderboardSummary.completed}</p>
						</div>
						<div class="rounded-[1.15rem] border border-white/8 bg-white/5 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Average earnings</p>
							<p class="mt-1.5 font-mono text-2xl font-black text-cyan-300">{formatMoneyCompact(averageEarnings)}</p>
						</div>
						<div class="rounded-[1.15rem] border border-white/8 bg-white/5 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Leader spread</p>
							<p class="mt-1.5 font-mono text-2xl font-black text-emerald-300">{formatMoneyCompact(leaderSpread)}</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	{/if}
</div>
