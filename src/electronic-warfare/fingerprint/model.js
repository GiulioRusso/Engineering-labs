// Specific emitter identification: one radar pulse in complex baseband through every physical stage that
// shapes it, in order. Transmitter (the fingerprint): modulator edges, droop and supply ripple, oscillator
// offset and phase noise, chirp non-linearity, IQ-modulator imbalance, power amplifier (Saleh AM/AM, AM/PM),
// output filter. Channel: Doppler, two-ray multipath, noise. Receiver (nuisance): LO offset and phase
// noise, low-pass, IQ imbalance and DC, sampling (rate, phase, jitter) and quantisation. Units of one radar
// model draw their hardware from a tolerance spread; temperature, warm-up, aging and supply move them.
// Every coefficient is an illustrative order of magnitude, not a value of a real device. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';
import { fft } from '../../lib/dsp.js';

export const FS = 1e9, T0 = 0.3e-6, C = 299792458, LN9 = Math.log(9);
export const BARKER = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];
export const SALEH = { aa: 2.1587, ba: 1.1517, ap: 4.0033, bp: 9.104 };
export const salehA = (r) => SALEH.aa * r / (1 + SALEH.ba * r * r);
export const salehP = (r) => SALEH.ap * r * r / (1 + SALEH.bp * r * r);
const RSAT = 1 / Math.sqrt(SALEH.ba);               // input amplitude of the PA's peak output: drive 0 dB
// illustrative operating-condition coefficients
export const COEF = { tref: 45, warmRise: 20, warmTau: 10, oscPpmPerC: 0.5, agePpmPerYear: 1, paDbPerC: -0.02, edgePerC: 0.003 };

// SI parameters of a radar model and of the whole scene (the lab converts its controls into these)
export const DEFAULTS = {
  wf: 'pulse', pw: 1e-6, bw: 20e6, fc: 9.4e9,
  edge: 'rc', rise: 20e-9, fall: 30e-9, zeta: 0.5, taud: 30e-6, ripple: 0, fr: 3e6, cfo: 0, lw: 0, nl: 0, drive: -6, ampm: 1,
  txbw: 60e6, txord: 3, txrip: 0, txg: 0, txp: 0,
  spread: 1, temp: 25, warm: 60, age: 0, vsup: 1,
  snr: 40, vel: 0, mpa: 0, mpd: 50e-9, mpp: 0,
  lo: 0, lolw: 0, rxbw: 100e6, rxord: 4, rxg: 0, rxp: 0, dc: 0, fsadc: 500e6, bits: 12, jit: 0, sph: 0, fsc: 1.5,
};
export const recordLength = (pw) => 2 ** Math.ceil(Math.log2((T0 + pw + 0.75e-6) * FS));
export const doppler = (v, fc) => v * fc / C;        // one-way: an ESM receiver intercepting the radar

// a unit of the model: every hardware parameter drawn around its nominal value (same seed, same unit)
export function unit(P, seed) {
  const r = rng(7919 * seed + 101), g = () => gauss(r), s = P.spread;
  return { ...P, rise: P.rise * Math.exp(0.15 * s * g()), fall: P.fall * Math.exp(0.15 * s * g()), zeta: Math.max(0.15, P.zeta + 0.08 * s * g()),
    taud: P.taud * Math.exp(0.25 * s * g()), ripple: P.ripple + 0.003 * s * Math.abs(g()), rph: 2 * Math.PI * r(), cfo: P.cfo + 1.5 * s * g(),
    drive: P.drive + 0.4 * s * g(), ampm: P.ampm * Math.exp(0.2 * s * g()), txbw: P.txbw * Math.exp(0.08 * s * g()), txg: P.txg + 0.15 * s * g(), txp: P.txp + 1.5 * s * g(), nl: P.nl + 0.002 * s * g() };
}
// operating conditions: internal temperature (ambient + warm-up), aging and supply move the unit
export function conditions(U) {
  const Ti = U.temp + COEF.warmRise * (1 - Math.exp(-U.warm / COEF.warmTau)), dT = Ti - COEF.tref, k = 1 + COEF.edgePerC * dT;
  const ppm = U.cfo + COEF.oscPpmPerC * dT + COEF.agePpmPerYear * U.age;
  return { ...U, Ti, ppm, cfoHz: ppm * 1e-6 * U.fc, rise: U.rise * k, fall: U.fall * k, drive: U.drive + COEF.paDbPerC * dT + 20 * Math.log10(U.vsup), taud: U.taud * U.vsup ** 2 };
}

