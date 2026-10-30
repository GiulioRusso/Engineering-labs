// Impedance control in contact, as in the Jaco2 project's task 4 (Siciliano et al., §9.3), on a two-link arm
// in a horizontal plane. The tip is made to behave like a mass–spring–damper (M_d, K_D, K_P) attached to a
// desired point that is pushed into a compliant wall of stiffness k.
import { ARM2, dyn2, step2, jacPlanar, planar, inv, mv, trapezoidal } from '../kin/model.js';
import { ik2 } from '../planar/model.js';

export const ARM = { ...ARM2, g: 0 }, START = [1.2, 0], WALL = 1.2; // the wall passes through the rest position
export const q0 = () => ik2(ARM.L, ...START).sols[1];
const jdqd = (L, q, qd) => { const s = qd[0] + qd[1], c1 = Math.cos(q[0]), s1 = Math.sin(q[0]), c12 = Math.cos(q[0] + q[1]), s12 = Math.sin(q[0] + q[1]); return [-L[0] * c1 * qd[0] ** 2 - L[1] * c12 * s * s, -L[0] * s1 * qd[0] ** 2 - L[1] * s12 * s * s]; };

// push: how far the desired point goes into the wall (m), over tp seconds (trapezoidal, cruise 1.5 Δ/tp)
export function simulate({ Md = 1, Kd = 40, Kp = 400, k = 2000, push = 0.05, tp = 2, wall = true, T = 6, h = 5e-4, every = 20 }) {
  const fenv = (q) => { const x = planar(ARM.L, q).P[2][0]; return wall && x > WALL ? [-k * (x - WALL), 0] : [0, 0]; };
  const ref = (t) => { const u = trapezoidal(0, push, 1.5 * push / tp, tp, t); return { p: [START[0] + u.q, START[1]], v: [u.v, 0], a: [u.a, 0] }; };
  const law = (t, q, qd) => {
    const r = ref(t), J = jacPlanar(ARM.L, q), P = planar(ARM.L, q).P[2], v = mv(J, qd), F = fenv(q);
    const acmd = [0, 1].map((i) => r.a[i] + (Kd * (r.v[i] - v[i]) + Kp * (r.p[i] - P[i]) + F[i]) / Md), b = jdqd(ARM.L, q, qd);
    const qdd = mv(inv(J), [acmd[0] - b[0], acmd[1] - b[1]]), { B, Cq, g } = dyn2(ARM, q, qd), Bq = mv(B, qdd), JtF = [J[0][0] * F[0] + J[1][0] * F[1], J[0][1] * F[0] + J[1][1] * F[1]];
    return [Bq[0] + Cq[0] + g[0] - JtF[0], Bq[1] + Cq[1] + g[1] - JtF[1]];
  };
  let s = [...q0(), 0, 0], t = 0, n = 0; const out = [];
  while (t <= T + 1e-9) {
    if (n % every === 0) { const q = [s[0], s[1]], P = planar(ARM.L, q).P, r = ref(t); out.push({ t, q, x: P[2], xd: r.p, f: -fenv(q)[0], tau: law(t, q, [s[2], s[3]]) }); }
    s = step2(ARM, s, t, h, law, fenv); t += h; n++;
  }
  return out;
}
export const steadyForce = (Kp, k, push) => Kp * k * push / (Kp + k);
export const zeta = (Md, Kd, Kp, k = 0) => Kd / (2 * Math.sqrt((Kp + k) * Md));
