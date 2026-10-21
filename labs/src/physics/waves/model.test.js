import { travelling, mode, emissionTime, dopplerAhead, dopplerBehind } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'two opposite waves add up to a standing wave 2A·sin(kx)·cos(ωt)'() {
    const A = 0.3, lam = 2, v = 3, k = Math.PI, w = v * k;
    const r = travelling({ A, lam, v, dir: 1, phase: 0 }), l = travelling({ A, lam, v, dir: -1, phase: 0 });
    for (const [x, t] of [[0.3, 0.1], [1.7, 0.9], [0.5, 2.2]]) near(r(x, t) + l(x, t), 2 * A * Math.sin(k * x) * Math.cos(w * t), 1e-12, `x=${x}`);
  },
  'string modes: f_n = n·v/2L and nodes at both ends'() {
    const m = mode(3, 2, 10, 1); near(m.f, 7.5, 1e-15, 'f₃');
    ok(Math.abs(m.y(0, 0.3)) < 1e-12 && Math.abs(m.y(2, 0.3)) < 1e-12, 'fixed ends');
  },
  'Doppler: counted wavefronts give f·c/(c ∓ v)'() {
    const P = { x0: 0, vs: 100, c: 340 }, f = 50;
    for (const [px, want] of [[5000, dopplerAhead(f, 340, 100)], [-5000, dopplerBehind(f, 340, 100)]]) {
      const t1 = 5, t2 = 6, n = (emissionTime(t2, px, 0, P) - emissionTime(t1, px, 0, P)) * f; // cycles received in 1 s
      near(n, want, 1e-6, `observer at ${px}`);
    }
  },
};
