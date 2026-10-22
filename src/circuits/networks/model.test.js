import { solve, series, parallel, thevenin, rlcStep, damping } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'divider: 10 V over 1 k + 1 k gives 5 V'() { near(solve(2, [[1, 2, 1000], [2, 0, 1000]], { 1: 10 }).v[2], 5, 1e-12, 'mid'); },
  'KCL: currents into a node sum to zero'() { const s = solve(2, [[1, 2, 100], [2, 0, 200], [2, 0, 300]], { 1: 12 }); near(s.I[0], s.I[1] + s.I[2], 1e-12, 'KCL'); },
  'series and parallel'() { near(series(1, 2, 3), 6, 0, 's'); near(parallel(100, 100), 50, 1e-12, 'p'); },
  'Thévenin reproduces the loaded voltage exactly'() { const { Vth, Rth } = thevenin(10, 1000, 2000), RL = 470, real = solve(2, [[1, 2, 1000], [2, 0, 2000], [2, 0, RL]], { 1: 10 }).v[2]; near(real, Vth * RL / (Rth + RL), 1e-12, 'same'); },
  'RLC step: overshoot when underdamped, none when overdamped, ends at 1'() { const p = { L: 1e-3, C: 1e-6 }; const { w0 } = damping({ ...p, R: 1 }); const ts = Array.from({ length: 400 }, (_, i) => i * 20 / w0 / 400);
    ok(Math.max(...ts.map((t) => rlcStep(t, { ...p, R: 10 }))) > 1.3, 'under'); ok(Math.max(...ts.map((t) => rlcStep(t, { ...p, R: 200 }))) <= 1 + 1e-9, 'over'); near(rlcStep(1, { ...p, R: 63.2 }), 1, 1e-6, 'final'); },
};
