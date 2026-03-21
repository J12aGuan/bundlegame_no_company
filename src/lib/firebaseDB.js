import { timeStamp } from './bundle';
import {firestore} from './firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, Timestamp, deleteField } from "firebase/firestore";

function removeUndefinedDeep(value) {
    if (Array.isArray(value)) {
        return value.map((item) => removeUndefinedDeep(item));
    }
    if (value && typeof value === 'object') {
        const out = {};
        for (const [key, nested] of Object.entries(value)) {
            if (nested === undefined) continue;
            out[key] = removeUndefinedDeep(nested);
        }
        return out;
    }
    return value;
}

export const createUser = async (id, n) => {
    if (!id) return '';
    const userDocRef = doc(collection(firestore, 'Users'), id);

    try {
        const existingUser = await getDoc(userDocRef);
        if (existingUser.exists()) {
            await setDoc(userDocRef, {
                configuration: deleteField(),
                createdAt: deleteField(),
                updatedAt: deleteField(),
                earnings: deleteField(),
                ordersComplete: deleteField(),
                uniqueSetsComplete: deleteField(),
                gametime: deleteField()
            }, { merge: true });
        } else {
            await setDoc(userDocRef, {});
        }
        console.log("Document written with ID: ", id);
    } catch (error) {
        console.error("Error adding document: ", error);
    }

    return id
}

function getSummaryRef(id) {
    return doc(collection(firestore, 'Users/' + id + '/Summary'), 'summary');
}

function getScenarioSetProgressRef(id) {
    return doc(collection(firestore, 'Users/' + id + '/Progress'), 'progress');
}

function getLegacyScenarioSetProgressRef(id) {
    return doc(collection(firestore, 'Users/' + id + '/ScenarioSet'), 'progress');
}

function getActionSummaryRef(id) {
    return doc(collection(firestore, 'Users/' + id + '/Action'), 'actions');
}

function getDetailedActionSummaryRef(id) {
    return doc(collection(firestore, 'Users/' + id + '/DetailedAction'), 'actions');
}

function normalizeScenarioIdList(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(
        value
            .map((entry) => String(entry ?? '').trim())
            .filter(Boolean)
    )];
}

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

function sumTimeSummary(summary = {}) {
    return Object.values(normalizeTimeSummary(summary)).reduce((sum, value) => sum + value, 0);
}

function mergeActionEntry(existingEntry = {}, nextEntry = {}) {
    const existingSummary = normalizeTimeSummary(existingEntry?.timeSummary);
    const nextSummary = normalizeTimeSummary(nextEntry?.timeSummary);
    const mergedSummary = createEmptyTimeSummary();
    for (const key of Object.keys(mergedSummary)) {
        mergedSummary[key] = Math.max(existingSummary[key], nextSummary[key]);
    }

    return {
        totalTimeSeconds: Math.max(
            Number(existingEntry?.totalTimeSeconds) || 0,
            Number(nextEntry?.totalTimeSeconds) || 0,
            sumTimeSummary(mergedSummary)
        ),
        timeSummary: mergedSummary,
        orderSummary: normalizeOrderSummary(
            nextEntry?.orderSummary?.length ? nextEntry.orderSummary : existingEntry?.orderSummary
        )
    };
}

function normalizeActionsByScenarioId(actionsByScenarioId = {}) {
    if (!actionsByScenarioId || typeof actionsByScenarioId !== 'object') return {};
    const out = {};
    for (const [scenarioId, entry] of Object.entries(actionsByScenarioId)) {
        const normalizedScenarioId = String(scenarioId ?? '').trim();
        if (!normalizedScenarioId) continue;
        out[normalizedScenarioId] = mergeActionEntry({}, entry || {});
    }
    return out;
}

function normalizeDetailedTimelineEvent(event = {}) {
    const metadata = event?.metadata && typeof event.metadata === 'object'
        ? removeUndefinedDeep(event.metadata)
        : undefined;
    return removeUndefinedDeep({
        actionType: String(event?.actionType ?? '').trim(),
        targetType: String(event?.targetType ?? '').trim(),
        targetId: String(event?.targetId ?? '').trim(),
        startTime: String(event?.startTime ?? '').trim(),
        endTime: String(event?.endTime ?? '').trim(),
        metadata
    });
}

