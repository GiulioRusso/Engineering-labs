// Describing data: centre and spread (and what one outlier does to them), histograms against box plots,
// and correlation (Pearson against Spearman, Anscombe's quartet).
import { createChart } from '../../lib/viz/chart.js';
import { mean, median, sd, quantile, pearson, spearman, linfit, lin, fmt } from '../core/model.js';
import { bars, boxplot, hist, edges, rect } from '../core/draw.js';
import { commute, POP, sample, fdBins, pairs } from './model.js';

const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const iqr = (v) => quantile(v, 0.75) - quantile(v, 0.25);

export default {
  id: 'describe', title: 'Describing data', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { data: 'commute', extra: 30, pop: 'normal', n: 200, bins: 12, set: 'linear', rho: 0.7, np: 40 },
  cases: [
    { id: 'summary', label: 'Centre and spread', set: {}, examples: [
      { id: 'outlier', label: 'One very long commute', set: { extra: 150 } },
      { id: 'skew', label: 'Skewed data: mean > median', set: { data: 'skewed', extra: 15 } },
      { id: 'two', label: 'Two groups: the mean describes nobody', set: { data: 'bimodal', extra: 30 } },
    ] },
    { id: 'histogram', label: 'Histogram and box plot', set: {}, examples: [
      { id: 'few', label: 'Too few bins', set: { bins: 3 } },
      { id: 'many', label: 'Too many bins', set: { bins: 60 } },
      { id: 'skewed', label: 'Skewed: a long right tail', set: { pop: 'skewed', bins: 15 } },
      { id: 'twohumps', label: 'Two humps the box plot hides', set: { pop: 'bimodal', bins: 15 } },
      { id: 'small', label: 'Only 20 values', set: { n: 20, bins: 6 } },
    ] },
    { id: 'correlation', label: 'Correlation', set: {}, examples: [
      { id: 'a2', label: 'Anscombe II: a curve', set: { set: 'a2' } },
      { id: 'a3', label: 'Anscombe III: one outlier', set: { set: 'a3' } },
      { id: 'a4', label: 'Anscombe IV: one point does it all', set: { set: 'a4' } },
      { id: 'parabola', label: 'r ≈ 0, yet y depends on x', set: { set: 'parabola' } },
      { id: 'weak', label: 'Weak: ρ = 0.3', set: { set: 'linear', rho: 0.3 } },
    ] },
  ],
  controls: [
    { title: 'Data', show: (s) => s.case === 'summary', items: [
      { id: 'data', label: 'Fifteen commutes', type: 'select', options: [['commute', 'Symmetric'], ['skewed', 'Skewed'], ['bimodal', 'Walkers and drivers']] },
      { id: 'extra', label: 'A sixteenth commute', unit: 'min', min: 0, max: 150, step: 1 },
    ] },
    { title: 'Sample', show: (s) => s.case === 'histogram', items: [
      { id: 'pop', label: 'Drawn from', type: 'select', options: Object.entries(POP).map(([k, v]) => [k, v.label]) },
      { id: 'n', label: 'Values', unit: '', min: 10, max: 1000, log: true },
      { id: 'bins', label: 'Bins', unit: '', min: 2, max: 80, step: 1 },
    ] },
    { title: 'Pairs', show: (s) => s.case === 'correlation', items: [
      { id: 'set', label: 'Data', type: 'select', options: [['linear', 'Cloud with correlation ρ'], ['a1', 'Anscombe I'], ['a2', 'Anscombe II'], ['a3', 'Anscombe III'], ['a4', 'Anscombe IV'], ['parabola', 'A parabola'], ['outlier', 'No relation + one outlier']] },
      { id: 'rho', label: 'True correlation ρ', unit: '', min: -1, max: 1, step: 0.01, show: (s) => s.set === 'linear' },
      { id: 'np', label: 'Points', unit: '', min: 5, max: 400, log: true, show: (s) => s.set === 'linear' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 10 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };

    function summary() {
      const base = commute(state.data), v = [...base, state.extra], m = mean(v), md = median(v), s = sd(v), q1 = quantile(v, 0.25), q3 = quantile(v, 0.75);
      const xs = [], ys = [], cnt = {}; v.forEach((x, i) => { const b = Math.round(x / 3); cnt[b] = (cnt[b] || 0) + 1; xs.push(x); ys.push(cnt[b] + 2.2); if (i === v.length - 1) { sq.dots('ex', [x], [cnt[b] + 2.2], { color: '--c-north', size: 11 }); } });
      sq.range([0, 155], [0, 12]); sq.titles('commute time (min)', 'each dot is one person (red: the sixteenth); box: middle half (Q1 to Q3)');
      sq.dots('d', xs, ys, { color: '--c-B', size: 8 });
      sq.line('mean', [m, m], [0, 12], { color: '--c-I', width: 2.4 }); sq.line('med', [md, md], [0, 12], { color: '--c-v', width: 2.4, dashed: true });
      sq.line('sd', [m - s, m + s], [10.5, 10.5], { color: '--c-I', width: 2 }); sq.line('sdl', [m - s, m - s], [10.1, 10.9], { color: '--c-I', width: 2 }); sq.line('sdr', [m + s, m + s], [10.1, 10.9], { color: '--c-I', width: 2 });
      put(`mean ± 1 sd`, sq.mx(m), sq.my(11.4)); put(`mean ${fmt(m)}`, sq.mx(m) + 0.5, sq.my(8.5)); put(`median ${fmt(md)}`, sq.mx(md) + 0.55, sq.my(7.7));
      boxplot(sq, 'bx', v, 1.1, 0.55, '--c-B');
      const es = lin(0, 150, 151), with_ = (e) => [...base, e];
      tr.range([0, 150], [0, 60]); tr.titles('the sixteenth commute (min)', 'minutes: mean (orange) and median (green) as it moves');
      tr.line('m', es, es.map((e) => mean(with_(e))), { color: '--c-I' }); tr.line('md', es, es.map((e) => median(with_(e))), { color: '--c-v' });
      tr.dots('q', [state.extra, state.extra], [m, md], { color: '--accent', size: 10 });
      br.range([0, 150], [0, 40]); br.titles('the sixteenth commute (min)', 'minutes: standard deviation (orange) and IQR (blue)');
      br.line('s', es, es.map((e) => sd(with_(e))), { color: '--c-I' }); br.line('i', es, es.map((e) => iqr(with_(e))), { color: '--c-B' });
      br.dots('q', [state.extra, state.extra], [s, q3 - q1], { color: '--accent', size: 10 });
      const sorted = [...v].sort((a, b) => a - b);
      plots.aux.draw({ xlim: [0, 155], series: [{ x: sorted.flatMap((x) => [x, x]), y: sorted.flatMap((_, i) => [i / v.length, (i + 1) / v.length]), color: '--c-B', label: 'share of people with a commute up to x (the empirical cdf)' }] });
      hud.set('a', `mean ${fmt(m)} min, median ${fmt(md)} min, mode ${modeOf(v)} min`);
      hud.set('b', `standard deviation ${fmt(s)} min, interquartile range ${fmt(q3 - q1)} min (Q1 ${fmt(q1)}, Q3 ${fmt(q3)})`);
      hud.set('c', Math.abs(m - md) > 0.15 * s + 1 ? `mean − median = ${fmt(m - md)} min: the ${m > md ? 'right' : 'left'} tail pulls the mean` : 'mean ≈ median: roughly symmetric', Math.abs(m - md) > 0.15 * s + 1 ? 'bad' : 'good');
    }
    function modeOf(v) { const c = {}; let best = v[0]; for (const x of v) { c[x] = (c[x] || 0) + 1; if (c[x] > c[best]) best = x; } return c[best] > 1 ? String(best) : 'none'; }

    function histogram() {
      const n = Math.round(state.n), nb = Math.round(state.bins), v = sample(state.pop, n), lo = 0, hi = 120, e = edges(lo, hi, nb), w = (hi - lo) / nb, h = hist(v, lo, hi, nb).map((c) => c / (n * w)), xs = lin(lo, hi, 300), P = POP[state.pop];
      const top = Math.max(0.05, ...h) * 1.12;
      sq.range([lo, hi], [0, top]); sq.titles('value', 'density: bars = count ÷ (n × bin width), so their area is 1; line = the true population');
      bars(sq, 'h', e, h, { color: '--c-B' }); sq.line('pdf', xs, xs.map(P.pdf), { color: '--c-I', width: 2.4 });
      tr.range([lo, hi], [0, 2]); tr.titles('value', 'box plot: Q1, median, Q3, whiskers to 1.5 IQR; red = outliers');
      const B = boxplot(tr, 'bx', v, 1, 0.45, '--c-B');
      br.range([lo, hi], [0, 1]); br.titles('value', 'the raw values, jittered up and down');
      br.dots('raw', v, v.map((_, i) => 0.1 + 0.8 * ((i * 0.6180339887) % 1)), { color: '--c-B', size: n > 300 ? 3 : 5 });
      const fd = fdBins(B.iqr, n, Math.max(...v) - Math.min(...v)), s = [...v].sort((a, b) => a - b);
      plots.aux.draw({ xlim: [lo, hi], series: [{ x: s, y: s.map((_, i) => (i + 1) / n), color: '--c-B', label: 'empirical cdf: no bins to choose' }] });
      hud.set('a', `${n} values in ${nb} bins of width ${fmt(w)}; the Freedman–Diaconis rule suggests about ${fd} bins over the data's range`, Math.abs(Math.log(nb / fd)) < 0.7 ? 'good' : '');
      hud.set('b', `median ${fmt(B.m)}, IQR ${fmt(B.iqr)}, mean ${fmt(mean(v))}, sd ${fmt(sd(v))}; ${B.out.length} point(s) beyond the whiskers`);
      hud.set('c', nb < 5 ? 'too few bins: the shape is lost' : nb > 3 * fd ? 'too many bins: noise looks like structure' : 'the histogram shows the shape; the box plot only five numbers');
    }

    function correlation() {
      const P = pairs(state.set, state.rho, Math.round(state.np)), r = pearson(P.x, P.y), rs = spearman(P.x, P.y), F = linfit(P.x, P.y);
      sq.range([0, 20], [0, 14]); sq.titles('x', 'y: each dot one pair; line = least-squares fit');
      sq.dots('p', P.x, P.y, { color: '--c-B', size: P.x.length > 150 ? 4 : 8 }); sq.line('fit', [0, 20], [F.a, F.a + 20 * F.b], { color: '--c-I', width: 2 });
      br.range([0, 20], [-4, 4]); br.titles('x', 'residual y − fit: should look like noise');
      br.dots('res', P.x, F.res, { color: '--c-north', size: 7 });
      tr.range([0, 4], [-1, 1]); tr.titles('', 'correlation: Pearson r (orange), Spearman ρ (green), r² (blue)');
      rect(tr, 'r', 0.65, 1.35, 0, r, '--c-I'); rect(tr, 'rs', 1.65, 2.35, 0, rs, '--c-v'); rect(tr, 'r2', 2.65, 3.35, 0, r * r, '--c-B');
      put(fmt(r, 2), tr.mx(1), tr.my(Math.max(0, r)) + 0.14); put(fmt(rs, 2), tr.mx(2), tr.my(Math.max(0, rs)) + 0.14); put(fmt(r * r, 2), tr.mx(3), tr.my(r * r) + 0.14);
      const ks = lin(4, P.x.length, Math.min(60, P.x.length - 3)).map(Math.round);
      plots.aux.draw({ xlim: [4, P.x.length], series: [{ x: ks, y: ks.map((k) => pearson(P.x.slice(0, k), P.y.slice(0, k))), color: '--c-I', label: 'r using only the first k points' }, { x: ks, y: ks.map((k) => spearman(P.x.slice(0, k), P.y.slice(0, k))), color: '--c-v', label: 'ρ (ranks)' }] });
      hud.set('a', `Pearson r = ${fmt(r)} (straight-line fit), Spearman ρ = ${fmt(rs)} (any rising trend, from ranks)`);
      hud.set('b', `fit y = ${fmt(F.a)} + ${fmt(F.b)} x, r² = ${fmt(r * r)}: the line explains ${fmt(100 * r * r, 2)} % of the variance of y`);
      hud.set('c', state.set.startsWith('a') ? 'all four Anscombe sets: r = 0.816 and y = 3 + 0.5x; always plot the data' : state.set === 'parabola' ? 'r ≈ 0 means no straight-line relation, not no relation' : 'correlation is not causation: a third variable can drive both', state.set === 'linear' ? '' : 'bad');
    }

    return {
      changed() { charts.forEach((k) => k.show(true)); ctx.setClock(0); },
      update() {
        charts.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        ({ summary, histogram, correlation })[state.case]();
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
