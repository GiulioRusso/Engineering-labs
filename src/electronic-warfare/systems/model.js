// System architectures, signal by signal: what the waveform looks like at the output of every physical
// block of a pulsed radar, a coherent pulse-Doppler radar, an AESA, an ESM receiver and a DRFM jammer.
// One window of N samples; carriers are drawn slowed down (a few cycles per pulse) so the shapes read.
// Levels (dBm) come from the radar equation. Pure, no DOM.
import { gaussian } from '../../lib/dsp.js';
import { signalPower, KB, T0, db } from '../radar/model.js';

export const N = 360;
const ts = Array.from({ length: N }, (_, i) => i / N);
const rect = (t, a, b) => (t >= a && t < b ? 1 : 0);
const make = (f) => ts.map(f);
export const movavg = (x, k) => { const h = Math.floor(k / 2); return x.map((_, i) => { let s = 0, n = 0; for (let j = i - h; j <= i + h; j++) if (j >= 0 && j < x.length) { s += x[j]; n++; } return s / n; }); };
export const envelope = (x, k) => movavg(x.map((v) => v * v), k).map((v) => Math.sqrt(2 * v));
const noiseOf = (seed) => { const g = gaussian(seed); return ts.map(() => g()); };
const dBm = (W) => db(W) + 30;
export const W = (dbm) => 10 ** ((dbm - 30) / 10);

// echo power and noise power for a monostatic radar (SI in, dBm out)
export function budget({ PtW = 1e6, Gdb = 33, f = 10e9, rcs = 1, Rkm = 60, B = 1e6, Fdb = 3 }) {
  const lam = 299792458 / f, G = 10 ** (Gdb / 10), Pr = signalPower({ Pt: PtW, G, lam, rcs, R: Rkm * 1e3 }), Pn = KB * T0 * B * 10 ** (Fdb / 10);
  return { Pt: dBm(PtW), Pr: dBm(Pr), Pn: dBm(Pn), snr: db(Pr / Pn) };
}

// ---- pulsed (non-coherent) radar: magnetron, duplexer, superhet receiver, envelope detector, A-scope ----
export function pulsed({ Rkm = 60, Rmax = 150, isol = 25, limit = 10, gLNA = 25, gIF = 40, seed = 3 }) {
  const b = budget({ Rkm }), tau = 0.08, t0 = 0.04, d = t0 + 0.12 + 0.68 * Rkm / Rmax, ph = 1.3 + Rkm, fc = 50, fi = 15;
  const n = noiseOf(seed), a = 10 ** (b.snr / 20) * Math.SQRT2;               // echo amplitude in units of the noise rms
  const leakA = 10 ** ((b.Pt - isol - b.Pn) / 20), limA = 10 ** ((limit - b.Pn) / 20);
  const rf = (t, f, A, t1, p = 0) => A * rect(t, t1, t1 + tau) * Math.cos(2 * Math.PI * f * t + p);
  const sync = make((t) => (t >= t0 && t < t0 + 0.008 ? 1 : 0)), mod = make((t) => -rect(t, t0, t0 + tau));
  const tx = make((t) => rf(t, fc, 1, t0));
  const echo = make((t, i) => rf(t, fc, a, d, ph) + n[i]);
  const dup = make((t, i) => rf(t, fc, leakA, t0) + echo[i]);
  const lim = dup.map((v) => Math.max(-limA, Math.min(limA, v)));
  const ifr = make((t, i) => rf(t, fi, a, d, ph) + n[i] + rf(t, fi, limA, t0));
  const ifo = movavg(ifr, 3);
  const det = envelope(ifo, 9);
  return { d, tau, t0, snr: b.snr, levels: b, leakDbm: b.Pt - isol, limit, sig: { sync, mod, tx, ant: echo, dup, lim, lna: lim, mix: ifr, ifa: ifo, det, vid: det } };
}

