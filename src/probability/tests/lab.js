// Hypothesis tests on data: z against t (one-sample, two-sample, paired), the distribution of p-values
// over many experiments (power, false alarms, testing many outcomes), one-way ANOVA, Mann–Whitney.
import { createChart } from '../../lib/viz/chart.js';
import { mean, sd, lin, fmt, fmtP, normPdf, normQ, tPdf, tQ, fPdf, fQ } from '../core/model.js';
import { bars, hist, edges, rect } from '../core/draw.js';
import { SIGMA, MU0, groups, test, tTwo, experiments, power, anovaData, anova, patternVar, mannWhitney, twoGroups } from './model.js';

const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 12;
const KIND = { one: 'one-sample', two: 'two-sample', paired: 'paired' };

export default {
  id: 'tests', title: 'Hypothesis tests', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { kind: 'two', d: 1, n: 10, pd: 0, pn: 15, alpha: 0.05, looks: 1, k: 3, an: 10, spread: 1, noise: 2, md: 1.5, out: 0 },
  cases: [
    { id: 'ttest', label: 'z and t tests', set: {}, examples: [
      { id: 'one', label: 'One sample against μ₀ = 10', set: { kind: 'one', d: 1, n: 10 } },
      { id: 'paired', label: 'Same data, paired: far stronger', set: { kind: 'paired', d: 1, n: 10 } },
      { id: 'tiny', label: 'n = 3: t has fat tails', set: { kind: 'one', d: 2, n: 3 } },
      { id: 'large', label: 'n = 60: t ≈ z', set: { kind: 'two', d: 1, n: 60 } },
    ] },
    { id: 'pvalues', label: 'p-values and power', set: {}, examples: [
      { id: 'effect', label: 'A real effect: p piles up near 0', set: { pd: 1.5, pn: 15 } },
      { id: 'low', label: 'Low power: most effects missed', set: { pd: 1, pn: 8 } },
      { id: 'hack', label: 'Test 20 outcomes, report the best', set: { pd: 0, looks: 20 } },
      { id: 'strict', label: 'α = 0.005', set: { pd: 1.5, alpha: 0.005 } },
    ] },
    { id: 'anova', label: 'ANOVA', set: {}, examples: [
      { id: 'none', label: 'No differences: F ≈ 1', set: { spread: 0 } },
      { id: 'clear', label: 'Clear differences', set: { spread: 2.5 } },
      { id: 'noisy', label: 'Same means, more noise', set: { spread: 1, noise: 4 } },
      { id: 'five', label: 'Five groups', set: { k: 5, spread: 1.5 } },
    ] },
    { id: 'nonparam', label: 'Rank test', set: {}, examples: [
      { id: 'one', label: 'One wild value', set: { out: 25 } },
      { id: 'huge', label: 'A huge one: t gives up', set: { out: 60 } },
      { id: 'none', label: 'No shift', set: { md: 0, out: 0 } },
    ] },
  ],
  controls: [
    { title: 'Experiment', show: (s) => s.case === 'ttest', items: [
      { id: 'kind', label: 'Design', type: 'segmented', options: [['one', 'One'], ['two', 'Two'], ['paired', 'Paired']] },
      { id: 'd', label: 'True effect', unit: '', min: 0, max: 4, step: 0.05, hint: 'σ = 2' },
      { id: 'n', label: 'n per group', unit: '', min: 2, max: 100, log: true },
    ] },
    { title: 'Many experiments', show: (s) => s.case === 'pvalues', items: [
      { id: 'pd', label: 'True effect', unit: '', min: 0, max: 3, step: 0.05, hint: 'σ = 2' },
      { id: 'pn', label: 'n per group', unit: '', min: 3, max: 100, log: true },
      { id: 'alpha', label: 'Significance α', unit: '', min: 0.001, max: 0.2, log: true },
      { id: 'looks', label: 'Outcomes tested per experiment', unit: '', min: 1, max: 20, step: 1 },
    ] },
    { title: 'Groups', show: (s) => s.case === 'anova', items: [
      { id: 'k', label: 'Groups', unit: '', min: 2, max: 5, step: 1 },
      { id: 'an', label: 'n per group', unit: '', min: 3, max: 60, log: true },
      { id: 'spread', label: 'Spread of the true means', unit: '', min: 0, max: 4, step: 0.05 },
      { id: 'noise', label: 'Noise within groups σ', unit: '', min: 0.5, max: 6, step: 0.05 },
    ] },
    { title: 'Two groups of 12', show: (s) => s.case === 'nonparam', items: [
      { id: 'md', label: 'True shift', unit: '', min: 0, max: 4, step: 0.05 },
      { id: 'out', label: 'Add to one value of B', unit: '', min: 0, max: 80, step: 0.5 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 30 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; if (!l) return; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    const cache = {}; const memo = (k, f) => (cache[k] ??= f());
    const jit = (i) => ((i * 0.6180339887) % 1) - 0.5;

    function strips(G, names, lo, hi) {
      sq.range([lo, hi], [0, G.length + 1]);
      G.forEach((g, j) => { const y = G.length - j; sq.dots(`g${j}`, g, g.map((_, i) => y + 0.5 * jit(i)), { color: j % 2 ? '--c-I' : '--c-B', size: 7 });
        const m = mean(g); sq.line(`m${j}`, [m, m], [y - 0.38, y + 0.38], { color: '--ink', width: 3 }); put(names[j], sq.mx(lo) + 0.35, sq.my(y + 0.42)); });
    }

    function tCase() {
      const n = Math.round(state.n), k = state.kind, Dt = memo(`t${k}${state.d}${n}`, () => groups(k, state.d, n)), R = test(k, Dt);
      const G = k === 'one' ? [Dt.a] : [Dt.a, Dt.b], names = k === 'one' ? ['sample'] : k === 'two' ? ['group A', 'group B'] : ['before', 'after'];
      strips(G, names, 0, 22);
      if (k === 'one') sq.line('mu0', [MU0, MU0], [0, 2], { color: '--c-north', width: 1.6, dashed: true });
      if (k === 'paired') { Dt.a.slice(0, 30).forEach((v, i) => sq.line(`p${i}`, [v, Dt.b[i]], [2 + 0.5 * jit(i), 1 + 0.5 * jit(i)], { color: '--ink-dim', width: 1 })); }
      sq.titles('score', `${KIND[k]} data (σ = 2); bars = means${k === 'one' ? '; red dashed = μ₀' : k === 'paired' ? '; lines join each subject' : ''}`);
      const ts = lin(-6, 6, 300), tc = tQ(0.975, R.df);
      tr.range([-6, 6], [0, 0.42]); tr.titles('t', `t distribution, ${R.df} degrees of freedom (blue) against the normal (green)`);
      tr.line('t', ts, ts.map((t) => tPdf(t, R.df)), { color: '--c-B' }); tr.line('z', ts, ts.map((t) => normPdf(t)), { color: '--c-v', width: 1.4, dashed: true });
      const tail = ts.filter((t) => Math.abs(t) >= Math.abs(R.t)); tr.stems('tail', tail, tail.map((t) => tPdf(t, R.df)), { color: '--c-north', width: 1.2 });
      tr.line('obs', [R.t, R.t], [0, 0.42], { color: '--accent', width: 2 }); tr.line('c1', [tc, tc], [0, 0.42], { color: '--ink-dim', width: 1, dashed: true }); tr.line('c2', [-tc, -tc], [0, 0.42], { color: '--ink-dim', width: 1, dashed: true });
      const dfs = lin(0, 2, 60); br.range([0, 2], [1.8, 13]); br.titles('log₁₀ degrees of freedom', 'critical value for 95 % (two-sided): t (blue), z = 1.96 (green)');
      br.line('tq', dfs, dfs.map((l) => tQ(0.975, 10 ** l)), { color: '--c-B' }); br.line('zq', [0, 2], [1.96, 1.96], { color: '--c-v', dashed: true, width: 1.4 }); br.dots('q', [Math.log10(R.df)], [tc], { color: '--accent', size: 12 });
      const ns = lin(2, 100, 99), pw = ns.map((m) => { const df = k === 'two' ? 2 * m - 2 : m - 1, se = k === 'two' ? SIGMA * Math.sqrt(2 / m) : k === 'one' ? SIGMA / Math.sqrt(m) : 0.5 * Math.SQRT2 / Math.sqrt(m); return state.d / se; });
      plots.aux.draw({ xlim: [2, 100], cursor: n, series: [{ x: ns, y: pw, color: '--c-I', label: 'expected t (true effect ÷ standard error) against n' }, { x: [2, 100], y: [1.96, 1.96], color: '--ink-dim', label: '' }] });
      hud.set('a', `difference ${fmt(R.diff)}, standard error ${fmt(R.se)}: t = ${fmt(R.t)} with ${R.df} df`);
      hud.set('b', `p = ${fmtP(R.p)} (two-sided) → ${R.p < 0.05 ? 'significant at 5 %' : 'not significant at 5 %'}; ±${fmt(tc)} needed (z would need ±1.96)`, R.p < 0.05 ? 'good' : '');
      hud.set('c', k === 'paired' ? `same numbers as two groups: p = ${fmtP(tTwo(Dt.a, Dt.b).p)}; pairing removes the person-to-person variation` : 'σ unknown → estimate it with s → t, not z; the extra uncertainty fattens the tails');
    }

    function pCase() {
      const n = Math.round(state.pn), m = Math.round(state.looks), ps = memo(`p${state.pd}${n}${m}`, () => experiments(state.pd, n, m)), M = ps.length, k = Math.max(1, Math.min(M, Math.ceil(M * Math.min(1, time.t / (D - 1))))), v = ps.slice(0, k);
      const h = hist(v, 0, 1, 20).map((c) => c / (k * 0.05)), sig = v.filter((p) => p < state.alpha).length, top = Math.max(4, ...h) * 1.1;
      sq.range([0, 1], [0, top]); sq.titles('p-value', `density of ${m > 1 ? 'the smallest of ' + m + ' p-values' : 'p'} over ${k} experiments; red line = α`);
      bars(sq, 'h', edges(0, 1, 20), h, { color: '--c-B' }); sq.line('one', [0, 1], [1, 1], { color: '--c-v', dashed: true, width: 1.4 }); sq.line('a', [state.alpha, state.alpha], [0, top], { color: '--c-north', width: 2 });
      const ds = lin(0, 3, 80); tr.range([0, 3], [0, 1]); tr.titles('true effect', `power (chance of p < α), n = ${n} per group`);
      tr.line('pw', ds, ds.map((d) => power(d, n, state.alpha, normQ)), { color: '--c-I' }); tr.dots('q', [state.pd], [sig / k], { color: '--accent', size: 12 });
      tr.line('al', [0, 3], [state.alpha, state.alpha], { color: '--c-north', width: 1, dashed: true });
      const nul = state.pd === 0;
      br.range([0, 3], [0, k]); br.titles('', nul ? 'experiments: false alarms (red), correctly quiet (blue)' : 'experiments: effect found (green), missed (red)');
      rect(br, 'y', 0.5, 1.4, 0, sig, nul ? '--c-north' : '--c-v'); rect(br, 'n', 1.6, 2.5, 0, k - sig, nul ? '--c-B' : '--c-north');
      put(String(sig), br.mx(0.95), br.my(sig) + 0.14); put(String(k - sig), br.mx(2.05), br.my(k - sig) + 0.14);
      const ls = lin(1, 20, 20);
      plots.aux.draw({ xlim: [1, 20], cursor: m, series: [{ x: ls, y: ls.map((j) => 1 - (1 - state.alpha) ** j), color: '--c-north', label: 'chance of at least one p < α among j outcomes with no effect: 1 − (1 − α)ʲ' }] });
      hud.set('a', `${sig} of ${k} experiments gave p < ${fmt(state.alpha)} (${fmt(100 * sig / k, 3)} %)`, nul ? (sig / k > 1.5 * state.alpha ? 'bad' : '') : (sig / k > 0.8 ? 'good' : 'bad'));
      hud.set('b', nul ? (m > 1 ? `no effect anywhere, yet ${fmt(100 * (1 - (1 - state.alpha) ** m), 2)} % of experiments find "something": the family-wise error` : `no effect: p is uniform on [0, 1], and α = ${fmt(state.alpha)} of them fall below α by chance`) : `power ≈ ${fmt(power(state.pd, n, state.alpha, normQ), 2)}: ${fmt(100 * (1 - power(state.pd, n, state.alpha, normQ)), 2)} % of real effects missed`);
      hud.set('c', m > 1 ? `Bonferroni: test each at α/${m} = ${fmt(state.alpha / m)} to keep the overall rate at α` : 'p < α is a decision rule with known error rates, not a measure of how big or important an effect is');
    }

    function aCase() {
      const k = Math.round(state.k), n = Math.round(state.an), G = memo(`a${k}${n}${state.spread}${state.noise}`, () => anovaData(k, n, state.spread, state.noise)), A = anova(G);
      strips(G, G.map((_, j) => `group ${'ABCDE'[j]}`), 0, 22); sq.line('gm', [A.gm, A.gm], [0, k + 1], { color: '--c-v', width: 1.6, dashed: true });
      sq.titles('value', 'each group (bars = group means); green dashed = grand mean');
      const fh = Math.max(8, A.F * 1.2, fQ(0.99, A.df1, A.df2)), fs = lin(0.01, fh, 300), fc = fQ(0.95, A.df1, A.df2), ft = Math.max(...fs.map((x) => fPdf(x, A.df1, A.df2)).filter(Number.isFinite).slice(5)) * 1.15 || 1;
      tr.range([0, fh], [0, Math.min(ft, 2.5)]); tr.titles('F', `F distribution (${A.df1}, ${A.df2}) if all means are equal; red = area beyond F`);
      tr.line('f', fs, fs.map((x) => fPdf(x, A.df1, A.df2)), { color: '--c-B' }); const tail = fs.filter((x) => x >= A.F); tr.stems('tail', tail, tail.map((x) => fPdf(x, A.df1, A.df2)), { color: '--c-north', width: 1.2 });
      tr.line('obs', [A.F, A.F], [0, ft], { color: '--accent', width: 2 }); tr.line('c', [fc, fc], [0, ft], { color: '--ink-dim', width: 1, dashed: true });
      const top = Math.max(A.msb, A.msw) * 1.25;
      br.range([0, 3], [0, top]); br.titles('', 'mean squares: between groups (orange), within groups (blue)');
      rect(br, 'b', 0.5, 1.4, 0, A.msb, '--c-I'); rect(br, 'w', 1.6, 2.5, 0, A.msw, '--c-B');
      put(`${fmt(A.msb)}`, br.mx(0.95), br.my(A.msb) + 0.14); put(`${fmt(A.msw)}`, br.mx(2.05), br.my(A.msw) + 0.14);
      const ns = lin(3, 60, 58), v = patternVar(k) * state.spread ** 2;
      plots.aux.draw({ xlim: [3, 60], cursor: n, series: [{ x: ns, y: ns.map((m) => 1 + m * v / state.noise ** 2), color: '--c-I', label: 'expected F against n per group: 1 + n·(variance of true means)/σ²' }] });
      hud.set('a', `between: ${fmt(A.ssb)} / ${A.df1} = ${fmt(A.msb)}; within: ${fmt(A.ssw)} / ${A.df2} = ${fmt(A.msw)}`);
      hud.set('b', `F = ${fmt(A.F)}, p = ${fmtP(A.p)} → ${A.p < 0.05 ? 'at least one mean differs' : 'no evidence that the means differ'}`, A.p < 0.05 ? 'good' : '');
      hud.set('c', `one test for all ${k} groups; ${k * (k - 1) / 2} separate t tests would raise the false-alarm rate`);
    }

    function nCase() {
      const G = twoGroups(state.md, state.out), T = tTwo(G.a, G.b), W = mannWhitney(G.a, G.b), hi = Math.max(25, ...G.b) + 2;
      strips([G.a, G.b], ['A', 'B'], 0, hi); sq.titles('value', 'two groups of 12; small numbers are the ranks of all 24 values');
      [...G.a, ...G.b].forEach((v, i) => { const j = i < 12 ? 0 : 1, y = 2 - j + 0.5 * jit(i % 12); put(String(W.R[i]), sq.mx(v), sq.my(y) + 0.17); });
      const os = lin(0, 80, 81), pt = os.map((o) => { const g = twoGroups(state.md, o); return tTwo(g.a, g.b).p; }), pm = os.map((o) => { const g = twoGroups(state.md, o); return mannWhitney(g.a, g.b).p; });
      tr.range([0, 80], [0, 1]); tr.titles('added to one value of B', 'p-value: t test (blue), Mann–Whitney (green)');
      tr.line('t', os, pt, { color: '--c-B' }); tr.line('m', os, pm, { color: '--c-v' }); tr.line('a', [0, 80], [0.05, 0.05], { color: '--c-north', dashed: true, width: 1 });
      tr.dots('q', [state.out, state.out], [T.p, W.p], { color: '--accent', size: 10 });
      br.range([0, 3], [0, 230]); br.titles('', 'rank sums: A (blue), B (orange); dashed = 150 each if no difference');
      rect(br, 'a', 0.5, 1.4, 0, W.Ra, '--c-B'); rect(br, 'b', 1.6, 2.5, 0, W.Rb, '--c-I'); br.line('e', [0, 3], [150, 150], { color: '--ink-dim', dashed: true, width: 1.2 });
      plots.aux.draw({ xlim: [0, 80], cursor: state.out, series: [{ x: os, y: os.map((o) => sd(twoGroups(state.md, o).b)), color: '--c-I', label: 'standard deviation of group B: one value inflates it' }] });
      hud.set('a', `t test: difference ${fmt(T.diff)}, t = ${fmt(T.t)}, p = ${fmtP(T.p)}`, T.p < 0.05 ? 'good' : 'bad');
      hud.set('b', `Mann–Whitney: U = ${W.U} of 144, z = ${fmt(W.z)}, p = ${fmtP(W.p)}`, W.p < 0.05 ? 'good' : 'bad');
      hud.set('c', 'ranks only know the order: the largest value has rank 24 however large it is');
    }

    return {
      changed() { charts.forEach((k) => k.show(true)); ctx.setClock(state.case === 'pvalues' ? D : 0); },
      update() {
        charts.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        ({ ttest: tCase, pvalues: pCase, anova: aCase, nonparam: nCase })[state.case]();
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
