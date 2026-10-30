// Robot kinematics and dynamics shared by the robotics labs (after Siciliano et al., Robotics: Modelling,
// Planning and Control, and the course library of the Jaco2 project). 3×3 matrices are arrays of rows.
// Pure, no DOM.

// ---------------------------------------------------------------- rotations
export const I3 = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const Rx = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
export const Ry = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
export const Rz = (a) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
export const mul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)));
export const tr = (A) => A[0].map((_, j) => A.map((r) => r[j]));
export const mv = (A, v) => A.map((r) => r.reduce((s, x, k) => s + x * v[k], 0));
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const norm = (a) => Math.sqrt(dot(a, a));

// Euler angles: ZYZ (φ, θ, ψ) and roll–pitch–yaw as ZYX (yaw φ about z, pitch θ about y, roll ψ about x)
export const zyz = (p, t, s) => mul(mul(Rz(p), Ry(t)), Rz(s));
export const rpy = (p, t, s) => mul(mul(Rz(p), Ry(t)), Rx(s));
export function toZYZ(R) { // θ in (0, π); when sin θ = 0 only φ + ψ (or φ − ψ) is defined: ψ is set to 0
  const st = Math.hypot(R[0][2], R[1][2]), t = Math.atan2(st, R[2][2]);
  if (st < 1e-9) return { p: Math.atan2(R[1][0], R[0][0]), t, s: 0, singular: true };
  return { p: Math.atan2(R[1][2], R[0][2]), t, s: Math.atan2(R[2][1], -R[2][0]), singular: false };
}
export function toRPY(R) { // θ in (−π/2, π/2); singular at θ = ±π/2
  const ct = Math.hypot(R[0][0], R[1][0]), t = Math.atan2(-R[2][0], ct);
  if (ct < 1e-9) return { p: Math.atan2(-R[0][1], R[1][1]), t, s: 0, singular: true };
  return { p: Math.atan2(R[1][0], R[0][0]), t, s: Math.atan2(R[2][1], R[2][2]), singular: false };
}
// axis–angle (Rodrigues) and back
export function axisAngle(r, th) {
  const [x, y, z] = r.map((c) => c / norm(r)), c = Math.cos(th), s = Math.sin(th), v = 1 - c;
  return [[x * x * v + c, x * y * v - z * s, x * z * v + y * s], [x * y * v + z * s, y * y * v + c, y * z * v - x * s], [x * z * v - y * s, y * z * v + x * s, z * z * v + c]];
}
export function toAxisAngle(R) {
  const th = Math.acos(Math.max(-1, Math.min(1, (R[0][0] + R[1][1] + R[2][2] - 1) / 2))), v = [R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1]];
  return { th, r: norm(v) > 1e-9 ? v.map((c) => c / norm(v)) : [0, 0, 1] };
}
// unit quaternion {η (scalar), ε (vector)} from R, as Rot2Quat in the course library, and back
export function toQuat(R) {
  const sq = (x) => 0.5 * Math.sqrt(Math.max(0, x)), sg = (x) => (x >= 0 ? 1 : -1);
  const q = { eta: sq(R[0][0] + R[1][1] + R[2][2] + 1), eps: [sg(R[2][1] - R[1][2]) * sq(R[0][0] - R[1][1] - R[2][2] + 1), sg(R[0][2] - R[2][0]) * sq(-R[0][0] + R[1][1] - R[2][2] + 1), sg(R[1][0] - R[0][1]) * sq(-R[0][0] - R[1][1] + R[2][2] + 1)] };
  const n = Math.hypot(q.eta, ...q.eps); return { eta: q.eta / n, eps: q.eps.map((c) => c / n) };
}
export function fromQuat({ eta: h, eps: [x, y, z] }) {
  return [[2 * (h * h + x * x) - 1, 2 * (x * y - h * z), 2 * (x * z + h * y)], [2 * (x * y + h * z), 2 * (h * h + y * y) - 1, 2 * (y * z - h * x)], [2 * (x * z - h * y), 2 * (y * z + h * x), 2 * (h * h + z * z) - 1]];
}
// orientation error of the course's QuatError: e_O = η ε_d − η_d ε − ε_d × ε, sign flipped for the shorter way
export function quatError(qd, q) {
  const c = cross(qd.eps, q.eps), e = qd.eps.map((x, i) => q.eta * x - qd.eta * q.eps[i] - c[i]);
  return q.eta * qd.eta + dot(q.eps, qd.eps) < 0 ? e.map((x) => -x) : e;
}
export function slerp(q0, q1, u) {
  let d = q0.eta * q1.eta + dot(q0.eps, q1.eps), b = q1;
  if (d < 0) { d = -d; b = { eta: -q1.eta, eps: q1.eps.map((x) => -x) }; }
  const w = Math.acos(Math.min(1, d)), s = Math.sin(w), k0 = s < 1e-9 ? 1 - u : Math.sin((1 - u) * w) / s, k1 = s < 1e-9 ? u : Math.sin(u * w) / s;
  return { eta: k0 * q0.eta + k1 * b.eta, eps: q0.eps.map((x, i) => k0 * x + k1 * b.eps[i]) };
}

