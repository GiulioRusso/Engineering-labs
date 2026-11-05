import { zScore, within, cloud, conditional, sumSd, normQ } from './model.js';
import { mean, sd, pearson } from '../core/model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'normal: 68–95–99.7 rule; z of 82 in N(70, 8) is 1.5; top 10 % starts at z = 1.28'() {
    near(within(1), 0.6827, 1e-3, '1σ'); near(within(2), 0.9545, 1e-3, '2σ'); near(within(3), 0.9973, 1e-3, '3σ');
    near(zScore(82, 70, 8), 1.5, 1e-12, 'z'); near(normQ(0.9), 1.2816, 1e-3, 'q90');
  },
  'joint: the cloud has the asked correlation and spreads; a slice has the conditional mean and sd'() {
    const c = cloud(6000, 0.7, 1.5); near(pearson(c.x, c.y), 0.7, 0.02, 'r'); near(sd(c.y), 1.5, 0.04, 'sd y');
    const C = conditional(1, 0.7, 1.5), ys = c.y.filter((_, i) => Math.abs(c.x[i] - 1) < 0.1);
    near(mean(ys), C.m, 0.1, 'slice mean'); near(sd(ys), C.s, 0.1, 'slice sd');
  },
  'Var(X + Y) = σx² + σy² + 2 cov: negative correlation narrows the sum'() {
    const c = cloud(6000, -0.8, 1), s = c.x.map((v, i) => v + c.y[i]); near(sd(s), sumSd(-0.8, 1), 0.02, 'sum sd'); ok(sumSd(-0.8, 1) < sumSd(0, 1), 'hedge');
  },
};
