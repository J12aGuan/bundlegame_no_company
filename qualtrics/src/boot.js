/* =============================================================================
 * BUNDLEGAME — Qualtrics bootstrap
 * =============================================================================
 * Paste the built file into a Text/Graphic question's JavaScript editor.
 * This block wires the engine into the Qualtrics question lifecycle.
 * ========================================================================== */
Qualtrics.SurveyEngine.addOnload(function () {
  var page = this;

  // The game owns the page: hide the survey's Next button until the run ends.
  try { page.hideNextButton(); } catch (e) { }

  // Safety net: never trap a participant. If the game cannot finish (a bug, a
  // stuck state, a browser quirk), reveal Next anyway after the escape window.
  var escape = Number(BUNDLEGAME_CONFIG.ESCAPE_HATCH_SECONDS || 0);
  if (escape > 0) setTimeout(function () { try { page.showNextButton(); } catch (e) { } }, escape * 1000);

  // Inject styles once, honouring the ACCENT_COLOR from the CONFIG block.
  if (!document.getElementById('bg-style')) {
    var st = document.createElement('style');
    st.id = 'bg-style';
    // The app's own Tailwind first, so the game looks exactly like the hosted
    // version; the port stylesheet only adds what Tailwind does not cover.
    st.textContent = (typeof BUNDLEGAME_APP_CSS === 'string' ? BUNDLEGAME_APP_CSS : '')
      + ':root{--bg-accent:' + (BUNDLEGAME_CONFIG.ACCENT_COLOR || '#2563eb') + '}' + BUNDLEGAME_CSS;
    document.head.appendChild(st);
  }

  var host = document.createElement('div');
  host.className = 'bg-root';
  var container = page.getQuestionContainer
    ? page.getQuestionContainer().querySelector('.QuestionText') || page.getQuestionContainer()
    : document.body;
  container.appendChild(host);

  // Re-show Next (and optionally auto-advance) when the run finishes.
  var origEnd = window.BundleGame && window.BundleGame.onFinish;
  window.BundleGame.onFinish = function () {
    try { page.showNextButton(); } catch (e) { }
    if (origEnd) origEnd();
    // Qualtrics only transmits embedded data on PAGE SUBMIT, so advancing the
    // page is what actually saves the run. Do it for them rather than hope they
    // notice the arrow.
    if (BUNDLEGAME_CONFIG.AUTO_ADVANCE) {
      setTimeout(function () {
        try { if (typeof page.clickNextButton === 'function') page.clickNextButton(); } catch (e) { }
      }, 2500);
    }
  };

  BundleGame.boot(host, BUNDLEGAME_DATA, BUNDLEGAME_CONFIG);
});

Qualtrics.SurveyEngine.addOnUnload(function () {
  // Final write-back in case the participant advances mid-run.
  try { if (window.BundleGame && BundleGame.flushNow) BundleGame.flushNow(); } catch (e) { }
});
