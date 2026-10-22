// Probability: a Galton board (binomial → normal) and sums of dice (central limit theorem). Pure, no DOM.
import { rng } from '../../lib/random.js';
export { rng };

export function binomialPmf(n, p) {
  const out = []; let c = 1;
  for (let k = 0; k <= n; k++) { out.push(c * p ** k * (1 - p) ** (n - k)); c = c * (n - k) / (k + 1); }
  return out;
}
export const normalPdf = (x, mu, sd) => Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

// M balls through n rows: each row sends a ball right with probability p. Returns each ball's choices.
export function galton(n, p, M, seed = 1) {
  const r = rng(seed), balls = [];
  for (let i = 0; i < M; i++) { const steps = []; for (let j = 0; j < n; j++) steps.push(r() < p ? 1 : 0); balls.push(steps); }
  return balls;
}

// Distribution of the sum of k fair dice (convolution), and M simulated sums.
export function dicePmf(k) {
  let d = [1];
  for (let i = 0; i < k; i++) { const e = new Array(d.length + 5).fill(0); d.forEach((v, j) => { for (let f = 0; f < 6; f++) e[j + f] += v / 6; }); d = e; }
  return d; // index j ↔ sum k + j
}
export function diceSums(k, M, seed = 2) {
  const r = rng(seed), out = [];
  for (let i = 0; i < M; i++) { let s = 0; for (let j = 0; j < k; j++) s += 1 + Math.floor(r() * 6); out.push(s); }
  return out;
}
