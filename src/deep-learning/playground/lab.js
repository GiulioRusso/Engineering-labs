// Network playground: an MLP trained live on a 2D dataset. Decision map with the data on the left; the
// network on the top right with what every hidden unit has learned (its own little map) and its weights;
// loss and accuracy over the epochs below.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { rng } from '../../lib/random.js';
import { createNet, forward, output, epoch, evaluate, params } from '../net/model.js';
import { DATASETS, dataset, split } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, -0.35, 3.5, 2.8], BR = [1.0, -2.35, 3.5, 1.35], // network diagram gets the larger box
  D = 20, EPS = 8, R = 1.5, G = 56, g = 20;
const DOPT = Object.entries(DATASETS);
// blue (class 0) to gold (class 1) through a dark middle, so the boundary shows
const tint = (p, o) => { o[0] = 0.12 + 0.68 * p; o[1] = 0.16 + 0.5 * p; o[2] = 0.45 - 0.3 * p; };

export default {
  id: 'playground', title: 'Network playground', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { data: 'xor', L: 1, U: 4, act: 'tanh', lr: 0.03, l2: 0, seed: 3 },
  cases: [
    { id: 'xor', label: 'XOR', controls: ['U', 'L', 'act'], set: { data: 'xor', L: 1, U: 4, act: 'tanh', lr: 0.03, l2: 0 }, examples: [
      { id: 'no-hidden', label: 'No hidden layer: a single line', set: { L: 0 } },
      { id: 'two', label: 'Two hidden units: barely', set: { U: 2 } },
    ] },
    { id: 'circles', label: 'Circles', controls: ['U', 'act'], set: { data: 'circles', L: 1, U: 4, act: 'tanh', lr: 0.03, l2: 0 }, examples: [
      { id: 'one', label: 'One hidden unit: still a line', set: { U: 1 } },
      { id: 'relu', label: 'ReLU: a polygon', set: { act: 'relu' } },
    ] },
    { id: 'spiral', label: 'Two spirals', controls: ['L', 'U', 'lr', 'l2'], set: { data: 'spiral', L: 2, U: 8, act: 'relu', lr: 0.01, l2: 0 }, examples: [
      { id: 'shallow', label: 'One layer of 8: not enough', set: { L: 1 } },
      { id: 'lr-high', label: 'Learning rate too high', set: { lr: 0.3 } },
      { id: 'l2', label: 'Weight decay: smoother edges', set: { l2: 0.003 } },
    ] },
  ],
  controls: [
    { title: 'Data', items: [{ id: 'data', label: 'Dataset', type: 'select', options: DOPT }] },
    { title: 'Network', items: [
      { id: 'L', label: 'Hidden layers', unit: '', min: 0, max: 3, step: 1 },
      { id: 'U', label: 'Units per layer', unit: '', min: 1, max: 8, step: 1, show: (s) => s.L > 0 },
      { id: 'act', label: 'Activation', type: 'segmented', options: [['tanh', 'tanh'], ['relu', 'ReLU'], ['sigmoid', 'sigmoid']] },
    ] },
    { title: 'Training (Adam, batches of 16)', items: [
      { id: 'lr', label: 'Learning rate', unit: '', min: 0.001, max: 0.5, log: true },
      { id: 'l2', label: 'Weight decay (L2)', unit: '', min: 0, max: 0.02, step: 0.0005 },
      { id: 'seed', label: 'Initial weights (seed)', unit: '', min: 1, max: 20, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 'epoch', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, grid: false }), br = createChart(ctx, { box: BR }), charts = [sq, br];
    // edges as plain segment curves, one per colour and thickness (a curve's style is fixed at creation)
    const EDGE = {}; for (const c of ['--c-B', '--c-north']) for (const w of [1, 2.2, 4]) EDGE[c + w] = createCurve(stage, { max: 400, width: w, color: c });
    const minis = new Map(); // layout → mini charts, one per hidden or output unit
    const lab = Array.from({ length: 6 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let N = null, X, Y, Xt, Yt, hist, r, st, cacheEp = -1, grid = null, P = null, shown = '';
    const sizes = () => [2, ...Array(Math.round(state.L)).fill(Math.round(state.U)), 1];
    const layout = () => { const s = sizes(), cols = s.length, cx = (l) => TR[0] + 0.25 + (TR[2] - 0.5) * l / (cols - 1), cell = Math.min(0.34, (TR[3] - 0.2) / Math.max(...s.slice(1)) - 0.06);
      return s.map((n, l) => Array.from({ length: n }, (_, j) => [cx(l), TR[1] + TR[3] / 2 + (j - (n - 1) / 2) * (cell + 0.06)])).map((col) => ({ col, cell })); };
    function reset() {
      P = dataset(state.data, 240, 1); [X, Y] = split(P); [Xt, Yt] = split(dataset(state.data, 240, 2));
      N = createNet(sizes(), { act: state.act, seed: Math.round(state.seed) }); r = rng(Math.round(state.seed)); st = {}; hist = []; cacheEp = -1;
      const e0 = evaluate(N, X, Y), t0 = evaluate(N, Xt, Yt); hist.push({ tr: e0, te: t0 });
    }
    return {
      changed() { reset(); ctx.setClock(D); charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); },
      update() {
        const target = Math.min(D * EPS, Math.floor(time.t * EPS));
        if (target < hist.length - 1) reset();
        while (hist.length - 1 < target) { epoch(N, X, Y, { lr: state.lr, l2: state.l2, opt: 'adam', state: st, r }); hist.push({ tr: evaluate(N, X, Y), te: evaluate(N, Xt, Yt) }); }
        const ep = hist.length - 1;
        if (ep !== cacheEp) { // the decision map and each unit's map, only when the weights changed
          cacheEp = ep; grid = { out: new Float64Array(G * G), units: [] };
          for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) grid.out[j * G + i] = output(N, [-R + 2 * R * (i + 0.5) / G, -R + 2 * R * (j + 0.5) / G])[0];
          const s = sizes(); for (let l = 1; l < s.length; l++) grid.units.push(Array.from({ length: s[l] }, () => new Float64Array(g * g)));
          for (let j = 0; j < g; j++) for (let i = 0; i < g; i++) { const F = forward(N, [-R + 2 * R * (i + 0.5) / g, -R + 2 * R * (j + 0.5) / g]); for (let l = 1; l < F.a.length; l++) F.a[l].forEach((v, u) => { grid.units[l - 1][u][j * g + i] = v; }); }
        }
        sq.range([-R, R], [-R, R]); sq.titles('x₁', 'x₂');
        sq.image('map', grid.out, G, G, { rgb: (k, o) => tint(grid.out[k], o) });
        for (const [key, S, c, sz] of [['a0', [X, Y], 0, 5], ['a1', [X, Y], 1, 5], ['b0', [Xt, Yt], 0, 3], ['b1', [Xt, Yt], 1, 3]]) { const I = S[0].filter((_, i) => S[1][i] === c); sq.dots(key, I.map((p) => p[0]), I.map((p) => p[1]), { color: c ? '--c-E' : '--c-B', size: sz }); }
        // the network: unit maps and weighted edges
        const Lay = layout(), lk = sizes().join('-');
        if (!minis.has(lk)) minis.set(lk, Lay.slice(1).flatMap(({ col, cell }) => col.map(([x, y]) => createChart(ctx, { box: [x - cell / 2, y - cell / 2, cell, cell], xTicks: false, yTicks: false, grid: false }))));
        if (shown !== lk) { for (const [k, m] of minis) m.forEach((c) => c.show(k === lk)); shown = lk; } // only this layout's unit maps
        const M = minis.get(lk); let m = 0;
        Lay.slice(1).forEach((L2, l) => L2.col.forEach((_, u) => { const v = grid.units[l][u], last = l === Lay.length - 2, act = last ? 'sigmoid' : state.act; M[m++].image('u', v, g, g, { rgb: (k, o) => tint(act === 'tanh' ? (v[k] + 1) / 2 : act === 'relu' ? Math.min(1, v[k] / 2) : v[k], o) }); }));
        const segs = {}; for (const k of Object.keys(EDGE)) segs[k] = [];
        const wmax = Math.max(1e-9, ...N.W.flatMap((w) => Array.from(w, Math.abs)));
        N.W.forEach((w, l) => { const A = Lay[l], B = Lay[l + 1], nin = A.col.length; B.col.forEach(([x1, y1], j) => A.col.forEach(([x0, y0], i) => { const v = w[j * nin + i], a = Math.abs(v) / wmax; if (a < 0.08) return; segs[(v >= 0 ? '--c-B' : '--c-north') + (a < 0.35 ? 1 : a < 0.7 ? 2.2 : 4)].push(x0 + (l ? B.cell / 2 : 0.06), y0, 0.01, x1 - B.cell / 2, y1, 0.01); })); });
        for (const k of Object.keys(EDGE)) EDGE[k].segments(segs[k]);
        Lay[0].col.forEach(([x, y], i) => { lab[i].element.textContent = `x${'₁₂'[i]}`; lab[i].position.set(x - 0.05, y, 0.02); lab[i].visible = true; });
        lab[2].element.textContent = 'output'; lab[2].position.set(Lay.at(-1).col[0][0], Lay.at(-1).col[0][1] + Lay.at(-1).cell / 2 + 0.15, 0.02); lab[2].visible = true;
        lab[3].element.textContent = 'weights: blue +, red −, thicker = stronger · squares: what each unit responds to'; lab[3].position.set(TR[0] + TR[2] / 2, TR[1] + TR[3] + 0.15, 0.02); lab[3].visible = true;
        // curves
        const eps = hist.map((_, i) => i), lmax = Math.max(0.8, ...hist.map((h) => Math.max(h.tr.loss, h.te.loss)));
        br.range([0, D * EPS], [0, Math.min(1.5, lmax * 1.05)]); br.titles('', 'loss: training (solid), test (dashed)');
        br.line('tr', eps, hist.map((h) => h.tr.loss), { color: '--c-v', width: 2 }); br.line('te', eps, hist.map((h) => h.te.loss), { color: '--c-I', dashed: true, width: 1.6 });
        plots.aux.draw({ xlim: [0, D * EPS], cursor: ep, ylim: [0.4, 1.02], series: [{ x: eps, y: hist.map((h) => h.tr.acc), color: '--c-v', label: 'training accuracy' }, { x: eps, y: hist.map((h) => h.te.acc), color: '--c-I', label: 'test accuracy' }] });
        const h = hist[ep];
        hud.set('a', `epoch ${ep}: training loss ${fmt(h.tr.loss)}, accuracy ${fmt(100 * h.tr.acc)} %; test (unseen points) ${fmt(100 * h.te.acc)} %`, h.te.acc > 0.95 ? 'good' : '');
        hud.set('b', `network ${sizes().join(' → ')}: ${params(N)} weights and biases; ${state.act}${state.l2 ? `, weight decay ${state.l2}` : ''}`);
        hud.set('c', state.L === 0 ? 'no hidden layer: one neuron, so the boundary is a straight line' : `each hidden unit draws one soft line (tanh/sigmoid) or a fold (ReLU); the next layer combines them`);
      },
      theme() { charts.forEach((c) => c.theme()); for (const m of minis.values()) m.forEach((c) => c.theme()); Object.values(EDGE).forEach((c) => c.theme()); },
    };
  },
};
