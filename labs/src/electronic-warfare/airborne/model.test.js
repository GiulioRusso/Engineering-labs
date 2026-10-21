import { radialVelocity, clutterDoppler, footprint } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'only the radial component counts: a crossing target has zero Doppler'() {
    const o = { x: 0, y: 0, vx: 0, vy: 250 };
    near(radialVelocity(o, { x: 0, y: 50e3, vx: 0, vy: -300 }), 550, 1e-12, 'head-on: speeds add');
    ok(Math.abs(radialVelocity({ ...o, vy: 0 }, { x: 0, y: 50e3, vx: 300, vy: 0 })) < 1e-9, 'crossing at 90°');
  },
  'ground Doppler: maximum straight ahead, zero abeam, iso-Doppler is a hyperbola'() {
    const h = 5e3, v = 200, lam = 0.03;
    near(clutterDoppler(1e9, 0, h, v, lam), 2 * v / lam, 1e-6, 'far ahead'); near(clutterDoppler(0, 3e4, h, v, lam), 0, 1e-12, 'abeam');
    // x² (1 − c²) − c² y² = c² h² with c = f λ / 2v: check one point
    const f = 0.5 * 2 * v / lam, c = 0.5, y = 2e4, x = Math.sqrt((c * c * (y * y + h * h)) / (1 - c * c));
    near(clutterDoppler(x, y, h, v, lam), f, 1e-9, 'hyperbola');
  },
  'a 4° beam from 8 km covers 0.75 km of ground at 60° depression and 19 km at 10°'() {
    const d = Math.PI / 180;
    near(footprint(8.05e3, 60 * d, 4 * d).length, 750, 0.02, 'steep'); near(footprint(8.05e3, 10 * d, 4 * d).length, 19.4e3, 0.02, 'shallow');
  },
};
