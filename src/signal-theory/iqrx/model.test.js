import { FS, N, pulse, mix, lpf, spectrum, bins } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'a real pulse has mirror lobes at ±fc'() { const S = spectrum(pulse(600, 0.05)), pk = (f0) => S.a[S.f.findIndex((f) => Math.abs(f - f0) < 0.6)]; near(pk(600), pk(-600), 1e-9, 'mirror'); ok(pk(0) < 1e-6 * pk(600), 'nothing at DC'); },
  'mixing at fLO = fc and low-pass gives the envelope on I, zero on Q'() { const x = pulse(600, 0.05), z = lpf(mix(x, 600), 150); for (const i of [N / 2, N / 2 + 200]) { const t = i / FS - 0.5; near(z.re[i], Math.exp(-t * t / (2 * 0.0025)), 1e-3, 'I = envelope'); ok(Math.abs(z.im[i]) < 1e-3, 'Q = 0'); } },
  'a residual Δf rotates the baseband phasor at Δf'() { const z = lpf(mix(pulse(610, 0.1), 600), 150), S = spectrum(z), k = S.a.indexOf(Math.max(...S.a)); near(S.f[k], 10, 1, 'peak at +10 Hz'); },
  'integer-bin tone: one bin; half-bin: leakage'() { const a = bins(30, 100, 1000), b = bins(35, 100, 1000); near(a.mag[3], 1, 1e-9, 'bin 3'); ok(a.mag.filter((v) => v > 1e-9).length === 1, 'single bin'); ok(Math.max(...b.mag) < 0.7, `half-bin peak ${Math.max(...b.mag)}`); },
};
