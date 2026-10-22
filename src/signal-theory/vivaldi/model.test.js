import { halfWidth, envelope, patternE, patternH, hpbw, gainDb, s11 } from './model.js';
import { near, ok } from '../../lib/testing.js';

const P = { L: 4, Wa: 1.5, Wt: 0.05, R: 0.5 };
export const tests = {
  'taper runs from the throat to the aperture'() { near(2 * halfWidth(0, P), 0.05, 1e-12, 'throat'); near(2 * halfWidth(4, P), 1.5, 1e-12, 'aperture'); const e = envelope(P); ok(e.env[e.env.length - 1] < e.env[0], 'leaks'); },
  'endfire: maximum at θ = 0; higher frequency → narrower beam, more gain'() { near(patternE(0, P), 1, 1e-9, 'E peak'); near(patternH(0, P), 1, 1e-9, 'H peak'); ok(hpbw((t) => patternE(t, P, 2)) < hpbw((t) => patternE(t, P, 1)), 'narrower'); ok(gainDb(P, 2) > gainDb(P, 1), 'more gain'); },
  'match: good across a wide band, poor where the opening is too small'() { ok(s11(P, 1) < -10, `f0: ${s11(P, 1)}`); ok(s11(P, 2.5) < -10, 'high'); ok(s11(P, 0.2) > -3, 'too low'); },
};
