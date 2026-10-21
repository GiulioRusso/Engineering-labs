import { bn, partialSum, dft, fft, spectrum, aliasOf, wave, WAVES } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Fourier coefficients match numerical integration'() {
    for (const kind of ['square', 'saw', 'triangle']) for (const n of [1, 2, 3, 5]) {
      let s = 0; const M = 20000; for (let i = 0; i < M; i++) { const u = (i + 0.5) / M; s += WAVES[kind].f(u) * Math.sin(2 * Math.PI * n * u); }
      ok(Math.abs(2 * s / M - bn(kind, n)) < 1e-4, `${kind} b${n}`);
    }
  },
  'Gibbs: the square-wave partial sum overshoots by about 9 %'() {
    let m = 0; for (let i = 0; i < 4000; i++) m = Math.max(m, partialSum('square', 199, i / 8000));
    near(m, 1 + 2 * 0.08949, 2e-3, 'peak: 9 % of the jump (2)');
  },
  'DFT equals FFT; Parseval holds'() {
    const x = Array.from({ length: 64 }, (_, n) => Math.sin(n * 0.7) + 0.3 * Math.cos(n * 2.1));
    const A = dft(x), B = fft(x); let e = 0; for (let k = 0; k < 64; k++) e = Math.max(e, Math.abs(A.re[k] - B.re[k]) + Math.abs(A.im[k] - B.im[k]));
    ok(e < 1e-10, `max diff ${e}`);
    const Et = x.reduce((a, v) => a + v * v, 0), Ef = A.re.reduce((a, r, k) => a + r * r + A.im[k] ** 2, 0) / 64; near(Ef, Et, 1e-12, 'Parseval');
  },
  'a bin-centred sine reads its amplitude; aliasing folds into [0, fs/2]'() {
    const N = 128, x = Array.from({ length: N }, (_, n) => 0.7 * Math.sin(2 * Math.PI * 10 * n / N));
    near(spectrum(x)[10], 0.7, 1e-12, 'amplitude');
    near(aliasOf(70, 100), 30, 1e-12, '70 Hz at 100 Hz'); near(aliasOf(95, 100), 5, 1e-12, '95 Hz');
    const fs = 100; for (let n = 0; n < 20; n++) near(1 + wave('sine', n / fs, 70), 1 + wave('sine', n / fs, -30), 1e-9, 'samples identical');
  },
};
