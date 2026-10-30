// Dynamics and motion control of a two-link arm in a vertical plane: free motion, PD control with gravity
// compensation (as the course's main07), and computed torque (inverse dynamics) with a model error.
import { ARM2, dyn2, step2, energy2, quintic, mv } from '../kin/model.js';

const scaled = (k) => ({ ...ARM2, m: ARM2.m.map((x) => x * k) }); // the controller's model of the arm
// a fast move between two postures (quintic, tf seconds), then hold
export const reference = (q0, q1, tf) => (t) => { const a = quintic(q0[0], q1[0], tf, t), b = quintic(q0[1], q1[1], tf, t); return { q: [a.q, b.q], v: [a.v, b.v], a: [a.a, b.a] }; };

// mode: 'free' | 'pd' (set point) | 'pdt' (PD + ĝ along the moving reference) | 'ct'. gcomp: add ĝ(q) to PD. err: relative error of the controller's masses
export function simulate({ mode, q0, q1 = q0, Kp = 100, Kd = 20, gcomp = true, err = 0, tf = 1.5, T = 4, damping = 0, h = 1e-3, every = 10 }) {
  const M = scaled(1 - err), ref = reference(q0, q1, mode === 'pd' ? 1e-9 : tf), out = [];
  let s = [q0[0], q0[1], 0, 0], t = 0, k = 0;
  const law = (tt, q, qd) => {
    if (mode === 'free') return [-damping * qd[0], -damping * qd[1]];
    const r = mode === 'pd' ? { q: q1, v: [0, 0], a: [0, 0] } : ref(tt), e = [r.q[0] - q[0], r.q[1] - q[1]], ed = [r.v[0] - qd[0], r.v[1] - qd[1]], Mh = dyn2(M, q, qd);
    if (mode !== 'ct') return [Kp * e[0] + Kd * ed[0] + (gcomp ? Mh.g[0] : 0), Kp * e[1] + Kd * ed[1] + (gcomp ? Mh.g[1] : 0)];
    const y = [r.a[0] + Kd * ed[0] + Kp * e[0], r.a[1] + Kd * ed[1] + Kp * e[1]], By = mv(Mh.B, y);
    return [By[0] + Mh.Cq[0] + Mh.g[0], By[1] + Mh.Cq[1] + Mh.g[1]];
  };
  while (t <= T + 1e-9) {
    if (k % every === 0) {
      const q = [s[0], s[1]], qd = [s[2], s[3]], { B } = dyn2(ARM2, q, qd), r = mode === 'free' ? null : mode === 'pd' ? { q: q1 } : ref(t);
      const E = energy2(ARM2, q, qd), K = 0.5 * (qd[0] * (B[0][0] * qd[0] + B[0][1] * qd[1]) + qd[1] * (B[1][0] * qd[0] + B[1][1] * qd[1]));
      out.push({ t, q, qd, tau: law(t, q, qd), ref: r ? r.q : null, e: r ? [r.q[0] - q[0], r.q[1] - q[1]] : [0, 0], K, U: E - K, E, B });
    }
    s = step2(ARM2, s, t, h, law); t += h; k++;
  }
  return out;
}
// steady-state error of PD without gravity compensation: Kp e = g(q) at rest (fixed point by iteration)
export function pdOffset(q1, Kp) { let q = [...q1]; for (let i = 0; i < 200; i++) { const g = dyn2(ARM2, q, [0, 0]).g; q = [q1[0] - g[0] / Kp, q1[1] - g[1] / Kp]; } return q; }
export { ARM2, dyn2 };
