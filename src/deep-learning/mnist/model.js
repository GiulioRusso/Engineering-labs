// Handwritten digits: a small MLP (or plain softmax regression when H = 0) on the MNIST subset.
// Inputs are 196 pixel values in [0, 1]. Training uses the shared engine. Pure, no DOM.
import { mnist } from '../data/mnist.js';
import { createNet, output, epoch } from '../net/model.js';
import { rng } from '../../lib/random.js';

export const SIDE = 14, PIX = SIDE * SIDE;
let cache = null;
// { X, Y, Xt, Yt }: arrays of 196-pixel views and labels
export function digits() {
  if (cache) return cache;
  const d = mnist(), view = (s) => Array.from({ length: s.n }, (_, i) => s.x.subarray(i * PIX, (i + 1) * PIX));
  return (cache = { X: view(d.train), Y: Array.from(d.train.y), Xt: view(d.test), Yt: Array.from(d.test.y) });
}
export const makeNet = (H, seed = 1) => createNet(H ? [PIX, H, 10] : [PIX, 10], { act: 'relu', out: 'softmax', seed });
export const OPT = { lr: 0.003, opt: 'adam', batch: 32 };
export function train(H, epochs, seed = 1) {
  const { X, Y } = digits(), net = makeNet(H, seed), state = {}, r = rng(seed);
  for (let e = 0; e < epochs; e++) epoch(net, X, Y, { ...OPT, state, r });
  return net;
}
export const predict = (net, x) => { const p = output(net, x); let k = 0; for (let j = 1; j < 10; j++) if (p[j] > p[k]) k = j; return { p, k }; };
// confusion[true][predicted] counts, and the indices of the test digits it gets wrong
export function confusion(net, Xt, Yt) {
  const C = Array.from({ length: 10 }, () => new Array(10).fill(0)), wrong = [];
  Xt.forEach((x, i) => { const k = predict(net, x).k; C[Yt[i]][k]++; if (k !== Yt[i]) wrong.push(i); });
  return { C, wrong, acc: 1 - wrong.length / Xt.length };
}