function normalizeDetailedScenarioEntry(entry = {}) {
    const timeline = Array.isArray(entry?.timeline)
        ? entry.timeline
            .map((event) => normalizeDetailedTimelineEvent(event))
            .filter((event) => event.actionType && event.targetType && event.targetId && event.startTime && event.endTime)
        : [];
    return { timeline };
}

function normalizeDetailedActionsByScenarioId(actionsByScenarioId = {}) {
    if (!actionsByScenarioId || typeof actionsByScenarioId !== 'object') return {};
    const out = {};
    for (const [scenarioId, entry] of Object.entries(actionsByScenarioId)) {
        const normalizedScenarioId = String(scenarioId ?? '').trim();
        if (!normalizedScenarioId) continue;
        out[normalizedScenarioId] = normalizeDetailedScenarioEntry(entry);
    }
    return out;
}

function mergeScenarioSummaryEntry(existingEntry = {}, nextEntry = {}) {
    return removeUndefinedDeep({
        scenarioSetName: String(nextEntry?.scenarioSetName ?? existingEntry?.scenarioSetName ?? '').trim(),
        totalRounds: Number(nextEntry?.totalRounds) || 0,
        roundsCompleted: Number(nextEntry?.roundsCompleted) || 0,
        optimalChoices: Number(nextEntry?.optimalChoices) || 0,
        totalGameTime: Number(nextEntry?.totalGameTime) || 0,
        completedGame: Boolean(nextEntry?.completedGame),
        earnings: Number(nextEntry?.earnings) || 0,
        resultAccessKey: String(existingEntry?.resultAccessKey ?? nextEntry?.resultAccessKey ?? '').trim()
    });
}

function generateResultAccessKey() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 24;
    let key = '';

    if (globalThis.crypto?.getRandomValues) {
        const bytes = new Uint8Array(length);
        globalThis.crypto.getRandomValues(bytes);
        for (let i = 0; i < bytes.length; i += 1) {
            key += alphabet[bytes[i] % alphabet.length];
        }
        return key;
    }

    for (let i = 0; i < length; i += 1) {
        key += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return key;
}

