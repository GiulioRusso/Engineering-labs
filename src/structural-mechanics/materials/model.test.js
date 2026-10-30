import { MATERIALS, stress, permanentSet, toughness, rotate, principal, eulerLoad, pinnedEigen, sigmaCr, lambdaC } from './model.js';
import { near, ok } from '../../lib/testing.js';

const MPa = 1e6;
export const tests = {
  'the initial slope is Young’s modulus'() { for (const m of Object.values(MATERIALS)) near(stress(m, 1e-6) / 1e-6, m.E, 1e-3, m.label); },
  'curve continuous at yield and peaks at the UTS'() { const m = MATERIALS.steel, ey = m.sy / m.E; near(stress(m, ey + 1e-9), m.sy, 1e-6, 'yield'); near(stress(m, m.eu), m.su, 1e-12, 'UTS'); ok(Number.isNaN(stress(m, m.ef + 0.01)), 'broken'); },
  'unloading leaves a permanent set ε − σ/E'() { const m = MATERIALS.steel; near(permanentSet(m, 0.05), 0.05 - stress(m, 0.05) / m.E, 1e-12, 'set'); ok(permanentSet(m, 0.001) === 0, 'elastic'); },
  'ductile steel absorbs far more energy than cast iron'() { ok(toughness(MATERIALS.steel) > 100 * toughness(MATERIALS.iron), 'toughness'); near(toughness(MATERIALS.steel), 105e6, 0.1, 'steel ≈ 105 MJ/m³'); },
  'rotation keeps σx + σy (an invariant)'() { const r = rotate(80, -20, 30, 0.7); near(r.sx + r.sy, 60, 1e-12, 'trace'); },
  'at the principal angle the shear vanishes'() { const P = principal(80 * MPa, -20 * MPa, 30 * MPa), r = rotate(80 * MPa, -20 * MPa, 30 * MPa, P.thp); ok(Math.abs(r.txy) < 1e-6, 'τ = 0'); near(r.sx, P.s1, 1e-12, 'σ1'); },
  'maximum shear = radius of Mohr’s circle, at 45° from principal'() { const P = principal(50, 10, 15), r = rotate(50, 10, 15, P.thp + Math.PI / 4); near(Math.abs(r.txy), P.R, 1e-12, 'τmax'); near(P.R, 25, 1e-12, 'R'); },
  'Euler load matches a finite-difference eigenvalue'() { const E = 200e9, I = 1e-6, L = 3; near(pinnedEigen(E, I, L), eulerLoad(E, I, L, 1), 1e-4, 'P_cr'); },
  'Johnson meets Euler smoothly at λc'() { const E = 200e9, sy = 250e6, lc = lambdaC(E, sy); near(sigmaCr(E, sy, lc - 1e-6), sigmaCr(E, sy, lc + 1e-6), 1e-6, 'continuous'); near(sigmaCr(E, sy, lc), sy / 2, 1e-9, 'σy/2'); },
};
