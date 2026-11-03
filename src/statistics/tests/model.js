// Hypothesis tests: t tests (one-sample, two-sample, paired), the distribution of p-values (and what
// testing many outcomes does), one-way ANOVA, and the Mann–Whitney rank test. Seeded. Pure, no DOM.
import { rng, gauss, mean, variance, sum, ranks, tCdf, fCdf, normCdf } from '../core/model.js';

export const SIGMA = 2, MU0 = 10;
const twoSided = (t, df) => 2 * (1 - tCdf(Math.abs(t), df));
export function tOne(x, mu0 = MU0) { const n = x.length, se = Math.sqrt(variance(x) / n), t = (mean(x) - mu0) / se; return { t, df: n - 1, se, diff: mean(x) - mu0, p: twoSided(t, n - 1) }; }
export function tTwo(a, b) {
  const na = a.length, nb = b.length, sp2 = ((na - 1) * variance(a) + (nb - 1) * variance(b)) / (na + nb - 2), se = Math.sqrt(sp2 * (1 / na + 1 / nb)), t = (mean(b) - mean(a)) / se;
  return { t, df: na + nb - 2, se, diff: mean(b) - mean(a), p: twoSided(t, na + nb - 2) };
}
export const tPaired = (a, b) => tOne(b.map((v, i) => v - a[i]), 0);
// data: 'one' — one group, H0 μ = 10; 'two' — two independent groups; 'paired' — the same subjects before and after
export function groups(kind, d, n, seed = 31) {
  const r = rng(seed);
  if (kind === 'one') return { a: Array.from({ length: n }, () => MU0 + d + SIGMA * gauss(r)) };
  if (kind === 'two') return { a: Array.from({ length: n }, () => MU0 + SIGMA * gauss(r)), b: Array.from({ length: n }, () => MU0 + d + SIGMA * gauss(r)) };
  const base = Array.from({ length: n }, () => MU0 + SIGMA * gauss(r));
  return { a: base.map((v) => v + 0.5 * gauss(r)), b: base.map((v) => v + d + 0.5 * gauss(r)) };
}
export const test = (kind, D) => (kind === 'one' ? tOne(D.a) : kind === 'two' ? tTwo(D.a, D.b) : tPaired(D.a, D.b));

// many experiments: two groups of n, effect d, each experiment tests m outcomes and reports the smallest p
export function experiments(d, n, m, M = 300, seed = 41) {
  const r = rng(seed), ps = [];
  for (let k = 0; k < M; k++) {
    let best = 1;
    for (let j = 0; j < m; j++) { const a = Array.from({ length: n }, () => SIGMA * gauss(r)), b = Array.from({ length: n }, () => (j === 0 ? d : 0) + SIGMA * gauss(r)); best = Math.min(best, tTwo(a, b).p); }
    ps.push(best);
  }
  return ps;
}
// power of the two-sided two-sample test (normal approximation)
export function power(d, n, alpha, zq) { const s = d / (SIGMA * Math.sqrt(2 / n)), z = zq(1 - alpha / 2); return 1 - normCdf(z - s) + normCdf(-z - s); }

// one-way ANOVA: k groups of n, true means 10 + spread·c_j, noise σ
const PATTERN = [-1, 0.6, 1, -0.4, 0.1];
export function anovaData(k, n, spread, noise, seed = 53) { const r = rng(seed); return Array.from({ length: k }, (_, j) => Array.from({ length: n }, () => 10 + spread * PATTERN[j] + noise * gauss(r))); }
export function anova(G) {
  const all = G.flat(), N = all.length, k = G.length, gm = mean(all);
  const ssb = sum(G.map((g) => g.length * (mean(g) - gm) ** 2)), ssw = sum(G.map((g) => { const m = mean(g); return sum(g.map((x) => (x - m) ** 2)); }));
  const df1 = k - 1, df2 = N - k, msb = ssb / df1, msw = ssw / df2, F = msb / msw;
  return { ssb, ssw, df1, df2, msb, msw, F, p: 1 - fCdf(F, df1, df2), gm, means: G.map(mean) };
}
export const patternVar = (k) => { const c = PATTERN.slice(0, k), m = mean(c); return sum(c.map((v) => (v - m) ** 2)) / (k - 1); };

// Mann–Whitney U (normal approximation with continuity correction)
export function mannWhitney(a, b) {
  const R = ranks([...a, ...b]), na = a.length, nb = b.length, Rb = sum(R.slice(na)), U = Rb - nb * (nb + 1) / 2, mu = na * nb / 2, s = Math.sqrt(na * nb * (na + nb + 1) / 12);
  const z = (Math.abs(U - mu) - 0.5) / s; return { U, Ra: sum(R.slice(0, na)), Rb, R, z: Math.sign(U - mu) * z, p: 2 * (1 - normCdf(z)) };
}
export function twoGroups(d, out, n = 12, seed = 62) { const r = rng(seed), a = Array.from({ length: n }, () => 10 + SIGMA * gauss(r)), b = Array.from({ length: n }, () => 10 + d + SIGMA * gauss(r)); b[n - 1] += out; return { a, b }; }
