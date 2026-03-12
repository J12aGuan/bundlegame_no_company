<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import Chart from 'chart.js/auto';
	import {
		retrieveData,
		getCentralConfig,
		getCitiesData,
		getScenarioDatasetBundle,
		getScenarioDatasetNames,
		getStoresData
	} from '$lib/firebaseDB.js';
	import {
		buildDecisionFacts,
		computeAnalytics,
		DECISION_FACT_EXPORT_COLUMNS,
		DEFAULT_BOOTSTRAP_B
	} from '$lib/analysis/engine.js';

	const CHART_TABS = [
		{ id: 'overview', label: 'Overview Charts' },
		{ id: 'behavior', label: 'Behavior Charts' }
	];

	let loading = true;
	let computing = false;
	let error = null;
	let success = null;

	let datasetNames = [];
	let selectedDataset = '';
	let cohortField = 'configuration';
	let participantSearch = '';
	let bootstrapB = DEFAULT_BOOTSTRAP_B;
	let activeChartTab = 'overview';

	let rawParticipants = [];
	let scenarioBundle = { scenarios: [], orders: [], optimal: [], metadata: {} };
	let storeDataset = { stores: [], distances: {} };
	let citiesDataset = { startinglocation: '', travelTimes: {} };

	let analysis = null;
	let diagnostics = null;
	let hints = [];

	let roundTrendCanvas;
	let classRateCanvas;
	let durationCanvas;
	let regretCanvas;
	let participantScatterCanvas;
	let bundleSizeCanvas;
	let cohortCanvas;
	let learningCanvas;

	let charts = [];

	function formatNum(value, digits = 3) {
		if (value == null || Number.isNaN(Number(value))) return '-';
		return Number(value).toFixed(digits);
	}

	function formatPct(value) {
		if (value == null || Number.isNaN(Number(value))) return '-';
		return `${(Number(value) * 100).toFixed(1)}%`;
	}

	function showMessage(message, type = 'success') {
		success = type === 'success' ? message : null;
		error = type === 'error' ? message : null;
	}

	function clearMessage() {
		success = null;
		error = null;
	}

	function getFilteredParticipants() {
		const query = participantSearch.trim().toLowerCase();
		return query
			? rawParticipants.filter((participant) => String(participant?.id || '').toLowerCase().includes(query))
			: rawParticipants;
	}

	function buildDiagnostics(analysisResult, participantCount) {
		const facts = Array.isArray(analysisResult?.decisionFacts) ? analysisResult.decisionFacts : [];
		const qaIssues = Array.isArray(analysisResult?.qaIssues) ? analysisResult.qaIssues : [];
		const successCount = facts.filter((row) => Number(row?.success) === 1).length;
		const failureCount = facts.filter((row) => Number(row?.is_failure) === 1).length;
		const qaByType = {};
		for (const issue of qaIssues) {
			const key = String(issue?.issue_type || 'unknown');
			qaByType[key] = (qaByType[key] || 0) + 1;
		}
		const topQa = Object.entries(qaByType)
			.map(([issueType, count]) => ({ issueType, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 4);

		return {
			participants: participantCount,
			decisions: facts.length,
			successCount,
			failureCount,
			roundRows: Array.isArray(analysisResult?.kpiByRound) ? analysisResult.kpiByRound.length : 0,
			classificationRows: Array.isArray(analysisResult?.kpiByClassification)
				? analysisResult.kpiByClassification.length
				: 0,
			topQa
		};
	}

	function buildHints(analysisResult, participantCount) {
		const out = [];
		const facts = Array.isArray(analysisResult?.decisionFacts) ? analysisResult.decisionFacts : [];
		const qaIssues = Array.isArray(analysisResult?.qaIssues) ? analysisResult.qaIssues : [];
		const issueTypeCounts = {};
		for (const issue of qaIssues) {
			const key = String(issue?.issue_type || 'unknown');
			issueTypeCounts[key] = (issueTypeCounts[key] || 0) + 1;
		}

		if (participantCount === 0) {
			out.push('No participants were loaded from Firestore. Check that user data exists in `Users/*`.');
			return out;
		}

		if (facts.length === 0) {
			out.push(
				'No decision rows were produced. Most common cause is dataset mismatch between participant rounds and selected scenario set.'
			);
		}

		if ((issueTypeCounts.missing_scenario_for_round || 0) > 0) {
			out.push(
				`Found ${issueTypeCounts.missing_scenario_for_round} missing-scenario issues. Try switching scenario dataset to the one used during participant collection.`
			);
		}

		if ((issueTypeCounts.missing_optimal_for_scenario || 0) > 0) {
			out.push(
				`Found ${issueTypeCounts.missing_optimal_for_scenario} missing-optimal issues. Check grouped dataset optimal entries.`
			);
		}

		if ((issueTypeCounts.missing_classification || 0) > 0) {
			out.push(
				`${issueTypeCounts.missing_classification} scenarios were missing classification and were grouped as "unclassified".`
			);
		}

		if (!participantSearch.trim() && facts.length > 0) {
			out.push('If charts still look sparse, confirm participants are completing rounds with `round_summary` actions.');
		}

		return out;
	}

	function escapeCsvCell(value) {
		if (value == null) return '';
		if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function toCsv(rows = [], columns = null) {
		const list = Array.isArray(rows) ? rows : [];
		const fieldnames = columns && columns.length
			? columns
			: [...new Set(list.flatMap((row) => Object.keys(row || {})))];
		if (fieldnames.length === 0) return '';

		const header = fieldnames.join(',');
		const body = list
			.map((row) =>
				fieldnames
					.map((field) => `"${escapeCsvCell(row?.[field]).replaceAll('"', '""')}"`)
					.join(',')
			)
			.join('\n');
		return `${header}\n${body}`;
	}

	function downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
		const blob = new Blob([content], { type: mimeType });
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		window.URL.revokeObjectURL(url);
	}

	function exportDecisionFactCsv() {
		if (!analysis) return;
		downloadFile(
			`decision_fact-${selectedDataset}.csv`,
			toCsv(analysis.decisionFacts, DECISION_FACT_EXPORT_COLUMNS),
			'text/csv;charset=utf-8'
		);
	}

	function exportDecisionFactJson() {
		if (!analysis) return;
		const rows = analysis.decisionFacts.map((row) =>
			Object.fromEntries(DECISION_FACT_EXPORT_COLUMNS.map((column) => [column, row?.[column] ?? null]))
		);
		downloadFile(
			`decision_fact-${selectedDataset}.json`,
			JSON.stringify(rows, null, 2),
			'application/json;charset=utf-8'
		);
	}

	function exportKpis() {
		if (!analysis) return;
		downloadFile(`kpi_overall-${selectedDataset}.csv`, toCsv(analysis.kpiOverall), 'text/csv;charset=utf-8');
		downloadFile(
			`kpi_by_classification-${selectedDataset}.csv`,
			toCsv(analysis.kpiByClassification),
			'text/csv;charset=utf-8'
		);
		downloadFile(`kpi_by_round-${selectedDataset}.csv`, toCsv(analysis.kpiByRound), 'text/csv;charset=utf-8');
		downloadFile(
			`kpi_by_participant-${selectedDataset}.csv`,
			toCsv(analysis.kpiByParticipant),
			'text/csv;charset=utf-8'
		);
	}

	function exportMetadata() {
		if (!analysis) return;
		downloadFile(
			`analysis_run_metadata-${selectedDataset}.json`,
			JSON.stringify(analysis.metadata, null, 2),
			'application/json;charset=utf-8'
		);
	}

	function destroyCharts() {
		for (const chart of charts) {
			try {
				chart.destroy();
			} catch {
				// no-op
			}
		}
		charts = [];
	}

	function renderCharts() {
		destroyCharts();
		if (!analysis) return;

		const byRound = Array.isArray(analysis.kpiByRound) ? analysis.kpiByRound : [];
		const byClass = Array.isArray(analysis.kpiByClassification) ? analysis.kpiByClassification : [];
		const byParticipant = Array.isArray(analysis.kpiByParticipant) ? analysis.kpiByParticipant : [];
		const byCohort = Array.isArray(analysis.kpiByCohort) ? analysis.kpiByCohort : [];
		const facts = Array.isArray(analysis.decisionFacts) ? analysis.decisionFacts : [];

		if (roundTrendCanvas) {
			charts.push(
				new Chart(roundTrendCanvas, {
					type: 'line',
					data: {
						labels: byRound.map((row) => String(row.round_index)),
						datasets: [
							{
								label: 'Mean Score Ratio',
								data: byRound.map((row) => row.score_ratio_to_best_mean),
								borderColor: '#2563eb',
								backgroundColor: '#2563eb',
								yAxisID: 'y',
								tension: 0.25
							},
							{
								label: 'Failure Rate',
								data: byRound.map((row) => row.failure_rate),
								borderColor: '#dc2626',
								backgroundColor: '#dc2626',
								yAxisID: 'y1',
								tension: 0.25
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							y: { min: 0, max: 1, title: { display: true, text: 'Score Ratio' } },
							y1: {
								min: 0,
								max: 1,
								position: 'right',
								title: { display: true, text: 'Failure Rate' },
								grid: { drawOnChartArea: false }
							}
						}
					}
				})
			);
		}

		if (classRateCanvas) {
			charts.push(
				new Chart(classRateCanvas, {
					type: 'bar',
					data: {
						labels: byClass.map((row) => String(row.classification)),
						datasets: [
							{
								label: 'Exact Optimal',
								data: byClass.map((row) => row.exact_optimal_rate),
								backgroundColor: '#16a34a'
							},
							{
								label: 'Near Optimal',
								data: byClass.map((row) => row.near_optimal_rate),
								backgroundColor: '#2563eb'
							},
							{
								label: 'Failure',
								data: byClass.map((row) => row.failure_rate),
								backgroundColor: '#dc2626'
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: { y: { min: 0, max: 1 } }
					}
				})
			);
		}

		if (durationCanvas) {
			charts.push(
				new Chart(durationCanvas, {
					type: 'bar',
					data: {
						labels: byClass.map((row) => String(row.classification)),
						datasets: [
							{
								label: 'Duration Mean (s)',
								data: byClass.map((row) => row.duration_mean),
								backgroundColor: '#0891b2'
							},
							{
								label: 'Duration Median (s)',
								data: byClass.map((row) => row.duration_median),
								backgroundColor: '#0d9488'
							}
						]
					},
					options: { responsive: true, maintainAspectRatio: false }
				})
			);
		}

		if (regretCanvas) {
			charts.push(
				new Chart(regretCanvas, {
					type: 'bar',
					data: {
						labels: byClass.map((row) => String(row.classification)),
						datasets: [
							{
								label: 'Regret Mean',
								data: byClass.map((row) => row.percent_regret_mean),
								backgroundColor: '#f59e0b'
							},
							{
								label: 'Regret Median',
								data: byClass.map((row) => row.percent_regret_median),
								backgroundColor: '#d97706'
							}
						]
					},
					options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 1 } } }
				})
			);
		}

		if (participantScatterCanvas) {
			const points = byParticipant
				.filter((row) => row.duration_mean != null && row.score_ratio_to_best_mean != null)
				.map((row) => ({
					x: row.duration_mean,
					y: row.score_ratio_to_best_mean,
					participant: row.participant_id
				}));
			charts.push(
				new Chart(participantScatterCanvas, {
					type: 'scatter',
					data: {
						datasets: [{ label: 'Participants', data: points, backgroundColor: '#7c3aed' }]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							x: { title: { display: true, text: 'Avg Duration (s)' } },
							y: { min: 0, max: 1, title: { display: true, text: 'Avg Score Ratio' } }
						},
						plugins: {
							tooltip: {
								callbacks: {
									label(ctx) {
										const item = ctx.raw || {};
										return `${item.participant}: (${formatNum(item.x, 2)}, ${formatNum(item.y, 3)})`;
									}
								}
							}
						}
					}
				})
			);
		}

		if (bundleSizeCanvas) {
			const sizeMap = new Map();
			for (const row of facts) {
				const key = String(row.bundle_size ?? 0);
				sizeMap.set(key, (sizeMap.get(key) || 0) + 1);
			}
			const entries = [...sizeMap.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
			charts.push(
				new Chart(bundleSizeCanvas, {
					type: 'bar',
					data: {
						labels: entries.map((entry) => entry[0]),
						datasets: [
							{
								label: 'Decision Count',
								data: entries.map((entry) => entry[1]),
								backgroundColor: '#6366f1'
							}
						]
					},
					options: { responsive: true, maintainAspectRatio: false }
				})
			);
		}

		if (cohortCanvas) {
			charts.push(
				new Chart(cohortCanvas, {
					type: 'bar',
					data: {
						labels: byCohort.map((row) => String(row[cohortField] ?? '')),
						datasets: [
							{
								label: `Exact Optimal Rate by ${cohortField}`,
								data: byCohort.map((row) => row.exact_optimal_rate),
								backgroundColor: '#0f766e'
							}
						]
					},
					options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 1 } } }
				})
			);
		}

		if (learningCanvas) {
			const ordered = facts
				.filter((row) => row.score_ratio_to_best != null)
				.sort((a, b) => {
					if (a.participant_id !== b.participant_id) return a.participant_id.localeCompare(b.participant_id);
					return Number(a.round_index) - Number(b.round_index);
				});
			const labels = ordered.map((_, index) => String(index + 1));
			const raw = ordered.map((row) => row.score_ratio_to_best);
			let running = 0;
			const cumulative = raw.map((value, index) => {
				running += Number(value) || 0;
				return running / (index + 1);
			});

			charts.push(
				new Chart(learningCanvas, {
					type: 'line',
					data: {
						labels,
						datasets: [
							{
								label: 'Decision Score Ratio',
								data: raw,
								borderColor: '#94a3b8',
								backgroundColor: '#94a3b8',
								pointRadius: 1,
								tension: 0.15
							},
							{
								label: 'Cumulative Mean',
								data: cumulative,
								borderColor: '#2563eb',
								backgroundColor: '#2563eb',
								pointRadius: 0,
								tension: 0.2
							}
						]
					},
					options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 1 } } }
				})
			);
		}
	}

	async function setChartTab(tabId) {
		activeChartTab = tabId;
		await tick();
		renderCharts();
	}

	async function loadDatasetOptions() {
		const [names, centralConfig] = await Promise.all([getScenarioDatasetNames(), getCentralConfig()]);
		datasetNames = Array.isArray(names) ? names : [];
		const preferred = String(centralConfig?.scenario_set || '');
		if (preferred && datasetNames.includes(preferred)) {
			selectedDataset = preferred;
		} else {
			selectedDataset = datasetNames[0] || preferred || 'experiment';
		}
	}

	function computeCurrentAnalysis(filteredParticipants) {
		return computeAnalytics({
			participants: filteredParticipants,
			scenarioBundle,
			datasetRoot: selectedDataset,
			citiesDataset,
			storeDataset,
			cohortField: cohortField.trim() || 'configuration',
			bootstrapB: Number(bootstrapB) || DEFAULT_BOOTSTRAP_B,
			seed: 42
		});
	}

	async function tryAutoMatchDataset(filteredParticipants) {
		if (datasetNames.length <= 1 || filteredParticipants.length === 0) return false;

		let bestDataset = selectedDataset;
		let bestBundle = scenarioBundle;
		let bestCount = 0;

		for (const datasetName of datasetNames) {
			const bundle = datasetName === selectedDataset
				? scenarioBundle
				: await getScenarioDatasetBundle(datasetName);
			if (!bundle) continue;
			const result = buildDecisionFacts({
				participants: filteredParticipants,
				scenarioBundle: bundle,
				datasetRoot: datasetName,
				citiesDataset,
				storeDataset,
				cohortField: cohortField.trim() || 'configuration'
			});
			const count = Array.isArray(result?.decisionFacts) ? result.decisionFacts.length : 0;
			if (count > bestCount) {
				bestCount = count;
				bestDataset = datasetName;
				bestBundle = bundle;
			}
		}

		if (bestCount > 0 && bestDataset !== selectedDataset) {
			const previous = selectedDataset;
			selectedDataset = bestDataset;
			scenarioBundle = bestBundle;
			showMessage(
				`Auto-matched dataset from "${previous}" to "${bestDataset}" (${bestCount} matched decisions).`,
				'success'
			);
			return true;
		}
		return false;
	}

	async function runAnalysisComputation({ allowDatasetAutoMatch = false } = {}) {
		if (!selectedDataset) return;
		computing = true;
		clearMessage();

		try {
			const filteredParticipants = getFilteredParticipants();
			let nextAnalysis = computeCurrentAnalysis(filteredParticipants);

			if (
				allowDatasetAutoMatch &&
				!participantSearch.trim() &&
				nextAnalysis.decisionFacts.length === 0 &&
				filteredParticipants.length > 0
			) {
				const switched = await tryAutoMatchDataset(filteredParticipants);
				if (switched) {
					nextAnalysis = computeCurrentAnalysis(filteredParticipants);
				}
			}

			analysis = nextAnalysis;
			diagnostics = buildDiagnostics(nextAnalysis, filteredParticipants.length);
			hints = buildHints(nextAnalysis, filteredParticipants.length);

			computing = false;
			await tick();
			renderCharts();
			if (!success) showMessage('Analysis updated.');
		} catch (err) {
			console.error('Failed to compute analysis:', err);
			showMessage(`Analysis computation failed: ${err?.message || 'Unknown error'}`, 'error');
			computing = false;
		}
	}

	async function fetchAndAnalyze({ allowDatasetAutoMatch = false } = {}) {
		loading = true;
		clearMessage();
		try {
			const [participants, bundle, stores, cities] = await Promise.all([
				retrieveData(),
				getScenarioDatasetBundle(selectedDataset),
				getStoresData('store'),
				getCitiesData('cities')
			]);
			rawParticipants = Array.isArray(participants) ? participants : [];
			scenarioBundle = bundle || { scenarios: [], orders: [], optimal: [], metadata: {} };
			storeDataset = stores || { stores: [], distances: {} };
			citiesDataset = cities || { startinglocation: '', travelTimes: {} };
			await runAnalysisComputation({ allowDatasetAutoMatch });
		} catch (err) {
			console.error('Error loading analysis data:', err);
			showMessage(err?.message || 'Failed to load analysis data.', 'error');
			destroyCharts();
		} finally {
			loading = false;
		}
	}

	async function onDatasetChange() {
		await fetchAndAnalyze({ allowDatasetAutoMatch: false });
	}

	onMount(async () => {
		try {
			await loadDatasetOptions();
			await fetchAndAnalyze({ allowDatasetAutoMatch: true });
		} catch (err) {
			console.error(err);
			showMessage(err?.message || 'Failed to initialize analysis page.', 'error');
			loading = false;
		}
	});

	onDestroy(() => {
		destroyCharts();
	});

	$: overall = analysis?.kpiOverall?.[0] || null;
	$: qaIssues = analysis?.qaIssues || [];
	$: topParticipants = (analysis?.kpiByParticipant || []).slice(0, 20);
	$: hasRoundTrendData = Array.isArray(analysis?.kpiByRound) && analysis.kpiByRound.length > 0;
