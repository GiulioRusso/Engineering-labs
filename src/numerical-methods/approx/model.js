// Approximation: polynomial interpolation (Runge's phenomenon, Chebyshev nodes), quadrature (trapezoid,
// Simpson) and finite differences, where truncation error meets round-off. Pure, no DOM.
export const runge = (x) => 1 / (1 + 25 * x * x);
export const nodes = (n, kind) => Array.from({ length: n }, (_, i) => (kind === 'cheb' ? -Math.cos(Math.PI * (2 * i + 1) / (2 * n)) : -1 + 2 * i / (n - 1 || 1)));
// barycentric Lagrange interpolation through (xs, ys)
export function interp(xs, ys) {
  const w = xs.map((xi, i) => 1 / xs.reduce((p, xj, j) => (j === i ? p : p * (xi - xj)), 1));
  return (x) => { let a = 0, b = 0; for (let i = 0; i < xs.length; i++) { const d = x - xs[i]; if (d === 0) return ys[i]; a += w[i] * ys[i] / d; b += w[i] / d; } return a / b; };
}
export function maxErr(f, p, n = 2000) { let e = 0; for (let i = 0; i <= n; i++) { const x = -1 + 2 * i / n; e = Math.max(e, Math.abs(f(x) - p(x))); } return e; }
// quadrature on n panels (n even for Simpson)
export const INTEGRANDS = {
  exp: { label: 'eˣ on [0, 1]', f: Math.exp, a: 0, b: 1, exact: Math.E - 1 },
  sin: { label: 'sin x on [0, π]', f: Math.sin, a: 0, b: Math.PI, exact: 2 },
  bump: { label: '1/(1 + 25x²) on [−1, 1]', f: runge, a: -1, b: 1, exact: 0.4 * Math.atan(5) },
};
export function trapz(f, a, b, n) { const h = (b - a) / n; let s = (f(a) + f(b)) / 2; for (let i = 1; i < n; i++) s += f(a + i * h); return s * h; }
export function simpson(f, a, b, n) { n += n % 2; const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h); return s * h / 3; }
// finite differences of sin at x: forward error ~ h/2 + ε/h, central ~ h²/6 + ε/h
export const forward = (f, x, h) => (f(x + h) - f(x)) / h;
export const central = (f, x, h) => (f(x + h) - f(x - h)) / (2 * h);
