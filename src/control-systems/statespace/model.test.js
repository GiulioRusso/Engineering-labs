import { plant, eig2, simulate, place, observerGain, kalmanGain, estimate, noiseModel } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'eigenvalues of A are the roots of m s² + c s + k; the free response decays at their real part'() {
    const m = 2, k = 8, c = 1.2, { A, B } = plant(m, k, c), e = eig2(A), s = e[0];
    ok(Math.abs(m * (s[0] ** 2 - s[1] ** 2) + c * s[0] + k) < 1e-12, 're'); ok(Math.abs(2 * m * s[0] * s[1] + c * s[1]) < 1e-12, 'im');
    const R = simulate(A, B, [1, 0], () => 0, 10), E = (x) => 0.5 * k * x[0] ** 2 + 0.5 * m * x[1] ** 2; ok(E(R.X.at(-1)) < E(R.X[0]) * Math.exp(2 * s[0] * 10) * 3, 'decay');
    const U = simulate(...Object.values(plant(1, 4, 0)).slice(0, 2), [1, 0], () => 0, 10); near(0.5 * 4 * U.X.at(-1)[0] ** 2 + 0.5 * U.X.at(-1)[1] ** 2, 2, 1e-6, 'undamped: energy kept');
  },
  'pole placement puts the eigenvalues of A − BK at ωn, ζ; N makes the output settle at r'() {
    const m = 1.5, k = 2, c = 0.1, { A, B } = plant(m, k, c), { K, N } = place(m, k, c, 3, 0.7), Acl = A.map((row, i) => row.map((v, j) => v - B[i] * K[j])), e = eig2(Acl);
    near(e[0][0], -0.7 * 3, 1e-12, 'σ'); near(Math.abs(e[0][1]), 3 * Math.sqrt(1 - 0.49), 1e-12, 'ω');
    const R = simulate(A, B, [0, 0], (t, x) => -K[0] * x[0] - K[1] * x[1] + N * 1, 12); near(R.X.at(-1)[0], 1, 1e-4, 'r = 1');
  },
  'observer: A − LC has the chosen poles; the estimate converges; Kalman gain solves the Riccati equation'() {
    const { A } = plant(1, 4, 0.4), L = observerGain(A, 6, 0.8), Ao = [[A[0][0] - L[0], A[0][1]], [A[1][0] - L[1], A[1][1]]], e = eig2(Ao);
    near(e[0][0], -0.8 * 6, 1e-9, 'σ'); near(Math.abs(e[0][1]), 6 * 0.6, 1e-9, 'ω');
    const R = estimate(1, 4, 0.4, L, 0, 6), last = R.x.length - 1; ok(Math.abs(R.xh[last][1] - R.x[last][1]) < 1e-3, 'noise-free estimate converges');
    const K = kalmanGain(A, 1, 0.01), K2 = kalmanGain(A, 1, 0.1); ok(K.L[0] > 0 && K.L[1] > 0, 'gains'); ok(K2.L[0] < K.L[0], 'noisier measurement: smaller gain');
    const D = estimate(1, 4, 0.4, [0, 0], 0.02, 10, 3, 1), rms = (L) => { const R = estimate(1, 4, 0.4, L, 0.02, 10, 3, 1); return Math.sqrt(R.x.slice(400).reduce((s, x, i) => s + (R.xh[i + 400][1] - x[1]) ** 2, 0) / (R.x.length - 400)); };
    const kq = noiseModel(1, 1), best = rms(kalmanGain(A, kq, 0.02).L); ok(D.w.some((w) => Math.abs(w) > 0.5), 'disturbance present');
    for (const f of [0.001, 1000]) ok(best < rms(kalmanGain(A, kq * f, 0.02).L), `matched Kalman beats q × ${f}`);
  },
};
