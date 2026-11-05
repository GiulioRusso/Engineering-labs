// Chart helpers shared by the statistics labs: filled histogram bars and a horizontal box plot.
import { quantile, median } from './model.js';

// bars over bin edges e[0..n] with heights h[0..n-1]: dense vertical hatching (reads as a fill) + outline
export function bars(ch, key, e, h, { color = '--c-B', fill = 7 } = {}) {
  const fx = [], fy = [], ox = [e[0]], oy = [0];
  for (let i = 0; i < h.length; i++) {
    const w = e[i + 1] - e[i]; for (let k = 0; k < fill; k++) { fx.push(e[i] + w * (k + 0.5) / fill); fy.push(h[i]); }
    ox.push(e[i], e[i + 1], e[i + 1]); oy.push(h[i], h[i], 0);
  }
  ch.stems(`${key}f`, fx, fy, { color, width: 2.2 }); ch.line(`${key}o`, ox, oy, { color, width: 1.6 });
}
// one bar from x0 to x1, y0 to y1 (zig-zag fill), for bar charts that do not start at 0
export function rect(ch, key, x0, x1, y0, y1, color, n = 44) {
  const xs = [], ys = []; for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n; xs.push(x, x); ys.push(k % 2 ? y1 : y0, k % 2 ? y0 : y1); }
  ch.line(key, xs, ys, { color, width: 2.4 });
}
export const hist = (v, lo, hi, n) => { const c = new Array(n).fill(0); for (const x of v) { const i = Math.floor((x - lo) / (hi - lo) * n); if (i >= 0 && i < n) c[i]++; } return c; };
export const edges = (lo, hi, n) => Array.from({ length: n + 1 }, (_, i) => lo + (hi - lo) * i / n);
// horizontal box plot at height y (half-height h): box Q1–Q3, median, whiskers to the last point within 1.5 IQR, outliers as dots
export function boxplot(ch, key, v, y, h, color = '--c-B') {
  const q1 = quantile(v, 0.25), q3 = quantile(v, 0.75), m = median(v), iqr = q3 - q1, lo = Math.min(...v.filter((x) => x >= q1 - 1.5 * iqr)), hi = Math.max(...v.filter((x) => x <= q3 + 1.5 * iqr));
  ch.line(`${key}b`, [q1, q3, q3, q1, q1], [y - h, y - h, y + h, y + h, y - h], { color, width: 2 });
  ch.line(`${key}m`, [m, m], [y - h, y + h], { color: '--accent', width: 3 });
  ch.line(`${key}w`, [lo, lo, lo, q1], [y - h / 2, y + h / 2, y, y], { color, width: 1.6 });
  ch.line(`${key}v`, [q3, hi, hi, hi], [y, y, y - h / 2, y + h / 2], { color, width: 1.6 });
  const out = v.filter((x) => x < lo || x > hi); ch.dots(`${key}o`, out, out.map(() => y), { color: '--c-north', size: 7 });
  return { q1, q3, m, lo, hi, iqr, out };
}
