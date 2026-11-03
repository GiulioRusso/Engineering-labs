// Shared statistics: special functions, the normal, t, χ², F and beta distributions, and sample summaries.
// Pure, no DOM.
import { rng, gauss } from '../../lib/random.js';
export { rng, gauss };

// log Γ(x), Lanczos (g = 7, 9 terms), ~1e-15
const LC = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
export function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1; let a = LC[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += LC[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
// regularized lower incomplete gamma P(a, x) (series below a + 1, continued fraction above)
export function gammaP(a, x) {
  if (x <= 0) return 0;
  const lg = a * Math.log(x) - x - lgamma(a);
  if (x < a + 1) { let s = 1 / a, d = s; for (let n = 1; n < 500; n++) { d *= x / (a + n); s += d; if (Math.abs(d) < Math.abs(s) * 1e-15) break; } return s * Math.exp(lg); }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const e = d * c; h *= e; if (Math.abs(e - 1) < 1e-15) break; }
  return 1 - Math.exp(lg) * h;
}
// regularized incomplete beta I_x(a, b) (Lentz continued fraction)
function betacf(x, a, b) {
  let c = 1, d = 1 - (a + b) * x / (a + 1); if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
  for (let m = 1; m < 500; m++) {
    const m2 = 2 * m; let an = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + an * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
    an = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + an * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const e = d * c; h *= e;
    if (Math.abs(e - 1) < 1e-15) break;
  }
  return h;
}
export function betaI(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lb = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  return x < (a + 1) / (a + b + 2) ? Math.exp(lb) * betacf(x, a, b) / a : 1 - Math.exp(lb) * betacf(1 - x, b, a) / b;
}
// quantile of any increasing cdf on [lo, hi] by bisection
export function inv(cdf, p, lo, hi) { for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }

// distributions: pdf, cdf, upper-tail quantile helpers
export const normPdf = (x, m = 0, s = 1) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
export const normCdf = (x) => (x < 0 ? 0.5 * (1 - gammaP(0.5, x * x / 2)) : 0.5 * (1 + gammaP(0.5, x * x / 2)));
export const normQ = (p) => inv(normCdf, p, -12, 12);
export const tPdf = (t, k) => Math.exp(lgamma((k + 1) / 2) - lgamma(k / 2) - 0.5 * Math.log(k * Math.PI) - (k + 1) / 2 * Math.log(1 + t * t / k));
export const tCdf = (t, k) => { const p = 0.5 * betaI(k / (k + t * t), k / 2, 0.5); return t > 0 ? 1 - p : p; };
export const tQ = (p, k) => inv((t) => tCdf(t, k), p, -1e3, 1e3);
export const chi2Pdf = (x, k) => (x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - lgamma(k / 2)));
export const chi2Cdf = (x, k) => gammaP(k / 2, x / 2);
export const chi2Q = (p, k) => inv((x) => chi2Cdf(x, k), p, 0, 1e4);
export const fPdf = (x, a, b) => (x <= 0 ? 0 : Math.exp(lgamma((a + b) / 2) - lgamma(a / 2) - lgamma(b / 2) + (a / 2) * Math.log(a / b) + (a / 2 - 1) * Math.log(x) - ((a + b) / 2) * Math.log(1 + a * x / b)));
export const fCdf = (x, a, b) => (x <= 0 ? 0 : betaI(a * x / (a * x + b), a / 2, b / 2));
export const fQ = (p, a, b) => inv((x) => fCdf(x, a, b), p, 0, 1e4);
export const betaPdf = (x, a, b) => (x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) + lgamma(a + b) - lgamma(a) - lgamma(b)));
export const betaQ = (p, a, b) => inv((x) => betaI(x, a, b), p, 0, 1);

// sample summaries
export const sum = (v) => v.reduce((s, x) => s + x, 0);
export const mean = (v) => sum(v) / v.length;
export const variance = (v) => { const m = mean(v); return sum(v.map((x) => (x - m) ** 2)) / (v.length - 1); };
export const sd = (v) => Math.sqrt(variance(v));
export function quantile(v, p) { const s = [...v].sort((a, b) => a - b), h = (s.length - 1) * p, i = Math.floor(h); return s[i] + (h - i) * ((s[i + 1] ?? s[i]) - s[i]); }   // type 7, as R and NumPy
export const median = (v) => quantile(v, 0.5);
// ranks 1..n, ties get the average rank
export function ranks(v) {
  const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length);
  for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1; i = j + 1; }
  return r;
}
export function pearson(x, y) { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); }
export const spearman = (x, y) => pearson(ranks(x), ranks(y));
// least-squares line y = a + b x with standard errors
export function linfit(x, y) {
  const n = x.length, mx = mean(x), my = mean(y); let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  const b = sxy / sxx, a = my - b * mx, res = y.map((v, i) => v - a - b * x[i]), sse = sum(res.map((r) => r * r)), s = Math.sqrt(sse / (n - 2)), sst = sum(y.map((v) => (v - my) ** 2));
  return { a, b, res, s, sxx, mx, n, r2: 1 - sse / sst, seB: s / Math.sqrt(sxx), seA: s * Math.sqrt(1 / n + mx * mx / sxx) };
}
export const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
export const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
export const fmtP = (p) => (p < 1e-4 ? '< 0.0001' : fmt(p, 2));
