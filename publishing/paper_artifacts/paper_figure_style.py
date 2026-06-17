#!/usr/bin/env python3
"""Shared camera-ready matplotlib style for the BundleGame paper figures.

Both the analysis-chart generator (``figures_pdf.py``) and the conceptual-diagram
generator (``paper/raw_materials/scripts/figures_schematic_pdf.py``) import this so
every PDF the paper ships uses *identical* font embedding and sizing.

Why these settings matter for a camera-ready submission:

* ``pdf.fonttype = 42`` / ``ps.fonttype = 42`` embed TrueType (a.k.a. "Type 42")
  fonts instead of Type 3. CHI/ICML font checkers reject Type 3 fonts, so this is
  the single most important setting here.
* ``svg.fonttype = "none"`` keeps text as selectable text in the SVG backup
  instead of converting it to outlined paths.
* The figure sizes map to ACM one-column (~3.33 in) and two-column (~7.0 in)
  widths so the verifier can confirm each PDF lands on a real column width.
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless: no display needed
import matplotlib.pyplot as plt  # noqa: E402

# Colorblind-safe (Wong) palette; figures also use hatch/markers so meaning never
# rests on color alone.
TEAL = "#0F766E"
BLUE = "#2563EB"
ORANGE = "#C2410C"
INDIGO = "#4338CA"
AMBER = "#A16207"
GREEN = "#15803D"
GREY = "#6B7280"
LIGHT = "#E2E8F0"

# ACM-style column widths in inches.
SINGLE_COL_IN = 3.33
DOUBLE_COL_IN = 7.0

_STYLE_APPLIED = False


def apply_camera_ready_style():
    """Apply the embedded-font, serif, small-label rcParams. Idempotent."""
    global _STYLE_APPLIED
    if _STYLE_APPLIED:
        return
    matplotlib.rcParams.update({
        "pdf.fonttype": 42,        # embed TrueType, NOT Type 3
        "ps.fonttype": 42,
        "svg.fonttype": "none",    # keep text as text in SVG, not outlined paths
        "font.family": "serif",    # roughly matches a Times-based paper body
        "font.size": 8,
        "axes.titlesize": 9,
        "axes.labelsize": 8,
        "xtick.labelsize": 7,
        "ytick.labelsize": 7,
        "legend.fontsize": 7,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.linewidth": 0.6,
        "figure.dpi": 150,
        "savefig.dpi": 150,
    })
    _STYLE_APPLIED = True


def fig_size(width, aspect=0.66):
    """Return (w, h) inches.

    ``width`` is 'single' (one column), 'double' (full width), or a number of
    inches. ``aspect`` is height / width.
    """
    if width == "single":
        w = SINGLE_COL_IN
    elif width == "double":
        w = DOUBLE_COL_IN
    else:
        w = float(width)
    return (w, w * aspect)


def save_figure(fig, out_dir, name):
    """Write a figure as PDF (primary, camera-ready) and SVG (backup).

    Returns the PDF path. ``bbox_inches='tight'`` is intentionally avoided for the
    PDF so the recorded MediaBox width stays exactly the requested column width;
    a small uniform pad is baked into the layout instead.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = out_dir / f"{name}.pdf"
    svg_path = out_dir / f"{name}.svg"
    fig.savefig(pdf_path)
    fig.savefig(svg_path)
    plt.close(fig)
    return pdf_path
