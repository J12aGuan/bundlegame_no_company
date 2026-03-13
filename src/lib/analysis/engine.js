import { applySharedItemBundleSavings } from '$lib/bundleTime.js';

export const NEAR_OPTIMAL_THRESHOLD = 0.95;
export const DEFAULT_BOOTSTRAP_B = 500;
export const DEFAULT_RANDOM_SEED = 42;

export const DECISION_FACT_EXPORT_COLUMNS = [
	'dataset_root',
	'participant_id',
	'round_index',
	'scenario_id',
	'classification',
	'phase',
	'current_city',
	'chosen_orders',
	'best_bundle_ids',
	'bundle_size',
	'success',
	'is_failure',
	'duration',
	'participant_earnings',
	'participant_modeled_time',
	'participant_score',
	'best_score',
	'score_ratio_to_best',
	'percent_regret',
	'is_exact_optimal',
	'is_near_optimal'
];

function makeIssue({
	severity = 'warning',
	issue_type = 'unknown',
	participant_id = '',
	round_index = null,
	scenario_id = '',
	message = ''
} = {}) {
	return {
		severity,
		issue_type,
		participant_id,
		round_index,
		scenario_id,
		message
	};
}

function normalizeClassification(value) {
	const normalized = String(value || '').trim().toLowerCase();
	if (normalized === 'easy' || normalized === 'medium' || normalized === 'hard') return normalized;
	return 'unclassified';
}

function valueToFloat(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function timestampToFloat(value) {
	if (value == null) return 0;
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const t = Date.parse(value);
		return Number.isFinite(t) ? t / 1000 : 0;
	}
	if (typeof value?.toDate === 'function') {
		const t = value.toDate()?.getTime?.();
		return Number.isFinite(t) ? t / 1000 : 0;
	}
	if (typeof value === 'object') {
		const seconds = Number(value.seconds);
		const nanoseconds = Number(value.nanoseconds || 0);
		if (Number.isFinite(seconds)) {
			return seconds + (Number.isFinite(nanoseconds) ? nanoseconds / 1_000_000_000 : 0);
		}
	}
	return 0;
}

function percentile(values = [], q = 0.5) {
	if (!Array.isArray(values) || values.length === 0) return null;
	const xs = [...values].sort((a, b) => a - b);
	if (xs.length === 1) return xs[0];
	const idx = (xs.length - 1) * q;
	const lo = Math.floor(idx);
	const hi = Math.min(xs.length - 1, lo + 1);
	const frac = idx - lo;
	return xs[lo] * (1 - frac) + xs[hi] * frac;
}

function summarizeContinuous(values = []) {
	if (!Array.isArray(values) || values.length === 0) {
		return {
			n: 0,
			mean: null,
			median: null,
			q1: null,
			q3: null,
			iqr: null
		};
	}
	const n = values.length;
	const mean = values.reduce((acc, x) => acc + x, 0) / n;
	const median = percentile(values, 0.5);
	const q1 = percentile(values, 0.25);
	const q3 = percentile(values, 0.75);
	return {
		n,
		mean,
		median,
		q1,
		q3,
		iqr: q1 == null || q3 == null ? null : q3 - q1
	};
}

function summarizeRate(values = []) {
	if (!Array.isArray(values) || values.length === 0) {
		return { n: 0, x: 0, rate: null };
	}
	const x = values.reduce((acc, v) => acc + (Number(v) > 0 ? 1 : 0), 0);
	return {
		n: values.length,
		x,
		rate: x / values.length
	};
}

function wilsonInterval(x, n, z = 1.959963984540054) {
	if (!Number.isFinite(x) || !Number.isFinite(n) || n <= 0) return [null, null];
	const p = x / n;
	const z2 = z * z;
	const denom = 1 + z2 / n;
	const center = (p + z2 / (2 * n)) / denom;
	const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
	return [Math.max(0, center - half), Math.min(1, center + half)];
}

