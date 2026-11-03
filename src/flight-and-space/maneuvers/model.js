// Orbital manoeuvres: Hohmann against bi-elliptic over the radius ratio, plane changes (and where to do
// them), rendezvous in the target's frame (Clohessy–Wiltshire), escape and patched conics to the
// planets. SI units unless stated. Pure, no DOM.
import { MU, RE } from '../orbits/model.js';
export { MU, RE };

// circular orbit radius 1, μ = 1: Δv in units of the starting circular speed
const vv = (r, a) => Math.sqrt(2 / r - 1 / a);
export function hohmannN(R) { const a = (1 + R) / 2; return { dv: [vv(1, a) - 1, Math.sqrt(1 / R) - vv(R, a)], tof: Math.PI * Math.sqrt(a ** 3) }; }
export function biN(R, Rb) { const a1 = (1 + Rb) / 2, a2 = (R + Rb) / 2; return { dv: [vv(1, a1) - 1, vv(Rb, a2) - vv(Rb, a1), vv(R, a2) - Math.sqrt(1 / R)], tof: Math.PI * (Math.sqrt(a1 ** 3) + Math.sqrt(a2 ** 3)) }; }
export const total = (T) => T.dv.reduce((s, d) => s + Math.abs(d), 0);
export const biLimit = (R) => (Math.SQRT2 - 1) * (1 + 1 / Math.sqrt(R));       // r_b → ∞
// radius ratio where two Δv curves cross (bisection on [lo, hi])
export function crossover(f, lo = 2, hi = 100) { for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; } return (lo + hi) / 2; }

// plane change: rotate velocity v by Δi costs 2v sin(Δi/2); combined with a speed change v1 → v2: law of cosines
export const planeDv = (v, di) => 2 * v * Math.sin(di / 2);
export const combined = (v1, v2, di) => Math.sqrt(v1 * v1 + v2 * v2 - 2 * v1 * v2 * Math.cos(di));
// LEO r1 → GEO-like r2 with inclination change di, a share s of it done at the perigee burn
export function transferPlane(r1, r2, di, s) {
  const a = (r1 + r2) / 2, vc1 = Math.sqrt(MU / r1), vp = Math.sqrt(MU * (2 / r1 - 1 / a)), va = Math.sqrt(MU * (2 / r2 - 1 / a)), vc2 = Math.sqrt(MU / r2);
  const d1 = combined(vc1, vp, s * di), d2 = combined(va, vc2, (1 - s) * di);
  return { d1, d2, total: d1 + d2, vc1, vp, va, vc2 };
}
export function bestSplit(r1, r2, di) { let best = { s: 0, total: Infinity }; for (let k = 0; k <= 400; k++) { const s = k / 400, T = transferPlane(r1, r2, di, s).total; if (T < best.total) best = { s, total: T }; } return best; }

// Clohessy–Wiltshire: x radial (up), y along-track (ahead), target on a circular orbit of mean motion n
export function cw(s0, n, t) {
  const [x0, y0, vx, vy] = s0, c = Math.cos(n * t), s = Math.sin(n * t);
  return [(4 - 3 * c) * x0 + (s / n) * vx + (2 / n) * (1 - c) * vy,
    6 * (s - n * t) * x0 + y0 - (2 / n) * (1 - c) * vx + ((4 * s - 3 * n * t) / n) * vy,
    3 * n * s * x0 + c * vx + 2 * s * vy,
    -6 * n * (1 - c) * x0 - 2 * s * vx + (4 * c - 3) * vy];
}
// velocity at t = 0 that brings (x0, y0) to the origin at time T (two-impulse rendezvous)
export function rendezvousV(x0, y0, n, T) {
  const c = Math.cos(n * T), s = Math.sin(n * T);
  const a = s / n, b = (2 / n) * (1 - c), cc = -(2 / n) * (1 - c), d = (4 * s - 3 * n * T) / n;   // [x; y] = Φrr r0 + Φrv v0
  const rx = -((4 - 3 * c) * x0), ry = -(6 * (s - n * T) * x0 + y0), det = a * d - b * cc;
  return [(d * rx - b * ry) / det, (a * ry - cc * rx) / det];
}
export const meanMotion = (alt) => Math.sqrt(MU / (RE + alt) ** 3);

// patched conics: Hohmann from the Earth's orbit to a planet's, then the escape burn from a parking orbit
export const MU_SUN = 1.32712440018e20, AU = 1.495978707e11;
export const PLANETS = { mercury: { label: 'Mercury', a: 0.387 }, venus: { label: 'Venus', a: 0.723 }, mars: { label: 'Mars', a: 1.524 }, jupiter: { label: 'Jupiter', a: 5.203 }, saturn: { label: 'Saturn', a: 9.537 } };
export function interplanetary(aP, alt) {
  const r1 = AU, r2 = aP * AU, at = (r1 + r2) / 2, vE = Math.sqrt(MU_SUN / r1), vdep = Math.sqrt(MU_SUN * (2 / r1 - 1 / at)), vP = Math.sqrt(MU_SUN / r2), varr = Math.sqrt(MU_SUN * (2 / r2 - 1 / at));
  const vinf = Math.abs(vdep - vE), rp = RE + alt, vc = Math.sqrt(MU / rp), vesc = Math.SQRT2 * vc, vhyp = Math.sqrt(vinf * vinf + vesc * vesc);
  const tof = Math.PI * Math.sqrt(at ** 3 / MU_SUN), nP = Math.sqrt(MU_SUN / r2 ** 3);
  return { vinf, vinfArr: Math.abs(vP - varr), C3: vinf * vinf, vc, vesc, vhyp, dv: vhyp - vc, tof, phase: ((Math.PI - nP * tof) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI, at, r2, outward: aP > 1 };
}
export const escapeDv = (vinf, r) => Math.sqrt(vinf * vinf + 2 * MU / r) - Math.sqrt(MU / r);
export const SOI_EARTH = AU * (3.003e-6) ** 0.4;   // a (m/M)^(2/5) ≈ 925 000 km
