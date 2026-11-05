// Random variables: the normal curve standardised to z-scores, and two jointly normal variables
// (marginals, a conditional slice, the variance of a sum). Pure, no DOM.
import { rng, gauss, normCdf, normQ } from '../core/model.js';
export { normCdf, normQ };

export const zScore = (x, mu, sg) => (x - mu) / sg;
// share inside ±k standard deviations: 68.3, 95.4, 99.7 %
export const within = (k) => normCdf(k) - normCdf(-k);

// n pairs (X, Y) with sd 1 and sy, correlation rho (same seed: the cloud only stretches as rho changes)
export function cloud(n, rho, sy, seed = 4) {
  const r = rng(seed), x = [], y = [];
  for (let i = 0; i < n; i++) { const a = gauss(r), b = gauss(r); x.push(a); y.push(sy * (rho * a + Math.sqrt(1 - rho * rho) * b)); }
  return { x, y };
}
// Y given X = x0: mean rho·sy·x0, sd sy·√(1 − rho²)
export const conditional = (x0, rho, sy) => ({ m: rho * sy * x0, s: sy * Math.sqrt(1 - rho * rho) });
// sd of X + Y: √(1 + sy² + 2 rho sy)
export const sumSd = (rho, sy) => Math.sqrt(1 + sy * sy + 2 * rho * sy);
// the ellipse holding a share 1 − e^(−k²/2) of the pairs
export function ellipse(k, rho, sy, n = 120) {
  const x = [], y = [];
  for (let i = 0; i <= n; i++) { const t = 2 * Math.PI * i / n; x.push(k * Math.cos(t)); y.push(k * sy * (rho * Math.cos(t) + Math.sqrt(1 - rho * rho) * Math.sin(t))); }
  return { x, y };
}
