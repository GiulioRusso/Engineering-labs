import { det, solve2, eig2, fit } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Cramer solves; parallel lines have no solution'() { const s = solve2(1, 1, 1, -1, 3, 1); near(s[0], 2, 1e-12, 'x'); near(s[1], 1, 1e-12, 'y'); ok(solve2(1, 2, 2, 4, 1, 3) === null, 'singular'); near(det(2, 1, 1, 3), 5, 1e-12, 'det'); },
  'eigenvectors satisfy Av = λv; rotations have complex eigenvalues'() { const E = eig2(2, 1, 1, 2); E.values.forEach((l, i) => { const [x, y] = E.vectors[i]; near(2 * x + y, l * x + 1e-15, 1e-9, 'row1'); near(x + 2 * y, l * y + 1e-15, 1e-9, 'row2'); }); near(E.values[0], 3, 1e-12, 'λ1'); ok(eig2(0, -1, 1, 0).complex, 'rotation'); },
  'least squares recovers an exact line and its R² = 1'() { const f = fit([[0, 1], [1, 3], [2, 5], [3, 7]]); near(f.m, 2, 1e-12, 'm'); near(f.q, 1, 1e-12, 'q'); near(f.r2, 1, 1e-12, 'R²'); },
};
