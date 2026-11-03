import { POPS, sampling, MLE, bootstrap, percentileCI } from './model.js';
import { sd, rng } from '../core/model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'standard error of the mean is σ/√n'() { for (const p of ['expo', 'uniform']) near(sd(sampling(p, 25, 'mean', 2000, 3).values), POPS[p].sigma / 5, 0.06, p); },
  'the MLE is where the score is zero'() { for (const k of Object.keys(MLE)) { const M = MLE[k], D = M.data(30), h = M.hat(D), e = 1e-5; ok(Math.abs((M.ll(D, h + e) - M.ll(D, h - e)) / (2 * e)) < 1e-3, k); ok(M.ll(D, h) > M.ll(D, h * 1.05), `${k} peak`); } },
  'bootstrap intervals cover the true mean about 95 % of the time'() {
    const r = rng(5); let hit = 0; const R = 200;
    for (let k = 0; k < R; k++) { const x = Array.from({ length: 30 }, () => -10 * Math.log(r() + 1e-12)), ci = percentileCI(bootstrap(x, 'mean', 400, k + 1).vals); if (ci[0] <= 10 && 10 <= ci[1]) hit++; }
    near(hit / R, 0.93, 0.06, 'coverage'); return `${hit}/${R}`;
  },
};
