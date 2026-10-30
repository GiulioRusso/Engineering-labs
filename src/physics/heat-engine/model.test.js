import { carnot, otto, totals, loopArea, GAMMA } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'Carnot efficiency = 1 − Tc/Th'() {
    for (const [Th, Tc] of [[600, 300], [900, 300], [330, 300]]) near(totals(carnot({ Th, Tc })).eta, 1 - Tc / Th, 1e-9, `${Th}/${Tc} K`);
  },
  'Otto efficiency = 1 − r^(1−γ), whatever the heat added'() {
    for (const r of [4, 8]) for (const T3 of [2000, 3000]) near(totals(otto({ r, T3 })).eta, 1 - r ** (1 - GAMMA), 1e-9, `r = ${r}`);
  },
  'round a cycle the gas comes back: ΔU = 0 and ΔS = 0'() {
    for (const c of [carnot({ Th: 600, Tc: 300 }), otto({})]) { const t = totals(c); ok(Math.abs(t.dU) < 1e-9 && Math.abs(t.dS) < 1e-9, `ΔU ${t.dU}, ΔS ${t.dS}`); }
  },
  'net work = area of the p–V loop (shoelace on the sampled path) = Q_in − Q_out'() {
    for (const c of [carnot({ Th: 600, Tc: 300 }), otto({})]) {
      const t = totals(c);
      near(loopArea(c), t.W, 1e-4, 'area'); near(t.Qin - t.Qout, t.W, 1e-12, 'first law');
    }
  },
  'Carnot exchanges heat only on the isotherms: Q_h/T_h = Q_c/T_c'() {
    const c = carnot({ Th: 600, Tc: 300 });
    near(c[0].Q / 600, -c[2].Q / 300, 1e-12, 'entropy in = entropy out'); ok(c[1].Q === 0 && c[3].Q === 0, 'adiabats: Q = 0');
  },
};
