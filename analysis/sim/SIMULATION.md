# What the Simulation Does (plain-language reference)

This document explains the Section 5 simulation in plain terms: what runs, how many
bots, and what each stage produces. The code is in this directory (`analysis/sim/`);
this file is the human-readable map. One command reproduces everything:

    python analysis/sim/run_all.py

The simulation has **two distinct parts** that answer different questions. Keep them separate.

---

## Part 1: The Bots (the worker model)

**How many bots:** exactly **85, one per pilot participant.**

**What a bot is:** a vector of four subjective weights, on payout, picking time, local
travel, and cross-city travel. A bot chooses a bundle with probability proportional to
exp(weights . features), the standard conditional-logit (discrete-choice) model. The
weights are recovered from that participant's actual choices in the pilot.

**The data behind them:** 1268 decisions across the 85 participants (range 1 to 27 per
person, mean 14.9). Because ~15 decisions per person is little data, the bots are fit
with **shrinkage (partial pooling)**: every bot's weights are pulled toward the
population mean by a penalty whose strength is chosen on held-out data. This borrows
strength across participants and avoids overfitting. (`worker_model.py`.)

**How they are validated (not assumed):** a **temporal** test. Fit each bot on its
participant's early rounds (1 to 10) and predict their later rounds (11 onward).
- Held-out top-1 choice accuracy: **0.64** vs **0.11** random (a six-fold lift, on
  rounds the fit never saw).
- Independent check: the population reproduces aggregate behavior it was not fit to
  match, the ~90% bundling rate and the 22.2% optimal rate emerge on their own.

This is Simulation 1 in the paper. It makes no intervention claim; it only establishes
that the bots behave like the people they represent.

---

## Part 2: The Feedback Experiment (the policies)

Now the validated bots are put under five feedback regimes. Each bot holds a **belief**
over the true weights (a Gaussian, N(mu, Sigma)) and chooses by its current best guess
(posterior mean). After each coaching decision it receives feedback and updates the
belief by the Gaussian rule (the model's eq. for the posterior update). (`policies.py`,
faithful to Section 4 of the paper.)

**The menu split:** the trap menus (where participants are most often wrong) are split
**60% coaching / 40% transfer**. The bot receives feedback only on coaching menus and
updates; on transfer menus it gets no feedback and we measure its regret. Transfer
performance is the outcome that matters, it tests whether what was taught carries to
new menus.

**The five policies** (they differ ONLY in what feedback reveals):
1. **no_feedback** — nothing; the belief stays frozen.
2. **scalar** — the bot sees the value of its chosen bundle (one number, along the
   chosen-bundle direction only).
3. **oracle** — the optimal trip is implemented (coaching regret is zero), but the bot
   learns only the *sign* of "chosen vs oracle", not the magnitudes, so it need not
   transfer.
4. **current_loss** — the bot is shown the single add/drop/swap with the largest
   *current* gain, and learns its marginal value.
5. **mct** (Marginal Contrast Teaching) — the bot is shown the contrast with the largest
   *future teaching value* for the transfer menus, and learns its marginal value by the
   **same update as current_loss**.

Because current_loss and mct share an update rule, any difference between them is purely
the value of teaching the future-useful contrast rather than the locally-best one.

**The free parameter:** the learning rate (how strongly one contrast moves a weight) is
the one quantity the model does not pin. The whole experiment is re-run across a grid of
rates (`SIGMA2_GRID = [0.1, 0.3, 1.0, 3.0]`), and results are reported as a *pattern
across rates*, not a single number.

---

## Scale of the run

**85 bots x 5 policies x 4 learning rates**, on 22 trap menus split 60/40 into
coaching and transfer (13 coaching, 9 transfer). Fully deterministic (seed 42). The
shifted-transfer analysis (`shifted_transfer.py`) re-runs the same machinery under a
within-component vs a cross-component menu shift to produce the conditional result.

---

## What each script produces

| Script | Produces |
|---|---|
| `foundation.py` | Loads frozen data; asserts the locked pilot stats (guard) |
| `addropswap.py` | The mistake taxonomy (over-inclusion 47% vs under 9%) |
| `worker_model.py` | The 85 bots + temporal validation (0.64 vs 0.11) |
| `mechanism.py` | Time-underpricing decomposition (97%) |
| `policies.py` | The five-policy feedback experiment |
| `shifted_transfer.py` | Within- vs cross-component conditional result |
| `make_*_figure.py` | The eight paper figures |
| `run_all.py` | Runs all of the above from one command |

---

## The honest caveat (stated in the paper)

The bots assume workers choose by this weighting structure, so the simulation tests the
**model's** predictions faithfully, but it does **not** prove real humans learn this way.
That is what the 35-round human study is for. The simulation establishes the *direction*
of the effect (rate-robust) and the *channel* (it repairs the component it targets); the
*rate*, and confirmation in real people, require the human study.

---

## Key numbers the run reproduces (against committed frozen data, commit 2d69642)

- 85 participants, 1268 rows, optimal rate 0.2216, mean regret 0.0965, bundle rate 0.8975
- Over-inclusion 47.2% vs under-inclusion 8.8% (+38.4 pts, significant)
- Worker-model temporal accuracy 0.640 vs 0.106 random
- Mechanism: time-underpricing 97% [95%, 98%], routing 3%, pay-chasing 0%
- Shifted transfer: within-component 0.037 (current-loss best); cross-component
  MCT 0.115 vs current-loss 0.163 (MCT limits the damage)
- Picking channel: regret 0.098 to 0.043, excess picking 18.6s to 9.2s
