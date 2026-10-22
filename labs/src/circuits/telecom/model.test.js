import { butterworth, ladderG, ladder, lMatch, matchedPower, mismatchPower, envelope, mixLines } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Butterworth: −3.01 dB at fc for every order, 20n dB/decade'() { for (const n of [1, 3, 5]) near(20 * Math.log10(butterworth(1, 1, n)), -3.0103, 1e-4, `n=${n}`); near(20 * Math.log10(butterworth(10, 1, 3)), -60, 1e-3, 'decade'); },
  'ladder prototype n = 3 is 1, 2, 1'() { const g = ladderG(3); near(g[0], 1, 1e-12, 'g1'); near(g[1], 2, 1e-12, 'g2'); near(g[2], 1, 1e-12, 'g3'); ok(ladder(3, 50, 1e6)[1].kind === 'L', 'series L in the middle'); },
  'L-match: 50 → 200 Ω has Q = √3 and delivers all the power at f0'() { const m = lMatch(50, 200, 10e6); near(m.Q, Math.sqrt(3), 1e-12, 'Q'); near(matchedPower(50, 200, 10e6, 10e6), 1, 1e-9, 'f0'); ok(matchedPower(50, 200, 10e6, 20e6) < 0.95, 'off f0'); near(mismatchPower(50, 200), 0.64, 1e-12, 'direct'); },
  'envelope detector follows 1 + m cos'() { const e = envelope({}), i = e.t.findIndex((t) => t > 2); ok(Math.abs(e.y[i] - (1 + 0.6 * Math.cos(2 * Math.PI * e.t[i]))) < 0.25, 'tracks'); },
  'mixer: sum and difference only'() { const L = mixLines(10, 9); near(L[0].f, 1, 0, 'diff'); near(L[1].f, 19, 0, 'sum'); },
};
