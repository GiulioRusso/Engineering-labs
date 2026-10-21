// Guided waves: the TEM coax line, reflections and the Smith chart, rectangular waveguide cutoff, mode
// fields and wall currents, dispersion (phase and group velocity, a pulse spreading), and the dielectric
// slab guide (total internal reflection, modes with evanescent tails). SI units unless stated. Pure, no DOM.
import { fft } from '../../lib/dsp.js';
export const C0 = 299792458, ETA0 = 376.73;
export const coaxZ0 = (ba, er = 1) => ETA0 / (2 * Math.PI * Math.sqrt(er)) * Math.log(ba);
const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
export const gamma = (R, X, Z0 = 50) => cdiv([R - Z0, X], [R + Z0, X]);
export const vswr = (g) => { const m = Math.hypot(...g); return m >= 1 ? Infinity : (1 + m) / (1 - m); };
// Γ seen a distance l (wavelengths) back from the load: rotated clockwise by 2βl
export const gammaAt = (g, l) => { const a = -4 * Math.PI * l; return [g[0] * Math.cos(a) - g[1] * Math.sin(a), g[0] * Math.sin(a) + g[1] * Math.cos(a)]; };
// |V(l)| / |V+| along the line, l in wavelengths from the load
export const vmag = (g, l) => { const q = gammaAt(g, l); return Math.hypot(1 + q[0], q[1]); };
export const zFromGamma = (g) => cdiv([1 + g[0], g[1]], [1 - g[0], -g[1]]); // normalised z
// Smith chart: constant-r circles and constant-x arcs as polylines in the Γ plane
export function smithGrid(rs = [0, 0.2, 0.5, 1, 2, 5], xs = [0.2, 0.5, 1, 2, 5]) {
  const lines = [];
  for (const r of rs) { const c = r / (1 + r), R = 1 / (1 + r), p = []; for (let i = 0; i <= 120; i++) { const a = 2 * Math.PI * i / 120; p.push([c + R * Math.cos(a), R * Math.sin(a)]); } lines.push(p); }
  for (const x of xs) for (const s of [1, -1]) { const p = []; for (let i = 0; i <= 200; i++) { const r = 10 ** (-3 + 5 * i / 200), g = cdiv([r - 1, s * x], [r + 1, s * x]); p.push(g); } lines.push(p); }
  return lines;
}
// rectangular guide a × b (m)
export const cutoff = (m, n, a, b) => (C0 / 2) * Math.hypot(m / a, n / b);
export const beta = (f, fc) => (f > fc ? 2 * Math.PI / C0 * Math.sqrt(f * f - fc * fc) : 0);
export const alpha = (f, fc) => (f < fc ? 2 * Math.PI / C0 * Math.sqrt(fc * fc - f * f) : 0);
export const vp = (f, fc) => C0 / Math.sqrt(1 - (fc / f) ** 2), vg = (f, fc) => C0 * Math.sqrt(1 - (fc / f) ** 2);
export function modes(a, b, fmax) { const out = []; for (let m = 0; m <= 5; m++) for (let n = 0; n <= 5; n++) { if (!m && !n) continue; const fc = cutoff(m, n, a, b); if (fc > fmax) continue; out.push({ name: `TE${m}${n}`, m, n, fc }); if (m && n) out.push({ name: `TM${m}${n}`, m, n, fc }); } return out.sort((p, q) => p.fc - q.fc); }
// TE_mn transverse E (from Hz = cos(mπx/a) cos(nπy/b)): E ∝ ẑ × ∇Hz; wall current on the broad wall from H
export function teField(m, n, a, b, x, y) { const kx = m * Math.PI / a, ky = n * Math.PI / b; return [ky * Math.cos(kx * x) * Math.sin(ky * y), -kx * Math.sin(kx * x) * Math.cos(ky * y)]; }
// TE10 broad-wall (y = b) surface current at phase φ along z: Jx ∝ Hz = cos(πx/a) cos(φ), Jz ∝ Hx ∝ sin(πx/a) sin(φ)
export const te10Current = (x, a, ph) => [Math.cos(Math.PI * x / a) * Math.cos(ph), Math.sin(Math.PI * x / a) * Math.sin(ph)];
// a Gaussian-envelope pulse at fcar (Hz), width σt (s), after length L (m) of guide with cutoff fc (fc = 0: TEM)
export function propagate(fcar, sig, L, fc, N = 4096, T = null) {
  const span = T ?? Math.max(20 * sig, 3 * L / C0 + 12 * sig), fs = N / span, t = Array.from({ length: N }, (_, i) => i / fs), t0 = 5 * sig;
  const re = Float64Array.from(t, (v) => Math.exp(-((v - t0) ** 2) / (2 * sig * sig)) * Math.cos(2 * Math.PI * fcar * (v - t0))), im = new Float64Array(N), x = Array.from(re); fft(re, im);
  for (let k = 0; k < N; k++) { const f = (k < N / 2 ? k : k - N) * fs / N, af = Math.abs(f), b = fc ? beta(af, fc) : 2 * Math.PI * af / C0, att = fc && af < fc ? Math.exp(-alpha(af, fc) * L) : 1, ph = -Math.sign(f) * b * L, c = Math.cos(ph), s = Math.sin(ph); const r = re[k] * c - im[k] * s, q = re[k] * s + im[k] * c; re[k] = r * att; im[k] = q * att; }
  fft(re, im, true); return { t, x, y: Array.from(re), fs };
}
// symmetric slab, half-thickness h, index n1 core / n2 cladding, wavelength λ: guided TE modes (u, w), V
export function slabModes(h, n1, n2, lam) {
  const V = 2 * Math.PI / lam * h * Math.sqrt(n1 * n1 - n2 * n2), out = [];
  for (let m = 0; m < 40; m++) { const lo = m * Math.PI / 2, hi = Math.min(V, (m + 1) * Math.PI / 2); if (lo >= V) break; const f = (u) => (m % 2 === 0 ? u * Math.tan(u) : -u / Math.tan(u)) - Math.sqrt(Math.max(0, V * V - u * u)); let a = lo + 1e-9, b = hi - 1e-9; if (f(a) * f(b) > 0) continue; for (let i = 0; i < 80; i++) { const c = (a + b) / 2; if (f(a) * f(c) <= 0) b = c; else a = c; } const u = (a + b) / 2; out.push({ m, u, w: Math.sqrt(Math.max(0, V * V - u * u)) }); }
  return { V, modes: out };
}
export const slabProfile = ({ m, u, w }, xh) => { const inside = m % 2 === 0 ? Math.cos(u * xh) : Math.sin(u * xh); if (Math.abs(xh) <= 1) return inside; const edge = m % 2 === 0 ? Math.cos(u) : Math.sin(u) * Math.sign(xh); return edge * Math.exp(-w * (Math.abs(xh) - 1)); };
