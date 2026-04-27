import { buildQualtricsMatchKey, buildQualtricsUserKey } from './qualtrics.js';
import { deriveUserRunMetrics, toMillis, toNumber } from './userRunMetrics.js';

function clamp01(value) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return 0;
	return Math.min(1, Math.max(0, numeric));
}

function mean(values = []) {
	const numeric = values
		.map((value) => Number(value))
		.filter((value) => Number.isFinite(value));
	return numeric.length > 0
		? numeric.reduce((sum, value) => sum + value, 0) / numeric.length
		: null;
}

function median(values = []) {
	const numeric = values
		.map((value) => Number(value))
		.filter((value) => Number.isFinite(value))
		.sort((left, right) => left - right);
	if (numeric.length === 0) return null;
	const middle = Math.floor(numeric.length / 2);
	return numeric.length % 2 === 0
		? (numeric[middle - 1] + numeric[middle]) / 2
		: numeric[middle];
}

function getNestedNumber(source = {}, paths = []) {
	for (const path of paths) {
		const value = path.split('.').reduce((current, key) => current?.[key], source);
		const numeric = Number(value);
		if (Number.isFinite(numeric)) return numeric;
	}
	return null;
}

function getRoundScoreRows(user = {}) {
	const roundSummaries = Array.isArray(user.actions)
		? user.actions
			.filter((entry) => String(entry?.type || '').trim() === 'round_summary')
			.map((entry) => {
				const roundIndex = Math.max(1, Number(entry?.round_index) || 1);
				const scoreRatio = getNestedNumber(entry, [
					'outcome_snapshot.score_ratio_to_best',
					'post_state.score_ratio_to_best',
					'score_ratio_to_best',
					'reward'
				]);
				const participantScore = getNestedNumber(entry, [
					'outcome_snapshot.participant_score',
					'post_state.participant_score',
					'participant_score'
				]);
				const bestScore = getNestedNumber(entry, [
					'outcome_snapshot.best_score',
					'post_state.best_score',
					'best_score'
				]);
				return {
					roundIndex,
					scenarioId: String(entry?.scenario_id ?? '').trim(),
					scoreRatio: scoreRatio == null ? null : clamp01(scoreRatio),
					participantScore,
					bestScore,
					success: entry?.success !== false
				};
			})
		: [];

	return roundSummaries
		.filter((row) => row.success)
		.sort((left, right) => left.roundIndex - right.roundIndex);
}

function getQualtricsStudentName(response = {}) {
	const rawFields = response?.raw_fields && typeof response.raw_fields === 'object' ? response.raw_fields : {};
	return [
		response?.student_name,
		rawFields.name,
		rawFields.Name,
		`${rawFields.RecipientFirstName || ''} ${rawFields.RecipientLastName || ''}`
	]
		.map((value) => String(value ?? '').trim())
		.find(Boolean) || '';
}

function getQualtricsUserKey(response = {}) {
	return buildQualtricsUserKey(response?.user_id || response?.raw_fields?.userID || response?.raw_fields?.userId);
}

function pickLatestQualtrics(existing, next) {
	if (!next) return existing || null;
	if (!existing) return next;
	const nextMs = Math.max(toMillis(next?.recorded_at), toMillis(next?.imported_at));
	const existingMs = Math.max(toMillis(existing?.recorded_at), toMillis(existing?.imported_at));
	return nextMs >= existingMs ? next : existing;
}

function getLatestQualtricsIndexes(responses = []) {
	const byMatch = new Map();
	const byUser = new Map();
	for (const response of Array.isArray(responses) ? responses : []) {
		if (response?.finished === false) continue;
		const matchKey = String(response?.match_key || buildQualtricsMatchKey(response?.user_id, response?.result_access_key)).trim();
		const userKey = getQualtricsUserKey(response);
		if (matchKey) {
			byMatch.set(matchKey, pickLatestQualtrics(byMatch.get(matchKey), {
				...response,
				match_key: matchKey
			}));
		}
		if (userKey) {
			byUser.set(userKey, pickLatestQualtrics(byUser.get(userKey), {
				...response,
				user_key: userKey
			}));
		}
	}
	return { byMatch, byUser };
}

