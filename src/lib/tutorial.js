import { writable, readable, derived, get} from 'svelte/store';
import {
	addAction, addOrder, updateFields, updateOrder, authenticateUser, createUser, getCounter, incrementCounter,
	getTutorialConfig, getExperimentScenarios, getOrdersData, getStoresData, getEmojisData
} from './firebaseDB';

import { switchJob } from './config';
const DEFAULT_TUTORIAL_CONDITION = [{ name: "Tutorial", order_file: "order_tutorial.json", store_file: "stores.json" }];

let config = {
	timeLimit: 120,
	thinkTime: 2,
	gridSize: 2,
	tips: false,
	waiting: false,
	refresh: false,
	expire: false,
	conditions: [...DEFAULT_TUTORIAL_CONDITION],
	auth: false
};

let tutorialScenarios = [];
let firebaseInitialized = false;

let storeConfigs = {}
let orderConfigs = []

let start;
let stopTimeInterval;
let actionCounter = 0;
export const uniqueSets = writable(0);
export const orderList = writable([])
export let FullTimeLimit = config["timeLimit"];

export let needsAuth = config["auth"]

export let numCols = config["gridSize"]

// Experiment round management
export const currentRound = writable(1);
export let scenarios = tutorialScenarios;
export const roundStartTime = writable(0);

export function getCurrentScenario(round) {
  return scenarios.find((s) => s.round === round) ?? scenarios[scenarios.length - 1] ?? { round: 1, max_bundle: 3, orders: [] };
}

const experiment = true

export const GameOver = writable(false);
export const gameText = writable({
	selector: "None selected",
})

export let thinkTime = config["thinkTime"];
export let ordersShown = config["ordersShown"] ?? 4;
export const emojisMap = writable({});
export const game = writable({
	inSelect: false,
	inStore: false,
	bundled: false,
	tip: config["tips"],
	waiting: config["waiting"],
	refresh: config["refresh"]
});

export async function initializeFromFirebase() {
	try {
		const tutorialConfig = await getTutorialConfig();
		if (tutorialConfig) {
			config = {
				timeLimit: tutorialConfig.timeLimit ?? config.timeLimit,
				thinkTime: tutorialConfig.thinkTime ?? config.thinkTime,
				gridSize: tutorialConfig.gridSize ?? config.gridSize,
				tips: tutorialConfig.tips ?? config.tips,
				waiting: tutorialConfig.waiting ?? config.waiting,
				refresh: tutorialConfig.refresh ?? config.refresh,
				expire: tutorialConfig.expire ?? config.expire,
				conditions: tutorialConfig.conditions ?? config.conditions,
				auth: tutorialConfig.auth ?? config.auth
			};
			if (!Array.isArray(config.conditions) || config.conditions.length === 0) {
				config.conditions = [...DEFAULT_TUTORIAL_CONDITION];
				console.warn("Firebase tutorialConfig has no conditions; using default tutorial condition IDs.");
			}
		}

		const fetchedScenarios = await getExperimentScenarios();
		if (Array.isArray(fetchedScenarios) && fetchedScenarios.length > 0) {
			tutorialScenarios = fetchedScenarios;
		}

		const emojisData = await getEmojisData();
		if (emojisData && Object.keys(emojisData).length > 0) {
			emojisMap.set(emojisData);
		}
	} catch (error) {
		console.error('Error initializing tutorial data from Firebase:', error);
	}

	FullTimeLimit = config.timeLimit;
	needsAuth = config.auth;
	numCols = config.gridSize;
	thinkTime = config.thinkTime;
	ordersShown = config.ordersShown ?? 4;
	scenarios = tutorialScenarios;
	game.update((current) => ({
		...current,
		tip: config.tips,
		waiting: config.waiting,
		refresh: config.refresh
	}));
	firebaseInitialized = true;
}

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

export const earned = writable(0);
export const currLocation = writable("");

export const elapsed = derived(timeStamp, ($timeStamp, set) => {
	const elapsedSeconds = Math.round($timeStamp / 1000);
	if (elapsedSeconds >= FullTimeLimit && elapsedSeconds <= FullTimeLimit + 2) {
		updateFields(get(id), {
			earnings: get(earned),
        	ordersComplete: get(finishedOrders).length,
			uniqueSetsComplete: get(uniqueSets),
        	gametime: FullTimeLimit
		})
		GameOver.set(true);
		stopTimeInterval?.();
		set(FullTimeLimit)
		console.log("game over")
		return;
	}
	set(elapsedSeconds);
});

export const remainingTime = derived(
	elapsed,
	($elapsed) => Math.max(FullTimeLimit - $elapsed, 0)
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
	addAction(get(id), action, actionCounter + "_" + action.buttonID)
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

export async function loadConfigByName(fileName) {
  const normalizedId = fileName?.replace(/\.json$/i, '');
  const isOrderFile = normalizedId?.startsWith('order');
  const isStoreFile = normalizedId?.startsWith('stores');

  if (isOrderFile) {
	const orderData = await getOrdersData(normalizedId);
	if (Array.isArray(orderData) && orderData.length > 0) {
		return orderData;
	}
  }

  if (isStoreFile) {
	const storeData = await getStoresData(normalizedId);
	if (storeData && Array.isArray(storeData.stores) && storeData.stores.length > 0) {
		return storeData;
	}
  }
  console.error(`Config "${fileName}" not found in Firebase MasterData.`);
  return null;
}

export async function loadGame() {
	if (!firebaseInitialized) {
		await initializeFromFirebase();
	}

	if (!Array.isArray(config.conditions) || config.conditions.length === 0) {
		config.conditions = [...DEFAULT_TUTORIAL_CONDITION];
		console.warn("No tutorial conditions configured; using default tutorial condition IDs.");
	}

	let n = 0
	if (config["conditions"].length > 1) {
		let value = await getCounter()
		await incrementCounter()
		n = value % config["conditions"].length
	}
	try {
		let orderFile = await loadConfigByName(config["conditions"][n]["order_file"])
		let storeFile = await loadConfigByName(config["conditions"][n]["store_file"])

		if (!orderFile || !storeFile) {
			console.error("Could not find files specified in configuration")
		} else {
			storeConfigs = storeFile
			orderConfigs = orderFile
		}
	} catch (err) {
		console.error("Error creating conditions", err)
		return -1
	}
	currLocation.set(storeConfigs["startinglocation"]);
	
	switchJob(orderConfigs, storeConfigs)
	return n
}

export async function createNewUser(id) {
	let n = await loadGame()
	await createUser(id, n)
    return n
}