// ---- coherent pulse-Doppler radar: everything locked to one reference; chirp, IQ, compression, Doppler FFT ----
export const PULSES = 16;
export function coherent({ Rkm = 40, Rmax = 100, v = 120, vmax = 300, snrDb = 6, B = 6, seed = 5 }) {
  const n = noiseOf(seed), n2 = noiseOf(seed + 1), tau = 0.18, t0 = 0.05, d = t0 + 0.2 + 0.5 * Rkm / Rmax, a = 10 ** (snrDb / 20) * Math.SQRT2 * 0.5;
  const fd = v / vmax / 2;                                                    // Doppler in cycles per pulse (±½ = the PRF limit)
  const chirpPh = (t) => { const u = t / tau - 0.5; return Math.PI * B * tau * u * u * 6; };  // quadratic phase: linear FM
  const ch = (t, t1) => rect(t, t1, t1 + tau) * chirpPh(t - t1);
  const ref = make((t) => Math.cos(2 * Math.PI * 30 * t)), coho = make((t) => Math.cos(2 * Math.PI * 8 * t)), stalo = make((t) => Math.cos(2 * Math.PI * 30 * t));
  const dds = make((t) => rect(t, t0, t0 + tau) * Math.cos(2 * Math.PI * 8 * (t - t0) + ch(t, t0)));
  const rf = make((t) => rect(t, t0, t0 + tau) * Math.cos(2 * Math.PI * 38 * (t - t0) + ch(t, t0)));
  const phase0 = 0.9;                                                          // echo phase of pulse 0; pulse k adds 2π fd k
  const echo = make((t, i) => a * rect(t, d, d + tau) * Math.cos(2 * Math.PI * 38 * (t - d) + ch(t, d) + phase0) + n[i]);
  const ifs = make((t, i) => a * rect(t, d, d + tau) * Math.cos(2 * Math.PI * 8 * (t - d) + ch(t, d) + phase0) + n[i]);
  const I = make((t, i) => a * rect(t, d, d + tau) * Math.cos(ch(t, d) + phase0) + n[i] * 0.7), Q = make((t, i) => a * rect(t, d, d + tau) * Math.sin(ch(t, d) + phase0) + n2[i] * 0.7);
  const step = 6, adcI = I.filter((_, i) => i % step === 0), adcQ = Q.filter((_, i) => i % step === 0);
  // matched filter: correlate the IQ samples with the transmitted chirp replica
  const rep = []; for (let i = 0; i < N; i++) if (ts[i] >= t0 && ts[i] < t0 + tau) rep.push([Math.cos(ch(ts[i], t0)), Math.sin(ch(ts[i], t0))]);
  const pc = ts.map((_, i) => { let re = 0, im = 0; for (let k = 0; k < rep.length; k++) { const j = i + k; if (j >= N) break; re += I[j] * rep[k][0] + Q[j] * rep[k][1]; im += Q[j] * rep[k][0] - I[j] * rep[k][1]; } return Math.hypot(re, im) / rep.length; });
  const peak = pc.indexOf(Math.max(...pc));
  // Doppler: the compressed peak of each of PULSES pulses, phase advancing by 2π fd per pulse, then a DFT
  const g = gaussian(seed + 7), noiseP = 1 / Math.sqrt(rep.length);
  const cells = Array.from({ length: PULSES }, (_, k) => [Math.cos(2 * Math.PI * fd * k + phase0) * a + g() * noiseP, Math.sin(2 * Math.PI * fd * k + phase0) * a + g() * noiseP]);
  const dop = Array.from({ length: PULSES }, (_, m) => { const f = (m - PULSES / 2) / PULSES; let re = 0, im = 0; cells.forEach(([x, y], k) => { const c = Math.cos(2 * Math.PI * f * k), s = Math.sin(2 * Math.PI * f * k); re += x * c + y * s; im += y * c - x * s; }); return Math.hypot(re, im) / PULSES; });
  const floor = movavg(dop, 7), thr = floor.map((v) => v * 2.2 + 0.15 * a), bin = dop.indexOf(Math.max(...dop)) - PULSES / 2;
  const hit = dop.map((v, i) => (v > thr[i] ? v : 0));
  return { d, tau, t0, fd, bin, peak, sig: { ref, coho, stalo, dds, up: rf, twt: rf, circ: rf, ant: echo, lna: echo, down: ifs, iq: [I, Q], adc: [adcI, adcQ], pc, fft: dop, cfar: [dop, thr], hit, cells } };
}

