import { s2z, poles2, stepCont, stepSampled, pdLoop, overshoot } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'z = e^{sT}: left half-plane inside the unit circle, the jω axis on it, the right half-plane outside'() {
    for (const T of [0.1, 0.5]) { ok(Math.hypot(...s2z([-1, 3], T)) < 1, 'stable'); near(Math.hypot(...s2z([0, 3], T)), 1, 1e-12, 'axis'); ok(Math.hypot(...s2z([0.2, 1], T)) > 1, 'unstable'); }
    const z = s2z(poles2(2, 0.3)[0], 0.2); near(Math.atan2(z[1], z[0]), 2 * Math.sqrt(1 - 0.09) * 0.2, 1e-12, 'angle = ωd T');
  },
  'zero-order-hold sampling of a step response is exact at the samples'() {
    const c = stepCont(2, 0.3, 6, 0.001), s = stepSampled(2, 0.3, 0.5, 6);
    s.t.forEach((tk, n) => near(s.y[n], c.y[Math.round(tk / 0.001)], n ? 1e-6 : 1e-12, `sample ${n}`));
  },
  'a digital PD loop approaches the continuous one as T → 0 and loses stability when T is too long'() {
    const C = overshoot(pdLoop(4, 1, 0).y), a = overshoot(pdLoop(4, 1, 0.01).y), b = overshoot(pdLoop(4, 1, 0.2).y);
    ok(Math.abs(a - C) < 0.02, `fast sampling ${a} vs ${C}`); ok(b > a + 0.05, 'slow sampling overshoots more');
    const R = pdLoop(4, 1, 0.8); ok(Math.max(...R.y.slice(-2000).map(Math.abs)) > 2, 'T = 0.8 s: unstable');
  },
};
