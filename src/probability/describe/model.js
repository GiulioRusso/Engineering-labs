// Describing data: the data sets used by the summary, histogram and correlation cases. Seeded, so every
// visit shows the same numbers. Pure, no DOM.
import { rng, gauss } from '../core/model.js';

// fifteen commute times (minutes): symmetric, skewed or two groups
export function commute(kind) {
  const r = rng(7);
  if (kind === 'skewed') return Array.from({ length: 15 }, () => Math.round(8 - 9 * Math.log(r() + 1e-9)));
  if (kind === 'bimodal') return Array.from({ length: 15 }, (_, i) => Math.round((i % 2 ? 48 : 18) + 4 * gauss(r)));
  return Array.from({ length: 15 }, () => Math.round(28 + 5 * gauss(r)));
}
// a population and a sample of n drawn from it
export const POP = {
  normal: { label: 'Normal (bell)', pdf: (x) => Math.exp(-0.5 * ((x - 50) / 10) ** 2) / (10 * Math.sqrt(2 * Math.PI)), draw: (r) => 50 + 10 * gauss(r) },
  skewed: { label: 'Skewed (waiting times)', pdf: (x) => (x < 20 ? 0 : Math.exp(-(x - 20) / 15) / 15), draw: (r) => 20 - 15 * Math.log(r() + 1e-12) },
  bimodal: { label: 'Two groups', pdf: (x) => 0.5 * (Math.exp(-0.5 * ((x - 35) / 6) ** 2) + Math.exp(-0.5 * ((x - 65) / 6) ** 2)) / (6 * Math.sqrt(2 * Math.PI)), draw: (r) => (r() < 0.5 ? 35 : 65) + 6 * gauss(r) },
};
export const sample = (pop, n, seed = 3) => { const r = rng(seed); return Array.from({ length: n }, () => POP[pop].draw(r)); };
// Freedman–Diaconis rule: bin width 2·IQR/n^(1/3)
export const fdBins = (iqr, n, span) => Math.max(1, Math.round(span / (2 * iqr / Math.cbrt(n))));

// Anscombe's quartet (1973): same means, variances, r and fitted line, four very different pictures
const X = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
export const ANSCOMBE = {
  a1: { x: X, y: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68] },
  a2: { x: X, y: [9.14, 8.14, 8.74, 8.77, 9.26, 8.1, 6.13, 3.1, 9.13, 7.26, 4.74] },
  a3: { x: X, y: [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73] },
  a4: { x: [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], y: [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.5, 5.56, 7.91, 6.89] },
};
export function pairs(set, rho = 0.7, n = 40) {
  if (ANSCOMBE[set]) return ANSCOMBE[set];
  const r = rng(11), x = [], y = [];
  for (let i = 0; i < n; i++) {
    const z1 = gauss(r), z2 = gauss(r);
    if (set === 'parabola') { const u = 2 + 16 * r(); x.push(u); y.push(12 - 0.12 * (u - 10) ** 2 + 0.4 * z1); }
    else if (set === 'outlier') { x.push(9 + 1.5 * z1); y.push(6 + 1.2 * z2); }
    else { x.push(10 + 3 * z1); y.push(7.5 + 2 * (rho * z1 + Math.sqrt(1 - rho * rho) * z2)); }
  }
  if (set === 'outlier') { x.push(19); y.push(13); }
  return { x, y };
}
