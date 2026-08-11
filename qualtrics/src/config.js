/* =============================================================================
 * BUNDLEGAME — CONFIGURATION
 * =============================================================================
 * Everything tunable lives in this block. Edit values here, or override any of
 * them per-participant from Qualtrics without touching code by creating an
 * Embedded Data field named  bg_<KEY>  in the survey flow.
 *
 *   e.g.  Embedded Data:  bg_TOTAL_ROUNDS = 30
 *         Embedded Data:  bg_SESSION_TIME_LIMIT = 900
 *         Embedded Data:  bg_ARM = counterfactual
 *
 * Embedded data always wins over the values below, so you can A/B a setting
 * from the survey flow (or from a panel/URL parameter) with no republish.
 * Booleans accept true/false/1/0/yes/no. Anything unset falls through to here.
 * ========================================================================== */

var BUNDLEGAME_CONFIG = {

  /* --- which scenario set to run ----------------------------------------- */
  DATASET: 'chi_dynamic_v2',    // must match a key in BUNDLEGAME_DATA.datasets
  TOTAL_ROUNDS: 35,             // rounds to play; clamped to dataset length
  START_ROUND: 1,               // useful for resuming or for demos

  /* --- timing (seconds) --------------------------------------------------- */
  SESSION_TIME_LIMIT: 1200,     // whole-game cap; 0 = unlimited
  ROUND_TIME_LIMIT: 300,        // per-round cap; 0 = unlimited
  THINK_TIME: 0,                // forced delay before selection is enabled
  PENALTY_TIMEOUT: 30,          // penalty applied on give-up / failed checkout

  /* --- onboarding ---------------------------------------------------------
   * A short guided warm-up on its own dataset before the real task. Tutorial
   * rounds are tagged tut:1 in bg_decisions so they are trivial to exclude, and
   * they do not count toward TOTAL_ROUNDS or earnings.
   * Set TUTORIAL_ROUNDS to 0 to skip onboarding entirely. */
  SHOW_INSTRUCTIONS: true,
  TUTORIAL_DATASET: 'tutorial',
  TUTORIAL_ROUNDS: 2,

  /* --- task shape --------------------------------------------------------- */
  ORDERS_SHOWN: 4,              // orders offered per round
  MAX_BUNDLE: 3,                // max orders per bundle (dataset may lower it)
  SAME_STORE_BUNDLES_ONLY: true,// legality rule: multi-order bundles share a store
  REQUIRE_ITEM_TYPING: true,    // must type the item name to add it to a bag
  ALLOW_GIVE_UP: true,          // show the give-up button (applies PENALTY_TIMEOUT)

  /* --- recommendations (Phase B) ------------------------------------------
   * ARM drives whether a recommendation is rendered. Set it from the survey
   * flow with a Randomizer to get between-subjects assignment for free.
   * Arms: 'control' (never show) | 'oracle' | 'counterfactual' | 'aggregate'
   * RECOMMENDATION_ROUNDS is inclusive, 1-indexed, and applies to treated arms. */
  ARM: 'control',
  // Fallback window for datasets with no block design. The CHI sets carry their
  // own per-round feedback_enabled flag, which OVERRIDES this — so B2 (retention,
  // rounds 21-25) and B4 (transfer, 31-35) stay unaided as the design requires.
  RECOMMENDATION_ROUNDS: [16, 35],
  SHOW_FEEDBACK_AFTER_ROUND: true,   // counterfactual feedback on feedback-on rounds

  /* --- presentation -------------------------------------------------------
   * Upload the 16 item images to Qualtrics (Library > Graphics), then paste the
   * folder URL here. Leave blank to fall back to emoji-only tiles. */
  IMAGE_BASE_URL: '',
  /* Fallback glyphs, used when IMAGE_BASE_URL is blank or an image fails to
   * load. MasterData/emojis overrides these when it is populated (it is
   * currently empty, so without this map every tile would render as a dot). */
  ITEM_EMOJI: {
    apple: '\uD83C\uDF4E', banana: '\uD83C\uDF4C', grape: '\uD83C\uDF47',
    kiwi: '\uD83E\uDD5D', orange: '\uD83C\uDF4A', pear: '\uD83C\uDF50',
    pineapple: '\uD83C\uDF4D', watermelon: '\uD83C\uDF49'
  },
  ACCENT_COLOR: '#2563eb',

  /* --- telemetry ----------------------------------------------------------
   * Round decisions and per-round timing are always captured. The detailed UI
   * timeline is the large one (median ~19 KB, heaviest ~51 KB per participant),
   * so it is written across several embedded data fields and reassembled at
   * analysis time. Create bg_events_1 … bg_events_<MAX_EVENT_CHUNKS> in the
   * survey flow. Set DETAILED_TELEMETRY false to drop it entirely. */
  DETAILED_TELEMETRY: true,
  EVENT_CHUNK_CHARS: 15000,     // keep under the ~20k embedded-data field limit
  MAX_EVENT_CHUNKS: 8,          // 8 x 15k = 120k chars ≈ covers the heaviest run
  FLUSH_EVERY_ROUND: true,      // write back each round, so partials survive dropout

  /* --- live transmission to Firestore -------------------------------------
   * Qualtrics only transmits embedded data on PAGE SUBMIT, so a participant who
   * abandons the tab mid-game would otherwise send nothing. With this on, every
   * completed round is POSTed to Firestore immediately, exactly as the hosted
   * app did — so partial runs survive and land in the same collections your
   * existing exporters already read (Users/{id}/Actions, Summary, Progress).
   *
   * Writes are unauthenticated and permitted by firestore.rules
   * (participantRoundActionWrite / participantSummaryWrite / ...). The API key
   * below is the Firebase *web* key: it is not a secret, it identifies the
   * project. Security comes from the rules, not the key.
   *
   * Failures never block gameplay — they queue and retry, and the run still
   * completes into Qualtrics embedded data. */
  /* Written onto every Firestore round doc so runs are attributable to a
   * protocol, exactly as the hosted app did. */
  STUDY_PROTOCOL_ID: 'bundlegame_chi_dynamic_v1',
  FIREBASE_ENABLED: true,
  FIREBASE_PROJECT_ID: '',      // filled in at build time from .env
  FIREBASE_API_KEY: '',         // filled in at build time from .env
  FIREBASE_RETRY_MS: 4000,
  FIREBASE_MAX_QUEUE: 60,

  /* --- persistence & page behaviour ---------------------------------------
   * Qualtrics only transmits embedded data when the PAGE IS SUBMITTED. A
   * participant who closes the tab mid-game sends nothing. Two mitigations:
   *   RESUME_ON_RELOAD  - checkpoint to localStorage every round and offer to
   *                       resume, so a refresh or crash does not lose the run
   *   AUTO_ADVANCE      - click Next automatically when the game ends, so the
   *                       page submits (and the data saves) without relying on
   *                       the participant noticing the arrow
   * Neither can rescue a participant who simply abandons the tab. */
  RESUME_ON_RELOAD: true,
  AUTO_ADVANCE: true,

  /* Namespace for the embedded data this instance writes. Change it if you run
   * a SECOND game question in the same survey (e.g. a practice round), so the
   * two do not overwrite each other's fields. */
  FIELD_PREFIX: 'bg_',

  /* --- identity ----------------------------------------------------------- */
  PARTICIPANT_ID_FIELD: 'ResponseID', // embedded data field holding the participant id

  /* --- safety -------------------------------------------------------------
   * The Next button is hidden while the game runs. If the game somehow cannot
   * finish, reveal it anyway after this many seconds so nobody is ever trapped
   * in the survey. Set 0 to disable (not recommended for a public release). */
  ESCAPE_HATCH_SECONDS: 2400,
  DEBUG: false                   // console tracing + on-screen state dump
};
