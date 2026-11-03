import { rolls, counts, gof, table, independence, MENDEL } from './model.js';
import { sum } from '../core/model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'a fair die is rejected about 5 % of the time'() { let rej = 0; for (let s = 1; s <= 400; s++) if (gof(counts(rolls(1 / 6, 120, s), 120), Array(6).fill(1 / 6)).p < 0.05) rej++; near(rej / 400, 0.05, 0.5, 'α'); return `${rej}/400`; },
  'Mendel: χ² = 0.47 on 3 df'() { const g = gof(MENDEL.obs, MENDEL.p); near(g.x2, 0.470, 0.01, 'χ²'); ok(g.df === 3, 'df'); },
  'expected counts keep the margins'() { const I = independence(table(0.5, 300)); I.E.forEach((r, i) => near(sum(r), I.R[i], 1e-12, 'row')); near(sum(I.E.map((r) => r[0])), I.C[0], 1e-12, 'col'); ok(I.df === 2, 'df'); },
};
