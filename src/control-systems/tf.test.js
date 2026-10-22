import { roots, fromRoots, polymul, step, stepInfo, closedLoop, bode, margins, evalTF, simulate, errorTF } from './tf.js';
import { near, ok } from '../lib/testing.js';

export const tests = {
  'roots of (s+1)(s+2)(s²+2s+5)'() {
    const r = roots(polymul([1, 3, 2], [1, 2, 5]));
    near(r[0][0], -2, 1e-10, 'real −2'); near(r[1][0], -1, 1e-10, 'pair re'); near(Math.abs(r[1][1]), 2, 1e-10, 'pair im'); near(r[3][0], -1, 1e-10, 'real −1');
    const p = fromRoots([[-1, 2], [-1, -2]]); near(p[1], 2, 1e-12, 'fromRoots'); near(p[2], 5, 1e-12, 'fromRoots');
  },
  'first order: y(τ) = 1 − 1/e'() {
    const r = step({ num: [1], den: [0.5, 1] }, 3, 1e-3);
    near(r.y[500], 1 - Math.exp(-1), 1e-9, 'y(τ)');
  },
  'second order: overshoot = exp(−πζ/√(1−ζ²))'() {
    const z = 0.3, wn = 2, info = stepInfo(step({ num: [wn * wn], den: [1, 2 * z * wn, wn * wn] }, 20, 1e-3), 1);
    near(info.overshoot, 100 * Math.exp(-Math.PI * z / Math.sqrt(1 - z * z)), 1e-4, 'overshoot');
  },
  'type 1 loop: zero step error, ramp error 1/Kv'() {
    const L = { num: [2], den: [1, 1, 0] }, E = errorTF(L);
    const es = simulate(E, () => 1, 40).y, er = simulate(E, (t) => t, 40).y;
    ok(Math.abs(es[es.length - 1]) < 1e-6, 'step error → 0'); near(er[er.length - 1], 1 / 2, 1e-4, 'ramp error = 1/Kv');
  },
  'margins of K/(s(s+1)(s+2)): phase crossover at √2, GM = 6/K'() {
    const K = 2, L = { num: [K], den: polymul([1, 0], polymul([1, 1], [1, 2])) }, m = margins(L);
    near(m.wpc, Math.SQRT2, 1e-4, 'ω_pc'); near(m.gm, 20 * Math.log10(6 / K), 1e-3, 'GM dB');
    const g = evalTF(L, [0, m.wgc]); near(Math.hypot(...g), 1, 1e-3, '|L| = 1 at ω_gc');
    near(m.pm, 180 + Math.atan2(g[1], g[0]) * 180 / Math.PI - 360 * (Math.atan2(g[1], g[0]) > 0), 1e-2, 'PM');
  },
  'Bode of a pole: −3 dB and −45° at the corner'() {
    const B = bode({ num: [1], den: [1, 1] }, 1, 1, 2);
    near(B.mag[0], -10 * Math.log10(2), 1e-12, 'dB'); near(B.ph[0], -45, 1e-12, 'phase');
    ok(Math.abs(stepInfo(step(closedLoop({ num: [1], den: [1, 1] }), 10)).final - 0.5) < 1e-3, 'closed loop DC gain K/(1+K)');
  },
};
