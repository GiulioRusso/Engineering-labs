import { hohmann, bielliptic, propellant, G0 } from './model.js';
import { MU, RE } from '../orbits/model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'LEO (300 km) to GEO by Hohmann: about 3.9 km/s, 5.3 hours'() {
    const h = hohmann(RE + 300e3, 42164e3);
    near(h.total, 3893, 5e-3, 'Δv'); near(h.tof / 3600, 5.27, 5e-3, 'time of flight');
    near(h.dv[0], Math.sqrt(MU / (RE + 300e3)) * (Math.sqrt(2 * 42164e3 / (RE + 300e3 + 42164e3)) - 1), 1e-12, 'first burn formula');
  },
  'bi-elliptic beats Hohmann only beyond r2/r1 ≈ 11.94 (with a very distant intermediate apoapsis)'() {
    const r1 = 7e6, test = (ratio) => bielliptic(r1, ratio * r1, 1e5 * r1).total < hohmann(r1, ratio * r1).total;
    ok(!test(11.8) && test(12.1), 'crossover between 11.8 and 12.1');
    let lo = 10, hi = 14; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; test(m) ? (hi = m) : (lo = m); }
    near(lo, 11.94, 2e-3, 'crossover'); // the rb → ∞ limit is 11.9388
    return `crossover at r2/r1 = ${lo.toFixed(3)}`;
  },
  'rocket equation: Δv = Isp·g0·ln(m0/mf)'() {
    const mp = propellant(4000, 320, 1000);
    near(320 * G0 * Math.log((1000 + mp) / 1000), 4000, 1e-12, 'Δv');
  },
};
