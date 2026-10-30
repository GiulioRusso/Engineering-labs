import { SURFACES, run, grad } from './model.js';
import { near, ok } from '../../lib/testing.js';

const end = (S, k, o) => { const P = run(S, k, o).filter((p) => Number.isFinite(p[0])); return S.f(...P.at(-1)); };
export const tests = {
  'numerical gradient matches the analytic one'() { const S = SURFACES.rosen, a = S.g(0.3, 0.7), b = grad({ f: S.f }, 0.3, 0.7); near(a[0], b[0], 1e-5, 'gx'); near(a[1], b[1], 1e-5, 'gy'); },
  'ravine: momentum beats plain gradient descent at the same step size'() { const S = SURFACES.ravine; ok(end(S, 'momentum', { lr: 0.03, n: 80 }) < end(S, 'gd', { lr: 0.03, n: 80 }), 'momentum'); },
  'ravine: too large a step diverges for GD'() { const P = run(SURFACES.ravine, 'gd', { lr: 0.2, n: 100 }); ok(!Number.isFinite(P.at(-1)[0]), 'blows up'); },
  'saddle: Adam escapes faster than GD'() { const S = SURFACES.saddle; ok(end(S, 'adam', { lr: 0.05, n: 40 }) < end(S, 'gd', { lr: 0.05, n: 40 }), 'adam escapes'); },
};
