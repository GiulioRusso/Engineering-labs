// Modulation: AM and FM, digital constellations over AWGN with their bit error rates, IQ demodulation.
import { rng } from '../../maths/probability/model.js';

// complementary error function (Numerical Recipes, |error| < 1.2e-7) and the Gaussian tail Q
export function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
export const Q = (x) => 0.5 * erfc(x / Math.SQRT2);
// Bessel function of the first kind J_n(x), by its power series (fine for x < 20)
export function besselJ(n, x) { let s = 0, term = (x / 2) ** n; for (let k = 1; k <= n; k++) term /= k; for (let k = 0; k < 60; k++) { s += term; term *= -(x * x / 4) / ((k + 1) * (k + 1 + n)); } return s; }

// analog: line spectra (frequency, amplitude) of AM and FM with carrier fc and message tone fm
export const amLines = (fc, fm, m) => [[fc - fm, m / 2], [fc, 1], [fc + fm, m / 2]];
export const fmLines = (fc, fm, beta) => { const out = []; for (let n = -12; n <= 12; n++) out.push([fc + n * fm, Math.abs(besselJ(Math.abs(n), beta))]); return out; };

// digital: unit average-energy constellations, Gray-coded (label i ↔ bits of i)
export function constellation(kind) {
  if (kind === 'bpsk') return { bits: 1, pts: [[-1, 0], [1, 0]] };
  if (kind === 'qpsk') return { bits: 2, pts: [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, b]) => [a / Math.SQRT2, b / Math.SQRT2]) };
  if (kind === '8psk') { const g = [0, 1, 3, 2, 6, 7, 5, 4], pts = []; g.forEach((v, k) => { pts[v] = [Math.cos(2 * Math.PI * k / 8), Math.sin(2 * Math.PI * k / 8)]; }); return { bits: 3, pts }; }
  const lv = [-3, -1, 3, 1], pts = []; // 16-QAM: two Gray-coded 4-PAM axes
  for (let i = 0; i < 16; i++) pts.push([lv[i & 3] / Math.sqrt(10), lv[i >> 2] / Math.sqrt(10)]);
  return { bits: 4, pts };
}
export function berTheory(kind, ebn0) {
  if (kind === 'bpsk' || kind === 'qpsk') return Q(Math.sqrt(2 * ebn0));
  if (kind === '8psk') return (2 / 3) * Q(Math.sqrt(2 * 3 * ebn0) * Math.sin(Math.PI / 8));
  return 0.75 * Q(Math.sqrt(0.8 * ebn0));
}
// send n random symbols over AWGN at Eb/N0 (linear); returns received points and measured BER
export function transmit(kind, ebn0, n, seed = 11) {
  const C = constellation(kind), r = rng(seed), sigma = Math.sqrt(1 / (2 * C.bits * ebn0)), g = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const rx = [], sent = []; let errs = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.floor(r() * C.pts.length), [a, b] = C.pts[s], x = a + sigma * g(), y = b + sigma * g();
    let best = 0, bd = Infinity; C.pts.forEach(([u, v], j) => { const d = (u - x) ** 2 + (v - y) ** 2; if (d < bd) { bd = d; best = j; } });
    let e = s ^ best; while (e) { errs += e & 1; e >>= 1; }
    rx.push([x, y]); sent.push(s);
  }
  return { rx, sent, ber: errs / (n * C.bits), C };
}

// IQ: transmit symbols on a carrier, receive with a local oscillator off by phase φ and frequency Δf,
// mix down and integrate over each symbol. Returns the demodulated points.
export function iqDemod(symbols, { fc = 40, Ts = 0.25, dphi = 0, df = 0, sigma = 0, seed = 5 }) {
  const r = rng(seed), g = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()), N = 200, out = [];
  symbols.forEach(([I, Qv], k) => {
    let a = 0, b = 0;
    for (let j = 0; j < N; j++) {
      const t = (k + (j + 0.5) / N) * Ts, s = I * Math.cos(2 * Math.PI * fc * t) - Qv * Math.sin(2 * Math.PI * fc * t) + sigma * g();
      const ph = 2 * Math.PI * (fc + df) * t + dphi; a += 2 * s * Math.cos(ph) / N; b -= 2 * s * Math.sin(ph) / N;
    }
    out.push([a, b]);
  });
  return out;
}

// analog modulation sampled at fs over n samples: message m(t) in [−1, 1], carrier fc
export const MESSAGES = { sine: (t, fm) => Math.cos(2 * Math.PI * fm * t), square: (t, fm) => (((t * fm) % 1) < 0.5 ? 1 : -1), tri: (t, fm) => 1 - 4 * Math.abs(((t * fm + 0.25) % 1) - 0.5) };
export function modulate(kind, { fc, fm, mu = 0.8, df = 20, kp = 2.5, msg = 'sine', dsb = false }, fs, n) {
  const m = Array.from({ length: n }, (_, i) => MESSAGES[msg](i / fs, fm)), s = new Float64Array(n), fi = new Float64Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / fs, c = 2 * Math.PI * fc * t;
    if (kind === 'am') { s[i] = (dsb ? m[i] : 1 + mu * m[i]) * Math.cos(c); fi[i] = fc; }
    else if (kind === 'fm') { s[i] = Math.cos(c + ph); fi[i] = fc + df * m[i]; ph += 2 * Math.PI * df * m[i] / fs; }
    else { s[i] = Math.cos(c + kp * m[i]); fi[i] = fc + kp * ((m[Math.min(i + 1, n - 1)] - m[Math.max(i - 1, 0)]) * fs / (i > 0 && i < n - 1 ? 2 : 1)) / (2 * Math.PI); }
  }
  return { m, s: Array.from(s), fi: Array.from(fi) };
}
// envelope detector: full-wave rectify, then a one-pole low-pass with cut-off fcut
export function envelope(s, fs, fcut) { const a = Math.exp(-2 * Math.PI * fcut / fs); let y = 0; return s.map((v) => (y = a * y + (1 - a) * Math.abs(v) * Math.PI / 2)); }
