import { PULSES, pair, rmsWidths, energyWithin } from './model.js';
import { near, ok } from '../../lib/testing.js';

const P = { A: 1, tau: 1, sigma: 0.5, W: 1, lam: 1, f0: 1, f1: 5, t0: 0 };
export const tests = {
  'numerical transform matches the closed forms'() {
    for (const k of ['rect', 'tri', 'gauss', 'exp']) {
      const S = pair(k, P); for (const f of [0, 0.3, 1.7]) { const i = S.f.findIndex((v) => Math.abs(v - f) < 1e-9 || v > f); near(S.mag[i], PULSES[k].X(S.f[i], P), 0.03, `${k} at ${f}`); }
    }
  },
  'a time shift changes the phase only, not |X|'() {
    const a = pair('rect', P), b = pair('rect', { ...P, t0: 1.3 }); let e = 0; for (let i = 0; i < a.mag.length; i++) e = Math.max(e, Math.abs(a.mag[i] - b.mag[i])); ok(e < 1e-9, `max diff ${e}`);
  },
  'Gaussian reaches the uncertainty bound 1/4π; the triangle is √1.2 above it'() {
    const g = pair('gauss', P), w = rmsWidths(g.t, g.x, g.f, g.mag); near(w.st * w.sf, 1 / (4 * Math.PI), 1e-3, 'gauss');
    const t = pair('tri', P), v = rmsWidths(t.t, t.x, t.f, t.mag); near(v.st * v.sf * 4 * Math.PI, Math.sqrt(1.2), 5e-3, 'triangle: √1.2 times the bound');
  },
  'sinc is band-limited: all energy inside W'() { const s = pair('sinc', { ...P, W: 2 }, 8192, 160); ok(energyWithin(s.f, s.mag, 2.05) > 0.99, 'inside W'); },
};
