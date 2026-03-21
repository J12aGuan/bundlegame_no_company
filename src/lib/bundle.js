import { writable, readable, derived, get} from 'svelte/store';
import { browser } from '$app/environment';
import { 
    authenticateUser, createUser,
    getCentralConfig, getTutorialConfig, getExperimentScenarios, getOrdersData, getStoresData, getCitiesData, getEmojisData,
    getScenarioDatasetBundle, initializeUserProgress, saveUserProgressSummary,
    getScenarioSetProgress, saveScenarioSetProgress, getActionSummaries, saveActionSummaries, getDetailedActionSummaries, saveDetailedActionSummaries, getUserSummary
} from './firebaseDB';

import { switchJob, setPenaltyTimeout } from './config';

const MAIN_STORE_FILE = 'store.json';
const MAIN_CITIES_FILE = 'cities.json';

// Default config values (must exist in Firebase; these are boot defaults only)
let config = {
	timeLimit: 1200,
	thinkTime: 10,
	gridSize: 3,
	auth: true,
	tips: false,
	waiting: false,
	refresh: false,
	expire: false,
	ordersShown: 4,
	roundTimeLimit: 300,
	penaltyTimeout: 30,
	scenario_set: 'experiment'
};

let experimentScenarios = [];
let optimalByScenarioId = new Map();
let firebaseInitialized = false;
let initializedMode = null;
let activeScenarioSetVersionId = '';
let activeScenarioSetName = '';
const PENDING_PROGRESS_STORAGE_KEY = 'bundlegame:pendingProgressSave';
let pendingProgressFlushInFlight = false;
let pendingProgressListenerRegistered = false;

// Initialize config and scenarios from Firebase
export async function initializeFromFirebase(mode = 'main') {
	try {
		if (mode === 'tutorial') {
			const tutorialConfigData = await getTutorialConfig();
			if (tutorialConfigData) {
					config = {
						...config,
						timeLimit: null,
						thinkTime: tutorialConfigData.thinkTime ?? config.thinkTime,
						gridSize: tutorialConfigData.gridSize ?? config.gridSize,
						auth: tutorialConfigData.auth ?? config.auth,
						tips: tutorialConfigData.tips ?? config.tips,
						waiting: tutorialConfigData.waiting ?? config.waiting,
						refresh: tutorialConfigData.refresh ?? config.refresh,
						expire: tutorialConfigData.expire ?? config.expire,
						roundTimeLimit: null,
						scenario_set: tutorialConfigData.scenario_set ?? config.scenario_set
					};
				console.log('Tutorial config loaded from Firebase:', config);
			}
		} else {
			const centralConfigData = await getCentralConfig();
			if (centralConfigData) {
				config = {
					timeLimit: centralConfigData.game?.timeLimit ?? config.timeLimit,
					thinkTime: centralConfigData.game?.thinkTime ?? config.thinkTime,
					gridSize: centralConfigData.game?.gridSize ?? config.gridSize,
					auth: centralConfigData.game?.auth ?? config.auth,
					tips: centralConfigData.game?.tips ?? config.tips,
					waiting: centralConfigData.game?.waiting ?? config.waiting,
					refresh: centralConfigData.game?.refresh ?? config.refresh,
					expire: centralConfigData.game?.expire ?? config.expire,
					ordersShown: centralConfigData.game?.ordersShown ?? config.ordersShown,
					roundTimeLimit: centralConfigData.game?.roundTimeLimit ?? config.roundTimeLimit,
					penaltyTimeout: centralConfigData.game?.penaltyTimeout ?? config.penaltyTimeout,
					scenario_set: centralConfigData.scenario_set ?? config.scenario_set
				};
				console.log('Central config loaded from Firebase:', config);
			}
		}
		
		const scenarioSetId = config.scenario_set || 'experiment';
		const scenarios = await getExperimentScenarios(scenarioSetId);
		if (scenarios && Array.isArray(scenarios)) {
			experimentScenarios = scenarios;
			console.log(`Experiment scenarios loaded from Firebase (${scenarioSetId}):`, experimentScenarios.length, 'scenarios');
		}

		const emojisData = await getEmojisData();
		if (emojisData && Object.keys(emojisData).length > 0) {
			emojisMap.set(emojisData);
		}
	} catch (error) {
		console.error('Error initializing from Firebase:', error);
	}

	FullTimeLimit.set(config.timeLimit);
	needsAuth.set(config.auth);
	numCols.set(config.gridSize);
	thinkTime.set(config.thinkTime);
	ordersShown.set(config.ordersShown);
	roundTimeLimit.set(config.roundTimeLimit);
	gameMode.set(mode);
	setPenaltyTimeout(config.penaltyTimeout);
	scenarios.set(experimentScenarios);
	game.update((current) => ({
		...current,
		tip: config.tips,
		waiting: config.waiting,
		refresh: config.refresh
	}));
	firebaseInitialized = true;
	initializedMode = mode;
}

let storeConfigs = {}
let orderConfigs = []

let start;
let stopTimeInterval;
let completionMessageSent = false;
export const uniqueSets = writable(0);
export const orderList = writable([])
export const FullTimeLimit = writable(config["timeLimit"]);
export const participantResultUrl = writable("");
export const gameMode = writable('main');
export const scenarioSetVersionId = writable('');
export const optimalChoices = writable(0);
export const resumeElapsedSeconds = writable(0);
export const scenarioSetProgress = writable({
	completedScenarios: [],
	inProgressScenario: '',
	scenarioSetName: '',
	currentRound: 1,
	currentLocation: ''
});
export const scenarioActions = writable({});
export const detailedScenarioActions = writable({});

export const needsAuth = writable(config["auth"])

export const numCols = writable(config["gridSize"])

