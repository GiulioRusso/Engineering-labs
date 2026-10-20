// Two- and three-impulse transfers between circular orbits, and the rocket equation. SI units.
import { MU } from '../orbits/model.js';
export const G0 = 9.80665;
const v = (r, a) => Math.sqrt(MU * (2 / r - 1 / a));   // vis-viva

export function hohmann(r1, r2) {
  const at = (r1 + r2) / 2, dv1 = v(r1, at) - v(r1, r1), dv2 = v(r2, r2) - v(r2, at);
  return { dv: [dv1, dv2], total: Math.abs(dv1) + Math.abs(dv2), tof: Math.PI * Math.sqrt(at ** 3 / MU), arcs: [{ rp: r1, ra: r2 }] };
}
// Out to rb on a first ellipse, raise perigee to r2 there, then come down and circularise at r2.
export function bielliptic(r1, r2, rb) {
  const a1 = (r1 + rb) / 2, a2 = (r2 + rb) / 2;
  const dv1 = v(r1, a1) - v(r1, r1), dv2 = v(rb, a2) - v(rb, a1), dv3 = v(r2, r2) - v(r2, a2);
  return { dv: [dv1, dv2, dv3], total: Math.abs(dv1) + Math.abs(dv2) + Math.abs(dv3), tof: Math.PI * (Math.sqrt(a1 ** 3 / MU) + Math.sqrt(a2 ** 3 / MU)), arcs: [{ rp: r1, ra: rb }, { rp: r2, ra: rb }] };
}
// Tsiolkovsky: propellant needed to give Δv to a dry mass with specific impulse Isp (s).
export const propellant = (dv, isp, mDry) => mDry * (Math.exp(dv / (isp * G0)) - 1);
