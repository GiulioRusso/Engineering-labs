// Root finding: bisection halving a bracket, the secant method drawing chords, and fixed-point iteration
// x ← g(x) as a cobweb. Every method returns its whole history so a lab can replay it. Pure, no DOM.
export const FUNCS = {
  cubic: { label: 'x³ − 2x − 5', f: (x) => x ** 3 - 2 * x - 5, root: 2.0945514815423265, a: 1, b: 3, view: [0.5, 3.5] },
  cos: { label: 'cos x − x', f: (x) => Math.cos(x) - x, root: 0.7390851332151607, a: 0, b: 2, view: [-0.5, 2.5] },
  exp: { label: 'eˣ − 3', f: (x) => Math.exp(x) - 3, root: Math.log(3), a: 0, b: 2.5, view: [-0.5, 3] },
};
// bisection: keep the half of [a, b] where f changes sign
export function bisect(f, a, b, n = 30) {
  const S = []; let fa = f(a);
  for (let i = 0; i < n; i++) { const m = (a + b) / 2, fm = f(m); S.push({ a, b, m, fm }); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } }
  return S;
}
// secant: the line through the last two points, where it crosses zero
export function secant(f, x0, x1, n = 12) {
  const S = [];
  for (let i = 0; i < n; i++) { const f0 = f(x0), f1 = f(x1); if (f1 === f0) break; const x2 = x1 - f1 * (x1 - x0) / (f1 - f0); S.push({ x0, x1, x2, f0, f1 }); x0 = x1; x1 = x2; if (!Number.isFinite(x2)) break; }
  return S;
}
// fixed point of g(x) = x − λ(x² − 2): the root is √2, |g'(√2)| = |1 − 2√2 λ| decides convergence
export const relax = (lam) => (x) => x - lam * (x * x - 2);
export function fixedPoint(g, x0, n = 30) { const xs = [x0]; for (let i = 0; i < n; i++) { const x = g(xs.at(-1)); xs.push(Math.abs(x) > 1e6 ? NaN : x); if (!Number.isFinite(x)) break; } return xs; }
// observed order of convergence from three successive errors: p ≈ ln(e₂/e₁) / ln(e₁/e₀)
export const order = (e0, e1, e2) => Math.log(e2 / e1) / Math.log(e1 / e0);
