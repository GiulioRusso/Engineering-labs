import { repBER, repSim, encode, decode, syndrome, bits4, hamBlockErr } from './model.js';
import { near, ok } from '../../lib/testing.js';

const flip = (c, i) => c.map((b, k) => (k === i ? b ^ 1 : b));
const dist = (a, b) => a.reduce((s, x, i) => s + (x !== b[i]), 0);
export const tests = {
  'repetition ×3: BER = 3e² − 2e³'() { const e = 0.1; near(repBER(3, e), 3 * e * e - 2 * e ** 3, 1e-12, 'BER'); },
  'simulated repetition matches the formula'() { const e = 0.15, n = 5, R = repSim(40000, n, e); near(R.errors / 40000, repBER(n, e), 0.08, 'BER'); },
  'every Hamming codeword has syndrome 0'() { for (let m = 0; m < 16; m++) ok(syndrome(encode(bits4(m))) === 0, `m ${m}`); },
  'any single flip is located and corrected'() { for (let m = 0; m < 16; m++) { const c = encode(bits4(m)); for (let i = 0; i < 7; i++) { const D = decode(flip(c, i)); ok(D.s === i + 1 && D.data.join() === bits4(m).join(), `m ${m} i ${i}`); } } },
  'minimum distance 3'() { let d = 7; for (let a = 0; a < 16; a++) for (let b = a + 1; b < 16; b++) d = Math.min(d, dist(encode(bits4(a)), encode(bits4(b)))); ok(d === 3, `d ${d}`); },
  'two flips are miscorrected'() { const c = encode(bits4(11)), D = decode(flip(flip(c, 0), 4)); ok(D.data.join() !== bits4(11).join(), 'wrong'); },
  'block error ≈ 21e² for small e'() { near(hamBlockErr(1e-3), 21e-6, 0.01, 'P'); },
};
