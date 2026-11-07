// Floating point: machine epsilon, catastrophic cancellation in three classic formulas (naive against a
// rewritten stable form), and how the order of a float32 sum changes its error (forward, backward, Kahan).
// Pure, no DOM.
export const EPS64 = 2 ** -52, EPS32 = 2 ** -23;

// each: naive and stable forms of the same quantity, the x range to plot (log10), and what goes wrong
export const EXPR = {
  cos: { label: '(1 − cos x) / x² near 0', naive: (x) => (1 - Math.cos(x)) / (x * x), stable: (x) => 2 * Math.sin(x / 2) ** 2 / (x * x), range: [-9, 0], x: 'x', why: 'cos x ≈ 1: subtracting two nearly equal numbers' },
  sqrt: { label: '√(x² + 1) − x for large x', naive: (x) => Math.sqrt(x * x + 1) - x, stable: (x) => 1 / (Math.sqrt(x * x + 1) + x), range: [0, 9], x: 'x', why: '√(x² + 1) ≈ x: the difference is lost' },
  quad: { label: 'small root of x² + bx + 1 = 0', naive: (b) => (-b + Math.sqrt(b * b - 4)) / 2, stable: (b) => -2 / (b + Math.sqrt(b * b - 4)), range: [0.5, 9], x: 'b', why: '−b + √(b² − 4): two nearly equal numbers cancel' },
};
// relative error of the naive form, taking the stable form as the truth
export const relErr = (E, x) => { const s = E.stable(x); return Math.abs((E.naive(x) - s) / s); };

// Σ 1/k² for k = 1..n in float32, three ways; exact (float64) for reference
export function sums(n) {
  const f = Math.fround; let fw = f(0), bw = f(0), ks = f(0), c = f(0), ex = 0;
  for (let k = 1; k <= n; k++) { fw = f(fw + f(1 / (k * k))); ex += 1 / (k * k); }
  for (let k = n; k >= 1; k--) bw = f(bw + f(1 / (k * k)));
  for (let k = 1; k <= n; k++) { const y = f(f(1 / (k * k)) - c), t = f(ks + y); c = f(f(t - ks) - y); ks = t; }
  return { forward: fw, backward: bw, kahan: ks, exact: ex };
}
// the spacing of float64 numbers around x (one unit in the last place)
export const ulp = (x) => { const e = Math.floor(Math.log2(Math.abs(x) || 1)); return 2 ** (e - 52); };
