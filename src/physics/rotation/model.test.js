import { SHAPES, inertia, rollAccel, rollTime, spoolAccel, skaterI, G } from './model.js';
import { near, ok } from '../../lib/testing.js';

const deg = Math.PI / 180;

export const tests = {
  'rolling accelerations: sphere 5/7, disc 2/3, hollow sphere 3/5, hoop 1/2 of g sin θ'() {
    const want = { sphere: 5 / 7, disc: 2 / 3, shell: 3 / 5, hoop: 1 / 2 };
    for (const [k, f] of Object.entries(want)) near(rollAccel(k, 30 * deg), f * G * 0.5, 1e-12, k);
  },
  'energy at the bottom: Mgh = ½Mv² + ½Iω², with v² = 2aL and ω = v/R'() {
    const M = 3, R = 0.2, L = 4, th = 25 * deg;
    for (const k of Object.keys(SHAPES)) {
      const v2 = 2 * rollAccel(k, th) * L;
      near(0.5 * M * v2 + 0.5 * inertia(k, M, R) * v2 / (R * R), M * G * L * Math.sin(th), 1e-12, k);
    }
  },
  'the race: sphere, disc, hollow sphere, hoop — whatever the mass or size'() {
    const t = Object.keys(SHAPES).map((k) => rollTime(k, 20 * deg, 4));
    ok(t[0] < t[1] && t[1] < t[2] && t[2] < t[3], `times ${t.map((x) => x.toFixed(3))}`);
  },
  'spool: a = mg/(m + Ms/2), and energy mgh = ½mv² + ½Iω²'() {
    const m = 0.5, Ms = 2, R = 0.2, a = spoolAccel(m, Ms, R), h = 1, v2 = 2 * a * h;
    near(a, m * G / (m + Ms / 2), 1e-12, 'a');
    near(0.5 * m * v2 + 0.5 * inertia('disc', Ms, R) * v2 / (R * R), m * G * h, 1e-12, 'energy');
    near(spoolAccel(m, 1e-12, R), G, 1e-9, 'massless spool: free fall');
  },
  'skater: ω grows as I1/I2 and the kinetic energy by the same factor'() {
    const I1 = skaterI(1, 2, 0.8), I2 = skaterI(1, 2, 0.25), L = I1 * 2, w2 = L / I2;
    near(w2 / 2, I1 / I2, 1e-12, 'ω ratio');
    near((0.5 * I2 * w2 * w2) / (0.5 * I1 * 4), I1 / I2, 1e-12, 'KE ratio');
  },
};
