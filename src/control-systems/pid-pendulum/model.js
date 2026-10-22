// A motor holds a rod upright (inverted pendulum, torque at the pivot) under PID control. Pure, no DOM.
// θ from the vertical (rad); m θ̈ L² = m g L sin θ − b θ̇ + τ_motor + τ_disturbance
// controller (setpoint 0), running at 1 kHz on the measured angle (with noise):
//   τ = −Kp·θm − Ki·∫θm dt − Kd·dθm/dt (derivative filtered, time constant 10 ms), clamped to ±τmax
import { rng } from '../../maths/probability/model.js';
export const G = 9.81;

export function simulate(s, T = 10, dt = 1e-3) {
  const I = s.m * s.L * s.L, r = rng(7), n = Math.round(T / dt);
  const out = { t: new Float64Array(n + 1), th: new Float64Array(n + 1), tau: new Float64Array(n + 1), sat: new Uint8Array(n + 1), fell: null };
  let th = s.th0, w = 0, integ = 0, prev = s.th0, dfilt = 0;
  const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  for (let k = 0; k <= n; k++) {
    const t = k * dt, meas = th + (s.noise || 0) * gauss();
    dfilt += ((meas - prev) / dt - dfilt) * (dt / (0.01 + dt)); prev = meas;
    let tau = -(s.Kp * meas + s.Ki * integ + s.Kd * dfilt);
    const sat = Math.abs(tau) > s.tmax; if (sat) tau = Math.sign(tau) * s.tmax;
    if (!(sat && s.aw && Math.sign(meas) === Math.sign(integ || meas))) integ += meas * dt; // anti-windup: stop integrating while saturated
    const dist = (t >= 1 && t < 1.1 ? s.push : 0) + (t >= 3 ? s.load : 0);
    out.t[k] = t; out.th[k] = th; out.tau[k] = tau; out.sat[k] = sat ? 1 : 0;
    if (out.fell == null && Math.abs(th) > Math.PI / 2) out.fell = t;
    if (out.fell != null) { th = Math.sign(th) * Math.PI / 2; w = 0; continue; } // it rests on the floor
    const acc = (s.m * G * s.L * Math.sin(th) - s.b * w + tau + dist) / I; // semi-implicit Euler at 1 kHz
    w += acc * dt; th += w * dt;
  }
  return out;
}
