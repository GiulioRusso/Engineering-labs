import { gamma, boost, interval, addVelocities, movingTick, twins } from './model.js';
import { rng } from '../../lib/random.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'the interval t² − x² is the same in every frame'() {
    const r = rng(3);
    for (let i = 0; i < 200; i++) {
      const e = { t: 10 * r() - 5, x: 10 * r() - 5 }, b = 1.98 * r() - 0.99;
      near(interval(boost(e, b)) + 100, interval(e) + 100, 1e-12, 'interval');
    }
  },
  'two boosts make one boost at the relativistic sum of the speeds, always below c'() {
    const e = { t: 2, x: 0.7 };
    for (const [u, v] of [[0.5, 0.5], [0.9, 0.9], [0.99, -0.3]]) {
      const two = boost(boost(e, u), v), one = boost(e, addVelocities(u, v));
      near(two.t, one.t, 1e-12, 't'); near(two.x, one.x, 1e-12, 'x');
      ok(Math.abs(addVelocities(u, v)) < 1, 'below c');
    }
    near(addVelocities(0.5, 0.5), 0.8, 1e-15, '0.5 + 0.5 = 0.8');
  },
  'light clock: the geometry of the diagonal path gives the tick γ times longer'() {
    for (const b of [0.1, 0.6, 0.99]) near(movingTick(1, b), 2 * gamma(b), 1e-12, `β = ${b}`);
  },
  'twins at 0.8 c to a star 8 light-years away: 20 years on Earth, 12 for the traveller'() {
    const T = twins(8, 0.8); near(T.earth, 20, 1e-12, 'earth'); near(T.traveller, 12, 1e-12, 'traveller');
  },
  'simultaneity: two events at the same lab time are not simultaneous for a moving observer'() {
    const A = boost({ t: 1, x: -1 }, 0.6), B = boost({ t: 1, x: 1 }, 0.6);
    near(A.t, gamma(0.6) * 1.6, 1e-12, "t'_A"); near(B.t, gamma(0.6) * 0.4, 1e-12, "t'_B"); ok(B.t < A.t, 'B first');
  },
};
