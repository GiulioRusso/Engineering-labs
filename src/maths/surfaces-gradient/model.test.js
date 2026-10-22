import { SURF, tangentPlane } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'exact gradients match central differences'() {
    for (const [k, S] of Object.entries(SURF)) for (const [x, y] of [[0.3, -0.7], [1.2, 0.4], [-1.5, 1.1]]) {
      const h = 1e-5, [gx, gy] = S.g(x, y);
      near(gx + 3, (S.f(x + h, y) - S.f(x - h, y)) / (2 * h) + 3, 1e-8, `${k} ∂x`);
      near(gy + 3, (S.f(x, y + h) - S.f(x, y - h)) / (2 * h) + 3, 1e-8, `${k} ∂y`);
    }
  },
  'tangent-plane error shrinks like h² (halve h → error / 4)'() {
    for (const [k, S] of Object.entries(SURF)) {
      const T = tangentPlane(S, 0.7, -0.4), e = (h) => Math.abs(S.f(0.7 + h, -0.4 + h / 2) - T(0.7 + h, -0.4 + h / 2)); // not the diagonal: there the saddle's x² − y² cancels exactly
      const r = e(0.002) / e(0.001);
      ok(r > 3.7 && r < 4.3, `${k}: ratio ${r}`);
    }
  },
};
