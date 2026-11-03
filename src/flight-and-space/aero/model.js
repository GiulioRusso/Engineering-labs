// Aerodynamics of the aeroplane: the Joukowski airfoil (potential flow, Kutta condition, pressure),
// the drag polar and power curves, the take-off and landing ground roll, and longitudinal static
// stability. SI units. Pure, no DOM.
import { isa, PLANE, G, kInduced, liftSlope } from '../flight-envelope/model.js';
export { isa, PLANE, G };

// complex numbers as [re, im]
const cm = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cd = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const ca = (a, b) => [a[0] + b[0], a[1] + b[1]], cs = (a, b) => [a[0] - b[0], a[1] - b[1]], cabs = (a) => Math.hypot(a[0], a[1]);
export const joukowski = (z) => ca(z, cd([1, 0], z));          // z = ζ + 1/ζ

// Joukowski airfoil: circle of centre μ = (−t, f) through ζ = 1, freestream U = 1 at angle α.
export function airfoil(t, f, alpha) {
  const mu = [-t, f], R = Math.hypot(1 + t, f), beta = Math.atan2(f, 1 + t), ea = [Math.cos(alpha), -Math.sin(alpha)], eb = [Math.cos(alpha), Math.sin(alpha)];
  const gamma = 4 * Math.PI * R * Math.sin(alpha + beta);  // Kutta: clockwise circulation, smooth flow off the trailing edge
  // dw/dζ = e^(−iα) − R² e^(iα)/(ζ − μ)² + iΓ/(2π(ζ − μ))
  const W = (zeta) => { const d = cs(zeta, mu); return ca(cs(ea, cd(cm([R * R, 0], eb), cm(d, d))), cd([0, gamma / (2 * Math.PI)], d)); };
  const V = (zeta) => { const dz = cs([1, 0], cd([1, 0], cm(zeta, zeta))); return cd(W(zeta), dz); };   // velocity in the airfoil plane (conjugate)
  const surf = Array.from({ length: 361 }, (_, i) => { const th = -beta + 2 * Math.PI * i / 360 + 1e-4, zeta = [mu[0] + R * Math.cos(th), mu[1] + R * Math.sin(th)], z = joukowski(zeta), v = cabs(V(zeta)); return { z, cp: 1 - v * v, v }; });
  let le = 0; surf.forEach((p, i) => { if (p.z[0] < surf[le].z[0]) le = i; });
  const chord = surf[0].z[0] - surf[le].z[0], CL = 2 * gamma / chord;
  return { mu, R, beta, gamma, W, V, surf, le, chord, xle: surf[le].z[0], CL, alpha0: -beta };
}
// streamlines traced in the circle plane (conformal maps keep them), mapped to the airfoil plane,
// each point with its travel time (for particles)
export function streamlines(A, alpha, { lines = 15, spread = 2.6, steps = 420, h = 0.035 } = {}) {
  const out = [], ea = [Math.cos(alpha), Math.sin(alpha)];
  for (let k = 0; k < lines; k++) {
    const s = -spread + 2 * spread * k / (lines - 1); let zeta = ca(A.mu, cm(ea, [-5.5, s])); const pts = [], ts = []; let t = 0;
    for (let i = 0; i < steps; i++) {
      const z = joukowski(zeta); pts.push(z); ts.push(t);
      const w = A.W(zeta), sp = cabs(w); if (sp < 1e-6) break;
      const dir = [w[0] / sp, -w[1] / sp], next = [zeta[0] + h * dir[0], zeta[1] + h * dir[1]];
      if (cabs(cs(next, A.mu)) < A.R * 1.002) break;
      const dz = cabs(cs([1, 0], cd([1, 0], cm(zeta, zeta)))); t += dz * dz * h / sp; zeta = next;
    }
    out.push({ pts, ts });
  }
  return out;
}

