import { sequence, settleIndex } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'geometric partial sums match a(1 − rⁿ)/(1 − r)'() {
    const s = { kind: 'geometric', a: 1, r: 0.5 }, { S, limit } = sequence(s, 30);
    near(S[9], (1 - 0.5 ** 10) / 0.5, 1e-14, 'S₁₀'); near(limit, 2, 1e-15, 'sum');
    ok(sequence({ kind: 'geometric', a: 1, r: 1.1 }, 10).limit === null, '|r| ≥ 1 diverges');
  },
  'p = 2 converges to π²/6 within the tail bound 1/N'() {
    const { S, limit } = sequence({ kind: 'pseries', p: 2 }, 1000);
    ok(limit - S[999] > 0 && limit - S[999] < 1 / 1000, 'tail between 0 and 1/N');
  },
  'alternating series: error below the next term (Leibniz)'() {
    for (const kind of ['alternating', 'leibniz']) {
      const { a, S, limit } = sequence({ kind }, 101);
      ok(Math.abs(S[99] - limit) < Math.abs(a[100]), `${kind}: |S₁₀₀ − L| < |a₁₀₁|`);
    }
  },
  '(1 + 1/n)ⁿ → e, and the settle index respects ε'() {
    const { S, limit } = sequence({ kind: 'euler' }, 2000);
    near(S[1999], Math.E, 3e-4, 'n = 2000');
    const n = settleIndex(S, limit, 0.01);
    ok(Math.abs(S[n - 1] - limit) <= 0.01 && Math.abs(S[n - 2] - limit) > 0.01, 'first index inside the band');
  },
};
