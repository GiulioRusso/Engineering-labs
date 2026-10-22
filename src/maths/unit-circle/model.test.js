import { trig, point, K } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'sin² + cos² = 1 and tan = sin / cos at many angles'() {
    for (let th = -7; th < 7; th += 0.37) {
      const { s, c, t } = trig(th);
      near(s * s + c * c, 1, 1e-14, `θ=${th}`);
      if (Math.abs(c) > 1e-3) near(t, s / c, 1e-12, 'tan');
    }
  },
  'angle sum: sin(a + b) = sin a cos b + cos a sin b'() {
    for (const [a, b] of [[0.3, 1.1], [2, -0.7], [4, 5]]) near(Math.sin(a + b), Math.sin(a) * Math.cos(b) + Math.cos(a) * Math.sin(b), 1e-12, `${a},${b}`);
  },
  'helix point projects to the circle and advances K per radian; quadrants'() {
    const p = point(1.2);
    near(Math.hypot(p[1], p[2]), 1, 1e-14, 'on the unit circle'); near(p[0], K * 1.2, 1e-14, 'pitch');
    ok(trig(0.1).quadrant === 1 && trig(2).quadrant === 2 && trig(3.5).quadrant === 3 && trig(5).quadrant === 4, 'quadrants');
  },
};
