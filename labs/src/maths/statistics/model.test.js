import { DIST, bayes, sampleMeans, walks, monteCarloPi } from './model.js';
import { near, ok } from '../../lib/testing.js';

export const tests = {
  'normal: 68 % within one σ; pmfs sum to 1'() { const N = DIST.normal; near(N.cdf(1, 0, 1) - N.cdf(-1, 0, 1), 0.6827, 1e-3, '68%'); let s = 0; for (let k = 0; k < 40; k++) s += DIST.poisson.pdf(k, 4); near(s, 1, 1e-9, 'poisson'); near(DIST.binomial.cdf(10, 10, 0.3), 1, 1e-12, 'binomial'); },
  'Bayes: a 99 % test on a 1 % disease is right only half the time'() { near(bayes(0.01, 0.99, 0.99), 0.5, 1e-12, 'PPV'); },
  'sample means: spread shrinks as 1/√n'() { const a = sampleMeans(4, 4000), b = sampleMeans(64, 4000), sd = (v) => { const m = v.reduce((x, y) => x + y, 0) / v.length; return Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / v.length); }; near(sd(a) / sd(b), 4, 0.08, 'ratio'); },
  'random walk spreads as √steps; Monte Carlo π'() { const W = walks(2000, 100), rms = Math.sqrt(W.reduce((s, w) => s + w[100] ** 2, 0) / W.length); near(rms, 10, 0.06, 'rms'); near(monteCarloPi(20000).est.at(-1), Math.PI, 0.02, 'π'); },
};
