import { simulate, G } from './model.js';
import { near, ok } from '../../lib/testing.js';

const base = { m: 1, L: 0.5, b: 0.02, th0: 0.17, Kp: 20, Ki: 0, Kd: 2, tmax: 30, aw: false, noise: 0, push: 0, load: 0 };
const last = (r) => r.th[r.th.length - 1];

export const tests = {
  'P must beat gravity: Kp < mgL falls, Kp > mgL holds'() {
    ok(simulate({ ...base, Kp: 0.6 * G * 0.5 }).fell != null, 'falls');
    ok(simulate(base).fell == null && Math.abs(last(simulate(base))) < 1e-4, 'holds');
  },
  'PD under a load leaves a tilt τ/(Kp − mgL); PID removes it'() {
    const load = 1, pd = simulate({ ...base, load }, 12); // at rest: Kp θ = mgL sin θ + load
    const th = last(pd); near(base.Kp * th - G * 0.5 * Math.sin(th), load, 1e-3, 'torque balance');
    ok(th > 0.05, 'visible tilt'); ok(Math.abs(last(simulate({ ...base, load, Ki: 40 }, 12))) < 1e-3, 'integral action → 0');
  },
  'windup: the saturated integrator makes it fall; anti-windup saves it'() {
    const s = { ...base, th0: 30 * Math.PI / 180, tmax: 6, Ki: 80 };
    ok(simulate(s).fell != null, 'falls with windup'); ok(simulate({ ...s, aw: true }).fell == null, 'recovers with anti-windup');
  },
};
