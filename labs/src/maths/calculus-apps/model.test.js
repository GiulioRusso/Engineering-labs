import { LIMITS, SKETCH, d1, d2, zeros, newton, simpson, volume } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'limits approach their values'() { near(LIMITS.removable.f(1 + 1e-7), 2, 1e-6, 'removable'); near(LIMITS.sinc.f(1e-5), 1, 1e-9, 'sinc'); },
  'x³ − 3x: extrema at ±1, inflection at 0'() { const f = SKETCH.cubic.f; const z = zeros((x) => d1(f, x), -3, 3); ok(z.length === 2 && Math.abs(z[0] + 1) < 1e-4 && Math.abs(z[1] - 1) < 1e-4, `${z}`); ok(d2(f, 1) > 0 && d2(f, -1) < 0, 'min at 1, max at −1'); },
  'Newton finds √2 in a few steps'() { const xs = newton((x) => x * x - 2, 1, 5); near(xs[5], Math.SQRT2, 1e-12, 'root'); ok(Math.abs(xs[3] - Math.SQRT2) < 1e-5, 'quadratic convergence'); },
  'area between x and x² is 1/6; cone volume πr²h/3'() { near(simpson((x) => x - x * x, 0, 1), 1 / 6, 1e-12, 'area'); near(volume((x) => x, 0, 2), Math.PI * 4 * 2 / 3, 1e-9, 'cone'); near(volume(() => 1, 0, 3), 3 * Math.PI, 1e-9, 'cylinder'); },
};
