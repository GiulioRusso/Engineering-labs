import { airfoil, drag, polarSpeeds, groundRoll, longitudinal, PLANE } from './model.js';
import { near, ok } from '../../lib/testing.js';

const R = Math.PI / 180;
export const tests = {
  'Joukowski: C_L ≈ 2π(1 + t)(α + β) and smooth flow off the trailing edge'() {
    for (const [t, f, a] of [[0.1, 0, 5], [0.1, 0.06, 5], [0.05, 0.1, -3]]) { const A = airfoil(t, f, a * R); near(A.CL * A.chord / 4, 2 * Math.PI * A.R * Math.sin(a * R + A.beta), 1e-9, 'closed form'); ok(A.surf.slice(1, 5).every((p) => p.v < 2), 'finite speed at the trailing edge'); }
    near(airfoil(0.1, 0, 0).CL, 0, 1e-12, 'symmetric'); ok(airfoil(0.1, 0.1, 0).CL > 0.5, 'camber lifts');
  },
  'least drag where friction and induced drag are equal'() { const S = polarSpeeds(PLANE, 1000), D = drag(PLANE, S.Vmd, 1000); near(D.Dp, D.Di, 1e-9, 'equal'); ok(drag(PLANE, S.Vmd * 1.05, 1000).D > D.D && drag(PLANE, S.Vmd * 0.95, 1000).D > D.D, 'minimum'); near(PLANE.m * 9.80665 / D.D, S.LDmax, 1e-9, 'L/D'); },
  'ground roll grows about as W²'() { const o = { h: 0, wind: 0, surf: 'dry' }, a = groundRoll('takeoff', { ...o, m: 900 }).x, b = groundRoll('takeoff', { ...o, m: 1100 }).x; near(Math.log(b / a) / Math.log(1100 / 900), 2, 0.15, 'exponent'); },
  'Cmα = 0 at the neutral point'() { const L = longitudinal(0.3, 0.5, 0); near(longitudinal(L.hn, 0.5, 0).Cma + 1, 1, 1e-12, 'zero'); ok(L.Cma < 0 && longitudinal(L.hn + 0.05, 0.5, 0).Cma > 0, 'sign'); near(L.Cm(L.aTrim), 0, 1e-9, 'trim'); },
};
