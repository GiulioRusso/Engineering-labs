// Handwritten digits (MNIST, 14×14): train an MLP live and watch 25 test digits get recognised; inspect one
// digit (probabilities, which pixels matter, hidden units); see the learned weights and the mistakes.
import { createChart } from '../../lib/viz/chart.js';
import { rng } from '../../lib/random.js';
import { forward, output, backward, update, zeros, evaluate, params } from '../net/model.js';
import { SIDE, PIX, digits, makeNet, OPT, train, predict, confusion } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 12, RATE = 3000, CHUNK = 64;
const HOPT = [['0', 'none (softmax)'], ['16', '16'], ['32', '32'], ['64', '64']];
// a digit as an image: row 0 of the data is the top, row 0 of a chart image the bottom
const img = (x) => { const v = new Float64Array(PIX); for (let r = 0; r < SIDE; r++) for (let c = 0; c < SIDE; c++) v[(SIDE - 1 - r) * SIDE + c] = x[r * SIDE + c]; return v; };
const grey = (v) => (k, o) => { const g = 0.06 + 0.9 * v[k]; o[0] = g; o[1] = g; o[2] = g; };
const diverge = (v, m) => (k, o) => { const t = Math.max(-1, Math.min(1, v[k] / m)); o[0] = t > 0 ? 0.1 + 0.85 * t : 0.1; o[1] = t > 0 ? 0.1 + 0.65 * t : 0.1 + 0.3 * -t; o[2] = t < 0 ? 0.12 + 0.85 * -t : 0.12; };
// n×n values as (n·f)×(n·f) blocks, so the chart's smooth scaling keeps sharp cells
const blow = (v, n, f = 6) => { const o = new Float64Array(n * n * f * f); for (let j = 0; j < n * f; j++) for (let i = 0; i < n * f; i++) o[j * n * f + i] = v[Math.floor(j / f) * n + Math.floor(i / f)]; return o; };
const trained = new Map(); // H → network trained 5 epochs (inspect, weights, errors)
const ready = (H) => { if (!trained.has(H)) trained.set(H, train(H, 5)); return trained.get(H); };

