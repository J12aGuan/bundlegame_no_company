<script>
  // DEV-ONLY local-play harness for the CHI dynamic counterfactual-feedback study.
  // Runs all 35 rounds in the browser against buildChiScenarioSet output, driving the
  // REAL runtime (roundContext, getCandidatesForScenario / GAP3 derive, the survey at
  // r15, runChiDiagnosisForRound at 15/25/35, updateChiStudyFeedback in ON blocks) with
  // NO Firestore: the scenario/protocol/actions/diagnosis live in the app stores, and
  // `id` is left empty so every save short-circuits before touching Firestore. It is
  // active ONLY under import.meta.env.DEV and never changes the default scenario_set,
  // never seeds, never deploys. Open /chi-play-dev (optionally ?arm=marginal).
  import "../../app.css";
  import { onMount } from "svelte";
  import {
    buildChiScenarioSet, scoreBundle, enumerateLegalBundles, sortedIdsEqual, CHI_STARTING_CITY,
  } from "$lib/chiScenarioDesign.js";
  import { buildChiStudyProtocol } from "$lib/researchStudy.js";
  import { roundContext } from "$lib/chiStudyRuntime.js";
  import ChiFeedbackPanel from "../ChiFeedbackPanel.svelte";
  import {
    scenarios, studyProtocol, scenarioSetVersionId, participantStudyState, currentRound,
    scenarioActions, chiFeedback, gameMode, id, getCurrentScenario, getCandidatesForScenario,
    updateChiStudyFeedback, saveChiPhaseASurvey, runChiDiagnosisForRound,
  } from "$lib/bundle.js";

  const DEV = import.meta.env.DEV;
  const ARMS = ["marginal", "component", "aggregate", "oracle", "control"];

  let started = false;
  let gameOver = false;
  let arm = "marginal";
  let selected = []; // chosen order ids for the current round
  let surveySubmitted = false;
  let surveyResponses = {};
  let surveySubmitting = false;
  let log = []; // per-round trace shown in the UI

  onMount(() => {
    if (!DEV) return;
    const params = new URLSearchParams(location.search);
    const a = params.get("arm");
    if (a && ARMS.includes(a)) arm = a;

    const set = buildChiScenarioSet();
    // Seed the REAL stores; no Firestore is touched (id stays empty -> saves skip it).
    scenarios.set(set.scenarios);
    studyProtocol.set(buildChiStudyProtocol());
    scenarioSetVersionId.set(set.metadata.scenarioSetVersionId || "chi_dynamic_v1");
    id.set("");
    gameMode.set("main");
    scenarioActions.set({});
    participantStudyState.set(null);
    currentRound.set(1);
    started = true;
  });

  // Reactive study state (mirrors the production +page.svelte wiring).
  $: protocol = $studyProtocol;
  $: round = $currentRound;
  $: scenario = started && !gameOver ? getCurrentScenario(round) : null;
  $: ctx = protocol && scenario ? roundContext(protocol, round) : null;
  $: candidates = scenario ? getCandidatesForScenario(scenario.scenario_id) : [];
  $: phaseA = (protocol?.phase_plan || []).find((p) => p.id === "A") || null;
  $: chiSurveyQuestions = Array.isArray(protocol?.survey_questions) ? protocol.survey_questions : [];
  $: chiOffEnds = ((protocol?.phase_plan || []).find((p) => p.id === "B")?.blocks || [])
    .filter((b) => b.kind === "off").map((b) => Number(b.round_end));
  // Survey is due once Phase A is complete and not yet submitted (blocks the board).
  $: surveyDue = started && !gameOver && Number(round) > Number(phaseA?.round_end || 15) && !surveySubmitted;
  // Re-tune / final diagnosis fire as each OFF block finishes (idempotent).
  $: if (started && chiOffEnds.includes(Number(round) - 1)) { void runChiDiagnosisForRound(Number(round) - 1); }
  $: diagnoses = $participantStudyState?.diagnosis_history || [];
  $: latestDiagnosis = diagnoses.at(-1) || {};

  const byId = (sc) => Object.fromEntries((sc?.orders || []).map((o) => [o.id, o]));
  const orderLabel = (oid) => {
    const o = scenario?.orders?.find((x) => x.id === oid);
    return o ? `${o.store}` : `order ${oid}`;
  };
  const blockName = () => {
    if (!ctx) return "";
    if (ctx.phase_id === "A") return "Phase A — diagnostic (unaided)";
    if (ctx.block_id === "B1") return "B1 — ON (feedback)";
    if (ctx.test_set === "retention_same_dist") return "B2 — OFF retention (unaided)";
    if (ctx.block_id === "B3") return "B3 — ON (feedback)";
    if (ctx.test_set === "transfer_shifted") return "B4 — OFF transfer (unaided, shifted)";
    return ctx.block_kind || "";
  };

  // Order selection enforces single-store + max_bundle so `selected` is always a legal candidate.
  function toggle(oid) {
    if (selected.includes(oid)) { selected = selected.filter((x) => x !== oid); return; }
    const o = byId(scenario)[oid];
    const max = Number(scenario.max_bundle) || 3;
    if (selected.length >= max) return;
    if (selected.length && byId(scenario)[selected[0]].store !== o.store) return; // single-store legality
    selected = [...selected, oid];
  }
  const candidateFor = (ids) => candidates.find((c) => sortedIdsEqual(c.bundle_ids, ids)) || null;

  function quickPick(kind) {
    if (!candidates.length) return;
    let target = candidates[0];
    if (kind === "optimal") target = candidates.find((c) => c.is_oracle === 1) || target;
    else if (kind === "maxpay") target = candidates.reduce((b, c) => (c.earnings > b.earnings ? c : b), candidates[0]);
    else if (kind === "overbundle") target = candidates.filter((c) => c.bundle_ids.length >= 2)
      .sort((a, b) => b.bundle_ids.length - a.bundle_ids.length)[0] || target;
    selected = [...target.bundle_ids];
    confirm();
  }

  function confirm() {
    const chosen = candidateFor(selected);
    if (!chosen) return;
    // Record the chosen bundle into the REAL store the diagnosis reads (buildUnaidedChoiceSets).
    scenarioActions.update((a) => ({
      ...a,
      [scenario.scenario_id]: { totalTimeSeconds: 0, timeSummary: {}, orderSummary: [...chosen.bundle_ids] },
    }));
    // Feedback via the REAL runtime (empty outside ON blocks).
    updateChiStudyFeedback({
      protocol, round, arm, chosenBundle: chosen, legalBundles: candidates,
      diagnosis: latestDiagnosis, labelFor: orderLabel,
    });
    const oracle = candidates.find((c) => c.is_oracle === 1);
    log = [...log, {
      round, block: blockName(), trap: scenario.is_payout_trap ? (scenario.trap_axis) : "",
      chosen: chosen.bundle_ids.map(orderLabel).join("+"),
      optimal: chosen.is_oracle === 1, fb: ctx?.is_on_block ? ($chiFeedback?.text ? "shown" : "none") : "-",
    }];
    selected = [];
    if (round >= 35) { gameOver = true; void runChiDiagnosisForRound(35); }
    currentRound.set(round + 1);
  }

  async function submitSurvey() {
    if (surveySubmitting) return;
    surveySubmitting = true;
    try {
      const filled = { ...surveyResponses };
      for (const q of chiSurveyQuestions) if (filled[q.id] == null) filled[q.id] = Number(q.default_value) || 3;
      surveyResponses = filled;
      await saveChiPhaseASurvey(surveyResponses);
      await runChiDiagnosisForRound(Number(phaseA?.round_end || 15));
      surveySubmitted = true;
    } finally { surveySubmitting = false; }
  }

  const fmt = (n) => (Math.round((Number(n) || 0) * 10) / 10).toString();
