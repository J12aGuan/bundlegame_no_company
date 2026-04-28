import { buildQualtricsMatchKey, buildQualtricsUserKey } from './qualtrics.js';
import { BUNDLEGAME_STUDY_TOTAL_ROUNDS } from './researchStudy.js';
import { deriveUserRunMetrics, getVersionIds, getVersionMap, normalizeDateLike, toMillis, toNumber } from './userRunMetrics.js';

export const RESEARCH_EXPORT_SCHEMA_VERSION = 'bundlegame_research_export_v1';
export const FIXED_SCORE_ROUND_COUNT = BUNDLEGAME_STUDY_TOTAL_ROUNDS;
export const ROUND_SCORE_STATUSES = {
	VALID: 'valid',
	NOT_PLAYED: 'not_played',
	PLAYED_INVALID: 'played_invalid',
	EXPORT_MISSING: 'export_missing'
};

const PARTICIPANT_SUMMARY_RAW_COLUMNS = [
	'schema_version',
	'export_mode',
	'participant_id',
	'display_name',
	'scenario_set_version_id',
	'created_at',
	'updated_at',
	'completed_game',
	'rounds_completed',
	'total_rounds',
	'earnings',
	'optimal_choices',
	'total_game_time_seconds',
	'live_session_id',
	'session_label',
	'result_access_key',
	'completion_at',
	'last_activity_at'
];

const PARTICIPANT_SUMMARY_PUBLICATION_COLUMNS = [
	'schema_version',
	'export_mode',
	'publication_participant_id',
	'scenario_set_version_id',
	'completed_game',
	'rounds_completed',
	'total_rounds',
	'earnings',
	'optimal_choices',
	'total_game_time_seconds',
	'completion_at',
	'last_activity_at'
];

const PER_ROUND_DECISION_BASE_COLUMNS = [
	'schema_version',
	'export_mode',
	'scenario_set_version_id',
	'round_index',
	'phase',
	'policy_arm',
	'study_protocol_id',
	'policy_name',
	'policy_version',
	'dataset_snapshot_id',
	'legal_action_mask_version',
	'scenario_id',
	'current_city',
	'final_location',
	'recommendation_source',
	'recommendation_quality',
	'shown_recommendation_bundle_ids_json',
	'shown_ranked_bundles_json',
	'scenario_order_ids_json',
	'chosen_orders_json',
	'best_bundle_ids_json',
	'success',
	'duration_seconds',
	'earnings',
	'reward',
	'score_ratio_to_best',
	'participant_score',
	'best_score',
	'regret',
	'exact_optimal',
	'near_optimal',
	'decision_timestamp',
	'timestamp_available',
	'missing_required_fields_json'
];

const ACTION_BASE_COLUMNS = [
	'schema_version',
	'export_mode',
	'scenario_set_version_id',
	'action_source',
	'scenario_id',
	'phase',
	'round_index',
	'total_time_seconds',
	'time_summary_json',
	'action_payload_json'
];

const RECOMMENDATION_EXPOSURE_BASE_COLUMNS = [
	'schema_version',
	'export_mode',
	'scenario_set_version_id',
	'round_index',
	'phase',
	'policy_arm',
	'policy_name',
	'policy_version',
	'dataset_snapshot_id',
	'legal_action_mask_version',
	'scenario_id',
	'recommendation_source',
	'recommendation_quality',
	'shown_recommendation_bundle_ids_json',
	'shown_ranked_bundles_json',
	'chosen_orders_json',
	'best_bundle_ids_json',
	'selected_recommended_bundle',
	'exposure_timestamp'
];

const SURVEY_LINKAGE_RAW_COLUMNS = [
	'schema_version',
	'export_mode',
	'participant_id',
	'display_name',
	'scenario_set_version_id',
	'survey_matched',
	'match_method',
	'qualtrics_response_id',
	'qualtrics_user_id',
	'qualtrics_finished_id',
	'qualtrics_result_code',
	'qualtrics_match_key',
	'student_name',
	'survey_finished',
	'survey_progress',
	'survey_duration_seconds',
	'survey_started_at',
	'survey_recorded_at',
	'survey_save_status',
	'survey_source',
	'raw_fields_json'
];

