// Using derivatives and integrals: limits and continuity, curve sketching from f′ and f″, Newton's
// method, the area between two curves, and volumes of revolution (disc method). Pure, no DOM.
export const LIMITS = {
  removable: { label: '(x² − 1)/(x − 1) at 1', a: 1, f: (x) => (x * x - 1) / (x - 1), L: 2, kind: 'removable' },
  jump: { label: '|x|/x at 0', a: 0, f: (x) => Math.abs(x) / x, L: null, left: -1, right: 1, kind: 'jump' },
  infinite: { label: '1/x² at 0', a: 0, f: (x) => 1 / (x * x), L: Infinity, kind: 'infinite' },
  sinc: { label: 'sin x / x at 0', a: 0, f: (x) => Math.sin(x) / x, L: 1, kind: 'removable' },
  wild: { label: 'sin(1/x) at 0', a: 0, f: (x) => Math.sin(1 / x), L: null, kind: 'oscillating' },
};
export const SKETCH = {
  cubic: { label: 'x³ − 3x', f: (x) => x ** 3 - 3 * x },
  quartic: { label: 'x⁴ − 2x²', f: (x) => x ** 4 - 2 * x * x },
  bump: { label: 'x e^(−x²)', f: (x) => x * Math.exp(-x * x) },
  sin: { label: 'sin x + x/2', f: (x) => Math.sin(x) + x / 2 },
  flat: { label: 'x³ (flat, not extremum)', f: (x) => x ** 3 },
};
export const d1 = (f, x, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);
export const d2 = (f, x, h = 1e-3) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
// sign changes of g on [a, b] by scanning then bisecting
export function zeros(g, a, b, n = 800) { const out = []; let px = a, pv = g(a); for (let i = 1; i <= n; i++) { const x = a + (b - a) * i / n, v = g(x); if (Number.isFinite(pv) && Number.isFinite(v) && pv * v <= 0 && !(v === 0 && pv === 0)) { let lo = px, hi = x; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (g(lo) * g(m) <= 0) hi = m; else lo = m; } const r = (lo + hi) / 2; if (!out.some((q) => Math.abs(q - r) < 1e-4)) out.push(r); } px = x; pv = v; } return out; }
export function newton(f, x0, n = 8) { const xs = [x0]; for (let i = 0; i < n; i++) { const x = xs[xs.length - 1], s = d1(f, x); if (!Number.isFinite(s) || Math.abs(s) < 1e-12) break; xs.push(x - f(x) / s); } return xs; }
export function simpson(f, a, b, n = 400) { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; }
export const volume = (f, a, b) => Math.PI * simpson((x) => f(x) ** 2, a, b);
