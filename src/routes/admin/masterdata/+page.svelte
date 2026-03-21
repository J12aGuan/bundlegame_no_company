<script>
    import { onMount } from 'svelte';
    import { 
        getCentralConfig, saveCentralConfig,
        getExperimentScenarios,
        getScenarioDatasetBundle,
        getScenarioDatasetNames,
        deleteScenarioDatasetBundle,
        getTutorialConfig, saveTutorialConfig,
        getOrdersData, saveOrdersData,
        getStoresData, saveStoresData,
        getCitiesData, saveCitiesData,
        getEmojisData, saveEmojisData
    } from '$lib/firebaseDB.js';
    import {
        validateGenerationOptionsForAdmin,
        runScenarioGenerationPipeline
    } from '$lib/scripts/generateScenarios.js';
    
    let activeTab = 'centralConfig';
    let loading = true;
    let saving = false;
    let error = null;
    let success = null;

    const DEFAULT_CENTRAL_CONFIG = {
        game: {
            timeLimit: 1200,
            roundTimeLimit: 300,
            thinkTime: 10,
            penaltyTimeout: 30,
            ordersShown: 4,
            gridSize: 3,
            auth: true,
            tips: false,
            waiting: false,
            refresh: false,
            expire: false
        },
        scenario_set: 'experiment',
        stores: [],
        distances: {},
        startinglocation: 'Berkeley'
    };

    const DEFAULT_TUTORIAL_CONFIG = {
        name: 'Tutorial',
        thinkTime: 2,
        gridSize: 2,
        tips: false,
        waiting: false,
        refresh: false,
        expire: false,
        scenario_set: 'experiment_tutorial',
        auth: false
    };

    function normalizeDataId(fileName, fallback = '') {
        if (!fileName || typeof fileName !== 'string') return fallback;
        return fileName.trim().replace(/\.json$/i, '');
    }

    function storesCount(value) {
        if (Array.isArray(value)) return value.length;
        if (value && Array.isArray(value.stores)) return value.stores.length;
        return 0;
    }

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function sortObjectKeysDeep(value) {
        if (Array.isArray(value)) return value.map((item) => sortObjectKeysDeep(item));
        if (value && typeof value === 'object') {
            const out = {};
            for (const key of Object.keys(value).sort()) {
                out[key] = sortObjectKeysDeep(value[key]);
            }
            return out;
        }
        return value;
    }

    function formatJsonStable(value) {
        return JSON.stringify(sortObjectKeysDeep(value), null, 2);
    }

    function formatDatasetId(fileName, fallback = '') {
        const normalized = normalizeDataId(fileName, fallback);
        return normalized ? `${normalized}.json` : '';
    }

    function normalizeStoresPayload(raw) {
        if (Array.isArray(raw)) {
            return { startinglocation: '', distances: {}, stores: raw };
        }
        return {
            startinglocation: raw?.startinglocation || '',
            distances: raw?.distances || {},
            stores: Array.isArray(raw?.stores) ? raw.stores : []
        };
    }

    function toOrderDraft(order = {}, options = {}) {
        return {
            id: order.id || '',
            city: order.city || '',
            store: order.store || '',
            earnings: order.earnings ?? 0,
            estimatedTime: order.estimatedTime ?? 0,
            localTravelTime: order.localTravelTime ?? 0,
            itemRows: toItemRows(order.items || {})
        };
    }

    function toItemRows(items = {}) {
        const rows = Object.entries(items || {}).map(([item, qty]) => ({
            item: item || '',
            qty: Number(qty) || 0
        }));
        return rows.length > 0 ? rows : [{ item: '', qty: 1 }];
    }

    function fromItemRows(itemRows = []) {
        const out = {};
        for (const row of itemRows || []) {
            const key = row?.item?.trim();
            if (!key) continue;
            out[key] = Number(row?.qty) || 0;
        }
        return out;
    }

    function fromOrderDraft(order, options = {}) {
        return {
            id: order.id?.trim(),
            city: order.city?.trim(),
            store: order.store?.trim(),
            earnings: Number(order.earnings) || 0,
            estimatedTime: Number(order.estimatedTime) || 0,
            localTravelTime: Number(order.localTravelTime) || 0,
            items: fromItemRows(order.itemRows)
        };
    }

    function toScenarioDraft(scenario = {}) {
        const orderIds = Array.isArray(scenario.order_ids)
            ? scenario.order_ids
            : (scenario.orders || []).map((order) => order?.id || order).filter(Boolean);
        return {
            round: scenario.round ?? 1,
            phase: scenario.phase ?? '',
            scenario_id: scenario.scenario_id ?? '',
            max_bundle: scenario.max_bundle ?? 3,
            orders: orderIds.map((id) => toOrderDraft({ id }))
        };
    }

    function fromScenarioDraft(scenario = {}) {
        return {
            round: Number(scenario.round) || 1,
            phase: scenario.phase?.trim() || '',
            scenario_id: scenario.scenario_id?.trim() || '',
            max_bundle: Number(scenario.max_bundle) || 3,
            order_ids: (scenario.orders || [])
                .map((order) => order?.id?.trim?.() || '')
                .filter((id) => id.length > 0)
        };
    }

    function toStoreDraft(store = {}) {
        const grid = Array.isArray(store.locations) ? deepClone(store.locations) : [[]];
        const rowCount = Math.max(1, grid.length || 1);
        const colCount = Math.max(1, ...grid.map((row) => Array.isArray(row) ? row.length : 0), 1);
        const normalizedGrid = Array.from({ length: rowCount }, (_, r) =>
            Array.from({ length: colCount }, (_, c) => grid?.[r]?.[c] ?? '')
        );
        return {
            store: store.store || '',
            city: store.city || '',
            cellDistance: store.cellDistance ?? 1000,
            entranceRow: store.Entrance?.[0] ?? 0,
            entranceCol: store.Entrance?.[1] ?? 0,
            itemsCsv: Array.isArray(store.items) ? store.items.join(', ') : '',
            gridRows: rowCount,
            gridCols: colCount,
            locationsGrid: normalizedGrid
        };
    }

    function fromStoreDraft(store) {
        return {
            store: store.store?.trim(),
            city: store.city?.trim(),
            cellDistance: Number(store.cellDistance) || 1000,
            Entrance: [Number(store.entranceRow) || 0, Number(store.entranceCol) || 0],
            items: (store.itemsCsv || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            locations: (store.locationsGrid || []).map((row) => (row || []).map((cell) => cell ?? ''))
        };
    }

    function distancesToEntries(distancesObj = {}) {
        return Object.entries(distancesObj).map(([city, value]) => ({
            city,
            routes: (value?.destinations || []).map((destination, idx) => ({
                destination,
                distance: value?.distances?.[idx] ?? 0
            }))
        }));
    }

    function entriesToDistances(entries = []) {
        const out = {};
        for (const entry of entries) {
            const city = entry.city?.trim();
            if (!city) continue;
            const cleanRoutes = (entry.routes || [])
                .map((route) => ({
                    destination: route.destination?.trim(),
                    distance: Number(route.distance) || 0
                }))
                .filter((route) => route.destination);
            out[city] = {
                destinations: cleanRoutes.map((route) => route.destination),
                distances: cleanRoutes.map((route) => route.distance)
            };
        }
        return out;
    }

    function travelTimesToEntries(travelTimes = {}) {
        return Object.entries(travelTimes || {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([city, routes]) => ({
                city,
                routes: Object.entries(routes || {})
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([destination, seconds]) => ({
                        destination,
                        seconds: Number(seconds) || 0
                    }))
            }));
    }

    function entriesToTravelTimes(entries = []) {
        const out = {};
        for (const entry of entries || []) {
            const city = entry?.city?.trim();
            if (!city) continue;
            const routes = {};
            for (const route of entry?.routes || []) {
                const destination = route?.destination?.trim();
                const seconds = Number(route?.seconds);
                if (!destination || destination === city) continue;
                if (!Number.isFinite(seconds) || seconds <= 0) continue;
                routes[destination] = seconds;
            }
            out[city] = routes;
        }
        return out;
    }

    function getMatrixSeconds(travelTimes = {}, fromCity = '', toCity = '') {
        const origin = String(fromCity || '').trim();
        const destination = String(toCity || '').trim();
        if (!origin || !destination || origin === destination) return 0;
        const value = Number(travelTimes?.[origin]?.[destination]);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    function buildScenarioTravelValidation(ordersById = {}, citiesDoc = {}) {
        const startingCity = String(citiesDoc?.startinglocation || '').trim();
        const usedCities = [...new Set([
            startingCity,
            ...Object.values(ordersById || {})
                .map((order) => String(order?.city || '').trim())
                .filter(Boolean)
        ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
        const travelTimes = citiesDoc?.travelTimes || {};
        const missingCities = usedCities.filter((city) => !travelTimes?.[city]);
        const missingRoutes = [];

        for (const fromCity of usedCities) {
            if (!travelTimes?.[fromCity]) continue;
            for (const destination of usedCities) {
                if (fromCity === destination) continue;
                const seconds = getMatrixSeconds(travelTimes, fromCity, destination);
                if (seconds == null) {
                    missingRoutes.push(`${fromCity} -> ${destination}`);
                }
            }
        }

        return {
            startingCity,
            usedCities,
            missingCities,
            missingRoutes
        };
    }

    function formatSeconds(value) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? `${numeric}s` : '-';
    }
    
    // Central Config
    let centralConfig = { ...DEFAULT_CENTRAL_CONFIG, game: { ...DEFAULT_CENTRAL_CONFIG.game } };
    let editingCentralConfig = false;
    
    // Experiment Scenarios
    let experimentScenarios = [];
    let selectedScenariosId = '';
    let selectedScenarioRound = null;
    let selectedScenarioOrder = null;
    let selectedScenarioOrderId = '';
    let selectedScenarioSolution = null;
    let scenarioOrdersById = {};
    let scenarioSolutionsByScenarioId = {};
    let scenarioTravelValidation = {
        startingCity: '',
        usedCities: [],
        missingCities: [],
        missingRoutes: []
    };
    
    // Tutorial Config
    let tutorialConfig = { ...DEFAULT_TUTORIAL_CONFIG };
    let editingTutorialConfig = false;

    // Cities Data
    let citiesData = { startinglocation: '', travelTimes: {} };
    let editingCities = false;
    let cityTravelDraft = {
        startinglocation: '',
        routeEntries: []
    };
    
    // Orders Data
    let ordersData = [];
    let editingOrders = false;
    let orderDrafts = [];
    let selectedOrdersId = 'experiment';

    $: selectedScenarioOrder = selectedScenarioOrderId
        ? (scenarioOrdersById?.[selectedScenarioOrderId] || { id: selectedScenarioOrderId, missing: true })
        : null;
    $: scenarioTravelValidation = buildScenarioTravelValidation(scenarioOrdersById, citiesData);
    
    // Stores Data
    let storesData = { stores: [] };
    let editingStores = false;
    let storeDatasetDraft = {
        startinglocation: '',
        distanceEntries: [],
        stores: []
    };
    let selectedStoresId = 'store';
    
    // Emojis Data
    let emojisData = {};
    let editingEmojis = false;
    let emojiEntries = [];
    let newEmojiKey = '';
    let newEmojiValue = '';
    let usedOrdersIds = [];
    let usedStoresIds = [];
    let knownOrdersIds = [];
    let knownStoresIds = [];
    let knownScenariosIds = [];
    let scenarioSetOptions = [];
    let allScenarioSetIds = [];
    let syncStatusRows = [];
    let generatingScenarios = false;
    let deletingScenarioSet = false;
    let generationValidationError = '';
    let generationPayFieldsInvalid = false;
    const generationForm = {
        datasetName: '',
        totalRounds: 10,
        maxBundle: 3,
        payMin: 8,
        payMax: 24
    };

    $: usedOrdersIds = [centralConfig?.scenario_set || '', tutorialConfig?.scenario_set || ''].filter(Boolean);
    $: usedStoresIds = ['store'];

    $: knownStoresIds = Array.from(new Set([
        'store',
        ...usedStoresIds
    ]));

    $: knownOrdersIds = Array.from(new Set([...usedOrdersIds, selectedOrdersId || ''].filter(Boolean)));

    $: knownScenariosIds = Array.from(new Set([
        ...(Array.isArray(allScenarioSetIds) ? allScenarioSetIds : []),
        centralConfig?.scenario_set || '',
        tutorialConfig?.scenario_set || '',
        selectedScenariosId || ''
    ].filter(Boolean)));
    $: scenarioSetOptions = Array.isArray(allScenarioSetIds) ? allScenarioSetIds : [];
    $: selectedScenarioInUseBy = (() => {
        const selected = normalizeDataId(selectedScenariosId, '');
        if (!selected) return [];
        const usedBy = [];
        if (selected === normalizeDataId(centralConfig?.scenario_set, 'experiment')) usedBy.push('Central Config');
        if (selected === normalizeDataId(tutorialConfig?.scenario_set, 'experiment_tutorial')) usedBy.push('Tutorial Config');
        return usedBy;
    })();
    
    onMount(async () => {
        await loadAllData();
    });
    
    async function loadAllData() {
        try {
            loading = true;
            error = null;
            
            const centralLoaded = await getCentralConfig();
            const tutorialLoaded = await getTutorialConfig() || {};
            citiesData = await getCitiesData('cities') || { startinglocation: '', travelTimes: {} };
            centralConfig = {
                ...DEFAULT_CENTRAL_CONFIG,
                ...(centralLoaded || {}),
                game: {
                    ...DEFAULT_CENTRAL_CONFIG.game,
                    ...(centralLoaded?.game || {})
                }
            };
            allScenarioSetIds = await getScenarioDatasetNames() || [];
            const centralSet = normalizeDataId(centralLoaded?.scenario_set, '');
            const tutorialSet = normalizeDataId(tutorialLoaded?.scenario_set, '');
            const preferredSet = [selectedScenariosId, centralSet, tutorialSet].find((id) => id && allScenarioSetIds.includes(id));
            selectedScenariosId = preferredSet || allScenarioSetIds[0] || '';
            experimentScenarios = selectedScenariosId
                ? (await getExperimentScenarios(selectedScenariosId) || [])
                : [];
            await loadScenarioSetDetails();
            tutorialConfig = {
                ...DEFAULT_TUTORIAL_CONFIG,
                ...tutorialLoaded
            };
            emojisData = await getEmojisData() || {};
            await refreshSyncStatus();
            
            console.log('All master data loaded');
        } catch (err) {
            error = 'Failed to load data: ' + err.message;
            console.error('Error loading:', err);
        } finally {
            loading = false;
        }
    }

    async function refreshSyncStatus() {
        const checks = [
            {
                key: 'centralConfig',
                label: 'MasterData/centralConfig',
                fetch: async () => await getCentralConfig(),
                valid: (value) => Boolean(value && value.game)
            },
            {
                key: 'tutorialConfig',
                label: 'MasterData/tutorialConfig',
                fetch: async () => await getTutorialConfig(),
                valid: (value) => Boolean(
                    value &&
                    typeof value.name === 'string' &&
                    Number.isFinite(Number(value.thinkTime)) &&
                    Number.isFinite(Number(value.gridSize)) &&
                    typeof value.scenario_set === 'string'
                )
            },
            {
                key: 'store',
                label: 'MasterData/store',
                fetch: async () => await getStoresData('store'),
                valid: (value) => storesCount(value) > 0,
                count: (value) => `${storesCount(value)} stores`
            },
            {
                key: 'cities',
                label: 'MasterData/cities',
                fetch: async () => await getCitiesData('cities'),
                valid: (value) => Boolean(value && value.travelTimes && Object.keys(value.travelTimes).length > 0),
                count: (value) => `${Object.keys(value?.travelTimes || {}).length} cities`
            },
            {
                key: 'emojis',
                label: 'MasterData/emojis',
                fetch: async () => await getEmojisData(),
                valid: (value) => Boolean(value && Object.keys(value).length > 0),
                count: (value) => `${Object.keys(value || {}).length} keys`
            }
        ];

        const rows = [];
        for (const check of checks) {
            try {
                const value = await check.fetch();
                rows.push({
                    key: check.key,
                    label: check.label,
                    ready: check.valid(value),
                    summary: check.count ? check.count(value) : ''
                });
            } catch {
                rows.push({
                    key: check.key,
                    label: check.label,
                    ready: false,
                    summary: 'Unavailable'
                });
            }
        }
        syncStatusRows = rows;
    }

    function toPersistedCentralConfig(config = {}) {
        return {
            game: {
                ...DEFAULT_CENTRAL_CONFIG.game,
                ...(config?.game || {})
            },
            scenario_set: normalizeDataId(config?.scenario_set, 'experiment')
        };
    }

    function showMessage(msg, type = 'success') {
        success = type === 'success' ? msg : null;
        error = type === 'error' ? msg : null;
        setTimeout(() => {
            success = null;
            error = null;
        }, 3000);
    }

    async function validateGenerationForm() {
        const validation = await validateGenerationOptionsForAdmin(generationForm);
        generationValidationError = validation?.ok ? '' : (validation?.error || 'Invalid generation options.');
        generationPayFieldsInvalid = Boolean(generationValidationError)
            && /(pay|range)/i.test(generationValidationError);
        return validation;
    }

    async function generateScenarioSetHandler() {
        try {
            generatingScenarios = true;
            const validation = await validateGenerationForm();
            if (!validation?.ok) {
                return;
            }

            const result = await runScenarioGenerationPipeline({
                datasetName: validation.normalizedDataset,
                totalRounds: Number(generationForm.totalRounds),
                maxBundle: Number(generationForm.maxBundle),
                payMin: Number(generationForm.payMin),
                payMax: Number(generationForm.payMax)
            });

            selectedScenariosId = result?.datasetName || validation.normalizedDataset;
            showMessage(`Scenario set "${selectedScenariosId}" generated successfully.`);
            await loadAllData();
            await switchScenariosId();
            generationValidationError = '';
        } catch (err) {
            showMessage(`Generation failed: ${err?.message || 'Unknown error.'}`, 'error');
        } finally {
            generatingScenarios = false;
        }
    }

    async function deleteScenarioSetHandler() {
        try {
            const datasetId = normalizeDataId(selectedScenariosId, '');
            if (!datasetId) {
                showMessage('No scenario set selected.', 'error');
                return;
            }

            const centralInUse = normalizeDataId(centralConfig?.scenario_set, 'experiment');
            const tutorialInUse = normalizeDataId(tutorialConfig?.scenario_set, 'experiment_tutorial');
            if (datasetId === centralInUse || datasetId === tutorialInUse) {
                showMessage(`Cannot delete "${datasetId}" because it is currently used by Central/Tutorial config.`, 'error');
                return;
            }

            const confirmed = window.confirm(`Delete scenario set "${datasetId}" from Firebase? This cannot be undone.`);
            if (!confirmed) return;

            deletingScenarioSet = true;
            await deleteScenarioDatasetBundle(datasetId);

            await loadAllData();
            if (!allScenarioSetIds.includes(selectedScenariosId)) {
                selectedScenariosId = allScenarioSetIds?.[0] || '';
                await switchScenariosId();
            } else {
                await loadScenarioSetDetails();
            }

            showMessage(`Scenario set "${datasetId}" deleted successfully.`);
        } catch (err) {
            showMessage(`Failed to delete scenario set: ${err?.message || 'Unknown error.'}`, 'error');
        } finally {
            deletingScenarioSet = false;
        }
    }
    
    async function saveCentralConfigHandler() {
        try {
            saving = true;
            centralConfig.scenario_set = normalizeDataId(centralConfig.scenario_set, 'experiment');
            await saveCentralConfig(toPersistedCentralConfig(centralConfig));
            editingCentralConfig = false;
            showMessage('Central configuration saved successfully!');
            await loadAllData();
        } catch (err) {
            showMessage('Failed to save: ' + err.message, 'error');
        } finally {
            saving = false;
        }
    }
    
    async function switchScenariosId() {
        try {
            loading = true;
            if (!selectedScenariosId) {
                experimentScenarios = [];
                selectedScenarioRound = null;
                selectedScenarioOrder = null;
                selectedScenarioOrderId = '';
                selectedScenarioSolution = null;
                await loadScenarioSetDetails();
                return;
            }
            experimentScenarios = await getExperimentScenarios(selectedScenariosId) || [];
            selectedScenarioRound = null;
            selectedScenarioOrderId = '';
            selectedScenarioSolution = null;
            await loadScenarioSetDetails();
        } catch (err) {
            showMessage('Failed to load scenarios: ' + err.message, 'error');
        } finally {
            loading = false;
        }
    }

    async function loadScenarioSetDetails() {
        if (!selectedScenariosId) {
            scenarioOrdersById = {};
            scenarioSolutionsByScenarioId = {};
            return;
        }
        const bundle = await getScenarioDatasetBundle(selectedScenariosId);
        const orders = Array.isArray(bundle?.orders) ? bundle.orders : [];
        const optimal = Array.isArray(bundle?.optimal) ? bundle.optimal : [];

        scenarioOrdersById = Object.fromEntries(
            orders
                .map((order) => [String(order?.id || ''), order])
                .filter(([id]) => id.length > 0)
        );

        scenarioSolutionsByScenarioId = Object.fromEntries(
            optimal
                .map((entry) => [String(entry?.scenario_id || ''), entry])
                .filter(([scenarioId]) => scenarioId.length > 0)
        );
    }

    function openScenarioRoundModal(scenario) {
        selectedScenarioRound = scenario || null;
    }

    function closeScenarioRoundModal() {
        selectedScenarioRound = null;
    }

    function openScenarioOrderModal(orderId) {
        selectedScenarioOrderId = String(orderId || '');
    }

    function closeScenarioOrderModal() {
        selectedScenarioOrderId = '';
    }

    function openScenarioSolutionModal(scenario) {
        const scenarioId = String(scenario?.scenario_id || '');
        selectedScenarioSolution = scenarioSolutionsByScenarioId?.[scenarioId] || { scenario_id: scenarioId, missing: true };
    }

    function closeScenarioSolutionModal() {
        selectedScenarioSolution = null;
    }

    function normalizeSolutionForDisplay(solution = {}) {
        return {
            scenario_id: solution?.scenario_id || '',
            best_bundle_ids: Array.isArray(solution?.best_bundle_ids) ? solution.best_bundle_ids : [],
            second_best_bundle_ids: Array.isArray(solution?.second_best_bundle_ids) ? solution.second_best_bundle_ids : [],
            ending_city_best: solution?.ending_city_best || ''
        };
    }
    
    async function saveTutorialConfigHandler() {
        try {
            saving = true;
            tutorialConfig.scenario_set = normalizeDataId(tutorialConfig.scenario_set, 'experiment_tutorial');
            await saveTutorialConfig(tutorialConfig);
            editingTutorialConfig = false;
            showMessage('Tutorial configuration saved successfully!');
            await loadAllData();
        } catch (err) {
            showMessage('Failed to save: ' + err.message, 'error');
        } finally {
            saving = false;
        }
    }
    
    // Orders Data handlers
    async function saveOrdersDataHandler() {
        try {
            saving = true;
            const parsed = orderDrafts.map((order) => fromOrderDraft(order));
            await saveOrdersData(parsed, selectedOrdersId);
            editingOrders = false;
            showMessage(`Orders (${selectedOrdersId}) saved successfully!`);
            await loadAllData();
        } catch (err) {
            showMessage('Invalid JSON or save failed: ' + err.message, 'error');
        } finally {
            saving = false;
        }
    }
    
    function editOrdersData() {
        orderDrafts = (ordersData || []).map((order) => toOrderDraft(order));
        editingOrders = true;
    }

    function addOrderRow() {
        orderDrafts = [...orderDrafts, toOrderDraft({})];
    }

    function removeOrderRow(index) {
        orderDrafts = orderDrafts.filter((_, i) => i !== index);
    }

    function addOrderItemRow(orderIndex) {
        orderDrafts[orderIndex].itemRows = [...(orderDrafts[orderIndex].itemRows || []), { item: '', qty: 1 }];
        orderDrafts = [...orderDrafts];
    }

    function removeOrderItemRow(orderIndex, itemIndex) {
        orderDrafts[orderIndex].itemRows = (orderDrafts[orderIndex].itemRows || []).filter((_, i) => i !== itemIndex);
        if (orderDrafts[orderIndex].itemRows.length === 0) {
            orderDrafts[orderIndex].itemRows = [{ item: '', qty: 1 }];
        }
        orderDrafts = [...orderDrafts];
    }
    
    async function switchOrdersId() {
        try {
            loading = true;
            ordersData = await getOrdersData(selectedOrdersId) || [];
            editingOrders = false;
        } catch (err) {
            showMessage('Failed to load orders: ' + err.message, 'error');
        } finally {
            loading = false;
        }
    }

    // Stores Data handlers
    async function saveStoresDataHandler() {
        try {
            saving = true;
            const parsed = {
                startinglocation: storeDatasetDraft.startinglocation || '',
                distances: entriesToDistances(storeDatasetDraft.distanceEntries),
                stores: storeDatasetDraft.stores.map((store) => fromStoreDraft(store))
            };
            await saveStoresData(parsed, selectedStoresId);
            editingStores = false;
            showMessage(`Stores (${selectedStoresId}) saved successfully!`);
            await loadAllData();
        } catch (err) {
            showMessage('Invalid JSON or save failed: ' + err.message, 'error');
        } finally {
            saving = false;
        }
    }
    
    function editStoresData() {
        const normalized = normalizeStoresPayload(storesData);
        storeDatasetDraft = {
            startinglocation: normalized.startinglocation || '',
            distanceEntries: distancesToEntries(normalized.distances || {}),
            stores: normalized.stores.map((store) => toStoreDraft(store))
        };
        editingStores = true;
    }

    function addStoreRow() {
        storeDatasetDraft.stores = [...storeDatasetDraft.stores, toStoreDraft()];
        storeDatasetDraft = { ...storeDatasetDraft };
    }

    function removeStoreRow(index) {
        storeDatasetDraft.stores = storeDatasetDraft.stores.filter((_, i) => i !== index);
        storeDatasetDraft = { ...storeDatasetDraft };
    }

    function resizeStoreGrid(storeIndex) {
        const store = storeDatasetDraft.stores[storeIndex];
        const rows = Math.max(1, Number(store.gridRows) || 1);
        const cols = Math.max(1, Number(store.gridCols) || 1);
        store.gridRows = rows;
        store.gridCols = cols;
        store.locationsGrid = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => store.locationsGrid?.[r]?.[c] ?? '')
        );
        storeDatasetDraft = { ...storeDatasetDraft };
    }

    function addDistanceCity() {
        storeDatasetDraft.distanceEntries = [...storeDatasetDraft.distanceEntries, { city: '', routes: [] }];
        storeDatasetDraft = { ...storeDatasetDraft };
    }

    function removeDistanceCity(index) {
        storeDatasetDraft.distanceEntries = storeDatasetDraft.distanceEntries.filter((_, i) => i !== index);
        storeDatasetDraft = { ...storeDatasetDraft };
    }

    function addDistanceRoute(cityIndex) {
        storeDatasetDraft.distanceEntries[cityIndex].routes = [
            ...storeDatasetDraft.distanceEntries[cityIndex].routes,
            { destination: '', distance: 0 }
        ];
        storeDatasetDraft = { ...storeDatasetDraft };
    }

    function removeDistanceRoute(cityIndex, routeIndex) {
        storeDatasetDraft.distanceEntries[cityIndex].routes =
            storeDatasetDraft.distanceEntries[cityIndex].routes.filter((_, i) => i !== routeIndex);
        storeDatasetDraft = { ...storeDatasetDraft };
    }
    
    async function switchStoresId() {
        try {
            loading = true;
            storesData = await getStoresData(selectedStoresId) || { stores: [] };
            editingStores = false;
        } catch (err) {
            showMessage('Failed to load stores: ' + err.message, 'error');
        } finally {
            loading = false;
        }
    }

    // Cities Data handlers
    async function saveCitiesDataHandler() {
        try {
            saving = true;
            await saveCitiesData({
                startinglocation: cityTravelDraft.startinglocation?.trim() || '',
                travelTimes: entriesToTravelTimes(cityTravelDraft.routeEntries)
            });
            editingCities = false;
            showMessage('Cities data saved successfully!');
            await loadAllData();
        } catch (err) {
            showMessage('Invalid cities data or save failed: ' + err.message, 'error');
        } finally {
            saving = false;
        }
    }

    function editCitiesData() {
        cityTravelDraft = {
            startinglocation: citiesData?.startinglocation || '',
            routeEntries: travelTimesToEntries(citiesData?.travelTimes || {})
        };
        editingCities = true;
    }

    function addCityTravelEntry() {
        cityTravelDraft.routeEntries = [...cityTravelDraft.routeEntries, { city: '', routes: [] }];
        cityTravelDraft = { ...cityTravelDraft };
    }

    function removeCityTravelEntry(index) {
        cityTravelDraft.routeEntries = cityTravelDraft.routeEntries.filter((_, i) => i !== index);
        cityTravelDraft = { ...cityTravelDraft };
    }

    function addCityTravelRoute(index) {
        cityTravelDraft.routeEntries[index].routes = [
            ...(cityTravelDraft.routeEntries[index].routes || []),
            { destination: '', seconds: 0 }
        ];
        cityTravelDraft = { ...cityTravelDraft };
    }

    function removeCityTravelRoute(cityIndex, routeIndex) {
        cityTravelDraft.routeEntries[cityIndex].routes =
            (cityTravelDraft.routeEntries[cityIndex].routes || []).filter((_, i) => i !== routeIndex);
        cityTravelDraft = { ...cityTravelDraft };
    }
    
    // Emojis Data handlers
    async function saveEmojisDataHandler() {
        try {
            saving = true;
            const parsed = {};
            for (const entry of emojiEntries) {
                const key = entry.key?.trim();
                if (key) parsed[key] = entry.value || '';
            }
            await saveEmojisData(parsed);
            editingEmojis = false;
            showMessage('Emojis saved successfully!');
            await loadAllData();
        } catch (err) {
            showMessage('Invalid JSON or save failed: ' + err.message, 'error');
        } finally {
            saving = false;
        }
    }
    
    function editEmojisData() {
        emojiEntries = Object.entries(emojisData || {}).map(([key, value]) => ({ key, value }));
        editingEmojis = true;
    }

    function addEmojiEntry() {
        const key = newEmojiKey.trim();
        if (!key) return;
        emojiEntries = [...emojiEntries, { key, value: newEmojiValue }];
        newEmojiKey = '';
        newEmojiValue = '';
    }

    function removeEmojiEntry(index) {
        emojiEntries = emojiEntries.filter((_, i) => i !== index);
    }
</script>

<div class="space-y-6">
    <div>
        <h2 class="text-2xl font-bold text-gray-900">Master Data Management</h2>
        <p class="mt-1 text-sm text-gray-600">Manage global game configurations and data</p>
    </div>
    
    {#if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            ⚠️ {error}
        </div>
    {/if}
    
    {#if success}
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            ✓ {success}
        </div>
    {/if}
    
    {#if loading}
        <div class="text-center py-12">
            <div class="text-gray-600">Loading master data...</div>
        </div>
    {:else}
        <section class="bg-white shadow rounded-lg p-6 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">Firebase Sync</h3>
                    <p class="text-sm text-gray-600">Firebase MasterData status overview.</p>
                </div>
                <div class="flex gap-2">
                    <button
                        on:click={refreshSyncStatus}
                        disabled={saving}
                        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                        Refresh Status
                    </button>
                </div>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
                {#each syncStatusRows as row}
                    <div class="flex items-center justify-between rounded border px-3 py-2 {row.ready ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}">
                        <span class="text-sm text-gray-800">{row.label}</span>
                        <span class="text-xs font-medium {row.ready ? 'text-green-700' : 'text-amber-700'}">
                            {row.ready ? 'Ready' : 'Missing'}{row.summary ? ` • ${row.summary}` : ''}
                        </span>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Tabs -->
        <div class="bg-white shadow rounded-lg">
            <div class="border-b border-gray-200">
                <nav class="flex space-x-8 px-6" aria-label="Tabs">
                    {#each [
                        { id: 'centralConfig', label: 'Central Config' },
                        { id: 'scenarios', label: 'Scenarios' },
                        { id: 'cities', label: 'Cities' },
                        { id: 'tutorialConfig', label: 'Tutorial Config' },
                        { id: 'emojis', label: 'Emojis' }
                    ] as tab}
                        <button
                            on:click={() => activeTab = tab.id}
                            class="py-4 px-1 border-b-2 font-medium text-sm transition {
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }"
                        >
                            {tab.label}
                        </button>
                    {/each}
                </nav>
            </div>
            
            <div class="p-6">
                <!-- Central Config Tab -->
                {#if activeTab === 'centralConfig'}
                    <div class="space-y-6">
                        <h3 class="text-lg font-medium text-gray-900">Central Game Configuration</h3>
                        
                        {#if !editingCentralConfig}
                            <div class="grid grid-cols-2 gap-6">
                                <div class="bg-gray-50 p-4 rounded">
                                    <h4 class="font-medium text-gray-900 mb-4">Game Settings</h4>
                                    <dl class="space-y-3">
                                        <div>
                                            <dt class="text-sm text-gray-600">Time Limit</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{centralConfig.game.timeLimit}s</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Round Time Limit</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{centralConfig.game.roundTimeLimit}s</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Think Time</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{centralConfig.game.thinkTime}s</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Penalty Timeout</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{centralConfig.game.penaltyTimeout}s</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Grid Size</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{centralConfig.game.gridSize}x{centralConfig.game.gridSize}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Orders Shown</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{centralConfig.game.ordersShown}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Scenario Set</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{centralConfig.scenario_set || 'experiment'}</dd>
                                        </div>
                                    </dl>
                                </div>
                                <div class="bg-gray-50 p-4 rounded">
                                    <h4 class="font-medium text-gray-900 mb-4">Features</h4>
                                    <dl class="space-y-2">
                                        <div class="flex justify-between">
                                            <dt class="text-sm text-gray-600">Authentication</dt>
                                            <dd><span class="px-2 py-1 rounded text-xs font-medium {centralConfig.game.auth ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                {centralConfig.game.auth ? 'Enabled' : 'Disabled'}
                                            </span></dd>
                                        </div>
                                        <div class="flex justify-between">
                                            <dt class="text-sm text-gray-600">Tips</dt>
                                            <dd><span class="px-2 py-1 rounded text-xs font-medium {centralConfig.game.tips ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}">
                                                {centralConfig.game.tips ? 'On' : 'Off'}
                                            </span></dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                            
                            <button
                                on:click={() => { editingCentralConfig = true; }}
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Edit Configuration
                            </button>
                        {:else}
                            <form on:submit|preventDefault={saveCentralConfigHandler} class="space-y-6">
                                <fieldset class="border border-gray-300 rounded-lg p-4">
                                    <legend class="text-sm font-bold text-gray-700 px-2">Game Settings</legend>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Time Limit (seconds)</label>
                                            <input type="number" bind:value={centralConfig.game.timeLimit} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Round Time Limit (seconds)</label>
                                            <input type="number" bind:value={centralConfig.game.roundTimeLimit} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Think Time (seconds)</label>
                                            <input type="number" bind:value={centralConfig.game.thinkTime} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Penalty Timeout (seconds)</label>
                                            <input type="number" bind:value={centralConfig.game.penaltyTimeout} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Grid Size</label>
                                            <input type="number" bind:value={centralConfig.game.gridSize} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Orders Shown</label>
                                            <input type="number" bind:value={centralConfig.game.ordersShown} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                    </div>
                                </fieldset>
                                
                                <fieldset class="border border-gray-300 rounded-lg p-4">
                                    <legend class="text-sm font-bold text-gray-700 px-2">Features</legend>
                                    <div class="space-y-3">
                                        <label class="flex items-center">
                                            <input type="checkbox" bind:checked={centralConfig.game.auth} class="rounded border-gray-300" />
                                            <span class="ml-2 text-sm text-gray-700">Authentication Required</span>
                                        </label>
                                        <label class="flex items-center">
                                            <input type="checkbox" bind:checked={centralConfig.game.tips} class="rounded border-gray-300" />
                                            <span class="ml-2 text-sm text-gray-700">Enable Tips</span>
                                        </label>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-gray-300 rounded-lg p-4">
                                    <legend class="text-sm font-bold text-gray-700 px-2">Scenario Source</legend>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Scenario Set</label>
                                        <select bind:value={centralConfig.scenario_set} class="mt-1 w-full max-w-md px-3 py-2 border border-gray-300 rounded-md bg-white">
                                            {#each knownScenariosIds as id}
                                                <option value={id}>{id}</option>
                                            {/each}
                                        </select>
                                    </div>
                                </fieldset>

                                <div class="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        on:click={() => editingCentralConfig = false}
                                        disabled={saving}
                                        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        {/if}
                    </div>
                {/if}
                
                <!-- Experiment Scenarios Tab -->
                {#if activeTab === 'scenarios'}
                    <div class="space-y-4">
                        <h3 class="text-lg font-medium text-gray-900">Experiment Scenarios</h3>

                        <div class="border border-gray-300 rounded-lg p-4 bg-gray-50 space-y-3">
                            <h4 class="text-sm font-semibold text-gray-900">Generate Scenario Set</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Dataset Name</label>
                                    <input
                                        type="text"
                                        bind:value={generationForm.datasetName}
                                        on:blur={validateGenerationForm}
                                        placeholder="e.g. experiment_v2"
                                        class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Total Rounds (> 1)</label>
                                    <input
                                        type="number"
                                        min="2"
                                        bind:value={generationForm.totalRounds}
                                        on:blur={validateGenerationForm}
                                        class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Max Bundle (1-4)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="4"
                                        bind:value={generationForm.maxBundle}
                                        on:blur={validateGenerationForm}
                                        class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Pay Min</label>
                                    <input
                                        type="number"
                                        bind:value={generationForm.payMin}
                                        on:input={validateGenerationForm}
                                        class={`mt-1 w-full px-3 py-2 border rounded-md ${generationPayFieldsInvalid ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                    />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Pay Max</label>
                                    <input
                                        type="number"
                                        bind:value={generationForm.payMax}
                                        on:input={validateGenerationForm}
                                        class={`mt-1 w-full px-3 py-2 border rounded-md ${generationPayFieldsInvalid ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                    />
                                </div>
                            </div>
                            <p class="text-xs text-gray-600">Orders per scenario is fixed to 4.</p>
                            <div>
                                <button
                                    on:click={generateScenarioSetHandler}
                                    disabled={saving || generatingScenarios}
                                    class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {generatingScenarios ? 'Generating...' : 'Generate Scenario Set'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700">Scenario Set</label>
                            <select
                                bind:value={selectedScenariosId}
                                on:change={switchScenariosId}
                                class="mt-1 h-10 w-full px-3 border border-gray-300 rounded-md bg-white appearance-none"
                            >
                                {#if scenarioSetOptions.length === 0}
                                    <option value="">No scenario sets found</option>
                                {:else}
                                    {#each scenarioSetOptions as id}
                                        <option value={id}>{id}</option>
                                    {/each}
                                {/if}
                            </select>
                            {#if selectedScenarioInUseBy.length > 0}
                                <p class="mt-2 text-sm text-amber-700">
                                    This scenario set is currently used by: {selectedScenarioInUseBy.join(', ')}. Deletion is disabled.
                                </p>
                            {/if}
                        </div>
                        <p class="text-sm text-gray-600">Total scenarios: {experimentScenarios.length}</p>
                        {#if selectedScenariosId}
                            <div class={`rounded-lg border p-4 space-y-2 ${
                                scenarioTravelValidation.missingCities.length > 0 || scenarioTravelValidation.missingRoutes.length > 0
                                    ? 'border-amber-200 bg-amber-50'
                                    : 'border-green-200 bg-green-50'
                            }`}>
                                <h4 class="text-sm font-semibold text-gray-900">Timing Validation</h4>
                                <p class="text-xs text-gray-700">
                                    Modeled order time uses <code>estimatedTime + cityTravelTime</code>. Runtime delivery uses <code>localTravelTime + cityTravelTime</code>, where city travel comes from the Cities matrix.
                                </p>
                                <p class="text-xs text-gray-600">
                                    Starting city: {scenarioTravelValidation.startingCity || 'not set'} · Used cities: {scenarioTravelValidation.usedCities.join(', ') || 'none'}
                                </p>
                                {#if scenarioTravelValidation.missingCities.length > 0}
                                    <p class="text-xs text-amber-800">
                                        Missing city rows: {scenarioTravelValidation.missingCities.join(', ')}
                                    </p>
                                {/if}
                                {#if scenarioTravelValidation.missingRoutes.length > 0}
                                    <p class="text-xs text-amber-800">
                                        Missing routes: {scenarioTravelValidation.missingRoutes.join(', ')}
                                    </p>
                                {:else}
                                    <p class="text-xs text-green-800">All required city routes are present for this scenario set.</p>
                                {/if}
                            </div>
                        {/if}
                        
                        <div class="bg-gray-50 rounded p-4 max-h-[calc(100vh-18rem)] overflow-y-auto">
                            {#if experimentScenarios.length === 0}
                                <p class="text-sm text-gray-600">No scenarios found for this set.</p>
                            {:else}
                                <div class="space-y-3">
                                    {#each experimentScenarios as scenario}
                                        <div class="bg-white border border-gray-200 rounded p-3 text-sm space-y-2">
                                            <div class="flex flex-wrap items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    on:click={() => openScenarioRoundModal(scenario)}
                                                    class="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                                                >
                                                    Round {scenario.round}
                                                </button>
                                                <span class="text-gray-600">Max bundle: {scenario.max_bundle}</span>
                                            </div>
                                            <div class="text-gray-700">
                                                <span class="font-medium">Scenario ID:</span> {scenario.scenario_id || '-'}
                                            </div>
                                            <div>
                                                <div class="font-medium text-gray-700 mb-1">Order IDs</div>
                                                <div class="flex flex-wrap gap-1">
                                                    {#if Array.isArray(scenario.order_ids) && scenario.order_ids.length > 0}
                                                        {#each scenario.order_ids as orderId}
                                                            <button
                                                                type="button"
                                                                on:click={() => openScenarioOrderModal(orderId)}
                                                                class="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-blue-700 hover:text-blue-800 hover:underline"
                                                            >
                                                                {orderId}
                                                            </button>
                                                        {/each}
                                                    {:else}
                                                        <span class="text-gray-500">No order IDs</span>
                                                    {/if}
                                                </div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        {#if selectedScenarioRound}
                            <div
                                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                                on:click={closeScenarioRoundModal}
                            >
                                <div
                                    class="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-gray-200"
                                    on:click|stopPropagation
                                >
                                    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                        <h4 class="text-lg font-semibold text-gray-900">
                                            Round {selectedScenarioRound.round} Details
                                        </h4>
                                        <div class="flex items-center gap-2">
                                            <button
                                                type="button"
                                                on:click={() => openScenarioSolutionModal(selectedScenarioRound)}
                                                class="px-2 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                            >
                                                View Solution
                                            </button>
                                            <button
                                                type="button"
                                                on:click={closeScenarioRoundModal}
                                                class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                    <div class="p-4 space-y-3 text-sm text-gray-800 max-h-[70vh] overflow-y-auto">
                                        <div><span class="font-medium">Scenario ID:</span> {selectedScenarioRound.scenario_id || '-'}</div>
                                        <div><span class="font-medium">Max Bundle:</span> {selectedScenarioRound.max_bundle}</div>
                                        <div>
                                            <div class="font-medium mb-1">Order IDs</div>
                                            <div class="flex flex-wrap gap-1">
                                                {#if Array.isArray(selectedScenarioRound.order_ids) && selectedScenarioRound.order_ids.length > 0}
                                                    {#each selectedScenarioRound.order_ids as orderId}
                                                        <button
                                                            type="button"
                                                            on:click={() => openScenarioOrderModal(orderId)}
                                                            class="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-blue-700 hover:text-blue-800 hover:underline"
                                                        >
                                                            {orderId}
                                                        </button>
                                                    {/each}
                                                {:else}
                                                    <span class="text-gray-500">No order IDs</span>
                                                {/if}
                                            </div>
                                        </div>
                                        <div>
                                            <div class="font-medium mb-1">Raw JSON</div>
                                            <pre class="rounded bg-gray-50 border border-gray-200 p-3 text-xs overflow-x-auto">{formatJsonStable(selectedScenarioRound)}</pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/if}

                        {#if selectedScenarioOrder}
                            <div
                                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                                on:click={closeScenarioOrderModal}
                            >
                                <div
                                    class="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-gray-200"
                                    on:click|stopPropagation
                                >
                                    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                        <h4 class="text-lg font-semibold text-gray-900">
                                            Order {selectedScenarioOrder.id || '(unknown)'}
                                        </h4>
                                        <button
                                            type="button"
                                            on:click={closeScenarioOrderModal}
                                            class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            Close
                                        </button>
                                    </div>
                                    <div class="p-4 space-y-2 text-sm text-gray-800 max-h-[70vh] overflow-y-auto">
                                        {#if selectedScenarioOrder.missing}
                                            <p class="text-amber-700">Order not found in dataset orders list.</p>
                                        {:else}
                                            {@const referenceTravelTime = getMatrixSeconds(
                                                citiesData?.travelTimes || {},
                                                citiesData?.startinglocation || '',
                                                selectedScenarioOrder.city || ''
                                            )}
                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div class="rounded border border-gray-200 bg-gray-50 p-3">
                                                    <p class="text-xs font-semibold uppercase text-gray-500">City</p>
                                                    <p class="mt-1 text-base font-semibold text-gray-900">{selectedScenarioOrder.city || '-'}</p>
                                                </div>
                                                <div class="rounded border border-gray-200 bg-gray-50 p-3">
                                                    <p class="text-xs font-semibold uppercase text-gray-500">Store</p>
                                                    <p class="mt-1 text-base font-semibold text-gray-900">{selectedScenarioOrder.store || '-'}</p>
                                                </div>
                                                <div class="rounded border border-gray-200 bg-blue-50 p-3">
                                                    <p class="text-xs font-semibold uppercase text-blue-700">Modeled Base Time</p>
                                                    <p class="mt-1 text-base font-semibold text-blue-900">{formatSeconds(selectedScenarioOrder.estimatedTime)}</p>
                                                    <p class="mt-1 text-xs text-blue-800">
                                                        <code>estimatedTime = localTravelTime + pick-item estimate</code>
                                                    </p>
                                                </div>
                                                <div class="rounded border border-gray-200 bg-emerald-50 p-3">
                                                    <p class="text-xs font-semibold uppercase text-emerald-700">Local Delivery Time</p>
                                                    <p class="mt-1 text-base font-semibold text-emerald-900">{formatSeconds(selectedScenarioOrder.localTravelTime)}</p>
                                                    <p class="mt-1 text-xs text-emerald-800">
                                                        Runtime delivery leg uses <code>localTravelTime + cityTravelTime</code>
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="rounded border border-gray-200 bg-white p-3">
                                                <p class="text-sm font-semibold text-gray-900">City travel reference</p>
                                                <p class="mt-1 text-xs text-gray-700">
                                                    Cross-city time is added dynamically from the Cities matrix based on the player's current city at delivery/modeling time.
                                                </p>
                                                <p class="mt-2 text-xs text-gray-600">
                                                    From starting city {citiesData?.startinglocation || '-'} to {selectedScenarioOrder.city || '-'}:
                                                    {#if referenceTravelTime == null}
                                                        <span class="font-medium text-amber-700"> missing route in Cities data</span>
                                                    {:else}
                                                        <span class="font-medium text-gray-900"> {referenceTravelTime}s</span>
                                                        <span> (reference only)</span>
                                                    {/if}
                                                </p>
                                            </div>
                                        {/if}
                                        <pre class="rounded bg-gray-50 border border-gray-200 p-3 text-xs overflow-x-auto">{formatJsonStable(selectedScenarioOrder)}</pre>
                                    </div>
                                </div>
                            </div>
                        {/if}

                        {#if selectedScenarioSolution}
                            <div
                                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                                on:click={closeScenarioSolutionModal}
                            >
                                <div
                                    class="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-gray-200"
                                    on:click|stopPropagation
                                >
                                    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                        <h4 class="text-lg font-semibold text-gray-900">
                                            Solution for {selectedScenarioSolution.scenario_id || '(unknown scenario)'}
                                        </h4>
                                        <button
                                            type="button"
                                            on:click={closeScenarioSolutionModal}
                                            class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            Close
                                        </button>
                                    </div>
                                    <div class="p-4 space-y-2 text-sm text-gray-800 max-h-[70vh] overflow-y-auto">
                                        {#if selectedScenarioSolution.missing}
                                            <p class="text-amber-700">Solution not found for this round.</p>
                                        {/if}
                                        <pre class="rounded bg-gray-50 border border-gray-200 p-3 text-xs overflow-x-auto">{formatJsonStable(normalizeSolutionForDisplay(selectedScenarioSolution))}</pre>
                                    </div>
                                </div>
                            </div>
                        {/if}

                        <div class="pt-2 border-t border-gray-200">
                            <button
                                type="button"
                                on:click={deleteScenarioSetHandler}
                                disabled={saving || loading || generatingScenarios || deletingScenarioSet || !selectedScenariosId || selectedScenarioInUseBy.length > 0}
                                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {deletingScenarioSet ? 'Deleting...' : 'Delete Scenario Set'}
                            </button>
                        </div>
                    </div>
                {/if}
                
                <!-- Cities Tab -->
                {#if activeTab === 'cities'}
                    <div class="space-y-6">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 class="text-lg font-medium text-gray-900">Cities Travel Matrix</h3>
                                <p class="mt-1 text-sm text-gray-600">
                                    Canonical source for cross-city travel time. Runtime delivery uses <code>localTravelTime + cityTravelTime</code>, and modeled order time uses <code>estimatedTime + cityTravelTime</code>.
                                </p>
                            </div>
                            {#if !editingCities}
                                <button
                                    type="button"
                                    on:click={editCitiesData}
                                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Edit Cities
                                </button>
                            {/if}
                        </div>

                        {#if !editingCities}
                            {@const cityEntries = travelTimesToEntries(citiesData?.travelTimes || {})}
                            {@const totalRoutes = cityEntries.reduce((sum, entry) => sum + (entry.routes?.length || 0), 0)}
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <p class="text-xs font-semibold uppercase text-gray-500">Starting Location</p>
                                    <p class="mt-1 text-lg font-semibold text-gray-900">{citiesData?.startinglocation || 'Not set'}</p>
                                </div>
                                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <p class="text-xs font-semibold uppercase text-gray-500">Cities</p>
                                    <p class="mt-1 text-lg font-semibold text-gray-900">{cityEntries.length}</p>
                                </div>
                                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <p class="text-xs font-semibold uppercase text-gray-500">Routes</p>
                                    <p class="mt-1 text-lg font-semibold text-gray-900">{totalRoutes}</p>
                                </div>
                            </div>

                            {#if scenarioTravelValidation.missingCities.length > 0 || scenarioTravelValidation.missingRoutes.length > 0}
                                <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                                    <h4 class="text-sm font-semibold text-amber-900">Scenario Validation Warnings</h4>
                                    <p class="text-xs text-amber-800">
                                        The active scenario set references cities that are incomplete in this matrix.
                                    </p>
                                    {#if scenarioTravelValidation.missingCities.length > 0}
                                        <p class="text-xs text-amber-800">
                                            Missing city rows: {scenarioTravelValidation.missingCities.join(', ')}
                                        </p>
                                    {/if}
                                    {#if scenarioTravelValidation.missingRoutes.length > 0}
                                        <p class="text-xs text-amber-800">
                                            Missing routes: {scenarioTravelValidation.missingRoutes.join(', ')}
                                        </p>
                                    {/if}
                                </div>
                            {/if}

                            {#if cityEntries.length === 0}
                                <div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                                    No Cities matrix found in Firebase yet.
                                </div>
                            {:else}
                                <div class="space-y-3">
                                    {#each cityEntries as entry}
                                        <div class="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                                            <div class="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p class="text-base font-semibold text-gray-900">{entry.city || 'Unnamed city'}</p>
                                                    <p class="text-xs text-gray-500">{entry.routes?.length || 0} outbound routes</p>
                                                </div>
                                            </div>
                                            {#if entry.routes?.length > 0}
                                                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                                    {#each entry.routes as route}
                                                        <div class="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                                            <span class="font-medium text-gray-900">{entry.city}</span>
                                                            <span class="text-gray-500"> to </span>
                                                            <span class="font-medium text-gray-900">{route.destination}</span>
                                                            <span class="text-gray-500"> = </span>
                                                            <span class="font-semibold text-gray-900">{formatSeconds(route.seconds)}</span>
                                                        </div>
                                                    {/each}
                                                </div>
                                            {:else}
                                                <p class="text-sm text-amber-700">No outbound routes configured for this city.</p>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        {:else}
                            <form on:submit|preventDefault={saveCitiesDataHandler} class="space-y-6">
                                <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
                                    <h4 class="text-sm font-semibold text-blue-900">Timing Notes</h4>
                                    <p class="text-xs text-blue-800">
                                        Use this matrix for cross-city travel only. Each runtime delivery leg is calculated as <code>localTravelTime + cityTravelTime</code>.
                                    </p>
                                    <p class="text-xs text-blue-800">
                                        <code>estimatedTime</code> remains the modeled base estimate stored on each order.
                                    </p>
                                </div>

                                <div>
                                    <label for="cities-starting-location" class="block text-sm font-medium text-gray-700">Starting Location</label>
                                    <input
                                        id="cities-starting-location"
                                        type="text"
                                        bind:value={cityTravelDraft.startinglocation}
                                        class="mt-1 w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>

                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <h4 class="text-sm font-semibold text-gray-900">City Routes</h4>
                                        <p class="text-xs text-gray-600">Add each city row and its outbound travel times in seconds.</p>
                                    </div>
                                    <button
                                        type="button"
                                        on:click={addCityTravelEntry}
                                        class="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
                                    >
                                        Add City
                                    </button>
                                </div>

                                <div class="space-y-4">
                                    {#if cityTravelDraft.routeEntries.length === 0}
                                        <div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                                            No city rows added yet.
                                        </div>
                                    {:else}
                                        {#each cityTravelDraft.routeEntries as entry, cityIndex}
                                            <div class="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                                                <div class="flex flex-wrap items-center justify-between gap-3">
                                                    <div class="flex-1 min-w-[220px]">
                                                        <label for={`city-name-${cityIndex}`} class="block text-xs font-medium text-gray-700">City</label>
                                                        <input
                                                            id={`city-name-${cityIndex}`}
                                                            type="text"
                                                            bind:value={entry.city}
                                                            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                    <div class="flex gap-2">
                                                        <button
                                                            type="button"
                                                            on:click={() => addCityTravelRoute(cityIndex)}
                                                            class="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                                                        >
                                                            Add Route
                                                        </button>
                                                        <button
                                                            type="button"
                                                            on:click={() => removeCityTravelEntry(cityIndex)}
                                                            class="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100"
                                                        >
                                                            Remove City
                                                        </button>
                                                    </div>
                                                </div>

                                                {#if entry.routes?.length > 0}
                                                    <div class="space-y-3">
                                                        {#each entry.routes as route, routeIndex}
                                                            <div class="grid grid-cols-1 md:grid-cols-[1fr,140px,auto] gap-3 items-end">
                                                                <div>
                                                                    <label for={`city-route-destination-${cityIndex}-${routeIndex}`} class="block text-xs font-medium text-gray-700">Destination</label>
                                                                    <input
                                                                        id={`city-route-destination-${cityIndex}-${routeIndex}`}
                                                                        type="text"
                                                                        bind:value={route.destination}
                                                                        class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label for={`city-route-seconds-${cityIndex}-${routeIndex}`} class="block text-xs font-medium text-gray-700">Seconds</label>
                                                                    <input
                                                                        id={`city-route-seconds-${cityIndex}-${routeIndex}`}
                                                                        type="number"
                                                                        min="0"
                                                                        bind:value={route.seconds}
                                                                        class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    on:click={() => removeCityTravelRoute(cityIndex, routeIndex)}
                                                                    class="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                {:else}
                                                    <p class="text-sm text-gray-500">No outbound routes for this city yet.</p>
                                                {/if}
                                            </div>
                                        {/each}
                                    {/if}
                                </div>

                                <div class="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Cities'}
                                    </button>
                                    <button
                                        type="button"
                                        on:click={() => editingCities = false}
                                        disabled={saving}
                                        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        {/if}
                    </div>
                {/if}

                <!-- Tutorial Config Tab -->
                {#if activeTab === 'tutorialConfig'}
                    <div class="space-y-6">
                        <h3 class="text-lg font-medium text-gray-900">Tutorial Configuration</h3>
                        
                        {#if !editingTutorialConfig}
                            <div class="grid grid-cols-2 gap-6">
                                <div class="bg-gray-50 p-4 rounded">
                                    <h4 class="font-medium text-gray-900 mb-4">Tutorial Settings</h4>
                                    <dl class="space-y-3">
                                        <div>
                                            <dt class="text-sm text-gray-600">Name</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{tutorialConfig.name}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Think Time</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{tutorialConfig.thinkTime}s</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Time Limit</dt>
                                            <dd class="text-lg font-semibold text-gray-900">None</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Grid Size</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{tutorialConfig.gridSize}x{tutorialConfig.gridSize}</dd>
                                        </div>
                                        <div>
                                            <dt class="text-sm text-gray-600">Scenario Set</dt>
                                            <dd class="text-lg font-semibold text-gray-900">{tutorialConfig.scenario_set || 'experiment_tutorial'}</dd>
                                        </div>
                                    </dl>
                                </div>
                                <div class="bg-gray-50 p-4 rounded">
                                    <h4 class="font-medium text-gray-900 mb-4">Features</h4>
                                    <dl class="space-y-2">
                                        <div class="flex justify-between">
                                            <dt class="text-sm text-gray-600">Authentication</dt>
                                            <dd><span class="px-2 py-1 rounded text-xs font-medium {tutorialConfig.auth ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                {tutorialConfig.auth ? 'Enabled' : 'Disabled'}
                                            </span></dd>
                                        </div>
                                        <div class="flex justify-between">
                                            <dt class="text-sm text-gray-600">Tips</dt>
                                            <dd><span class="px-2 py-1 rounded text-xs font-medium {tutorialConfig.tips ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}">
                                                {tutorialConfig.tips ? 'On' : 'Off'}
                                            </span></dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                            <button
                                on:click={() => { editingTutorialConfig = true; }}
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Edit Configuration
                            </button>
                        {:else}
                            <form on:submit|preventDefault={saveTutorialConfigHandler} class="space-y-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Tutorial Name</label>
                                    <input type="text" bind:value={tutorialConfig.name} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div>
                                <fieldset class="border border-gray-300 rounded-lg p-4">
                                    <legend class="text-sm font-bold text-gray-700 px-2">Settings</legend>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Think Time (seconds)</label>
                                            <input type="number" bind:value={tutorialConfig.thinkTime} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Grid Size</label>
                                            <input type="number" bind:value={tutorialConfig.gridSize} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                        </div>
                                    </div>
                                </fieldset>
                                
                                <fieldset class="border border-gray-300 rounded-lg p-4">
                                    <legend class="text-sm font-bold text-gray-700 px-2">Features</legend>
                                    <div class="space-y-3">
                                        <label class="flex items-center">
                                            <input type="checkbox" bind:checked={tutorialConfig.auth} class="rounded border-gray-300" />
                                            <span class="ml-2 text-sm text-gray-700">Authentication Required</span>
                                        </label>
                                        <label class="flex items-center">
                                            <input type="checkbox" bind:checked={tutorialConfig.tips} class="rounded border-gray-300" />
                                            <span class="ml-2 text-sm text-gray-700">Enable Tips</span>
                                        </label>
                                    </div>
                                </fieldset>

                                <fieldset class="border border-gray-300 rounded-lg p-4">
                                    <legend class="text-sm font-bold text-gray-700 px-2">Scenario Source</legend>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Scenario Set</label>
                                        <select bind:value={tutorialConfig.scenario_set} class="mt-1 w-full max-w-md px-3 py-2 border border-gray-300 rounded-md bg-white">
                                            {#each knownScenariosIds as id}
                                                <option value={id}>{id}</option>
                                            {/each}
                                        </select>
                                    </div>
                                </fieldset>

                                <div class="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        on:click={() => editingTutorialConfig = false}
                                        disabled={saving}
                                        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        {/if}
                    </div>
                {/if}
                
                <!-- Orders Data Tab -->
                {#if false && activeTab === 'orders'}
                    <div class="space-y-4">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900">Orders Data</h3>
                            <div class="mt-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Select Orders Set:</label>
                                <select
                                    bind:value={selectedOrdersId}
                                    on:change={switchOrdersId}
                                    class="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[220px]"
                                >
                                    {#each knownOrdersIds as id}
                                        <option value={id}>{id}</option>
                                    {/each}
                                    {#if !knownOrdersIds.includes(selectedOrdersId)}
                                        <option value={selectedOrdersId}>{selectedOrdersId}</option>
                                    {/if}
                                </select>
                            </div>
                            {#if usedOrdersIds.length > 0}
                                <div class="mt-3">
                                    <p class="text-xs text-gray-500 mb-2">Used in current configs:</p>
                                    <div class="flex flex-wrap gap-2">
                                        {#each usedOrdersIds as id}
                                            <button
                                                on:click={async () => { selectedOrdersId = id; await switchOrdersId(); }}
                                                class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                            >
                                                {id}
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                            <p class="text-sm text-gray-600 mt-2">Total orders: {ordersData.length}</p>
                        </div>
                        
                        {#if !editingOrders}
                            <div class="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
                                <div class="space-y-2">
                                    {#each ordersData.slice(0, 10) as order}
                                        <div class="bg-white border border-gray-200 rounded p-2 text-sm flex items-center justify-between">
                                            <span>{order.id || '(no id)'} • {order.city || '-'} • {order.store || '-'}</span>
                                            <span class="text-gray-600">${order.earnings || 0}</span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                            <button
                                on:click={editOrdersData}
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Edit Orders
                            </button>
                        {:else}
                            <div class="flex flex-col gap-4 max-h-[calc(100vh-16rem)] min-h-0">
                                <div class="shrink-0">
                                    <button on:click={addOrderRow} class="px-3 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800">+ Add Order</button>
                                </div>
                                <div class="space-y-3 flex-1 min-h-0 overflow-y-auto pr-2">
                                    {#each orderDrafts as order, orderIndex}
                                        <div class="border border-gray-300 rounded-lg p-3 bg-gray-50 space-y-2">
                                            <div class="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-700">Order ID</label>
                                                    <input type="text" bind:value={order.id} placeholder="Order ID" class="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-700">City</label>
                                                    <input type="text" bind:value={order.city} placeholder="City" class="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-700">Store</label>
                                                    <input type="text" bind:value={order.store} placeholder="Store" class="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-700">Earnings</label>
                                                    <input type="number" bind:value={order.earnings} placeholder="Earnings" class="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-700">Estimated Time</label>
                                                    <input type="number" bind:value={order.estimatedTime} placeholder="Estimated Time (s)" class="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-700">Local Travel Time</label>
                                                    <input type="number" bind:value={order.localTravelTime} placeholder="Local Travel Time (s)" class="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                </div>
                                            </div>
                                            <div class="space-y-2">
                                                <div class="flex items-center justify-between">
                                                    <label class="block text-xs font-medium text-gray-700">Items</label>
                                                    <button on:click={() => addOrderItemRow(orderIndex)} class="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800">+ Item</button>
                                                </div>
                                                <div class="space-y-1">
                                                    {#each order.itemRows as itemRow, itemIndex}
                                                        <div class="grid grid-cols-[1fr,100px,90px] gap-2">
                                                            <div>
                                                                <label class="block text-xs font-medium text-gray-700">Item Name</label>
                                                                <input
                                                                    type="text"
                                                                    bind:value={itemRow.item}
                                                                    placeholder="Item name"
                                                                    aria-label={`Order item ${itemIndex + 1} name`}
                                                                    class="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label class="block text-xs font-medium text-gray-700">Qty</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    bind:value={itemRow.qty}
                                                                    placeholder="Qty"
                                                                    aria-label={`Order item ${itemIndex + 1} quantity`}
                                                                    class="mt-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                                                />
                                                            </div>
                                                            <button
                                                                on:click={() => removeOrderItemRow(orderIndex, itemIndex)}
                                                                aria-label={`Remove order item ${itemIndex + 1}`}
                                                                class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                            <button on:click={() => removeOrderRow(orderIndex)} class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Remove Order</button>
                                        </div>
                                    {/each}
                                </div>
                                <div class="flex gap-3 shrink-0">
                                    <button
                                        on:click={saveOrdersDataHandler}
                                        disabled={saving}
                                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        on:click={() => editingOrders = false}
                                        disabled={saving}
                                        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
                
                <!-- Stores Data Tab -->
                {#if false && activeTab === 'stores'}
                    <div class="space-y-4">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900">Stores Data</h3>
                            <div class="mt-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Select Stores ID:</label>
                                <div class="flex gap-2">
                                    <select
                                        bind:value={selectedStoresId}
                                        on:change={switchStoresId}
                                        class="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[220px]"
                                    >
                                        {#each knownStoresIds as id}
                                            <option value={id}>{id}</option>
                                        {/each}
                                    </select>
                                </div>
                            </div>
                            {#if usedStoresIds.length > 0}
                                <div class="mt-3">
                                    <p class="text-xs text-gray-500 mb-2">Used in current configs:</p>
                                    <div class="flex flex-wrap gap-2">
                                        {#each usedStoresIds as id}
                                            <button
                                                on:click={async () => { selectedStoresId = id; await switchStoresId(); }}
                                                class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                            >
                                                {id}
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                            <p class="text-sm text-gray-600 mt-2">Total stores: {storesCount(storesData)}</p>
                        </div>
                        
                        {#if !editingStores}
                            <div class="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
                                <div class="space-y-2">
                                    {#each normalizeStoresPayload(storesData).stores as store}
                                        <div class="bg-white border border-gray-200 rounded p-2 text-sm flex items-center justify-between">
                                            <span>{store.store || '(no name)'} • {store.city || '-'}</span>
                                            <span class="text-gray-600">{store.items?.length || 0} items</span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                            <button
                                on:click={editStoresData}
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Edit Stores
                            </button>
                        {:else}
                            <div class="space-y-4">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Starting Location</label>
                                        <input type="text" bind:value={storeDatasetDraft.startinglocation} class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <div class="flex items-center justify-between">
                                            <label class="block text-sm font-medium text-gray-700">City Distances</label>
                                            <button on:click={addDistanceCity} class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">+ Add City</button>
                                        </div>
                                        <div class="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {#each storeDatasetDraft.distanceEntries as cityEntry, cityIndex}
                                                <div class="bg-gray-50 border border-gray-200 rounded p-2 space-y-2">
                                                    <div class="flex gap-2 items-center">
                                                        <input type="text" bind:value={cityEntry.city} placeholder="City" class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" />
                                                        <button on:click={() => addDistanceRoute(cityIndex)} class="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800">+ Route</button>
                                                        <button on:click={() => removeDistanceCity(cityIndex)} class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Remove</button>
                                                    </div>
                                                    {#each cityEntry.routes as route, routeIndex}
                                                        <div class="grid grid-cols-[1fr,120px,80px] gap-2">
                                                            <input type="text" bind:value={route.destination} placeholder="Destination" class="px-2 py-1 border border-gray-300 rounded text-sm" />
                                                            <input type="number" bind:value={route.distance} placeholder="Secs" class="px-2 py-1 border border-gray-300 rounded text-sm" />
                                                            <button on:click={() => removeDistanceRoute(cityIndex, routeIndex)} class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">X</button>
                                                        </div>
                                                    {/each}
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                </div>
                                <button on:click={addStoreRow} class="px-3 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800">+ Add Store</button>
                                <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                                    {#each storeDatasetDraft.stores as store, storeIndex}
                                        <div class="border border-gray-300 rounded-lg p-3 bg-gray-50 space-y-2">
                                            <div class="grid grid-cols-2 gap-2">
                                                <input type="text" bind:value={store.store} placeholder="Store Name" class="px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                <input type="text" bind:value={store.city} placeholder="City" class="px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                <input type="number" bind:value={store.cellDistance} placeholder="Cell Distance (ms)" class="px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                <div class="grid grid-cols-2 gap-2">
                                                    <input type="number" bind:value={store.entranceRow} placeholder="Entrance Row" class="px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                    <input type="number" bind:value={store.entranceCol} placeholder="Entrance Col" class="px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label class="block text-xs font-medium text-gray-700 mb-1">Items (comma separated)</label>
                                                <input type="text" bind:value={store.itemsCsv} class="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                            </div>
                                            <div>
                                                <div class="flex items-center justify-between mb-1">
                                                    <label class="block text-xs font-medium text-gray-700">Locations Grid</label>
                                                    <div class="flex items-center gap-2">
                                                        <input type="number" min="1" bind:value={store.gridRows} class="w-16 px-2 py-1 border border-gray-300 rounded text-xs" title="Rows" />
                                                        <input type="number" min="1" bind:value={store.gridCols} class="w-16 px-2 py-1 border border-gray-300 rounded text-xs" title="Cols" />
                                                        <button on:click={() => resizeStoreGrid(storeIndex)} class="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Resize</button>
                                                    </div>
                                                </div>
                                                <div class="overflow-x-auto border border-gray-200 rounded bg-white p-2">
                                                    <div class="space-y-1">
                                                        {#each store.locationsGrid as row, rowIndex}
                                                            <div class="grid gap-1" style={`grid-template-columns: repeat(${store.gridCols || row.length || 1}, minmax(90px, 1fr));`}>
                                                                {#each row as cell, colIndex}
                                                                    <input
                                                                        type="text"
                                                                        bind:value={store.locationsGrid[rowIndex][colIndex]}
                                                                        placeholder={`r${rowIndex}c${colIndex}`}
                                                                        class="px-2 py-1 border border-gray-300 rounded text-xs"
                                                                    />
                                                                {/each}
                                                            </div>
                                                        {/each}
                                                    </div>
                                                </div>
                                            </div>
                                            <button on:click={() => removeStoreRow(storeIndex)} class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Remove Store</button>
                                        </div>
                                    {/each}
                                </div>
                                <div class="flex gap-3">
                                    <button
                                        on:click={saveStoresDataHandler}
                                        disabled={saving}
                                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        on:click={() => editingStores = false}
                                        disabled={saving}
                                        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
                
                <!-- Emojis Tab -->
                {#if activeTab === 'emojis'}
                    <div class="space-y-4">
                        <h3 class="text-lg font-medium text-gray-900">Emojis Mapping</h3>
                        
                        {#if !editingEmojis}
                            <div class="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
                                <div class="space-y-2">
                                    {#each Object.entries(emojisData || {}) as [key, value]}
                                        <div class="bg-white border border-gray-200 rounded p-2 text-sm flex justify-between">
                                            <span>{key}</span>
                                            <span class="text-xl">{value}</span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                            <button
                                on:click={editEmojisData}
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Edit Emojis
                            </button>
                        {:else}
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Add Emoji Mapping</label>
                                    <div class="grid grid-cols-3 gap-2">
                                        <input type="text" bind:value={newEmojiKey} placeholder="Item key" class="px-3 py-2 border border-gray-300 rounded-md" />
                                        <input type="text" bind:value={newEmojiValue} placeholder="Emoji value" class="px-3 py-2 border border-gray-300 rounded-md" />
                                        <button on:click={addEmojiEntry} class="px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800">Add</button>
                                    </div>
                                </div>
                                <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                    {#each emojiEntries as entry, entryIndex}
                                        <div class="grid grid-cols-[1fr,120px,90px] gap-2 items-center bg-gray-50 border border-gray-200 rounded p-2">
                                            <input type="text" bind:value={entry.key} class="px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                            <input type="text" bind:value={entry.value} class="px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                            <button on:click={() => removeEmojiEntry(entryIndex)} class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Remove</button>
                                        </div>
                                    {/each}
                                </div>
                                <div class="flex gap-3">
                                    <button
                                        on:click={saveEmojisDataHandler}
                                        disabled={saving}
                                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        on:click={() => editingEmojis = false}
                                        disabled={saving}
                                        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    :global(body) {
        overflow-y: auto;
    }
</style>
