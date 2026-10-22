import { unambiguousRange, rangeResolution, doppler, unambiguousVelocity, foldVelocity, apparentRange, matched, snr, pd, thresholdFor, signalPower, jammerPower, burnThrough, C0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'pulse radar basics: R_u = c/2PRF, ΔR = cτ/2 or c/2B, folding'() {
    near(unambiguousRange(1e3), C0 / 2e3, 1e-15, 'R_u'); near(rangeResolution(1e-6, 0), 149.896, 1e-5, 'cτ/2'); near(rangeResolution(10e-6, 5e6), 29.979, 1e-4, 'c/2B');
    near(apparentRange(200e3, 1e3), 200e3 - C0 / 2e3, 1e-12, 'second-time-around');
    near(doppler(150, 0.03), 10e3, 1e-12, 'f_d'); near(foldVelocity(100, 10e3, 0.03), 100 - 150, 1e-12, 'velocity fold');
    near(unambiguousVelocity(10e3, 0.03), 75, 1e-12, 'v_u');
  },
  'matched filter: triangle for a plain pulse; chirp first null at 1/B'() {
    near(matched(0.5e-6, 1e-6, 0), 0.5, 1e-12, 'half'); ok(matched(1 / 5e6 / (1 - 0.02), 10e-6, 5e6) < 1e-2, 'first null near 1/B');
  },
  'radar equation: SNR ∝ 1/R⁴, n pulses ×n; Pd rises with SNR'() {
    const p = { Pt: 1e5, G: 1e3, lam: 0.03, rcs: 1, R: 50e3, B: 1e6, F: 3 };
    near(snr(p) / snr({ ...p, R: 100e3 }), 16, 1e-12, '1/R⁴'); near(snr({ ...p, n: 10 }) / snr(p), 10, 1e-12, 'integration');
    near(Math.exp(-(thresholdFor(1e-6) ** 2) / 2), 1e-6, 1e-12, 'threshold ↔ Pfa'); ok(pd(20, 1e-6) > 0.85 && pd(5, 1e-6) < 0.2, 'Pd');
  },
  'self-screening jamming: S/J ∝ R², burn-through where S/J = required'() {
    const p = { Pt: 1e5, G: 1e3, lam: 0.03, rcs: 5, Pj: 10, Gj: 10, Br: 1e6, Bj: 1e7 };
    const Rb = burnThrough(p, 10), SJ = signalPower({ ...p, R: Rb }) / jammerPower({ ...p, Rj: Rb });
    near(SJ, 10, 1e-9, 'S/J = 10 dB at burn-through');
    near((signalPower({ ...p, R: Rb / 2 }) / jammerPower({ ...p, Rj: Rb / 2 })) / SJ, 4, 1e-9, '×4 at half range');
  },
};

import { mtiGain, blindSpeed, ledger } from './model.js';
tests['MTI: zero at DC and at the PRF (blind speeds), peak gain 2^order'] = () => {
  ok(mtiGain(0, 1e3, 2) < 1e-12 && mtiGain(1e3, 1e3, 2) < 1e-12, 'notches'); near(mtiGain(500, 1e3, 1), 2, 1e-12, 'two-pulse peak');
  near(blindSpeed(1, 1e3, 0.03), 15, 1e-12, 'first blind speed λ·PRF/2');
};
tests['ledger: −12 dB per doubling (radar), −6 dB (link); the sum equals the radar equation'] = () => {
  const p = { PtW: 1e5, Gdb: 30, lam: 0.03, rcs: 1, R: 50e3, B: 1e6, Fdb: 3 };
  near(ledger(p).snr - ledger({ ...p, R: 100e3 }).snr, 12.04, 1e-3, 'radar'); near(ledger({ ...p, mode: 'link' }).snr - ledger({ ...p, mode: 'link', R: 100e3 }).snr, 6.02, 1e-3, 'link');
  near(ledger(p).snr, 10 * Math.log10(snr({ Pt: 1e5, G: 1e3, lam: 0.03, rcs: 1, R: 50e3, B: 1e6, F: 10 ** 0.3 })), 1e-9, 'same as snr()');
};
