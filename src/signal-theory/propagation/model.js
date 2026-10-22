// Propagation and simple antennas: Friis free-space loss, the two-ray ground-reflection model and its
// breakpoint, a Yagi–Uda array of parasitic dipoles, and the microstrip patch. Pure, no DOM.
export const C0 = 299792458;
export const fspl = (d, f) => 20 * Math.log10(4 * Math.PI * d * f / C0); // dB
export const friis = ({ Pt, Gt, Gr, f }, d) => Pt + Gt + Gr - fspl(d, f); // dBm
// two-ray: direct path plus a ground reflection (Γ = −1 at grazing); returns received power (dBm)
export function twoRay({ Pt, Gt, Gr, f, ht, hr }, d) {
  const lam = C0 / f, k = 2 * Math.PI / lam, r1 = Math.hypot(d, ht - hr), r2 = Math.hypot(d, ht + hr);
  const re = Math.cos(-k * r1) / r1 - Math.cos(-k * r2) / r2, im = Math.sin(-k * r1) / r1 - Math.sin(-k * r2) / r2;
  return Pt + Gt + Gr + 20 * Math.log10(lam / (4 * Math.PI) * Math.hypot(re, im));
}
export const breakpoint = ({ f, ht, hr }) => 4 * ht * hr * f / C0;
// Yagi: reflector, driven element and n directors along x (wavelengths); each element a short dipole in the
// azimuth plane, currents with progressive phase lag `ph` (deg) per element toward the front
export function yagi(n, sp, ph) {
  const els = [{ x: -0.25, a: 0.8, p: ph }, { x: 0, a: 1, p: 0 }];
  for (let i = 1; i <= n; i++) els.push({ x: i * sp, a: 0.75 * Math.exp(-0.05 * (i - 1)), p: -i * ph });
  return els;
}
export const yagiPattern = (els, phi) => { let re = 0, im = 0; for (const e of els) { const a = 2 * Math.PI * e.x * Math.cos(phi) + e.p * Math.PI / 180; re += e.a * Math.cos(a); im += e.a * Math.sin(a); } return Math.hypot(re, im); };
// patch antenna W × L on a substrate of height h (wavelengths): E- and H-plane field patterns
const sinc = (x) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x);
export const patchE = (th, L, h) => Math.abs(Math.cos(Math.PI * L * Math.sin(th)) * sinc(Math.PI * h * Math.sin(th))) * (Math.abs(th) <= Math.PI / 2 ? 1 : 0);
export const patchH = (th, W) => Math.abs(Math.cos(th) * sinc(Math.PI * W * Math.sin(th))) * (Math.abs(th) <= Math.PI / 2 ? 1 : 0);
// 2D directivity estimate in a cut: 2π max² / ∫ F² dφ
export function directivity2D(F) { let s = 0, m = 0; const n = 1440; for (let i = 0; i < n; i++) { const p = -Math.PI + 2 * Math.PI * (i + 0.5) / n, v = F(p); s += v * v * 2 * Math.PI / n; m = Math.max(m, v); } return 2 * Math.PI * m * m / s; }
