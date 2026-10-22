import { solveKepler, period, visViva, j2Rates, position, RE } from './model.js';
import { near, ok } from '../../lib/testing.js';

const ISS = { a: RE + 420e3, e: 0.0005, i: 51.64 * Math.PI / 180, raan: 0.3, argp: 0.7 };
export const tests = {
  'Kepler equation solved to 1e-14 even at e = 0.95'() {
    for (const e of [0, 0.3, 0.74, 0.95]) for (const M of [0.01, 1, 3, 6]) { const E = solveKepler(M, e); ok(Math.abs(E - e * Math.sin(E) - M) < 1e-12, `e=${e}, M=${M}`); }
  },
  "Kepler III and vis-viva: the orbit closes after T; speed from finite differences = √(μ(2/r − 1/a))"() {
    const o = { ...ISS, e: 0.3, a: 2 * RE }, T = period(o.a), p0 = position(o, 0), p1 = position(o, T);
    ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) < 1e-3, 'closes');
    const t = 1234, h = 1e-3, a = position(o, t - h), b = position(o, t + h), v = Math.hypot(...b.map((x, k) => (x - a[k]) / (2 * h)));
    near(v, visViva(Math.hypot(...position(o, t)), o.a), 1e-7, 'vis-viva');
    near(period(42164e3), 86164, 1e-3, 'geostationary period = sidereal day');
  },
  'J2: a 98° orbit at 800 km precesses ≈ +0.986°/day (sun-synchronous); ISS ≈ −5°/day'() {
    const deg = (r) => r * 86400 * 180 / Math.PI;
    near(deg(j2Rates(RE + 800e3, 0, 98.6 * Math.PI / 180).dOmega), 0.9856, 0.02, 'SSO');
    const iss = deg(j2Rates(ISS.a, ISS.e, ISS.i).dOmega); ok(iss < -4.8 && iss > -5.2, `ISS ${iss}`);
    near(j2Rates(RE + 800e3, 0, Math.acos(Math.sqrt(1 / 5))).domega + 1, 1, 1e-9, 'critical inclination: ω frozen');
  },
};
