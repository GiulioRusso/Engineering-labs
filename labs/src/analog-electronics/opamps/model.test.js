import { idealGain, finiteGain, speed, dcError, loop, stepResponse, sallenKey } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'ideal gains: −R2/R1, 1 + R2/R1, 1'() { near(idealGain('inv', 1e3, 10e3), -10, 1e-12, 'inv'); near(idealGain('non', 1e3, 10e3), 11, 1e-12, 'non'); },
  'finite gain error = 1/(1 + Aβ): −1.088% for G = 11, A = 10³'() { const b = 1 / 11; near((finiteGain(1e3, b) - 11) / 11 * 100, -1.088, 1e-3, 'err'); },
  'bandwidth f3 = GBW/G; slew limits big fast signals'() { const s = speed({ G: 10, Vp: 0.01, f: 1e3, cycles: 4 }); near(s.f3, 1e5, 1e-12, 'f3'); const late = s.y.slice(-1500); ok(Math.max(...late) > 0.095, 'small slow passes'); const b = speed({ G: 10, Vp: 1, f: 50e3, SR: 0.5e6, cycles: 4 }); ok(Math.max(...b.y.slice(-1500)) < 5, 'slew-limited'); },
  'DC error: offset × noise gain; compensation helps bias current'() { const a = dcError({}); near(a.eV, 0.202, 1e-9, 'Vos'); near(a.eI, 0.01, 1e-9, 'Ib'); ok(dcError({ comp: true }).eI < a.eI, 'comp'); },
  'phase margin: follower with second pole at 2× GBW ≈ 63°'() { const l = loop({ f2: 2e6 }); ok(l.pm > 55 && l.pm < 70, `${l.pm}`); ok(loop({ f2: 0.3e6 }).pm < 35, 'low margin'); },
  'step response: low phase margin rings'() { const a = stepResponse({ f2: 0.2e6, T: 20e-6 }), b = stepResponse({ f2: 5e6, T: 20e-6 }); ok(Math.max(...a.y) > 1.3, 'overshoot'); ok(Math.max(...b.y) < 1.1, 'no ringing'); },
  'Sallen-Key: Q = 1/(3 − K), Butterworth at K = 1.586'() { const s = sallenKey({}); near(s.Q, 0.707, 2e-3, 'Q'); near(s.H(s.f0) / s.H(1), 0.707, 3e-3, '−3 dB at f0'); },
};
