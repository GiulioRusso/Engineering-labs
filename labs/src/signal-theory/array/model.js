// Phased arrays, lengths in wavelengths at the design frequency f0: complex element weights (steering by
// phase or by true time delay, amplitude tapers including Dolph–Chebyshev, null steering by projection),
// the array factor, grating lobes, scan metrics and the planar array in direction cosines. Pure, no DOM.
import { elements } from '../../electronic-warfare/beams/model.js';
export { elements };
const K = 2 * Math.PI;
export const cx = { mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], conj: (a) => [a[0], -a[1]], add: (a, b) => [a[0] + b[0], a[1] + b[1]], scale: (a, s) => [a[0] * s, a[1] * s], abs: (a) => Math.hypot(a[0], a[1]) };
const expj = (p) => [Math.cos(p), Math.sin(p)];
// Dolph–Chebyshev amplitudes for N elements and sidelobe level sll (dB, negative)
export function chebyshev(N, sll) {
  if (N < 3) return new Array(N).fill(1);
  const R = 10 ** (-sll / 20), x0 = Math.cosh(Math.acosh(R) / (N - 1)), T = (n, x) => (Math.abs(x) <= 1 ? Math.cos(n * Math.acos(x)) : Math.sign(x) ** n * Math.cosh(n * Math.acosh(Math.abs(x))));
  const P = Array.from({ length: N }, (_, m) => T(N - 1, x0 * Math.cos(Math.PI * m / N)) * (m % 2 && N % 2 === 0 ? 1 : 1));
  const w = Array.from({ length: N }, (_, n) => { let s = 0; for (let m = 0; m < N; m++) s += P[m] * Math.cos(2 * Math.PI * m * (n - (N - 1) / 2) / N); return Math.abs(s); });
  const mx = Math.max(...w); return w.map((v) => v / mx);
}
export const TAPER = {
  uniform: (N) => new Array(N).fill(1),
  hamming: (N) => Array.from({ length: N }, (_, n) => (N < 2 ? 1 : 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)))),
  taylor: (N) => Array.from({ length: N }, (_, n) => (N < 2 ? 1 : 0.5 - 0.5 * Math.cos(2 * Math.PI * (n + 0.5) / N) * 0.85 + 0.15)),
  cheb: (N) => chebyshev(N, -40),
};
// weights steering to θ0 at frequency ratio fr = f/f0: phase shifters (set at f0) or true time delays
export function steerWeights(N, d, th0, { taper = 'uniform', mode = 'phase', fr = 1 } = {}) {
  const xs = elements(N, d), a = TAPER[taper](N);
  return xs.map((x, n) => cx.scale(expj(-K * x * Math.sin(th0) * (mode === 'ttd' ? fr : 1)), a[n]));
}
// |AF(θ)| normalised to the sum of |w|, at frequency ratio fr (element positions scale with fr in wavelengths)
export function af(theta, N, d, w, fr = 1) { const xs = elements(N, d); let s = [0, 0], t = 0; for (let n = 0; n < N; n++) { s = cx.add(s, cx.mul(w[n], expj(K * fr * xs[n] * Math.sin(theta)))); t += cx.abs(w[n]); } return cx.abs(s) / t; }
export const squint = (th0, fr) => Math.asin(Math.max(-1, Math.min(1, Math.sin(th0) / fr)));
export const gratingAngles = (d, th0) => { const out = []; for (let m = -4; m <= 4; m++) if (m) { const s = Math.sin(th0) + m / d; if (Math.abs(s) <= 1) out.push(Math.asin(s)); } return out; };
// null steering: project the steering vector a0 off the constraint vectors a(θj): w = a0 − A (AᴴA)⁻¹ Aᴴ a0
export function nullWeights(N, d, th0, nulls) {
  const xs = elements(N, d), sv = (t) => xs.map((x) => expj(-K * x * Math.sin(t))), a0 = sv(th0), A = nulls.map(sv);
  if (!A.length) return a0;
  const dot = (u, v) => u.reduce((s, ui, i) => cx.add(s, cx.mul(cx.conj(ui), v[i])), [0, 0]); // uᴴv
  const G = A.map((u) => A.map((v) => dot(u, v))), b = A.map((u) => dot(u, a0));
  let c;
  if (A.length === 1) { const g = G[0][0], den = g[0] * g[0] + g[1] * g[1]; c = [cx.scale(cx.mul(b[0], cx.conj(g)), 1 / den)]; }
  else { const [[p, q], [r, s]] = G, det = cx.add(cx.mul(p, s), cx.scale(cx.mul(q, r), -1)), inv = (z) => { const m = z[0] * z[0] + z[1] * z[1]; return [z[0] / m, -z[1] / m]; }, id = inv(det);
    c = [cx.mul(id, cx.add(cx.mul(s, b[0]), cx.scale(cx.mul(q, b[1]), -1))), cx.mul(id, cx.add(cx.mul(p, b[1]), cx.scale(cx.mul(r, b[0]), -1)))]; }
  return a0.map((ai, n) => A.reduce((w, Aj, j) => cx.add(w, cx.scale(cx.mul(Aj[n], c[j]), -1)), ai));
}
// planar Nx × Ny array, spacing d, steered to (u0, v0): |AF(u, v)| normalised
export function planarAF(u, v, Nx, Ny, d, u0, v0) { const f = (N, s) => { const p = K * d * s / 2; return Math.abs(Math.sin(N * p)) < 1e-12 && Math.abs(Math.sin(p)) < 1e-12 ? 1 : Math.abs(Math.sin(N * p) / (N * Math.sin(p) || 1e-12)); }; return f(Nx, u - u0) * f(Ny, v - v0); }
