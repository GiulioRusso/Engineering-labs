import { FUNCS, bisect, secant, relax, fixedPoint, order } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'bisection halves the bracket every step'() { const F = FUNCS.cubic, S = bisect(F.f, F.a, F.b, 40); near(S[10].b - S[10].a, (F.b - F.a) / 2 ** 10, 1e-12, 'width'); near(S.at(-1).m, F.root, 1e-11, 'root'); },
  'bisection: one bit per step, ≈ 3.3 steps per digit'() { const F = FUNCS.cos, S = bisect(F.f, F.a, F.b, 34); ok(Math.abs(S[33].m - F.root) < 2 * 2 ** -34, 'err'); },
  'secant converges in a few steps'() { for (const F of Object.values(FUNCS)) { const S = secant(F.f, F.a, F.b); near(S.at(-1).x2, F.root, 1e-12, F.label); } },
  'secant order ≈ golden ratio 1.618'() { const F = FUNCS.cubic, e = secant(F.f, 1.5, 2.5).map((s) => Math.abs(s.x2 - F.root)); const p = order(e[2], e[3], e[4]); near(p, 1.618, 0.08, 'order'); return `p = ${p.toFixed(3)}`; },
  'fixed point: λ = 1/(2√2) converges quadratically to √2'() { const xs = fixedPoint(relax(1 / (2 * Math.SQRT2)), 1, 6); near(xs.at(-1), Math.SQRT2, 1e-14, '√2'); },
  'fixed point: linear rate |1 − 2√2 λ|'() { const lam = 0.1, xs = fixedPoint(relax(lam), 1, 60), e = xs.map((x) => Math.abs(x - Math.SQRT2)); near(e[40] / e[39], Math.abs(1 - 2 * Math.SQRT2 * lam), 1e-3, 'rate'); },
  'fixed point: λ = 0.8 diverges'() { const xs = fixedPoint(relax(0.8), 1, 60); ok(Math.abs(xs.filter(Number.isFinite).at(-1) - Math.SQRT2) > 0.1, 'no convergence'); },
};
