// Structures: plane trusses solved by the method of joints (every joint in equilibrium, one linear system),
// torsion of solid and hollow shafts, the stress around a hole (Kirsch) and fatigue life (Basquin S–N), and
// a propped cantilever made determinate by compatibility. SI units; tension positive. Pure, no DOM.
import { diagrams } from '../beams/model.js';

// ---- trusses: bottom joints 0..n along the span, top joints at height h; pin at joint 0, roller at joint n ----
export function makeTruss(type, n = 4, L = 8, h = 2) {
  const J = [], M = [], w = L / n, add = (a, b) => M.push([a, b]);
  for (let i = 0; i <= n; i++) J.push([i * w, 0]);
  if (type === 'warren') {
    for (let i = 0; i < n; i++) J.push([(i + 0.5) * w, h]);
    for (let i = 0; i < n; i++) add(i, i + 1); for (let i = 0; i < n - 1; i++) add(n + 1 + i, n + 2 + i);
    for (let i = 0; i < n; i++) { add(i, n + 1 + i); add(n + 1 + i, i + 1); }
  } else {
    for (let i = 1; i < n; i++) J.push([i * w, h]); const T = (i) => n + i;   // top joint above bottom joint i (1..n−1)
    for (let i = 0; i < n; i++) add(i, i + 1); for (let i = 1; i < n - 1; i++) add(T(i), T(i + 1)); for (let i = 1; i < n; i++) add(i, T(i));
    add(0, T(1)); add(T(n - 1), n);
    for (let i = 1; i < n - 1; i++) { const left = i < n / 2; if ((type === 'pratt') === left) add(T(i), i + 1); else add(i, T(i + 1)); }
  }
  return { J, M, n, L, h };
}
// solve: loads { joint: [Fx, Fy] } (N, y up). Unknowns: member forces, then reactions Ax, Ay (joint 0), By (joint n)
export function solveTruss(T, loads) {
  const nJ = T.J.length, nM = T.M.length, N = nM + 3, A = Array.from({ length: 2 * nJ }, () => new Array(N).fill(0)), b = new Array(2 * nJ).fill(0);
  T.M.forEach(([p, q], k) => { const dx = T.J[q][0] - T.J[p][0], dy = T.J[q][1] - T.J[p][1], l = Math.hypot(dx, dy); A[2 * p][k] += dx / l; A[2 * p + 1][k] += dy / l; A[2 * q][k] -= dx / l; A[2 * q + 1][k] -= dy / l; });
  A[0][nM] = 1; A[1][nM + 1] = 1; A[2 * T.n + 1][nM + 2] = 1;
  for (const [j, [fx, fy]] of Object.entries(loads)) { b[2 * j] -= fx; b[2 * j + 1] -= fy; }
  const x = gauss(A, b); return { f: x.slice(0, nM), Ax: x[nM], Ay: x[nM + 1], By: x[nM + 2] };
}
function gauss(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < n; k++) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i; [M[k], M[p]] = [M[p], M[k]]; for (let i = k + 1; i < n; i++) { const m = M[i][k] / M[k][k]; for (let j = k; j <= n; j++) M[i][j] -= m * M[k][j]; } }
  const x = new Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; } return x;
}

// ---- torsion of a circular shaft (outer radius ro, inner ri) ----
export function torsion(T, ro, ri, Lsh, G) { const J = Math.PI / 2 * (ro ** 4 - ri ** 4); return { J, tauMax: T * ro / J, tau: (r) => T * r / J, phi: T * Lsh / (G * J), area: Math.PI * (ro * ro - ri * ri) }; }

// ---- stress around a circular hole of radius a in a wide plate under remote tension s along x (Kirsch) ----
export function kirsch(x, y, a, s) {
  const r = Math.hypot(x, y); if (r < a) return NaN; const t = Math.atan2(y, x), q = a * a / (r * r), c2 = Math.cos(2 * t), s2 = Math.sin(2 * t);
  const srr = s / 2 * (1 - q) + s / 2 * (1 - 4 * q + 3 * q * q) * c2, stt = s / 2 * (1 + q) - s / 2 * (1 + 3 * q * q) * c2, srt = -s / 2 * (1 + 2 * q - 3 * q * q) * s2;
  const c = Math.cos(t), sn = Math.sin(t); return srr * c * c + stt * sn * sn - 2 * srt * sn * c;
}
export const ktEllipse = (aOverB) => 1 + 2 * aOverB;   // Inglis: semi-axis a across the load, b along it
// Basquin S–N curve for a steel (illustrative): σa = σf′ (2N)^b, with an endurance limit
export const SN = { sf: 900e6, b: -0.09, Se: 250e6 };
export const life = (sa) => (sa <= SN.Se ? Infinity : 0.5 * (sa / SN.sf) ** (1 / SN.b));
export const snCurve = (N) => Math.max(SN.Se, SN.sf * (2 * N) ** SN.b);

// ---- propped cantilever: fixed at x = 0, roller at x = L; the roller force R makes y(L) = 0 ----
export function propped(L, load, EI) {
  const D = diagrams('cantilever', L, load, EI), U = diagrams('cantilever', L, { P: -1, a: L }, EI), R = -D.y.at(-1) / U.y.at(-1);
  return { R, x: D.x, V: D.V.map((v, i) => v + R * U.V[i]), M: D.M.map((v, i) => v + R * U.M[i]), y: D.y.map((v, i) => v + R * U.y[i]), free: D, simply: diagrams('simply', L, load, EI) };
}