// ---- AESA: one T/R module per element; phase shifters line the elements up for the steering angle ----
export function aesa({ M = 6, steer = 20, target = 20, cyc = 3 }) {
  const s = (deg) => Math.sin(deg * Math.PI / 180);
  const rx = Array.from({ length: M }, (_, m) => m * Math.PI * s(target));        // phase lag of element m for the arriving wave (d = λ/2)
  const sh = Array.from({ length: M }, (_, m) => -m * Math.PI * s(steer));        // phase shifter setting
  const wave = (p) => make((t) => Math.cos(2 * Math.PI * cyc * t - p));
  const before = rx.map((p) => wave(p)), after = rx.map((p, m) => wave(p + sh[m]));
  const sum = make((_, i) => after.reduce((acc, w) => acc + w[i], 0) / M);
  const af = (deg) => { let re = 0, im = 0; for (let m = 0; m < M; m++) { const p = m * Math.PI * (s(deg) - s(steer)); re += Math.cos(p); im += Math.sin(p); } return Math.hypot(re, im) / M; };
  const tx = sh.map((p) => wave(-p));                                               // transmit: each element fed with its own phase
  return { shifts: sh.map((p) => ((p * 180 / Math.PI) % 360 + 540) % 360 - 180), gain: af(target), af, sig: { before, after, sum, tx } };
}

// ---- ESM / RWR: two radars interleaved at the antenna; pulse descriptor words; deinterleaving by PRI ----
export const EMITTERS = [{ name: 'search radar', pri: 0.23, pw: 0.03, amp: 0.55, toa0: 0.05, f: 3.1, aoa: -40 }, { name: 'fire-control radar', pri: 0.09, pw: 0.012, amp: 1, toa0: 0.02, f: 9.4, aoa: 25 }];
export function esm({ seed = 9, noise = 0.05, show = 2 } = {}) {
  const n = noiseOf(seed), em = EMITTERS.slice(0, show), pdw = [];
  for (const e of em) for (let t = e.toa0; t < 1; t += e.pri) pdw.push({ toa: t, pw: e.pw, amp: e.amp, f: e.f, aoa: e.aoa, who: e.name });
  pdw.sort((a, b) => a.toa - b.toa);
  const train = (list, carrier) => make((t, i) => list.reduce((acc, p) => acc + p.amp * rect(t, p.toa, p.toa + p.pw) * (carrier ? Math.cos(2 * Math.PI * 90 * p.f / 9.4 * t) : 1), 0) + (carrier ? noise * n[i] : 0));
  const rf = train(pdw, true), video = make((t, i) => Math.max(0, pdw.reduce((acc, p) => acc + p.amp * rect(t, p.toa, p.toa + p.pw), 0) + noise * 0.3 * n[i]));
  // deinterleave: histogram of TOA differences picks the PRIs, then each PRI's pulses are pulled out
  const diffs = []; for (let i = 0; i < pdw.length; i++) for (let j = i + 1; j < pdw.length; j++) diffs.push(pdw[j].toa - pdw[i].toa);
  const pri = em.map((e) => diffs.filter((x) => Math.abs(x - e.pri) < 0.004).length > 1 ? e.pri : null);
  const split = em.map((e) => train(pdw.filter((p) => p.who === e.name), false));
  return { pdw, pri, sig: { rf, video, split } };
}

// ---- DRFM jammer: sample the radar pulse, store it, play it back late and Doppler-shifted, retransmit ----
export function drfm({ delay = 0.12, dop = 0, js = 6, bits = 3, seed = 11 }) {
  const n = noiseOf(seed), tau = 0.16, t0 = 0.08, fc = 40, fb = 6, q = 2 / 2 ** bits;
  const pulse = (t, f, a, t1, df = 0) => a * rect(t, t1, t1 + tau) * Math.cos(2 * Math.PI * (f + df) * (t - t1) + 0.4);
  const rx = make((t, i) => pulse(t, fc, 1, t0) + 0.03 * n[i]);
  const bb = make((t, i) => pulse(t, fb, 1, t0) + 0.03 * n[i]);
  const adc = bb.map((v) => Math.round(v / q) * q);
  const tmod = make((t) => { const j = Math.round((t - delay) * N); return j >= 0 && j < N ? adc[j] : 0; }).map((v, i) => v * Math.cos(2 * Math.PI * dop * ts[i]));
  const dac = movavg(tmod, 3), up = make((t) => pulse(t, fc, 1, t0 + delay, dop)), A = 10 ** (js / 20);
  const victim = make((t, i) => pulse(t, fc, 1, t0 + 0.02) + pulse(t, fc, A, t0 + 0.02 + delay, dop) + 0.05 * n[i]);
  return { tau, t0, A, sig: { rx, lna: rx, down: bb, adc, mem: adc, mod: tmod, dac, up, pa: up, victim } };
}
