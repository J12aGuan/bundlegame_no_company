<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import {
		retrieveData,
		getCentralConfig,
		getScenarioDatasetBundle,
		getScenarioDatasetNames,
		getStoresData,
		getCitiesData,
		createResearchJob,
		createResearchModel,
		createResearchProtocol,
		createResearchSnapshot,
		subscribeToResearchModels,
		subscribeToResearchProtocols,
		subscribeToResearchJobs,
		subscribeToResearchSnapshots,
		updateResearchModel,
		updateResearchProtocol
	} from '$lib/firebaseDB.js';
	import {
		computeAnalytics,
		getAnalysisMasterExportColumns,
		getHumanPolicyEvalExportColumns,
		getPolicyTrainingExportColumns,
		getParticipantSurveyExportColumns,
		getPolicyComparisonExportColumns,
		getOpeSummaryExportColumns,
		getSandboxSummaryExportColumns,
		getStudyRandomizationExportColumns
	} from '$lib/analysis/engine.js';
	import { parseUploadedAnalysisSource } from '$lib/analysis/upload.js';
	import {
		DEFAULT_ACTION_MASK_VERSION,
		getBaselineModelRegistry,
		normalizeResearchModel,
		normalizeResearchStudyProtocol
	} from '$lib/researchStudy.js';

	let loading = true;
	let computing = false;
	let error = null;
	let success = null;
	let analysisProgress = {
		active: false,
		stepIndex: 0,
		percent: 0,
		label: 'Idle',
		detail: 'Run analysis to build the research workflow tables.'
	};

	let datasetNames = [];
	let selectedDataset = '';
	let activeSection = 'overview';
	let analysisSource = 'firestore';
	let metadataJoinKey = 'participant_id';
	let metadataSessionKey = '';
	let uploadDatasetName = 'uploaded_dataset';
	let uploadFiles = {
		participants: null,
		scenarioBundle: null,
		stores: null,
		cities: null,
		metadata: null
	};

	let rawParticipants = [];
	let scenarioBundle = { scenarios: [], orders: [], optimal: [], metadata: {} };
	let storeDataset = { stores: [], distances: {} };
	let citiesDataset = { startinglocation: '', travelTimes: {} };
	let metadataRows = [];
	let analysis = null;

	let researchJobs = [];
	let researchSnapshots = [];
	let researchProtocols = [];
	let researchModelsRegistry = [];
	let selectedSnapshotId = '';
	let selectedProtocolId = '';
	let selectedModelId = '';
	let jobType = 'train_policy';
	let algorithm = 'contextual_bandit';
	let jobConfigText = '{\n  "epochs": 50,\n  "seed": 42,\n  "notes": "Initial research run"\n}';
	let protocolEditorText = JSON.stringify(normalizeResearchStudyProtocol({ enabled: true }), null, 2);
	let modelEditorText = JSON.stringify(
		normalizeResearchModel({
			algorithm: 'CQL',
			policy_name: 'CQL',
			policy_version: 'v1',
			is_active: false,
			simulation_only: false
		}),
		null,
		2
	);

	let jobsUnsubscribe = () => {};
	let snapshotsUnsubscribe = () => {};
	let protocolsUnsubscribe = () => {};
	let modelsUnsubscribe = () => {};

	const paperChecklist = [
		'Round attrition by dataset and split',
		'Optimal-rate curve and over-bundling evidence',
		'Policy lift and regret summary table',
		'Off-policy evaluation table',
		'Simulation-only sandbox ablation table',
		'Threats-to-validity notes and QA exclusions'
	];
	const sectionOrder = [
		{
			id: 'overview',
			label: 'Overview',
			kicker: 'Readiness'
		},
		{
			id: 'study',
			label: 'Study Design',
			kicker: 'Protocol'
		},
		{
			id: 'evidence',
			label: 'Evidence',
			kicker: 'Human data'
		},
		{
			id: 'pipeline',
			label: 'Model Baselines',
			kicker: 'Models'
		},
		{
			id: 'outputs',
			label: 'Outputs',
			kicker: 'Package'
		}
	];
	const workflowSteps = [
		'Collect Gameplay',
		'Freeze Snapshot',
		'Measure Human Decisions',
		'Train/Evaluate Models',
		'Package Research Outputs'
	];
	const analysisProgressSteps = [
		'Load source data',
		'Prepare study context',
		'Load model registry',
		'Compute analytics',
		'Package outputs'
	];

	function showMessage(message, type = 'success') {
		success = type === 'success' ? message : null;
		error = type === 'error' ? message : null;
	}

	function clearMessages() {
		success = null;
		error = null;
	}

	function setAnalysisProgress({ active = true, stepIndex, percent, label, detail } = {}) {
		analysisProgress = {
			active,
			stepIndex: stepIndex ?? analysisProgress.stepIndex,
			percent: Math.max(0, Math.min(100, Number(percent ?? analysisProgress.percent) || 0)),
			label: label ?? analysisProgress.label,
			detail: detail ?? analysisProgress.detail
		};
	}

	function getSourceDatasetRoot() {
		return analysisSource === 'upload'
			? uploadDatasetName || 'uploaded_dataset'
			: selectedDataset || 'mainGame';
	}

	function getScenarioSetVersionId() {
		return String(scenarioBundle?.metadata?.scenarioSetVersionId || '').trim();
	}

	function parseJsonEditor(text, label = 'JSON payload') {
		try {
			return JSON.parse(text || '{}');
		} catch (err) {
			throw new Error(`${label} is not valid JSON: ${err?.message || 'parse error'}`);
		}
	}

	function formatJsonEditor(payload = {}) {
		return JSON.stringify(payload, null, 2);
	}

	function buildProtocolDraft(overrides = {}) {
		return normalizeResearchStudyProtocol(
			{
				enabled: true,
				status: 'draft',
				target_venue: '',
				dataset_root: getSourceDatasetRoot(),
				scenario_set_version_id: getScenarioSetVersionId(),
				legal_action_mask_version: DEFAULT_ACTION_MASK_VERSION,
				...overrides
			},
			{
				dataset_root: getSourceDatasetRoot(),
				scenario_set_version_id: getScenarioSetVersionId()
			}
		);
	}

	function buildModelDraft(overrides = {}) {
		return normalizeResearchModel({
			algorithm: 'CQL',
			policy_name: 'CQL',
			policy_version: 'v1',
			dataset_root: getSourceDatasetRoot(),
			dataset_snapshot_id: analysis?.datasetSnapshot?.snapshot_id || '',
			action_mask_version: DEFAULT_ACTION_MASK_VERSION,
			status: 'draft',
			is_active: false,
			simulation_only: false,
			...overrides
		});
	}

	function selectProtocol(protocol = null) {
		selectedProtocolId = String(protocol?.protocol_id || '').trim();
		protocolEditorText = formatJsonEditor(buildProtocolDraft(protocol || {}));
	}

	function selectModel(model = null) {
		selectedModelId = String(model?.model_id || '').trim();
		modelEditorText = formatJsonEditor(buildModelDraft(model || {}));
	}

	function createNewProtocolDraft() {
		selectProtocol(null);
	}

	function createNewModelDraft() {
		selectModel(null);
	}

	function getActiveStudyProtocol() {
		const datasetRoot = getSourceDatasetRoot();
		const selected =
			researchProtocols.find((entry) => entry.protocol_id === selectedProtocolId) || null;
		const datasetMatched =
			researchProtocols.find(
				(entry) =>
					entry.enabled &&
					(!entry.dataset_root || String(entry.dataset_root) === String(datasetRoot))
			) || null;
		return buildProtocolDraft(selected || datasetMatched || {});
	}

	function getAnalysisModels() {
		return (researchModelsRegistry || []).map((entry) => buildModelDraft(entry));
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
		return [
			fieldnames.join(','),
			...list.map((row) =>
				fieldnames
					.map((field) => `"${escapeCsvCell(row?.[field]).replaceAll('"', '""')}"`)
					.join(',')
			)
		].join('\n');
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

	async function saveProtocolDraft() {
		const payload = buildProtocolDraft(parseJsonEditor(protocolEditorText, 'Protocol draft'));
		const saved = selectedProtocolId
			? await updateResearchProtocol(selectedProtocolId, payload)
			: await createResearchProtocol(payload);
		if (!saved?.protocol_id) {
			showMessage('Unable to save research protocol.', 'error');
			return;
		}
		selectProtocol(saved);
		showMessage(`Saved protocol ${saved.protocol_id}.`);
	}

	async function saveModelDraft() {
		const payload = buildModelDraft(parseJsonEditor(modelEditorText, 'Model draft'));
		const saved = selectedModelId
			? await updateResearchModel(selectedModelId, payload)
			: await createResearchModel(payload);
		if (!saved?.model_id) {
			showMessage('Unable to save research model.', 'error');
			return;
		}
		selectModel(saved);
		showMessage(`Saved model ${saved.model_id}.`);
	}

	async function initializePage() {
		loading = true;
		try {
			const [names, centralConfig] = await Promise.all([getScenarioDatasetNames(), getCentralConfig()]);
			datasetNames = names || [];
			selectedDataset = String(centralConfig?.scenario_set || datasetNames?.[0] || 'mainGame');
			showMessage('Research console ready.');
		} catch (err) {
			console.error(err);
			showMessage(err?.message || 'Unable to initialize research console.', 'error');
		} finally {
			loading = false;
		}
	}

	async function loadSourceData() {
		if (analysisSource === 'upload') {
			const parsed = await parseUploadedAnalysisSource({
				participantsFile: uploadFiles.participants,
				scenarioBundleFile: uploadFiles.scenarioBundle,
				storesFile: uploadFiles.stores,
				citiesFile: uploadFiles.cities,
				metadataFile: uploadFiles.metadata
			});
			rawParticipants = parsed.participants || [];
			scenarioBundle = parsed.scenarioBundle || { scenarios: [], orders: [], optimal: [], metadata: {} };
			storeDataset = parsed.storesDataset || { stores: [], distances: {} };
			citiesDataset = parsed.citiesDataset || { startinglocation: '', travelTimes: {} };
			metadataRows = parsed.metadataRows || [];
			selectedDataset = uploadDatasetName || 'uploaded_dataset';
			return;
		}

		const datasetRoot = selectedDataset || 'mainGame';
		const [participants, bundle, stores, cities] = await Promise.all([
			retrieveData(),
			getScenarioDatasetBundle(datasetRoot),
			getStoresData('store'),
			getCitiesData('cities')
		]);
		rawParticipants = participants || [];
		scenarioBundle = bundle || { scenarios: [], orders: [], optimal: [], metadata: {} };
		storeDataset = stores || { stores: [], distances: {} };
		citiesDataset = cities || { startinglocation: '', travelTimes: {} };
		metadataRows = [];
	}

	async function runResearchAnalysis() {
		clearMessages();
		computing = true;
		setAnalysisProgress({
			stepIndex: 0,
			percent: 5,
			label: 'Starting analysis',
			detail: 'Preparing the selected dataset source.'
		});
		await tick();
		try {
			setAnalysisProgress({
				stepIndex: 0,
				percent: 18,
				label: 'Loading source data',
				detail: analysisSource === 'upload'
					? 'Reading uploaded participant, scenario, store, city, and metadata files.'
					: `Reading Firestore runs and scenario data for ${selectedDataset || 'mainGame'}.`
			});
			await tick();
			await loadSourceData();
			setAnalysisProgress({
				stepIndex: 1,
				percent: 38,
				label: 'Preparing study context',
				detail: `${rawParticipants.length} participant records loaded. Normalizing protocol, phases, and survey context.`
			});
			await tick();
			const activeStudyProtocol = getActiveStudyProtocol();
			setAnalysisProgress({
				stepIndex: 2,
				percent: 55,
				label: 'Loading model registry',
				detail: `${researchModelsRegistry.length} stored models found. Preparing policy comparison inputs.`
			});
			await tick();
			const researchModels = getAnalysisModels();
			setAnalysisProgress({
				stepIndex: 3,
				percent: 74,
				label: 'Computing analytics',
				detail: 'Scoring decisions, regrets, survey coverage, policy tables, OPE, and QA blockers.'
			});
			await tick();
			const nextAnalysis = computeAnalytics({
				participants: rawParticipants,
				scenarioBundle,
				datasetRoot: selectedDataset || uploadDatasetName || 'dataset',
				citiesDataset,
				storeDataset,
				cohortField: 'configuration',
				metadataRows,
				metadataJoinOptions: {
					metadataJoinKey,
					metadataSessionKey
				},
				studyProtocol: activeStudyProtocol,
				researchModels
			});
			setAnalysisProgress({
				stepIndex: 4,
				percent: 92,
				label: 'Packaging outputs',
				detail: 'Building export rows, frozen snapshot metadata, and the manifest summary.'
			});
			await tick();
			analysis = nextAnalysis;
			setAnalysisProgress({
				active: false,
				stepIndex: analysisProgressSteps.length,
				percent: 100,
				label: 'Analysis complete',
				detail: `${nextAnalysis?.analysisMasterRows?.length || 0} decision rows, ${nextAnalysis?.policyTrainingRows?.length || 0} policy rows, and ${nextAnalysis?.qaIssues?.length || 0} QA issues are ready.`
			});
			showMessage('Research analytics refreshed.');
		} catch (err) {
			console.error(err);
			analysis = null;
			setAnalysisProgress({
				active: false,
				percent: analysisProgress.percent || 100,
				label: 'Analysis failed',
				detail: err?.message || 'The analysis stopped before outputs were built.'
			});
			showMessage(err?.message || 'Failed to compute research analytics.', 'error');
		} finally {
			computing = false;
		}
	}

	function exportJson(filename, payload) {
		downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
	}

	function exportCsv(filename, rows, columns) {
		downloadFile(filename, toCsv(rows, columns), 'text/csv;charset=utf-8');
	}

	function buildSnapshotPayload() {
		if (!analysis?.datasetSnapshot) return null;
		const sourceType = analysisSource === 'upload' ? 'upload' : 'firestore';
		const workerNotes = [];
		if (sourceType === 'upload') {
			workerNotes.push('Uploaded datasets are exportable for offline analysis, but queued remote jobs currently require a Firestore-backed dataset snapshot.');
		}
		if (analysis?.datasetSnapshot?.benchmark_only_dataset) {
			workerNotes.push('This snapshot is benchmark-only because recommendation-treatment labels are missing.');
		}
		return {
			...analysis.datasetSnapshot,
			source_type: sourceType,
			source_descriptor: {
				analysis_source: sourceType,
				dataset_root: selectedDataset || uploadDatasetName || 'dataset',
				dataset_version: analysis.datasetSnapshot?.dataset_version || '',
				stores_id: sourceType === 'firestore' ? 'store' : '',
				cities_id: sourceType === 'firestore' ? 'cities' : '',
				metadata_join_key: metadataJoinKey || 'participant_id',
				metadata_session_key: metadataSessionKey || '',
				cohort_field: 'configuration',
				study_protocol_id: analysis?.studyProtocolSummary?.protocol_id || '',
				model_registry_total: analysis?.metadata?.model_registry?.total_models || 0
			},
			job_runnable: sourceType === 'firestore',
			worker_notes: workerNotes,
			paper_manifest: analysis?.paperManifest || {}
		};
	}

	async function saveCurrentSnapshot() {
		const snapshotPayload = buildSnapshotPayload();
		if (!snapshotPayload) return;
		const saved = await createResearchSnapshot(snapshotPayload);
		if (!saved?.snapshot_id) {
			showMessage('Unable to save research snapshot to Firestore.', 'error');
			return;
		}
		selectedSnapshotId = saved.snapshot_id;
		showMessage(`Saved snapshot ${saved.snapshot_id}.`);
	}

	async function queueResearchJob() {
		if (!analysis?.datasetSnapshot) {
			showMessage('Run research analytics before queueing jobs.', 'error');
			return;
		}
		if (analysisSource === 'upload') {
			showMessage('Queued remote jobs currently require a Firestore-backed dataset snapshot. Use upload mode for offline exports and local analysis.', 'error');
			return;
		}

		let snapshotId = selectedSnapshotId;
		if (!snapshotId) {
			const saved = await createResearchSnapshot(buildSnapshotPayload());
			snapshotId = saved?.snapshot_id || '';
		}
		const selectedSnapshot = (researchSnapshots || []).find((snapshot) => snapshot.snapshot_id === snapshotId);
		if (selectedSnapshot && selectedSnapshot.job_runnable === false) {
			showMessage('The selected snapshot is marked offline-only and cannot be queued for the Firestore worker.', 'error');
			return;
		}
		if (!snapshotId) {
			showMessage('Unable to create a dataset snapshot for this job.', 'error');
			return;
		}

		let config = {};
		try {
			config = JSON.parse(jobConfigText || '{}');
		} catch (err) {
			showMessage(`Invalid job config JSON: ${err?.message || 'parse error'}`, 'error');
			return;
		}

		const job = await createResearchJob({
			job_type: jobType,
			dataset_snapshot_id: snapshotId,
			algorithm,
			config,
			status: 'queued'
		});
		if (!job?.job_id) {
			showMessage('Unable to queue research job.', 'error');
			return;
		}
		showMessage(`Queued research job ${job.job_id}.`);
	}

	function formatPct(value) {
		if (value == null || Number.isNaN(Number(value))) return '-';
		return `${(Number(value) * 100).toFixed(1)}%`;
	}

	function formatNum(value, digits = 3) {
		if (value == null || Number.isNaN(Number(value))) return '-';
		return Number(value).toFixed(digits);
	}

	function readinessTone(status = '') {
		const normalized = String(status || '').toLowerCase();
		if (normalized.includes('ready') || normalized.includes('pass') || normalized.includes('linked') || normalized.includes('runnable')) return 'ready';
		if (normalized.includes('blocked') || normalized.includes('missing') || normalized.includes('needs')) return 'blocked';
		return 'caution';
	}

	function modelStatusTone(status = '') {
		const normalized = String(status || '').toLowerCase();
		if (normalized.includes('unsupported') || normalized.includes('not_implemented')) return 'blocked';
		if (normalized.includes('trained') || normalized.includes('implemented')) return 'ready';
		return 'caution';
	}

	$: sourceLabel = analysisSource === 'upload' ? uploadDatasetName || 'uploaded_dataset' : selectedDataset;
	$: masterColumns = getAnalysisMasterExportColumns('configuration', analysis?.metadataFields || []);
	$: policyColumns = getPolicyTrainingExportColumns(['configuration', ...(analysis?.metadataFields || [])]);
	$: studyRandomizationColumns = getStudyRandomizationExportColumns();
	$: participantSurveyColumns = getParticipantSurveyExportColumns();
	$: humanPolicyEvalColumns = getHumanPolicyEvalExportColumns();
	$: rowSourceRows = Object.entries(analysis?.metadata?.data_health?.rowSourceCounts || {}).map(([source, count]) => ({
		source,
		count
	}));
	$: splitManifestRows = analysis?.datasetSnapshot?.split_manifest
		? ['train', 'validation', 'test'].map((split) => ({
			split,
			participant_count: analysis.datasetSnapshot.split_manifest?.[split]?.participant_count ?? 0,
			row_count: analysis.datasetSnapshot.split_manifest?.[split]?.row_count ?? 0
		}))
		: [];
	$: bundleHistogramRows = (() => {
		const histogram = {};
		for (const row of analysis?.analysisMasterRows || []) {
			const size = Number(row?.bundle_size) || 0;
			histogram[size] = (histogram[size] || 0) + 1;
		}
		return Object.entries(histogram)
			.map(([bundle_size, count]) => ({ bundle_size, count }))
			.sort((left, right) => Number(left.bundle_size) - Number(right.bundle_size));
	})();
	$: attritionRows = (() => {
		const counts = {};
		for (const row of analysis?.analysisMasterRows || []) {
			const round = Number(row?.round_index) || 0;
			counts[round] = (counts[round] || 0) + 1;
		}
		return Object.entries(counts)
			.map(([round_index, participant_count]) => ({ round_index: Number(round_index), participant_count }))
			.sort((left, right) => left.round_index - right.round_index);
	})();
	$: qaIssueCounts = Object.entries(
		(analysis?.qaIssues || []).reduce((acc, issue) => {
			const key = String(issue?.issue_type || 'unknown');
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {})
	)
		.map(([issue_type, count]) => ({ issue_type, count }))
		.sort((left, right) => right.count - left.count);
	$: protocolPhaseRows = analysis?.studyQa?.phase_plan_rows || [];
	$: studyArmRows = analysis?.studyQa?.arm_balance_rows || [];
	$: surveySummary = analysis?.studyQa?.survey_summary || {};
	$: artifactRows = [
		{ artifact: 'analysis_master.csv', rows: analysis?.analysisMasterRows?.length || 0, format: 'csv' },
		{ artifact: 'policy_training.csv', rows: analysis?.policyTrainingRows?.length || 0, format: 'csv' },
		{ artifact: 'study_randomization.csv', rows: analysis?.studyRandomizationRows?.length || 0, format: 'csv' },
		{ artifact: 'participant_survey.csv', rows: analysis?.participantSurveyRows?.length || 0, format: 'csv' },
		{ artifact: 'human_policy_eval.csv', rows: analysis?.humanPolicyEvalRows?.length || 0, format: 'csv' },
		{ artifact: 'policy_comparison.csv', rows: analysis?.policyComparisons?.length || 0, format: 'csv' },
		{ artifact: 'ope_summary.csv', rows: analysis?.opeSummary?.length || 0, format: 'csv' },
		{ artifact: 'sandbox_summary.csv', rows: analysis?.sandboxSummary?.length || 0, format: 'csv' },
		{ artifact: 'dataset_snapshot.json', rows: 1, format: 'json' },
		{ artifact: 'manifest.json', rows: 1, format: 'json' }
	];
	$: participantCount = new Set(
		(analysis?.analysisMasterRows || []).map((row) => String(row?.participant_id || '').trim()).filter(Boolean)
	).size;
	$: qaBlockers = analysis?.datasetSnapshot?.qa_report?.blockers || [];
	$: artifactReadyCount = artifactRows.filter((row) => row.rows > 0).length;
	$: progressPercent = Math.max(0, Math.min(100, Number(analysisProgress.percent) || 0));
	$: analysisProgressVisible = computing || progressPercent > 0;
	$: dataHealth = analysis?.metadata?.data_health || {};
	$: timestampedDecisionRows = Number(dataHealth.timestampedDecisionRows || 0);
	$: reconstructedDecisionRows = Number(dataHealth.reconstructedDecisionRows || 0);
	$: allRowsTimestamped =
		(analysis?.analysisMasterRows?.length || 0) > 0
			&& timestampedDecisionRows >= (analysis?.analysisMasterRows?.length || 0);
	$: hasMissingRecommendationLabels = qaBlockers.includes('missing_recommendation_labels');
	$: hasCompletedGameMismatch = qaBlockers.includes('completed_game_mismatch');
	$: hasMissingTimestamps = qaBlockers.includes('missing_timestamps') || !allRowsTimestamped;
	$: surveyCoverageRate = Number(surveySummary.survey_coverage_rate || 0);
	$: activeModelCount = Number(analysis?.metadata?.model_registry?.active_models ?? researchModelsRegistry.filter((entry) => entry.is_active).length);
	$: baselineLadderRows = (analysis?.metadata?.model_registry?.baseline_ladder?.length
		? analysis.metadata.model_registry.baseline_ladder
		: getBaselineModelRegistry())
		.slice()
		.sort((left, right) => Number(left?.baseline_ladder_rank ?? 999) - Number(right?.baseline_ladder_rank ?? 999));
	$: randomizationArms = [...new Set((analysis?.studyRandomizationRows || []).map((row) => String(row?.assigned_arm || '').trim()).filter(Boolean))];
	$: hasRandomization = randomizationArms.length > 1 || studyArmRows.filter((row) => Number(row?.participant_count || 0) > 0).length > 1;
	$: studyReadinessRows = [
		{
			item: 'Protocol enabled',
			status: analysis?.studyProtocolSummary?.enabled ? 'Ready' : 'Needs protocol',
			detail: analysis?.studyProtocolSummary?.enabled
				? `${analysis.studyProtocolSummary.protocol_id || 'Active protocol'} is enabled.`
				: 'Enable a locked protocol before collecting the main study.'
		},
		{
			item: 'Randomization active',
			status: hasRandomization ? 'Ready' : 'Needs randomization',
			detail: hasRandomization
				? `${randomizationArms.length || studyArmRows.length} study arms appear in the randomization export.`
				: 'The main study needs stable participant-level assignment across control and recommendation arms.'
		},
		{
			item: 'Timestamps complete',
			status: allRowsTimestamped ? 'Ready' : 'Needs timestamps',
			detail: `${timestampedDecisionRows} timestamped rows / ${reconstructedDecisionRows} reconstructed rows.`
		},
		{
			item: 'Survey linked',
			status: surveyCoverageRate >= 0.8 ? 'Ready' : (surveySummary.responses ? 'Partial' : 'Needs survey rows'),
			detail: `${formatPct(surveyCoverageRate)} coverage across ${surveySummary.participants_with_survey ?? 0} participants with survey.`
		},
		{
			item: 'Active model registered',
			status: activeModelCount > 0 ? 'Ready' : 'Needs model',
			detail: `${activeModelCount} active model${activeModelCount === 1 ? '' : 's'} in the registry.`
		},
		{
			item: 'Snapshot runnable',
			status: analysisSource === 'firestore' ? 'Runnable' : 'Offline only',
			detail: analysisSource === 'firestore'
				? 'Firestore-backed snapshots can be saved and queued for worker jobs.'
				: 'Uploaded snapshots can be exported but not queued to the Firestore worker.'
		}
	].map((row) => ({ ...row, tone: readinessTone(row.status) }));
	$: jobStatusSummary = {
		queued: researchJobs.filter((job) => job.status === 'queued').length,
		running: researchJobs.filter((job) => job.status === 'running').length,
		complete: researchJobs.filter((job) => job.status === 'complete' || job.status === 'completed').length
	};
	$: claimGateRows = [
		{
			claim: 'Human decision patterns',
			status: analysis
				? !hasCompletedGameMismatch && !hasMissingTimestamps
					? 'Ready'
					: 'Needs QA'
				: 'Waiting',
			tone: analysis && !hasCompletedGameMismatch && !hasMissingTimestamps ? 'ready' : 'blocked',
			evidence: 'score ratio, regret, exact/near optimality, learning and round coverage'
		},
		{
			claim: 'Survey-linked experience signals',
			status: analysis
				? surveyCoverageRate >= 0.8
					? 'Ready'
					: surveySummary.responses
						? 'Partial'
						: 'Needs survey rows'
				: 'Waiting',
			tone: analysis && surveyCoverageRate >= 0.8 ? 'ready' : 'caution',
			evidence: 'trust, usefulness, workload, completion-linked responses'
		},
		{
			claim: 'Recommendation-treatment comparison',
			status: hasMissingRecommendationLabels || !hasRandomization || hasMissingTimestamps ? 'Blocked' : 'Ready',
			tone: analysis && !hasMissingRecommendationLabels && hasRandomization && !hasMissingTimestamps ? 'ready' : 'blocked',
			evidence: 'requires labeled treatment/control assignment and timestamp-complete rounds'
		},
		{
			claim: 'Model and policy evaluation',
			status: analysis
				? activeModelCount > 0 && ((analysis.policyComparisons || []).length > 0 || (analysis.opeSummary || []).length > 0)
					? 'Ready'
					: 'Needs model outputs'
				: 'Waiting',
			tone: analysis && activeModelCount > 0 && ((analysis.policyComparisons || []).length > 0 || (analysis.opeSummary || []).length > 0) ? 'ready' : 'caution',
			evidence: 'baseline ladder, policy comparison, OPE proxy summaries, frozen manifest'
		},
		{
			claim: 'Completion as a headline metric',
			status: hasCompletedGameMismatch ? 'Blocked' : 'Ready',
			tone: analysis && !hasCompletedGameMismatch ? 'ready' : 'blocked',
			evidence: 'requires completed-game flags to match round coverage'
		}
	];

	onMount(async () => {
		await initializePage();
		jobsUnsubscribe = subscribeToResearchJobs((rows) => {
			researchJobs = rows || [];
		});
		snapshotsUnsubscribe = subscribeToResearchSnapshots((rows) => {
			researchSnapshots = rows || [];
		});
		protocolsUnsubscribe = subscribeToResearchProtocols((rows) => {
			researchProtocols = rows || [];
			if (!selectedProtocolId && researchProtocols.length > 0) {
				selectProtocol(researchProtocols[0]);
			}
		});
		modelsUnsubscribe = subscribeToResearchModels((rows) => {
			researchModelsRegistry = rows || [];
			if (!selectedModelId && researchModelsRegistry.length > 0) {
				selectModel(researchModelsRegistry[0]);
			}
		});
	});

	onDestroy(() => {
		try {
			jobsUnsubscribe?.();
			snapshotsUnsubscribe?.();
			protocolsUnsubscribe?.();
			modelsUnsubscribe?.();
		} catch {
			// no-op
		}
	});
</script>

<svelte:head>
	<title>Model Research Workflow</title>
</svelte:head>

<div class="research-workflow">
	<section class="wf-hero">
		<div class="wf-hero-copy">
			<p class="wf-eyebrow">Research Workflow</p>
			<h1>Model Research Workflow</h1>
			<p class="wf-lede">
				Turn BundleGame sessions into a frozen evidence package for human decision-making,
				recommendation baselines, and clear research outputs.
			</p>
			<div class="wf-workflow-strip" aria-label="Research workflow">
				{#each workflowSteps as step, index}
					<div class="wf-step">
						<span>{index + 1}</span>
						<strong>{step}</strong>
					</div>
				{/each}
			</div>
		</div>

		<div class="wf-source-panel">
			<div class="wf-panel-heading">
				<div>
					<p class="wf-eyebrow">Source</p>
					<h2>Dataset Intake</h2>
				</div>
				<span class="wf-status-chip">{analysisSource === 'upload' ? 'Offline upload' : 'Firestore live'}</span>
			</div>

			<div class="wf-form-grid">
				<label for="research-source-new">Source</label>
				<select id="research-source-new" bind:value={analysisSource}>
					<option value="firestore">Firestore</option>
					<option value="upload">Uploaded Dataset</option>
				</select>

				{#if analysisSource === 'firestore'}
					<label for="research-dataset-new">Dataset</label>
					<select id="research-dataset-new" bind:value={selectedDataset}>
						{#each datasetNames as name}
							<option value={name}>{name}</option>
						{/each}
					</select>
				{:else}
					<label for="research-upload-name-new">Dataset Name</label>
					<input id="research-upload-name-new" bind:value={uploadDatasetName} type="text" placeholder="uploaded_dataset" />
					<label for="research-upload-participants-new">Participants JSON</label>
					<input id="research-upload-participants-new" type="file" accept=".json" on:change={(event) => uploadFiles.participants = event.currentTarget.files?.[0] || null} />
					<label for="research-upload-scenario-bundle-new">Scenario Bundle</label>
					<input id="research-upload-scenario-bundle-new" type="file" accept=".json" on:change={(event) => uploadFiles.scenarioBundle = event.currentTarget.files?.[0] || null} />
					<label for="research-upload-stores-new">Stores JSON</label>
					<input id="research-upload-stores-new" type="file" accept=".json" on:change={(event) => uploadFiles.stores = event.currentTarget.files?.[0] || null} />
					<label for="research-upload-cities-new">Cities JSON</label>
					<input id="research-upload-cities-new" type="file" accept=".json" on:change={(event) => uploadFiles.cities = event.currentTarget.files?.[0] || null} />
					<label for="research-upload-metadata-new">Metadata CSV/JSON</label>
					<input id="research-upload-metadata-new" type="file" accept=".csv,.json" on:change={(event) => uploadFiles.metadata = event.currentTarget.files?.[0] || null} />
					<label for="research-metadata-join-key-new">Metadata Join Key</label>
					<input id="research-metadata-join-key-new" bind:value={metadataJoinKey} type="text" placeholder="participant_id" />
					<label for="research-metadata-session-key-new">Session Fallback</label>
					<input id="research-metadata-session-key-new" bind:value={metadataSessionKey} type="text" placeholder="Optional session key" />
				{/if}
			</div>

			<div class="wf-action-row">
				<button class="wf-primary" on:click={runResearchAnalysis} disabled={loading || computing}>
					{computing ? 'Computing...' : 'Run Research Analysis'}
				</button>
				<button on:click={saveCurrentSnapshot} disabled={!analysis}>Save Snapshot</button>
			</div>

			{#if analysisProgressVisible}
				<div class="wf-progress-card" aria-live="polite">
					<div class="wf-progress-meta">
						<div>
							<span>{analysisProgress.active ? 'In progress' : 'Last run'}</span>
							<strong>{analysisProgress.label}</strong>
						</div>
						<b>{progressPercent}%</b>
					</div>
					<div class="wf-progress-track" aria-hidden="true">
						<div style={`width: ${progressPercent}%`}></div>
					</div>
					<p>{analysisProgress.detail}</p>
					<ol class="wf-progress-steps">
						{#each analysisProgressSteps as step, index}
							<li
								class:done={index < analysisProgress.stepIndex || progressPercent === 100}
								class:active={index === analysisProgress.stepIndex && progressPercent < 100}
							>
								<span>{index + 1}</span>
								{step}
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</div>
	</section>

	{#if success}
		<div class="wf-notice success">{success}</div>
	{/if}
	{#if error}
		<div class="wf-notice error">{error}</div>
	{/if}

	<nav class="wf-tabs" aria-label="Research workflow tabs">
		{#each sectionOrder as tab}
			<button
				class:active={activeSection === tab.id}
				aria-current={activeSection === tab.id ? 'page' : undefined}
				on:click={() => activeSection = tab.id}
			>
				<span>{tab.kicker}</span>
				<strong>{tab.label}</strong>
			</button>
		{/each}
	</nav>

	<main class="wf-main">
		{#if loading}
			<section class="wf-empty">
				<p class="wf-eyebrow">Loading</p>
				<h2>Preparing the research workflow...</h2>
			</section>
		{:else if !analysis}
			<section class="wf-empty">
				<p class="wf-eyebrow">Start Here</p>
				<h2>Run The Research Analysis</h2>
				<p>
					Choose a Firestore dataset or upload a frozen dataset package, then compute the
					workflow evidence used across study design, model evaluation, and outputs.
				</p>
			</section>
		{:else if activeSection === 'overview'}
			<section class="wf-kpi-grid">
				<div class="wf-kpi"><span>Dataset</span><strong>{sourceLabel}</strong><p>{analysis.datasetSnapshot?.dataset_version || 'No version id'}</p></div>
				<div class="wf-kpi"><span>Decision Rows</span><strong>{analysis.analysisMasterRows?.length || 0}</strong><p>{participantCount} participants</p></div>
				<div class="wf-kpi"><span>Data Readiness</span><strong>{analysis.datasetSnapshot?.qa_report?.paper_ready ? 'Ready' : 'Blocked'}</strong><p>{qaBlockers.length} blockers</p></div>
				<div class="wf-kpi"><span>Protocol</span><strong>{analysis.studyProtocolSummary?.protocol_id || 'Draft'}</strong><p>{analysis.studyProtocolSummary?.enabled ? 'Enabled' : 'Draft mode'}</p></div>
				<div class="wf-kpi"><span>Model Jobs</span><strong>{researchJobs.length}</strong><p>{jobStatusSummary.queued} queued / {jobStatusSummary.running} running</p></div>
			</section>

			<section class="wf-grid">
				<div class="wf-panel span-2">
					<div class="wf-panel-heading">
						<div>
							<p class="wf-eyebrow">Study Readiness</p>
							<h2>Before The Main Data Run</h2>
						</div>
					</div>
					<div class="readiness-grid">
						{#each studyReadinessRows as row}
							<div class={`readiness-card ${row.tone}`}>
								<div>
									<strong>{row.item}</strong>
									<p>{row.detail}</p>
								</div>
								<span>{row.status}</span>
							</div>
						{/each}
					</div>
				</div>

				<div class="wf-panel span-2">
					<div class="wf-panel-heading">
						<div>
							<p class="wf-eyebrow">Claim Gate</p>
							<h2>What The Current Evidence Can Support</h2>
						</div>
					</div>
					<div class="claim-list">
						{#each claimGateRows as row}
							<div class="claim-row">
								<div>
									<strong>{row.claim}</strong>
									<p>{row.evidence}</p>
								</div>
								<span class={`claim-status ${row.tone}`}>{row.status}</span>
							</div>
						{/each}
					</div>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Snapshot Provenance</h2></div>
					<div class="wf-kv">
						<div><span>Snapshot ID</span><strong>{analysis.datasetSnapshot?.snapshot_id}</strong></div>
						<div><span>Feature Version</span><strong>{analysis.datasetSnapshot?.feature_version}</strong></div>
						<div><span>Source Type</span><strong>{analysisSource === 'upload' ? 'upload' : 'firestore'}</strong></div>
						<div><span>Job Runnable</span><strong>{analysisSource === 'firestore' ? 'Yes' : 'Offline only'}</strong></div>
						<div><span>Benchmark Only</span><strong>{analysis.datasetSnapshot?.benchmark_only_dataset ? 'Yes' : 'No'}</strong></div>
						<div><span>Data Ready</span><strong>{analysis.datasetSnapshot?.qa_report?.paper_ready ? 'Yes' : 'No'}</strong></div>
					</div>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>QA Blockers</h2></div>
					{#if qaBlockers.length > 0}
						<ul class="wf-tag-list">
							{#each qaBlockers as blocker}
								<li>{blocker}</li>
							{/each}
						</ul>
					{:else}
						<p class="wf-muted">No blockers in the current snapshot.</p>
					{/if}
					<table>
						<thead><tr><th>Issue Type</th><th>Count</th></tr></thead>
						<tbody>
							{#each qaIssueCounts.slice(0, 8) as row}
								<tr><td>{row.issue_type}</td><td>{row.count}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Row Source Mix</h2></div>
					<table>
						<thead><tr><th>Source</th><th>Rows</th></tr></thead>
						<tbody>
							{#each rowSourceRows as row}
								<tr><td>{row.source}</td><td>{row.count}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Split Manifest</h2></div>
					<table>
						<thead><tr><th>Split</th><th>Participants</th><th>Rows</th></tr></thead>
						<tbody>
							{#each splitManifestRows as row}
								<tr><td>{row.split}</td><td>{row.participant_count}</td><td>{row.row_count}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{:else if activeSection === 'study'}
			<section class="wf-grid">
				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Active Protocol</h2></div>
					<div class="wf-kv">
						<div><span>Protocol ID</span><strong>{analysis.studyProtocolSummary?.protocol_id || '-'}</strong></div>
						<div><span>Status</span><strong>{analysis.studyProtocolSummary?.status || 'draft'}</strong></div>
						<div><span>Enabled</span><strong>{analysis.studyProtocolSummary?.enabled ? 'Yes' : 'No'}</strong></div>
						<div><span>Survey Rows</span><strong>{analysis.participantSurveyRows?.length || 0}</strong></div>
					</div>
					<table>
						<thead><tr><th>Phase</th><th>Planned</th><th>Actual</th><th>Recommendations</th></tr></thead>
						<tbody>
							{#each protocolPhaseRows as row}
								<tr><td>{row.phase}</td><td>{row.planned_rounds}</td><td>{row.actual_rounds}</td><td>{row.recommendations_enabled ? 'Enabled' : 'Off'}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Study QA Summary</h2></div>
					<div class="wf-kv">
						<div><span>Responses</span><strong>{surveySummary.responses ?? 0}</strong></div>
						<div><span>With Survey</span><strong>{surveySummary.participants_with_survey ?? 0}</strong></div>
						<div><span>With Decisions</span><strong>{surveySummary.participants_with_decisions ?? 0}</strong></div>
						<div><span>Coverage</span><strong>{formatPct(surveySummary.survey_coverage_rate)}</strong></div>
					</div>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Stored Protocols</h2></div>
					<select bind:value={selectedProtocolId} on:change={() => selectProtocol(researchProtocols.find((entry) => entry.protocol_id === selectedProtocolId) || null)}>
						<option value="">New draft</option>
						{#each researchProtocols as protocol}
							<option value={protocol.protocol_id}>{protocol.protocol_id}</option>
						{/each}
					</select>
					<div class="wf-action-row">
						<button on:click={createNewProtocolDraft}>New Draft</button>
						<button class="wf-primary" on:click={saveProtocolDraft}>Save Protocol</button>
					</div>
					<p class="wf-muted">Phase plan, policy arms, study scope, and action-mask version live in this JSON draft.</p>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Arm Balance</h2></div>
					<table>
						<thead><tr><th>Arm</th><th>Participants</th></tr></thead>
						<tbody>
							{#each studyArmRows as row}
								<tr><td>{row.assigned_arm}</td><td>{row.participant_count}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel span-2">
					<div class="wf-panel-heading"><h2>Protocol JSON Editor</h2></div>
					<textarea bind:value={protocolEditorText} rows="18"></textarea>
				</div>

				<div class="wf-panel span-2">
					<div class="wf-panel-heading"><h2>Randomization Rows</h2></div>
					<table>
						<thead><tr><th>Participant</th><th>Arm</th><th>Policy</th><th>Assigned</th><th>Decisions</th></tr></thead>
						<tbody>
							{#if (analysis.studyRandomizationRows || []).length === 0}
								<tr><td colspan="5">No study randomization rows yet</td></tr>
							{:else}
								{#each (analysis.studyRandomizationRows || []).slice(0, 30) as row}
									<tr><td>{row.participant_id}</td><td>{row.assigned_arm || '-'}</td><td>{row.policy_name || '-'}</td><td>{row.assigned_at || '-'}</td><td>{row.decision_count}</td></tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</section>
		{:else if activeSection === 'evidence'}
			<section class="wf-grid">
				<div class="wf-panel span-2">
					<div class="wf-panel-heading">
						<div>
							<p class="wf-eyebrow">Research Metrics</p>
							<h2>Human Decision Evidence</h2>
						</div>
					</div>
					<p class="wf-muted">
						Use decomposed research metrics here. Admin `total_score` is a class spreadsheet score and should not be the primary research outcome.
					</p>
					<table>
						<thead><tr><th>Scope</th><th>Group</th><th>Arm</th><th>N</th><th>Score Ratio</th><th>Regret</th><th>Trust</th></tr></thead>
						<tbody>
							{#each analysis.humanPolicyEvalRows || [] as row}
								<tr>
									<td>{row.scope}</td>
									<td>{row.group_value}</td>
									<td>{row.policy_arm || row.policy_name}</td>
									<td>{row.n_decisions}</td>
									<td>{formatNum(row.mean_score_ratio)}</td>
									<td>{formatPct(row.mean_regret)}</td>
									<td>{formatNum(row.mean_trust_rating, 2)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Behavior by Phase</h2></div>
					<table>
						<thead><tr><th>Phase</th><th>N</th><th>Optimal</th><th>Mean Regret</th><th>Follow Rate</th></tr></thead>
						<tbody>
							{#each analysis.behaviorByPhase || [] as row}
								<tr><td>{row.phase || 'unknown'}</td><td>{row.n_decisions}</td><td>{formatPct(row.exact_optimal_rate)}</td><td>{formatPct(row.mean_regret)}</td><td>{formatPct(row.recommendation_follow_rate)}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Round Attrition</h2></div>
					<table>
						<thead><tr><th>Round</th><th>Participants</th></tr></thead>
						<tbody>
							{#each attritionRows as row}
								<tr><td>{row.round_index}</td><td>{row.participant_count}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Bundle Size Histogram</h2></div>
					<table>
						<thead><tr><th>Bundle Size</th><th>Count</th></tr></thead>
						<tbody>
							{#each bundleHistogramRows as row}
								<tr><td>{row.bundle_size}</td><td>{row.count}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Trajectory Segments</h2></div>
					<table>
						<thead><tr><th>Segment</th><th>Participants</th></tr></thead>
						<tbody>
							{#each analysis.trajectorySegments || [] as row}
								<tr><td>{row.trajectory_segment}</td><td>{row.n_participants}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel span-2">
					<div class="wf-panel-heading"><h2>Participant Survey Rows</h2></div>
					<table>
						<thead><tr><th>Participant</th><th>Scope</th><th>Trust</th><th>Usefulness</th><th>Workload</th></tr></thead>
						<tbody>
							{#each (analysis.participantSurveyRows || []).slice(0, 25) as row}
								<tr><td>{row.participant_id}</td><td>{row.response_scope}</td><td>{row.trust_rating}</td><td>{row.usefulness_rating}</td><td>{row.workload_rating}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{:else if activeSection === 'pipeline'}
			<section class="wf-grid">
				<div class="wf-panel span-2">
					<div class="wf-panel-heading">
						<div>
							<p class="wf-eyebrow">Baseline Ladder</p>
							<h2>Model Maturity</h2>
						</div>
					</div>
					<table>
						<thead><tr><th>Rank</th><th>Policy</th><th>Type</th><th>Status</th><th>Training Source</th><th>Notes</th></tr></thead>
						<tbody>
							{#each baselineLadderRows as model}
								<tr>
									<td>{model.baseline_ladder_rank ?? '-'}</td>
									<td>{model.policy_name || model.model_id}</td>
									<td>{model.model_type_label || model.model_type || '-'}</td>
									<td><span class={`claim-status ${modelStatusTone(model.implementation_status)}`}>{model.implementation_status || model.status || '-'}</span></td>
									<td>{model.training_data_source || model.training_provenance?.training_data_source || '-'}</td>
									<td>{model.notes || '-'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel span-2">
					<div class="wf-panel-heading"><h2>Policy Comparison</h2></div>
					<table>
						<thead><tr><th>Policy</th><th>Type</th><th>Status</th><th>Scope</th><th>Group</th><th>N</th><th>Reward</th><th>Regret</th><th>Optimal</th><th>Lift vs Human</th></tr></thead>
						<tbody>
							{#each analysis.policyComparisons || [] as row}
								<tr><td>{row.policy_name}</td><td>{row.model_type || '-'}</td><td>{row.implementation_status || '-'}</td><td>{row.scope}</td><td>{row.group_value}</td><td>{row.n_states}</td><td>{formatNum(row.mean_reward)}</td><td>{formatPct(row.mean_regret)}</td><td>{formatPct(row.optimal_rate)}</td><td>{formatNum(row.mean_lift_vs_historical)}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel span-2">
					<div class="wf-panel-heading"><h2>Off-Policy Evaluation Proxies</h2></div>
					<table>
						<thead><tr><th>Policy</th><th>Type</th><th>Estimator</th><th>Scope</th><th>Group</th><th>IPS</th><th>SNIPS</th><th>DM</th><th>DR</th><th>FQE Proxy</th><th>Match</th></tr></thead>
						<tbody>
							{#each analysis.opeSummary || [] as row}
								<tr><td>{row.policy_name}</td><td>{row.model_type || '-'}</td><td>{row.ope_estimator_family || '-'}</td><td>{row.scope}</td><td>{row.group_value}</td><td>{formatNum(row.ips)}</td><td>{formatNum(row.snips)}</td><td>{formatNum(row.direct_method)}</td><td>{formatNum(row.doubly_robust)}</td><td>{formatNum(row.fqe_one_step)}</td><td>{formatPct(row.match_rate)}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Model Registry</h2></div>
					<div class="wf-kv">
						<div><span>Total Models</span><strong>{analysis.metadata?.model_registry?.total_models ?? researchModelsRegistry.length}</strong></div>
						<div><span>Active</span><strong>{analysis.metadata?.model_registry?.active_models ?? researchModelsRegistry.filter((entry) => entry.is_active).length}</strong></div>
						<div><span>Simulation Only</span><strong>{analysis.metadata?.model_registry?.simulation_only_models ?? researchModelsRegistry.filter((entry) => entry.simulation_only).length}</strong></div>
						<div><span>Snapshot</span><strong>{analysis.datasetSnapshot?.snapshot_id || '-'}</strong></div>
					</div>
					<select bind:value={selectedModelId} on:change={() => selectModel(researchModelsRegistry.find((entry) => entry.model_id === selectedModelId) || null)}>
						<option value="">New draft</option>
						{#each researchModelsRegistry as model}
							<option value={model.model_id}>{model.model_id}</option>
						{/each}
					</select>
					<div class="wf-action-row">
						<button on:click={createNewModelDraft}>New Draft</button>
						<button class="wf-primary" on:click={saveModelDraft}>Save Model</button>
					</div>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Queue GPU Job</h2></div>
					<label for="research-saved-snapshot-new">Saved Snapshot</label>
					<select id="research-saved-snapshot-new" bind:value={selectedSnapshotId}>
						<option value="">Use current snapshot</option>
						{#each researchSnapshots as snapshot}
							<option value={snapshot.snapshot_id}>{snapshot.snapshot_id}</option>
						{/each}
					</select>
					<label for="research-job-type-new">Job Type</label>
					<select id="research-job-type-new" bind:value={jobType}>
						<option value="train_policy">train_policy</option>
						<option value="evaluate_policy">evaluate_policy</option>
						<option value="sandbox_run">sandbox_run</option>
					</select>
					<label for="research-algorithm-new">Algorithm</label>
					<select id="research-algorithm-new" bind:value={algorithm}>
						<option value="behavior_clone">behavior_clone</option>
						<option value="reward_model">reward_model</option>
						<option value="contextual_bandit">contextual_bandit</option>
						<option value="CQL">CQL_planned</option>
						<option value="IQL">IQL_planned</option>
						<option value="DQN_simulator_only">DQN_simulator_only_planned</option>
					</select>
					<label for="research-job-config-new">Config JSON</label>
					<textarea id="research-job-config-new" bind:value={jobConfigText} rows="10"></textarea>
					<button class="wf-primary" on:click={queueResearchJob}>Queue Research Job</button>
				</div>

				<div class="wf-panel span-2">
					<div class="wf-panel-heading"><h2>Model JSON Editor</h2></div>
					<textarea bind:value={modelEditorText} rows="16"></textarea>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Recommendation Workbench</h2></div>
					<table>
						<thead><tr><th>Scope</th><th>Group</th><th>Lift</th><th>Recommended Optimal</th></tr></thead>
						<tbody>
							{#each analysis.recommendationSummary || [] as row}
								<tr><td>{row.scope}</td><td>{row.group_value}</td><td>{formatNum(row.mean_predicted_lift_vs_baseline)}</td><td>{formatPct(row.recommended_optimal_rate)}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Simulation Summary</h2></div>
					<table>
						<thead><tr><th>Policy</th><th>Type</th><th>Status</th><th>Reward</th><th>CI Low</th><th>CI High</th><th>Gap</th></tr></thead>
						<tbody>
							{#each analysis.sandboxSummary || [] as row}
								<tr><td>{row.policy_name}</td><td>{row.model_type || '-'}</td><td>{row.implementation_status || '-'}</td><td>{formatNum(row.mean_simulated_reward)}</td><td>{formatNum(row.simulated_reward_ci_low)}</td><td>{formatNum(row.simulated_reward_ci_high)}</td><td>{formatNum(row.mean_gap_vs_historical)}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel span-2">
					<div class="wf-panel-heading"><h2>Research Jobs</h2></div>
					<table>
						<thead><tr><th>Job</th><th>Algorithm</th><th>Status</th><th>Snapshot</th><th>Created</th><th>Error</th></tr></thead>
						<tbody>
							{#if researchJobs.length === 0}
								<tr><td colspan="6">No research jobs yet</td></tr>
							{:else}
								{#each researchJobs as job}
									<tr><td>{job.job_type}</td><td>{job.algorithm}</td><td>{job.status}</td><td>{job.dataset_snapshot_id}</td><td>{job.created_at || '-'}</td><td>{job.error_summary || '-'}</td></tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</section>
		{:else if activeSection === 'outputs'}
			<section class="wf-grid">
				<div class="wf-panel span-2">
					<div class="wf-panel-heading">
						<div>
							<p class="wf-eyebrow">Artifact Package</p>
							<h2>Research Exports</h2>
						</div>
						<span class="wf-status-chip">{artifactReadyCount}/{artifactRows.length} populated</span>
					</div>
					<div class="wf-export-grid">
						<button on:click={() => exportCsv(`analysis_master-${sourceLabel}.csv`, analysis?.analysisMasterRows || [], masterColumns)}>analysis_master.csv</button>
						<button on:click={() => exportCsv(`policy_training-${sourceLabel}.csv`, analysis?.policyTrainingRows || [], policyColumns)}>policy_training.csv</button>
						<button on:click={() => exportCsv(`study_randomization-${sourceLabel}.csv`, analysis?.studyRandomizationRows || [], studyRandomizationColumns)}>study_randomization.csv</button>
						<button on:click={() => exportCsv(`participant_survey-${sourceLabel}.csv`, analysis?.participantSurveyRows || [], participantSurveyColumns)}>participant_survey.csv</button>
						<button on:click={() => exportCsv(`human_policy_eval-${sourceLabel}.csv`, analysis?.humanPolicyEvalRows || [], humanPolicyEvalColumns)}>human_policy_eval.csv</button>
						<button on:click={() => exportCsv(`policy_comparison-${sourceLabel}.csv`, analysis?.policyComparisons || [], getPolicyComparisonExportColumns())}>policy_comparison.csv</button>
						<button on:click={() => exportCsv(`ope_summary-${sourceLabel}.csv`, analysis?.opeSummary || [], getOpeSummaryExportColumns())}>ope_summary.csv</button>
						<button on:click={() => exportCsv(`sandbox_summary-${sourceLabel}.csv`, analysis?.sandboxSummary || [], getSandboxSummaryExportColumns())}>sandbox_summary.csv</button>
						<button on:click={() => exportJson(`dataset_snapshot-${sourceLabel}.json`, analysis?.datasetSnapshot || {})}>dataset_snapshot.json</button>
						<button on:click={() => exportJson(`paper_manifest-${sourceLabel}.json`, analysis?.paperManifest || {})}>manifest.json</button>
						<button on:click={() => exportJson(`research_metadata-${sourceLabel}.json`, analysis?.metadata || {})}>research_metadata.json</button>
						<button class="wf-primary" on:click={saveCurrentSnapshot}>Save Snapshot</button>
					</div>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Artifact Rows</h2></div>
					<table>
						<thead><tr><th>Artifact</th><th>Format</th><th>Rows</th></tr></thead>
						<tbody>
							{#each artifactRows as row}
								<tr><td>{row.artifact}</td><td>{row.format}</td><td>{row.rows}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Manifest Summary</h2></div>
					<div class="wf-kv">
						<div><span>Snapshot ID</span><strong>{analysis.paperManifest?.dataset_snapshot?.snapshot_id || '-'}</strong></div>
						<div><span>Feature Version</span><strong>{analysis.paperManifest?.dataset_snapshot?.feature_version || '-'}</strong></div>
						<div><span>Data Ready</span><strong>{analysis.paperManifest?.dataset_snapshot?.paper_ready ? 'Yes' : 'No'}</strong></div>
						<div><span>Registered Models</span><strong>{analysis.paperManifest?.model_registry?.total_models ?? 0}</strong></div>
					</div>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Workflow Docs</h2></div>
					<p><strong>Research Playbook</strong><br /><span class="wf-muted">Internal workflow notes</span></p>
					<p><strong>Analysis Workflow</strong><br /><span class="wf-muted">Internal workflow notes</span></p>
					<p><strong>Analytics and Model Exports</strong><br /><span class="wf-muted">docs/shared/ANALYTICS_AND_RL_EXPORTS.md</span></p>
					<p><strong>Model Roadmap</strong><br /><span class="wf-muted">Internal workflow notes</span></p>
					<p><strong>Scoring Notes</strong><br /><span class="wf-muted">Internal workflow notes</span></p>
				</div>

				<div class="wf-panel">
					<div class="wf-panel-heading"><h2>Figure Checklist</h2></div>
					<ul class="wf-checklist">
						{#each paperChecklist as item}
							<li>{item}</li>
						{/each}
					</ul>
				</div>

				<div class="wf-panel span-2">
					<div class="wf-panel-heading"><h2>Metric Policy</h2></div>
					<table>
						<thead><tr><th>Use</th><th>Metric</th><th>Role</th></tr></thead>
						<tbody>
							<tr><td>Human decisions</td><td>score_ratio_to_best / regret</td><td>Decision quality against oracle bundles</td></tr>
							<tr><td>Human decisions</td><td>exact and near-optimal rates</td><td>Interpretable choice-quality outcomes</td></tr>
							<tr><td>Task behavior</td><td>earnings, rounds, timing</td><td>Performance, progress, and burden signals</td></tr>
							<tr><td>Model evaluation</td><td>policy comparison / OPE proxy / sandbox summaries</td><td>Baseline and recommendation-policy evidence</td></tr>
							<tr><td>Admin/class</td><td>total_score</td><td>Single spreadsheet score, not a standalone research result</td></tr>
						</tbody>
					</table>
				</div>
			</section>
		{/if}
	</main>
</div>

{#if false}
<div class="research-shell">
	<aside class="control-rail">
		<div>
			<p class="eyebrow">Research Console</p>
			<h1>Dual-Track Recommendation Lab</h1>
			<p class="lede">
				Benchmark the current `mainGame` dataset, flag paper blockers, save frozen snapshots, and queue
				external GPU jobs from one dark technical surface.
			</p>
		</div>

		<div class="rail-card">
			<label for="research-source">Source</label>
			<select id="research-source" bind:value={analysisSource}>
				<option value="firestore">Firestore</option>
				<option value="upload">Uploaded Dataset</option>
			</select>

			{#if analysisSource === 'firestore'}
				<label for="research-dataset">Dataset</label>
				<select id="research-dataset" bind:value={selectedDataset}>
					{#each datasetNames as name}
						<option value={name}>{name}</option>
					{/each}
				</select>
			{:else}
				<label for="research-upload-name">Dataset Name</label>
				<input id="research-upload-name" bind:value={uploadDatasetName} type="text" placeholder="uploaded_dataset" />
				<label for="research-upload-participants">Participants JSON</label>
				<input id="research-upload-participants" type="file" accept=".json" on:change={(event) => uploadFiles.participants = event.currentTarget.files?.[0] || null} />
				<label for="research-upload-scenario-bundle">Scenario Bundle</label>
				<input id="research-upload-scenario-bundle" type="file" accept=".json" on:change={(event) => uploadFiles.scenarioBundle = event.currentTarget.files?.[0] || null} />
				<label for="research-upload-stores">Stores JSON</label>
				<input id="research-upload-stores" type="file" accept=".json" on:change={(event) => uploadFiles.stores = event.currentTarget.files?.[0] || null} />
				<label for="research-upload-cities">Cities JSON</label>
				<input id="research-upload-cities" type="file" accept=".json" on:change={(event) => uploadFiles.cities = event.currentTarget.files?.[0] || null} />
				<label for="research-upload-metadata">Metadata CSV/JSON</label>
				<input id="research-upload-metadata" type="file" accept=".csv,.json" on:change={(event) => uploadFiles.metadata = event.currentTarget.files?.[0] || null} />
				<label for="research-metadata-join-key">Metadata Join Key</label>
				<input id="research-metadata-join-key" bind:value={metadataJoinKey} type="text" placeholder="participant_id" />
				<label for="research-metadata-session-key">Metadata Session Fallback</label>
				<input id="research-metadata-session-key" bind:value={metadataSessionKey} type="text" placeholder="Optional session key" />
			{/if}

			<button class="primary" on:click={runResearchAnalysis} disabled={loading || computing}>
				{computing ? 'Computing...' : 'Run Research Analysis'}
			</button>
		</div>

		<div class="rail-card">
			<p class="rail-label">Exports</p>
			<div class="button-stack">
				<button on:click={() => exportCsv(`analysis_master-${sourceLabel}.csv`, analysis?.analysisMasterRows || [], masterColumns)} disabled={!analysis}>analysis_master.csv</button>
				<button on:click={() => exportCsv(`policy_training-${sourceLabel}.csv`, analysis?.policyTrainingRows || [], policyColumns)} disabled={!analysis}>policy_training.csv</button>
				<button on:click={() => exportCsv(`study_randomization-${sourceLabel}.csv`, analysis?.studyRandomizationRows || [], studyRandomizationColumns)} disabled={!analysis}>study_randomization.csv</button>
				<button on:click={() => exportCsv(`participant_survey-${sourceLabel}.csv`, analysis?.participantSurveyRows || [], participantSurveyColumns)} disabled={!analysis}>participant_survey.csv</button>
				<button on:click={() => exportCsv(`human_policy_eval-${sourceLabel}.csv`, analysis?.humanPolicyEvalRows || [], humanPolicyEvalColumns)} disabled={!analysis}>human_policy_eval.csv</button>
				<button on:click={() => exportCsv(`policy_comparison-${sourceLabel}.csv`, analysis?.policyComparisons || [], getPolicyComparisonExportColumns())} disabled={!analysis}>policy_comparison.csv</button>
				<button on:click={() => exportCsv(`ope_summary-${sourceLabel}.csv`, analysis?.opeSummary || [], getOpeSummaryExportColumns())} disabled={!analysis}>ope_summary.csv</button>
				<button on:click={() => exportCsv(`sandbox_summary-${sourceLabel}.csv`, analysis?.sandboxSummary || [], getSandboxSummaryExportColumns())} disabled={!analysis}>sandbox_summary.csv</button>
				<button on:click={() => exportJson(`dataset_snapshot-${sourceLabel}.json`, analysis?.datasetSnapshot || {})} disabled={!analysis}>dataset_snapshot.json</button>
				<button on:click={() => exportJson(`paper_manifest-${sourceLabel}.json`, analysis?.paperManifest || {})} disabled={!analysis}>paper_manifest.json</button>
				<button on:click={() => exportJson(`research_metadata-${sourceLabel}.json`, analysis?.metadata || {})} disabled={!analysis}>research_metadata.json</button>
				<button on:click={saveCurrentSnapshot} disabled={!analysis}>Save Snapshot</button>
			</div>
		</div>

		<div class="rail-card">
			<p class="rail-label">Sections</p>
			<div class="tab-list">
				{#each sectionOrder as section}
					<button class:active={activeSection === section} on:click={() => activeSection = section}>
						{section}
					</button>
				{/each}
			</div>
		</div>

		{#if success}
			<div class="notice success">{success}</div>
		{/if}
		{#if error}
			<div class="notice error">{error}</div>
		{/if}
	</aside>

	<main class="content">
		{#if loading}
			<section class="empty-panel">Loading research console…</section>
		{:else if !analysis}
			<section class="empty-panel">
				<h2>Run The Research Analysis</h2>
				<p>Pick a dataset source, compute analytics, then use the sections below to inspect benchmark quality, policy lift, and paper readiness.</p>
			</section>
		{:else}
			<div class="hero-grid">
				<div class="hero-card">
					<p class="eyebrow">Dataset</p>
					<h2>{sourceLabel}</h2>
					<p>{analysis.datasetSnapshot?.dataset_version || 'No dataset version id'}</p>
				</div>
				<div class="hero-card">
					<p class="eyebrow">Rows</p>
					<h2>{analysis.analysisMasterRows?.length || 0}</h2>
					<p>{analysis.metadata?.data_health?.timestampedDecisionRows || 0} timestamped / {analysis.metadata?.data_health?.reconstructedDecisionRows || 0} reconstructed</p>
				</div>
				<div class="hero-card">
					<p class="eyebrow">Paper Readiness</p>
					<h2>{analysis.datasetSnapshot?.qa_report?.paper_ready ? 'Ready' : 'Blocked'}</h2>
					<p>{analysis.datasetSnapshot?.qa_report?.blockers?.join(', ') || 'No blockers'}</p>
				</div>
				<div class="hero-card">
					<p class="eyebrow">Protocol</p>
					<h2>{analysis.studyProtocolSummary?.protocol_id || 'Draft'}</h2>
					<p>{analysis.studyProtocolSummary?.target_venue || 'Not set'}</p>
				</div>
				<div class="hero-card">
					<p class="eyebrow">Jobs</p>
					<h2>{researchJobs.length}</h2>
					<p>{researchJobs.filter((job) => job.status === 'queued').length} queued / {researchJobs.filter((job) => job.status === 'running').length} running</p>
				</div>
			</div>

			{#if activeSection === 'dataset'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Snapshot Provenance</h3></div>
						<div class="kv-grid">
							<div><span>Snapshot ID</span><strong>{analysis.datasetSnapshot?.snapshot_id}</strong></div>
							<div><span>Feature Version</span><strong>{analysis.datasetSnapshot?.feature_version}</strong></div>
							<div><span>Source Type</span><strong>{analysisSource === 'upload' ? 'upload' : 'firestore'}</strong></div>
							<div><span>Job Runnable</span><strong>{analysisSource === 'firestore' ? 'Yes' : 'Offline only'}</strong></div>
							<div><span>Benchmark Only</span><strong>{analysis.datasetSnapshot?.benchmark_only_dataset ? 'Yes' : 'No'}</strong></div>
							<div><span>Paper Ready</span><strong>{analysis.datasetSnapshot?.qa_report?.paper_ready ? 'Yes' : 'No'}</strong></div>
						</div>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Row Source Mix</h3></div>
						<table>
							<thead><tr><th>Source</th><th>Rows</th></tr></thead>
							<tbody>
								{#each rowSourceRows as row}
									<tr><td>{row.source}</td><td>{row.count}</td></tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Split Manifest</h3></div>
						<table>
							<thead><tr><th>Split</th><th>Participants</th><th>Rows</th></tr></thead>
							<tbody>
								{#each splitManifestRows as row}
									<tr><td>{row.split}</td><td>{row.participant_count}</td><td>{row.row_count}</td></tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>QA Blockers</h3></div>
						{#if (analysis.datasetSnapshot?.qa_report?.blockers || []).length > 0}
							<ul class="tag-list">
								{#each analysis.datasetSnapshot?.qa_report?.blockers || [] as blocker}
									<li>{blocker}</li>
								{/each}
							</ul>
						{:else}
							<p class="muted">No blockers in the current snapshot.</p>
						{/if}
						<table>
							<thead><tr><th>Issue Type</th><th>Count</th></tr></thead>
							<tbody>
								{#each qaIssueCounts.slice(0, 8) as row}
									<tr><td>{row.issue_type}</td><td>{row.count}</td></tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{:else if activeSection === 'protocol'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Active Protocol</h3></div>
						<div class="kv-grid">
							<div><span>Protocol ID</span><strong>{analysis.studyProtocolSummary?.protocol_id || '-'}</strong></div>
							<div><span>Scope</span><strong>{analysis.studyProtocolSummary?.target_venue || 'Not set'}</strong></div>
							<div><span>Enabled</span><strong>{analysis.studyProtocolSummary?.enabled ? 'Yes' : 'No'}</strong></div>
							<div><span>Survey Rows</span><strong>{analysis.participantSurveyRows?.length || 0}</strong></div>
						</div>
						<table>
							<thead><tr><th>Phase</th><th>Planned</th><th>Actual</th><th>Recommendations</th></tr></thead>
							<tbody>
								{#each protocolPhaseRows as row}
									<tr>
										<td>{row.phase}</td>
										<td>{row.planned_rounds}</td>
										<td>{row.actual_rounds}</td>
										<td>{row.recommendations_enabled ? 'Enabled' : 'Off'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Stored Protocols</h3></div>
						<select bind:value={selectedProtocolId} on:change={() => selectProtocol(researchProtocols.find((entry) => entry.protocol_id === selectedProtocolId) || null)}>
							<option value="">New draft</option>
							{#each researchProtocols as protocol}
								<option value={protocol.protocol_id}>{protocol.protocol_id}</option>
							{/each}
						</select>
						<div class="button-row">
							<button on:click={createNewProtocolDraft}>New Draft</button>
							<button class="primary" on:click={saveProtocolDraft}>Save Protocol</button>
						</div>
						<p class="muted">Phase plan, policy arms, study scope, and action-mask version all live in this JSON draft.</p>
					</div>

					<div class="panel span-2">
						<div class="panel-header"><h3>Protocol JSON Editor</h3></div>
						<textarea bind:value={protocolEditorText} rows="18"></textarea>
					</div>
				</section>
			{:else if activeSection === 'behavior'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Behavior by Phase</h3></div>
						<table>
							<thead><tr><th>Phase</th><th>N</th><th>Optimal</th><th>Mean Regret</th><th>Follow Rate</th></tr></thead>
							<tbody>
								{#each analysis.behaviorByPhase || [] as row}
									<tr>
										<td>{row.phase || 'unknown'}</td>
										<td>{row.n_decisions}</td>
										<td>{formatPct(row.exact_optimal_rate)}</td>
										<td>{formatPct(row.mean_regret)}</td>
										<td>{formatPct(row.recommendation_follow_rate)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Round Attrition</h3></div>
						<table>
							<thead><tr><th>Round</th><th>Participants</th></tr></thead>
							<tbody>
								{#each attritionRows as row}
									<tr><td>{row.round_index}</td><td>{row.participant_count}</td></tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Bundle Size Histogram</h3></div>
						<table>
							<thead><tr><th>Bundle Size</th><th>Count</th></tr></thead>
							<tbody>
								{#each bundleHistogramRows as row}
									<tr><td>{row.bundle_size}</td><td>{row.count}</td></tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Trajectory Segments</h3></div>
						<table>
							<thead><tr><th>Segment</th><th>Participants</th></tr></thead>
							<tbody>
								{#each analysis.trajectorySegments || [] as row}
									<tr><td>{row.trajectory_segment}</td><td>{row.n_participants}</td></tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{:else if activeSection === 'policies'}
				<section class="panel-grid">
					<div class="panel span-2">
						<div class="panel-header"><h3>Policy Comparison</h3></div>
						<table>
							<thead>
								<tr>
									<th>Policy</th><th>Type</th><th>Status</th><th>Scope</th><th>Group</th><th>N</th><th>Reward</th><th>Regret</th><th>Optimal</th><th>Lift vs Human</th>
								</tr>
							</thead>
							<tbody>
								{#each analysis.policyComparisons || [] as row}
									<tr>
										<td>{row.policy_name}</td>
										<td>{row.model_type || '-'}</td>
										<td>{row.implementation_status || '-'}</td>
										<td>{row.scope}</td>
										<td>{row.group_value}</td>
										<td>{row.n_states}</td>
										<td>{formatNum(row.mean_reward)}</td>
										<td>{formatPct(row.mean_regret)}</td>
										<td>{formatPct(row.optimal_rate)}</td>
										<td>{formatNum(row.mean_lift_vs_historical)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Recommendation Workbench</h3></div>
						<table>
							<thead><tr><th>Scope</th><th>Group</th><th>Lift</th><th>Recommended Optimal</th></tr></thead>
							<tbody>
								{#each analysis.recommendationSummary || [] as row}
									<tr>
										<td>{row.scope}</td>
										<td>{row.group_value}</td>
										<td>{formatNum(row.mean_predicted_lift_vs_baseline)}</td>
										<td>{formatPct(row.recommended_optimal_rate)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{:else if activeSection === 'ope'}
				<section class="panel-grid">
					<div class="panel span-2">
						<div class="panel-header"><h3>Off-Policy Evaluation Proxies</h3></div>
						<table>
							<thead>
								<tr>
									<th>Policy</th><th>Type</th><th>Estimator</th><th>Scope</th><th>Group</th><th>IPS</th><th>SNIPS</th><th>DM</th><th>DR</th><th>FQE Proxy</th><th>Match</th>
								</tr>
							</thead>
							<tbody>
								{#each analysis.opeSummary || [] as row}
									<tr>
										<td>{row.policy_name}</td>
										<td>{row.model_type || '-'}</td>
										<td>{row.ope_estimator_family || '-'}</td>
										<td>{row.scope}</td>
										<td>{row.group_value}</td>
										<td>{formatNum(row.ips)}</td>
										<td>{formatNum(row.snips)}</td>
										<td>{formatNum(row.direct_method)}</td>
										<td>{formatNum(row.doubly_robust)}</td>
										<td>{formatNum(row.fqe_one_step)}</td>
										<td>{formatPct(row.match_rate)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{:else if activeSection === 'sandbox'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Simulation-Only Summary</h3></div>
						<table>
							<thead><tr><th>Policy</th><th>Type</th><th>Status</th><th>Mean Reward</th><th>CI Low</th><th>CI High</th><th>Gap vs Human</th></tr></thead>
							<tbody>
								{#each analysis.sandboxSummary || [] as row}
									<tr>
										<td>{row.policy_name}</td>
										<td>{row.model_type || '-'}</td>
										<td>{row.implementation_status || '-'}</td>
										<td>{formatNum(row.mean_simulated_reward)}</td>
										<td>{formatNum(row.simulated_reward_ci_low)}</td>
										<td>{formatNum(row.simulated_reward_ci_high)}</td>
										<td>{formatNum(row.mean_gap_vs_historical)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Scenario-Level Trace Sample</h3></div>
						<table>
							<thead><tr><th>Policy</th><th>Participant</th><th>Round</th><th>Reward</th><th>Lift</th></tr></thead>
							<tbody>
								{#each (analysis.policyStateRows || []).slice(0, 20) as row}
									<tr>
										<td>{row.policy_name}</td>
										<td>{row.participant_id}</td>
										<td>{row.round_index}</td>
										<td>{formatNum(row.policy_expected_reward)}</td>
										<td>{formatNum(row.lift_vs_historical)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{:else if activeSection === 'studyqa'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Study QA Summary</h3></div>
						<div class="kv-grid">
							<div><span>Responses</span><strong>{surveySummary.responses ?? 0}</strong></div>
							<div><span>Participants With Survey</span><strong>{surveySummary.participants_with_survey ?? 0}</strong></div>
							<div><span>Participants With Decisions</span><strong>{surveySummary.participants_with_decisions ?? 0}</strong></div>
							<div><span>Coverage</span><strong>{formatPct(surveySummary.survey_coverage_rate)}</strong></div>
						</div>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Arm Balance</h3></div>
						<table>
							<thead><tr><th>Arm</th><th>Participants</th></tr></thead>
							<tbody>
								{#each studyArmRows as row}
									<tr><td>{row.assigned_arm}</td><td>{row.participant_count}</td></tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel span-2">
						<div class="panel-header"><h3>Randomization Rows</h3></div>
						<table>
							<thead><tr><th>Participant</th><th>Arm</th><th>Policy</th><th>Assigned</th><th>Decisions</th></tr></thead>
							<tbody>
								{#if (analysis.studyRandomizationRows || []).length === 0}
									<tr><td colspan="5">No study randomization rows yet</td></tr>
								{:else}
									{#each (analysis.studyRandomizationRows || []).slice(0, 30) as row}
										<tr>
											<td>{row.participant_id}</td>
											<td>{row.assigned_arm || '-'}</td>
											<td>{row.policy_name || '-'}</td>
											<td>{row.assigned_at || '-'}</td>
											<td>{row.decision_count}</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</section>
			{:else if activeSection === 'modelregistry'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Registry Summary</h3></div>
						<div class="kv-grid">
							<div><span>Total Models</span><strong>{analysis.metadata?.model_registry?.total_models ?? researchModelsRegistry.length}</strong></div>
							<div><span>Active</span><strong>{analysis.metadata?.model_registry?.active_models ?? researchModelsRegistry.filter((entry) => entry.is_active).length}</strong></div>
							<div><span>Simulation Only</span><strong>{analysis.metadata?.model_registry?.simulation_only_models ?? researchModelsRegistry.filter((entry) => entry.simulation_only).length}</strong></div>
							<div><span>Snapshot</span><strong>{analysis.datasetSnapshot?.snapshot_id || '-'}</strong></div>
						</div>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Stored Models</h3></div>
						<select bind:value={selectedModelId} on:change={() => selectModel(researchModelsRegistry.find((entry) => entry.model_id === selectedModelId) || null)}>
							<option value="">New draft</option>
							{#each researchModelsRegistry as model}
								<option value={model.model_id}>{model.model_id}</option>
							{/each}
						</select>
						<div class="button-row">
							<button on:click={createNewModelDraft}>New Draft</button>
							<button class="primary" on:click={saveModelDraft}>Save Model</button>
						</div>
						<p class="muted">The registry stores model type, implementation status, training provenance, and scenario-level recommendation maps.</p>
					</div>

					<div class="panel span-2">
						<div class="panel-header"><h3>Model JSON Editor</h3></div>
						<textarea bind:value={modelEditorText} rows="18"></textarea>
					</div>
				</section>
			{:else if activeSection === 'humanresults'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Human Policy Evaluation</h3></div>
						<table>
							<thead><tr><th>Scope</th><th>Group</th><th>Arm</th><th>N</th><th>Score Ratio</th><th>Regret</th><th>Trust</th></tr></thead>
							<tbody>
								{#each analysis.humanPolicyEvalRows || [] as row}
									<tr>
										<td>{row.scope}</td>
										<td>{row.group_value}</td>
										<td>{row.policy_arm || row.policy_name}</td>
										<td>{row.n_decisions}</td>
										<td>{formatNum(row.mean_score_ratio)}</td>
										<td>{formatPct(row.mean_regret)}</td>
										<td>{formatNum(row.mean_trust_rating, 2)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Participant Survey Rows</h3></div>
						<table>
							<thead><tr><th>Participant</th><th>Scope</th><th>Trust</th><th>Usefulness</th><th>Workload</th></tr></thead>
							<tbody>
								{#each (analysis.participantSurveyRows || []).slice(0, 25) as row}
									<tr>
										<td>{row.participant_id}</td>
										<td>{row.response_scope}</td>
										<td>{row.trust_rating}</td>
										<td>{row.usefulness_rating}</td>
										<td>{row.workload_rating}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{:else if activeSection === 'jobs'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Queue GPU Job</h3></div>
						<label for="research-saved-snapshot">Saved Snapshot</label>
						<select id="research-saved-snapshot" bind:value={selectedSnapshotId}>
							<option value="">Use current snapshot</option>
							{#each researchSnapshots as snapshot}
								<option value={snapshot.snapshot_id}>{snapshot.snapshot_id}</option>
							{/each}
						</select>
						<label for="research-job-type">Job Type</label>
						<select id="research-job-type" bind:value={jobType}>
							<option value="train_policy">train_policy</option>
							<option value="evaluate_policy">evaluate_policy</option>
							<option value="sandbox_run">sandbox_run</option>
						</select>
						<label for="research-algorithm">Algorithm</label>
						<select id="research-algorithm" bind:value={algorithm}>
							<option value="behavior_clone">behavior_clone</option>
							<option value="reward_model">reward_model</option>
							<option value="contextual_bandit">contextual_bandit</option>
							<option value="CQL">CQL_planned</option>
							<option value="IQL">IQL_planned</option>
							<option value="DQN_simulator_only">DQN_simulator_only_planned</option>
						</select>
						<label for="research-job-config">Config JSON</label>
						<textarea id="research-job-config" bind:value={jobConfigText} rows="10"></textarea>
						<button class="primary" on:click={queueResearchJob}>Queue Research Job</button>
					</div>

					<div class="panel span-2">
						<div class="panel-header"><h3>Research Jobs</h3></div>
						<table>
							<thead><tr><th>Job</th><th>Algorithm</th><th>Status</th><th>Snapshot</th><th>Created</th><th>Error</th></tr></thead>
							<tbody>
								{#if researchJobs.length === 0}
									<tr><td colspan="6">No research jobs yet</td></tr>
								{:else}
									{#each researchJobs as job}
										<tr>
											<td>{job.job_type}</td>
											<td>{job.algorithm}</td>
											<td>{job.status}</td>
											<td>{job.dataset_snapshot_id}</td>
											<td>{job.created_at || '-'}</td>
											<td>{job.error_summary || '-'}</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</section>
			{:else if activeSection === 'artifacts'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Artifact Package</h3></div>
						<table>
							<thead><tr><th>Artifact</th><th>Format</th><th>Rows</th></tr></thead>
							<tbody>
								{#each artifactRows as row}
									<tr><td>{row.artifact}</td><td>{row.format}</td><td>{row.rows}</td></tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Paper Manifest Summary</h3></div>
						<div class="kv-grid">
							<div><span>Snapshot ID</span><strong>{analysis.paperManifest?.dataset_snapshot?.snapshot_id || '-'}</strong></div>
							<div><span>Feature Version</span><strong>{analysis.paperManifest?.dataset_snapshot?.feature_version || '-'}</strong></div>
							<div><span>Paper Ready</span><strong>{analysis.paperManifest?.dataset_snapshot?.paper_ready ? 'Yes' : 'No'}</strong></div>
							<div><span>Registered Models</span><strong>{analysis.paperManifest?.model_registry?.total_models ?? 0}</strong></div>
						</div>
					</div>

					<div class="panel span-2">
						<div class="panel-header"><h3>Manifest Exports</h3></div>
						<table>
							<thead><tr><th>Export</th><th>Included</th></tr></thead>
							<tbody>
								{#each analysis.paperManifest?.exports || [] as item}
									<tr><td>{item}</td><td>Yes</td></tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{:else if activeSection === 'paper'}
				<section class="panel-grid">
					<div class="panel">
						<div class="panel-header"><h3>Workflow Docs</h3></div>
						<p><strong>Research Playbook</strong><br /><span class="muted">docs/study1_pilot_working_paper/RESEARCH_PLAYBOOK.md</span></p>
						<p><strong>Paper Analysis Workflow</strong><br /><span class="muted">docs/study1_pilot_working_paper/PAPER_ANALYSIS_WORKFLOW.md</span></p>
						<p><strong>Analytics and Model Exports</strong><br /><span class="muted">docs/shared/ANALYTICS_AND_RL_EXPORTS.md</span></p>
						<p><strong>Study Roadmap</strong><br /><span class="muted">docs/study1_pilot_working_paper/FULL_PAPER_READY_STUDY_ROADMAP.md</span></p>
						<p><strong>Positioning and Scoring</strong><br /><span class="muted">docs/archive/planning-2026-04/VENUE_POSITIONING_AND_SCORING.md</span></p>
					</div>

					<div class="panel">
						<div class="panel-header"><h3>Figure Checklist</h3></div>
						<ul class="checklist">
							{#each paperChecklist as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>

					<div class="panel span-2">
						<div class="panel-header"><h3>Current Paper Notes</h3></div>
						<p class="muted">
							Use `mainGame` as an offline benchmark dataset now. Do not make recommendation-treatment or trained policy
							claims from it until the new labeled experiment dataset is live, timestamp complete, and model artifacts are registered.
						</p>
						<table>
							<thead><tr><th>Signal</th><th>Value</th></tr></thead>
							<tbody>
								<tr><td>Paper Ready</td><td>{analysis.datasetSnapshot?.qa_report?.paper_ready ? 'Yes' : 'No'}</td></tr>
								<tr><td>Blockers</td><td>{analysis.datasetSnapshot?.qa_report?.blockers?.join(', ') || 'None'}</td></tr>
								<tr><td>Row Sources</td><td>{rowSourceRows.map((row) => `${row.source}: ${row.count}`).join(' | ')}</td></tr>
								<tr><td>Policy Rows</td><td>{analysis.policyTrainingRows?.length || 0}</td></tr>
							</tbody>
						</table>
					</div>

					<div class="panel span-2">
						<div class="panel-header"><h3>Research Positioning</h3></div>
						<table>
							<thead><tr><th>Track</th><th>Best Current Framing</th><th>Evidence To Lead With</th></tr></thead>
							<tbody>
								<tr><td>Human study</td><td>Decision-making and decision support</td><td>Learning, regret, optimality, survey completion, qualitative strategy notes</td></tr>
								<tr><td>Recommender study</td><td>Interactive recommendation benchmark</td><td>Policy baselines, OPE proxies, held-out reward/regret, reproducible snapshots</td></tr>
								<tr><td>Sociotechnical study</td><td>Decision support under constraints</td><td>Accountability, participant burden, labor framing, access/equity limits</td></tr>
							</tbody>
						</table>
					</div>

					<div class="panel span-2">
						<div class="panel-header"><h3>Score Policy</h3></div>
						<p class="muted">
							Admin CSV `total_score` is a class-relative delivery score: 70% outcome, 20% normalized
							optimal-rate, and 10% normalized progress. It is useful for class reporting, but paper claims
							should lead with decomposed research metrics.
						</p>
						<table>
							<thead><tr><th>Use</th><th>Metric</th><th>Role</th></tr></thead>
							<tbody>
								<tr><td>Paper primary</td><td>score_ratio_to_best / regret</td><td>Decision quality against oracle bundles</td></tr>
								<tr><td>Paper primary</td><td>exact and near-optimal rates</td><td>Interpretable choice-quality outcomes</td></tr>
								<tr><td>Paper secondary</td><td>earnings, rounds, timing</td><td>Task performance, productivity, and burden</td></tr>
								<tr><td>Admin/class</td><td>total_score</td><td>Single spreadsheet score, not a standalone research claim</td></tr>
							</tbody>
						</table>
					</div>
				</section>
			{/if}
		{/if}
	</main>
</div>
{/if}

<style>
	:global(body) {
		background:
			radial-gradient(circle at top left, rgba(80, 100, 255, 0.12), transparent 26%),
			radial-gradient(circle at top right, rgba(0, 209, 178, 0.1), transparent 22%),
			linear-gradient(180deg, #050816 0%, #0b1021 100%);
		color: #e5edf8;
	}

	.research-shell {
		display: grid;
		grid-template-columns: 340px minmax(0, 1fr);
		min-height: 100vh;
	}

	.control-rail {
		padding: 1.5rem;
		border-right: 1px solid rgba(148, 163, 184, 0.18);
		background: rgba(4, 8, 20, 0.9);
		backdrop-filter: blur(18px);
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.72rem;
		color: #7dd3fc;
		margin: 0 0 0.4rem 0;
	}

	h1, h2, h3 {
		margin: 0;
		font-family: "Space Grotesk", "Avenir Next", sans-serif;
	}

	.lede, .muted {
		color: #9fb2ca;
	}

	.rail-card, .panel, .hero-card, .empty-panel {
		background: rgba(12, 18, 37, 0.82);
		border: 1px solid rgba(148, 163, 184, 0.16);
		border-radius: 20px;
		box-shadow: 0 20px 50px rgba(2, 6, 23, 0.35);
	}

	.rail-card {
		padding: 1rem;
		display: grid;
		gap: 0.7rem;
	}

	.rail-label {
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #94a3b8;
		margin: 0;
	}

	label {
		font-size: 0.8rem;
		color: #93a4bd;
	}

	select, input, textarea, button {
		font: inherit;
	}

	select, input, textarea {
		width: 100%;
		border-radius: 14px;
		border: 1px solid rgba(148, 163, 184, 0.18);
		background: rgba(15, 23, 42, 0.95);
		color: #eff6ff;
		padding: 0.8rem 0.9rem;
	}

	textarea {
		resize: vertical;
		min-height: 160px;
		font-family: "IBM Plex Mono", monospace;
		font-size: 0.84rem;
	}

	button {
		border: 0;
		border-radius: 14px;
		padding: 0.8rem 0.95rem;
		background: rgba(30, 41, 59, 0.95);
		color: #e2e8f0;
		cursor: pointer;
	}

	button.primary {
		background: linear-gradient(135deg, #2563eb 0%, #0f766e 100%);
		color: white;
		font-weight: 700;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.button-stack, .tab-list {
		display: grid;
		gap: 0.55rem;
	}

	.button-row {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.tab-list button.active {
		background: linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(8, 145, 178, 0.85));
	}

	.notice {
		padding: 0.9rem 1rem;
		border-radius: 14px;
		font-size: 0.9rem;
	}

	.notice.success {
		background: rgba(16, 185, 129, 0.16);
		border: 1px solid rgba(16, 185, 129, 0.35);
	}

	.notice.error {
		background: rgba(248, 113, 113, 0.14);
		border: 1px solid rgba(248, 113, 113, 0.35);
	}

	.content {
		padding: 1.5rem;
		display: grid;
		gap: 1.25rem;
		align-content: start;
	}

	.hero-grid, .panel-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.hero-grid {
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	}

	.hero-card, .panel, .empty-panel {
		padding: 1.15rem;
	}

	.hero-card h2 {
		font-size: 1.6rem;
		margin-bottom: 0.35rem;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.9rem;
	}

	.panel-header h3 {
		font-size: 1rem;
	}

	.span-2 {
		grid-column: span 2;
	}

	.kv-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.kv-grid span {
		display: block;
		font-size: 0.76rem;
		color: #8aa0bb;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 0.3rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
	}

	th, td {
		padding: 0.65rem 0.4rem;
		border-bottom: 1px solid rgba(148, 163, 184, 0.12);
		text-align: left;
		vertical-align: top;
	}

	th {
		font-size: 0.76rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #8aa0bb;
	}

	.tag-list, .checklist {
		margin: 0;
		padding-left: 1.1rem;
		display: grid;
		gap: 0.45rem;
	}

	.empty-panel {
		min-height: 220px;
		display: grid;
		place-content: center;
		text-align: center;
	}

	@media (max-width: 1100px) {
		.research-shell {
			grid-template-columns: 1fr;
		}

		.hero-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 720px) {
		.hero-grid, .panel-grid, .kv-grid {
			grid-template-columns: 1fr;
		}

		.span-2 {
			grid-column: auto;
		}
	}

	:global(body) {
		background: #eef2f6;
		color: #152033;
	}

	.research-workflow {
		min-height: calc(100vh - 4rem);
		background: #eef2f6;
		color: #152033;
		padding: 1.25rem;
		display: grid;
		gap: 1rem;
	}

	.wf-hero {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.65fr);
		gap: 1rem;
		align-items: stretch;
	}

	.wf-hero-copy,
	.wf-source-panel,
	.wf-panel,
	.wf-kpi,
	.wf-empty {
		background: #ffffff;
		border: 1px solid #d7dee8;
		border-radius: 8px;
		box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
	}

	.wf-hero-copy {
		padding: clamp(1.25rem, 2.5vw, 2rem);
		display: grid;
		align-content: space-between;
		gap: 1.2rem;
		border-top: 4px solid #315f72;
	}

	.wf-source-panel,
	.wf-panel,
	.wf-kpi,
	.wf-empty {
		padding: 1rem;
	}

	.wf-eyebrow {
		margin: 0 0 0.4rem;
		color: #426579;
		font-size: 0.74rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.research-workflow h1,
	.research-workflow h2 {
		margin: 0;
		color: #101827;
		font-family: Inter, "Avenir Next", system-ui, sans-serif;
		letter-spacing: 0;
	}

	.research-workflow h1 {
		max-width: 920px;
		font-size: clamp(2.2rem, 4.4vw, 4.7rem);
		line-height: 0.96;
	}

	.research-workflow h2 {
		font-size: 1rem;
	}

	.wf-lede {
		max-width: 820px;
		margin: 0;
		color: #4b5b6d;
		font-size: clamp(1rem, 1.45vw, 1.24rem);
		line-height: 1.55;
	}

	.wf-workflow-strip {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		border: 1px solid #dce3ec;
		border-radius: 8px;
		overflow: hidden;
	}

	.wf-step {
		min-height: 84px;
		padding: 0.85rem;
		background: #f8fafc;
		border-right: 1px solid #dce3ec;
		display: grid;
		align-content: start;
		gap: 0.45rem;
	}

	.wf-step:last-child {
		border-right: 0;
	}

	.wf-step span {
		width: 1.6rem;
		height: 1.6rem;
		display: grid;
		place-items: center;
		background: #315f72;
		color: white;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 800;
	}

	.wf-step strong {
		color: #172033;
		font-size: 0.9rem;
		line-height: 1.25;
	}

	.wf-panel-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.85rem;
	}

	.wf-status-chip {
		white-space: nowrap;
		border: 1px solid #c8d7df;
		background: #eef6f8;
		color: #315f72;
		border-radius: 999px;
		padding: 0.35rem 0.6rem;
		font-size: 0.75rem;
		font-weight: 800;
	}

	.wf-form-grid {
		display: grid;
		gap: 0.45rem;
	}

	.research-workflow label {
		color: #57677a;
		font-size: 0.78rem;
		font-weight: 800;
	}

	.research-workflow select,
	.research-workflow input,
	.research-workflow textarea {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		color: #152033;
		padding: 0.68rem 0.75rem;
		font: inherit;
	}

	.research-workflow textarea {
		min-height: 180px;
		font-family: "SFMono-Regular", Consolas, monospace;
		font-size: 0.84rem;
		line-height: 1.45;
		resize: vertical;
	}

	.wf-action-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin-top: 0.8rem;
	}

	.wf-progress-card {
		margin-top: 0.9rem;
		padding: 0.85rem;
		border: 1px solid #d7e2ea;
		border-radius: 8px;
		background: #f8fbfd;
		display: grid;
		gap: 0.7rem;
	}

	.wf-progress-meta {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	.wf-progress-meta span {
		display: block;
		color: #64748b;
		font-size: 0.7rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.wf-progress-meta strong {
		display: block;
		margin-top: 0.15rem;
		color: #172033;
	}

	.wf-progress-meta b {
		color: #315f72;
		font-size: 1rem;
	}

	.wf-progress-track {
		height: 0.55rem;
		border-radius: 999px;
		background: #dbe5ec;
		overflow: hidden;
	}

	.wf-progress-track div {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #315f72, #4f8b78);
		transition: width 0.22s ease;
	}

	.wf-progress-card p {
		margin: 0;
		color: #526273;
		font-size: 0.86rem;
		line-height: 1.4;
	}

	.wf-progress-steps {
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.42rem;
		list-style: none;
	}

	.wf-progress-steps li {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 800;
	}

	.wf-progress-steps li span {
		width: 1.25rem;
		height: 1.25rem;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: #e2e8f0;
		color: #475569;
		font-size: 0.68rem;
	}

	.wf-progress-steps li.active,
	.wf-progress-steps li.done {
		color: #1f4f62;
	}

	.wf-progress-steps li.active span {
		background: #315f72;
		color: white;
	}

	.wf-progress-steps li.done span {
		background: #d8f3e5;
		color: #166534;
	}

	.research-workflow button {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		color: #1f2a3d;
		cursor: pointer;
		font: inherit;
		font-weight: 800;
		padding: 0.68rem 0.85rem;
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	}

	.research-workflow button:hover:not(:disabled) {
		border-color: #315f72;
		background: #eef6f8;
	}

	.research-workflow button:disabled {
		cursor: not-allowed;
		opacity: 0.48;
	}

	.research-workflow button.wf-primary,
	.wf-primary {
		background: #315f72;
		border-color: #315f72;
		color: #ffffff;
	}

	.wf-notice {
		border-radius: 8px;
		padding: 0.8rem 1rem;
		font-weight: 700;
	}

	.wf-notice.success {
		background: #ecfdf5;
		border: 1px solid #a7f3d0;
		color: #065f46;
	}

	.wf-notice.error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}

	.wf-tabs {
		position: sticky;
		top: 64px;
		z-index: 30;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		background: #f8fafc;
		border: 1px solid #d7dee8;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
	}

	.wf-tabs button {
		border: 0;
		border-right: 1px solid #d7dee8;
		border-radius: 0;
		background: transparent;
		text-align: left;
		padding: 0.85rem 1rem;
	}

	.wf-tabs button:last-child {
		border-right: 0;
	}

	.wf-tabs button span {
		display: block;
		color: #64748b;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.wf-tabs button strong {
		display: block;
		margin-top: 0.25rem;
		color: #172033;
		font-size: 0.96rem;
	}

	.wf-tabs button.active {
		background: #172033;
	}

	.wf-tabs button.active span,
	.wf-tabs button.active strong {
		color: white;
	}

	.wf-main {
		display: grid;
		gap: 1rem;
	}

	.wf-empty {
		min-height: 280px;
		display: grid;
		place-content: center;
		text-align: center;
	}

	.wf-empty p {
		max-width: 680px;
		color: #4b5b6d;
	}

	.wf-kpi-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 1rem;
	}

	.wf-kpi {
		display: grid;
		gap: 0.25rem;
	}

	.wf-kpi span,
	.wf-kv span {
		color: #64748b;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.wf-kpi strong {
		color: #101827;
		font-size: clamp(1.3rem, 2vw, 2rem);
		line-height: 1.1;
		overflow-wrap: anywhere;
	}

	.wf-kpi p,
	.wf-muted {
		margin: 0;
		color: #5c6b7c;
	}

	.wf-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.wf-panel {
		overflow-x: auto;
	}

	.span-2 {
		grid-column: span 2;
	}

	.readiness-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.readiness-card {
		min-height: 132px;
		display: grid;
		align-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem;
		border: 1px solid #dce3ec;
		border-radius: 8px;
		background: #fbfdff;
	}

	.readiness-card strong {
		display: block;
		color: #172033;
	}

	.readiness-card p {
		margin: 0.3rem 0 0;
		color: #5c6b7c;
		font-size: 0.84rem;
		line-height: 1.4;
	}

	.readiness-card span {
		width: fit-content;
		border-radius: 999px;
		padding: 0.35rem 0.55rem;
		font-size: 0.72rem;
		font-weight: 900;
	}

	.readiness-card.ready {
		border-color: #bbf7d0;
		background: #f0fdf4;
	}

	.readiness-card.ready span {
		background: #dcfce7;
		color: #166534;
	}

	.readiness-card.caution {
		border-color: #fde68a;
		background: #fffbeb;
	}

	.readiness-card.caution span {
		background: #fef3c7;
		color: #92400e;
	}

	.readiness-card.blocked {
		border-color: #fecaca;
		background: #fef2f2;
	}

	.readiness-card.blocked span {
		background: #fee2e2;
		color: #991b1b;
	}

	.claim-list {
		display: grid;
		border: 1px solid #dce3ec;
		border-radius: 8px;
		overflow: hidden;
	}

	.claim-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1rem;
		align-items: center;
		padding: 0.85rem;
		border-bottom: 1px solid #dce3ec;
		background: #fbfdff;
	}

	.claim-row:last-child {
		border-bottom: 0;
	}

	.claim-row p {
		margin: 0.25rem 0 0;
		color: #5c6b7c;
	}

	.claim-status {
		border-radius: 999px;
		padding: 0.35rem 0.55rem;
		font-size: 0.74rem;
		font-weight: 900;
		white-space: nowrap;
	}

	.claim-status.ready {
		background: #dcfce7;
		color: #166534;
	}

	.claim-status.caution {
		background: #fef3c7;
		color: #92400e;
	}

	.claim-status.blocked {
		background: #fee2e2;
		color: #991b1b;
	}

	.wf-kv {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem;
	}

	.wf-kv div {
		padding: 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
	}

	.wf-kv strong {
		display: block;
		margin-top: 0.25rem;
		color: #172033;
		overflow-wrap: anywhere;
	}

	.research-workflow table {
		width: 100%;
		min-width: 620px;
		border-collapse: collapse;
		color: #172033;
		font-size: 0.86rem;
	}

	.research-workflow th,
	.research-workflow td {
		padding: 0.68rem 0.5rem;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
		vertical-align: top;
	}

	.research-workflow th {
		color: #64748b;
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.wf-tag-list,
	.wf-checklist {
		margin: 0 0 1rem;
		padding-left: 1.1rem;
		display: grid;
		gap: 0.45rem;
		color: #263449;
	}

	.wf-export-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 0.6rem;
	}

	@media (max-width: 1180px) {
		.wf-hero,
		.wf-grid {
			grid-template-columns: 1fr;
		}

		.wf-kpi-grid,
		.readiness-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.span-2 {
			grid-column: auto;
		}
	}

	@media (max-width: 760px) {
		.research-workflow {
			padding: 0.75rem;
		}

		.wf-workflow-strip,
		.wf-tabs,
		.wf-kpi-grid,
		.readiness-grid,
		.wf-kv {
			grid-template-columns: 1fr;
		}

		.wf-tabs {
			position: static;
		}

		.wf-tabs button,
		.wf-step {
			border-right: 0;
			border-bottom: 1px solid #d7dee8;
		}

		.wf-tabs button:last-child,
		.wf-step:last-child {
			border-bottom: 0;
		}

		.claim-row {
			grid-template-columns: 1fr;
		}
	}
</style>