// ---------------------------------------------------------------- homogeneous transforms and DH
export const hom = (R, p) => [[...R[0], p[0]], [...R[1], p[1]], [...R[2], p[2]], [0, 0, 0, 1]];
export const mul4 = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)));
export const Rof = (T) => T.slice(0, 3).map((r) => r.slice(0, 3)), pof = (T) => T.slice(0, 3).map((r) => r[3]);
// one DH link: Rot_z(θ) Trans_z(d) Trans_x(a) Rot_x(α)
export function dh(a, al, d, th) {
  const ct = Math.cos(th), st = Math.sin(th), ca = Math.cos(al), sa = Math.sin(al);
  return [[ct, -st * ca, st * sa, a * ct], [st, ct * ca, -ct * sa, a * st], [0, sa, ca, d], [0, 0, 0, 1]];
}
// frames 0…n of a DH chain (rows {a, al, d}) at joint angles q
export function fk(rows, q) { const F = [hom(I3(), [0, 0, 0])]; rows.forEach((r, i) => F.push(mul4(F[i], dh(r.a, r.al, r.d, q[i])))); return F; }
// geometric Jacobian (6 × n, revolute joints): [z_{i−1} × (p_e − p_{i−1}); z_{i−1}]
export function jacobian(F) {
  const pe = pof(F.at(-1)), n = F.length - 1, J = Array.from({ length: 6 }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) { const z = Rof(F[i]).map((r) => r[2]), p = pof(F[i]), v = cross(z, pe.map((x, k) => x - p[k])); for (let k = 0; k < 3; k++) { J[k][i] = v[k]; J[k + 3][i] = z[k]; } }
  return J;
}
export const ROBOTS = {
  anthropomorphic: { label: 'Anthropomorphic, 3 joints', rows: [{ a: 0, al: Math.PI / 2, d: 0.4 }, { a: 0.45, al: 0, d: 0 }, { a: 0.4, al: 0, d: 0 }], q: [0, 0.5, -1] },
  // Kinova Jaco2 as in the course model (Antonelli, Introduction to Robotics, Cassino 2022/23)
  jaco2: { label: 'Kinova Jaco2, 7 joints', rows: [0.2755, 0, -0.41, -0.0098, -0.3111, 0, 0.2638].map((d, i) => ({ a: 0, al: i < 6 ? Math.PI / 2 : 0, d })), q: [77, -17, 0, 43, -94, 77, 71].map((x) => x * Math.PI / 180) },
};

