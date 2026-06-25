import {
    BUNDLEGAME_RECOMMENDATION_EXPOSURE,
    BUNDLEGAME_STUDY_PHASES,
    BUNDLEGAME_STUDY_PROTOCOL_ID,
    BUNDLEGAME_STUDY_PROTOCOL_VERSION,
    BUNDLEGAME_STUDY_TOTAL_ROUNDS
} from './researchStudy.js';

let default_job = {}
let order_list = []

let id = 0;
let orderid = 0;

// Penalty timeout in seconds (updated at runtime from Firebase central config).
export let PENALTY_TIMEOUT = 30;

export function buildRuntimeProtocolConfig(overrides = {}) {
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    return {
        protocol_id: String(source.protocol_id ?? BUNDLEGAME_STUDY_PROTOCOL_ID).trim(),
        protocol_version: String(source.protocol_version ?? source.version ?? BUNDLEGAME_STUDY_PROTOCOL_VERSION).trim(),
        expected_total_rounds: Number(source.expected_total_rounds ?? source.total_rounds ?? BUNDLEGAME_STUDY_TOTAL_ROUNDS) || 0,
        phase_plan: Array.isArray(source.phase_plan)
            ? source.phase_plan.map((phase) => ({ ...(phase || {}) }))
            : BUNDLEGAME_STUDY_PHASES.map((phase) => ({ ...phase })),
        recommendation_exposure: {
            ...BUNDLEGAME_RECOMMENDATION_EXPOSURE,
            ...(source.recommendation_exposure && typeof source.recommendation_exposure === 'object'
                ? source.recommendation_exposure
                : {}),
            active_phase_ids: Array.isArray(source.recommendation_exposure?.active_phase_ids)
                ? [...source.recommendation_exposure.active_phase_ids]
                : [...BUNDLEGAME_RECOMMENDATION_EXPOSURE.active_phase_ids],
            treatment_arm_ids: Array.isArray(source.recommendation_exposure?.treatment_arm_ids)
                ? [...source.recommendation_exposure.treatment_arm_ids]
                : [...BUNDLEGAME_RECOMMENDATION_EXPOSURE.treatment_arm_ids],
            control_arm_ids: Array.isArray(source.recommendation_exposure?.control_arm_ids)
                ? [...source.recommendation_exposure.control_arm_ids]
                : [...BUNDLEGAME_RECOMMENDATION_EXPOSURE.control_arm_ids]
        }
    };
}

export function normalizeCentralConfigForRuntime(configData = {}) {
    const source = configData && typeof configData === 'object' ? configData : {};
    return {
        ...source,
        research_protocol: buildRuntimeProtocolConfig(
            source.research_protocol ?? source.researchProtocol ?? source.study_protocol ?? {}
        )
    };
}

export function setPenaltyTimeout(timeoutSeconds) {
    if (typeof timeoutSeconds === "number" && Number.isFinite(timeoutSeconds) && timeoutSeconds > 0) {
        PENALTY_TIMEOUT = timeoutSeconds;
    }
}

function gaussianRandom(mean, stdDev) {
    // Using the Box-Muller transform to generate a Gaussian-distributed random number
    let u1 = Math.random();
    let u2 = Math.random();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    // Scale and shift to match the desired mean and standard deviation
    let randomFloat = z0 * stdDev + mean;
    
    // Round to the nearest integer
    let randomInt = Math.round(randomFloat);
    
    return randomInt;
}

export function switchJob(orders, stores) {
    order_list = orders
    default_job = stores
}

// TODO add way to pull from different JSON here
export function queueNFixedOrders(n) {
    console.log("queuing " + n + " orders")
    const next_orders = []
    for (let i = 0; i < n; i++) {
        next_orders.push(order_list[orderid])
        orderid += 1;
    }
    return next_orders
}

/* Returns the configuration for a store */
// Legacy datasets (tutorial / mainGame / experiment / test) name this store "Sprouts Farmers Market";
// the re-seeded grid (CHI store layouts) calls it "Sprouts". Resolve legacy names to the grid name so
// the in-store pick grid is never the empty fallback. (Mirrored in bundleTime.resolveStoreConfig.)
export const STORE_NAME_ALIASES = { "Sprouts Farmers Market": "Sprouts" };

export function storeConfig(store) {
    const want = STORE_NAME_ALIASES[store] || store;
    let r = ""
    const stores = Array.isArray(default_job?.stores) ? default_job.stores : [];
    stores.forEach((e) => {
        if (e["store"] === want) {
            r = e;
        }
    })
    return r;
}

export function getDistances(location) {
    // New structure: default_job.travelTimes[FromCity][ToCity] = seconds
    if (default_job?.travelTimes && default_job.travelTimes[location]) {
        const row = default_job.travelTimes[location] || {};
        const destinations = Object.keys(row);
        const distances = destinations.map((city) => Number(row[city]) || 0);
        return { destinations, distances };
    }

    // Backward compatibility with legacy structure.
    if (default_job?.distances && default_job.distances[location]) {
        return default_job.distances[location];
    }

    return { destinations: [], distances: [] };
}

export function getCityTravelInfo(fromCity, toCity) {
    const origin = String(fromCity ?? "").trim();
    const destination = String(toCity ?? "").trim();

    if (!origin || !destination) {
        return {
            fromCity: origin,
            toCity: destination,
            seconds: 0,
            sameCity: false,
            missingRoute: false
        };
    }

    if (origin === destination) {
        return {
            fromCity: origin,
            toCity: destination,
            seconds: 0,
            sameCity: true,
            missingRoute: false
        };
    }

    const distData = getDistances(origin);
    const destinations = Array.isArray(distData?.destinations) ? distData.destinations : [];
    const idx = destinations.indexOf(destination);
    const rawSeconds = idx >= 0 ? Number(distData?.distances?.[idx]) : NaN;

    if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) {
        return {
            fromCity: origin,
            toCity: destination,
            seconds: 0,
            sameCity: false,
            missingRoute: true
        };
    }

    return {
        fromCity: origin,
        toCity: destination,
        seconds: rawSeconds,
        sameCity: false,
        missingRoute: false
    };
}

export function getActiveStoreDataset() {
    return {
        stores: Array.isArray(default_job?.stores) ? default_job.stores : []
    };
}

export function getActiveCitiesDataset() {
    return {
        startinglocation: String(default_job?.startinglocation ?? '').trim(),
        travelTimes: default_job?.travelTimes ?? {},
        distances: default_job?.distances ?? {}
    };
}