export default {
  id: 'mnist', title: 'Handwritten digits', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { H: '32', idx: 25 },
  cases: [
    { id: 'train', label: 'Training', controls: ['H'], set: { H: '32' }, examples: [
      { id: 'linear', label: 'No hidden layer: softmax regression', set: { H: '0' } },
      { id: 'wide', label: '64 hidden units', set: { H: '64' } },
    ] },
    { id: 'inspect', label: 'One digit, up close', controls: ['idx', 'H'], set: { H: '32', idx: 25 }, examples: [
      { id: 'unsure', label: 'An unsure 2', set: { idx: 38 } },
      { id: 'wrong', label: 'A 7 read as a 9', set: { idx: 80 } },
    ] },
    { id: 'weights', label: 'Learned weights', controls: ['H'], set: { H: '0' }, examples: [
      { id: 'hidden', label: 'First layer of a 16-unit MLP', set: { H: '16' } },
    ] },
    { id: 'errors', label: 'Its mistakes', controls: ['H'], set: { H: '32' }, examples: [
      { id: 'errors-linear', label: 'Mistakes of softmax regression', set: { H: '0' } },
    ] },
  ],
  controls: [
    { title: 'Network: 196 pixels → H → 10 digits', items: [{ id: 'H', label: 'Hidden units (ReLU)', type: 'segmented', options: HOPT }] },
    { title: 'Digit', show: (s) => s.case === 'inspect', items: [{ id: 'idx', label: 'Test digit #', unit: '', min: 0, max: 999, step: 1 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 30 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    // grids of small image charts inside the square, one set per layout
    const grids = new Map(); let shownGrid = '';
    const grid = (rows, cols, gap = 0.36) => {
      const key = `${rows}x${cols}`;
      if (!grids.has(key)) { const cw = (SQ[2] - gap * (cols - 1)) / cols, ch = (SQ[3] - gap * (rows - 1)) / rows, s = Math.min(cw, ch), out = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = SQ[0] + c * (s + gap), y = SQ[1] + SQ[3] - (r + 1) * s - r * gap; out.push({ ch: createChart(ctx, { box: [x, y, s, s], xTicks: false, yTicks: false, grid: false }), x: x + s / 2, top: y + s }); }
        grids.set(key, out); }
      if (shownGrid !== key) { for (const [k, g] of grids) g.forEach((q) => q.ch.show(k === key)); shownGrid = key; }
      return grids.get(key);
    };
    const hideGrids = () => { if (shownGrid) { for (const g of grids.values()) g.forEach((q) => q.ch.show(false)); shownGrid = ''; } };
    const confImage = (C) => { br.range([-0.5, 9.5], [-0.5, 9.5]); br.titles('predicted digit', 'true digit: confusion matrix (bright = often)'); const v = new Float64Array(100); C.forEach((row, t) => row.forEach((n, p) => { v[t * 10 + p] = n / 100; })); br.image('conf', blow(v, 10), 60, 60, { map: 'magma', norm: (q) => Math.sqrt(q) }); };
    let N = null, st, r, seen = 0, order = [], pos = 0, ep = 0, hist = [], lossAvg = [], C = null;
    const H = () => Number(state.H);
    function reset() { N = makeNet(H()); st = {}; r = rng(1); seen = 0; pos = 0; ep = 0; order = []; hist = [{ ep: 0, acc: 0.1, tr: 0.1 }]; lossAvg = []; C = confusion(N, digits().Xt, digits().Yt).C; }
    return {
      changed() {
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); hideGrids();
        if (state.case !== 'inspect') sq.show(false); // the square holds a grid of small charts instead
        if (state.case === 'train') { reset(); ctx.setClock(D); } else { ready(H()); ctx.setClock(0); }
      },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; });
        const c = state.case, { X, Y, Xt, Yt } = digits();
        if (c === 'train') {
          const want = Math.min(D * RATE, Math.floor(time.t * RATE));
          if (want < seen) reset();
          // train on the next mini-batches; evaluate at the end of every epoch
          let budget = 12;
          while (seen < want && budget-- > 0) {
            if (pos === 0) { order = Array.from(X, (_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } }
            const B = order.slice(pos, pos + 32);
            // the same steps as epoch() in the model, one batch at a time, so the numbers match the text
            const Gr = zeros(N); let l = 0; for (const i of B) l += backward(N, forward(N, X[i]), Y[i], Gr).loss; update(N, Gr, B.length, { ...OPT, state: st }); l /= B.length;
            lossAvg.push([seen / X.length, l]); pos += 32; seen += B.length;
            if (pos >= X.length) { pos = 0; ep++; const cf = confusion(N, Xt, Yt); C = cf.C; hist.push({ ep, acc: cf.acc, tr: evaluate(N, X.slice(0, 600), Y.slice(0, 600)).acc }); }
          }
          const G = grid(5, 5);
          G.forEach((q, i) => { q.ch.range([0, 1], [0, 1]); q.ch.image('d', img(Xt[i]), SIDE, SIDE, { rgb: grey(img(Xt[i])) }); const p = predict(N, Xt[i]); text(`${p.k} ${p.k === Yt[i] ? '✓' : '✗'}`, q.x, q.top + 0.13); });
          tr.range([0, D * RATE / X.length], [0, 1]); tr.titles('epoch', 'accuracy: test (orange), training (green)');
          tr.line('te', hist.map((h) => h.ep), hist.map((h) => h.acc), { color: '--c-I', width: 2 }); tr.dots('ted', hist.map((h) => h.ep), hist.map((h) => h.acc), { color: '--c-I', size: 7 });
          tr.line('tr', hist.map((h) => h.ep), hist.map((h) => h.tr), { color: '--c-v', width: 1.6 });
          confImage(C);
          const sm = lossAvg.map((_, i) => { const a = lossAvg.slice(Math.max(0, i - 15), i + 1); return a.reduce((s, q) => s + q[1], 0) / a.length; });
          plots.aux.draw({ xlim: [0, D * RATE / X.length], ylim: [0, 2.5], series: [{ x: lossAvg.map((q) => q[0]), y: sm, color: '--c-v', label: 'training loss (cross-entropy, smoothed) vs epoch' }] });
          const h = hist.at(-1), ok = Xt.slice(0, 25).filter((x, i) => predict(N, x).k === Yt[i]).length;
          hud.set('a', `epoch ${fmt(seen / X.length, 2)}: test accuracy ${fmt(100 * h.acc)} % on 1000 unseen digits (after epoch ${h.ep}); ${ok} of the 25 shown are right`);
          hud.set('b', `196 → ${H() || ''}${H() ? ' → ' : ''}10: ${params(N)} weights and biases; Adam, mini-batches of 32`);
          hud.set('c', H() ? 'the hidden layer builds features (strokes, loops) the output combines' : 'no hidden layer: one template per digit, a weighted sum of the pixels');
        } else if (c === 'inspect') {
          const net = ready(H()), i = Math.round(state.idx), x = Xt[i], P = predict(net, x), F = forward(net, x);
          sq.range([0, SIDE], [0, SIDE]); sq.titles(`test digit #${i}: really a ${Yt[i]}`, '');
          sq.image('big', img(x), SIDE, SIDE, { rgb: grey(img(x)) });
          tr.range([-0.5, 9.5], [0, 1.05]); tr.titles('digit', 'probability the network gives each digit');
          for (let d = 0; d < 10; d++) { const on = d === P.k; tr.hide(`p${d}${!on}`); tr.stems(`p${d}${on}`, [d], [P.p[d]], { color: on ? (P.k === Yt[i] ? '--c-v' : '--c-north') : '--c-B', width: 12 }); }
          // occlusion: blank each 2×2 patch and see how much the probability of the answer drops
          const occ = new Float64Array(49), y = Float32Array.from(x);
          for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) { const z = Float32Array.from(y); for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) z[(2 * a + dr) * SIDE + 2 * b + dc] = 0; occ[(6 - a) * 7 + b] = Math.max(0, P.p[P.k] - output(net, z)[P.k]); }
          const om = Math.max(1e-6, ...occ);
          br.range([0, SIDE], [0, SIDE]); br.titles('', `which pixels matter: drop in p(${P.k}) when a 2×2 patch is blanked`);
          br.image('occ', blow(occ, 7), 42, 42, { map: 'magma', norm: (q) => q / om });
          const hid = H() ? Array.from(F.a[1]) : Array.from(F.z[1]);
          plots.aux.draw({ xlim: [0, hid.length - 1], series: [{ x: hid.map((_, j) => j), y: hid, color: '--c-E', label: H() ? `the ${H()} hidden activations for this digit (unit number →)` : 'the 10 scores before softmax (digit →)' }] });
          hud.set('a', `the network says ${P.k} with probability ${fmt(100 * P.p[P.k])} % — ${P.k === Yt[i] ? 'right' : `wrong, it is a ${Yt[i]} (given ${fmt(100 * P.p[Yt[i]])} %)`}`, P.k === Yt[i] ? 'good' : 'bad');
          const s = Array.from(P.p, (p, d) => [p, d]).sort((a, b) => b[0] - a[0]);
          hud.set('b', `runner-up: ${s[1][1]} at ${fmt(100 * s[1][0])} %; probabilities come from softmax of 10 scores and sum to 1`);
          hud.set('c', 'bright patches (bottom right) are the strokes the decision depends on: blank them and the answer weakens');
        } else if (c === 'weights') {
          const net = ready(H()), W = net.W[0], n = H() || 10, G = grid(H() ? 4 : 3, 4, 0.3);
          G.forEach((q, j) => { if (j >= n) { q.ch.clear(); return; } const v = img(W.subarray(j * PIX, (j + 1) * PIX)), m = Math.max(...v.map(Math.abs)); q.ch.range([0, 1], [0, 1]); q.ch.image('w', v, SIDE, SIDE, { rgb: diverge(v, m) }); text(H() ? `unit ${j + 1}` : `digit ${j}`, q.x, q.top + 0.13); });
          const cf = confusion(net, Xt, Yt);
          tr.range([-0.5, 9.5], [0, 1.05]); tr.titles('digit', `test accuracy per digit (overall ${fmt(100 * cf.acc)} %)`);
          tr.stems('acc', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], cf.C.map((row, t) => row[t] / 100), { color: '--c-v', width: 12 });
          confImage(cf.C);
          plots.aux.draw({ xlim: [0, 9], ylim: [0, 1], series: [{ x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], y: cf.C.map((row, t) => row[t] / 100), color: '--c-v', label: 'accuracy per digit' }] });
          hud.set('a', H() ? 'each square: the 196 weights of one hidden unit — gold pixels excite it, blue inhibit' : 'each square: the 196 weights of one output digit — gold pixels vote for it, blue against');
          hud.set('b', H() ? 'hidden units learn strokes and blobs shared by many digits, not whole digits' : 'softmax regression is template matching: score = how well the digit overlaps the gold area minus the blue');
          hud.set('c', `${params(net)} parameters, trained 5 epochs on 3000 digits`);
        } else {
          const net = ready(H()), cf = confusion(net, Xt, Yt), G = grid(5, 5);
          G.forEach((q, j) => { const i = cf.wrong[j]; if (i === undefined) { q.ch.clear(); return; } const P = predict(net, Xt[i]); q.ch.range([0, 1], [0, 1]); q.ch.image('d', img(Xt[i]), SIDE, SIDE, { rgb: grey(img(Xt[i])) }); text(`${Yt[i]}→${P.k} ${Math.round(100 * P.p[P.k])}%`, q.x, q.top + 0.13); });
          const per = cf.C.map((row, t) => 100 - row[t]);
          tr.range([-0.5, 9.5], [0, Math.max(10, ...per) * 1.15]); tr.titles('true digit', 'mistakes per digit (of 100)');
          tr.stems('m', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], per, { color: '--c-north', width: 12 });
          confImage(cf.C);
          const conf = cf.wrong.map((i) => Math.max(...predict(net, Xt[i]).p)).sort((a, b) => a - b);
          plots.aux.draw({ xlim: [0, Math.max(1, conf.length - 1)], ylim: [0, 1], series: [{ x: conf.map((_, j) => j), y: conf, color: '--c-north', label: 'confidence of each wrong answer, sorted: many are unsure, some are sure and wrong' }] });
          const pairs = []; cf.C.forEach((row, t) => row.forEach((k, p) => { if (t !== p) pairs.push([k, t, p]); })); pairs.sort((a, b) => b[0] - a[0]);
          hud.set('a', `${cf.wrong.length} of 1000 test digits wrong (${fmt(100 * cf.acc)} % right); the first 25 shown as "true → said (confidence)"`);
          hud.set('b', `most common confusions: ${pairs.slice(0, 3).map(([k, t, p]) => `${t} → ${p} (${k}×)`).join(', ')}`);
          hud.set('c', 'many mistakes are digits a person would hesitate on too; others show what 14×14 pixels and a small network cannot see');
        }
      },
      theme() { charts.forEach((c) => c.theme()); for (const g of grids.values()) g.forEach((q) => q.ch.theme()); },
    };
  },
};
