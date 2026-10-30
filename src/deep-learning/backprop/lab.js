// Backpropagation on a drawn 2 → 2 → 1 network: values flow forward, gradients flow back, weights update,
// one training step every few seconds. Then mini-batches: noisy but cheap steps across the loss landscape.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { blobs, logLoss } from '../neuron/model.js';
import { train, flat, sgd, gradNoise } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const ease = (u) => Math.max(0, Math.min(1, u));
// the drawing: inputs, hidden units, output, loss
const NX = [[-4.1, 1.1], [-4.1, -1.1]], NH = [[-2.5, 1.1], [-2.5, -1.1]], NO = [-0.9, 0], NL = [0.15, 0], RAD = 0.32, CYCLE = 4, STEPS = 4;
const BLOBS = blobs(), W = 4;

export default {
  id: 'backprop', title: 'Backpropagation', size: 4.4, ortho: true, plain: true, cam: 'top', duration: CYCLE * STEPS, loop: false,
  defaults: { x1: 1, x2: -0.5, y: 1, lr: 0.5, B: 8, lrb: 0.5 },
  cases: [
    { id: 'backprop', label: 'Forward and backward', set: {}, examples: [
      { id: 'leap', label: 'η = 2.5: one big leap per step', controls: ['lr'], set: { lr: 2.5 } },
      { id: 'zero', label: 'x₁ = 0: its weights get no gradient', controls: ['x1'], set: { x1: 0 } },
      { id: 'target0', label: 'Target 0: everything reverses', controls: ['y'], set: { y: 0 } },
    ] },
    { id: 'minibatch', label: 'Mini-batches', set: {}, examples: [
      { id: 'one', label: 'B = 1: pure SGD, a wobbly walk', controls: ['B'], set: { B: 1 } },
      { id: 'all', label: 'B = 80: the full gradient', controls: ['B'], set: { B: 80 } },
    ] },
  ],
  controls: [
    { title: 'Example', show: (s) => s.case === 'backprop', items: [
      { id: 'x1', label: 'Input x₁', unit: '', min: -2, max: 2, step: 0.05 }, { id: 'x2', label: 'Input x₂', unit: '', min: -2, max: 2, step: 0.05 },
      { id: 'y', label: 'Target y', type: 'segmented', options: [[1, '1'], [0, '0']] }, { id: 'lr', label: 'Learning rate η', unit: '', min: 0.05, max: 3, log: true },
    ] },
    { title: 'Mini-batches', show: (s) => s.case === 'minibatch', items: [
      { id: 'B', label: 'Batch size B', unit: 'points', min: 1, max: 80, log: true }, { id: 'lrb', label: 'Learning rate η', unit: '', min: 0.05, max: 2, log: true },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pos = createCurve(stage, { max: 400, width: 2.6, color: '--c-B' }), neg = createCurve(stage, { max: 400, width: 2.6, color: '--c-north' }), ring = createCurve(stage, { max: 2000, width: 1.6, color: '--ink-dim' }), net = [pos, neg, ring];
    const pool = Array.from({ length: 40 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    const circle = (out, [cx, cy], r) => { for (let i = 0; i < 40; i++) { const a = 2 * Math.PI * i / 40, b = 2 * Math.PI * (i + 1) / 40; out.push(cx + r * Math.cos(a), cy + r * Math.sin(a), 0.01, cx + r * Math.cos(b), cy + r * Math.sin(b), 0.01); } };
    // edge from a to b, trimmed to the node circles; the point at fraction u along it
    const edge = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d; return [a[0] + RAD * ux, a[1] + RAD * uy, b[0] - RAD * ux, b[1] - RAD * uy]; };
    const at = (e, u) => [e[0] + (e[2] - e[0]) * u, e[1] + (e[3] - e[1]) * u];
    let T = null, tk = '', S = null, sk = '', land = null, noise = null;
    const bs = lin(0, Math.log10(80), 30);
    return {
      changed() { const bp = state.case === 'backprop'; charts.forEach((k) => { k.show(false); k.show(true); }); if (bp) sq.show(false); net.forEach((o) => { o.object.visible = bp; }); ctx.setClock(bp ? CYCLE * STEPS : 10); },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; });
        if (state.case === 'backprop') {
          const x = [state.x1, state.x2], y = Number(state.y), key = `${x},${y},${state.lr}`; if (key !== tk) { tk = key; T = train(x, y, state.lr, 40); }
          const k = Math.min(STEPS - 1, Math.floor(time.t / CYCLE)), ph = time.t - k * CYCLE, s = T[k], nx = T[k + 1];
          // phases: forward 0–1.4 s, loss 1.4–1.8, backward 1.8–3.2, update 3.2–4 (weights glide to their new values)
          const fw = ph < 1.4, back = ph >= 1.8 && ph < 3.2, upd = ph >= 3.2, g = ease((ph - 3.2) / 0.8);
          const p = upd ? { W: s.p.W.map((w, j) => w.map((v, i) => v + (nx.p.W[j][i] - v) * g)), v: s.p.v.map((v, j) => v + (nx.p.v[j] - v) * g) } : s.p;
          const E1 = [], E2 = []; NX.forEach((a, i) => NH.forEach((b, j) => E1.push({ e: edge(a, b), w: p.W[j][i], g: s.gW[j][i], j, i }))); NH.forEach((a, j) => E2.push({ e: edge(a, NO), w: p.v[j], g: s.gv[j], j }));
          const P = [], N = [], C = [];
          for (const { e, w } of [...E1, ...E2]) (w >= 0 ? P : N).push(e[0], e[1], 0.01, e[2], e[3], 0.01);
          [...NX, ...NH, NO].forEach((n) => circle(C, n, RAD)); C.push(NO[0] + RAD, 0, 0.01, NL[0] - 0.2, 0, 0.01);
          pos.segments(P); neg.segments(N); ring.segments(C);
          for (const { e, w, g: gw } of [...E1, ...E2]) { const [mx, my] = at(e, E1.some((q) => q.e === e) ? 0.22 : 0.5); text(back || upd ? `∂L/∂w ${fmt(gw, 2)}` : `w ${fmt(w, 2)}`, mx, my + 0.13); }
          // node values: shown once the forward pass reaches them
          NX.forEach((n, i) => text(`x${'₁₂'[i]} = ${fmt(x[i], 2)}`, n[0] - 0.85, n[1]));
          NH.forEach((n, j) => text(ph > 0.7 || k > 0 ? `h${'₁₂'[j]} = ${fmt(s.h[j], 2)}` : `h${'₁₂'[j]}`, n[0], n[1] - 0.5));
          text(ph > 1.4 || k > 0 ? `p = ${fmt(s.o, 3)}` : 'p', NO[0], NO[1] - 0.5); text(ph > 1.4 || k > 0 ? `L = ${fmt(s.L, 3)}` : 'L', NL[0] + 0.15, NL[1] + 0.2);
          text('tanh', NH[0][0], NH[0][1]); text('tanh', NH[1][0], NH[1][1]); text('σ', NO[0], NO[1]);
          if (back) text(`δ = p − y = ${fmt(s.dOut, 2)}`, NO[0], NO[1] + 0.55);
          // pulses: blue forward along each layer in turn, red backward
          sq.range([SQ[0], SQ[0] + SQ[2]], [SQ[1], SQ[1] + SQ[3]]);
          const pulse = (L, u) => L.map(({ e }) => at(e, u)), fpts = fw ? (ph < 0.7 ? pulse(E1, ph / 0.7) : pulse(E2, (ph - 0.7) / 0.7)) : [];
          const bpts = back ? (ph < 2.5 ? pulse(E2, 1 - (ph - 1.8) / 0.7) : pulse(E1, 1 - (ph - 2.5) / 0.7)) : [];
          sq.dots('f', fpts.map((q) => q[0]), fpts.map((q) => q[1]), { color: '--c-B', size: 12 }); sq.dots('b', bpts.map((q) => q[0]), bpts.map((q) => q[1]), { color: '--c-north', size: 12 });
          const n = T.length - 1, idx = T.map((_, i) => i);
          tr.range([0, n], [0, 1]); tr.titles('training step', 'output p (target dashed)'); tr.line('o', idx.slice(0, k + 1), T.slice(0, k + 1).map((q) => q.o), { color: '--c-B' }); tr.line('t', [0, n], [y, y], { color: '--ink-dim', dashed: true, width: 1 }); tr.dots('q', [k], [s.o], { color: '--accent', size: 11 });
          const G = flat(s), m = Math.max(0.05, ...G.map(Math.abs)) * 1.1;
          br.range([0.5, 9.5], [-m, m]); br.titles('parameter: 1–4 W, 5–6 b, 7–8 v, 9 c', '∂L/∂parameter at this step'); br.stems('g', lin(1, 9, 9), G, { color: '--c-north', width: 10 });
          const phase = fw ? 'forward pass: each unit computes its value from the left' : ph < 1.8 ? 'loss: how wrong is p for target y' : back ? 'backward pass: the error travels right to left, multiplied along the way' : 'update: every weight takes a step w ← w − η ∂L/∂w';
          hud.set('a', `step ${k + 1}: ${phase}`, back ? 'bad' : upd ? 'good' : '');
          hud.set('b', `chain rule: ∂L/∂w₁₁ = (p − y) · v₁ · (1 − h₁²) · x₁ = ${fmt(s.dOut, 2)} · ${fmt(s.p.v[0], 2)} · ${fmt(1 - s.h[0] ** 2, 2)} · ${fmt(x[0], 2)} = ${fmt(s.gW[0][0], 3)}`);
          hud.set('c', 'one backward pass gives every gradient for about the cost of one forward pass: that is why deep nets can be trained');
          plots.aux.draw({ xlim: [0, n], cursor: k, series: [{ x: idx, y: T.map((q) => q.L), color: '--c-north', label: 'loss L vs training step (same example every step)' }] });
        } else {
          const B = Math.max(1, Math.round(state.B)), key = `${B},${state.lrb}`, steps = 150; if (key !== sk) { sk = key; S = { mb: sgd(BLOBS, B, state.lrb, steps), full: sgd(BLOBS, BLOBS.length, state.lrb, steps) }; }
          const k = Math.min(steps, Math.floor(Math.min(1, time.t / 9.5) * steps)), n = 60;
          if (!land) { const img = new Float64Array(n * n); let lo = Infinity, hi = -Infinity; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const L = logLoss(BLOBS, -W + 2 * W * (i + 0.5) / n, -W + 2 * W * (j + 0.5) / n, 0); img[j * n + i] = L; lo = Math.min(lo, L); hi = Math.max(hi, L); } land = { img, lo, hi }; }
          sq.range([-W, W], [-W, W]); sq.titles('weight w₁', 'weight w₂: loss on all the data (dark = low)'); sq.image('L', land.img, n, n, { map: 'magma', norm: (L) => Math.sqrt((L - land.lo) / (land.hi - land.lo || 1)) });
          for (const [id, path, col] of [['full', S.full, '--c-v'], ['mb', S.mb, '--c-I']]) { const q = path.slice(0, k + 1); sq.line(id, q.map((v) => v[0]), q.map((v) => v[1]), { color: col, width: 2 }); sq.dots(`${id}n`, [q.at(-1)[0]], [q.at(-1)[1]], { color: col, size: 11 }); }
          const idx = lin(0, steps, steps + 1), top = S.full[0][2] * 1.05;
          tr.range([0, steps], [0, top]); tr.titles('step', 'loss: full batch (green), mini-batch (orange)'); tr.line('f', idx.slice(0, k + 1), S.full.slice(0, k + 1).map((v) => v[2]), { color: '--c-v' }); tr.line('m', idx.slice(0, k + 1), S.mb.slice(0, k + 1).map((v) => v[2]), { color: '--c-I' });
          noise ??= bs.map((l) => gradNoise(BLOBS, [0, 0], Math.round(10 ** l)));
          br.range([0, Math.log10(80)], [0, noise[0] * 1.1]); br.titles('log₁₀ batch size B', 'gradient error: mini-batch vs full'); br.line('n', bs, noise, { color: '--c-B' }); br.dots('q', [Math.log10(B)], [noise[Math.round(Math.log10(B) / Math.log10(80) * 29)]], { color: '--accent', size: 11 });
          hud.set('a', `B = ${B} of ${BLOBS.length} points per step: ${fmt(BLOBS.length / B, 3)} steps for the price of one full-batch step`);
          hud.set('b', `step ${k}: loss ${fmt(S.mb[k][2])} (mini-batch) vs ${fmt(S.full[k][2])} (full)`);
          hud.set('c', 'the mini-batch gradient is the right one plus noise of size ∝ 1/√B: cheaper steps, wobblier path');
          plots.aux.draw({ xlim: [0, steps], cursor: k, series: [{ x: idx.slice(1), y: idx.slice(1).map((i) => Math.hypot(S.mb[i][0] - S.mb[i - 1][0], S.mb[i][1] - S.mb[i - 1][1])), color: '--c-I', label: 'length of each mini-batch step vs step' }] });
        }
      },
      theme() { charts.forEach((k) => k.theme()); net.forEach((o) => o.theme()); },
    };
  },
};
