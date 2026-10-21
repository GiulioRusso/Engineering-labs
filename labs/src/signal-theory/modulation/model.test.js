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
