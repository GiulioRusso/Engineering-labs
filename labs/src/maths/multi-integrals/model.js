// Multivariable calculus beyond the gradient: double integrals as stacks of boxes, constrained optimisation
// with Lagrange multipliers, and line integrals (work along a path) for conservative and rotational
// fields. Pure, no DOM.
export const SURFS = {
  bowl: { label: 'x² + y²', f: (x, y) => x * x + y * y, exact: (a, b, c, d) => ((b ** 3 - a ** 3) / 3) * (d - c) + ((d ** 3 - c ** 3) / 3) * (b - a) },
  plane: { label: '1 + x/2 + y/4', f: (x, y) => 1 + x / 2 + y / 4, exact: (a, b, c, d) => (b - a) * (d - c) + (b * b - a * a) / 4 * (d - c) + (d * d - c * c) / 8 * (b - a) },
  bump: { label: '2 e^(−(x² + y²))', f: (x, y) => 2 * Math.exp(-(x * x + y * y)), exact: null },
};
// midpoint Riemann sum on an n × n grid; boxes [x, y, height]
export function riemann2(f, a, b, c, d, n) { const dx = (b - a) / n, dy = (d - c) / n, boxes = []; let V = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = a + (i + 0.5) * dx, y = c + (j + 0.5) * dy, h = f(x, y); V += h * dx * dy; boxes.push([x, y, h]); } return { V, boxes, dx, dy }; }
// maximise f on the circle x² + y² = r² by scanning the angle; gradients for the picture
export const OBJ = {
  sum: { label: 'x + y', f: (x, y) => x + y, g: () => [1, 1] },
  prod: { label: 'x·y', f: (x, y) => x * y, g: (x, y) => [y, x] },
  tilt: { label: '2x + y', f: (x, y) => 2 * x + y, g: () => [2, 1] },
};
export function constrained(f, r) { let best = -Infinity, ta = 0, worst = Infinity, tb = 0; for (let i = 0; i < 3600; i++) { const t = 2 * Math.PI * i / 3600, v = f(r * Math.cos(t), r * Math.sin(t)); if (v > best) { best = v; ta = t; } if (v < worst) { worst = v; tb = t; } } return { max: [r * Math.cos(ta), r * Math.sin(ta), best], min: [r * Math.cos(tb), r * Math.sin(tb), worst] }; }
export const FIELDS = {
  grad: { label: 'F = ∇(xy) = (y, x) — conservative', F: (x, y) => [y, x], pot: (x, y) => x * y },
  vortex: { label: 'F = (−y, x) — rotational', F: (x, y) => [-y, x], pot: null },
  gravity: { label: 'F = −(x, y) — a spring to the centre', F: (x, y) => [-x, -y], pot: (x, y) => -(x * x + y * y) / 2 },
};
export const A = [-2, -1], B = [2, 2];
export const PATHS = {
  straight: { label: 'Straight from A to B', r: (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t] },
  arc: { label: 'Curved from A to B', r: (t) => { const px = -(B[1] - A[1]), py = B[0] - A[0], L = Math.hypot(px, py), b = 1.8 * Math.sin(Math.PI * t); return [A[0] + (B[0] - A[0]) * t + b * px / L, A[1] + (B[1] - A[1]) * t + b * py / L]; } },
  circle: { label: 'Closed circle', r: (t) => [1.6 * Math.cos(2 * Math.PI * t), 1.6 * Math.sin(2 * Math.PI * t)] },
};
// ∫ F · dr along r(t), t ∈ [0, u]; returns the running work
export function work(F, r, n = 600) { const W = [0]; let s = 0; for (let i = 0; i < n; i++) { const p = r(i / n), q = r((i + 1) / n), m = r((i + 0.5) / n), f = F(...m); s += f[0] * (q[0] - p[0]) + f[1] * (q[1] - p[1]); W.push(s); } return W; }
