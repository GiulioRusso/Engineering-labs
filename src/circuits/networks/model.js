// Resistive networks solved by nodal analysis (G v = i, voltage sources to ground held fixed), Thévenin
// equivalents, and the series RLC step response with its damping ratio. SI units. Pure, no DOM.

// nodes 1..n (0 = ground); res: [a, b, R]; fixed: { node: V } (ideal sources to ground)
export function solve(n, res, fixed = {}) {
  const free = [], idx = {}; for (let k = 1; k <= n; k++) if (!(k in fixed)) { idx[k] = free.length; free.push(k); }
  const m = free.length, G = Array.from({ length: m }, () => new Array(m + 1).fill(0)), V = (k) => (k === 0 ? 0 : fixed[k]);
  for (const [a, b, R] of res) { const g = 1 / R;
    for (const [p, q] of [[a, b], [b, a]]) { if (!(p in idx)) continue; const r = idx[p]; G[r][r] += g; if (q in idx) G[r][idx[q]] -= g; else G[r][m] += g * V(q); } }
  for (let c = 0; c < m; c++) { let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(G[r][c]) > Math.abs(G[p][c])) p = r; [G[c], G[p]] = [G[p], G[c]];
    for (let r = 0; r < m; r++) if (r !== c) { const f = G[r][c] / G[c][c]; for (let k = c; k <= m; k++) G[r][k] -= f * G[c][k]; } }
  const v = [0]; for (let k = 1; k <= n; k++) v.push(k in idx ? G[idx[k]][m] / G[idx[k]][idx[k]] : fixed[k]);
  return { v, I: res.map(([a, b, R]) => (v[a] - v[b]) / R) };
}
export const series = (...r) => r.reduce((a, b) => a + b, 0);
export const parallel = (...r) => 1 / r.reduce((a, b) => a + 1 / b, 0);
// source V1 with R1 feeding R2 to ground, seen from across R2
export const thevenin = (V1, R1, R2) => ({ Vth: V1 * R2 / (R1 + R2), Rth: parallel(R1, R2) });

// series RLC driven by a unit step at t = 0: capacitor voltage
export function rlcStep(t, { R, L, C }) {
  const w0 = 1 / Math.sqrt(L * C), z = R / 2 * Math.sqrt(C / L), a = z * w0;
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-a * t) * (Math.cos(wd * t) + a / wd * Math.sin(wd * t)); }
  if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const s1 = -w0 * (z - Math.sqrt(z * z - 1)), s2 = -w0 * (z + Math.sqrt(z * z - 1)); return 1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2);
}
export const damping = ({ R, L, C }) => ({ z: R / 2 * Math.sqrt(C / L), w0: 1 / Math.sqrt(L * C) });
