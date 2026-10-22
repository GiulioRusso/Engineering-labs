import { lineData, fitLine, gradMSE, gradCE, trainZ, softmax, MARGIN } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'an outlier drags the squared fit far more than the absolute one'() { const P = lineData(8), m = fitLine(P, 'mse'), a = fitLine(P, 'mae'), c = fitLine(lineData(0), 'mse'); ok(Math.abs(m[0] - c[0]) > 2 * Math.abs(a[0] - c[0]), `${m[0]} ${a[0]} ${c[0]}`); },
  'confidently wrong: squared error gradient vanishes, cross-entropy does not'() { ok(Math.abs(gradMSE(-8)) < 1e-3, 'mse tiny'); near(gradCE(-8), -1, 1e-3, 'ce ≈ −1'); const a = trainZ(gradMSE).at(-1), b = trainZ(gradCE).at(-1); ok(b > 0 && a < -3, `${a} ${b}`); },
  'softmax sums to 1; low temperature → one-hot'() { const p = softmax([1, 2, 3]); near(p.reduce((a, b) => a + b), 1, 1e-12, 'sum'); ok(softmax([1, 2, 3], 0.05)[2] > 0.99, 'cold'); },
  'logistic loss upper-bounds 0–1 (base 2)'() { for (const m of [-2, -0.5, 0, 0.5, 2]) ok(MARGIN.logistic.f(m) >= MARGIN.zeroone.f(m) - 1e-12, `m=${m}`); },
};