</script>

<div class="space-y-4">
	<div class="bg-white shadow rounded-lg p-4">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
			<div>
				<h2 class="text-2xl font-bold text-gray-900">Analysis Dashboard</h2>
				<p class="mt-1 text-sm text-gray-600">
					Live participant-vs-optimal metrics with diagnostics and RL-ready exports
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<button
					class="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50"
					on:click={() => fetchAndAnalyze({ allowDatasetAutoMatch: false })}
					disabled={loading || computing}
				>
					Reload from Firestore
				</button>
				<button
					class="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
					on:click={() => runAnalysisComputation({ allowDatasetAutoMatch: false })}
					disabled={loading || computing}
				>
					Recompute
				</button>
			</div>
		</div>
		<div class="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
			<div>
				<label for="analysis-dataset" class="block text-xs font-semibold uppercase text-gray-500">Scenario Dataset</label>
				<select
					id="analysis-dataset"
					class="mt-1 w-full border rounded-md px-3 py-2"
					bind:value={selectedDataset}
					on:change={onDatasetChange}
				>
					{#if datasetNames.length === 0}
						<option value={selectedDataset}>{selectedDataset || 'No datasets'}</option>
					{:else}
						{#each datasetNames as name}
							<option value={name}>{name}</option>
						{/each}
					{/if}
				</select>
			</div>
			<div>
				<label for="analysis-cohort" class="block text-xs font-semibold uppercase text-gray-500">Cohort Field</label>
				<input id="analysis-cohort" class="mt-1 w-full border rounded-md px-3 py-2" bind:value={cohortField} />
			</div>
			<div>
				<label for="analysis-participant-filter" class="block text-xs font-semibold uppercase text-gray-500">Participant Filter</label>
				<input id="analysis-participant-filter" class="mt-1 w-full border rounded-md px-3 py-2" bind:value={participantSearch} placeholder="ID contains..." />
			</div>
			<div>
				<label for="analysis-bootstrap" class="block text-xs font-semibold uppercase text-gray-500">Bootstrap Iterations</label>
				<input
					id="analysis-bootstrap"
					class="mt-1 w-full border rounded-md px-3 py-2"
					type="number"
					min="50"
					step="50"
					bind:value={bootstrapB}
				/>
			</div>
		</div>
		<div class="mt-4 flex flex-wrap gap-2">
			<button class="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" on:click={exportDecisionFactCsv} disabled={!analysis}>Export decision_fact.csv</button>
			<button class="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" on:click={exportDecisionFactJson} disabled={!analysis}>Export decision_fact.json</button>
			<button class="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50" on:click={exportKpis} disabled={!analysis}>Export KPI CSVs</button>
			<button class="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50" on:click={exportMetadata} disabled={!analysis}>Export metadata</button>
		</div>
	</div>

	{#if loading}
		<div class="bg-white shadow rounded-lg p-10 text-center text-gray-600">Loading analysis data...</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
	{:else if !analysis}
		<div class="bg-white shadow rounded-lg p-10 text-center text-gray-600">No analysis available.</div>
	{:else}
		{#if computing}
			<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
				Refreshing analytics...
			</div>
		{:else if success}
			<div class="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">{success}</div>
		{/if}

		<div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
			<div class="bg-white shadow rounded-lg p-3">
				<dt class="text-xs text-gray-500 uppercase">Decisions</dt>
				<dd class="text-xl font-semibold text-gray-900">{overall?.n_decisions || 0}</dd>
			</div>
			<div class="bg-white shadow rounded-lg p-3">
				<dt class="text-xs text-gray-500 uppercase">Exact</dt>
				<dd class="text-xl font-semibold text-gray-900">{formatPct(overall?.exact_optimal_rate)}</dd>
			</div>
			<div class="bg-white shadow rounded-lg p-3">
				<dt class="text-xs text-gray-500 uppercase">Near</dt>
				<dd class="text-xl font-semibold text-gray-900">{formatPct(overall?.near_optimal_rate)}</dd>
			</div>
			<div class="bg-white shadow rounded-lg p-3">
				<dt class="text-xs text-gray-500 uppercase">Failure</dt>
				<dd class="text-xl font-semibold text-gray-900">{formatPct(overall?.failure_rate)}</dd>
			</div>
			<div class="bg-white shadow rounded-lg p-3">
				<dt class="text-xs text-gray-500 uppercase">Mean Ratio</dt>
				<dd class="text-xl font-semibold text-gray-900">{formatNum(overall?.score_ratio_to_best_mean)}</dd>
			</div>
			<div class="bg-white shadow rounded-lg p-3">
				<dt class="text-xs text-gray-500 uppercase">Mean Regret</dt>
				<dd class="text-xl font-semibold text-gray-900">{formatNum(overall?.percent_regret_mean)}</dd>
			</div>
		</div>

		<div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
			<div class="bg-white shadow rounded-lg p-4 xl:col-span-2">
				<h3 class="text-lg font-medium text-gray-900">Diagnostics</h3>
				<div class="mt-3 grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
					<div>
						<p class="text-gray-500">Participants</p>
						<p class="font-semibold text-gray-900">{diagnostics?.participants || 0}</p>
					</div>
					<div>
						<p class="text-gray-500">Matched Decisions</p>
						<p class="font-semibold text-gray-900">{diagnostics?.decisions || 0}</p>
					</div>
					<div>
						<p class="text-gray-500">Success / Failure</p>
						<p class="font-semibold text-gray-900">{diagnostics?.successCount || 0} / {diagnostics?.failureCount || 0}</p>
					</div>
					<div>
						<p class="text-gray-500">Round KPI Rows</p>
						<p class="font-semibold text-gray-900">{diagnostics?.roundRows || 0}</p>
					</div>
					<div>
						<p class="text-gray-500">Classification Rows</p>
						<p class="font-semibold text-gray-900">{diagnostics?.classificationRows || 0}</p>
					</div>
				</div>
				{#if diagnostics?.topQa?.length > 0}
					<div class="mt-3 text-sm">
						<p class="text-gray-500 mb-1">Top QA issue types</p>
						<div class="flex flex-wrap gap-2">
							{#each diagnostics.topQa as item}
								<span class="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700">
									{item.issueType}: {item.count}
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			<div class="bg-white shadow rounded-lg p-4">
				<h3 class="text-lg font-medium text-gray-900">Hints</h3>
				{#if hints.length === 0}
					<p class="mt-2 text-sm text-gray-600">No obvious data issues detected.</p>
				{:else}
					<ul class="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
						{#each hints as hint}
							<li>{hint}</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>

		<section class="bg-white shadow rounded-lg p-4" aria-labelledby="analysis-charts-title" id="analysis-charts">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<h3 id="analysis-charts-title" class="text-lg font-medium text-gray-900">Charts</h3>
				<div class="inline-flex rounded-md border border-gray-200 overflow-hidden" role="tablist" aria-label="Analysis chart groups">
					{#each CHART_TABS as tab}
						<button
							class="px-3 py-2 text-sm font-medium {activeChartTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}"
							role="tab"
							aria-selected={activeChartTab === tab.id}
							on:click={() => setChartTab(tab.id)}
						>
							{tab.label}
						</button>
					{/each}
				</div>
			</div>

			{#if !hasRoundTrendData}
				<div class="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
					Round trend charts have no rows yet. This usually means no matched `round_summary` decisions for the selected dataset.
				</div>
			{/if}

			{#if activeChartTab === 'overview'}
				<div class="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
					<div class="border rounded-lg p-3">
						<h4 class="text-sm font-semibold text-gray-800 mb-2">Round Trend: Score Ratio + Failure</h4>
						<div class="h-56"><canvas bind:this={roundTrendCanvas}></canvas></div>
					</div>
					<div class="border rounded-lg p-3">
						<h4 class="text-sm font-semibold text-gray-800 mb-2">Optimality Rates by Classification</h4>
						<div class="h-56"><canvas bind:this={classRateCanvas}></canvas></div>
					</div>
					<div class="border rounded-lg p-3">
						<h4 class="text-sm font-semibold text-gray-800 mb-2">Duration by Classification</h4>
						<div class="h-56"><canvas bind:this={durationCanvas}></canvas></div>
					</div>
					<div class="border rounded-lg p-3">
						<h4 class="text-sm font-semibold text-gray-800 mb-2">Regret by Classification</h4>
						<div class="h-56"><canvas bind:this={regretCanvas}></canvas></div>
					</div>
				</div>
			{:else}
				<div class="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
					<div class="border rounded-lg p-3">
						<h4 class="text-sm font-semibold text-gray-800 mb-2">Participant Scatter (Duration vs Score Ratio)</h4>
						<div class="h-56"><canvas bind:this={participantScatterCanvas}></canvas></div>
					</div>
					<div class="border rounded-lg p-3">
						<h4 class="text-sm font-semibold text-gray-800 mb-2">Bundle Size Distribution</h4>
						<div class="h-56"><canvas bind:this={bundleSizeCanvas}></canvas></div>
					</div>
					<div class="border rounded-lg p-3">
						<h4 class="text-sm font-semibold text-gray-800 mb-2">Cohort Exact Rate</h4>
						<div class="h-56"><canvas bind:this={cohortCanvas}></canvas></div>
					</div>
					<div class="border rounded-lg p-3">
						<h4 class="text-sm font-semibold text-gray-800 mb-2">Learning Trend Across Decisions</h4>
						<div class="h-56"><canvas bind:this={learningCanvas}></canvas></div>
					</div>
				</div>
			{/if}
		</section>

		<details class="bg-white shadow rounded-lg overflow-hidden" open>
			<summary class="px-4 py-3 border-b cursor-pointer font-medium text-gray-900">
				KPI by Classification
			</summary>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200 text-sm">
					<thead class="bg-gray-50 text-xs uppercase text-gray-600">
						<tr>
							<th class="px-4 py-2 text-left">Classification</th>
							<th class="px-4 py-2 text-left">Decisions</th>
							<th class="px-4 py-2 text-left">Exact</th>
							<th class="px-4 py-2 text-left">Near</th>
							<th class="px-4 py-2 text-left">Failure</th>
							<th class="px-4 py-2 text-left">Mean Ratio</th>
							<th class="px-4 py-2 text-left">Mean Regret</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 text-gray-700">
						{#each analysis.kpiByClassification as row}
							<tr>
								<td class="px-4 py-2 font-medium">{row.classification}</td>
								<td class="px-4 py-2">{row.n_decisions}</td>
								<td class="px-4 py-2">{formatPct(row.exact_optimal_rate)}</td>
								<td class="px-4 py-2">{formatPct(row.near_optimal_rate)}</td>
								<td class="px-4 py-2">{formatPct(row.failure_rate)}</td>
								<td class="px-4 py-2">{formatNum(row.score_ratio_to_best_mean)}</td>
								<td class="px-4 py-2">{formatNum(row.percent_regret_mean)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</details>

		<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
			<details class="bg-white shadow rounded-lg overflow-hidden">
				<summary class="px-4 py-3 border-b cursor-pointer font-medium text-gray-900">
					Participant KPIs (Top 20)
				</summary>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200 text-sm">
						<thead class="bg-gray-50 text-xs uppercase text-gray-600">
							<tr>
								<th class="px-4 py-2 text-left">Participant</th>
								<th class="px-4 py-2 text-left">Decisions</th>
								<th class="px-4 py-2 text-left">Exact</th>
								<th class="px-4 py-2 text-left">Failure</th>
								<th class="px-4 py-2 text-left">Mean Ratio</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each topParticipants as row}
								<tr>
									<td class="px-4 py-2 font-medium">{row.participant_id}</td>
									<td class="px-4 py-2">{row.n_decisions}</td>
									<td class="px-4 py-2">{formatPct(row.exact_optimal_rate)}</td>
									<td class="px-4 py-2">{formatPct(row.failure_rate)}</td>
									<td class="px-4 py-2">{formatNum(row.score_ratio_to_best_mean)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</details>

			<details class="bg-white shadow rounded-lg overflow-hidden">
				<summary class="px-4 py-3 border-b cursor-pointer font-medium text-gray-900">
					Cohort Comparisons
				</summary>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200 text-sm">
						<thead class="bg-gray-50 text-xs uppercase text-gray-600">
							<tr>
								<th class="px-4 py-2 text-left">Cohort A</th>
								<th class="px-4 py-2 text-left">Cohort B</th>
								<th class="px-4 py-2 text-left">Exact Diff</th>
								<th class="px-4 py-2 text-left">Exact p-value</th>
								<th class="px-4 py-2 text-left">Regret Median Diff</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#if analysis.cohortComparisons.length === 0}
								<tr><td class="px-4 py-4 text-gray-500" colspan="5">Not enough cohort groups for comparison.</td></tr>
							{:else}
								{#each analysis.cohortComparisons as row}
									<tr>
										<td class="px-4 py-2 font-medium">{row.cohort_a}</td>
										<td class="px-4 py-2 font-medium">{row.cohort_b}</td>
										<td class="px-4 py-2">{formatNum(row.exact_rate_diff, 4)}</td>
										<td class="px-4 py-2">{formatNum(row.exact_rate_p_value, 4)}</td>
										<td class="px-4 py-2">{formatNum(row.regret_median_diff, 4)}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</details>
		</div>

		<details class="bg-white shadow rounded-lg overflow-hidden">
			<summary class="px-4 py-3 border-b cursor-pointer font-medium text-gray-900">QA Issues</summary>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200 text-sm">
					<thead class="bg-gray-50 text-xs uppercase text-gray-600">
						<tr>
							<th class="px-4 py-2 text-left">Severity</th>
							<th class="px-4 py-2 text-left">Type</th>
							<th class="px-4 py-2 text-left">Participant</th>
							<th class="px-4 py-2 text-left">Round</th>
							<th class="px-4 py-2 text-left">Scenario</th>
							<th class="px-4 py-2 text-left">Message</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#if qaIssues.length === 0}
							<tr><td class="px-4 py-4 text-gray-500" colspan="6">No QA issues detected.</td></tr>
						{:else}
							{#each qaIssues as issue}
								<tr>
									<td class="px-4 py-2">{issue.severity}</td>
									<td class="px-4 py-2">{issue.issue_type}</td>
									<td class="px-4 py-2">{issue.participant_id || '-'}</td>
									<td class="px-4 py-2">{issue.round_index ?? '-'}</td>
									<td class="px-4 py-2">{issue.scenario_id || '-'}</td>
									<td class="px-4 py-2">{issue.message}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</details>
	{/if}
</div>
