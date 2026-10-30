// Ensembles of weak models: bagging deep decision trees (a random forest without feature sampling, in 2D)
// and AdaBoost with decision stumps. Points are [x, y, label 0/1]. Pure, no DOM.
import { rng } from '../../lib/random.js';
import { moons } from '../../deep-learning/neuron/model.js';
import { growTree, predict } from '../classic/model.js';

export const data = (seed = 5) => moons(200, { noise: 0.45, seed });
export const TEST = data(55);
// T trees, each grown on a bootstrap sample (n points drawn with replacement)
export function forest(P, T, depth, seed = 1) {
  const r = rng(seed); return Array.from({ length: T }, () => growTree(Array.from(P, () => P[Math.floor(r() * P.length)]), depth));
}
export const vote = (F, x, y, T = F.length) => { let s = 0; for (let t = 0; t < T; t++) s += predict(F[t], x, y); return s / T; };
export const acc = (Q, f) => Q.filter(([x, y, c]) => (f(x, y) > 0.5) === !!c).length / Q.length;

// AdaBoost: each round fits the best stump to the weighted points, then up-weights its mistakes
export function adaboost(P, M) {
  const n = P.length, w = new Float64Array(n).fill(1 / n), Y = P.map((p) => (p[2] ? 1 : -1)), rounds = [];
  for (let m = 0; m < M; m++) {
    let best = null;
    for (const f of [0, 1]) {
      const S = P.map((p, i) => [p[f], i]).sort((a, b) => a[0] - b[0]);
      let left = 0; const tot = Y.reduce((s, y, i) => s + w[i] * y, 0); // Σ w·y on each side decides the error of "+1 to the right"
      for (let k = 0; k <= n; k++) {
        if (k > 0) left += w[S[k - 1][1]] * Y[S[k - 1][1]];
        if (k > 0 && k < n && S[k][0] === S[k - 1][0]) continue;
        const thr = k === 0 ? S[0][0] - 1 : k === n ? S[n - 1][0] + 1 : (S[k][0] + S[k - 1][0]) / 2;
        const e = (1 - (tot - 2 * left)) / 2; // weighted error of predicting −1 left of thr, +1 right of it
        for (const [err, s] of [[e, 1], [1 - e, -1]]) if (!best || err < best.err) best = { f, thr, s, err };
      }
    }
    const eps = Math.min(1 - 1e-10, Math.max(1e-10, best.err)), a = 0.5 * Math.log((1 - eps) / eps);
    let Z = 0; P.forEach((p, i) => { const h = best.s * (p[best.f] >= best.thr ? 1 : -1); w[i] *= Math.exp(-a * Y[i] * h); Z += w[i]; });
    for (let i = 0; i < n; i++) w[i] /= Z;
    rounds.push({ ...best, alpha: a, eps, w: Float64Array.from(w) });
  }
  return rounds;
}
export const boostScore = (R, x, y, M = R.length) => { let s = 0; for (let m = 0; m < M; m++) s += R[m].alpha * R[m].s * ([x, y][R[m].f] >= R[m].thr ? 1 : -1); return s; };
