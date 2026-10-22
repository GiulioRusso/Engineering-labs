import { binomialPmf, galton, dicePmf, diceSums, normalPdf } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'binomial pmf sums to 1 with mean np'() {
    const P = binomialPmf(12, 0.3);
    near(P.reduce((a, b) => a + b, 0), 1, 1e-12, 'sum'); near(P.reduce((a, v, k) => a + k * v, 0), 3.6, 1e-12, 'mean');
  },
  'simulated Galton board: mean within 3 standard errors of np'() {
    const n = 10, p = 0.5, M = 4000, ks = galton(n, p, M).map((b) => b.reduce((a, c) => a + c, 0));
    const m = ks.reduce((a, b) => a + b, 0) / M;
    ok(Math.abs(m - n * p) < 3 * Math.sqrt(n * p * (1 - p) / M), `mean ${m}`);
  },
  'two dice: P(7) = 6/36; simulated frequency close'() {
    const d = dicePmf(2); near(d[5], 6 / 36, 1e-12, 'P(7)');
    const f = diceSums(2, 20000).filter((s) => s === 7).length / 20000;
    ok(Math.abs(f - 1 / 6) < 0.01, `freq ${f}`);
  },
  'central limit: ten dice are close to the normal curve'() {
    const k = 10, d = dicePmf(k), mu = 3.5 * k, sd = Math.sqrt(k * 35 / 12);
    let worst = 0; d.forEach((v, j) => { worst = Math.max(worst, Math.abs(v - normalPdf(k + j, mu, sd))); });
    ok(worst < 0.002, `max difference ${worst}`);
  },
};
