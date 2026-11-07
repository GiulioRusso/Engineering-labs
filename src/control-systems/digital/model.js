// Digital control: sampling maps the s-plane to the z-plane (z = e^{sT}); a second-order system sampled
// with a zero-order hold is exact at the samples; and a PD controller run by a computer every T seconds
// on a motor (1 / (s(s + 1))) against the same controller in continuous time. Pure, no DOM.

export const s2z = ([re, im], T) => [Math.exp(re * T) * Math.cos(im * T), Math.exp(re * T) * Math.sin(im * T)];
export const poles2 = (wn, zeta) => (Math.abs(zeta) < 1 ? [[-zeta * wn, wn * Math.sqrt(1 - zeta * zeta)], [-zeta * wn, -wn * Math.sqrt(1 - zeta * zeta)]] : [[-zeta * wn + wn * Math.sqrt(zeta * zeta - 1), 0], [-zeta * wn - wn * Math.sqrt(zeta * zeta - 1), 0]]);
// unit-step response of ωn² / (s² + 2ζωn s + ωn²), continuous (fine RK4), and its exact zero-order-hold
// discretisation run sample by sample (matrix exponential by a fine sub-integration)
function rhs(x, u, wn, z) { return [x[1], wn * wn * (u - x[0]) - 2 * z * wn * x[1]]; }
function rk(x, u, wn, z, h) { const k1 = rhs(x, u, wn, z), k2 = rhs(x.map((v, i) => v + h / 2 * k1[i]), u, wn, z), k3 = rhs(x.map((v, i) => v + h / 2 * k2[i]), u, wn, z), k4 = rhs(x.map((v, i) => v + h * k3[i]), u, wn, z); return x.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); }
export function stepCont(wn, zeta, Tend, dt = 0.002) { const t = [], y = []; let x = [0, 0]; for (let i = 0; i <= Tend / dt; i++) { t.push(i * dt); y.push(x[0]); x = rk(x, 1, wn, zeta, dt); } return { t, y }; }
export function stepSampled(wn, zeta, T, Tend) {
  // Φ and Γ of the hold-equivalent: integrate the unit responses over one sample
  const sub = 200, h = T / sub, run = (x0, u) => { let x = x0; for (let i = 0; i < sub; i++) x = rk(x, u, wn, zeta, h); return x; };
  const c1 = run([1, 0], 0), c2 = run([0, 1], 0), g = run([0, 0], 1), Phi = [[c1[0], c2[0]], [c1[1], c2[1]]];
  const k = [], y = []; let x = [0, 0];
  for (let n = 0; n * T <= Tend; n++) { k.push(n * T); y.push(x[0]); x = [Phi[0][0] * x[0] + Phi[0][1] * x[1] + g[0], Phi[1][0] * x[0] + Phi[1][1] * x[1] + g[1]]; }
  return { t: k, y, Phi };
}
// closed loop: motor θ'' = −θ' + u, PD control u = Kp e + Kd ė with e = r − θ; continuous, or computed
// every T from the sampled θ (backward-difference derivative) and held until the next sample
export function pdLoop(Kp, Kd, T, Tend = 10, dt = 0.001) {
  const t = [], y = [], u = []; let x = [0, 0], held = 0, ePrev = 1, next = 0;
  for (let i = 0; i <= Math.round(Tend / dt); i++) {
    const tt = i * dt, e = 1 - x[0];
    if (!T) held = Kp * e - Kd * x[1];
    else if (tt >= next - 1e-12) { held = Kp * e + Kd * (e - ePrev) / T; ePrev = e; next += T; }
    t.push(tt); y.push(x[0]); u.push(held);
    const f = (s) => [s[1], -s[1] + held], k1 = f(x), k2 = f(x.map((v, j) => v + dt / 2 * k1[j])), k3 = f(x.map((v, j) => v + dt / 2 * k2[j])), k4 = f(x.map((v, j) => v + dt * k3[j]));
    x = x.map((v, j) => v + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    if (!Number.isFinite(x[0]) || Math.abs(x[0]) > 1e3) break;
  }
  return { t, y, u };
}
export const overshoot = (y) => Math.max(0, Math.max(...y) - 1);
