import { section, kind, eccentricity, polarConic } from './model.js';
import { near, ok } from '../../lib/testing.js';

const a = Math.PI / 6;
export const tests = {
  'flat plane: a circle; tilt equal to the slope: a parabola'() { ok(kind(a, 0) === 'circle', 'circle'); ok(kind(a, Math.PI / 2 - a) === 'parabola', 'parabola'); ok(kind(a, 0.3) === 'ellipse', 'ellipse'); ok(kind(a, 1.3) === 'hyperbola', 'hyperbola'); near(eccentricity(a, Math.PI / 2 - a), 1, 1e-12, 'e = 1'); },
  'section points lie on the cone and the plane'() { for (const [x, y, z] of section(a, 0.4, 1.5).slice(0, 40)) { near(x * x + y * y + 1, (Math.tan(a) * z) ** 2 + 1, 1e-9, 'cone'); } },
  'ellipse: r1 + r2 constant from the polar form'() { const e = 0.6, p = 1.6, aa = p / (1 - e * e), c = e * aa; for (const th of [0.3, 1, 2.5]) { const r = polarConic(e, p, th), x = r * Math.cos(th), y = r * Math.sin(th); near(r + Math.hypot(x + 2 * c, y), 2 * aa, 1e-9, `θ ${th}`); } },
};
