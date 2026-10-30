// A block on an incline with static and kinetic friction, optionally pulled up the slope by a hanging
// mass over a pulley at the top. Forces along the slope are positive up the slope. SI units. Pure, no DOM.
export const G = 9.81;

// p: { m, M (hanging, 0 = none), th, mus, muk }. Returns the accelerations and every force (N).
export function solve({ m, M = 0, th, mus, muk }) {
  const W = m * G, N = W * Math.cos(th), F = M * G - W * Math.sin(th), mt = m + M; // F: what drives the system up the slope
  if (Math.abs(F) <= mus * N) return { a: 0, N, W, F, f: -F, T: M * G, sticks: true, fmax: mus * N };
  const f = -Math.sign(F) * muk * N, a = (F + f) / mt;
  return { a, N, W, F, f, T: M * (G - a), sticks: false, fmax: mus * N };
}
// Steepest angle at which the block (no pulley) stays put: tan θ = μs.
export const reposeAngle = (mus) => Math.atan(mus);
