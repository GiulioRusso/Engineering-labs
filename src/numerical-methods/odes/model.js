// Time stepping for ODEs: Euler, semi-implicit (symplectic) Euler, Heun (RK2) and RK4 on the oscillator
// x'' = −x; stability on the test equation y' = λy; global error against the step size. Pure, no DOM.
const osc = ([x, v]) => [v, -x];
const add = (a, b, h) => a.map((v, i) => v + h * b[i]);
export const METHODS = {
  euler: { label: 'Euler', order: 1, step: (y, h) => add(y, osc(y), h) },
  semi: { label: 'Semi-implicit Euler', order: 1, step: ([x, v], h) => { const v1 = v - h * x; return [x + h * v1, v1]; } },
  heun: { label: 'Heun (RK2)', order: 2, step: (y, h) => { const k1 = osc(y), k2 = osc(add(y, k1, h)); return y.map((v, i) => v + h / 2 * (k1[i] + k2[i])); } },
  rk4: { label: 'Runge–Kutta 4', order: 4, step: (y, h) => { const k1 = osc(y), k2 = osc(add(y, k1, h / 2)), k3 = osc(add(y, k2, h / 2)), k4 = osc(add(y, k3, h)); return y.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); } },
};
// x(0) = 1, v(0) = 0 to time T; exact x = cos t, energy ½(x² + v²) = ½
export function integrate(m, h, T) { const n = Math.round(T / h), t = [0], x = [1], v = [0]; let y = [1, 0]; for (let i = 1; i <= n; i++) { y = METHODS[m].step(y, h); t.push(i * h); x.push(y[0]); v.push(y[1]); } return { t, x, v }; }
export const energy = (x, v) => 0.5 * (x * x + v * v);
// y' = λy, y(0) = 1: explicit Euler multiplies by (1 + hλ), implicit by 1/(1 − hλ), exact by e^{hλ}
export const growth = { explicit: (z) => 1 + z, implicit: (z) => 1 / (1 - z), exact: (z) => Math.exp(z) };
export function decay(kind, lam, h, T) { const n = Math.round(T / h), g = growth[kind](h * lam), t = [], y = []; for (let i = 0; i <= n; i++) { t.push(i * h); y.push(g ** i); } return { t, y }; }
// global error |x(T) − cos T| after one period, for each step size
export const globalError = (m, h, T = 2 * Math.PI) => { const r = integrate(m, h, T); return Math.hypot(r.x.at(-1) - Math.cos(r.t.at(-1)), r.v.at(-1) + Math.sin(r.t.at(-1))); };
