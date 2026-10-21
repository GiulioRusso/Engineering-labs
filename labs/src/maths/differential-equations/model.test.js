import { KINDS, euler, rk4 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'RK4 matches the closed-form solutions'() {
    for (const [kind, s] of [['growth', { k: 0.7, x0: -2, y0: 0.5 }], ['logistic', { r: 1.3, K: 2, x0: -3, y0: 0.1 }], ['forced', { x0: -3, y0: 2 }]]) {
      const K = KINDS[kind], p = rk4(K.F(s), [s.x0, s.y0], 0.01, 500), [x, y] = p[p.length - 1];
      near(y, K.exact(s)(x), 1e-8, kind);
    }
  },
  'Euler is first order: halving h halves the error'() {
    const s = { k: 1, x0: 0, y0: 1 }, F = KINDS.growth.F(s), err = (h) => { const p = euler(F, [0, 1], h, Math.round(2 / h)); return Math.abs(p[p.length - 1][1] - Math.exp(2)); };
    near(err(0.01) / err(0.005), 2, 0.01, 'error ratio');
  },
  'Euler on y′ = −3y is unstable for h > 2/3'() {
    const F = KINDS.growth.F({ k: -3 }), p = euler(F, [0, 1], 0.8, 30);
    ok(Math.abs(p[p.length - 1][1]) > 1, 'the numerical solution blows up although the true one decays');
  },
  'oscillator: RK4 keeps the energy, Euler gains it by (1 + h²) per step'() {
    const F = KINDS.oscillator.F({ gamma: 0 }), E = ([x, v]) => x * x + v * v;
    const r = rk4(F, [1, 0], 0.01, 2000), e = euler(F, [1, 0], 0.1, 50);
    near(E(r[r.length - 1]), 1, 1e-8, 'RK4'); near(E(e[e.length - 1]), 1.01 ** 50, 1e-9, 'Euler');
  },
};
