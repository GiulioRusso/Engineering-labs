import { createNet, forward, backward, zeros, epoch, evaluate, output, params } from './model.js';
import { rng } from '../../lib/random.js';
import { near, ok } from '../../lib/testing.js';

// central differences on every parameter vs backprop
function gradCheck(net, x, y) {
  const G = zeros(net); backward(net, forward(net, x), y, G);
  const L = () => backward(net, forward(net, x), y, null).loss, h = 1e-6; let worst = 0;
  net.W.forEach((w, l) => { for (let i = 0; i < w.length; i++) { const v = w[i]; w[i] = v + h; const a = L(); w[i] = v - h; const b = L(); w[i] = v; worst = Math.max(worst, Math.abs((a - b) / (2 * h) - G.W[l][i]) / (Math.abs(G.W[l][i]) + 1e-6)); } });
  return worst;
}

export const tests = {
  'backprop = finite differences, for every activation and output'() {
    for (const act of ['tanh', 'relu', 'sigmoid']) for (const [out, y, k] of [['sigmoid', 1, 1], ['softmax', 2, 3], ['linear', [0.3, -0.2], 2]]) {
      const net = createNet([3, 5, 4, k], { act, out, seed: 4 }), e = gradCheck(net, [0.3, -0.7, 0.5], y);
      ok(e < 1e-5, `${act}/${out}: rel err ${e}`);
    }
  },
  'softmax outputs are probabilities'() {
    const o = output(createNet([4, 6, 10], { out: 'softmax' }), [1, 2, 3, 4]);
    near(o.reduce((a, b) => a + b, 0), 1, 1e-12, 'sum'); ok(o.every((p) => p > 0), 'positive');
  },
  'a 2-4-1 tanh network learns XOR; no hidden layer cannot'() {
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]], Y = [0, 1, 1, 0], r = rng(2);
    const net = createNet([2, 4, 1], { seed: 3 }); for (let k = 0; k < 2000; k++) epoch(net, X, Y, { batch: 4, lr: 0.5, r });
    ok(evaluate(net, X, Y).acc === 1, 'hidden layer: 4/4');
    const lin = createNet([2, 1], { seed: 3 }); for (let k = 0; k < 2000; k++) epoch(lin, X, Y, { batch: 4, lr: 0.5, r });
    ok(evaluate(lin, X, Y).acc <= 0.75, 'a single neuron: at most 3/4');
  },
  'parameter count: (in + 1)·out per layer'() { ok(params(createNet([196, 32, 10])) === 197 * 32 + 33 * 10, 'count'); },
};