// the intentional waveform: phase θ(t) inside the pulse
export function waveformPhase(P, t) {
  const u = t - T0; if (u < 0 || u >= P.pw) return 0;
  if (P.wf === 'lfm') return Math.PI * P.bw * (u * u / P.pw - u);
  if (P.wf === 'barker') return BARKER[Math.min(12, Math.floor(13 * u / P.pw))] > 0 ? 0 : Math.PI;
  return 0;
}
const gate = (P, t) => (t >= T0 && t < T0 + P.pw ? 1 : 0);
// complex Butterworth low-pass of order n and −3 dB frequency fc (causal: its phase is included)
export function butter(f, fc, n) {
  let re = 1, im = 0;
  for (let k = 1; k <= n; k++) { const a = Math.PI * (2 * k + n - 1) / (2 * n), pr = Math.cos(a), pi = Math.sin(a), dr = -pr, di = f / fc - pi, d = dr * dr + di * di; [re, im] = [(re * dr + im * di) / d, (im * dr - re * di) / d]; }
  return [re, im];
}
// apply a complex frequency response H(f) -> [re, im] to z sampled at fs
export function filterC(z, fs, H) {
  const n = z.re.length, re = Float64Array.from(z.re), im = Float64Array.from(z.im); fft(re, im);
  for (let k = 0; k < n; k++) { const [hr, hi] = H((k < n / 2 ? k : k - n) * fs / n), a = re[k], b = im[k]; re[k] = a * hr - b * hi; im[k] = a * hi + b * hr; }
  fft(re, im, true); return { re, im };
}
// IQ imbalance as z → K1 z + K2 z*; image rejection ratio |K1|²/|K2|²
export function imbalance(gDb, pDeg) { const g = 10 ** (gDb / 20), d = pDeg * Math.PI / 180; return { k1: [(1 + g * Math.cos(d)) / 2, -g * Math.sin(d) / 2], k2: [(1 - g * Math.cos(d)) / 2, -g * Math.sin(d) / 2] }; }
export const irr = (gDb, pDeg) => { const g = 10 ** (gDb / 20), d = pDeg * Math.PI / 180; return (1 + 2 * g * Math.cos(d) + g * g) / (1 - 2 * g * Math.cos(d) + g * g); };
function applyImb(z, gDb, pDeg) {
  const { k1, k2 } = imbalance(gDb, pDeg), n = z.re.length, re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) { const a = z.re[i], b = z.im[i]; re[i] = k1[0] * a - k1[1] * b + k2[0] * a + k2[1] * b; im[i] = k1[0] * b + k1[1] * a - k2[0] * b + k2[1] * a; }
  return { re, im };
}
// quantise one rail: `bits` over ±fsc, clipping beyond
export const quantize = (v, bits, fsc) => { const q = 2 * fsc / 2 ** bits; return Math.max(-fsc + q / 2, Math.min(fsc - q / 2, (Math.floor(v / q) + 0.5) * q)); };   // mid-rise, 2^bits levels
// sample z (on a grid at fs) at fsA with a sub-sample phase (0–1 of a sample) and rms aperture jitter; quantise
export function sample(z, fs, fsA, sph, jit, bits, fsc, r) {
  const n = z.re.length, at = (a, x) => { const i = Math.floor(x), u = x - i, p = (k) => a[Math.max(0, Math.min(n - 1, k))]; const y0 = p(i - 1), y1 = p(i), y2 = p(i + 1), y3 = p(i + 2); return y1 + 0.5 * u * (y2 - y0 + u * (2 * y0 - 5 * y1 + 4 * y2 - y3 + u * (3 * (y1 - y2) + y3 - y0))); };
  const re = [], im = [], t = [];
  for (let k = 0; ; k++) { const tk = (k + sph) / fsA; if (tk >= (n - 2) / fs) break; const x = (tk + (jit ? jit * gauss(r) : 0)) * fs; t.push(tk); re.push(quantize(at(z.re, x), bits, fsc)); im.push(quantize(at(z.im, x), bits, fsc)); }
  return { re: Float64Array.from(re), im: Float64Array.from(im), t };
}
const rot = (z, ph) => { const n = z.re.length, re = new Float64Array(n), im = new Float64Array(n); for (let i = 0; i < n; i++) { const c = Math.cos(ph[i]), s = Math.sin(ph[i]); re[i] = z.re[i] * c - z.im[i] * s; im[i] = z.re[i] * s + z.im[i] * c; } return { re, im }; };
// Wiener phase noise of linewidth β: increments of variance 2πβ/fs
export const wiener = (n, beta, fs, r) => { const out = new Float64Array(n), s = Math.sqrt(2 * Math.PI * beta / fs); for (let i = 1; i < n; i++) out[i] = out[i - 1] + (beta ? s * gauss(r) : 0); return out; };