</script>

<svelte:head><title>CHI local play (dev)</title></svelte:head>

{#if !DEV}
  <main class="min-h-screen flex items-center justify-center bg-slate-100 p-8">
    <p class="text-slate-600">This dev-only page is available only in <code>npm run dev</code>.</p>
  </main>
{:else}
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-xl font-bold text-slate-900">CHI local play <span class="text-xs font-normal text-slate-500">(dev — no Firestore)</span></h1>
        <div class="text-sm text-slate-600" data-testid="round-num">arm <span class="font-mono font-semibold">{arm}</span> · round {Math.min(round, 35)}/35</div>
      </div>

      {#if !started}
        <p class="mt-6 text-slate-600">Starting…</p>
      {:else if surveyDue}
        <!-- r15 post-Phase-A survey (blocks the board until submitted, then runs the initial diagnosis) -->
        <section class="mt-6 bg-white rounded-2xl shadow p-6 space-y-4 max-w-lg" data-testid="chi-survey">
          <h2 class="text-lg font-semibold text-slate-900">A few quick questions</h2>
          <p class="text-sm text-slate-600">How did you approach the orders? No right answers.</p>
          {#each chiSurveyQuestions as q}
            <div class="space-y-1">
              <p class="text-sm font-medium text-slate-800">{q.prompt || q.label || q.id}</p>
              <div class="flex gap-2">
                {#each Array.from({ length: Number(q.max || 5) - Number(q.min || 1) + 1 }) as _u, i}
                  <button type="button" class="flex-1 rounded-lg border px-3 py-2 text-sm {surveyResponses[q.id] === (Number(q.min || 1) + i) ? 'border-green-500 bg-green-50 text-green-700 font-semibold' : 'border-slate-200 text-slate-600'}"
                    on:click={() => (surveyResponses = { ...surveyResponses, [q.id]: Number(q.min || 1) + i })}>{Number(q.min || 1) + i}</button>
                {/each}
              </div>
            </div>
          {/each}
          <button type="button" data-testid="chi-survey-submit" class="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={surveySubmitting} on:click={submitSurvey}>{surveySubmitting ? "Diagnosing…" : "Continue"}</button>
        </section>
      {:else if gameOver}
        <section class="mt-6 bg-white rounded-2xl shadow p-6" data-testid="chi-complete">
          <h2 class="text-lg font-semibold text-green-700">Study complete — all 35 rounds.</h2>
          <p class="mt-1 text-sm text-slate-600">Diagnoses below; nothing was written to Firestore.</p>
        </section>
      {:else if scenario}
        <!-- block banner -->
        <div class="mt-4 flex items-center gap-2 text-sm">
          <span class="px-2 py-0.5 rounded font-bold {ctx?.is_on_block ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}">{blockName()}</span>
          {#if scenario.is_payout_trap}<span data-testid="round-trap" class="px-2 py-0.5 rounded bg-amber-500 text-white text-xs font-bold">PAYOUT TRAP · {scenario.trap_axis}</span>{/if}
          <span class="text-xs text-slate-500">feedback {ctx?.feedback_enabled ? "ON" : "off"}</span>
        </div>

        <!-- order cards -->
        <div class="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2" data-testid="chi-orders">
          {#each scenario.orders as o}
            <button type="button" class="text-left rounded-lg border bg-white p-2 {selected.includes(o.id) ? 'ring-2 ring-green-500 border-green-300' : 'border-slate-200 hover:border-blue-300'}"
              on:click={() => toggle(o.id)}>
              <div class="flex justify-between"><span class="font-bold text-slate-800 text-sm truncate">{o.store}</span><span class="font-bold text-green-600">${o.earnings}</span></div>
              <div class="text-xs text-slate-500">📍 {o.city}</div>
              <div class="text-[11px] text-slate-400">pick {fmt(o.pick ?? (o.estimatedTime - o.localTravelTime))}s · local {fmt(o.localTravelTime)}s</div>
            </button>
          {/each}
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" data-testid="chi-confirm" class="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
            disabled={!candidateFor(selected)} on:click={confirm}>Confirm {selected.length ? `(${selected.length})` : ""}</button>
          <span class="text-xs text-slate-400">quick:</span>
          <button type="button" data-testid="qp-optimal" class="rounded border px-2 py-1 text-xs" on:click={() => quickPick("optimal")}>optimal</button>
          <button type="button" data-testid="qp-maxpay" class="rounded border px-2 py-1 text-xs" on:click={() => quickPick("maxpay")}>chase $ (max-pay)</button>
          <button type="button" data-testid="qp-overbundle" class="rounded border px-2 py-1 text-xs" on:click={() => quickPick("overbundle")}>over-bundle</button>
        </div>

        <!-- live coaching panel (the REAL component; renders only when chiFeedback has a move) -->
        <div class="mt-3" data-testid="chi-feedback-slot">
          <ChiFeedbackPanel feedback={$chiFeedback} blockLabel={blockName()} />
        </div>
      {/if}

      <!-- diagnosis history (held in the store, not Firestore) -->
      <section class="mt-6">
        <h3 class="text-sm font-semibold text-slate-700">Diagnoses (in-memory)</h3>
        {#if diagnoses.length}
          <ul class="mt-1 text-sm text-slate-700 space-y-0.5" data-testid="chi-diagnoses">
            {#each diagnoses as d}
              <li>r{d.round} <span class="font-mono">{d.trigger}</span>: dominant <b>{d.dominant_weakness}</b>, target <b>{d.learning_target}</b>{d.abstained ? " (abstained)" : ""}</li>
            {/each}
          </ul>
        {:else}
          <p class="text-xs text-slate-400">none yet (first at r15 after the survey)</p>
        {/if}
      </section>

      <!-- round log -->
      {#if log.length}
        <section class="mt-4">
          <h3 class="text-sm font-semibold text-slate-700">Round log</h3>
          <div class="mt-1 text-xs text-slate-500 font-mono space-y-0.5 max-h-48 overflow-y-auto">
            {#each log as e}<div data-testid="log-row">r{e.round} {e.block}{e.trap ? ` [trap:${e.trap}]` : ""} → {e.chosen}{e.optimal ? " ✓opt" : ""} · fb:{e.fb}</div>{/each}
          </div>
        </section>
      {/if}
    </div>
  </main>
{/if}
