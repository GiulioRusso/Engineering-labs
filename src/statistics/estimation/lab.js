// Estimation: the sampling distribution of a statistic (built sample by sample), maximum likelihood,
// and the bootstrap (resampling the one sample we have).
import { createChart } from '../../lib/viz/chart.js';
import { mean, sd, lin, fmt, normPdf, tQ } from '../core/model.js';
import { bars, hist, edges, rect } from '../core/draw.js';
import { POPS, STATS, sampling, MLE, original, bootstrap, percentileCI } from './model.js';

const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 12;
const SNAME = { mean: 'mean', median: 'median', sd: 'standard deviation' };

export default {
  id: 'estimation', title: 'Estimation', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { pop: 'expo', n: 10, stat: 'mean', model: 'coin', nm: 20, p: 0.5, mu: 4, lam: 0.6, nb: 20, bstat: 'mean' },
  cases: [
    { id: 'sampling', label: 'Sampling distribution', set: {}, examples: [
      { id: 'big', label: 'n = 40: half the spread of n = 10', set: { n: 40 } },
      { id: 'median', label: 'The median has one too', set: { stat: 'median', pop: 'normal', n: 30 } },
      { id: 'sd', label: 'The sd is biased low for small n', set: { stat: 'sd', n: 4 } },
      { id: 'uniform', label: 'Uniform parent, n = 3: already bell-shaped', set: { pop: 'uniform', n: 3 } },
    ] },
    { id: 'mle', label: 'Maximum likelihood', set: {}, examples: [
      { id: 'peak', label: 'Coin: at the peak, p = 0.7', set: { model: 'coin', p: 0.7 } },
      { id: 'more', label: 'Coin: 4 × the flips, sharper peak', set: { model: 'coin', nm: 80, p: 0.7 } },
      { id: 'gauss', label: 'Measurements: the MLE is the mean', set: { model: 'gauss', mu: 6 } },
      { id: 'expo', label: 'Waiting times: λ = 1 / mean wait', set: { model: 'expo', lam: 0.28 } },
    ] },
    { id: 'bootstrap', label: 'Bootstrap', set: {}, examples: [
      { id: 'median', label: 'The median: no simple formula', set: { bstat: 'median' } },
      { id: 'bigger', label: '80 values: narrower', set: { nb: 80 } },
      { id: 'tiny', label: 'Only 6 values: be careful', set: { nb: 6 } },
    ] },
  ],
  controls: [
    { title: 'Repeated samples', show: (s) => s.case === 'sampling', items: [
      { id: 'pop', label: 'Population', type: 'select', options: Object.entries(POPS).map(([k, v]) => [k, v.label]) },
      { id: 'stat', label: 'Statistic', type: 'segmented', options: [['mean', 'Mean'], ['median', 'Median'], ['sd', 'Sd']] },
      { id: 'n', label: 'Sample size n', unit: '', min: 2, max: 200, log: true },
    ] },
    { title: 'Model and data', show: (s) => s.case === 'mle', items: [
      { id: 'model', label: 'Model', type: 'select', options: Object.entries(MLE).map(([k, v]) => [k, v.label]) },
      { id: 'nm', label: 'Data points', unit: '', min: 5, max: 200, log: true },
      { id: 'p', label: 'Try p', unit: '', min: 0.01, max: 0.99, step: 0.01, show: (s) => s.model === 'coin' },
      { id: 'mu', label: 'Try μ', unit: '', min: 0, max: 10, step: 0.05, show: (s) => s.model === 'gauss' },
      { id: 'lam', label: 'Try λ', unit: '/min', min: 0.02, max: 1.5, step: 0.01, show: (s) => s.model === 'expo' },
    ] },
    { title: 'One sample', show: (s) => s.case === 'bootstrap', items: [
      { id: 'nb', label: 'Values in the sample', unit: '', min: 4, max: 200, log: true },
      { id: 'bstat', label: 'Statistic', type: 'segmented', options: [['mean', 'Mean'], ['median', 'Median']] },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 8 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    const cache = {}; const memo = (k, f) => (cache[k] ??= f());
    const shown = (m) => Math.max(1, Math.min(m, Math.ceil(m * Math.min(1, time.t / (D - 1)))));

    function samplingCase() {
      const P = POPS[state.pop], n = Math.round(state.n), S = memo(`s${state.pop}${n}${state.stat}`, () => sampling(state.pop, n, state.stat)), k = shown(S.values.length), v = S.values.slice(0, k);
      const theta = state.stat === 'mean' ? P.mu : state.stat === 'median' ? P.med : P.sigma, se = sd(S.values), mv = mean(S.values), lo = Math.max(0, theta - 4.5 * Math.max(se, 0.05)), hi = theta + 4.5 * Math.max(se, 0.05), nb = 36, w = (hi - lo) / nb;
      const h = hist(v, lo, hi, nb).map((c) => c / (k * w)), xs = lin(lo, hi, 200), top = Math.max(...h, normPdf(theta, theta, se)) * 1.15;
      sq.range([lo, hi], [0, top]); sq.titles(`sample ${SNAME[state.stat]}`, `density of the ${SNAME[state.stat]} over ${k} samples of size ${n}; dashed = true value`);
      bars(sq, 'h', edges(lo, hi, nb), h, { color: '--c-B' }); sq.line('fit', xs, xs.map((x) => normPdf(x, mv, se)), { color: '--c-I', width: 2 });
      sq.line('true', [theta, theta], [0, top], { color: '--ink', width: 1.4, dashed: true });
      if (state.stat === 'mean') sq.line('th', xs, xs.map((x) => normPdf(x, P.mu, P.sigma / Math.sqrt(n))), { color: '--c-v', width: 1.6, dashed: true });
      const px = lin(-0.2, P.hi, 200), last = S.last;
      tr.range([-0.2, P.hi], [0, 1.25]); tr.titles('value', 'the population, and the latest sample (dots)');
      tr.line('pdf', px, px.map(P.pdf), { color: '--c-I', width: 2 }); tr.dots('s', last, last.map((_, i) => 0.1 + 0.15 * ((i * 0.618) % 1)), { color: '--c-B', size: 6 });
      const ns = [2, 3, 5, 8, 12, 20, 30, 50, 80, 130, 200], se_n = memo(`se${state.pop}${state.stat}`, () => ns.map((m) => sd(sampling(state.pop, m, state.stat, 300, 77).values)));
      br.range([0.3, 2.3], [0, Math.max(...se_n) * 1.1]); br.titles('log₁₀ n', `standard error (spread of the ${SNAME[state.stat]}); line σ/√n`);
      br.dots('e', ns.map(Math.log10), se_n, { color: '--c-B', size: 8 }); const ls = lin(0.3, 2.3, 60); br.line('t', ls, ls.map((l) => P.sigma / Math.sqrt(10 ** l)), { color: '--c-v', width: 1.6, dashed: true });
      br.dots('q', [Math.log10(n)], [se], { color: '--accent', size: 12 });
      const ks = lin(2, S.values.length, 120).map(Math.round);
      plots.aux.draw({ xlim: [2, S.values.length], cursor: k, series: [{ x: ks, y: ks.map((j) => sd(S.values.slice(0, j))), color: '--c-B', label: 'standard error estimated from the first k samples' }] });
      hud.set('a', `${k} samples of n = ${n}: the ${SNAME[state.stat]} averages ${fmt(mean(v))} (true ${fmt(theta)}), spread (standard error) ${fmt(sd(v))}`);
      hud.set('b', state.stat === 'mean' ? `theory: σ/√n = ${fmt(P.sigma)}/√${n} = ${fmt(P.sigma / Math.sqrt(n))}; 4 × the data halves it` : state.stat === 'sd' ? `bias: on average ${fmt(mv)} against σ = ${fmt(P.sigma)} (${fmt(100 * (mv / P.sigma - 1), 2)} %)` : `the median's standard error: ${fmt(se)}; for a normal parent ≈ 1.25 σ/√n`, state.stat === 'sd' && mv / P.sigma < 0.95 ? 'bad' : '');
      hud.set('c', 'a statistic computed from random data is itself random: its distribution is the sampling distribution');
    }

    function mleCase() {
      const M = MLE[state.model], n = Math.round(state.nm), Dt = memo(`m${state.model}${n}`, () => M.data(n)), D4 = memo(`m${state.model}${4 * n}`, () => M.data(4 * n));
      const th = state.model === 'coin' ? state.p : state.model === 'gauss' ? state.mu : state.lam, hat = M.hat(Dt), ts = lin(M.lo, M.hi, 300), ll = ts.map((t) => M.ll(Dt, t)), llMax = M.ll(Dt, hat), se = M.se(Dt, hat);
      if (state.model === 'coin') {
        sq.range([0, 3], [0, n]); sq.titles('', `counts: observed (blue) and expected n·p at p = ${fmt(th, 2)} (orange)`);
        rect(sq, 'h', 0.45, 1.05, 0, Dt.h, '--c-B'); rect(sq, 't', 1.95, 2.55, 0, n - Dt.h, '--c-B'); rect(sq, 'eh', 1.05, 1.5, 0, n * th, '--c-I'); rect(sq, 'et', 2.55, 3, 0, n * (1 - th), '--c-I');
        put(`heads ${Dt.h}`, sq.mx(1), sq.my(0) - 0.42); put(`tails ${n - Dt.h}`, sq.mx(2.5), sq.my(0) - 0.42);
      } else {
        const hi = state.model === 'gauss' ? 12 : 15, xs = lin(0, hi, 300), pdf = state.model === 'gauss' ? (x) => normPdf(x, th, 2) : (x) => th * Math.exp(-th * x), top = state.model === 'gauss' ? 0.3 : Math.max(0.5, th * 1.1);
        sq.range([0, hi], [0, top]); sq.titles(state.model === 'gauss' ? 'measured value' : 'waiting time (min)', `the data (blue ticks) and the model density at the trial value (orange)`);
        sq.line('pdf', xs, xs.map(pdf), { color: '--c-I', width: 2.4 }); sq.stems('d', Dt.x, Dt.x.map(() => top * 0.08), { color: '--c-B', width: 2 });
        sq.stems('dp', Dt.x, Dt.x.map(pdf), { color: '--c-v', width: 1 });
      }
      const lo = Math.max(...ll) - 12;
      tr.range([M.lo, M.hi], [lo, Math.max(...ll) + 1]); tr.titles(state.model === 'coin' ? 'p' : state.model === 'gauss' ? 'μ' : 'λ', 'log-likelihood ℓ(θ) = Σ log f(xᵢ | θ)');
      tr.line('ll', ts, ll, { color: '--c-B' }); tr.line('hat', [hat, hat], [lo, llMax + 1], { color: '--ink-dim', dashed: true, width: 1.2 }); tr.dots('q', [th], [Math.max(lo, M.ll(Dt, th))], { color: '--accent', size: 12 });
      const L4 = ts.map((t) => Math.exp(M.ll(D4, t) - M.ll(D4, M.hat(D4))));
      br.range([M.lo, M.hi], [0, 1.1]); br.titles(state.model === 'coin' ? 'p' : state.model === 'gauss' ? 'μ' : 'λ', `likelihood ÷ its peak: ${n} points (blue), ${4 * n} points (green)`);
      br.line('L', ts, ll.map((l) => Math.exp(l - llMax)), { color: '--c-B' }); br.line('L4', ts, L4, { color: '--c-v' });
      br.dots('q', [th], [Math.exp(M.ll(Dt, th) - llMax)], { color: '--accent', size: 12 });
      const dl = ts.map((t, i) => (i ? (ll[i] - ll[i - 1]) / (ts[i] - ts[i - 1]) : NaN));
      plots.aux.draw({ xlim: [M.lo, M.hi], cursor: th, series: [{ x: ts.slice(1), y: dl.slice(1).map((d) => Math.max(-200, Math.min(200, d))), color: '--c-I', label: 'slope dℓ/dθ (the score): zero at the maximum' }] });
      hud.set('a', `trial value ${fmt(th)}: ℓ = ${fmt(M.ll(Dt, th), 4)}, ${fmt(M.ll(Dt, th) - llMax, 3)} below the peak (likelihood × ${fmt(Math.exp(M.ll(Dt, th) - llMax), 2)})`, Math.abs(th - hat) < se / 4 ? 'good' : '');
      hud.set('b', `MLE = ${fmt(hat)} ${state.model === 'coin' ? `= ${Dt.h}/${n}, the share of heads` : state.model === 'gauss' ? '= the sample mean' : '= 1 / mean wait'}; standard error ≈ ${fmt(se)} from the curvature at the peak`);
      hud.set('c', 'likelihood: how probable the data are for each parameter value; not the probability of the parameter');
    }

    function bootCase() {
      const n = Math.round(state.nb), x = memo(`o${n}`, () => original(n)), B = memo(`b${n}${state.bstat}`, () => bootstrap(x, state.bstat)), f = STATS[state.bstat], est = f(x), k = shown(B.vals.length), v = B.vals.slice(0, k);
      const ci = percentileCI(v.length > 10 ? v : B.vals), all = B.vals, lo = Math.max(0, Math.min(...all) - 1), hi = Math.max(...all) + 1, nb = 40, w = (hi - lo) / nb, h = hist(v, lo, hi, nb).map((c) => c / (k * w)), top = Math.max(...hist(all, lo, hi, nb)) / (all.length * w) * 1.2;
      sq.range([lo, hi], [0, top]); sq.titles(`bootstrap ${SNAME[state.bstat]}`, `density of the ${SNAME[state.bstat]} over ${k} resamples; 95 % percentile interval (orange)`);
      bars(sq, 'h', edges(lo, hi, nb), h, { color: '--c-B' });
      sq.line('est', [est, est], [0, top], { color: '--ink', width: 2 }); sq.line('l', [ci[0], ci[0]], [0, top], { color: '--c-I', width: 2 }); sq.line('u', [ci[1], ci[1]], [0, top], { color: '--c-I', width: 2 });
      const truth = state.bstat === 'mean' ? 10 : 10 * Math.LN2;
      sq.line('truth', [truth, truth], [0, top], { color: '--c-v', width: 1.6, dashed: true });
      const ix = B.idx[Math.min(B.idx.length - 1, Math.floor(time.t * 3) % B.idx.length)], cnt = {}, rx = [], ry = [];
      for (const i of ix) { cnt[i] = (cnt[i] || 0) + 1; rx.push(x[i]); ry.push(0.9 + 0.32 * cnt[i]); }
      const xm = Math.max(40, ...x);
      tr.range([0, xm], [0, 3]); tr.titles('waiting time (min)', 'the one sample we have (bottom) and one resample (stacked: repeats)');
      tr.dots('o', x, x.map(() => 0.4), { color: '--c-B', size: 6 }); tr.dots('r', rx, ry, { color: '--c-I', size: 6 });
      const m = mean(x), s = sd(x), t = tQ(0.975, n - 1), tl = m - t * s / Math.sqrt(n), tu = m + t * s / Math.sqrt(n);
      br.range([0, 3], [0, Math.max(25, ci[1] * 1.2, tu * 1.2)]); br.titles('', 'intervals: bootstrap (orange), t formula (blue, mean only); green: true value');
      rect(br, 'bi', 0.6, 1.3, ci[0], ci[1], '--c-I'); if (state.bstat === 'mean') rect(br, 'ti', 1.7, 2.4, tl, tu, '--c-B'); else br.hide('ti');
      br.line('tv', [0, 3], [truth, truth], { color: '--c-v', dashed: true, width: 1.4 });
      const bs = lin(10, B.vals.length, 100).map(Math.round), cis = memo(`c${n}${state.bstat}`, () => bs.map((j) => percentileCI(B.vals.slice(0, j))));
      plots.aux.draw({ xlim: [10, B.vals.length], cursor: k, series: [{ x: bs, y: cis.map((c) => c[0]), color: '--c-I', label: 'interval ends as resamples accumulate' }, { x: bs, y: cis.map((c) => c[1]), color: '--c-I', label: '' }] });
      hud.set('a', `sample of ${n} waits: ${SNAME[state.bstat]} ${fmt(est)} min; ${k} resamples (n values drawn with replacement each)`);
      hud.set('b', `bootstrap 95 % interval [${fmt(ci[0])}, ${fmt(ci[1])}]${state.bstat === 'mean' ? `; t formula [${fmt(tl)}, ${fmt(tu)}]` : ''}; bootstrap standard error ${fmt(sd(v))}`, ci[0] <= truth && truth <= ci[1] ? 'good' : 'bad');
      hud.set('c', n < 10 ? 'with very few values the resamples can only reshuffle them: the interval is too narrow' : 'the data stand in for the population: resampling them imitates repeating the experiment', n < 10 ? 'bad' : '');
    }

    return {
      changed() { charts.forEach((k) => k.show(true)); ctx.setClock(state.case === 'mle' ? 0 : D); },
      update() {
        charts.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        ({ sampling: samplingCase, mle: mleCase, bootstrap: bootCase })[state.case]();
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
