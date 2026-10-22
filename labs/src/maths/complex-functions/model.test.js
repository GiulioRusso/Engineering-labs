import { mul, div, cexp, FUNCS, eulerTerms, domainColor } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  "Euler: the series for e^{iπ} lands on −1"() { const { sum } = eulerTerms(Math.PI, 30); near(sum[0], -1, 1e-12, 're'); ok(Math.abs(sum[1]) < 1e-12, 'im'); const e = cexp([0, 1]); near(Math.hypot(...e), 1, 1e-12, '|e^{i}| = 1'); },
  'z³ − 1 has its roots at the cube roots of unity'() { for (const k of [0, 1, 2]) { const z = [Math.cos(2 * Math.PI * k / 3), Math.sin(2 * Math.PI * k / 3)], w = FUNCS.cube.f(z); ok(Math.hypot(...w) < 1e-12, `root ${k}`); } const q = div(mul([1, 2], [3, -1]), [3, -1]); near(q[0], 1, 1e-12, 'div'); },
  'domain colouring: positive reals are red'() { const o = domainColor([2, 0], [0, 0, 0]); ok(o[0] > o[1] && o[0] > o[2], `${o}`); },
};
