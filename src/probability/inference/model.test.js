import { zOf, intervals, test, Phi } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'z for 95% two-sided is 1.96'() { near(zOf(0.975), 1.95996, 1e-4, 'z'); },
  'about 95% of 95% intervals cover the true mean'() { const I = intervals(2000, 10, 0.95), c = I.filter((i) => i.hit).length / I.length; near(c, 0.95, 0.02, 'coverage'); },
  'power grows with n; with no effect it equals α'() { near(test(0, 10, 0.05).power, 0.05, 1e-6, 'α'); ok(test(0.5, 40, 0.05).power > test(0.5, 10, 0.05).power, 'n'); near(Phi(0), 0.5, 1e-6, 'Phi'); },
};
