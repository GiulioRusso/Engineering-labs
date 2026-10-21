import { rawFFT, shift, estimate, crlb, monteCarlo, decimate, smoothDeriv, kde } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'fftshift puts DC in the middle'() { near(shift([0, 1, 2, 3])[2], 0, 0, 'DC'); const { mag } = rawFFT(Array.from({ length: 64 }, (_, n) => Math.cos(2 * Math.PI * 8 * n / 64))); near(mag[8], 1, 1e-9, 'amplitude 1 at bin 8'); near(mag[56], 1, 1e-9, 'mirror at N − 8'); },
  'interpolated estimate beats the bin spacing and approaches the CRLB'() {
    const fs = 1000, N = 128, r = monteCarlo(123.4, 1, 0.1, N, fs, 1024, 300), c = crlb(1 / (2 * 0.01), N, fs);
    ok(r.sdFine < 0.2 * fs / N, `fine ${r.sdFine}`); ok(r.sdFine > 0.9 * c && r.sdFine < 5 * c, `sd ${r.sdFine} vs CRLB ${c}`); near(estimate(Array.from({ length: N }, (_, n) => Math.cos(2 * Math.PI * 123.4 * n / fs)), fs, 4096).fine, 123.4, 2e-3, 'noise-free');
  },
  'decimating without a filter aliases; with a filter it does not'() {
    const x = Array.from({ length: 4000 }, (_, n) => Math.cos(2 * Math.PI * 0.3 * n)), a = decimate(x, 4, false), b = decimate(x, 4, true);
    const rms = (y) => Math.sqrt(y.slice(50, -50).reduce((s, v) => s + v * v, 0) / (y.length - 100)); ok(rms(a) > 0.6, `aliased kept ${rms(a)}`); ok(rms(b) < 0.02, `filtered ${rms(b)}`);
  },
  'smoothing derivative of a ramp is its slope; KDE finds two levels'() {
    const x = Array.from({ length: 100 }, (_, i) => 2 * i * 0.01), { d } = smoothDeriv(x, 11, 0.01); near(d[50], 2, 1e-9, 'slope');
    const v = [...Array(200).fill(1), ...Array(200).fill(3)].map((q, i) => q + 0.05 * Math.sin(i)), g = Array.from({ length: 81 }, (_, i) => i * 0.05); const { peaks } = kde(v, g, 0.1); ok(peaks.length === 2 && Math.abs(peaks[0] - 1) < 0.1 && Math.abs(peaks[1] - 3) < 0.1, `peaks ${peaks}`);
  },
};