// Experiment round management
export const currentRound = writable(1);
export const scenarios = writable(experimentScenarios);
export const roundStartTime = writable(0);

export function getCurrentScenario(round) {
  const scenariosArray = get(scenarios);
  return scenariosArray.find((s) => s.round === round) ?? scenariosArray[scenariosArray.length - 1] ?? { round: 1, max_bundle: 3, orders: [] };
}

export function getOptimalForScenario(scenarioId) {
	const id = String(scenarioId ?? '').trim();
	if (!id) return null;
	return optimalByScenarioId.get(id) ?? null;
}

function hydrateScenariosWithOrders(rawScenarios = [], orders = []) {
	const byId = new Map((orders || []).map((order) => [String(order?.id ?? ''), order]).filter(([id]) => id));
	return (rawScenarios || []).map((scenario = {}) => {
		const ids = Array.isArray(scenario.order_ids)
			? scenario.order_ids
			: (scenario.orders || []).map((entry) => (typeof entry === 'string' ? entry : entry?.id));
		const normalizedIds = ids.map((id) => String(id ?? '').trim()).filter(Boolean);
		const hydratedOrders = normalizedIds.map((id) => {
			const found = byId.get(id);
			return found ? { ...found } : { id, city: '', store: '', items: {}, earnings: 0, estimatedTime: 0, localTravelTime: 0 };
		});
		return {
			...scenario,
			order_ids: normalizedIds,
			orders: hydratedOrders
		};
	});
}

const experiment = true

export const GameOver = writable(false);
export const gameText = writable({
	selector: "None selected",
})

export const thinkTime = writable(config["thinkTime"]);
export const ordersShown = writable(config["ordersShown"]);
export const roundTimeLimit = writable(config["roundTimeLimit"]);
export const emojisMap = writable({});
export const game = writable({
	inSelect: false,
	inStore: false,
	bundled: false,
	tip: config["tips"],
	waiting: config["waiting"],
	refresh: config["refresh"],
	penaltyTriggered: false
});

export const tipTimers = writable([])

export function createTipTimer(id, initialTime) {
	tipTimers.update(t => {
		const newTimer = { orderId: id, remainingTime: initialTime, intervalId: null };
      	return [...t, newTimer];
	})
}


export function startTipTimer(id) {
    tipTimers.update(t => {
      	const updatedTimers = t.map(timer => {
			if (timer.id === id && timer.intervalId === null) {
				timer.intervalId = setInterval(() => {
					tipTimers.update(tipTimers => {
						const updated = tipTimers.map(t => {
							if (t.id === id && t.remainingTime > 0) {
								t.remainingTime -= 1;
							}
							return t;
						});
						return updated;
					});
				}, 1000);
			}
        	return timer;
      	});
      	return updatedTimers;
    });
}

export function stopTipTimer(id) {
	tipTimers.update(t => {
		const updatedTimers = t.map(timer => {
			if (timer.id === id && timer.intervalId !== null) {
				clearInterval(timer.intervalId);
				timer.intervalId = null;
			}
			return timer;
		});
		return updatedTimers;
	});
}

export function removeTipTimer(id) {
	tipTimers.update(t => {
		const updatedTimers = t.filter(timer => timer.id !== id); // Filter out the timer with the specified id
		return updatedTimers;
	});
}

export function resetTimer() {
	let initialSeconds = arguments.length > 0 ? Number(arguments[0]) || 0 : 0;
	start = new Date(Date.now() - Math.max(0, initialSeconds) * 1000);
	pausedAt = null;
	pauseDuration = 0;
}

let interval

const time = writable(new Date()) 

export const startTimer = () => {
	interval = setInterval(() => {
		time.set(new Date());
	}, 10);

	stopTimeInterval = () => clearInterval(interval);
	
	return function stop() {
		clearInterval(interval);
	};
};

let pausedAt = null;
let pauseDuration = 0;
let timeoutGameOverProcessed = false;
let activeScenarioPhase = {
	scenarioId: '',
	key: '',
	startedAt: 0
};
let activeOrderSelectionThinking = {
	scenarioId: '',
	startedAt: null
};

export const timeStamp = derived(time, ($time) => {
	const now = $time.getTime();
	if (pausedAt) return pausedAt - start - pauseDuration;
	return now - start - pauseDuration;
});
export const history = writable([]);

// Send history to qualtircs
let t;

timeStamp.subscribe((v) => {
	t = v / 1000;
	if (get(GameOver)) {
		//GameOver.set(false);
	}
});

export const orders = writable([])
export const finishedOrders = writable([])
export const failedOrders = writable([])
export const id = writable("")
export const penaltyEndTime = writable(0) // Time when penalty expires

export const earned = writable(0);
export const currLocation = writable("");

function createEmptyTimeSummary() {
	return {
		thinkingTime: 0,
		startPickingConfirmationTime: 0,
		aisleTravelTime: 0,
		itemAddToCartTime: 0,
		localDeliveryTime: 0,
		cityTravelTime: 0,
		penaltyTime: 0,
		idleOrOtherTime: 0
	};
}

function normalizeTimeSummary(summary = {}) {
	const base = createEmptyTimeSummary();
	for (const key of Object.keys(base)) {
		base[key] = Math.max(0, Number(summary?.[key]) || 0);
	}
	return base;
}

function normalizeOrderSummary(orderSummary = []) {
	if (!Array.isArray(orderSummary)) return [];
	return [...new Set(
		orderSummary
			.map((entry) => String(entry ?? '').trim())
			.filter(Boolean)
	)];
}

function getDefaultScenarioAction() {
	return {
		totalTimeSeconds: 0,
		timeSummary: createEmptyTimeSummary(),
		orderSummary: []
	};
}

