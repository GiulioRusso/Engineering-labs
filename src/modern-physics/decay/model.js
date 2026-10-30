// Radioactive decay: every nucleus has the same chance per second λ to decay, independently of the
// others and of its age. Monte Carlo (each nucleus draws an exponential lifetime) against the exact
// laws, for one species and for a chain A → B → (stable). Times in seconds. Pure, no DOM.
import { rng } from '../../lib/random.js';

export const lambda = (half) => Math.LN2 / half;
// Lifetimes of N nuclei of A, and the extra lifetime of each daughter B once it is born
export function nuclei(N, halfA, halfB = 0, seed = 1) {
  const r = rng(seed), la = lambda(halfA), lb = halfB ? lambda(halfB) : 0, tA = new Float64Array(N), tB = new Float64Array(N);
  for (let i = 0; i < N; i++) { tA[i] = -Math.log(1 - r()) / la; tB[i] = lb ? tA[i] - Math.log(1 - r()) / lb : Infinity; }
  return { tA, tB };
}
// Counts at time t: still A, now B, done
export function census({ tA, tB }, t) { let a = 0, b = 0; for (let i = 0; i < tA.length; i++) { if (t < tA[i]) a++; else if (t < tB[i]) b++; } return { a, b, c: tA.length - a - b }; }
// Exact (Bateman): N_A = N₀e^(−λ_A t), N_B = N₀ λ_A/(λ_B − λ_A) (e^(−λ_A t) − e^(−λ_B t))
export const exactA = (N0, la, t) => N0 * Math.exp(-la * t);
export const exactB = (N0, la, lb, t) => N0 * la / (lb - la) * (Math.exp(-la * t) - Math.exp(-lb * t));
