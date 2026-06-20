<script>
    // Local dev preview of the CHI scenario set. Generates the menus client-side from
    // buildChiScenarioSet (NO Firestore, NO deploy) so the NEW payout-trap menus can be
    // seen and clearly distinguished from the existing picking-stress / base / route menus.
    // Run `npm run dev` and open /chi-preview.
    import "../../app.css";
    import {
        buildChiScenarioSet, enumerateLegalBundles, scoreBundle,
        sortedIdsEqual, CHI_STARTING_CITY, CHI_CITY_TRAVEL,
    } from "$lib/chiScenarioDesign.js";

    const set = buildChiScenarioSet();

    // Menu-type presentation. Traps are the NEW menus; the rest are the existing types.
    const TYPE = {
        trap:  { label: "PAYOUT TRAP", isNew: true,  badge: "bg-amber-500 text-white",   ring: "border-amber-400 border-l-8", tint: "bg-amber-50" },
        pick:  { label: "PICKING-STRESS", isNew: false, badge: "bg-sky-600 text-white",  ring: "border-slate-200", tint: "bg-white" },
        base:  { label: "BASE", isNew: false, badge: "bg-slate-400 text-white",          ring: "border-slate-200", tint: "bg-white" },
        route: { label: "CROSS-CITY / ROUTE", isNew: false, badge: "bg-violet-600 text-white", ring: "border-slate-200", tint: "bg-white" },
    };
    const typeOf = (s) => (s.is_payout_trap ? "trap" : s.stress) || "base";

    const cross = (from, to, scale = 1) => (CHI_CITY_TRAVEL[from]?.[to] ?? 0) * scale;
    const idShort = (id) => id.replace(/^chi[AB]Scenario\d+/, "").replace(/^o/, "o");

    function analyze(s) {
        const byId = Object.fromEntries(s.orders.map((o) => [o.id, o]));
        const legal = enumerateLegalBundles(s.order_ids, byId, s.max_bundle);
        const scored = legal
            .map((ids) => scoreBundle(ids, byId, CHI_STARTING_CITY, s.travel_scale))
            .sort((a, b) => b.score - a.score);
        const optimal = scored[0];
        const maxPay = scored.reduce((b, c) => (c.earnings > b.earnings ? c : b), scored[0]);
        const overBundle = scored
            .filter((c) => c.bundle_ids.length >= 2 && !sortedIdsEqual(c.bundle_ids, optimal.bundle_ids))
            .sort((a, b) => b.earnings - a.earnings)[0] || null;
        // Per-order role (trap menus only): H = max-pay singleton, b1 = optimal singleton, b2 = the bait.
        const role = {};
        if (s.is_payout_trap) {
            const optIds = optimal.bundle_ids;
            const b1 = optIds.length === 1 ? optIds[0] : null;
            for (const o of s.orders) {
                if (sortedIdsEqual(maxPay.bundle_ids, [o.id])) role[o.id] = "H";
                else if (o.id === b1) role[o.id] = "b1";
                else role[o.id] = "b2";
            }
        }
        return { byId, scored, optimal, maxPay, overBundle, role };
    }

    function orderModeled(o, scale) {
        const base = Number(o.estimatedTime) || 0;
        const c = cross(CHI_STARTING_CITY, o.city, scale);
        return { base, city: c, total: base + c };
    }

    const phases = [
        { key: "A", title: "Phase A — diagnostic battery (rounds 1-15)", rows: set.scenarios.filter((s) => s.phase === "A") },
        { key: "ret", title: "Retention OFF block (rounds 21-25, re-tune)", rows: set.scenarios.filter((s) => s.test_set === "retention_same_dist") },
        { key: "trn", title: "Transfer OFF block (rounds 31-35, primary outcome)", rows: set.scenarios.filter((s) => s.test_set === "transfer_shifted") },
        { key: "on", title: "ON training blocks (16-20, 26-30)", rows: set.scenarios.filter((s) => s.block_kind === "on") },
    ];

    let onlyNew = false;
    const counts = set.scenarios.reduce((m, s) => ((m[typeOf(s)] = (m[typeOf(s)] || 0) + 1), m), {});
    const fmt = (n) => (Math.round(n * 10) / 10).toString();
    const badgeFor = (c, a) => {
        const out = [];
        if (sortedIdsEqual(c.bundle_ids, a.optimal.bundle_ids)) out.push({ t: "OPTIMAL", cls: "bg-green-600 text-white" });
        if (sortedIdsEqual(c.bundle_ids, a.maxPay.bundle_ids) && !sortedIdsEqual(c.bundle_ids, a.optimal.bundle_ids)) out.push({ t: "MAX-PAY (trap)", cls: "bg-red-600 text-white" });
        if (a.overBundle && sortedIdsEqual(c.bundle_ids, a.overBundle.bundle_ids)) out.push({ t: "OVER-BUNDLE", cls: "bg-amber-500 text-white" });
        return out;
    };