// ---------------------------------------------------------------- planar arms
// joints of a planar arm with link lengths L at angles q (relative): [[x0,y0], …, tip], and the tip angle
export function planar(L, q) { const P = [[0, 0]]; let a = 0, x = 0, y = 0; L.forEach((l, i) => { a += q[i]; x += l * Math.cos(a); y += l * Math.sin(a); P.push([x, y]); }); return { P, phi: a }; }
// Jacobian rows: ẋ, ẏ (and φ̇ when withPhi)
export function jacPlanar(L, q, withPhi = false) {
  const n = L.length, J = [new Array(n).fill(0), new Array(n).fill(0)]; let a = 0; const ang = q.map((qi) => (a += qi));
  for (let i = 0; i < n; i++) for (let k = i; k < n; k++) { J[0][i] -= L[k] * Math.sin(ang[k]); J[1][i] += L[k] * Math.cos(ang[k]); }
  if (withPhi) J.push(new Array(n).fill(1));
  return J;
}
// small dense linear algebra: inverse by Gauss–Jordan, J⁺ = Jᵀ(JJᵀ + λ²I)⁻¹ (λ = 0: the pseudo-inverse)
export function inv(A) {
  const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; if (Math.abs(d) < 1e-14) return null;
    for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r) => r.slice(n));
}
export function pinv(J, lambda = 0) {
  const Jt = tr(J), A = mul(J, Jt).map((r, i) => r.map((x, j) => x + (i === j ? lambda * lambda : 0))), Ai = inv(A);
  return Ai ? mul(Jt, Ai) : null;
}
// numerical rank by Gaussian elimination with partial pivoting
export function rank(A, tol = 1e-9) {
  const M = A.map((r) => [...r]); let rk = 0;
  for (let c = 0; c < M[0].length && rk < M.length; c++) {
    let p = rk; for (let i = rk + 1; i < M.length; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i;
    if (Math.abs(M[p][c]) < tol) continue;
    [M[rk], M[p]] = [M[p], M[rk]]; for (let i = rk + 1; i < M.length; i++) { const f = M[i][c] / M[rk][c]; for (let j = c; j < M[0].length; j++) M[i][j] -= f * M[rk][j]; }
    rk++;
  }
  return rk;
}
export const det2 = (J) => J[0][0] * J[1][1] - J[0][1] * J[1][0];
// eigen-decomposition of a symmetric 2×2: the axes of the manipulability ellipse of J Jᵀ
export function ellipse2(A) {
  const [[a, b], [, c]] = A, m = (a + c) / 2, d = Math.hypot((a - c) / 2, b), l1 = m + d, l2 = Math.max(0, m - d), th = 0.5 * Math.atan2(2 * b, a - c);
  return { l1, l2, th };
}

// ---------------------------------------------------------------- 2-link planar arm dynamics (vertical plane)
// uniform rods of length L and mass m (centre of mass at the middle, I = mL²/12),
// motor-side inertia ignored. B(q) q̈ + C(q, q̇) q̇ + g(q) = τ
export const ARM2 = { L: [1, 0.8], m: [5, 3], g: 9.81 };
export function dyn2(P, q, qd) {
  const [l1, l2] = P.L, [m1, m2] = P.m, c1 = l1 / 2, c2 = l2 / 2, I1 = m1 * l1 * l1 / 12, I2 = m2 * l2 * l2 / 12, cs = Math.cos(q[1]), sn = Math.sin(q[1]);
  const b11 = I1 + m1 * c1 * c1 + I2 + m2 * (l1 * l1 + c2 * c2 + 2 * l1 * c2 * cs), b12 = I2 + m2 * (c2 * c2 + l1 * c2 * cs), b22 = I2 + m2 * c2 * c2, h = -m2 * l1 * c2 * sn;
  const B = [[b11, b12], [b12, b22]], Cq = [h * qd[1] * (2 * qd[0] + qd[1]), -h * qd[0] * qd[0]];
  const g = [(m1 * c1 + m2 * l1) * P.g * Math.cos(q[0]) + m2 * c2 * P.g * Math.cos(q[0] + q[1]), m2 * c2 * P.g * Math.cos(q[0] + q[1])];
  return { B, Cq, g };
}
export function energy2(P, q, qd) {
  const { B } = dyn2(P, q, qd), [l1, l2] = P.L, [m1, m2] = P.m, K = 0.5 * dot(qd, mv(B, qd));
  const U = P.g * (m1 * l1 / 2 * Math.sin(q[0]) + m2 * (l1 * Math.sin(q[0]) + l2 / 2 * Math.sin(q[0] + q[1])));
  return K + U;
}
// one RK4 step of the arm under torque tau(t, q, qd) (+ an optional external tip force fext(q, qd) → [Fx, Fy])
export function step2(P, s, t, h, tau, fext) {
  const f = (t0, [a, b, c, d]) => {
    const q = [a, b], qd = [c, d], { B, Cq, g } = dyn2(P, q, qd), u = tau(t0, q, qd), F = fext ? fext(q, qd) : [0, 0];
    const J = jacPlanar(P.L, q), ext = [J[0][0] * F[0] + J[1][0] * F[1], J[0][1] * F[0] + J[1][1] * F[1]];
    const qdd = mv(inv(B), [u[0] + ext[0] - Cq[0] - g[0], u[1] + ext[1] - Cq[1] - g[1]]);
    return [c, d, qdd[0], qdd[1]];
  };
  const k1 = f(t, s), k2 = f(t + h / 2, s.map((x, i) => x + h / 2 * k1[i])), k3 = f(t + h / 2, s.map((x, i) => x + h / 2 * k2[i])), k4 = f(t + h, s.map((x, i) => x + h * k3[i]));
  return s.map((x, i) => x + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// ---------------------------------------------------------------- trajectories
// trapezoidal velocity profile from qi to qf in tf with cruise speed vc (|Δ|/tf < vc ≤ 2|Δ|/tf), as trapezoidal.m
export function trapezoidal(qi, qf, vc, tf, t) {
  const d = qf - qi; if (d === 0) return { q: qi, v: 0, a: 0, ok: true };
  const v = Math.sign(d) * Math.abs(vc), ok = Math.abs(v) > Math.abs(d / tf) && Math.abs(v) <= 2 * Math.abs(d / tf);
  const tc = tf - d / v, ac = v / tc;
  if (t <= 0) return { q: qi, v: 0, a: 0, ok, tc };
  if (t < tc) return { q: qi + 0.5 * ac * t * t, v: ac * t, a: ac, ok, tc };
  if (t <= tf - tc) return { q: qi + ac * tc * (t - tc / 2), v, a: 0, ok, tc };
  if (t < tf) return { q: qf - 0.5 * ac * (tf - t) ** 2, v: ac * (tf - t), a: -ac, ok, tc };
  return { q: qf, v: 0, a: 0, ok, tc };
}
// cubic (rest to rest) and quintic (rest to rest with zero acceleration at both ends)
export function cubic(qi, qf, tf, t) { const s = Math.min(1, Math.max(0, t / tf)), d = qf - qi; return { q: qi + d * (3 * s * s - 2 * s ** 3), v: d * (6 * s - 6 * s * s) / tf, a: t > 0 && t < tf ? d * (6 - 12 * s) / tf ** 2 : 0 }; }
export function quintic(qi, qf, tf, t) { const s = Math.min(1, Math.max(0, t / tf)), d = qf - qi; return { q: qi + d * (10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5), v: d * (30 * s * s - 60 * s ** 3 + 30 * s ** 4) / tf, a: d * (60 * s - 180 * s * s + 120 * s ** 3) / tf ** 2 }; }
