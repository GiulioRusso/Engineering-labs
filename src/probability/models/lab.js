// Statistical models: inference for a regression line (bands, residuals, slope test) and the Bayesian
// update of a coin's bias, flip by flip.
import { createChart } from '../../lib/viz/chart.js';
import { lin, fmt, fmtP, betaPdf, sd } from '../core/model.js';
import { rect } from '../core/draw.js';
import { TRUE, lineData, regress, normalScores, PRIORS, flips, posterior, wald } from './model.js';

const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 12;

export default {
  id: 'models', title: 'Statistical models', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { kind: 'linear', n: 25, sigma: 1.5, prior: 'flat', p: 0.7, N: 100 },
  cases: [
    { id: 'regression', label: 'Regression inference', set: {}, examples: [
      { id: 'more', label: '200 points: the mean band shrinks, the prediction band does not', set: { n: 200 } },
      { id: 'curved', label: 'A curve fitted with a line', set: { kind: 'curved' } },
      { id: 'funnel', label: 'Noise growing with x', set: { kind: 'funnel', n: 80 } },
      { id: 'few', label: 'Five points', set: { n: 5 } },
    ] },
    { id: 'bayes', label: 'Bayesian update', set: {}, examples: [
      { id: 'fair', label: 'Prior: probably fair', set: { prior: 'fair' } },
      { id: 'wrong', label: 'A confident, wrong prior', set: { prior: 'wrong' } },
      { id: 'few', label: 'Only 10 flips', set: { N: 10 } },
      { id: 'many', label: '1000 flips: the prior stops mattering', set: { prior: 'wrong', N: 1000 } },
    ] },
  ],
  controls: [
    { title: 'Data', show: (s) => s.case === 'regression', items: [
      { id: 'kind', label: 'Truth', type: 'select', options: [['linear', 'A line + noise'], ['curved', 'A curve + noise'], ['funnel', 'A line, noise growing with x']] },
      { id: 'n', label: 'Points', unit: '', min: 4, max: 300, log: true },
      { id: 'sigma', label: 'Noise σ', unit: '', min: 0.2, max: 5, step: 0.05 },
    ] },
    { title: 'Coin', show: (s) => s.case === 'bayes', items: [
      { id: 'prior', label: 'Prior belief', type: 'select', options: Object.entries(PRIORS).map(([k, v]) => [k, v.label]) },
      { id: 'p', label: 'True chance of heads', unit: '', min: 0.02, max: 0.98, step: 0.01 },
      { id: 'N', label: 'Flips', unit: '', min: 5, max: 1000, log: true },
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

    function regCase() {
      const n = Math.round(state.n), Dt = memo(`l${state.kind}${n}${state.sigma}`, () => lineData(state.kind, n, state.sigma)), R = regress(Dt.x, Dt.y), xs = lin(0, 10, 100);
      sq.range([0, 10], [-4, 16]); sq.titles('x', 'y: fit (orange), 95 % band for the mean line (green), for a new point (blue dashed)');
      sq.dots('p', Dt.x, Dt.y, { color: '--ink', size: n > 150 ? 4 : 7 }); sq.line('fit', xs, xs.map(R.fit), { color: '--c-I', width: 2.4 });
      sq.line('cu', xs, xs.map((x) => R.fit(x) + R.band(x, false)), { color: '--c-v', width: 1.8 }); sq.line('cl', xs, xs.map((x) => R.fit(x) - R.band(x, false)), { color: '--c-v', width: 1.8 });
      sq.line('pu', xs, xs.map((x) => R.fit(x) + R.band(x, true)), { color: '--c-B', width: 1.4, dashed: true }); sq.line('pl', xs, xs.map((x) => R.fit(x) - R.band(x, true)), { color: '--c-B', width: 1.4, dashed: true });
      const fitted = Dt.x.map(R.fit), rm = Math.max(3, ...R.res.map(Math.abs)) * 1.1;
      tr.range([Math.min(...fitted) - 0.5, Math.max(...fitted) + 0.5], [-rm, rm]); tr.titles('fitted value', 'residuals: no pattern, even spread, if the model is right');
      tr.dots('r', fitted, R.res, { color: '--c-north', size: 6 });
      const ks = lin(4, n, Math.min(60, n - 3)).map(Math.round), fits = memo(`k${state.kind}${n}${state.sigma}`, () => ks.map((k) => regress(Dt.x.slice(0, k), Dt.y.slice(0, k))));
      br.range([4, Math.max(5, n)], [-1, 2.5]); br.titles('points used', 'slope with its 95 % interval; dashed: 0.8 (true), 0 (no relation)');
      br.line('b', ks, fits.map((f) => f.b), { color: '--c-I', width: 2 }); br.line('bu', ks, fits.map((f) => f.ci[1]), { color: '--c-v', width: 1.4 }); br.line('bl', ks, fits.map((f) => f.ci[0]), { color: '--c-v', width: 1.4 });
      br.line('t', [4, n], [TRUE.b, TRUE.b], { color: '--ink-dim', dashed: true, width: 1.2 }); br.line('z', [4, n], [0, 0], { color: '--c-north', dashed: true, width: 1 });
      const sr = [...R.res].sort((a, b) => a - b), ns = normalScores(n);
      plots.aux.draw({ xlim: [-3, 3], series: [{ x: ns, y: sr.map((r) => r / R.s), color: '--c-north', label: 'normal Q-Q plot: sorted residuals ÷ s against normal scores; a straight diagonal = normal noise' }, { x: [-3, 3], y: [-3, 3], color: '--ink-dim', label: '' }] });
      hud.set('a', `y = ${fmt(R.a)} + ${fmt(R.b)} x; slope 95 % interval [${fmt(R.ci[0])}, ${fmt(R.ci[1])}]${state.kind !== 'curved' ? ' (true 0.8)' : ''}`, state.kind !== 'curved' && R.ci[0] <= TRUE.b && TRUE.b <= R.ci[1] ? 'good' : '');
      hud.set('b', `slope test: t = ${fmt(R.b)}/${fmt(R.seB)} = ${fmt(R.t)}, ${R.df} df, p = ${fmtP(R.p)}; R² = ${fmt(R.r2)}, residual s = ${fmt(R.s)}`);
      hud.set('c', state.kind === 'curved' ? 'the residuals form a U: a line is the wrong model, however high R² is' : state.kind === 'funnel' ? 'the residuals fan out: the bands are too wide on the left, too narrow on the right' : 'the mean band narrows like 1/√n; a new point keeps its own noise σ', state.kind === 'linear' ? '' : 'bad');
    }

    function bayesCase() {
      const P = PRIORS[state.prior], N = Math.round(state.N), F = memo(`f${state.p}`, () => flips(state.p, 1000)), n = Math.max(0, Math.min(N, Math.floor(N * Math.min(1, time.t / (D - 1))))), h = F.slice(0, n).reduce((s, v) => s + v, 0), Q = posterior(P, h, n), ps = lin(0.001, 0.999, 400);
      const post = ps.map((p) => betaPdf(p, Q.a, Q.b)), prior = ps.map((p) => betaPdf(p, P.a, P.b)), like = ps.map((p) => betaPdf(p, h + 1, n - h + 1)), top = Math.min(40, Math.max(4, ...post, ...prior) * 1.1);
      sq.range([0, 1], [0, top]); sq.titles('chance of heads p', `density: prior (blue dashed), likelihood (green), posterior (orange) after ${n} flips, ${h} heads`);
      sq.line('pr', ps, prior, { color: '--c-B', width: 1.8, dashed: true }); sq.line('lk', ps, like, { color: '--c-v', width: 1.4 }); sq.line('po', ps, post, { color: '--c-I', width: 2.6 });
      const inCI = ps.filter((p) => p >= Q.ci[0] && p <= Q.ci[1]); sq.stems('ci', inCI.filter((_, i) => i % 3 === 0), inCI.filter((_, i) => i % 3 === 0).map((p) => betaPdf(p, Q.a, Q.b)), { color: '--c-I', width: 1 });
      sq.line('true', [state.p, state.p], [0, top], { color: '--ink', width: 1.4, dashed: true });
      const ks = lin(1, N, Math.min(N, 150)).map(Math.round), run = memo(`b${state.prior}${state.p}${N}`, () => ks.map((k) => { const hk = F.slice(0, k).reduce((s, v) => s + v, 0); return { q: posterior(P, hk, k), w: wald(hk, k) }; }));
      tr.range([1, N], [0, 1]); tr.titles('flips', 'posterior mean and 95 % credible interval (orange); Wald interval (blue dashed)');
      tr.line('m', ks, run.map((r) => r.q.mean), { color: '--c-I', width: 2 }); tr.line('u', ks, run.map((r) => r.q.ci[1]), { color: '--c-I', width: 1.2 }); tr.line('l', ks, run.map((r) => r.q.ci[0]), { color: '--c-I', width: 1.2 });
      tr.line('wu', ks, run.map((r) => Math.min(1, r.w[1])), { color: '--c-B', width: 1.2, dashed: true }); tr.line('wl', ks, run.map((r) => Math.max(0, r.w[0])), { color: '--c-B', width: 1.2, dashed: true });
      tr.line('tp', [1, N], [state.p, state.p], { color: '--ink-dim', width: 1, dashed: true }); if (n > 0) tr.line('now', [n, n], [0, 1], { color: '--accent', width: 1.4 }); else tr.hide('now');
      const pm = P.a / (P.a + P.b), dm = n ? h / n : NaN;
      br.range([0, 3], [0, 1]); br.titles('', 'estimates of p: prior mean (blue), data h/n (green), posterior mean (orange)');
      rect(br, 'pm', 0.2, 0.8, 0, pm, '--c-B'); if (n) rect(br, 'dm', 1.2, 1.8, 0, dm, '--c-v'); else br.hide('dm'); rect(br, 'qm', 2.2, 2.8, 0, Q.mean, '--c-I');
      put(fmt(pm, 2), br.mx(0.5), br.my(pm) + 0.14); if (n) put(fmt(dm, 2), br.mx(1.5), br.my(dm) + 0.14); put(fmt(Q.mean, 2), br.mx(2.5), br.my(Q.mean) + 0.14);
      plots.aux.draw({ xlim: [1, N], cursor: Math.max(1, n), series: [{ x: ks, y: run.map((r) => r.q.ci[1] - r.q.ci[0]), color: '--c-I', label: 'width of the credible interval: shrinks like 1/√n' }] });
      hud.set('a', `posterior Beta(${P.a} + ${h}, ${P.b} + ${n - h}) = Beta(${Q.a}, ${Q.b}): mean ${fmt(Q.mean)}, 95 % credible interval [${fmt(Q.ci[0])}, ${fmt(Q.ci[1])}]`, Q.ci[0] <= state.p && state.p <= Q.ci[1] ? 'good' : 'bad');
      hud.set('b', `posterior mean = ${fmt(Q.w, 2)} × data + ${fmt(1 - Q.w, 2)} × prior: the prior counts like ${P.a + P.b} extra flips`);
      hud.set('c', n ? `Wald interval [${fmt(wald(h, n)[0])}, ${fmt(wald(h, n)[1])}]; with a flat prior the two nearly agree once n is large` : 'no data yet: the posterior is the prior');
    }

    return {
      changed() { charts.forEach((k) => k.show(true)); ctx.setClock(state.case === 'bayes' ? D : 0); },
      update() {
        charts.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        (state.case === 'regression' ? regCase : bayesCase)();
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