function getPerformanceLabel(score) {
	const numeric = Number(score);
	if (!Number.isFinite(numeric)) return 'Needs review';
	if (numeric >= 90) return 'Excellent';
	if (numeric >= 80) return 'Strong';
	if (numeric >= 70) return 'Solid';
	return 'Needs review';
}

function getUserCandidateDateMs(candidate = {}) {
	return Math.max(
		toMillis(candidate?.metrics?.completionDate),
		toMillis(candidate?.metrics?.bestAvailableDate),
		toMillis(candidate?.user?.updatedAt),
		toMillis(candidate?.user?.createdAt)
	);
}

function pickBestCompletedUserCandidate(existing, next) {
	if (!next) return existing || null;
	if (!existing) return next;
	const nextDateMs = getUserCandidateDateMs(next);
	const existingDateMs = getUserCandidateDateMs(existing);
	if (nextDateMs !== existingDateMs) {
		return nextDateMs > existingDateMs ? next : existing;
	}
	const nextRounds = toNumber(next?.metrics?.roundsCompleted, 0);
	const existingRounds = toNumber(existing?.metrics?.roundsCompleted, 0);
	if (nextRounds !== existingRounds) {
		return nextRounds > existingRounds ? next : existing;
	}
	const nextId = String(next?.user?.id ?? '');
	const existingId = String(existing?.user?.id ?? '');
	if (nextId.trim() === nextId && existingId.trim() !== existingId) return next;
	return existing;
}

function getCompletedUserCandidates(users = []) {
	const byUserKey = new Map();
	for (const user of Array.isArray(users) ? users : []) {
		const metrics = deriveUserRunMetrics(user);
		if (!metrics.completedGame) continue;
		const userKey = buildQualtricsUserKey(user.id) || String(user.id ?? '').trim().toLowerCase();
		if (!userKey) continue;
		byUserKey.set(userKey, pickBestCompletedUserCandidate(byUserKey.get(userKey), { user, metrics }));
	}
	return [...byUserKey.values()];
}

function normalizeByRange(value, minValue, maxValue, fallback = 0) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return fallback;
	if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return fallback;
	if (minValue === maxValue) return numeric >= maxValue ? 1 : fallback;
	return clamp01((numeric - minValue) / (maxValue - minValue));
}

function normalizeByMax(value, maxValue, fallback = 0) {
	const numeric = Number(value);
	const maxNumeric = Number(maxValue);
	if (!Number.isFinite(numeric) || !Number.isFinite(maxNumeric) || maxNumeric <= 0) return fallback;
	return clamp01(numeric / maxNumeric);
}

function attachClassRelativeScores(rows = []) {
	const validEarnings = rows
		.map((row) => Number(row.earnings))
		.filter((value) => Number.isFinite(value) && value >= 0);
	const minEarnings = validEarnings.length ? Math.min(...validEarnings) : 0;
	const maxEarnings = validEarnings.length ? Math.max(...validEarnings) : 0;
	const maxOptimalRate = Math.max(0, ...rows.map((row) => Number(row.optimalRate)).filter(Number.isFinite));
	const maxRoundsCompleted = Math.max(0, ...rows.map((row) => Number(row.roundsCompleted)).filter(Number.isFinite));

	return rows.map((row) => {
		const hasRoundScoreRatio = row.averageScoreRatio != null
			&& row.averageScoreRatio !== ''
			&& Number.isFinite(Number(row.averageScoreRatio));
		const earningsNormalized = normalizeByRange(row.earnings, minEarnings, maxEarnings, validEarnings.length <= 1 ? 1 : 0);
		const outcomeScore = hasRoundScoreRatio ? clamp01(row.averageScoreRatio) : earningsNormalized;
		const optimalScore = normalizeByMax(row.optimalRate, maxOptimalRate);
		const progressScore = normalizeByMax(row.roundsCompleted, maxRoundsCompleted);
		const totalScore = Math.round(
			100 * (
				0.7 * outcomeScore
				+ 0.2 * optimalScore
				+ 0.1 * progressScore
			)
		);
		return {
			...row,
			earningsNormalized,
			earningsPercentile: earningsNormalized,
			outcomeScore,
			outcomeScoreBasis: hasRoundScoreRatio ? 'average_score_ratio' : 'earnings_normalized',
			scoreComponent: outcomeScore,
			scoreBasis: hasRoundScoreRatio ? 'average_score_ratio' : 'earnings_normalized',
			optimalScore,
			progressScore,
			totalScore,
			performanceLabel: getPerformanceLabel(totalScore)
		};
	});
}

