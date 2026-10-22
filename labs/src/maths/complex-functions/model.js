// Complex functions: Euler's formula built from its power series, domain colouring (hue = argument,
// brightness rings = modulus), and how a function maps a grid of the plane. Complex numbers as [re, im].
export const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
export const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
export const cexp = (z) => [Math.exp(z[0]) * Math.cos(z[1]), Math.exp(z[0]) * Math.sin(z[1])];
export const FUNCS = {
  sq: { label: 'z²', f: (z) => mul(z, z) },
  cube: { label: 'z³ − 1', f: (z) => { const c = mul(mul(z, z), z); return [c[0] - 1, c[1]]; } },
  inv: { label: '1/z', f: (z) => div([1, 0], z) },
  mob: { label: '(z − 1)/(z + 1)', f: (z) => div([z[0] - 1, z[1]], [z[0] + 1, z[1]]) },
  exp: { label: 'eᶻ', f: cexp },
  sin: { label: 'sin z', f: (z) => [Math.sin(z[0]) * Math.cosh(z[1]), Math.cos(z[0]) * Math.sinh(z[1])] },
};
// partial sums of e^{iθ} = Σ (iθ)^k / k!: each term as an arrow
export function eulerTerms(theta, n) { const out = []; let term = [1, 0], s = [0, 0]; for (let k = 0; k < n; k++) { const next = [s[0] + term[0], s[1] + term[1]]; out.push([s, next]); s = next; term = mul(term, [0, theta / (k + 1)]); } return { arrows: out, sum: s }; }
// hue from argument, brightness from log|w| (rings every factor e)
export function domainColor(w, out) {
  const h = (Math.atan2(w[1], w[0]) / (2 * Math.PI) + 1) % 1, m = Math.hypot(w[0], w[1]), ring = 0.65 + 0.35 * ((Math.log(m + 1e-12) % 1 + 1) % 1), v = Number.isFinite(ring) ? ring : 0;
  const k = (n) => (n + h * 6) % 6, f = (n) => v - v * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  out[0] = f(5); out[1] = f(3); out[2] = f(1); return out;
}
