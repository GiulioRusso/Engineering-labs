import { omega, lagrangePoints, integrate, jacobi, ROUTH, SYSTEMS } from './model.js';
import { near, ok } from '../../lib/testing.js';

const mu = SYSTEMS['earth-moon'].mu;
export const tests = {
  'all five Lagrange points are equilibria (∇Ω = 0); L4 makes an equilateral triangle'() {
    const L = lagrangePoints(mu);
    for (const [k, [x, y]] of Object.entries(L)) { const o = omega(mu, x, y); ok(Math.hypot(o.gx, o.gy) < 1e-10, `${k}: |∇Ω| = ${Math.hypot(o.gx, o.gy)}`); }
    near(Math.hypot(L.L4[0] + mu, L.L4[1]), 1, 1e-12, 'L4 to the big body'); near(Math.hypot(L.L4[0] - 1 + mu, L.L4[1]), 1, 1e-12, 'L4 to the small body');
    near(1 - mu - L.L1[0], 0.1509, 1e-3, 'Earth–Moon L1 is 0.151 a from the Moon (58 000 km)');
  },
  'the Jacobi constant is conserved along a trajectory'() {
    const L = lagrangePoints(mu), r = integrate(mu, [L.L4[0] + 0.01, L.L4[1], 0, 0], { tEnd: 40 });
    const C0 = jacobi(mu, r.s[0]); let worst = 0; for (const s of r.s) worst = Math.max(worst, Math.abs(jacobi(mu, s) - C0));
    ok(worst < 1e-9, `drift ${worst}`);
    return `drift ${worst.toExponential(1)}`;
  },
  'L4 is stable below the Routh limit (μ ≈ 0.0385), unstable above'() {
    near(ROUTH, 0.038521, 1e-4, 'Routh value');
    const run = (m) => { const L = lagrangePoints(m), r = integrate(m, [L.L4[0] + 0.005, L.L4[1], 0, 0], { tEnd: 150 }); return Math.max(...r.s.map((s) => Math.hypot(s[0] - L.L4[0], s[1] - L.L4[1]))); };
    ok(run(0.01) < 0.2, 'stays near L4 for μ = 0.01'); ok(run(0.06) > 0.3, 'drifts away for μ = 0.06');
  },
};
