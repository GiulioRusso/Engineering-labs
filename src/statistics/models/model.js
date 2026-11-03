// Statistical models: inference for a fitted line (confidence and prediction bands, residuals) and the
// Bayesian beta–binomial update for a coin. Seeded. Pure, no DOM.
import { rng, gauss, linfit, tQ, tCdf, betaQ, normQ } from '../core/model.js';

export const TRUE = { a: 2, b: 0.8 };
export function lineData(kind, n, sigma, seed = 91) {
  const r = rng(seed), x = [], y = [];
  for (let i = 0; i < n; i++) {
    const u = 10 * r(), z = gauss(r);
    x.push(u); y.push(kind === 'curved' ? 1 + 0.09 * u * u + sigma * z : kind === 'funnel' ? TRUE.a + TRUE.b * u + sigma * (0.1 + 0.25 * u) * z : TRUE.a + TRUE.b * u + sigma * z);
  }
  return { x, y };
}
// fit plus inference: slope t test, and the two bands at x0
export function regress(x, y) {
  const F = linfit(x, y), df = F.n - 2, tc = tQ(0.975, df), t = F.b / F.seB;
  const band = (x0, pred) => tc * F.s * Math.sqrt((pred ? 1 : 0) + 1 / F.n + (x0 - F.mx) ** 2 / F.sxx);
  return { ...F, df, tc, t, p: 2 * (1 - tCdf(Math.abs(t), df)), ci: [F.b - tc * F.seB, F.b + tc * F.seB], band, fit: (x0) => F.a + F.b * x0 };
}
export const normalScores = (n) => Array.from({ length: n }, (_, i) => normQ((i + 0.5) / n));

// Bayes for a coin: prior Beta(a, b), h heads in n flips → posterior Beta(a + h, b + n − h)
export const PRIORS = { flat: { label: 'Flat: Beta(1, 1)', a: 1, b: 1 }, fair: { label: 'Probably fair: Beta(20, 20)', a: 20, b: 20 }, wrong: { label: 'Sure it favours tails: Beta(3, 12)', a: 3, b: 12 } };
export const flips = (p, N, seed = 97) => { const r = rng(seed); return Array.from({ length: N }, () => (r() < p ? 1 : 0)); };
export function posterior(prior, h, n) {
  const a = prior.a + h, b = prior.b + n - h;
  return { a, b, mean: a / (a + b), ci: [betaQ(0.025, a, b), betaQ(0.975, a, b)], w: n / (n + prior.a + prior.b) };
}
// frequentist Wald interval p̂ ± 1.96 √(p̂(1 − p̂)/n), for comparison
export const wald = (h, n) => { const p = h / n, e = 1.96 * Math.sqrt(p * (1 - p) / n); return [p - e, p + e]; };
