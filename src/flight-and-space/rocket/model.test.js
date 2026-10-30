import { deltaV, burn, staging, maxDv, ascent, ROCKET, G0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Tsiolkovsky: Δv = Isp g₀ ln R, and the burn in empty space reaches it'() {
    near(deltaV(300, Math.E), 300 * G0, 1e-12, 'R = e gives one exhaust speed');
    near(burn(320, 0.9, 150, 150).v, deltaV(320, 10), 1e-12, 'end of the burn');
    const h = 1e-3; let v = 0; for (let t = 0; t < 150; t += h) v += h * burn(320, 0.9, 150, t + h / 2).a; near(v, deltaV(320, 10), 1e-6, 'integrated acceleration');
  },
  'staging: the stages multiply up to the required Δv; more stages carry more payload'() {
    for (const n of [1, 2, 3]) { const s = staging(n, 0.1, 330, 8000); if (!s.stages.length) continue; let dv = 0; for (const st of s.stages) dv += deltaV(330, (st.below + st.struct + st.prop) / (st.below + st.struct)); near(dv, 8000, 1e-9, `${n} stages`); }
    ok(staging(1, 0.1, 330, 9400).payload === 0, 'one stage cannot reach orbit'); ok(staging(3, 0.1, 330, 9400).payload > staging(2, 0.1, 330, 9400).payload, '3 beats 2');
    near(maxDv(0.1, 330), 330 * G0 * Math.log(10), 1e-12, 'empty-stage limit');
  },
  'ascent: speed at burnout = ideal Δv − gravity loss − drag loss'() {
    for (const [TW, kick] of [[1.5, 2], [3, 14]]) {
      const { bo } = ascent({ TW, kick }, ROCKET, { dt: 0.02, coast: 0 });
      near(bo.ideal, deltaV(ROCKET.isp, 1 / (1 - ROCKET.zeta)), 1e-6, 'ideal');
      near(bo.v, bo.ideal - bo.grav - bo.drag, 2e-4, `T/W ${TW}`);
    }
    ok(ascent({ TW: 1.3, kick: 0 }).bo.grav > ascent({ TW: 2.5, kick: 0 }).bo.grav, 'slower climb, more gravity loss');
  },
};
