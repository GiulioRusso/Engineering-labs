// Practical spectral analysis: raw and fftshifted FFT bins, zero padding, windows, frequency estimation
// (peak bin + parabolic interpolation) against the Cramér–Rao bound, decimation with and without an
// anti-alias filter, and plateau detection by derivative and kernel density. Pure, no DOM.
import { fft, WINDOWS, gaussian } from '../../lib/dsp.js';

// |X[k]| of a real record x zero-padded to P (a power of 2), window w; raw order k = 0 … P−1
export function rawFFT(x, P = x.length, win = 'rect') { const re = new Float64Array(P), im = new Float64Array(P), g = x.reduce((a, _, n) => a + WINDOWS[win].w(n, x.length), 0); x.forEach((v, n) => { re[n] = v * WINDOWS[win].w(n, x.length); }); fft(re, im); return { re, im, mag: Array.from(re, (v, k) => Math.hypot(v, im[k]) * 2 / g) }; }
export const shift = (a) => { const n = a.length; return a.map((_, i) => a[(i + n / 2) % n]); };
// frequency estimate: strongest bin, refined by a parabola through it and its neighbours (in dB)
export function estimate(x, fs, P) {
  const { mag } = rawFFT(x, P, 'hann'), h = P / 2; let k = 1; for (let i = 1; i < h; i++) if (mag[i] > mag[k]) k = i;
  const a = Math.log(mag[k - 1] + 1e-12), b = Math.log(mag[k] + 1e-12), c = Math.log(mag[k + 1] + 1e-12), d = 0.5 * (a - c) / (a - 2 * b + c);
  return { coarse: k * fs / P, fine: (k + (Number.isFinite(d) ? d : 0)) * fs / P };
}
// CRLB (Kay) for the frequency of a real sinusoid: σf ≥ fs/(2π) √(6 / (SNR N (N² − 1))), SNR = A²/2σ²
export const crlb = (snr, N, fs) => fs / (2 * Math.PI) * Math.sqrt(6 / (snr * N * (N * N - 1)));
export function monteCarlo(f0, A, sigma, N, fs, P, trials, seed = 2) {
  const g = gaussian(seed), est = [];
  for (let t = 0; t < trials; t++) { const ph = 2 * Math.PI * ((t * 0.618) % 1), x = Array.from({ length: N }, (_, n) => A * Math.cos(2 * Math.PI * f0 * n / fs + ph) + sigma * g()); est.push(estimate(x, fs, P)); }
  const sd = (k) => { const v = est.map((e) => e[k] - f0), m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length + m * m); };
  return { est, sdCoarse: sd('coarse'), sdFine: sd('fine') };
}
// decimate by an integer factor D, optionally after a windowed-sinc low-pass at the new Nyquist
export function decimate(x, D, filter) {
  let y = x;
  if (filter) { const M = 8 * D + 1, m = (M - 1) / 2, fc = 0.5 / D, h = Array.from({ length: M }, (_, n) => { const k = n - m, w = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (M - 1)); return w * (k === 0 ? 2 * fc * 0.9 : Math.sin(2 * Math.PI * fc * 0.9 * k) / (Math.PI * k)); }), s = h.reduce((a, b) => a + b, 0); y = x.map((_, i) => { let a = 0; for (let j = 0; j < M; j++) { const q = i - j + m; if (q >= 0 && q < x.length) a += h[j] * x[q]; } return a / s; }); }
  return y.filter((_, i) => i % D === 0);
}
// Savitzky–Golay-like smoothing (moving quadratic fit, window W odd) and derivative
export function smoothDeriv(x, W, dt) {
  const m = (W - 1) / 2, s = new Float64Array(x.length), d = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) { let S0 = 0, S1 = 0, S2 = 0, S3 = 0, S4 = 0, Y0 = 0, Y1 = 0, Y2 = 0; for (let j = -m; j <= m; j++) { const q = Math.min(x.length - 1, Math.max(0, i + j)), t = j, y = x[q]; S0++; S1 += t; S2 += t * t; S3 += t ** 3; S4 += t ** 4; Y0 += y; Y1 += t * y; Y2 += t * t * y; }
    // solve the 3×3 normal equations for y ≈ a + b t + c t²
    const A = [[S0, S1, S2], [S1, S2, S3], [S2, S3, S4]], B = [Y0, Y1, Y2], det = (M) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    const D0 = det(A), col = (k) => A.map((r, i2) => r.map((v, j2) => (j2 === k ? B[i2] : v))); s[i] = det(col(0)) / D0; d[i] = det(col(1)) / D0 / dt; }
  return { s: Array.from(s), d: Array.from(d) };
}
// Gaussian kernel density of values v on grid g with bandwidth h, and its local maxima
export function kde(v, g, h) { const k = g.map((x) => v.reduce((a, y) => a + Math.exp(-((x - y) ** 2) / (2 * h * h)), 0) / (v.length * h * Math.sqrt(2 * Math.PI))); const peaks = []; for (let i = 1; i < g.length - 1; i++) if (k[i] > k[i - 1] && k[i] >= k[i + 1] && k[i] > 0.05 * Math.max(...k)) peaks.push(g[i]); return { k, peaks }; }
