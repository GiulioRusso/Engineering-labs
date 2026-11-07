// Matter waves: the de Broglie wavelength and electrons through two slits (with or without a which-slit
// detector), a Gaussian wave packet and the uncertainty product (by FFT), tunnelling through a rectangular
// barrier (exact piecewise wavefunction by transfer matrices), and Compton scattering. Pure, no DOM.
import { H, HBAR, E, C, ME } from '../quantum/model.js';
import { rng } from '../../lib/random.js';
import { fft } from '../../lib/dsp.js';
export { H, HBAR, E, C, ME };

export const lambdaE = (eV, m = ME) => H / Math.sqrt(2 * m * eV * E);   // m
// screen intensity at angle θ (small): two slits of width a, centres d apart; with a detector the
// interference term is gone and only the single-slit envelope (from both slits) is left
const sinc = (x) => (Math.abs(x) < 1e-12 ? 1 : Math.sin(x) / x);
export const twoSlit = (theta, lam, d, a, detector = false) => { const s = Math.sin(theta), env = sinc(Math.PI * a * s / lam) ** 2; return detector ? env : env * Math.cos(Math.PI * d * s / lam) ** 2; };
// n electron hits drawn from the pattern over |θ| < θmax (rejection sampling); returns angles
export function hits(n, lam, d, a, detector, thetaMax, seed = 11) { const r = rng(seed), out = []; while (out.length < n) { const t = (2 * r() - 1) * thetaMax; if (r() < twoSlit(t, lam, d, a, detector)) out.push(t); } return out; }

// Gaussian packet ψ ∝ exp(−x²/(4σ²) + i k₀x + i c x²) on a grid; position and wavenumber spreads by FFT
export function packet(sigma, k0, c, N = 2048, Lx = 60) {
  const dx = Lx / N, x = [], re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) { const xi = -Lx / 2 + i * dx, a = Math.exp(-xi * xi / (4 * sigma * sigma)), ph = k0 * xi + c * xi * xi; x.push(xi); re[i] = a * Math.cos(ph); im[i] = a * Math.sin(ph); }
  const p2 = Array.from(re, (v, i) => v * v + im[i] * im[i]), S = p2.reduce((s, v) => s + v, 0), mx = x.reduce((s, xi, i) => s + xi * p2[i], 0) / S, dX = Math.sqrt(x.reduce((s, xi, i) => s + (xi - mx) ** 2 * p2[i], 0) / S);
  const R = Float64Array.from(re), I = Float64Array.from(im); fft(R, I);
  const k = [], q2 = []; for (let i = 0; i < N; i++) { const j = (i + N / 2) % N; k.push((j < N / 2 ? j : j - N) * 2 * Math.PI / Lx); q2.push(R[j] * R[j] + I[j] * I[j]); }
  const Q = q2.reduce((s, v) => s + v, 0), mk = k.reduce((s, ki, i) => s + ki * q2[i], 0) / Q, dK = Math.sqrt(k.reduce((s, ki, i) => s + (ki - mk) ** 2 * q2[i], 0) / Q);
  return { x, re: Array.from(re), im: Array.from(im), p2, k, q2, dX, dK, product: dX * dK };
}

// ---- tunnelling: an electron of energy E (eV) on a barrier V0 (eV) of width a (m) ----
const cx = (r, i = 0) => [r, i], add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, cexp = (z) => [Math.exp(z[0]) * Math.cos(z[1]), Math.exp(z[0]) * Math.sin(z[1])];
const csqrt = (v) => (v >= 0 ? cx(Math.sqrt(v)) : cx(0, Math.sqrt(-v)));
// wavenumber q = √(2m(E − V))/ħ: real outside, imaginary (decay) inside when E < V
export const wavenumber = (eV, V) => csqrt(2 * ME * (eV - V) * E).map((v) => v / HBAR);
export function barrier(eV, V0, a) {
  if (Math.abs(eV - V0) < 1e-9) eV = V0 + 1e-6;   // q = 0 exactly is a removable singularity
  const k = wavenumber(eV, 0), q = wavenumber(eV, V0), ik = mul(cx(0, 1), k), iq = mul(cx(0, 1), q);
  // region II: ψ = A e^{iqx} + B e^{−iqx}; region III: t e^{ikx}; match ψ and ψ′ at x = a, then at x = 0
  const t = cx(1), ea = cexp(mul(ik, cx(a))), eqa = cexp(mul(iq, cx(a))), eqma = cexp(mul(iq, cx(-a)));
  const A = div(mul(mul(t, ea), add(iq, ik)), mul(cx(2), mul(iq, eqa))), B = div(mul(mul(t, ea), sub(iq, ik)), mul(cx(2), mul(iq, eqma)));
  const inc = div(add(mul(add(A, B), ik), mul(sub(A, B), iq)), mul(cx(2), ik)), ref = div(sub(mul(add(A, B), ik), mul(sub(A, B), iq)), mul(cx(2), ik));
  const n = (z) => div(z, inc), T = 1 / (inc[0] ** 2 + inc[1] ** 2), R = (ref[0] ** 2 + ref[1] ** 2) / (inc[0] ** 2 + inc[1] ** 2);
  const psi = (x) => (x < 0 ? add(cexp(mul(ik, cx(x))), mul(n(ref), cexp(mul(ik, cx(-x))))) : x <= a ? add(mul(n(A), cexp(mul(iq, cx(x)))), mul(n(B), cexp(mul(iq, cx(-x))))) : mul(n(t), cexp(mul(ik, cx(x)))));
  return { T, R, psi, k: k[0], kappa: q[1] };
}
// the textbook closed form for comparison
export function transmission(eV, V0, a) {
  if (Math.abs(eV - V0) < 1e-12) eV += 1e-9;
  const k2 = 2 * ME * Math.abs(V0 - eV) * E / (HBAR * HBAR), s = eV < V0 ? Math.sinh(Math.sqrt(k2) * a) : Math.sin(Math.sqrt(k2) * a);
  return 1 / (1 + V0 * V0 * s * s / (4 * eV * Math.abs(V0 - eV)));
}

// ---- Compton scattering ----
export const LC = H / (ME * C);   // 2.426 pm
export function compton(lam, theta) {
  const lam2 = lam + LC * (1 - Math.cos(theta)), E1 = H * C / lam, E2 = H * C / lam2, mc2 = ME * C * C;
  const phi = Math.atan2(1, (1 + E1 / mc2) * Math.tan(theta / 2));   // electron recoil angle
  return { lam2, dl: lam2 - lam, E1: E1 / E, E2: E2 / E, Ke: (E1 - E2) / E, phi };
}
