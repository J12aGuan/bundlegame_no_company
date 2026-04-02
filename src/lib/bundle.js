import { writable, readable, derived, get} from 'svelte/store';
import { browser } from '$app/environment';
import { 
    authenticateUser, createUser,
    getCentralConfig, getTutorialConfig, getExperimentScenarios, getOrdersData, getStoresData, getCitiesData, getEmojisData,
    getScenarioDatasetBundle, initializeUserProgress, saveUserProgressSummary,
    getScenarioSetProgress, saveScenarioSetProgress, getActionSummaries, saveActionSummaries, getDetailedActionSummaries, saveDetailedActionSummaries, getUserSummary,
    getActiveLiveSession, upsertLiveSessionParticipant
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
let currentLiveSessionParticipation = null;
const PENDING_PROGRESS_STORAGE_KEY = 'bundlegame:pendingProgressSave';
const FINAL_SAVE_MAX_ATTEMPTS = 3;
const FINAL_SAVE_RETRY_DELAY_MS = 1500;
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
let recoveryMessageSent = false;

function createDefaultCompletionState() {
	return {
		phase: 'idle',
		reason: '',
		saveStatus: '',
		saveAttempts: 0,
		error: '',
		payload: null,
		retryRequest: null,
		recoveryPosted: false
	};
}

export const uniqueSets = writable(0);
export const orderList = writable([])
export const FullTimeLimit = writable(config["timeLimit"]);
export const participantResultUrl = writable("");
export const completionState = writable(createDefaultCompletionState());
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

export const completedOrdersCount = derived(scenarioActions, ($scenarioActions) => {
	if (!$scenarioActions || typeof $scenarioActions !== 'object') return 0;
	return Object.values($scenarioActions).reduce((sum, entry) => {
		const normalized = toScenarioActionEntry(entry);
		return sum + normalized.orderSummary.length;
	}, 0);
})

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

function getPendingProgressPayloadFor(userId = '', versionId = '') {
	const pending = readPendingProgressPayload();
	if (!pending) return null;
	const normalizedUserId = String(userId ?? '').trim();
	const normalizedVersionId = String(versionId ?? '').trim();
	if (!normalizedUserId || !normalizedVersionId) return null;
	if (String(pending?.userId ?? '').trim() !== normalizedUserId) return null;
	if (String(pending?.versionId ?? '').trim() !== normalizedVersionId) return null;
	return pending;
}

function shouldPreferPendingProgress(remoteSummary = {}, pendingPayload = null) {
	if (!pendingPayload) return false;
	const remoteTime = Math.max(0, Number(remoteSummary?.totalGameTime) || 0);
	const pendingTime = Math.max(
		0,
		Number(pendingPayload?.summaryPayload?.totalGameTime ?? pendingPayload?.totalGameTime) || 0
	);
	const remoteRounds = Math.max(0, Number(remoteSummary?.roundsCompleted) || 0);
	const pendingRounds = Math.max(0, Number(pendingPayload?.summaryPayload?.roundsCompleted) || 0);
	if (pendingRounds > remoteRounds) return true;
	if (pendingRounds < remoteRounds) return false;
	return pendingTime >= remoteTime;
}

function resolveResumeNumber(summaryValue, progressValue) {
	const summaryNumber = Math.max(0, Number(summaryValue) || 0);
	const progressNumber = Math.max(0, Number(progressValue) || 0);
	return Math.max(summaryNumber, progressNumber);
}

function getPreciseElapsedSeconds() {
	return Math.max(0, (Number(get(timeStamp)) || 0) / 1000);
}

function sleep(ms = 0) {
	return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function normalizeIsoDateString(value = '') {
	const normalized = String(value ?? '').trim();
	if (!normalized) return '';
	const millis = Date.parse(normalized);
	return Number.isFinite(millis) ? new Date(millis).toISOString() : '';
}

function setCurrentLiveSessionParticipation(session = null) {
	if (!session || typeof session !== 'object') {
		currentLiveSessionParticipation = null;
		return null;
	}
	const sessionId = String(session?.sessionId ?? '').trim();
	if (!sessionId) {
		currentLiveSessionParticipation = null;
		return null;
	}
	currentLiveSessionParticipation = {
		sessionId,
		sessionLabel: String(session?.label ?? session?.sessionLabel ?? '').trim(),
		sessionStartedAt: normalizeIsoDateString(session?.startedAt ?? session?.sessionStartedAt ?? ''),
		joinedAt: normalizeIsoDateString(session?.joinedAt ?? '') || new Date().toISOString()
	};
	return currentLiveSessionParticipation;
}

function getLiveSessionMetadata(lastActivityAt = '') {
	if (get(gameMode) === 'tutorial' || !currentLiveSessionParticipation?.sessionId) {
		return {};
	}
	return {
		liveSessionId: String(currentLiveSessionParticipation.sessionId ?? '').trim(),
		sessionStartedAt: normalizeIsoDateString(currentLiveSessionParticipation.sessionStartedAt),
		sessionLabel: String(currentLiveSessionParticipation.sessionLabel ?? '').trim(),
		lastActivityAt: normalizeIsoDateString(lastActivityAt) || new Date().toISOString()
	};
}

async function syncLiveSessionParticipantState(
	participantId,
	{
		summaryPayload = null,
		status = 'joined',
		finalizedAt = '',
		lastActivityAt = '',
		displayName = ''
	} = {}
) {
	const normalizedParticipantId = String(participantId ?? '').trim();
	const normalizedSessionId = String(currentLiveSessionParticipation?.sessionId ?? '').trim();
	if (!normalizedParticipantId || !normalizedSessionId || get(gameMode) === 'tutorial') {
		return null;
	}

	const effectivePayload = summaryPayload && typeof summaryPayload === 'object' ? summaryPayload : {};
	const resolvedLastActivityAt = normalizeIsoDateString(lastActivityAt)
		|| normalizeIsoDateString(effectivePayload?.lastActivityAt)
		|| new Date().toISOString();
	const resolvedFinalizedAt = normalizeIsoDateString(finalizedAt)
		|| (Boolean(effectivePayload?.completedGame) ? new Date().toISOString() : '');

	return upsertLiveSessionParticipant(normalizedSessionId, normalizedParticipantId, {
		displayName: String(displayName || normalizedParticipantId).trim(),
		earnings: Number(effectivePayload?.earnings) || 0,
		roundsCompleted: Number(effectivePayload?.roundsCompleted) || 0,
		optimalChoices: Number(effectivePayload?.optimalChoices) || 0,
		totalGameTime: Number(effectivePayload?.totalGameTime) || 0,
		completedGame: Boolean(effectivePayload?.completedGame),
		status: String(status || 'joined').trim() || 'joined',
		joinedAt: normalizeIsoDateString(currentLiveSessionParticipation?.joinedAt),
		lastActivityAt: resolvedLastActivityAt,
		finalizedAt: resolvedFinalizedAt
	});
}

function buildResultCode(userId = '', resultAccessKey = '') {
	const normalizedUserId = String(userId ?? '').trim();
	const normalizedKey = String(resultAccessKey ?? '').trim();
	if (!normalizedUserId || !normalizedKey) return '';
	return `userId=${encodeURIComponent(normalizedUserId)}&key=${encodeURIComponent(normalizedKey)}`;
}

function getResultCodeFromUrl(url = '') {
	const normalizedUrl = String(url ?? '').trim();
	if (!normalizedUrl) return '';
	const queryIndex = normalizedUrl.indexOf('?');
	return queryIndex >= 0 ? normalizedUrl.slice(queryIndex + 1) : normalizedUrl;
}

function getResultAccessKeyFromUrl(url = '') {
	const resultCode = getResultCodeFromUrl(url);
	if (!resultCode) return '';
	try {
		const params = new URLSearchParams(resultCode);
		return String(params.get('key') ?? '').trim();
	} catch (_error) {
		return '';
	}
}

function getParticipantResultUrl(userId = '', resultAccessKey = '') {
	const resultCode = buildResultCode(userId, resultAccessKey);
	if (!browser || typeof window === 'undefined' || !resultCode) return '';
	return `${window.location.origin}/result?${resultCode}`;
}

function buildCompletionPayload({
	reason = 'completed',
	summary = null,
	summaryPayload = null,
	saveStatus = '',
	saveAttempts = 0,
	error = ''
} = {}) {
	const userId = String(get(id) ?? '').trim();
	const scenarioSetVersion = String(get(scenarioSetVersionId) ?? '').trim();
	const summaryResultKey = String(summary?.resultAccessKey ?? '').trim();
	const currentResultKey = getResultAccessKeyFromUrl(get(participantResultUrl));
	const resultAccessKey = summaryResultKey || currentResultKey;
	const resultCode = buildResultCode(userId, resultAccessKey);
	const payload = {
		userId,
		scenarioSetVersionId: scenarioSetVersion,
		resultCode,
		resultAccessKey,
		roundsCompleted: Number(summary?.roundsCompleted ?? summaryPayload?.roundsCompleted ?? get(uniqueSets)) || 0,
		totalRounds: Number(summary?.totalRounds ?? summaryPayload?.totalRounds ?? get(scenarios).length) || 0,
		optimalChoices: Number(summary?.optimalChoices ?? summaryPayload?.optimalChoices ?? get(optimalChoices)) || 0,
		earnings: Number(summary?.earnings ?? summaryPayload?.earnings ?? get(earned)) || 0,
		totalGameTime: Number(summary?.totalGameTime ?? summaryPayload?.totalGameTime ?? get(elapsed)) || 0,
		completedGame: Boolean(summary?.completedGame ?? summaryPayload?.completedGame),
		reason: String(reason || 'completed'),
		saveStatus: String(saveStatus || '').trim(),
		saveAttempts: Math.max(0, Number(saveAttempts) || 0),
		copyVerificationMethod: String(summary?.completionMeta?.copyVerificationMethod ?? get(completionState)?.payload?.copyVerificationMethod ?? 'none').trim() || 'none',
		saveError: String(error || summary?.completionMeta?.lastSaveError || '').trim()
	};
	return payload;
}

async function persistCompletionMetadata(fields = {}, summaryFields = {}) {
	const userIdValue = String(get(id) ?? '').trim();
	const versionIdValue = String(get(scenarioSetVersionId) ?? '').trim();
	if (!userIdValue || !versionIdValue) return null;
	return saveUserProgressSummary(userIdValue, {
		scenarioSetVersionId: versionIdValue,
		...summaryFields,
		completionMeta: fields
	});
}

function updateCompletionStatePayload(mutator) {
	completionState.update((state) => {
		const currentState = state || createDefaultCompletionState();
		const nextPayload = typeof mutator === 'function' ? mutator(currentState.payload || null) : currentState.payload;
		return {
			...currentState,
			payload: nextPayload
		};
	});
}

function buildProgressPayload(overrides = {}) {
	const totalGameTime = overrides?.totalGameTime ?? get(elapsed);
	const flushAtSeconds = overrides?.totalGameTime ?? getPreciseElapsedSeconds();
	const lastActivityAt = new Date().toISOString();
	const liveSessionMetadata = getLiveSessionMetadata(lastActivityAt);
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
		earnings: overrides?.earnings ?? get(earned),
		...liveSessionMetadata
	};
	const progressSnapshot = overrides?.scenarioProgress || get(scenarioSetProgress);
	const normalizedProgress = {
		scenarioSetVersionId: versionId,
		scenarioSetName: String((progressSnapshot?.scenarioSetName ?? activeScenarioSetName) || config.scenario_set).trim(),
		completedScenarios: Array.isArray(progressSnapshot?.completedScenarios) ? progressSnapshot.completedScenarios : [],
		inProgressScenario: String(progressSnapshot?.inProgressScenario ?? '').trim(),
		currentRound: Math.max(1, Number(progressSnapshot?.currentRound ?? get(currentRound)) || 1),
		currentLocation: String(progressSnapshot?.currentLocation ?? get(currLocation) ?? '').trim(),
		roundsCompleted: summaryPayload.roundsCompleted,
		optimalChoices: summaryPayload.optimalChoices,
		totalGameTime: summaryPayload.totalGameTime,
		earnings: summaryPayload.earnings,
		...liveSessionMetadata
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
		participantResultUrl.set(getParticipantResultUrl(payload.userId, summary.resultAccessKey));
	}
	if (payload?.summaryPayload?.liveSessionId) {
		try {
			await syncLiveSessionParticipantState(payload.userId, {
				summaryPayload: payload.summaryPayload,
				status: payload.summaryPayload.completedGame ? 'completed' : 'in_progress',
				finalizedAt: payload.summaryPayload.completedGame ? new Date().toISOString() : '',
				lastActivityAt: payload.summaryPayload.lastActivityAt
			});
		} catch (error) {
			console.warn('Unable to sync live leaderboard participant state:', error);
		}
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
		setCurrentLiveSessionParticipation(null);
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
	const pendingPayload = getPendingProgressPayloadFor(userId, versionId);
	const remoteSummaryEntry = summaryDoc?.summaryByScenarioSetVersionId?.[versionId] || {};
	const remoteProgressEntry = progressDoc?.progressByScenarioSetVersionId?.[versionId] || {};
	const remoteActionEntry = actionsDoc?.actionsByScenarioSetVersionId?.[versionId] || {};
	const remoteDetailedActionEntry = detailedActionsDoc?.detailedActionsByScenarioSetVersionId?.[versionId] || {};
	const usePendingPayload = shouldPreferPendingProgress(remoteSummaryEntry, pendingPayload);
	const summaryEntry = usePendingPayload
		? {
			...remoteSummaryEntry,
			...(pendingPayload?.summaryPayload || {})
		}
		: remoteSummaryEntry;
	const progressEntry = usePendingPayload
		? {
			...remoteProgressEntry,
			...(pendingPayload?.normalizedProgress || {})
		}
		: remoteProgressEntry;
	const actionEntry = usePendingPayload
		? {
			...remoteActionEntry,
			actionsByScenarioId: pendingPayload?.actionPayload?.actionsByScenarioId && typeof pendingPayload.actionPayload.actionsByScenarioId === 'object'
				? pendingPayload.actionPayload.actionsByScenarioId
				: (remoteActionEntry?.actionsByScenarioId || {})
		}
		: remoteActionEntry;
	const detailedActionEntry = usePendingPayload
		? {
			...remoteDetailedActionEntry,
			actionsByScenarioId: pendingPayload?.detailedActionPayload?.actionsByScenarioId && typeof pendingPayload.detailedActionPayload.actionsByScenarioId === 'object'
				? pendingPayload.detailedActionPayload.actionsByScenarioId
				: (remoteDetailedActionEntry?.actionsByScenarioId || {})
		}
		: remoteDetailedActionEntry;
	const resolvedRoundsCompleted = resolveResumeNumber(summaryEntry?.roundsCompleted, progressEntry?.roundsCompleted);
	const resolvedOptimalChoices = resolveResumeNumber(summaryEntry?.optimalChoices, progressEntry?.optimalChoices);
	const resolvedTotalGameTime = resolveResumeNumber(summaryEntry?.totalGameTime, progressEntry?.totalGameTime);
	const resolvedEarnings = resolveResumeNumber(summaryEntry?.earnings, progressEntry?.earnings);
	const liveSessionId = String(summaryEntry?.liveSessionId ?? progressEntry?.liveSessionId ?? '').trim();
	if (liveSessionId) {
		setCurrentLiveSessionParticipation({
			sessionId: liveSessionId,
			label: String(summaryEntry?.sessionLabel ?? progressEntry?.sessionLabel ?? '').trim(),
			startedAt: summaryEntry?.sessionStartedAt || progressEntry?.sessionStartedAt || '',
			joinedAt: summaryEntry?.sessionStartedAt || progressEntry?.sessionStartedAt || ''
		});
	} else {
		setCurrentLiveSessionParticipation(null);
	}
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
	earned.set(resolvedEarnings);
	uniqueSets.set(resolvedRoundsCompleted);
	optimalChoices.set(resolvedOptimalChoices);
	resumeElapsedSeconds.set(resolvedTotalGameTime);
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

function getSummaryFieldsFromCompletionPayload(payload = {}) {
	if (!payload || typeof payload !== 'object') return {};
	return {
		totalRounds: Number(payload?.totalRounds) || 0,
		roundsCompleted: Number(payload?.roundsCompleted) || 0,
		optimalChoices: Number(payload?.optimalChoices) || 0,
		totalGameTime: Number(payload?.totalGameTime) || 0,
		completedGame: Boolean(payload?.completedGame),
		earnings: Number(payload?.earnings) || 0
	};
}

export async function recordResultCodeVerification(method = 'manual_confirm') {
	const normalizedMethod = method === 'clipboard_success' ? 'clipboard_success' : 'manual_confirm';
	const timestamp = new Date().toISOString();
	const currentPayload = get(completionState)?.payload || null;
	const verificationPayload = currentPayload || buildCompletionPayload({
		reason: get(completionState)?.reason || 'completed',
		saveStatus: get(completionState)?.saveStatus || ''
	});

	updateCompletionStatePayload((payload) => (
		payload
			? {
				...payload,
				copyVerificationMethod: normalizedMethod
			}
			: payload
	));

	try {
		const summary = await persistCompletionMetadata(
			{
				copyVerificationMethod: normalizedMethod,
				copyVerificationAt: timestamp
			},
			getSummaryFieldsFromCompletionPayload(currentPayload)
		);
		postParentMessage({
			type: 'resultCodeVerificationUpdated',
			userId: String(verificationPayload?.userId ?? '').trim(),
			scenarioSetVersionId: String(verificationPayload?.scenarioSetVersionId ?? '').trim(),
			resultCode: String(verificationPayload?.resultCode ?? '').trim(),
			copyVerificationMethod: normalizedMethod,
			copyVerificationAt: timestamp
		});
		return summary;
	} catch (error) {
		console.warn('Unable to record result-code verification:', error);
		return null;
	}
}

function setCompletionStateForSave(phase, reason, payload = {}) {
	const currentState = get(completionState) || createDefaultCompletionState();
	completionState.set({
		...currentState,
		phase,
		reason: String(reason || currentState.reason || 'completed'),
		saveStatus: String(payload?.saveStatus || currentState.saveStatus || '').trim(),
		saveAttempts: Math.max(0, Number(payload?.saveAttempts ?? currentState.saveAttempts) || 0),
		error: String(payload?.saveError ?? currentState.error ?? '').trim(),
		payload: payload && Object.keys(payload).length > 0 ? payload : currentState.payload,
		recoveryPosted: Boolean(currentState.recoveryPosted),
		retryRequest: currentState.retryRequest
	});
}

export async function retryFinalResultsSave() {
	const retryRequest = get(completionState)?.retryRequest;
	if (!retryRequest?.reason) return null;
	return finalizeMainGameSession(retryRequest.reason, retryRequest.overrides || {});
}

export async function resendRecoveryCompletionPayload() {
	const state = get(completionState) || createDefaultCompletionState();
	if (state.phase !== 'recovery' || !state.payload) return null;
	recoveryMessageSent = false;
	return notifyMainGameRecoveryRequired(state.reason || 'completed', state.payload);
}

export async function finalizeMainGameSession(reason = 'completed', overrides = {}) {
	const normalizedReason = String(reason || 'completed').trim() || 'completed';
	const retryRequest = {
		reason: normalizedReason,
		overrides: { ...(overrides || {}) }
	};

	completionState.set({
		...createDefaultCompletionState(),
		phase: 'saving',
		reason: normalizedReason,
		saveStatus: 'saving',
		retryRequest
	});
	completionMessageSent = false;
	recoveryMessageSent = false;

	if (get(gameMode) === 'tutorial' || !get(needsAuth) || !get(id) || !get(scenarioSetVersionId)) {
		setCompletionStateForSave('ready', normalizedReason, {
			...buildCompletionPayload({
				reason: normalizedReason,
				summaryPayload: {
					totalRounds: overrides?.totalRounds ?? get(scenarios).length,
					roundsCompleted: overrides?.roundsCompleted ?? get(uniqueSets),
					optimalChoices: overrides?.optimalChoices ?? get(optimalChoices),
					totalGameTime: overrides?.totalGameTime ?? get(elapsed),
					completedGame: overrides?.completedGame ?? true,
					earnings: overrides?.earnings ?? get(earned)
				},
				saveStatus: 'not_required'
			}),
			saveStatus: 'not_required'
		});
		endGameSession();
		return { ok: true, skippedPersistence: true };
	}

	ensurePendingProgressListener();
	void flushPendingProgressSave();
	const payload = buildProgressPayload(overrides);

	if (!payload?.userId || !payload?.versionId) {
		setCompletionStateForSave('recovery', normalizedReason, {
			...buildCompletionPayload({
				reason: normalizedReason,
				summaryPayload: payload?.summaryPayload,
				saveStatus: 'recovery_required',
				error: 'Missing participant ID or scenario set version for final save.'
			}),
			saveStatus: 'recovery_required',
			saveError: 'Missing participant ID or scenario set version for final save.'
		});
		await notifyMainGameRecoveryRequired(normalizedReason, get(completionState)?.payload || null);
		endGameSession();
		return { ok: false, error: new Error('Missing participant ID or scenario set version for final save.') };
	}

	if (!isBrowserOnline()) {
		writePendingProgressPayload(payload);
		const offlineError = 'Browser is offline. Final Firebase save could not be confirmed.';
		try {
			await persistCompletionMetadata(
				{
					finalSaveStatus: 'recovery_required',
					finalSaveAttemptCount: 0,
					lastSaveError: offlineError
				},
				payload.summaryPayload
			);
		} catch (_error) {
			// Ignore metadata failures when the client is offline.
		}
		setCompletionStateForSave('recovery', normalizedReason, {
			...buildCompletionPayload({
				reason: normalizedReason,
				summaryPayload: payload.summaryPayload,
				saveStatus: 'recovery_required',
				error: offlineError
			}),
			saveStatus: 'recovery_required',
			saveError: offlineError
		});
		await notifyMainGameRecoveryRequired(normalizedReason, get(completionState)?.payload || null);
		endGameSession();
		return { ok: false, error: new Error(offlineError) };
	}

	let lastError = null;
	for (let attempt = 1; attempt <= FINAL_SAVE_MAX_ATTEMPTS; attempt += 1) {
		setCompletionStateForSave('saving', normalizedReason, {
			...buildCompletionPayload({
				reason: normalizedReason,
				summaryPayload: payload.summaryPayload,
				saveStatus: 'saving',
				saveAttempts: attempt
			}),
			saveStatus: 'saving',
			saveAttempts: attempt
		});

		try {
			const summary = await persistProgressPayload(payload);
			clearPendingProgressPayload();
			const finalSaveConfirmedAt = new Date().toISOString();
			const summaryWithMeta = await persistCompletionMetadata(
				{
					finalSaveStatus: 'confirmed',
					finalSaveConfirmedAt,
					finalSaveAttemptCount: attempt,
					lastSaveError: ''
				},
				payload.summaryPayload
			);
			const confirmedSummary = summaryWithMeta || summary;
			const completionPayload = buildCompletionPayload({
				reason: normalizedReason,
				summary: confirmedSummary,
				summaryPayload: payload.summaryPayload,
				saveStatus: 'confirmed',
				saveAttempts: attempt
			});
			completionState.set({
				...createDefaultCompletionState(),
				phase: 'ready',
				reason: normalizedReason,
				saveStatus: 'confirmed',
				saveAttempts: attempt,
				payload: completionPayload,
				retryRequest
			});
			await notifyMainGameComplete(normalizedReason, completionPayload);
			endGameSession();
			return { ok: true, summary: confirmedSummary };
		} catch (error) {
			lastError = error;
			writePendingProgressPayload(payload);
			if (attempt < FINAL_SAVE_MAX_ATTEMPTS) {
				await sleep(FINAL_SAVE_RETRY_DELAY_MS * attempt);
			}
		}
	}

	const recoveryError = String(lastError?.message || 'Final Firebase save could not be confirmed.').trim();
	try {
		await persistCompletionMetadata(
			{
				finalSaveStatus: 'recovery_required',
				finalSaveAttemptCount: FINAL_SAVE_MAX_ATTEMPTS,
				lastSaveError: recoveryError
			},
			payload.summaryPayload
		);
	} catch (_error) {
		// Recovery metadata is best-effort; the Qualtrics backup payload is the fallback path.
	}
	const recoveryPayload = buildCompletionPayload({
		reason: normalizedReason,
		summaryPayload: payload.summaryPayload,
		saveStatus: 'recovery_required',
		saveAttempts: FINAL_SAVE_MAX_ATTEMPTS,
		error: recoveryError
	});
	completionState.set({
		...createDefaultCompletionState(),
		phase: 'recovery',
		reason: normalizedReason,
		saveStatus: 'recovery_required',
		saveAttempts: FINAL_SAVE_MAX_ATTEMPTS,
		error: recoveryError,
		payload: recoveryPayload,
		retryRequest
	});
	await notifyMainGameRecoveryRequired(normalizedReason, recoveryPayload);
	endGameSession();
	return { ok: false, error: lastError || new Error(recoveryError) };
}

function getActiveScenarioIdForSystemEvent() {
	const progressSnapshot = get(scenarioSetProgress) || {};
	const inProgressScenario = String(progressSnapshot?.inProgressScenario ?? '').trim();
	if (inProgressScenario) return inProgressScenario;
	const scenario = getCurrentScenario(get(currentRound));
	return String(scenario?.scenario_id ?? '').trim();
}

async function finalizeTimedOutGame(totalGameTime) {
	const systemScenarioId = getActiveScenarioIdForSystemEvent();
	if (systemScenarioId) {
		stopOrderSelectionThinking(systemScenarioId, { endTimeSeconds: totalGameTime });
		recordDetailedAction(systemScenarioId, 'game_timeout', 'system', 'time_expired', {
			endTimeSeconds: totalGameTime
		});
	}
	if (get(gameMode) !== 'tutorial') {
		await finalizeMainGameSession('time_expired', {
			totalRounds: get(scenarios).length,
			roundsCompleted: get(uniqueSets),
			optimalChoices: get(optimalChoices),
			totalGameTime,
			completedGame: true,
			earnings: get(earned)
		});
		return;
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

export async function notifyMainGameComplete(reason = 'completed', payload = null) {
	const normalizedReason = String(reason || 'completed').trim() || 'completed';
	const resolvedPayload = payload || buildCompletionPayload({ reason: normalizedReason, saveStatus: 'confirmed' });
	if (completionMessageSent) return resolvedPayload;
	completionMessageSent = true;
	recoveryMessageSent = false;

	postParentMessage({
		type: 'mainGameComplete',
		reason: normalizedReason,
		saveStatus: 'confirmed',
		userId: String(resolvedPayload?.userId ?? '').trim(),
		scenarioSetVersionId: String(resolvedPayload?.scenarioSetVersionId ?? '').trim(),
		resultCode: String(resolvedPayload?.resultCode ?? '').trim(),
		resultAccessKey: String(resolvedPayload?.resultAccessKey ?? '').trim(),
		roundsCompleted: Number(resolvedPayload?.roundsCompleted) || 0,
		totalRounds: Number(resolvedPayload?.totalRounds) || 0,
		optimalChoices: Number(resolvedPayload?.optimalChoices) || 0,
		earnings: Number(resolvedPayload?.earnings) || 0,
		totalGameTime: Number(resolvedPayload?.totalGameTime) || 0,
		completedGame: Boolean(resolvedPayload?.completedGame),
		copyVerificationMethod: String(resolvedPayload?.copyVerificationMethod ?? 'none').trim() || 'none',
		saveAttempts: Number(resolvedPayload?.saveAttempts) || 0,
		saveError: ''
	});

	const handoffPostedAt = new Date().toISOString();
	updateCompletionStatePayload((currentPayload) => (
		currentPayload
			? {
				...currentPayload,
				saveStatus: 'confirmed'
			}
			: currentPayload
	));
	try {
		await persistCompletionMetadata(
			{
				finalSaveStatus: 'confirmed',
				handoffPostedAt,
				lastSaveError: ''
			},
			getSummaryFieldsFromCompletionPayload(resolvedPayload)
		);
	} catch (error) {
		console.warn('Unable to persist completion handoff metadata:', error);
	}
	return resolvedPayload;
}

export async function notifyMainGameRecoveryRequired(reason = 'completed', payload = null) {
	const normalizedReason = String(reason || 'completed').trim() || 'completed';
	const resolvedPayload = payload || buildCompletionPayload({
		reason: normalizedReason,
		saveStatus: 'recovery_required'
	});
	if (recoveryMessageSent) return resolvedPayload;
	recoveryMessageSent = true;
	completionMessageSent = false;

	postParentMessage({
		type: 'mainGameRecoveryRequired',
		reason: normalizedReason,
		saveStatus: 'recovery_required',
		userId: String(resolvedPayload?.userId ?? '').trim(),
		scenarioSetVersionId: String(resolvedPayload?.scenarioSetVersionId ?? '').trim(),
		resultCode: String(resolvedPayload?.resultCode ?? '').trim(),
		resultAccessKey: String(resolvedPayload?.resultAccessKey ?? '').trim(),
		roundsCompleted: Number(resolvedPayload?.roundsCompleted) || 0,
		totalRounds: Number(resolvedPayload?.totalRounds) || 0,
		optimalChoices: Number(resolvedPayload?.optimalChoices) || 0,
		earnings: Number(resolvedPayload?.earnings) || 0,
		totalGameTime: Number(resolvedPayload?.totalGameTime) || 0,
		completedGame: Boolean(resolvedPayload?.completedGame),
		copyVerificationMethod: String(resolvedPayload?.copyVerificationMethod ?? 'none').trim() || 'none',
		saveAttempts: Number(resolvedPayload?.saveAttempts) || 0,
		saveError: String(resolvedPayload?.saveError ?? '').trim()
	});

	const handoffPostedAt = new Date().toISOString();
	updateCompletionStatePayload((currentPayload) => (
		currentPayload
			? {
				...currentPayload,
				saveStatus: 'recovery_required'
			}
			: currentPayload
	));
	completionState.update((state) => ({
		...(state || createDefaultCompletionState()),
		recoveryPosted: true
	}));
	try {
		await persistCompletionMetadata(
			{
				finalSaveStatus: 'recovery_required',
				handoffPostedAt,
				lastSaveError: String(resolvedPayload?.saveError ?? '').trim()
			},
			getSummaryFieldsFromCompletionPayload(resolvedPayload)
		);
	} catch (error) {
		console.warn('Unable to persist recovery handoff metadata:', error);
	}
	return resolvedPayload;
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
	completionState.set(createDefaultCompletionState());
	completionMessageSent = false;
	recoveryMessageSent = false;
	currentLiveSessionParticipation = null;
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
		const activeLiveSession = await getActiveLiveSession();
		setCurrentLiveSessionParticipation(
			activeLiveSession?.sessionId
				? {
					...activeLiveSession,
					joinedAt: new Date().toISOString()
				}
				: null
		);
		const summary = await initializeUserProgress(id, {
			scenarioSetVersionId: get(scenarioSetVersionId),
			scenarioSetName: activeScenarioSetName || config.scenario_set,
			totalRounds: get(scenarios).length,
			...getLiveSessionMetadata(new Date().toISOString())
		});
		if (browser && summary?.resultAccessKey) {
			participantResultUrl.set(getParticipantResultUrl(id, summary.resultAccessKey));
		} else {
			participantResultUrl.set("");
		}
		await flushPendingProgressSave();
		await loadSavedScenarioState(id);
		if (currentLiveSessionParticipation?.sessionId) {
			await syncLiveSessionParticipantState(id, {
				summaryPayload: {
					earnings: get(earned),
					roundsCompleted: get(uniqueSets),
					optimalChoices: get(optimalChoices),
					totalGameTime: get(resumeElapsedSeconds),
					completedGame: false,
					lastActivityAt: new Date().toISOString()
				},
				status: 'joined',
				lastActivityAt: new Date().toISOString(),
				displayName: id
			});
		}
	} else {
		participantResultUrl.set("");
	}
    return n
}
