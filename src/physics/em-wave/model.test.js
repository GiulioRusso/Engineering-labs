import { fields, fresnel, C0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'travelling wave: E/B = c, and E, B in phase'() {
    const [E, B] = fields({ mode: 'travel', E0: 3, f: 1e9 }, 0.07, 1.3e-10);
    near(Math.abs(E / B), C0, 1e-12, 'E/B');
  },
  'Fresnel at normal incidence: R + T = 1'() {
    for (const n2 of [1.5, 2.4, 4]) { const F = fresnel(1, n2); near(F.R + F.T, 1, 1e-12, `n2=${n2}`); }
    near(fresnel(1, 1.5).R, 0.04, 1e-12, 'glass reflects 4 %');
  },
  'E is continuous at the interface (tangential field)'() {
    const p = { mode: 'interface', E0: 1, f: 1e9, n2: 1.7 };
    for (const t of [0, 2e-10, 7e-10]) near(fields(p, -1e-12, t)[0] + 3, fields(p, 1e-12, t)[0] + 3, 1e-9, `t=${t}`);
  },
  'standing wave at a conductor: E = 0 on the mirror and every λ/2 in front'() {
    const f = 1e9, lam = C0 / f, p = { mode: 'conductor', E0: 1, f, n2: 1 };
    for (const n of [0, 1, 2]) for (const t of [1e-10, 3.3e-10]) ok(Math.abs(fields(p, -n * lam / 2, t)[0]) < 1e-9, `node at ${n}·λ/2`);
    near(Math.abs(fields(p, -lam / 4, 1 / (4 * f))[0]), 2, 1e-12, 'antinode at λ/4 reaches 2E0 a quarter period in');
  },
};
