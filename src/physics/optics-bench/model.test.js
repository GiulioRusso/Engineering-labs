import { image, snell, twoSlit, fringe } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'thin lens: two principal rays meet where 1/f = 1/d_o + 1/d_i'() {
    const f = 0.1, dobj = 0.25, h = 0.02, { di, m } = image(f, dobj);
    // ray 1: parallel, then through F' at (f, 0); ray 2: straight through the centre
    const s1 = -h / f, s2 = -h / dobj; // slopes after the lens
    const x = h / (s2 - s1); // intersection of y = h + s1·x and y = s2·x
    near(x, di, 1e-12, 'meeting point'); near(s2 * x, m * h, 1e-12, 'image height');
    ok(!image(0.1, 0.05).real && image(0.1, 0.05).m > 1, 'inside f: virtual, upright, magnified');
  },
  "Snell: n₁ sin θ₁ = n₂ sin θ₂; total internal reflection beyond the critical angle"() {
    const s = snell(1, 1.5, 0.6); near(Math.sin(s.th2) * 1.5, Math.sin(0.6), 1e-12, 'Snell');
    const g = snell(1.5, 1, 0.5); ok(!g.tir, 'below critical');
    near(snell(1.5, 1, 0.1).crit, Math.asin(1 / 1.5), 1e-12, 'critical angle'); ok(snell(1.5, 1, 0.8).tir, 'TIR at 46°');
    near(snell(1, 1.5, 0).R, 0.04, 1e-12, 'normal incidence 4 %');
  },
  'two slits: bright fringes λL/d apart when d ≪ L'() {
    const lam = 0.002, d = 0.04, L = 2, step = fringe(lam, d, L); // θ = λ/d = 0.05 rad: small angle
    let best = 0, by = 0;
    for (let y = step * 0.5; y < step * 1.5; y += step / 4000) { const I = twoSlit(lam, d, L, y); if (I > best) { best = I; by = y; } }
    near(by, step, 5e-3, 'first maximum'); near(twoSlit(lam, d, L, 0), 4, 1e-12, 'central maximum = 4× one slit');
  },
};
