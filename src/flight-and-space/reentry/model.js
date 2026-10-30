// Atmospheric entry: a capsule falling into an exponential atmosphere from 120 km. Point mass, round
// non-rotating Earth, drag and optional lift. Sutton–Graves stagnation-point heating. SI units.
import { MU, RE } from '../orbits/model.js';

export const RHO0 = 1.225, H = 7200, KSG = 1.7415e-4, G0 = 9.80665;
export const rho = (h) => RHO0 * Math.exp(-h / H);
export const heatFlux = (h, v, rn = 1) => KSG * Math.sqrt(rho(h) / rn) * v ** 3; // W/m²

// v0 entry speed, gam0 entry angle (°, negative = down), beta = m/(C_D A) (kg/m²), LD lift-to-drag
export function entry({ v0, gam0, beta, LD = 0 }, { h0 = 120e3, dt = 0.05, tMax = 3000, gravity = true, curved = true } = {}) {
  let v = v0, g = gam0 * Math.PI / 180, h = h0, s = 0, t = 0, Q = 0;
  const f = (v, g, h) => {
    const r = RE + h, gr = gravity ? MU / (r * r) : 0, D = rho(h) * v * v / (2 * beta);
    return [-D - gr * Math.sin(g), (LD * D - gr * Math.cos(g) + (curved ? v * v * Math.cos(g) / r : 0)) / v, v * Math.sin(g), v * Math.cos(g) * RE / r, D];
  };
  const out = [];
  let peakG = 0, peakQ = 0, left = false;
  while (t < tMax && h > 0 && v > 50) {
    const k1 = f(v, g, h), k2 = f(v + dt / 2 * k1[0], g + dt / 2 * k1[1], h + dt / 2 * k1[2]), k3 = f(v + dt / 2 * k2[0], g + dt / 2 * k2[1], h + dt / 2 * k2[2]), k4 = f(v + dt * k3[0], g + dt * k3[1], h + dt * k3[2]);
    const q = heatFlux(h, v);
    v += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); g += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); h += dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]); s += dt / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
    t += dt; Q += q * dt;
    const a = rho(h) * v * v / (2 * beta) * Math.sqrt(1 + LD * LD) / G0;
    peakG = Math.max(peakG, a); peakQ = Math.max(peakQ, heatFlux(h, v));
    out.push({ t, v, gam: g * 180 / Math.PI, h, s, a, q: heatFlux(h, v) });
    if (h > h0 + 1) { left = true; break; } // skipped back out of the atmosphere
  }
  return { out, peakG, peakQ, Q, skipped: left, end: out.at(-1) };
}
// Allen–Eggers: straight line, no gravity: speed against altitude, and the peak deceleration
export const allenEggers = (v0, gam0, beta, h) => v0 * Math.exp(-RHO0 * H * Math.exp(-h / H) / (2 * beta * Math.abs(Math.sin(gam0 * Math.PI / 180))));
export const aePeak = (v0, gam0) => v0 * v0 * Math.abs(Math.sin(gam0 * Math.PI / 180)) / (2 * Math.E * H);
