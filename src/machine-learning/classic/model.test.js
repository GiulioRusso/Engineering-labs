import { clusters, knn, accuracy, growTree, predict, leaves, kmeans, cloud, pca, along } from './model.js';
import { moons } from '../neuron/model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  '1-NN fits the training set exactly; larger k smooths'() { const P = moons(); ok(accuracy(P, (x, y) => knn(P, x, y, 1)) === 1, '1-NN train'); ok(accuracy(moons(200, { seed: 11 }), (x, y) => knn(P, x, y, 9)) > 0.9, '9-NN test'); },
  'a deeper tree fits better and has more leaves'() { const P = moons(), a = growTree(P, 1), b = growTree(P, 6); ok(leaves(a) === 2 && leaves(b) > 6, 'leaves'); ok(accuracy(P, (x, y) => predict(b, x, y)) > accuracy(P, (x, y) => predict(a, x, y)), 'fit'); },
  'k-means never increases its inertia'() { const H = kmeans(clusters('four'), 4); for (let i = 1; i < H.length; i++) ok(H[i].inertia <= H[i - 1].inertia + 1e-9, `iteration ${i}`); },
  'PCA finds the direction of largest variance'() { const P = cloud(0.6, 1.5, 0.3), Q = pca(P); near(Math.cos(2 * (Q.angle - 0.6)), 1, 0.01, 'angle'); near(along(P, Q.angle).variance, Q.l1, 1e-9, 'λ₁'); const t = along(P, 1.1); near(t.variance + t.residual, Q.l1 + Q.l2, 1e-9, 'total'); },
};
