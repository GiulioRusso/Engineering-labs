// Universal approximation: one hidden layer (ReLU or tanh) with a linear output, fitted by Adam to a 1D
// target on [−1, 1]. The output is a sum of one simple piece per hidden unit. Pure, no DOM.
import { createNet, output, epoch, ACT } from '../net/model.js';
import { rng } from '../../lib/random.js';

export const TARGETS = {
  sine: { label: 'sin 2πx', f: (x) => 0.8 * Math.sin(2 * Math.PI * x) },
  abs: { label: '|x|', f: (x) => 1.6 * Math.abs(x) - 0.8 },
  bump: { label: 'bump', f: (x) => 1.6 * Math.exp(-((x / 0.25) ** 2)) - 0.8 },
  step: { label: 'step', f: (x) => (x > 0 ? 0.8 : -0.8) },
};
export const samples = (target, n = 64) => { const X = [], Y = []; for (let i = 0; i < n; i++) { const x = -1 + 2 * i / (n - 1); X.push([x]); Y.push(TARGETS[target].f(x)); } return [X, Y]; };
// biases start so that the units' knees are spread over [−1, 1] (with b = 0 they would all bend at x = 0)
export function makeNet(H, act, seed = 2) {
  // knees evenly spaced, facing alternately right and left, so no unit starts dead or duplicated
  const n = createNet([1, H, 1], { act, out: 'linear', seed });
  for (let j = 0; j < H; j++) { const w = (j % 2 ? -1 : 1) * 2; n.W[0][j] = w; n.b[0][j] = -w * (-1 + 2 * (j + 0.5) / H); }
  return n;
}
export const trainSteps = (net, X, Y, steps, o) => { for (let s = 0; s < steps; s++) epoch(net, X, Y, { batch: X.length, opt: 'adam', ...o }); };
export const mse = (net, X, Y) => X.reduce((s, x, i) => s + (output(net, x)[0] - Y[i]) ** 2, 0) / X.length;
// unit j's contribution to the output: v_j · f(w_j x + b_j); and where it bends (ReLU) or is centred (tanh)
export const piece = (net, j, x) => net.W[1][j] * ACT[net.act].f(net.W[0][j] * x + net.b[0][j]);
export const knee = (net, j) => -net.b[0][j] / net.W[0][j];