function createRng(seed = DEFAULT_RANDOM_SEED) {
	let state = (Number(seed) >>> 0) || 1;
	return () => {
		state = (1664525 * state + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

function bootstrapCI(values = [], statistic = 'median', b = DEFAULT_BOOTSTRAP_B, seed = DEFAULT_RANDOM_SEED) {
	if (!Array.isArray(values) || values.length === 0) return [null, null];
	if (values.length === 1) return [values[0], values[0]];
	if (statistic !== 'median' && statistic !== 'mean') return [null, null];

	const rng = createRng(seed);
	const n = values.length;
	const samples = [];
	const rounds = Math.max(1, Number(b) || 1);

	for (let i = 0; i < rounds; i += 1) {
		const resample = [];
		for (let j = 0; j < n; j += 1) {
			resample.push(values[Math.floor(rng() * n)]);
		}
		samples.push(statistic === 'median' ? percentile(resample, 0.5) : summarizeContinuous(resample).mean);
	}

	samples.sort((a, b2) => a - b2);
	const loIdx = Math.floor(0.025 * (samples.length - 1));
	const hiIdx = Math.floor(0.975 * (samples.length - 1));
	return [samples[loIdx], samples[hiIdx]];
}

function erfApprox(x) {
	const sign = x < 0 ? -1 : 1;
	const absX = Math.abs(x);
	const t = 1 / (1 + 0.3275911 * absX);
	const a1 = 0.254829592;
	const a2 = -0.284496736;
	const a3 = 1.421413741;
	const a4 = -1.453152027;
	const a5 = 1.061405429;
	const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));
	return sign * y;
}

function normalCdf(x) {
	return 0.5 * (1 + erfApprox(x / Math.sqrt(2)));
}

function twoProportionZTest(x1, n1, x2, n2) {
	if (Math.min(n1, n2) <= 0) return { diff: null, z: null, p_value: null };
	const p1 = x1 / n1;
	const p2 = x2 / n2;
	const pooled = (x1 + x2) / (n1 + n2);
	const se = Math.sqrt(Math.max(0, pooled * (1 - pooled) * (1 / n1 + 1 / n2)));
	if (se === 0) return { diff: p1 - p2, z: null, p_value: null };
	const z = (p1 - p2) / se;
	return {
		diff: p1 - p2,
		z,
		p_value: 2 * (1 - normalCdf(Math.abs(z)))
	};
}

function bootstrapDiffMedianCI(valuesA = [], valuesB = [], b = DEFAULT_BOOTSTRAP_B, seed = DEFAULT_RANDOM_SEED) {
	if (!valuesA.length || !valuesB.length) return [null, null, null];
	const rng = createRng(seed);
	const na = valuesA.length;
	const nb = valuesB.length;
	const rounds = Math.max(1, Number(b) || 1);
	const diffs = [];

	for (let i = 0; i < rounds; i += 1) {
		const sampleA = [];
		const sampleB = [];
		for (let j = 0; j < na; j += 1) sampleA.push(valuesA[Math.floor(rng() * na)]);
		for (let j = 0; j < nb; j += 1) sampleB.push(valuesB[Math.floor(rng() * nb)]);
		const medA = percentile(sampleA, 0.5);
		const medB = percentile(sampleB, 0.5);
		diffs.push((medA ?? 0) - (medB ?? 0));
	}

	diffs.sort((a, b2) => a - b2);
	const point = (percentile(valuesA, 0.5) ?? 0) - (percentile(valuesB, 0.5) ?? 0);
	const loIdx = Math.floor(0.025 * (diffs.length - 1));
	const hiIdx = Math.floor(0.975 * (diffs.length - 1));
	return [point, diffs[loIdx], diffs[hiIdx]];
}

function getCrossCityExtraTime(orderCity = '', currentCity = '', citiesDataset = {}, storeDataset = {}) {
	if (!orderCity || !currentCity || orderCity === currentCity) return 0;

	const direct = citiesDataset?.travelTimes?.[currentCity]?.[orderCity];
	if (Number.isFinite(Number(direct)) && Number(direct) > 0) return Number(direct);

	const row = storeDataset?.distances?.[currentCity] || {};
	const destinations = Array.isArray(row.destinations) ? row.destinations : [];
	const distances = Array.isArray(row.distances) ? row.distances : [];
	const idx = destinations.indexOf(orderCity);
	if (idx < 0) return 0;
	const value = Number(distances[idx]);
	return Number.isFinite(value) && value > 0 ? value : 0;
}

function computeModeledBundleTime(bundleOrders = [], currentCity = '', citiesDataset = {}, storeDataset = {}) {
	let simulatedCity = String(currentCity || '');
	const orderTimes = [];

	for (const order of bundleOrders) {
		const base = Math.max(0, Number(order?.estimatedTime) || 0);
		const extra = getCrossCityExtraTime(String(order?.city || ''), simulatedCity, citiesDataset, storeDataset);
		orderTimes.push(base + extra);
		if (order?.city) simulatedCity = String(order.city);
	}

	const discounted = applySharedItemBundleSavings(bundleOrders, orderTimes, { storeDataset });
	return Math.max(0, Number(discounted?.discountedTotalTime) || 0);
}

function scoreBundle({
	bundleIds = [],
	ordersById = {},
	currentCity = '',
	citiesDataset = {},
	storeDataset = {},
	earningsOverride = null
} = {}) {
	const missingOrderIds = bundleIds.filter((orderId) => !ordersById[orderId]);
	if (missingOrderIds.length > 0) {
		return {
			missing_order_ids: missingOrderIds,
			modeled_time: null,
			earnings: null,
			score: null
		};
	}

	const bundleOrders = bundleIds.map((orderId) => ordersById[orderId]);
	const modeledTime = computeModeledBundleTime(bundleOrders, currentCity, citiesDataset, storeDataset);
	const earnings = earningsOverride != null
		? Number(earningsOverride)
		: bundleOrders.reduce((acc, order) => acc + (Number(order?.earnings) || 0), 0);
	const score = modeledTime > 0 ? earnings / modeledTime : null;
	return {
		missing_order_ids: [],
		modeled_time: modeledTime,
		earnings,
		score
	};
}

function getLatestRoundSummaries(participants = []) {
	const decisions = [];
	const qaIssues = [];

	for (const participant of participants) {
		const participantId = String(participant?.id || '');
		const actions = Array.isArray(participant?.actions) ? participant.actions : [];
		const summaries = [];

		for (const action of actions) {
			if (!action || action.type !== 'round_summary') continue;
			const roundIndex = Number(action.round_index);
			if (!Number.isInteger(roundIndex)) continue;
			const stamp = timestampToFloat(action.updatedAt) || timestampToFloat(action.createdAt);
			summaries.push({ roundIndex, action, stamp });
		}

		const grouped = new Map();
		for (const row of summaries) {
			const bucket = grouped.get(row.roundIndex) || [];
			bucket.push(row);
			grouped.set(row.roundIndex, bucket);
		}

		for (const [roundIndex, rows] of grouped.entries()) {
			rows.sort((a, b) => a.stamp - b.stamp);
			const winner = rows[rows.length - 1]?.action || {};
			if (rows.length > 1) {
				qaIssues.push(
					makeIssue({
						severity: 'warning',
						issue_type: 'duplicate_round_summary',
						participant_id: participantId,
						round_index: roundIndex,
						message: `Found ${rows.length} round_summary actions; latest kept.`
					})
				);
			}

			const chosenOrders = Array.isArray(winner.chosen_orders) ? winner.chosen_orders.map((x) => String(x)) : [];
			const decision = {
				participant_id: participantId,
				round_index: roundIndex,
				chosen_orders: chosenOrders,
				success: Boolean(winner.success),
				duration: Number(winner.duration) || 0,
				participant_earnings: Number(winner.earnings) || 0,
				final_location: String(winner.final_location || ''),
				phase: String(winner.phase || ''),
				stamp: timestampToFloat(winner.updatedAt) || timestampToFloat(winner.createdAt)
			};
			decisions.push(decision);
		}
	}

	decisions.sort((a, b) => {
		if (a.participant_id !== b.participant_id) return a.participant_id.localeCompare(b.participant_id);
		return a.round_index - b.round_index;
	});

	return { decisions, qaIssues };
}

function buildIndexes(scenarioBundle = {}) {
	const scenarios = Array.isArray(scenarioBundle?.scenarios) ? scenarioBundle.scenarios : [];
	const orders = Array.isArray(scenarioBundle?.orders) ? scenarioBundle.orders : [];
	const optimal = Array.isArray(scenarioBundle?.optimal) ? scenarioBundle.optimal : [];

	const scenarioByRound = {};
	for (const scenario of scenarios) {
		const round = Number(scenario?.round);
		if (!Number.isInteger(round)) continue;
		scenarioByRound[round] = scenario;
	}

	const ordersById = {};
	for (const order of orders) {
		const id = String(order?.id || '');
		if (!id) continue;
		ordersById[id] = order;
	}

	const optimalByScenario = {};
	for (const entry of optimal) {
		const scenarioId = String(entry?.scenario_id || '');
		if (!scenarioId) continue;
		optimalByScenario[scenarioId] = entry;
	}

	return { scenarioByRound, ordersById, optimalByScenario };
}

function checkMultiStoreBundle(chosenOrders = [], ordersById = {}) {
	if (!Array.isArray(chosenOrders) || chosenOrders.length <= 1) return false;
	const stores = chosenOrders.map((id) => String(ordersById[id]?.store || '')).filter(Boolean);
	return new Set(stores).size > 1;
}

function collectRate(rows = [], key = '') {
	return rows
		.map((row) => row?.[key])
		.filter((value) => value !== null && value !== undefined)
		.map((value) => (Number(value) > 0 ? 1 : 0));
}

function collectContinuous(rows = [], key = '', excludeFailures = true) {
	const values = [];
	for (const row of rows) {
		if (excludeFailures && Number(row?.is_failure) === 1) continue;
		const value = valueToFloat(row?.[key]);
		if (value != null) values.push(value);
	}
	return values;
}

function buildKpiRows(rows = [], groupKey = null, options = {}) {
	const bootstrapB = Number(options.bootstrapB) || DEFAULT_BOOTSTRAP_B;
	const seed = Number(options.seed) || DEFAULT_RANDOM_SEED;
	const groups = new Map();
	if (!groupKey) {
		groups.set('overall', rows);
	} else {
		for (const row of rows) {
			const value = String(row?.[groupKey] ?? '');
			const bucket = groups.get(value) || [];
			bucket.push(row);
			groups.set(value, bucket);
		}
	}

	const output = [];
	for (const [groupValue, groupRows] of groups.entries()) {
		const exactVals = collectRate(groupRows, 'is_exact_optimal');
		const nearVals = collectRate(groupRows, 'is_near_optimal');
		const failVals = collectRate(groupRows, 'is_failure');

		const exact = summarizeRate(exactVals);
		const near = summarizeRate(nearVals);
		const fail = summarizeRate(failVals);

		const [exactLow, exactHigh] = exact.n ? wilsonInterval(exact.x, exact.n) : [null, null];
		const [nearLow, nearHigh] = near.n ? wilsonInterval(near.x, near.n) : [null, null];
		const [failLow, failHigh] = fail.n ? wilsonInterval(fail.x, fail.n) : [null, null];

		const ratioVals = collectContinuous(groupRows, 'score_ratio_to_best');
		const regretVals = collectContinuous(groupRows, 'percent_regret');
		const durationVals = collectContinuous(groupRows, 'duration', false);
		const modeledVals = collectContinuous(groupRows, 'participant_modeled_time');

		const ratioSummary = summarizeContinuous(ratioVals);
		const regretSummary = summarizeContinuous(regretVals);
		const durationSummary = summarizeContinuous(durationVals);
		const modeledSummary = summarizeContinuous(modeledVals);

		const [ratioMeanLow, ratioMeanHigh] = bootstrapCI(ratioVals, 'mean', bootstrapB, seed);
		const [ratioMedianLow, ratioMedianHigh] = bootstrapCI(ratioVals, 'median', bootstrapB, seed);
		const [regretMeanLow, regretMeanHigh] = bootstrapCI(regretVals, 'mean', bootstrapB, seed);
		const [regretMedianLow, regretMedianHigh] = bootstrapCI(regretVals, 'median', bootstrapB, seed);

		output.push({
			[groupKey || 'scope']: groupValue,
			n_decisions: groupRows.length,
			n_non_failure_for_continuous: ratioVals.length,
			exact_optimal_rate: exact.rate,
			exact_optimal_rate_ci_low: exactLow,
			exact_optimal_rate_ci_high: exactHigh,
			near_optimal_rate: near.rate,
			near_optimal_rate_ci_low: nearLow,
			near_optimal_rate_ci_high: nearHigh,
			failure_rate: fail.rate,
			failure_rate_ci_low: failLow,
			failure_rate_ci_high: failHigh,
			score_ratio_to_best_mean: ratioSummary.mean,
			score_ratio_to_best_mean_ci_low: ratioMeanLow,
			score_ratio_to_best_mean_ci_high: ratioMeanHigh,
			score_ratio_to_best_median: ratioSummary.median,
			score_ratio_to_best_median_ci_low: ratioMedianLow,
			score_ratio_to_best_median_ci_high: ratioMedianHigh,
			score_ratio_to_best_q1: ratioSummary.q1,
			score_ratio_to_best_q3: ratioSummary.q3,
			score_ratio_to_best_iqr: ratioSummary.iqr,
			percent_regret_mean: regretSummary.mean,
			percent_regret_mean_ci_low: regretMeanLow,
			percent_regret_mean_ci_high: regretMeanHigh,
			percent_regret_median: regretSummary.median,
			percent_regret_median_ci_low: regretMedianLow,
			percent_regret_median_ci_high: regretMedianHigh,
			percent_regret_q1: regretSummary.q1,
			percent_regret_q3: regretSummary.q3,
			percent_regret_iqr: regretSummary.iqr,
			duration_mean: durationSummary.mean,
			duration_median: durationSummary.median,
			duration_q1: durationSummary.q1,
			duration_q3: durationSummary.q3,
			duration_iqr: durationSummary.iqr,
			participant_modeled_time_mean: modeledSummary.mean,
			participant_modeled_time_median: modeledSummary.median
		});
	}

	if (groupKey === 'round_index') {
		output.sort((a, b) => Number(a.round_index) - Number(b.round_index));
	} else if (groupKey) {
		output.sort((a, b) => String(a[groupKey]).localeCompare(String(b[groupKey])));
	}

	return output;
}

function buildCohortComparisons(rows = [], cohortKey = 'configuration', options = {}) {
	const bootstrapB = Number(options.bootstrapB) || DEFAULT_BOOTSTRAP_B;
	const seed = Number(options.seed) || DEFAULT_RANDOM_SEED;
	const grouped = new Map();

	for (const row of rows) {
		const cohortValue = row?.[cohortKey];
		if (cohortValue == null || cohortValue === '') continue;
		const key = String(cohortValue);
		const bucket = grouped.get(key) || [];
		bucket.push(row);
		grouped.set(key, bucket);
	}

	const cohorts = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
	const out = [];
	for (let i = 0; i < cohorts.length; i += 1) {
		for (let j = i + 1; j < cohorts.length; j += 1) {
			const a = cohorts[i];
			const b = cohorts[j];
			const rowsA = grouped.get(a) || [];
			const rowsB = grouped.get(b) || [];

			const exactA = collectRate(rowsA, 'is_exact_optimal');
			const exactB = collectRate(rowsB, 'is_exact_optimal');
			const nearA = collectRate(rowsA, 'is_near_optimal');
			const nearB = collectRate(rowsB, 'is_near_optimal');
			const failA = collectRate(rowsA, 'is_failure');
			const failB = collectRate(rowsB, 'is_failure');

			const ratioA = collectContinuous(rowsA, 'score_ratio_to_best');
			const ratioB = collectContinuous(rowsB, 'score_ratio_to_best');
			const regretA = collectContinuous(rowsA, 'percent_regret');
			const regretB = collectContinuous(rowsB, 'percent_regret');

			const exactTest = twoProportionZTest(
				exactA.reduce((acc, v) => acc + v, 0),
				exactA.length,
				exactB.reduce((acc, v) => acc + v, 0),
				exactB.length
			);
			const nearTest = twoProportionZTest(
				nearA.reduce((acc, v) => acc + v, 0),
				nearA.length,
				nearB.reduce((acc, v) => acc + v, 0),
				nearB.length
			);
			const failTest = twoProportionZTest(
				failA.reduce((acc, v) => acc + v, 0),
				failA.length,
				failB.reduce((acc, v) => acc + v, 0),
				failB.length
			);

			const [ratioPoint, ratioLow, ratioHigh] = bootstrapDiffMedianCI(ratioA, ratioB, bootstrapB, seed);
			const [regretPoint, regretLow, regretHigh] = bootstrapDiffMedianCI(regretA, regretB, bootstrapB, seed);

			out.push({
				cohort_col: cohortKey,
				cohort_a: a,
				cohort_b: b,
				n_a: rowsA.length,
				n_b: rowsB.length,
				exact_rate_diff: exactTest.diff,
				exact_rate_z: exactTest.z,
				exact_rate_p_value: exactTest.p_value,
				near_rate_diff: nearTest.diff,
				near_rate_z: nearTest.z,
				near_rate_p_value: nearTest.p_value,
				failure_rate_diff: failTest.diff,
				failure_rate_z: failTest.z,
				failure_rate_p_value: failTest.p_value,
				ratio_median_diff: ratioPoint,
				ratio_median_diff_ci_low: ratioLow,
				ratio_median_diff_ci_high: ratioHigh,
				regret_median_diff: regretPoint,
				regret_median_diff_ci_low: regretLow,
				regret_median_diff_ci_high: regretHigh
			});
		}
	}

	return out;
}

function rowsToMap(rows = [], key = '') {
	const out = {};
	for (const row of rows) {
		out[String(row?.[key] ?? '')] = row;
	}
	return out;
}

export function buildDecisionFacts({
	participants = [],
	scenarioBundle = {},
	datasetRoot = '',
	citiesDataset = {},
	storeDataset = {},
	cohortField = 'configuration'
} = {}) {
	const { decisions, qaIssues: dedupeIssues } = getLatestRoundSummaries(participants);
	const qaIssues = [...dedupeIssues];
	const { scenarioByRound, ordersById, optimalByScenario } = buildIndexes(scenarioBundle);
	const participantMap = rowsToMap(participants, 'id');
	const participantCity = {};

	const metadataStart = String(scenarioBundle?.metadata?.startinglocation || '');
	const citiesStart = String(citiesDataset?.startinglocation || '');
	const startingLocation = citiesStart || metadataStart;

	const missingClassificationScenarios = new Set();
	const factRows = [];

	for (const decision of decisions) {
		const participantId = decision.participant_id;
		const roundIndex = Number(decision.round_index);
		const chosenOrders = Array.isArray(decision.chosen_orders) ? decision.chosen_orders : [];
		const success = Boolean(decision.success);

		let currentCity = participantCity[participantId] || startingLocation;
		if (!currentCity && chosenOrders.length > 0) {
			currentCity = String(ordersById[chosenOrders[0]]?.city || '');
		}

		const scenario = scenarioByRound[roundIndex];
		if (!scenario) {
			qaIssues.push(
				makeIssue({
					severity: 'error',
					issue_type: 'missing_scenario_for_round',
					participant_id: participantId,
					round_index: roundIndex,
					message: 'No scenario entry found for round.'
				})
			);
			continue;
		}

		const scenarioId = String(scenario?.scenario_id || '');
		const optimal = optimalByScenario[scenarioId];
		if (!optimal) {
			qaIssues.push(
				makeIssue({
					severity: 'error',
					issue_type: 'missing_optimal_for_scenario',
					participant_id: participantId,
					round_index: roundIndex,
					scenario_id: scenarioId,
					message: 'No optimal entry found for scenario_id.'
				})
			);
			continue;
		}

		const classification = normalizeClassification(scenario?.classification);
		if (classification === 'unclassified' && !missingClassificationScenarios.has(scenarioId)) {
			missingClassificationScenarios.add(scenarioId);
			qaIssues.push(
				makeIssue({
					severity: 'warning',
					issue_type: 'missing_classification',
					participant_id: '',
					round_index: roundIndex,
					scenario_id: scenarioId,
					message: 'Scenario missing classification; assigned to "unclassified".'
				})
			);
		}

		const allowedIds = new Set((Array.isArray(scenario?.order_ids) ? scenario.order_ids : []).map((x) => String(x)));
		const unknownChosen = chosenOrders.filter((orderId) => !allowedIds.has(orderId));
		if (unknownChosen.length > 0) {
			qaIssues.push(
				makeIssue({
					severity: 'warning',
					issue_type: 'unknown_chosen_order_ids',
					participant_id: participantId,
					round_index: roundIndex,
					scenario_id: scenarioId,
					message: `Chosen orders not in scenario order_ids: ${JSON.stringify(unknownChosen)}`
				})
			);
		}

		if (checkMultiStoreBundle(chosenOrders, ordersById)) {
			qaIssues.push(
				makeIssue({
					severity: 'warning',
					issue_type: 'invalid_bundle_store_mismatch',
					participant_id: participantId,
					round_index: roundIndex,
					scenario_id: scenarioId,
					message: 'Selected multi-order bundle spans multiple stores.'
				})
			);
		}

		const participantEarnings = valueToFloat(decision.participant_earnings) ?? chosenOrders.reduce((acc, orderId) => {
			return acc + (Number(ordersById[orderId]?.earnings) || 0);
		}, 0);

		const participantEval = scoreBundle({
			bundleIds: chosenOrders,
			ordersById,
			currentCity,
			citiesDataset,
			storeDataset,
			earningsOverride: participantEarnings
		});

		const bestBundleIds = (Array.isArray(optimal?.best_bundle_ids) ? optimal.best_bundle_ids : []).map((x) => String(x));
		const bestEval = scoreBundle({
			bundleIds: bestBundleIds,
			ordersById,
			currentCity,
			citiesDataset,
			storeDataset
		});

		const participantScore = participantEval.score;
		const bestScore = bestEval.score;

		let scoreRatioToBest = null;
		let percentRegret = null;
		if (participantScore != null && bestScore != null && bestScore > 0) {
			scoreRatioToBest = participantScore / bestScore;
			percentRegret = 1 - scoreRatioToBest;
		}

		let isExactOptimal = Number(chosenOrders.length === bestBundleIds.length && chosenOrders.every((id, idx) => id === bestBundleIds[idx]));
		let isNearOptimal = Number(scoreRatioToBest != null && scoreRatioToBest >= NEAR_OPTIMAL_THRESHOLD);
		let participantModeledTime = participantEval.modeled_time;
		let participantScoreFinal = participantScore;
		let scoreRatioFinal = scoreRatioToBest;
		let percentRegretFinal = percentRegret;
		if (!success) {
			isExactOptimal = 0;
			isNearOptimal = 0;
			participantModeledTime = null;
			participantScoreFinal = null;
			scoreRatioFinal = null;
			percentRegretFinal = null;
		}

		const participant = participantMap[participantId] || {};

		const row = {
			dataset_root: datasetRoot,
			participant_id: participantId,
			round_index: roundIndex,
			scenario_id: scenarioId,
			classification,
			phase: String(decision.phase || scenario?.phase || ''),
			current_city: currentCity,
			chosen_orders: chosenOrders,
			best_bundle_ids: bestBundleIds,
			bundle_size: chosenOrders.length,
			success: Number(success),
			is_failure: Number(!success),
			duration: Number(decision.duration) || 0,
			participant_earnings: participantEval.earnings,
			participant_modeled_time: participantModeledTime,
			participant_score: participantScoreFinal,
			best_score: bestScore,
			score_ratio_to_best: scoreRatioFinal,
			percent_regret: percentRegretFinal,
			is_exact_optimal: isExactOptimal,
			is_near_optimal: isNearOptimal,
			[cohortField]: participant?.[cohortField]
		};
		factRows.push(row);

		if (success && decision.final_location) {
			participantCity[participantId] = String(decision.final_location);
		}
	}

	return {
		decisionFacts: factRows,
		qaIssues
	};
}

export function computeAnalytics({
	participants = [],
	scenarioBundle = {},
	datasetRoot = '',
	citiesDataset = {},
	storeDataset = {},
	cohortField = 'configuration',
	bootstrapB = DEFAULT_BOOTSTRAP_B,
	seed = DEFAULT_RANDOM_SEED
} = {}) {
	const { decisionFacts, qaIssues } = buildDecisionFacts({
		participants,
		scenarioBundle,
		datasetRoot,
		citiesDataset,
		storeDataset,
		cohortField
	});

	const overall = buildKpiRows(decisionFacts, null, { bootstrapB, seed });
	const byClassification = buildKpiRows(decisionFacts, 'classification', { bootstrapB, seed });
	const byRound = buildKpiRows(decisionFacts, 'round_index', { bootstrapB, seed });
	const byParticipant = buildKpiRows(decisionFacts, 'participant_id', { bootstrapB, seed });
	const byCohort = buildKpiRows(decisionFacts, cohortField, { bootstrapB, seed });
	const cohortComparisons = buildCohortComparisons(decisionFacts, cohortField, { bootstrapB, seed });

	const metadata = {
		dataset_root: datasetRoot,
		cohort_col: cohortField,
		bootstrap_b: bootstrapB,
		seed,
		input_counts: {
			participants: participants.length,
			scenarios: Array.isArray(scenarioBundle?.scenarios) ? scenarioBundle.scenarios.length : 0,
			orders: Array.isArray(scenarioBundle?.orders) ? scenarioBundle.orders.length : 0,
			optimal: Array.isArray(scenarioBundle?.optimal) ? scenarioBundle.optimal.length : 0,
			decisions: decisionFacts.length,
			qa_issues: qaIssues.length
		},
		generated_at: new Date().toISOString()
	};

	return {
		decisionFacts,
		kpiOverall: overall,
		kpiByClassification: byClassification,
		kpiByRound: byRound,
		kpiByParticipant: byParticipant,
		kpiByCohort: byCohort,
		cohortComparisons,
		qaIssues,
		metadata
	};
}
