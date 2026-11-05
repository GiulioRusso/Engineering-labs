// Markov chains on three states: transition matrices, one simulated walk, the distribution after t steps
// (p_t = p_0 P^t) and the long-run share of time in each state. Pure, no DOM.
import { rng } from '../core/model.js';

export const CHAINS = {
  weather: { label: 'Weather', names: ['Sunny', 'Cloudy', 'Rainy'], P: [[0.6, 0.3, 0.1], [0.3, 0.4, 0.3], [0.2, 0.4, 0.4]] },
  sticky: { label: 'Sticky moods', names: ['Calm', 'Busy', 'Stressed'], P: [[0.95, 0.04, 0.01], [0.03, 0.94, 0.03], [0.02, 0.03, 0.95]] },
  cycle: { label: 'A cycle', names: ['Morning', 'Afternoon', 'Night'], P: [[0, 1, 0], [0, 0, 1], [1, 0, 0]] },
  absorb: { label: 'A game until ruin', names: ['Broke', 'Playing', 'Won'], P: [[1, 0, 0], [0.3, 0.4, 0.3], [0, 0, 1]] },
};
// blend toward staying put: (1 − k) P + k I
export const sticky = (P, k) => P.map((row, i) => row.map((p, j) => (1 - k) * p + (i === j ? k : 0)));
export const step = (p, P) => P[0].map((_, j) => p.reduce((s, pi, i) => s + pi * P[i][j], 0));
export function evolve(P, start, T) { const out = [P.map((_, i) => (i === start ? 1 : 0))]; for (let t = 0; t < T; t++) out.push(step(out[t], P)); return out; }
// long-run share of time from `start`: the average of p_t (also right for cycles and absorbing chains)
export function longRun(P, start, T = 4000) { const ps = evolve(P, start, T), s = [0, 0, 0]; for (const p of ps) p.forEach((v, i) => { s[i] += v / ps.length; }); return s; }
export function walk(P, start, n, seed = 7) { const r = rng(seed), w = [start]; for (let k = 0; k < n; k++) { const u = r(), row = P[w[k]]; let j = 0, c = row[0]; while (u > c && j < 2) c += row[++j]; w.push(j); } return w; }
export const tv = (p, q) => 0.5 * p.reduce((s, v, i) => s + Math.abs(v - q[i]), 0);
