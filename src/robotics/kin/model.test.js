import { Rx, Ry, Rz, mul, tr, zyz, rpy, toZYZ, toRPY, axisAngle, toAxisAngle, toQuat, fromQuat, quatError, slerp, fk, jacobian, pof, Rof, ROBOTS, planar, jacPlanar, pinv, mv, ARM2, step2, energy2, dyn2, trapezoidal, cubic, quintic } from './model.js';
import { near, ok } from '../../lib/testing.js';

const close = (A, B, tol, msg) => A.forEach((r, i) => r.forEach((x, j) => near(x + 2, B[i][j] + 2, tol, `${msg} [${i}][${j}]`)));
export const tests = {
  'rotations are orthonormal; Euler, axis–angle and quaternion round trips'() {
    const R = mul(mul(Rz(0.7), Ry(-0.4)), Rx(1.1)); close(mul(R, tr(R)), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 1e-12, 'RRᵀ');
    const e = toZYZ(zyz(0.3, 1.2, -2)); near(e.p, 0.3, 1e-12, 'φ'); near(e.t, 1.2, 1e-12, 'θ'); near(e.s, -2, 1e-12, 'ψ');
    const r = toRPY(rpy(-1, 0.5, 2.5)); near(r.p, -1, 1e-12, 'yaw'); near(r.t, 0.5, 1e-12, 'pitch'); near(r.s, 2.5, 1e-12, 'roll');
    ok(toZYZ(zyz(0.3, 0, 0.5)).singular && Math.abs(toZYZ(zyz(0.3, 0, 0.5)).p - 0.8) < 1e-12, 'ZYZ at θ = 0: only φ + ψ');
    const A = axisAngle([1, 2, -1], 2.1), b = toAxisAngle(A); near(b.th, 2.1, 1e-12, 'angle'); near(b.r[1], 2 / Math.sqrt(6), 1e-12, 'axis');
    close(fromQuat(toQuat(R)), R, 1e-12, 'quaternion'); close(axisAngle([0, 0, 1], 0.9), Rz(0.9), 1e-12, 'Rodrigues = Rz');
  },
  'quaternion error: zero when aligned, ≈ the small rotation otherwise; slerp moves at constant rate'() {
    const qd = toQuat(Rz(0.5)); ok(quatError(qd, qd).every((x) => Math.abs(x) < 1e-12), 'aligned');
    const q = toQuat(mul(Rz(0.5), Rx(0.02))), e = quatError(qd, q); near(Math.hypot(...e), Math.sin(0.01), 1e-9, 'sin(θ/2)');
    const q0 = toQuat(Rz(0)), q1 = toQuat(Rz(1.2)); near(toAxisAngle(fromQuat(slerp(q0, q1, 0.25))).th, 0.3, 1e-12, 'slerp');
  },
  'DH chains: the geometric Jacobian matches finite differences (anthropomorphic and Jaco2)'() {
    for (const R of Object.values(ROBOTS)) {
      const J = jacobian(fk(R.rows, R.q)), h = 1e-6;
      R.q.forEach((_, i) => { const qp = R.q.map((x, k) => x + (k === i ? h : 0)), qm = R.q.map((x, k) => x - (k === i ? h : 0)), pp = pof(fk(R.rows, qp).at(-1)), pm = pof(fk(R.rows, qm).at(-1));
        for (let k = 0; k < 3; k++) near(J[k][i] + 3, (pp[k] - pm[k]) / (2 * h) + 3, 1e-8, `${R.label} J[${k}][${i}]`);
        const W = mul(Rof(fk(R.rows, qp).at(-1)), tr(Rof(fk(R.rows, qm).at(-1)))); near(J[3][i] + 3, (W[2][1] - W[1][2]) / (4 * h) + 3, 1e-6, 'ω_x'); });
    }
  },
  'planar arm: Jacobian vs finite differences, J J⁺ = I'() {
    const L = [1, 0.8, 0.5], q = [0.3, 0.9, -0.6], J = jacPlanar(L, q, true), h = 1e-6;
    q.forEach((_, i) => { const a = planar(L, q.map((x, k) => x + (k === i ? h : 0))), b = planar(L, q.map((x, k) => x - (k === i ? h : 0))); near(J[0][i] + 3, (a.P.at(-1)[0] - b.P.at(-1)[0]) / (2 * h) + 3, 1e-8, 'dx'); near(J[1][i] + 3, (a.P.at(-1)[1] - b.P.at(-1)[1]) / (2 * h) + 3, 1e-8, 'dy'); });
    close(mul(J, pinv(J)), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 1e-10, 'J J⁺');
  },
  '2-link dynamics: energy conserved when free, gravity holds a static arm'() {
    let s = [0.3, 0.8, 0, 0]; const E0 = energy2(ARM2, [0.3, 0.8], [0, 0]);
    for (let i = 0; i < 4000; i++) s = step2(ARM2, s, 0, 1e-3, () => [0, 0]);
    near(energy2(ARM2, [s[0], s[1]], [s[2], s[3]]) + 100, E0 + 100, 1e-8, 'energy');
    let r = [0.4, -0.7, 0, 0]; for (let i = 0; i < 2000; i++) r = step2(ARM2, r, 0, 1e-3, (t, q) => dyn2(ARM2, q, [0, 0]).g);
    near(r[0], 0.4, 1e-9, 'held'); near(r[1], -0.7, 1e-9, 'held');
    void mv;
  },
  'trajectories: trapezoid continuous and on time; polynomials rest to rest'() {
    const qi = 0.2, qf = 1.4, tf = 2, vc = 0.9, h = 1e-4; let prev = trapezoidal(qi, qf, vc, tf, 0).q, maxJump = 0;
    for (let t = h; t <= tf; t += h) { const p = trapezoidal(qi, qf, vc, tf, t); maxJump = Math.max(maxJump, Math.abs(p.q - prev)); prev = p.q; }
    ok(maxJump < 1e-3, 'continuous'); near(trapezoidal(qi, qf, vc, tf, tf).q, qf, 1e-12, 'arrives'); ok(trapezoidal(qi, qf, vc, tf, 1).v === vc, 'cruise');
    ok(!trapezoidal(qi, qf, 0.5, tf, 1).ok && !trapezoidal(qi, qf, 1.3, tf, 1).ok, 'cruise speed out of [|Δ|/tf, 2|Δ|/tf]');
    for (const f of [cubic, quintic]) { near(f(qi, qf, tf, tf).q, qf, 1e-12, 'end'); near(f(qi, qf, tf, 0).v + 1, 1, 1e-12, 'v0'); near(f(qi, qf, tf, tf / 2).q, (qi + qf) / 2, 1e-12, 'mid'); }
  },
};
