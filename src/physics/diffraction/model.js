// Fraunhofer diffraction: a single slit of width a, and N such slits a distance d apart (a grating).
// Closed forms, and the same intensity as a sum of Huygens wavelets (phasors). Lengths in metres,
// intensity normalised to 1 at θ = 0. Pure, no DOM.
const sinc = (x) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x);

export function single(th, a, lam) { const b = Math.PI * a * Math.sin(th) / lam; return sinc(b) ** 2; }
// (sin Nφ / N sin φ)², with its limit 1 at the principal maxima φ = mπ
export function arrayFactor(th, N, d, lam) {
  const p = Math.PI * d * Math.sin(th) / lam, s = Math.sin(p);
  if (Math.abs(s) < 1e-9) return 1;
  return (Math.sin(N * p) / (N * s)) ** 2;
}
export const grating = (th, N, a, d, lam) => single(th, a, lam) * arrayFactor(th, N, d, lam);

// Huygens: M wavelets across each slit, phase k·y·sin θ. Returns the chain of phasor tips (from 0)
// and the normalised intensity |Σ|²/(MN)².
export function phasors(th, a, lam, M = 60, N = 1, d = 0) {
  const k = 2 * Math.PI / lam, s = Math.sin(th), pts = [[0, 0]];
  let x = 0, y = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < M; i++) {
    const ph = k * s * (j * d + (i + 0.5) * a / M); x += Math.cos(ph); y += Math.sin(ph); pts.push([x, y]);
  }
  return { pts, I: (x * x + y * y) / (M * N) ** 2 };
}
// Rayleigh: two wavelengths λ and λ + Δλ are separated in order m by N slits when λ/Δλ ≤ mN.
export const resolvingPower = (m, N) => m * N;
