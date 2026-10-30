// Special relativity in units where c = 1 (time in years, distance in light-years, speeds β = v/c).
// Lorentz factor, boosts, the invariant interval, velocity addition, the light clock and the twins.
// Pure, no DOM.
export const gamma = (b) => 1 / Math.sqrt(1 - b * b);
// Coordinates of an event { t, x } seen from a frame moving at β along x
export const boost = ({ t, x }, b) => { const g = gamma(b); return { t: g * (t - b * x), x: g * (x - b * t) }; };
export const interval = ({ t, x }) => t * t - x * x;
export const addVelocities = (u, v) => (u + v) / (1 + u * v);
// Light clock: mirrors L apart (light-years). At rest one tick (there and back) is 2L. Moving at β, the
// light runs along the diagonal: (t/2)² = L² + (βt/2)², solved here by bisection, not with γ.
export function movingTick(L, b) {
  let lo = 2 * L, hi = 2 * L * 1e6;
  for (let i = 0; i < 200; i++) { const t = (lo + hi) / 2; if ((t / 2) ** 2 < L * L + (b * t / 2) ** 2) lo = t; else hi = t; }
  return (lo + hi) / 2;
}
// Twins: the traveller goes D light-years out at β and comes straight back.
export const twins = (D, b) => ({ earth: 2 * D / b, traveller: 2 * D / (b * gamma(b)) });
