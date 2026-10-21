// Pulses in time and frequency: rect, triangle, Gaussian, sinc, one-sided exponential and chirp, each
// with its closed-form transform, plus RMS widths for the time–bandwidth product. Pure, no DOM.
import { ft } from '../../lib/dsp.js';

const sinc = (u) => (Math.abs(u) < 1e-12 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u));
// p: { A, tau (rect width, triangle half-width, chirp length T), sigma, W, lam, f0, f1, t0 }
export const PULSES = {
  rect: { label: 'Rectangle', x: (t, p) => (Math.abs(t - p.t0) <= p.tau / 2 ? p.A : 0), X: (f, p) => p.A * p.tau * Math.abs(sinc(f * p.tau)) },
  tri: { label: 'Triangle', x: (t, p) => p.A * Math.max(0, 1 - Math.abs(t - p.t0) / p.tau), X: (f, p) => p.A * p.tau * sinc(f * p.tau) ** 2 },
  gauss: { label: 'Gaussian', x: (t, p) => p.A * Math.exp(-((t - p.t0) ** 2) / (2 * p.sigma ** 2)), X: (f, p) => p.A * p.sigma * Math.sqrt(2 * Math.PI) * Math.exp(-2 * Math.PI ** 2 * p.sigma ** 2 * f * f) },
  sinc: { label: 'Sinc', x: (t, p) => p.A * sinc(2 * p.W * (t - p.t0)), X: (f, p) => (Math.abs(f) <= p.W ? p.A / (2 * p.W) : 0) },
  exp: { label: 'One-sided exponential', x: (t, p) => (t >= p.t0 ? p.A * Math.exp(-p.lam * (t - p.t0)) : 0), X: (f, p) => p.A / Math.hypot(p.lam, 2 * Math.PI * f) },
  chirp: { label: 'Chirp', x: (t, p) => { const u = t - p.t0; return Math.abs(u) <= p.tau / 2 ? p.A * Math.cos(2 * Math.PI * ((p.f0 + p.f1) / 2 * u + (p.f1 - p.f0) / (2 * p.tau) * u * u)) : 0; }, X: null },
};
// sample x(t) on [−T/2, T/2) with N points and transform it
export function pair(kind, p, N = 4096, T = 40) {
  const dt = T / N, t = Array.from({ length: N }, (_, i) => -T / 2 + i * dt), x = t.map((v) => PULSES[kind].x(v, p));
  return { t, x, dt, ...ft(x, dt, -T / 2) };
}
// RMS spreads σt, σf of |x|² and |X|² (centred on their means)
export function rmsWidths(t, x, f, mag) {
  const sp = (u, w) => { let E = 0, m = 0; for (let i = 0; i < u.length; i++) { E += w[i]; m += u[i] * w[i]; } m /= E; let v = 0; for (let i = 0; i < u.length; i++) v += (u[i] - m) ** 2 * w[i]; return Math.sqrt(v / E); };
  return { st: sp(t, x.map((v) => v * v)), sf: sp(f, Array.from(mag, (v) => v * v)) };
}
// fraction of the energy inside |f| ≤ F
export function energyWithin(f, mag, F) { let a = 0, b = 0; for (let i = 0; i < f.length; i++) { const e = mag[i] ** 2; b += e; if (Math.abs(f[i]) <= F) a += e; } return a / b; }
