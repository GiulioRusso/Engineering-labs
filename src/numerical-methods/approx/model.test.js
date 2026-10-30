import { runge, nodes, interp, maxErr, INTEGRANDS, trapz, simpson, forward, central } from './model.js';
import { near, ok } from '../../lib/testing.js';

const fit = (n, k) => { const xs = nodes(n, k); return maxErr(runge, interp(xs, xs.map(runge))); };
export const tests = {
  'interpolation reproduces a cubic exactly'() { const xs = nodes(4, 'equi'), p = interp(xs, xs.map((x) => x ** 3 - x)); near(p(0.3), 0.027 - 0.3, 1e-12, 'cubic'); },
  'Runge: equispaced error grows with n'() { ok(fit(15, 'equi') > fit(9, 'equi') && fit(15, 'equi') > 1, 'grows'); },
  'Chebyshev nodes: error shrinks with n'() { const a = fit(9, 'cheb'), b = fit(25, 'cheb'); ok(b < a / 5 && b < 0.05, `${a} ${b}`); },
  'trapezoid error falls 4× when n doubles'() { const I = INTEGRANDS.exp, e = (n) => Math.abs(trapz(I.f, I.a, I.b, n) - I.exact); near(e(16) / e(32), 4, 0.01, 'ratio'); },
  'Simpson error falls 16× when n doubles'() { const I = INTEGRANDS.exp, e = (n) => Math.abs(simpson(I.f, I.a, I.b, n) - I.exact); near(e(8) / e(16), 16, 0.02, 'ratio'); },
  'Simpson integrates sin on [0, π] to 2'() { near(simpson(Math.sin, 0, Math.PI, 100), 2, 1e-7, 'sin'); },
  'forward difference: best h ≈ 1e-8, error ≈ 1e-8'() { const e = (h) => Math.abs(forward(Math.sin, 1, h) - Math.cos(1)); ok(e(1e-8) < 1e-7 && e(1e-3) > 1e-4 && e(1e-14) > 1e-4, 'U shape'); },
  'central difference beats forward by orders of magnitude'() { const e = Math.abs(central(Math.sin, 1, 1e-5) - Math.cos(1)); ok(e < 1e-10, `${e}`); },
};
