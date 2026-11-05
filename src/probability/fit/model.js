// Least squares: points, the sum of squared residuals of any line, the best line, and gradient descent
// sliding a line down the error bowl. Pure, no DOM.
import { rng, gauss, linfit } from '../core/model.js';
export { linfit };

export function points(kind = 'clean', seed = 6) {
  const r = rng(seed), x = [], y = [];
  for (let i = 0; i < 12; i++) { const xi = 0.6 + 8.8 * i / 11 + 0.3 * (r() - 0.5); x.push(xi); y.push(kind === 'curve' ? 1 + 0.15 * (xi - 1) ** 2 + 0.3 * gauss(r) : 2 + 0.6 * xi + 0.8 * gauss(r)); }
  if (kind === 'outlier') y[9] += 6;
  return { x, y };
}
export const sse = (P, a, b) => P.x.reduce((s, x, i) => s + (P.y[i] - a - b * x) ** 2, 0);
// gradient descent on the mean squared error from (a, b), `steps` iterations of rate lr
export function descent(P, a, b, steps = 200, lr = 0.02) {
  const path = [[a, b]], n = P.x.length;
  for (let k = 0; k < steps; k++) {
    let ga = 0, gb = 0; for (let i = 0; i < n; i++) { const e = a + b * P.x[i] - P.y[i]; ga += 2 * e / n; gb += 2 * e * P.x[i] / n; }
    a -= 4 * lr * ga; b -= lr * gb; path.push([a, b]);
  }
  return path;
}
