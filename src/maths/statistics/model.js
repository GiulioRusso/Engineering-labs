// Statistics: common distributions (pdf/pmf and cdf), Bayes' theorem on a screening test, the sampling
// distribution of the mean, random walks, and Monte Carlo estimation of π. Pure, no DOM.
import { rng } from '../probability/model.js';
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const fact = (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
export const DIST = {
  normal: { label: 'Normal (μ, σ)', cont: true, pdf: (x, a, b) => Math.exp(-((x - a) ** 2) / (2 * b * b)) / (b * Math.sqrt(2 * Math.PI)), cdf: (x, a, b) => 0.5 * (1 + erf((x - a) / (b * Math.SQRT2))), mean: (a) => a, sd: (a, b) => b },
  uniform: { label: 'Uniform [a, b]', cont: true, pdf: (x, a, b) => (x >= a && x <= b ? 1 / (b - a) : 0), cdf: (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a))), mean: (a, b) => (a + b) / 2, sd: (a, b) => (b - a) / Math.sqrt(12) },
  exponential: { label: 'Exponential (rate λ)', cont: true, pdf: (x, a) => (x >= 0 ? a * Math.exp(-a * x) : 0), cdf: (x, a) => (x >= 0 ? 1 - Math.exp(-a * x) : 0), mean: (a) => 1 / a, sd: (a) => 1 / a },
  poisson: { label: 'Poisson (mean λ)', cont: false, pdf: (k, a) => (k >= 0 && Number.isInteger(k) ? Math.exp(-a) * a ** k / fact(k) : 0), cdf: (x, a) => { let s = 0; for (let k = 0; k <= Math.floor(x); k++) s += Math.exp(-a) * a ** k / fact(k); return s; }, mean: (a) => a, sd: (a) => Math.sqrt(a) },
  binomial: { label: 'Binomial (n, p)', cont: false, pdf: (k, n, p) => { if (k < 0 || k > n || !Number.isInteger(k)) return 0; let c = 1; for (let i = 1; i <= k; i++) c = c * (n - k + i) / i; return c * p ** k * (1 - p) ** (n - k); }, cdf: (x, n, p) => { let s = 0; for (let k = 0; k <= Math.floor(x); k++) s += DIST.binomial.pdf(k, n, p); return s; }, mean: (n, p) => n * p, sd: (n, p) => Math.sqrt(n * p * (1 - p)) },
};
// P(ill | positive) for prevalence p, sensitivity se, specificity sp
export const bayes = (p, se, sp) => (se * p) / (se * p + (1 - sp) * (1 - p));
// means of `m` samples of size n from a skewed parent (exponential, mean 1)
export function sampleMeans(n, m, seed = 3) { const r = rng(seed), out = []; for (let i = 0; i < m; i++) { let s = 0; for (let j = 0; j < n; j++) s += -Math.log(1 - r()); out.push(s / n); } return out; }
export function walks(k, steps, p = 0.5, seed = 5) { const r = rng(seed); return Array.from({ length: k }, () => { const w = [0]; for (let i = 0; i < steps; i++) w.push(w[i] + (r() < p ? 1 : -1)); return w; }); }
export function monteCarloPi(n, seed = 9) { const r = rng(seed), pts = []; let inside = 0; const est = []; for (let i = 0; i < n; i++) { const x = r(), y = r(), hit = x * x + y * y <= 1; if (hit) inside++; pts.push([x, y, hit]); est.push(4 * inside / (i + 1)); } return { pts, est }; }
