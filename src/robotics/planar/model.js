// A two-link planar arm: inverse kinematics in closed form, workspace, manipulability. Builds on robotics/kin.
import { planar, jacPlanar, mul, tr, det2, ellipse2, inv } from '../kin/model.js';

// both solutions (elbow up / down) for the tip at (x, y); null when out of reach
export function ik2(L, x, y) {
  const [a, b] = L, c2 = (x * x + y * y - a * a - b * b) / (2 * a * b);
  if (c2 > 1 + 1e-12 || c2 < -1 - 1e-12) return { c2, sols: [] };
  const s = Math.sqrt(Math.max(0, 1 - c2 * c2));
  const sols = [s, -s].map((s2) => { const q2 = Math.atan2(s2, c2), q1 = Math.atan2(y, x) - Math.atan2(b * s2, a + b * c2); return [q1, q2]; });
  return { c2, sols };
}
// velocity manipulability: the ellipse of tip velocities from unit joint speeds (axes √eig(JJᵀ)), and its
// dual for forces (axes 1/√eig); w = |det J| is Yoshikawa's measure for a square Jacobian
export function manip(L, q) {
  const J = jacPlanar(L, q), E = ellipse2(mul(J, tr(J)));
  return { J, w: Math.abs(det2(J)), vel: { a: Math.sqrt(E.l1), b: Math.sqrt(E.l2), th: E.th }, force: { a: 1 / Math.sqrt(Math.max(E.l2, 1e-12)), b: 1 / Math.sqrt(E.l1), th: E.th + Math.PI / 2 } };
}
export const torques = (J, F) => [J[0][0] * F[0] + J[1][0] * F[1], J[0][1] * F[0] + J[1][1] * F[1]]; // τ = Jᵀ F
export const jointSpeeds = (J, v) => { const Ji = inv(J); return Ji ? [Ji[0][0] * v[0] + Ji[0][1] * v[1], Ji[1][0] * v[0] + Ji[1][1] * v[1]] : null; };
export { planar, jacPlanar };
