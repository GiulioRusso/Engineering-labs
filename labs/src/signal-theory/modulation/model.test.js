import { Q, besselJ, fmLines, constellation, berTheory, transmit, iqDemod } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Q(x) and Bessel J: known values; FM sidebands carry all the power'() {
    near(Q(0), 0.5, 1e-6, 'Q(0)'); near(Q(3), 1.3499e-3, 1e-3, 'Q(3)');
    ok(Math.abs(besselJ(0, 2.4048)) < 1e-4, 'J0 first zero'); near(besselJ(1, 1), 0.44005, 1e-4, 'J1(1)');
    near(fmLines(100, 5, 3).reduce((a, [, A]) => a + A * A, 0), 1, 1e-9, 'Σ J_n² = 1');
  },
  'constellations have unit average energy'() {
    for (const k of ['bpsk', 'qpsk', '8psk', '16qam']) { const { pts } = constellation(k); near(pts.reduce((a, [x, y]) => a + x * x + y * y, 0) / pts.length, 1, 1e-12, k); }
  },
  'simulated BER matches theory (BPSK, QPSK, 16-QAM)'() {
    for (const [k, db] of [['bpsk', 4], ['qpsk', 4], ['16qam', 10]]) {
      const e = 10 ** (db / 10), sim = transmit(k, e, 40000).ber, th = berTheory(k, e);
      ok(Math.abs(sim - th) < 0.15 * th, `${k} at ${db} dB: ${sim} vs ${th}`);
    }
  },
  'IQ demodulation recovers the symbols; a phase error rotates them'() {
    const s = constellation('qpsk').pts, a = iqDemod(s, {}), b = iqDemod(s, { dphi: Math.PI / 2 });
    a.forEach(([x, y], i) => { ok(Math.hypot(x - s[i][0], y - s[i][1]) < 0.02, `symbol ${i}`); });
    b.forEach(([x, y], i) => { const [u, v] = s[i]; ok(Math.hypot(x - v, y + u) < 0.02, `rotated ${i}`); }); // ×e^(−jπ/2)
  },
};
import { modulate, envelope } from './model.js';
import { fft } from '../../lib/dsp.js';
const amp = (s, fs, f) => { const N = s.length, re = Float64Array.from(s), im = new Float64Array(N); fft(re, im); const k = Math.round(f * N / fs); return 2 * Math.hypot(re[k], im[k]) / N; };
Object.assign(tests, {
  'AM: carrier 1, sidebands μ/2 at fc ± fm'() { const { s } = modulate('am', { fc: 100, fm: 8, mu: 0.8 }, 1024, 1024); near(amp(s, 1024, 100), 1, 1e-6, 'carrier'); near(amp(s, 1024, 108), 0.4, 1e-6, 'usb'); near(amp(s, 1024, 92), 0.4, 1e-6, 'lsb'); },
  'FM: line n has amplitude |J_n(β)|'() { const { s } = modulate('fm', { fc: 200, fm: 8, df: 24 }, 1024, 1024); for (const n of [0, 1, 2, 3]) near(amp(s, 1024, 200 + 8 * n) + 0.01, Math.abs(besselJ(n, 3)) + 0.01, 0.02, `J${n}`); },
  'envelope detector follows 1 + μ m(t)'() { const fs = 8192, { s, m } = modulate('am', { fc: 500, fm: 5, mu: 0.5 }, fs, fs), e = envelope(s, fs, 50); for (const i of [3000, 5000, 7000]) near(e[i], 1 + 0.5 * m[i - 25], 0.06, `i=${i}`); },
});
