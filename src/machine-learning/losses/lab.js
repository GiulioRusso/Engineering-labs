// Loss functions, seen where they act: residual squares under a line fit with an outlier, the vanishing
// gradient of squared error on a sigmoid, softmax and temperature, and every classifier loss vs the margin.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { sigmoid } from '../neuron/model.js';
import { lineData, LOSS, fitLine, gradMSE, gradCE, trainZ, softmax, MARGIN } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TOP = [-4.4, 0.55, 8.8, 2.0], BOT = [-4.4, -2.35, 8.8, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const COL = { mse: '--c-north', mae: '--c-B', huber: '--c-v' }, MC = { zeroone: '--ink', hinge: '--c-B', logistic: '--c-I', exp: '--c-F', square: '--c-v' };

export default {
  id: 'losses', title: 'Loss functions', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  defaults: { out: 8, loss: 'mse', k: 1, z1: 2, z2: 1, z3: 0.5, z4: -1, T: 1, truth: 1, m: 0.5 },
  cases: [
    { id: 'regress', label: 'Squared, absolute, Huber', set: {}, examples: [
      { id: 'abs', label: 'Absolute error: ignores the outlier', controls: ['loss'], set: { loss: 'mae' } },
      { id: 'huber', label: 'Huber: squared near, absolute far', controls: ['loss', 'k'], set: { loss: 'huber' } },
      { id: 'none', label: 'No outlier: they agree', controls: ['out'], set: { out: 0 } },
    ] },
    { id: 'trap', label: 'The sigmoid trap', set: {}, examples: [] },
    { id: 'softmax', label: 'Softmax and temperature', set: {}, examples: [
      { id: 'cold', label: 'T = 0.2: winner takes all', controls: ['T'], set: { T: 0.2 } },
      { id: 'hot', label: 'T = 5: nearly uniform', controls: ['T'], set: { T: 5 } },
      { id: 'wrong', label: 'The true class scores low', controls: ['truth'], set: { truth: 4 } },
    ] },
    { id: 'margin', label: 'One picture: the margin', set: {}, examples: [
      { id: 'wrongside', label: 'Wrong side (m = −1)', controls: ['m'], set: { m: -1 } },
    ] },
  ],
  controls: [
    { title: 'Fit', show: (s) => s.case === 'regress', items: [{ id: 'loss', label: 'Loss', type: 'segmented', options: [['mse', 'Squared'], ['mae', 'Absolute'], ['huber', 'Huber']] }, { id: 'out', label: 'Outlier offset', unit: '', min: -10, max: 10, step: 0.1 }, { id: 'k', label: 'Huber threshold δ', unit: '', min: 0.1, max: 4, step: 0.05, show: (s) => s.loss === 'huber' }] },
    { title: 'Scores', show: (s) => s.case === 'softmax', items: [
      { id: 'z1', label: 'Score z₁', unit: '', min: -4, max: 4, step: 0.05 }, { id: 'z2', label: 'Score z₂', unit: '', min: -4, max: 4, step: 0.05 }, { id: 'z3', label: 'Score z₃', unit: '', min: -4, max: 4, step: 0.05 }, { id: 'z4', label: 'Score z₄', unit: '', min: -4, max: 4, step: 0.05 },
      { id: 'T', label: 'Temperature T', unit: '', min: 0.1, max: 10, log: true }, { id: 'truth', label: 'True class', unit: '', min: 1, max: 4, step: 1 },
    ] },
    { title: 'Margin', show: (s) => s.case === 'margin', items: [{ id: 'm', label: 'Margin m = y·f(x)', unit: '', min: -2.5, max: 2.5, step: 0.01 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT }), sq = createCurve(stage, { max: 400, width: 1.4, color: '--c-north' });
    return {
      changed() { sq.object.visible = state.case === 'regress'; ctx.setClock(state.case === 'trap' ? 8 : 0); },
      update() {
        const c = state.case;
        if (c === 'regress') {
          const P = lineData(state.out), fits = Object.fromEntries(Object.keys(LOSS).map((k) => [k, fitLine(P, k, state.k)])), [a, b] = fits[state.loss];
          top.range([0, 10], [-3.5, 13]); top.titles('x', 'y: data, and the line each loss fits (bold = selected)');
          top.dots('d', P.map((p) => p[0]), P.map((p) => p[1]), { color: '--c-E', size: 8 });
          for (const k of Object.keys(LOSS)) top.line(k, [0, 10], [fits[k][1], fits[k][0] * 10 + fits[k][1]], { color: COL[k], width: k === state.loss ? 3.2 : 1.2, dashed: k !== state.loss });
          // the penalty made visible: a square of side |residual| (squared), a bar (absolute)
          const seg = []; for (const [x, y] of P) { const f = a * x + b, r = y - f, X0 = top.mx(x), Y0 = top.my(f), Y1 = top.my(y), side = Math.abs(Y1 - Y0);
            if (state.loss === 'mae') seg.push(X0, Y0, 0.003, X0, Y1, 0.003); else { const w = state.loss === 'huber' && Math.abs(r) > state.k ? side * state.k / Math.abs(r) : side; seg.push(X0, Y0, 0.003, X0 + w, Y0, 0.003, X0 + w, Y0, 0.003, X0 + w, Y1, 0.003, X0 + w, Y1, 0.003, X0, Y1, 0.003, X0, Y1, 0.003, X0, Y0, 0.003); } }
          sq.segments(seg);
          const R0 = P.map(([x, y]) => y - a * x - b), W = Math.max(4, 1.15 * Math.max(...R0.map(Math.abs))), rs = lin(-W, W, 300); bot.range([-W, W], [0, Math.max(...Object.keys(LOSS).map((k) => LOSS[k].f(W, state.k)))]); bot.titles('residual r = y − ŷ', 'penalty: squared (red), absolute (blue), Huber (green)');
          for (const k of Object.keys(LOSS)) bot.line(k, rs, rs.map((r) => LOSS[k].f(r, state.k)), { color: COL[k], width: k === state.loss ? 3 : 1.3 });
          const R = P.map(([x, y]) => y - a * x - b); bot.dots('r', R, R.map((r) => LOSS[state.loss].f(r, state.k)), { color: '--accent', size: 9 });
          hud.set('a', `${LOSS[state.loss].label} fit: y = ${fmt(a)}x + ${fmt(b)} (true line 0.5x + 1)`); hud.set('b', state.loss === 'mse' ? 'squared: the outlier’s square is huge, so the line bends toward it — the mean' : state.loss === 'mae' ? 'absolute: every point pulls with the same force ±1 — the median, robust' : `Huber: squared inside ±${state.k}, absolute outside — smooth and robust`);
          hud.set('c', `outlier residual ${fmt(R[R.length - 2])}: penalty ${fmt(LOSS[state.loss].f(R[R.length - 2], state.k))}`);
          const os = lin(-10, 10, 41); plots.aux.draw({ xlim: [-10, 10], cursor: state.out, series: Object.keys(LOSS).map((k) => ({ x: os, y: os.map((o) => fitLine(lineData(o), k, state.k)[0]), color: COL[k], label: `${LOSS[k].label} slope` })).concat([{ x: [], y: [], color: '--ink-dim', label: 'fitted slope vs outlier offset' }]) });
        } else if (c === 'trap') {
          const n = 60, k = Math.min(n, Math.floor(Math.min(1, time.t / 7.5) * n)), A = trainZ(gradMSE, -6, 1, n), B = trainZ(gradCE, -6, 1, n), zs = lin(-8, 6, 300);
          top.range([-8, 6], [0, 6]); top.titles('z (the neuron’s score)', 'loss for a true label 1: 4 × squared (blue) vs cross-entropy (orange)');
          top.line('m', zs, zs.map((z) => (1 - sigmoid(z)) ** 2 * 4), { color: '--c-B' }); top.line('c', zs, zs.map((z) => -Math.log(sigmoid(z))), { color: '--c-I' });
          top.dots('a', [A[k]], [(1 - sigmoid(A[k])) ** 2 * 4], { color: '--c-B', size: 12 }); top.dots('b', [B[k]], [-Math.log(sigmoid(B[k]))], { color: '--c-I', size: 12 });
          const st = lin(0, n, n + 1); bot.range([0, n], [-7, 5]); bot.titles('training step', 'z: the score as each loss trains it'); bot.line('a', st.slice(0, k + 1), A.slice(0, k + 1), { color: '--c-B' }); bot.line('b', st.slice(0, k + 1), B.slice(0, k + 1), { color: '--c-I' }); bot.line('z', [0, n], [0, 0], { color: '--ink-dim', dashed: true, width: 1 });
          hud.set('a', `step ${k}: squared error z = ${fmt(A[k])} (p = ${fmt(sigmoid(A[k]))}), cross-entropy z = ${fmt(B[k])} (p = ${fmt(sigmoid(B[k]))})`);
          hud.set('b', '∂(1 − σ)²/∂z = −2(1 − p)·p(1 − p): when p ≈ 0 the factor p(1 − p) kills the gradient — confidently wrong, and stuck'); hud.set('c', '∂(−log p)/∂z = p − 1 ≈ −1: cross-entropy pushes hardest exactly when it is most wrong');
          plots.aux.draw({ xlim: [-8, 6], series: [{ x: zs, y: zs.map((z) => Math.abs(gradMSE(z))), color: '--c-B', label: '|gradient| squared' }, { x: zs, y: zs.map((z) => Math.abs(gradCE(z))), color: '--c-I', label: '|gradient| cross-entropy vs z' }] });
        } else if (c === 'softmax') {
          const z = [state.z1, state.z2, state.z3, state.z4], p = softmax(z, state.T), t = state.truth - 1;
          top.range([0.4, 4.6], [-4.4, 4.4]); top.titles('class', 'score z (logit): the network’s raw output'); top.stems('z', [1, 2, 3, 4], z, { color: '--c-B', width: 18 });
          bot.range([0.4, 4.6], [0, 1.05]); bot.titles('class', `probability p = softmax(z / T): the true class (${state.truth}) in orange`); bot.stems('p', [1, 2, 3, 4].filter((i) => i - 1 !== t), p.filter((_, i) => i !== t), { color: '--c-v', width: 18 }); bot.stems('pt', [t + 1], [p[t]], { color: '--c-I', width: 18 });
          hud.set('a', `p = (${p.map((v) => fmt(v, 2)).join(', ')}) — sums to 1`); hud.set('b', `cross-entropy loss −log p_true = ${fmt(-Math.log(p[t]))}`, p[t] > 0.5 ? 'good' : 'bad');
          hud.set('c', state.T < 0.5 ? 'low temperature: the largest score takes almost everything' : state.T > 3 ? 'high temperature: scores barely matter, nearly uniform' : 'T = 1: the standard softmax');
          const Ts = lin(-1, 1, 100); plots.aux.draw({ xlim: [-1, 1], cursor: Math.log10(state.T), series: [0, 1, 2, 3].map((i) => ({ x: Ts, y: Ts.map((l) => softmax(z, 10 ** l)[i]), color: ['--c-B', '--c-v', '--c-E', '--c-F'][i], label: `p${i + 1}` })).concat([{ x: [], y: [], color: '--ink-dim', label: 'probability vs log₁₀ T' }]) });
        } else {
          const ms = lin(-2.5, 2.5, 400); top.range([-2.5, 2.5], [0, 5]); top.titles('margin m = y·f(x)  (> 0 correct, < 0 wrong)', 'loss: 0–1 (white), hinge, logistic, exponential, squared');
          for (const [k, L] of Object.entries(MARGIN)) top.line(k, ms, ms.map(L.f), { color: MC[k], width: k === 'zeroone' ? 3 : 1.8 });
          top.line('cur', [state.m, state.m], [0, 5], { color: '--accent', dashed: true, width: 1 });
          const vals = Object.values(MARGIN).map((L) => L.f(state.m)); bot.range([0.4, 5.6], [0, Math.max(1.2, ...vals) * 1.1]); bot.titles('0–1 · hinge · logistic · exponential · squared', `loss at m = ${fmt(state.m)}`); bot.stems('v', [1, 2, 3, 4, 5], vals, { color: '--c-E', width: 18 });
          hud.set('a', 'what we want is the 0–1 loss (count mistakes), but it is flat: no gradient to follow'); hud.set('b', 'every practical loss is a smooth upper bound that keeps pushing until the margin is comfortable');
          hud.set('c', state.m > 1 ? 'squared loss penalises being TOO right (m > 1): bad for classification' : state.m < 0 ? 'wrong side: exponential explodes (outliers!), hinge and logistic grow linearly' : 'correct but close: hinge and logistic still push');
          plots.aux.draw({ xlim: [-2.5, 2.5], cursor: state.m, series: Object.entries(MARGIN).filter(([k]) => k !== 'zeroone').map(([k, L]) => ({ x: ms, y: ms.map((m) => (L.f(m + 1e-4) - L.f(m - 1e-4)) / 2e-4), color: MC[k], label: L.label.split(' ')[0] })).concat([{ x: [], y: [], color: '--ink-dim', label: 'slope dℓ/dm vs margin' }]) });
        }
      },
      theme() { top.theme(); bot.theme(); sq.theme(); },
    };
  },
};
