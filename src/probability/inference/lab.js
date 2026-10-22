// Statistical inference: confidence intervals drawn one experiment at a time (how many cover the truth),
// and a hypothesis test as two distributions with a threshold (α, p-value, power).
import { createChart } from '../../lib/viz/chart.js';
import { intervals, test, Phi, zOf } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 5.0, 4.6], TR = [1.3, 0.55, 3.2, 1.9], BR = [1.3, -2.35, 3.2, 1.9], WIDE = [-4.4, -2.35, 8.8, 2.0], TOPW = [-4.4, 0.55, 8.8, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const pdf = (x, m = 0) => Math.exp(-0.5 * (x - m) ** 2) / Math.sqrt(2 * Math.PI);

export default {
  id: 'inference', title: 'Statistical inference', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 12, loop: false,
  defaults: { n: 10, conf: 0.95, d: 0.4, nt: 25, alpha: 0.05, zobs: 1.2 },
  cases: [
    { id: 'ci', label: 'Confidence intervals', set: {}, examples: [
      { id: 'c80', label: '80% intervals: shorter, miss more', controls: ['conf'], set: { conf: 0.8 } },
      { id: 'n100', label: 'n = 100: narrower, same 95%', controls: ['n'], set: { n: 100 } },
    ] },
    { id: 'test', label: 'Hypothesis test', set: {}, examples: [
      { id: 'big', label: 'More data: more power', controls: ['nt'], set: { nt: 100 } },
      { id: 'strict', label: 'α = 0.01: fewer false alarms, less power', controls: ['alpha'], set: { alpha: 0.01 } },
    ] },
  ],
  controls: [
    { title: 'Experiment', show: (s) => s.case === 'ci', items: [{ id: 'n', label: 'Sample size n', unit: '', min: 2, max: 200, log: true }, { id: 'conf', label: 'Confidence level', unit: '', min: 0.5, max: 0.99, step: 0.01 }] },
    { title: 'Test', show: (s) => s.case === 'test', items: [{ id: 'd', label: 'True effect (in σ)', unit: '', min: 0, max: 1.5, step: 0.01 }, { id: 'nt', label: 'Sample size n', unit: '', min: 2, max: 200, log: true }, { id: 'alpha', label: 'Significance α', unit: '', min: 0.001, max: 0.2, log: true }, { id: 'zobs', label: 'Observed z', unit: '', min: -1, max: 5, step: 0.01 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), top = createChart(ctx, { box: TOPW }), wide = createChart(ctx, { box: WIDE }), charts = [sq, tr, br, top, wide];
    let I = null, ik = '';
    return {
      changed() { const ci = state.case === 'ci'; charts.forEach((k) => k.show(false)); (ci ? [sq, tr, br] : [top, wide]).forEach((k) => k.show(true)); ctx.setClock(ci ? 12 : 0); },
      update() {
        if (state.case === 'ci') {
          const n = Math.round(state.n), key = `${n},${state.conf}`, M = 60; if (key !== ik) { ik = key; I = intervals(M, n, state.conf); }
          const k = Math.max(1, Math.min(M, Math.floor(Math.min(1, time.t / 11) * M))), S = I.slice(0, k), w = 2 * 2 * 2.6 / Math.sqrt(2);
          sq.range([10 - w, 10 + w], [0, M + 1]); sq.titles('value (true mean μ = 10, dashed)', 'experiment number: each bar is one interval x̄ ± z·σ/√n');
          S.forEach((iv, i) => sq.line(`i${i}`, [iv.lo, iv.hi], [i + 1, i + 1], { color: iv.hit ? '--c-B' : '--c-north', width: 3 })); for (let i = k; i < M; i++) sq.hide(`i${i}`);
          sq.dots('x', S.map((iv) => iv.x), S.map((_, i) => i + 1), { color: '--ink', size: 5 }); sq.line('mu', [10, 10], [0, M + 1], { color: '--ink-dim', dashed: true, width: 1.2 });
          const hits = S.filter((iv) => iv.hit).length, cs = lin(0.5, 0.99, 50);
          tr.range([0.5, 0.99], [0, 4]); tr.titles('confidence level', 'half-width (in σ/√n): z'); tr.line('z', cs, cs.map((c) => zOf(1 - (1 - c) / 2)), { color: '--c-B' }); tr.dots('q', [state.conf], [zOf(1 - (1 - state.conf) / 2)], { color: '--accent', size: 11 });
          const ns = lin(0.3, 2.3, 60); br.range([0.3, 2.3], [0, 4]); br.titles('log₁₀ n', 'interval width (σ = 2)'); br.line('w', ns, ns.map((l) => 2 * zOf(1 - (1 - state.conf) / 2) * 2 / Math.sqrt(10 ** l)), { color: '--c-v' }); br.dots('q', [Math.log10(n)], [2 * zOf(1 - (1 - state.conf) / 2) * 2 / Math.sqrt(n)], { color: '--accent', size: 11 });
          hud.set('a', `${hits} of ${k} intervals contain μ (${fmt(100 * hits / k, 3)}%) — the method promises ${Math.round(state.conf * 100)}% in the long run`);
          hud.set('b', 'the interval is random, μ is fixed: “95%” describes how often the procedure catches μ, not one interval'); hud.set('c', `width ∝ z/√n: ${Math.round(state.conf * 100)}% needs z = ${fmt(zOf(1 - (1 - state.conf) / 2))}; quadruple n to halve it`);
          plots.aux.draw({ xlim: [1, M], cursor: k, series: [{ x: I.map((_, i) => i + 1), y: I.map((_, i) => 100 * I.slice(0, i + 1).filter((iv) => iv.hit).length / (i + 1)), color: '--c-B', label: 'running coverage (%) vs experiments' }] });
        } else {
          const n = Math.round(state.nt), T = test(state.d, n, state.alpha), zs = lin(-4, 8, 500), pv = 1 - Phi(state.zobs);
          top.range([-4, 8], [0, 0.45]); top.titles('test statistic z = (x̄ − 0)/(σ/√n)', 'density: no effect H₀ (blue), true effect (orange)');
          top.line('h0', zs, zs.map((z) => pdf(z)), { color: '--c-B' }); top.line('h1', zs, zs.map((z) => pdf(z, T.shift)), { color: '--c-I' });
          const tail = zs.filter((z) => z >= T.zc); top.stems('a', tail.filter((_, i) => i % 3 === 0), tail.filter((_, i) => i % 3 === 0).map((z) => pdf(z)), { color: '--c-north', width: 1.2 });
          top.line('zc', [T.zc, T.zc], [0, 0.45], { color: '--ink', width: 1.4 }); top.line('obs', [state.zobs, state.zobs], [0, 0.45], { color: '--accent', dashed: true, width: 1.6 });
          const ns = lin(0.3, 2.3, 60); wide.range([0.3, 2.3], [0, 1]); wide.titles('log₁₀ sample size n', 'power = P(reject H₀ | effect is real)');
          wide.line('p', ns, ns.map((l) => test(state.d, 10 ** l, state.alpha).power), { color: '--c-I' }); wide.line('a', [0.3, 2.3], [state.alpha, state.alpha], { color: '--c-north', dashed: true, width: 1 }); wide.dots('q', [Math.log10(n)], [T.power], { color: '--accent', size: 12 });
          hud.set('a', `reject H₀ when z > ${fmt(T.zc)} (red tail = α = ${fmt(state.alpha)}: false alarms) · power ${fmt(T.power)} (miss rate β = ${fmt(T.beta)})`, T.power > 0.8 ? 'good' : 'bad');
          hud.set('b', `observed z = ${state.zobs}: p-value = P(z this large | H₀) = ${fmt(pv)} → ${pv < state.alpha ? 'reject H₀' : 'not enough evidence'}`, pv < state.alpha ? 'good' : '');
          hud.set('c', 'the p-value is NOT the probability that H₀ is true; it is how surprising the data would be if it were');
          const ds = lin(0, 1.5, 60); plots.aux.draw({ xlim: [0, 1.5], cursor: state.d, series: [{ x: ds, y: ds.map((d) => test(d, n, state.alpha).power), color: '--c-I', label: `power vs true effect (σ units), n = ${n}` }] });
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
