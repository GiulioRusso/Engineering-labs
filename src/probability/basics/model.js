// First steps in probability: events on the 36 outcomes of two dice, counting (binomial coefficients and
// the birthday problem), conditional probability as areas, the law of large numbers, and expectation and
// variance of a game. Pure, no DOM.
import { rng } from '../../lib/random.js';

export const OUTCOMES = Array.from({ length: 36 }, (_, i) => [Math.floor(i / 6) + 1, (i % 6) + 1]);
export const EVENTS = {
  sum: { label: 'sum = k', f: ([a, b], k) => a + b === k },
  sumge: { label: 'sum ≥ k', f: ([a, b], k) => a + b >= k },
  doubles: { label: 'doubles', f: ([a, b]) => a === b },
  six: { label: 'at least one 6', f: ([a, b]) => a === 6 || b === 6 },
  even: { label: 'first die even', f: ([a]) => a % 2 === 0 },
};
export const prob = (ev, k) => OUTCOMES.filter((o) => EVENTS[ev].f(o, k)).length / 36;
export const both = (e1, k1, e2, k2) => OUTCOMES.filter((o) => EVENTS[e1].f(o, k1) && EVENTS[e2].f(o, k2)).length / 36;

export function choose(n, k) { if (k < 0 || k > n) return 0; let c = 1; for (let i = 1; i <= k; i++) c = c * (n - k + i) / i; return Math.round(c); }
// probability that at least two of g people share a birthday (365 equally likely days)
export function birthday(g) { let q = 1; for (let i = 0; i < g; i++) q *= (365 - i) / 365; return 1 - q; }

// conditional probability: P(B) by total probability, P(A | B) by Bayes
export function conditional(pA, pBA, pBnA) { const pB = pA * pBA + (1 - pA) * pBnA; return { pB, pAB: pA * pBA / (pB || 1), pAandB: pA * pBA }; }

// running relative frequency of successes (probability p) in n trials, for several runs
export function frequencies(p, n, runs = 5, seed = 7) { const r = rng(seed); return Array.from({ length: runs }, () => { let s = 0; return Array.from({ length: n }, (_, i) => { s += r() < p ? 1 : 0; return s / (i + 1); }); }); }

// games: outcomes (value, probability)
export const GAMES = {
  die: { label: 'Fair die (win the face value)', X: [1, 2, 3, 4, 5, 6].map((v) => [v, 1 / 6]) },
  roulette: { label: 'Roulette: €1 on red', X: [[1, 18 / 37], [-1, 19 / 37]] },
  lottery: { label: 'Lottery ticket (€2)', X: [[-2, 0.989], [8, 0.01], [998, 0.001]] },
  insurance: { label: 'Insurance (seen by the insurer)', X: [[100, 0.98], [-4000, 0.02]] },
};
export function moments(X) { const m = X.reduce((s, [v, p]) => s + v * p, 0), v2 = X.reduce((s, [v, p]) => s + p * (v - m) ** 2, 0); return { mean: m, sd: Math.sqrt(v2) }; }
export function plays(X, n, seed = 3) { const r = rng(seed), out = []; let s = 0; for (let i = 0; i < n; i++) { let u = r(), v = X[X.length - 1][0]; for (const [x, p] of X) { if (u < p) { v = x; break; } u -= p; } s += v; out.push(s / (i + 1)); } return out; }
