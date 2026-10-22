// Radar receiver chains, sample by sample: an RF pulse (with an interferer, a signal at the image
// frequency and noise) through filters, amplifiers, mixers, IQ demodulation and the ADC. Pure, no DOM.
import { rng } from '../../lib/random.js';

import { fft } from '../../lib/dsp.js';
export { fft };
// filter by a frequency mask H(f) (f in Hz, two-sided), on a complex signal {re, im} sampled at fs
export function maskFilter(x, fs, H) {
  const n = x.re.length, re = Float64Array.from(x.re), im = Float64Array.from(x.im); fft(re, im);
  for (let k = 0; k < n; k++) { const f = (k < n / 2 ? k : k - n) * fs / n, h = H(f); re[k] *= h; im[k] *= h; }
  fft(re, im, true); return { re, im };
}
export const bandpass = (f0, bw, order = 6) => (f) => 1 / Math.sqrt(1 + ((Math.abs(f) - f0) / (bw / 2)) ** (2 * order));
export const lowpass = (bw, order = 6) => (f) => 1 / Math.sqrt(1 + (f / bw) ** (2 * order));
// two-sided amplitude spectrum in dB (normalised to `ref`, or to its own peak)
export function spectrumDb(x, fs, ref) {
  const n = x.re.length, re = Float64Array.from(x.re, (v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n))), im = Float64Array.from(x.im, (v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n))); fft(re, im);
  const f = [], m = []; for (let k = 0; k < n; k++) { const kk = (k + n / 2) % n; f.push((kk < n / 2 ? kk : kk - n) * fs / n); m.push(Math.hypot(re[kk], im[kk])); }
  const order = f.map((_, i) => i).sort((a, b) => f[a] - f[b]), mx = ref ?? Math.max(...m);
  return { f: order.map((i) => f[i]), dB: order.map((i) => 20 * Math.log10(Math.max(m[i] / mx, 1e-6))), peak: Math.max(...m) };
}
const mix = (x, fs, flo, ph = 0, cplx = false) => { const n = x.re.length, re = new Float64Array(n), im = new Float64Array(n); for (let i = 0; i < n; i++) { const a = 2 * Math.PI * flo * i / fs + ph; re[i] = 2 * x.re[i] * Math.cos(a); if (cplx) { re[i] = x.re[i] * Math.cos(a) + x.im[i] * Math.sin(a); im[i] = -x.re[i] * Math.sin(a) + x.im[i] * Math.cos(a); } } return { re, im }; };

