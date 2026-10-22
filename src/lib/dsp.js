// Shared signal processing: radix-2 complex FFT, the continuous Fourier transform approximated on a grid,
// windows and Gaussian noise. Pure, no DOM.
import { rng } from './random.js';

// in-place iterative radix-2 complex FFT (inverse when inv = true, scaled by 1/N)
export function fft(re, im, inv = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) {
      const u = i + k, v = u + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr;
      re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
// X(f) = ∫ x(t) e^{−j2πft} dt for x sampled on t_i = t0 + i·dt (N a power of 2): centred frequency axis
export function ft(x, dt, t0 = 0, xi = null) {
  const N = x.length, re = Float64Array.from(x), im = xi ? Float64Array.from(xi) : new Float64Array(N); fft(re, im);
  const f = new Float64Array(N), Re = new Float64Array(N), Im = new Float64Array(N), mag = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const k = (i + N / 2) % N, fk = (k < N / 2 ? k : k - N) / (N * dt), a = -2 * Math.PI * fk * t0, c = Math.cos(a), s = Math.sin(a);
    f[i] = fk; Re[i] = (re[k] * c - im[k] * s) * dt; Im[i] = (re[k] * s + im[k] * c) * dt; mag[i] = Math.hypot(Re[i], Im[i]);
  }
  return { f, re: Re, im: Im, mag };
}
export const WINDOWS = {
  rect: { label: 'Rectangular', w: () => 1 },
  hann: { label: 'Hann', w: (n, N) => 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) },
  hamming: { label: 'Hamming', w: (n, N) => 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)) },
  blackman: { label: 'Blackman', w: (n, N) => 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * n / (N - 1)) },
};
export const gaussian = (seed = 1) => { const r = rng(seed); return () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); };
export const dB = (v, ref = 1, floor = -100) => Math.max(floor, 20 * Math.log10(Math.max(Math.abs(v) / ref, 1e-12)));
export const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
// trapezoid integral of y over x
export const trapz = (x, y) => { let s = 0; for (let i = 1; i < x.length; i++) s += (x[i] - x[i - 1]) * (y[i] + y[i - 1]) / 2; return s; };
