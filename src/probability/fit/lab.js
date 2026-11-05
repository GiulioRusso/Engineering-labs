// Fitting a line by least squares: drag the line's two ends; each residual is drawn as a real square,
// and the best line is the one with the least total area. The error bowl over (slope, intercept) shows
// why there is exactly one best line, and gradient descent can slide down to it.
import { createChart } from '../../lib/viz/chart.js';
import { createKnob } from '../../lib/viz/knob.js';
import { lin, mean, fmt } from '../core/model.js';
import { points, sse, descent, linfit } from './model.js';

const SQ = [-4.6, -2.35, 5.4, 4.6], TR = [1.4, 0.55, 3.1, 1.9], BR = [1.4, -2.35, 3.1, 1.9];
const XR = [0, 10], YR = [-1, 13], AR = [-4, 8], BRG = [-0.4, 1.6], NX = 60, NY = 40, X1 = 1, X2 = 9;
const end = (k, kind) => { const P = points(kind), F = linfit(P.x, P.y); return F.a + F.b * k; };

export default {
  id: 'fit', title: 'Least squares', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { data: 'clean', yl: 6, yr: 4, gd: false },
  cases: [
    { id: 'lsq', label: 'Least squares', set: {}, examples: [
      { id: 'best', label: 'The best line', set: { data: 'clean', yl: end(X1, 'clean'), yr: end(X2, 'clean'), gd: false } },
      { id: 'descent', label: 'Gradient descent finds it', set: { data: 'clean', yl: 7, yr: 4, gd: true } },
      { id: 'outlier', label: 'One outlier pulls the line', set: { data: 'outlier', yl: end(X1, 'outlier'), yr: end(X2, 'outlier'), gd: false } },
      { id: 'curve', label: 'Curved data: residuals tell', set: { data: 'curve', yl: end(X1, 'curve'), yr: end(X2, 'curve'), gd: false } },
    ] },
  ],
  controls: [
    { title: 'Data', items: [{ id: 'data', label: 'Points', type: 'segmented', options: [['clean', 'A line + noise'], ['outlier', 'One outlier'], ['curve', 'A curve']] }] },
    { title: 'Your line (or drag its two ends)', items: [
      { id: 'yl', label: `Height at x = ${X1}`, unit: '', min: -1, max: 13, step: 0.05 }, { id: 'yr', label: `Height at x = ${X2}`, unit: '', min: -1, max: 13, step: 0.05 },
      { id: 'gd', label: 'Let gradient descent move it', type: 'check', color: '--c-v' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene, handles } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR, grid: false }), br = createChart(ctx, { box: BR }), all = [sq, tr, br];
    sq.range(XR, YR);
    const knobs = [createKnob(scene, '--accent', 0.11), createKnob(scene, '--accent', 0.11)];
    const toY = (wy) => YR[0] + (wy - SQ[1]) / SQ[3] * (YR[1] - YR[0]), clamp = (v) => Math.max(YR[0], Math.min(YR[1], v));
    knobs.forEach((k, i) => handles.add({ object: k.group, axes: 'y', hint: 'Drag the line', get: () => k.get(), set: ([, y]) => { state[i ? 'yr' : 'yl'] = clamp(toY(y)); state.gd = false; ctx.setClock(0); ctx.requestUpdate(); ctx.panelSync(); } }));
    let C = { key: '' };
    const D = 8, side = (SQ[3] / (YR[1] - YR[0])) / (SQ[2] / (XR[1] - XR[0]));   // x units per y unit, so squares look square

    return {
      changed() { all.forEach((k) => k.show(true)); ctx.setClock(state.gd ? D : 0); },
      update() {
        all.forEach((k) => k.clear());
        const key = `${state.data}`;
        if (C.key !== key) {
          const P = points(state.data), F = linfit(P.x, P.y), v = new Array(NX * NY);
          for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) v[j * NX + i] = Math.log(sse(P, AR[0] + (AR[1] - AR[0]) * (j + 0.5) / NY, BRG[0] + (BRG[1] - BRG[0]) * (i + 0.5) / NX));
          C = { key, P, F, v, lo: Math.min(...v), hi: Math.max(...v) };
        }
        const { P, F } = C;
        let b = (state.yr - state.yl) / (X2 - X1), a = state.yl - b * X1, path = null;
        if (state.gd) { path = descent(P, a, b); const u = Math.min(1, time.t / D), k = Math.round((path.length - 1) * u * u); [a, b] = path[k]; path = path.slice(0, k + 1); }
        const fit = P.x.map((x) => a + b * x), res = P.y.map((y, i) => y - fit[i]), E = sse(P, a, b), Eb = sse(P, F.a, F.b);
        // the points, the squares, the lines
        sq.titles('x', 'y: each residual drawn as a square; the best line (green) has the least total area');
        res.forEach((r, i) => { const x0 = P.x[i], y0 = fit[i], s = Math.abs(r) * side; sq.line(`q${i}`, [x0, x0 + s, x0 + s, x0, x0], [y0, y0, P.y[i], P.y[i], y0], { color: '--c-I', width: 1.6 }); sq.line(`r${i}`, [x0, x0], [y0, P.y[i]], { color: '--c-north', width: 2 }); });
        sq.line('best', XR, XR.map((x) => F.a + F.b * x), { color: '--c-v', width: 1.8, dashed: true });
        sq.line('mine', XR, XR.map((x) => a + b * x), { color: '--c-B', width: 2.6 });
        sq.dots('p', P.x, P.y, { color: '--ink', size: 9 }); sq.dots('c', [mean(P.x)], [mean(P.y)], { color: '--c-v', size: 12 });
        knobs.forEach((k, i) => k.set([sq.mx(i ? X2 : X1), sq.my(a + b * (i ? X2 : X1)), 0.03]));
        // the error bowl over (slope, intercept)
        tr.range(BRG, AR); tr.titles('slope b', 'intercept a: total squared error, dark = small');
        tr.image('bowl', C.v, NX, NY, { map: 'magma', norm: (x) => 1 - (x - C.lo) / (C.hi - C.lo) });
        if (path) tr.line('path', path.map((p) => p[1]), path.map((p) => p[0]), { color: '--c-v', width: 1.6 });
        tr.dots('best', [F.b], [F.a], { color: '--c-v', size: 10 }); tr.dots('me', [Math.max(BRG[0], Math.min(BRG[1], b))], [Math.max(AR[0], Math.min(AR[1], a))], { color: '--accent', size: 11 });   // pinned to the edge when off the map
        // residuals
        br.range(XR, [-7, 7]); br.titles('x', 'residual y − line: yours (stems) and the best line (dots)');
        br.stems('r', P.x, res, { color: '--c-north', width: 3 }); br.dots('rb', P.x, F.res, { color: '--c-v', size: 7 });
        const bs = lin(BRG[0], BRG[1], 120), mx = mean(P.x), my = mean(P.y);
        plots.aux.draw({ xlim: BRG, cursor: b, series: [{ x: bs, y: bs.map((s) => sse(P, my - s * mx, s)), color: '--c-I', label: 'least total area for each slope: a parabola with one minimum' }] });
        const big = Math.max(...F.res.map((r) => r * r));
        hud.set('a', `your line y = ${fmt(a)} ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}x: total square area ${fmt(E)}, ${fmt(E / Eb)} × the least possible`, E / Eb < 1.02 ? 'good' : '');
        hud.set('b', `best line y = ${fmt(F.a)} ${F.b < 0 ? '−' : '+'} ${fmt(Math.abs(F.b))}x (SSE ${fmt(Eb)}, r² = ${fmt(F.r2)}): it passes through the mean point (green dot), and its residuals add up to 0`);
        hud.set('c', state.data === 'outlier' ? `the outlier's square is ${fmt(100 * big / Eb, 2)} % of the total area: squaring punishes big misses, so one point drags the line` : state.data === 'curve' ? 'curved data: the best straight line still misses in a pattern (residuals +, −, +): fit a curve instead' : 'b = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)², a = ȳ − b·x̄: setting both slopes of the bowl to zero', state.data === 'clean' ? '' : 'bad');
      },
      theme() { all.forEach((k) => k.theme()); knobs.forEach((k) => k.theme()); },
    };
  },
};