const SURVEY_LINKAGE_PUBLICATION_COLUMNS = [
	'schema_version',
	'export_mode',
	'publication_participant_id',
	'scenario_set_version_id',
	'survey_matched',
	'match_method',
	'survey_finished',
	'survey_progress',
	'survey_duration_seconds',
	'survey_started_at',
	'survey_recorded_at',
	'survey_save_status',
	'survey_source'
];

export const RESEARCH_EXPORT_SCHEMAS = {
	raw_research_export: {
		participant_summary: PARTICIPANT_SUMMARY_RAW_COLUMNS,
		per_round_decisions: ['participant_id', 'display_name', 'decision_event_id', ...PER_ROUND_DECISION_BASE_COLUMNS],
		actions: ['participant_id', 'display_name', ...ACTION_BASE_COLUMNS],
		recommendation_exposure: ['participant_id', 'display_name', 'decision_event_id', ...RECOMMENDATION_EXPOSURE_BASE_COLUMNS],
		survey_linkage: SURVEY_LINKAGE_RAW_COLUMNS
	},
	publication_export: {
		participant_summary: PARTICIPANT_SUMMARY_PUBLICATION_COLUMNS,
		per_round_decisions: ['publication_participant_id', 'decision_publication_id', ...PER_ROUND_DECISION_BASE_COLUMNS],
		actions: ['publication_participant_id', ...ACTION_BASE_COLUMNS],
		recommendation_exposure: ['publication_participant_id', 'decision_publication_id', ...RECOMMENDATION_EXPOSURE_BASE_COLUMNS],
		survey_linkage: SURVEY_LINKAGE_PUBLICATION_COLUMNS
	}
};

const PUBLICATION_FORBIDDEN_COLUMNS = new Set([
	'participant_id',
	'display_name',
	'student_name',
	'game_user_id',
	'game_display_name',
	'qualtrics_response_id',
	'qualtrics_user_id',
	'qualtrics_finished_id',
	'qualtrics_result_code',
	'qualtrics_match_key',
	'response_id',
	'result_code',
	'result_access_key',
	'match_key',
	'raw_fields_json',
	'live_session_id',
	'session_label'
]);

const PUBLICATION_REQUIRED_DECISION_COLUMNS = [
	'phase',
	'policy_arm',
	'scenario_id',
	'recommendation_source',
	'chosen_orders_json',
	'best_bundle_ids_json',
	'reward',
	'legal_action_mask_version'
];

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

function stableHash(value = '') {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(36).padStart(7, '0');
}

export function getPublicationParticipantId(participantId = '', salt = '') {
	const normalizedId = String(participantId ?? '').trim();
	const normalizedSalt = String(salt ?? '').trim() || 'bundlegame_publication_export_v1';
	return `bgp_${stableHash(`${normalizedSalt}::${normalizedId || 'missing'}`)}`;
}

function jsonCell(value) {
	if (value == null || value === '') return '';
	try {
		return JSON.stringify(value);
	} catch (_error) {
		return String(value);
	}
}

function normalizeString(value = '') {
	return String(value ?? '').trim();
}

function normalizeBoolean(value) {
	return Boolean(value);
}

function getNestedValue(source = {}, paths = []) {
	for (const path of paths) {
		const value = path.split('.').reduce((current, key) => current?.[key], source);
		if (value !== undefined && value !== null && value !== '') return value;
	}
	return '';
}

function getNestedNumber(source = {}, paths = []) {
	for (const path of paths) {
		const value = path.split('.').reduce((current, key) => current?.[key], source);
		const numeric = Number(value);
		if (Number.isFinite(numeric)) return numeric;
	}
	return null;
}

function getNestedBoolean(source = {}, paths = []) {
	for (const path of paths) {
		const value = path.split('.').reduce((current, key) => current?.[key], source);
		if (value === true || value === false) return value;
		const normalized = String(value ?? '').trim().toLowerCase();
		if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
		if (['false', '0', 'no', 'n'].includes(normalized)) return false;
	}
	return '';
}

function normalizeIdArray(value) {
	if (!Array.isArray(value)) return [];
	return value.map((entry) => normalizeString(entry)).filter(Boolean);
}

