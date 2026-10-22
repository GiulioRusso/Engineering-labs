// Linear algebra in the plane: 2×2 systems (two lines), the determinant as signed area, eigenvectors of
// a 2×2 matrix, and least-squares line fitting. Pure, no DOM.
export const det = (a, b, c, d) => a * d - b * c;
// solve [a b; c d][x y] = [e f] by Cramer; null when singular
export function solve2(a, b, c, d, e, f) { const D = det(a, b, c, d); return Math.abs(D) < 1e-12 ? null : [det(e, b, f, d) / D, det(a, e, c, f) / D]; }
// real eigenvalues/eigenvectors of [a b; c d] (null if complex)
export function eig2(a, b, c, d) {
  const tr = a + d, D = det(a, b, c, d), disc = tr * tr / 4 - D;
  if (disc < -1e-12) return { complex: true, re: tr / 2, im: Math.sqrt(-disc) };
  const s = Math.sqrt(Math.max(0, disc)), ls = [tr / 2 + s, tr / 2 - s];
  const vec = (l) => { const v = Math.abs(b) > 1e-12 ? [b, l - a] : Math.abs(c) > 1e-12 ? [l - d, c] : (Math.abs(l - a) < 1e-12 ? [1, 0] : [0, 1]); const n = Math.hypot(...v); return [v[0] / n, v[1] / n]; };
  return { complex: false, values: ls, vectors: ls.map(vec) };
}
// least squares y = m x + q through points
export function fit(pts) { const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0), sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0); const m = (n * sxy - sx * sy) / (n * sxx - sx * sx), q = (sy - m * sx) / n, sse = pts.reduce((s, p) => s + (p[1] - m * p[0] - q) ** 2, 0), my = sy / n, sst = pts.reduce((s, p) => s + (p[1] - my) ** 2, 0); return { m, q, sse, r2: 1 - sse / sst }; }
