// Doppler: reflected wavefronts from a moving target, pulse-Doppler range and velocity measurement,
// and the ambiguities set by the PRF. Pure, no DOM.
export const C0 = 299792458;
export const dopplerShift = (v, f0) => 2 * v * f0 / C0;            // v > 0 closing
export const exactReflected = (f0, v, c = C0) => f0 * (c + v) / (c - v); // two-way, exact (moving mirror)
export const vUnamb = (prf, f0) => C0 / f0 * prf / 4;
export const rUnamb = (prf) => C0 / (2 * prf);
export const fold = (x, w) => ((x + w / 2) % w + w) % w - w / 2;       // into [−w/2, w/2)
export const apparentVelocity = (v, prf, f0) => fold(v, 2 * vUnamb(prf, f0));
export const apparentRange = (R, prf) => ((R % rUnamb(prf)) + rUnamb(prf)) % rUnamb(prf);
export const dv = (prf, N, f0) => C0 / f0 * prf / (2 * N);

// 1-D wavefronts (visual units, wave speed c): fronts leave x = 0 every period T; a target starts at X0
// and moves towards the radar at u (u > 0 closing). Returns outgoing radii and reflected fronts (centre, radius).
export function fronts(t, { c = 1, T, X0, u, nMax = 60 }) {
  const out = [], back = [];
  for (let n = 0; n < nMax; n++) {
    const t0 = n * T; if (t0 > t) break;
    const r = c * (t - t0), th = (X0 + c * t0) / (c + u); // hit when c(t − t0) = X0 − u t
    if (t < th) out.push(r); else back.push({ x: X0 - u * th, r: c * (t - th) });
  }
  return { out, back, X: X0 - u * t };
}