function normalizeRankedBundleRows(value) {
	if (!Array.isArray(value)) return [];
	return value
		.map((entry) => Array.isArray(entry) ? normalizeIdArray(entry) : normalizeIdArray([entry]))
		.filter((entry) => entry.length > 0);
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
				const success = entry?.success !== false;
				const hasValidScoreRatio = success && scoreRatio != null && Number.isFinite(Number(scoreRatio));
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
					scoreRatio: hasValidScoreRatio ? clamp01(scoreRatio) : null,
					participantScore,
					bestScore,
					success,
					status: hasValidScoreRatio ? ROUND_SCORE_STATUSES.VALID : ROUND_SCORE_STATUSES.PLAYED_INVALID
				};
			})
		: [];

	return roundSummaries
		.filter((row) => row.roundIndex >= 1 && row.roundIndex <= FIXED_SCORE_ROUND_COUNT)
		.sort((left, right) => left.roundIndex - right.roundIndex);
}

function pickRoundScore(existing, next) {
	if (!existing) return next;
	if (existing.status !== ROUND_SCORE_STATUSES.VALID && next.status === ROUND_SCORE_STATUSES.VALID) {
		return next;
	}
	if (existing.status === ROUND_SCORE_STATUSES.VALID && next.status !== ROUND_SCORE_STATUSES.VALID) {
		return existing;
	}
	return next;
}

function buildFixedRoundScoreGrid(roundScores = [], roundsCompleted = 0) {
	const byRound = new Map();
	for (const row of Array.isArray(roundScores) ? roundScores : []) {
		const roundIndex = Math.max(1, Number(row?.roundIndex) || 0);
		if (roundIndex < 1 || roundIndex > FIXED_SCORE_ROUND_COUNT) continue;
		byRound.set(roundIndex, pickRoundScore(byRound.get(roundIndex), row));
	}

	const completedCount = Math.max(0, Number(roundsCompleted) || 0);
	return Array.from({ length: FIXED_SCORE_ROUND_COUNT }, (_, index) => {
		const roundIndex = index + 1;
		const row = byRound.get(roundIndex);
		if (row) {
			return {
				roundIndex,
				scenarioId: row.scenarioId || '',
				scoreRatio: row.status === ROUND_SCORE_STATUSES.VALID ? row.scoreRatio : null,
				participantScore: row.participantScore ?? null,
				bestScore: row.bestScore ?? null,
				success: row.success,
				status: row.status || ROUND_SCORE_STATUSES.PLAYED_INVALID
			};
		}
		return {
			roundIndex,
			scenarioId: '',
			scoreRatio: null,
			participantScore: null,
			bestScore: null,
			success: null,
			status: roundIndex <= completedCount
				? ROUND_SCORE_STATUSES.EXPORT_MISSING
				: ROUND_SCORE_STATUSES.NOT_PLAYED
		};
	});
}

