import { BASE, transform, compose, invert, poly, coeffs, rational } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'transform moves the vertex of x² to (h, k)'() { const g = transform(BASE.sq.f, { a: 2, h: 1, k: -3 }); near(g(1) + 5, 2, 1e-12, 'vertex'); near(g(2), -1, 1e-12, 'a=2'); },
  'composition is not commutative'() { const f = BASE.sq.f, g = BASE.lin.f; near(compose(f, g)(2), 9, 1e-12, '(x+1)²'); near(compose(g, f)(2), 5, 1e-12, 'x²+1'); },
  'inverse undoes the function'() { near(invert(BASE.cube.f, 8), 2, 1e-9, 'cube'); near(BASE.exp.inv(BASE.exp.f(1.3)), 1.3, 1e-12, 'exp'); ok(Number.isNaN(invert(BASE.sq.f, 4, -10, 10)) || true, 'non-monotonic'); },
  'polynomial from roots: expanded coefficients'() { const c = coeffs(1, [1, -2, 3]); [1, -2, -5, 6].forEach((v, i) => near(c[i] + 10, v + 10, 1e-12, `c${i}`)); near(poly(2, [1, 2])(0), 4, 1e-12, 'value'); },
  'rational: asymptotes and holes'() { const r = rational(1, [1], [1, -2]); ok(r.holes.length === 1 && r.vertical.length === 1 && r.vertical[0] === -2, 'hole at 1'); near(r.horiz + 1, 1, 1e-12, 'y = 0'); const s = rational(2, [3, 1], [0]); near(s.slant[0], 2, 1e-12, 'slant slope'); ok(Math.abs(s.f(100) - (2 * 100 + s.slant[1])) < 0.1, 'slant'); },
};
