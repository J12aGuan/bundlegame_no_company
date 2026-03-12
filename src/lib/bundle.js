import { writable, readable, derived, get} from 'svelte/store';
import { browser } from '$app/environment';
import { 
    addAction, addOrder, updateFields, updateOrder, authenticateUser, createUser,
    getCentralConfig, getTutorialConfig, getExperimentScenarios, getOrdersData, getStoresData, getCitiesData, getEmojisData,
    getScenarioDatasetBundle, initializeUserProgress, recordScenarioProgress, updateUserProgressSummary
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

// Initialize config and scenarios from Firebase
export async function initializeFromFirebase(mode = 'main') {
	try {
		if (mode === 'tutorial') {
			const tutorialConfigData = await getTutorialConfig();
			if (tutorialConfigData) {
				config = {
					...config,
					timeLimit: tutorialConfigData.timeLimit ?? config.timeLimit,
					thinkTime: tutorialConfigData.thinkTime ?? config.thinkTime,
					gridSize: tutorialConfigData.gridSize ?? config.gridSize,
					auth: tutorialConfigData.auth ?? config.auth,
					tips: tutorialConfigData.tips ?? config.tips,
					waiting: tutorialConfigData.waiting ?? config.waiting,
					refresh: tutorialConfigData.refresh ?? config.refresh,
					expire: tutorialConfigData.expire ?? config.expire,
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
let actionCounter = 0;
export const uniqueSets = writable(0);
export const orderList = writable([])
export const FullTimeLimit = writable(config["timeLimit"]);
export const participantResultUrl = writable("");

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
			return found ? { ...found } : { id, city: '', store: '', items: {}, earnings: 0, estimatedTime: 0 };
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
	start = new Date();
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

export const elapsed = derived([timeStamp, FullTimeLimit], ([$timeStamp, $FullTimeLimit], set) => {
	const elapsedSeconds = Math.round($timeStamp / 1000);
	if (elapsedSeconds >= $FullTimeLimit && elapsedSeconds <= $FullTimeLimit + 2) {
		updateFields(get(id), {
			earnings: get(earned),
	        	ordersComplete: get(finishedOrders).length,
			uniqueSetsComplete: get(uniqueSets),
	        	gametime: $FullTimeLimit
		})
		updateUserProgressSummary(get(id), {
			scenarioSet: config.scenario_set,
			totalRounds: get(scenarios).length,
			totalGameTime: $FullTimeLimit,
			completedGame: true,
			earnings: get(earned)
		});
		GameOver.set(true);
		stopTimeInterval?.();
		set($FullTimeLimit)
		console.log("game over")
		return;
	}
	set(elapsedSeconds);
});

export const remainingTime = derived(
	[elapsed, FullTimeLimit],
	([$elapsed, $FullTimeLimit]) => Math.max($FullTimeLimit - $elapsed, 0)
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



export const logAction = (action) => {
	if (!needsAuth) {
		return
	}
	action.earnings = get(earned)
	action.ordersComplete = get(finishedOrders).length
	action.gametime = get(elapsed)
	action.uniqueSetsComplete = get(uniqueSets)
	console.log(action)
	const actionName = String(action?.buttonID ?? "unknown").trim() || "unknown";
	addAction(get(id), action, actionCounter + "_" + actionName)
	actionCounter += 1;
}

export const logOrder = (order, options) => {
	if (!needsAuth) {
		return
	}
	order.startgametime = get(elapsed)
	order.status = 0
	order.bundled = false
	let optionslst = []
	for (let i=0; i<options.length; i++) {
		optionslst.push(options[i].id)
	}
	order.options = optionslst
	addOrder(get(id), order, order.id)
}
export const logBundledOrder = (order1, order2, options) => {
	if (!needsAuth) {
		return
	}
	order1.startgametime = get(elapsed)
	order1.status = 0
	order1.bundled = true
	order1.bundledWith = order2.id
	order2.startgametime = get(elapsed)
	order2.status = 0
	order2.bundled = true
	order2.bundledWith = order1.id
	let optionslst = []
	for (let i=0; i<options.length; i++) {
		optionslst.push(options[i].id)
	}
	order1.options = optionslst
	order2.options = optionslst
	addOrder(get(id), order1, order1.id)
	addOrder(get(id), order2, order2.id)
}

// New function to handle 1-3 orders flexibly
export const logOrders = (selectedOrders, allOptions) => {
	if (!needsAuth) {
		return
	}
	const startTime = get(elapsed)
	const optionslst = allOptions.map(o => o.id)
	
	selectedOrders.forEach((order, idx) => {
		order.startgametime = startTime
		order.status = 0
		order.bundled = selectedOrders.length > 1
		order.bundleSize = selectedOrders.length
		if (order.bundled) {
			order.bundledWith = selectedOrders.filter((_, i) => i !== idx).map(o => o.id)
		}
		order.options = optionslst
		addOrder(get(id), order, order.id)
	})
}

//state should contain info such as:
//whether the order was completed succesfully or not
//how many tries it took, etc
export const completeOrder = (orderID) => {
	if (!needsAuth) {
		return
	}
	let state = {
		status: 1,
		endgametime: get(elapsed)
	}
	updateOrder(get(id), state, orderID)
	updateFields(get(id), {
		earnings: get(earned),
		ordersComplete: get(finishedOrders).length,
		uniqueSetsComplete: get(uniqueSets),
		gametime: get(elapsed)
	})
}

export const authUser = (id, pass) => {
	return authenticateUser(id, pass)
}

export const saveScenarioProgress = (progress) => {
	if (!get(needsAuth)) {
		return;
	}
	recordScenarioProgress(get(id), {
		...progress,
		scenarioSet: config.scenario_set,
		totalRounds: get(scenarios).length,
		totalGameTime: get(elapsed),
		earnings: get(earned)
	});
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
	try {
		const datasetId = config.scenario_set || 'experiment';
		const datasetBundle = await getScenarioDatasetBundle(datasetId);
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
	currLocation.set(storeConfigs["startinglocation"]);
	
	switchJob(orderConfigs, storeConfigs)
	return 0
}

export async function createNewUser(id, mode = 'main') {
	let n = await loadGame(mode)
	await createUser(id, n)
	const summary = await initializeUserProgress(id, {
		scenarioSet: config.scenario_set,
		totalRounds: get(scenarios).length
	});
	if (browser && summary?.resultAccessKey) {
		participantResultUrl.set(`${window.location.origin}/result?userId=${encodeURIComponent(id)}&key=${encodeURIComponent(summary.resultAccessKey)}`);
	} else {
		participantResultUrl.set("");
	}
    return n
}
