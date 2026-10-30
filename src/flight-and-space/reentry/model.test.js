import { entry, allenEggers, aePeak, G0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'without gravity or curvature the path is straight and matches Allen–Eggers'() {
    const p = { v0: 7800, gam0: -20, beta: 300 }, r = entry(p, { gravity: false, curved: false, dt: 0.01 });
    for (const o of r.out.filter((_, i) => i % 200 === 0 && i > 0)) { if (o.v < 1500) break; near(o.v, allenEggers(7800, -20, 300, o.h), 1e-4, `h ${o.h}`); }
    near(r.peakG * G0, aePeak(7800, -20), 1e-3, 'peak deceleration');
  },
  'steeper entry: harder deceleration; lift lowers the peak; too shallow skips out'() {
    const a = entry({ v0: 7800, gam0: -2, beta: 300 }), b = entry({ v0: 7800, gam0: -15, beta: 300 }), c = entry({ v0: 11000, gam0: -6.5, beta: 300, LD: 0.3 }), d = entry({ v0: 11000, gam0: -6.5, beta: 300 });
    ok(b.peakG > 2 * a.peakG, `${b.peakG} vs ${a.peakG}`); ok(c.peakG < d.peakG, 'lift helps');
    ok(entry({ v0: 11000, gam0: -3, beta: 300, LD: 0.3 }).skipped, 'skips');
  },
};
