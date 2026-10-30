import { blobs, rings, linearSVM, score, margin, kernelSVM, kscore, accuracy } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'hard margin: every point at y·f ≥ 1, support vectors exactly on it'() {
    const P = blobs(), m = linearSVM(P, 1e4);
    ok(P.every(([x, z, y]) => y * score(m, x, z) > 1 - 1e-3), 'outside the margin');
    P.forEach(([x, z, y], i) => { if (m.alpha[i] > 1e-6) near(y * score(m, x, z), 1, 1e-3, `support vector ${i}`); });
  },
  'the margin 2/‖w‖ equals the widest gap found by trying every direction'() {
    const P = blobs(), m = linearSVM(P, 1e4); let best = 0;
    for (let k = 0; k < 7200; k++) { const t = Math.PI * 2 * k / 7200, u = [Math.cos(t), Math.sin(t)], pr = P.map(([x, z, y]) => [x * u[0] + z * u[1], y]);
      best = Math.max(best, Math.min(...pr.filter((p) => p[1] > 0).map((p) => p[0])) - Math.max(...pr.filter((p) => p[1] < 0).map((p) => p[0]))); }
    near(margin(m), best, 1e-2, 'margin');
  },
  'soft margin: smaller C, wider margin and more support vectors'() {
    const P = blobs(), hard = linearSVM(P, 100), soft = linearSVM(P, 0.05);
    ok(margin(soft) > margin(hard) && soft.alpha.filter((a) => a > 1e-6).length > hard.alpha.filter((a) => a > 1e-6).length, 'C trade-off');
  },
  'kernel trick: an RBF SVM separates rings, a linear one cannot'() {
    const P = rings(), T = rings({ seed: 9 }), k = kernelSVM(P, 10, 1), l = linearSVM(P, 10);
    ok(accuracy(T, (x, z) => kscore(k, x, z)) > 0.95 && accuracy(T, (x, z) => score(l, x, z)) < 0.7, 'accuracies');
  },
};
