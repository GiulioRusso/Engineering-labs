import { lineData, regress, PRIORS, posterior, TRUE } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'the slope interval covers the true slope about 95 % of the time'() { let hit = 0; for (let s = 1; s <= 400; s++) { const D = lineData('linear', 15, 1.5, s), R = regress(D.x, D.y); if (R.ci[0] <= TRUE.b && TRUE.b <= R.ci[1]) hit++; } near(hit / 400, 0.95, 0.03, 'coverage'); return `${hit}/400`; },
  'bands are narrowest at the mean of x, and the prediction band is wider'() { const D = lineData('linear', 30, 1, 3), R = regress(D.x, D.y); ok(R.band(R.mx, false) < R.band(0, false) && R.band(R.mx, false) < R.band(10, false), 'narrowest'); ok(R.band(5, true) > R.band(5, false), 'prediction'); },
  'posterior mean = weighted average of prior mean and data share'() { const P = PRIORS.fair, Q = posterior(P, 68, 100); near(Q.mean, Q.w * 0.68 + (1 - Q.w) * 0.5, 1e-12, 'mean'); ok(Q.a === 88 && Q.b === 52, 'counts'); },
};
