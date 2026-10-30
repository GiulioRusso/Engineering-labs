import { single, arrayFactor, grating, phasors } from './model.js';
import { near, ok } from '../../lib/testing.js';

const um = 1e-6, nm = 1e-9;

export const tests = {
  'closed forms = sum of 2000 Huygens wavelets per slit'() {
    for (const th of [0.01, 0.05, 0.09, 0.2]) {
      near(phasors(th, 5 * um, 550 * nm, 2000).I + 1, single(th, 5 * um, 550 * nm) + 1, 1e-6, `single, θ = ${th}`);
      near(phasors(th, 1 * um, 550 * nm, 2000, 5, 5 * um).I + 1, grating(th, 5, 1 * um, 5 * um, 550 * nm) + 1, 1e-6, `5 slits, θ = ${th}`);
    }
  },
  'single slit: first zero at sin θ = λ/a, where the phasor chain closes into a circle'() {
    const th = Math.asin(550 / 5000);
    ok(single(th, 5 * um, 550 * nm) < 1e-20, 'zero');
    ok(single(th * 0.98, 5 * um, 550 * nm) > 1e-4, 'not zero just before');
    const P = phasors(th, 5 * um, 550 * nm, 400), end = P.pts.at(-1);
    ok(Math.hypot(...end) < 1e-9 * 400, 'chain closes');
  },
  'grating: principal maxima at d sin θ = mλ, with N − 2 weak maxima between them'() {
    for (const m of [1, 2]) near(arrayFactor(Math.asin(m * 550 / 5000), 5, 5 * um, 550 * nm), 1, 1e-9, `order ${m}`);
    for (const N of [3, 5, 8]) {
      const th1 = Math.asin(550 / 5000), f = Array.from({ length: 4001 }, (_, i) => arrayFactor(th1 * (0.001 + 0.998 * i / 4000), N, 5 * um, 550 * nm));
      let peaks = 0; for (let i = 1; i < f.length - 1; i++) if (f[i] > f[i - 1] && f[i] > f[i + 1]) peaks++;
      ok(peaks === N - 2, `N = ${N}: ${peaks} secondary maxima`);
    }
  },
};
