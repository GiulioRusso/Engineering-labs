import { det, eigenvalues, eigenvector, apply, cross, dot } from './model.js';
import { near, ok } from '../../lib/testing.js';

const M = (r) => [[r[0], r[3], r[6]], [r[1], r[4], r[7]], [r[2], r[5], r[8]]]; // rows → columns
export const tests = {
  'det = triple product = volume; product rule det(AB) via known cases'() {
    near(det(M([2, 0, 0, 0, 3, 0, 0, 0, 0.5])), 3, 1e-14, 'diagonal');
    near(det(M([1, 2, 0, 0, 1, 0, 0, 0, 1])), 1, 1e-14, 'shear keeps volume');
    near(det(M([1, 0, 0, 0, 1, 0, 0, 0, 0])) + 1, 1, 1e-14, 'projection: volume 0');
  },
  'eigenpairs satisfy A v = λ v (general matrix)'() {
    const C = M([2, 1, 0, 1, 3, 1, 0, 1, 4]);
    let n = 0;
    for (const { re, im } of eigenvalues(C)) if (Math.abs(im) < 1e-12) {
      const v = eigenvector(C, re), Av = apply(C, v);
      for (let i = 0; i < 3; i++) near(Av[i] + 5, re * v[i] + 5, 1e-9, `λ=${re}`);
      n++;
    }
    ok(n === 3, 'symmetric matrix: three real eigenvalues');
    near(eigenvalues(C).reduce((a, e) => a + e.re, 0), 9, 1e-12, 'Σλ = trace');
  },
  'a rotation has one real eigenvalue (1, the axis) and a complex pair on the unit circle'() {
    const a = 0.7, C = M([Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1]);
    near(det(C), 1, 1e-14, 'det');
    const E = eigenvalues(C), real = E.filter((e) => Math.abs(e.im) < 1e-9), cx = E.filter((e) => Math.abs(e.im) > 1e-9);
    ok(real.length === 1 && cx.length === 2, 'one real');
    near(real[0].re, 1, 1e-12, 'λ = 1'); near(Math.hypot(cx[0].re, cx[0].im), 1, 1e-12, '|λ| = 1');
    const v = eigenvector(C, 1); near(Math.abs(v[2]), 1, 1e-12, 'axis is z');
    near(dot(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]), 1, 0, 'triple product');
  },
};
