export function normalizeDateLike(value) {
	if (!value) return '';
	if (value?.toDate && typeof value.toDate === 'function') {
		const converted = value.toDate();
		return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted.toISOString() : '';
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? '' : value.toISOString();
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		const millis = value > 1e12 ? value : value * 1000;
		const converted = new Date(millis);
		return Number.isNaN(converted.getTime()) ? '' : converted.toISOString();
	}
	if (typeof value === 'object') {
		const seconds = Number(value?.seconds ?? value?._seconds);
		const nanoseconds = Number(value?.nanoseconds ?? value?._nanoseconds ?? 0);
		if (Number.isFinite(seconds) && seconds > 0) {
			const converted = new Date((seconds * 1000) + Math.floor(nanoseconds / 1e6));
			return Number.isNaN(converted.getTime()) ? '' : converted.toISOString();
		}
	}
	const normalized = String(value ?? '').trim();
	if (!normalized) return '';
	const millis = Date.parse(normalized);
	return Number.isFinite(millis) ? new Date(millis).toISOString() : '';
}

export function toNumber(value, fallback = 0) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
}

export function toMillis(value = '') {
	const normalized = normalizeDateLike(value);
	if (!normalized) return 0;
	const millis = Date.parse(normalized);
	return Number.isFinite(millis) ? millis : 0;
}

export function resolveText(...values) {
	for (const value of values) {
		const normalized = String(value ?? '').trim();
		if (normalized) return normalized;
	}
	return '';
}

export function getVersionMap(source, field) {
	const value = source?.[field];
	return value && typeof value === 'object' ? value : {};
}

export function getVersionIds(...maps) {
	return [...new Set(maps.flatMap((map) => Object.keys(map || {}).filter(Boolean)))];
}

export function getLatestCollectionDate(entries = []) {
	let latestValue = '';
	let latestMillis = 0;
	for (const entry of Array.isArray(entries) ? entries : []) {
		for (const candidate of [entry?.updatedAt, entry?.createdAt, entry?.timestamp]) {
			const normalized = normalizeDateLike(candidate);
			const millis = toMillis(normalized);
			if (millis > latestMillis) {
				latestMillis = millis;
				latestValue = normalized;
			}
		}
	}
	return latestValue;
}

export function resolveDateInfo(candidates = []) {
	for (const candidate of candidates) {
		const normalized = normalizeDateLike(candidate?.value);
		if (normalized) {
			return {
				value: normalized,
				source: String(candidate?.source ?? '').trim() || 'Unknown'
			};
		}
	}
	return {
		value: '',
		source: 'Undated'
	};
}

export function resolveCompletionInfo(summary = {}) {
	return resolveDateInfo([
		{ value: summary?.completionMeta?.finalSaveConfirmedAt, source: 'Final save confirmed' },
		{ value: summary?.completionMeta?.handoffPostedAt, source: 'Completion handoff' }
	]);
}

export function resolveBestAvailableDateInfo({ summary = {}, user = {}, orders = [], actions = [], lastActivityAt = '', sessionStartedAt = '' } = {}) {
	const completionInfo = resolveCompletionInfo(summary);
	if (completionInfo.value) {
		return completionInfo;
	}
	return resolveDateInfo([
		{ value: summary?.completionMeta?.copyVerificationAt, source: 'Result code verified' },
		{ value: lastActivityAt, source: 'Last activity' },
		{ value: getLatestCollectionDate(actions), source: 'Legacy action timestamp' },
		{ value: getLatestCollectionDate(orders), source: 'Legacy order timestamp' },
		{ value: sessionStartedAt, source: 'Session started' },
		{ value: user?.updatedAt, source: 'User updated' },
		{ value: user?.createdAt, source: 'User created' }
	]);
}

export function buildVersionSnapshot(versionId, summaryMap = {}, progressMap = {}, actionsMap = {}, detailedActionsMap = {}) {
	const summary = summaryMap?.[versionId] || {};
	const progress = progressMap?.[versionId] || {};
	const actionSummary = actionsMap?.[versionId] || {};
	const detailedActionSummary = detailedActionsMap?.[versionId] || {};
	const lastActivityAt = resolveText(summary?.lastActivityAt, progress?.lastActivityAt, summary?.completionMeta?.copyVerificationAt);
	const sessionStartedAt = resolveText(summary?.sessionStartedAt, progress?.sessionStartedAt);
	return {
		versionId,
		summary,
		progress,
		actionSummary,
		detailedActionSummary,
		completionMeta: summary?.completionMeta || {},
		lastActivityAt,
		sessionStartedAt
	};
}

function getSnapshotOrdering(snapshot = {}) {
	const completionInfo = resolveCompletionInfo(snapshot?.summary || {});
	const completionMs = toMillis(completionInfo.value);
	const activityMs = Math.max(
		toMillis(snapshot?.lastActivityAt),
		toMillis(snapshot?.sessionStartedAt),
		toMillis(snapshot?.summary?.completionMeta?.copyVerificationAt)
	);
	return {
		completionMs,
		activityMs,
		latestMs: Math.max(completionMs, activityMs),
		roundsCompleted: Math.max(
			toNumber(snapshot?.summary?.roundsCompleted, 0),
			toNumber(snapshot?.progress?.roundsCompleted, 0)
		),
		earnings: Math.max(
			toNumber(snapshot?.summary?.earnings, 0),
			toNumber(snapshot?.progress?.earnings, 0)
		)
	};
}

