import { Phi, tpr, fpr, auc, at, sample, empirical } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Φ against known values'() { near(Phi(0), 0.5, 1e-7, 'Φ(0)'); near(Phi(1.959964), 0.975, 1e-6, 'Φ(1.96)'); near(Phi(-1), 0.158655, 1e-5, 'Φ(−1)'); },
  'AUC = Φ(d/√2) = area under the ROC curve (numerical)'() {
    for (const d of [0, 1, 2.5]) { let A = 0; const ts = Array.from({ length: 4001 }, (_, i) => 8 - 16 * i / 4000); for (let i = 1; i < ts.length; i++) A += (fpr(ts[i]) - fpr(ts[i - 1])) * (tpr(ts[i], d) + tpr(ts[i - 1], d)) / 2; near(A, auc(d), 1e-5, `d = ${d}`); }
  },
  'empirical AUC = trapezoid area of the empirical ROC = Mann–Whitney pair count, close to Φ(d/√2)'() {
    const E = empirical(sample(1.5, 300)); let A = 0; for (let i = 1; i < E.pts.length; i++) A += (E.pts[i][0] - E.pts[i - 1][0]) * (E.pts[i][1] + E.pts[i - 1][1]) / 2;
    near(A, E.auc, 1e-12, 'area = pairs'); ok(Math.abs(E.auc - auc(1.5)) < 0.04, `sample ${E.auc} vs ${auc(1.5)}`);
  },
  'rare positives: same recall and false-positive rate, precision collapses'() {
    const common = at(1, 2, 0.5), rare = at(1, 2, 0.01);
    near(common.T, rare.T, 1e-12, 'recall'); ok(common.precision > 0.8 && rare.precision < 0.2, `${common.precision} vs ${rare.precision}`);
    near(common.TP + common.FN + common.FP + common.TN, 1000, 1e-9, 'counts');
  },
};
