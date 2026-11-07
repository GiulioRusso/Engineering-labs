import { SYSTEMS, tinyA, eliminate, matvec, matmul, iterate, rhoJacobi, rhoGS, solve2, sv2, rowsAt } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'elimination solves Ax = b, and L·U = P·A'() {
    for (const k of ['basic', 'zero']) {
      const { A, b } = SYSTEMS[k], R = eliminate(A, b, true), r = matvec(A, R.x); r.forEach((v, i) => near(v, b[i], 1e-12, `${k} Ax = b`));
      const last = R.steps.filter((s) => s.kind !== 'back').at(-1), U = last.M.map((row) => row.slice(0, 3)), PA = last.perm.map((p) => A[p]), LU = matmul(last.L, U);
      LU.forEach((row, i) => row.forEach((v, j) => near(v, PA[i][j], 1e-12, `${k} LU`)));
    }
    near(eliminate(SYSTEMS.basic.A, SYSTEMS.basic.b).x[0], 2, 1e-12, 'x = (2, 3, −1)');
  },
  'a zero pivot stops plain elimination; a tiny one ruins it, pivoting saves it'() {
    ok(eliminate(SYSTEMS.zero.A, SYSTEMS.zero.b, false).x.every(Number.isNaN), 'zero pivot');
    const A = tinyA(1e-16), b = SYSTEMS.tiny.b, good = eliminate(A, b, true).x, bad = eliminate(A, b, false).x, res = (x) => Math.max(...matvec(A, x).map((v, i) => Math.abs(v - b[i])));
    ok(res(good) < 1e-12, `pivoted residual ${res(good)}`); ok(res(bad) > 0.1, `unpivoted residual ${res(bad)}`);
  },
  'Jacobi and Gauss–Seidel converge at their spectral radius; Gauss–Seidel is the square of Jacobi (2 × 2)'() {
    const A = [[3, 1], [1, 2]], b = [5, 5], x = solve2(A, b), e = (X) => Math.hypot(X[0] - x[0], X[1] - x[1]);
    for (const [m, rho] of [['jacobi', rhoJacobi(A)], ['gs', rhoGS(A)]]) { const X = iterate(A, b, [0, 0], 40, m); near(e(X[12]) / e(X[10]), rho * rho, 1e-6, m); ok(e(X[40]) < 1e-6, `${m} converged`); }
    near(rhoGS(A), rhoJacobi(A) ** 2, 1e-15, 'square');
    ok(e(iterate([[1, 2], [2, 1]], b, [0, 0], 20, 'jacobi')[20]) > 1e3, 'ρ > 1 diverges');
  },
  'condition number: a perturbation of b moves x by at most κ times as much (relative)'() {
    for (const th of [1.2, 0.3, 0.05]) {
      const A = rowsAt(th), { cond } = sv2(A), b = [1, 1], x = solve2(A, b);
      for (let k = 0; k < 16; k++) { const a = 2 * Math.PI * k / 16, db = [1e-6 * Math.cos(a), 1e-6 * Math.sin(a)], y = solve2(A, [b[0] + db[0], b[1] + db[1]]);
        ok(Math.hypot(y[0] - x[0], y[1] - x[1]) / Math.hypot(...x) <= cond * Math.hypot(...db) / Math.hypot(...b) * (1 + 1e-9), `bound θ = ${th}`); }
    }
    near(sv2([[2, 0], [0, 0.5]]).cond, 4, 1e-12, 'diagonal');
  },
};
