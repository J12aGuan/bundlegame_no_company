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
		getDecisionFactExportColumns,
		DEFAULT_BOOTSTRAP_B
	} from '$lib/analysis/engine.js';

	let loading = true;
	let computing = false;
	let error = null;
	let success = null;

	let datasetNames = [];
	let selectedDataset = '';
	let cohortField = 'configuration';
	let participantSearch = '';
	let bootstrapB = DEFAULT_BOOTSTRAP_B;
	let activeView = 'compare';

	let rawParticipants = [];
	let scenarioBundle = { scenarios: [], orders: [], optimal: [], metadata: {} };
	let storeDataset = { stores: [], distances: {} };
	let citiesDataset = { startinglocation: '', travelTimes: {} };

	let analysis = null;
	let diagnostics = null;
	let hints = [];

	let qualityTrendCanvas;
	let runtimeVsModeledCanvas;
	let classificationSummaryCanvas;
	let phaseTimingCanvas;
	let deliverySplitCanvas;
	let participantRuntimeCanvas;

	let charts = [];

	const chartPalette = {
		coral: '#ff6b4a',
		steel: '#3f6db3',
		cyan: '#2fa9c5',
		gold: '#f0b65a',
		slate: '#8ea0b8',
		graphite: '#334155',
		teal: '#1f8a78',
		ink: '#111827',
		grid: 'rgba(148, 163, 184, 0.18)'
	};

	function formatNum(value, digits = 3) {
		if (value == null || Number.isNaN(Number(value))) return '-';
		return Number(value).toFixed(digits);
	}

	function formatPct(value) {
		if (value == null || Number.isNaN(Number(value))) return '-';
		return `${(Number(value) * 100).toFixed(1)}%`;
	}

	function formatSeconds(value, digits = 1) {
		if (value == null || Number.isNaN(Number(value))) return '-';
		return `${Number(value).toFixed(digits)}s`;
	}

	function showMessage(message, type = 'success') {
		success = type === 'success' ? message : null;
		error = type === 'error' ? message : null;
	}

	function clearMessage() {
		success = null;
		error = null;
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

	function getFilteredParticipants() {
		const query = participantSearch.trim().toLowerCase();
		return query
			? rawParticipants.filter((participant) => String(participant?.id || '').toLowerCase().includes(query))
			: rawParticipants;
	}

	function getDecisionColumns() {
		return getDecisionFactExportColumns(normalizedCohortField);
	}

	function exportDecisionFactCsv() {
		if (!analysis) return;
		downloadFile(
			`decision_fact-${selectedDataset}.csv`,
			toCsv(analysis.decisionFacts, getDecisionColumns()),
			'text/csv;charset=utf-8'
		);
	}

	function exportDecisionFactJson() {
		if (!analysis) return;
		const columns = getDecisionColumns();
		const rows = analysis.decisionFacts.map((row) =>
			Object.fromEntries(columns.map((column) => [column, row?.[column] ?? null]))
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
		downloadFile(`kpi_by_round-${selectedDataset}.csv`, toCsv(analysis.kpiByRound), 'text/csv;charset=utf-8');
		downloadFile(
			`kpi_by_participant-${selectedDataset}.csv`,
			toCsv(analysis.kpiByParticipant),
			'text/csv;charset=utf-8'
		);
		downloadFile(
			`kpi_by_classification-${selectedDataset}.csv`,
			toCsv(analysis.kpiByClassification),
			'text/csv;charset=utf-8'
		);
		downloadFile(
			`kpi_timing_overall-${selectedDataset}.csv`,
			toCsv(analysis.kpiTimingOverall),
			'text/csv;charset=utf-8'
		);
		downloadFile(
			`kpi_timing_by_round-${selectedDataset}.csv`,
			toCsv(analysis.kpiTimingByRound),
			'text/csv;charset=utf-8'
		);
		downloadFile(
			`kpi_timing_by_classification-${selectedDataset}.csv`,
			toCsv(analysis.kpiTimingByClassification),
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

	async function setView(view) {
		activeView = view;
		await tick();
		renderCharts();
	}

	function buildDiagnostics(analysisResult, participantCount) {
		const facts = Array.isArray(analysisResult?.decisionFacts) ? analysisResult.decisionFacts : [];
		const qaIssues = Array.isArray(analysisResult?.qaIssues) ? analysisResult.qaIssues : [];
		const dataHealth = analysisResult?.dataHealth || {};
		const successCount = facts.filter((row) => Number(row?.success) === 1).length;
		const failureCount = facts.filter((row) => Number(row?.is_failure) === 1).length;
		const matchedVersionRows = facts.filter((row) => row?.scenario_set_version_id).length;
		const qaByType = {};

		for (const issue of qaIssues) {
			const key = String(issue?.issue_type || 'unknown');
			qaByType[key] = (qaByType[key] || 0) + 1;
		}

		const topQa = Object.entries(qaByType)
			.map(([issueType, count]) => ({ issueType, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 6);

		return {
			participants: participantCount,
			decisions: facts.length,
			matchedVersionRows,
			successCount,
			failureCount,
			runtimeCoverage: Number(dataHealth?.decisionRowsWithTiming || 0),
			runtimeMissing: Number(dataHealth?.decisionRowsMissingTiming || 0),
			participantsWithCompleteState: Number(dataHealth?.participantsWithCompleteVersionState || 0),
			topQa
		};
	}

	function buildHints(analysisResult, participantCount) {
		const out = [];
		const facts = Array.isArray(analysisResult?.decisionFacts) ? analysisResult.decisionFacts : [];
		const qaIssues = Array.isArray(analysisResult?.qaIssues) ? analysisResult.qaIssues : [];
		const dataHealth = analysisResult?.dataHealth || {};
		const issueTypeCounts = {};

		for (const issue of qaIssues) {
			const key = String(issue?.issue_type || 'unknown');
			issueTypeCounts[key] = (issueTypeCounts[key] || 0) + 1;
		}

		if (participantCount === 0) {
			out.push('No participants loaded.');
			return out;
		}

		if (facts.length === 0) {
			out.push('No matched decision rows.');
		}

		if (dataHealth?.legacyMode) {
			out.push('Legacy mode: dataset has no scenarioSetVersionId.');
		}

		if ((issueTypeCounts.missing_version_matched_summary_entry || 0) > 0) {
			out.push('Missing version-matched Summary rows.');
		}

		if ((issueTypeCounts.missing_version_matched_progress_entry || 0) > 0) {
			out.push('Missing version-matched ScenarioSet progress rows.');
		}

		if ((issueTypeCounts.missing_version_matched_action_summary_entry || 0) > 0) {
			out.push('Missing version-matched Action summary rows.');
		}

		if ((issueTypeCounts.missing_per_scenario_timing_entry || 0) > 0) {
			out.push('Missing per-scenario timing rows.');
		}

		if ((issueTypeCounts.timing_total_mismatch || 0) > 0) {
			out.push('Stored total and timing buckets do not match.');
		}

		if (Number(dataHealth?.decisionRowsMissingTiming || 0) > 0 && facts.length > 0) {
			out.push('Runtime timing coverage is incomplete.');
		}

		return out;
	}

	function buildChartOptions(overrides = {}) {
		return {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: 'nearest',
				intersect: false
			},
			plugins: {
				legend: {
					labels: {
						color: chartPalette.graphite,
						font: { family: 'IBM Plex Mono, monospace', size: 11 }
					}
				},
				tooltip: {
					backgroundColor: '#111827',
					titleColor: '#f8fafc',
					bodyColor: '#e2e8f0',
					borderColor: 'rgba(255, 107, 74, 0.35)',
					borderWidth: 1,
					padding: 10,
					titleFont: { family: 'Space Grotesk, sans-serif', weight: '700' },
					bodyFont: { family: 'IBM Plex Mono, monospace' }
				}
			},
			scales: {
				x: {
					grid: { color: chartPalette.grid },
					ticks: { color: chartPalette.graphite, font: { family: 'IBM Plex Mono, monospace', size: 11 } }
				},
				y: {
					grid: { color: chartPalette.grid },
					ticks: { color: chartPalette.graphite, font: { family: 'IBM Plex Mono, monospace', size: 11 } }
				}
			},
			...overrides
		};
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
		const timingByRound = Array.isArray(analysis.kpiTimingByRound) ? analysis.kpiTimingByRound : [];
		const byClass = Array.isArray(classificationRows) ? classificationRows : [];
		const timingByClass = byClass.filter((row) => row.delivery_runtime_time_mean != null || row.scenario_total_time_seconds_mean != null);
		const facts = Array.isArray(analysis.decisionFacts) ? analysis.decisionFacts : [];
		const scatterPoints = facts
			.filter((row) => row.scenario_total_time_seconds != null && row.score_ratio_to_best != null)
			.map((row) => ({
				x: row.scenario_total_time_seconds,
				y: row.score_ratio_to_best,
				participant: row.participant_id,
				round: row.round_index,
				scenario: row.scenario_id,
				delivery: row.delivery_runtime_time
			}));

		if (qualityTrendCanvas && byRound.length > 0) {
			charts.push(
				new Chart(qualityTrendCanvas, {
					type: 'line',
					data: {
						labels: byRound.map((row) => `R${row.round_index}`),
						datasets: [
							{
								label: 'Mean Score Ratio',
								data: byRound.map((row) => row.score_ratio_to_best_mean),
								borderColor: chartPalette.steel,
								backgroundColor: chartPalette.steel,
								yAxisID: 'y',
								tension: 0.25
							},
							{
								label: 'Failure Rate',
								data: byRound.map((row) => row.failure_rate),
								borderColor: chartPalette.coral,
								backgroundColor: chartPalette.coral,
								yAxisID: 'y1',
								tension: 0.25
							}
						]
					},
					options: buildChartOptions({
						scales: {
							x: { grid: { color: chartPalette.grid }, ticks: { color: chartPalette.graphite } },
							y: {
								min: 0,
								max: 1,
								position: 'left',
								title: { display: true, text: 'Score Ratio', color: chartPalette.graphite },
								grid: { color: chartPalette.grid },
								ticks: { color: chartPalette.graphite }
							},
							y1: {
								min: 0,
								max: 1,
								position: 'right',
								title: { display: true, text: 'Failure Rate', color: chartPalette.graphite },
								grid: { drawOnChartArea: false },
								ticks: { color: chartPalette.graphite }
							}
						}
					})
				})
			);
		}

		if (runtimeVsModeledCanvas && timingByRound.length > 0) {
			charts.push(
				new Chart(runtimeVsModeledCanvas, {
					type: 'bar',
					data: {
						labels: timingByRound.map((row) => `R${row.round_index}`),
						datasets: [
							{
								type: 'line',
								label: 'Runtime Mean',
								data: timingByRound.map((row) => row.scenario_total_time_seconds_mean),
								borderColor: chartPalette.coral,
								backgroundColor: chartPalette.coral,
								yAxisID: 'y',
								tension: 0.2
							},
							{
								type: 'line',
								label: 'Modeled Mean',
								data: timingByRound.map((row) => row.participant_modeled_time_mean),
								borderColor: chartPalette.cyan,
								backgroundColor: chartPalette.cyan,
								yAxisID: 'y',
								tension: 0.2
							},
							{
								type: 'bar',
								label: 'Runtime - Modeled',
								data: timingByRound.map((row) => row.runtime_modeled_delta_mean),
								backgroundColor: 'rgba(63, 109, 179, 0.28)',
								borderColor: chartPalette.steel,
								borderWidth: 1,
								yAxisID: 'y'
							}
						]
					},
					options: buildChartOptions({
						scales: {
							x: { stacked: false, grid: { color: chartPalette.grid }, ticks: { color: chartPalette.graphite } },
							y: {
								title: { display: true, text: 'Seconds', color: chartPalette.graphite },
								grid: { color: chartPalette.grid },
								ticks: { color: chartPalette.graphite }
							}
						}
					})
				})
			);
		}

		if (classificationSummaryCanvas && byClass.length > 0) {
			charts.push(
				new Chart(classificationSummaryCanvas, {
					type: 'bar',
					data: {
						labels: byClass.map((row) => String(row.classification).toUpperCase()),
						datasets: [
							{
								label: 'Exact Optimal',
								data: byClass.map((row) => row.exact_optimal_rate),
								backgroundColor: chartPalette.teal
							},
							{
								label: 'Failure',
								data: byClass.map((row) => row.failure_rate),
								backgroundColor: chartPalette.coral
							},
							{
								label: 'Runtime Delta Mean (s)',
								data: timingByClass.map((row) => row.runtime_modeled_delta_mean),
								backgroundColor: chartPalette.gold
							}
						]
					},
					options: buildChartOptions({
						scales: {
							x: { grid: { display: false }, ticks: { color: chartPalette.graphite } },
							y: {
								grid: { color: chartPalette.grid },
								ticks: { color: chartPalette.graphite }
							}
						}
					})
				})
			);
		}

		if (phaseTimingCanvas && timingByClass.length > 0) {
			charts.push(
				new Chart(phaseTimingCanvas, {
					type: 'bar',
					data: {
						labels: timingByClass.map((row) => String(row.classification).toUpperCase()),
						datasets: [
							{
								label: 'Think',
								data: timingByClass.map((row) => row.thinking_time_mean),
								backgroundColor: chartPalette.slate
							},
							{
								label: 'Confirm',
								data: timingByClass.map((row) => row.start_picking_confirmation_time_mean),
								backgroundColor: chartPalette.gold
							},
							{
								label: 'Aisle',
								data: timingByClass.map((row) => row.aisle_travel_time_mean),
								backgroundColor: chartPalette.steel
							},
							{
								label: 'Pick',
								data: timingByClass.map((row) => row.item_add_to_cart_time_mean),
								backgroundColor: chartPalette.cyan
							},
							{
								label: 'Deliver',
								data: timingByClass.map((row) => row.delivery_runtime_time_mean),
								backgroundColor: chartPalette.coral
							}
						]
					},
					options: buildChartOptions({
						scales: {
							x: { stacked: true, grid: { display: false }, ticks: { color: chartPalette.graphite } },
							y: {
								stacked: true,
								title: { display: true, text: 'Mean Seconds', color: chartPalette.graphite },
								grid: { color: chartPalette.grid },
								ticks: { color: chartPalette.graphite }
							}
						}
					})
				})
			);
		}

		if (deliverySplitCanvas && timingByClass.length > 0) {
			charts.push(
				new Chart(deliverySplitCanvas, {
					type: 'bar',
					data: {
						labels: timingByClass.map((row) => String(row.classification).toUpperCase()),
						datasets: [
							{
								label: 'Local Delivery',
								data: timingByClass.map((row) => row.local_delivery_time_mean),
								backgroundColor: chartPalette.coral
							},
							{
								label: 'City Travel',
								data: timingByClass.map((row) => row.city_travel_time_mean),
								backgroundColor: chartPalette.steel
							}
						]
					},
					options: buildChartOptions({
						scales: {
							x: { grid: { display: false }, ticks: { color: chartPalette.graphite } },
							y: {
								title: { display: true, text: 'Mean Seconds', color: chartPalette.graphite },
								grid: { color: chartPalette.grid },
								ticks: { color: chartPalette.graphite }
							}
						}
					})
				})
			);
		}

		if (participantRuntimeCanvas && scatterPoints.length > 0) {
			charts.push(
				new Chart(participantRuntimeCanvas, {
					type: 'scatter',
					data: {
						datasets: [
							{
								label: 'Decision Runtime vs Quality',
								data: scatterPoints,
								backgroundColor: 'rgba(255, 107, 74, 0.55)',
								borderColor: chartPalette.coral
							}
						]
					},
					options: buildChartOptions({
						scales: {
							x: {
								title: { display: true, text: 'Runtime (s)', color: chartPalette.graphite },
								grid: { color: chartPalette.grid },
								ticks: { color: chartPalette.graphite }
							},
							y: {
								min: 0,
								max: 1,
								title: { display: true, text: 'Score Ratio', color: chartPalette.graphite },
								grid: { color: chartPalette.grid },
								ticks: { color: chartPalette.graphite }
							}
						},
						plugins: {
							tooltip: {
								callbacks: {
									label(ctx) {
										const item = ctx.raw || {};
										return `${item.participant} R${item.round} ${item.scenario} | runtime ${formatSeconds(item.x)} | score ${formatNum(item.y, 3)} | delivery ${formatSeconds(item.delivery)}`;
									}
								}
							},
							legend: {
								labels: {
									color: chartPalette.graphite,
									font: { family: 'IBM Plex Mono, monospace', size: 11 }
								}
							}
						}
					})
				})
			);
		}
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
			cohortField: normalizedCohortField,
			bootstrapB: Number(bootstrapB) || DEFAULT_BOOTSTRAP_B,
			seed: 42
		});
	}

	function getAutoMatchStats(filteredParticipants, bundle, datasetName) {
		const result = buildDecisionFacts({
			participants: filteredParticipants,
			scenarioBundle: bundle,
			datasetRoot: datasetName,
			citiesDataset,
			storeDataset,
			cohortField: normalizedCohortField
		});
		return {
			result,
			versionCoverage: Number(result?.dataHealth?.participantsWithAnyVersionState || 0),
			decisionCount: Array.isArray(result?.decisionFacts) ? result.decisionFacts.length : 0,
			legacyMode: Boolean(result?.dataHealth?.legacyMode)
		};
	}

	async function tryAutoMatchDataset(filteredParticipants) {
		if (datasetNames.length <= 1 || filteredParticipants.length === 0) return false;

		let bestDataset = selectedDataset;
		let bestBundle = scenarioBundle;
		let bestStats = getAutoMatchStats(filteredParticipants, scenarioBundle, selectedDataset);

		for (const datasetName of datasetNames) {
			const bundle = datasetName === selectedDataset
				? scenarioBundle
				: await getScenarioDatasetBundle(datasetName);
			if (!bundle) continue;
			const stats = datasetName === selectedDataset ? bestStats : getAutoMatchStats(filteredParticipants, bundle, datasetName);

			const currentHasCoverage = bestStats.versionCoverage > 0;
			const nextHasCoverage = stats.versionCoverage > 0;
			let shouldReplace = false;

			if (nextHasCoverage && !currentHasCoverage) {
				shouldReplace = true;
			} else if (nextHasCoverage && currentHasCoverage) {
				if (stats.versionCoverage > bestStats.versionCoverage) {
					shouldReplace = true;
				} else if (stats.versionCoverage === bestStats.versionCoverage && stats.decisionCount > bestStats.decisionCount) {
					shouldReplace = true;
				}
			} else if (!currentHasCoverage && stats.decisionCount > bestStats.decisionCount) {
				shouldReplace = true;
			}

			if (shouldReplace) {
				bestDataset = datasetName;
				bestBundle = bundle;
				bestStats = stats;
			}
		}

		if (bestDataset !== selectedDataset) {
			const previous = selectedDataset;
			selectedDataset = bestDataset;
			scenarioBundle = bestBundle;
			showMessage(
				`Auto-matched dataset from "${previous}" to "${bestDataset}" using version coverage ${bestStats.versionCoverage} and ${bestStats.decisionCount} decision rows.`,
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

	$: normalizedCohortField = cohortField.trim() || 'configuration';
	$: overall = analysis?.kpiOverall?.[0] || null;
	$: timingOverall = analysis?.kpiTimingOverall?.[0] || null;
	$: qaIssues = analysis?.qaIssues || [];
	$: dataHealth = analysis?.dataHealth || {};
	$: classificationRows = Array.isArray(analysis?.kpiByClassification)
		? analysis.kpiByClassification.map((row) => {
			const timingRow = (analysis?.kpiTimingByClassification || []).find((entry) => entry.classification === row.classification) || {};
			return { ...row, ...timingRow };
		})
		: [];
	$: topTimingRows = Array.isArray(analysis?.decisionFacts)
		? [...analysis.decisionFacts]
			.filter((row) => row.scenario_total_time_seconds != null)
			.sort((a, b) => (Number(b.scenario_total_time_seconds) || 0) - (Number(a.scenario_total_time_seconds) || 0))
			.slice(0, 12)
		: [];
	$: healthBadges = [
		{ label: 'Version ID', value: dataHealth?.datasetScenarioSetVersionId || 'legacy', accent: 'coral' },
		{ label: 'Runtime Coverage', value: `${dataHealth?.decisionRowsWithTiming || 0}/${diagnostics?.decisions || 0}`, accent: 'steel' },
		{ label: 'Complete State', value: `${dataHealth?.participantsWithCompleteVersionState || 0}/${dataHealth?.participantsLoaded || 0}`, accent: 'teal' }
	];
	$: overviewCards = [
		{ label: 'Decisions', value: overall?.n_decisions || 0, accent: 'coral' },
		{ label: 'Exact Optimal', value: formatPct(overall?.exact_optimal_rate), accent: 'steel' },
		{ label: 'Failure Rate', value: formatPct(overall?.failure_rate), accent: 'coral' },
		{ label: 'Mean Ratio', value: formatNum(overall?.score_ratio_to_best_mean), accent: 'teal' },
		{ label: 'Runtime Mean', value: formatSeconds(timingOverall?.scenario_total_time_seconds_mean), accent: 'gold' },
		{ label: 'Runtime Delta', value: formatSeconds(timingOverall?.runtime_modeled_delta_mean), accent: 'steel' }
	];
	$: hasRoundCharts = Array.isArray(analysis?.kpiByRound) && analysis.kpiByRound.length > 0;
	$: hasTimingRoundCharts = Array.isArray(analysis?.kpiTimingByRound) && analysis.kpiTimingByRound.length > 0;
	$: hasClassificationCharts = classificationRows.length > 0;
	$: hasTimingClassCharts = classificationRows.some((row) => row.delivery_runtime_time_mean != null || row.scenario_total_time_seconds_mean != null);
	$: hasScatterChart = Array.isArray(analysis?.decisionFacts)
		&& analysis.decisionFacts.some((row) => row.scenario_total_time_seconds != null && row.score_ratio_to_best != null);
</script>

<svelte:head>
	<title>Analysis Dashboard</title>
</svelte:head>

<div class="analysis-shell">
	<aside class="control-rail">
		<div class="rail-header">
			<h1>Analysis</h1>
		</div>

		<div class="rail-block">
			<label for="analysis-dataset">Scenario Dataset</label>
			<select id="analysis-dataset" bind:value={selectedDataset} on:change={onDatasetChange}>
				{#if datasetNames.length === 0}
					<option value={selectedDataset}>{selectedDataset || 'No datasets'}</option>
				{:else}
					{#each datasetNames as name}
						<option value={name}>{name}</option>
					{/each}
				{/if}
			</select>
		</div>

		<div class="rail-grid">
			<div class="rail-block">
				<label for="analysis-cohort">Cohort Field</label>
				<input id="analysis-cohort" bind:value={cohortField} />
			</div>
			<div class="rail-block">
				<label for="analysis-bootstrap">Bootstrap</label>
				<input id="analysis-bootstrap" type="number" min="50" step="50" bind:value={bootstrapB} />
			</div>
		</div>

		<div class="rail-block">
			<label for="analysis-filter">Participant Filter</label>
			<input id="analysis-filter" bind:value={participantSearch} placeholder="ID contains..." />
		</div>

		<div class="rail-actions">
			<button class="primary" on:click={() => fetchAndAnalyze({ allowDatasetAutoMatch: false })} disabled={loading || computing}>
				Reload Firestore
			</button>
			<button class="secondary" on:click={() => runAnalysisComputation({ allowDatasetAutoMatch: false })} disabled={loading || computing}>
				Recompute
			</button>
		</div>

		<div class="rail-block">
			<p class="rail-label">Exports</p>
			<div class="rail-action-stack">
				<button class="ghost" on:click={exportDecisionFactCsv} disabled={!analysis}>decision_fact.csv</button>
				<button class="ghost" on:click={exportDecisionFactJson} disabled={!analysis}>decision_fact.json</button>
				<button class="ghost" on:click={exportKpis} disabled={!analysis}>KPI CSVs</button>
				<button class="ghost" on:click={exportMetadata} disabled={!analysis}>metadata.json</button>
			</div>
		</div>

		<div class="rail-block">
			<p class="rail-label">View</p>
			<div class="nav-links">
				<button class:active-view={activeView === 'compare'} on:click={() => setView('compare')}>Compare</button>
				<button class:active-view={activeView === 'timing'} on:click={() => setView('timing')}>Timing</button>
				<button class:active-view={activeView === 'diagnostics'} on:click={() => setView('diagnostics')}>QA</button>
			</div>
		</div>

		<div class="rail-block">
			<p class="rail-label">Health</p>
			<div class="health-badges">
				{#each healthBadges as badge}
					<div class={`health-badge ${badge.accent}`}>
						<span>{badge.label}</span>
						<strong>{badge.value}</strong>
					</div>
				{/each}
			</div>
		</div>
	</aside>

	<section class="analysis-workspace">
		<div class="workspace-header">
			<div>
				<h2>{selectedDataset || 'Analysis'}</h2>
			</div>
			<div class="status-strip">
				<span class:active={loading || computing}>RUN</span>
				<span class:active={!dataHealth?.legacyMode}>VER</span>
				<span class:active={(dataHealth?.decisionRowsWithTiming || 0) > 0}>TIM</span>
			</div>
		</div>

		{#if loading}
			<div class="panel empty-state">Loading analysis data...</div>
		{:else if error}
			<div class="panel error-state">{error}</div>
		{:else if !analysis}
			<div class="panel empty-state">No analysis available.</div>
		{:else}
			{#if computing}
				<div class="flash-banner warning">Refreshing analytics...</div>
			{:else if success}
				<div class="flash-banner success">{success}</div>
			{/if}

			<div class="overview-grid compact-overview">
				{#each overviewCards as card}
					<article class={`metric-card ${card.accent}`}>
						<span>{card.label}</span>
						<strong>{card.value}</strong>
					</article>
				{/each}
			</div>

			{#if activeView === 'compare'}
				<section class="section-block">
					<div class="chart-grid chart-grid-overview stock-grid">
						<article class="panel chart-panel">
							<div class="panel-header"><h4>Quality vs Failure</h4></div>
							{#if hasRoundCharts}
								<div class="chart-frame compact"><canvas bind:this={qualityTrendCanvas}></canvas></div>
							{:else}
								<div class="chart-empty">No round data</div>
							{/if}
						</article>

						<article class="panel chart-panel">
							<div class="panel-header"><h4>Runtime vs Modeled</h4></div>
							{#if hasTimingRoundCharts}
								<div class="chart-frame compact"><canvas bind:this={runtimeVsModeledCanvas}></canvas></div>
							{:else}
								<div class="chart-empty">No timing data</div>
							{/if}
						</article>

						<article class="panel chart-panel">
							<div class="panel-header"><h4>Classification</h4></div>
							{#if hasClassificationCharts}
								<div class="chart-frame compact"><canvas bind:this={classificationSummaryCanvas}></canvas></div>
							{:else}
								<div class="chart-empty">No class data</div>
							{/if}
						</article>

						<article class="panel chart-panel">
							<div class="panel-header"><h4>Runtime vs Score</h4></div>
							{#if hasScatterChart}
								<div class="chart-frame compact"><canvas bind:this={participantRuntimeCanvas}></canvas></div>
							{:else}
								<div class="chart-empty">No scatter data</div>
							{/if}
						</article>
					</div>
				</section>
			{:else if activeView === 'timing'}
				<section class="section-block">
					<div class="chart-grid chart-grid-timing">
						<article class="panel chart-panel">
							<div class="panel-header"><h4>Phase Stack</h4></div>
							{#if hasTimingClassCharts}
								<div class="chart-frame compact"><canvas bind:this={phaseTimingCanvas}></canvas></div>
							{:else}
								<div class="chart-empty">No timing data</div>
							{/if}
						</article>

						<article class="panel chart-panel">
							<div class="panel-header"><h4>Local vs City</h4></div>
							{#if hasTimingClassCharts}
								<div class="chart-frame compact"><canvas bind:this={deliverySplitCanvas}></canvas></div>
							{:else}
								<div class="chart-empty">No delivery data</div>
							{/if}
						</article>
					</div>

					<div class="panel table-panel">
						<div class="panel-header"><h4>Top Runtime Rows</h4></div>
						<div class="table-shell compact-table">
							<table>
								<thead>
									<tr>
										<th>Participant</th>
										<th>Round</th>
										<th>Scenario</th>
										<th>Runtime</th>
										<th>Delivery</th>
										<th>Think</th>
										<th>Delta</th>
									</tr>
								</thead>
								<tbody>
									{#if topTimingRows.length === 0}
										<tr><td colspan="7">No runtime timing rows</td></tr>
									{:else}
										{#each topTimingRows as row}
											<tr>
												<td>{row.participant_id}</td>
												<td>{row.round_index}</td>
												<td>{row.scenario_id}</td>
												<td>{formatSeconds(row.scenario_total_time_seconds)}</td>
												<td>{formatSeconds(row.delivery_runtime_time)}</td>
												<td>{formatSeconds(row.thinking_time)}</td>
												<td>{formatSeconds(row.runtime_modeled_delta)}</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					</div>
				</section>
			{:else}
				<section class="section-block">
					<div class="diagnostic-grid">
						<article class="panel">
							<div class="panel-header"><h4>Coverage</h4></div>
							<div class="health-metrics">
								<div><span>Participants</span><strong>{diagnostics?.participants || 0}</strong></div>
								<div><span>Decisions</span><strong>{diagnostics?.decisions || 0}</strong></div>
								<div><span>Timing</span><strong>{diagnostics?.runtimeCoverage || 0}</strong></div>
								<div><span>Missing</span><strong>{diagnostics?.runtimeMissing || 0}</strong></div>
								<div><span>Complete</span><strong>{diagnostics?.participantsWithCompleteState || 0}</strong></div>
								<div><span>Success / Fail</span><strong>{diagnostics?.successCount || 0} / {diagnostics?.failureCount || 0}</strong></div>
							</div>
						</article>

						<article class="panel">
							<div class="panel-header"><h4>Hints</h4></div>
							{#if hints.length === 0}
								<p class="hint-copy">No major issues.</p>
							{:else}
								<ul class="hint-list">
									{#each hints as hint}
										<li>{hint}</li>
									{/each}
								</ul>
							{/if}
						</article>
					</div>

					<div class="chart-grid chart-grid-timing">
						<article class="panel table-panel">
							<div class="panel-header"><h4>Cohorts</h4></div>
							<div class="table-shell compact-table">
								<table>
									<thead>
										<tr>
											<th>A</th>
											<th>B</th>
											<th>Exact Diff</th>
											<th>Exact p</th>
											<th>Regret Diff</th>
										</tr>
									</thead>
									<tbody>
										{#if analysis.cohortComparisons.length === 0}
											<tr><td colspan="5">Not enough cohort groups</td></tr>
										{:else}
											{#each analysis.cohortComparisons as row}
												<tr>
													<td>{row.cohort_a}</td>
													<td>{row.cohort_b}</td>
													<td>{formatNum(row.exact_rate_diff, 4)}</td>
													<td>{formatNum(row.exact_rate_p_value, 4)}</td>
													<td>{formatNum(row.regret_median_diff, 4)}</td>
												</tr>
											{/each}
										{/if}
									</tbody>
								</table>
							</div>
						</article>

						<article class="panel table-panel">
							<div class="panel-header"><h4>QA</h4></div>
							<div class="table-shell compact-table">
								<table>
									<thead>
										<tr>
											<th>Severity</th>
											<th>Type</th>
											<th>Participant</th>
											<th>Round</th>
											<th>Scenario</th>
											<th>Message</th>
										</tr>
									</thead>
									<tbody>
										{#if qaIssues.length === 0}
											<tr><td colspan="6">No QA issues</td></tr>
										{:else}
											{#each qaIssues as issue}
												<tr>
													<td>{issue.severity}</td>
													<td>{issue.issue_type}</td>
													<td>{issue.participant_id || '-'}</td>
													<td>{issue.round_index ?? '-'}</td>
													<td>{issue.scenario_id || '-'}</td>
													<td>{issue.message}</td>
												</tr>
											{/each}
										{/if}
									</tbody>
								</table>
							</div>
						</article>
					</div>
				</section>
			{/if}
		{/if}
	</section>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;700&display=swap');

	:global(body) {
		background: #eff3f7;
	}

	.analysis-shell {
		--bg-shell: #eff3f7;
		--bg-rail: #181c22;
		--bg-panel: rgba(255, 255, 255, 0.92);
		--text-main: #18222f;
		--text-muted: #5f7082;
		--border: rgba(87, 104, 126, 0.18);
		--coral: #ff6b4a;
		--steel: #3f6db3;
		--cyan: #2fa9c5;
		--gold: #f0b65a;
		--teal: #1f8a78;
		display: grid;
		grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
		gap: 1.25rem;
		min-height: calc(100vh - 7rem);
		color: var(--text-main);
	}

	.control-rail {
		position: sticky;
		top: 1rem;
		align-self: start;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.4rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1.4rem;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 32%),
			radial-gradient(circle at top, rgba(255, 107, 74, 0.18), transparent 28%),
			var(--bg-rail);
		color: #eef2f7;
	}

	.rail-header h1,
	.workspace-header h2,
	.panel-header h4 {
		font-family: 'Space Grotesk', sans-serif;
	}

	.rail-header h1,
	.workspace-header h2 {
		font-size: clamp(1.75rem, 2.2vw, 2.5rem);
		line-height: 1;
		font-weight: 700;
		margin: 0;
	}

	.rail-copy,
	.hint-copy {
		color: rgba(226, 232, 240, 0.74);
		font-size: 0.92rem;
		line-height: 1.5;
	}

	.hint-copy {
		color: var(--text-muted);
	}

	.eyebrow,
	.rail-label,
	.panel-tag,
	label,
	th,
	.metric-card span,
	.health-badge span,
	.status-strip span {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.rail-block,
	.rail-grid {
		display: grid;
		gap: 0.75rem;
	}

	.rail-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	label,
	.rail-label,
	.panel-tag {
		color: rgba(226, 232, 240, 0.62);
	}

	.control-rail input,
	.control-rail select {
		width: 100%;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.85rem;
		background: rgba(11, 14, 18, 0.85);
		color: #f8fafc;
		padding: 0.8rem 0.95rem;
		font-size: 0.92rem;
		font-family: 'IBM Plex Mono', monospace;
	}

	.rail-actions,
	.rail-action-stack,
	.nav-links,
	.health-badges {
		display: grid;
		gap: 0.65rem;
	}

	button {
		cursor: pointer;
		transition: transform 120ms ease, border-color 120ms ease, background-color 120ms ease;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	button:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.primary,
	.secondary,
	.ghost,
	.nav-links button {
		border-radius: 0.9rem;
		padding: 0.85rem 1rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.83rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border: 1px solid transparent;
	}

	.primary {
		background: var(--coral);
		color: #fff;
	}

	.secondary {
		background: rgba(255, 255, 255, 0.08);
		color: #eef2f7;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.ghost,
	.nav-links button {
		background: rgba(255, 255, 255, 0.04);
		color: #dbe4ee;
		border-color: rgba(255, 255, 255, 0.08);
		text-align: left;
	}

	.nav-links button.active-view {
		background: rgba(255, 107, 74, 0.18);
		border-color: rgba(255, 107, 74, 0.35);
		color: #fff;
	}

	.health-badge {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.8rem 0.9rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.health-badge strong,
	.metric-card strong,
	.health-metrics strong {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.02rem;
	}

	.health-badge.coral strong,
	.metric-card.coral strong {
		color: var(--coral);
	}

	.health-badge.steel strong,
	.metric-card.steel strong {
		color: var(--steel);
	}

	.health-badge.teal strong,
	.metric-card.teal strong {
		color: var(--teal);
	}

	.metric-card.gold strong {
		color: #b9791f;
	}

	.analysis-workspace {
		display: grid;
		gap: 1.2rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: 1.55rem;
		background:
			linear-gradient(rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.88)),
			linear-gradient(to right, rgba(96, 114, 136, 0.08) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(96, 114, 136, 0.08) 1px, transparent 1px);
		background-size: auto, 32px 32px, 32px 32px;
	}

	.workspace-header,
	.section-header,
	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.status-strip {
		display: flex;
		gap: 0.5rem;
	}

	.status-strip span {
		padding: 0.45rem 0.65rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		color: var(--text-muted);
		background: rgba(255, 255, 255, 0.72);
	}

	.status-strip span.active {
		color: var(--coral);
		border-color: rgba(255, 107, 74, 0.3);
	}

	.flash-banner,
	.empty-state,
	.error-state,
	.panel {
		border: 1px solid var(--border);
		border-radius: 1.25rem;
		background: var(--bg-panel);
		backdrop-filter: blur(10px);
	}

	.flash-banner {
		padding: 0.95rem 1rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.84rem;
	}

	.flash-banner.warning {
		color: #854d0e;
		background: rgba(255, 243, 205, 0.92);
	}

	.flash-banner.success {
		color: #166534;
		background: rgba(220, 252, 231, 0.92);
	}

	.panel,
	.empty-state,
	.error-state {
		padding: 1rem 1.05rem;
	}

	.empty-state,
	.error-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 14rem;
		font-family: 'IBM Plex Mono', monospace;
	}

	.error-state {
		color: #991b1b;
		background: rgba(254, 226, 226, 0.92);
	}

	.section-block {
		display: grid;
		gap: 1rem;
		scroll-margin-top: 1.5rem;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.compact-overview {
		margin-bottom: 0.1rem;
	}

	.metric-card {
		padding: 1rem;
		border-radius: 1.15rem;
		border: 1px solid var(--border);
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 248, 251, 0.9));
		display: grid;
		gap: 0.45rem;
	}

	.chart-grid {
		display: grid;
		gap: 1rem;
	}

	.chart-grid-overview {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.chart-grid-timing {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.chart-panel,
	.table-panel {
		display: grid;
		gap: 0.9rem;
	}

	.chart-frame {
		position: relative;
		min-height: 18rem;
	}

	.chart-frame.compact {
		min-height: 14rem;
	}

	.chart-frame.tall {
		min-height: 22rem;
	}

	.chart-empty {
		min-height: 14rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.82rem;
		color: var(--text-muted);
	}

	.span-two {
		grid-column: span 2;
	}

	.stock-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.table-shell {
		overflow: auto;
	}

	.compact-table {
		max-height: 24rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		padding: 0.78rem 0.72rem;
		border-bottom: 1px solid rgba(87, 104, 126, 0.14);
		text-align: left;
		vertical-align: top;
	}

	td {
		color: var(--text-main);
	}

	.diagnostic-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.health-metrics {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.health-metrics div {
		padding: 0.9rem;
		border-radius: 1rem;
		background: rgba(239, 243, 247, 0.88);
		border: 1px solid rgba(87, 104, 126, 0.14);
		display: grid;
		gap: 0.4rem;
	}

	.health-metrics span {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.74rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-muted);
	}

	.hint-list {
		display: grid;
		gap: 0.85rem;
		margin: 0;
		padding-left: 1.1rem;
		color: var(--text-main);
	}

	@media (max-width: 1200px) {
		.analysis-shell {
			grid-template-columns: 1fr;
		}

		.control-rail {
			position: static;
		}
	}

	@media (max-width: 900px) {
		.overview-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.chart-grid-overview,
		.chart-grid-timing,
		.diagnostic-grid {
			grid-template-columns: 1fr;
		}

		.span-two {
			grid-column: span 1;
		}

		.health-metrics {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.analysis-workspace,
		.control-rail {
			padding: 0.95rem;
		}

		.rail-grid,
		.overview-grid {
			grid-template-columns: 1fr;
		}

		.workspace-header,
		.section-header,
		.panel-header {
			flex-direction: column;
		}
	}
</style>
