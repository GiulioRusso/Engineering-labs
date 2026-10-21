import { TYPES, PLANTS, INPUT, ssError } from './model.js';
import { polyscale, errorTF, simulate, roots, polyadd } from '../tf.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'steady-state error: formula vs simulation for every finite case'() {
    for (const type of [0, 1, 2]) for (const input of ['step', 'ramp', 'parabola']) {
      const want = ssError(type, input, 5); if (!Number.isFinite(want)) continue;
      const G = TYPES[type], e = simulate(errorTF({ num: polyscale(G.num, 5), den: G.den }), INPUT[input], 60, 5e-3).y;
      ok(Math.abs(e[e.length - 1] - want) < 1e-3, `type ${type}, ${input}: ${e[e.length - 1]} vs ${want}`);
    }
  },
  'root locus of 1/(s(s+1)(s+3)) crosses the jω axis at K = 12, ω = √3'() {
    const G = PLANTS.p3, r = roots(polyadd(G.den, polyscale(G.num, 12))), pair = r.find((p) => p[1] > 0);
    ok(Math.abs(pair[0]) < 1e-8, 'real part 0'); near(pair[1], Math.sqrt(3), 1e-8, 'ω');
  },
};
