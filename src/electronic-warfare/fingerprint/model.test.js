import { DEFAULTS, FS, T0, LN9, COEF, run, unit, conditions, envelope, measure, butter, filterC, wiener, salehA, salehP, imbalance, irr, quantize, sample, doppler, recordLength } from './model.js';
import { fft } from '../../lib/dsp.js';
import { rng } from '../../lib/random.js';
import { near, ok } from '../../lib/testing.js';

const P = { ...DEFAULTS, spread: 0, snr: 300, warm: 1e9 }, ts = (n, fs = FS) => Float64Array.from({ length: n }, (_, i) => i / fs);
const stage = (R, id) => R.stages.find((s) => s.id === id);
const env = (U) => { const n = recordLength(U.pw), E = envelope({ ...conditions(U), rph: 0 }, n); return { re: E.a, im: new Float64Array(n) }; };

export const tests = {
  'modulator: RC edge 10–90 % = ln 9 · RC; droop: end/start = e^(−PW/τd)'() {
    const RC = 10e-9, m = measure(env({ ...P, rise: LN9 * RC, fall: LN9 * RC, taud: 1e9 }), ts(recordLength(P.pw)), P);
    near(m.rise, LN9 * RC, 0.02, 'rise'); near(m.fall, LN9 * RC, 0.02, 'fall');
    const U = { ...P, rise: 2e-9, taud: 5e-6, warm: 1e9, temp: COEF.tref - COEF.warmRise }, a = envelope({ ...conditions(U), rph: 0 }, recordLength(P.pw)).a, i1 = Math.round((T0 + 0.1e-6) * FS), i2 = Math.round((T0 + P.pw - 1e-9) * FS);
    near(a[i2] / a[i1], Math.exp(-(i2 - i1) / FS / 5e-6), 1e-3, 'droop');
  },
  'receiver: a first-order low-pass of bandwidth B rises in ≈ 0.35/B'() {
    const n = 4096, g = { re: Float64Array.from({ length: n }, (_, i) => (i >= 300 && i < 2300 ? 1 : 0)), im: new Float64Array(n) };
    for (const B of [10e6, 30e6]) { const y = filterC(g, FS, (f) => butter(f, B, 1)); near(measure(y, ts(n), P).rise, LN9 / (2 * Math.PI * B), 0.03, `B = ${B / 1e6} MHz`); }
  },
  'oscillator: a frequency offset leaves |z| unchanged, adds a phase slope 2πΔf, and detrending removes it'() {
    const ppm = 30, A = run(P, 1, { noise: false }), B = run({ ...P, cfo: ppm }, 1, { noise: false }), za = stage(A, 'osc').z, zb = stage(B, 'osc').z;
    ok(za.re.every((v, i) => Math.abs(Math.hypot(v, za.im[i]) - Math.hypot(zb.re[i], zb.im[i])) < 1e-12), '|z|');
    const df = B.U.cfoHz - A.U.cfoHz, m = measure(zb, ts(zb.re.length), P); near(df, ppm * 1e-6 * P.fc, 1e-9, 'ppm');
    near(m.cfo - measure(za, ts(za.re.length), P).cfo, df, 1e-6, 'slope'); ok(m.phRms < 1e-6, `detrended rms ${m.phRms}`);
  },
  'phase noise: a Wiener phase has variance 2πβt (Monte Carlo within 3σ)'() {
    const beta = 50e3, n = 1000, M = 600, r = rng(3), end = []; for (let k = 0; k < M; k++) end.push(wiener(n, beta, FS, r)[n - 1]);
    const v = end.reduce((s, x) => s + x * x, 0) / M, want = 2 * Math.PI * beta * (n - 1) / FS; ok(Math.abs(v - want) < 3 * want * Math.sqrt(2 / M), `var ${v} vs ${want}`);
  },
  'Doppler v·fc/c; temperature offset = ppm/°C × ΔT × fc'() {
    near(doppler(300, 10e9), 300 * 10e9 / 299792458, 1e-12, 'fd');
    const a = conditions({ ...P, temp: 25, warm: 1e9 }), b = conditions({ ...P, temp: 35, warm: 1e9 }); near(b.cfoHz - a.cfoHz, COEF.oscPpmPerC * 10 * 1e-6 * P.fc, 1e-9, 'temp');
  },
  'amplifier: Saleh AM/AM and AM/PM against the closed form; a constant envelope gives a constant AM/PM phase'() {
    const R = run({ ...P, rise: 1e-9, fall: 1e-9, taud: 1e9, txbw: 900e6 }, 1, { noise: false }), z = stage(R, 'pa').z, rsat = 1 / Math.sqrt(1.1517), r0 = rsat * 10 ** (P.drive / 20), i = Math.round((T0 + 0.5e-6) * FS);
    near(Math.hypot(z.re[i], z.im[i]), 1, 1e-9, 'normalised AM/AM'); near(Math.atan2(z.im[i], z.re[i]), salehP(r0), 1e-9, 'AM/PM');
    near(salehA(rsat), 2.1587 / (2 * Math.sqrt(1.1517)), 1e-12, 'peak of A(r)');
    const ph = []; for (let k = i - 300; k < i + 300; k++) ph.push(Math.atan2(z.im[k], z.re[k])); ok(Math.max(...ph) - Math.min(...ph) < 1e-9, 'flat phase');
  },
  'IQ imbalance: the measured image rejection equals the closed-form IRR'() {
    const n = 1024, k0 = 37, x = { re: Float64Array.from({ length: n }, (_, i) => Math.cos(2 * Math.PI * k0 * i / n)), im: Float64Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * k0 * i / n)) };
    for (const [g, p] of [[0.5, 0], [0, 3], [1, -5]]) {
      const { k1, k2 } = imbalance(g, p), re = x.re.map((a, i) => k1[0] * a - k1[1] * x.im[i] + k2[0] * a + k2[1] * x.im[i]), im = x.im.map((b, i) => k1[0] * b + k1[1] * x.re[i] - k2[0] * b + k2[1] * x.re[i]);
      fft(re, im); near(Math.hypot(re[k0], im[k0]) ** 2 / Math.hypot(re[n - k0], im[n - k0]) ** 2, irr(g, p), 1e-9, `IRR ${g} dB ${p}°`);
    }
  },
  'ADC: quantisation SNR ≈ 6.02 N + 1.76 dB; jitter SNR ≈ −20 log₁₀(2π f σj)'() {
    const n = 20000, f = 0.01234567;
    for (const b of [6, 10]) { let s = 0, e = 0; for (let i = 0; i < n; i++) { const v = Math.sin(2 * Math.PI * f * i) * (1 - 1e-9); s += v * v; e += (quantize(v, b, 1) - v) ** 2; } near(10 * Math.log10(s / e), 6.02 * b + 1.76, 0.02, `${b} bits`); }
    const fsig = 50e6, sj = 20e-12, m = 8192, z = { re: Float64Array.from({ length: m }, (_, i) => Math.cos(2 * Math.PI * fsig * i / FS)), im: Float64Array.from({ length: m }, (_, i) => Math.sin(2 * Math.PI * fsig * i / FS)) };
    const A = sample(z, FS, 250e6, 0, sj, 24, 2, rng(9)); let e = 0; A.t.forEach((tk, k) => { e += (A.re[k] - Math.cos(2 * Math.PI * fsig * tk)) ** 2 + (A.im[k] - Math.sin(2 * Math.PI * fsig * tk)) ** 2; });
    near(10 * Math.log10(A.t.length / e), -20 * Math.log10(2 * Math.PI * fsig * sj), 0.03, 'jitter');
  },
  'units: same seed ⇒ same unit; spread 0 ⇒ A = B; no second path ⇒ one path'() {
    const Q = { ...DEFAULTS }, a = unit(Q, 4), b = unit(Q, 4), c = unit(Q, 5); ok(JSON.stringify(a) === JSON.stringify(b), 'same seed'); ok(a.rise !== c.rise, 'different units differ');
    const A = run({ ...Q, spread: 0 }, 1, { noise: false }), B = run({ ...Q, spread: 0 }, 2, { noise: false }); ok(stage(A, 'adc').z.re.every((v, i) => v === stage(B, 'adc').z.re[i]), 'A = B');
    const M = run({ ...Q, mpa: 0, mpd: 120e-9 }, 1, { noise: false }), D = run({ ...Q, mpa: 0, mpd: 10e-9 }, 1, { noise: false }); ok(stage(M, 'chan').z.im.every((v, i) => v === stage(D, 'chan').z.im[i]), 'single path');
  },
  'noise: the SNR on the plateau at the ADC is the one asked for'() {
    const Q = { ...DEFAULTS, spread: 0, snr: 20 }, c = stage(run(Q, 1, { noise: false }), 'adc').z, x = stage(run(Q, 1), 'adc').z, m = measure(c, stage(run(Q, 1), 'adc').t, Q);
    let e = 0; for (const i of m.idx) e += (x.re[i] - c.re[i]) ** 2 + (x.im[i] - c.im[i]) ** 2; near(10 * Math.log10(m.L ** 2 / (e / m.idx.length)), 20, 0.05, 'SNR');
  },
};
