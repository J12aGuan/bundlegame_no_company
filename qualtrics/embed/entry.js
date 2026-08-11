/* =============================================================================
 * Qualtrics entry point for the REAL Svelte game.
 * =============================================================================
 * This mounts src/routes/home.svelte and src/routes/bundlegame.svelte — the same
 * components Vercel serves — so the UI is identical by construction rather than
 * by reproduction. The only thing replaced is how the game gets its data:
 * instead of loadGame() reading Firestore, the dataset is injected from the
 * payload the Qualtrics build inlines.
 *
 * Firebase itself is NOT stubbed: the bundled app writes participant data with
 * its own code paths, exactly as the hosted version does.
 * ========================================================================== */
import Game from './Game.svelte';
import {
  game, orders, scenarios, currLocation, currentRound, id as participantId,
  gameMode, scenarioSetVersionId, emojisMap, roundTimeLimit, elapsed,
  startTimer, resetTimer
} from '../../src/lib/bundle.js';
import { switchJob, setPenaltyTimeout } from '../../src/lib/config.js';
import { get } from 'svelte/store';
import { mount } from 'svelte';   // Svelte 5: `new Component()` was removed

function hydrate(scenarioRows, orderRows) {
  const byId = new Map((orderRows || []).map((o) => [String(o.id), o]));
  return (scenarioRows || []).map((s) => ({
    ...s,
    orders: (s.order_ids || []).map((oid) => byId.get(String(oid))).filter(Boolean)
  }));
}

/**
 * @param {HTMLElement} target      where to mount
 * @param {object} payload          { datasets, stores, cities, emojis }
 * @param {object} cfg              CONFIG block from the Qualtrics build
 */
export function mountGame(target, payload, cfg) {
  const ds = payload.datasets[cfg.DATASET];
  if (!ds) throw new Error('unknown DATASET ' + cfg.DATASET);

  const orderRows = ds.orders || [];
  const storeConfigs = {
    stores: (payload.stores && payload.stores.stores) || [],
    startinglocation: (payload.cities && payload.cities.startinglocation) || 'Berkeley',
    travelTimes: (payload.cities && payload.cities.travelTimes) || {},
    distances: {}
  };

  // Same call loadGame() makes once it has the data.
  switchJob(orderRows, storeConfigs);
  if (cfg.PENALTY_TIMEOUT) setPenaltyTimeout(Number(cfg.PENALTY_TIMEOUT));

  scenarios.set(hydrate(ds.scenarios, orderRows));
  scenarioSetVersionId.set(cfg.DATASET);
  currLocation.set(storeConfigs.startinglocation);
  currentRound.set(Math.max(1, Number(cfg.START_ROUND) || 1));
  participantId.set(String(cfg.__participantId || 'anon'));
  gameMode.set('main');
  emojisMap.set((payload.emojis && Object.keys(payload.emojis).length) ? payload.emojis : (cfg.ITEM_EMOJI || {}));
  roundTimeLimit.set(Number(cfg.ROUND_TIME_LIMIT) || 0);

  game.update((g) => ({ ...g, inSelect: true, inStore: false, tip: false }));

  const wrap = document.createElement('div');
  target.appendChild(wrap);

  const app = mount(Game, { target: wrap });

  try { resetTimer(); startTimer(); } catch (e) { /* optional */ }

  if (typeof window !== 'undefined') window.__BG = { app: app, get: get, stores: { game, orders, scenarios, currentRound, elapsed } };
  return { app, stores: { game, orders, scenarios, currentRound, elapsed, get } };
}

if (typeof window !== 'undefined') window.BundleGameReal = { mountGame };
