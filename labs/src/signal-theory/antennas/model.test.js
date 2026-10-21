import { fspl, dipole, dipoleNorm, directivity, arrayFactor, throughPolarizer, cutoff } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Friis: 6 dB more loss per doubling of distance; FSPL at 1 km, 2.4 GHz ≈ 100 dB'() {
    near(fspl(2000, 2.4e9) - fspl(1000, 2.4e9), 20 * Math.log10(2), 1e-12, 'doubling'); near(fspl(1000, 2.4e9), 100.05, 1e-3, 'value');
  },
  'dipole directivities: short 1.5, half-wave 1.64'() {
    const D = (L) => { const m = dipoleNorm(L); return directivity((t) => dipole(L, t) / m); };
    near(D(0.01), 1.5, 2e-3, 'short dipole'); near(D(0.5), 1.641, 2e-3, 'half-wave');
  },
  'array factor: main lobe at the steering angle, first null at asin(λ/Nd)'() {
    near(arrayFactor(8, 0.5, 0.5, 0.5), 1, 1e-12, 'steered peak');
    ok(arrayFactor(8, 0.5, 0, Math.asin(1 / 4)) < 1e-9, 'first null'); near(arrayFactor(4, 1, 0, Math.PI / 2), 1, 1e-9, 'grating lobe at 90° for d = λ');
  },
  'polarization: Malus for linear, one half for circular'() {
    near(throughPolarizer(0, 0, Math.PI / 3), 0.25, 1e-9, 'cos² 60°'); near(throughPolarizer(1, Math.PI / 2, 0.7), 0.5, 1e-9, 'circular');
  },
  'WR-90 waveguide: TE10 cutoff 6.557 GHz'() { near(cutoff(1, 0, 0.02286, 0.01016), 6.557e9, 1e-3, 'fc'); },
};
