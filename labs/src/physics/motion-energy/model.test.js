import { projectile, range, apex, circular, collide, G } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'no drag: simulated range and apex = closed forms'() {
    const v0 = 18, th = 0.7, h0 = 2, P = projectile({ v0, th, h0 }), k = P.t.length - 1;
    near(P.x[k], range(v0, th, h0), 1e-6, 'range'); near(Math.max(...P.y), apex(v0, th, h0), 1e-6, 'apex');
    near(range(10, Math.PI / 4, 0), 100 / G, 1e-12, '45°: v²/g');
  },
  'no drag: mechanical energy is conserved'() {
    const P = projectile({ v0: 15, th: 1, h0: 1 }), E = (i) => 0.5 * (P.vx[i] ** 2 + P.vy[i] ** 2) + G * P.y[i];
    let worst = 0; for (let i = 0; i < P.t.length; i++) worst = Math.max(worst, Math.abs(E(i) - E(0)) / E(0));
    ok(worst < 1e-6, `drift ${worst}`); // RK4 is exact here; the landing sample is linearly interpolated (O(dt²))
    return `relative drift ${worst.toExponential(1)}`;
  },
  'with drag: energy only decreases, range is shorter'() {
    const P = projectile({ v0: 30, th: 0.8, c: 0.01 }), E = (i) => 0.5 * (P.vx[i] ** 2 + P.vy[i] ** 2) + G * P.y[i];
    for (let i = 1; i < P.t.length; i++) ok(E(i) <= E(i - 1) + 1e-9, 'energy rises');
    ok(P.x[P.x.length - 1] < range(30, 0.8, 0), 'shorter range');
  },
  'circular motion: |a| = ω²r = v²/r, a ⟂ v'() {
    const s = circular(2, 1.5, 0.37), a = Math.hypot(...s.a), v = Math.hypot(...s.v);
    near(a, 1.5 ** 2 * 2, 1e-12, 'ω²r'); near(a, v * v / 2, 1e-12, 'v²/r'); near(1 + s.a[0] * s.v[0] + s.a[1] * s.v[1], 1, 1e-12, 'a·v = 0');
  },
  'collisions: momentum conserved; elastic keeps kinetic energy, inelastic loses it'() {
    const [m1, m2, u1, u2] = [2, 3, 4, -1];
    for (const e of [0, 0.5, 1]) { const [v1, v2] = collide(m1, m2, u1, u2, e); near(m1 * v1 + m2 * v2, m1 * u1 + m2 * u2, 1e-12, `p (e=${e})`); near(v2 - v1, e * (u1 - u2), 1e-12, 'restitution'); }
    const [v1, v2] = collide(m1, m2, u1, u2, 1); near(m1 * v1 ** 2 + m2 * v2 ** 2, m1 * u1 ** 2 + m2 * u2 ** 2, 1e-12, 'elastic KE');
  },
};
