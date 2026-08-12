/* =============================================================================
 * Qualtrics entry point for the REAL Svelte game.
 * =============================================================================
 * Mounts src/routes/GamePage.svelte — the same 700-line component src/routes/
 * +page.svelte renders on Vercel. Not a reproduction and not a subset: the auth
 * gate, the session lifecycle (finalizeMainGameSession / completion handoff),
 * the CHI feedback panel, timers and every Firebase write come along with it.
 *
 * The only Qualtrics-specific behaviour is pre-filling the participant id so a
 * survey respondent is not asked to log in again, and reporting progress into
 * embedded data.
 * ========================================================================== */
import GamePage from '../../src/routes/GamePage.svelte';
import {
  game, orders, scenarios, currentRound, id as participantId,
  elapsed, GameOver, needsAuth, completionState, createNewUser,
  startTimer, resetTimer, resumeElapsedSeconds, orderList, ordersShown
} from '../../src/lib/bundle.js';
import { queueNFixedOrders } from '../../src/lib/config.js';
import { authUser, participantStudyState } from '../../src/lib/bundle.js';
import { generateAuthToken } from '../../src/lib/authToken.js';
import { get } from 'svelte/store';
import { mount } from 'svelte';

/**
 * @param {HTMLElement} target
 * @param {object} payload  inlined datasets (unused on the normal path; the app
 *                          loads MasterData from Firestore exactly as on Vercel)
 * @param {object} cfg      CONFIG block from the Qualtrics build
 * @param {function} report (key, value) -> Qualtrics embedded data
 */
export async function mountGame(target, payload, cfg, report) {
  const note = typeof report === 'function' ? report : () => { };
  const pid = String(cfg.__participantId || '').trim();

  // Qualtrics already identified the participant; seed the id so GamePage's own
  // auth gate resolves instead of prompting for User ID + Token.
  if (pid) participantId.set(pid);

  const wrap = document.createElement('div');
  target.appendChild(wrap);

  const app = mount(GamePage, {
    target: wrap,
    props: cfg.DATASET ? { scenarioSetOverride: cfg.DATASET } : {}
  });

  // The participant is already identified by Qualtrics, so rather than bypass
  // the login we complete it: the app's token is deterministic from the id
  // (authToken.js), so we can fill the real form and submit it. Nothing in the
  // app is modified, and the whole real start() path runs — including the
  // Firebase writes and session lifecycle.
  if (pid && cfg.SKIP_AUTH !== false) {
    const token = generateAuthToken(pid);
    try {
      const ok = await authUser(pid, token);
      note('bg_auth_precheck', ok === 1 ? 'valid' : 'rejected');
    } catch (e) { note('bg_auth_precheck', 'error'); }

    // Drive the real form so GamePage's own start() runs.
    const fill = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const tryLogin = (attempt) => {
      const idEl = wrap.querySelector('#main-user-id');
      const pwEl = wrap.querySelector('input[type=password], #main-user-token');
      const btn = Array.from(wrap.querySelectorAll('button'))
        .find((b) => /enter simulation/i.test(b.textContent || ''));
      if (!idEl || !btn) {
        if (attempt < 40) return setTimeout(() => tryLogin(attempt + 1), 250);
        return note('bg_auth_mode', 'form_not_found');
      }
      fill(idEl, pid);
      if (pwEl) fill(pwEl, token);
      btn.click();
      note('bg_auth_mode', 'auto_login_submitted');
    };
    tryLogin(0);

    // The app assigns the arm itself (stable_hash on the participant id) and
    // rewrites participantStudyState at several points during boot, so a one-off
    // set loses the race. Subscribe instead and correct any write that does not
    // match the arm this survey was built for. The guard on assigned_arm keeps
    // this from looping on our own set.
    if (cfg.ARM) {
      let pinning = false;
      participantStudyState.subscribe((cur) => {
        if (pinning || !cur || typeof cur !== 'object') return;
        if (cur.assigned_arm === cfg.ARM) return;
        pinning = true;
        try {
          participantStudyState.set(Object.assign({}, cur, {
            assigned_arm: cfg.ARM,
            policy_arm: cfg.ARM,
            assignment_method: 'qualtrics_survey_arm'
          }));
        } finally { pinning = false; }
      });
      note('bg_arm_pinned', cfg.ARM);
    }
  }


  note('bg_ui', 'real_gamepage');
  note('bg_dataset', cfg.DATASET || '');

  // Mirror progress into embedded data. The app's own Firestore writes remain
  // the authoritative record; this is the survey-side copy.
  try {
    currentRound.subscribe((r) => {
      note('bg_round_current', r);
      note('bg_round_reached', r);
    });
    GameOver.subscribe((over) => { if (over) note('bg_finished', 1); });
    completionState.subscribe((c) => {
      if (c && typeof c === 'object') note('bg_completion_state', JSON.stringify(c).slice(0, 400));
    });
    needsAuth.subscribe((n) => note('bg_needs_auth', n ? 1 : 0));
  } catch (e) { note('bg_subscribe_error', String((e && e.message) || e).slice(0, 200)); }

  return { app, stores: { game, orders, scenarios, currentRound, elapsed, GameOver, get } };
}

if (typeof window !== 'undefined') window.BundleGameReal = { mountGame };
