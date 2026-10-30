// Ensembles: a vote of bootstrapped decision trees (where they disagree, and how accuracy grows with the
// number of trees), and AdaBoost adding one decision stump per round while re-weighting the mistakes.
import { createChart } from '../../lib/viz/chart.js';
import { predict } from '../classic/model.js';
import { data, TEST, forest, vote, acc, adaboost, boostScore } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], R = 3, G = 56, TMAX = 60, MMAX = 80;
const P = data();
const tint = (v) => (k, o) => { const p = v[k]; o[0] = 0.12 + 0.62 * p; o[1] = 0.16 + 0.46 * p; o[2] = 0.42 - 0.27 * p; };
const cells = (f) => { const v = new Float64Array(G * G); for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) v[j * G + i] = f(-R + 2 * R * (i + 0.5) / G, -R + 2 * R * (j + 0.5) / G); return v; };

export default {
  id: 'ensembles', title: 'Ensembles', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { T: 20, depth: 10, M: 20 },
  cases: [
    { id: 'forest', label: 'Bagging trees', controls: ['T', 'depth'], set: { T: 20, depth: 10 }, examples: [
      { id: 'one', label: 'One tree: jagged', set: { T: 1 } },
      { id: 'sixty', label: 'Sixty trees', set: { T: 60 } },
      { id: 'stumpy', label: 'Shallow trees (depth 2)', set: { depth: 2, T: 60 } },
    ] },
    { id: 'boosting', label: 'Boosting stumps', controls: ['M'], set: { M: 20 }, examples: [
      { id: 'first', label: 'Round 1: one cut', set: { M: 1 } },
      { id: 'five', label: 'Five rounds', set: { M: 5 } },
      { id: 'eighty', label: 'Eighty rounds: memorising', set: { M: 80 } },
    ] },
  ],
  controls: [
    { title: 'Random forest (bagging)', show: (s) => s.case === 'forest', items: [
      { id: 'T', label: 'Trees', unit: '', min: 1, max: TMAX, step: 1 }, { id: 'depth', label: 'Depth of each tree', unit: '', min: 1, max: 12, step: 1 },
    ] },
    { title: 'AdaBoost', show: (s) => s.case === 'boosting', items: [{ id: 'M', label: 'Rounds (stumps)', unit: '', min: 1, max: MMAX, step: 1 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR, grid: false }), charts = [sq, tr, br];
    const cache = {};
    const forestOf = (d) => (cache[`f${d}`] ??= (() => { const F = forest(P, TMAX, d), curve = Array.from({ length: TMAX }, (_, t) => acc(TEST, (x, y) => vote(F, x, y, t + 1))), single = F.map((T) => acc(TEST, (x, y) => predict(T, x, y))); return { F, curve, single }; })());
    const boost = () => (cache.b ??= (() => { const Rr = adaboost(P, MMAX); return { R: Rr, tr: Rr.map((_, m) => acc(P, (x, y) => (boostScore(Rr, x, y, m + 1) > 0 ? 1 : 0))), te: Rr.map((_, m) => acc(TEST, (x, y) => (boostScore(Rr, x, y, m + 1) > 0 ? 1 : 0))) }; })());
    const dots = (sizes) => {
      for (const [k, c, col] of [['0', 0, '--c-B'], ['1', 1, '--c-E']]) for (const sz of [4, 8, 14]) {
        const I = P.map((p, i) => [p, i]).filter(([p, i]) => p[2] === c && Math.abs(p[0]) < R && Math.abs(p[1]) < R && (sizes ? sizes[i] === sz : sz === 8)); // dots are not clipped by the chart
        sq.dots(`d${k}${sz}`, I.map(([p]) => p[0]), I.map(([p]) => p[1]), { color: col, size: sz });
      }
    };
    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); },
      update() {
        sq.range([-R, R], [-R, R]); sq.titles('x₁', 'x₂');
        if (state.case === 'forest') {
          const T = Math.round(state.T), { F, curve, single } = forestOf(Math.round(state.depth)), v = cells((x, y) => vote(F, x, y, T));
          sq.image('m', v, G, G, { rgb: tint(v) }); dots(null);
          tr.range([1, TMAX], [0.7, 1]); tr.titles('number of trees', 'accuracy on unseen points: the vote (orange), each tree alone (dots)');
          tr.line('c', curve.map((_, i) => i + 1), curve, { color: '--c-I', width: 2 }); tr.dots('s', single.map((_, i) => i + 1), single, { color: '--ink-dim', size: 4 }); tr.dots('q', [T], [curve[T - 1]], { color: '--accent', size: 11 });
          const dis = v.map((p) => 4 * p * (1 - p)); // 1 where the trees split 50/50, 0 where they agree
          br.range([-R, R], [-R, R]); br.titles('', 'where the trees disagree (bright = votes split)');
          br.image('dis', dis, G, G, { map: 'magma', norm: (q) => q });
          plots.aux.draw({ xlim: [1, TMAX], cursor: T, ylim: [0.7, 1], series: [{ x: single.map((_, i) => i + 1), y: single, color: '--ink-dim', label: 'each tree alone on unseen points' }, { x: curve.map((_, i) => i + 1), y: curve, color: '--c-I', label: 'the vote of the first T trees' }] });
          const mean = single.slice(0, T).reduce((a, b) => a + b, 0) / T;
          hud.set('a', `${T} tree${T > 1 ? 's' : ''} of depth ${Math.round(state.depth)}, each grown on a bootstrap sample (200 points drawn with replacement)`);
          hud.set('b', `vote: ${fmt(100 * curve[T - 1])} % on unseen points; the same trees alone average ${fmt(100 * mean)} %`, curve[T - 1] > mean ? 'good' : '');
          hud.set('c', 'deep trees are unstable (high variance); averaging many of them cancels much of that noise');
        } else {
          const M = Math.round(state.M), { R: Rr, tr: TR2, te } = boost(), v = cells((x, y) => 1 / (1 + Math.exp(-2 * boostScore(Rr, x, y, M))));
          sq.image('m', v, G, G, { rgb: tint(v) });
          // point size: its weight going into the next round (three sizes)
          const w = Rr[M - 1].w, wm = 1 / P.length; dots(Array.from(w, (q) => (q < 0.6 * wm ? 4 : q < 2 * wm ? 8 : 14)));
          const last = Rr[M - 1], xs = [-R, R];
          if (last.f === 0) sq.line('cut', [last.thr, last.thr], xs, { color: '--c-north', width: 2.4 }); else sq.line('cut', xs, [last.thr, last.thr], { color: '--c-north', width: 2.4 });
          const ms = Rr.map((_, i) => i + 1);
          tr.range([1, MMAX], [0.75, 1]); tr.titles('rounds', 'accuracy: training (green), unseen points (orange)');
          tr.line('tr', ms, TR2, { color: '--c-v', width: 2 }); tr.line('te', ms, te, { color: '--c-I', width: 2 }); tr.dots('q', [M, M], [TR2[M - 1], te[M - 1]], { color: '--accent', size: 9 });
          br.range([0.5, MMAX + 0.5], [0, Math.max(...Rr.map((q) => q.alpha)) * 1.1]); br.titles('round', 'say of each stump α = ½ ln((1 − ε)/ε)');
          br.stems('a', ms.slice(0, M), Rr.slice(0, M).map((q) => q.alpha), { color: '--c-north', width: 3 });
          plots.aux.draw({ xlim: [1, MMAX], cursor: M, ylim: [0, 0.5], series: [{ x: ms, y: Rr.map((q) => q.eps), color: '--c-north', label: 'weighted error ε of each new stump (always below ½)' }] });
          hud.set('a', `round ${M}: the new stump cuts ${last.f ? 'x₂' : 'x₁'} at ${fmt(last.thr)} (red line), weighted error ε = ${fmt(last.eps)}, say α = ${fmt(last.alpha)}`);
          hud.set('b', `the sum of ${M} stumps: training ${fmt(100 * TR2[M - 1])} %, unseen points ${fmt(100 * te[M - 1])} %`);
          hud.set('c', 'big dots = points the ensemble still gets wrong: their weight grows, so the next stump focuses on them');
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
