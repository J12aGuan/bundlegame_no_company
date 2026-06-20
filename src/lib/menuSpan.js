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
