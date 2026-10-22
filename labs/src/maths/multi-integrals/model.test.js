import { SURFS, riemann2, OBJ, constrained, FIELDS, PATHS, work } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Riemann boxes converge to the exact volume'() { const S = SURFS.bowl, ex = S.exact(-1, 1, -1, 1); near(ex, 8 / 3, 1e-12, 'exact'); near(riemann2(S.f, -1, 1, -1, 1, 60).V, ex, 1e-3, 'n=60'); },
  'x + y on the unit circle: max √2 at 45° (∇f ∥ ∇g)'() { const c = constrained(OBJ.sum.f, 1); near(c.max[2], Math.SQRT2, 1e-5, 'max'); near(c.max[0], c.max[1], 1e-3, 'at 45°'); },
  'conservative field: path-independent work; vortex: circulation 2πr²'() { const F = FIELDS.grad.F, w1 = work(F, PATHS.straight.r).at(-1), w2 = work(F, PATHS.arc.r).at(-1); near(w1, 4 - 2, 1e-6, 'φ(B) − φ(A)'); ok(Math.abs(w1 - w2) < 1e-4, `${w1} vs ${w2}`); near(work(FIELDS.vortex.F, PATHS.circle.r).at(-1), 2 * Math.PI * 1.6 ** 2, 1e-4, 'circulation'); },
};
