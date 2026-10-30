// Closed-loop inverse kinematics (CLIK) for a three-link planar arm, as in the Jaco2 project's tasks 1–3:
// q̇ = J⁺(ẋ_d + K e) (or Jᵀ K e, or damped least squares), integrated with Euler steps of Ts, along a square
// with a trapezoidal profile on each side. With a 2-D position task the arm is redundant and a null-space
// term (I − J⁺J) q̇₀ can pursue a second goal. Builds on robotics/kin.
import { planar, jacPlanar, pinv, mul, tr, mv, trapezoidal } from '../kin/model.js';

export const ARM3 = [1, 0.7, 0.4], DEG = Math.PI / 180;
export const Q_MID = [0, 90 * DEG, 90 * DEG]; // centres of the joint ranges, the goal of 'center'
export const STARTS = { comfortable: [-40, 90, 60].map((x) => x * DEG), stretched: [-10, 20, 15].map((x) => x * DEG) };
// the project's square: side L, T s per side with cruise speed 1.5 L/T, 0.5 s stops at the corners, 2 s at the end
export function squarePath(p0, { L = 0.4, T = 3, pause = 0.5, end = 2 } = {}) {
  const C = [p0, [p0[0] + L, p0[1]], [p0[0] + L, p0[1] + L], [p0[0], p0[1] + L], p0], seg = T + pause, total = 4 * T + 3 * pause + end;
  return { total, at(t) {
    const k = Math.min(3, Math.floor(t / seg)), s = t - k * seg, a = C[k], b = C[k + 1], u = trapezoidal(0, 1, 1.5 / T, T, Math.min(s, T));
    return { p: [a[0] + (b[0] - a[0]) * u.q, a[1] + (b[1] - a[1]) * u.q], v: s < T ? [(b[0] - a[0]) * u.v, (b[1] - a[1]) * u.v] : [0, 0] };
  }, corners: C };
}
export const stillPath = (p0, T = 8) => ({ total: T, at: () => ({ p: p0, v: [0, 0] }), corners: [] });
export function circlePath(p0, { R = 0.25, T = 8, end = 2 } = {}) {
  const c = [p0[0] - R, p0[1]], w = 2 * Math.PI / T;
  return { total: T + end, at(t) { const a = w * Math.min(t, T), on = t < T; return { p: [c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)], v: on ? [-R * w * Math.sin(a), R * w * Math.cos(a)] : [0, 0] }; }, corners: [] };
}
const mvn = (A, v) => A.map((r) => r.reduce((s, x, k) => s + x * v[k], 0));
// manipulability √det(J Jᵀ) of the position task, and its gradient by central differences
export const manipW = (L, q) => { const J = jacPlanar(L, q), A = mul(J, tr(J)); return Math.sqrt(Math.max(0, A[0][0] * A[1][1] - A[0][1] * A[1][0])); };
const grad = (f, q, h = 1e-6) => q.map((_, i) => (f(q.map((x, k) => x + (k === i ? h : 0))) - f(q.map((x, k) => x - (k === i ? h : 0)))) / (2 * h));

// alg: 'pinv' | 'transpose' | 'dls'; task: 'pos' (x, y) or 'pose' (x, y, φ); nul: 'none' | 'center' | 'manip'
export function clik({ L = ARM3, q0, path = 'square', alg = 'pinv', K = 50, lambda = 0.1, task = 'pos', nul = 'none', k0 = 5, Ts = 0.01, qMid = Q_MID }) {
  const f0 = planar(L, q0), P = { square: squarePath, circle: circlePath, still: stillPath }[path](f0.P.at(-1)), phid = f0.phi, out = [];
  let q = [...q0];
  for (let t = 0; t <= P.total + 1e-9; t += Ts) {
    const { p: pd, v: vd } = P.at(t), f = planar(L, q), pe = f.P.at(-1), withPhi = task === 'pose', J = jacPlanar(L, q, withPhi);
    const e = withPhi ? [pd[0] - pe[0], pd[1] - pe[1], phid - f.phi] : [pd[0] - pe[0], pd[1] - pe[1]], xd = withPhi ? [...vd, 0] : vd;
    let qd;
    if (alg === 'transpose') qd = mvn(tr(J), e.map((x) => K * x));
    else {
      const Jp = pinv(J, alg === 'dls' ? lambda : 0) || pinv(J, 1e-3);
      qd = mvn(Jp, xd.map((x, i) => x + K * e[i]));
      if (nul !== 'none' && !withPhi) {
        const g = nul === 'center' ? q.map((x, i) => -(x - qMid[i])) : grad((qq) => manipW(L, qq), q), N = mul(Jp, J);
        const q0d = g.map((x) => k0 * x), proj = q0d.map((x, i) => x - N[i].reduce((s, y, k) => s + y * q0d[k], 0));
        qd = qd.map((x, i) => x + proj[i]);
      }
    }
    out.push({ t, q: [...q], pe, pd, e: Math.hypot(e[0], e[1]), eo: withPhi ? Math.abs(e[2]) : 0, qdn: Math.hypot(...qd), w: manipW(L, q), dist: Math.hypot(...q.map((x, i) => x - qMid[i])) });
    q = q.map((x, i) => x + Ts * qd[i]);
  }
  return { out, corners: P.corners, total: P.total };
}
export { planar, mv };
