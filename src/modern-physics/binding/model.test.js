import { B, terms, zStable, perNucleon, MEASURED, fissionQ, dtQ } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'the formula: the terms add up; stable Z is right for iron and lead; within 1 % of the measured B for heavy nuclei'() {
    const t = terms(56, 26); near(Object.values(t).reduce((a, b) => a + b, 0), B(56, 26), 1e-12, 'sum');
    ok(Math.abs(zStable(56) - 26) <= 1, `Fe ${zStable(56)}`); ok(Math.abs(zStable(208) - 82) <= 1, `Pb ${zStable(208)}`);
    for (const m of MEASURED.filter((q) => q.A >= 50)) near(B(m.A, zStable(m.A)), m.B, 0.01, m.name);
  },
  'B/A peaks near iron (≈ 8.8 MeV); fission of uranium releases ≈ 200 MeV; D–T fusion 17.6 MeV'() {
    let best = 0, bestA = 0; for (let A = 20; A <= 250; A++) if (perNucleon(A) > best) { best = perNucleon(A); bestA = A; }
    ok(bestA >= 50 && bestA <= 70, `peak at A = ${bestA}`); near(best, 8.8, 0.02, 'peak value');
    const q = fissionQ(236); ok(q > 150 && q < 230, `fission Q ${q}`); ok(fissionQ(40) < 0, 'light nuclei do not gain from splitting');
    near(dtQ(), 17.589, 1e-3, 'D–T');
  },
};
