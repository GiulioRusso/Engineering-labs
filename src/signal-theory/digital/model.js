// Digital communications: Gray-coded PSK and square QAM constellations, Monte Carlo over AWGN with BER
// against theory, raised-cosine pulses and eye diagrams, and the Shannon limit. Pure, no DOM.
import { erfc } from '../modulation/model.js';
import { rng } from '../../maths/probability/model.js';

const gray = (i) => i ^ (i >> 1);
// unit average energy; label (bits) of point j is pts[j].bits
export function psk(M) { return Array.from({ length: M }, (_, k) => ({ x: Math.cos(2 * Math.PI * k / M + (M === 4 ? Math.PI / 4 : 0)), y: Math.sin(2 * Math.PI * k / M + (M === 4 ? Math.PI / 4 : 0)), bits: gray(k) })); }
export function qam(M) {
  const L = Math.round(Math.sqrt(M)), b = Math.log2(L), lv = Array.from({ length: L }, (_, i) => 2 * i - L + 1), E = (2 / 3) * (M - 1), s = Math.sqrt(E), out = [];
  for (let i = 0; i < L; i++) for (let q = 0; q < L; q++) out.push({ x: lv[i] / s, y: lv[q] / s, bits: (gray(i) << b) | gray(q) });
  return out;
}
export const scheme = (k) => (k === 'bpsk' ? { pts: [{ x: -1, y: 0, bits: 1 }, { x: 1, y: 0, bits: 0 }], bits: 1 } : k === 'qpsk' ? { pts: qam(4), bits: 2 } : k === '8psk' ? { pts: psk(8), bits: 3 } : { pts: qam(+k.replace('qam', '')), bits: Math.log2(+k.replace('qam', '')) });
// theory (Gray, AWGN): BPSK/QPSK exact, M-PSK and M-QAM nearest-neighbour approximations
export function berTheory(k, ebn0) {
  if (k === 'bpsk' || k === 'qpsk') return 0.5 * erfc(Math.sqrt(ebn0));
  if (k === '8psk') return (1 / 3) * erfc(Math.sqrt(3 * ebn0) * Math.sin(Math.PI / 8));
  const M = +k.replace('qam', ''), m = Math.log2(M); return (2 * (1 - 1 / Math.sqrt(M)) / m) * erfc(Math.sqrt(3 * m / (2 * (M - 1)) * ebn0));
}
// n random symbols over AWGN at Eb/N0 (linear): received points, decisions and bit errors
export function simulate(k, ebn0, n, seed = 7) {
  const { pts, bits } = scheme(k), r = rng(seed), sig = Math.sqrt(1 / (2 * bits * ebn0)), g = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const rx = []; let err = 0, serr = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.floor(r() * pts.length), x = pts[s].x + sig * g(), y = pts[s].y + sig * g();
    let best = 0, bd = Infinity; for (let j = 0; j < pts.length; j++) { const d = (pts[j].x - x) ** 2 + (pts[j].y - y) ** 2; if (d < bd) { bd = d; best = j; } }
    let e = pts[s].bits ^ pts[best].bits; if (e) serr++; while (e) { err += e & 1; e >>= 1; }
    rx.push([x, y, s === best]);
  }
  return { rx, ber: err / (n * bits), ser: serr / n, pts, bits };
}
// raised-cosine pulse, t in symbol periods
export function rcos(t, a) {
  if (Math.abs(t) < 1e-9) return 1;
  if (a > 0 && Math.abs(Math.abs(t) - 1 / (2 * a)) < 1e-9) return (Math.PI / 4) * Math.sin(Math.PI / (2 * a)) / (Math.PI / (2 * a));
  return (Math.sin(Math.PI * t) / (Math.PI * t)) * Math.cos(Math.PI * a * t) / (1 - (2 * a * t) ** 2);
}
// a pulse-shaped symbol stream sampled `sps` times per symbol (levels from `alphabet`), plus noise σ
export function shaped(nsym, sps, a, alphabet, sigma, seed = 3) {
  const r = rng(seed), g = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()), sym = Array.from({ length: nsym }, () => alphabet[Math.floor(r() * alphabet.length)]), L = nsym * sps, y = new Float64Array(L), span = 8;
  for (let k = 0; k < nsym; k++) for (let i = Math.max(0, (k - span) * sps); i < Math.min(L, (k + span) * sps); i++) y[i] += sym[k] * rcos(i / sps - k, a);
  // receiver noise after the receive filter: white noise smoothed over half a symbol (band-limited)
  if (sigma > 0) { const w = Array.from({ length: L }, () => g()), M = Math.max(1, sps >> 1); let acc = 0; for (let i = 0; i < L; i++) { acc += w[i] - (i >= M ? w[i - M] : 0); y[i] += sigma * acc / Math.sqrt(M); } }
  return { y: Array.from(y), sym };
}
// minimum Eb/N0 (linear) for spectral efficiency η (bit/s/Hz)
export const shannonEbN0 = (eta) => (2 ** eta - 1) / eta;