// the modulator envelope: gated drive with droop and supply ripple, through a first- or second-order edge
export function envelope(U, n) {
  const a = new Float64Array(n), pm = new Float64Array(n), dt = 1 / FS, SUB = 8, h = dt / SUB;
  let x = 0, v = 0;
  for (let i = 0; i < n; i++) {
    const t = i * dt, on = gate(U, t), rp = U.ripple * Math.sin(2 * Math.PI * U.fr * t + (U.rph || 0)), u = on * Math.exp(-(t - T0) / U.taud) * (1 + rp);
    if (U.edge === '2nd') { const w = LN9 / 1.2 / (on ? U.rise : U.fall); for (let k = 0; k < SUB; k++) { v += h * (w * w * (u - x) - 2 * U.zeta * w * v); x += h * v; } }
    else x += (u - x) * (1 - Math.exp(-dt / ((on ? U.rise : U.fall) / LN9)));
    a[i] = x; pm[i] = 0.3 * rp * on;
  }
  return { a, pm };
}

// the Tx output filter: Butterworth of RF bandwidth txbw (baseband cutoff txbw/2), with passband ripple from a weak
// echo inside the filter or waveguide (amplitude and group-delay ripple together)
export function txH(U) {
  const ea = (10 ** (U.txrip / 20) - 1) / (10 ** (U.txrip / 20) + 1), te = 3 / U.txbw;
  return (f) => { const [hr, hi] = butter(f, U.txbw / 2, U.txord), er = 1 + ea * Math.cos(2 * Math.PI * f * te), ei = -ea * Math.sin(2 * Math.PI * f * te); return [(hr * er - hi * ei) / (1 + ea), (hr * ei + hi * er) / (1 + ea)]; };
}
// the whole chain for unit `seed`; o.noise false gives the noiseless pulse; o.pulse picks the noise realisation;
// o.rx overrides receiver parameters (a second receiver). Returns every stage (1 GS/s, the ADC at its own rate).
export function run(P, seed, o = {}) {
  const R = { ...P, ...(o.rx || {}) }, U = conditions(o.ideal ? { ...P, spread: 0 } : unit(P, seed)), n = recordLength(P.pw), t = Float64Array.from({ length: n }, (_, i) => i / FS);
  const r = rng(1000003 * (o.pulse || 0) + 17 * seed + 5), S = [], push = (id, z, fs = FS) => { S.push({ id, z, fs }); return z; };
  const th = t.map((tt) => waveformPhase(P, tt));
  let z = push('wave', { re: t.map((tt, i) => gate(P, tt) * Math.cos(th[i])), im: t.map((tt, i) => gate(P, tt) * Math.sin(th[i])) });
  // transmitter
  const E = envelope(U, n); z = push('mod', rot({ re: E.a.map((v, i) => v * Math.cos(th[i])), im: E.a.map((v, i) => v * Math.sin(th[i])) }, E.pm));
  const pn = wiener(n, U.lw, FS, r); let nlp = 0;
  const oph = t.map((tt, i) => { if (P.wf === 'lfm' && tt >= T0 && tt < T0 + P.pw) { const u = (tt - T0) / P.pw; nlp += 2 * Math.PI * U.nl * P.bw * ((2 * u - 1) ** 2 - 1 / 3) / FS; } return 2 * Math.PI * U.cfoHz * tt + pn[i] + nlp; });
  z = push('osc', applyImb(rot(z, oph), U.txg, U.txp));
  const r0 = RSAT * 10 ** (P.drive / 20), gIn = RSAT * 10 ** (U.drive / 20), norm = salehA(r0);
  z = push('pa', { re: z.re.map((v, i) => { const m = Math.hypot(v, z.im[i]), ri = gIn * m; return m ? salehA(ri) / norm * Math.cos(Math.atan2(z.im[i], v) + U.ampm * salehP(ri)) : 0; }), im: z.im.map((v, i) => { const m = Math.hypot(z.re[i], v), ri = gIn * m; return m ? salehA(ri) / norm * Math.sin(Math.atan2(v, z.re[i]) + U.ampm * salehP(ri)) : 0; }) });
  z = push('txf', filterC(z, FS, txH(U)));
  // channel: Doppler, a second path, noise scaled so the SNR in the receiver bandwidth is R.snr (plateau ≈ 1)
  const fd = doppler(P.vel, P.fc), d = Math.round(P.mpd * FS), mc = P.mpa * Math.cos(P.mpp * Math.PI / 180), ms = P.mpa * Math.sin(P.mpp * Math.PI / 180);
  let ch = rot(z, t.map((tt) => 2 * Math.PI * fd * tt));
  if (P.mpa) { const a = ch; ch = { re: a.re.map((v, i) => v + (i >= d ? mc * a.re[i - d] - ms * a.im[i - d] : 0)), im: a.im.map((v, i) => v + (i >= d ? mc * a.im[i - d] + ms * a.re[i - d] : 0)) }; }
  const Hrx = (f) => butter(f, R.rxbw, R.rxord);
  if (o.noise !== false) { let enb = 0; for (let k = 0; k < n; k++) { const [a, b] = Hrx((k < n / 2 ? k : k - n) * FS / n); enb += (a * a + b * b) * FS / n; } const s = Math.sqrt(10 ** (-R.snr / 10) * FS / enb / 2); ch = { re: ch.re.map((v) => v + s * gauss(r)), im: ch.im.map((v) => v + s * gauss(r)) }; }
  z = push('chan', ch);
  // receiver
  const lpn = wiener(n, R.lolw, FS, r); z = push('lo', rot(z, t.map((tt, i) => 2 * Math.PI * R.lo * tt + lpn[i])));
  z = push('rxf', filterC(z, FS, Hrx));
  const zi = applyImb(z, R.rxg, R.rxp); z = push('iq', { re: zi.re.map((v) => v + R.dc), im: zi.im.map((v) => v + R.dc) });
  const A = sample(z, FS, R.fsadc, R.sph, R.jit, R.bits, R.fsc, r); S.push({ id: 'adc', z: { re: A.re, im: A.im }, fs: R.fsadc, t: A.t });
  return { stages: S, U, fd, th, t };
}
export const STAGES = ['wave', 'mod', 'osc', 'pa', 'txf', 'chan', 'lo', 'rxf', 'iq', 'adc'];
// average of N noisy pulses of the same unit (aligned): noise falls as √N
// (with no random phase or timing the pulses differ only in their noise: one run at SNR + 10 log₁₀ N is the same thing)
export function integrate(P, seed, N, o = {}) {
  const R = { ...P, ...(o.rx || {}) };
  if (N === 1 || (!P.lw && !R.lolw && !R.jit)) return run({ ...P, snr: P.snr + 10 * Math.log10(N) }, seed, { ...o, rx: o.rx && { ...o.rx, snr: R.snr + 10 * Math.log10(N) } });
  const runs = Array.from({ length: N }, (_, k) => run(P, seed, { ...o, pulse: (o.pulse0 || 0) + k })), out = runs[0];
  if (N === 1) return out;
  out.stages = out.stages.map((s, j) => ({ ...s, z: { re: s.z.re.map((_, i) => runs.reduce((a, R) => a + R.stages[j].z.re[i], 0) / N), im: s.z.im.map((_, i) => runs.reduce((a, R) => a + R.stages[j].z.im[i], 0) / N) } }));
  return out;
}

