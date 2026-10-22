// Circuits built for radio: Butterworth selectivity and the LC ladder that realises it, the L-network
// impedance match, the diode envelope detector, and the mixer. SI units. Pure, no DOM.
export const butterworth = (f, fc, n) => 1 / Math.sqrt(1 + (f / fc) ** (2 * n));
// normalised prototype values g_k = 2 sin((2k − 1)π / 2n)
export const ladderG = (n) => Array.from({ length: n }, (_, k) => 2 * Math.sin((2 * k + 1) * Math.PI / (2 * n)));
// scaled to R0 and fc: odd positions shunt C, even series L (starting with a shunt capacitor)
export const ladder = (n, R0, fc) => ladderG(n).map((g, k) => (k % 2 === 0 ? { kind: 'C', value: g / (R0 * 2 * Math.PI * fc) } : { kind: 'L', value: g * R0 / (2 * Math.PI * fc) }));

// L-network matching a resistive load RL to a source Rs at f0 (RL > Rs: shunt C across the load, series L)
export function lMatch(Rs, RL, f0) {
  const hi = Math.max(Rs, RL), lo = Math.min(Rs, RL), Q = Math.sqrt(hi / lo - 1), w = 2 * Math.PI * f0;
  return { Q, Xs: Q * lo, Xp: hi / Q, L: Q * lo / w, C: Q / (hi * w), shuntAtLoad: RL > Rs };
}
// fraction of the available power reaching RL through the match, at frequency f
export function matchedPower(Rs, RL, f0, f) {
  const m = lMatch(Rs, RL, f0), w = 2 * Math.PI * f, zs = [0, w * m.L], yp = [0, w * m.C];
  const par = (R, y) => { const d = (1 / R) ** 2 + y[1] ** 2; return [(1 / R) / d, -y[1] / d]; }; // R ‖ C
  let Z, Rin; // impedance seen by the source and the share that ends in RL (all real power goes to RL: L and C are lossless)
  if (m.shuntAtLoad) { const p = par(RL, yp); Z = [p[0] + zs[0], p[1] + zs[1]]; } else { const s = [RL, w * m.L], d = s[0] ** 2 + s[1] ** 2, ys = [s[0] / d, -s[1] / d + w * m.C], e = ys[0] ** 2 + ys[1] ** 2; Z = [ys[0] / e, -ys[1] / e]; }
  Rin = Z; const I2 = 1 / ((Rs + Rin[0]) ** 2 + Rin[1] ** 2); return 4 * Rs * Rin[0] * I2; // P / P_available
}
export const mismatchPower = (Rs, RL) => 4 * Rs * RL / (Rs + RL) ** 2;

// AM wave and diode + RC envelope detector (ideal diode with drop Vd)
export function envelope({ fc = 20, fm = 1, m = 0.6, tau = 0.15, Vd = 0, T = 3, n = 3000 }) {
  const t = [], x = [], y = []; let v = 0; const dt = T / n;
  for (let i = 0; i < n; i++) { const tt = i * dt, s = (1 + m * Math.cos(2 * Math.PI * fm * tt)) * Math.cos(2 * Math.PI * fc * tt); if (s - Vd > v) v = s - Vd; else v *= Math.exp(-dt / tau); t.push(tt); x.push(s); y.push(v); }
  return { t, x, y };
}
// product of two tones: amplitude of each output line (sum and difference, ½ each)
export const mixLines = (f1, f2) => [{ f: Math.abs(f1 - f2), a: 0.5 }, { f: f1 + f2, a: 0.5 }];
