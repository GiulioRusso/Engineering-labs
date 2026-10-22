// Statistical inference: confidence intervals (how many of them cover the truth) and hypothesis tests
// (significance level, p-value, power). Normal model with known σ. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

export function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
export const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
export function zOf(p) { let lo = -10, hi = 10; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
// m intervals x̄ ± z σ/√n from samples of size n of N(mu, sigma)
export function intervals(m, n, conf, { mu = 10, sigma = 2, seed = 21 } = {}) {
  const z = zOf(1 - (1 - conf) / 2), r = rng(seed), h = z * sigma / Math.sqrt(n);
  return Array.from({ length: m }, () => { let s = 0; for (let i = 0; i < n; i++) s += mu + sigma * gauss(r); const x = s / n; return { x, lo: x - h, hi: x + h, hit: Math.abs(x - mu) <= h }; });
}
// one-sided z test of H0: effect 0 against an effect d (in σ units) with n samples
export function test(d, n, alpha) { const zc = zOf(1 - alpha), shift = d * Math.sqrt(n); return { zc, shift, power: 1 - Phi(zc - shift), beta: Phi(zc - shift) }; }