// Drag polar of the trainer at speed V: parasite ½ρV²S·CD0, induced kW²/(½ρV²S)
export function drag(P, V, h) {
  const { rho } = isa(h), q = 0.5 * rho * V * V, W = P.m * G, cl = W / (q * P.S), k = kInduced(P);
  return { cl, Dp: q * P.S * P.CD0, Di: q * P.S * k * cl * cl, D: q * P.S * (P.CD0 + k * cl * cl), q };
}
export function polarSpeeds(P, h) { const { rho } = isa(h), W = P.m * G, k = kInduced(P), Vmd = Math.sqrt(2 * W / (rho * P.S)) * (k / P.CD0) ** 0.25; return { Vmd, Vmp: Vmd / 3 ** 0.25, LDmax: 1 / (2 * Math.sqrt(k * P.CD0)), CLmd: Math.sqrt(P.CD0 / k) }; }

// Ground roll: m dV/dt = T − D − μ(W − L), distance over the ground at V − headwind
export const SURF = { dry: { label: 'Dry asphalt', roll: 0.02, brake: 0.4 }, wet: { label: 'Wet asphalt', roll: 0.02, brake: 0.2 }, grass: { label: 'Short grass', roll: 0.05, brake: 0.25 } };
export const thrust = (V) => 2600 * (1 - 0.3 * (V / 40) ** 2);
export function groundRoll(kind, { m, h, wind, surf }, P = PLANE, dt = 0.02) {
  const { rho } = isa(h), W = m * G, S = P.S, CLg = 0.45, Vs = Math.sqrt(2 * W / (rho * S * P.CLmax)), mu = kind === 'takeoff' ? SURF[surf].roll : SURF[surf].brake;
  const Vend = kind === 'takeoff' ? 1.1 * Vs : wind + 0.3, out = [];   // V is airspeed; the ground moves at V − headwind
  let V = kind === 'takeoff' ? Math.max(0, wind) : 1.15 * Vs, x = 0, t = 0;
  const F = (v) => { const q = 0.5 * rho * v * v, L = q * S * CLg, D = q * S * (P.CD0 + kInduced(P) * CLg * CLg + (kind === 'landing' ? 0.02 : 0)), T = kind === 'takeoff' ? thrust(v) : 0, Fr = mu * Math.max(0, W - L); return { T, D, Fr, L, net: T - D - Fr }; };
  for (let i = 0; i < 20000; i++) {
    out.push({ t, x, V, ...F(V) });
    if (kind === 'takeoff' ? V >= Vend : V <= Vend) break;
    if (kind === 'takeoff' && F(V).net <= 0) return { out, Vs, Vend, x, t, fail: true };
    const k1 = F(V).net / m, k2 = F(V + 0.5 * dt * k1).net / m, a = k2; x += dt * (V + 0.5 * dt * a - wind); V += dt * a; t += dt;
  }
  return { out, Vs, Vend, x, t, fail: false };
}

// Longitudinal static stability (MAC c̄ = 1.5 m, tail arm 4.5 m): Cm about the CG, Cm = Cm0 + Cmα α
export const WING = { a: liftSlope(PLANE.AR), hac: 0.25, at: 3.5, deps: 0.4, it: -4 * Math.PI / 180, tau: 0.45, Cmac: -0.05 };
export function longitudinal(h, VH, de, Wg = WING) {
  const hn = Wg.hac + VH * (Wg.at / Wg.a) * (1 - Wg.deps), Cma = Wg.a * (h - hn), Cm0 = Wg.Cmac - VH * Wg.at * (Wg.it - Wg.tau * de);
  const aTrim = Cma < 0 ? -Cm0 / Cma : NaN;   // α measured from zero lift
  return { hn, Cma, Cm0, margin: hn - h, aTrim, CLtrim: Wg.a * aTrim, Cm: (a) => Cm0 + Cma * a };
}
// pitch disturbance after a gust: Δα'' = K·Cmα·Δα − c·Δα'
export function gust(Cma, d0 = 3 * Math.PI / 180, T = 6, dt = 0.01) {
  const K = 12, c = 3.2, out = []; let a = d0, w = 0;
  for (let t = 0; t <= T + 1e-9; t += dt) { out.push([t, a]); const acc = K * Cma * a - c * w; w += dt * acc; a += dt * w; if (Math.abs(a) > 1) break; }
  return out;
}
