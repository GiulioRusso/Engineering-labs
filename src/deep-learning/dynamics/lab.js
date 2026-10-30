// Deep networks at initialisation: the distribution of activations layer by layer (heat map of histograms),
// their spread, and the size of the gradient that reaches each layer. Static: change depth, activation
// and the weight scale.
import { createChart } from '../../lib/viz/chart.js';
import { INITS, probe } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], NB = 48;
const RANGE = { tanh: [-1, 1], sigmoid: [0, 1], linear: [-3, 3] };

export default {
  id: 'dynamics', title: 'Signals through deep networks', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { depth: 10, act: 'sigmoid', init: 'xavier' },
  cases: [
    { id: 'vanish', label: 'Vanishing gradients', controls: ['act', 'depth'], set: { act: 'sigmoid', init: 'xavier', depth: 10 }, examples: [
      { id: 'tanh', label: 'tanh: gradients get through', set: { act: 'tanh' } },
      { id: 'relu', label: 'ReLU with He weights', set: { act: 'relu', init: 'he' } },
      { id: 'deep', label: 'Sigmoid, 20 layers', set: { depth: 20 } },
    ] },
    { id: 'init', label: 'Weight initialisation', controls: ['init', 'act'], set: { act: 'tanh', init: 'xavier', depth: 10 }, examples: [
      { id: 'small', label: 'Too small: the signal dies', set: { init: 'small' } },
      { id: 'large', label: 'Too large: everything saturates', set: { init: 'large' } },
      { id: 'relu-xavier', label: 'ReLU with Xavier: halves each layer', set: { act: 'relu' } },
    ] },
  ],
  controls: [{ title: 'Network (64 units per layer)', items: [
    { id: 'depth', label: 'Layers', unit: '', min: 2, max: 20, step: 1 },
    { id: 'act', label: 'Activation', type: 'segmented', options: [['sigmoid', 'sigmoid'], ['tanh', 'tanh'], ['relu', 'ReLU'], ['linear', 'none']] },
    { id: 'init', label: 'Initial weights: std', type: 'select', options: Object.entries(INITS).map(([k, v]) => [k, v.label]) },
  ] }],
  plots: [{ id: 'aux', title: '', xLabel: 'layer', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    let P = null;
    return {
      changed() { P = probe({ depth: Math.round(state.depth), act: state.act, init: state.init }); charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); },
      update() {
        const depth = P.stats.length, Ls = P.stats.map((_, l) => l + 1);
        const [lo, hi] = RANGE[state.act] || [0, Math.max(1e-9, 3 * Math.max(...P.stats.map((s) => s.std)))];
        // one histogram per layer, each row normalised to its own peak
        const img = new Float64Array(NB * depth);
        P.stats.forEach((s, l) => { const row = new Float64Array(NB); for (const v of s.values) { const b = Math.floor((v - lo) / (hi - lo) * NB); if (b >= 0 && b < NB) row[b]++; else if (b >= NB) row[NB - 1]++; } const m = Math.max(...row) || 1; row.forEach((c, b) => { img[l * NB + b] = c / m; }); });
        sq.range([lo, hi], [0.5, depth + 0.5]); sq.titles('activation value', 'layer (1 = first, at the bottom): where the values are, row by row');
        sq.image('h', img, NB, depth, { map: 'magma', norm: (v) => Math.sqrt(v) });
        const ls = P.stats.map((s) => Math.log10(Math.max(s.std, 1e-12))), gs = P.grad.map((g) => Math.log10(Math.max(g, 1e-30)));
        tr.range([0.5, depth + 0.5], [Math.min(-1.5, Math.floor(Math.min(...ls))), 0.5]); tr.titles('layer', 'log₁₀ spread (std) of the activations');
        tr.line('s', Ls, ls, { color: '--c-E', width: 2 }); tr.dots('sd', Ls, ls, { color: '--c-E', size: 7 });
        br.range([0.5, depth + 0.5], [Math.floor(Math.min(...gs)) - 0.5, Math.ceil(Math.max(...gs)) + 0.5]); br.titles('layer', 'log₁₀ size of the weight gradient ‖∂L/∂W‖');
        br.line('g', Ls, gs, { color: '--c-v', width: 2 }); br.dots('gd', Ls, gs, { color: '--c-v', size: 7 });
        const bad = P.stats.map((s) => s.values.filter((v) => (state.act === 'relu' ? v === 0 : state.act === 'tanh' ? Math.abs(v) > 0.9 : state.act === 'sigmoid' ? v * (1 - v) < 0.2 : false)).length / s.values.length);
        plots.aux.draw({ xlim: [0.5, depth + 0.5], ylim: [0, 1], series: [{ x: Ls, y: bad, color: '--c-north', label: state.act === 'relu' ? 'fraction of units at exactly 0' : state.act === 'linear' ? '(no saturation without an activation)' : 'fraction of units saturated (slope < 0.2)' }] });
        const g0 = P.grad[0], gL = P.grad[depth - 1], s1 = P.stats[0].std, sL = P.stats[depth - 1].std;
        hud.set('a', `spread of the activations: layer 1 ${fmt(s1)}, layer ${depth} ${fmt(sL)}`, sL < 1e-3 ? 'bad' : '');
        hud.set('b', `gradient at layer 1 / gradient at layer ${depth} = ${fmt(g0 / gL)}${g0 / gL < 1e-2 ? ': the first layers barely learn' : g0 / gL > 100 ? ': the first layers get huge steps' : ': balanced'}`, g0 / gL < 1e-2 || g0 / gL > 100 ? 'bad' : 'good');
        hud.set('c', state.act === 'sigmoid' ? 'sigmoid slope ≤ 0.25: each layer multiplies the gradient by a quarter or less' : state.act === 'relu' ? (state.init === 'he' ? 'He: variance 2/n makes up for ReLU zeroing half the values' : 'ReLU zeroes half the values: weights need variance 2/n (He), not 1/n') : state.init === 'xavier' ? 'Xavier: variance 1/n keeps each layer’s output as spread as its input' : 'the weight scale decides whether the signal grows, shrinks or saturates');
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
