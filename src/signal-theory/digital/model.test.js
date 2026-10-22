import { psk, qam, scheme, berTheory, simulate, rcos, shaped, shannonEbN0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'constellations have unit energy and Gray neighbours differ by one bit'() {
    for (const M of [4, 16, 64]) { const p = qam(M); near(p.reduce((a, q) => a + q.x * q.x + q.y * q.y, 0) / M, 1, 1e-12, `${M}-QAM`); const d = 2 / Math.sqrt((2 / 3) * (M - 1)); for (const a of p) for (const b of p) if (Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - d) < 1e-9) { let e = a.bits ^ b.bits, c = 0; while (e) { c += e & 1; e >>= 1; } ok(c === 1, `${M}: neighbours ${a.bits} ${b.bits}`); } }
    near(psk(8).reduce((a, q) => a + q.x * q.x + q.y * q.y, 0) / 8, 1, 1e-12, '8psk');
  },
  'Monte Carlo BER follows theory'() { for (const [k, db] of [['bpsk', 5], ['qpsk', 5], ['16qam', 10], ['64qam', 14]]) { const e = 10 ** (db / 10), s = simulate(k, e, 60000).ber, t = berTheory(k, e); ok(Math.abs(s - t) < 0.2 * t, `${k} ${db} dB: ${s} vs ${t}`); } },
  'raised cosine: 1 at 0, zero at every other symbol instant (no ISI)'() { for (const a of [0, 0.35, 1]) { near(rcos(0, a), 1, 1e-12, 'peak'); for (const k of [1, 2, 3]) ok(Math.abs(rcos(k, a)) < 1e-9, `a=${a} k=${k}`); } const { y, sym } = shaped(40, 8, 0.35, [-1, 1], 0); for (let k = 10; k < 30; k++) near(y[k * 8] + 3, sym[k] + 3, 1e-6, `sample ${k}`); },
  'Shannon limit tends to −1.59 dB'() { near(10 * Math.log10(shannonEbN0(1e-4)), -1.59, 2e-3, 'ln 2'); near(shannonEbN0(1), 1, 1e-12, 'η = 1 → 0 dB'); ok(scheme('256qam').bits === 8, 'bits'); },
};
