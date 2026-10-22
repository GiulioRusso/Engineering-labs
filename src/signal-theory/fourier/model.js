// Signals: waveforms, Fourier series, sampling, the DFT and windows. Pure, no DOM.
import { rng } from '../../maths/probability/model.js';

const frac = (u) => u - Math.floor(u);
export const WAVES = {
  sine: { label: 'Sine', f: (u) => Math.sin(2 * Math.PI * u) },
  square: { label: 'Square', f: (u) => (frac(u) < 0.5 ? 1 : -1) },
  saw: { label: 'Sawtooth', f: (u) => 2 * frac(u + 0.5) - 1 },
  triangle: { label: 'Triangle', f: (u) => 1 - 4 * Math.abs(frac(u + 0.25) - 0.5) },
  pulse: { label: 'Pulse train', f: (u, d = 0.2) => (frac(u) < d ? 1 : 0) },
};
// one sample of signal `kind` at time t (frequency f, amplitude A)
export const wave = (kind, t, f, A = 1, duty) => A * WAVES[kind].f(f * t, duty);
export const chirp = (t, f0, f1, T) => Math.sin(2 * Math.PI * (f0 * t + (f1 - f0) * t * t / (2 * T)));
export const noise = (n, sigma, seed = 3) => { const r = rng(seed); return Array.from({ length: n }, () => sigma * Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())); };

// Fourier sine coefficients b_n of the odd waves (a_n = 0): x(t) = Σ b_n sin(2π n f t)
export function bn(kind, n) {
  if (kind === 'sine') return n === 1 ? 1 : 0;
  if (kind === 'square') return n % 2 ? 4 / (Math.PI * n) : 0;
  if (kind === 'saw') return 2 * (n % 2 ? 1 : -1) / (Math.PI * n);
  if (kind === 'triangle') return n % 2 ? 8 / (Math.PI * Math.PI * n * n) * (((n - 1) / 2) % 2 ? -1 : 1) : 0;
  return 0;
}
export const partialSum = (kind, N, u) => { let s = 0; for (let n = 1; n <= N; n++) s += bn(kind, n) * Math.sin(2 * Math.PI * n * u); return s; };

// DFT (direct), and a radix-2 FFT to check it. Input real array; output {re, im}.
export function dft(x) {
  const N = x.length, re = new Float64Array(N), im = new Float64Array(N);
  for (let k = 0; k < N; k++) { let a = 0, b = 0; for (let n = 0; n < N; n++) { const w = -2 * Math.PI * k * n / N; a += x[n] * Math.cos(w); b += x[n] * Math.sin(w); } re[k] = a; im[k] = b; }
  return { re, im };
}
export function fft(x) {
  const N = x.length; if (N === 1) return { re: [x[0]], im: [0] };
  const E = fft(x.filter((_, i) => i % 2 === 0)), O = fft(x.filter((_, i) => i % 2 === 1)), re = new Array(N), im = new Array(N);
  for (let k = 0; k < N / 2; k++) { const w = -2 * Math.PI * k / N, c = Math.cos(w), s = Math.sin(w), tr = c * O.re[k] - s * O.im[k], ti = c * O.im[k] + s * O.re[k]; re[k] = E.re[k] + tr; im[k] = E.im[k] + ti; re[k + N / 2] = E.re[k] - tr; im[k + N / 2] = E.im[k] - ti; }
  return { re, im };
}
export const WINDOWS = {
  rect: { label: 'Rectangular', w: () => 1 },
  hann: { label: 'Hann', w: (n, N) => 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) },
  hamming: { label: 'Hamming', w: (n, N) => 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)) },
  blackman: { label: 'Blackman', w: (n, N) => 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * n / (N - 1)) },
};
// one-sided amplitude spectrum: amplitude of a sine at bin k reads ≈ its amplitude (window gain corrected)
export function spectrum(x, win = 'rect') {
  const N = x.length, w = Array.from({ length: N }, (_, n) => WINDOWS[win].w(n, N)), g = w.reduce((a, b) => a + b, 0) / N;
  const X = dft(x.map((v, n) => v * w[n])), amp = [];
  for (let k = 0; k <= N / 2; k++) amp.push((k === 0 || k === N / 2 ? 1 : 2) * Math.hypot(X.re[k], X.im[k]) / (N * g));
  return amp;
}
// the frequency a sampled sine appears at: folded into [0, fs/2]
export const aliasOf = (f, fs) => { const r = ((f % fs) + fs) % fs; return Math.min(r, fs - r); };
