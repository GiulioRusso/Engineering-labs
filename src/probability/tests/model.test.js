import { experiments, anova, anovaData, groups, tTwo, tPaired, mannWhitney } from './model.js';
import { mean } from '../core/model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'with no effect, 5 % of p-values fall below 0.05 and p is uniform'() { const ps = experiments(0, 10, 1, 2000, 7); near(ps.filter((p) => p < 0.05).length / ps.length, 0.05, 0.25, 'α'); near(ps.filter((p) => p < 0.5).length / ps.length, 0.5, 0.06, 'median'); },
  'twenty outcomes: about 1 − 0.95²⁰ find something'() { const ps = experiments(0, 10, 20, 400, 9); near(ps.filter((p) => p < 0.05).length / ps.length, 1 - 0.95 ** 20, 0.12, 'family-wise'); },
  'F averages df2/(df2 − 2) when the means are equal'() { const F = Array.from({ length: 400 }, (_, s) => anova(anovaData(3, 10, 0, 2, s + 1)).F); near(mean(F), 27 / 25, 0.12, 'E[F]'); },
  'pairing removes between-subject variation'() { const D = groups('paired', 1, 10); ok(tPaired(D.a, D.b).p < tTwo(D.a, D.b).p / 10, 'paired'); },
  'Mann–Whitney ignores how far out the largest value is'() { const a = [1, 2, 3, 4, 5], b = [6, 7, 8, 9, 10]; near(mannWhitney(a, b).p, mannWhitney(a, [6, 7, 8, 9, 1000]).p, 1e-12, 'p'); ok(mannWhitney(a, b).U === 25, 'U'); },
};
