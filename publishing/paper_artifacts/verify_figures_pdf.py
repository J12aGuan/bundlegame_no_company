#!/usr/bin/env python3
"""Verify BundleGame paper PDFs are camera-ready vector figures.

For every PDF under the given paths this asserts:
  * ZERO image XObjects (/Subtype /Image) -- i.e. the figure is true vector and was
    not naively rasterized -- EXCEPT for PDFs under a directory passed with
    --screenshots-dir, which are genuine interface screenshots whose embedded
    photos are unavoidable. Those are still checked for everything else.
  * NO Type 3 fonts (/Type /Font /Subtype /Type3), which CHI/ICML font checkers
    reject. (Vector figures here embed TrueType / Type 42.)
  * Prints each PDF's physical width in inches (from the MediaBox) and flags
    whether it matches a one-column (~3.33 in) or two-column (~7.0 in) width.

Exit code is non-zero if any assertion fails, so it doubles as a CI gate.

Usage:
    python publishing/paper_artifacts/verify_figures_pdf.py \
        publishing/paper_artifacts/out/figures_pdf \
        publishing/paper/raw_materials/figures/vector \
        --screenshots-dir publishing/paper/figures/screenshots
"""
import argparse
import re
import sys
from pathlib import Path

try:
    import pypdf  # robust: handles compressed object streams (e.g. Chromium page.pdf())
except Exception:  # pragma: no cover - fallback only
    pypdf = None

SINGLE_COL_IN = 3.33
DOUBLE_COL_IN = 7.0
WIDTH_TOL = 0.30  # inches


def classify_width(width_in):
    if abs(width_in - SINGLE_COL_IN) <= WIDTH_TOL:
        return "single-column"
    if abs(width_in - DOUBLE_COL_IN) <= WIDTH_TOL + 0.2:
        return "two-column"
    return "other"


# --------------------------------------------------------------------------- #
# Inspection via pypdf (preferred).                                           #
# --------------------------------------------------------------------------- #
def _walk_xobjects(resources, seen):
    """Yield every XObject dict reachable from a /Resources dict (recurses forms)."""
    if resources is None:
        return
    xobjects = resources.get("/XObject")
    if not xobjects:
        return
    for ref in xobjects.values():
        try:
            obj = ref.get_object()
        except Exception:
            continue
        oid = id(obj)
        if oid in seen:
            continue
        seen.add(oid)
        yield obj
        if obj.get("/Subtype") == "/Form":
            yield from _walk_xobjects(obj.get("/Resources"), seen)


def _walk_fonts(resources, seen):
    if resources is None:
        return
    fonts = resources.get("/Font")
    if fonts:
        for ref in fonts.values():
            try:
                obj = ref.get_object()
            except Exception:
                continue
            yield obj
    xobjects = resources.get("/XObject")
    if xobjects:
        for ref in xobjects.values():
            try:
                obj = ref.get_object()
            except Exception:
                continue
            if obj.get("/Subtype") == "/Form" and id(obj) not in seen:
                seen.add(id(obj))
                yield from _walk_fonts(obj.get("/Resources"), seen)


def inspect_pypdf(path):
    reader = pypdf.PdfReader(str(path))
    images = 0
    type3 = 0
    widths = []
    for page in reader.pages:
        box = page.mediabox
        widths.append(round(float(box.width) / 72.0, 3))
        resources = page.get("/Resources")
        for obj in _walk_xobjects(resources, set()):
            if obj.get("/Subtype") == "/Image":
                images += 1
        for font in _walk_fonts(resources, set()):
            if font.get("/Subtype") == "/Type3":
                type3 += 1
    return {"pages": len(reader.pages), "images": images, "type3": type3, "widths": widths}


# --------------------------------------------------------------------------- #
# Stdlib fallback (matplotlib PDFs are not object-stream compressed).          #
# --------------------------------------------------------------------------- #
def inspect_stdlib(path):
    data = Path(path).read_bytes()
    images = len(re.findall(rb"/Subtype\s*/Image", data))
    type3 = len(re.findall(rb"/Subtype\s*/Type3", data))
    widths = []
    for m in re.finditer(rb"/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)", data):
        x0, _y0, x1, _y1 = (float(g) for g in m.groups())
        widths.append(round((x1 - x0) / 72.0, 3))
    return {"pages": max(1, len(widths)), "images": images, "type3": type3, "widths": widths or [0.0]}


def inspect(path):
    return inspect_pypdf(path) if pypdf is not None else inspect_stdlib(path)


def build_parser():
    parser = argparse.ArgumentParser(description="Verify paper PDFs are vector & camera-ready")
    parser.add_argument("paths", nargs="+", help="PDF files or directories to scan")
    parser.add_argument("--screenshots-dir", action="append", default=[],
                        help="Directory whose PDFs are genuine screenshots (image XObjects allowed). "
                             "May be repeated.")
    return parser


def gather_pdfs(paths):
    out = []
    for raw in paths:
        p = Path(raw)
        if p.is_dir():
            out.extend(sorted(p.rglob("*.pdf")))
        elif p.suffix.lower() == ".pdf" and p.exists():
            out.append(p)
    return out


def main(argv=None):
    args = build_parser().parse_args(argv)
    screenshot_dirs = [Path(d).resolve() for d in args.screenshots_dir]

    def is_screenshot(pdf_path):
        rp = pdf_path.resolve()
        return any(d in rp.parents or d == rp.parent for d in screenshot_dirs)

    pdfs = gather_pdfs(args.paths)
    if not pdfs:
        print("No PDFs found under:", ", ".join(args.paths))
        return 1

    backend = "pypdf" if pypdf is not None else "stdlib-fallback"
    print(f"Verifying {len(pdfs)} PDF(s) with {backend}\n")
    header = f"{'figure':54} {'width(in)':>10}  {'column':13} {'imgs':>5} {'type3':>5}  status"
    print(header)
    print("-" * len(header))

    failures = []
    for pdf in pdfs:
        info = inspect(pdf)
        w = info["widths"][0] if info["widths"] else 0.0
        screenshot = is_screenshot(pdf)
        problems = []
        if info["type3"] > 0:
            problems.append(f"{info['type3']} Type3 font(s)")
        if info["images"] > 0 and not screenshot:
            problems.append(f"{info['images']} image XObject(s) in a vector figure")
        status = "OK" + (" [screenshot]" if screenshot else "")
        if problems:
            status = "FAIL: " + "; ".join(problems)
            failures.append((pdf, problems))
        name = str(pdf).replace("\\", "/")
        if len(name) > 54:
            name = "..." + name[-51:]
        print(f"{name:54} {w:>10.3f}  {classify_width(w):13} {info['images']:>5} {info['type3']:>5}  {status}")

    print()
    if failures:
        print(f"FAILED: {len(failures)} PDF(s) did not pass.")
        return 1
    print(f"PASSED: all {len(pdfs)} PDF(s) are vector (or allowed screenshots) with no Type3 fonts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
