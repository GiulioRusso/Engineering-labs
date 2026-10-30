// Channel coding over a binary symmetric channel: the repetition code with majority vote, and the
// Hamming (7,4) code that corrects any single flipped bit from its syndrome. Pure, no DOM.
import { rng } from '../../lib/random.js';

export const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c; };
// majority of n copies fails when more than half flip (n odd)
export const repBER = (n, e) => { let s = 0; for (let j = Math.floor(n / 2) + 1; j <= n; j++) s += binom(n, j) * e ** j * (1 - e) ** (n - j); return s; };
// simulated transmission: k message bits, n copies each; returns sent, received copies, decoded
export function repSim(k, n, e, seed = 3) {
  const r = rng(seed), msg = Array.from({ length: k }, () => (r() < 0.5 ? 1 : 0));
  const rx = msg.map((b) => Array.from({ length: n }, () => b ^ (r() < e ? 1 : 0))), dec = rx.map((c) => (c.reduce((a, b) => a + b, 0) * 2 > n ? 1 : 0));
  return { msg, rx, dec, errors: dec.filter((d, i) => d !== msg[i]).length };
}
// Hamming (7,4), positions 1…7 = p1 p2 d1 p4 d2 d3 d4: parity bit 2^j covers every position with bit j set
export const COVER = [[1, 3, 5, 7], [2, 3, 6, 7], [4, 5, 6, 7]];
export function encode(d) { const c = [0, 0, d[0], 0, d[1], d[2], d[3]]; for (const [j, s] of COVER.entries()) c[2 ** j - 1] = s.slice(1).reduce((a, i) => a ^ c[i - 1], 0); return c; }
export const syndrome = (c) => COVER.reduce((s, set, j) => s + (set.reduce((a, i) => a ^ c[i - 1], 0) << j), 0);
export function decode(c) { const s = syndrome(c), f = c.slice(); if (s) f[s - 1] ^= 1; return { s, fixed: f, data: [f[2], f[4], f[5], f[6]] }; }
export const bits4 = (m) => [3, 2, 1, 0].map((k) => (m >> k) & 1);
// block error: more than one flip in seven
export const hamBlockErr = (e) => 1 - (1 - e) ** 7 - 7 * e * (1 - e) ** 6;
export const uncodedBlockErr = (e) => 1 - (1 - e) ** 4;
