import { points, sse, descent, linfit } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'least squares: the fit has the least SSE, its residuals sum to 0, and descent reaches it'() {
    for (const k of ['clean', 'outlier', 'curve']) {
      const P = points(k), F = linfit(P.x, P.y), e = sse(P, F.a, F.b);
      for (const [da, db] of [[0.1, 0], [0, 0.02], [-0.1, -0.01]]) ok(sse(P, F.a + da, F.b + db) > e, `${k} minimum`);
      ok(Math.abs(F.res.reduce((s, r) => s + r, 0)) < 1e-9, `${k} residual sum`);
      const [a, b] = descent(P, 9, -0.5).at(-1); near(a, F.a, 0.01, `${k} a`); near(b, F.b, 0.002, `${k} b`);
    }
  },
};
