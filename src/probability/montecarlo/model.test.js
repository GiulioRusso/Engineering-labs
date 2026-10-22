import { CURVES, hitMiss, meanEstimate, spread, buffon, importance, peakExact } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'hit-or-miss estimates π/4'() { near(hitMiss(CURVES.circle.f, 20000).est.at(-1), Math.PI / 4, 0.02, 'π/4'); },
  'sample mean estimates ∫ e^(−x²)'() { near(meanEstimate(CURVES.bell.f, 20000, 1), CURVES.bell.exact, 0.01, 'bell'); },
  'error falls as 1/√N: 100× the points, 10× smaller spread'() { const a = spread(CURVES.bell.f, 100).sd, b = spread(CURVES.bell.f, 10000, 100).sd; near(a / b, 10, 0.3, 'ratio'); },
  'Buffon’s needle estimates π'() { near(buffon(20000).at(-1).est, Math.PI, 0.06, 'π'); },
  'importance sampling: same answer, much smaller spread'() { const R = importance(200, 0.8, 0.05), mu = R.I.reduce((a, b) => a + b) / R.I.length; near(mu, peakExact(), 0.03, 'unbiased'); ok(R.sdI < R.sdU / 3, `${R.sdI} ${R.sdU}`); },
};