export const unwrap = (ph) => { const o = Float64Array.from(ph); for (let i = 1; i < o.length; i++) { let d = o[i] - o[i - 1]; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); o[i] = o[i - 1] + d; } return o; };
const lfit = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } const b = sxx ? sxy / sxx : 0; return { a: my - b * mx, b }; };
// pulse measurements: segments (rise, plateau, fall), 10–90 % times, droop, ripple, CFO from the phase slope
// after removing the intentional waveform, and the rms phase left after linear detrending
export function measure(z, ts, P) {
  const n = z.re.length, mag = Array.from(z.re, (v, i) => Math.hypot(v, z.im[i])), mx = Math.max(...mag);
  let i0 = mag.findIndex((v) => v > 0.5 * mx), i1 = n - 1 - [...mag].reverse().findIndex((v) => v > 0.5 * mx);
  const mid = mag.slice(i0 + Math.round(0.25 * (i1 - i0)), i0 + Math.round(0.75 * (i1 - i0)) + 1).sort((a, b) => a - b), L = mid[Math.floor(mid.length / 2)] || mx;
  // rise: walk back from the 50 % crossing; fall: forward from the last one
  let r10 = NaN, r90 = NaN, f90 = NaN, f10 = NaN;
  for (let i = i0; i > 0; i--) if (mag[i - 1] < 0.1 * L) { r10 = ts[i - 1] + (ts[i] - ts[i - 1]) * (0.1 * L - mag[i - 1]) / (mag[i] - mag[i - 1]); break; }
  for (let i = i0; i < n; i++) if (mag[i] >= 0.9 * L) { r90 = ts[i - 1] + (ts[i] - ts[i - 1]) * (0.9 * L - mag[i - 1]) / (mag[i] - mag[i - 1]); break; }
  for (let i = i1; i > i0; i--) if (mag[i] >= 0.9 * L) { f90 = ts[i] + (ts[i + 1] - ts[i]) * (mag[i] - 0.9 * L) / (mag[i] - mag[i + 1]); break; }
  for (let i = i1; i < n - 1; i++) if (mag[i + 1] < 0.1 * L) { f10 = ts[i] + (ts[i + 1] - ts[i]) * (mag[i] - 0.1 * L) / (mag[i] - mag[i + 1]); break; }
  // plateau: between the 90 % points, minus 10 % of its length at each end
  const pl = (f90 - r90), pa = r90 + 0.1 * pl, pb = f90 - 0.1 * pl, idx = []; for (let i = 0; i < n; i++) if (ts[i] >= pa && ts[i] <= pb) idx.push(i);
  const tx = idx.map((i) => ts[i]), A = lfit(tx, idx.map((i) => mag[i])), droop = idx.length > 2 ? (A.b * (tx[0] - tx.at(-1))) / (A.a + A.b * tx[0]) : 0;
  const dev = idx.map((i, k) => mag[i] - A.a - A.b * tx[k]), ripple = dev.length ? (Math.max(...dev) - Math.min(...dev)) / L : 0;
  // phase relative to the intentional waveform, aligned on the 50 % rise crossing
  const t50 = (() => { for (let i = 1; i < n; i++) if (mag[i] >= 0.5 * L) return ts[i - 1] + (ts[i] - ts[i - 1]) * (0.5 * L - mag[i - 1]) / (mag[i] - mag[i - 1]); return T0; })(), dl = t50 - T0;   // for a chirp, delay and frequency offset trade off
  const rel = Array.from(z.re, (v, i) => Math.atan2(z.im[i], v) - waveformPhase(P, ts[i] - dl)), up = unwrap(rel), F = lfit(tx, idx.map((i) => up[i]));
  const det = Array.from(up, (v, i) => v - F.a - F.b * ts[i]), phRms = idx.length ? Math.sqrt(idx.reduce((s, i) => s + det[i] ** 2, 0) / idx.length) : 0;
  return { mag, L, rise: r90 - r10, fall: f10 - f90, r10, r90, f90, f10, droop, ripple, cfo: F.b / (2 * Math.PI), phRms, det, unwrapped: unwrap(Array.from(z.re, (v, i) => Math.atan2(z.im[i], v))), rel: up, plateau: [pa, pb], idx };
}

