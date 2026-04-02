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

	function formatOrdinal(rank = 0) {
		const safeRank = Math.max(0, Math.floor(toNumber(rank, 0)));
		if (!safeRank) return '—';
		const remainder = safeRank % 100;
		if (remainder >= 11 && remainder <= 13) return `${safeRank}th`;
		switch (safeRank % 10) {
			case 1:
				return `${safeRank}st`;
			case 2:
				return `${safeRank}nd`;
			case 3:
				return `${safeRank}rd`;
			default:
				return `${safeRank}th`;
		}
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
				return 'border-amber-200 bg-amber-50 text-amber-700';
		}
	}

	function getAvatarClasses(rank = 0) {
		if (rank === 1) return 'border-amber-300 bg-gradient-to-br from-amber-100 via-white to-amber-50 text-amber-700';
		if (rank === 2) return 'border-slate-300 bg-gradient-to-br from-slate-100 via-white to-slate-50 text-slate-700';
		if (rank === 3) return 'border-rose-200 bg-gradient-to-br from-rose-100 via-white to-orange-50 text-rose-700';
		return 'border-sky-200 bg-gradient-to-br from-sky-100 via-white to-cyan-50 text-sky-700';
	}

	function getRankBadgeClasses(rank = 0) {
		if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-yellow-300 text-white shadow-lg shadow-amber-200';
		if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-slate-200 text-slate-700 shadow-lg shadow-slate-200';
		if (rank === 3) return 'bg-gradient-to-br from-orange-300 to-rose-200 text-rose-700 shadow-lg shadow-orange-100';
		return 'bg-slate-100 text-slate-500';
	}

	function getBarFillClasses(rank = 0) {
		if (rank === 1) return 'bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400';
		if (rank === 2) return 'bg-gradient-to-r from-slate-400 via-slate-300 to-slate-200';
		if (rank === 3) return 'bg-gradient-to-r from-rose-400 via-orange-300 to-amber-200';
		return 'bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-300';
	}

	function getRowShellClasses(rank = 0) {
		if (rank === 1) return 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50/70 shadow-lg shadow-amber-100/70';
		if (rank === 2) return 'border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50/70 shadow-md shadow-slate-100';
		if (rank === 3) return 'border-rose-100 bg-gradient-to-r from-rose-50 via-white to-orange-50/60 shadow-md shadow-orange-100/70';
		return 'border-slate-200 bg-white shadow-sm';
	}

	function getPodiumCardClasses(slot = '') {
		if (slot === '1st') return 'border-amber-300 bg-gradient-to-br from-amber-100 via-yellow-50 to-white shadow-xl shadow-amber-100';
		if (slot === '2nd') return 'border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-50 shadow-md shadow-slate-100';
		return 'border-rose-100 bg-gradient-to-br from-orange-50 via-white to-rose-50 shadow-md shadow-orange-100';
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

	function getBarLabelPosition(value = 0, total = 0) {
		return Math.min(97, Math.max(16, getDisplayBarWidth(value, total)));
	}

	function getLeaderGapText(participant, leader) {
		if (!leader || !participant) return 'Waiting for the class leaderboard to fill in.';
		if (participant.rank === 1) return 'Setting the pace for the room.';
		const gap = Math.max(0, leader.earnings - participant.earnings);
		return `${formatMoney(gap)} behind the current leader`;
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

	$: leaderboardSplitIndex = Math.ceil(rankedParticipants.length / 2);

	$: leaderboardColumns = rankedParticipants.length > 12
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
		<div class="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
			<section class="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl">
				<div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.12),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)]"></div>
				<div class="relative p-5 lg:p-6">
					<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Class Leaderboard</p>
							<h3 class="mt-2 text-3xl font-black tracking-tight text-slate-950">Everyone in the live session</h3>
							<p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
								Compact, competitive, and sorted for classroom projection. Students are ranked by earnings, then rounds completed, then fastest time.
							</p>
						</div>
						<div class="inline-flex items-center gap-3 self-start rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-lg">
							<span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
							Streaming live
						</div>
					</div>

					<div class="mt-6 grid gap-4 lg:grid-cols-[1fr,1fr,1fr]">
						{#each podiumCards as card}
							<div class={`rounded-[1.5rem] border p-4 ${getPodiumCardClasses(card.slot)} ${card.slot === '1st' ? 'lg:-translate-y-2' : ''}`}>
								<p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{card.slot}</p>
								{#if card.participant}
									<div class="mt-4 flex items-center gap-3">
										<div class={`flex h-12 w-12 items-center justify-center rounded-full border-4 text-xs font-black shadow ${getAvatarClasses(card.participant.rank)}`}>
											{getInitials(card.participant.displayName)}
										</div>
										<div class="min-w-0">
											<p class="truncate text-xl font-black text-slate-950">{card.participant.displayName}</p>
											<p class="mt-1 text-xs font-medium text-slate-500">{card.participant.roundsCompleted} rounds • {card.participant.optimalChoices} optimal</p>
										</div>
									</div>
									<p class="mt-4 text-3xl font-black text-slate-950">{formatMoneyCompact(card.participant.earnings)}</p>
									<p class="mt-2 text-xs text-slate-500">{getLeaderGapText(card.participant, leader)}</p>
								{:else}
									<p class="mt-6 text-sm text-slate-500">No student has claimed this podium slot yet.</p>
								{/if}
							</div>
						{/each}
					</div>
					<div class="mt-6 rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 shadow-sm">
						{#if rankedParticipants.length === 0}
							<div class="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
								No students have joined this live session yet.
							</div>
						{:else}
							<div class={`grid gap-3 ${leaderboardColumns.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
								{#each leaderboardColumns as column}
									<div class="space-y-3">
										{#each column as participant}
											<article class={`relative overflow-hidden rounded-[1.4rem] border px-3 py-3 ${getRowShellClasses(participant.rank)}`}>
												<div class="grid gap-3 lg:grid-cols-[58px,minmax(0,1fr),minmax(180px,0.9fr)] lg:items-center">
													<div class="flex items-center gap-3 lg:flex-col lg:items-center">
														<div class={`flex h-12 w-12 items-center justify-center rounded-[1rem] text-2xl font-black ${getRankBadgeClasses(participant.rank)}`}>
															{participant.rank}
														</div>
														<p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
															{formatOrdinal(participant.rank)}
														</p>
													</div>

													<div class="flex min-w-0 items-center gap-3">
														<div class={`flex h-12 w-12 items-center justify-center rounded-[1rem] border-4 text-xs font-black shadow ${getAvatarClasses(participant.rank)}`}>
															{getInitials(participant.displayName)}
														</div>
														<div class="min-w-0">
															<div class="flex flex-wrap items-center gap-2">
																<h4 class="truncate text-lg font-black text-slate-950">{participant.displayName}</h4>
																<span class={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusClasses(participant.status)}`}>
																	{statusLabel(participant.status)}
																</span>
															</div>
															<p class="mt-1 text-xs text-slate-500">
																{participant.roundsCompleted} rounds • {participant.optimalChoices} optimal • {formatRuntime(participant.totalGameTime)}
															</p>
														</div>
													</div>

													<div>
														<div class="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
															<span>Money</span>
															<span>{formatRelativeTime(participant.lastActivityAt)}</span>
														</div>
														<div class="relative h-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
															<div
																class={`absolute inset-y-1 left-1 rounded-full ${getBarFillClasses(participant.rank)} shadow`}
																style={`width: calc(${getDisplayBarWidth(participant.earnings, goalTarget)}% - 0.5rem);`}
															></div>
															<div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[length:20%_100%] opacity-70"></div>
															<div
																class="absolute top-1/2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white shadow"
																style={`left: ${getBarLabelPosition(participant.earnings, goalTarget)}%; transform: translate(-100%, -50%);`}
															>
																{formatMoneyCompact(participant.earnings)}
															</div>
														</div>
													</div>
												</div>
											</article>
										{/each}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</section>

			<section class="space-y-4">
				<div class="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl">
					<div class="bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(30,41,59,0.94)_100%)] p-5">
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

				<div class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow">
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Leader Right Now</p>
					{#if leader}
						<div class="mt-4 flex items-center gap-3">
							<div class={`flex h-14 w-14 items-center justify-center rounded-full border-4 text-sm font-black shadow-lg ${getAvatarClasses(leader.rank)}`}>
								{getInitials(leader.displayName)}
							</div>
							<div class="min-w-0">
								<p class="truncate text-xl font-black text-slate-950">{leader.displayName}</p>
								<p class="mt-1 text-xs text-slate-500">{leader.roundsCompleted} rounds • {leader.optimalChoices} optimal • updated {formatRelativeTime(leader.lastActivityAt)}</p>
							</div>
						</div>
						<div class="mt-4 rounded-[1.25rem] bg-slate-950 px-4 py-4 text-white">
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Current score</p>
							<p class="mt-1.5 text-3xl font-black">{formatMoneyCompact(leader.earnings)}</p>
						</div>
					{:else}
						<div class="mt-4 rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
							No student has posted a score yet.
						</div>
					{/if}
				</div>

				<div class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Class Pulse</p>
							<h3 class="mt-2 text-xl font-black text-slate-950">Live status</h3>
						</div>
						<p class="text-xs font-medium text-slate-500">Everyone stays visible</p>
					</div>

					<div class="mt-4 grid gap-3">
						<div class="rounded-[1.15rem] bg-sky-50 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Students</p>
							<p class="mt-1.5 text-2xl font-black text-slate-950">{leaderboardSummary.totalJoined}</p>
						</div>
						<div class="rounded-[1.15rem] bg-emerald-50 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Playing</p>
							<p class="mt-1.5 text-2xl font-black text-slate-950">{leaderboardSummary.inProgress}</p>
						</div>
						<div class="rounded-[1.15rem] bg-amber-50 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Completed</p>
							<p class="mt-1.5 text-2xl font-black text-slate-950">{leaderboardSummary.completed}</p>
						</div>
						<div class="rounded-[1.15rem] bg-slate-100 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Money</p>
							<p class="mt-1.5 text-2xl font-black text-slate-950">{formatMoneyCompact(leaderboardSummary.totalEarnings)}</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	{/if}
</div>
