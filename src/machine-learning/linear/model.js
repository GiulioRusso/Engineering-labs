// Linear models: least squares (closed form and gradient descent, with and without feature scaling) and
// logistic regression in one variable (Newton's method). Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

export function lineData({ n = 24, outlier = false, seed = 4 } = {}) {
  const r = rng(seed), P = Array.from({ length: n }, () => { const x = 10 * r(); return [x, 1.2 + 0.6 * x + gauss(r)]; });
  if (outlier) P.push([9, -3]);
  return P;
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
export function lsq(P) {
  const mx = mean(P.map((p) => p[0])), my = mean(P.map((p) => p[1]));
  let sxy = 0, sxx = 0; for (const [x, y] of P) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
  const m = sxy / sxx; return { m, c: my - m * mx };
}
export const sse = (P, m, c) => P.reduce((s, [x, y]) => s + (y - m * x - c) ** 2, 0);
export const r2 = (P, m, c) => { const my = mean(P.map((p) => p[1])); return 1 - sse(P, m, c) / P.reduce((s, [, y]) => s + (y - my) ** 2, 0); };
// gradient descent on the mean squared error from (m, c) = start. scaled: work with x standardised, which
// makes the loss bowl round; the path is reported in the original (m, c).
export function gd(P, lr, steps, { start = [-0.5, 7], scaled = false } = {}) {
  const mx = scaled ? mean(P.map((p) => p[0])) : 0, sx = scaled ? Math.sqrt(mean(P.map((p) => (p[0] - mx) ** 2))) : 1, n = P.length;
  let a = start[0] * sx, b = start[1] + start[0] * mx; // same line, in the scaled variable u = (x − mx)/sx
  const path = [];
  for (let k = 0; k <= steps; k++) {
    const m = a / sx, c = b - m * mx; path.push([m, c, sse(P, m, c) / n]);
    if (!Number.isFinite(m) || Math.abs(m) > 1e6) break;
    let ga = 0, gb = 0; for (const [x, y] of P) { const u = (x - mx) / sx, e = a * u + b - y; ga += 2 * e * u / n; gb += 2 * e / n; }
    a -= lr * ga; b -= lr * gb;
  }
  return path;
}
// one-variable logistic regression
export const sig = (z) => 1 / (1 + Math.exp(-z));
export function logData({ n = 40, separable = false, seed = 6 } = {}) {
  const r = rng(seed); return Array.from({ length: n }, () => { const x = 10 * r(); return [x, separable ? +(x > 5) : +(r() < sig(1.2 * (x - 5)))]; });
}
export const logLoss = (P, w, b) => P.reduce((s, [x, y]) => { const p = Math.min(1 - 1e-12, Math.max(1e-12, sig(w * x + b))); return s - (y ? Math.log(p) : Math.log(1 - p)); }, 0) / P.length;
export function newton(P, iters = 30) {
  let w = 0, b = 0;
  for (let k = 0; k < iters; k++) {
    let gw = 0, gb = 0, hww = 0, hwb = 0, hbb = 0;
    for (const [x, y] of P) { const p = sig(w * x + b), e = p - y, v = p * (1 - p); gw += e * x; gb += e; hww += v * x * x; hwb += v * x; hbb += v; }
    const det = hww * hbb - hwb * hwb; if (Math.abs(det) < 1e-12) break;
    w -= (hbb * gw - hwb * gb) / det; b -= (hww * gb - hwb * gw) / det;
  }
  return { w, b };
}
