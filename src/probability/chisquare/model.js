// Chi-square tests: goodness of fit (is this die fair? Mendel's peas) and independence in a contingency
// table. Seeded. Pure, no DOM.
import { rng, sum, chi2Cdf } from '../core/model.js';

export const dieProbs = (p6) => [...Array(5).fill((1 - p6) / 5), p6];
// the face of each of N rolls of a die whose six comes up with probability p6
export function rolls(p6, N, seed = 71) {
  const r = rng(seed), P = dieProbs(p6), c = [];
  for (let i = 0; i < N; i++) { let u = r(), k = 0; while (k < 5 && u > P[k]) { u -= P[k]; k++; } c.push(k); }
  return c;
}
export const counts = (faces, n, k = 6) => { const c = new Array(k).fill(0); for (let i = 0; i < n; i++) c[faces[i]]++; return c; };
// Mendel (1866), dihybrid cross: round-yellow, round-green, wrinkled-yellow, wrinkled-green, expected 9:3:3:1
export const MENDEL = { labels: ['round yellow', 'round green', 'wrinkled yellow', 'wrinkled green'], obs: [315, 108, 101, 32], p: [9 / 16, 3 / 16, 3 / 16, 1 / 16] };
export function gof(obs, p) {
  const n = sum(obs), E = p.map((q) => n * q), parts = obs.map((o, i) => (o - E[i]) ** 2 / E[i]), x2 = sum(parts), df = obs.length - 1;
  return { n, E, parts, x2, df, p: 1 - chi2Cdf(x2, df) };
}

// a 2 × 3 table: treatment / placebo × improved / same / worse, association a ∈ [0, 1], n patients
export const ROWS = ['treatment', 'placebo'], COLS = ['improved', 'same', 'worse'];
const CM = [0.4, 0.35, 0.25], M = [[1, 0, -1], [-1, 0, 1]];
export function cellProbs(a) { const p = [0, 1].map((i) => CM.map((c, j) => 0.5 * c * (1 + 0.8 * a * M[i][j]))), s = sum(p.flat()); return p.map((r) => r.map((v) => v / s)); }
export function table(a, n, seed = 83) {
  const r = rng(seed), P = cellProbs(a).flat(), c = new Array(6).fill(0);
  for (let i = 0; i < n; i++) { let u = r(), k = 0; while (k < 5 && u > P[k]) { u -= P[k]; k++; } c[k]++; }
  return [c.slice(0, 3), c.slice(3)];
}
export function independence(T) {
  const R = T.map(sum), C = T[0].map((_, j) => sum(T.map((r) => r[j]))), n = sum(R), E = T.map((r, i) => r.map((_, j) => R[i] * C[j] / n));
  const res = T.map((r, i) => r.map((o, j) => (o - E[i][j]) / Math.sqrt(E[i][j]))), x2 = sum(res.flat().map((z) => z * z)), df = (T.length - 1) * (T[0].length - 1);
  return { R, C, n, E, res, x2, df, p: 1 - chi2Cdf(x2, df), V: Math.sqrt(x2 / (n * Math.min(T.length - 1, T[0].length - 1))) };
}
// φ² of the true probabilities: the statistic grows like n·φ²
export function phi2(a) { const P = cellProbs(a), R = P.map(sum), C = P[0].map((_, j) => P[0][j] + P[1][j]); return sum(P.flatMap((r, i) => r.map((p, j) => (p - R[i] * C[j]) ** 2 / (R[i] * C[j])))); }
