// Estimation: sampling distributions of a statistic, maximum likelihood for three models, and the
// bootstrap. Seeded. Pure, no DOM.
import { rng, gauss, mean, median, sd, quantile } from '../core/model.js';

export const POPS = {
  expo: { label: 'Exponential (skewed), mean 1', mu: 1, sigma: 1, med: Math.LN2, pdf: (x) => (x < 0 ? 0 : Math.exp(-x)), draw: (r) => -Math.log(r() + 1e-12), hi: 5 },
  uniform: { label: 'Uniform on [0, 2]', mu: 1, sigma: 1 / Math.sqrt(3), med: 1, pdf: (x) => (x >= 0 && x <= 2 ? 0.5 : 0), draw: (r) => 2 * r(), hi: 2.5 },
  normal: { label: 'Normal, mean 1, sd 0.5', mu: 1, sigma: 0.5, med: 1, pdf: (x) => Math.exp(-2 * (x - 1) ** 2) / (0.5 * Math.sqrt(2 * Math.PI)), draw: (r) => 1 + 0.5 * gauss(r), hi: 2.8 },
};
export const STATS = { mean, median, sd };
// m samples of size n; returns each sample's statistic and the last sample
export function sampling(pop, n, stat, m = 600, seed = 5) {
  const r = rng(seed), P = POPS[pop], out = []; let last = [];
  for (let k = 0; k < m; k++) { last = Array.from({ length: n }, () => P.draw(r)); out.push(STATS[stat](last)); }
  return { values: out, last };
}

// Maximum likelihood. Data: coin flips (heads h of n), Gaussian with known σ = 2, exponential waits.
export const MLE = {
  coin: { label: 'Coin: chance of heads p', lo: 0.001, hi: 0.999,
    data: (n) => { const h = Math.round(0.7 * n); return { n, h }; },
    ll: (D, p) => D.h * Math.log(p) + (D.n - D.h) * Math.log(1 - p), hat: (D) => D.h / D.n, se: (D, p) => Math.sqrt(p * (1 - p) / D.n) },
  gauss: { label: 'Measurements: mean μ (σ = 2 known)', lo: 0, hi: 10,
    data: (n) => { const r = rng(9); return { n, x: Array.from({ length: n }, () => 5.6 + 2 * gauss(r)) }; },
    ll: (D, m) => D.x.reduce((s, x) => s - 0.5 * ((x - m) / 2) ** 2 - Math.log(2 * Math.sqrt(2 * Math.PI)), 0), hat: (D) => mean(D.x), se: (D) => 2 / Math.sqrt(D.n) },
  expo: { label: 'Waiting times: rate λ (per min)', lo: 0.02, hi: 1.5,
    data: (n) => { const r = rng(17); return { n, x: Array.from({ length: n }, () => -Math.log(r() + 1e-12) / 0.4) }; },
    ll: (D, l) => D.n * Math.log(l) - l * D.x.reduce((s, x) => s + x, 0), hat: (D) => D.n / D.x.reduce((s, x) => s + x, 0), se: (D, l) => l / Math.sqrt(D.n) },
};

// The bootstrap: resample the data with replacement B times and recompute the statistic.
export const original = (n, seed = 17) => { const r = rng(seed); return Array.from({ length: n }, () => -10 * Math.log(r() + 1e-12)); };  // waits, true mean 10, median 6.93
export function bootstrap(x, stat, B = 1000, seed = 23) {
  const r = rng(seed), n = x.length, f = STATS[stat], vals = [], idx = [];
  for (let b = 0; b < B; b++) { const ix = Array.from({ length: n }, () => Math.floor(r() * n)); if (b < 40) idx.push(ix); vals.push(f(ix.map((i) => x[i]))); }
  return { vals, idx };
}
export const percentileCI = (v, conf = 0.95) => [quantile(v, (1 - conf) / 2), quantile(v, 1 - (1 - conf) / 2)];
export { sd };
