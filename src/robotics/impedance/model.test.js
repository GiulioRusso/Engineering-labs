import { simulate, steadyForce, WALL, START } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'in contact the force settles at k K_P Δ / (K_P + k): compliant or stiff'() {
    for (const [Kp, Kd] of [[100, 20], [400, 40], [5000, 150]]) { const o = simulate({ Kp, Kd, T: 6 }).at(-1); near(o.f, steadyForce(Kp, 2000, 0.05), 2e-3, `K_P ${Kp}`); }
  },
  'free space: the tip follows the desired point exactly (the impedance is never excited)'() {
    const o = simulate({ wall: false, T: 3 }); ok(Math.max(...o.map((s) => Math.hypot(s.x[0] - s.xd[0], s.x[1] - s.xd[1]))) < 1e-6, 'tracks'); near(o.at(-1).x[0], START[0] + 0.05, 1e-6, 'arrives');
  },
  'the target behaviour: a step of force gives the mass–spring–damper response'() {
    const o = simulate({ Md: 1, Kd: 40, Kp: 400, T: 6 }); ok(o.every((s) => s.x[0] >= WALL - 1e-9), 'stays on the wall side it pushes'); ok(Math.max(...o.map((s) => s.f)) < 1.1 * steadyForce(400, 2000, 0.05), 'little overshoot');
  },
};
