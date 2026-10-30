// Universal approximation: one hidden layer fitting a 1D function. The output (bold) is the sum of one
// piece per hidden unit (thin): ramps for ReLU, S-curves for tanh. Trained live with Adam.
import { createChart } from '../../lib/viz/chart.js';
import { rng } from '../../lib/random.js';
import { output } from '../net/model.js';
import { TARGETS, samples, makeNet, trainSteps, mse, piece, knee } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 15, SPS = 200, EVERY = 20;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const XS = lin(-1, 1, 201);

export default {
  id: 'approximation', title: 'Universal approximation', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { target: 'sine', H: 8, act: 'relu', lr: 0.02, pieces: true },
  cases: [
    { id: 'relu', label: 'ReLU pieces', controls: ['H', 'target'], set: { target: 'sine', H: 8, act: 'relu' }, examples: [
      { id: 'two', label: 'Two units: hopeless', set: { H: 2 } },
      { id: 'many', label: 'Thirty-two units: close', set: { H: 32 } },
      { id: 'abs', label: '|x| from three units: exact', set: { target: 'abs', H: 3 } },
      { id: 'bump', label: 'A bump from six units', set: { target: 'bump', H: 6 } },
    ] },
    { id: 'tanh', label: 'tanh pieces', controls: ['H', 'target'], set: { target: 'sine', H: 4, act: 'tanh' }, examples: [
      { id: 'step', label: 'A step: the S-curves get steep', set: { target: 'step', H: 8 } },
    ] },
  ],
  controls: [
    { title: 'Target', items: [{ id: 'target', label: 'Function to learn', type: 'segmented', options: Object.entries(TARGETS).map(([k, v]) => [k, v.label]) }] },
    { title: 'Network: 1 → H → 1', items: [
      { id: 'H', label: 'Hidden units H', unit: '', min: 1, max: 32, step: 1 },
      { id: 'act', label: 'Activation', type: 'segmented', options: [['relu', 'ReLU'], ['tanh', 'tanh']] },
      { id: 'lr', label: 'Learning rate (Adam)', unit: '', min: 0.001, max: 0.1, log: true },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'pieces', label: 'Each unit’s piece', type: 'check', color: '--c-B' }] }],
  plots: [{ id: 'aux', title: '', xLabel: 'x', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    let N, X, Y, st, r, done = 0, curve = [];
    const H = () => Math.round(state.H);
    function reset() { [X, Y] = samples(state.target); N = makeNet(H(), state.act); st = {}; r = rng(1); done = 0; curve = [[0, mse(N, X, Y)]]; }
    return {
      changed() { reset(); ctx.setClock(D); charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); },
      update() {
        const want = Math.min(D * SPS, Math.floor(time.t * SPS));
        if (want < done) reset();
        while (done < want) { const k = Math.min(EVERY, want - done); trainSteps(N, X, Y, k, { lr: state.lr, state: st, r }); done += k; curve.push([done, mse(N, X, Y)]); }
        const f = TARGETS[state.target].f, out = XS.map((x) => output(N, [x])[0]), e = mse(N, X, Y);
        sq.range([-1, 1], [-1.5, 1.5]); sq.titles('x', 'y: target (dashed), network (gold), one piece per unit (blue)');
        sq.line('t', XS, XS.map(f), { color: '--ink-dim', dashed: true, width: 1.6 });
        for (let j = 0; j < 32; j++) { if (j < H() && state.pieces) sq.line(`p${j}`, XS, XS.map((x) => { const v = piece(N, j, x); return Math.abs(v) <= 1.5 ? v : NaN; }), { color: '--c-B', width: 1 }); else sq.hide(`p${j}`); } // off-chart parts hidden, not clamped
        sq.line('o', XS, out, { color: '--c-E', width: 3 });
        const ks = Array.from({ length: H() }, (_, j) => knee(N, j)).filter((k) => Math.abs(k) <= 1);
        sq.dots('k', ks, ks.map(() => -1.42), { color: '--c-I', size: 8 });
        tr.range([0, D * SPS], [-6, 0.5]); tr.titles('training steps', 'log₁₀ mean squared error');
        tr.line('l', curve.map((c) => c[0]), curve.map((c) => Math.log10(Math.max(c[1], 1e-6))), { color: '--c-v', width: 2 });
        // where each unit bends (ReLU) or is centred (tanh), and how much it contributes there
        const bend = Array.from({ length: H() }, (_, j) => (state.act === 'relu' ? N.W[1][j] * Math.abs(N.W[0][j]) : N.W[1][j])), bm = Math.max(0.5, ...bend.map(Math.abs)) * 1.15;
        const K = Array.from({ length: H() }, (_, j) => knee(N, j)), keep = K.map((k) => Math.abs(k) <= 1);
        br.range([-1, 1], [-bm, bm]); br.titles('x', state.act === 'relu' ? 'each unit’s knee: change of slope v·|w| there' : 'each unit’s centre: output weight v');
        br.stems('b', K.filter((_, j) => keep[j]), bend.filter((_, j) => keep[j]), { color: '--c-I', width: 4 });
        plots.aux.draw({ xlim: [-1, 1], ylim: [-0.6, 0.6], series: [{ x: XS, y: out.map((o, i) => o - f(XS[i])), color: '--c-north', label: 'error: network − target' }] });
        const outside = K.length - ks.length;
        hud.set('a', `${done} steps: mean squared error ${fmt(e)} (${H()} units, ${3 * H() + 1} parameters)`, e < 1e-3 ? 'good' : '');
        hud.set('b', state.act === 'relu' ? `ReLU units: the output is a broken line with at most ${H()} corners${outside ? ` (${outside} of them now outside [−1, 1], wasted)` : ''}` : 'tanh units: each adds one smooth step; their sum can make any smooth shape');
        hud.set('c', 'universal approximation: with enough hidden units one layer can get as close as you like to any continuous function');
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
