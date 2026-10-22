// Generalization: polynomial fits on noisy samples — capacity, the bias–variance fan, ridge, early stopping,
// k-fold cross-validation — and why accuracy lies on imbalanced classes.
import { createChart } from '../../lib/viz/chart.js';
import { truth, sample, TEST, fit, predict, mse, biasVariance, gdPath, cvError, confusion } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TOP = [-4.4, 0.55, 8.8, 2.0], BOT = [-4.4, -2.35, 8.8, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const XS = lin(-1, 1, 300), DS = Array.from({ length: 16 }, (_, i) => i), FOLD = ['--c-B', '--c-I', '--c-v', '--c-E', '--c-F', '--c-north', '--c-ref', '--accent', '--c-x', '--c-y'];
const lg = (v) => Math.log10(Math.max(v, 1e-6));

export default {
  id: 'generalization', title: 'Generalization', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10, loop: false,
  defaults: { d: 3, n: 20, noise: 0.3, lam: -3, k: 5, th: 1, sep: 2 },
  cases: [
    { id: 'capacity', label: 'Capacity', set: {}, examples: [
      { id: 'under', label: 'Degree 1: underfits', controls: ['d'], set: { d: 1 } },
      { id: 'over', label: 'Degree 12: memorises the noise', controls: ['d'], set: { d: 12 } },
      { id: 'more', label: 'Degree 12 with 60 points', controls: ['n'], set: { d: 12, n: 60 } },
    ] },
    { id: 'biasvar', label: 'Bias and variance', set: {}, examples: [
      { id: 'rigid', label: 'Degree 1: all wrong the same way', controls: ['d'], set: { d: 1 } },
      { id: 'wild', label: 'Degree 10: right on average, each one wild', controls: ['d'], set: { d: 10 } },
    ] },
    { id: 'ridge', label: 'Ridge regularization', set: { d: 12 }, examples: [
      { id: 'none', label: 'λ ≈ 0: wiggles', controls: ['lam'], set: { lam: -6 } },
      { id: 'strong', label: 'λ = 10: too stiff', controls: ['lam'], set: { lam: 1 } },
    ] },
    { id: 'early', label: 'Early stopping', set: { d: 12 }, examples: [] },
    { id: 'cv', label: 'Cross-validation', set: {}, examples: [
      { id: 'loo', label: 'k = 10', controls: ['k'], set: { k: 10 } },
    ] },
    { id: 'imbalance', label: 'Accuracy lies', set: {}, examples: [
      { id: 'never', label: 'Always say “negative”', controls: ['th'], set: { th: 6 } },
      { id: 'low', label: 'Low threshold: catch them all', controls: ['th'], set: { th: 0.5 } },
    ] },
  ],
  controls: [
    { title: 'Model', show: (s) => ['capacity', 'biasvar', 'cv'].includes(s.case), items: [{ id: 'd', label: 'Polynomial degree', unit: '', min: 0, max: 15, step: 1 }] },
    { title: 'Data', show: (s) => s.case === 'capacity', items: [{ id: 'n', label: 'Training points', unit: '', min: 8, max: 80, step: 1 }, { id: 'noise', label: 'Noise σ', unit: '', min: 0, max: 0.8, step: 0.01 }] },
    { title: 'Ridge', show: (s) => s.case === 'ridge', items: [{ id: 'lam', label: 'log₁₀ λ', unit: '', min: -7, max: 2, step: 0.05 }] },
    { title: 'Folds', show: (s) => s.case === 'cv', items: [{ id: 'k', label: 'Folds k', unit: '', min: 2, max: 10, step: 1 }] },
    { title: 'Classifier', show: (s) => s.case === 'imbalance', items: [{ id: 'th', label: 'Decision threshold', unit: '', min: -2, max: 6, step: 0.01 }, { id: 'sep', label: 'Class separation', unit: 'σ', min: 0.5, max: 4, step: 0.05 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT });
    let BV = null, GD = null;
    const scene = (P, w, cap) => {
      top.range([-1, 1], [-2.2, 2.2]); top.titles('x', cap);
      top.dots('test', TEST.slice(0, 150).map((p) => p[0]), TEST.slice(0, 150).map((p) => p[1]), { color: '--c-ref', size: 3 }); top.line('true', XS, XS.map(truth), { color: '--ink-dim', dashed: true, width: 1.2 });
      if (w) top.line('fit', XS, XS.map((x) => predict(w, x)), { color: '--c-B', width: 3 }); else top.hide('fit');
      top.dots('train', P.map((p) => p[0]), P.map((p) => p[1]), { color: '--c-E', size: 8 });
    };
    const clear = () => { top.clear(); bot.clear(); };
    return {
      changed() { clear(); ctx.setClock(state.case === 'early' ? 10 : 0); if (state.case === 'early') { const P = sample(20); GD = gdPath(P, 12, { steps: 6000, every: 60, lr: 0.03 }); GD.tr = GD.map((w) => mse(w, P)); GD.te = GD.map((w) => mse(w, TEST)); } },
      update() {
        const c = state.case;
        if (c === 'capacity') {
          const P = sample(state.n, { noise: state.noise }), w = fit(P, state.d), tr = DS.map((d) => mse(fit(P, d), P)), te = DS.map((d) => mse(fit(P, d), TEST));
          scene(P, w, 'y: training points (yellow), test points (grey), the true curve (dashed), the fit (blue)');
          bot.range([0, 15], [-3, 1]); bot.titles('polynomial degree', 'log₁₀ mean squared error: training (yellow), test (blue)');
          bot.line('tr', DS, tr.map(lg), { color: '--c-E' }); bot.line('te', DS, te.map(lg), { color: '--c-B' }); bot.dots('q', [state.d, state.d], [lg(tr[state.d]), lg(te[state.d])], { color: '--accent', size: 11 });
          const best = te.indexOf(Math.min(...te));
          hud.set('a', `degree ${state.d}: training error ${fmt(tr[state.d])}, test error ${fmt(te[state.d])}`, state.d === best ? 'good' : '');
          hud.set('b', 'training error can only fall as the degree grows: a bigger model contains every smaller one'); hud.set('c', `test error is lowest at degree ${best}: past it the model fits the noise, not the curve`);
          plots.aux.draw({ xlim: [0, 15], cursor: state.d, series: [{ x: DS, y: DS.map((d) => lg(te[d]) - lg(tr[d])), color: '--c-north', label: 'log₁₀ (test ÷ train) vs degree: the generalization gap' }] });
        } else if (c === 'biasvar') {
          if (!BV || BV.d !== state.d) BV = { d: state.d, ...biasVariance(state.d) };
          top.range([-0.9, 0.9], [-2.2, 2.2]); top.titles('x', `y: 40 fits on 40 fresh datasets (grey), their average (blue), the truth (dashed)`);
          BV.preds.forEach((p, i) => top.line(`f${i}`, BV.xs, p, { color: '--c-ref', width: 0.8 })); top.line('mean', BV.xs, BV.mean, { color: '--c-B', width: 3 }); top.line('true', BV.xs, BV.xs.map(truth), { color: '--ink-dim', dashed: true, width: 1.4 });
          const all = Array.from({ length: 13 }, (_, d) => biasVariance(d, { runs: 25 })), dd = all.map((_, d) => d);
          bot.range([0, 12], [-4, 1]); bot.titles('polynomial degree', 'log₁₀ error: bias² (orange), variance (green), total (blue)');
          bot.line('b', dd, all.map((a) => lg(a.bias2)), { color: '--c-I' }); bot.line('v', dd, all.map((a) => lg(a.variance)), { color: '--c-v' }); bot.line('t', dd, all.map((a) => lg(a.bias2 + a.variance + a.noise2)), { color: '--c-B' }); bot.dots('q', [Math.min(12, state.d)], [lg(BV.bias2 + BV.variance + BV.noise2)], { color: '--accent', size: 11 });
          hud.set('a', `bias² ${fmt(BV.bias2)} + variance ${fmt(BV.variance)} + noise σ² ${fmt(BV.noise2)} = expected test error ${fmt(BV.bias2 + BV.variance + BV.noise2)}`);
          hud.set('b', 'bias: how far the AVERAGE fit is from the truth · variance: how much single fits scatter around that average'); hud.set('c', 'simple models: high bias, low variance; flexible models: the opposite; the noise floor never goes away');
          plots.aux.draw({ xlim: [-0.9, 0.9], series: [{ x: BV.xs, y: BV.xs.map((_, i) => BV.preds.reduce((s, p) => s + (p[i] - BV.mean[i]) ** 2, 0) / BV.preds.length), color: '--c-v', label: 'variance of the fits vs x: largest at the edges' }] });
        } else if (c === 'ridge') {
          const P = sample(20), lam = 10 ** state.lam, w = fit(P, 12, lam), ls = lin(-7, 2, 60);
          scene(P, w, `y: degree-12 fit with λ = ${fmt(lam)}`);
          bot.range([-7, 2], [-3, 1]); bot.titles('log₁₀ λ', 'log₁₀ mean squared error: training (yellow), test (blue)');
          bot.line('tr', ls, ls.map((l) => lg(mse(fit(P, 12, 10 ** l), P))), { color: '--c-E' }); bot.line('te', ls, ls.map((l) => lg(mse(fit(P, 12, 10 ** l), TEST))), { color: '--c-B' }); bot.dots('q', [state.lam, state.lam], [lg(mse(w, P)), lg(mse(w, TEST))], { color: '--accent', size: 11 });
          hud.set('a', `test error ${fmt(mse(w, TEST))} · |w| = ${fmt(Math.hypot(...w))}`); hud.set('b', 'ŵ = argmin ‖Aw − y‖² + λ‖w‖²: keep the degree high, make large coefficients expensive');
          hud.set('c', state.lam < -4 ? 'λ tiny: the wiggles come back' : state.lam > 0 ? 'λ large: everything is shrunk toward zero — underfitting' : 'moderate λ: smooth and close to the truth');
          plots.aux.draw({ xlim: [0, 12], series: [{ x: DS.slice(0, 13), y: w.map((v) => Math.abs(v)), color: '--c-F', label: '|coefficient| vs Legendre index' }] });
        } else if (c === 'early') {
          const P = sample(20), it = (i) => i * 60, k = Math.min(GD.length - 1, Math.floor(Math.min(1, time.t / 9.5) * (GD.length - 1))), tr = GD.tr, te = GD.te, best = te.indexOf(Math.min(...te));
          scene(P, GD[k], `y: degree-12 fit by gradient descent from w = 0, iteration ${it(k)}`);
          bot.range([0, it(GD.length - 1)], [-2.5, 0.5]); bot.titles('iteration', 'log₁₀ mean squared error: training (yellow), test (blue)');
          bot.line('tr', GD.map((_, i) => it(i)).slice(0, k + 1), tr.map(lg).slice(0, k + 1), { color: '--c-E' }); bot.line('te', GD.map((_, i) => it(i)).slice(0, k + 1), te.map(lg).slice(0, k + 1), { color: '--c-B' });
          if (k >= best) bot.line('best', [it(best), it(best)], [-2.5, 0.5], { color: '--c-v', dashed: true, width: 1.2 }); else bot.hide('best');
          hud.set('a', `iteration ${it(k)}: training ${fmt(tr[k])}, test ${fmt(te[k])}`); hud.set('b', 'gradient descent fits the broad shape first and the wiggles last: stopping early keeps the coefficients small, like ridge');
          hud.set('c', k >= best ? `best test error at iteration ${it(best)} (green): stop there` : 'watch the test error…', k >= best ? 'good' : '');
          plots.aux.draw({ xlim: [0, it(GD.length - 1)], cursor: it(k), series: [{ x: GD.map((_, i) => it(i)), y: GD.map((w) => Math.hypot(...w)), color: '--c-F', label: '|w| vs iteration: the coefficients grow as training goes on' }] });
        } else if (c === 'cv') {
          const P = sample(30), k = state.k, w = fit(P, state.d), cv = DS.slice(0, 13).map((d) => cvError(P, d, k)), te = DS.slice(0, 13).map((d) => mse(fit(P, d), TEST)), best = cv.indexOf(Math.min(...cv));
          top.range([-1, 1], [-2.2, 2.2]); top.titles('x', `y: 30 training points coloured by fold (${k} folds), degree-${state.d} fit`); top.line('true', XS, XS.map(truth), { color: '--ink-dim', dashed: true, width: 1.2 }); top.line('fit', XS, XS.map((x) => predict(w, x)), { color: '--c-B', width: 3 });
          for (let f = 0; f < 10; f++) { const Q = P.filter((_, i) => i % k === f); top.dots(`f${f}`, f < k ? Q.map((p) => p[0]) : [], f < k ? Q.map((p) => p[1]) : [], { color: FOLD[f], size: 9 }); } top.dots('test', [], [], {}); top.dots('train', [], [], {});
          bot.range([0, 12], [-2.5, 1]); bot.titles('polynomial degree', 'log₁₀ error: cross-validation (green) vs the real test error (blue)');
          bot.line('cv', DS.slice(0, 13), cv.map(lg), { color: '--c-v' }); bot.line('te', DS.slice(0, 13), te.map(lg), { color: '--c-B' }); bot.dots('b', [best], [lg(cv[best])], { color: '--accent', size: 12 });
          hud.set('a', `${k}-fold CV picks degree ${best}; the test set (never used) agrees: best at ${te.indexOf(Math.min(...te))}`, 'good');
          hud.set('b', 'each fold is held out once: fit on the others, score on it, average the scores'); hud.set('c', 'choosing with the test set would make it a training set: CV uses training data only');
          plots.aux.draw({ xlim: [2, 10], cursor: k, series: [{ x: lin(2, 10, 9), y: lin(2, 10, 9).map((kk) => cvError(P, state.d, kk)), color: '--c-v', label: `CV error of degree ${state.d} vs number of folds` }] });
        } else {
          const C = confusion(state.th, { sep: state.sep }), ss = lin(-4, 7, 300), g = (x, m) => Math.exp(-((x - m) ** 2) / 2) / Math.sqrt(2 * Math.PI);
          top.range([-4, 7], [0, 380]); top.titles('classifier score', 'number of people per unit score: healthy (blue, 920), ill (orange, 80)');
          top.line('n', ss, ss.map((x) => 920 * g(x, 0)), { color: '--c-B' }); top.line('p', ss, ss.map((x) => 80 * g(x, state.sep)), { color: '--c-I', width: 3 }); top.line('th', [state.th, state.th], [0, 380], { color: '--accent', dashed: true, width: 1.4 });
          bot.range([0.4, 4.6], [0, 1000]); bot.titles('true pos · false neg · false pos · true neg', 'people (out of 1000)'); bot.stems('c', [1, 2, 3, 4], [C.TP, C.FN, C.FP, C.TN], { color: '--c-E', width: 20 });
          hud.set('a', `accuracy ${fmt(C.acc * 100)}% · precision ${fmt(C.prec * 100)}% · recall ${fmt(C.rec * 100)}%`, C.rec < 0.5 ? 'bad' : 'good');
          hud.set('b', 'precision: of those flagged, how many are ill · recall: of the ill, how many were found'); hud.set('c', C.rec < 0.05 ? 'saying “healthy” to everyone scores 92% accuracy and finds nobody' : 'lowering the threshold finds more ill people but flags more healthy ones');
          const ts = lin(-2, 6, 120); plots.aux.draw({ xlim: [-2, 6], cursor: state.th, series: [{ x: ts, y: ts.map((t) => confusion(t, { sep: state.sep }).acc), color: '--c-ref', label: 'accuracy' }, { x: ts, y: ts.map((t) => confusion(t, { sep: state.sep }).prec), color: '--c-v', label: 'precision' }, { x: ts, y: ts.map((t) => confusion(t, { sep: state.sep }).rec), color: '--c-I', label: 'recall vs threshold' }] });
        }
      },
      theme() { top.theme(); bot.theme(); },
    };
  },
};
