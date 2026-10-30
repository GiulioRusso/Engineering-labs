// Scores of a classifier: negatives ~ N(0, 1), positives ~ N(d, 1). A threshold t turns scores into
// decisions; sweeping t traces the ROC curve. Closed forms plus a finite sample. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

// standard normal CDF via erf (Abramowitz & Stegun 7.1.26, |error| < 1.5·10⁻⁷)
export function Phi(x) {
  const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
  const e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return x >= 0 ? 0.5 * (1 + e) : 0.5 * (1 - e);
}
export const pdf = (x, m = 0) => Math.exp(-0.5 * (x - m) ** 2) / Math.sqrt(2 * Math.PI);
export const tpr = (t, d) => 1 - Phi(t - d);
export const fpr = (t) => 1 - Phi(t);
export const auc = (d) => Phi(d / Math.SQRT2);
// rates and counts at threshold t, for prevalence p (fraction of positives) and N cases
export function at(t, d, p, N = 1000) {
  const T = tpr(t, d), F = fpr(t), TP = p * N * T, FN = p * N * (1 - T), FP = (1 - p) * N * F, TN = (1 - p) * N * (1 - F);
  return { T, F, TP, FN, FP, TN, precision: TP + FP > 0 ? TP / (TP + FP) : 1, accuracy: (TP + TN) / N };
}
// a finite sample and its empirical ROC; AUC as the share of (positive, negative) pairs ranked correctly
export function sample(d, n = 200, seed = 1) { const r = rng(seed); return { neg: Array.from({ length: n }, () => gauss(r)), pos: Array.from({ length: n }, () => d + gauss(r)) }; }
export function empirical({ neg, pos }) {
  const all = [...neg.map((s) => [s, 0]), ...pos.map((s) => [s, 1])].sort((a, b) => b[0] - a[0]), pts = [[0, 0]]; let tp = 0, fp = 0;
  for (const [, y] of all) { if (y) tp++; else fp++; pts.push([fp / neg.length, tp / pos.length]); }
  let pairs = 0; for (const a of pos) for (const b of neg) pairs += a > b ? 1 : a === b ? 0.5 : 0;
  return { pts, auc: pairs / (pos.length * neg.length) };
}
