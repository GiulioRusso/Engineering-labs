// Convolution on digits: hand-made 3×3 kernels, and a small CNN trained on the MNIST subset:
// 14×14 → K filters 5×5 (valid) → ReLU → 2×2 max-pool → 5×5×K → dense → softmax 10. Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';

export const S = 14, F = 5, C = S - F + 1, P = C / 2; // 14, 5, 10, 5
export const KERNELS = {
  vertical: { label: 'Vertical edges', k: [-1, 0, 1, -2, 0, 2, -1, 0, 1] },
  horizontal: { label: 'Horizontal edges', k: [-1, -2, -1, 0, 0, 0, 1, 2, 1] },
  diagonal: { label: 'Diagonal edges', k: [0, 1, 2, -1, 0, 1, -2, -1, 0] },
  blur: { label: 'Blur', k: [1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16) },
  sharpen: { label: 'Sharpen', k: [0, -1, 0, -1, 5, -1, 0, -1, 0] },
  identity: { label: 'Identity', k: [0, 0, 0, 0, 1, 0, 0, 0, 0] },
};
// 'same' 3×3 correlation with zero padding; x and output are row-major S×S
export function conv3(x, k) {
  const y = new Float64Array(S * S);
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) { let s = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const rr = r + a, cc = c + b; if (rr >= 0 && rr < S && cc >= 0 && cc < S) s += k[(a + 1) * 3 + b + 1] * x[rr * S + cc]; } y[r * S + c] = s; }
  return y;
}

export function createCNN(K = 6, seed = 1) {
  const r = rng(seed), sc = Math.sqrt(2 / (F * F)), sd = Math.sqrt(1 / (K * P * P));
  return { K, w: Float64Array.from({ length: K * F * F }, () => sc * gauss(r)), b: new Float64Array(K), W: Float64Array.from({ length: 10 * K * P * P }, () => sd * gauss(r)), c: new Float64Array(10) };
}
export const cnnParams = (n) => n.w.length + n.b.length + n.W.length + n.c.length;
export function cnnForward(n, x) {
  const { K } = n, z = new Float64Array(K * C * C), pool = new Float64Array(K * P * P), arg = new Int32Array(K * P * P);
  for (let k = 0; k < K; k++) for (let r = 0; r < C; r++) for (let c = 0; c < C; c++) {
    let s = n.b[k]; for (let a = 0; a < F; a++) for (let b = 0; b < F; b++) s += n.w[k * 25 + a * F + b] * x[(r + a) * S + c + b];
    z[k * C * C + r * C + c] = s > 0 ? s : 0; // ReLU
  }
  for (let k = 0; k < K; k++) for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    let best = -1, bi = 0; for (const [a, b] of [[0, 0], [0, 1], [1, 0], [1, 1]]) { const i = k * C * C + (2 * r + a) * C + 2 * c + b; if (z[i] > best) { best = z[i]; bi = i; } }
    pool[k * P * P + r * P + c] = best; arg[k * P * P + r * P + c] = bi;
  }
  const s = new Float64Array(10), m0 = pool.length;
  for (let j = 0; j < 10; j++) { let v = n.c[j]; for (let i = 0; i < m0; i++) v += n.W[j * m0 + i] * pool[i]; s[j] = v; }
  const mx = Math.max(...s), e = s.map((v) => Math.exp(v - mx)), sum = e.reduce((p, q) => p + q, 0);
  return { z, pool, arg, p: e.map((v) => v / sum) };
}
export const zerosCNN = (n) => ({ w: new Float64Array(n.w.length), b: new Float64Array(n.b.length), W: new Float64Array(n.W.length), c: new Float64Array(10) });
export function cnnBackward(n, x, y, G) {
  const f = cnnForward(n, x), m0 = f.pool.length, ds = f.p.map((v, j) => v - (j === y)), dpool = new Float64Array(m0);
  for (let j = 0; j < 10; j++) { G.c[j] += ds[j]; for (let i = 0; i < m0; i++) { G.W[j * m0 + i] += ds[j] * f.pool[i]; dpool[i] += n.W[j * m0 + i] * ds[j]; } }
  for (let i = 0; i < m0; i++) {
    const zi = f.arg[i]; if (f.z[zi] <= 0) continue; // max-pool routes to the winner; ReLU blocks negatives
    const k = Math.floor(zi / (C * C)), rc = zi % (C * C), r = Math.floor(rc / C), c = rc % C, d = dpool[i];
    G.b[k] += d; for (let a = 0; a < F; a++) for (let b = 0; b < F; b++) G.w[k * 25 + a * F + b] += d * x[(r + a) * S + c + b];
  }
  return { loss: -Math.log(Math.max(f.p[y], 1e-12)), f };
}
// Adam on all four parameter arrays
export function cnnUpdate(n, G, m, lr, st) {
  st.t = (st.t || 0) + 1; const names = ['w', 'b', 'W', 'c'];
  st.m ??= names.map((k) => new Float64Array(n[k].length)); st.v ??= names.map((k) => new Float64Array(n[k].length));
  names.forEach((k, q) => { const p = n[k], g = G[k], M = st.m[q], V = st.v[q]; for (let i = 0; i < p.length; i++) { const gi = g[i] / m; M[i] = 0.9 * M[i] + 0.1 * gi; V[i] = 0.999 * V[i] + 0.001 * gi * gi; p[i] -= lr * (M[i] / (1 - 0.9 ** st.t)) / (Math.sqrt(V[i] / (1 - 0.999 ** st.t)) + 1e-8); } });
}
export const cnnPredict = (n, x) => { const p = cnnForward(n, x).p; let k = 0; for (let j = 1; j < 10; j++) if (p[j] > p[k]) k = j; return { p, k }; };
