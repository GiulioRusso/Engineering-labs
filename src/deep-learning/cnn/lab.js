// Convolution on handwritten digits: a 3×3 kernel sliding over a digit (edges, blur, sharpen), and a small
// CNN trained live, showing its learned 5×5 filters and the feature maps they produce.
import { createChart } from '../../lib/viz/chart.js';
import { rng } from '../../lib/random.js';
import { digits, makeNet, OPT, confusion } from '../mnist/model.js';
import { epoch } from '../net/model.js';
import { S, F, C, KERNELS, conv3, createCNN, cnnForward, cnnBackward, zerosCNN, cnnUpdate, cnnPredict, cnnParams } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 16, RATE = 1500, LR = 0.005;
const flip = (x, n) => { const v = new Float64Array(n * n); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) v[(n - 1 - r) * n + c] = x[r * n + c]; return v; };
const grey = (v) => (k, o) => { const g = 0.06 + 0.9 * Math.max(0, Math.min(1, v[k])); o[0] = g; o[1] = g; o[2] = g; };
const diverge = (v, m) => (k, o) => { const t = Math.max(-1, Math.min(1, v[k] / (m || 1))); o[0] = t > 0 ? 0.1 + 0.85 * t : 0.1; o[1] = t > 0 ? 0.1 + 0.65 * t : 0.1 + 0.3 * -t; o[2] = t < 0 ? 0.12 + 0.85 * -t : 0.12; };
// n×n values as (n·f)×(n·f) blocks, so the chart's smooth scaling keeps sharp cells
const blow = (v, n, f = 6) => { const o = new Float64Array(n * n * f * f); for (let j = 0; j < n * f; j++) for (let i = 0; i < n * f; i++) o[j * n * f + i] = v[Math.floor(j / f) * n + Math.floor(i / f)]; return o; };
let MLP = null; // reference: the 32-unit MLP's test accuracy after each epoch (computed once)
const mlpCurve = () => { if (!MLP) { const { X, Y, Xt, Yt } = digits(), n = makeNet(32), st = {}, r = rng(1); MLP = [0.1]; for (let e = 1; e <= D * RATE / 3000; e++) { epoch(n, X, Y, { ...OPT, state: st, r }); MLP.push(confusion(n, Xt, Yt).acc); } } return MLP; };

