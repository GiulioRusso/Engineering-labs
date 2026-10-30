import { dataset, fit } from './model.js';
import { ok } from '../../lib/testing.js';

export const tests = {
  'datasets: balanced classes, inside the plotting square'() {
    for (const k of ['xor', 'circles', 'spiral', 'moons']) { const P = dataset(k); ok(P.filter((p) => p[2]).length === 120, k); ok(P.every((p) => Math.abs(p[0]) < 1.6 && Math.abs(p[1]) < 1.6), `${k} in range`); }
  },
  'a single neuron cannot separate circles or XOR; one hidden layer can'() {
    for (const k of ['circles', 'xor']) {
      const lin = fit(k, []).test.acc, hid = fit(k, [4]).test.acc;
      ok(lin < 0.7 && hid > 0.95, `${k}: no hidden ${lin}, 4 hidden ${hid}`);
    }
  },
  'two spirals: a deeper ReLU network beats a single small layer'() {
    const small = fit('spiral', [3], { act: 'relu', lr: 0.01 }).test.acc, deep = fit('spiral', [8, 8], { act: 'relu', lr: 0.01, epochs: 300 }).test.acc;
    ok(deep > 0.9 && small < deep - 0.15, `[3]: ${small}, [8, 8]: ${deep}`);
  },
};
