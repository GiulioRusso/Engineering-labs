// Loss functions: what each one makes a line fit do with an outlier (squared, absolute, Huber), why squared
// error stalls on a sigmoid while cross-entropy does not, softmax with temperature, and all classification
// losses as functions of the margin. Pure, no DOM.
import { rng, sigmoid } from '../neuron/model.js';

export function lineData(out = 8, { n = 12, seed = 4 } = {}) {
  const r = rng(seed), P = []; for (let i = 0; i < n; i++) { const x = 0.5 + 9 * i / (n - 1); P.push([x, 0.5 * x + 1 + (r() - 0.5) * 0.8]); }
  P[n - 2][1] += out; return P;
}
export const LOSS = {
  mse: { label: 'squared', f: (r) => r * r, d: (r) => 2 * r },
  mae: { label: 'absolute', f: (r) => Math.abs(r), d: (r) => Math.sign(r) },
  huber: { label: 'Huber', f: (r, k = 1) => (Math.abs(r) <= k ? 0.5 * r * r : k * (Math.abs(r) - 0.5 * k)), d: (r, k = 1) => (Math.abs(r) <= k ? r : k * Math.sign(r)) },
};
// fit y = a x + b minimising the mean loss of the residuals (gradient descent with a decaying step, deterministic)
export function fitLine(P, kind, k = 1) {
  let a = 0, b = 0; const n = P.length, L = LOSS[kind];
  for (let it = 0; it < 6000; it++) { let ga = 0, gb = 0; for (const [x, y] of P) { const d = L.d(a * x + b - y, k); ga += d * x; gb += d; } const eta = 0.02 / (1 + it / 800); a -= eta * ga / n / 5; b -= eta * gb / n; }
  return [a, b];
}
// one parameter z trained on a single example with label 1: squared error on σ(z) vs cross-entropy
export const gradMSE = (z) => { const p = sigmoid(z); return 2 * (p - 1) * p * (1 - p); };
export const gradCE = (z) => sigmoid(z) - 1;
export function trainZ(grad, z0 = -6, lr = 1, n = 60) { const Z = [z0]; let z = z0; for (let i = 0; i < n; i++) { z -= lr * grad(z); Z.push(z); } return Z; }
export const softmax = (z, T = 1) => { const m = Math.max(...z), e = z.map((v) => Math.exp((v - m) / T)), s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };
// classification losses as functions of the margin m = y·f(x), y ∈ {−1, +1}
export const MARGIN = {
  zeroone: { label: '0–1 (what we want)', f: (m) => (m <= 0 ? 1 : 0) },
  hinge: { label: 'hinge (SVM)', f: (m) => Math.max(0, 1 - m) },
  logistic: { label: 'logistic (cross-entropy)', f: (m) => Math.log2(1 + Math.exp(-m)) },
  exp: { label: 'exponential (AdaBoost)', f: (m) => Math.exp(-m) },
  square: { label: 'squared', f: (m) => (1 - m) ** 2 },
};
