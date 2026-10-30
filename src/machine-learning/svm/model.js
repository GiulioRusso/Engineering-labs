// Support vector machines, solved in the dual by coordinate descent (one α at a time, clipped to [0, C]).
// Linear: the bias rides along as a large constant feature B. Kernel: RBF exp(−γ|x − z|²) plus 1 for the
// bias. Labels y = ±1. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

export function blobs({ n = 40, outlier = false, seed = 2 } = {}) {
  const r = rng(seed), P = [];
  for (let i = 0; i < n; i++) { const y = i % 2 ? 1 : -1; P.push([(y > 0 ? 1 : -1) + 0.5 * gauss(r), (y > 0 ? 0.8 : -0.8) + 0.5 * gauss(r), y]); }
  if (outlier) P.push([0.6, 0.3, -1]);
  return P;
}
export function rings({ n = 120, seed = 3 } = {}) {
  const r = rng(seed); return Array.from({ length: n }, (_, i) => { const y = i % 2 ? 1 : -1, a = 2 * Math.PI * r(), rad = y > 0 ? 0.9 * Math.sqrt(r()) : 1.4 + 0.6 * r(); return [rad * Math.cos(a), rad * Math.sin(a), y]; });
}
const B = 10;
export function linearSVM(P, C, epochs = 10000) {
  const a = new Float64Array(P.length), w = [0, 0, 0], X = P.map(([x, z]) => [x, z, B]), Q = X.map((v) => v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  for (let e = 0; e < epochs; e++) for (let i = 0; i < P.length; i++) {
    const y = P[i][2], v = X[i], G = y * (w[0] * v[0] + w[1] * v[1] + w[2] * v[2]) - 1, na = Math.min(C, Math.max(0, a[i] - G / Q[i])), d = (na - a[i]) * y;
    if (d) { w[0] += d * v[0]; w[1] += d * v[1]; w[2] += d * v[2]; a[i] = na; }
  }
  return { w: [w[0], w[1]], b: w[2] * B, alpha: Array.from(a) };
}
export const score = (m, x, z) => m.w[0] * x + m.w[1] * z + m.b;
export const margin = (m) => 2 / Math.hypot(m.w[0], m.w[1]);

export const rbf = (g) => (p, q) => Math.exp(-g * ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2)) + 1;
export function kernelSVM(P, C, g, epochs = 200) {
  const K = rbf(g), n = P.length, M = P.map((p) => P.map((q) => K(p, q))), a = new Float64Array(n), f = new Float64Array(n); // f_i = Σ α_j y_j K_ij
  for (let e = 0; e < epochs; e++) for (let i = 0; i < n; i++) {
    const y = P[i][2], G = y * f[i] - 1, na = Math.min(C, Math.max(0, a[i] - G / M[i][i])), d = (na - a[i]) * y;
    if (d) { for (let j = 0; j < n; j++) f[j] += d * M[i][j]; a[i] = na; }
  }
  return { P, alpha: Array.from(a), K };
}
export const kscore = (m, x, z) => m.P.reduce((s, p, j) => (m.alpha[j] ? s + m.alpha[j] * p[2] * m.K(p, [x, z]) : s), 0);
export const accuracy = (P, f) => P.filter(([x, z, y]) => f(x, z) * y > 0).length / P.length;
