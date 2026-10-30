// A single neuron, gradient descent on its loss, and a one-hidden-layer network learning the two moons.
// Deterministic (seeded) data so every reload shows the same picture. Pure, no DOM.
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
export const sigmoid = (z) => 1 / (1 + Math.exp(-z));

// two Gaussian blobs, labels 0/1
export function blobs(n = 80, { sep = 2.2, spread = 0.8, seed = 3 } = {}) {
  const r = rng(seed), P = [];
  for (let i = 0; i < n; i++) { const y = i % 2, c = y ? sep / 2 : -sep / 2; P.push([c + spread * gauss(r), c * 0.6 + spread * gauss(r), y]); }
  return P;
}
// two interleaving half circles
export function moons(n = 200, { noise = 0.12, seed = 5 } = {}) {
  const r = rng(seed), P = [];
  for (let i = 0; i < n; i++) { const y = i % 2, t = Math.PI * r(); const x = y ? 1 - Math.cos(t) : Math.cos(t), z = y ? 0.5 - Math.sin(t) : Math.sin(t); P.push([(x - 0.5) * 1.6 + noise * gauss(r), (z - 0.25) * 1.6 + noise * gauss(r), y]); }
  return P;
}

// logistic neuron: cross-entropy loss and its gradient
export function logLoss(P, w1, w2, b) { let L = 0; for (const [x, y, t] of P) { const p = Math.min(1 - 1e-12, Math.max(1e-12, sigmoid(w1 * x + w2 * y + b))); L -= t ? Math.log(p) : Math.log(1 - p); } return L / P.length; }
export function logGrad(P, w1, w2, b) { let g1 = 0, g2 = 0, gb = 0; for (const [x, y, t] of P) { const e = sigmoid(w1 * x + w2 * y + b) - t; g1 += e * x; g2 += e * y; gb += e; } const n = P.length; return [g1 / n, g2 / n, gb / n]; }
export function descend(P, start, lr, steps) { const path = [[...start]]; let [a, c, b] = start; for (let k = 0; k < steps; k++) { const [g1, g2, gb] = logGrad(P, a, c, b); a -= lr * g1; c -= lr * g2; b -= lr * gb; path.push([a, c, b]); } return path; }
export const accuracy = (P, f) => P.filter(([x, y, t]) => (f(x, y) > 0.5) === !!t).length / P.length;

// 2 → H → 1 network (tanh or ReLU hidden), trained with full-batch Adam; snapshots every `every` epochs
export function trainMLP(P, { H = 6, act = 'tanh', lr = 0.05, epochs = 1500, every = 25, seed = 7 } = {}) {
  const r = rng(seed), W1 = Array.from({ length: H }, () => [gauss(r) * 0.9, gauss(r) * 0.9]), b1 = Array.from({ length: H }, () => gauss(r) * 0.3), W2 = Array.from({ length: H }, () => gauss(r) * 0.6); let b2 = 0;
  const f = act === 'relu' ? (z) => Math.max(0, z) : Math.tanh, df = act === 'relu' ? (z) => (z > 0 ? 1 : 0) : (z) => 1 - Math.tanh(z) ** 2;
  const params = () => ({ W1: W1.map((w) => [...w]), b1: [...b1], W2: [...W2], b2, act });
  const m = new Float64Array(4 * H + 1), v = new Float64Array(4 * H + 1), snaps = [], losses = [];
  for (let e = 0; e <= epochs; e++) {
    const g = new Float64Array(4 * H + 1); let L = 0;
    for (const [x, y, t] of P) {
      const z = W1.map((w, j) => w[0] * x + w[1] * y + b1[j]), h = z.map(f), o = sigmoid(h.reduce((s, hj, j) => s + hj * W2[j], b2)), d = o - t;
      L -= t ? Math.log(o + 1e-12) : Math.log(1 - o + 1e-12);
      for (let j = 0; j < H; j++) { const dh = d * W2[j] * df(z[j]); g[j] += d * h[j]; g[H + j] += dh * x; g[2 * H + j] += dh * y; g[3 * H + j] += dh; } g[4 * H] += d;
    }
    losses.push(L / P.length); if (e % every === 0) snaps.push(params());
    const n = P.length, t1 = e + 1;
    for (let k = 0; k < 4 * H + 1; k++) { const gk = g[k] / n; m[k] = 0.9 * m[k] + 0.1 * gk; v[k] = 0.999 * v[k] + 0.001 * gk * gk; const step = lr * (m[k] / (1 - 0.9 ** t1)) / (Math.sqrt(v[k] / (1 - 0.999 ** t1)) + 1e-8);
      if (k < H) W2[k] -= step; else if (k < 2 * H) W1[k - H][0] -= step; else if (k < 3 * H) W1[k - 2 * H][1] -= step; else if (k < 4 * H) b1[k - 3 * H] -= step; else b2 -= step; }
  }
  return { snaps, losses, every };
}
export function mlpForward(p, x, y) { const f = p.act === 'relu' ? (z) => Math.max(0, z) : Math.tanh, h = p.W1.map((w, j) => f(w[0] * x + w[1] * y + p.b1[j])); return { h, out: sigmoid(h.reduce((s, hj, j) => s + hj * p.W2[j], p.b2)) }; }