export function compareVersionSnapshots(left = {}, right = {}) {
	const leftOrdering = getSnapshotOrdering(left);
	const rightOrdering = getSnapshotOrdering(right);

	if (leftOrdering.latestMs !== rightOrdering.latestMs) {
		return rightOrdering.latestMs - leftOrdering.latestMs;
	}
	if (leftOrdering.completionMs !== rightOrdering.completionMs) {
		return rightOrdering.completionMs - leftOrdering.completionMs;
	}
	if (leftOrdering.activityMs !== rightOrdering.activityMs) {
		return rightOrdering.activityMs - leftOrdering.activityMs;
	}
	if (leftOrdering.roundsCompleted !== rightOrdering.roundsCompleted) {
		return rightOrdering.roundsCompleted - leftOrdering.roundsCompleted;
	}
	if (leftOrdering.earnings !== rightOrdering.earnings) {
		return rightOrdering.earnings - leftOrdering.earnings;
	}
	return String(left?.versionId ?? '').localeCompare(String(right?.versionId ?? ''));
}

export function pickLatestVersionSnapshot(summaryMap = {}, progressMap = {}, actionsMap = {}, detailedActionsMap = {}) {
	const versionIds = getVersionIds(summaryMap, progressMap, actionsMap, detailedActionsMap);
	if (versionIds.length === 0) {
		return buildVersionSnapshot('', {}, {}, {}, {});
	}
	return versionIds
		.map((versionId) => buildVersionSnapshot(versionId, summaryMap, progressMap, actionsMap, detailedActionsMap))
		.sort(compareVersionSnapshots)[0];
}

export function deriveUserRunMetrics(user = {}) {
	const summaryMap = getVersionMap(user.summaryDoc || user.progressSummary, 'summaryByScenarioSetVersionId');
	const progressMap = getVersionMap(user.scenarioSetProgressDoc, 'progressByScenarioSetVersionId');
	const actionsMap = getVersionMap(user.scenarioActionsDoc, 'actionsByScenarioSetVersionId');
	const detailedActionsMap = getVersionMap(user.scenarioDetailedActionsDoc, 'detailedActionsByScenarioSetVersionId');
	const primarySnapshot = pickLatestVersionSnapshot(summaryMap, progressMap, actionsMap, detailedActionsMap);
	const primarySummary = primarySnapshot.summary || {};
	const progress = primarySnapshot.progress || {};
	const actionSummary = primarySnapshot.actionSummary || {};
	const detailedActionSummary = primarySnapshot.detailedActionSummary || {};
	const completionMeta = primarySnapshot.completionMeta || {};
	const totalRounds = Math.max(
		toNumber(primarySummary.totalRounds, 0),
		toNumber(progress.totalRounds, 0)
	);
	const roundsCompleted = Math.max(
		toNumber(primarySummary.roundsCompleted, 0),
		toNumber(progress.roundsCompleted, 0),
		toNumber(user.uniqueSetsComplete, 0)
	);
	const optimalChoices = Math.max(
		toNumber(primarySummary.optimalChoices, 0),
		toNumber(progress.optimalChoices, 0)
	);
	const totalGameTime = Math.max(
		toNumber(primarySummary.totalGameTime, 0),
		toNumber(progress.totalGameTime, 0),
		toNumber(user.gametime, 0)
	);
	const earnings = Math.max(
		toNumber(primarySummary.earnings, 0),
		toNumber(progress.earnings, 0),
		toNumber(user.earnings, 0)
	);
	const completedGame = Boolean(primarySummary.completedGame || progress.completedGame || (totalRounds > 0 && roundsCompleted >= totalRounds));
	const optimalRate = roundsCompleted > 0 ? (optimalChoices / roundsCompleted) * 100 : 0;
	const lastActivityAt = resolveText(primarySnapshot.lastActivityAt, progress.lastActivityAt);
	const completionInfo = resolveCompletionInfo(primarySummary);
	const bestAvailableDateInfo = resolveBestAvailableDateInfo({
		summary: primarySummary,
		user,
		orders: user.orders,
		actions: user.actions,
		lastActivityAt,
		sessionStartedAt: primarySnapshot.sessionStartedAt
	});
	const liveSessionId = resolveText(primarySummary.liveSessionId, progress.liveSessionId);
	const sessionLabel = resolveText(primarySummary.sessionLabel, progress.sessionLabel);

	return {
		displayName: resolveText(user.displayName, user.id),
		primaryVersionId: primarySnapshot.versionId || '',
		primarySnapshot,
		primarySummary,
		progress,
		actionSummary,
		detailedActionSummary,
		completionMeta,
		totalRounds,
		roundsCompleted,
		optimalChoices,
		totalGameTime,
		earnings,
		completedGame,
		optimalRate,
		lastActivityAt,
		completionDate: completionInfo.value || '',
		completionDateSource: completionInfo.source,
		completionDateMs: toMillis(completionInfo.value),
		bestAvailableDate: bestAvailableDateInfo.value || '',
		bestAvailableDateSource: bestAvailableDateInfo.source,
		bestAvailableDateMs: toMillis(bestAvailableDateInfo.value),
		liveSessionId,
		sessionLabel
	};
}
