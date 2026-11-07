import { H, Hb, typical, typicalSet, channel, GENS, crc, remainder, flip, missed, missedBursts, encode, viterbi } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'typical sequences: the masses add to 1; the typical set grows to hold almost all the probability with ≈ 2^{nH} members'() {
    near(typical(200, 0.2).reduce((s, q) => s + q.mass, 0), 1, 1e-9, 'Σ mass');
    const a = typicalSet(50, 0.2, 0.05), b = typicalSet(2000, 0.2, 0.05); ok(b.mass > 0.95 && b.mass > a.mass, `mass ${a.mass} → ${b.mass}`);
    ok(Math.abs(b.rate - Hb(0.2)) <= 0.05 + 1e-9, `rate ${b.rate} within δ of H`);
  },
  'mutual information: I = H(X) − H(X|Y) ≥ 0; a perfect channel gives H(X), a useless one 0; uniform input maximises it'() {
    const c = channel(4, 0.1, 0.5); ok(c.I > 0 && c.I < c.hx, 'between'); near(c.I, c.hx - c.hxgy, 1e-12, 'identity');
    near(channel(4, 0, 0.3).I, channel(4, 0, 0.3).hx, 1e-12, 'perfect'); ok(Math.abs(channel(4, 0.75, 0.3).I) < 1e-12, 'useless at e = (n−1)/n');
    const C = 2 - Hb(0.1) - 0.1 * Math.log2(3); near(channel(4, 0.1, 0).I, C, 1e-12, 'capacity of the 4-ary symmetric channel'); ok(channel(4, 0.1, 0.5).I < C, 'tilted input');
    near(H([0.5, 0.5]), 1, 0, 'one bit');
  },
  'CRC: the textbook example; the codeword divides; single-bit and short bursts are always caught'() {
    near(Number(crc('11010011101100', '1011').rem === '100'), 1, 0, 'remainder 100');
    for (const g of Object.values(GENS)) { const c = crc('1101011011', g.bits); ok(/^0+$/.test(remainder(c.code, g.bits)), 'divides');
      ok(missed(c.code, g.bits, 1).miss === 0, 'single'); for (let L = 2; L < g.bits.length; L++) ok(missedBursts(c.code, g.bits, L).miss === 0, `burst ${L}`); }
    ok(missed(crc('1101011011', '1011').code, '1011', 2).miss > 0, 'a 3-bit CRC misses some double errors');
    ok(flip('000', [1]) === '010', 'flip');
  },
  'Viterbi: decodes a clean codeword, and corrects two well-separated flips (free distance 5)'() {
    const msg = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0], c = encode(msg); ok(c.length === msg.length + 2, 'tail');
    ok(viterbi(c).bits.join('') === msg.join(''), 'clean');
    const rx = c.map((p) => [...p]); rx[2][0] ^= 1; rx[9][1] ^= 1; ok(viterbi(rx).bits.join('') === msg.join(''), 'two flips');
    ok(viterbi(rx).M.at(-1)[0] === 2, 'final metric = number of flips');
  },
};
