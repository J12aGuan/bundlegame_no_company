#!/usr/bin/env python3
"""Native-vector (PDF + SVG) redraws of the BundleGame *schematic* paper figures.

These figures are conceptual diagrams, not evidence of the live interface, so they
are drawn natively with matplotlib (true vector paths + embedded TrueType fonts)
rather than screenshotted. They replace the HTML->PNG renders that
``render_store_figures.mjs`` produced and add two new schematics the paper needs:

  store_interior_<key>        - deployed aisle grid, nearest-access seconds per item
  overlap_pair_<key>          - two same-store orders, shared items + redundant-pick savings
  worked_example_schematic    - scenario 12 decision: 4 orders, chosen vs score-optimal bundle
  archetype_compact|dispersed|payout_trap - the three scenario archetypes (geometry + payoffs)

All numbers come from the frozen raw_materials data (no mocks):
  * store grids / nearest-access seconds: raw_materials/data/time_model.json
    (the deployed MasterData model, same source render_store_figures.mjs used)
  * curated overlap order pairs:          raw_materials/scripts/_overlap_pairs.json
  * scenario orders / optimal bundles / cities: raw_materials/sources/*.json

Genuine interface screenshots (the menu_*, task_*, score_* PNGs) are intentionally
NOT redrawn here; those stay as real screenshots and are handled by the capture
scripts.

Usage:
    python publishing/paper/raw_materials/scripts/figures_schematic_pdf.py \
        --out-dir publishing/paper/raw_materials/figures/vector
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent          # .../publishing/paper/raw_materials/scripts
RAW = HERE.parent                               # .../publishing/paper/raw_materials
SOURCES = RAW / "sources"
DATA = RAW / "data"
PAPER_ARTIFACTS = HERE.parents[2] / "paper_artifacts"  # .../publishing/paper_artifacts

if str(PAPER_ARTIFACTS) not in sys.path:
    sys.path.insert(0, str(PAPER_ARTIFACTS))

from paper_figure_style import (  # noqa: E402
    AMBER,
    BLUE,
    GREY,
    INDIGO,
    ORANGE,
    TEAL,
    apply_camera_ready_style,
    fig_size,
    save_figure,
)

import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyBboxPatch, Rectangle  # noqa: E402

apply_camera_ready_style()

# Cell fills (light) + edges (saturated), matching the original HTML legend.
ENTRANCE_FILL, ENTRANCE_EDGE = "#DCFCE7", "#16A34A"
EMPTY_FILL, EMPTY_EDGE = "#F8FAFC", "#CBD5E1"
ITEM_FILL, ITEM_EDGE = "#EFF6FF", "#BFDBFE"
A_FILL, A_EDGE = "#EEF2FF", INDIGO
B_FILL, B_EDGE = "#FFF7ED", ORANGE
SHARED_FILL, SHARED_EDGE = "#FEF9C3", "#EAB308"

# Schematic city positions (a fixed quadrilateral; the world has 4 cities).
CITY_XY = {
    "Berkeley": (0.0, 1.0),
    "Piedmont": (1.0, 1.0),
    "Oakland": (0.0, 0.0),
    "Emeryville": (1.0, 0.0),
}
STORE_COLOR = {
    "Berkeley Bowl": TEAL,
    "Sprouts Farmers Market": ORANGE,
    "Target": INDIGO,
    "Safeway": BLUE,
}

# Store key -> deployed store name + the curated overlap round/order ids.
KEYS = {
    "berkeley_bowl": {"store": "Berkeley Bowl", "round": 3},
    "sprouts": {"store": "Sprouts Farmers Market", "round": 20},
    "target": {"store": "Target", "round": 12},
    "safeway": {"store": "Safeway", "round": 23},
}


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_data():
    tm = load_json(DATA / "time_model.json")
    by_store = {s["store"]: s for s in tm["stores"]}
    pairs = load_json(HERE / "_overlap_pairs.json")
    bundle = load_json(SOURCES / "scenario_bundle.json")
    orders = {o["id"]: o for o in bundle["orders"]}
    scen_by_round = {s["round"]: s for s in bundle["scenarios"]}
    optimal = {o["scenario_id"]: o for o in bundle["optimal"]}
    cities = load_json(SOURCES / "cities.json")
    return by_store, pairs, orders, scen_by_round, optimal, cities


def access_seconds(store, item):
    entry = store.get("item_access", {}).get(item.lower())
    return entry.get("nearest_access_seconds") if entry else None


# --------------------------------------------------------------------------- #
# Aisle-grid primitive (store interior + overlap share this).                  #
# --------------------------------------------------------------------------- #
def draw_grid(ax, store, highlight=None):
    highlight = highlight or {}
    rows, cols = store["grid_rows"], store["grid_cols"]
    for r, row in enumerate(store["grid"]):
        for c, cell in enumerate(row):
            name = str(cell or "").strip()
            low = name.lower()
            x, y = c, rows - 1 - r  # invert: grid row 0 at the top
            if low == "entrance":
                fill, edge, lw = ENTRANCE_FILL, ENTRANCE_EDGE, 1.2
            elif not name:
                fill, edge, lw = EMPTY_FILL, EMPTY_EDGE, 0.6
            else:
                tag = highlight.get(low)
                fill, edge, lw = {
                    "shared": (SHARED_FILL, SHARED_EDGE, 1.6),
                    "A": (A_FILL, A_EDGE, 1.2),
                    "B": (B_FILL, B_EDGE, 1.2),
                }.get(tag, (ITEM_FILL, ITEM_EDGE, 0.9))
            ax.add_patch(Rectangle((x + 0.04, y + 0.04), 0.92, 0.92, facecolor=fill,
                                   edgecolor=edge, linewidth=lw,
                                   linestyle="--" if not name and low != "entrance" else "-"))
            if low == "entrance":
                ax.text(x + 0.5, y + 0.5, "ENTRANCE", ha="center", va="center",
                        fontsize=6, fontweight="bold", color=ENTRANCE_EDGE)
            elif name:
                acc = access_seconds(store, low)
                ax.text(x + 0.5, y + 0.58, name.capitalize(), ha="center", va="center",
                        fontsize=6.5, fontweight="bold")
                if acc is not None:
                    ax.text(x + 0.5, y + 0.30, f"{acc:.2f}s", ha="center", va="center",
                            fontsize=5.5, color="#3B82F6")
    ax.set_xlim(0, cols)
    ax.set_ylim(0, rows)
    ax.set_aspect("equal")
    ax.axis("off")


def store_interior(key, store, out_dir, width):
    fig, ax = plt.subplots(figsize=fig_size("double", aspect=0.46), layout="constrained")
    draw_grid(ax, store)
    ax.set_title(f"{store['store']} — {store['city']}: store interior (aisle grid)\n"
                 f"cells labeled with nearest-access seconds from entrance "
                 f"({store['seconds_per_cell']}s/cell)", fontsize=8, loc="left")
    return save_figure(fig, out_dir, f"store_interior_{key}_annotated")


def overlap_pair(key, store, pairs, out_dir, width):
    pair = pairs[key]
    items_a, items_b = pair["A"]["items"], pair["B"]["items"]
    set_a = {k.lower() for k in items_a}
    set_b = {k.lower() for k in items_b}
    shared = sorted(set_a & set_b)
    highlight = {}
    for it in set_a:
        highlight[it] = "shared" if it in set_b else "A"
    for it in set_b - set_a:
        highlight[it] = "B"
    savings = sum(access_seconds(store, it) or 0.0 for it in shared)

    fig = plt.figure(figsize=fig_size("double", aspect=0.5), layout="constrained")
    gs = fig.add_gridspec(1, 2, width_ratios=[1.5, 1.0])
    ax = fig.add_subplot(gs[0, 0])
    draw_grid(ax, store, highlight)
    ax.set_title(f"{store['store']} — overlapping orders "
                 f"({pair['A']['id']} + {pair['B']['id']})", fontsize=8, loc="left")

    panel = fig.add_subplot(gs[0, 1])
    panel.axis("off")
    lines = [("Order A · " + pair["A"]["id"], INDIGO)]
    for it, q in items_a.items():
        mark = "  ← shared" if it.lower() in set_b else ""
        lines.append((f"    {it} ×{q}{mark}", AMBER if it.lower() in set_b else "#334155"))
    lines.append(("Order B · " + pair["B"]["id"], ORANGE))
    for it, q in items_b.items():
        mark = "  ← shared" if it.lower() in set_a else ""
        lines.append((f"    {it} ×{q}{mark}", AMBER if it.lower() in set_a else "#334155"))
    lines.append((f"Shared: {', '.join(shared) or 'none'}", AMBER))
    lines.append((f"Redundant-pick savings = {savings:.2f}s", "#111827"))
    y = 0.98
    for text, color in lines:
        weight = "bold" if (":" in text or text.startswith("Order") or "savings" in text) else "normal"
        panel.text(0.0, y, text, ha="left", va="top", fontsize=7, color=color, fontweight=weight,
                   transform=panel.transAxes)
        y -= 0.072
    return save_figure(fig, out_dir, f"overlap_pair_{key}")


# --------------------------------------------------------------------------- #
# Worked example (scenario 12): chosen bundle vs score-optimal bundle.         #
# --------------------------------------------------------------------------- #
def order_card(ax, x0, w, order, *, chosen, optimal):
    y0, h = 0.30, 0.62
    edge = TEAL if chosen else ("#111827" if optimal else "#CBD5E1")
    lw = 2.0 if (chosen or optimal) else 0.8
    ax.add_patch(FancyBboxPatch((x0, y0), w, h, boxstyle="round,pad=0.006,rounding_size=0.02",
                                facecolor="#FFFFFF", edgecolor=edge, linewidth=lw,
                                transform=ax.transAxes, clip_on=False))
    oid = order["id"].replace("mainGameOrder", "O")
    cx = x0 + w / 2
    ax.text(cx, y0 + h - 0.05, oid, ha="center", va="top", fontsize=9, fontweight="bold",
            transform=ax.transAxes)
    ax.text(cx, y0 + h - 0.16, f"${order['earnings']}", ha="center", va="top", fontsize=11,
            color=TEAL, fontweight="bold", transform=ax.transAxes)
    items = ", ".join(f"{k} ×{v}" for k, v in order["items"].items())
    ax.text(cx, y0 + h - 0.27, items, ha="center", va="top", fontsize=5.6, color="#475569",
            wrap=True, transform=ax.transAxes)
    ax.text(cx, y0 + 0.07, f"pick≈{order['estimatedTime']}s · local {order['localTravelTime']}s",
            ha="center", va="bottom", fontsize=5.6, color="#64748B", transform=ax.transAxes)
    if chosen:
        ax.text(cx, y0 + h + 0.04, "chosen", ha="center", va="bottom", fontsize=6.5,
                color=TEAL, fontweight="bold", transform=ax.transAxes)
    if optimal:
        # Star drawn as a vector marker (font-independent: avoids a missing glyph).
        ax.scatter([cx - 0.045], [y0 - 0.035], marker="*", s=55, color="#111827",
                   transform=ax.transAxes, clip_on=False, zorder=5)
        ax.text(cx + 0.005, y0 - 0.02, "optimal", ha="center", va="top", fontsize=6.5,
                color="#111827", fontweight="bold", transform=ax.transAxes)


def worked_example(orders, scen_by_round, optimal, out_dir, width):
    scen = scen_by_round[12]
    ids = scen["order_ids"]
    opt = optimal[scen["scenario_id"]]
    chosen_ids = set(opt["second_best_bundle_ids"])      # the bundle the participant chose
    optimal_ids = set(opt["best_bundle_ids"])            # the score-optimal bundle
    chosen_pay = sum(orders[i]["earnings"] for i in chosen_ids)
    optimal_pay = sum(orders[i]["earnings"] for i in optimal_ids)

    fig, ax = plt.subplots(figsize=fig_size("double", aspect=0.5), layout="constrained")
    ax.axis("off")
    ax.set_title("Worked example — scenario 12 (Target / Emeryville, choose ≤ 3 of 4 orders)",
                 fontsize=8.5, loc="left")
    n = len(ids)
    gap = 0.02
    w = (1.0 - gap * (n + 1)) / n
    for k, oid in enumerate(ids):
        order_card(ax, gap + k * (w + gap), w, orders[oid],
                   chosen=oid in chosen_ids, optimal=oid in optimal_ids)

    def label(ids_set):
        return " + ".join(sorted(i.replace("mainGameOrder", "O") for i in ids_set))
    ax.text(0.0, 0.18, f"Chosen bundle (teal): {label(chosen_ids)} = ${chosen_pay}",
            ha="left", va="top", fontsize=7.5, color=TEAL, fontweight="bold", transform=ax.transAxes)
    ax.scatter([0.008], [0.085], marker="*", s=45, color="#111827", transform=ax.transAxes,
               clip_on=False, zorder=5)
    ax.text(0.03, 0.09, f"Score-optimal: {label(optimal_ids)} = ${optimal_pay}, ends in "
                        f"{opt['ending_city_best']}", ha="left", va="top", fontsize=7.5,
            color="#111827", fontweight="bold", transform=ax.transAxes)
    ax.text(0.0, 0.0, "Same payout, different efficiency: the optimal bundle reaches the same $ "
                      "with less handling+travel time.", ha="left", va="top", fontsize=6.8,
            color="#475569", transform=ax.transAxes)
    return save_figure(fig, out_dir, "worked_example_schematic")


# --------------------------------------------------------------------------- #
# Scenario archetypes: geometry (cities used) + payoff structure.              #
# --------------------------------------------------------------------------- #
def draw_city_map(ax, used_cities, travel_times, start_city):
    used = list(dict.fromkeys(used_cities))
    # edges between used cities, labeled with travel time
    for i in range(len(used)):
        for j in range(i + 1, len(used)):
            a, b = used[i], used[j]
            (xa, ya), (xb, yb) = CITY_XY[a], CITY_XY[b]
            ax.plot([xa, xb], [ya, yb], color=GREY, linewidth=1.0, zorder=1)
            t = travel_times.get(a, {}).get(b)
            if t is not None:
                ax.text((xa + xb) / 2, (ya + yb) / 2, f"{t}", ha="center", va="center",
                        fontsize=6, color="#334155",
                        bbox=dict(boxstyle="round,pad=0.1", fc="white", ec=GREY, lw=0.4))
    for city, (x, y) in CITY_XY.items():
        on = city in used
        ax.scatter([x], [y], s=260 if on else 120, zorder=3,
                   facecolor=(TEAL if on else "#FFFFFF"), edgecolor=("#0F766E" if on else "#CBD5E1"),
                   linewidth=1.2)
        ax.text(x, y - 0.16, city + (" (start)" if city == start_city else ""),
                ha="center", va="top", fontsize=6.2,
                fontweight="bold" if on else "normal", color="#111827" if on else "#94A3B8")
    ax.set_xlim(-0.35, 1.35)
    ax.set_ylim(-0.45, 1.3)
    ax.set_aspect("equal")
    ax.axis("off")


def archetype(name, round_index, subtitle, orders, scen_by_round, optimal, cities, out_dir,
              annotate_trap=False):
    scen = scen_by_round[round_index]
    ids = scen["order_ids"]
    order_list = [orders[i] for i in ids]
    used_cities = [o["city"] for o in order_list]

    fig = plt.figure(figsize=fig_size("single", aspect=1.18), layout="constrained")
    gs = fig.add_gridspec(2, 1, height_ratios=[1.25, 1.0])
    ax_map = fig.add_subplot(gs[0, 0])
    draw_city_map(ax_map, used_cities, cities["travelTimes"], cities["startinglocation"])
    ax_map.set_title(f"{name} — scenario {round_index}", fontsize=8, loc="left")

    ax_list = fig.add_subplot(gs[1, 0])
    ax_list.axis("off")
    ax_list.text(0.0, 1.0, subtitle, ha="left", va="top", fontsize=6.6, color="#475569",
                 transform=ax_list.transAxes, wrap=True)
    y = 0.80
    for o in order_list:
        color = STORE_COLOR.get(o["store"], GREY)
        oid = o["id"].replace("mainGameOrder", "O")
        ax_list.add_patch(Rectangle((0.0, y - 0.05), 0.04, 0.07, facecolor=color, edgecolor="none",
                                    transform=ax_list.transAxes, clip_on=False))
        ax_list.text(0.07, y, f"{oid}  ${o['earnings']}  ·  {o['store']} / {o['city']}",
                     ha="left", va="center", fontsize=6.6, transform=ax_list.transAxes)
        y -= 0.135
    if annotate_trap:
        # max-earnings legal (<=3) bundle vs score-optimal bundle
        from itertools import combinations
        best_pay, best_combo = 0, ()
        for r in range(1, scen.get("max_bundle", 3) + 1):
            for combo in combinations(ids, r):
                pay = sum(orders[i]["earnings"] for i in combo)
                if pay > best_pay:
                    best_pay, best_combo = pay, combo
        opt = optimal[scen["scenario_id"]]
        opt_pay = sum(orders[i]["earnings"] for i in opt["best_bundle_ids"])
        lbl = lambda c: "+".join(i.replace("mainGameOrder", "O") for i in c)
        ax_list.text(0.0, y - 0.02,
                     f"Trap: max-pay {lbl(best_combo)} = ${best_pay}, but score-optimal "
                     f"{lbl(opt['best_bundle_ids'])} = ${opt_pay} (faster).",
                     ha="left", va="top", fontsize=6.2, color=ORANGE, fontweight="bold",
                     transform=ax_list.transAxes)
    return save_figure(fig, out_dir, f"archetype_{name.lower().replace(' ', '_').replace('-', '_')}")


def build_parser():
    parser = argparse.ArgumentParser(description="Native-vector BundleGame schematic figures")
    parser.add_argument("--out-dir", default=str(RAW / "figures" / "vector"))
    parser.add_argument("--width", default="double")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    by_store, pairs, orders, scen_by_round, optimal, cities = load_data()
    written = []

    for key, meta in KEYS.items():
        store = by_store[meta["store"]]
        written.append(store_interior(key, store, args.out_dir, args.width))
        written.append(overlap_pair(key, store, pairs, args.out_dir, args.width))

    written.append(worked_example(orders, scen_by_round, optimal, args.out_dir, args.width))

    written.append(archetype("compact", 14,
                             "Compact: all four orders in one store/city, so routing is not stressed.",
                             orders, scen_by_round, optimal, cities, args.out_dir))
    written.append(archetype("dispersed", 7,
                             "Dispersed: orders span two cities, so bundling incurs cross-city travel.",
                             orders, scen_by_round, optimal, cities, args.out_dir))
    written.append(archetype("payout_trap", 8,
                             "Payout trap: the highest-paying legal bundle scores worse than a cheaper, "
                             "faster bundle.",
                             orders, scen_by_round, optimal, cities, args.out_dir,
                             annotate_trap=True))

    written = [str(p) for p in written if p]
    for p in written:
        print("wrote", p)
    print(f"\n{len(written)} schematic figures written to {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
