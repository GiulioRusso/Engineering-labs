import { lineData, lsq, sse, r2, gd, logData, logLoss, newton } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'least squares: the gradient of the squared error is zero there, and any nudge makes it worse'() {
    const P = lineData(), { m, c } = lsq(P), h = 1e-5;
    near((sse(P, m + h, c) - sse(P, m - h, c)) / (2 * h) + 1, 1, 1e-6, '∂/∂m'); near((sse(P, m, c + h) - sse(P, m, c - h)) / (2 * h) + 1, 1, 1e-6, '∂/∂c');
    ok([[0.05, 0], [0, 0.2], [-0.03, 0.1]].every(([dm, dc]) => sse(P, m + dm, c + dc) > sse(P, m, c)), 'minimum');
    const R = r2(P, m, c); ok(R > 0 && R < 1, `R² ${R}`); near(r2(P, 0, P.reduce((s, p) => s + p[1], 0) / P.length) + 1, 1, 1e-12, 'the mean line: R² = 0');
  },
  'gradient descent reaches the least-squares line; feature scaling gets there far sooner'() {
    const P = lineData(), L = lsq(P), raw = gd(P, 0.01, 3000).at(-1), sc = gd(P, 0.3, 30, { scaled: true }).at(-1);
    near(raw[0], L.m, 1e-3, 'raw m'); near(sc[0], L.m, 1e-3, 'scaled m after 30 steps'); near(sc[1], L.c, 1e-3, 'scaled c');
    ok(Math.abs(gd(P, 0.035, 60).at(-1)[0]) > 100, 'too large a step on the raw feature diverges');
  },
  'logistic regression: Newton finds the zero-gradient point; separable data has no finite optimum'() {
    const P = logData(), { w, b } = newton(P), h = 1e-6;
    ok(Math.abs((logLoss(P, w + h, b) - logLoss(P, w - h, b)) / (2 * h)) < 1e-7, 'stationary');
    ok(Math.abs(-b / w - 5) < 1, `boundary at ${-b / w}`);
    const S = logData({ separable: true }); ok(logLoss(S, 20, -100) < logLoss(S, 5, -25) && logLoss(S, 5, -25) < logLoss(S, 1, -5), 'steeper is always better');
  },
};
