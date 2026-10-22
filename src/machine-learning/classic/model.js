// Classic machine learning before neural networks: k-nearest neighbours and decision trees (supervised),
// k-means and principal component analysis (unsupervised). Points are [x, y, label]. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

// four round clusters, or one wide and one tight cluster (k-means' blind spot)
export function clusters(kind = 'four', n = 200, seed = 4) {
  const r = rng(seed), C = kind === 'four' ? [[-1.6, 1.4, 0.45], [1.5, 1.6, 0.45], [-1.2, -1.5, 0.45], [1.7, -1.2, 0.45]] : [[-1.2, 0, 1.0], [1.9, 0.4, 0.25]];
  return Array.from({ length: n }, (_, i) => { const c = C[kind === 'four' ? i % 4 : i % 5 === 0 ? 1 : 0]; return [c[0] + c[2] * gauss(r), c[1] + c[2] * gauss(r), C.indexOf(c)]; });
}

// k-NN: the k training points closest to (x, y), and the fraction of them in class 1
export function neighbours(P, x, y, k) {
  return P.map((p, i) => [(p[0] - x) ** 2 + (p[1] - y) ** 2, i]).sort((a, b) => a[0] - b[0]).slice(0, k).map(([d2, i]) => ({ i, d: Math.sqrt(d2) }));
}
export const knn = (P, x, y, k) => neighbours(P, x, y, k).reduce((s, { i }) => s + P[i][2], 0) / k;
export const accuracy = (Q, f) => Q.filter(([x, y, t]) => (f(x, y) > 0.5) === !!t).length / Q.length;

// decision tree (CART): split where the Gini impurity of the two halves drops most
const gini = (n1, n) => (n ? 2 * (n1 / n) * (1 - n1 / n) : 0);
export function growTree(P, maxDepth, depth = 0) {
  const n = P.length, n1 = P.filter((p) => p[2]).length, leaf = { leaf: true, p: n ? n1 / n : 0.5, n };
  if (depth >= maxDepth || n1 === 0 || n1 === n) return leaf;
  let best = null;
  for (const f of [0, 1]) {
    const S = [...P].sort((a, b) => a[f] - b[f]); let l1 = 0;
    for (let i = 1; i < n; i++) {
      l1 += S[i - 1][2]; if (S[i][f] === S[i - 1][f]) continue;
      const g = (i * gini(l1, i) + (n - i) * gini(n1 - l1, n - i)) / n;
      if (!best || g < best.g) best = { g, f, thr: (S[i][f] + S[i - 1][f]) / 2 };
    }
  }
  if (!best || best.g >= gini(n1, n) - 1e-12) return leaf;
  return { f: best.f, thr: best.thr, n, p: n1 / n, left: growTree(P.filter((p) => p[best.f] < best.thr), maxDepth, depth + 1), right: growTree(P.filter((p) => p[best.f] >= best.thr), maxDepth, depth + 1) };
}
export const predict = (T, x, y) => (T.leaf ? T.p : predict([x, y][T.f] < T.thr ? T.left : T.right, x, y));
export const leaves = (T) => (T.leaf ? 1 : leaves(T.left) + leaves(T.right));
// the split lines inside their boxes [x0, x1, y0, y1], for drawing
export function splits(T, box, out = []) {
  if (T.leaf) return out; const [x0, x1, y0, y1] = box;
  out.push(T.f === 0 ? [T.thr, y0, T.thr, y1] : [x0, T.thr, x1, T.thr]);
  splits(T.left, T.f === 0 ? [x0, T.thr, y0, y1] : [x0, x1, y0, T.thr], out); splits(T.right, T.f === 0 ? [T.thr, x1, y0, y1] : [x0, x1, T.thr, y1], out);
  return out;
}

// k-means (Lloyd): starting centres are k data points picked at random; every iteration assigns, then moves
export function kmeans(P, k, { seed = 1, iters = 12 } = {}) {
  const r = rng(seed * 7919 + k); let C = Array.from({ length: k }, () => { const p = P[Math.floor(r() * P.length)]; return [p[0], p[1]]; });
  const assign = (C) => P.map(([x, y]) => { let b = 0, bd = Infinity; C.forEach(([cx, cy], j) => { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; b = j; } }); return b; });
  const inertia = (C, A) => P.reduce((s, [x, y], i) => s + (x - C[A[i]][0]) ** 2 + (y - C[A[i]][1]) ** 2, 0);
  const H = []; let A = assign(C);
  for (let t = 0; t <= iters; t++) {
    H.push({ C: C.map((c) => [...c]), A, inertia: inertia(C, A) });
    C = C.map((c, j) => { const m = P.filter((_, i) => A[i] === j); return m.length ? [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length] : c; });
    A = assign(C);
  }
  return H;
}

// a correlated Gaussian cloud: spreads s1 along the angle, s2 across it
export function cloud(angle, s1, s2, n = 150, seed = 9) {
  const r = rng(seed), c = Math.cos(angle), s = Math.sin(angle);
  return Array.from({ length: n }, () => { const u = s1 * gauss(r), v = s2 * gauss(r); return [0.3 + u * c - v * s, -0.2 + u * s + v * c, 0]; });
}
// PCA of 2D points: mean, and the covariance eigenpairs (largest first)
export function pca(P) {
  const n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n;
  let a = 0, b = 0, c = 0; for (const [x, y] of P) { a += (x - mx) ** 2; b += (x - mx) * (y - my); c += (y - my) ** 2; } a /= n; b /= n; c /= n;
  const t = (a + c) / 2, d = Math.sqrt(((a - c) / 2) ** 2 + b * b), th = 0.5 * Math.atan2(2 * b, a - c);
  return { mean: [mx, my], l1: t + d, l2: t - d, angle: th, v1: [Math.cos(th), Math.sin(th)], v2: [-Math.sin(th), Math.cos(th)] };
}
// variance of the points projected on the direction θ (and the leftover, squared distance to that line)
export function along(P, th) {
  const { mean: [mx, my] } = pca(P), c = Math.cos(th), s = Math.sin(th), n = P.length; let v = 0, r = 0;
  for (const [x, y] of P) { const u = (x - mx) * c + (y - my) * s, w = -(x - mx) * s + (y - my) * c; v += u * u; r += w * w; }
  return { variance: v / n, residual: r / n };
}
