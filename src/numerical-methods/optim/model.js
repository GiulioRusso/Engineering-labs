// Optimisation: golden-section search on a unimodal function of one variable, and in two variables
// gradient descent (fixed step or exact line search) against Newton's method, on an elongated quadratic
// bowl and on Rosenbrock's banana valley. Pure, no DOM.
export const PHI = (Math.sqrt(5) - 1) / 2;   // 0.618…

export const F1 = {
  bowl: { label: '(x − 1.3)² + 0.5', f: (x) => (x - 1.3) ** 2 + 0.5, view: [0, 3], min: 1.3 },
  sine: { label: '−sin x on [0, 3]', f: (x) => -Math.sin(x), view: [0, 3], min: Math.PI / 2 },
  kink: { label: '|x − 2| + 0.2 x (a kink)', f: (x) => Math.abs(x - 2) + 0.2 * x, view: [0, 3], min: 2 },
};
// golden-section search: the bracket [a, b] with interior points c < d, one new evaluation per step
export function golden(f, a, b, n) {
  let c = b - PHI * (b - a), d = a + PHI * (b - a), fc = f(c), fd = f(d); const out = [{ a, b, c, d, fc, fd }];
  for (let k = 0; k < n; k++) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - PHI * (b - a); fc = f(c); } else { a = c; c = d; fc = fd; d = a + PHI * (b - a); fd = f(d); }
    out.push({ a, b, c, d, fc, fd });
  }
  return out;
}

// two-variable test functions with gradient and Hessian
export function quadratic(kappa, angle = 30) {
  const t = angle * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), H = [[c * c + kappa * s * s, (1 - kappa) * c * s], [(1 - kappa) * c * s, s * s + kappa * c * c]];
  return { label: 'elongated bowl', f: ([x, y]) => 0.5 * (H[0][0] * x * x + 2 * H[0][1] * x * y + H[1][1] * y * y), g: ([x, y]) => [H[0][0] * x + H[0][1] * y, H[0][1] * x + H[1][1] * y], H: () => H, min: [0, 0], view: [[-3, 3], [-3, 3]] };
}
export const rosenbrock = { label: 'Rosenbrock', f: ([x, y]) => (1 - x) ** 2 + 100 * (y - x * x) ** 2, g: ([x, y]) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
  H: ([x, y]) => [[2 - 400 * (y - x * x) + 800 * x * x, -400 * x], [-400 * x, 200]], min: [1, 1], view: [[-2, 2], [-1, 3]] };
const inv2 = (M, v) => { const d = M[0][0] * M[1][1] - M[0][1] * M[1][0]; return [(M[1][1] * v[0] - M[0][1] * v[1]) / d, (M[0][0] * v[1] - M[1][0] * v[0]) / d]; };

// n steps of a method from x0: 'gd' fixed step eta, 'line' steepest descent with a backtracking line search
// (exact for a quadratic), 'newton' x ← x − H⁻¹∇f
export function descend(F, x0, n, method, eta = 0.1) {
  const out = [[...x0]]; let x = [...x0];
  for (let k = 0; k < n; k++) {
    const g = F.g(x); let p;
    if (method === 'newton') p = inv2(F.H(x), g).map((v) => -v);
    else if (method === 'line') {
      let a; const H = F.H(x), gHg = g[0] * (H[0][0] * g[0] + H[0][1] * g[1]) + g[1] * (H[1][0] * g[0] + H[1][1] * g[1]), gg = g[0] * g[0] + g[1] * g[1];
      if (F.label === 'elongated bowl') a = gg / gHg; else { a = 1; const f0 = F.f(x); while (a > 1e-12 && F.f([x[0] - a * g[0], x[1] - a * g[1]]) > f0 - 1e-4 * a * gg) a /= 2; }
      p = g.map((v) => -a * v);
    } else p = g.map((v) => -eta * v);
    x = [x[0] + p[0], x[1] + p[1]]; if (!x.every(Number.isFinite) || Math.abs(x[0]) > 1e6) break; out.push([...x]);
  }
  return out;
}