function stripUndefinedDeep(value) {
	if (Array.isArray(value)) {
		return value.map((entry) => stripUndefinedDeep(entry));
	}
	if (value && typeof value === 'object') {
		const out = {};
		for (const [key, nested] of Object.entries(value)) {
			if (nested === undefined) continue;
			out[key] = stripUndefinedDeep(nested);
		}
		return out;
	}
	return value;
}

function getDefaultDetailedScenarioAction() {
	return {
		timeline: []
	};
}

function formatDetailedActionTime(seconds = 0) {
	const safe = Math.max(0, Number(seconds) || 0);
	const hours = Math.floor(safe / 3600);
	const minutes = Math.floor((safe % 3600) / 60);
	const secs = safe % 60;
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}

function parseDetailedActionTime(value = '') {
	const match = String(value ?? '').trim().match(/^(\d+):([0-5]\d):([0-5]\d(?:\.\d)?)$/);
	if (!match) return 0;
	return (Number(match[1]) * 3600) + (Number(match[2]) * 60) + Number(match[3]);
}

function normalizeDetailedTimelineEvent(event = {}) {
	return stripUndefinedDeep({
		actionType: String(event?.actionType ?? '').trim(),
		targetType: String(event?.targetType ?? '').trim(),
		targetId: String(event?.targetId ?? '').trim(),
		startTime: String(event?.startTime ?? '').trim(),
		endTime: String(event?.endTime ?? '').trim(),
		metadata: event?.metadata && typeof event.metadata === 'object'
			? stripUndefinedDeep(event.metadata)
			: undefined
	});
}

function toDetailedScenarioActionEntry(entry = {}) {
	return {
		timeline: Array.isArray(entry?.timeline)
			? entry.timeline
				.map((event) => normalizeDetailedTimelineEvent(event))
				.filter((event) => event.actionType && event.targetType && event.targetId && event.startTime && event.endTime)
			: []
	};
}

function getDetailedActionCursorSeconds(snapshot = get(detailedScenarioActions)) {
	let latest = 0;
	for (const entry of Object.values(snapshot || {})) {
		const timeline = Array.isArray(entry?.timeline) ? entry.timeline : [];
		const lastEvent = timeline[timeline.length - 1];
		if (!lastEvent?.endTime) continue;
		latest = Math.max(latest, parseDetailedActionTime(lastEvent.endTime));
	}
	return latest;
}

function clearOrderSelectionThinkingState() {
	activeOrderSelectionThinking = {
		scenarioId: '',
		startedAt: null
	};
}

function getOrderSelectionThinkingStartSeconds(snapshot = get(detailedScenarioActions)) {
	const fallback = getDetailedActionCursorSeconds(snapshot);
	const activeScenarioId = String(activeOrderSelectionThinking?.scenarioId ?? '').trim();
	if (!activeScenarioId) return fallback;
	const startedAt = Number(activeOrderSelectionThinking?.startedAt);
	if (!Number.isFinite(startedAt)) return fallback;
	return Math.max(fallback, startedAt);
}

export const recordDetailedAction = (scenarioId, actionType, targetType, targetId, options = {}) => {
	if (get(gameMode) === 'tutorial') return null;
	const normalizedScenarioId = String(scenarioId ?? '').trim();
	const normalizedActionType = String(actionType ?? '').trim();
	const normalizedTargetType = String(targetType ?? '').trim();
	const normalizedTargetId = String(targetId ?? '').trim();
	if (!normalizedScenarioId || !normalizedActionType || !normalizedTargetType || !normalizedTargetId) {
		return null;
	}

	let recordedEvent = null;
	detailedScenarioActions.update((value) => {
		const snapshot = value || {};
		const startSeconds = getDetailedActionCursorSeconds(snapshot);
		const requestedEndSeconds = Number(options?.endTimeSeconds);
		const endSeconds = Math.max(
			startSeconds,
			Number.isFinite(requestedEndSeconds) ? requestedEndSeconds : getPreciseElapsedSeconds()
		);
		recordedEvent = normalizeDetailedTimelineEvent({
			actionType: normalizedActionType,
			targetType: normalizedTargetType,
			targetId: normalizedTargetId,
			startTime: formatDetailedActionTime(startSeconds),
			endTime: formatDetailedActionTime(endSeconds),
			metadata: options?.metadata
		});

		const currentEntry = toDetailedScenarioActionEntry(snapshot[normalizedScenarioId] || getDefaultDetailedScenarioAction());
		return {
			...snapshot,
			[normalizedScenarioId]: {
				timeline: [...currentEntry.timeline, recordedEvent]
			}
		};
	});
	return recordedEvent;
};

export const beginOrderSelectionThinking = (scenarioId) => {
	if (get(gameMode) === 'tutorial') return;
	const normalizedScenarioId = String(scenarioId ?? '').trim();
	if (!normalizedScenarioId) return;
	if (String(activeOrderSelectionThinking?.scenarioId ?? '').trim() === normalizedScenarioId && Number.isFinite(Number(activeOrderSelectionThinking?.startedAt))) {
		return;
	}
	activeOrderSelectionThinking = {
		scenarioId: normalizedScenarioId,
		startedAt: getDetailedActionCursorSeconds()
	};
};

export const stopOrderSelectionThinking = (scenarioId, options = {}) => {
	if (get(gameMode) === 'tutorial') return null;
	const normalizedScenarioId = String(scenarioId ?? '').trim();
	const activeScenarioId = String(activeOrderSelectionThinking?.scenarioId ?? '').trim();
	if (!normalizedScenarioId || !activeScenarioId || normalizedScenarioId !== activeScenarioId) {
		return null;
	}

	const snapshot = get(detailedScenarioActions) || {};
	const startSeconds = getOrderSelectionThinkingStartSeconds(snapshot);
	const requestedEndSeconds = Number(options?.endTimeSeconds);
	const endSeconds = Math.max(
		startSeconds,
		Number.isFinite(requestedEndSeconds) ? requestedEndSeconds : getPreciseElapsedSeconds()
	);
	clearOrderSelectionThinkingState();
	return recordDetailedAction(
		normalizedScenarioId,
		'thinking',
		'screen',
		'order_selection',
		{ endTimeSeconds: endSeconds }
	);
};

