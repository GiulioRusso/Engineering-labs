// Antennas and propagation: Friis link budget, dipole patterns, phased arrays, polarization, waveguide
// modes. Pure, no DOM. Angles in radians unless named *deg.
export const C0 = 299792458;
export const fspl = (d, f) => 20 * Math.log10(4 * Math.PI * d * f / C0);            // free-space path loss, dB
export const received = (s) => s.Pt + s.Gt + s.Gr - fspl(s.d, s.f);                   // dBm

// dipole of total length L (in wavelengths): far-field pattern, normalised to its maximum
export function dipole(L, theta) {
  const k = Math.PI * L, s = Math.sin(theta);
  if (Math.abs(s) < 1e-9) return 0;
  return (Math.cos(k * Math.cos(theta)) - Math.cos(k)) / s;
}
export function dipoleNorm(L) { let m = 0; for (let i = 1; i < 2000; i++) m = Math.max(m, Math.abs(dipole(L, Math.PI * i / 2000))); return m; }
// directivity D = 2 / ∫₀^π F² sin θ dθ  (F normalised)
export function directivity(F) { let s = 0; const n = 4000; for (let i = 0; i < n; i++) { const t = Math.PI * (i + 0.5) / n; s += F(t) ** 2 * Math.sin(t) * Math.PI / n; } return 2 / s; }

// uniform linear array of N elements spaced d (wavelengths) steered to theta0 (from broadside): |AF|/N
export function arrayFactor(N, d, theta0, theta) {
  const psi = 2 * Math.PI * d * (Math.sin(theta) - Math.sin(theta0));
  if (Math.abs(Math.sin(psi / 2)) < 1e-12) return 1;
  return Math.abs(Math.sin(N * psi / 2) / (N * Math.sin(psi / 2)));
}

// polarization: E = (cos ωt, ay cos(ωt + δ)); power through a polarizer at angle a, relative to |E|²
export const efield = (ay, delta, wt) => [Math.cos(wt), ay * Math.cos(wt + delta)];
export function throughPolarizer(ay, delta, a) { let s = 0, tot = 0; for (let i = 0; i < 360; i++) { const [x, y] = efield(ay, delta, 2 * Math.PI * i / 360), p = x * Math.cos(a) + y * Math.sin(a); s += p * p; tot += x * x + y * y; } return s / tot; }

// rectangular waveguide a × b (m): cutoff of mode (m, n), guide wavelength, transverse E field of TE_mn / TM_mn
export const cutoff = (m, n, a, b) => (C0 / 2) * Math.hypot(m / a, n / b);
export const guideWavelength = (f, fc) => (f > fc ? (C0 / f) / Math.sqrt(1 - (fc / f) ** 2) : Infinity);
export function modeE(type, m, n, a, b, x, y) {
  const kx = m * Math.PI / a, ky = n * Math.PI / b;
  if (type === 'TE') return [(n / b) * Math.cos(kx * x) * Math.sin(ky * y), -(m / a) * Math.sin(kx * x) * Math.cos(ky * y)];
  return [(m / a) * Math.cos(kx * x) * Math.sin(ky * y), (n / b) * Math.sin(kx * x) * Math.cos(ky * y)]; // TM: E_t ∝ ∇E_z
}
