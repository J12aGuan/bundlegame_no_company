/**
 * Numeric identifiability check for the CHI menus (P4 / the ICML theorem made concrete).
 *
 * The diagnosis can only separate the bias axes it has CHOICE VARIATION on. For a menu,
 * the "one-step marginal vectors" are the per-attribute feature differences between each
 * legal candidate and the menu's optimal bundle — the trade-offs the participant is
 * actually offered. Stacked over a block and restricted to the axes {earnings, pick,
 * local, cross}, the rank and condition number of that matrix say whether those axes are
 * SPANNED (jointly identifiable) or collinear. The payout traps are supposed to span
 * earnings x {each cost axis}; this computes it rather than asserting it.
 *
 * Pure (no imports beyond the scenario scorer's outputs), unit-testable under node --test.
 */

export const SPAN_AXES = [
  "earnings",
  "effective_pick_time_seconds",
  "local_travel_time_seconds",
  "cross_city_travel_time_seconds",
];

// Eigenvalues of a small symmetric matrix via cyclic Jacobi rotations (k <= ~6).
export function symmetricEigenvalues(A) {
  const k = A.length;
  const M = A.map((r) => r.slice());
  for (let sweep = 0; sweep < 100; sweep += 1) {
    let off = 0;
    for (let i = 0; i < k; i += 1) for (let j = i + 1; j < k; j += 1) off += M[i][j] * M[i][j];
    if (off < 1e-18) break;
    for (let p = 0; p < k; p += 1) {
      for (let q = p + 1; q < k; q += 1) {
        if (Math.abs(M[p][q]) < 1e-15) continue;
        const theta = (M[q][q] - M[p][p]) / (2 * M[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let i = 0; i < k; i += 1) {
          const mip = M[i][p]; const miq = M[i][q];
          M[i][p] = c * mip - s * miq; M[i][q] = s * mip + c * miq;
        }
        for (let i = 0; i < k; i += 1) {
          const mpi = M[p][i]; const mqi = M[q][i];
          M[p][i] = c * mpi - s * mqi; M[q][i] = s * mpi + c * mqi;
        }
      }
    }
  }
  return Array.from({ length: k }, (_, i) => M[i][i]).sort((a, b) => b - a);
}

/** Candidate-minus-optimal marginal vectors for ONE menu over `axes`. */
export function marginalVectorsForMenu(menu, axes = SPAN_AXES) {
  const cb = menu?.candidate_bundles || [];
  const opt = cb.find((c) => c.is_oracle === 1) || cb[0];
  if (!opt) return [];
  return cb
    .filter((c) => c !== opt)
    .map((c) => axes.map((a) => (Number(c[a]) || 0) - (Number(opt[a]) || 0)));
}

/**
 * Spectrum of the Gram (observability/Fisher) matrix G = R^T R of a linear observation
 * map whose rows are the observation vectors `rows` (each an equal-length numeric array).
 * Returns the eigenvalues (descending), lambda_min / lambda_max, condition number, and
 * rank (eigenvalues above a relative tol). This is the central object of the
 * identifiability theorem: a latent state restricted to these coordinates is OBSERVABLE
 * (locally identifiable) iff lambda_min(G) > 0, and the sample complexity to estimate it
 * scales with 1 / lambda_min. A rank-deficient G (lambda_min = 0) means an entire
 * null-space of states is indistinguishable from the data — unobservable.
 */
export function gramSpectrum(rows, { relTol = 1e-9 } = {}) {
  const k = rows[0]?.length || 0;
  if (!k || rows.length === 0) {
    return { k, n_rows: rows.length, eigenvalues: [], lambda_min: 0, lambda_max: 0, condition: Infinity, rank: 0, matrix: [] };
  }
  const gram = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) =>
    rows.reduce((s, r) => s + (Number(r[i]) || 0) * (Number(r[j]) || 0), 0)));
  const eig = symmetricEigenvalues(gram).map((e) => Math.max(0, e));
  const lambda_max = eig[0] || 0;
  const lambda_min = eig[eig.length - 1] || 0;
  const tol = relTol * (lambda_max || 1);
  const rank = eig.filter((e) => e > tol).length;
  const condition = lambda_min > tol ? lambda_max / lambda_min : Infinity;
  return { k, n_rows: rows.length, eigenvalues: eig, lambda_min, lambda_max, condition, rank, matrix: gram };
}

