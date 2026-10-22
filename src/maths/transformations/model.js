// Working with functions: transforming a base graph (shift, stretch, reflect), composing two functions,
// inverses, polynomials from their roots and rational functions with their asymptotes. Pure, no DOM.
export const BASE = {
  sq: { label: 'x²', f: (x) => x * x, inv: (y) => (y >= 0 ? Math.sqrt(y) : NaN) },
  abs: { label: '|x|', f: Math.abs, inv: (y) => (y >= 0 ? y : NaN) },
  sqrt: { label: '√x', f: (x) => (x >= 0 ? Math.sqrt(x) : NaN), inv: (y) => (y >= 0 ? y * y : NaN) },
  cube: { label: 'x³', f: (x) => x ** 3, inv: Math.cbrt },
  sin: { label: 'sin x', f: Math.sin, inv: (y) => (Math.abs(y) <= 1 ? Math.asin(y) : NaN) },
  recip: { label: '1/x', f: (x) => 1 / x, inv: (y) => 1 / y },
  exp: { label: 'eˣ', f: Math.exp, inv: (y) => (y > 0 ? Math.log(y) : NaN) },
  lin: { label: 'x + 1', f: (x) => x + 1, inv: (y) => y - 1 },
};
// y = a · f(b (x − h)) + k
export const transform = (f, { a = 1, b = 1, h = 0, k = 0 }) => (x) => a * f(b * (x - h)) + k;
export const compose = (f, g) => (x) => f(g(x));
// numerical inverse by bisection on [lo, hi] (f monotonic there)
export function invert(f, y, lo = -10, hi = 10) { let a = lo, b = hi, fa = f(a) - y, fb = f(b) - y; if (!(fa * fb <= 0)) return NaN; for (let i = 0; i < 80; i++) { const m = (a + b) / 2, fm = f(m) - y; if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; } } return (a + b) / 2; }
// polynomial a · Π (x − rᵢ)
export const poly = (a, roots) => (x) => roots.reduce((p, r) => p * (x - r), a);
// expanded coefficients (highest power first) of a · Π (x − rᵢ)
export function coeffs(a, roots) { let c = [a]; for (const r of roots) { const n = [...c, 0]; for (let i = 1; i < n.length; i++) n[i] -= r * c[i - 1]; c = n; } return c; }
// rational a (x − z₁)…/(x − p₁)… with its asymptotes and holes
export function rational(a, zeros, poles) {
  const zs = [...zeros], ps = [...poles], holes = [];
  for (let i = ps.length - 1; i >= 0; i--) { const j = zs.findIndex((z) => Math.abs(z - ps[i]) < 1e-9); if (j >= 0) { holes.push(ps[i]); zs.splice(j, 1); ps.splice(i, 1); } }
  const f = (x) => (holes.some((h) => Math.abs(x - h) < 1e-9) ? NaN : a * zs.reduce((p, z) => p * (x - z), 1) / ps.reduce((p, q) => p * (x - q), 1));
  const horiz = zs.length < ps.length ? 0 : zs.length === ps.length ? a : null;
  const slant = zs.length === ps.length + 1 ? [a, a * (ps.reduce((s, p) => s + p, 0) - zs.reduce((s, z) => s + z, 0))] : null; // y = a x + c
  return { f, vertical: ps, horiz, slant, holes, zeros: zs };
}
