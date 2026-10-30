// The air an aircraft flies in, how far it glides, and how far it cruises on its fuel. SI units.
import { isa, G, R_AIR, PLANE, kInduced } from '../flight-envelope/model.js';

export { isa, G };
export const sound = (h) => Math.sqrt(1.4 * R_AIR * isa(h).T);
export const CRAFT = {
  trainer: { label: 'Light aircraft', ...PLANE },
  glider: { label: 'Sailplane', m: 450, S: 11, AR: 22, e: 0.9, CD0: 0.011, CLmax: 1.4 },
};
// steady glide at airspeed V (small angle): sink speed, glide ratio through the air and over the ground
export function glide(P, V, h = 0, wind = 0) {
  const { rho } = isa(h), cl = 2 * P.m * G / (rho * V * V * P.S), cd = P.CD0 + kInduced(P) * cl * cl, sink = V * cd / cl;
  return { cl, cd, sink, LD: cl / cd, ground: (V - wind) / sink, stalled: cl > P.CLmax };
}
export const bestGlideV = (P, h = 0) => Math.sqrt(2 * P.m * G / (isa(h).rho * P.S * Math.sqrt(P.CD0 / kInduced(P))));
export const minSinkV = (P, h = 0) => bestGlideV(P, h) / Math.pow(3, 0.25);
// fastest-over-the-ground glide into a headwind: maximise (V − w)/sink by a scan
export function speedToFly(P, wind, h = 0) {
  let best = 0, bv = 0; const vs = Math.sqrt(2 * P.m * G / (isa(h).rho * P.S * P.CLmax));
  for (let V = vs; V < 4 * vs; V += 0.01) { const g = glide(P, V, h, wind).ground; if (g > best) { best = g; bv = V; } }
  return { V: bv, ratio: best };
}
// Breguet: jet cruise at constant speed and L/D, TSFC c (per hour), weight W0 → W0(1 − ff)
export const breguet = (V, LD, c, ff) => V / (c / 3600) * LD * Math.log(1 / (1 - ff));
export const endurance = (LD, c, ff) => LD / c * Math.log(1 / (1 - ff)); // hours