export const recordOrderSelectionAction = (scenarioId, actionType, targetType, targetId, options = {}) => {
	if (get(gameMode) === 'tutorial') return null;
	const normalizedScenarioId = String(scenarioId ?? '').trim();
	if (!normalizedScenarioId) return null;
	const eventSeconds = Number.isFinite(Number(options?.endTimeSeconds))
		? Number(options.endTimeSeconds)
		: getPreciseElapsedSeconds();
	stopOrderSelectionThinking(normalizedScenarioId, { endTimeSeconds: eventSeconds });
	const event = recordDetailedAction(normalizedScenarioId, actionType, targetType, targetId, {
		...options,
		endTimeSeconds: eventSeconds
	});
	if (options?.resumeThinking) {
		beginOrderSelectionThinking(normalizedScenarioId);
	}
	return event;
};

function applyScenarioTimeToEntry(value, scenarioId, key, seconds = 0) {
	const normalizedScenarioId = String(scenarioId ?? '').trim();
	const normalizedKey = String(key ?? '').trim();
	const amount = Math.max(0, Number(seconds) || 0);
	if (!normalizedScenarioId || !normalizedKey || amount <= 0) {
		return value;
	}

	const currentEntry = toScenarioActionEntry(value?.[normalizedScenarioId] || getDefaultScenarioAction());
	if (!(normalizedKey in currentEntry.timeSummary)) {
		return value;
	}
	const nextSummary = {
		...currentEntry.timeSummary,
		[normalizedKey]: currentEntry.timeSummary[normalizedKey] + amount
	};
	return {
		...(value || {}),
		[normalizedScenarioId]: {
			totalTimeSeconds: Object.values(nextSummary).reduce((sum, entryValue) => sum + entryValue, 0),
			timeSummary: nextSummary,
			orderSummary: currentEntry.orderSummary
		}
	};
}

function reconcileInProgressScenarioAction(actionSnapshot = {}, progressSnapshot = {}, totalGameTime = get(elapsed)) {
	const inProgressScenario = String(progressSnapshot?.inProgressScenario ?? '').trim();
	if (!inProgressScenario) return actionSnapshot;

	const nextSnapshot = {
		...(actionSnapshot || {})
	};
	const currentEntry = toScenarioActionEntry(nextSnapshot[inProgressScenario] || getDefaultScenarioAction());
	const scenarioElapsed = Math.max(0, Number(totalGameTime) - (Number(get(roundStartTime)) || 0));

	const currentTotal = Object.values(currentEntry.timeSummary).reduce((sum, value) => sum + value, 0);
	const activePhaseScenarioId = String(activeScenarioPhase?.scenarioId ?? '').trim();
	const activePhaseKey = String(activeScenarioPhase?.key ?? '').trim();
	if (activePhaseScenarioId === inProgressScenario && activePhaseKey && scenarioElapsed > currentTotal) {
		const missing = scenarioElapsed - currentTotal;
		nextSnapshot[inProgressScenario] = toScenarioActionEntry(
			applyScenarioTimeToEntry(
				{ [inProgressScenario]: currentEntry },
				inProgressScenario,
				activePhaseKey,
				missing
			)[inProgressScenario]
		);
	}

	return nextSnapshot;
}

function toScenarioActionEntry(entry = {}) {
	const timeSummary = normalizeTimeSummary(entry?.timeSummary);
	return {
		totalTimeSeconds: Math.max(
			0,
			Number(entry?.totalTimeSeconds) || 0,
			Object.values(timeSummary).reduce((sum, value) => sum + value, 0)
		),
		timeSummary,
		orderSummary: normalizeOrderSummary(entry?.orderSummary)
	};
}

function isBrowserOnline() {
	if (!browser || typeof navigator === 'undefined') return true;
	return navigator.onLine !== false;
}

