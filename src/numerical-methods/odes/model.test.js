import { METHODS, integrate, energy, decay, globalError } from './model.js';
import { near, ok } from '../../lib/testing.js';

const ratio = (m, h) => globalError(m, h) / globalError(m, h / 2);
export const tests = {
  'Euler is first order: half the step, half the error'() { near(ratio('euler', 0.01), 2, 0.05, 'ratio'); },
  'Heun is second order: ratio 4'() { near(ratio('heun', 0.02), 4, 0.05, 'ratio'); },
  'RK4 is fourth order: ratio 16'() { const r = ratio('rk4', 0.1); near(r, 16, 0.05, 'ratio'); return `ratio ${r.toFixed(2)}`; },
  'Euler gains energy exactly by (1 + h²) per step'() { const h = 0.1, r = integrate('euler', h, 10), n = r.t.length - 1; near(energy(r.x[n], r.v[n]), 0.5 * (1 + h * h) ** n, 1e-10, 'energy'); },
  'semi-implicit Euler keeps energy bounded'() { const r = integrate('semi', 0.1, 200), E = r.x.map((x, i) => energy(x, r.v[i])); ok(Math.max(...E) < 0.53 && Math.min(...E) > 0.47, 'bounded'); },
  'explicit Euler on y′ = −10y is unstable for h > 0.2'() { ok(Math.abs(decay('explicit', -10, 0.25, 5).y.at(-1)) > 1, 'blows up'); ok(Math.abs(decay('explicit', -10, 0.15, 5).y.at(-1)) < 1e-3, 'stable'); },
  'implicit Euler is stable for any step'() { ok(decay('implicit', -10, 2, 20).y.at(-1) < 1e-10, 'decays'); },
  'all methods agree for tiny steps'() { for (const m of Object.keys(METHODS)) ok(globalError(m, 1e-4) < 1e-3, m); },
};
