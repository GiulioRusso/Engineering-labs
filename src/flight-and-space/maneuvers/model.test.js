import { hohmannN, biN, total, biLimit, crossover, transferPlane, bestSplit, cw, rendezvousV, meanMotion, interplanetary, PLANETS, RE } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'bi-elliptic crossovers: 11.94 (r_b → ∞) and 15.58 (any r_b)'() { near(crossover((R) => total(hohmannN(R)) - biLimit(R)), 11.9388, 1e-4, '∞'); near(crossover((R) => total(hohmannN(R)) - total(biN(R, R * 1.000001))), 15.5817, 1e-3, 'r_b = r₂'); near(total(biN(15, 1e9)), biLimit(15), 1e-3, 'limit'); },
  'plane change: best split beats both ends, cheaper at apoapsis'() { const r1 = RE + 300e3, r2 = 42164e3, di = 28.5 * Math.PI / 180, B = bestSplit(r1, r2, di); ok(B.total < transferPlane(r1, r2, di, 0).total && B.total < transferPlane(r1, r2, di, 1).total, 'best'); ok(B.s < 0.2, 'mostly at apoapsis'); },
  'Clohessy–Wiltshire: a prograde burn falls behind by 6π Δv/n per orbit; a radial burn closes'() {
    const n = meanMotion(420e3), P = 2 * Math.PI / n, a = cw([0, 0, 0, 1], n, P), b = cw([0, 0, 1, 0], n, P);
    near(a[1], -6 * Math.PI / n, 1e-9, 'drift'); ok(Math.abs(b[0]) < 1e-9 && Math.abs(b[1]) < 1e-9, 'closed');
    const s = [100, -5000, 0, 0], h = 0.1; const d = cw(s, n, h); near((d[0] - s[0]) / h, cw(s, n, h / 2)[2], 1e-3, 'velocity consistent');
  },
  'two-impulse rendezvous reaches the target'() { const n = meanMotion(420e3); for (const T of [0.2, 0.5, 0.9]) { const v = rendezvousV(-2000, -10000, n, T * 2 * Math.PI / n), e = cw([-2000, -10000, ...v], n, T * 2 * Math.PI / n); ok(Math.hypot(e[0], e[1]) < 1e-6, `T = ${T}`); } },
  'Earth → Mars: v∞ 2.94 km/s, Δv 3.6 km/s from 200 km, 259 days'() { const I = interplanetary(PLANETS.mars.a, 200e3); near(I.vinf, 2945, 0.01, 'v∞'); near(I.dv, 3610, 0.01, 'Δv'); near(I.tof / 86400, 259, 0.01, 'days'); },
};
