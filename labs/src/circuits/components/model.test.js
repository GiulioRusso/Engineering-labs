import { firstOrder, rc, rl, sineDrive, lcTank } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'RC charge: 63% after one time constant'() { near(rc(1e-3, { R: 1e3, C: 1e-6, P: 1 }).vC, 5 * (1 - Math.exp(-1)), 1e-9, '63%'); },
  'RC: current = C dv/dt'() { const p = { R: 1e3, C: 1e-6, P: 1 }, h = 1e-7, d = (rc(5e-4 + h, p).vC - rc(5e-4, p).vC) / h; near(rc(5e-4, p).i, 1e-6 * d, 1e-4, 'i = C dv/dt'); },
  'RL: current settles at V/R; inductor voltage starts at V'() { const p = { R: 100, L: 0.1, P: 1 }; near(rl(0.05, p).i, 0.05, 1e-3, 'V/R'); near(rl(1e-9, p).vL, 5, 1e-3, 'vL(0)'); },
  'square wave: discharge in the second half'() { const f = firstOrder(0.009, { P: 0.01, tau: 1e-4 }); ok(f.x < 0.01, `${f.x}`); },
  'sine: capacitor leads by 90°, inductor lags'() { ok(sineDrive('C', {}).phi > 0 && sineDrive('L', {}).phi < 0, 'phase'); near(sineDrive('C', { f: 50, C: 10e-6 }).Z, 318.3, 1e-3, 'Xc'); },
  'LC tank: energy is conserved without R'() { const p = { L: 1e-3, C: 1e-6 }; for (const t of [0, 1e-5, 3.3e-5, 7e-5]) { const s = lcTank(t, p); near(s.EC + s.EL, 0.5 * 1e-6 * 25, 1e-6, `t=${t}`); } },
};
