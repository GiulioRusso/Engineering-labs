// More information theory: typical sequences (why H bits per symbol are enough), mutual information on an
// n-ary symmetric channel, CRC as long division over GF(2), and a rate-½ convolutional code (generators 7, 5)
// decoded by the Viterbi algorithm. Pure, no DOM.

const lg2 = (x) => Math.log2(x), Hb = (p) => (p <= 0 || p >= 1 ? 0 : -p * lg2(p) - (1 - p) * lg2(1 - p));
export const H = (ps) => ps.reduce((s, p) => s - (p > 0 ? p * lg2(p) : 0), 0);
export { Hb };

// ---- typical sequences: n coin flips with P(1) = p ----
const lgam = (x) => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const q of c) s += q / ++y; return -t + Math.log(2.5066282746310005 * s / x); };
export const logChoose = (n, k) => lgam(n + 1) - lgam(k + 1) - lgam(n - k + 1);
// for every count k of ones: the per-symbol surprise −log₂P(sequence)/n, the probability of all such
// sequences, and how many there are (log₂)
export function typical(n, p) {
  const out = [];
  for (let k = 0; k <= n; k++) { const s = -(k * lg2(p) + (n - k) * lg2(1 - p)) / n, lc = logChoose(n, k); out.push({ k, s, mass: Math.exp(lc + k * Math.log(p) + (n - k) * Math.log(1 - p)), log2count: lc / Math.LN2 }); }
  return out;
}
// the typical set: sequences with surprise within δ of H; its probability and log₂ of its size, per symbol
export function typicalSet(n, p, delta) {
  const h = Hb(p), T = typical(n, p).filter((q) => Math.abs(q.s - h) <= delta), mx = Math.max(...T.map((q) => q.log2count), -Infinity);
  return { h, mass: T.reduce((s, q) => s + q.mass, 0), rate: T.length ? (mx + lg2(T.reduce((s, q) => s + 2 ** (q.log2count - mx), 0))) / n : 0 };
}

// ---- mutual information on an n-ary symmetric channel ----
// input distribution: a geometric tilt `skew` (0 = uniform); the symbol arrives intact with 1 − e, else as any other
export function channel(n, e, skew) {
  const w = Array.from({ length: n }, (_, i) => Math.exp(-skew * i * 2)), sw = w.reduce((a, b) => a + b, 0), px = w.map((v) => v / sw);
  const J = px.map((p, i) => Array.from({ length: n }, (_, j) => p * (i === j ? 1 - e : e / (n - 1)))), py = J[0].map((_, j) => J.reduce((s, r) => s + r[j], 0));
  const hx = H(px), hy = H(py), hxy = H(J.flat()); return { px, py, J, hx, hy, hxy, hxgy: hxy - hy, hygx: hxy - hx, I: hx + hy - hxy };
}

// ---- CRC: long division over GF(2) ----
export const GENS = { c3: { label: 'x³ + x + 1 (1011)', bits: '1011' }, c4: { label: 'CRC-4: x⁴ + x + 1 (10011)', bits: '10011' }, c8: { label: 'CRC-8: x⁸ + x² + x + 1', bits: '100000111' } };
// divide data·x^r by g: every XOR step (position and the row after it), the remainder, the codeword
export function crc(data, g) {
  const r = g.length - 1, row = (data + '0'.repeat(r)).split('').map(Number), G = g.split('').map(Number), steps = [];
  for (let i = 0; i + r < row.length; i++) if (row[i]) { for (let j = 0; j <= r; j++) row[i + j] ^= G[j]; steps.push({ at: i, after: row.join('') }); }
  const rem = row.slice(-r).join(''); return { steps, rem, code: data + rem };
}
export const remainder = (bits, g) => { const r = g.length - 1, row = bits.split('').map(Number), G = g.split('').map(Number); for (let i = 0; i + r < row.length; i++) if (row[i]) for (let j = 0; j <= r; j++) row[i + j] ^= G[j]; return row.slice(-r).join(''); };
export const flip = (bits, positions) => bits.split('').map((b, i) => (positions.includes(i) ? String(1 - b) : b)).join('');
// fraction of error patterns that a CRC misses: all patterns of weight w (exhaustive), and all bursts of length L
export function missed(code, g, w) {
  const n = code.length; let tot = 0, miss = 0; const rec = (start, left, pos) => { if (!left) { tot++; if (/^0+$/.test(remainder(flip(code, pos), g))) miss++; return; } for (let i = start; i <= n - left; i++) rec(i + 1, left - 1, [...pos, i]); };
  rec(0, w, []); return { tot, miss, frac: miss / tot };
}
export function missedBursts(code, g, L) {
  const n = code.length; let tot = 0, miss = 0;
  for (let s = 0; s + L <= n; s++) for (let m = 0; m < 2 ** Math.max(0, L - 2); m++) { const pos = [s, s + L - 1]; for (let b = 0; b < L - 2; b++) if (m >> b & 1) pos.push(s + 1 + b); tot++; if (/^0+$/.test(remainder(flip(code, L === 1 ? [s] : pos), g))) miss++; }
  return { tot, miss, frac: tot ? miss / tot : 0 };
}

// ---- convolutional code, rate ½, constraint length 3, generators 7 (111) and 5 (101) ----
// state = the last two input bits (s = 2·u[k−1] + u[k−2]); each input bit makes two output bits
export const step = (s, u) => { const a = (s >> 1) & 1, b = s & 1; return { out: [u ^ a ^ b, u ^ b], next: (u << 1) | a }; };
export function encode(bits) { let s = 0; const out = []; for (const u of [...bits, 0, 0]) { const r = step(s, u); out.push(r.out); s = r.next; } return out; }   // two tail zeros end in state 0
// hard-decision Viterbi: path metrics per stage and state, survivors, the decoded bits and the best path's states
export function viterbi(rx) {
  const INF = 1e9, L = rx.length, M = [[0, INF, INF, INF]], prev = [];
  for (let k = 0; k < L; k++) {
    const m = [INF, INF, INF, INF], p = [[-1, -1], [-1, -1], [-1, -1], [-1, -1]];
    for (let s = 0; s < 4; s++) { if (M[k][s] >= INF) continue; for (const u of [0, 1]) { const r = step(s, u), d = (r.out[0] ^ rx[k][0]) + (r.out[1] ^ rx[k][1]), v = M[k][s] + d; if (v < m[r.next]) { m[r.next] = v; p[r.next] = [s, u]; } } }
    M.push(m); prev.push(p);
  }
  let s = 0; const states = [0], bits = []; for (let k = L - 1; k >= 0; k--) { const [ps, u] = prev[k][s]; bits.unshift(u); s = ps; states.unshift(s); }
  return { M, prev, bits: bits.slice(0, L - 2), states };
}
