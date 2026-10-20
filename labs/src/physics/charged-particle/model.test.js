import { boris, gyro, larmor, drift, SPECIES } from './model.js';
import { near, ok } from '../../lib/testing.js';

const P = SPECIES.proton, B = [0, 0, 1e-3];
export const tests = {
  'pure B: kinetic energy conserved to round-off; period 2π/ω_c; radius m·v/(qB)'() {
    const w = gyro(P.q, P.m, 1e-3), T = 2 * Math.PI / w, v0 = [1e4, 0, 0];
    const r = boris({ ...P, E: [0, 0, 0], B, v0, dt: T / 400, steps: 4000 });
    let worst = 0; for (const v of r.v) worst = Math.max(worst, Math.abs(Math.hypot(...v) - 1e4) / 1e4);
    ok(worst < 1e-12, `energy drift ${worst}`);
    const xs = r.x.slice(0, 401).map((p) => p[1]), diam = Math.max(...xs) - Math.min(...xs);
    near(diam / 2, larmor(P.m, 1e4, P.q, 1e-3), 1e-3, 'Larmor radius');
    const back = Math.hypot(r.x[400][0], r.x[400][1]);
    ok(back < 1e-3 * larmor(P.m, 1e4, P.q, 1e-3), `back to start after one period: off by ${back} m`);
    return `|v| drift ${worst.toExponential(1)}`;
  },
  'crossed E and B: guiding centre drifts at E×B/B², the same way for either sign'() {
    const E = [50, 0, 0], vd = drift(E, B), T = 2 * Math.PI / gyro(P.q, P.m, 1e-3), steps = 4000;
    for (const sign of [1, -1]) {
      const r = boris({ q: sign * P.q, m: P.m, E, B, v0: [0, 0, 0], dt: T / 400, steps });
      const vy = r.x[steps][1] / (steps * T / 400);
      near(vy, vd[1], 2e-3, `drift (q ${sign > 0 ? '+' : '−'})`);
    }
    ok(vd[1] < 0, 'E along x, B along z: drift along −y');
  },
};
