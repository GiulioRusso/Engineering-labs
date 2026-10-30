import { simulate, pdOffset } from './model.js';
import { near, ok } from '../../lib/testing.js';

const D = Math.PI / 180, A = [-90 * D, 0], B = [30 * D, 60 * D];
export const tests = {
  'free arm: total energy conserved while K and U trade'() {
    const o = simulate({ mode: 'free', q0: [0, 0], T: 3 }); const E = o.map((s) => s.E); ok(Math.max(...E) - Math.min(...E) < 1e-6, 'E constant'); ok(Math.max(...o.map((s) => s.K)) > 10, 'it moves');
  },
  'PD + gravity compensation reaches the set point; without it the arm sags by Kp⁻¹g'() {
    const a = simulate({ mode: 'pd', q0: A, q1: B, T: 6 }).at(-1); ok(Math.hypot(...a.e) < 1e-3, `error ${Math.hypot(...a.e)}`);
    const b = simulate({ mode: 'pd', q0: A, q1: B, gcomp: false, T: 8 }).at(-1), off = pdOffset(B, 100); near(b.q[0], off[0], 1e-4, 'q1 sag'); near(b.q[1], off[1], 1e-4, 'q2 sag');
  },
  'computed torque: exact model tracks a fast move far better than PD; model error degrades it'() {
    const ct = simulate({ mode: 'ct', q0: A, q1: B }), ce = Math.max(...ct.map((s) => Math.hypot(...s.e)));
    const bad = simulate({ mode: 'ct', q0: A, q1: B, err: 0.3 }), be = Math.max(...bad.map((s) => Math.hypot(...s.e)));
    const pd = simulate({ mode: 'pdt', q0: A, q1: B }), pe = Math.max(...pd.map((s) => Math.hypot(...s.e))); ok(pe > 1000 * ce, `PD ${pe}`);
    ok(ce < 1e-6, `exact ${ce}`); ok(be > 100 * ce && be < 0.3, `with 30 % error ${be}`);
  },
};
