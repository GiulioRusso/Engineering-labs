import { invOut, threshold, margins, crowbar, gateDelay, dynPower, latch } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'inverter: rails at the ends, threshold at V_DD/2 when the PMOS is twice as wide'() { near(invOut(0), 3.3, 1e-9, 'high'); near(invOut(3.3), 0, 1e-9, 'low'); near(threshold(2), 1.65, 1e-3, 'Vm'); ok(threshold(1) < 1.6, 'weaker PMOS lowers Vm'); },
  'noise margins are equal and about a third of V_DD for the symmetric inverter'() { const m = margins(2); near(m.NMH, m.NML, 0.03, 'symmetric'); ok(m.NML > 0.9 && m.NML < 1.4, `${m.NML}`); },
  'crowbar current flows only between V_TN and V_DD − V_TP, peaking at V_M'() { ok(crowbar(0.5) === 0 && crowbar(2.8) === 0, 'off'); ok(crowbar(1.65) > crowbar(1.0), 'peak'); },
  'delay grows with load, power with V²'() { ok(gateDelay(3.3, 1, 20e-15).tp > gateDelay(3.3, 1, 10e-15).tp, 'load'); near(dynPower({ vdd: 1.8 }).dyn / dynPower({ vdd: 5 }).dyn, (1.8 / 5) ** 2, 1e-9, 'V²'); },
  'latch: the middle is unstable; a smaller push takes longer to resolve'() { const a = latch(1e-3), b = latch(1e-6); ok(Number.isFinite(a.res) && Number.isFinite(b.res), 'resolves'); ok(b.res > a.res, 'log dependence'); ok(Math.abs(a.ta.at(-1) - a.tb.at(-1)) > 3, 'rails'); },
};
