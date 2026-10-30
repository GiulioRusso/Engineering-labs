import { createGas, step, temperature, readPressure, idealPressure, rescaleTo, meanSpeed, maxwell } from './model.js';
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
  'speeds settle to Maxwell–Boltzmann: mean speed √(8kT/πm)'() {
    const G = createGas({ N: 4000 });
    for (let i = 0; i < 200; i++) step(G, 1e-6, 0.1, 0);
    let s = 0; for (let i = 0; i < G.N; i++) s += Math.hypot(G.v[3 * i], G.v[3 * i + 1], G.v[3 * i + 2]);
    near(s / G.N, meanSpeed(temperature(G)), 0.03, 'mean speed');
    let I = 0; for (let v = 0; v < 3000; v += 0.5) I += maxwell(v + 0.25, 300) * 0.5;
    near(I, 1, 1e-6, 'f(v) normalised');
  },
};
