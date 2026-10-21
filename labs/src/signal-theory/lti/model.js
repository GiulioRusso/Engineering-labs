// LTI systems: the RC low-pass (first order) and the standard second-order system, simulated by exact
// discretisation, with their impulse responses, poles and frequency responses. Pure, no DOM.
// first order: τ y' + y = x, exact for piecewise-constant input
export function rc(x, dt, tau) { const a = Math.exp(-dt / tau), y = new Float64Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) { s = a * s + (1 - a) * x[i]; y[i] = s; } return y; }
export const rcImpulse = (t, tau) => (t >= 0 ? Math.exp(-t / tau) / tau : 0);
// second order: y'' + 2ζωn y' + ωn² y = ωn² x (RK4)
export function second(x, dt, zeta, wn) {
  const y = new Float64Array(x.length); let p = 0, v = 0;
  const f = (p, v, u) => [v, wn * wn * (u - p) - 2 * zeta * wn * v];
  for (let i = 0; i < x.length; i++) {
    const u0 = x[i], u1 = x[Math.min(i + 1, x.length - 1)], um = (u0 + u1) / 2;
    const k1 = f(p, v, u0), k2 = f(p + dt / 2 * k1[0], v + dt / 2 * k1[1], um), k3 = f(p + dt / 2 * k2[0], v + dt / 2 * k2[1], um), k4 = f(p + dt * k3[0], v + dt * k3[1], u1);
    y[i] = p; p += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); v += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }
  return y;
}
export function poles(zeta, wn) { if (zeta < 1) { const w = wn * Math.sqrt(1 - zeta * zeta); return [[-zeta * wn, w], [-zeta * wn, -w]]; } const r = wn * Math.sqrt(zeta * zeta - 1); return [[-zeta * wn + r, 0], [-zeta * wn - r, 0]]; }
// H(jω) = ωn² / (ωn² − ω² + j2ζωnω)
export function H2(w, zeta, wn) { const re = wn * wn - w * w, im = 2 * zeta * wn * w, d = re * re + im * im; return { mag: wn * wn / Math.sqrt(d), ph: -Math.atan2(im, re) }; }
export const H1 = (w, tau) => ({ mag: 1 / Math.hypot(1, w * tau), ph: -Math.atan(w * tau) });
export function stepInfo(zeta, wn) { if (zeta >= 1) return { os: 0, tp: Infinity }; const wd = wn * Math.sqrt(1 - zeta * zeta); return { os: Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)), tp: Math.PI / wd }; }