function readPendingProgressPayload() {
	if (!browser || typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(PENDING_PROGRESS_STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch (error) {
		console.error('Failed to read pending progress payload:', error);
		return null;
	}
}

function writePendingProgressPayload(payload) {
	if (!browser || typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(PENDING_PROGRESS_STORAGE_KEY, JSON.stringify(payload));
	} catch (error) {
		console.error('Failed to write pending progress payload:', error);
	}
}

function clearPendingProgressPayload() {
	if (!browser || typeof localStorage === 'undefined') return;
	try {
		localStorage.removeItem(PENDING_PROGRESS_STORAGE_KEY);
	} catch (error) {
		console.error('Failed to clear pending progress payload:', error);
	}
}

function getPreciseElapsedSeconds() {
	return Math.max(0, (Number(get(timeStamp)) || 0) / 1000);
}

function buildProgressPayload(overrides = {}) {
	const totalGameTime = overrides?.totalGameTime ?? get(elapsed);
	const flushAtSeconds = overrides?.totalGameTime ?? getPreciseElapsedSeconds();
	flushActiveScenarioPhase(flushAtSeconds);
	if (overrides?.recordSaveProgressAction) {
		const progressSnapshot = overrides?.scenarioProgress || get(scenarioSetProgress);
		const inProgressScenario = String(progressSnapshot?.inProgressScenario ?? '').trim();
		if (inProgressScenario) {
			recordOrderSelectionAction(inProgressScenario, 'save_progress', 'button', 'saveprogress', {
				endTimeSeconds: flushAtSeconds,
				resumeThinking: false
			});
		}
	}
	const userId = get(id);
	const versionId = get(scenarioSetVersionId);
	const summaryPayload = {
		scenarioSetVersionId: versionId,
		scenarioSetName: activeScenarioSetName || config.scenario_set,
		totalRounds: overrides?.totalRounds ?? get(scenarios).length,
		roundsCompleted: overrides?.roundsCompleted ?? get(uniqueSets),
		optimalChoices: overrides?.optimalChoices ?? get(optimalChoices),
		totalGameTime,
		completedGame: overrides?.completedGame ?? false,
		earnings: overrides?.earnings ?? get(earned)
	};
	const progressSnapshot = overrides?.scenarioProgress || get(scenarioSetProgress);
	const normalizedProgress = {
		scenarioSetVersionId: versionId,
		scenarioSetName: String((progressSnapshot?.scenarioSetName ?? activeScenarioSetName) || config.scenario_set).trim(),
		completedScenarios: Array.isArray(progressSnapshot?.completedScenarios) ? progressSnapshot.completedScenarios : [],
		inProgressScenario: String(progressSnapshot?.inProgressScenario ?? '').trim(),
		currentRound: Math.max(1, Number(progressSnapshot?.currentRound ?? get(currentRound)) || 1),
		currentLocation: String(progressSnapshot?.currentLocation ?? get(currLocation) ?? '').trim()
	};
	let actionSnapshot = {
		...(overrides?.scenarioActions || get(scenarioActions) || {})
	};
	if (normalizedProgress.inProgressScenario && !actionSnapshot[normalizedProgress.inProgressScenario]) {
		actionSnapshot[normalizedProgress.inProgressScenario] = getDefaultScenarioAction();
	}
	actionSnapshot = reconcileInProgressScenarioAction(actionSnapshot, normalizedProgress, totalGameTime);
	const detailedActionSnapshot = Object.fromEntries(
		Object.entries(overrides?.detailedScenarioActions || get(detailedScenarioActions) || {}).map(([scenarioId, entry]) => [
			scenarioId,
			toDetailedScenarioActionEntry(entry)
		])
	);

	return {
		userId,
		versionId,
		totalGameTime,
		summaryPayload,
		normalizedProgress,
		actionPayload: {
			scenarioSetVersionId: versionId,
			actionsByScenarioId: actionSnapshot
		},
		detailedActionPayload: {
			scenarioSetVersionId: versionId,
			actionsByScenarioId: detailedActionSnapshot
		}
	};
}

async function persistProgressPayload(payload) {
	if (!payload?.userId || !payload?.versionId) return null;
	const summary = await saveUserProgressSummary(payload.userId, payload.summaryPayload);
	const progressResult = await saveScenarioSetProgress(payload.userId, payload.normalizedProgress);
	const actionResult = await saveActionSummaries(payload.userId, payload.actionPayload);
	const detailedActionResult = await saveDetailedActionSummaries(payload.userId, payload.detailedActionPayload);
	const saveFailed = !summary || !progressResult || !actionResult || !detailedActionResult;
	if (saveFailed) {
		throw new Error('Progress persistence incomplete');
	}
	if (browser && summary?.resultAccessKey) {
		participantResultUrl.set(`${window.location.origin}/result?userId=${encodeURIComponent(payload.userId)}&key=${encodeURIComponent(summary.resultAccessKey)}`);
	}
	return summary;
}

export async function flushPendingProgressSave() {
	if (!browser || pendingProgressFlushInFlight || !isBrowserOnline()) return null;
	const pending = readPendingProgressPayload();
	if (!pending?.userId || !pending?.versionId) return null;

	pendingProgressFlushInFlight = true;
	try {
		const summary = await persistProgressPayload(pending);
		clearPendingProgressPayload();
		return summary;
	} catch (error) {
		writePendingProgressPayload(pending);
		console.error('Deferred progress sync failed:', error);
		return null;
	} finally {
		pendingProgressFlushInFlight = false;
	}
}

function ensurePendingProgressListener() {
	if (!browser || pendingProgressListenerRegistered || typeof window === 'undefined') return;
	window.addEventListener('online', () => {
		void flushPendingProgressSave();
	});
	pendingProgressListenerRegistered = true;
}

export const incrementOptimalChoices = () => {
	optimalChoices.update((value) => (Number(value) || 0) + 1);
};

export const setScenarioInProgress = (scenarioId) => {
	if (get(gameMode) === 'tutorial') return;
	const normalized = String(scenarioId ?? '').trim();
	if (normalized) {
		scenarioActions.update((value) => ({
			...(value || {}),
			[normalized]: toScenarioActionEntry(value?.[normalized] || getDefaultScenarioAction())
		}));
	}
	scenarioSetProgress.update((value) => {
		const completedScenarios = Array.isArray(value?.completedScenarios) ? value.completedScenarios : [];
		if (!normalized || completedScenarios.includes(normalized)) {
			return {
				...value,
				inProgressScenario: ''
			};
		}
		return {
			...value,
			scenarioSetName: activeScenarioSetName || value?.scenarioSetName || config.scenario_set,
			inProgressScenario: normalized,
			currentRound: Number(get(currentRound)) || 1,
			currentLocation: String(get(currLocation) ?? '').trim()
		};
	});
};

export const markScenarioCompleted = (scenarioId) => {
	if (get(gameMode) === 'tutorial') return;
	const normalized = String(scenarioId ?? '').trim();
	if (!normalized) return;
	scenarioSetProgress.update((value) => {
		const completedScenarios = Array.isArray(value?.completedScenarios) ? value.completedScenarios : [];
		const nextCompleted = [...new Set([...completedScenarios, normalized])];
		return {
			...value,
			scenarioSetName: activeScenarioSetName || value?.scenarioSetName || config.scenario_set,
			completedScenarios: nextCompleted,
			inProgressScenario: value?.inProgressScenario === normalized ? '' : value?.inProgressScenario || '',
			currentRound: Math.max(1, Number(get(currentRound)) || 1),
			currentLocation: String(get(currLocation) ?? '').trim()
		};
	});
};

export const addScenarioTime = (scenarioId, key, seconds = 0) => {
	if (get(gameMode) === 'tutorial') return;
	scenarioActions.update((value) => applyScenarioTimeToEntry(value, scenarioId, key, seconds));
};

function flushActiveScenarioPhase(nowSeconds = getPreciseElapsedSeconds()) {
	if (get(gameMode) === 'tutorial') {
		activeScenarioPhase = { scenarioId: '', key: '', startedAt: 0 };
		return;
	}
	const scenarioId = String(activeScenarioPhase?.scenarioId ?? '').trim();
	const key = String(activeScenarioPhase?.key ?? '').trim();
	if (!scenarioId || !key) return;
	const endAt = Math.max(0, Number(nowSeconds) || 0);
	const startedAt = Math.max(0, Number(activeScenarioPhase?.startedAt) || 0);
	const delta = Math.max(0, endAt - startedAt);
	if (delta > 0) {
		scenarioActions.update((value) => applyScenarioTimeToEntry(value, scenarioId, key, delta));
	}
	activeScenarioPhase = { scenarioId: '', key: '', startedAt: endAt };
}

export const startScenarioPhase = (scenarioId, key) => {
	if (get(gameMode) === 'tutorial') return;
	const normalizedScenarioId = String(scenarioId ?? '').trim();
	const normalizedKey = String(key ?? '').trim();
	if (!normalizedScenarioId || !normalizedKey) return;
	const nowSeconds = getPreciseElapsedSeconds();
	if (activeScenarioPhase.scenarioId === normalizedScenarioId && activeScenarioPhase.key === normalizedKey) {
		return;
	}
	flushActiveScenarioPhase(nowSeconds);
	activeScenarioPhase = {
		scenarioId: normalizedScenarioId,
		key: normalizedKey,
		startedAt: nowSeconds
	};
};

export const stopScenarioPhase = (scenarioId = '', key = '') => {
	if (get(gameMode) === 'tutorial') return;
	const normalizedScenarioId = String(scenarioId ?? '').trim();
	const normalizedKey = String(key ?? '').trim();
	if (
		(normalizedScenarioId && activeScenarioPhase.scenarioId !== normalizedScenarioId) ||
		(normalizedKey && activeScenarioPhase.key !== normalizedKey)
	) {
		return;
	}
	flushActiveScenarioPhase();
};

async function loadSavedScenarioState(userId) {
	if (!userId || !get(scenarioSetVersionId)) {
		scenarioSetProgress.set({
			completedScenarios: [],
			inProgressScenario: '',
			scenarioSetName: activeScenarioSetName || config.scenario_set,
			currentRound: 1,
			currentLocation: ''
		});
		scenarioActions.set({});
		detailedScenarioActions.set({});
		resumeElapsedSeconds.set(0);
		return;
	}

	const [summaryDoc, progressDoc, actionsDoc, detailedActionsDoc] = await Promise.all([
		getUserSummary(userId),
		getScenarioSetProgress(userId),
		getActionSummaries(userId),
		getDetailedActionSummaries(userId)
	]);
	const versionId = get(scenarioSetVersionId);
	const summaryEntry = summaryDoc?.summaryByScenarioSetVersionId?.[versionId] || {};
	const progressEntry = progressDoc?.progressByScenarioSetVersionId?.[versionId] || {};
	const actionEntry = actionsDoc?.actionsByScenarioSetVersionId?.[versionId] || {};
	const detailedActionEntry = detailedActionsDoc?.detailedActionsByScenarioSetVersionId?.[versionId] || {};
	const completedScenarios = Array.isArray(progressEntry?.completedScenarios) ? progressEntry.completedScenarios : [];
	const inProgressScenario = String(progressEntry?.inProgressScenario ?? '').trim();
	const actionsByScenarioId = actionEntry?.actionsByScenarioId && typeof actionEntry.actionsByScenarioId === 'object'
		? actionEntry.actionsByScenarioId
		: {};
	const detailedActionsByScenarioId = detailedActionEntry?.actionsByScenarioId && typeof detailedActionEntry.actionsByScenarioId === 'object'
		? detailedActionEntry.actionsByScenarioId
		: {};

	scenarioSetProgress.set({
		scenarioSetName: String((progressEntry?.scenarioSetName ?? summaryEntry?.scenarioSetName ?? activeScenarioSetName) || config.scenario_set).trim(),
		completedScenarios: [...new Set(completedScenarios.map((entry) => String(entry ?? '').trim()).filter(Boolean))],
		inProgressScenario,
		currentRound: Math.max(1, Number(progressEntry?.currentRound) || 1),
		currentLocation: String(progressEntry?.currentLocation ?? '').trim()
	});
	scenarioActions.set(
		Object.fromEntries(
			Object.entries(actionsByScenarioId).map(([scenarioId, entry]) => [scenarioId, toScenarioActionEntry(entry)])
		)
	);
	detailedScenarioActions.set(
		Object.fromEntries(
			Object.entries(detailedActionsByScenarioId).map(([scenarioId, entry]) => [scenarioId, toDetailedScenarioActionEntry(entry)])
		)
	);
	earned.set(Number(summaryEntry?.earnings) || 0);
	uniqueSets.set(Number(summaryEntry?.roundsCompleted) || 0);
	optimalChoices.set(Number(summaryEntry?.optimalChoices) || 0);
	resumeElapsedSeconds.set(Math.max(0, Number(summaryEntry?.totalGameTime) || 0));
	const totalRounds = get(scenarios).length;
	const resumeScenarioId = inProgressScenario;
	const savedRound = Math.max(1, Number(progressEntry?.currentRound) || 1);
	if (resumeScenarioId) {
		const scenarioIndex = get(scenarios).findIndex((scenario) => String(scenario?.scenario_id ?? '').trim() === resumeScenarioId);
		currentRound.set(scenarioIndex >= 0 ? scenarioIndex + 1 : Math.min(savedRound, Math.max(totalRounds, 1)));
	} else {
		currentRound.set(Math.min(savedRound || ((completedScenarios.length || 0) + 1), Math.max(totalRounds, 1)));
	}
	const savedLocation = String(progressEntry?.currentLocation ?? '').trim();
	if (savedLocation) {
		currLocation.set(savedLocation);
	}
}

export const saveCurrentProgress = async (overrides = {}) => {
	if (get(gameMode) === 'tutorial' || !get(needsAuth) || !get(id) || !get(scenarioSetVersionId)) {
		return null;
	}
	ensurePendingProgressListener();
	void flushPendingProgressSave();

	const payload = buildProgressPayload(overrides);
	if (!isBrowserOnline()) {
		writePendingProgressPayload(payload);
		return { pendingOffline: true };
	}

	try {
		const summary = await persistProgressPayload(payload);
		clearPendingProgressPayload();
		return summary;
	} catch (error) {
		writePendingProgressPayload(payload);
		if (isBrowserOnline()) {
			console.error('Progress save deferred after unexpected failure:', error);
		}
		return { pendingOffline: true };
	}
};

export const saveProgressAndEndSession = async () => {
	if (get(gameMode) !== 'tutorial') {
		await saveCurrentProgress({
			completedGame: false,
			recordSaveProgressAction: true
		});
	}
	endGameSession();
};

async function finalizeTimedOutGame(totalGameTime) {
	if (get(needsAuth) && get(id)) {
		if (get(gameMode) !== 'tutorial') {
			await saveCurrentProgress({
				totalRounds: get(scenarios).length,
				roundsCompleted: get(uniqueSets),
				optimalChoices: get(optimalChoices),
				totalGameTime,
				completedGame: true,
				earnings: get(earned)
			});
		}
	}
	if (get(gameMode) !== 'tutorial') {
		notifyMainGameComplete('time_expired', get(uniqueSets), get(scenarios).length);
	}
	GameOver.set(true);
	stopTimeInterval?.();
}

export const elapsed = derived([timeStamp, FullTimeLimit], ([$timeStamp, $FullTimeLimit], set) => {
	const elapsedSeconds = Math.max(0, $timeStamp / 1000);
	const hasOverallLimit = Number.isFinite(Number($FullTimeLimit)) && Number($FullTimeLimit) > 0;
	if (hasOverallLimit && elapsedSeconds >= $FullTimeLimit && !timeoutGameOverProcessed) {
		timeoutGameOverProcessed = true;
		void finalizeTimedOutGame($FullTimeLimit);
		set($FullTimeLimit)
		console.log("game over")
		return;
	}
	set(elapsedSeconds);
});

export const remainingTime = derived(
	[elapsed, FullTimeLimit],
	([$elapsed, $FullTimeLimit]) => {
		const hasOverallLimit = Number.isFinite(Number($FullTimeLimit)) && Number($FullTimeLimit) > 0;
		return hasOverallLimit ? Math.max($FullTimeLimit - $elapsed, 0) : null;
	}
);

export const toggleTime = () => {
	if (pausedAt) {
		const resumeTime = new Date();
		pauseDuration += resumeTime - pausedAt; // add pause time
		pausedAt = null;

		// resume the interval
		interval = setInterval(() => {
			time.set(new Date());
		}, 10);
	} else {
		pausedAt = new Date();
		clearInterval(interval);
	}
}

function postParentMessage(payload = {}) {
	if (!browser || typeof window === 'undefined' || !window.parent || window.parent === window) {
		return;
	}

	window.parent.postMessage(
		{
			source: 'bundlegame',
			...payload
		},
		'*'
	);
}

export function notifyTutorialRoundProgress(roundsCompleted = 0, totalRounds = 0) {
	postParentMessage({
		type: 'tutorialRoundComplete',
		roundsCompleted: Number(roundsCompleted) || 0,
		totalRounds: Number(totalRounds) || 0
	});
}

export function notifyMainGameComplete(reason = 'completed', roundsCompleted = 0, totalRounds = 0) {
	if (completionMessageSent) return;
	completionMessageSent = true;
	postParentMessage({
		type: 'mainGameComplete',
		reason: String(reason || 'completed'),
		roundsCompleted: Number(roundsCompleted) || 0,
		totalRounds: Number(totalRounds) || 0
	});
}

function resetRuntimeState() {
	activeScenarioPhase = {
		scenarioId: '',
		key: '',
		startedAt: 0
	};
	orders.set([]);
	finishedOrders.set([]);
	failedOrders.set([]);
	earned.set(0);
	uniqueSets.set(0);
	optimalChoices.set(0);
	scenarioSetProgress.set({
		completedScenarios: [],
		inProgressScenario: '',
		scenarioSetName: activeScenarioSetName || config.scenario_set,
		currentRound: 1,
		currentLocation: ''
	});
	scenarioActions.set({});
	detailedScenarioActions.set({});
	clearOrderSelectionThinkingState();
	resumeElapsedSeconds.set(0);
	currentRound.set(1);
	roundStartTime.set(0);
	penaltyEndTime.set(0);
	GameOver.set(false);
	gameText.set({
		selector: "None selected",
	});
	game.set({
		inSelect: false,
		inStore: false,
		bundled: false,
		tip: config["tips"],
		waiting: config["waiting"],
		refresh: config["refresh"],
		penaltyTriggered: false
	});
	completionMessageSent = false;
	timeoutGameOverProcessed = false;
}

export const endGameSession = () => {
	GameOver.set(true);
	stopTimeInterval?.();
};



export const logAction = (action) => {
	return action;
}

export const logOrder = (order, options) => {
	return { order, options };
}
export const logBundledOrder = (order1, order2, options) => {
	return { order1, order2, options };
}

// New function to handle 1-3 orders flexibly
export const logOrders = (selectedOrders, allOptions) => {
	return { selectedOrders, allOptions };
}

//state should contain info such as:
//whether the order was completed succesfully or not
//how many tries it took, etc
export const completeOrder = (orderID) => {
	if (!get(needsAuth)) {
		return
	}
	return orderID;
}

export const authUser = (id, pass) => {
	return authenticateUser(id, pass)
}

export const saveScenarioProgress = (progress) => {
	const scenarioId = String(progress?.scenarioId ?? '').trim();
	const chosenOrders = normalizeOrderSummary(progress?.chosenOrders);
	if (scenarioId) {
		scenarioActions.update((value) => ({
			...(value || {}),
			[scenarioId]: {
				...toScenarioActionEntry(value?.[scenarioId] || getDefaultScenarioAction()),
				orderSummary: chosenOrders
			}
		}));
	}
	if (scenarioId && Boolean(progress?.success)) {
		markScenarioCompleted(scenarioId);
	} else if (scenarioId) {
		setScenarioInProgress(scenarioId);
	}
}

export async function loadConfigByName(fileName) {
  const normalizedId = fileName?.replace(/\.json$/i, '');
  const isOrderFile = normalizedId?.startsWith('order');
  const isStoreFile = normalizedId?.startsWith('store');
  const isCityFile = normalizedId?.startsWith('cities');

  if (isOrderFile) {
	const orderData = await getOrdersData(normalizedId);
	if (Array.isArray(orderData) && orderData.length > 0) {
		return orderData;
	}
  }

  if (isStoreFile) {
	const storeData = await getStoresData(normalizedId);
	if (storeData && Array.isArray(storeData.stores) && storeData.stores.length > 0) {
		return {
			startinglocation: storeData.startinglocation ?? "Berkeley",
			distances: storeData.distances ?? {},
			stores: storeData.stores
		};
	}
  }

  if (isCityFile) {
	const cityData = await getCitiesData(normalizedId);
	if (cityData && cityData.travelTimes) {
		return cityData;
	}
  }
  console.error(`Config "${fileName}" not found in Firebase MasterData.`);
  return null;
}

export async function loadGame(mode = 'main') {
	if (!firebaseInitialized || initializedMode !== mode) {
		await initializeFromFirebase(mode);
	}
	ensurePendingProgressListener();
	void flushPendingProgressSave();
	try {
		const datasetId = config.scenario_set || 'experiment';
		const datasetBundle = await getScenarioDatasetBundle(datasetId);
		activeScenarioSetName = String(datasetBundle?.metadata?.datasetName || datasetId || '').trim() || String(datasetId || '');
		activeScenarioSetVersionId = String(datasetBundle?.metadata?.scenarioSetVersionId || '').trim();
		scenarioSetVersionId.set(activeScenarioSetVersionId);
		let orderFile = Array.isArray(datasetBundle?.orders) ? datasetBundle.orders : await getOrdersData(datasetId)
		let storeFile = await loadConfigByName(MAIN_STORE_FILE)
		let cityFile = await loadConfigByName(MAIN_CITIES_FILE)

		if (!orderFile || !storeFile) {
			console.error("Could not find files specified in configuration")
		} else {
			if (Array.isArray(datasetBundle?.scenarios) && datasetBundle.scenarios.length > 0) {
				experimentScenarios = datasetBundle.scenarios;
			}
			const optimalList = Array.isArray(datasetBundle?.optimal) ? datasetBundle.optimal : [];
			optimalByScenarioId = new Map(
				optimalList
					.map((entry = {}) => [String(entry?.scenario_id ?? '').trim(), entry])
					.filter(([scenarioId]) => scenarioId.length > 0)
			);
			storeConfigs = {
				stores: storeFile.stores || [],
				// Prefer new cities doc, fallback to legacy fields inside store doc
				startinglocation: cityFile?.startinglocation ?? storeFile.startinglocation ?? "Berkeley",
				travelTimes: cityFile?.travelTimes ?? {},
				distances: storeFile.distances ?? {}
			}
			orderConfigs = orderFile
			scenarios.set(hydrateScenariosWithOrders(experimentScenarios, orderConfigs));
		}
	} catch (err) {
		console.error("Error loading fixed datasets", err)
		return -1
	}
	resetRuntimeState();
	currLocation.set(storeConfigs["startinglocation"]);
	
	switchJob(orderConfigs, storeConfigs)
	return 0
}

export async function createNewUser(id, mode = 'main') {
	let n = await loadGame(mode)
	await createUser(id, n)
	if (mode !== 'tutorial') {
		const summary = await initializeUserProgress(id, {
			scenarioSetVersionId: get(scenarioSetVersionId),
			scenarioSetName: activeScenarioSetName || config.scenario_set,
			totalRounds: get(scenarios).length
		});
		if (browser && summary?.resultAccessKey) {
			participantResultUrl.set(`${window.location.origin}/result?userId=${encodeURIComponent(id)}&key=${encodeURIComponent(summary.resultAccessKey)}`);
		} else {
			participantResultUrl.set("");
		}
		await loadSavedScenarioState(id);
	} else {
		participantResultUrl.set("");
	}
    return n
}
