// Generalization with polynomial fits on noisy samples of a smooth curve: capacity vs train/test error,
// bias–variance from many redrawn datasets, ridge, early stopping by gradient descent, k-fold cross-
// validation; and accuracy vs precision/recall on imbalanced classes. Legendre basis for conditioning.
import { rng } from '../neuron/model.js';

export const truth = (x) => Math.sin(2.6 * x) + 0.3 * x;
const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
export function sample(n, { noise = 0.3, seed = 1 } = {}) { const r = rng(seed); return Array.from({ length: n }, () => { const x = -1 + 2 * r(); return [x, truth(x) + noise * gauss(r)]; }); }
export const TEST = sample(400, { seed: 999 });
export function basis(x, d) { const p = [1, x]; for (let k = 1; k < d; k++) p.push(((2 * k + 1) * x * p[k] - k * p[k - 1]) / (k + 1)); return p.slice(0, d + 1); }
// ridge least squares: (AᵀA + λI) w = Aᵀy
export function fit(P, d, lambda = 0) {
  const m = d + 1, M = Array.from({ length: m }, () => new Array(m + 1).fill(0));
  for (const [x, y] of P) { const b = basis(x, d); for (let i = 0; i < m; i++) { for (let j = 0; j < m; j++) M[i][j] += b[i] * b[j]; M[i][m] += b[i] * y; } }
  for (let i = 0; i < m; i++) M[i][i] += lambda + 1e-10;
  for (let c = 0; c < m; c++) { let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < m; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= m; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((row, i) => row[m] / row[i]);
}
export const predict = (w, x) => basis(x, w.length - 1).reduce((s, b, i) => s + b * w[i], 0);
export const mse = (w, P) => P.reduce((s, [x, y]) => s + (predict(w, x) - y) ** 2, 0) / P.length;

// many datasets: mean prediction, bias², variance on a grid
export function biasVariance(d, { n = 30, noise = 0.3, runs = 40, lambda = 0 } = {}) {
  const xs = Array.from({ length: 81 }, (_, i) => -0.9 + 1.8 * i / 80), W = Array.from({ length: runs }, (_, r) => fit(sample(n, { noise, seed: 100 + r }), d, lambda));
  const preds = W.map((w) => xs.map((x) => predict(w, x))), mean = xs.map((_, i) => preds.reduce((s, p) => s + p[i], 0) / runs);
  const bias2 = xs.reduce((s, x, i) => s + (mean[i] - truth(x)) ** 2, 0) / xs.length, variance = xs.reduce((s, _, i) => s + preds.reduce((q, p) => q + (p[i] - mean[i]) ** 2, 0) / runs, 0) / xs.length;
  return { xs, preds, mean, bias2, variance, noise2: noise * noise };
}
// gradient descent on the degree-d least squares from w = 0; snapshots of w
export function gdPath(P, d, { steps = 4000, lr = 0.25, every = 40 } = {}) {
  const A = P.map(([x]) => basis(x, d)), w = new Array(d + 1).fill(0), snaps = [w.slice()];
  for (let s = 1; s <= steps; s++) { const g = new Array(d + 1).fill(0); A.forEach((b, i) => { const e = b.reduce((q, v, j) => q + v * w[j], 0) - P[i][1]; for (let j = 0; j <= d; j++) g[j] += e * b[j]; }); for (let j = 0; j <= d; j++) w[j] -= lr * g[j] / P.length; if (s % every === 0) snaps.push(w.slice()); }
  return snaps;
}
// k-fold cross-validation error of degree d
export function cvError(P, d, k = 5) { let e = 0; for (let f = 0; f < k; f++) { const tr = P.filter((_, i) => i % k !== f), va = P.filter((_, i) => i % k === f); e += mse(fit(tr, d), va) * va.length; } return e / P.length; }

// imbalanced classes: score ~ N(0,1) for negatives, N(sep,1) for positives, fraction pos of positives
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
export function confusion(th, { sep = 2, pos = 0.08, N = 1000 } = {}) {
  const P = pos * N, Nn = N - P, TP = P * (1 - Phi(th - sep)), FN = P - TP, FP = Nn * (1 - Phi(th)), TN = Nn - FP;
  return { TP, FN, FP, TN, acc: (TP + TN) / N, prec: TP / (TP + FP || 1), rec: TP / P, fpr: FP / Nn };
}
