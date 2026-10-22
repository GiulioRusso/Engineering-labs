// Waves on a string (1D) and the Doppler effect (2D). Pure, no DOM. Lengths in m, times in s.
// shape(u): sine or a Gaussian pulse of width w; a wave moving right is shape(k·x − ω·t) = shape(k(x − v t)).
export const shape = (kind, u, w = 0.6) => (kind === 'pulse' ? Math.exp(-((u / (2 * Math.PI)) ** 2) / (2 * (w / 6) ** 2)) : Math.sin(u));

// a travelling wave: amplitude A, wavelength lam, speed v, direction dir = ±1
export const travelling = ({ A, lam, v, dir = 1, kind = 'sine', phase = 0 }) => (x, t) => A * shape(kind, (2 * Math.PI / lam) * (x - dir * v * t) + phase);

// standing mode n on a string of length L fixed at both ends (x from 0 to L)
export const mode = (n, L, v, A) => ({ f: n * v / (2 * L), y: (x, t) => A * Math.sin(n * Math.PI * x / L) * Math.cos(2 * Math.PI * (n * v / (2 * L)) * t) });

// Doppler: source moving along x at speed vs from x0, emitting at f; waves at speed c.
// emission time of the wave reaching (px, py) at time t (bisection on |p − s(te)| = c (t − te)), or null
export function emissionTime(t, px, py, { x0, vs, c, t0 = -Infinity }) {
  const g = (te) => Math.hypot(px - (x0 + vs * te), py) - c * (t - te);
  let a = Math.max(t0, t - 1e4 / c), b = t; // the source starts emitting at t0
  if (g(a) > 0 || g(b) < 0) return null;
  for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (g(m) > 0) b = m; else a = m; }
  return (a + b) / 2;
}
export const dopplerAhead = (f, c, vs) => f * c / (c - vs);   // observer in front, source approaching
export const dopplerBehind = (f, c, vs) => f * c / (c + vs);  // observer behind, source receding
