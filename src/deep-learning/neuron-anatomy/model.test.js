import { ACTS, neuron, GATES, INPUTS, perceptron } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'z = w·x + b, and each activation’s slope matches a finite difference'() {
    const n = neuron([1, -2, 0.5], [0.5, 0.25, 2], -0.3, 'linear');
    near(n.z, 0.5 - 0.5 + 1 - 0.3, 1e-12, 'z');
    for (const k of ['sigmoid', 'tanh', 'relu', 'linear']) for (const z of [-1.3, 0.4, 2.2]) near(ACTS[k].d(z) + 1, (ACTS[k].f(z + 1e-6) - ACTS[k].f(z - 1e-6)) / 2e-6 + 1, 1e-8, `${k} at ${z}`);
  },
  'hand-set weights make AND, OR, NAND'() {
    const out = (w, b) => INPUTS.map((x) => neuron(x, w, b, 'step').y);
    ok(String(out([1, 1], -1.5)) === String(GATES.and), 'AND'); ok(String(out([1, 1], -0.5)) === String(GATES.or), 'OR'); ok(String(out([-1, -1], 1.5)) === String(GATES.nand), 'NAND');
  },
  'the perceptron rule learns every separable gate, never XOR'() {
    for (const g of ['and', 'or', 'nand', 'nor']) ok(perceptron(g, 0.5, 200).at(-1).errors === 0, g);
    ok(perceptron('xor', 0.5, 400).every((h) => h.errors > 0), 'xor never right on all four');
  },
};
