// Steady flight of a light aircraft: ISA atmosphere, lift curve with stall, parabolic drag polar,
// load factor in a banked turn, V–n envelope. SI units. Pure, no DOM.
export const G = 9.80665, R_AIR = 287.05287;
export function isa(h) {
  if (h <= 11000) { const T = 288.15 - 0.0065 * h, p = 101325 * (T / 288.15) ** 5.255877; return { T, p, rho: p / (R_AIR * T) }; }
  const T = 216.65, p = 22632.06 * Math.exp(-G * (h - 11000) / (R_AIR * T)); return { T, p, rho: p / (R_AIR * T) };
}
// A Cessna-172-like trainer.
export const PLANE = { m: 1000, S: 16.2, AR: 7.5, e: 0.8, CD0: 0.027, CLmax: 1.5, alpha0: -2 * Math.PI / 180, nMax: 3.8, nMin: -1.52, Vne: 82 };
export const liftSlope = (AR) => 2 * Math.PI * AR / (AR + 2);          // finite wing, per radian
export const kInduced = (P) => 1 / (Math.PI * P.e * P.AR);
// Lift coefficient: linear up to CLmax, then a stall drop to 0.6·CLmax over the next 8°.
export function CL(P, a) {
  const s = liftSlope(P.AR), aStall = P.alpha0 + P.CLmax / s, lin = s * (a - P.alpha0);
  if (a <= aStall) return Math.max(-P.CLmax, lin);
  return P.CLmax * (1 - 0.4 * Math.min(1, (a - aStall) / (8 * Math.PI / 180)));
}
export const stallAlpha = (P) => P.alpha0 + P.CLmax / liftSlope(P.AR);
export const CD = (P, cl, stalled = false) => P.CD0 + kInduced(P) * cl * cl + (stalled ? 0.08 : 0);
export function forces(P, V, h, a) {
  const { rho } = isa(h), q = 0.5 * rho * V * V, cl = CL(P, a), st = a > stallAlpha(P);
  return { q, cl, cd: CD(P, cl, st), L: q * P.S * cl, D: q * P.S * CD(P, cl, st), W: P.m * G, stalled: st, rho };
}
// Angle of attack for level flight at load factor n (L = n·W); null if beyond CLmax (stall).
export function trimAlpha(P, V, h, n = 1) {
  const { rho } = isa(h), cl = n * P.m * G / (0.5 * rho * V * V * P.S);
  return cl > P.CLmax ? null : P.alpha0 + cl / liftSlope(P.AR);
}
export const stallSpeed = (P, h, n = 1) => Math.sqrt(2 * n * P.m * G / (isa(h).rho * P.S * P.CLmax));
export const bestLD = (P) => ({ CL: Math.sqrt(P.CD0 / kInduced(P)), LD: 1 / (2 * Math.sqrt(kInduced(P) * P.CD0)) });
