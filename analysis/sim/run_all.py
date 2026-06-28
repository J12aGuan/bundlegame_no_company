#!/usr/bin/env python3
"""
Master runner for the BundleGame simulation pipeline.
Regenerates every figure and table in the paper from the frozen committed data
in one command:  python run_all.py

Reads frozen inputs from publishing/export_for_analysis/ (commit 2d69642).
All output is deterministic (fixed seeds, fixed matplotlib metadata).
"""
import sys, subprocess, os

STEPS = [
    ("Stage 1: foundation (load + assert locked pilot stats)", "foundation.py"),
    ("Stage 2: add/drop/swap mistake taxonomy",                "addropswap.py"),
    ("Stage 3: worker model (temporal validation)",            "worker_model.py"),
    ("Mechanism: time-underpricing decomposition",             "mechanism.py"),
    ("Core figures + tables",                                  "make_core_figures.py"),
    ("Mechanism figure",                                       "make_mechanism_figure.py"),
    ("Partial-learning figure",                                "make_partial_learning_figure.py"),
    ("Shifted-transfer figure",                                "make_shift_figure.py"),
    ("Picking-channel figure",                                 "make_picking_channel_figure.py"),
]

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    failed = []
    for label, script in STEPS:
        path = os.path.join(here, script)
        if not os.path.exists(path):
            print(f"[SKIP] {label}: {script} not found"); continue
        print(f"\n{'='*70}\n{label}\n{'='*70}")
        r = subprocess.run([sys.executable, path], cwd=here)
        if r.returncode != 0: failed.append(script)
    print(f"\n{'='*70}")
    if failed: print(f"FAILED: {failed}"); sys.exit(1)
    print("All pipeline steps completed. Figures + tables regenerated deterministically.")
    print("Outputs: fig_*.pdf, figP4b_partial_learning.pdf, fig_shifted_transfer.pdf,")
    print("         fig_picking_channel.pdf, tables.md")

if __name__ == "__main__":
    main()
