import { abs, arg, add, mul, div, pow, roots } from './model.js';
import { near } from '../../lib/testing.js';

const z = [1.2, -0.7], w = [-0.4, 1.5];
export const tests = {
  'multiplying multiplies lengths and adds angles'() {
    const p = mul(z, w);
    near(abs(p), abs(z) * abs(w), 1e-14, '|zw|');
    near(Math.cos(arg(p)), Math.cos(arg(z) + arg(w)), 1e-12, 'arg');
  },
  'division undoes multiplication; addition is the parallelogram'() {
    const q = div(mul(z, w), w); near(q[0], z[0], 1e-14, 're'); near(q[1], z[1], 1e-14, 'im');
    const s = add(z, w); near(s[0], z[0] + w[0], 1e-15, 're');
  },
  'de Moivre: z^n by repeated multiplication = polar power'() {
    let r = [1, 0]; for (let k = 0; k < 7; k++) r = mul(r, z);
    const p = pow(z, 7); near(p[0], r[0], 1e-12, 're'); near(p[1], r[1], 1e-12, 'im');
  },
  'the n roots: each to the n is z, and they sum to zero'() {
    const R = roots(z, 5);
    for (const q of R) { const p = pow(q, 5); near(p[0], z[0], 1e-12, 're'); near(p[1], z[1], 1e-12, 'im'); }
    near(1 + R.reduce((a, q) => a + q[0], 0), 1, 1e-14, 'Σ re'); near(1 + R.reduce((a, q) => a + q[1], 0), 1, 1e-14, 'Σ im');
  },
};
