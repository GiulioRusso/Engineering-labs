// IQ demodulation in a receive chain: a Gaussian-envelope pulse on a carrier, quadrature mixing with a
// local oscillator, low-pass filtering, the residual frequency Δf = fc − fLO, and where it lands on the
// DFT bin grid. Pure, no DOM.
import { fft } from '../../lib/dsp.js';

export const FS = 8192, N = 8192;
export const pulse = (fc, w, phi = 0) => Array.from({ length: N }, (_, i) => { const t = i / FS - 0.5; return Math.exp(-t * t / (2 * w * w)) * Math.cos(2 * Math.PI * fc * t + phi); });
// x·e^{−j2πfLO t}: I = x·cos, Q = −x·sin (×2 so a tone at fLO comes out with its own amplitude)
export const mix = (x, fLO) => ({ re: x.map((v, i) => 2 * v * Math.cos(2 * Math.PI * fLO * (i / FS - 0.5))), im: x.map((v, i) => -2 * v * Math.sin(2 * Math.PI * fLO * (i / FS - 0.5))) });
// ideal low-pass (brick wall) on a complex signal
export function lpf(z, fcut) { const re = Float64Array.from(z.re), im = Float64Array.from(z.im); fft(re, im); for (let k = 0; k < N; k++) { const f = (k < N / 2 ? k : k - N) * FS / N; if (Math.abs(f) > fcut) { re[k] = 0; im[k] = 0; } } fft(re, im, true); return { re: Array.from(re), im: Array.from(im) }; }
// two-sided magnitude spectrum, centred, of a real or complex signal
export function spectrum(z) { const re = Float64Array.from(z.re ?? z), im = z.im ? Float64Array.from(z.im) : new Float64Array(N); fft(re, im); const f = [], a = []; for (let i = 0; i < N; i++) { const k = (i + N / 2) % N; f.push((k < N / 2 ? k : k - N) * FS / N); a.push(Math.hypot(re[k], im[k]) / N); } return { f, a }; }
// a short record of a complex tone at Δf (Hz), its DFT magnitude per bin
export function bins(df, n, fs, phi = 0) {
  const I = Array.from({ length: n }, (_, i) => Math.cos(2 * Math.PI * df * i / fs + phi)), Q = Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * df * i / fs + phi));
  const mag = Array.from({ length: n }, (_, k) => { let a = 0, b = 0; for (let i = 0; i < n; i++) { const w = -2 * Math.PI * k * i / n, c = Math.cos(w), s = Math.sin(w); a += I[i] * c - Q[i] * s; b += I[i] * s + Q[i] * c; } return Math.hypot(a, b) / n; }); // direct DFT: n need not be a power of 2
  return { I, Q, mag };
}
