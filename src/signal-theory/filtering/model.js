// Filtering two ways: convolving with a kernel in time (rect or Gaussian), and masking the spectrum
// (brick-wall or Butterworth) with its equivalent impulse response; plus windowed-sinc FIR design.
import { fft } from '../../lib/dsp.js';

// centred kernel of length M (odd): rect (moving average) or Gaussian with σ = M/6
export function kernel(kind, M) { const m = (M - 1) / 2, s = Math.max(M / 6, 0.5), h = Array.from({ length: M }, (_, i) => (kind === 'rect' ? 1 : Math.exp(-((i - m) ** 2) / (2 * s * s)))), t = h.reduce((a, b) => a + b, 0); return h.map((v) => v / t); }
// same-length centred convolution
export const convSame = (x, h) => { const m = (h.length - 1) / 2; return x.map((_, n) => { let s = 0; for (let j = 0; j < h.length; j++) { const k = n - j + m; if (k >= 0 && k < x.length) s += h[j] * x[k]; } return s; }); };
// |H(f)| of a kernel at f (fs = 1 cycles/sample units: f in cycles per sample)
export const response = (h, f) => { let re = 0, im = 0; h.forEach((v, n) => { re += v * Math.cos(2 * Math.PI * f * n); im -= v * Math.sin(2 * Math.PI * f * n); }); return Math.hypot(re, im); };
// mask M(f) with cutoff fc (Hz): brick-wall or Butterworth order n (|M|, zero phase)
export const mask = (kind, fc, n) => (f) => (kind === 'brick' ? (Math.abs(f) <= fc ? 1 : 0) : 1 / Math.sqrt(1 + (Math.abs(f) / fc) ** (2 * n)));
// apply a zero-phase mask to a real signal sampled at fs (length a power of 2)
export function applyMask(x, fs, M) { const N = x.length, re = Float64Array.from(x), im = new Float64Array(N); fft(re, im); for (let k = 0; k < N; k++) { const f = (k < N / 2 ? k : k - N) * fs / N, g = M(f); re[k] *= g; im[k] *= g; } fft(re, im, true); return Array.from(re); }
// the equivalent impulse response of a mask: inverse transform, centred
export function maskImpulse(fs, N, M) { const d = new Array(N).fill(0); d[0] = 1; const y = applyMask(d, fs, M); return y.map((_, i) => y[(i + N / 2) % N]); }
// windowed-sinc FIR (Hamming): low-pass at fc, high-pass, band-pass [fc, fc2]; fs in Hz, M taps (odd)
export function fir(type, fc, fc2, fs, M) {
  const m = (M - 1) / 2, lp = (f) => Array.from({ length: M }, (_, n) => { const k = n - m, w = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (M - 1)); return w * (k === 0 ? 2 * f / fs : Math.sin(2 * Math.PI * f * k / fs) / (Math.PI * k)); });
  const norm = (h) => { const s = h.reduce((a, b) => a + b, 0); return h.map((v) => v / s); };
  if (type === 'lowpass') return norm(lp(fc));
  if (type === 'highpass') { const h = norm(lp(fc)).map((v) => -v); h[m] += 1; return h; }
  const a = norm(lp(fc2)), b = norm(lp(fc)); return a.map((v, i) => v - b[i]);
}
