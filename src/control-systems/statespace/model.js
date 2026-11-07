// State space on a mass–spring–damper (x = [position, velocity], u = force, y = position): the free
// response and its eigenvalues, pole placement by state feedback, and state estimation from a noisy
// position, with a Luenberger observer or a steady-state Kalman filter. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

export const plant = (m, k, c) => ({ A: [[0, 1], [-k / m, -c / m]], B: [0, 1 / m], C: [1, 0] });
// eigenvalues of a 2 × 2 matrix, as [re, im] pairs
export function eig2(A) {
  const tr = A[0][0] + A[1][1], det = A[0][0] * A[1][1] - A[0][1] * A[1][0], d = tr * tr / 4 - det;
  return d >= 0 ? [[tr / 2 + Math.sqrt(d), 0], [tr / 2 - Math.sqrt(d), 0]] : [[tr / 2, Math.sqrt(-d)], [tr / 2, -Math.sqrt(-d)]];
}
const f = (A, B, x, u) => [A[0][0] * x[0] + A[0][1] * x[1] + B[0] * u, A[1][0] * x[0] + A[1][1] * x[1] + B[1] * u];
// RK4 of x' = A x + B u(t, x) over [0, T]
export function simulate(A, B, x0, u, T, dt = 0.005) {
  const t = [0], X = [[...x0]], U = [u(0, x0)]; let x = [...x0];
  for (let i = 1; i <= Math.round(T / dt); i++) {
    const s = (i - 1) * dt, F = (tt, xx) => f(A, B, xx, u(tt, xx)), k1 = F(s, x), k2 = F(s + dt / 2, x.map((v, j) => v + dt / 2 * k1[j])), k3 = F(s + dt / 2, x.map((v, j) => v + dt / 2 * k2[j])), k4 = F(s + dt, x.map((v, j) => v + dt * k3[j]));
    x = x.map((v, j) => v + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); t.push(i * dt); X.push([...x]); U.push(u(i * dt, x));
  }
  return { t, X, U };
}
// state feedback u = −K x + N r placing the closed-loop poles at ωn, ζ (companion form of this plant);
// N makes the position settle at r
export function place(m, k, c, wn, zeta) { const K = [m * wn * wn - k, 2 * m * zeta * wn - c]; return { K, N: m * wn * wn }; }
// observer gain L putting the poles of A − L C at ωo, ζo
export function observerGain(A, wo, zo = 0.8) { return [2 * zo * wo + A[1][1], wo * wo + A[1][0] + A[1][1] * (2 * zo * wo + A[1][1])]; }
// steady-state Kalman gain for the sampled system (step DT, the one simulated): process noise of intensity q
// on the acceleration, measurement noise of rms σ. Iterates the discrete Riccati equation to rest and returns
// the equivalent continuous gain L = K / DT, and P
export function kalmanGain(A, q, sigma, dt = 0.005) {
  const F = [[1 + A[0][0] * dt, A[0][1] * dt], [A[1][0] * dt, 1 + A[1][1] * dt]], R = Math.max(sigma, 1e-4) ** 2; let P = [[1, 0], [0, 1]], K = [0, 0];
  for (let i = 0; i < 100000; i++) {
    const FP = [[F[0][0] * P[0][0] + F[0][1] * P[1][0], F[0][0] * P[0][1] + F[0][1] * P[1][1]], [F[1][0] * P[0][0] + F[1][1] * P[1][0], F[1][0] * P[0][1] + F[1][1] * P[1][1]]];
    const M = [[FP[0][0] * F[0][0] + FP[0][1] * F[0][1], FP[0][0] * F[1][0] + FP[0][1] * F[1][1]], [FP[1][0] * F[0][0] + FP[1][1] * F[0][1], FP[1][0] * F[1][0] + FP[1][1] * F[1][1] + q * dt]];
    const Kn = [M[0][0] / (M[0][0] + R), M[1][0] / (M[0][0] + R)], Pn = [[(1 - Kn[0]) * M[0][0], (1 - Kn[0]) * M[0][1]], [M[1][0] - Kn[1] * M[0][0], M[1][1] - Kn[1] * M[0][1]]];
    const d = Math.abs(Kn[0] - K[0]) + Math.abs(Kn[1] - K[1]); P = Pn; K = Kn; if (i > 10 && d < 1e-14) break;
  }
  return { L: [K[0] / dt, K[1] / dt], K, P };
}
// estimation run: the plant is pushed by a known force u and an unknown disturbance w (filtered noise of
// rms `dist`, time constant TAU); the position is measured with noise σ every dt. The observer knows u, not w.
// Also the naive velocity from differencing the measurement.
export const TAU = 0.5, DT = 0.005;
// the Kalman noise intensities that match that disturbance and that measurement noise
export const noiseModel = (m, dist) => 2 * dist * dist * TAU / (m * m);
export function estimate(m, k, c, L, sigma, T = 10, seed = 3, dist = 0, force = (t) => Math.sin(1.3 * t) + 0.5 * Math.sin(3.1 * t)) {
  const { A, B } = plant(m, k, c), dt = DT, r = rng(seed), n = Math.round(T / dt); let x = [0.5, 0], xh = [0, 0], w = 0;
  const out = { t: [], x: [], xh: [], y: [], vd: [], w: [] }; let yPrev = 0;
  for (let i = 0; i <= n; i++) {
    const t = i * dt, u = force(t), y = x[0] + sigma * gauss(r);
    out.t.push(t); out.x.push([...x]); out.xh.push([...xh]); out.y.push(y); out.vd.push(i ? (y - yPrev) / dt : 0); out.w.push(w); yPrev = y;
    const dx = f(A, B, x, u + w), e = y - xh[0], dxh = f(A, B, xh, u).map((v, j) => v + L[j] * e);
    x = x.map((v, j) => v + dt * dx[j]); xh = xh.map((v, j) => v + dt * dxh[j]);
    w += -w * dt / TAU + dist * Math.sqrt(2 * dt / TAU) * gauss(r);
  }
  return out;
}
