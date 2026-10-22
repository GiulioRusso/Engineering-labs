import { autocorr, metrics, waveform, echo, compress, coupling, dopplerSpectrum, C0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

const fs = 100e6;
export const tests = {
  'plain pulse: triangle, no sidelobes; chirp −13.3 dB, Hamming below −40 dB'() {
    const a = metrics(autocorr('plain', { tau: 1e-6 }, fs).y); ok(a.psl < -60, `plain PSL ${a.psl}`);
    const c = metrics(autocorr('chirp', { tau: 10e-6, B: 10e6 }, fs).y); near(c.psl, -13.3, 0.03, 'chirp PSL');
    const h = metrics(autocorr('chirp', { tau: 10e-6, B: 10e6 }, fs, 'hamming').y); ok(h.psl < -40, `Hamming ${h.psl}`);
  },
  'chirp compresses to ≈ 0.886/B; Barker-13 sidelobes exactly 1/13'() {
    const c = metrics(autocorr('chirp', { tau: 10e-6, B: 10e6 }, fs).y); near(c.width3 / fs, 0.886 / 10e6, 0.15, '−3 dB width');
    const b = metrics(autocorr('barker', { tau: 13e-6 }, 10e6).y); near(b.psl, 20 * Math.log10(1 / 13), 0.01, 'Barker PSL −22.28 dB');
  },
  'range–Doppler coupling: a moving target reads at −c·fd·τ/2B'() {
    const tau = 20e-6, B = 10e6, fd = 2 * 300 / 0.03, p = waveform('chirp', { tau, B }, fs), L = 3 * p.n;
    const y = compress(echo(p, [{ delay: p.n, amp: 1, fd }], L, fs), p); let pk = 0; for (let i = 0; i < L; i++) if (y[i] > y[pk]) pk = i;
    // sub-sample peak by parabola
    const d = 0.5 * (y[pk - 1] - y[pk + 1]) / (y[pk - 1] - 2 * y[pk] + y[pk + 1]), shift = (pk + d - p.n) / fs * C0 / 2;
    near(shift, coupling(fd, tau, B), 0.05, 'range error');
  },
  'Doppler burst resolves Δv = λ·PRF/2N'() {
    const prf = 10e3, N = 50, lam = 0.03, dv = lam * prf / (2 * N); // 3 m/s
    const sp = (dvs) => { const s = dopplerSpectrum([2 * 100 / lam, 2 * (100 + dvs) / lam], N, prf, 1024).A; let peaks = 0; for (let i = 1; i < s.length - 1; i++) if (s[i] > s[i - 1] && s[i] > s[i + 1] && s[i] > 0.5) peaks++; return peaks; };
    ok(sp(1) === 1, 'merged at 1 m/s'); ok(sp(2.5 * dv) === 2, 'split well above Δv');
  },
};
