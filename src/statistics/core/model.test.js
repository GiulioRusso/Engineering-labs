import { lgamma, normCdf, normQ, tCdf, tQ, chi2Cdf, chi2Q, fCdf, fQ, betaI, quantile, ranks, pearson, spearman, linfit, tPdf, chi2Pdf, fPdf } from './model.js';
import { near, ok } from '../../lib/testing.js';

const integ = (f, a, b, n = 4000) => { let s = 0; const h = (b - a) / n; for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h) * h; return s; };

export const tests = {
  'lgamma matches factorials'() { near(Math.exp(lgamma(6)), 120, 1e-12, 'Γ(6)'); near(Math.exp(lgamma(0.5)), Math.sqrt(Math.PI), 1e-12, 'Γ(½)'); },
  'table values: z, t, χ², F'() {
    near(normCdf(1.96), 0.9750021, 1e-6, 'Φ(1.96)'); near(normQ(0.975), 1.959964, 1e-6, 'z');
    near(tQ(0.975, 10), 2.228139, 1e-6, 't10'); near(tQ(0.975, 2), 4.302653, 1e-6, 't2');
    near(chi2Q(0.95, 5), 11.0705, 1e-5, 'χ²5'); near(chi2Q(0.95, 1), 3.841459, 1e-6, 'χ²1');
    near(fQ(0.95, 2, 27), 3.354131, 1e-5, 'F(2,27)'); near(betaI(0.3, 2, 3), 0.3483, 1e-4, 'I');
  },
  't approaches normal for large df'() { near(tCdf(1.5, 1e5), normCdf(1.5), 1e-4, 't'); ok(tCdf(-2, 3) > normCdf(-2), 'fat tails'); },
  'densities integrate to their cdfs'() {
    near(integ((t) => tPdf(t, 4), -3, 1), tCdf(1, 4) - tCdf(-3, 4), 1e-6, 't');
    near(integ((x) => chi2Pdf(x, 3), 0, 4), chi2Cdf(4, 3), 1e-5, 'χ²');
    near(integ((x) => fPdf(x, 3, 12), 0, 2), fCdf(2, 3, 12), 1e-5, 'F');
  },
  'quantiles, ranks with ties, correlation'() {
    near(quantile([1, 2, 3, 4], 0.25), 1.75, 1e-12, 'q'); ok(ranks([10, 20, 20, 5]).join() === '2,3.5,3.5,1', 'ranks');
    near(pearson([1, 2, 3], [2, 4, 6.5]), 0.997949, 1e-5, 'r'); near(spearman([1, 2, 3, 4], [1, 8, 27, 64]), 1, 1e-12, 'ρ');
    const f = linfit([0, 1, 2, 3], [1, 3, 5, 7]); near(f.b, 2, 1e-12, 'b'); near(f.a, 1, 1e-12, 'a'); near(f.r2, 1, 1e-12, 'r²');
  },
};