export const initializeUserProgress = async (id, progress = {}) => {
    if (!id) return;
    const scenarioSetVersionId = String(progress?.scenarioSetVersionId ?? '').trim();
    if (!scenarioSetVersionId) return null;
    const resultAccessKey = String(progress?.resultAccessKey ?? generateResultAccessKey()).trim();

    try {
        const summaryRef = getSummaryRef(id);
        const snap = await getDoc(summaryRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const existingMap = existing?.summaryByScenarioSetVersionId && typeof existing.summaryByScenarioSetVersionId === 'object'
            ? existing.summaryByScenarioSetVersionId
            : {};
        const existingEntry = existingMap[scenarioSetVersionId] && typeof existingMap[scenarioSetVersionId] === 'object'
            ? existingMap[scenarioSetVersionId]
            : {};
        const entry = mergeScenarioSummaryEntry(existingEntry, {
            scenarioSetName: String(progress?.scenarioSetName ?? progress?.scenarioSet ?? existingEntry?.scenarioSetName ?? '').trim(),
            totalRounds: Number(progress?.totalRounds) || 0,
            roundsCompleted: Number(existingEntry?.roundsCompleted) || 0,
            optimalChoices: Number(existingEntry?.optimalChoices) || 0,
            totalGameTime: Number(existingEntry?.totalGameTime) || 0,
            completedGame: Boolean(existingEntry?.completedGame),
            earnings: Number(existingEntry?.earnings) || 0,
            resultAccessKey: String(existingEntry?.resultAccessKey ?? resultAccessKey).trim()
        });

        await setDoc(summaryRef, {
            summaryByScenarioSetVersionId: {
                ...existingMap,
                [scenarioSetVersionId]: entry
            }
        });
        console.log("Summary initialized for ", id);
        return entry;
    } catch (error) {
        console.error("Error initializing summary: ", error);
        return null;
    }
};

export const saveUserProgressSummary = async (id, progress = {}) => {
    if (!id) return;
    const scenarioSetVersionId = String(progress?.scenarioSetVersionId ?? '').trim();
    if (!scenarioSetVersionId) return null;

    try {
        const summaryRef = getSummaryRef(id);
        const snap = await getDoc(summaryRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const existingMap = existing?.summaryByScenarioSetVersionId && typeof existing.summaryByScenarioSetVersionId === 'object'
            ? existing.summaryByScenarioSetVersionId
            : {};
        const existingEntry = existingMap[scenarioSetVersionId] && typeof existingMap[scenarioSetVersionId] === 'object'
            ? existingMap[scenarioSetVersionId]
            : {};
        const resultAccessKey = String(existingEntry?.resultAccessKey ?? progress?.resultAccessKey ?? generateResultAccessKey()).trim();
        const entry = mergeScenarioSummaryEntry(existingEntry, {
            scenarioSetName: String(progress?.scenarioSetName ?? progress?.scenarioSet ?? existingEntry?.scenarioSetName ?? '').trim(),
            totalRounds: Number(progress?.totalRounds) || 0,
            roundsCompleted: Number(progress?.roundsCompleted) || 0,
            optimalChoices: Number(progress?.optimalChoices) || 0,
            totalGameTime: Number(progress?.totalGameTime) || 0,
            completedGame: Boolean(progress?.completedGame),
            earnings: Number(progress?.earnings) || 0,
            resultAccessKey
        });

        await setDoc(summaryRef, {
            summaryByScenarioSetVersionId: {
                ...existingMap,
                [scenarioSetVersionId]: entry
            }
        });
        console.log("Summary updated for ", id);
        return entry;
    } catch (error) {
        console.error("Error updating summary: ", error);
        return null;
    }
};

export const getUserSummary = async (id) => {
    if (!id) return null;
    try {
        const snap = await getDoc(getSummaryRef(id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
    } catch (error) {
        console.error("Error fetching user summary: ", error);
        return null;
    }
};

export const getParticipantResultSummary = async (userId, accessKey) => {
    const summary = await getUserSummary(userId);
    if (!summary) return null;
    const entries = summary?.summaryByScenarioSetVersionId && typeof summary.summaryByScenarioSetVersionId === 'object'
        ? Object.entries(summary.summaryByScenarioSetVersionId)
        : [];
    const match = entries.find(([, value]) => String(value?.resultAccessKey ?? '').trim() === String(accessKey ?? '').trim());
    if (!match) {
        return null;
    }
    const [scenarioSetVersionId, value] = match;
    return {
        scenarioSetVersionId,
        ...(value || {})
    };
};

export const getScenarioSetProgress = async (id) => {
    if (!id) return null;
    try {
        const snap = await getDoc(getScenarioSetProgressRef(id));
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }

        const legacySnap = await getDoc(getLegacyScenarioSetProgressRef(id));
        if (!legacySnap.exists()) return null;
        return { id: legacySnap.id, ...legacySnap.data() };
    } catch (error) {
        console.error("Error fetching scenario set progress: ", error);
        return null;
    }
};

export const saveScenarioSetProgress = async (id, progress = {}) => {
    if (!id) return null;
    const scenarioSetVersionId = String(progress?.scenarioSetVersionId ?? '').trim();
    if (!scenarioSetVersionId) return null;

    try {
        const progressRef = getScenarioSetProgressRef(id);
        const snap = await getDoc(progressRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const existingMap = existing?.progressByScenarioSetVersionId && typeof existing.progressByScenarioSetVersionId === 'object'
            ? existing.progressByScenarioSetVersionId
            : {};
        const existingEntry = existingMap[scenarioSetVersionId] && typeof existingMap[scenarioSetVersionId] === 'object'
            ? existingMap[scenarioSetVersionId]
            : {};
        const completedScenarios = normalizeScenarioIdList([
            ...(existingEntry?.completedScenarios || []),
            ...(progress?.completedScenarios || [])
        ]);
        const nextInProgressScenario = String(progress?.inProgressScenario ?? existingEntry?.inProgressScenario ?? '').trim();
        const entry = removeUndefinedDeep({
            scenarioSetName: String(progress?.scenarioSetName ?? existingEntry?.scenarioSetName ?? '').trim(),
            completedScenarios,
            inProgressScenario: completedScenarios.includes(nextInProgressScenario) ? '' : nextInProgressScenario,
            currentRound: Math.max(1, Number(progress?.currentRound ?? existingEntry?.currentRound) || 1),
            currentLocation: String(progress?.currentLocation ?? existingEntry?.currentLocation ?? '').trim()
        });

        await setDoc(progressRef, {
            progressByScenarioSetVersionId: {
                ...existingMap,
                [scenarioSetVersionId]: entry
            }
        });
        return entry;
    } catch (error) {
        console.error("Error saving scenario set progress: ", error);
        return null;
    }
};

export const getActionSummaries = async (id) => {
    if (!id) return null;
    try {
        const snap = await getDoc(getActionSummaryRef(id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
    } catch (error) {
        console.error("Error fetching action summaries: ", error);
        return null;
    }
};

export const getDetailedActionSummaries = async (id) => {
    if (!id) return null;
    try {
        const snap = await getDoc(getDetailedActionSummaryRef(id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
    } catch (error) {
        console.error("Error fetching detailed action summaries: ", error);
        return null;
    }
};

export const saveActionSummaries = async (id, payload = {}) => {
    if (!id) return null;
    const scenarioSetVersionId = String(payload?.scenarioSetVersionId ?? '').trim();
    if (!scenarioSetVersionId) return null;

    try {
        const actionsRef = getActionSummaryRef(id);
        const snap = await getDoc(actionsRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const existingMap = existing?.actionsByScenarioSetVersionId && typeof existing.actionsByScenarioSetVersionId === 'object'
            ? existing.actionsByScenarioSetVersionId
            : {};
        const existingEntry = existingMap[scenarioSetVersionId] && typeof existingMap[scenarioSetVersionId] === 'object'
            ? existingMap[scenarioSetVersionId]
            : {};
        const existingActions = normalizeActionsByScenarioId(existingEntry?.actionsByScenarioId);
        const incomingActions = normalizeActionsByScenarioId(payload?.actionsByScenarioId);
        const mergedActions = { ...existingActions };

        for (const [scenarioId, entry] of Object.entries(incomingActions)) {
            mergedActions[scenarioId] = mergeActionEntry(existingActions[scenarioId], entry);
        }

        await setDoc(actionsRef, {
            actionsByScenarioSetVersionId: {
                ...existingMap,
                [scenarioSetVersionId]: {
                    actionsByScenarioId: mergedActions
                }
            }
        });
        return {
            actionsByScenarioId: mergedActions
        };
    } catch (error) {
        console.error("Error saving action summaries: ", error);
        return null;
    }
};

export const saveDetailedActionSummaries = async (id, payload = {}) => {
    if (!id) return null;
    const scenarioSetVersionId = String(payload?.scenarioSetVersionId ?? '').trim();
    if (!scenarioSetVersionId) return null;

    try {
        const actionsRef = getDetailedActionSummaryRef(id);
        const snap = await getDoc(actionsRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const existingMap = existing?.detailedActionsByScenarioSetVersionId && typeof existing.detailedActionsByScenarioSetVersionId === 'object'
            ? existing.detailedActionsByScenarioSetVersionId
            : {};
        const existingEntry = existingMap[scenarioSetVersionId] && typeof existingMap[scenarioSetVersionId] === 'object'
            ? existingMap[scenarioSetVersionId]
            : {};
        const existingActions = normalizeDetailedActionsByScenarioId(existingEntry?.actionsByScenarioId);
        const incomingActions = normalizeDetailedActionsByScenarioId(payload?.actionsByScenarioId);
        const mergedActions = {
            ...existingActions,
            ...incomingActions
        };

        await setDoc(actionsRef, {
            detailedActionsByScenarioSetVersionId: {
                ...existingMap,
                [scenarioSetVersionId]: {
                    actionsByScenarioId: mergedActions
                }
            }
        });
        return {
            actionsByScenarioId: mergedActions
        };
    } catch (error) {
        console.error("Error saving detailed action summaries: ", error);
        return null;
    }
};

//function for a random number given a seed
//written by CHATGPT
function hashSeed(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
    }
    return hash;
}
//written by CHAT GPT
function seededRandom(seed) {
    let x = seed % 2147483647;
    if (x <= 0) x += 2147483646;
    return function() {
        x = x * 16807 % 2147483647;
        return (x - 1) / 2147483646;
    };
}

function digitToHex(digit) {
    switch (digit) {
        case 10:
            return "A"
        case 11:
            return "B"
        case 12:
            return "C"
        case 13:
            return "D"
        case 14:
            return "E"
        case 15:
            return "F"
        default:
            return digit
    }
}

function generateNumber(random, modulo) {
    // Generate the first 3 digits randomly
    const first3Digits = [];
    for (let i = 0; i < 3; i++) {
        first3Digits.push(Math.floor(random() * 16)); // Random digit between 0-15
    }

    // Compute the checksum (4th digit)
    let total = 0;
    for (let i = 0; i < first3Digits.length; i++) {
        let digit = first3Digits[i];
        if (i == 1) {
            digit *= 2;
            if (digit > 15) {
                digit -= 15;
            }
        }
        total += digit;
        first3Digits[i] = digitToHex(digit)
    }

    // Calculate the checksum digit to make total % 16 === modulo
    const checksumDigit = digitToHex(((16 - (total % 16)) + modulo) % 16);
    
    first3Digits.push(checksumDigit);

    // Return the 4-digit number as a string
    return first3Digits.join('');
}

function generateToken(id) {
    const seed = hashSeed(id)
    const random = seededRandom(seed);
    let first = generateNumber(random, 11) //B
    let second = generateNumber(random, 0) //0
    let third = generateNumber(random, 11) //B
    let fourth = generateNumber(random, 10) //A
    return first + "-" + second + "-" + third + "-" + fourth
}

//returns 0 on error and 1 on success
export const authenticateUser = async (id, token) => {
    const userDocRef = doc(collection(firestore, 'Auth'), id);
    const userDocSnap = await getDoc(userDocRef)
    if (userDocSnap.exists()) {
        if (userDocSnap.data().status == 2) {
            return 1
        }
        return 0
    }
    //token does not exist, generate a token for the user and see if matches
    let generatedToken = generateToken(id)
    if (generatedToken == token) {
        const data = {
            userid: id,
            status: 1
        }
        const userDocRef = doc(collection(firestore, 'Auth'), token);
        try {
            await setDoc(userDocRef, data);
        } catch (error) {
            console.error("Error adding document: ", error);
        }
        return 1
    } else {
        return 0
    }
}

async function getSubcollections(id, field) {
    const subcollectionRefs = await getDocs(collection(firestore, 'Users/' + id + field)); // Adjust this line for specific subcollections
    const subcollectionData = subcollectionRefs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return subcollectionData;
  }

export const retrieveData = async () => {
    const querySnapshot = await getDocs(collection(firestore, 'Users'));
    const data = [];
    console.log(querySnapshot)

    for (const docSnapshot of querySnapshot.docs) {
        const docData = docSnapshot.data();
        const docId = docSnapshot.id;
        console.log(docId)
        if (true) {
            
            // Fetch subcollections for each document
            const orders = await getSubcollections(docId, '/Orders');
            const actions = await getSubcollections(docId, '/Actions');
            const summaryDocs = await getSubcollections(docId, '/Summary');
            const progressDocs = await getSubcollections(docId, '/Progress');
            const legacyScenarioSetDocs = await getSubcollections(docId, '/ScenarioSet');
            const actionSummaryDocs = await getSubcollections(docId, '/Action');
            const detailedActionSummaryDocs = await getSubcollections(docId, '/DetailedAction');
            const summaryDoc = summaryDocs.find((entry) => entry.id === 'summary') || null;
            const scenarioSetProgressDoc = progressDocs.find((entry) => entry.id === 'progress')
                || legacyScenarioSetDocs.find((entry) => entry.id === 'progress')
                || null;
            const scenarioActionsDoc = actionSummaryDocs.find((entry) => entry.id === 'actions') || null;
            const scenarioDetailedActionsDoc = detailedActionSummaryDocs.find((entry) => entry.id === 'actions') || null;
            
            
            data.push({
            id: docId,  // Include document ID
            ...docData,
            orders,
            actions,
            progressSummary: summaryDoc,
            summaryDoc,
            scenarioSetProgressDoc,
            scenarioActionsDoc,
            scenarioDetailedActionsDoc
            });
        } else {
            console.log("not adding to data")
        }
        
    }

    return data;
}

// ============ MasterData Management ============

const normalizeMasterDataId = (value = '') => String(value || '').trim().replace(/\.json$/i, '');
const DATASETS_DOC_ID = 'datasets';

const resolveDatasetRootFromId = (id = '') => {
    const normalized = normalizeMasterDataId(id);
    if (!normalized) return '';
    return normalized
        .replace(/(Scenarios|Orders|Optimal)(?=_|$)/ig, '')
        .replace(/(_scenarios|_orders|_optimal)$/i, '')
        .replace(/__+/g, '_')
        .replace(/^_|_$/g, '')
        .trim();
};

const getDatasetsMap = (docData = {}) => {
    const datasets = docData?.datasets;
    return datasets && typeof datasets === 'object' ? datasets : {};
};

const readDatasetEntry = async (datasetId = '') => {
    const root = resolveDatasetRootFromId(datasetId);
    if (!root) return { root: '', entry: null };
    const snap = await getDoc(doc(firestore, 'MasterData', DATASETS_DOC_ID));
    if (!snap.exists()) return { root, entry: null };
    const datasets = getDatasetsMap(snap.data() || {});
    const entry = datasets[root] ?? null;
    return { root, entry };
};

const writeDatasetEntry = async (datasetId = '', entry = {}) => {
    const root = resolveDatasetRootFromId(datasetId);
    if (!root) throw new Error('Invalid dataset id');
    const payload = {
        datasets: {
            [root]: entry
        }
    };
    await setDoc(doc(firestore, 'MasterData', DATASETS_DOC_ID), payload, { merge: true });
    return root;
};

// Central Game Configuration
export const getCentralConfig = async () => {
    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', 'centralConfig'));
        if (docSnap.exists()) {
            console.log('Central config fetched');
            return docSnap.data();
        } else {
            console.log('Central config not found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching central config:', error);
        return null;
    }
}

export const saveCentralConfig = async (configData) => {
    try {
        const docRef = doc(firestore, 'MasterData', 'centralConfig');
        await setDoc(docRef, {
            ...configData,
            updatedAt: Timestamp.fromDate(new Date())
        });
        console.log('Central config saved');
        return true;
    } catch (error) {
        console.error('Error saving central config:', error);
        throw error;
    }
}

// Experiment Scenarios
export const getExperimentScenarios = async (scenariosId = 'experiment') => {
    try {
        const { root, entry } = await readDatasetEntry(scenariosId);
        const grouped = entry?.scenarios || [];
        if (Array.isArray(grouped)) {
            console.log(`Experiment scenarios fetched: ${root}`);
            return grouped;
        }

        console.log(`Experiment scenarios not found: ${scenariosId}`);
        return [];
    } catch (error) {
        console.error(`Error fetching experiment scenarios (${scenariosId}):`, error);
        return [];
    }
}

export const saveExperimentScenarios = async (scenariosData, scenariosId = 'experiment') => {
    const toOrderId = (order) => {
        if (typeof order === 'string') return order.trim();
        return String(order?.id ?? '').trim();
    };
    const sanitizedScenarios = (scenariosData || []).map((scenario = {}) => ({
        round: Number(scenario.round) || 1,
        phase: scenario.phase ?? '',
        scenario_id: scenario.scenario_id ?? '',
        max_bundle: Number(scenario.max_bundle) || 3,
        order_ids: (
            Array.isArray(scenario.order_ids)
                ? scenario.order_ids
                : (scenario.orders || [])
        )
            .map((order) => toOrderId(order))
            .filter((id) => id.length > 0)
    }));
    try {
        const { root, entry } = await readDatasetEntry(scenariosId);
        const next = {
            type: 'scenario_dataset',
            version: 1,
            ...(entry && typeof entry === 'object' ? entry : {}),
            scenarios: sanitizedScenarios
        };
        await writeDatasetEntry(root, next);
        console.log(`Experiment scenarios saved: ${root}`);
        return true;
    } catch (error) {
        console.error(`Error saving experiment scenarios (${scenariosId}):`, error);
        throw error;
    }
}

// Tutorial Configuration
function sanitizeTutorialConfig(configData = {}) {
    const next = { ...(configData || {}) };
    delete next.timeLimit;
    delete next.updatedAt;
    return next;
}

export const getTutorialConfig = async () => {
    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', 'tutorialConfig'));
        if (docSnap.exists()) {
            console.log('Tutorial config fetched');
            return sanitizeTutorialConfig(docSnap.data());
        } else {
            console.log('Tutorial config not found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching tutorial config:', error);
        return null;
    }
}

export const saveTutorialConfig = async (configData) => {
    try {
        const docRef = doc(firestore, 'MasterData', 'tutorialConfig');
        const payload = sanitizeTutorialConfig(configData);
        await setDoc(docRef, {
            ...payload,
            updatedAt: Timestamp.fromDate(new Date())
        });
        console.log('Tutorial config saved');
        return true;
    } catch (error) {
        console.error('Error saving tutorial config:', error);
        throw error;
    }
}

// Orders Data
export const getOrdersData = async (ordersId = 'experiment') => {
    try {
        const { root, entry } = await readDatasetEntry(ordersId);
        const grouped = entry?.orders || [];
        if (Array.isArray(grouped)) {
            console.log(`Orders fetched: ${root}`);
            return grouped;
        }

        console.log(`Orders ${ordersId} not found`);
        return [];
    } catch (error) {
        console.error(`Error fetching orders ${ordersId}:`, error);
        return [];
    }
}

export const saveOrdersData = async (ordersData, ordersId = 'experiment') => {
    const sanitizedOrders = sanitizeOrders(ordersData);
    try {
        const { root, entry } = await readDatasetEntry(ordersId);
        const next = {
            type: 'scenario_dataset',
            version: 1,
            ...(entry && typeof entry === 'object' ? entry : {}),
            orders: sanitizedOrders
        };
        await writeDatasetEntry(root, next);
        console.log(`Orders saved: ${root}`);
        return true;
    } catch (error) {
        console.error(`Error saving orders ${ordersId}:`, error);
        throw error;
    }
}

// Grouped Scenario Dataset (single-doc structure)
export const saveScenarioDatasetBundle = async (
    datasetRoot,
    payload = { scenarios: [], orders: [], optimal: [], metadata: {} }
) => {
    const id = resolveDatasetRootFromId(datasetRoot);
    if (!id) throw new Error('Invalid datasetRoot');
    const scenarios = Array.isArray(payload?.scenarios) ? payload.scenarios : [];
    const orders = sanitizeOrders(Array.isArray(payload?.orders) ? payload.orders : []);
    const optimal = Array.isArray(payload?.optimal) ? payload.optimal : [];
    const metadata = payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};

    try {
        await writeDatasetEntry(id, {
            type: 'scenario_dataset',
            version: 1,
            scenarios,
            orders,
            optimal,
            metadata
        });
        console.log(`Grouped scenario dataset saved: ${id}`);
        return true;
    } catch (error) {
        console.error(`Error saving grouped scenario dataset (${id}):`, error);
        throw error;
    }
}

export const getScenarioDatasetBundle = async (datasetRoot = 'experiment') => {
    try {
        const { root: id, entry: data } = await readDatasetEntry(datasetRoot);
        if (!data) return null;
        return {
            scenarios: Array.isArray(data.scenarios) ? data.scenarios : [],
            orders: Array.isArray(data.orders) ? data.orders : [],
            optimal: Array.isArray(data.optimal) ? data.optimal : [],
            metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
            type: data.type ?? '',
            version: data.version ?? 1
        };
    } catch (error) {
        console.error(`Error fetching grouped scenario dataset (${datasetRoot}):`, error);
        return null;
    }
}

function sanitizeOrders(ordersData = []) {
    return (ordersData || []).map((order = {}) => ({
        id: order.id ?? '',
        city: order.city ?? '',
        store: order.store ?? '',
        earnings: Number(order.earnings) || 0,
        items: order.items || {},
        estimatedTime: Number(order.estimatedTime) || 0,
        localTravelTime: Number(order.localTravelTime) || 0
    }));
}

export const getScenarioDatasetNames = async () => {
    try {
        const snap = await getDoc(doc(firestore, 'MasterData', DATASETS_DOC_ID));
        if (!snap.exists()) return [];
        const datasets = getDatasetsMap(snap.data() || {});
        return Object.entries(datasets)
            .filter(([, value]) => value && typeof value === 'object' && value.type === 'scenario_dataset')
            .map(([key]) => key)
            .sort();
    } catch (error) {
        console.error('Error fetching scenario dataset names:', error);
        return [];
    }
}

export const deleteScenarioDatasetBundle = async (datasetRoot = 'experiment') => {
    const id = resolveDatasetRootFromId(datasetRoot);
    if (!id) throw new Error('Invalid datasetRoot');

    try {
        const datasetsRef = doc(firestore, 'MasterData', DATASETS_DOC_ID);
        await updateDoc(datasetsRef, {
            [`datasets.${id}`]: deleteField()
        });
        console.log(`Grouped scenario dataset deleted: ${id}`);
        return true;
    } catch (error) {
        console.error(`Error deleting grouped scenario dataset (${id}):`, error);
        throw error;
    }
}

// Stores Data
export const getStoresData = async (storesId = 'store') => {
    const decodeStore = (store) => {
        const locations = Array.isArray(store?.locations)
            ? store.locations.map((row) => {
                if (Array.isArray(row)) return row;
                if (row && Array.isArray(row.cells)) return row.cells;
                return [];
            })
            : [];
        return { ...store, locations };
    };

    const decodeStoresPayload = (payload) => {
        if (!payload) return payload;
        const stores = Array.isArray(payload.stores) ? payload.stores.map(decodeStore) : [];
        return { ...payload, stores };
    };

    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', storesId));
        if (docSnap.exists()) {
            console.log(`Stores ${storesId} fetched`);
            const data = decodeStoresPayload(docSnap.data() || {});
            if (Array.isArray(data)) {
                return { stores: data };
            }
            if (Array.isArray(data.stores)) {
                return data;
            }
            return { stores: [] };
        } else {
            console.log(`Stores ${storesId} not found`);
            return null;
        }
    } catch (error) {
        if (error?.code === 'permission-denied') {
            console.warn(`Stores ${storesId} read blocked by Firestore rules.`);
        } else {
            console.error(`Error fetching stores ${storesId}:`, error);
        }
        return null;
    }
}

// Cities Data
export const getCitiesData = async (citiesId = 'cities') => {
    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', citiesId));
        if (docSnap.exists()) {
            console.log(`Cities ${citiesId} fetched`);
            const data = docSnap.data() || {};
            return {
                startinglocation: data.startinglocation ?? '',
                travelTimes: data.travelTimes ?? {}
            };
        } else {
            console.log(`Cities ${citiesId} not found`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching cities ${citiesId}:`, error);
        return null;
    }
}

export const saveCitiesData = async (citiesData, citiesId = 'cities') => {
    try {
        const docRef = doc(firestore, 'MasterData', citiesId);
        await setDoc(docRef, {
            startinglocation: citiesData?.startinglocation ?? '',
            travelTimes: citiesData?.travelTimes ?? {}
        });
        console.log(`Cities ${citiesId} saved`);
        return true;
    } catch (error) {
        console.error(`Error saving cities ${citiesId}:`, error);
        throw error;
    }
}

export const saveStoresData = async (storesData, storesId = 'store') => {
    const encodeStore = (store) => {
        const locations = Array.isArray(store?.locations)
            ? store.locations.map((row) => ({ cells: Array.isArray(row) ? row : [] }))
            : [];
        return { ...store, locations };
    };

    const encodeStoresPayload = (payload) => {
        const stores = Array.isArray(payload?.stores) ? payload.stores.map(encodeStore) : [];
        return { ...payload, stores };
    };

    try {
        const docRef = doc(firestore, 'MasterData', storesId);
        const payload = Array.isArray(storesData) ? { stores: storesData } : storesData;
        const encodedPayload = encodeStoresPayload(payload);
        await setDoc(docRef, {
            ...encodedPayload
        });
        console.log(`Stores ${storesId} saved`);
        return true;
    } catch (error) {
        console.error(`Error saving stores ${storesId}:`, error);
        throw error;
    }
}

// Emojis Data
export const getEmojisData = async () => {
    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', 'emojis'));
        if (docSnap.exists()) {
            console.log('Emojis fetched');
            return docSnap.data().emojis || {};
        } else {
            console.log('Emojis not found');
            return {};
        }
    } catch (error) {
        console.error('Error fetching emojis:', error);
        return {};
    }
}

export const saveEmojisData = async (emojisData) => {
    try {
        const docRef = doc(firestore, 'MasterData', 'emojis');
        await setDoc(docRef, {
            emojis: emojisData,
            updatedAt: Timestamp.fromDate(new Date())
        });
        console.log('Emojis saved');
        return true;
    } catch (error) {
        console.error('Error saving emojis:', error);
        throw error;
    }
}
