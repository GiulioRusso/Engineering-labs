// Rockets: the Tsiolkovsky equation, staging, and a gravity-turn ascent with its gravity and drag losses.
// SI units. Pure, no DOM.
import { MU, RE } from '../orbits/model.js';

export const G0 = 9.80665;
export const deltaV = (isp, R) => isp * G0 * Math.log(R); // R = m0/mf, the mass ratio

// constant thrust in empty space: propellant fraction ζ burnt in tb seconds; speed and acceleration at t
export function burn(isp, zeta, tb, t) {
  const f = 1 - zeta * Math.min(t, tb) / tb, ve = isp * G0;
  return { v: -ve * Math.log(f), a: t < tb ? ve * zeta / tb / f : 0, mass: f };
}

// n identical stages, structural ratio ε = structure/(structure + propellant), to reach dv: payload share of
// the lift-off mass and the stages' masses for 1 kg of payload (top stage first)
export function staging(n, eps, isp, dv) {
  const R = Math.exp(dv / (n * isp * G0)), pi = (1 / R - eps) / (1 - eps);
  if (!(pi > 0)) return { R, pi, payload: 0, lift: Infinity, stages: [] };
  const stages = []; let above = 1;
  for (let i = 0; i < n; i++) { const m = above * (1 / pi - 1); stages.push({ struct: eps * m, prop: (1 - eps) * m, below: above }); above += m; }
  return { R, pi, payload: pi ** n, lift: above, stages };
}
// most Δv any single stage can give: when it carries no payload at all
export const maxDv = (eps, isp) => isp * G0 * Math.log(1 / eps);

// gravity turn from the ground: vertical climb up to speed vk, a pitch kick, then thrust along the velocity.
// Round, non-rotating Earth, exponential atmosphere. Returns samples and the loss integrals at burnout.
export const ROCKET = { m0: 100e3, A: 10, Cd: 0.3, isp: 350, zeta: 0.92 };
export const rho = (h) => 1.225 * Math.exp(-Math.max(h, 0) / 8500);
export function ascent({ TW, kick, vk = 60 }, P = ROCKET, { dt = 0.1, coast = 1500 } = {}) {
  const T = TW * P.m0 * G0, mdot = T / (P.isp * G0), tb = P.zeta * P.m0 / mdot;
  let x = 0, y = RE, vx = 0, vy = 0, m = P.m0, t = 0, ideal = 0, grav = 0, drag = 0, kicked = false, qmax = 0, out = [], bo = null;
  const f = (s, thrusting) => {
    const [px, py, ux, uy, mm] = s, r = Math.hypot(px, py), v = Math.hypot(ux, uy), h = r - RE, D = 0.5 * rho(h) * v * v * P.Cd * P.A;
    const dir = v > 1e-6 ? [ux / v, uy / v] : [px / r, py / r], g = MU / (r * r), Th = thrusting ? T : 0;
    return { d: [ux, uy, (Th - D) / mm * dir[0] - g * px / r, (Th - D) / mm * dir[1] - g * py / r, thrusting ? -mdot : 0], th: Th / mm, dg: g * (dir[0] * px + dir[1] * py) / r, dd: D / mm, q: 0.5 * rho(h) * v * v };
  };
  while (t < tb + coast) {
    if (!kicked && Math.hypot(vx, vy) >= vk) { const v = Math.hypot(vx, vy), k = kick * Math.PI / 180, r = Math.hypot(x, y), up = [x / r, y / r], east = [up[1], -up[0]]; vx = v * (Math.cos(k) * up[0] + Math.sin(k) * east[0]); vy = v * (Math.cos(k) * up[1] + Math.sin(k) * east[1]); kicked = true; }
    const on = t < tb, h = on ? Math.min(dt, tb - t) || dt : dt * 5, s = [x, y, vx, vy, m];
    const a = f(s, on), b = f(s.map((q, i) => q + h / 2 * a.d[i]), on), c = f(s.map((q, i) => q + h / 2 * b.d[i]), on), d = f(s.map((q, i) => q + h * c.d[i]), on);
    if (on) { ideal += h / 6 * (a.th + 2 * b.th + 2 * c.th + d.th); grav += h / 6 * (a.dg + 2 * b.dg + 2 * c.dg + d.dg); drag += h / 6 * (a.dd + 2 * b.dd + 2 * c.dd + d.dd); qmax = Math.max(qmax, a.q); }
    [x, y, vx, vy, m] = s.map((q, i) => q + h / 6 * (a.d[i] + 2 * b.d[i] + 2 * c.d[i] + d.d[i])); t += h;
    const r = Math.hypot(x, y), v = Math.hypot(vx, vy), gam = Math.asin(Math.max(-1, Math.min(1, (vx * x + vy * y) / (r * v || 1)))) * 180 / Math.PI;
    out.push({ t, down: RE * Math.atan2(x, y), h: r - RE, v, gam, q: 0.5 * rho(r - RE) * v * v, on: t <= tb + 1e-9 });
    if (!bo && (t >= tb - 1e-9 || r < RE)) bo = { t, h: r - RE, v, gam, ideal, grav, drag, qmax, eps: v * v / 2 - MU / r, crashed: r < RE };
    if (r < RE && t > 1) break;
  }
  return { out, bo, tb };
}
