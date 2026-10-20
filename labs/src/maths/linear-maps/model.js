// 3×3 linear maps: determinant, eigenvalues (characteristic cubic) and real eigenvectors. Pure, no DOM.
// A matrix is given by its columns c1, c2, c3 (the images of the unit vectors).
export const cols = (s) => [[s.a11, s.a21, s.a31], [s.a12, s.a22, s.a32], [s.a13, s.a23, s.a33]];
export const apply = (C, v) => [0, 1, 2].map((i) => C[0][i] * v[0] + C[1][i] * v[1] + C[2][i] * v[2]);
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const det = (C) => dot(C[0], cross(C[1], C[2])); // signed volume of the image of the unit cube

// Roots of λ³ − tr·λ² + m·λ − det = 0 (m = sum of principal 2×2 minors). Returns [{ re, im }] × 3.
export function eigenvalues(C) {
  const A = (i, j) => C[j][i];
  const tr = A(0, 0) + A(1, 1) + A(2, 2);
  const m = A(0, 0) * A(1, 1) - A(0, 1) * A(1, 0) + A(0, 0) * A(2, 2) - A(0, 2) * A(2, 0) + A(1, 1) * A(2, 2) - A(1, 2) * A(2, 1);
  const d = det(C);
  // depressed cubic t³ + p t + q with λ = t + tr/3
  const p = m - tr * tr / 3, q = -2 * tr ** 3 / 27 + tr * m / 3 - d, s = tr / 3, D = (q / 2) ** 2 + (p / 3) ** 3;
  if (D > 1e-14) {
    const u = Math.cbrt(-q / 2 + Math.sqrt(D)), v = Math.cbrt(-q / 2 - Math.sqrt(D));
    return [{ re: u + v + s, im: 0 }, { re: -(u + v) / 2 + s, im: (u - v) * Math.sqrt(3) / 2 }, { re: -(u + v) / 2 + s, im: -(u - v) * Math.sqrt(3) / 2 }];
  }
  if (Math.abs(p) < 1e-14) return [0, 1, 2].map(() => ({ re: s + Math.cbrt(-q), im: 0 }));
  const r = 2 * Math.sqrt(-p / 3), phi = Math.acos(Math.max(-1, Math.min(1, 3 * q / (p * r))));
  return [0, 1, 2].map((k) => ({ re: r * Math.cos(phi / 3 - 2 * Math.PI * k / 3) + s, im: 0 })).sort((a, b) => b.re - a.re);
}

// A unit eigenvector for a real eigenvalue: the null direction of A − λI, from cross products of its rows.
export function eigenvector(C, lam) {
  const R = [0, 1, 2].map((i) => [0, 1, 2].map((j) => C[j][i] - (i === j ? lam : 0)));
  let best = null, bn = 0;
  for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) { const v = cross(R[a], R[b]), n = Math.hypot(...v); if (n > bn) { bn = n; best = v; } }
  if (bn < 1e-9) { // rank ≤ 1: any vector orthogonal to the non-zero row
    const row = R.find((r) => Math.hypot(...r) > 1e-9);
    if (!row) return [1, 0, 0];
    best = cross(row, Math.abs(row[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]); bn = Math.hypot(...best);
  }
  return best.map((x) => x / bn);
}
