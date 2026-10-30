import { entropy, H2, huffman, avgLength, mutualInfo, capacity, normalize } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'uniform over 8 symbols: 3 bits'() { near(entropy(new Array(8).fill(1 / 8)), 3, 1e-12, 'H'); },
  'a fair coin is 1 bit, a sure thing 0'() { near(H2(0.5), 1, 1e-12, 'H2'); ok(H2(1) === 0 && entropy([1, 0]) === 0, 'sure'); },
  'Huffman on a dyadic source meets the entropy exactly'() { const p = [1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 16], { codes } = huffman(p); near(avgLength(p, codes), entropy(p), 1e-12, 'L = H'); },
  'Huffman: H ≤ L < H + 1, prefix-free'() {
    for (const w of [[5, 3, 1, 1], [1, 1, 1, 1, 1], [9, 1], [4, 3, 2, 1, 1, 1]]) {
      const p = normalize(w), { codes } = huffman(p), L = avgLength(p, codes), H = entropy(p);
      ok(L >= H - 1e-12 && L < H + 1, `${w}: L ${L} H ${H}`);
      for (const a of codes) for (const b of codes) ok(a === b || !b.startsWith(a), `prefix ${a} ${b}`);
    }
  },
  'Kraft: Σ 2^−ℓ = 1 for a Huffman code'() { const { codes } = huffman(normalize([7, 5, 3, 2, 1])); near(codes.reduce((s, c) => s + 2 ** -c.length, 0), 1, 1e-12, 'Kraft'); },
  'BSC: uniform input reaches capacity, others fall short'() { const e = 0.11; near(mutualInfo(0.5, e), capacity(e), 1e-12, 'C'); ok(mutualInfo(0.3, e) < capacity(e), 'less'); near(capacity(0.11), 0.5, 0.002, 'C(0.11) ≈ ½'); },
  'BSC with e = ½ carries nothing'() { ok(Math.abs(capacity(0.5)) < 1e-12, 'zero'); },
};
