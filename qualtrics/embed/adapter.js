/* =============================================================================
 * Qualtrics adapter for the REAL bundled Svelte game.
 * =============================================================================
 * The game itself is untouched app code (qualtrics/embed/dist/real.js) and keeps
 * writing to Firestore through its own code paths, exactly as the hosted version
 * does. This layer only:
 *   - resolves CONFIG from bg_* embedded data
 *   - mounts the app into the question
 *   - mirrors progress into Qualtrics embedded data
 *   - manages the Next button
 * ========================================================================== */
(function (global) {
  'use strict';

  var TRUTHY = { 'true': 1, '1': 1, 'yes': 1, 'y': 1, 'on': 1 };
  var FALSY = { 'false': 1, '0': 1, 'no': 1, 'n': 1, 'off': 1 };

  function qxGet(k) {
    try { return Qualtrics.SurveyEngine.getEmbeddedData(k); } catch (e) { return null; }
  }
  function qxSet(k, v) {
    try { Qualtrics.SurveyEngine.setEmbeddedData(k, v); } catch (e) { }
  }

  function resolveConfig(base) {
    var out = JSON.parse(JSON.stringify(base));
    Object.keys(base).forEach(function (key) {
      var raw = qxGet('bg_' + key);
      if (raw == null || raw === '') return;
      var def = base[key], s = String(raw).trim();
      if (typeof def === 'number') { var n = Number(s); if (isFinite(n)) out[key] = n; }
      else if (typeof def === 'boolean') {
        if (TRUTHY[s.toLowerCase()]) out[key] = true;
        else if (FALSY[s.toLowerCase()]) out[key] = false;
      } else if (Array.isArray(def)) {
        try { var p = JSON.parse(s); if (Array.isArray(p)) out[key] = p; } catch (e) { }
      } else out[key] = s;
    });
    return out;
  }

  async function boot(target, payload, baseConfig, page) {
    var cfg = resolveConfig(baseConfig);
    cfg.__participantId = String(qxGet(cfg.PARTICIPANT_ID_FIELD) || qxGet('userID') || qxGet('ResponseID') || ('anon_' + Date.now()));

    qxSet('bg_participant_id', cfg.__participantId);
    qxSet('bg_dataset', cfg.DATASET);
    qxSet('bg_arm', cfg.ARM);
    qxSet('bg_ui', 'real_svelte_bundle');
    qxSet('bg_fallback_url', 'https://bundlegame-no-company.vercel.app');

    var handle;
    try {
      handle = await global.BundleGameReal.mountGame(target, payload, cfg, qxSet);
    } catch (e) {
      qxSet('bg_mount_error', String((e && e.message) || e));
      target.innerHTML = '<p style="color:#b91c1c">The game failed to load. Please contact the researcher.</p>';
      try { page.showNextButton(); } catch (e2) { }
      if (console && console.error) console.error('[bundlegame] mount failed', e);
      return null;
    }

    // Mirror progress into Qualtrics. The game's own Firebase writes are the
    // authoritative record; this is the survey-side copy.
    var S = handle.stores, get = S.get;
    var started = Date.now();
    function sync() {
      try {
        var round = get(S.currentRound);
        var g = get(S.game) || {};
        qxSet('bg_round_current', round);
        qxSet('bg_session_seconds', Math.round((Date.now() - started) / 1000));
        if (g.earned != null) qxSet('bg_earnings', g.earned);
      } catch (e) { }
    }
    var iv = setInterval(sync, 2000);

    try {
      S.currentRound.subscribe(function (r) {
        qxSet('bg_round_current', r);
        qxSet('bg_round_reached', Math.max(Number(qxGet('bg_round_reached') || 0), Number(r) || 0));
      });
      S.game.subscribe(function (g) {
        if (g && g.over) {
          clearInterval(iv);
          qxSet('bg_finished', 1);
          sync();
          try { page.showNextButton(); } catch (e) { }
          if (cfg.AUTO_ADVANCE) setTimeout(function () {
            try { page.clickNextButton(); } catch (e) { }
          }, 2500);
        }
      });
    } catch (e) { qxSet('bg_subscribe_error', String((e && e.message) || e)); }

    return handle;
  }

  global.BundleGameQualtrics = { boot: boot, resolveConfig: resolveConfig };
})(typeof window !== 'undefined' ? window : this);
