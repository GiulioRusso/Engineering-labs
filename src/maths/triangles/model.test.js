import { solve, lissajous, POLAR } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  '3-4-5 triangle: right angle, area 6'() { const s = solve([0, 0], [4, 0], [0, 3]); near(s.A, Math.PI / 2, 1e-12, 'A = 90°'); near(s.area, 6, 1e-12, 'area'); near(s.a, 5, 1e-12, 'hypotenuse'); },
  'law of sines: a / sin A = 2R for every side'() { const s = solve([0, 0], [5, 1], [2, 4]); near(s.b / Math.sin(s.B), 2 * s.R, 1e-9, 'b'); near(s.c / Math.sin(s.C), 2 * s.R, 1e-9, 'c'); near(s.A + s.B + s.C, Math.PI, 1e-12, 'sum'); },
  'Lissajous 1:1 at 90° is a circle; rose with odd k has k petals'() { for (const t of [0.3, 1, 2]) { const [x, y] = lissajous(1, 1, 1, 1, Math.PI / 2, t); near(x * x + y * y, 1, 1e-12, `t${t}`); } ok(POLAR.rose.turns(3) === 1 && POLAR.rose.turns(2) === 2, 'turns'); },
};
