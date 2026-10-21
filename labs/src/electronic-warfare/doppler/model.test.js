import { dopplerShift, exactReflected, vUnamb, apparentVelocity, apparentRange, rUnamb, fronts, dv, C0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'f_d = 2v f0 / c ≈ exact moving-mirror shift; 66.7 Hz per m/s at X-band'() {
    near(dopplerShift(1, 10e9), 66.71, 1e-3, 'X-band'); near(exactReflected(10e9, 300) - 10e9, dopplerShift(300, 10e9), 1e-5, 'two-way');
  },
  'reflected fronts are spaced by (c − u)/(c + u) of the original'() {
    const T = 1, u = 0.2, F = fronts(40, { T, X0: 30, u }), b = F.back.map((f) => f.x - f.r).sort((p, q) => p - q); // left edges
    near(b[1] - b[0], T * (1 - u) / (1 + u), 1e-9, 'compressed spacing');
  },
  'ambiguities: R_u and v_u trade through the PRF'() {
    near(vUnamb(10e3, 10e9), 74.95, 1e-3, 'v_u'); near(apparentVelocity(100, 10e3, 10e9), 100 - 2 * vUnamb(10e3, 10e9), 1e-9, 'wrap');
    near(apparentRange(20e3, 10e3), 20e3 - rUnamb(10e3), 1e-9, 'fold'); near(rUnamb(10e3) * vUnamb(10e3, 10e9), C0 * C0 / (8 * 10e9), 1e-12, 'product fixed');
    near(dv(10e3, 64, 10e9), C0 / 10e9 * 10e3 / 128, 1e-12, 'Δv');
  },
};
