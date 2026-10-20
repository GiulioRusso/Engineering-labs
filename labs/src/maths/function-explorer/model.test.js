import { family } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'line through two points passes through both; root is where y = 0'() {
    const F = family({ family: 'linear', x1: -1, y1: 2, x2: 3, y2: -4 });
    near(F.f(-1), 2, 1e-12, 'P1'); near(F.f(3), -4, 1e-12, 'P2'); near(1 + F.f(F.roots[0]), 1, 1e-12, 'root');
  },
  'quadratic: roots from the discriminant are zeros; vertex is the minimum'() {
    const F = family({ family: 'quadratic', a: 0.5, h: 1, k: -2 });
    ok(F.D > 0 && F.roots.length === 2, 'two real roots');
    for (const r of F.roots) near(1 + F.f(r), 1, 1e-12, `f(${r})`);
    ok(F.f(1 + 1e-3) > F.f(1) && F.f(1 - 1e-3) > F.f(1), 'vertex is a minimum for a > 0');
    near(F.a + F.b + F.c, F.f(1), 1e-12, 'expanded form = vertex form at x = 1');
    ok(family({ family: 'quadratic', a: 1, h: 0, k: 1 }).roots.length === 0, 'D < 0: no real roots');
  },
  'exponential and logarithm are inverses'() {
    const E = family({ family: 'exponential', A: 1, base: 2.5 }), L = family({ family: 'logarithm', base: 2.5 });
    for (const x of [-2, 0.3, 1, 3]) near(L.f(E.f(x)), x, 1e-12, `log(exp(${x}))`);
    near(L.f(2.5), 1, 1e-12, 'log_b(b) = 1');
  },
};
