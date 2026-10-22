// Monte Carlo: estimating areas and integrals with random points, how the error falls as 1/√N, Buffon's
// needle, and importance sampling. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

export const CURVES = {
  circle: { label: 'quarter circle → π/4', f: (x) => Math.sqrt(Math.max(0, 1 - x * x)), exact: Math.PI / 4, ymax: 1 },
  bell: { label: 'e^(−x²) on [0, 1]', f: (x) => Math.exp(-x * x), exact: 0.746824132812427, ymax: 1 },
  wave: { label: '½ + ½ sin(6x) on [0, 1]', f: (x) => 0.5 + 0.5 * Math.sin(6 * x), exact: 0.5 + (1 - Math.cos(6)) / 12, ymax: 1 },
};
// hit-or-miss: random points in the unit square, fraction under the curve
export function hitMiss(f, n, seed = 1) { const r = rng(seed), pts = [], est = []; let hit = 0; for (let i = 0; i < n; i++) { const x = r(), y = r(), h = y <= f(x); hit += h; pts.push([x, y, h]); est.push(hit / (i + 1)); } return { pts, est }; }
// sample-mean estimator of ∫₀¹ f, and the spread of many independent estimates of size n
export function meanEstimate(f, n, seed) { const r = rng(seed); let s = 0; for (let i = 0; i < n; i++) s += f(r()); return s / n; }
export function spread(f, n, runs = 200, seed = 50) { const e = Array.from({ length: runs }, (_, k) => meanEstimate(f, n, seed + k)), m = e.reduce((a, b) => a + b, 0) / runs; return { e, sd: Math.sqrt(e.reduce((a, b) => a + (b - m) ** 2, 0) / (runs - 1)) }; }
// Buffon: needles of length l on lines d apart; P(cross) = 2l/(πd)
export function buffon(n, l = 0.8, d = 1, seed = 4) { const r = rng(seed), N = []; let c = 0; for (let i = 0; i < n; i++) { const y = r() * 4 * d, x = r() * 6 - 3, th = Math.PI * r(), y1 = y - l / 2 * Math.sin(th), y2 = y + l / 2 * Math.sin(th), cross = Math.floor(y1 / d) !== Math.floor(y2 / d); c += cross; N.push({ x1: x - l / 2 * Math.cos(th), y1, x2: x + l / 2 * Math.cos(th), y2, cross, est: c ? 2 * l * (i + 1) / (d * c) : NaN }); } return N; }
// importance sampling of a narrow peak ∫₀¹ g, g = exp(−(x − c)²/(2w²)): uniform vs normal(m, s) proposals
export const peak = (x, c = 0.8, w = 0.03) => Math.exp(-((x - c) ** 2) / (2 * w * w));
export const peakExact = (c = 0.8, w = 0.03) => w * Math.sqrt(2 * Math.PI) * 0.5 * (erf((1 - c) / (w * Math.SQRT2)) + erf(c / (w * Math.SQRT2)));
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
export function importance(n, m, s, runs = 200, seed = 9) {
  const q = (x) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI)), U = [], I = [];
  for (let k = 0; k < runs; k++) { const r = rng(seed + k); let a = 0, b = 0; for (let i = 0; i < n; i++) { a += peak(r()); const x = m + s * gauss(r); b += x >= 0 && x <= 1 ? peak(x) / q(x) : 0; } U.push(a / n); I.push(b / n); }
  const sd = (v) => { const mu = v.reduce((p, c) => p + c, 0) / v.length; return Math.sqrt(v.reduce((p, c) => p + (c - mu) ** 2, 0) / (v.length - 1)); };
  return { U, I, sdU: sd(U), sdI: sd(I) };
}
