// Backpropagation through a 2 → 2 → 1 network (tanh hidden, sigmoid output, cross-entropy) on one example,
// and mini-batch stochastic gradient descent for a logistic neuron. Pure, no DOM.
import { rng } from '../../lib/random.js';
import { sigmoid, logLoss, logGrad } from '../neuron/model.js';

export const START = { W: [[0.8, -0.4], [-0.6, 0.9]], b: [0.1, -0.1], v: [0.7, -0.5], c: 0 };

export function forward(p, x) {
  const z = p.W.map((w, j) => w[0] * x[0] + w[1] * x[1] + p.b[j]), h = z.map(Math.tanh), s = p.v[0] * h[0] + p.v[1] * h[1] + p.c, o = sigmoid(s);
  return { z, h, s, o };
}
export const loss = (o, y) => -(y ? Math.log(o + 1e-12) : Math.log(1 - o + 1e-12));

// the chain rule, output to input: δ = ∂L/∂(pre-activation) of each neuron
export function backward(p, x, y) {
  const f = forward(p, x), dOut = f.o - y, dh = f.h.map((h, j) => dOut * p.v[j] * (1 - h * h));
  return { ...f, dOut, dh, gW: dh.map((d) => [d * x[0], d * x[1]]), gb: dh, gv: f.h.map((h) => dOut * h), gc: dOut };
}
export const step = (p, g, lr) => ({ W: p.W.map((w, j) => [w[0] - lr * g.gW[j][0], w[1] - lr * g.gW[j][1]]), b: p.b.map((b, j) => b - lr * g.gb[j]), v: p.v.map((v, j) => v - lr * g.gv[j]), c: p.c - lr * g.gc });
// n updates on the single example: [{ params, ...backward }] before each update
export function train(x, y, lr, n) { const out = []; let p = START; for (let k = 0; k <= n; k++) { const g = backward(p, x, y); out.push({ p, ...g, L: loss(g.o, y) }); p = step(p, g, lr); } return out; }
export const flat = (g) => [g.gW[0][0], g.gW[0][1], g.gW[1][0], g.gW[1][1], g.gb[0], g.gb[1], g.gv[0], g.gv[1], g.gc];

// mini-batch SGD on (w₁, w₂) with the bias held at 0; the loss is always measured on all the data
export function sgd(P, B, lr, steps, { seed = 2, start = [-1.5, 2.5] } = {}) {
  const r = rng(seed); let [a, c] = start; const path = [[a, c, logLoss(P, a, c, 0)]];
  for (let k = 0; k < steps; k++) {
    const S = B >= P.length ? P : Array.from({ length: B }, () => P[Math.floor(r() * P.length)]), [g1, g2] = logGrad(S, a, c, 0);
    a -= lr * g1; c -= lr * g2; path.push([a, c, logLoss(P, a, c, 0)]);
  }
  return path;
}
// how far a mini-batch gradient strays from the full one (root-mean-square over many batches)
export function gradNoise(P, w, B, draws = 300, seed = 3) {
  const r = rng(seed), [G1, G2] = logGrad(P, w[0], w[1], 0); let s = 0;
  for (let d = 0; d < draws; d++) { const S = Array.from({ length: B }, () => P[Math.floor(r() * P.length)]), [g1, g2] = logGrad(S, w[0], w[1], 0); s += (g1 - G1) ** 2 + (g2 - G2) ** 2; }
  return Math.sqrt(s / draws);
}
