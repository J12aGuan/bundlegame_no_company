/* =============================================================================
 * BUNDLEGAME — ENGINE  (do not edit to tune the study; use the CONFIG block)
 * =============================================================================
 * Vanilla-JS port of the SvelteKit runtime (src/routes/bundlegame.svelte,
 * home.svelte, order.svelte, src/lib/bundle.js, config.js). No framework, no
 * network, no Firebase — state lives in memory and is written to Qualtrics
 * embedded data.
 *
 * Mechanics preserved from the original:
 *   - same-store bundle legality (legal_bundle_mask_v1)
 *   - aisle travel time = manhattan(cells) x store.cellDistance
 *   - typed-item entry with per-bag quantities
 *   - checkout matches each order to exactly one bag (items and quantities)
 *   - delivery = localTravelTime + cross-city travel from the player's city
 *   - the player's city carries across rounds
 *   - the eight timing buckets used by the analysis pipeline
 * ========================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- utils */
  var TRUTHY = { 'true': 1, '1': 1, 'yes': 1, 'y': 1, 'on': 1 };
  var FALSY = { 'false': 1, '0': 1, 'no': 1, 'n': 1, 'off': 1 };

  function isPlainObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function lower(v) { return String(v == null ? '' : v).toLowerCase().trim(); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function now() { return Date.now(); }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    var m = Math.floor(s / 60); var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ------------------------------------------------- Qualtrics interop */
  // Wrapped so the engine also runs in the local test harness, which stubs these.
  var QX = {
    get: function (k) {
      try {
        if (global.Qualtrics && Qualtrics.SurveyEngine && Qualtrics.SurveyEngine.getEmbeddedData)
          return Qualtrics.SurveyEngine.getEmbeddedData(k);
      } catch (e) { }
      return null;
    },
    set: function (k, v) {
      k = (CFG && CFG.FIELD_PREFIX && k.indexOf('bg_') === 0)
        ? CFG.FIELD_PREFIX + k.slice(3) : k;
      try {
        if (global.Qualtrics && Qualtrics.SurveyEngine && Qualtrics.SurveyEngine.setEmbeddedData)
          Qualtrics.SurveyEngine.setEmbeddedData(k, v);
      } catch (e) { }
      if (CFG && CFG.DEBUG) console.log('[bg] setEmbeddedData', k, String(v).length + ' chars');
    }
  };

  /* -------------------------------------------------- config resolution */
  var CFG = null;

  // Every CONFIG key may be overridden by an embedded data field named bg_<KEY>.
  function resolveConfig(base) {
    var out = clone(base);
    Object.keys(base).forEach(function (key) {
      var raw = QX.get('bg_' + key);
      if (raw == null || raw === '') return;
      var def = base[key], s = String(raw).trim();
      if (typeof def === 'number') { var n = Number(s); if (isFinite(n)) out[key] = n; }
      else if (typeof def === 'boolean') {
        if (TRUTHY[s.toLowerCase()]) out[key] = true;
        else if (FALSY[s.toLowerCase()]) out[key] = false;
      } else if (Array.isArray(def)) {
        try { var p = JSON.parse(s); if (Array.isArray(p)) out[key] = p; }
        catch (e) { out[key] = s.split(',').map(function (x) { return Number(x.trim()); }); }
      } else out[key] = s;
    });
    return out;
  }

  /* ------------------------------------------------------------ scoring */
  // Mirrors the app reward model: earnings / effective seconds, shared-item
  // pick savings within a store, cross-city travel from the current city.
  function cityTravel(from, to, cities) {
    from = String(from || ''); to = String(to || '');
    if (!from || !to || from === to) return 0;
    var row = (cities && cities.travelTimes && cities.travelTimes[from]) || {};
    var v = Number(row[to]);
    return isFinite(v) && v > 0 ? v : 0;
  }
  function storeConfigFor(name, stores) {
    for (var i = 0; i < stores.length; i++) if (String(stores[i].store) === String(name)) return stores[i];
    return null;
  }
  // Firestore rows come as ["a","b"] or {cells:["a","b"]}. The build normalises
  // them, but stay tolerant in case a payload is hand-edited or hot-swapped.
  function gridOf(cfg) {
    return ((cfg && cfg.locations) || []).map(function (row) {
      var cells = Array.isArray(row) ? row : (row && Array.isArray(row.cells) ? row.cells : []);
      return cells.map(function (c) { return String(c == null ? '' : c).trim(); });
    });
  }
  function bundleLegal(orders) {
    if (!orders.length) return false;
    if (orders.length === 1) return true;
    if (!CFG.SAME_STORE_BUNDLES_ONLY) return true;
    var s = String(orders[0].store || '');
    if (!s) return false;
    for (var i = 1; i < orders.length; i++) if (String(orders[i].store || '') !== s) return false;
    return true;
  }

  /* ---------------------------------------------------------- telemetry */
  var TIMING_KEYS = ['thinkingTime', 'startPickingConfirmationTime', 'aisleTravelTime',
    'itemAddToCartTime', 'localDeliveryTime', 'cityTravelTime', 'penaltyTime', 'idleOrOtherTime'];

  var T = {
    events: [],      // detailed UI timeline
    decisions: [],   // one row per completed round
    timings: [],     // one row per round: the eight buckets
    roundBuckets: null,
    phaseStart: {},
    sessionStart: 0
  };

  function newBuckets() {
    var b = {};
    TIMING_KEYS.forEach(function (k) { b[k] = 0; });
    return b;
  }
  function addTime(key, seconds) {
    if (!T.roundBuckets) return;
    if (TIMING_KEYS.indexOf(key) < 0) return;
    T.roundBuckets[key] += Math.max(0, num(seconds, 0));
  }
  function startPhase(key) { T.phaseStart[key] = now(); }
  function stopPhase(key) {
    if (!T.phaseStart[key]) return;
    addTime(key, (now() - T.phaseStart[key]) / 1000);
    delete T.phaseStart[key];
  }
  function stopAllPhases() { Object.keys(T.phaseStart).forEach(stopPhase); }

  function sessionClock() { return (now() - T.sessionStart) / 1000; }

  // Compact event tuple keeps the chunked payload small:
  // [t, action, targetType, targetId, meta?]
  // Qualtrics trims embedded-data values, so a chunk boundary landing on a space
  // would silently corrupt reassembly. Keep the packed payload whitespace-free.
  function noWs(v) { return String(v == null ? '' : v).replace(/\s+/g, '_'); }
  function scrub(v) {
    if (typeof v === 'string') return noWs(v);
    if (Array.isArray(v)) return v.map(scrub);
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).forEach(function (k) { o[noWs(k)] = scrub(v[k]); });
      return o;
    }
    return v;
  }
  function logEvent(action, targetType, targetId, meta) {
    if (!CFG.DETAILED_TELEMETRY) return;
    var row = [Math.round(sessionClock() * 10) / 10, noWs(action), noWs(targetType), noWs(targetId)];
    if (meta) row.push(scrub(meta));
    T.events.push(row);
  }

  /* ------------------------------------------- embedded-data write-back */
  function chunkString(s, size, maxChunks) {
    var out = [], i = 0;
    while (i < s.length && out.length < maxChunks) { out.push(s.slice(i, i + size)); i += size; }
    return { chunks: out, truncated: i < s.length, droppedChars: Math.max(0, s.length - i) };
  }

  function flush(final) {
    var S = STATE;
    QX.set('bg_participant_id', S.participantId);
    QX.set('bg_dataset', CFG.DATASET);
    QX.set('bg_tutorial_rounds_done', S.tutorialDone ? CFG.TUTORIAL_ROUNDS : 0);
    QX.set('bg_arm', CFG.ARM);
    QX.set('bg_round_reached', S.maxRound);   // deepest round started
    QX.set('bg_round_current', S.round);
    QX.set('bg_rounds_completed', T.decisions.length);
    QX.set('bg_earnings', S.earnings);
    QX.set('bg_session_seconds', Math.round(sessionClock()));
    QX.set('bg_finished', final ? 1 : 0);
    QX.set('bg_decisions', JSON.stringify(T.decisions));
    QX.set('bg_timing', JSON.stringify(T.timings));

    if (CFG.DETAILED_TELEMETRY) {
      var packed = JSON.stringify(T.events);
      var r = chunkString(packed, CFG.EVENT_CHUNK_CHARS, CFG.MAX_EVENT_CHUNKS);
      for (var i = 0; i < CFG.MAX_EVENT_CHUNKS; i++) {
        QX.set('bg_events_' + (i + 1), r.chunks[i] || '');
      }
      // guard the invariant the analysis join depends on
      if (/\s/.test(packed) && CFG.DEBUG) console.warn('[bg] whitespace leaked into event payload');
      QX.set('bg_events_chunks', r.chunks.length);
      QX.set('bg_events_count', T.events.length);
      // Never silently truncate: record it so analysis can see the ceiling was hit.
      QX.set('bg_events_truncated', r.truncated ? 1 : 0);
      QX.set('bg_events_dropped_chars', r.droppedChars);
      if (r.truncated && CFG.DEBUG) console.warn('[bg] event payload truncated', r.droppedChars);
    }
  }

  /* ------------------------------------------- live Firestore transmission */
  // Plain REST, no SDK. Rules allow these unauthenticated writes, and hasOnly()
  // constrains TOP-LEVEL keys only - so anything outside the allowed set is
  // nested inside the *_state / *_snapshot maps, which are unconstrained.
  var FB = { queue: [], sending: false, ok: 0, fail: 0, dropped: 0, lastError: '' };

  function fbEnabled() {
    return !!(CFG.FIREBASE_ENABLED && CFG.FIREBASE_PROJECT_ID && CFG.FIREBASE_API_KEY && global.fetch);
  }
  function fbUrl(pathStr, extra) {
    return 'https://firestore.googleapis.com/v1/projects/' + CFG.FIREBASE_PROJECT_ID +
      '/databases/(default)/documents/' + pathStr + '?key=' + encodeURIComponent(CFG.FIREBASE_API_KEY) +
      (extra || '');
  }
  // JS value -> Firestore typed value
  function fbVal(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return isFinite(v) && Math.floor(v) === v && Math.abs(v) < 9e15
      ? { integerValue: String(v) } : { doubleValue: isFinite(v) ? v : 0 };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(fbVal) } };
    if (typeof v === 'object') return { mapValue: { fields: fbFields(v) } };
    return { stringValue: String(v) };
  }
  function fbFields(o) {
    var f = {};
    Object.keys(o).forEach(function (k) { if (o[k] !== undefined) f[k] = fbVal(o[k]); });
    return f;
  }

  function fbEnqueue(job) {
    if (!fbEnabled()) return;
    if (FB.queue.length >= CFG.FIREBASE_MAX_QUEUE) FB.queue.shift();   // drop oldest
    FB.queue.push(job);
    fbDrain();
  }
  function fbDrain() {
    if (FB.sending || !FB.queue.length) return;
    FB.sending = true;
    var job = FB.queue[0];
    global.fetch(job.url, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fbFields(job.data) })
    }).then(function (r) {
      if (r.ok) { FB.queue.shift(); FB.ok++; return true; }
      FB.fail++;
      return r.text().then(function (t) {
        FB.lastError = r.status + ' ' + t.slice(0, 160);
        // 4xx other than 429 will never succeed on retry (bad payload / rules);
        // drop it rather than block every later write behind it.
        if (r.status >= 400 && r.status < 500 && r.status !== 429) { FB.queue.shift(); FB.dropped++; }
        return false;
      });
    }).catch(function (e) { FB.fail++; FB.lastError = String(e && e.message || e); return false; })
      .then(function (sent) {
        FB.sending = false;
        QX.set('bg_firebase_ok', FB.ok);
        QX.set('bg_firebase_failed', FB.fail);
        QX.set('bg_firebase_dropped', FB.dropped);
        if (FB.lastError) QX.set('bg_firebase_last_error', FB.lastError);
        // Only back off after a failure; a healthy queue drains immediately.
        if (FB.queue.length) setTimeout(fbDrain, sent ? 0 : CFG.FIREBASE_RETRY_MS);
      });
  }

  // One document per round, matching the schema the exporters already read.
  function fbPushRound(sc, chosen, success, gained, dur, oracle) {
    if (!fbEnabled() || STATE.mode === 'tutorial') return;
    var sv = STATE.ds.metadata && STATE.ds.metadata.scenarioSetVersionId || CFG.DATASET;
    var docId = sv + '__round_' + STATE.round;
    var extra = {
      block: sc.block || '', block_kind: sc.block_kind || '', test_set: sc.test_set || '',
      feedback_enabled: !!sc.feedback_enabled, stress: sc.stress || '',
      source: 'qualtrics_native', survey_arm: CFG.ARM
    };
    fbEnqueue({
      url: fbUrl('Users/' + encodeURIComponent(STATE.participantId) + '/Actions/' + encodeURIComponent(docId)),
      data: {
        type: 'round_summary',
        scenarioSetVersionId: sv,
        round_index: STATE.round,
        scenario_id: sc.scenario_id || '',
        phase: sc.phase || '',
        classification: sc.classification || '',
        study_protocol_id: CFG.STUDY_PROTOCOL_ID || '',
        policy_arm: CFG.ARM || '',
        policy_name: recommendationActive() ? 'oracle_optimal' : '',
        legal_action_mask_version: 'legal_bundle_mask_v1',
        recommendation_source: recommendationActive() ? 'oracle_optimal' : 'none',
        current_city: STATE.city || '',
        final_location: STATE.city || '',
        chosen_orders: chosen,
        shown_recommendation_bundle_ids: recommendedBundle() || [],
        scenario_order_ids: sc.order_ids || [],
        best_bundle_ids: oracle || [],
        success: !!success,
        duration: dur,
        earnings: gained,
        decision_timestamp: new Date().toISOString(),
        // hasOnly() only constrains top-level keys, so design metadata rides here
        state_snapshot: extra,
        outcome_snapshot: { rounds_completed: T.decisions.length, session_seconds: Math.round(sessionClock()) },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  }

  function fbPushProgress() {
    if (!fbEnabled() || STATE.mode === 'tutorial') return;
    var sv = STATE.ds.metadata && STATE.ds.metadata.scenarioSetVersionId || CFG.DATASET;
    var by = {};
    by[sv] = {
      scenarioSetName: CFG.DATASET, currentRound: STATE.round,
      currentLocation: STATE.city || '', roundsCompleted: T.decisions.length,
      earnings: STATE.earnings, totalGameTime: Math.round(sessionClock()),
      lastActivityAt: new Date().toISOString()
    };
    fbEnqueue({
      url: fbUrl('Users/' + encodeURIComponent(STATE.participantId) + '/Progress/progress'),
      data: { progressByScenarioSetVersionId: by }
    });
  }

  // Compact per-scenario action summary — same shape as Users/{id}/Action/actions
  function fbPushActionSummary() {
    if (!fbEnabled() || STATE.mode === 'tutorial') return;
    var sv = STATE.ds.metadata && STATE.ds.metadata.scenarioSetVersionId || CFG.DATASET;
    var byScenario = {};
    T.timings.forEach(function (t) {
      var d = T.decisions.filter(function (x) { return x.r === t.r; })[0];
      if (!d) return;
      byScenario[d.s] = {
        totalTimeSeconds: t.total,
        timeSummary: t.b,
        orderSummary: d.c || []
      };
    });
    var by = {}; by[sv] = { actionsByScenarioId: byScenario };
    fbEnqueue({
      url: fbUrl('Users/' + encodeURIComponent(STATE.participantId) + '/Action/actions'),
      data: { actionsByScenarioSetVersionId: by }
    });
  }

  // Detailed UI timeline — same shape as Users/{id}/DetailedAction/actions
  function fbPushDetailedActions() {
    if (!fbEnabled() || STATE.mode === 'tutorial' || !CFG.DETAILED_TELEMETRY) return;
    var sv = STATE.ds.metadata && STATE.ds.metadata.scenarioSetVersionId || CFG.DATASET;
    var byScenario = {}, currentScenarioId = '';
    T.events.forEach(function (e) {
      if (e[1] === 'round_start') { currentScenarioId = e[3]; byScenario[currentScenarioId] = { timeline: [] }; return; }
      if (!currentScenarioId || !byScenario[currentScenarioId]) return;
      byScenario[currentScenarioId].timeline.push({
        actionType: e[1], targetType: e[2], targetId: e[3],
        startTime: String(e[0]), endTime: String(e[0]),
        metadata: e[4] || null
      });
    });
    var by = {}; by[sv] = { actionsByScenarioId: byScenario };
    fbEnqueue({
      url: fbUrl('Users/' + encodeURIComponent(STATE.participantId) + '/DetailedAction/actions'),
      data: { detailedActionsByScenarioSetVersionId: by }
    });
  }

  function fbPushSummary(final) {
    if (!fbEnabled() || STATE.mode === 'tutorial') return;
    var sv = STATE.ds.metadata && STATE.ds.metadata.scenarioSetVersionId || CFG.DATASET;
    var by = {};
    by[sv] = {
      scenarioSetName: CFG.DATASET, totalRounds: STATE.scenarios.length,
      roundsCompleted: T.decisions.length,
      optimalChoices: T.decisions.filter(function (d) { return d.opt === 1; }).length,
      totalGameTime: Math.round(sessionClock()), earnings: STATE.earnings,
      completedGame: !!final, lastActivityAt: new Date().toISOString(),
      researchStudy: {
        protocol_id: CFG.STUDY_PROTOCOL_ID || '', dataset_root: CFG.DATASET,
        scenario_set_version_id: sv, assigned_arm: CFG.ARM,
        assignment_method: 'qualtrics_survey_flow', source: 'qualtrics_native'
      }
    };
    fbEnqueue({
      url: fbUrl('Users/' + encodeURIComponent(STATE.participantId) + '/Summary/summary'),
      data: { summaryByScenarioSetVersionId: by }
    });
  }

  /* --------------------------------------------------- crash persistence */
  // Qualtrics does not transmit embedded data until the page is submitted, so a
  // reload would otherwise lose the whole run. Checkpoint locally each round.
  function ckKey() {
    return 'bundlegame_ck_' + (CFG.FIELD_PREFIX || 'bg_') + (STATE ? STATE.participantId : '');
  }
  function saveCheckpoint() {
    if (!CFG.RESUME_ON_RELOAD || !STATE) return;
    try {
      global.localStorage.setItem(ckKey(), JSON.stringify({
        v: 1, at: now(), pid: STATE.participantId, dataset: CFG.DATASET, arm: CFG.ARM,
        round: STATE.round, maxRound: STATE.maxRound, city: STATE.city,
        earnings: STATE.earnings, mode: STATE.mode, tutorialDone: STATE.tutorialDone,
        sessionStart: T.sessionStart,
        decisions: T.decisions, timings: T.timings, events: T.events
      }));
    } catch (e) { /* private browsing / quota - not fatal */ }
  }
  function loadCheckpoint(pid) {
    if (!CFG.RESUME_ON_RELOAD) return null;
    try {
      var raw = global.localStorage.getItem('bundlegame_ck_' + (CFG.FIELD_PREFIX || 'bg_') + pid);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || c.v !== 1 || c.pid !== pid || c.dataset !== CFG.DATASET) return null;
      if (!c.decisions || !c.decisions.length) return null;
      return c;
    } catch (e) { return null; }
  }
  function clearCheckpoint() {
    try { global.localStorage.removeItem(ckKey()); } catch (e) { }
  }

  /* -------------------------------------------------------------- state */
  var STATE = null;
  var DATA = null;
  var root = null;

  function boot(container, data, baseConfig) {
    DATA = data;
    CFG = resolveConfig(baseConfig);
    root = container;

    var ds = DATA.datasets[CFG.DATASET];
    if (!ds) { root.innerHTML = '<p style="color:#b91c1c">BundleGame: unknown DATASET "' + CFG.DATASET + '"</p>'; return; }

    var pid = QX.get(CFG.PARTICIPANT_ID_FIELD) || QX.get('ResponseID') || ('anon_' + now());

    STATE = {
      participantId: String(pid),
      ds: ds,
      // TOTAL_ROUNDS counts rounds to PLAY from START_ROUND, so the window must
      // start there rather than always at the top of the dataset.
      scenarios: ds.scenarios.slice(
        Math.max(0, Math.max(1, CFG.START_ROUND) - 1),
        Math.max(0, Math.max(1, CFG.START_ROUND) - 1) + Math.max(1, CFG.TOTAL_ROUNDS)),
      orderById: indexOrders(ds),
      stores: DATA.stores.stores || [],
      cities: DATA.cities || { travelTimes: {} },
      emojis: DATA.emojis || {},
      round: Math.max(1, CFG.START_ROUND),
      maxRound: Math.max(1, CFG.START_ROUND),
      city: String((DATA.cities && DATA.cities.startinglocation) || ''),
      earnings: 0,
      screen: 'select',
      mode: 'main',            // 'instructions' | 'tutorial' | 'main'
      tutorialDone: 0,
      selected: [],
      bags: [],
      cell: [0, 0],
      storeCfg: null,
      deliveries: [],
      busy: false,
      over: false,
      roundStartedAt: 0
    };
    T.sessionStart = now();
    T.events = []; T.decisions = []; T.timings = [];

    var ck = loadCheckpoint(STATE.participantId);
    if (ck) {
      STATE.pendingResume = ck;
      STATE.screen = 'resume';
      render();
      startSessionTimer();
      return;
    }

    logEvent('session_start', 'session', CFG.DATASET, { arm: CFG.ARM });

    // Warm-up runs on its own dataset and does not consume the session clock
    // until the real task begins, so onboarding never eats a participant's time.
    var tut = DATA.datasets[CFG.TUTORIAL_DATASET];
    if (CFG.TUTORIAL_ROUNDS > 0 && tut) {
      STATE.mode = 'tutorial';
      STATE.mainDs = STATE.ds; STATE.mainScenarios = STATE.scenarios; STATE.mainOrders = STATE.orderById;
      STATE.ds = tut;
      STATE.scenarios = tut.scenarios.slice(0, CFG.TUTORIAL_ROUNDS);
      STATE.orderById = indexOrders(tut);
      STATE.round = 1; STATE.maxRound = 1;
    } else if (CFG.TUTORIAL_ROUNDS > 0 && !tut) {
      // Asked for onboarding but the dataset was not built in: say so loudly
      // rather than quietly dropping it.
      if (console && console.error) console.error(
        '[bundlegame] TUTORIAL_DATASET "' + CFG.TUTORIAL_DATASET + '" is not in this build. ' +
        'Rebuild including it, or set TUTORIAL_ROUNDS to 0.');
      QX.set('bg_tutorial_unavailable', 1);
    }

    if (CFG.SHOW_INSTRUCTIONS) { STATE.screen = 'instructions'; render(); }
    else startRound();
    startSessionTimer();
  }

  function indexOrders(ds) {
    var m = {};
    (ds.orders || []).forEach(function (o) { m[String(o.id)] = o; });
    (ds.scenarios || []).forEach(function (s) {
      (s.orders || []).forEach(function (o) { if (!m[String(o.id)]) m[String(o.id)] = o; });
    });
    return m;
  }

  /* --------------------------------------------------------- session flow */
  var sessionTimer = null;
  var roundTimer = null;
  function startSessionTimer() {
    if (sessionTimer) clearInterval(sessionTimer);
    sessionTimer = setInterval(function () {
      if (CFG.SESSION_TIME_LIMIT > 0 && sessionClock() >= CFG.SESSION_TIME_LIMIT) return endSession('time_limit');
      var hud = document.getElementById('bg-clock');
      if (hud) hud.textContent = CFG.SESSION_TIME_LIMIT > 0
        ? fmtTime(CFG.SESSION_TIME_LIMIT - sessionClock()) + ' left'
        : fmtTime(sessionClock());
    }, 250);
  }

  function currentScenario() {
    for (var i = 0; i < STATE.scenarios.length; i++)
      if (Number(STATE.scenarios[i].round) === STATE.round) return STATE.scenarios[i];
    return null;
  }

  function startRound() {
    if (STATE.over) return;
    var sc = currentScenario();
    if (!sc) return endSession('all_rounds_complete');
    STATE.scenario = sc;
    STATE.selected = [];
    STATE.bags = [];
    STATE.deliveries = [];
    STATE.screen = 'select';
    STATE.roundStartedAt = now();
    STATE.maxRound = Math.max(STATE.maxRound, STATE.round);
    T.roundBuckets = newBuckets();
    stopAllPhases();
    logEvent('round_start', 'round', sc.scenario_id, { round: STATE.round });
    startPhase('thinkingTime');
    // Write back on entry as well as on completion, so a participant who
    // abandons mid-round still has their progress recorded.
    if (CFG.FLUSH_EVERY_ROUND) flush(false);
    saveCheckpoint();
    startRoundTimer();
    render();
  }

  // Per-round cap: abandons the round (recorded as a failure) when it expires.
  function startRoundTimer() {
    if (roundTimer) clearInterval(roundTimer);
    if (!(CFG.ROUND_TIME_LIMIT > 0)) return;
    roundTimer = setInterval(function () {
      if (STATE.over) { clearInterval(roundTimer); return; }
      var used = (now() - STATE.roundStartedAt) / 1000;
      var left = CFG.ROUND_TIME_LIMIT - used;
      var hud = document.getElementById('bg-round-clock');
      if (hud) hud.textContent = fmtTime(Math.max(0, left)) + ' this round';
      if (left <= 0) {
        clearInterval(roundTimer); roundTimer = null;
        logEvent('round_timeout', 'round', STATE.scenario.scenario_id);
        stopAllPhases();
        STATE.screen = 'fail';
        completeRound(false, 'round_time_limit');
        render();
      }
    }, 250);
  }

  function endSession(reason) {
    if (STATE.over) return;
    STATE.over = true;
    if (sessionTimer) clearInterval(sessionTimer);
    if (roundTimer) clearInterval(roundTimer);
    stopAllPhases();
    logEvent('session_end', 'session', reason);
    STATE.screen = 'done';
    flush(true);
    fbPushSummary(true);
    fbPushActionSummary();
    fbPushDetailedActions();
    clearCheckpoint();          // a completed run must not offer to resume
    render();
    // Lets the Qualtrics bootstrap re-show the Next button (or auto-advance).
    if (typeof global.BundleGame.onFinish === 'function') {
      try { global.BundleGame.onFinish(reason); } catch (e) { }
    }
  }

  /* ------------------------------------------------ recommendation gate */
  // Whether help is shown this round. The dataset's own feedback_enabled flag is
  // AUTHORITATIVE where present: the CHI design deliberately turns feedback off
  // for the retention (B2) and transfer (B4) blocks, and a flat round window
  // would hand out help during exactly the rounds that measure learning without
  // it. Only fall back to RECOMMENDATION_ROUNDS for datasets with no block design.
  function recommendationActive() {
    if (CFG.ARM === 'control') return false;
    var sc = STATE.scenario || {};
    if (sc.feedback_enabled !== undefined && sc.feedback_enabled !== null) {
      return !!sc.feedback_enabled;
    }
    var r = CFG.RECOMMENDATION_ROUNDS || [];
    return STATE.round >= num(r[0], 1e9) && STATE.round <= num(r[1], -1);
  }
  // Oracle ids are shipped base64-encoded so they are not casually readable.
  function decodeOracle(sc) {
    if (sc.oracle_bundle_ids) return sc.oracle_bundle_ids;
    if (!sc.k) return null;
    try {
      var raw = (typeof atob === 'function')
        ? atob(sc.k)
        : Buffer.from(sc.k, 'base64').toString('binary');
      var v = JSON.parse(raw);
      return Array.isArray(v) && v.length ? v : null;
    } catch (e) { return null; }
  }

  function recommendedBundle() {
    if (!recommendationActive()) return null;
    var sc = STATE.scenario;
    var ids = decodeOracle(sc) || (sc.optimal && sc.optimal.best_bundle_ids) || null;
    if (!ids || !ids.length) {
      // The build strips oracle ids unless --with-oracle was passed. A treated
      // arm with nothing to show would otherwise look exactly like control, so
      // make the gap loud rather than silent.
      if (!STATE.recWarned) {
        STATE.recWarned = true;
        QX.set('bg_recommendation_unavailable', 1);
        logEvent('recommendation_unavailable', 'round', sc.scenario_id, { arm: CFG.ARM });
        if (console && console.error) console.error(
          '[bundlegame] ARM="' + CFG.ARM + '" expects a recommendation but the built dataset has no ' +
          'oracle ids. Rebuild with:  npm run qualtrics:build -- --with-oracle');
      }
      return null;
    }
    return ids.slice();
  }


  /* ------------------------------------------------------------ markup ----
   * These render functions mirror src/routes/home.svelte, order.svelte and
   * bundlegame.svelte class-for-class, so the Qualtrics build looks exactly
   * like the hosted app. The compiled Tailwind from the real build is inlined
   * by qualtrics/build.mjs, so these class names resolve identically.
   * ------------------------------------------------------------------------ */
  function d(cls, kids, attrs) { return el('div', Object.assign({ class: cls }, attrs || {}), kids || []); }
  function sp(cls, txt) { return el('span', { class: cls, text: txt }); }

  /* -------------------------------------------------------------- render */
  function render() {
    root.innerHTML = '';
    var h = hud(); if (h) root.appendChild(h);
    if (STATE.screen === 'resume') root.appendChild(resumeScreen());
    else if (STATE.screen === 'instructions') root.appendChild(instructionsScreen());
    else if (STATE.screen === 'select') root.appendChild(selectScreen());
    else if (STATE.screen === 'store_intro') root.appendChild(storeIntroScreen());
    else if (STATE.screen === 'store') root.appendChild(storeScreen());
    else if (STATE.screen === 'deliver') root.appendChild(deliverScreen());
    else if (STATE.screen === 'tutorial_done') root.appendChild(tutorialDoneScreen());
    else if (STATE.screen === 'feedback') root.appendChild(feedbackScreen());
    else if (STATE.screen === 'fail') root.appendChild(failScreen());
    else if (STATE.screen === 'done') root.appendChild(doneScreen());
  }

  function resumeScreen() {
    var c = STATE.pendingResume;
    return el('div', {}, [
      el('h3', { class: 'bg-h', text: 'Welcome back' }),
      el('p', { text: 'It looks like your game was interrupted after round ' + (c.round - 1) + '. You can pick up where you left off.' }),
      el('div', { class: 'bg-actions' }, [
        el('button', { class: 'bg-btn', onclick: function () { applyResume(true); } }, [document.createTextNode('Continue my game')]),
        el('button', { class: 'bg-btn ghost', onclick: function () { applyResume(false); } }, [document.createTextNode('Start over')])
      ])
    ]);
  }

  function applyResume(keep) {
    var c = STATE.pendingResume;
    STATE.pendingResume = null;
    if (!keep) {
      clearCheckpoint();
      logEvent('session_start', 'session', CFG.DATASET, { arm: CFG.ARM, restarted: 1 });
      startRound();
      return;
    }
    T.decisions = c.decisions || []; T.timings = c.timings || []; T.events = c.events || [];
    T.sessionStart = now() - Math.max(0, (c.at || now()) - (c.sessionStart || c.at || now()));
    STATE.round = c.round; STATE.maxRound = c.maxRound || c.round;
    STATE.city = c.city; STATE.earnings = c.earnings || 0;
    STATE.mode = c.mode || 'main'; STATE.tutorialDone = c.tutorialDone || 0;
    QX.set('bg_resumed', 1);
    logEvent('session_resumed', 'session', CFG.DATASET, { round: c.round });
    startRound();
  }

  function instructionsScreen() {
    var steps = [
      'You are a delivery driver. Each round you are offered a few orders.',
      'Pick one or more to bundle' + (CFG.SAME_STORE_BUNDLES_ONLY ? ' — bundled orders must share a store.' : '.'),
      'In the store, click an aisle to walk to it, type the item name, and enter how many go in each order\u2019s bag.',
      'Check out, then drive each order to its city. Bundling saves time; the wrong bundle wastes it.',
      'You are paid per order, and time is the cost. Earn as much as you can.'
    ].map(function (t, i) { return el('li', { text: t, class: 'bg-step' }); });
    var isTut = STATE.mode === 'tutorial';
    return el('div', {}, [
      el('h3', { class: 'bg-h', text: 'How the game works' }),
      el('ol', { class: 'bg-steps' }, steps),
      el('p', { class: 'bg-muted', text: isTut
        ? 'You will start with ' + STATE.scenarios.length + ' practice round' + (STATE.scenarios.length === 1 ? '' : 's') + '. Practice does not count toward your score.'
        : 'The task starts as soon as you continue.' }),
      el('div', { class: 'bg-actions' }, [
        el('button', { class: 'bg-btn', onclick: function () {
          logEvent('instructions_done', 'button', 'begin');
          startRound();
        } }, [document.createTextNode(isTut ? 'Start practice' : 'Start')])
      ])
    ]);
  }

  // Nudges shown only during the warm-up, mirroring the original tutorial.
  function tutorialHint() {
    if (STATE.mode !== 'tutorial') return null;
    var txt = STATE.round === 1
      ? 'Practice ' + STATE.round + ' of ' + STATE.scenarios.length + ': select ONE order, then work through the store and delivery steps.'
      : 'Practice ' + STATE.round + ' of ' + STATE.scenarios.length + ': try bundling TWO orders from the same store and notice the time you save.';
    return el('div', { class: 'bg-rec', text: txt });
  }

  function hud() {
    // The hosted app shows no global HUD on the selection screen; the store
    // screen carries its own header. Keep a minimal round/earnings strip only
    // where the original had one.
    return null;
  }

  function orderCard(o, selected, onToggle, disabled) {
    var items = Object.keys(o.items || {}).map(function (k) {
      return d('flex justify-between border-b border-slate-100 last:border-0 pb-0.5 last:pb-0', [
        sp('truncate', lower(k)), sp('font-medium ml-1', 'x' + o.items[k])
      ]);
    });
    var base = Math.round(num(o.estimatedTime, 0));
    var cross = cityTravel(STATE.city, o.city, STATE.cities);
    var modeled = base + cross;
    var ring = selected
      ? ' ring-2 ring-green-500 shadow-md transform scale-[1.01]'
      : (!disabled ? ' hover:shadow-md hover:border-blue-300' : '');
    return d('relative rounded-lg bg-white border transition-all cursor-pointer select-none overflow-hidden'
      + (disabled ? ' opacity-60 cursor-not-allowed' : '') + ring + (disabled ? ' bg-dis' : '') + (selected ? ' bg-sel' : ''), [
      d('p-2 space-y-1', [
        d('flex justify-between items-start', [
          d('flex-1 min-w-0', [
            el('h3', { class: 'font-bold text-slate-800 text-sm truncate', text: o.store }),
            el('p', { class: 'text-xs text-slate-500', text: '\uD83D\uDCCD ' + o.city })
          ]),
          d('text-right ml-2', [
            sp('block font-bold text-green-600 text-base', '$' + o.earnings),
            sp('block text-xs text-slate-500', '\u23F1 modeled ' + modeled + 's'),
            sp('block text-[10px] text-slate-400', 'base ' + base + 's' + (cross > 0 ? ' + city ' + Math.round(cross) + 's' : ''))
          ])
        ]),
        d('bg-slate-50 rounded p-1.5 text-xs text-slate-600 space-y-0.5 max-h-[60px] overflow-y-auto', items),
        d('pt-1', [
          el('button', {
            class: 'w-full py-1.5 text-xs font-bold rounded-md transition-colors '
              + (selected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),
            text: selected ? 'Selected \u2713' : 'Add to Tasks'
          })
        ])
      ])
    ], { onclick: function () { if (!disabled) onToggle(); }, 'data-bg': 'order' });
  }

  // MasterData/emojis wins when populated; it is currently empty, so without the
  // CONFIG.ITEM_EMOJI fallback every tile would render as a bare dot.
  function glyphFor(key) {
    var fromData = STATE.emojis && STATE.emojis[key];
    return fromData || (CFG.ITEM_EMOJI && CFG.ITEM_EMOJI[key]) || '·';
  }

  function itemGlyph(name) {
    var key = lower(name);
    if (!CFG.IMAGE_BASE_URL) return el('span', { class: 'bg-emoji', text: glyphFor(key) });
    // A missing upload must degrade to the glyph, not a broken-image icon.
    var img = el('img', {
      class: 'bg-img', alt: key,
      src: CFG.IMAGE_BASE_URL.replace(/\/$/, '') + '/' + key + '.jpg'
    });
    img.addEventListener('error', function () {
      var span = el('span', { class: 'bg-emoji', text: glyphFor(key) });
      if (img.parentNode) img.parentNode.replaceChild(span, img);
      if (!STATE.imgWarned) {
        STATE.imgWarned = 1;
        QX.set('bg_image_load_failed', 1);
        if (console && console.warn) console.warn('[bundlegame] image failed for "' + key +
          '"; falling back to glyphs. Check IMAGE_BASE_URL and that every item is uploaded.');
      }
    });
    return img;
  }

  /* ---------------------------------------------------- screen: select */
  function selectScreen() {
    var sc = STATE.scenario;
    var offered = (sc.order_ids || []).slice(0, CFG.ORDERS_SHOWN)
      .map(function (id) { return STATE.orderById[String(id)]; }).filter(Boolean);
    var maxBundle = Math.min(num(sc.max_bundle, CFG.MAX_BUNDLE), CFG.MAX_BUNDLE);
    var rec = recommendedBundle();
    var thinkLeft = CFG.THINK_TIME > 0
      ? Math.max(0, CFG.THINK_TIME - (now() - STATE.roundStartedAt) / 1000) : 0;
    if (thinkLeft > 0) setTimeout(function () { if (!STATE.over && STATE.screen === 'select') render(); }, thinkLeft * 1000 + 50);

    var cards = offered.map(function (o) {
      var isSel = STATE.selected.indexOf(o.id) >= 0;
      var blocked = !isSel && (STATE.selected.length >= maxBundle || !bundleLegal(selectedOrders().concat([o])));
      return orderCard(o, isSel, function () {
        if (isSel) { STATE.selected.splice(STATE.selected.indexOf(o.id), 1); logEvent('deselect_order', 'order', o.id); }
        else { STATE.selected.push(o.id); logEvent('select_order', 'order', o.id); }
        render();
      }, blocked || thinkLeft > 0);
    });

    var left = [el('h2', { class: 'text-base font-semibold text-slate-800', text: 'Available Orders' })];

    // Study-arm card — the hosted app shows this whenever a protocol is active.
    if (CFG.STUDY_PROTOCOL_ID) {
      var shown = rec && rec.length ? rec : [];
      var card = d('rounded-2xl border p-4 shadow-sm '
        + (shown.length ? 'border-cyan-200 bg-cyan-50' : 'border-slate-200 bg-slate-50'), [
        d('flex flex-wrap items-start justify-between gap-2', [
          d('', [
            el('p', { class: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500', text: 'Study Arm' }),
            el('h3', { class: 'mt-1 text-sm font-semibold text-slate-900',
              text: (CFG.ARM || 'unassigned') + ' \u00b7 ' + (recommendationActive() ? 'oracle_optimal' : 'control') }),
            el('p', { class: 'mt-1 text-xs text-slate-600',
              text: 'Phase ' + (sc.phase || 'Unknown') + (sc.block ? ' \u00b7 ' + sc.block : '') })
          ]),
          d('rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white', [
            document.createTextNode(shown.length ? 'Recommendation Shown' : 'No Recommendation')
          ])
        ])
      ]);
      if (shown.length) {
        card.appendChild(d('mt-3 grid gap-2', [
          d('bg-rec rounded-xl bg-white px-3 py-2 border border-cyan-100', [
            el('p', { class: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700', text: 'Top Bundle' }),
            el('p', { class: 'mt-1 text-sm font-medium text-slate-900', text: shown.join(' + ') })
          ])
        ]));
      } else {
        card.appendChild(el('p', { class: 'mt-3 text-xs text-slate-600',
          text: 'This round is running without a displayed recommendation for your assigned study condition.' }));
      }
      left.push(card);
    }

    left.push(d('grid grid-cols-2 gap-2', cards));

    var label = STATE.selected.length
      ? 'Start ' + STATE.selected.length + ' Order' + (STATE.selected.length === 1 ? '' : 's')
      : 'Select Orders to Start';
    var confirm = el('button', {
      id: 'confirmorder',
      class: 'w-full bg-green-600 text-white font-bold py-2.5 rounded-xl shadow-lg hover:bg-green-700 '
        + 'disabled:opacity-50 disabled:cursor-not-allowed transition text-sm',
      disabled: (STATE.selected.length === 0 || thinkLeft > 0) ? 'disabled' : null,
      onclick: goToStore
    }, [document.createTextNode(thinkLeft > 0 ? 'Review Time: ' + Math.ceil(thinkLeft) + 's' : label)]);
    left.push(d('bg-slate-50 p-3 rounded-xl border flex flex-col items-center gap-2 sticky bottom-2', [confirm]));

    // The hosted app renders a MapTiler map here. Without a map key the panel
    // stays, showing the current city, so the layout matches.
    var right = d('h-[400px] bg-slate-100 rounded-xl border shadow-sm overflow-hidden relative', [
      d('w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1', [
        sp('text-3xl', '\uD83D\uDCCD'),
        sp('text-sm font-medium', 'You are in ' + (STATE.city || '\u2014')),
        sp('text-xs', 'Round ' + STATE.round + ' of ' + STATE.scenarios.length)
      ])
    ]);

    return el('section', { class: 'mx-auto max-w-7xl px-3 pt-0 pb-3 space-y-3' }, [
      practiceBadge(),
      d('grid lg:grid-cols-[55%_45%] gap-4', [d('space-y-2', left), right])
    ]);
  }

  function shortId(id) { return String(id).replace(/^.*?(\d+)$/, '#$1'); }
  function selectedOrders() {
    return STATE.selected.map(function (id) { return STATE.orderById[String(id)]; }).filter(Boolean);
  }

  function goToStore() {
    var sel = selectedOrders();
    if (!sel.length) return;
    stopPhase('thinkingTime');
    startPhase('startPickingConfirmationTime');
    logEvent('confirm_order', 'button', 'confirmorder', { n: sel.length });

    STATE.storeCfg = storeConfigFor(sel[0].store, STATE.stores) || { Entrance: [0, 0], locations: [['']], cellDistance: 1000 };
    STATE.cell = (STATE.storeCfg.Entrance || [0, 0]).slice();
    STATE.bags = sel.map(function () { return {}; });
    STATE.screen = 'store_intro';        // GameState 0 in the hosted app
    render();
  }

  function startPicking() {
    stopPhase('startPickingConfirmationTime');
    startPhase('itemAddToCartTime');
    STATE.cell = (STATE.storeCfg.Entrance || [0, 0]).slice();
    STATE.screen = 'store';
    logEvent('start_picking', 'button', 'startorder');
    render();
  }

  function practiceBadge() {
    if (STATE.mode !== 'tutorial') return null;
    return d('bg-practice rounded-lg bg-fuchsia-50 border border-fuchsia-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-fuchsia-800',
      [document.createTextNode('Practice')]);
  }

  function storeHeader() {
    var sel = selectedOrders();
    var earned = sel.reduce(function (a, o) { return a + num(o.earnings, 0); }, 0);
    var left = CFG.ROUND_TIME_LIMIT > 0
      ? Math.max(0, CFG.ROUND_TIME_LIMIT - (now() - STATE.roundStartedAt) / 1000) : null;
    return d('flex items-center justify-between bg-white p-2 rounded-xl border shadow-sm', [
      d('', [
        el('h1', { class: 'text-base font-bold text-slate-800', text: (sel[0] && sel[0].store) || 'Store' }),
        el('p', { class: 'text-xs text-slate-500', text: 'Aisle: ' + (lower(currentCellValue()) || 'entrance') })
      ]),
      d('text-right', [
        d('text-lg font-bold text-green-600', [document.createTextNode('$' + earned)]),
        d('text-xs text-slate-400 font-mono' + (left !== null && left < 60 ? ' text-red-500 font-bold' : ''),
          [document.createTextNode(left === null ? '\u23F1\uFE0F No time limit' : '\u23F1\uFE0F ' + fmtTime(left))])
      ])
    ]);
  }

  function storeIntroScreen() {
    return el('main', { class: 'mx-auto max-w-6xl px-4 py-2 space-y-3' }, [
      practiceBadge(),
      storeHeader(),
      d('text-center py-8', [
        el('button', {
          id: 'startorder',
          class: 'bg-green-600 text-white px-6 py-3 rounded-full text-base font-bold shadow-lg hover:bg-green-700 transition',
          onclick: startPicking
        }, [document.createTextNode('Start Picking (' + STATE.selected.length + ' Orders)')])
      ])
    ]);
  }

  /* ----------------------------------------------------- screen: store */
  function storeScreen() {
    var sel = selectedOrders();
    var grid = gridOf(STATE.storeCfg);
    var atItem = currentCellValue();

    // picker column: item entry
    var pick = d('min-w-0 bg-white p-3 rounded-xl border shadow-sm space-y-2', [
      el('label', { class: 'block text-xs font-bold text-slate-700 uppercase', text: 'Item to Be Picked' }),
      el('input', { class: 'w-full text-base border-2 border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none',
        id: 'bg-item-in', placeholder: 'Type item name...' }),
      el('button', { id: 'addtobag',
        class: 'w-full bg-blue-600 text-white font-bold py-2 rounded-lg shadow hover:bg-blue-700 transition text-sm',
        onclick: addToBags }, [document.createTextNode('Add to Selected Bags')])
    ]);

    var bagCols = sel.map(function (o, idx) {
      var list = Object.keys(o.items || {}).map(function (k) {
        return d('flex justify-between gap-1', [sp('truncate', lower(k)), sp('shrink-0', 'x' + o.items[k])]);
      });
      var inBag = Object.keys(STATE.bags[idx] || {}).map(function (k) {
        return d('flex justify-between items-center gap-1', [
          sp('truncate', k),
          d('flex items-center gap-0.5', [
            el('button', { class: 'w-4 h-4 bg-red-100 text-red-600 rounded text-[10px] hover:bg-red-200 ml-0.5',
              onclick: function (ev) { if (ev && ev.stopPropagation) ev.stopPropagation();
                delete STATE.bags[idx][k]; logEvent('remove_item_from_bag', 'item', k, { bag: idx + 1 }); render(); }
            }, [document.createTextNode('\u00d7')]),
            sp('min-w-[16px] text-center', String(STATE.bags[idx][k]))
          ])
        ]);
      });
      if (!inBag.length) inBag = [el('p', { class: 'text-slate-400 text-[10px] italic', text: 'Empty' })];

      return d('min-w-0 bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1', [
        d('flex justify-between items-start', [
          d('min-w-0', [
            el('h3', { class: 'font-bold text-slate-800 text-sm', text: 'Order ' + (idx + 1) + ': ' + o.id }),
            el('p', { class: 'text-[10px] text-slate-500 truncate', text: '\uD83D\uDCCD Deliver to: ' + o.city }),
            el('p', { class: 'text-[10px] text-slate-400 truncate',
              text: 'modeled base ' + Math.round(num(o.estimatedTime, 0)) + 's \u00b7 local delivery ' + Math.round(num(o.localTravelTime, 0)) + 's' })
          ]),
          d('flex flex-col items-end', [
            el('label', { class: 'text-[10px] font-bold text-slate-500 uppercase', text: 'Qty' }),
            el('input', { type: 'number', min: '0', id: 'bg-qty-' + idx, placeholder: '0',
              class: 'w-14 text-center font-bold border rounded p-1 text-sm' })
          ])
        ]),
        d('grid grid-cols-2 gap-1 text-xs', [
          d('bg-white p-1.5 rounded border', [el('p', { class: 'font-semibold text-slate-500 text-[10px]', text: 'Shopping List' })].concat(list)),
          d('bg-blue-50 p-1.5 rounded border border-blue-100', [el('p', { class: 'font-semibold text-blue-600 text-[10px]', text: 'In Bag' })].concat(inBag))
        ])
      ]);
    });

    var pickerGrid = d('grid gap-3', [pick].concat(bagCols));
    pickerGrid.setAttribute('style', 'grid-template-columns: repeat(' + Math.max(2, sel.length + 1) + ', minmax(0, 1fr));');

    var rows = grid.map(function (row, ri) {
      var cells = row.map(function (cellVal, ci) {
        var here = STATE.cell[0] === ri && STATE.cell[1] === ci;
        var empty = !String(cellVal || '').trim();
        var kids = empty ? [] : [sp('', lower(cellVal))];
        if (!empty) { var g = glyphFor(lower(cellVal)); if (g && g !== '\u00b7') kids.push(sp('text-xl mt-0.5', g)); }
        return el('button', {
          class: 'flex min-h-[60px] flex-col items-center justify-center rounded-lg text-xs font-medium transition '
            + (here ? 'bg-green-100 border-2 border-green-500 text-green-900 shadow-sm' : 'border border-slate-200 bg-white hover:bg-slate-50'),
          disabled: (empty || STATE.busy) ? 'disabled' : null,
          'data-bg': 'cell', 'data-item': lower(cellVal),
          onclick: function () { moveTo(ri, ci, cellVal); }
        }, kids);
      });
      var r = d('bg-store grid gap-1.5', cells);
      r.setAttribute('style', 'grid-template-columns: repeat(' + Math.max(1, row.length) + ', minmax(0, 1fr));');
      return r;
    });

    var actions = d('flex justify-between pt-2 border-t', []);
    if (CFG.ALLOW_GIVE_UP) actions.appendChild(el('button', { class: 'text-red-500 font-bold text-sm', onclick: giveUp },
      [document.createTextNode('Give Up')]));
    actions.appendChild(el('button', { id: 'checkout_and_deliver',
      class: 'bg-green-600 text-white px-5 py-2 rounded-full font-bold shadow text-sm', onclick: checkout },
      [document.createTextNode('Checkout & Deliver')]));

    var kids = [];
    if (STATE.busy) kids.push(d('bg-blue-50 border border-blue-100 rounded-lg p-2 text-center text-sm font-medium text-blue-700',
      [document.createTextNode('Walking to the aisle\u2026')]));
    kids.push(pickerGrid);
    kids.push(d('space-y-3', [d('space-y-1.5', rows), actions]));

    return el('main', { class: 'mx-auto max-w-6xl px-4 py-2 space-y-3' },
      [practiceBadge(), storeHeader(), d('space-y-4', kids)]);
  }

  function currentCellValue() {
    var row = gridOf(STATE.storeCfg)[STATE.cell[0]] || [];
    return String(row[STATE.cell[1]] || '').trim();
  }

  function moveTo(ri, ci, value) {
    if (STATE.busy || !String(value || '').trim()) return;
    var dist = Math.abs(ri - STATE.cell[0]) + Math.abs(ci - STATE.cell[1]);
    var secs = dist * (num(STATE.storeCfg.cellDistance, 1000) / 1000);
    STATE.busy = true;
    stopPhase('itemAddToCartTime');
    addTime('aisleTravelTime', secs);
    render();
    setTimeout(function () {
      if (STATE.over) return;              // stale walk after session end
      STATE.cell = [ri, ci];
      STATE.busy = false;
      logEvent('move_aisle', 'item', lower(value), { travelDuration: secs });
      startPhase('itemAddToCartTime');
      render();
    }, secs * 1000);
  }

  function addToBags() {
    var item = currentCellValue();
    if (!item) return;
    var typed = (document.getElementById('bg-item-in') || {}).value || '';
    if (CFG.REQUIRE_ITEM_TYPING && lower(typed) !== lower(item)) {
      logEvent('item_entry_failed', 'item', lower(item), { entered: lower(typed) });
      alert('Incorrect — type the item name: ' + lower(item));
      return;
    }
    var affected = [], any = false;
    for (var i = 0; i < STATE.bags.length; i++) {
      var q = parseInt((document.getElementById('bg-qty-' + i) || {}).value, 10);
      if (isFinite(q) && q > 0) {
        any = true;
        STATE.bags[i][lower(item)] = (STATE.bags[i][lower(item)] || 0) + q;
        affected.push({ bagId: 'bag_' + (i + 1), quantity: q });
      }
    }
    if (!any) { alert('Enter a quantity for at least one order.'); return; }
    logEvent('add_item_to_bag', 'item', lower(item), { bagsAffected: affected });
    render();
  }

  // Each order must be satisfiable by exactly one distinct bag (items + quantities).
  function bagsMatchOrders(sel, bags) {
    var used = {};
    for (var oi = 0; oi < sel.length; oi++) {
      var want = {}, k;
      for (k in (sel[oi].items || {})) want[lower(k)] = sel[oi].items[k];
      var found = false;
      for (var bi = 0; bi < bags.length && !found; bi++) {
        if (used[bi]) continue;
        var bag = bags[bi];
        if (Object.keys(bag).length !== Object.keys(want).length) continue;
        var ok = true;
        for (k in bag) if (want[k] !== bag[k]) { ok = false; break; }
        if (ok) { used[bi] = 1; found = true; }
      }
      if (!found) return false;
    }
    return true;
  }

  function checkout() {
    var sel = selectedOrders();
    stopPhase('itemAddToCartTime');
    if (!bagsMatchOrders(sel, STATE.bags)) {
      logEvent('delivery_validation_failed', 'button', 'checkout_and_deliver');
      addTime('penaltyTime', CFG.PENALTY_TIMEOUT);
      STATE.screen = 'fail';
      completeRound(false);
      render();
      return;
    }
    logEvent('delivery_validation_passed', 'button', 'checkout_and_deliver');
    STATE.deliveries = sel.map(function (o) {
      return { id: o.id, city: o.city, localTravelTime: num(o.localTravelTime, 0), delivered: false };
    });
    STATE.screen = 'deliver';
    render();
  }

  function giveUp() {
    if (!confirm('Give up this round? A ' + CFG.PENALTY_TIMEOUT + 's penalty applies.')) return;
    logEvent('give_up', 'button', 'giveup');
    addTime('penaltyTime', CFG.PENALTY_TIMEOUT);
    STATE.screen = 'fail';
    completeRound(false);
    render();
  }

  /* -------------------------------------------------- screen: delivery */
  function deliverScreen() {
    var rows = STATE.deliveries.map(function (dl, i) {
      var cross = cityTravel(STATE.city, dl.city, STATE.cities);
      var total = dl.localTravelTime + cross;
      var right = dl.delivered
        ? [sp('text-xs text-green-600 font-medium', 'Delivered \u2713')]
        : [
          el('p', { class: 'text-xs text-slate-600', text: '\uD83D\uDE97 ' + total + 's delivery time' }),
          el('button', {
            class: 'text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 mt-1 '
              + 'disabled:opacity-50 disabled:cursor-not-allowed',
            disabled: STATE.busy ? 'disabled' : null,
            onclick: function () { doDeliver(i, total, cross); }
          }, [document.createTextNode('Deliver')])
        ];
      return d('flex items-center justify-between bg-white p-2 rounded-lg border text-sm'
        + (dl.delivered ? ' opacity-50' : ''), [
        d('flex items-center gap-2', [
          sp('text-lg', dl.delivered ? '\u2705' : '\uD83D\uDCE6'),
          d('', [
            el('p', { class: 'font-medium text-slate-800', text: dl.id }),
            el('p', { class: 'text-xs text-slate-500', text: '\uD83D\uDCCD ' + dl.city }),
            el('p', { class: 'text-[11px] text-slate-400',
              text: 'local ' + Math.round(dl.localTravelTime) + 's' + (cross > 0 ? ' + city ' + Math.round(cross) + 's' : '') })
          ])
        ]),
        d('text-right', right)
      ]);
    });

    var mid = STATE.busy
      ? d('p-6 bg-blue-50 border-b text-center', [
        d('animate-bounce text-4xl mb-2', [document.createTextNode('\uD83D\uDE97')]),
        el('h3', { class: 'font-bold text-lg text-slate-800', text: 'Driving\u2026' })
      ])
      : d('p-3 bg-slate-50 border-b', [
        el('p', { class: 'text-xs font-semibold text-slate-600 mb-2', text: 'Deliveries Remaining:' }),
        d('grid gap-2', rows)
      ]);

    return el('main', { class: 'mx-auto max-w-6xl px-4 py-2 space-y-3' }, [
      practiceBadge(),
      d('bg-white rounded-xl shadow-lg border overflow-hidden', [
        d('bg-slate-800 p-3 text-white flex justify-between items-center', [
          el('h2', { class: 'text-base font-bold', text: '\uD83D\uDE9A Deliver Orders' }),
          sp('text-xs bg-slate-700 px-2 py-1 rounded', '\uD83D\uDCCD Current: ' + (STATE.city || ''))
        ]),
        mid,
        d('p-3', [
          d('text-center text-xs text-slate-500', [document.createTextNode(
            'Delivery time uses local delivery time plus city travel from your current city. '
            + 'Your location updates after each delivery.')])
        ])
      ])
    ]);
  }

  function doDeliver(idx, total, cross) {
    if (STATE.busy) return;
    var d = STATE.deliveries[idx];
    STATE.busy = true;
    render();
    setTimeout(function () {
      if (STATE.over) return;              // stale delivery after session end
      addTime('localDeliveryTime', d.localTravelTime);
      addTime('cityTravelTime', cross);
      d.delivered = true;
      STATE.city = d.city;                 // player's city carries forward
      STATE.busy = false;
      logEvent('deliver_order', 'order', d.id, { deliveryDuration: total });
      var all = STATE.deliveries.every(function (x) { return x.delivered; });
      if (all) completeRound(true); else render();
    }, total * 1000);
  }

  /* ------------------------------------------------------ round wrap-up */
  function completeRound(success, reasonOverride) {
    if (STATE.over) return;
    if (roundTimer) { clearInterval(roundTimer); roundTimer = null; }
    stopAllPhases();
    var sel = selectedOrders();
    var sc = STATE.scenario;
    var gained = success ? sel.reduce(function (a, o) { return a + num(o.earnings, 0); }, 0) : 0;
    if (STATE.mode !== 'tutorial') STATE.earnings += gained;   // practice does not pay

    var dur = (now() - STATE.roundStartedAt) / 1000;
    var oracle = decodeOracle(sc) || (sc.optimal && sc.optimal.best_bundle_ids) || [];
    var chosen = STATE.selected.slice();
    var exact = oracle.length === chosen.length &&
      oracle.slice().sort().join('|') === chosen.slice().sort().join('|');

    T.decisions.push({
      r: STATE.round,
      s: sc.scenario_id,
      p: sc.phase || '',
      c: chosen,
      ok: success ? 1 : 0,
      e: gained,
      d: Math.round(dur * 10) / 10,
      city: STATE.city,
      arm: CFG.ARM,
      rec: recommendedBundle() || [],
      opt: exact ? 1 : 0,
      end: reasonOverride || (success ? 'completed' : 'failed_checkout'),
      tut: STATE.mode === 'tutorial' ? 1 : 0,
      blk: sc.block || '',
      bk: sc.block_kind || '',
      ts: sc.test_set || '',
      fb: sc.feedback_enabled ? 1 : 0,
      st: sc.stress || ''
    });
    // Whatever the explicit buckets did not account for is idle/other, matching
    // the original's residual definition so the eight buckets sum to the round.
    var accounted = 0;
    TIMING_KEYS.forEach(function (k) { if (k !== 'idleOrOtherTime') accounted += T.roundBuckets[k]; });
    T.roundBuckets.idleOrOtherTime = Math.max(0, dur - accounted);
    T.timings.push({ r: STATE.round, total: Math.round(dur * 10) / 10, b: clone(T.roundBuckets) });
    logEvent('round_end', 'round', sc.scenario_id, { success: success ? 1 : 0, earnings: gained });

    if (CFG.FLUSH_EVERY_ROUND) flush(false);
    saveCheckpoint();
    fbPushRound(sc, chosen, success, gained, Math.round(dur * 10) / 10, oracle);
    fbPushProgress();
    fbPushSummary(false);
    fbPushActionSummary();
    // The timeline is large; send it every few rounds and again at the end.
    if (T.decisions.length % 5 === 0) fbPushDetailedActions();

    if (!success) return;                 // fail screen holds until they continue
    if (CFG.SHOW_FEEDBACK_AFTER_ROUND && recommendationActive()) {
      STATE.feedback = buildFeedback(chosen, oracle, gained);
      STATE.screen = 'feedback';
      render();
      return;
    }
    advance();
  }

  function advance() {
    if (STATE.over) return;
    STATE.round += 1;
    if (STATE.mode === 'tutorial' && !currentScenario()) return finishTutorial();
    if (!currentScenario()) return endSession('all_rounds_complete');
    if (CFG.SESSION_TIME_LIMIT > 0 && sessionClock() >= CFG.SESSION_TIME_LIMIT) return endSession('time_limit');
    startRound();
  }

  // Counterfactual feedback: what the recommended bundle would have paid.
  function buildFeedback(chosen, oracle, gained) {
    if (!oracle || !oracle.length) return null;
    var alt = oracle.map(function (id) { return STATE.orderById[String(id)]; }).filter(Boolean);
    var altPay = alt.reduce(function (a, o) { return a + num(o.earnings, 0); }, 0);
    return {
      chosen: chosen.slice(), oracle: oracle.slice(), gained: gained, altPay: altPay,
      matched: oracle.slice().sort().join('|') === chosen.slice().sort().join('|')
    };
  }

  function feedbackScreen() {
    var f = STATE.feedback;
    var kids = [el('h3', { class: 'bg-h', text: 'Round ' + STATE.round + ' feedback' })];
    if (!f) kids.push(el('p', { class: 'bg-muted', text: 'No comparison available for this round.' }));
    else if (f.matched) kids.push(el('p', { text: 'You chose the suggested bundle and earned $' + f.gained + '.' }));
    else {
      kids.push(el('p', { text: 'You earned $' + f.gained + '.' }));
      kids.push(el('p', { class: 'bg-rec', text: 'The suggested bundle (' + f.oracle.map(shortId).join(' + ') + ') would have paid $' + f.altPay + '.' }));
    }
    kids.push(el('div', { class: 'bg-actions' }, [
      el('button', { class: 'bg-btn', onclick: advance }, [document.createTextNode('Next round')])
    ]));
    return el('div', {}, kids);
  }

  // Swap the warm-up dataset out for the real one and restart the clock.
  function finishTutorial() {
    STATE.tutorialDone = 1;
    STATE.mode = 'main';
    STATE.ds = STATE.mainDs;
    STATE.scenarios = STATE.mainScenarios;
    STATE.orderById = STATE.mainOrders;
    STATE.round = Math.max(1, CFG.START_ROUND);
    STATE.maxRound = STATE.round;
    STATE.earnings = 0;
    STATE.city = String((DATA.cities && DATA.cities.startinglocation) || '');
    T.sessionStart = now();          // the real task gets the full session budget
    QX.set('bg_tutorial_completed', 1);
    logEvent('tutorial_end', 'session', CFG.TUTORIAL_DATASET);
    STATE.screen = 'tutorial_done';
    render();
  }

  function tutorialDoneScreen() {
    return el('div', {}, [
      el('h3', { class: 'bg-h', text: 'Practice complete' }),
      el('p', { text: 'That was practice. The real task starts now and your score counts from here.' }),
      el('div', { class: 'bg-actions' }, [
        el('button', { class: 'bg-btn', onclick: startRound }, [document.createTextNode('Start the task')])
      ])
    ]);
  }

  function failScreen() {
    return el('div', {}, [
      el('h3', { class: 'bg-h', text: 'Order incorrect' }),
      el('p', { class: 'bg-muted', text: 'The bags did not match the orders. A ' + CFG.PENALTY_TIMEOUT + 's penalty was applied.' }),
      el('div', { class: 'bg-actions' }, [
        el('button', { class: 'bg-btn', onclick: advance }, [document.createTextNode('Next round')])
      ])
    ]);
  }

  function doneScreen() {
    return el('div', {}, [
      el('h3', { class: 'bg-h', text: 'Game complete' }),
      el('p', { text: 'You completed ' + T.decisions.length + ' rounds and earned $' + STATE.earnings + '.' }),
      el('p', { class: 'bg-muted', text: 'Click the arrow below to continue the survey.' })
    ]);
  }


  /* ---------------------------------------------------------- public API */
  global.BundleGame = {
    boot: boot,
    // Called by the Qualtrics addOnUnload hook so a mid-run advance still saves.
    flushNow: function () { if (STATE) flush(false); },
    onFinish: null,
    // exposed for the local test harness / unit tests
    _internals: {
      resolveConfig: resolveConfig, bundleLegal: bundleLegal, bagsMatchOrders: bagsMatchOrders,
      cityTravel: cityTravel, chunkString: chunkString, gridOf: gridOf,
      forceEnd: function (r) { endSession(r || 'forced'); },
      setConfig: function (c) { CFG = c; }
    }
  };
})(typeof window !== 'undefined' ? window : this);
