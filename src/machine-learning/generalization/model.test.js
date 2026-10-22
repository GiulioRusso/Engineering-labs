import { sample, fit, mse, TEST, biasVariance, gdPath, cvError, confusion, basis } from './model.js';
import { near, ok } from '../../lib/testing.js';

const P = sample(20);
export const tests = {
  'Legendre basis: P2(x) = (3x² − 1)/2'() { near(basis(0.5, 2)[2], (3 * 0.25 - 1) / 2, 1e-12, 'P2'); },
  'training error never rises with degree; test error is U-shaped'() { const tr = [1, 3, 6, 12].map((d) => mse(fit(P, d), P)); for (let i = 1; i < tr.length; i++) ok(tr[i] <= tr[i - 1] + 1e-9, 'train'); const te = [1, 4, 15].map((d) => mse(fit(P, d), TEST)); ok(te[1] < te[0] && te[1] < te[2], `test ${te}`); },
  'bias falls and variance rises with degree'() { const a = biasVariance(1, { runs: 20 }), m = biasVariance(5, { runs: 20 }), b = biasVariance(12, { runs: 20 }); ok(a.bias2 > m.bias2, 'bias'); ok(b.variance > m.variance && m.variance > a.variance, 'variance'); },
  'ridge shrinks the coefficients'() { const n0 = Math.hypot(...fit(P, 12, 0)), n1 = Math.hypot(...fit(P, 12, 1)); ok(n1 < n0, `${n0} ${n1}`); },
  'gradient descent from zero lowers training error'() { const S = gdPath(P, 12, { steps: 800 }); ok(mse(S.at(-1), P) < mse(S[0], P), 'falls'); },
  'cross-validation picks a moderate degree'() { const e = Array.from({ length: 13 }, (_, d) => cvError(P, d)), best = e.indexOf(Math.min(...e)); ok(best >= 3 && best <= 9, `best ${best}`); },
  'all-negative classifier: high accuracy, zero recall'() { const c = confusion(1e9); near(c.acc, 0.92, 1e-6, 'acc'); near(c.rec, 0, 1e-9, 'recall'); },
};