export default {
  id: 'cnn', title: 'Convolution on digits', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { kernel: 'vertical', idx: 0, K: '6' },
  cases: [
    { id: 'kernels', label: 'A kernel sliding over a digit', controls: ['kernel', 'idx'], set: { kernel: 'vertical', idx: 0 }, examples: [
      { id: 'horizontal', label: 'Horizontal edges', set: { kernel: 'horizontal' } },
      { id: 'blur', label: 'Blur: averaging neighbours', set: { kernel: 'blur' } },
      { id: 'sharpen', label: 'Sharpen', set: { kernel: 'sharpen' } },
    ] },
    { id: 'learned', label: 'A CNN learns its own filters', controls: ['K', 'idx'], set: { K: '6', idx: 0 }, examples: [
      { id: 'two', label: 'Only two filters', set: { K: '2' } },
    ] },
  ],
  controls: [
    { title: 'Kernel (3×3)', show: (s) => s.case === 'kernels', items: [{ id: 'kernel', label: 'Kernel', type: 'select', options: Object.entries(KERNELS).map(([k, v]) => [k, v.label]) }] },
    { title: 'CNN: 5×5 filters → ReLU → max-pool → dense → 10', show: (s) => s.case === 'learned', items: [{ id: 'K', label: 'Filters', type: 'segmented', options: [['2', '2'], ['6', '6']] }] },
    { title: 'Digit', items: [{ id: 'idx', label: 'Test digit #', unit: '', min: 0, max: 999, step: 1 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 16 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    // learned case: 6 filter squares, 6 feature-map squares, one input square, inside the left box
    const cell = 0.66, gap = 0.12, x0 = SQ[0] + 0.1, small = (row) => Array.from({ length: 6 }, (_, k) => createChart(ctx, { box: [x0 + k * (cell + gap), SQ[1] + SQ[3] - (row + 1) * (cell + 0.55), cell, cell], xTicks: false, yTicks: false, grid: false }));
    const FIL = small(0), MAP = small(1), INP = createChart(ctx, { box: [x0, SQ[1] + 0.1, 1.9, 1.9], xTicks: false, yTicks: false, grid: false }), extra = [...FIL, ...MAP, INP];
    let N = null, st, r, seen = 0, pos = 0, order = [], hist = [], losses = [], Cm = null;
    function reset() { N = createCNN(Number(state.K), 1); st = {}; r = rng(1); seen = 0; pos = 0; order = []; hist = [{ ep: 0, acc: 0.1 }]; losses = []; Cm = Array.from({ length: 10 }, () => new Array(10).fill(0)); }
    return {
      changed() {
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); extra.forEach((c) => c.show(state.case === 'learned'));
        if (state.case === 'learned') { sq.show(false); reset(); mlpCurve(); ctx.setClock(D); } else ctx.setClock(0);
      },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; });
        const { X, Y, Xt, Yt } = digits(), x = Xt[Math.round(state.idx)];
        if (state.case === 'kernels') {
          const K = KERNELS[state.kernel], y = conv3(x, K.k), m = Math.max(1e-9, ...y.map(Math.abs));
          sq.range([0, S], [0, S]); sq.titles(`input: test digit #${Math.round(state.idx)} (14 × 14)`, '');
          sq.image('in', flip(x, S), S, S, { rgb: grey(flip(x, S)) });
          tr.range([-1.5, 1.5], [-1.5, 1.5]); tr.titles('', `${K.label}: the 3×3 weights (gold +, blue −)`);
          const kv = blow(flip(K.k, 3), 3, 10), km = Math.max(...K.k.map(Math.abs)); tr.image('k', kv, 30, 30, { rgb: diverge(kv, km) });
          K.k.forEach((w, i) => text(fmt(w, 2), tr.mx(-1 + (i % 3)), tr.my(1 - Math.floor(i / 3))));
          br.range([0, S], [0, S]); br.titles('', 'output: Σ weights × the 3×3 patch under them, at every position');
          br.image('out', flip(y, S), S, S, { rgb: diverge(flip(y, S), m) });
          const cs = Array.from({ length: S }, (_, c) => c);
          plots.aux.draw({ xlim: [0, S - 1], series: [{ x: cs, y: cs.map((c) => x[7 * S + c]), color: '--ink-dim', label: 'row 7 of the input' }, { x: cs, y: cs.map((c) => y[7 * S + c] / m), color: '--c-E', label: 'row 7 of the output (scaled)' }] });
          hud.set('a', `each output pixel = the 9 weights times the 9 input pixels around it; the same 9 weights everywhere`);
          hud.set('b', state.kernel === 'vertical' ? 'left side negative, right side positive: responds where ink starts or stops going left to right — vertical strokes light up' : state.kernel === 'horizontal' ? 'top negative, bottom positive: responds to horizontal strokes (tops and bottoms of loops)' : state.kernel === 'blur' ? 'all weights positive, summing to 1: each pixel becomes the average of its neighbourhood' : state.kernel === 'sharpen' ? '5 in the middle, −1 around: boosts a pixel against its neighbours, edges get crisper' : state.kernel === 'identity' ? 'only the centre: the output is the input' : 'responds to strokes along one diagonal');
          hud.set('c', `9 weights instead of 196 × 196 = 38 416 for a dense layer of the same size: convolution shares weights across positions`);
        } else {
          const want = Math.min(D * RATE, Math.floor(time.t * RATE));
          if (want < seen) reset();
          let budget = 3;
          while (seen < want && budget-- > 0) {
            if (pos === 0) { order = Array.from(X, (_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } }
            const B = order.slice(pos, pos + 32), G = zerosCNN(N); let l = 0;
            for (const i of B) l += cnnBackward(N, X[i], Y[i], G).loss;
            cnnUpdate(N, G, B.length, LR, st); losses.push([seen / X.length, l / B.length]); pos += 32; seen += B.length;
            if (pos >= X.length) { pos = 0; const C2 = Array.from({ length: 10 }, () => new Array(10).fill(0)); let hit = 0; Xt.forEach((q, i) => { const k = cnnPredict(N, q).k; C2[Yt[i]][k]++; hit += k === Yt[i]; }); Cm = C2; hist.push({ ep: hist.length, acc: hit / Xt.length }); }
          }
          const f = cnnForward(N, x), K = N.K, P = cnnPredict(N, x);
          FIL.forEach((c, k) => { if (k >= K) { c.clear(); return; } const w = blow(flip(N.w.subarray(k * 25, k * 25 + 25), F), F), m = Math.max(...w.map(Math.abs)); c.range([0, 1], [0, 1]); c.image('w', w, F * 6, F * 6, { rgb: diverge(w, m) }); });
          MAP.forEach((c, k) => { if (k >= K) { c.clear(); return; } const z = flip(f.z.subarray(k * C * C, (k + 1) * C * C), C), m = Math.max(1e-9, ...z); c.range([0, 1], [0, 1]); c.image('z', z, C, C, { rgb: grey(z.map((v) => v / m)) }); });
          INP.range([0, 1], [0, 1]); INP.image('x', flip(x, S), S, S, { rgb: grey(flip(x, S)) });
          text('learned 5×5 filters (gold +, blue −)', SQ[0] + SQ[2] / 2 - 0.4, SQ[1] + SQ[3] - 0.4);
          text('their feature maps for this digit (after ReLU)', SQ[0] + SQ[2] / 2 - 0.4, SQ[1] + SQ[3] - 1.61);
          text(`input #${Math.round(state.idx)}: it says ${P.k} (${Math.round(100 * P.p[P.k])} %)`, x0 + 2.9, SQ[1] + 1.05);
          const ref = mlpCurve(), E = D * RATE / X.length;
          tr.range([0, E], [0, 1]); tr.titles('epoch', `test accuracy: CNN, ${cnnParams(N)} params (orange); MLP, 6634 params (dashed)`);
          tr.line('mlp', ref.map((_, i) => i), ref, { color: '--ink-dim', dashed: true, width: 1.4 });
          tr.line('cnn', hist.map((h) => h.ep), hist.map((h) => h.acc), { color: '--c-I', width: 2.2 }); tr.dots('cd', hist.map((h) => h.ep), hist.map((h) => h.acc), { color: '--c-I', size: 7 });
          br.range([-0.5, 9.5], [-0.5, 9.5]); br.titles('predicted digit', 'true digit: confusion matrix');
          const v = new Float64Array(100); Cm.forEach((row, t) => row.forEach((n, p) => { v[t * 10 + p] = n / 100; })); br.image('conf', blow(v, 10), 60, 60, { map: 'magma', norm: (q) => Math.sqrt(q) });
          const sm = losses.map((_, i) => { const a = losses.slice(Math.max(0, i - 15), i + 1); return a.reduce((s, q) => s + q[1], 0) / a.length; });
          plots.aux.draw({ xlim: [0, E], ylim: [0, 2.5], series: [{ x: losses.map((q) => q[0]), y: sm, color: '--c-I', label: 'training loss (smoothed) vs epoch' }] });
          const h = hist.at(-1);
          hud.set('a', `epoch ${fmt(seen / X.length, 2)}: test accuracy ${fmt(100 * h.acc)} % (after epoch ${h.ep}); the MLP reference reaches ${fmt(100 * ref[Math.min(ref.length - 1, h.ep)])} % at the same point`);
          hud.set('b', `${K} filters × 26 weights + ${K * 25} pooled features × 10 + 10 = ${cnnParams(N)} parameters, a quarter of the MLP's`);
          hud.set('c', 'each filter looks for one local pattern anywhere in the image; the maps show where it found it');
        }
      },
      theme() { charts.forEach((c) => c.theme()); extra.forEach((c) => c.theme()); },
    };
  },
};
