<script>
  // Presentational panel for the CHI counterfactual feedback. Renders nothing
  // unless `feedback.text` is set (so it is inert for non-CHI play and for OFF
  // blocks, where feedbackForDecision returns an empty string). The feedback is
  // computed by chiStudyRuntime.feedbackForDecision and published to the
  // `chiFeedback` store in bundle.js; this component only displays it.
  export let feedback = null; // { text, violation_label, best_improving_move }
  export let blockLabel = "";

  $: text = feedback && typeof feedback.text === "string" ? feedback.text : "";
  $: move = feedback?.best_improving_move || null;
</script>

{#if text}
  <section
    class="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-slate-800 shadow-sm"
    aria-live="polite"
    data-testid="chi-feedback"
  >
    <div class="mb-1 flex items-center justify-between">
      <span class="text-xs font-bold uppercase tracking-wide text-blue-700">Coaching</span>
      {#if blockLabel}
        <span class="text-[10px] text-slate-400">{blockLabel}</span>
      {/if}
    </div>
    <p class="leading-snug">{text}</p>
    {#if move}
      <p class="mt-1 text-[11px] text-slate-500">
        ${move.from_rate_per_min}/min &rarr; ${move.to_rate_per_min}/min
      </p>
    {/if}
  </section>
{/if}
