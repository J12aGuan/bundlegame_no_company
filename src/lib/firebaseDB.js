import {firestore} from './firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, Timestamp, deleteField, query, where, onSnapshot } from "firebase/firestore";
import { generateAuthToken } from './authToken';

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
    const now = Timestamp.fromDate(new Date());

    try {
        const existingUser = await getDoc(userDocRef);
        if (existingUser.exists()) {
            const existingData = existingUser.data() || {};
            await setDoc(userDocRef, {
                configuration: deleteField(),
                createdAt: existingData.createdAt || now,
                updatedAt: now
            }, { merge: true });
        } else {
            await setDoc(userDocRef, {
                createdAt: now,
                updatedAt: now
            }, { merge: true });
        }
        console.log("Document written with ID: ", id);
    } catch (error) {
        console.error("Error adding document: ", error);
    }

    return id
}

async function touchUserUpdatedAt(id) {
    const normalizedId = String(id ?? '').trim();
    if (!normalizedId) return;
    try {
        await setDoc(doc(collection(firestore, 'Users'), normalizedId), {
            updatedAt: Timestamp.fromDate(new Date())
        }, { merge: true });
    } catch (error) {
        console.warn("Unable to touch user updatedAt:", error);
    }
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

function getLiveSessionsCollectionRef() {
    return collection(firestore, 'LiveSessions');
}

function getLiveSessionRef(sessionId) {
    return doc(getLiveSessionsCollectionRef(), String(sessionId ?? '').trim());
}

function getLiveSessionParticipantsCollectionRef(sessionId) {
    return collection(firestore, 'LiveSessions', String(sessionId ?? '').trim(), 'participants');
}

function getLiveSessionParticipantRef(sessionId, participantId) {
    return doc(getLiveSessionParticipantsCollectionRef(sessionId), String(participantId ?? '').trim());
}

function normalizeIsoString(value = '') {
    const normalized = String(value ?? '').trim();
    if (!normalized) return '';
    const millis = Date.parse(normalized);
    return Number.isFinite(millis) ? new Date(millis).toISOString() : '';
}

function toIsoMillis(value = '') {
    const normalized = normalizeIsoString(value);
    if (!normalized) return 0;
    const millis = Date.parse(normalized);
    return Number.isFinite(millis) ? millis : 0;
}

function createSessionLabel(date = new Date()) {
    const safeDate = date instanceof Date ? date : new Date();
    return `Class Session ${safeDate.toLocaleString()}`;
}

function normalizeLiveSession(docId = '', data = {}) {
    const source = data && typeof data === 'object' ? data : {};
    return removeUndefinedDeep({
        sessionId: String(source?.sessionId ?? docId ?? '').trim(),
        label: String(source?.label ?? '').trim(),
        status: String(source?.status ?? '').trim() || 'ended',
        startedAt: normalizeIsoString(source?.startedAt),
        endedAt: normalizeIsoString(source?.endedAt),
        plannedDurationMinutes: Math.max(0, Number(source?.plannedDurationMinutes) || 0),
        scenarioSetVersionId: String(source?.scenarioSetVersionId ?? '').trim(),
        scenarioSetName: String(source?.scenarioSetName ?? '').trim()
    });
}

function normalizeLiveSessionParticipant(participantId = '', data = {}) {
    const source = data && typeof data === 'object' ? data : {};
    const status = String(source?.status ?? '').trim() || 'joined';
    return removeUndefinedDeep({
        participantId: String(source?.participantId ?? participantId ?? '').trim(),
        displayName: String(source?.displayName ?? source?.participantId ?? participantId ?? '').trim(),
        earnings: Math.max(0, Number(source?.earnings) || 0),
        roundsCompleted: Math.max(0, Number(source?.roundsCompleted) || 0),
        optimalChoices: Math.max(0, Number(source?.optimalChoices) || 0),
        totalGameTime: Math.max(0, Number(source?.totalGameTime) || 0),
        completedGame: Boolean(source?.completedGame),
        status,
        joinedAt: normalizeIsoString(source?.joinedAt),
        lastActivityAt: normalizeIsoString(source?.lastActivityAt),
        finalizedAt: normalizeIsoString(source?.finalizedAt)
    });
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
    const nextSummary = normalizeTimeSummary(nextEntry?.timeSummary);
    return {
        totalTimeSeconds: Math.max(
            0,
            Number(nextEntry?.totalTimeSeconds) || 0,
            sumTimeSummary(nextSummary)
        ),
        timeSummary: nextSummary,
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

function normalizeCompletionMeta(meta = {}) {
    const existing = meta && typeof meta === 'object' ? meta : {};
    return removeUndefinedDeep({
        finalSaveStatus: String(existing?.finalSaveStatus ?? '').trim(),
        finalSaveConfirmedAt: String(existing?.finalSaveConfirmedAt ?? '').trim(),
        finalSaveAttemptCount: Math.max(0, Number(existing?.finalSaveAttemptCount) || 0),
        handoffPostedAt: String(existing?.handoffPostedAt ?? '').trim(),
        copyVerificationMethod: String(existing?.copyVerificationMethod ?? '').trim(),
        copyVerificationAt: String(existing?.copyVerificationAt ?? '').trim(),
        lastSaveError: String(existing?.lastSaveError ?? '').trim()
    });
}

function mergeCompletionMeta(existingMeta = {}, nextMeta = {}) {
    const existing = normalizeCompletionMeta(existingMeta);
    const next = normalizeCompletionMeta(nextMeta);
    return removeUndefinedDeep({
        finalSaveStatus: String(next.finalSaveStatus || existing.finalSaveStatus || '').trim(),
        finalSaveConfirmedAt: String(next.finalSaveConfirmedAt || existing.finalSaveConfirmedAt || '').trim(),
        finalSaveAttemptCount: Math.max(
            0,
            Number(next.finalSaveAttemptCount) || Number(existing.finalSaveAttemptCount) || 0
        ),
        handoffPostedAt: String(next.handoffPostedAt || existing.handoffPostedAt || '').trim(),
        copyVerificationMethod: String(next.copyVerificationMethod || existing.copyVerificationMethod || '').trim(),
        copyVerificationAt: String(next.copyVerificationAt || existing.copyVerificationAt || '').trim(),
        lastSaveError: String(next.lastSaveError || existing.lastSaveError || '').trim()
    });
}

function resolveSummaryNumber(nextValue, existingValue) {
    if (nextValue !== undefined && nextValue !== null) {
        return Math.max(0, Number(nextValue) || 0);
    }
    return Math.max(0, Number(existingValue) || 0);
}

function mergeScenarioSummaryEntry(existingEntry = {}, nextEntry = {}) {
    return removeUndefinedDeep({
        scenarioSetName: String(nextEntry?.scenarioSetName ?? existingEntry?.scenarioSetName ?? '').trim(),
        totalRounds: resolveSummaryNumber(nextEntry?.totalRounds, existingEntry?.totalRounds),
        roundsCompleted: resolveSummaryNumber(nextEntry?.roundsCompleted, existingEntry?.roundsCompleted),
        optimalChoices: resolveSummaryNumber(nextEntry?.optimalChoices, existingEntry?.optimalChoices),
        totalGameTime: resolveSummaryNumber(nextEntry?.totalGameTime, existingEntry?.totalGameTime),
        completedGame: nextEntry?.completedGame !== undefined ? Boolean(nextEntry?.completedGame) : Boolean(existingEntry?.completedGame),
        earnings: resolveSummaryNumber(nextEntry?.earnings, existingEntry?.earnings),
        resultAccessKey: String(existingEntry?.resultAccessKey ?? nextEntry?.resultAccessKey ?? '').trim(),
        liveSessionId: String(nextEntry?.liveSessionId ?? existingEntry?.liveSessionId ?? '').trim(),
        sessionStartedAt: normalizeIsoString(nextEntry?.sessionStartedAt || existingEntry?.sessionStartedAt || ''),
        lastActivityAt: normalizeIsoString(nextEntry?.lastActivityAt || existingEntry?.lastActivityAt || ''),
        sessionLabel: String(nextEntry?.sessionLabel ?? existingEntry?.sessionLabel ?? '').trim(),
        completionMeta: mergeCompletionMeta(existingEntry?.completionMeta, nextEntry?.completionMeta)
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
            resultAccessKey: String(existingEntry?.resultAccessKey ?? resultAccessKey).trim(),
            liveSessionId: String(progress?.liveSessionId ?? existingEntry?.liveSessionId ?? '').trim(),
            sessionStartedAt: normalizeIsoString(progress?.sessionStartedAt || existingEntry?.sessionStartedAt || ''),
            lastActivityAt: normalizeIsoString(progress?.lastActivityAt || existingEntry?.lastActivityAt || ''),
            sessionLabel: String(progress?.sessionLabel ?? existingEntry?.sessionLabel ?? '').trim(),
            completionMeta: progress?.completionMeta || existingEntry?.completionMeta || {}
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
            resultAccessKey,
            liveSessionId: String(progress?.liveSessionId ?? existingEntry?.liveSessionId ?? '').trim(),
            sessionStartedAt: normalizeIsoString(progress?.sessionStartedAt || existingEntry?.sessionStartedAt || ''),
            lastActivityAt: normalizeIsoString(progress?.lastActivityAt || existingEntry?.lastActivityAt || ''),
            sessionLabel: String(progress?.sessionLabel ?? existingEntry?.sessionLabel ?? '').trim(),
            completionMeta: progress?.completionMeta || existingEntry?.completionMeta || {}
        });

        await setDoc(summaryRef, {
            summaryByScenarioSetVersionId: {
                ...existingMap,
                [scenarioSetVersionId]: entry
            }
        });
        await touchUserUpdatedAt(id);
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
            currentLocation: String(progress?.currentLocation ?? existingEntry?.currentLocation ?? '').trim(),
            roundsCompleted: Math.max(0, Number(progress?.roundsCompleted ?? existingEntry?.roundsCompleted) || 0),
            optimalChoices: Math.max(0, Number(progress?.optimalChoices ?? existingEntry?.optimalChoices) || 0),
            totalGameTime: Math.max(0, Number(progress?.totalGameTime ?? existingEntry?.totalGameTime) || 0),
            earnings: Math.max(0, Number(progress?.earnings ?? existingEntry?.earnings) || 0),
            liveSessionId: String(progress?.liveSessionId ?? existingEntry?.liveSessionId ?? '').trim(),
            sessionStartedAt: normalizeIsoString(progress?.sessionStartedAt || existingEntry?.sessionStartedAt || ''),
            lastActivityAt: normalizeIsoString(progress?.lastActivityAt || existingEntry?.lastActivityAt || ''),
            sessionLabel: String(progress?.sessionLabel ?? existingEntry?.sessionLabel ?? '').trim()
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

//returns 0 on error and 1 on success
export const authenticateUser = async (id, token) => {
    const normalizedId = String(id ?? '').trim();
    const normalizedToken = String(token ?? '').trim();
    if (!normalizedId || !normalizedToken) {
        return 0;
    }

    // Preserve legacy admin overrides stored by user id.
    const legacyAuthRef = doc(collection(firestore, 'Auth'), normalizedId);
    const legacyAuthSnap = await getDoc(legacyAuthRef);
    if (legacyAuthSnap.exists() && legacyAuthSnap.data().status == 2) {
        return 1;
    }

    const tokenAuthRef = doc(collection(firestore, 'Auth'), normalizedToken);
    const tokenAuthSnap = await getDoc(tokenAuthRef);
    if (tokenAuthSnap.exists()) {
        const tokenAuthData = tokenAuthSnap.data() || {};
        if (String(tokenAuthData.userid ?? '').trim() === normalizedId) {
            return 1;
        }
    }

    const generatedToken = generateAuthToken(normalizedId);
    if (generatedToken !== normalizedToken) {
        return 0;
    }

    const data = {
        userid: normalizedId,
        status: 1
    };

    try {
        await setDoc(tokenAuthRef, data, { merge: true });
    } catch (error) {
        console.error("Error adding document: ", error);
    }

    return 1;
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

async function listActiveLiveSessions() {
    const activeQuery = query(getLiveSessionsCollectionRef(), where('status', '==', 'active'));
    const snap = await getDocs(activeQuery);
    return snap.docs
        .map((sessionDoc) => normalizeLiveSession(sessionDoc.id, sessionDoc.data()))
        .filter((session) => session.sessionId);
}

function pickLatestLiveSession(sessions = []) {
    const normalizedSessions = Array.isArray(sessions) ? sessions.filter((session) => session?.sessionId) : [];
    if (normalizedSessions.length === 0) return null;
    return [...normalizedSessions].sort((left, right) => {
        const startedDiff = toIsoMillis(right?.startedAt) - toIsoMillis(left?.startedAt);
        if (startedDiff !== 0) return startedDiff;
        return String(left?.sessionId ?? '').localeCompare(String(right?.sessionId ?? ''));
    })[0];
}

async function settleActiveLiveSessions() {
    const activeSessions = await listActiveLiveSessions();
    const latestSession = pickLatestLiveSession(activeSessions);
    if (!latestSession?.sessionId) return null;

    await Promise.all(
        activeSessions
            .filter((session) => session.sessionId && session.sessionId !== latestSession.sessionId)
            .map((session) =>
                setDoc(
                    getLiveSessionRef(session.sessionId),
                    {
                        status: 'ended',
                        endedAt: latestSession.startedAt || new Date().toISOString()
                    },
                    { merge: true }
                )
            )
    );

    return latestSession;
}

export const getActiveLiveSession = async () => {
    try {
        return await settleActiveLiveSessions();
    } catch (error) {
        console.error('Error fetching active live session:', error);
        return null;
    }
};

export const startLiveSession = async (payload = {}) => {
    const nowIso = new Date().toISOString();
    const label = String(payload?.label ?? '').trim() || createSessionLabel(new Date(nowIso));
    const scenarioSetVersionId = String(payload?.scenarioSetVersionId ?? '').trim();
    const scenarioSetName = String(payload?.scenarioSetName ?? '').trim();

    try {
        const activeSessions = await listActiveLiveSessions();
        await Promise.all(
            activeSessions.map((session) =>
                setDoc(
                    getLiveSessionRef(session.sessionId),
                    {
                        status: 'ended',
                        endedAt: nowIso
                    },
                    { merge: true }
                )
            )
        );

        const sessionRef = doc(getLiveSessionsCollectionRef());
        const nextSession = normalizeLiveSession(sessionRef.id, {
            sessionId: sessionRef.id,
            label,
            status: 'active',
            startedAt: nowIso,
            endedAt: '',
            plannedDurationMinutes: 20,
            scenarioSetVersionId,
            scenarioSetName
        });

        await setDoc(sessionRef, nextSession);
        return (await settleActiveLiveSessions()) || nextSession;
    } catch (error) {
        console.error('Error starting live session:', error);
        throw error;
    }
};

export const endLiveSession = async (sessionId = '') => {
    const targetId = String(sessionId ?? '').trim();
    const nowIso = new Date().toISOString();

    try {
        let targetSession = null;
        if (targetId) {
            const snap = await getDoc(getLiveSessionRef(targetId));
            if (snap.exists()) {
                targetSession = normalizeLiveSession(snap.id, snap.data());
            }
        } else {
            targetSession = await getActiveLiveSession();
        }
        if (!targetSession?.sessionId) return null;

        await setDoc(
            getLiveSessionRef(targetSession.sessionId),
            {
                status: 'ended',
                endedAt: nowIso
            },
            { merge: true }
        );

        return {
            ...targetSession,
            status: 'ended',
            endedAt: nowIso
        };
    } catch (error) {
        console.error('Error ending live session:', error);
        throw error;
    }
};

export const upsertLiveSessionParticipant = async (sessionId, participantId, payload = {}) => {
    const normalizedSessionId = String(sessionId ?? '').trim();
    const normalizedParticipantId = String(participantId ?? '').trim();
    if (!normalizedSessionId || !normalizedParticipantId) return null;

    try {
        const participantRef = getLiveSessionParticipantRef(normalizedSessionId, normalizedParticipantId);
        const snap = await getDoc(participantRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const nowIso = new Date().toISOString();
        const entry = normalizeLiveSessionParticipant(normalizedParticipantId, {
            ...existing,
            ...payload,
            participantId: normalizedParticipantId,
            displayName: String(payload?.displayName ?? existing?.displayName ?? normalizedParticipantId).trim(),
            joinedAt: existing?.joinedAt || payload?.joinedAt || nowIso,
            lastActivityAt: payload?.lastActivityAt || existing?.lastActivityAt || nowIso,
            finalizedAt: payload?.finalizedAt || existing?.finalizedAt || ''
        });

        await setDoc(participantRef, entry, { merge: true });
        return entry;
    } catch (error) {
        console.error('Error updating live session participant:', error);
        return null;
    }
};

export const subscribeToActiveLiveSession = (callback) => {
    const activeQuery = query(getLiveSessionsCollectionRef(), where('status', '==', 'active'));
    return onSnapshot(
        activeQuery,
        (snap) => {
            if (typeof callback !== 'function') return;
            const sessions = snap.docs
                .map((sessionDoc) => normalizeLiveSession(sessionDoc.id, sessionDoc.data()))
                .filter((session) => session.sessionId);
            callback(pickLatestLiveSession(sessions));
        },
        (error) => {
            console.error('Active live session subscription failed:', error);
            if (typeof callback === 'function') {
                callback(null, error);
            }
        }
    );
};

export const subscribeToLiveSessionParticipants = (sessionId, callback) => {
    const normalizedSessionId = String(sessionId ?? '').trim();
    if (!normalizedSessionId || typeof callback !== 'function') {
        return () => {};
    }

    return onSnapshot(
        getLiveSessionParticipantsCollectionRef(normalizedSessionId),
        (snap) => {
            const participants = snap.docs.map((participantDoc) =>
                normalizeLiveSessionParticipant(participantDoc.id, participantDoc.data())
            );
            callback(participants);
        },
        (error) => {
            console.error('Live session participants subscription failed:', error);
            callback([], error);
        }
    );
};

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
