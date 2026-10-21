import { field, ellipse, jones, element, apply, fromJones, power, stokes, circular } from './model.js';
import { near, ok } from '../../lib/testing.js';

const deg = Math.PI / 180;
export const tests = {
  'ellipse: equal amplitudes and 90° give a circle; δ = 0 a line at atan(Ay/Ax)'() { const c = ellipse(1, 1, 90 * deg); near(Math.abs(c.chi), 45 * deg, 1e-6, 'circular'); near(c.a, c.b, 1e-6, 'a = b'); const l = ellipse(1, 0.5, 0); near(l.psi, Math.atan(0.5), 1e-9, 'tilt'); near(l.b + 1, 1, 1e-9, 'b = 0'); },
  'the field tip stays on the ellipse with semi-axes a, b'() { const { psi, a, b } = ellipse(1, 0.6, 50 * deg); for (let i = 0; i < 12; i++) { const [x, y] = field(1, 0.6, 50 * deg, i * 0.5), u = x * Math.cos(psi) + y * Math.sin(psi), v = -x * Math.sin(psi) + y * Math.cos(psi); near((u / a) ** 2 + (v / b) ** 2, 1, 1e-9, `t${i}`); } },
  'Malus: a polarizer at θ passes cos²θ of a linear wave'() { for (const t of [0, 30, 60, 89]) near(power(apply(element('polarizer', t * deg), jones(1, 0, 0))) + 1, Math.cos(t * deg) ** 2 + 1, 1e-12, `${t}°`); },
  'quarter-wave plate at 45° turns linear into circular; half-wave rotates by 2θ'() { const q = fromJones(apply(element('retarder', 45 * deg, Math.PI / 2), jones(1, 0, 0))); near(Math.abs(ellipse(q.Ax, q.Ay, q.d).chi), 45 * deg, 1e-9, 'circular'); const h = fromJones(apply(element('retarder', 20 * deg, Math.PI), jones(1, 0, 0))); near(ellipse(h.Ax, h.Ay, h.d).psi, 40 * deg, 1e-9, 'rotated 40°'); near(power(apply(element('retarder', 33 * deg, 1.1), jones(0.6, 0.8, 0.3))), 1, 1e-12, 'unitary'); },
  'Stokes on the sphere; circular components sum to a line at φ/2'() { const S = stokes(0.6, 0.8, 0.7); near(S[1] ** 2 + S[2] ** 2 + S[3] ** 2, S[0] ** 2, 1e-12, 'fully polarized'); for (let i = 0; i < 8; i++) { const [x, y] = circular(0.5, 0.5, 60 * deg, i); ok(Math.abs(y * Math.cos(30 * deg) - x * Math.sin(30 * deg)) < 1e-12, `on the 30° line at t${i}`); } },
};
