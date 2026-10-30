import { track, simulate, detachHeight, rampAccel, G } from './model.js';
import { near, ok } from '../../lib/testing.js';

const deg = Math.PI / 180;
const total = (r, i) => r.K[i] + r.U[i] + r.Q[i];

export const tests = {
  'frictionless: kinetic + potential stays constant; speed at the bottom √(2gh)'() {
    const T = track({ kind: 'valley', h: 2, ang: 30 * deg }), r = simulate(T, { tMax: 10 });
    for (let i = 0; i < r.t.length; i++) near(total(r, i), total(r, 0), 1e-6, `t = ${r.t[i]}`);
    near(Math.max(...r.v), Math.sqrt(2 * G * 2), 1e-4, 'fastest = √(2gh)');
  },
  'friction: kinetic + potential + heat stays constant, and the bead ends at rest'() {
    const T = track({ kind: 'valley', h: 2, ang: 30 * deg }), r = simulate(T, { mu: 0.1, tMax: 40 });
    for (let i = 0; i < r.t.length; i++) near(total(r, i), total(r, 0), 1e-4, `t = ${r.t[i]}`);
    ok(r.phase.at(-1) === 'stuck' && r.v.at(-1) === 0, `ends ${r.phase.at(-1)}`);
  },
  'on the straight ramp: s = ½ g (sin θ − μ cos θ) t²'() {
    const T = track({ kind: 'ramp', h: 4, ang: 40 * deg }), r = simulate(T, { mu: 0.2, tMax: 0.6, every: 1 });
    const i = r.t.length - 1, s = Math.hypot(r.x[i] - r.x[0], r.y[i] - r.y[0]);
    near(s, 0.5 * rampAccel(40 * deg, 0.2) * r.t[i] ** 2, 1e-6, 'distance');
  },
  'loop: from h = 2.55R it goes round; from 2.4R it leaves the track at R(1 − cos φ), cos φ = (2 − 2h/R)/3'() {
    const ok1 = simulate(track({ kind: 'loop', h: 2.55, ang: 40 * deg, R: 1 }), { tMax: 6 });
    ok(!ok1.phase.includes('air'), 'h = 2.55R stays on');
    ok(Math.min(...ok1.N.filter((n, i) => ok1.phase[i] === 'track')) > 0, 'normal force stays positive');
    const T = track({ kind: 'loop', h: 2.4, ang: 40 * deg, R: 1 }), r = simulate(T, { tMax: 6, every: 1 }), i = r.phase.indexOf('air');
    ok(i > 0, 'h = 2.4R leaves the track');
    near(r.y[i] - Math.min(...T.y), detachHeight(2.4, 1), 2e-3, 'detach height');
  },
  'a gentle slope with friction holds the bead: tan θ ≤ μ'() {
    const r = simulate(track({ kind: 'ramp', h: 1, ang: 10 * deg }), { mu: 0.2 });
    ok(r.phase[0] === 'stuck' && r.t.length === 1, 'never moves');
  },
};