function summarizeRoundScoreStatuses(roundScores = []) {
	const counts = {
		valid: 0,
		played_invalid: 0,
		export_missing: 0,
		not_played: 0
	};
	for (const row of Array.isArray(roundScores) ? roundScores : []) {
		if (Object.prototype.hasOwnProperty.call(counts, row?.status)) {
			counts[row.status] += 1;
		}
	}
	return counts;
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

		const observedRoundScores = getRoundScoreRows(user);
		const observedRoundCount = Math.max(0, ...observedRoundScores.map((row) => row.roundIndex));
		const roundsCompleted = Math.max(toNumber(metrics.roundsCompleted, 0), observedRoundCount);
		const roundScores = buildFixedRoundScoreGrid(observedRoundScores, roundsCompleted);
		const roundScoreStatusCounts = summarizeRoundScoreStatuses(roundScores);
		const ratioValues = roundScores
			.filter((row) => row.status === ROUND_SCORE_STATUSES.VALID)
			.map((row) => row.scoreRatio)
			.filter((value) => value != null);
		const averageScoreRatio = ratioValues.length > 0 ? clamp01(mean(ratioValues)) : null;
		const optimalRate = roundsCompleted > 0 ? clamp01(toNumber(metrics.optimalChoices, 0) / roundsCompleted) : 0;
		const averageSecondsPerRound = roundsCompleted > 0
			? Math.max(0, toNumber(metrics.totalGameTime, 0) / roundsCompleted)
			: null;
		maxRound = FIXED_SCORE_ROUND_COUNT;
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
			averageScoreRatioStatus: ratioValues.length > 0 ? 'computed_from_valid_round_scores' : 'no_valid_round_scores',
			validScoreRatioRoundCount: roundScoreStatusCounts.valid,
			playedInvalidRoundCount: roundScoreStatusCounts.played_invalid,
			exportMissingRoundCount: roundScoreStatusCounts.export_missing,
			notPlayedRoundCount: roundScoreStatusCounts.not_played,
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

function getUserVersionMaps(user = {}) {
	return {
		summaryMap: getVersionMap(user.summaryDoc || user.progressSummary, 'summaryByScenarioSetVersionId'),
		progressMap: getVersionMap(user.scenarioSetProgressDoc, 'progressByScenarioSetVersionId'),
		actionsMap: getVersionMap(user.scenarioActionsDoc, 'actionsByScenarioSetVersionId'),
		detailedActionsMap: getVersionMap(user.scenarioDetailedActionsDoc, 'detailedActionsByScenarioSetVersionId')
	};
}

function getParticipantVersions(user = {}) {
	const maps = getUserVersionMaps(user);
	const versionIds = getVersionIds(maps.summaryMap, maps.progressMap, maps.actionsMap, maps.detailedActionsMap);
	if (versionIds.length === 0) {
		const metrics = deriveUserRunMetrics(user);
		return [{
			versionId: metrics.primaryVersionId || '',
			summary: metrics.primarySummary || {},
			progress: metrics.progress || {},
			actionSummary: metrics.actionSummary || {},
			detailedActionSummary: metrics.detailedActionSummary || {}
		}];
	}
	return versionIds.map((versionId) => ({
		versionId,
		summary: maps.summaryMap?.[versionId] || {},
		progress: maps.progressMap?.[versionId] || {},
		actionSummary: maps.actionsMap?.[versionId] || {},
		detailedActionSummary: maps.detailedActionsMap?.[versionId] || {}
	}));
}

function buildParticipantSummaryRow(user = {}, version = {}, mode = 'raw_research_export', options = {}) {
	const summary = version.summary || {};
	const progress = version.progress || {};
	const completedGame = Boolean(summary.completedGame || progress.completedGame);
	const row = {
		schema_version: RESEARCH_EXPORT_SCHEMA_VERSION,
		export_mode: mode,
		scenario_set_version_id: version.versionId || '',
		completed_game: completedGame,
		rounds_completed: Math.max(toNumber(summary.roundsCompleted, 0), toNumber(progress.roundsCompleted, 0)),
		total_rounds: Math.max(toNumber(summary.totalRounds, 0), toNumber(progress.totalRounds, 0)),
		earnings: Math.max(toNumber(summary.earnings, 0), toNumber(progress.earnings, 0)),
		optimal_choices: Math.max(toNumber(summary.optimalChoices, 0), toNumber(progress.optimalChoices, 0)),
		total_game_time_seconds: Math.max(toNumber(summary.totalGameTime, 0), toNumber(progress.totalGameTime, 0)),
		completion_at: normalizeDateLike(summary?.completionMeta?.finalSaveConfirmedAt || summary?.completionMeta?.handoffPostedAt || ''),
		last_activity_at: normalizeDateLike(summary.lastActivityAt || progress.lastActivityAt || ''),
		created_at: normalizeDateLike(user.createdAt),
		updated_at: normalizeDateLike(user.updatedAt)
	};

	if (mode === 'publication_export') {
		return {
			publication_participant_id: getPublicationParticipantId(user.id, options.pseudonymSalt),
			...row
		};
	}

	return {
		participant_id: normalizeString(user.id),
		display_name: normalizeString(user.displayName || user.id),
		...row,
		live_session_id: normalizeString(summary.liveSessionId || progress.liveSessionId),
		session_label: normalizeString(summary.sessionLabel || progress.sessionLabel),
		result_access_key: normalizeString(summary.resultAccessKey)
	};
}

function getDecisionScoreRatio(action = {}) {
	const value = getNestedNumber(action, [
		'outcome_snapshot.score_ratio_to_best',
		'post_state.score_ratio_to_best',
		'score_ratio_to_best'
	]);
	return value == null ? '' : clamp01(value);
}

function getDecisionReward(action = {}) {
	return getNestedNumber(action, [
		'reward',
		'outcome_snapshot.reward',
		'post_state.reward',
		'outcome_snapshot.score_ratio_to_best',
		'post_state.score_ratio_to_best'
	]);
}

function buildMissingRequiredDecisionFields(row = {}) {
	return PUBLICATION_REQUIRED_DECISION_COLUMNS.filter((column) => {
		const value = row?.[column];
		if (value === undefined || value === null) return true;
		if (typeof value === 'string') return value.trim() === '';
		return false;
	});
}

function getDecisionPublicationId(userId = '', action = {}, options = {}) {
	const participant = getPublicationParticipantId(userId, options.pseudonymSalt);
	const version = normalizeString(action.scenarioSetVersionId).replace(/[^a-zA-Z0-9_-]/g, '_') || 'dataset';
	const round = Math.max(1, Number(action.round_index) || 1);
	const scenario = normalizeString(action.scenario_id).replace(/[^a-zA-Z0-9_-]/g, '_') || 'scenario';
	return `${participant}__${version}__round_${round}__${scenario}`;
}

function buildPerRoundDecisionRow(user = {}, action = {}, mode = 'raw_research_export', options = {}) {
	const scoreRatio = getDecisionScoreRatio(action);
	const participantScore = getNestedNumber(action, [
		'outcome_snapshot.participant_score',
		'post_state.participant_score',
		'participant_score'
	]);
	const bestScore = getNestedNumber(action, [
		'outcome_snapshot.best_score',
		'post_state.best_score',
		'best_score'
	]);
	const regret = getNestedNumber(action, [
		'outcome_snapshot.regret',
		'post_state.regret',
		'regret'
	]);
	const decisionTimestamp = normalizeDateLike(action.decision_timestamp || action.updatedAt || action.createdAt || action.timestamp);
	const row = {
		schema_version: RESEARCH_EXPORT_SCHEMA_VERSION,
		export_mode: mode,
		scenario_set_version_id: normalizeString(action.scenarioSetVersionId),
		round_index: Math.max(1, Number(action.round_index) || 1),
		phase: normalizeString(action.phase || action?.pre_state?.phase || action?.state_snapshot?.phase),
		policy_arm: normalizeString(action.policy_arm || action?.pre_state?.policy_arm || action?.state_snapshot?.policy_arm),
		study_protocol_id: normalizeString(action.study_protocol_id || action?.pre_state?.study_protocol_id || action?.state_snapshot?.study_protocol_id),
		policy_name: normalizeString(action.policy_name || action?.pre_state?.policy_name || action?.state_snapshot?.policy_name),
		policy_version: normalizeString(action.policy_version || action?.pre_state?.policy_version || action?.state_snapshot?.policy_version),
		dataset_snapshot_id: normalizeString(action.dataset_snapshot_id || action?.pre_state?.dataset_snapshot_id || action?.state_snapshot?.dataset_snapshot_id),
		legal_action_mask_version: normalizeString(action.legal_action_mask_version || action?.pre_state?.legal_action_mask_version || action?.state_snapshot?.legal_action_mask_version),
		scenario_id: normalizeString(action.scenario_id),
		current_city: normalizeString(action.current_city || action?.pre_state?.current_city || action?.state_snapshot?.current_city),
		final_location: normalizeString(action.final_location || action?.post_state?.final_location || action?.outcome_snapshot?.final_location),
		recommendation_source: normalizeString(action.recommendation_source || action?.pre_state?.recommendation_source || action?.state_snapshot?.recommendation_source),
		recommendation_quality: normalizeString(action.recommendation_quality),
		shown_recommendation_bundle_ids_json: jsonCell(normalizeIdArray(action.shown_recommendation_bundle_ids)),
		shown_ranked_bundles_json: jsonCell(normalizeRankedBundleRows(action.shown_ranked_bundles)),
		scenario_order_ids_json: jsonCell(normalizeIdArray(action.scenario_order_ids)),
		chosen_orders_json: jsonCell(normalizeIdArray(action.chosen_orders)),
		best_bundle_ids_json: jsonCell(normalizeIdArray(action.best_bundle_ids)),
		success: action.success !== false,
		duration_seconds: toNumber(action.duration, 0),
		earnings: toNumber(action.earnings, 0),
		reward: getDecisionReward(action) ?? '',
		score_ratio_to_best: scoreRatio,
		participant_score: participantScore ?? '',
		best_score: bestScore ?? '',
		regret: regret ?? '',
		exact_optimal: getNestedBoolean(action, [
			'outcome_snapshot.exact_optimal',
			'post_state.exact_optimal',
			'exact_optimal'
		]),
		near_optimal: getNestedBoolean(action, [
			'outcome_snapshot.near_optimal',
			'post_state.near_optimal',
			'near_optimal'
		]),
		decision_timestamp: decisionTimestamp,
		timestamp_available: Boolean(decisionTimestamp)
	};
	row.missing_required_fields_json = jsonCell(buildMissingRequiredDecisionFields(row));

	if (mode === 'publication_export') {
		return {
			publication_participant_id: getPublicationParticipantId(user.id, options.pseudonymSalt),
			decision_publication_id: getDecisionPublicationId(user.id, action, options),
			...row
		};
	}

	return {
		participant_id: normalizeString(user.id),
		display_name: normalizeString(user.displayName || user.id),
		decision_event_id: normalizeString(action.id),
		...row
	};
}

function getPerRoundDecisionRowsForUser(user = {}, mode = 'raw_research_export', options = {}) {
	return (Array.isArray(user.actions) ? user.actions : [])
		.filter((entry) => normalizeString(entry?.type) === 'round_summary')
		.map((entry) => buildPerRoundDecisionRow(user, entry, mode, options))
		.sort((left, right) => {
			const versionCompare = normalizeString(left.scenario_set_version_id).localeCompare(normalizeString(right.scenario_set_version_id));
			if (versionCompare !== 0) return versionCompare;
			return toNumber(left.round_index, 0) - toNumber(right.round_index, 0);
		});
}

function getScenarioActions(actionSummary = {}) {
	const value = actionSummary?.actionsByScenarioId || actionSummary?.detailedActionsByScenarioId || {};
	return value && typeof value === 'object' ? value : {};
}

function buildActionRow(user = {}, versionId = '', scenarioId = '', action = {}, actionSource = '', mode = 'raw_research_export', options = {}) {
	const row = {
		schema_version: RESEARCH_EXPORT_SCHEMA_VERSION,
		export_mode: mode,
		scenario_set_version_id: versionId,
		action_source: actionSource,
		scenario_id: normalizeString(scenarioId || action.scenario_id),
		phase: normalizeString(action.phase),
		round_index: toNumber(action.round_index, ''),
		total_time_seconds: toNumber(action.totalTimeSeconds, ''),
		time_summary_json: jsonCell(action.timeSummary || {}),
		action_payload_json: mode === 'raw_research_export' ? jsonCell(action) : ''
	};
	if (mode === 'publication_export') {
		return {
			publication_participant_id: getPublicationParticipantId(user.id, options.pseudonymSalt),
			...row
		};
	}
	return {
		participant_id: normalizeString(user.id),
		display_name: normalizeString(user.displayName || user.id),
		...row
	};
}

function getActionRowsForUser(user = {}, mode = 'raw_research_export', options = {}) {
	const rows = [];
	for (const version of getParticipantVersions(user)) {
		for (const [scenarioId, action] of Object.entries(getScenarioActions(version.actionSummary))) {
			rows.push(buildActionRow(user, version.versionId, scenarioId, action, 'action_summary', mode, options));
		}
		for (const [scenarioId, action] of Object.entries(getScenarioActions(version.detailedActionSummary))) {
			rows.push(buildActionRow(user, version.versionId, scenarioId, action, 'detailed_action_summary', mode, options));
		}
	}
	return rows;
}

function buildRecommendationExposureRow(decisionRow = {}, mode = 'raw_research_export') {
	const selectedRecommendedBundle = Boolean(
		decisionRow.chosen_orders_json
		&& decisionRow.shown_recommendation_bundle_ids_json
		&& decisionRow.chosen_orders_json === decisionRow.shown_recommendation_bundle_ids_json
	);
	const base = {
		schema_version: decisionRow.schema_version,
		export_mode: mode,
		scenario_set_version_id: decisionRow.scenario_set_version_id,
		round_index: decisionRow.round_index,
		phase: decisionRow.phase,
		policy_arm: decisionRow.policy_arm,
		policy_name: decisionRow.policy_name,
		policy_version: decisionRow.policy_version,
		dataset_snapshot_id: decisionRow.dataset_snapshot_id,
		legal_action_mask_version: decisionRow.legal_action_mask_version,
		scenario_id: decisionRow.scenario_id,
		recommendation_source: decisionRow.recommendation_source,
		recommendation_quality: decisionRow.recommendation_quality,
		shown_recommendation_bundle_ids_json: decisionRow.shown_recommendation_bundle_ids_json,
		shown_ranked_bundles_json: decisionRow.shown_ranked_bundles_json,
		chosen_orders_json: decisionRow.chosen_orders_json,
		best_bundle_ids_json: decisionRow.best_bundle_ids_json,
		selected_recommended_bundle: selectedRecommendedBundle,
		exposure_timestamp: decisionRow.decision_timestamp
	};
	if (mode === 'publication_export') {
		return {
			publication_participant_id: decisionRow.publication_participant_id,
			decision_publication_id: decisionRow.decision_publication_id,
			...base
		};
	}
	return {
		participant_id: decisionRow.participant_id,
		display_name: decisionRow.display_name,
		decision_event_id: decisionRow.decision_event_id,
		...base
	};
}

function findQualtricsForUser(user = {}, metrics = {}, indexes = {}) {
	const resultAccessKey = normalizeString(metrics?.primarySummary?.resultAccessKey);
	const matchKey = buildQualtricsMatchKey(user.id, resultAccessKey);
	const userKey = buildQualtricsUserKey(user.id);
	const byMatch = indexes.byMatch || new Map();
	const byUser = indexes.byUser || new Map();
	const byMatchResponse = matchKey ? byMatch.get(matchKey) : null;
	if (byMatchResponse) {
		return { response: byMatchResponse, matchKey, matchMethod: 'result_code' };
	}
	const byUserResponse = userKey ? byUser.get(userKey) : null;
	return { response: byUserResponse || null, matchKey, matchMethod: byUserResponse ? 'user_id' : '' };
}

function buildSurveyLinkageRow(user = {}, mode = 'raw_research_export', options = {}) {
	const metrics = deriveUserRunMetrics(user);
	const { response, matchKey, matchMethod } = findQualtricsForUser(user, metrics, options.qualtricsIndexes || {});
	const surveyMatched = Boolean(response);
	const base = {
		schema_version: RESEARCH_EXPORT_SCHEMA_VERSION,
		export_mode: mode,
		scenario_set_version_id: metrics.primaryVersionId || '',
		survey_matched: surveyMatched,
		match_method: surveyMatched ? matchMethod : '',
		survey_finished: response ? response.finished !== false : false,
		survey_progress: response?.progress ?? '',
		survey_duration_seconds: response?.duration_seconds ?? '',
		survey_started_at: response?.started_at || '',
		survey_recorded_at: response?.recorded_at || '',
		survey_save_status: response?.save_status || '',
		survey_source: response?.source || ''
	};
	if (mode === 'publication_export') {
		return {
			publication_participant_id: getPublicationParticipantId(user.id, options.pseudonymSalt),
			...base
		};
	}
	return {
		participant_id: normalizeString(user.id),
		display_name: normalizeString(user.displayName || user.id),
		...base,
		qualtrics_response_id: response?.response_id || response?.id || '',
		qualtrics_user_id: response?.user_id || '',
		qualtrics_finished_id: response?.finished_id || '',
		qualtrics_result_code: response?.result_code || '',
		qualtrics_match_key: response?.match_key || matchKey || '',
		student_name: getQualtricsStudentName(response || {}),
		raw_fields_json: response ? jsonCell(response.raw_fields || {}) : ''
	};
}

function enforceSchemaRows(rows = [], columns = []) {
	return (Array.isArray(rows) ? rows : []).map((row) => Object.fromEntries(
		columns.map((column) => [column, row?.[column] ?? ''])
	));
}

export function buildResearchExport(users = [], qualtricsResponses = [], options = {}) {
	const mode = options.mode === 'publication_export' ? 'publication_export' : 'raw_research_export';
	const schemas = RESEARCH_EXPORT_SCHEMAS[mode];
	const qualtricsIndexes = getLatestQualtricsIndexes(qualtricsResponses);
	const context = {
		...options,
		mode,
		qualtricsIndexes
	};
	const participantRows = [];
	const decisionRows = [];
	const actionRows = [];
	const surveyRows = [];

	for (const user of Array.isArray(users) ? users : []) {
		for (const version of getParticipantVersions(user)) {
			participantRows.push(buildParticipantSummaryRow(user, version, mode, context));
		}
		decisionRows.push(...getPerRoundDecisionRowsForUser(user, mode, context));
		actionRows.push(...getActionRowsForUser(user, mode, context));
		surveyRows.push(buildSurveyLinkageRow(user, mode, context));
	}

	const recommendationRows = decisionRows.map((row) => buildRecommendationExposureRow(row, mode));
	const tables = {
		participant_summary: enforceSchemaRows(participantRows, schemas.participant_summary),
		per_round_decisions: enforceSchemaRows(decisionRows, schemas.per_round_decisions),
		actions: enforceSchemaRows(actionRows, schemas.actions),
		recommendation_exposure: enforceSchemaRows(recommendationRows, schemas.recommendation_exposure),
		survey_linkage: enforceSchemaRows(surveyRows, schemas.survey_linkage)
	};

	return {
		schema_version: RESEARCH_EXPORT_SCHEMA_VERSION,
		export_mode: mode,
		generated_at: normalizeDateLike(options.generatedAt || new Date().toISOString()),
		pseudonym_strategy: mode === 'publication_export'
			? 'stable salted FNV-1a hash: bgp_<hash>'
			: 'none',
		redaction: mode === 'publication_export'
			? 'direct participant identifiers, names, result codes, Qualtrics IDs, and raw survey fields excluded'
			: 'raw operational identifiers retained for internal research operations',
		schemas,
		row_counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
		tables
	};
}

export function validatePublicationExport(exportData = {}) {
	if (exportData.export_mode !== 'publication_export') {
		return { ok: true, errors: [] };
	}
	const errors = [];
	for (const [tableName, rows] of Object.entries(exportData.tables || {})) {
		const columns = exportData.schemas?.[tableName] || [];
		for (const column of columns) {
			if (PUBLICATION_FORBIDDEN_COLUMNS.has(column)) {
				errors.push(`${tableName} includes forbidden publication column: ${column}`);
			}
		}
		for (const row of rows || []) {
			for (const column of Object.keys(row || {})) {
				if (PUBLICATION_FORBIDDEN_COLUMNS.has(column)) {
					errors.push(`${tableName} row includes forbidden publication key: ${column}`);
				}
			}
		}
	}
	const decisionColumns = new Set(exportData.schemas?.per_round_decisions || []);
	for (const required of PUBLICATION_REQUIRED_DECISION_COLUMNS) {
		if (!decisionColumns.has(required)) {
			errors.push(`publication per_round_decisions schema missing required column: ${required}`);
		}
	}
	return {
		ok: errors.length === 0,
		errors
	};
}

export function getAdminScoreExportRows(scoreRows = [], maxRound = 0) {
	const roundColumns = Array.from({ length: FIXED_SCORE_ROUND_COUNT }, (_, index) => index + 1);
	return (Array.isArray(scoreRows) ? scoreRows : []).map((row) => {
		const roundScoreMap = new Map((row.roundScores || []).map((score) => [score.roundIndex, score]));
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
			average_score_ratio_status: row.averageScoreRatioStatus,
			valid_score_ratio_round_count: row.validScoreRatioRoundCount,
			played_invalid_round_count: row.playedInvalidRoundCount,
			export_missing_round_count: row.exportMissingRoundCount,
			not_played_round_count: row.notPlayedRoundCount,
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
			const roundScore = roundScoreMap.get(round);
			out[`round_${round}_score_ratio`] = roundScore?.scoreRatio ?? null;
			out[`round_${round}_score_ratio_status`] = roundScore?.status || (
				round <= Number(row.roundsCompleted || 0)
					? ROUND_SCORE_STATUSES.EXPORT_MISSING
					: ROUND_SCORE_STATUSES.NOT_PLAYED
			);
		}
		return out;
	});
}

export function getAdminScoreClassAverageExportRows(classAverages = {}) {
	return [{ ...(classAverages || {}) }];
}
