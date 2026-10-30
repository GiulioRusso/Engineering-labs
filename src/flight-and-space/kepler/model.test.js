import { onOrbit, meanAnomaly, sectorAreas, periodYears, PLANETS, cannon, RE, MU } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'second law: equal times sweep equal areas, each πab/n'() {
    for (const e of [0, 0.3, 0.8]) { const A = sectorAreas(1.5, e, 8), ab = Math.PI * 1.5 * 1.5 * Math.sqrt(1 - e * e) / 8; A.forEach((x, k) => near(x, ab, 1e-6, `e ${e}, slice ${k}`)); }
  },
  'mean anomaly inverts the position, and the speed obeys vis-viva at the apsides'() {
    for (const M of [0.3, 2, 4.5]) near(meanAnomaly(onOrbit(1, 0.6, M).nu, 0.6), M, 1e-10, `M ${M}`);
    const p = onOrbit(2, 0.5, 0), q = onOrbit(2, 0.5, Math.PI); near(p.v * p.r, q.v * q.r, 1e-12, 'r v equal at both apsides (angular momentum)');
  },
  'third law: the planets’ T²/a³ = 1 yr²/AU³'() {
    near(periodYears(1), 1, 1e-12, 'Earth'); near(periodYears(1, 4), 0.5, 1e-12, 'four times the mass, half the period');
    for (const P of PLANETS) near(P.T ** 2 / P.a ** 3, 1, 5e-3, P.name);
  },
  'cannon: circular at √(μ/r), escape at √2 times that; agrees with a direct integration'() {
    const r0 = RE + 400e3, vc = Math.sqrt(MU / r0);
    ok(cannon(r0, vc).e < 1e-9 && cannon(r0, vc).kind === 'circular orbit', 'circular');
    ok(cannon(r0, vc * Math.SQRT2 * 1.01).kind.startsWith('hyperbola'), 'escapes'); ok(cannon(r0, 6000).kind === 'falls back', 'falls back');
    const c = cannon(r0, 8800); let [x, y, vx, vy] = [r0, 0, 0, 8800], rmax = 0; const f = (s) => { const r3 = Math.hypot(s[0], s[1]) ** 3; return [s[2], s[3], -MU * s[0] / r3, -MU * s[1] / r3]; };
    for (let i = 0; i < 60000; i++) { const s = [x, y, vx, vy], h = 1, k1 = f(s), k2 = f(s.map((v, j) => v + h / 2 * k1[j])), k3 = f(s.map((v, j) => v + h / 2 * k2[j])), k4 = f(s.map((v, j) => v + h * k3[j])); [x, y, vx, vy] = s.map((v, j) => v + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); rmax = Math.max(rmax, Math.hypot(x, y)); }
    near(rmax, c.ra, 1e-6, 'apoapsis from RK4');
  },
};
