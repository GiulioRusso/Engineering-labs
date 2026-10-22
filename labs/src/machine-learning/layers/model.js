// The arithmetic inside layers: a dense layer as dot products, 2D convolution with stride, padding and
// dilation (and which input cells each output reads), pooling, multi-channel filters, and the shapes
// and parameter counts through a small CNN. Pure, no DOM.
export const outSize = (N, k, { stride = 1, pad = 0, dil = 1 } = {}) => Math.floor((N + 2 * pad - dil * (k - 1) - 1) / stride) + 1;

// X: H×W array of rows (or C of them for channels), K: k×k (or C of them); returns { out, taps }
// taps[m][n] = list of [i, j, kr, kc] input cells (in padded coordinates relative to X) feeding output (m, n)
export function conv2d(X, K, { stride = 1, pad = 0, dil = 1 } = {}) {
  const multi = Array.isArray(X[0][0]), Xs = multi ? X : [X], Ks = multi ? K : [K], H = Xs[0].length, W = Xs[0][0].length, k = Ks[0].length;
  const Ho = outSize(H, k, { stride, pad, dil }), Wo = outSize(W, k, { stride, pad, dil }), out = [], taps = [];
  for (let m = 0; m < Ho; m++) { out.push([]); taps.push([]); for (let n = 0; n < Wo; n++) {
    let s = 0; const t = [];
    for (let u = 0; u < k; u++) for (let v = 0; v < k; v++) { const i = m * stride - pad + u * dil, j = n * stride - pad + v * dil; t.push([i, j, u, v]); if (i >= 0 && i < H && j >= 0 && j < W) for (let c = 0; c < Xs.length; c++) s += Xs[c][i][j] * Ks[c][u][v]; }
    out[m].push(s); taps[m].push(t); } }
  return { out, taps };
}
export function pool(X, size = 2, kind = 'max') {
  const H = Math.floor(X.length / size), W = Math.floor(X[0].length / size), out = [];
  for (let m = 0; m < H; m++) { out.push([]); for (let n = 0; n < W; n++) { const v = []; for (let u = 0; u < size; u++) for (let w = 0; w < size; w++) v.push(X[m * size + u][n * size + w]); out[m].push(kind === 'max' ? Math.max(...v) : v.reduce((a, b) => a + b, 0) / v.length); } }
  return out;
}
export const dense = (W, x, b) => W.map((row, j) => row.reduce((s, w, i) => s + w * x[i], 0) + b[j]);

// a small digit-like 7×7 image (a "7") and some classic 3×3 kernels
export const IMG = [
  [0, 0, 0, 0, 0, 0, 0], [0, 1, 1, 1, 1, 1, 0], [0, 0, 0, 0, 1, 1, 0], [0, 0, 0, 1, 1, 0, 0], [0, 0, 0, 1, 0, 0, 0], [0, 0, 1, 1, 0, 0, 0], [0, 0, 1, 0, 0, 0, 0],
];
export const KERNELS = {
  vertical: { label: 'Vertical edges', k: [[1, 0, -1], [1, 0, -1], [1, 0, -1]] },
  horizontal: { label: 'Horizontal edges', k: [[1, 1, 1], [0, 0, 0], [-1, -1, -1]] },
  blur: { label: 'Blur (box)', k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map((r) => r.map((v) => v / 9)) },
  sharpen: { label: 'Sharpen', k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
};

// shapes and parameters through conv(k, F₁) → pool 2 → conv(k, F₂) → pool 2 → dense(10), 'same' padding
export function stack(N = 28, C = 1, F1 = 8, F2 = 16, k = 3) {
  const L = [{ name: 'input', h: N, c: C, params: 0 }];
  L.push({ name: `conv ${k}×${k}, ${F1}`, h: N, c: F1, params: (k * k * C + 1) * F1 });
  L.push({ name: 'pool 2×2', h: Math.floor(N / 2), c: F1, params: 0 });
  L.push({ name: `conv ${k}×${k}, ${F2}`, h: Math.floor(N / 2), c: F2, params: (k * k * F1 + 1) * F2 });
  L.push({ name: 'pool 2×2', h: Math.floor(N / 4), c: F2, params: 0 });
  const flat = Math.floor(N / 4) ** 2 * F2; L.push({ name: 'dense → 10', h: 1, c: 10, params: (flat + 1) * 10 });
  return L;
}
