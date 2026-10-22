// The dipole antenna, lengths in wavelengths (λ = 1, k = 2π): current distribution, far-field pattern,
// directivity, input impedance (induced EMF), the Hertzian dipole's field lines (stream function), the
// near/far field of a finite wire, and a marching-squares contour helper. Pure, no DOM.
export const ETA = 376.73, K = 2 * Math.PI;
export const current = (z, L) => (Math.abs(z) <= L / 2 ? Math.sin(K * (L / 2 - Math.abs(z))) : 0);
// far-field pattern F(θ) = [cos(kL/2 cos θ) − cos(kL/2)] / sin θ (not normalised)
export const F = (L, th) => { const s = Math.sin(th); return Math.abs(s) < 1e-9 ? 0 : (Math.cos(K * L / 2 * Math.cos(th)) - Math.cos(K * L / 2)) / s; };
export function Fmax(L) { let m = 0; for (let i = 1; i < 2000; i++) m = Math.max(m, Math.abs(F(L, Math.PI * i / 2000))); return m; }
const integ = (L) => { let s = 0; const n = 4000; for (let i = 0; i < n; i++) { const t = Math.PI * (i + 0.5) / n; s += F(L, t) ** 2 * Math.sin(t) * Math.PI / n; } return s; };
export const directivity = (L) => 2 * Fmax(L) ** 2 / integ(L);
// sine and cosine integrals (Simpson)
const simpson = (f, a, b, n = 2000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; };
export const Si = (x) => simpson((t) => (t ? Math.sin(t) / t : 1), 0, x);
export const Ci = (x) => 0.5772156649 + Math.log(x) + simpson((t) => (t ? (Math.cos(t) - 1) / t : 0), 0, x);
// input impedance of a centre-fed dipole of length L and radius a (both in λ)
export function impedance(L, a = 0.001) {
  const kl = K * L, Rm = ETA / (2 * Math.PI) * integ(L), s2 = Math.sin(kl / 2) ** 2; // R at the current maximum
  const Xm = ETA / (4 * Math.PI) * (2 * Si(kl) + Math.cos(kl) * (2 * Si(kl) - Si(2 * kl)) - Math.sin(kl) * (2 * Ci(kl) - Ci(2 * kl) - Ci(2 * K * a * a / L)));
  return { R: Rm / s2, X: Xm / s2, Rm, Xm };
}
// Hertzian dipole stream function: E-field lines are its contours. u = kr
export const PSI = { full: (u, th, wt) => Math.sin(th) ** 2 * (Math.cos(wt - u) / u - Math.sin(wt - u)), bound: (u, th, wt) => Math.sin(th) ** 2 * Math.cos(wt - u) / u, radiated: (u, th, wt) => -(Math.sin(th) ** 2) * Math.sin(wt - u) };
// |E| of a finite wire on the z axis (sum of Hertzian elements, all three terms), at (x, z)
export function nearE(L, x, z, n = 40) {
  let er = 0, ei = 0, zr = 0, zi = 0;
  for (let i = 0; i < n; i++) {
    const zp = -L / 2 + L * (i + 0.5) / n, I = current(zp, L) * L / n, dx = x, dz = z - zp, r = Math.hypot(dx, dz) || 1e-6, c = dz / r, s = dx / r, kr = K * r, ph = -kr;
    // E_r ∝ 2 cos θ (1/r² + 1/(jk r³)), E_θ ∝ sin θ (jk/r + 1/r² + 1/(jk r³)); complex as [re, im]·e^{−jkr}
    const ar = [2 * c / (r * r), -2 * c / (K * r ** 3)], at = [s / (r * r), s * (K / r - 1 / (K * r ** 3))], e = [Math.cos(ph), Math.sin(ph)];
    const mul = (a) => [a[0] * e[0] - a[1] * e[1], a[0] * e[1] + a[1] * e[0]], Er = mul(ar), Et = mul(at);
    // to cartesian: Ex = Er s + Eθ c, Ez = Er c − Eθ s
    er += I * (Er[0] * s + Et[0] * c); ei += I * (Er[1] * s + Et[1] * c); zr += I * (Er[0] * c - Et[0] * s); zi += I * (Er[1] * c - Et[1] * s);
  }
  return Math.sqrt(er * er + ei * ei + zr * zr + zi * zi);
}
// marching squares on a grid v[j*nx+i] over [x0,x1]×[y0,y1]: flat segment list [x,y,x,y,…] per level
export function contours(v, nx, ny, [x0, x1], [y0, y1], levels) {
  const out = [], X = (i) => x0 + (x1 - x0) * i / (nx - 1), Y = (j) => y0 + (y1 - y0) * j / (ny - 1);
  for (const L of levels) for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) {
    const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], p = [];
    for (let e = 0; e < 4; e++) { const [ai, aj] = c[e], [bi, bj] = c[(e + 1) % 4], za = v[aj * nx + ai] - L, zb = v[bj * nx + bi] - L; if (Number.isFinite(za) && Number.isFinite(zb) && (za < 0) !== (zb < 0)) { const u = za / (za - zb); p.push(X(ai) + u * (X(bi) - X(ai)), Y(aj) + u * (Y(bj) - Y(aj))); } }
    if (p.length >= 4) out.push(p[0], p[1], p[2], p[3]); if (p.length === 8) out.push(p[4], p[5], p[6], p[7]);
  }
  return out;
}