/**
 * Observability Gramian of the CHOICE-MARGINAL observation map for a set of menus over
 * `axes`. Each row is a candidate-minus-optimal marginal vector (the per-attribute
 * counterfactual signal); the Gram spectrum says whether the bias on those axes is
 * observable. With `projectOnto` (a direction in axis-space, e.g. the reward/value
 * direction), each row is replaced by its rank-1 projection onto that single direction —
 * the SCALAR / regret channel, which observes only the aggregate value gap and is
 * therefore rank-1 (lambda_min = 0 over >= 2 axes: the per-axis bias is unobservable).
 * Columns are scaled to unit standard deviation by default so the spectrum reflects
 * collinearity, not feature units (the projection is applied AFTER scaling, in the same
 * space, so the scalar-vs-counterfactual contrast is apples-to-apples).
 */
export function observabilityGramian(menus, { axes = SPAN_AXES, projectOnto = null, standardize = true, relTol = 1e-9 } = {}) {
  let rows = [];
  for (const m of menus) for (const v of marginalVectorsForMenu(m, axes)) rows.push(v);
  const k = axes.length;
  if (rows.length === 0) return { ...gramSpectrum([], { relTol }), n_vectors: 0, channel: projectOnto ? "scalar" : "counterfactual" };
  if (standardize) {
    const std = axes.map((_, j) => {
      const mean = rows.reduce((s, r) => s + r[j], 0) / rows.length;
      const v = rows.reduce((s, r) => s + (r[j] - mean) ** 2, 0) / rows.length;
      return Math.sqrt(v) || 1;
    });
    rows = rows.map((r) => r.map((x, j) => x / std[j]));
  }
  if (projectOnto) {
    // Scalar channel: observe only <row, u> along the single direction u (rank-1 map).
    const u = projectOnto.slice(0, k);
    const un = Math.sqrt(u.reduce((s, x) => s + x * x, 0)) || 1;
    const uhat = u.map((x) => x / un);
    rows = rows.map((r) => {
      const proj = r.reduce((s, x, j) => s + x * uhat[j], 0);
      return uhat.map((x) => proj * x);
    });
  }
  const spec = gramSpectrum(rows, { relTol });
  return { ...spec, n_vectors: rows.length, channel: projectOnto ? "scalar" : "counterfactual" };
}

/**
 * Span diagnostics for a set of menus over `axes`: the standardized marginal-vector
 * matrix's rank (count of singular values above a relative tol) and condition number.
 * rank === axes.length means the block jointly identifies every axis.
 */
export function spanDiagnostics(menus, { axes = SPAN_AXES, relTol = 1e-3 } = {}) {
  const rows = [];
  for (const m of menus) for (const v of marginalVectorsForMenu(m, axes)) rows.push(v);
  const k = axes.length;
  if (rows.length < k) return { n_vectors: rows.length, rank: 0, condition: Infinity, singular_values: [] };
  // Standardize each axis (zero-mean unit-std) so condition reflects collinearity, not units.
  const mean = axes.map((_, j) => rows.reduce((s, r) => s + r[j], 0) / rows.length);
  const std = axes.map((_, j) => {
    const v = rows.reduce((s, r) => s + (r[j] - mean[j]) ** 2, 0) / rows.length;
    return Math.sqrt(v) || 1;
  });
  const Z = rows.map((r) => r.map((x, j) => (x - mean[j]) / std[j]));
  // Gram = Z^T Z (k x k). Singular values of Z = sqrt(eigenvalues of Gram).
  const gram = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) =>
    Z.reduce((s, r) => s + r[i] * r[j], 0)));
  const eig = symmetricEigenvalues(gram).map((e) => Math.max(0, e));
  const sv = eig.map((e) => Math.sqrt(e));
  const maxSv = sv[0] || 0;
  const rank = sv.filter((x) => x > relTol * (maxSv || 1)).length;
  const minSv = sv[sv.length - 1];
  const condition = minSv > relTol * (maxSv || 1) ? maxSv / minSv : Infinity;
  return { n_vectors: rows.length, rank, condition, singular_values: sv };
}
