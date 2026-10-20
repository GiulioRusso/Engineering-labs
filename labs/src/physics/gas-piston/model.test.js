import { createGas, step, temperature, readPressure, idealPressure, rescaleTo } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'measured pressure (momentum on the walls) = NkT/V'() {
    const G = createGas({ N: 3000 });
    for (let i = 0; i < 400; i++) step(G, 1e-6, 0.1, 0);
    readPressure(G);
    for (let i = 0; i < 3000; i++) step(G, 1e-6, 0.1, 0);
    const e = near(readPressure(G), idealPressure(G), 0.03, 'P');
    return `error ${(100 * e).toFixed(2)} % (statistical, 3000 particles)`;
  },
  'slow adiabatic compression to half the volume heats the gas by 2^(2/3)'() {
    const G = createGas({ N: 2000 }), T0 = temperature(G), dt = 1e-6, steps = 50000;
    for (let n = 0; n < steps; n++) { const u = -0.05 / (steps * dt); step(G, dt, 0.1 + u * n * dt, u); }
    const e = near(temperature(G) / T0, 2 ** (2 / 3), 0.03, 'T2/T1');
    return `T rose ×${(temperature(G) / T0).toFixed(3)}, ideal ×1.587, error ${(100 * e).toFixed(1)} %`;
  },
  'thermostat holds T while compressing (isothermal)'() {
    const G = createGas({ N: 500 });
    for (let n = 0; n < 5000; n++) { step(G, 1e-6, 0.1 - 0.05 * n / 5000, -10); rescaleTo(G, 300); }
    ok(Math.abs(temperature(G) - 300) < 1e-9, 'T held');
  },
};
