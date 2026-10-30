import { samples, makeNet, trainSteps, mse, piece } from './model.js';
import { output } from '../net/model.js';
import { rng } from '../../lib/random.js';
import { near, ok } from '../../lib/testing.js';

const fitted = (target, H, act, steps) => { const [X, Y] = samples(target), n = makeNet(H, act), st = {}; trainSteps(n, X, Y, steps, { lr: 0.02, state: st, r: rng(1) }); return { n, e: mse(n, X, Y) }; };

export const tests = {
  'the output is exactly the sum of the units’ pieces plus the output bias'() {
    const n = makeNet(6, 'relu');
    for (const x of [-0.7, 0.1, 0.9]) near(output(n, [x])[0] + 5, [0, 1, 2, 3, 4, 5].reduce((s, j) => s + piece(n, j, x), n.b[1][0]) + 5, 1e-12, `x = ${x}`);
  },
  'more units, better fit: sin 2πx with 2, 8 and 32 ReLUs'() {
    const e = [2, 8, 32].map((H) => fitted('sine', H, 'relu', 3000).e);
    ok(e[0] > 0.05 && e[1] < e[0] / 10 && e[2] < e[1] / 3, `MSE ${e.map((v) => v.toExponential(2))}`);
  },
  '|x| with three ReLUs: the fit becomes exact (it is piecewise linear)'() { const e = fitted('abs', 3, 'relu', 3000).e; ok(e < 1e-8, `MSE ${e}`); },
};