// a second receiver for "same unit, two receivers" (illustrative: narrower, unbalanced, its own LO)
export const RX2 = (R) => ({ rxbw: R.rxbw * 0.4, rxord: 2, rxg: R.rxg + 0.6, rxp: R.rxp + 4, lo: R.lo + 40e3, dc: R.dc + 0.02 });
// spectrum in dB (re `ref`, or its own peak), zero-padded to a power of two, centred: { f (Hz), dB }
export function spectrum(z, fs, ref) {
  const n = 2 ** Math.ceil(Math.log2(z.re.length) + 1), re = new Float64Array(n), im = new Float64Array(n); re.set(z.re); im.set(z.im); fft(re, im);
  const f = [], m = []; for (let i = 0; i < n; i++) { const k = (i + n / 2) % n; f.push((k < n / 2 ? k : k - n) * fs / n); m.push(Math.hypot(re[k], im[k]) / fs); }
  const mx = ref ?? Math.max(...m); return { f, dB: m.map((v) => 20 * Math.log10(Math.max(v / mx, 1e-5))), peak: Math.max(...m) };
}
// instantaneous frequency (Hz) from the phase step between samples, averaged over ~8 ns; NaN where |z| < floor
export function instFreq(z, fs, floor) {
  const n = z.re.length, M = Math.max(1, Math.round(8e-9 * fs)), f = new Float64Array(n).fill(NaN);
  for (let i = M; i < n - M; i++) { if (Math.hypot(z.re[i], z.im[i]) < floor) continue; const a = i - M, b = i + M, re = z.re[b] * z.re[a] + z.im[b] * z.im[a], im = z.im[b] * z.re[a] - z.re[b] * z.im[a]; f[i] = Math.atan2(im, re) * fs / (2 * Math.PI * 2 * M); }
  return f;
}
// how far apart two noiseless pulses are, in units of the per-sample noise at the given SNR (dB, on the plateau):
// rms difference of the amplitudes, each normalised to its own top (the received level depends on range, it is
// no identity), and rms difference of the detrended phases on the plateau
export function separability(za, zb, ts, P, snr) {
  const a = measure(za, ts, P), b = measure(zb, ts, P), on = a.mag.map((v, i) => Math.max(v / a.L, b.mag[i] / b.L) > 0.1), sig = 1 / Math.sqrt(2 * 10 ** (snr / 10));
  let s = 0, k = 0; on.forEach((v, i) => { if (v) { s += (a.mag[i] / a.L - b.mag[i] / b.L) ** 2; k++; } }); const dA = Math.sqrt(s / Math.max(1, k)) / sig;
  const dP = a.idx.length ? Math.sqrt(a.idx.reduce((q, i) => q + (a.det[i] - b.det[i]) ** 2, 0) / a.idx.length) / sig : 0;
  return { dA, dP, d: Math.hypot(dA, dP), a, b };
}
