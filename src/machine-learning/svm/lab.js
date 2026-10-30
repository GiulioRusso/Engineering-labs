// Support vector machines: the widest street between two classes, its support vectors and the C trade-off;
// then the RBF kernel separating rings, with γ from too smooth to islands.
import { createChart } from '../../lib/viz/chart.js';
import { blobs, rings, linearSVM, score, margin, kernelSVM, kscore, accuracy } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], R = 2.4, G = 60;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const tint = (s) => (k, o) => { const p = 1 / (1 + Math.exp(-2.5 * s[k])); o[0] = 0.12 + 0.6 * p; o[1] = 0.16 + 0.45 * p; o[2] = 0.42 - 0.27 * p; };
const CS = lin(-2, 2, 25).map((v) => 10 ** v), GS = lin(-2, 2, 17).map((v) => 10 ** v), TEST = rings({ seed: 9 });

export default {
  id: 'svm', title: 'Support vector machines', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { C: 100, outlier: false, gamma: 1, Ck: 10 },
  cases: [
    { id: 'margin', label: 'Maximum margin', controls: ['C', 'outlier'], set: { C: 100, outlier: false }, examples: [
      { id: 'soft', label: 'Small C: a wider, softer street', set: { C: 0.05 } },
      { id: 'outlier', label: 'An outlier squeezes a hard margin', set: { outlier: true } },
      { id: 'outlier-soft', label: '… a soft margin ignores it', set: { outlier: true, C: 0.5 } },
    ] },
    { id: 'kernel', label: 'The kernel trick', controls: ['gamma', 'Ck'], set: { gamma: 1, Ck: 10 }, examples: [
      { id: 'smooth', label: 'γ = 0.01: too smooth', set: { gamma: 0.01 } },
      { id: 'best', label: 'γ = 0.3: few support vectors', set: { gamma: 0.3 } },
      { id: 'islands', label: 'γ = 100: islands round every point', set: { gamma: 100 } },
    ] },
  ],
  controls: [
    { title: 'Linear SVM', show: (s) => s.case === 'margin', items: [
      { id: 'C', label: 'C (cost of violations)', unit: '', min: 0.01, max: 100, log: true }, { id: 'outlier', label: 'Add an outlier', type: 'check' },
    ] },
    { title: 'RBF kernel SVM', show: (s) => s.case === 'kernel', items: [
      { id: 'gamma', label: 'γ (1 / reach²)', unit: '', min: 0.01, max: 100, log: true }, { id: 'Ck', label: 'C', unit: '', min: 0.1, max: 100, log: true },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    let D = null;
    const pts = (P, sv) => {
      sq.dots('sv', P.filter((_, i) => sv[i]).map((p) => p[0]), P.filter((_, i) => sv[i]).map((p) => p[1]), { color: '--c-north', size: 17 });
      for (const [k, y, c] of [['n', -1, '--c-B'], ['p', 1, '--c-E']]) sq.dots(k, P.filter((p) => p[2] === y).map((p) => p[0]), P.filter((p) => p[2] === y).map((p) => p[1]), { color: c, size: 9 });
    };
    const lineAt = (m, level) => { const xs = lin(-R, R, 121), [a, b] = m.w; if (Math.abs(b) < 1e-9) return [[], []]; const ys = xs.map((x) => (level - m.b - a * x) / b); const keep = ys.map((y) => Math.abs(y) <= R); return [xs.filter((_, i) => keep[i]), ys.filter((_, i) => keep[i])]; };
    return {
      changed() {
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); });
        if (state.case === 'margin') { const P = blobs({ outlier: state.outlier }), m = linearSVM(P, state.C); D = { P, m, curve: CS.map((C) => margin(linearSVM(P, C, 3000))) }; }
        else { const P = rings(), m = kernelSVM(P, state.Ck, state.gamma), s = new Float64Array(G * G); for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) s[j * G + i] = kscore(m, -R + 2 * R * (i + 0.5) / G, -R + 2 * R * (j + 0.5) / G);
          D = { P, m, s, curve: GS.map((g) => { const k = kernelSVM(P, state.Ck, g, 80); return [accuracy(P, (x, z) => kscore(k, x, z)), accuracy(TEST, (x, z) => kscore(k, x, z)), k.alpha.filter((a) => a > 1e-6).length]; }) }; }
      },
      update() {
        sq.range([-R, R], [-R, R]); sq.titles('x₁', 'x₂');
        if (state.case === 'margin') {
          const { P, m, curve } = D, sv = m.alpha.map((a) => a > 1e-6), f = P.map(([x, z, y]) => y * score(m, x, z)), s = new Float64Array(G * G);
          for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) s[j * G + i] = score(m, -R + 2 * R * (i + 0.5) / G, -R + 2 * R * (j + 0.5) / G);
          sq.image('bg', s, G, G, { rgb: tint(s) });
          for (const [k, lv, o] of [['d', 0, { color: '--c-I', width: 3 }], ['m1', 1, { color: '--ink', width: 1.4, dashed: true }], ['m0', -1, { color: '--ink', width: 1.4, dashed: true }]]) { const [xs, ys] = lineAt(m, lv); if (xs.length > 1) sq.line(k, xs, ys, o); else sq.hide(k); }
          pts(P, sv);
          tr.range([-2, 2], [0, Math.max(...curve) * 1.1]); tr.titles('log₁₀ C', 'margin width 2/‖w‖');
          tr.line('c', CS.map(Math.log10), curve, { color: '--c-v', width: 2 }); tr.dots('q', [Math.log10(state.C)], [margin(m)], { color: '--accent', size: 11 });
          const am = Math.max(1e-6, ...m.alpha) * 1.25;
          br.range([-0.5, P.length - 0.5], [0, am]); br.titles('point number', 'α of each point: > 0 only for support vectors (≤ C, dashed)');
          br.stems('a', P.map((_, i) => i), m.alpha, { color: '--c-north', width: 3 }); if (state.C < am) br.line('C', [-0.5, P.length - 0.5], [state.C, state.C], { color: '--ink-dim', dashed: true, width: 1 }); else br.hide('C');
          const so = f.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
          plots.aux.draw({ xlim: [0, P.length - 1], ylim: [-2, 6], series: [{ x: so.map((_, i) => i), y: so.map((q) => q[0]), color: '--c-I', label: 'y·f(x) of every point, sorted: ≥ 1 outside the street, < 0 on the wrong side' }, { x: [0, P.length - 1], y: [1, 1], color: '--ink-dim', dash: [4, 3], label: 'margin' }] });
          const nsv = sv.filter(Boolean).length, inside = f.filter((v) => v < 1 - 1e-3).length;
          hud.set('a', `street width 2/‖w‖ = ${fmt(margin(m))}; ${nsv} support vectors (red rings) — the only points that decide the line`);
          hud.set('b', `${inside} points inside the street or beyond, ${f.filter((v) => v < 0).length} on the wrong side; C = ${fmt(state.C)} is what each violation costs`, inside ? '' : 'good');
          hud.set('c', 'move any other point (not ringed) a little and the line does not change: only the support vectors matter');
        } else {
          const { P, m, s, curve } = D, sv = m.alpha.map((a) => a > 1e-6);
          sq.image('bg', s, G, G, { rgb: tint(s) });
          pts(P, sv);
          const ds = lin(0, 3, 121);
          tr.range([0, 3], [0, 1.05]); tr.titles('distance between two points', `RBF similarity e^(−γ d²), γ = ${fmt(state.gamma)}`);
          tr.line('k', ds, ds.map((d) => Math.exp(-state.gamma * d * d)), { color: '--c-v', width: 2 });
          br.range([-2, 2], [0.6, 1.02]); br.titles('log₁₀ γ', 'accuracy: training (green), unseen points (orange)');
          br.line('tr', GS.map(Math.log10), curve.map((q) => q[0]), { color: '--c-v', width: 2 }); br.line('te', GS.map(Math.log10), curve.map((q) => q[1]), { color: '--c-I', width: 2 });
          br.dots('q', [Math.log10(state.gamma)], [accuracy(TEST, (x, z) => kscore(m, x, z))], { color: '--accent', size: 10 });
          plots.aux.draw({ xlim: [-2, 2], cursor: Math.log10(state.gamma), series: [{ x: GS.map(Math.log10), y: curve.map((q) => q[2]), color: '--c-north', label: 'number of support vectors vs log₁₀ γ (of 120 points)' }] });
          const tra = accuracy(P, (x, z) => kscore(m, x, z)), tea = accuracy(TEST, (x, z) => kscore(m, x, z));
          hud.set('a', `f(x) = Σ αᵢ yᵢ K(xᵢ, x): ${sv.filter(Boolean).length} of 120 points are support vectors`);
          hud.set('b', `training ${fmt(100 * tra)} %, unseen points ${fmt(100 * tea)} %`, tea > 0.97 ? 'good' : tea < 0.9 ? 'bad' : '');
          hud.set('c', state.gamma < 0.02 ? 'tiny γ: every point looks like every other, the boundary is almost a straight line' : state.gamma > 20 ? 'huge γ: each point only sees itself, so the model draws a blob round each one: memorising' : 'the kernel measures similarity; the SVM never needs the high-dimensional features themselves');
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