function buildClassAverages(rows = [], stats = {}) {
	const list = Array.isArray(rows) ? rows : [];
	const scoreRatioValues = list
		.map((row) => row.averageScoreRatio)
		.filter((value) => value != null && value !== '' && Number.isFinite(Number(value)));
	return {
		matched_student_count: list.length,
		missing_qualtrics_count: toNumber(stats.missingQualtricsCount, 0),
		average_total_score: mean(list.map((row) => row.totalScore)),
		median_total_score: median(list.map((row) => row.totalScore)),
		average_earnings: mean(list.map((row) => row.earnings)),
		median_earnings: median(list.map((row) => row.earnings)),
		average_optimal_rate: mean(list.map((row) => row.optimalRate)),
		average_rounds_completed: mean(list.map((row) => row.roundsCompleted)),
		average_total_game_time_seconds: mean(list.map((row) => row.totalGameTime)),
		average_outcome_score: mean(list.map((row) => row.outcomeScore)),
		average_progress_score: mean(list.map((row) => row.progressScore)),
		average_score_ratio: scoreRatioValues.length ? mean(scoreRatioValues) : null
	};
}

export function buildAdminScoreSheet(users = [], qualtricsResponses = []) {
	const { byMatch: qualtricsByMatch, byUser: qualtricsByUser } = getLatestQualtricsIndexes(qualtricsResponses);
	const completedUserCandidates = getCompletedUserCandidates(users);
	const missingQualtrics = [];
	const rows = [];
	let maxRound = 0;

	for (const { user, metrics } of completedUserCandidates) {
		const resultAccessKey = String(metrics.primarySummary?.resultAccessKey ?? '').trim();
		const matchKey = buildQualtricsMatchKey(user.id, resultAccessKey);
		const userKey = buildQualtricsUserKey(user.id);
		const qualtrics = (matchKey ? qualtricsByMatch.get(matchKey) : null) || (userKey ? qualtricsByUser.get(userKey) : null);
		if (!qualtrics) {
			missingQualtrics.push({
				id: user.id,
				displayName: metrics.displayName,
				matchKey
			});
			continue;
		}

		const roundScores = getRoundScoreRows(user);
		const ratioValues = roundScores
			.map((row) => row.scoreRatio)
			.filter((value) => value != null);
		const averageScoreRatio = ratioValues.length > 0 ? clamp01(mean(ratioValues)) : null;
		const roundsCompleted = Math.max(toNumber(metrics.roundsCompleted, 0), roundScores.length);
		const optimalRate = roundsCompleted > 0 ? clamp01(toNumber(metrics.optimalChoices, 0) / roundsCompleted) : 0;
		const averageSecondsPerRound = roundsCompleted > 0
			? Math.max(0, toNumber(metrics.totalGameTime, 0) / roundsCompleted)
			: null;
		maxRound = Math.max(maxRound, ...roundScores.map((row) => row.roundIndex), roundsCompleted);
		const qualtricsStudentName = getQualtricsStudentName(qualtrics);

		rows.push({
			participantId: user.id,
			displayName: qualtricsStudentName || metrics.displayName || user.id,
			gameDisplayName: metrics.displayName || user.id,
			scenarioSetVersionId: metrics.primaryVersionId,
			qualtricsResponseId: qualtrics.response_id || qualtrics.id,
			qualtricsUserId: qualtrics.user_id || '',
			qualtricsRecordedAt: qualtrics.recorded_at || '',
			qualtricsSaveStatus: qualtrics.save_status || '',
			qualtricsFinishedId: qualtrics.finished_id || qualtrics.raw_fields?.finishedid || '',
			qualtricsMatchMethod: qualtrics.match_key && qualtrics.match_key === matchKey ? 'result_code' : 'user_id',
			completionDate: metrics.completionDate,
			earnings: toNumber(metrics.earnings, 0),
			roundsCompleted,
			totalRounds: toNumber(metrics.totalRounds, 0),
			totalGameTime: toNumber(metrics.totalGameTime, 0),
			optimalChoices: toNumber(metrics.optimalChoices, 0),
			optimalRate,
			averageScoreRatio,
			averageSecondsPerRound,
			roundScores
		});
	}

	const scoredRows = attachClassRelativeScores(rows)
		.sort((left, right) => {
			if (right.totalScore !== left.totalScore) return right.totalScore - left.totalScore;
			return left.displayName.localeCompare(right.displayName);
		});
	const stats = {
		completedGameCount: completedUserCandidates.length,
		matchedScoreCount: scoredRows.length,
		missingQualtricsCount: missingQualtrics.length,
		qualtricsResponseCount: Array.isArray(qualtricsResponses) ? qualtricsResponses.length : 0
	};

	return {
		rows: scoredRows,
		maxRound,
		stats,
		classAverages: buildClassAverages(scoredRows, stats),
		missingQualtrics
	};
}

