import { resultant, torque, draft, pressure, bob, G, P0 } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'resultant is the vector sum; three balanced forces give zero'() {
    const R = resultant([[3, 0], [-1.5, 2.598], [-1.5, -2.598]]);
    near(1 + R[0], 1, 1e-12, 'x'); near(1 + R[1], 1, 1e-12, 'y');
  },
  'torque = r·F·sin(angle): zero along the bar, maximum at right angles'() {
    near(torque(0.5, 10, Math.PI / 2), 5, 1e-12, 'perpendicular'); near(1 + torque(0.5, 10, 0), 1, 1e-12, 'along the bar');
  },
  'floating block sinks to depth s·ρ_b/ρ_f; the bobbing settles there'() {
    near(draft(0.2, 600, 1000), 0.12, 1e-12, 'wood in water'); near(draft(0.2, 2000, 1000), 0.2, 1e-12, 'denser: sinks');
    const b = bob({ s: 0.2, rb: 600, rf: 1000, tEnd: 8 });
    near(b.z[b.z.length - 1], 0.12, 1e-3, 'settles at the draft');
  },
  'hydrostatic pressure grows by ρ·g per metre'() {
    near(pressure(10, 1000) - P0, 1000 * G * 10, 1e-12, '10 m of water ≈ 1 atm');
    ok(pressure(10, 1000) > 1.9 * P0, 'about 2 atm at 10 m');
  },
};
