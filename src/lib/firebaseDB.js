import {firestore} from './firebaseConfig';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, Timestamp, deleteField, query, where, onSnapshot } from "firebase/firestore";
import { generateAuthToken } from './authToken';
import {
    DEFAULT_ACTION_MASK_VERSION,
    mergeResearchStudyState,
    normalizeRankedBundles,
    normalizeResearchModel,
    normalizeResearchStudyProtocol,
    normalizeResearchStudyState,
    normalizeResearchStudySurveyResponse
} from './researchStudy.js';
import { normalizeQualtricsResponseDocument } from './qualtrics.js';

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

function getRoundActionsCollectionRef(id) {
    return collection(firestore, 'Users', String(id ?? '').trim(), 'Actions');
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

function getResearchJobsCollectionRef() {
    return collection(firestore, 'ResearchJobs');
}

function getResearchJobRef(jobId) {
    return doc(getResearchJobsCollectionRef(), String(jobId ?? '').trim());
}

function getResearchSnapshotsCollectionRef() {
    return collection(firestore, 'ResearchSnapshots');
}

function getResearchSnapshotRef(snapshotId) {
    return doc(getResearchSnapshotsCollectionRef(), String(snapshotId ?? '').trim());
}

function getResearchProtocolsCollectionRef() {
    return collection(firestore, 'ResearchProtocols');
}

function getResearchProtocolRef(protocolId) {
    return doc(getResearchProtocolsCollectionRef(), String(protocolId ?? '').trim());
}

function getResearchModelsCollectionRef() {
    return collection(firestore, 'ResearchModels');
}

function getResearchModelRef(modelId) {
    return doc(getResearchModelsCollectionRef(), String(modelId ?? '').trim());
}

function getQualtricsResponsesCollectionRef() {
    return collection(firestore, 'QualtricsResponses');
}

function getQualtricsResponseRef(responseId) {
    return doc(getQualtricsResponsesCollectionRef(), String(responseId ?? '').trim());
}

function getQualtricsSyncRunsCollectionRef() {
    return collection(firestore, 'QualtricsSyncRuns');
}

function getQualtricsSyncRunRef(runId) {
    return doc(getQualtricsSyncRunsCollectionRef(), String(runId ?? '').trim());
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

function normalizeIdList(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(
        value
            .map((entry) => String(entry ?? '').trim())
            .filter(Boolean)
    )];
}

function buildRoundSummaryActionId(scenarioSetVersionId = '', roundIndex = 0) {
    const version = String(scenarioSetVersionId ?? '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const round = Math.max(0, Number(roundIndex) || 0);
    return `${version || 'dataset'}__round_${round}`;
}

function normalizeRoundSummaryAction(existing = {}, payload = {}) {
    const stateSnapshot = payload?.state_snapshot && typeof payload.state_snapshot === 'object'
        ? removeUndefinedDeep(payload.state_snapshot)
        : undefined;
    const outcomeSnapshot = payload?.outcome_snapshot && typeof payload.outcome_snapshot === 'object'
        ? removeUndefinedDeep(payload.outcome_snapshot)
        : undefined;
    const preState = payload?.pre_state && typeof payload.pre_state === 'object'
        ? removeUndefinedDeep(payload.pre_state)
        : undefined;
    const postState = payload?.post_state && typeof payload.post_state === 'object'
        ? removeUndefinedDeep(payload.post_state)
        : undefined;
    return removeUndefinedDeep({
        type: 'round_summary',
        scenarioSetVersionId: String(payload?.scenarioSetVersionId ?? existing?.scenarioSetVersionId ?? '').trim(),
        round_index: Math.max(1, Number(payload?.round_index ?? existing?.round_index) || 1),
        scenario_id: String(payload?.scenario_id ?? existing?.scenario_id ?? '').trim(),
        phase: String(payload?.phase ?? existing?.phase ?? '').trim(),
        classification: String(payload?.classification ?? existing?.classification ?? '').trim(),
        study_protocol_id: String(payload?.study_protocol_id ?? existing?.study_protocol_id ?? '').trim(),
        policy_arm: String(payload?.policy_arm ?? existing?.policy_arm ?? '').trim(),
        policy_name: String(payload?.policy_name ?? existing?.policy_name ?? '').trim(),
        policy_version: String(payload?.policy_version ?? existing?.policy_version ?? '').trim(),
        dataset_snapshot_id: String(payload?.dataset_snapshot_id ?? existing?.dataset_snapshot_id ?? '').trim(),
        legal_action_mask_version: String(
            payload?.legal_action_mask_version ?? existing?.legal_action_mask_version ?? DEFAULT_ACTION_MASK_VERSION
        ).trim(),
        recommendation_source: String(payload?.recommendation_source ?? existing?.recommendation_source ?? '').trim(),
        current_city: String(payload?.current_city ?? existing?.current_city ?? '').trim(),
        final_location: String(payload?.final_location ?? existing?.final_location ?? '').trim(),
        chosen_orders: normalizeIdList(payload?.chosen_orders ?? existing?.chosen_orders),
        shown_recommendation_bundle_ids: normalizeIdList(
            payload?.shown_recommendation_bundle_ids ?? existing?.shown_recommendation_bundle_ids
        ),
        shown_ranked_bundles: normalizeRankedBundles(
            payload?.shown_ranked_bundles ?? existing?.shown_ranked_bundles
        ),
        scenario_order_ids: normalizeIdList(payload?.scenario_order_ids ?? existing?.scenario_order_ids),
        best_bundle_ids: normalizeIdList(payload?.best_bundle_ids ?? existing?.best_bundle_ids),
        recommendation_quality: String(payload?.recommendation_quality ?? existing?.recommendation_quality ?? '').trim(),
        success: Boolean(payload?.success ?? existing?.success),
        duration: Math.max(0, Number(payload?.duration ?? existing?.duration) || 0),
        earnings: Math.max(0, Number(payload?.earnings ?? existing?.earnings) || 0),
        reward: Number(payload?.reward ?? existing?.reward) || 0,
        trust_rating: Number(payload?.trust_rating ?? existing?.trust_rating) || 0,
        usefulness_rating: Number(payload?.usefulness_rating ?? existing?.usefulness_rating) || 0,
        workload_rating: Number(payload?.workload_rating ?? existing?.workload_rating) || 0,
        liveSessionId: String(payload?.liveSessionId ?? existing?.liveSessionId ?? '').trim(),
        decision_timestamp: normalizeIsoString(
            payload?.decision_timestamp || existing?.decision_timestamp || new Date().toISOString()
        ),
        pre_state: preState ?? existing?.pre_state,
        post_state: postState ?? existing?.post_state,
        state_snapshot: stateSnapshot ?? existing?.state_snapshot,
        outcome_snapshot: outcomeSnapshot ?? existing?.outcome_snapshot
    });
}

function normalizeResearchJob(docId = '', payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return removeUndefinedDeep({
        job_id: String(source?.job_id ?? docId ?? '').trim(),
        job_type: String(source?.job_type ?? '').trim(),
        dataset_snapshot_id: String(source?.dataset_snapshot_id ?? '').trim(),
        algorithm: String(source?.algorithm ?? '').trim(),
        config: source?.config && typeof source.config === 'object' ? removeUndefinedDeep(source.config) : {},
        status: String(source?.status ?? '').trim() || 'queued',
        started_at: normalizeIsoString(source?.started_at || ''),
        ended_at: normalizeIsoString(source?.ended_at || ''),
        created_at: normalizeIsoString(source?.created_at || new Date().toISOString()),
        updated_at: normalizeIsoString(source?.updated_at || new Date().toISOString()),
        metrics: source?.metrics && typeof source.metrics === 'object' ? removeUndefinedDeep(source.metrics) : {},
        artifact_uris: Array.isArray(source?.artifact_uris)
            ? source.artifact_uris.map((entry) => String(entry ?? '').trim()).filter(Boolean)
            : [],
        error_summary: String(source?.error_summary ?? '').trim()
    });
}

function normalizeResearchSnapshot(docId = '', payload = {}) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return removeUndefinedDeep({
        snapshot_id: String(source?.snapshot_id ?? docId ?? '').trim(),
        dataset_root: String(source?.dataset_root ?? '').trim(),
        dataset_version: String(source?.dataset_version ?? '').trim(),
        feature_version: String(source?.feature_version ?? '').trim(),
        created_at: normalizeIsoString(source?.created_at || new Date().toISOString()),
        benchmark_only_dataset: Boolean(source?.benchmark_only_dataset),
        source_type: String(source?.source_type ?? '').trim(),
        source_descriptor: source?.source_descriptor && typeof source.source_descriptor === 'object'
            ? removeUndefinedDeep(source.source_descriptor)
            : {},
        job_runnable: source?.job_runnable !== undefined ? Boolean(source?.job_runnable) : true,
        worker_notes: Array.isArray(source?.worker_notes)
            ? source.worker_notes.map((entry) => String(entry ?? '').trim()).filter(Boolean)
            : [],
        split_manifest: source?.split_manifest && typeof source.split_manifest === 'object'
            ? removeUndefinedDeep(source.split_manifest)
            : {},
        qa_report: source?.qa_report && typeof source.qa_report === 'object'
            ? removeUndefinedDeep(source.qa_report)
            : {},
        analysis_outputs: source?.analysis_outputs && typeof source.analysis_outputs === 'object'
            ? removeUndefinedDeep(source.analysis_outputs)
            : {}
    });
}

function normalizeResearchProtocol(docId = '', payload = {}) {
    const normalized = normalizeResearchStudyProtocol(payload, {
        protocol_id: String(docId ?? '').trim()
    });
    return removeUndefinedDeep({
        ...normalized,
        protocol_id: String(normalized?.protocol_id ?? docId ?? '').trim(),
        created_at: normalizeIsoString(normalized?.created_at || new Date().toISOString()),
        updated_at: normalizeIsoString(normalized?.updated_at || new Date().toISOString())
    });
}

function normalizeResearchModelDoc(docId = '', payload = {}) {
    const normalized = normalizeResearchModel({
        ...(payload && typeof payload === 'object' ? payload : {}),
        model_id: String(payload?.model_id ?? docId ?? '').trim()
    });
    return removeUndefinedDeep({
        ...normalized,
        model_id: String(normalized?.model_id ?? docId ?? '').trim(),
        created_at: normalizeIsoString(normalized?.created_at || new Date().toISOString()),
        updated_at: normalizeIsoString(normalized?.updated_at || new Date().toISOString())
    });
}

function resolveSummaryNumber(nextValue, existingValue) {
    if (nextValue !== undefined && nextValue !== null) {
        return Math.max(0, Number(nextValue) || 0);
    }
    return Math.max(0, Number(existingValue) || 0);
}

function mergeScenarioSummaryEntry(existingEntry = {}, nextEntry = {}) {
    const mergedResearchStudy = mergeResearchStudyState(
        existingEntry?.researchStudy || {},
        nextEntry?.researchStudy || {}
    );
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
        completionMeta: mergeCompletionMeta(existingEntry?.completionMeta, nextEntry?.completionMeta),
        researchStudy: mergedResearchStudy
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
        const mergedResearchStudy = mergeResearchStudyState(
            existingEntry?.researchStudy || {},
            progress?.researchStudy || {}
        );
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
            sessionLabel: String(progress?.sessionLabel ?? existingEntry?.sessionLabel ?? '').trim(),
            researchStudy: mergedResearchStudy
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

export const saveRoundSummaryAction = async (id, payload = {}) => {
    const normalizedId = String(id ?? '').trim();
    const scenarioSetVersionId = String(payload?.scenarioSetVersionId ?? '').trim();
    const roundIndex = Math.max(1, Number(payload?.round_index) || 0);
    if (!normalizedId || !scenarioSetVersionId || !roundIndex) return null;

    try {
        const actionRef = doc(
            getRoundActionsCollectionRef(normalizedId),
            buildRoundSummaryActionId(scenarioSetVersionId, roundIndex)
        );
        const snap = await getDoc(actionRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const now = Timestamp.fromDate(new Date());
        const normalized = normalizeRoundSummaryAction(existing, payload);

        await setDoc(
            actionRef,
            {
                ...normalized,
                createdAt: existing?.createdAt || now,
                updatedAt: now
            },
            { merge: true }
        );
        await touchUserUpdatedAt(normalizedId);
        return {
            id: actionRef.id,
            ...normalized
        };
    } catch (error) {
        console.error('Error saving round summary action:', error);
        return null;
    }
};

export const createResearchSnapshot = async (payload = {}) => {
    try {
        const snapshotRef = doc(getResearchSnapshotsCollectionRef());
        const snapshot = normalizeResearchSnapshot(snapshotRef.id, payload);
        await setDoc(snapshotRef, snapshot);
        return snapshot;
    } catch (error) {
        console.error('Error creating research snapshot:', error);
        return null;
    }
};

export const listResearchSnapshots = async () => {
    try {
        const snap = await getDocs(getResearchSnapshotsCollectionRef());
        return snap.docs
            .map((docSnap) => normalizeResearchSnapshot(docSnap.id, docSnap.data()))
            .sort((left, right) => String(right?.created_at ?? '').localeCompare(String(left?.created_at ?? '')));
    } catch (error) {
        console.error('Error listing research snapshots:', error);
        return [];
    }
};

export const subscribeToResearchSnapshots = (callback) => {
    if (typeof callback !== 'function') return () => {};
    return onSnapshot(
        getResearchSnapshotsCollectionRef(),
        (snap) => {
            const rows = snap.docs
                .map((docSnap) => normalizeResearchSnapshot(docSnap.id, docSnap.data()))
                .sort((left, right) => String(right?.created_at ?? '').localeCompare(String(left?.created_at ?? '')));
            callback(rows);
        },
        (error) => {
            console.error('Research snapshot subscription failed:', error);
            callback([], error);
        }
    );
};

export const createResearchJob = async (payload = {}) => {
    try {
        const jobRef = doc(getResearchJobsCollectionRef());
        const job = normalizeResearchJob(jobRef.id, payload);
        await setDoc(jobRef, job);
        return job;
    } catch (error) {
        console.error('Error creating research job:', error);
        return null;
    }
};

export const updateResearchJob = async (jobId, payload = {}) => {
    const normalizedJobId = String(jobId ?? '').trim();
    if (!normalizedJobId) return null;

    try {
        const jobRef = getResearchJobRef(normalizedJobId);
        const snap = await getDoc(jobRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const next = normalizeResearchJob(normalizedJobId, {
            ...existing,
            ...payload,
            job_id: normalizedJobId,
            created_at: existing?.created_at || payload?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        await setDoc(jobRef, next, { merge: true });
        return next;
    } catch (error) {
        console.error('Error updating research job:', error);
        return null;
    }
};

export const listResearchJobs = async () => {
    try {
        const snap = await getDocs(getResearchJobsCollectionRef());
        return snap.docs
            .map((docSnap) => normalizeResearchJob(docSnap.id, docSnap.data()))
            .sort((left, right) => String(right?.created_at ?? '').localeCompare(String(left?.created_at ?? '')));
    } catch (error) {
        console.error('Error listing research jobs:', error);
        return [];
    }
};

export const subscribeToResearchJobs = (callback) => {
    if (typeof callback !== 'function') return () => {};
    return onSnapshot(
        getResearchJobsCollectionRef(),
        (snap) => {
            const rows = snap.docs
                .map((docSnap) => normalizeResearchJob(docSnap.id, docSnap.data()))
                .sort((left, right) => String(right?.created_at ?? '').localeCompare(String(left?.created_at ?? '')));
            callback(rows);
        },
        (error) => {
            console.error('Research job subscription failed:', error);
            callback([], error);
        }
    );
};

export const createResearchProtocol = async (payload = {}) => {
    try {
        const protocolRef = doc(getResearchProtocolsCollectionRef());
        const protocol = normalizeResearchProtocol(protocolRef.id, payload);
        await setDoc(protocolRef, protocol);
        return protocol;
    } catch (error) {
        console.error('Error creating research protocol:', error);
        return null;
    }
};

export const updateResearchProtocol = async (protocolId, payload = {}) => {
    const normalizedProtocolId = String(protocolId ?? '').trim();
    if (!normalizedProtocolId) return null;
    try {
        const protocolRef = getResearchProtocolRef(normalizedProtocolId);
        const snap = await getDoc(protocolRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const next = normalizeResearchProtocol(normalizedProtocolId, {
            ...existing,
            ...payload,
            protocol_id: normalizedProtocolId,
            created_at: existing?.created_at || payload?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        await setDoc(protocolRef, next, { merge: true });
        return next;
    } catch (error) {
        console.error('Error updating research protocol:', error);
        return null;
    }
};

export const listResearchProtocols = async () => {
    try {
        const snap = await getDocs(getResearchProtocolsCollectionRef());
        return snap.docs
            .map((docSnap) => normalizeResearchProtocol(docSnap.id, docSnap.data()))
            .sort((left, right) => String(right?.updated_at ?? '').localeCompare(String(left?.updated_at ?? '')));
    } catch (error) {
        console.error('Error listing research protocols:', error);
        return [];
    }
};

export const subscribeToResearchProtocols = (callback) => {
    if (typeof callback !== 'function') return () => {};
    return onSnapshot(
        getResearchProtocolsCollectionRef(),
        (snap) => {
            const rows = snap.docs
                .map((docSnap) => normalizeResearchProtocol(docSnap.id, docSnap.data()))
                .sort((left, right) => String(right?.updated_at ?? '').localeCompare(String(left?.updated_at ?? '')));
            callback(rows);
        },
        (error) => {
            console.error('Research protocol subscription failed:', error);
            callback([], error);
        }
    );
};

export const createResearchModel = async (payload = {}) => {
    try {
        const modelRef = doc(getResearchModelsCollectionRef());
        const model = normalizeResearchModelDoc(modelRef.id, payload);
        await setDoc(modelRef, model);
        return model;
    } catch (error) {
        console.error('Error creating research model:', error);
        return null;
    }
};

export const updateResearchModel = async (modelId, payload = {}) => {
    const normalizedModelId = String(modelId ?? '').trim();
    if (!normalizedModelId) return null;
    try {
        const modelRef = getResearchModelRef(normalizedModelId);
        const snap = await getDoc(modelRef);
        const existing = snap.exists() ? (snap.data() || {}) : {};
        const next = normalizeResearchModelDoc(normalizedModelId, {
            ...existing,
            ...payload,
            model_id: normalizedModelId,
            created_at: existing?.created_at || payload?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        await setDoc(modelRef, next, { merge: true });
        return next;
    } catch (error) {
        console.error('Error updating research model:', error);
        return null;
    }
};

export const listResearchModels = async () => {
    try {
        const snap = await getDocs(getResearchModelsCollectionRef());
        return snap.docs
            .map((docSnap) => normalizeResearchModelDoc(docSnap.id, docSnap.data()))
            .sort((left, right) => String(right?.updated_at ?? '').localeCompare(String(left?.updated_at ?? '')));
    } catch (error) {
        console.error('Error listing research models:', error);
        return [];
    }
};

export const subscribeToResearchModels = (callback) => {
    if (typeof callback !== 'function') return () => {};
    return onSnapshot(
        getResearchModelsCollectionRef(),
        (snap) => {
            const rows = snap.docs
                .map((docSnap) => normalizeResearchModelDoc(docSnap.id, docSnap.data()))
                .sort((left, right) => String(right?.updated_at ?? '').localeCompare(String(left?.updated_at ?? '')));
            callback(rows);
        },
        (error) => {
            console.error('Research model subscription failed:', error);
            callback([], error);
        }
    );
};

export const saveParticipantResearchStudyState = async (id, scenarioSetVersionId, payload = {}) => {
    const normalizedId = String(id ?? '').trim();
    const normalizedVersionId = String(scenarioSetVersionId ?? '').trim();
    if (!normalizedId || !normalizedVersionId) return null;

    try {
        const [summarySnap, progressSnap] = await Promise.all([
            getDoc(getSummaryRef(normalizedId)),
            getDoc(getScenarioSetProgressRef(normalizedId))
        ]);
        const summaryDoc = summarySnap.exists() ? (summarySnap.data() || {}) : {};
        const progressDoc = progressSnap.exists() ? (progressSnap.data() || {}) : {};
        const summaryMap = summaryDoc?.summaryByScenarioSetVersionId && typeof summaryDoc.summaryByScenarioSetVersionId === 'object'
            ? summaryDoc.summaryByScenarioSetVersionId
            : {};
        const progressMap = progressDoc?.progressByScenarioSetVersionId && typeof progressDoc.progressByScenarioSetVersionId === 'object'
            ? progressDoc.progressByScenarioSetVersionId
            : {};
        const summaryEntry = summaryMap[normalizedVersionId] && typeof summaryMap[normalizedVersionId] === 'object'
            ? summaryMap[normalizedVersionId]
            : {};
        const progressEntry = progressMap[normalizedVersionId] && typeof progressMap[normalizedVersionId] === 'object'
            ? progressMap[normalizedVersionId]
            : {};
        const mergedResearchStudy = mergeResearchStudyState(
            mergeResearchStudyState(summaryEntry?.researchStudy || {}, progressEntry?.researchStudy || {}),
            payload
        );

        await Promise.all([
            setDoc(getSummaryRef(normalizedId), {
                summaryByScenarioSetVersionId: {
                    ...summaryMap,
                    [normalizedVersionId]: mergeScenarioSummaryEntry(summaryEntry, {
                        scenarioSetName: summaryEntry?.scenarioSetName || progressEntry?.scenarioSetName || '',
                        totalRounds: summaryEntry?.totalRounds,
                        roundsCompleted: summaryEntry?.roundsCompleted,
                        optimalChoices: summaryEntry?.optimalChoices,
                        totalGameTime: summaryEntry?.totalGameTime,
                        completedGame: summaryEntry?.completedGame,
                        earnings: summaryEntry?.earnings,
                        resultAccessKey: summaryEntry?.resultAccessKey,
                        liveSessionId: summaryEntry?.liveSessionId || progressEntry?.liveSessionId || '',
                        sessionStartedAt: summaryEntry?.sessionStartedAt || progressEntry?.sessionStartedAt || '',
                        lastActivityAt: new Date().toISOString(),
                        sessionLabel: summaryEntry?.sessionLabel || progressEntry?.sessionLabel || '',
                        researchStudy: mergedResearchStudy
                    })
                }
            }, { merge: true }),
            setDoc(getScenarioSetProgressRef(normalizedId), {
                progressByScenarioSetVersionId: {
                    ...progressMap,
                    [normalizedVersionId]: removeUndefinedDeep({
                        ...(progressEntry && typeof progressEntry === 'object' ? progressEntry : {}),
                        scenarioSetName: String(progressEntry?.scenarioSetName ?? summaryEntry?.scenarioSetName ?? '').trim(),
                        researchStudy: mergedResearchStudy,
                        lastActivityAt: new Date().toISOString()
                    })
                }
            }, { merge: true })
        ]);
        await touchUserUpdatedAt(normalizedId);
        return mergedResearchStudy;
    } catch (error) {
        console.error('Error saving participant research study state:', error);
        return null;
    }
};

export const saveParticipantStudySurveyResponse = async (id, scenarioSetVersionId, response = {}, payload = {}) => {
    const normalizedResponse = normalizeResearchStudySurveyResponse(response, payload);
    return saveParticipantResearchStudyState(id, scenarioSetVersionId, {
        ...payload,
        survey_responses: [normalizedResponse]
    });
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

export const listQualtricsResponses = async () => {
    try {
        const snap = await getDocs(getQualtricsResponsesCollectionRef());
        return snap.docs
            .map((responseDoc) => normalizeQualtricsResponseDocument(responseDoc.id, responseDoc.data()))
            .sort((left, right) => String(right?.recorded_at || right?.imported_at || '').localeCompare(String(left?.recorded_at || left?.imported_at || '')));
    } catch (error) {
        console.error('Error fetching Qualtrics responses:', error);
        return [];
    }
};

export const listQualtricsSyncRuns = async () => {
    try {
        const snap = await getDocs(getQualtricsSyncRunsCollectionRef());
        return snap.docs
            .map((runDoc) => ({ id: runDoc.id, ...(runDoc.data() || {}) }))
            .sort((left, right) => String(right?.started_at || right?.completed_at || '').localeCompare(String(left?.started_at || left?.completed_at || '')));
    } catch (error) {
        console.error('Error fetching Qualtrics sync runs:', error);
        return [];
    }
};

export const importQualtricsResponses = async (responses = [], source = 'admin_csv') => {
    const normalizedResponses = Array.isArray(responses)
        ? responses.map((response) => normalizeQualtricsResponseDocument(response?.id, {
            ...(response || {}),
            source: response?.source || source
        }))
        : [];
    const runId = `admin_import_${Date.now()}`;
    const startedAt = new Date().toISOString();

    try {
        await Promise.all(
            normalizedResponses.map((response) =>
                setDoc(getQualtricsResponseRef(response.id), {
                    ...response,
                    imported_at: response.imported_at || startedAt,
                    source: response.source || source
                }, { merge: true })
            )
        );
        await setDoc(getQualtricsSyncRunRef(runId), {
            run_id: runId,
            source,
            status: 'completed',
            started_at: startedAt,
            completed_at: new Date().toISOString(),
            response_count: normalizedResponses.length,
            matched_response_count: normalizedResponses.filter((response) => response.match_key && response.finished !== false).length,
            unmatched_response_count: normalizedResponses.filter((response) => !response.match_key || response.finished === false).length,
            error_summary: ''
        }, { merge: true });
        return normalizedResponses;
    } catch (error) {
        await setDoc(getQualtricsSyncRunRef(runId), {
            run_id: runId,
            source,
            status: 'failed',
            started_at: startedAt,
            completed_at: new Date().toISOString(),
            response_count: normalizedResponses.length,
            error_summary: String(error?.message || error || '').slice(0, 500)
        }, { merge: true });
        console.error('Error importing Qualtrics responses:', error);
        throw error;
    }
};

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
