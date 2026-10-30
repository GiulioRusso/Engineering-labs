// ROC curves: two score distributions and a threshold; true and false positives as areas; the ROC curve
// with its AUC (exact and from a sample); counts per 1000 cases, and what rare positives do to precision.
import { createChart } from '../../lib/viz/chart.js';
import { pdf, tpr, fpr, auc, at, sample, empirical } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const XS = lin(-4, 8, 241);

export default {
  id: 'roc', title: 'ROC curves', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { d: 2, t: 1, prev: 0.3 },
  cases: [
    { id: 'roc', label: 'Threshold and ROC', controls: ['t', 'd', 'prev'], set: { d: 2, t: 1, prev: 0.3 }, examples: [
      { id: 'strict', label: 'A strict threshold', set: { t: 2.5 } },
      { id: 'perfect', label: 'Well separated: AUC ≈ 1', set: { d: 4, t: 2 } },
      { id: 'useless', label: 'No signal: the diagonal', set: { d: 0, t: 0 } },
      { id: 'rare', label: 'Rare positives: precision collapses', set: { prev: 0.01 } },
    ] },
  ],
  controls: [{ title: 'Classifier scores', items: [
    { id: 't', label: 'Threshold t: "positive" above', unit: '', min: -3, max: 6, step: 0.05 },
    { id: 'd', label: 'Separation d (signal)', unit: '', min: 0, max: 4, step: 0.05 },
    { id: 'prev', label: 'Share of positives', unit: '%', k: 100, min: 0.01, max: 0.5, log: true },
  ] }],
  plots: [{ id: 'aux', title: '', xLabel: 'threshold', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR, xTicks: false }), charts = [sq, tr, br];
    const pool = Array.from({ length: 4 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); },
      update() {
        const { d, t, prev: p } = state, A = at(t, d, p), neg = XS.map((x) => (1 - p) * pdf(x)), pos = XS.map((x) => p * pdf(x, d)), ym = Math.max(...neg, ...pos) * 1.1;
        sq.range([-4, 8], [0, ym]); sq.titles('classifier score', `how many cases get each score: negatives (blue, ${fmt(100 * (1 - p))} %), positives (gold, ${fmt(100 * p)} %)`);
        const R = XS.filter((x) => x >= t);
        sq.stems('fp', R, R.map((x) => (1 - p) * pdf(x)), { color: '--c-north', width: 1.2 }); sq.stems('tp', R, R.map((x) => p * pdf(x, d)), { color: '--c-v', width: 1.2 });
        sq.line('n', XS, neg, { color: '--c-B', width: 2.4 }); sq.line('p', XS, pos, { color: '--c-E', width: 2.4 });
        sq.line('t', [t, t], [0, ym], { color: '--accent', width: 2, dashed: true });
        const ts = lin(8, -4, 241), E = empirical(sample(d, 200));
        tr.range([0, 1], [0, 1]); tr.titles('false-positive rate (negatives flagged)', 'true-positive rate (recall)');
        tr.line('diag', [0, 1], [0, 1], { color: '--ink-dim', dashed: true, width: 1 });
        tr.line('emp', E.pts.map((q) => q[0]), E.pts.map((q) => q[1]), { color: '--c-ref', width: 1.2 });
        tr.line('roc', ts.map(fpr), ts.map((q) => tpr(q, d)), { color: '--c-I', width: 2.4 }); tr.dots('q', [A.F], [A.T], { color: '--accent', size: 11 });
        br.range([0.4, 4.6], [0, 1000]); br.titles('', 'out of 1000 cases');
        [['TP', A.TP, '--c-v'], ['FN', A.FN, '--c-E'], ['FP', A.FP, '--c-north'], ['TN', A.TN, '--c-B']].forEach(([k, v, c], i) => { br.stems(k, [i + 1], [v], { color: c, width: 14 }); pool[i].element.textContent = `${k} ${Math.round(v)}`; pool[i].position.set(br.mx(i + 1), BR[1] - 0.18, 0.02); pool[i].visible = true; });
        const tt = lin(-3, 6, 181);
        plots.aux.draw({ xlim: [-3, 6], cursor: t, ylim: [0, 1], series: [{ x: tt, y: tt.map((q) => at(q, d, p).precision), color: '--c-F', label: 'precision TP/(TP + FP)' }, { x: tt, y: tt.map((q) => tpr(q, d)), color: '--c-v', label: 'recall TP/(TP + FN)' }] });
        hud.set('a', `threshold ${fmt(t)}: recall ${fmt(100 * A.T)} % of positives found, ${fmt(100 * A.F)} % of negatives wrongly flagged`);
        hud.set('b', `precision ${fmt(100 * A.precision)} % (of the flagged, how many are positive); accuracy ${fmt(100 * A.accuracy)} %`, A.precision < 0.3 ? 'bad' : '');
        hud.set('c', `AUC = Φ(d/√2) = ${fmt(auc(d))} (this sample of 200 + 200: ${fmt(E.auc)}): the chance a random positive scores above a random negative`);
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