export function getAdminScoreExportRows(scoreRows = [], maxRound = 0) {
	const roundColumns = Array.from({ length: Math.max(0, Number(maxRound) || 0) }, (_, index) => index + 1);
	return (Array.isArray(scoreRows) ? scoreRows : []).map((row) => {
		const roundScoreMap = new Map((row.roundScores || []).map((score) => [score.roundIndex, score.scoreRatio]));
		const out = {
			participant_id: row.participantId,
			student_name: row.displayName,
			game_user_id: row.participantId,
			game_display_name: row.gameDisplayName,
			total_score: row.totalScore,
			performance_label: row.performanceLabel,
			outcome_score: row.outcomeScore,
			outcome_score_basis: row.outcomeScoreBasis,
			earnings_normalized: row.earningsNormalized,
			optimal_score: row.optimalScore,
			progress_score: row.progressScore,
			score_component: row.scoreComponent,
			score_basis: row.scoreBasis,
			average_score_ratio: row.averageScoreRatio,
			earnings_percentile: row.earningsPercentile,
			optimal_rate: row.optimalRate,
			rounds_completed: row.roundsCompleted,
			total_rounds: row.totalRounds,
			total_game_time_seconds: row.totalGameTime,
			earnings: row.earnings,
			qualtrics_response_id: row.qualtricsResponseId,
			qualtrics_user_id: row.qualtricsUserId,
			qualtrics_finished_id: row.qualtricsFinishedId,
			qualtrics_match_method: row.qualtricsMatchMethod,
			qualtrics_recorded_at: row.qualtricsRecordedAt,
			qualtrics_save_status: row.qualtricsSaveStatus,
			game_completion_at: row.completionDate,
			scenario_set_version_id: row.scenarioSetVersionId
		};
		for (const round of roundColumns) {
			out[`round_${round}_score_ratio`] = roundScoreMap.get(round) ?? '';
		}
		return out;
	});
}

export function getAdminScoreClassAverageExportRows(classAverages = {}) {
	return [{ ...(classAverages || {}) }];
}
