import { dot, cross, norm, gravity, FIELDS, measure, GN } from './model.js';
import { near } from '../../lib/testing.js';

export const tests = {
  'Lagrange identity |a×b|² + (a·b)² = |a|²|b|², and a×b ⟂ a, b'() {
    const a = [1.2, -0.4, 2], b = [-0.7, 1.5, 0.3], c = cross(a, b);
    near(norm(c) ** 2 + dot(a, b) ** 2, norm(a) ** 2 * norm(b) ** 2, 1e-12, 'identity');
    near(1 + dot(c, a), 1, 1e-14, 'c·a'); near(1 + dot(c, b), 1, 1e-14, 'c·b');
  },
  'gravity: one mass gives GM/r² toward it, and g = −∇V'() {
    const M = [{ m: 5e10, x: 0, y: 0 }], [gx, gy] = gravity(M, 2, 0);
    near(gx, -GN * 5e10 / 4, 1e-12, 'GM/r²'); near(1 + gy, 1, 1e-12, 'radial');
    const two = [{ m: 3e10, x: -1, y: 0.5 }, { m: 6e10, x: 1.2, y: -0.3 }], h = 1e-5, [ax, ay] = gravity(two, 0.3, 0.8);
    near(ax, -(gravity(two, 0.3 + h, 0.8)[2] - gravity(two, 0.3 - h, 0.8)[2]) / (2 * h), 1e-6, '−∂V/∂x');
    near(ay, -(gravity(two, 0.3, 0.8 + h)[2] - gravity(two, 0.3, 0.8 - h)[2]) / (2 * h), 1e-6, '−∂V/∂y');
  },
  'flux and circulation per area → exact div and curl'() {
    for (const [k, f] of Object.entries(FIELDS)) {
      const m = measure(f.F, 0.4, -0.3, 1e-3);
      near(m.div + 5, f.div(0.4, -0.3) + 5, 1e-5, `${k} div`); near(m.curl + 5, f.curl(0.4, -0.3) + 5, 1e-5, `${k} curl`);
    }
  },
};
