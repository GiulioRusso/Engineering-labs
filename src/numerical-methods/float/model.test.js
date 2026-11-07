import { EPS64, EXPR, relErr, sums, ulp } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'machine epsilon: 1 + ε/2 rounds to 1, 1 + ε does not; ulp(1) = ε'() {
    ok(1 + EPS64 / 2 === 1, 'half'); ok(1 + EPS64 > 1, 'eps'); near(ulp(1), EPS64, 0, 'ulp'); near(ulp(1024), 1024 * EPS64, 0, 'ulp 1024');
  },
  'cancellation: the naive forms lose digits where the stable forms keep them, and agree far from trouble'() {
    ok(relErr(EXPR.cos, 1e-6) > 1e-5 && relErr(EXPR.cos, 1e-8) > 0.5, `cos ${relErr(EXPR.cos, 1e-8)}`); ok(relErr(EXPR.cos, 0.5) < 1e-14, 'cos far');
    near(EXPR.cos.stable(1e-7), 0.5, 1e-12, 'limit ½');
    ok(relErr(EXPR.sqrt, 1e7) > 1e-3, 'sqrt'); near(EXPR.sqrt.stable(1e8) * 2e8, 1, 1e-9, '≈ 1/(2x)');
    ok(relErr(EXPR.quad, 1e7) > 1e-3, 'quad'); near(EXPR.quad.stable(1e8) * 1e8, -1, 1e-9, '≈ −1/b');
    const r = EXPR.quad.stable(50); near(r * r + 50 * r + 1, 0, 1e-12, 'is a root');
  },
  'float32 sum of 1/k²: backward and Kahan beat forward'() {
    const s = sums(1e6), e = (v) => Math.abs(v - s.exact);
    ok(e(s.backward) < e(s.forward), 'backward'); ok(e(s.kahan) < e(s.forward), 'kahan'); ok(e(s.kahan) < 2e-7, `kahan ${e(s.kahan)}`);
  },
};