// the received scene: radar pulse at fRF, an out-of-band interferer, a signal sitting on the image frequency
export function antenna(p, fs, n) {
  const r = rng(13), g = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()), re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / fs, on = t > p.t0 && t < p.t0 + p.tau ? 1 : 0;
    re[i] = on * Math.cos(2 * Math.PI * p.fRF * t + p.phi) + p.aInt * Math.cos(2 * Math.PI * p.fInt * t) + p.aImg * Math.cos(2 * Math.PI * (2 * p.fLO - p.fRF) * t + 0.3) + p.noise * g();
  }
  return { re, im };
}
// run a chain and return every stage: { name, x, fs, real }
export function chain(arch, p) {
  const fs = p.fs, n = p.n, S = []; let x = antenna(p, fs, n); S.push({ name: 'Antenna', x, fs });
  const fIF = Math.abs(p.fRF - p.fLO);
  if (arch === 'homodyne') {
    x = maskFilter(x, fs, bandpass(p.fRF, p.bwRF)); S.push({ name: 'RF filter + LNA', x: scale(x, p.gain), fs }); x = S[S.length - 1].x;
    const z = mix(x, fs, p.fRF + p.dLO, 0, true); S.push({ name: 'IQ mixer (LO = RF)', x: { re: z.re.map((v) => 2 * v + p.dc), im: z.im.map((v) => 2 * v) }, fs });
    x = maskFilter(S[S.length - 1].x, fs, lowpass(p.bwBB)); S.push({ name: 'Low-pass', x, fs });
    S.push(adc(x, fs, p.fsADC, p.bits, 'ADC'));
    return S;
  }
  x = maskFilter(x, fs, bandpass(p.fRF, p.bwRF)); S.push({ name: 'RF band-pass', x, fs });
  x = scale(x, p.gain); S.push({ name: 'LNA', x, fs });
  x = mix(x, fs, p.fLO); S.push({ name: 'Mixer → IF', x, fs });
  x = maskFilter(x, fs, bandpass(fIF, p.bwIF)); S.push({ name: 'IF band-pass', x, fs });
  if (arch === 'superhet') {
    const z = mix(x, fs, fIF, 0, true); x = maskFilter({ re: z.re.map((v) => 2 * v), im: z.im.map((v) => 2 * v) }, fs, lowpass(p.bwBB)); S.push({ name: 'IQ demodulator', x, fs });
    S.push(adc(x, fs, p.fsADC, p.bits, 'ADC'));
  } else {
    const a = adc(x, fs, p.fsIF, p.bits, 'ADC at IF'); S.push(a);
    const fIFa = Math.abs(((fIF + a.fs / 2) % a.fs) - a.fs / 2); // where the IF lands after sampling
    const z = mix(a.x, a.fs, fIFa, 0, true); S.push({ name: 'Digital down-conversion', x: { re: z.re.map((v) => 2 * v), im: z.im.map((v) => 2 * v) }, fs: a.fs, fIFa });
    const y = maskFilter(S[S.length - 1].x, a.fs, lowpass(p.bwBB)), D = 4; S.push({ name: `Low-pass + decimate ÷${D}`, x: { re: y.re.filter((_, i) => i % D === 0), im: y.im.filter((_, i) => i % D === 0) }, fs: a.fs / D });
  }
  return S;
}
const scale = (x, g) => ({ re: x.re.map((v) => v * g), im: x.im.map((v) => v * g) });
// sample-and-hold at fsNew (an integer divisor of fs is assumed) and quantize to `bits`
export function adc(x, fs, fsNew, bits, name) {
  const step = Math.max(1, Math.round(fs / fsNew)), full = Math.max(1e-9, ...Array.from(x.re, Math.abs), ...Array.from(x.im, Math.abs)), q = 2 * full / 2 ** bits;
  const qz = (v) => Math.round(v / q) * q, re = [], im = [];
  for (let i = 0; i < x.re.length; i += step) { re.push(qz(x.re[i])); im.push(qz(x.im[i])); }
  // keep a power-of-two length for the FFT
  const L = 2 ** Math.floor(Math.log2(re.length));
  return { name, x: { re: Float64Array.from(re.slice(0, L)), im: Float64Array.from(im.slice(0, L)) }, fs: fs / step };
}
// IQ demodulation of a pulse at fc with an LO at fLO and a low-pass of bandwidth bw (as in a pulse receiver)
export function iq(p) {
  const n = p.n, fs = p.fs, re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) { const t = i / fs; re[i] = (t > p.t0 && t < p.t0 + p.tau ? 1 : 0) * Math.cos(2 * Math.PI * p.fc * t + p.phi); }
  const z = mix({ re, im }, fs, p.fLO, 0, true), y = maskFilter({ re: z.re.map((v) => 2 * v), im: z.im.map((v) => 2 * v) }, fs, lowpass(p.bw, 4));
  return { rf: re, I: y.re, Q: y.im };
}
// 10–90 % rise time of a step in |z|
export function riseTime(mag, fs) { const m = Math.max(...mag); let a = -1, b = -1; for (let i = 0; i < mag.length; i++) { if (a < 0 && mag[i] >= 0.1 * m) a = i; if (b < 0 && mag[i] >= 0.9 * m) { b = i; break; } } return (b - a) / fs; }
