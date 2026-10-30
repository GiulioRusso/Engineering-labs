import { START, forward, loss, backward, step, train, flat, sgd, gradNoise } from './model.js';
import { blobs } from '../neuron/model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'backpropagation matches finite differences for every parameter'() {
    const x = [0.5, -1.2], y = 1, g = flat(backward(START, x, y)), h = 1e-6, L = (p) => loss(forward(p, x).o, y);
    const nudge = (i, e) => { const p = structuredClone(START); if (i < 4) p.W[i >> 1][i & 1] += e; else if (i < 6) p.b[i - 4] += e; else if (i < 8) p.v[i - 6] += e; else p.c += e; return p; };
    g.forEach((gi, i) => near(gi, (L(nudge(i, h)) - L(nudge(i, -h))) / (2 * h), 1e-6, `parameter ${i}`));
  },
  'a small step lowers the loss; training drives p to the target'() { const x = [1, 0.5], g = backward(START, x, 0); ok(loss(forward(step(START, g, 0.1), x).o, 0) < loss(g.o, 0), 'one step'); ok(train(x, 0, 0.5, 60).at(-1).o < 0.1, 'p → 0'); },
  'an input of zero gets no gradient on its weights'() { const g = backward(START, [0, 1], 1); near(g.gW[0][0], 0, 1e-15); near(g.gW[1][0], 0, 1e-15); },
  'mini-batch noise shrinks like 1/√B; SGD still descends'() { const P = blobs(), a = gradNoise(P, [0, 0], 4), b = gradNoise(P, [0, 0], 64); near(a / b, 4, 1, 'ratio ≈ √16'); const s = sgd(P, 8, 0.5, 200); ok(s.at(-1)[2] < s[0][2] - 0.5, 'loss falls'); },
};