</script>

<svelte:head><title>CHI scenario preview</title></svelte:head>

<main class="min-h-screen bg-slate-100 p-4 md:p-8">
    <div class="max-w-5xl mx-auto">
        <h1 class="text-2xl font-bold text-slate-900">CHI scenario preview — new payout-trap menus</h1>
        <p class="text-sm text-slate-600 mt-1">
            Generated locally from <code>buildChiScenarioSet</code> (no Firestore / no deploy). The
            <strong class="text-amber-700">amber PAYOUT-TRAP</strong> menus are the new ones; the blue / gray / violet
            menus are the existing types.
        </p>

        <!-- What's new -->
        <div class="mt-4 rounded-lg border-l-8 border-amber-400 bg-amber-50 p-4 text-sm text-slate-700">
            <p class="font-semibold text-amber-800">What changed, and why it's a "trap"</p>
            <p class="mt-1">
                On the old picking-stress menus, the biggest bundle had both the most earnings AND the most pick
                time, so over-bundling (W1) and payout-chasing (W3) picked the SAME option and could not be told
                apart. A <strong>payout trap</strong> decouples them: a high-pay <strong>low-pick</strong> singleton
                <span class="font-mono">H</span> (slow only because of local travel) whose pay beats any bundle, a
                fast lower-pay singleton <span class="font-mono">b1</span> (the score-optimal), and a slow high-pick
                bait <span class="font-mono">b2</span> that forms a legal but worse over-bundle
                <span class="font-mono">{"{b1,b2}"}</span>. The <span class="text-red-700 font-semibold">max-pay
                option (H) is NOT optimal</span>, so a payout-chaser picks H while a pick-neglecter over-bundles
                <span class="font-mono">{"{b1,b2}"}</span> and the optimal is the fast <span class="font-mono">b1</span>
                — three different choices, so the biases become separable.
            </p>
        </div>

        <!-- Legend + counts -->
        <div class="mt-4 flex flex-wrap items-center gap-3 text-xs">
            {#each Object.entries(TYPE) as [k, t]}
                <span class="inline-flex items-center gap-1.5">
                    <span class="px-2 py-0.5 rounded font-bold {t.badge}">{t.label}{t.isNew ? " ★NEW" : ""}</span>
                    <span class="text-slate-500">x{counts[k] || 0}</span>
                </span>
            {/each}
            <label class="ml-auto inline-flex items-center gap-2 text-slate-700">
                <input type="checkbox" bind:checked={onlyNew} /> highlight new (trap) menus only
            </label>
        </div>

        {#each phases as ph}
            <section class="mt-8">
                <h2 class="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-1">{ph.title}</h2>
                <div class="mt-3 space-y-4">
                    {#each ph.rows as s (s.scenario_id)}
                        {@const t = TYPE[typeOf(s)]}
                        {@const a = analyze(s)}
                        <article class="rounded-xl border bg-white shadow-sm overflow-hidden {t.ring}
                            {onlyNew && !t.isNew ? 'opacity-30' : ''}">
                            <!-- header -->
                            <div class="flex items-center justify-between px-4 py-2 {t.tint} border-b">
                                <div class="flex items-center gap-2">
                                    <span class="px-2 py-0.5 rounded text-xs font-bold {t.badge}">{t.label}{t.isNew ? " ★NEW" : ""}</span>
                                    <span class="text-sm font-semibold text-slate-700">round {s.round}</span>
                                    <span class="text-xs text-slate-500">
                                        {s.dispersion_flag ? "cross-city" : "same-city"} · gap {fmt(s.relative_gap * 100)}%
                                        {s.shift_flag ? " · SHIFT" : ""}
                                    </span>
                                </div>
                            </div>

                            <div class="p-4">
                                <!-- order cards -->
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {#each s.orders as o}
                                        {@const m = orderModeled(o, s.travel_scale)}
                                        {@const r = a.role[o.id]}
                                        <div class="rounded-lg border bg-white p-2
                                            {r === 'H' ? 'border-red-300 ring-1 ring-red-200' : r === 'b1' ? 'border-green-300 ring-1 ring-green-200' : r === 'b2' ? 'border-amber-300' : 'border-slate-200'}">
                                            <div class="flex justify-between items-start">
                                                <div class="min-w-0">
                                                    <h3 class="font-bold text-slate-800 text-sm truncate">{o.store}</h3>
                                                    <p class="text-xs text-slate-500">📍 {o.city}</p>
                                                </div>
                                                <span class="font-bold text-green-600 text-base ml-1">${o.earnings}</span>
                                            </div>
                                            <div class="mt-1 text-[11px] text-slate-500 leading-tight">
                                                <div>⏱ modeled {fmt(m.total)}s</div>
                                                <div>pick {fmt(o.pick)}s · local {fmt(o.localTravelTime)}s{m.city > 0 ? ` · city ${fmt(m.city)}s` : ""}</div>
                                            </div>
                                            {#if r}
                                                <div class="mt-1 text-[10px] font-bold
                                                    {r === 'H' ? 'text-red-700' : r === 'b1' ? 'text-green-700' : 'text-amber-700'}">
                                                    {r === 'H' ? 'H — high pay, low pick (the trap)' : r === 'b1' ? 'b1 — fast, optimal' : 'b2 — slow over-bundle bait'}
                                                </div>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>

                                <!-- candidate bundles -->
                                <table class="mt-3 w-full text-xs">
                                    <thead class="text-slate-400 text-left">
                                        <tr><th class="font-medium py-1">legal bundle</th><th class="font-medium">earnings</th><th class="font-medium">pick</th><th class="font-medium">time</th><th class="font-medium">score</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {#each a.scored as c}
                                            <tr class="border-t border-slate-100">
                                                <td class="py-1 font-mono text-slate-600">{c.bundle_ids.map(idShort).join("+")}</td>
                                                <td class="text-green-700 font-semibold">${c.earnings}</td>
                                                <td class="text-slate-500">{fmt(c.effective_pick_time_seconds)}s</td>
                                                <td class="text-slate-500">{fmt(c.total_time_seconds)}s</td>
                                                <td class="text-slate-700 font-semibold">{fmt(c.score)}</td>
                                                <td class="space-x-1">
                                                    {#each badgeFor(c, a) as b}<span class="px-1.5 py-0.5 rounded text-[10px] font-bold {b.cls}">{b.t}</span>{/each}
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>

                                {#if s.is_payout_trap}
                                    <p class="mt-2 text-xs text-slate-600 bg-amber-50 rounded p-2">
                                        <strong class="text-amber-800">Why this separates the biases:</strong>
                                        a payout-chaser (W3) picks <span class="font-mono text-red-700">{a.maxPay.bundle_ids.map(idShort).join("+")}</span>
                                        (max pay ${a.maxPay.earnings}, score {fmt(a.maxPay.score)} — NOT optimal);
                                        a pick-neglecter (W1) over-bundles <span class="font-mono text-amber-700">{a.overBundle ? a.overBundle.bundle_ids.map(idShort).join("+") : "n/a"}</span>;
                                        the optimal is <span class="font-mono text-green-700">{a.optimal.bundle_ids.map(idShort).join("+")}</span>
                                        (${a.optimal.earnings}, score {fmt(a.optimal.score)}). Three different choices.
                                    </p>
                                {/if}
                            </div>
                        </article>
                    {/each}
                </div>
            </section>
        {/each}
    </div>
</main>
