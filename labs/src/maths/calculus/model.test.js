import { FUNCS, f, df, integral, riemann, taylor } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'exact derivatives agree with central differences (error O(h²))'() {
    for (const k of Object.keys(FUNCS)) for (const x of [-1.3, 0.2, 2.1]) {
      const h = 1e-4;
      near(df(k, x), (f(k, x + h) - f(k, x - h)) / (2 * h), 1e-6, `${k} at ${x}`);
      near(FUNCS[k].d(2, x) + 10, (df(k, x + h) - df(k, x - h)) / (2 * h) + 10, 1e-7, `${k}'' at ${x}`);
    }
  },
  'midpoint rule: doubling n divides the error by about 4'() {
    const exact = integral('gauss', -1, 2), e1 = Math.abs(riemann('gauss', -1, 2, 20, 'mid') - exact), e2 = Math.abs(riemann('gauss', -1, 2, 40, 'mid') - exact);
    ok(e1 / e2 > 3.8 && e1 / e2 < 4.2, `ratio ${e1 / e2}`);
    near(integral('sin', 0, Math.PI), 2, 1e-12, '∫ sin over [0, π]');
    return `ratio ${(e1 / e2).toFixed(3)}`;
  },
  'Taylor polynomial matches f at x0 and its error shrinks like |x − x0|^(N+1)'() {
    for (const k of Object.keys(FUNCS)) {
      const T = taylor(k, 0.5, 4);
      near(T(0.5), f(k, 0.5), 1e-14, `${k} at x0`);
      const e1 = Math.abs(T(0.5 + 0.1) - f(k, 0.6)), e2 = Math.abs(T(0.5 + 0.05) - f(k, 0.55));
      if (e1 > 1e-12) ok(e1 / e2 > 20, `${k}: error ratio ${e1 / e2} (expect ≈ 32)`);
    }
  },
};
