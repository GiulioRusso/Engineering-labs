import { twoTones, wind, dftDirect, butterflies, bitReverse } from './model.js';
import { fft } from '../../lib/dsp.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'N × centre of mass of the winding is the DFT bin'() {
    const x = twoTones(48, 6, 17), D = dftDirect(x);
    for (const k of [0, 6, 7, 17]) { const { com } = wind(x, k); near(48 * com[0] + 1e-9, D.re[k] + 1e-9, 1e-6, `re ${k}`); near(48 * com[1] + 1e-9, D.im[k] + 1e-9, 1e-6, `im ${k}`); }
  },
  'winding at a tone gives N/2 × its amplitude; elsewhere zero'() {
    const x = twoTones(48, 6, 17, 0.6); near(Math.hypot(...wind(x, 6).com) * 48, 24, 1e-9, 'bin 6'); near(Math.hypot(...wind(x, 17).com) * 48, 0.6 * 24, 1e-9, 'bin 17'); ok(Math.hypot(...wind(x, 9).com) < 1e-12, 'bin 9');
  },
  'butterfly network reproduces the DFT'() {
    const N = 16, x = twoTones(N, 3, 5), re = Array.from({ length: N }, (_, i) => x[bitReverse(i, 4)]), im = new Array(N).fill(0);
    for (const s of butterflies(N)) for (const [u, v, k] of s) { const a = -2 * Math.PI * k / N, wr = Math.cos(a), wi = Math.sin(a), tr = re[v] * wr - im[v] * wi, ti = re[v] * wi + im[v] * wr; [re[u], re[v]] = [re[u] + tr, re[u] - tr]; [im[u], im[v]] = [im[u] + ti, im[u] - ti]; }
    const D = dftDirect(x); let e = 0; for (let k = 0; k < N; k++) e = Math.max(e, Math.abs(re[k] - D.re[k]) + Math.abs(im[k] - D.im[k])); ok(e < 1e-9, `max diff ${e}`);
    const r2 = Float64Array.from(x), i2 = new Float64Array(N); fft(r2, i2); let e2 = 0; for (let k = 0; k < N; k++) e2 = Math.max(e2, Math.abs(r2[k] - D.re[k])); ok(e2 < 1e-9, 'lib fft');
  },
};
