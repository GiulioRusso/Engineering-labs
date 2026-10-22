import { fft, chain, spectrumDb, iq, riseTime } from './model.js';
import { near, ok } from '../../lib/testing.js';

const P = { fs: 2e9, n: 4096, fRF: 400e6, fLO: 330e6, fInt: 650e6, aInt: 1, aImg: 0.5, phi: 0.7, tau: 1e-6, t0: 0.5e-6, noise: 0.02, bwRF: 60e6, gain: 10, bwIF: 20e6, bwBB: 8e6, fsADC: 100e6, fsIF: 100e6, bits: 12, dLO: 0, dc: 0 };
const peakAt = (x, fs) => { const s = spectrumDb(x, fs); let k = 0; for (let i = 0; i < s.f.length; i++) if (s.f[i] > 1e6 && s.dB[i] > s.dB[k]) k = i; return s.f[k]; };

export const tests = {
  'FFT round trip'() {
    const re = Float64Array.from({ length: 64 }, (_, i) => Math.sin(i)), im = new Float64Array(64), r0 = Float64Array.from(re);
    fft(re, im); fft(re, im, true); ok(re.every((v, i) => Math.abs(v - r0[i]) < 1e-12), 'inverse');
  },
  'superhet: the mixer moves the pulse to IF = |fRF − fLO| = 70 MHz'() {
    const S = chain('superhet', P), mixer = S.find((s) => s.name.startsWith('Mixer')), ifs = S.find((s) => s.name === 'IF band-pass');
    near(peakAt(ifs.x, ifs.fs), 70e6, 0.02, 'IF'); ok(mixer, 'stage exists');
  },
  'superhet IQ output recovers amplitude and phase of the pulse'() {
    const S = chain('superhet', { ...P, aInt: 0, aImg: 0, noise: 0 }), out = S.find((s) => s.name === 'IQ demodulator').x, mid = Math.round((P.t0 + P.tau / 2) * P.fs);
    near(Math.atan2(out.im[mid], out.re[mid]), P.phi, 0.02, 'phase φ survives the chain');
    ok(Math.abs(Math.hypot(out.re[mid], out.im[mid]) - P.gain) < 0.05 * P.gain, 'amplitude = gain × 1');
  },
  'digital IF: 70 MHz sampled at 100 MS/s lands at 30 MHz'() {
    const S = chain('digitalif', { ...P, aInt: 0, aImg: 0 }), a = S.find((s) => s.name === 'ADC at IF'); near(peakAt(a.x, a.fs), 30e6, 0.03, 'bandpass sampling');
  },
  'IQ: |z| = A and ∠z = φ with the LO on frequency; rise time halves when the bandwidth doubles'() {
    const base = { fs: 1e9, n: 4096, fc: 100e6, fLO: 100e6, phi: 0.7, tau: 1.5e-6, t0: 1e-6 };
    const r = iq({ ...base, bw: 16e6 }), mid = Math.round((base.t0 + base.tau / 2) * base.fs);
    near(Math.hypot(r.I[mid], r.Q[mid]), 1, 2e-3, '|z|'); near(Math.atan2(r.Q[mid], r.I[mid]), 0.7, 2e-3, '∠z');
    const rise = (bw) => { const q = iq({ ...base, bw }); return riseTime(q.I.map((v, i) => Math.hypot(v, q.Q[i])).slice(0, 2000), base.fs); };
    near(rise(8e6) / rise(16e6), 2, 0.05, 'rise time ∝ 1/bandwidth');
  },
};
