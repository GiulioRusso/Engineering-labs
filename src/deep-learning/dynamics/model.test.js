import { probe } from './model.js';
import { ok } from '../../lib/testing.js';

const ratio = (a, b) => a / b;
export const tests = {
  'linear layers with Xavier weights keep the spread (within 25 % over 10 layers)'() {
    const p = probe({ act: 'linear', init: 'xavier' }); const s = p.stats.map((q) => q.std);
    ok(s.every((v) => v > 0.75 && v < 1.25), `std ${s.map((v) => v.toFixed(2))}`);
  },
  'ReLU with He weights keeps the scale; with Xavier it halves the variance at every layer'() {
    const he = probe({ act: 'relu', init: 'he', depth: 12 }).stats, xa = probe({ act: 'relu', init: 'xavier', depth: 12 }).stats;
    ok(ratio(he[11].std, he[1].std) > 0.6 && ratio(he[11].std, he[1].std) < 1.6, `He ${he[1].std} → ${he[11].std}`);
    ok(ratio(xa[11].std, xa[1].std) < 0.1, `Xavier ${xa[1].std} → ${xa[11].std}`);
  },
  'sigmoid stacks: gradients shrink by orders of magnitude towards the input'() {
    const g = probe({ act: 'sigmoid', init: 'xavier', depth: 10 }).grad;
    ok(g[0] / g[9] < 1e-3, `first/last ${g[0] / g[9]}`);
  },
  'tanh with tiny weights: the signal dies away; with large weights the units saturate at ±1'() {
    const small = probe({ act: 'tanh', init: 'small' }).stats, large = probe({ act: 'tanh', init: 'large' }).stats;
    ok(small[9].std < 1e-6, `small: ${small[9].std}`);
    ok(large[9].values.filter((v) => Math.abs(v) > 0.9).length / large[9].values.length > 0.5, 'large: most units past ±0.9');
  },
};
