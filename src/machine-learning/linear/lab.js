// Linear models: fit a line by hand and see the squared residuals; gradient descent towards the least-squares
// line on the loss landscape (and what feature scaling does to it); logistic regression on 0/1 labels.
import { createChart } from '../../lib/viz/chart.js';
import { lineData, lsq, sse, r2, gd, sig, logData, logLoss, newton } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 10, SPS = 20;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const BEST = lsq(lineData()), LBEST = newton(logData());

export default {
  id: 'linear', title: 'Linear models', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { m: 0.3, c: 3, fit: false, outlier: false, lr: 0.01, scaled: false, w: 0.8, b: -4, lfit: false, separable: false },
  cases: [
    { id: 'least-squares', label: 'Least squares', controls: ['m', 'c', 'fit'], set: { m: 0.3, c: 3, fit: false, outlier: false }, examples: [
      { id: 'best', label: 'The least-squares line', set: { fit: true } },
      { id: 'flat', label: 'A flat line at the mean: R² = 0', set: { m: 0, c: 4.11 } },
      { id: 'outlier', label: 'One outlier pulls it', set: { fit: true, outlier: true } },
    ] },
    { id: 'gradient', label: 'Gradient descent', controls: ['lr', 'scaled'], set: { lr: 0.01, scaled: false, outlier: false }, examples: [
      { id: 'unstable', label: 'Step too large: it blows up', set: { lr: 0.032 } },
      { id: 'scaled', label: 'Scale the feature: six steps', set: { scaled: true, lr: 0.3 } },
    ] },
    { id: 'logistic', label: 'Logistic regression', controls: ['w', 'b', 'lfit'], set: { w: 0.8, b: -4, lfit: false, separable: false }, examples: [
      { id: 'lfit', label: 'Maximum likelihood fit', set: { lfit: true } },
      { id: 'separable', label: 'Perfectly separable data', set: { separable: true, w: 3, b: -15 } },
    ] },
  ],
  controls: [
    { title: 'Line y = m·x + c', show: (s) => s.case === 'least-squares', items: [
      { id: 'm', label: 'Slope m', unit: '', min: -1, max: 2, step: 0.01 }, { id: 'c', label: 'Intercept c', unit: '', min: -4, max: 8, step: 0.05 },
      { id: 'fit', label: 'Use the least-squares line', type: 'check' }, { id: 'outlier', label: 'Add an outlier', type: 'check' },
    ] },
    { title: 'Gradient descent', show: (s) => s.case === 'gradient', items: [
      { id: 'lr', label: 'Step size η', unit: '', min: 0.001, max: 1, log: true }, { id: 'scaled', label: 'Standardise x first', type: 'check' },
    ] },
    { title: 'p(y = 1) = σ(w·x + b)', show: (s) => s.case === 'logistic', items: [
      { id: 'w', label: 'Weight w', unit: '', min: -1, max: 5, step: 0.01 }, { id: 'b', label: 'Bias b', unit: '', min: -25, max: 5, step: 0.05 },
      { id: 'lfit', label: 'Use the best fit', type: 'check' }, { id: 'separable', label: 'Separable data', type: 'check' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    let nk = 0; const keys = new Set();
    const seg = (pts, o) => { const k = `g${nk++}${o.color}${o.width}`; keys.add(k); sq.line(k, pts.map((p) => p[0]), pts.map((p) => p[1]), o); };
    let path = null;
    return {
      changed() {
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); });
        if (state.case === 'gradient') path = gd(lineData(), state.lr, D * SPS, { scaled: state.scaled });
        ctx.setClock(state.case === 'gradient' ? D : 0);
      },
      update() {
        nk = 0; keys.forEach((k) => sq.hide(k));
        const c = state.case;
        if (c !== 'logistic') {
          const P = lineData({ outlier: c === 'least-squares' && state.outlier }), L = lsq(P), k = c === 'gradient' ? Math.min(path.length - 1, Math.floor(time.t * SPS)) : 0;
          const [m, b0] = c === 'gradient' ? path[k] : state.fit ? [L.m, L.c] : [state.m, state.c], n = P.length, E = sse(P, m, b0);
          sq.range([-1, 11], [-4, 8]); sq.titles('x', 'y');
          // the square built on each residual
          if (c === 'least-squares') for (const [x, y] of P) { const r = y - m * x - b0, s = Math.abs(r), dx = x; seg([[dx, y], [dx + s, y], [dx + s, y - r], [dx, y - r], [dx, y]], { color: '--c-north', width: 1 }); }
          for (const [x, y] of P) seg([[x, y], [x, m * x + b0]], { color: '--ink-dim', width: 1 });
          sq.dots('p', P.map((p) => p[0]), P.map((p) => p[1]), { color: '--c-B', size: 9 });
          sq.line('l', [-1, 11], [b0 - m, b0 + 11 * m], { color: '--c-E', width: 3 });
          if (c === 'least-squares') {
            const ms = lin(-1, 2, 151), my = P.reduce((s, p) => s + p[1], 0) / n, mx = P.reduce((s, p) => s + p[0], 0) / n;
            tr.range([-1, 2], [0, Math.max(...ms.map((q) => sse(P, q, my - q * mx))) * 1.05]); tr.titles('slope m', 'sum of squared residuals (best c for each m)');
            tr.line('s', ms, ms.map((q) => sse(P, q, my - q * mx)), { color: '--c-north', width: 2 }); tr.dots('q', [m], [E], { color: '--accent', size: 11 });
            const res = P.map(([x, y]) => y - m * x - b0), rm = Math.max(2, ...res.map(Math.abs)) * 1.1;
            br.range([-1, 11], [-rm, rm]); br.titles('x', 'residual y − (m·x + c)');
            br.stems('r', P.map((p) => p[0]), res, { color: '--c-north', width: 3 });
            const Sx = P.map((p, i) => [p[0], res[i] * res[i]]).sort((u, v) => u[0] - v[0]);
            plots.aux.draw({ xlim: [-1, 11], series: [{ x: Sx.map((q) => q[0]), y: Sx.map((q) => q[1]), color: '--c-north', label: 'squared residual of each point vs x: big ones dominate the sum' }] });
            hud.set('a', `line y = ${fmt(m)}·x ${b0 < 0 ? '−' : '+'} ${fmt(Math.abs(b0))}: sum of squared residuals ${fmt(E)} (the red squares' total area)`);
            hud.set('b', `R² = 1 − SSE/SST = ${fmt(r2(P, m, b0))}; best possible: m = ${fmt(L.m)}, c = ${fmt(L.c)}, SSE ${fmt(sse(P, L.m, L.c))}, R² ${fmt(r2(P, L.m, L.c))}`, Math.abs(m - L.m) < 1e-6 ? 'good' : '');
            hud.set('c', state.outlier ? 'the point at (9, −3) has a huge square: least squares bends the whole line to shrink it' : 'least squares: m = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)², c = ȳ − m·x̄');
          } else {
            const G = 60, ms = lin(-1, 2, G), cs = lin(-4, 8, G), v = new Float64Array(G * G);
            for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) v[j * G + i] = Math.log10(sse(P, ms[i], cs[j]) / n);
            const vmin = Math.min(...v), vmax = Math.max(...v);
            tr.range([-1, 2], [-4, 8]); tr.titles('slope m', 'intercept c: loss landscape (log), path of descent');
            tr.image('L', v, G, G, { map: 'viridis', norm: (q) => (q - vmin) / (vmax - vmin) });
            const pk = path.slice(0, k + 1).filter((p) => Math.abs(p[0]) < 3 && Math.abs(p[1]) < 12);
            tr.line('path', pk.map((p) => p[0]), pk.map((p) => p[1]), { color: '--c-north', width: 2 }); tr.dots('best', [L.m], [L.c], { color: '--accent', size: 10 });
            const ls = path.map((p) => Math.log10(Math.max(p[2], 1e-9)));
            br.range([0, D * SPS], [Math.min(-0.5, Math.floor(Math.min(...ls.filter(Number.isFinite)))), Math.min(6, Math.max(2, ...ls.filter(Number.isFinite)))]); br.titles('step', 'log₁₀ mean squared error');
            br.line('l', path.map((_, i) => i).slice(0, k + 1), ls.slice(0, k + 1), { color: '--c-v', width: 2 }); br.line('opt', [0, D * SPS], [Math.log10(sse(P, L.m, L.c) / n), Math.log10(sse(P, L.m, L.c) / n)], { color: '--ink-dim', dashed: true, width: 1 });
            plots.aux.draw({ xlim: [0, D * SPS], cursor: k, series: [{ x: path.map((_, i) => i), y: path.map((p) => p[0]), color: '--c-E', label: 'slope m during descent' }, { x: [0, D * SPS], y: [L.m, L.m], color: '--ink-dim', dash: [4, 3], label: 'least squares' }] });
            hud.set('a', `step ${k}: m = ${fmt(m)}, c = ${fmt(b0)}, mean squared error ${fmt(E / n)} (best ${fmt(sse(P, L.m, L.c) / n)})`, E / n > 1e3 ? 'bad' : '');
            hud.set('b', state.scaled ? 'x standardised (mean 0, spread 1): the loss bowl is round, every direction equally steep, one step size fits all' : 'raw x from 0 to 10: the bowl is a long narrow valley; steep across, nearly flat along it');
            hud.set('c', state.scaled ? 'big steps are safe: it lands on the least-squares line in a handful of steps' : `a step size safe across the valley (< ${fmt(2 / (2 * P.reduce((s, p) => s + p[0] * p[0], 0) / n), 2)}) crawls along it`);
          }
        } else {
          const P = logData({ separable: state.separable }), F = state.lfit && !state.separable ? newton(P) : { w: state.w, b: state.b }, { w, b } = F, xs = lin(0, 10, 201);
          sq.range([-0.5, 10.5], [-0.15, 1.15]); sq.titles('x', 'p(y = 1)');
          sq.dots('y0', P.filter((p) => !p[1]).map((p) => p[0]), P.filter((p) => !p[1]).map(() => 0), { color: '--c-B', size: 10 });
          sq.dots('y1', P.filter((p) => p[1]).map((p) => p[0]), P.filter((p) => p[1]).map(() => 1), { color: '--c-E', size: 10 });
          sq.line('p', xs, xs.map((x) => sig(w * x + b)), { color: '--c-v', width: 3 });
          const xb = -b / w; if (Math.abs(w) > 1e-6 && xb > -0.5 && xb < 10.5) sq.line('bd', [xb, xb], [-0.15, 1.15], { color: '--c-north', width: 1.4, dashed: true }); else sq.hide('bd');
          const ws = lin(-1, 5, 151);
          tr.range([-1, 5], [0, 3]); tr.titles('weight w (boundary kept at the same x)', 'average log loss');
          tr.line('L', ws, ws.map((q) => Math.min(3, logLoss(P, q, -q * (Math.abs(w) > 1e-6 ? xb : 5)))), { color: '--c-north', width: 2 }); tr.dots('q', [w], [Math.min(3, logLoss(P, w, b))], { color: '--accent', size: 11 });
          const per = P.map(([x, y]) => -Math.log(Math.max(1e-12, y ? sig(w * x + b) : 1 - sig(w * x + b))));
          br.range([-0.5, 10.5], [0, Math.max(1, ...per) * 1.1]); br.titles('x', 'each point’s loss −ln p(its own label)');
          br.stems('l0', P.filter((p) => !p[1]).map((p) => p[0]), per.filter((_, i) => !P[i][1]), { color: '--c-B', width: 3 }); br.stems('l1', P.filter((p) => p[1]).map((p) => p[0]), per.filter((_, i) => P[i][1]), { color: '--c-E', width: 3 });
          const acc = P.filter(([x, y]) => (sig(w * x + b) > 0.5) === !!y).length / P.length;
          plots.aux.draw({ xlim: [0, 10], series: [{ x: xs, y: xs.map((x) => w * x + b), color: '--c-F', label: 'the score w·x + b (log-odds): positive → class 1' }] });
          hud.set('a', `p(y = 1 | x) = σ(${fmt(w)}·x ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}); boundary p = ½ at x = ${fmt(xb)}`);
          hud.set('b', `average log loss ${fmt(logLoss(P, w, b))}, accuracy ${fmt(100 * acc)} %${state.lfit && !state.separable ? ' — the maximum-likelihood fit (Newton’s method)' : ` (best fit: w = ${fmt(LBEST.w)}, b = ${fmt(LBEST.b)}, loss ${fmt(logLoss(logData(), LBEST.w, LBEST.b))})`}`);
          hud.set('c', state.separable ? 'separable data: making the curve steeper always lowers the loss, so the best w is infinite — regularisation is needed' : 'the loss punishes confident mistakes hardest: −ln p grows without limit as p → 0');
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
