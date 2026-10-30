// Beams: reactions, shear V(x) and bending moment M(x) from statics, then the deflection by integrating
// EI y'' = M twice with the support conditions; and cross sections (second moment, bending stress).
// Downward loads positive; sagging moment positive; y up. SI units. Pure, no DOM.
export const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
// loads: { P, a } point load at a, or { w } uniform over the span. support: 'simply' | 'cantilever' (fixed at x = 0)
export function statics(support, L, load) {
  const { P = 0, a = L / 2, w = 0 } = load, W = P + w * L, xc = (P * a + w * L * L / 2) / (W || 1);
  if (support === 'simply') { const R2 = W * xc / L; return { R1: W - R2, R2, M0: 0 }; }
  return { R1: W, R2: 0, M0: -W * xc }; // wall reaction force and moment (hogging)
}
export function diagrams(support, L, load, EI, n = 401) {
  const { P = 0, a = L / 2, w = 0 } = load, S = statics(support, L, load), x = lin(0, L, n);
  const V = x.map((s) => S.R1 - w * s - (s > a ? P : 0)), M = x.map((s) => S.M0 + S.R1 * s - w * s * s / 2 - (s > a ? P * (s - a) : 0));
  // integrate κ = M/EI twice (trapezoid), then add the line c0 + c1 x that meets the supports
  const h = L / (n - 1), th = [0], y = [0];
  for (let i = 1; i < n; i++) { th.push(th[i - 1] + h * (M[i - 1] + M[i]) / (2 * EI)); y.push(y[i - 1] + h * (th[i - 1] + th[i]) / 2); }
  const c1 = support === 'simply' ? -y[n - 1] / L : 0;
  return { x, V, M, y: y.map((v, i) => v + c1 * x[i]), slope: th.map((t) => t + c1), ...S };
}
// sections: area, second moment about the neutral axis, depth
export function section(kind, { b, h, tf, tw }) {
  if (kind === 'rect') return { A: b * h, I: b * h ** 3 / 12, h };
  return { A: 2 * b * tf + tw * (h - 2 * tf), I: (b * h ** 3 - (b - tw) * (h - 2 * tf) ** 3) / 12, h };
}
export const bendingStress = (M, y, I) => -M * y / I; // tension positive: sagging M stretches the bottom (y < 0)
