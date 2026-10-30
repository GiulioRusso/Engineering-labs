import { ik2, manip, torques, jointSpeeds, planar, jacPlanar } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'inverse kinematics: both elbows reach the target; out of reach gives none'() {
    const L = [1, 0.7];
    for (const [x, y] of [[1.2, 0.5], [-0.4, 0.9], [0.31, 0]]) for (const q of ik2(L, x, y).sols) { const t = planar(L, q).P.at(-1); near(t[0] + 3, x + 3, 1e-12, 'x'); near(t[1] + 3, y + 3, 1e-12, 'y'); }
    ok(ik2(L, 1.8, 0).sols.length === 0 && ik2(L, 0.2, 0).sols.length === 0, 'outside the annulus');
  },
  'manipulability: |det J| = l₁l₂|sin q₂|, ellipse axes multiply to it, force ellipse is the inverse'() {
    const L = [1, 0.7], m = manip(L, [0.4, 1.1]); near(m.w, 0.7 * Math.sin(1.1), 1e-12, 'det');
    near(m.vel.a * m.vel.b, m.w, 1e-10, 'area'); near(m.force.a * m.vel.b, 1, 1e-10, 'duality');
  },
  'statics: power balance τ·q̇ = F·v; joint speeds from tip speeds'() {
    const L = [1, 0.7], q = [0.3, 0.9], J = jacPlanar(L, q), F = [2, -1], qd = jointSpeeds(J, [0.4, 0.2]), tau = torques(J, F);
    near(tau[0] * qd[0] + tau[1] * qd[1], F[0] * 0.4 + F[1] * 0.2, 1e-12, 'virtual work');
    ok(jointSpeeds(jacPlanar(L, [0.3, 0]), [1, 0]) === null, 'singular: no inverse');
  },
};
