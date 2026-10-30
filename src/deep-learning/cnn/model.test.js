import { createCNN, cnnForward, cnnBackward, zerosCNN, cnnUpdate, cnnPredict, cnnParams, conv3, KERNELS, S } from './model.js';
import { digits, train } from '../mnist/model.js';
import { confusion } from '../mnist/model.js';
import { rng } from '../../lib/random.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'CNN backprop = finite differences (filters, biases, dense weights)'() {
    const n = createCNN(3, 2), r = rng(5), x = Float64Array.from({ length: S * S }, () => r()), G = zerosCNN(n); cnnBackward(n, x, 4, G);
    const L = () => -Math.log(cnnForward(n, x).p[4]); let worst = 0;
    for (const [key, idx] of [['w', [0, 7, 30, 60]], ['b', [0, 2]], ['W', [0, 11, 120, 700]], ['c', [3, 4]]]) for (const i of idx) {
      const v = n[key][i]; n[key][i] = v + 1e-6; const a = L(); n[key][i] = v - 1e-6; const b = L(); n[key][i] = v;
      worst = Math.max(worst, Math.abs((a - b) / 2e-6 - G[key][i]) / (Math.abs(G[key][i]) + 1e-6));
    }
    ok(worst < 1e-4, `worst rel err ${worst}`);
  },
  'edge kernels: zero on a flat image, the identity changes nothing'() {
    const flat = new Float64Array(S * S).fill(0.5);
    const v = conv3(flat, KERNELS.vertical.k); ok(Math.abs(v[5 * S + 5]) < 1e-12, 'vertical edges of a flat image');
    const { X } = digits(); ok(conv3(X[0], KERNELS.identity.k).every((q, i) => q === X[0][i]), 'identity');
  },
  'a 6-filter CNN (1666 parameters) beats softmax regression (1970) after 3 epochs'() {
    const { X, Y, Xt, Yt } = digits(), n = createCNN(6, 1), st = {}, r = rng(1);
    for (let e = 0; e < 3; e++) { const idx = Array.from(X, (_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      for (let s = 0; s < idx.length; s += 32) { const G = zerosCNN(n), B = idx.slice(s, s + 32); for (const i of B) cnnBackward(n, X[i], Y[i], G); cnnUpdate(n, G, B.length, 0.005, st); } }
    const acc = Xt.filter((x, i) => cnnPredict(n, x).k === Yt[i]).length / Xt.length, lin = confusion(train(0, 3), Xt, Yt).acc;
    ok(cnnParams(n) === 1666, `params ${cnnParams(n)}`);
    ok(acc > lin + 0.02 && acc > 0.88, `CNN ${acc}, softmax ${lin}`);
  },
};
