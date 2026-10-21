import { SIGS, grid, convAt, conv } from './model.js';
import { fft } from '../../lib/dsp.js';
import { near, ok } from '../../lib/testing.js';

const tau = grid(6, 0.002);
export const tests = {
  'rect * rect is a triangle of base 2'() { for (const t of [-1.2, -0.5, 0, 0.3, 0.9]) near(convAt(SIGS.rect.f, SIGS.rect.f, t, tau) + 1, Math.max(0, 1 - Math.abs(t)) + 1, 2e-3, `t=${t}`); },
  'Gaussian * Gaussian: variances add'() {
    const ys = tau.map((t) => convAt(SIGS.gauss.f, SIGS.gauss.f, t, grid(3, 0.01))), m = Math.max(...ys);
    let v = 0, s = 0; tau.forEach((t, i) => { v += t * t * ys[i]; s += ys[i]; }); near(Math.sqrt(v / s), Math.sqrt(2) * 0.3, 1e-3, 'σ√2'); ok(m > 0, 'peak');
  },
  'rect * exp: charging curve (1 − e^{−at})/a inside the window'() { const a = 1.5, t = 0.2; near(convAt(SIGS.rect.f, SIGS.exp.f, t, tau), (1 - Math.exp(-a * (t + 0.5))) / a, 3e-3, 'charge'); },
  'discrete convolution equals multiplying DFTs'() {
    const x = [1, 2, 0, -1, 3], h = [1, 0.5, 0.25], y = conv(x, h), N = 8, a = Float64Array.from({ length: N }, (_, i) => x[i] ?? 0), ai = new Float64Array(N), b = Float64Array.from({ length: N }, (_, i) => h[i] ?? 0), bi = new Float64Array(N);
    fft(a, ai); fft(b, bi); const r = new Float64Array(N), im = new Float64Array(N); for (let k = 0; k < N; k++) { r[k] = a[k] * b[k] - ai[k] * bi[k]; im[k] = a[k] * bi[k] + ai[k] * b[k]; } fft(r, im, true);
    for (let n = 0; n < y.length; n++) near(r[n] + 10, y[n] + 10, 1e-9, `n=${n}`);
  },
};
