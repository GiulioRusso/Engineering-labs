// Materials: the tensile test (elastic line, yield, hardening, necking, unloading), plane stress and
// Mohr's circle, and Euler buckling of a column. Stresses in Pa, strains dimensionless. Pure, no DOM.
const MPa = 1e6, GPa = 1e9;
export const MATERIALS = {
  steel: { label: 'Mild steel', E: 200 * GPa, sy: 250 * MPa, su: 420 * MPa, eu: 0.2, ef: 0.3 },
  aluminium: { label: 'Aluminium 6061-T6', E: 69 * GPa, sy: 276 * MPa, su: 310 * MPa, eu: 0.08, ef: 0.12 },
  copper: { label: 'Annealed copper', E: 117 * GPa, sy: 70 * MPa, su: 220 * MPa, eu: 0.35, ef: 0.45 },
  iron: { label: 'Grey cast iron', E: 100 * GPa, sy: 200 * MPa, su: 200 * MPa, eu: 0.002, ef: 0.002, brittle: true },
};
// engineering stress for a monotonic strain ε; NaN after fracture
export function stress(m, e) {
  const ey = m.sy / m.E;
  if (e > m.ef + 1e-12) return NaN;
  if (m.brittle) return m.E * e * (1 - e / (4 * m.ef)); // slight curvature, breaks without yielding
  if (e <= ey) return m.E * e;
  if (e <= m.eu) return m.sy + (m.su - m.sy) * Math.sin(Math.PI / 2 * (e - ey) / (m.eu - ey));
  return m.su - 0.25 * (m.su - m.sy) * ((e - m.eu) / (m.ef - m.eu)) ** 2;
}
// unload from ε₁ back along the elastic slope: permanent set = ε₁ − σ₁/E
export const permanentSet = (m, e1) => Math.max(0, e1 - stress(m, e1) / m.E);
// area under the curve up to fracture: energy absorbed per volume (J/m³)
export function toughness(m, n = 4000) { let s = 0; for (let i = 0; i < n; i++) { const a = m.ef * i / n, b = m.ef * (i + 1) / n; s += (stress(m, a) + (Number.isFinite(stress(m, b)) ? stress(m, b) : stress(m, a))) / 2 * (b - a); } return s; }
// plane stress rotated by θ
export function rotate(sx, sy, txy, th) { const c = (sx + sy) / 2, d = (sx - sy) / 2, C = Math.cos(2 * th), S = Math.sin(2 * th); return { sx: c + d * C + txy * S, sy: c - d * C - txy * S, txy: -d * S + txy * C }; }
export function principal(sx, sy, txy) { const c = (sx + sy) / 2, R = Math.hypot((sx - sy) / 2, txy); return { c, R, s1: c + R, s2: c - R, thp: 0.5 * Math.atan2(2 * txy, sx - sy) }; }
// Euler buckling: P_cr = π²EI/(KL)²; effective-length factor K for the end conditions
export const ENDS = { pinned: { label: 'Pinned–pinned', K: 1 }, free: { label: 'Fixed–free', K: 2 }, fixed: { label: 'Fixed–fixed', K: 0.5 } };
export const eulerLoad = (E, I, L, K) => Math.PI ** 2 * E * I / (K * L) ** 2;
// mode shape along the column, s = x/L ∈ [0, 1], unit amplitude
export const mode = (end, s) => (end === 'pinned' ? Math.sin(Math.PI * s) : end === 'free' ? 1 - Math.cos(Math.PI * s / 2) : (1 - Math.cos(2 * Math.PI * s)) / 2);
// critical stress vs slenderness λ = KL/r: Euler for slender columns, Johnson's parabola for stocky ones
export const lambdaC = (E, sy) => Math.sqrt(2 * Math.PI ** 2 * E / sy);
export const sigmaCr = (E, sy, lam) => (lam >= lambdaC(E, sy) ? Math.PI ** 2 * E / lam ** 2 : sy - (sy * lam / (2 * Math.PI)) ** 2 / E);
// an initially bent column (bow e): the bow grows as e / (1 − P/P_cr)
export const amplification = (r) => 1 / (1 - r);
// independent check: smallest P for which EI y'' + P y = 0, y(0) = y(L) = 0 has a solution (finite differences)
export function pinnedEigen(E, I, L, n = 400) {
  // tridiagonal [2, −1] / h²: smallest eigenvalue by inverse iteration
  const h = L / n, m = n - 1; let v = Array.from({ length: m }, (_, i) => Math.sin(Math.PI * (i + 1) / n) + 0.1 * Math.sin(3 * Math.PI * (i + 1) / n)), lam = 0;
  for (let it = 0; it < 50; it++) {
    const c = new Array(m), d = v.slice(); c[0] = -1 / 2; d[0] /= 2;
    for (let i = 1; i < m; i++) { const den = 2 + c[i - 1]; c[i] = -1 / den; d[i] = (d[i] + d[i - 1]) / den; }
    for (let i = m - 2; i >= 0; i--) d[i] -= c[i] * d[i + 1];
    const nv = Math.hypot(...d); lam = Math.hypot(...v) / nv; v = d.map((x) => x / nv);
  }
  return lam / h ** 2 * E * I;
}
