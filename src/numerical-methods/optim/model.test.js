import { PHI, F1, golden, quadratic, rosenbrock, descend } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'golden section: the bracket shrinks by 0.618 each step and closes on the minimum'() {
    for (const [k, F] of Object.entries(F1)) { const S = golden(F.f, 0, 3, 40); near((S[11].b - S[11].a) / (S[10].b - S[10].a), PHI, 1e-9, `${k} ratio`); near((S[40].a + S[40].b) / 2, F.min, 1e-6, `${k} min`); }
    near(PHI * PHI + PHI, 1, 1e-15, 'φ² + φ = 1: one point is reused');
  },
  'steepest descent with exact steps on a quadratic: f falls by at least ((κ − 1)/(κ + 1))² per step'() {
    for (const kappa of [4, 25]) { const F = quadratic(kappa), X = descend(F, [2.5, 1], 20, 'line'), q = ((kappa - 1) / (kappa + 1)) ** 2;
      for (let k = 0; k < 20; k++) ok(F.f(X[k + 1]) <= q * F.f(X[k]) * (1 + 1e-9), `κ ${kappa} step ${k}`); }
  },
  "Newton: one step on a quadratic; converges on Rosenbrock; a fixed step too large diverges"() {
    const F = quadratic(50), X = descend(F, [2, -1.5], 1, 'newton'); ok(Math.hypot(...X[1]) < 1e-12, 'one step');
    const R = descend(rosenbrock, [-1.2, 1], 30, 'newton').at(-1); near(R[0], 1, 1e-8, 'x'); near(R[1], 1, 1e-8, 'y');
    const G = descend(quadratic(10), [2, 1], 50, 'gd', 0.25); ok(G.length < 51 || Math.hypot(...G.at(-1)) > 10, 'η > 2/λmax diverges');
  },
};
