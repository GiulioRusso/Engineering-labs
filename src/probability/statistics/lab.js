// Statistics: probability as area under a distribution, Bayes' theorem on a population of 1000 people,
// the central limit theorem with sample means, random walks spreading as √n, and π by throwing darts.
import { createChart } from '../../lib/viz/chart.js';
import { DIST, bayes, sampleMeans, walks, monteCarloPi } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const TOP = [-4.3, 0.55, 8.85, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0], SQL = [-4.3, -2.35, 4.4, 4.9], RIGHT = [0.6, -2.35, 3.95, 4.9];
const hist = (v, lo, hi, n) => { const h = new Array(n).fill(0); for (const x of v) { const i = Math.floor((x - lo) / (hi - lo) * n); if (i >= 0 && i < n) h[i]++; } return h; };

export default {
  id: 'statistics', title: 'Statistics', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10,
  defaults: { dist: 'normal', p1: 0, p2: 1, lo: -1, hi: 1, prev: 0.01, se: 0.99, sp: 0.95, n: 4, steps: 100, nw: 30, pw: 0.5 },
  cases: [
    { id: 'dist', label: 'Distributions', set: {}, examples: [
      { id: 'two', label: 'Normal: 95 % within 2σ', controls: ['lo', 'hi'], set: { dist: 'normal', p1: 0, p2: 1, lo: -2, hi: 2 } },
      { id: 'exp', label: 'Exponential: waiting times', controls: ['p1', 'hi'], set: { dist: 'exponential', p1: 0.5, lo: 0, hi: 2 } },
      { id: 'poisson', label: 'Poisson λ = 4', controls: ['p1'], set: { dist: 'poisson', p1: 4, lo: 2, hi: 6 } },
      { id: 'binom', label: 'Binomial n = 20, p = 0.3', controls: ['p2'], set: { dist: 'binomial', p1: 20, p2: 0.3, lo: 4, hi: 8 } },
    ] },
    { id: 'bayes', label: "Bayes' theorem", set: {}, examples: [
      { id: 'common', label: 'Common disease: 20 %', controls: ['prev'], set: { prev: 0.2 } },
      { id: 'better', label: 'Better specificity: 99.9 %', controls: ['sp'], set: { sp: 0.999 } },
    ] },
    { id: 'clt', label: 'Sample means', set: {}, examples: [
      { id: 'one', label: 'n = 1: the skewed parent', controls: ['n'], set: { n: 1 } },
      { id: 'big', label: 'n = 50: narrow and normal', controls: ['n'], set: { n: 50 } },
    ] },
    { id: 'walk', label: 'Random walk', set: {}, examples: [
      { id: 'long', label: '400 steps: twice as far, not four', controls: ['steps'], set: { steps: 400 } },
      { id: 'drift', label: 'Biased coin: drift', controls: ['pw'], set: { pw: 0.6 } },
    ] },
    { id: 'pi', label: 'Monte Carlo π', set: {}, examples: [] },
  ],
  controls: [
    { title: 'Distribution', show: (s) => s.case === 'dist', items: [
      { id: 'dist', label: 'Family', type: 'select', options: Object.entries(DIST).map(([k, v]) => [k, v.label]) },
      { id: 'p1', label: 'μ / a / λ / n', unit: '', min: -3, max: 30, step: 0.1 }, { id: 'p2', label: 'σ / b / p', unit: '', min: 0.05, max: 5, step: 0.01, show: (s) => ['normal', 'uniform', 'binomial'].includes(s.dist) },
      { id: 'lo', label: 'From', unit: '', min: -5, max: 30, step: 0.1 }, { id: 'hi', label: 'To', unit: '', min: -5, max: 30, step: 0.1 },
    ] },
    { title: 'Test', show: (s) => s.case === 'bayes', items: [
      { id: 'prev', label: 'Prevalence (who is ill)', unit: '', min: 0.001, max: 0.5, log: true },
      { id: 'se', label: 'Sensitivity P(+ | ill)', unit: '', min: 0.5, max: 0.999, step: 0.001 }, { id: 'sp', label: 'Specificity P(− | healthy)', unit: '', min: 0.5, max: 0.999, step: 0.001 },
    ] },
    { title: 'Sampling', show: (s) => s.case === 'clt', items: [{ id: 'n', label: 'Sample size n', unit: '', min: 1, max: 100, step: 1 }] },
    { title: 'Walk', show: (s) => s.case === 'walk', items: [{ id: 'steps', label: 'Steps', unit: '', min: 10, max: 400, step: 10 }, { id: 'pw', label: 'P(step right)', unit: '', min: 0.3, max: 0.7, step: 0.01 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT }), sql = createChart(ctx, { box: SQL, grid: false, xTicks: false, yTicks: false }), right = createChart(ctx, { box: RIGHT }), all = [top, bot, sql, right];
    const PI = monteCarloPi(4000), CW = {};
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); ({ dist: [top, bot], bayes: [sql, right], clt: [top, bot], walk: [top, bot], pi: [sql, right] })[c].forEach((k) => k.show(true)); ctx.setClock(c === 'pi' || c === 'walk' ? 10 : 0); },
      update() {
        const c = state.case, u = (time.t % 10) / 10;
        if (c === 'dist') {
          const D = DIST[state.dist], a = state.dist === 'binomial' ? Math.round(Math.max(1, state.p1)) : state.dist === 'normal' || state.dist === 'uniform' ? state.p1 : Math.max(0.05, state.p1), b = state.dist === 'binomial' ? Math.max(0, Math.min(1, state.p2)) : state.dist === 'uniform' ? Math.max(a + 0.1, state.p2) : state.p2;
          const m = D.mean(a, b), s = D.sd(a, b), x0 = D.cont ? m - 4 * s : 0, x1 = D.cont ? m + 4 * s : Math.max(10, m + 4 * s), lo = Math.min(state.lo, state.hi), hi = Math.max(state.lo, state.hi);
          if (D.cont) { const xs = Array.from({ length: 401 }, (_, i) => x0 + (x1 - x0) * i / 400), ys = xs.map((x) => D.pdf(x, a, b)), mx = Math.max(...ys); top.range([x0, x1], [0, mx * 1.15]); top.titles('x', `probability density f(x): ${D.label}, probability = shaded area`); top.line('p', xs, ys, { color: '--c-B' }); const sx = xs.filter((x) => x >= lo && x <= hi); top.stems('a', sx, sx.map((x) => D.pdf(x, a, b)), { color: '--c-v', width: 1.4 }); }
          else { const ks = Array.from({ length: Math.ceil(x1) + 1 }, (_, i) => i), ps = ks.map((k) => D.pdf(k, a, b)); top.range([-0.5, x1 + 0.5], [0, Math.max(...ps) * 1.15]); top.titles('k', `probability P(k): ${D.label}, sum of the green bars`); top.stems('p', ks, ps, { color: '--c-B', width: 6 }); top.stems('a', ks.filter((k) => k >= lo && k <= hi), ks.filter((k) => k >= lo && k <= hi).map((k) => D.pdf(k, a, b)), { color: '--c-v', width: 6 }); top.hide('p2'); }
          const P = D.cont ? D.cdf(hi, a, b) - D.cdf(lo, a, b) : D.cdf(hi, a, b) - D.cdf(Math.ceil(lo) - 1, a, b);
          const cx = Array.from({ length: 401 }, (_, i) => x0 + (x1 - x0) * i / 400); bot.range([x0, x1], [0, 1.05]); bot.titles('x', 'cumulative F(x) = P(X ≤ x): the probability is the rise between the two lines'); bot.line('c', cx, cx.map((x) => D.cdf(x, a, b)), { color: '--c-I' });
          bot.line('l', [lo, lo], [0, 1.05], { color: '--c-v', dashed: true, width: 1.2 }); bot.line('h', [hi, hi], [0, 1.05], { color: '--c-v', dashed: true, width: 1.2 });
          hud.set('a', `P(${fmt(lo)} ≤ X ≤ ${fmt(hi)}) = ${fmt(P, 4)}`); hud.set('b', `mean ${fmt(m)}, standard deviation ${fmt(s)}`); hud.set('c', D.cont ? 'for a continuous variable P(X = x) = 0: only intervals have probability' : 'a discrete variable: each value has its own probability');
          plots.aux.draw({ xlim: [x0, x1], series: [{ x: cx, y: cx.map((x) => D.cdf(x, a, b)), color: '--c-I', label: 'F(x)' }] });
        } else if (c === 'bayes') {
          // 1000 people on a 40 × 25 grid, coloured by truth and test result
          const N = 1000, ill = Math.round(N * state.prev), tp = Math.round(ill * state.se), fp = Math.round((N - ill) * (1 - state.sp)), groups = [[], [], [], []];
          for (let i = 0; i < N; i++) { const x = i % 40, y = Math.floor(i / 40), g = i < tp ? 0 : i < ill ? 1 : i < ill + fp ? 2 : 3; groups[g].push([x, y]); }
          sql.range([-1, 40], [-1, 25]); sql.titles('', '1000 people: ill & positive · ill & negative · healthy & positive · healthy & negative');
          ['--c-north', '--c-I', '--c-E', '--c-ref'].forEach((col, g) => sql.dots(`g${g}`, groups[g].map((p) => p[0]), groups[g].map((p) => p[1]), { color: col, size: g === 3 ? 4 : 7 }));
          const ppv = bayes(state.prev, state.se, state.sp), pr = Array.from({ length: 101 }, (_, i) => 10 ** (-3 + 2.7 * i / 100));
          right.range([-3, -0.3], [0, 1]); right.titles('log₁₀ prevalence', 'P(ill | positive)'); right.line('p', pr.map(Math.log10), pr.map((p) => bayes(p, state.se, state.sp)), { color: '--c-north' }); right.dots('now', [Math.log10(state.prev)], [ppv], { color: '--accent', size: 11 });
          hud.set('a', `${ill} ill: ${tp} test positive (red) · ${N - ill} healthy: ${fp} false positives (yellow)`); hud.set('b', `of ${tp + fp} positives, ${tp} are ill: P(ill | +) = ${fmt(100 * ppv)} %`, ppv < 0.5 ? 'bad' : 'good');
          hud.set('c', 'P(ill | +) = P(+ | ill) P(ill) / P(+): rare diseases make most positives false');
          plots.aux.draw({ xlim: [-3, -0.3], cursor: Math.log10(state.prev), series: [{ x: pr.map(Math.log10), y: pr.map((p) => bayes(p, state.se, state.sp)), color: '--c-north', label: 'P(ill | +) vs log₁₀ prevalence' }] });
        } else if (c === 'clt') {
          const parent = sampleMeans(1, 4000, 2), means = sampleMeans(state.n, 4000, 7), nb = 60;
          const hp = hist(parent, 0, 5, nb), xp = hp.map((_, i) => (i + 0.5) * 5 / nb); top.range([0, 5], [0, Math.max(...hp) * 1.15]); top.titles('x', 'count: the parent, exponential with mean 1 — very skewed'); top.stems('h', xp, hp, { color: '--c-ref', width: 5 });
          const s = 1 / Math.sqrt(state.n), lo = Math.max(0, 1 - 4.5 * s), hi = 1 + 4.5 * s, hm = hist(means, lo, hi, nb), xm = hm.map((_, i) => lo + (i + 0.5) * (hi - lo) / nb), bw = (hi - lo) / nb;
          bot.range([lo, hi], [0, Math.max(...hm) * 1.15]); bot.titles('sample mean', `count: 4000 averages of n = ${state.n}, and the normal curve with σ = 1/√n`); bot.stems('h', xm, hm, { color: '--c-B', width: 5 }); bot.line('n', xm, xm.map((x) => 4000 * bw * DIST.normal.pdf(x, 1, s)), { color: '--c-north', width: 1.6 });
          const mm = means.reduce((a, b) => a + b, 0) / means.length, sd = Math.sqrt(means.reduce((a, b) => a + (b - mm) ** 2, 0) / means.length);
          hud.set('a', `mean of the means ${fmt(mm)} (parent mean 1)`); hud.set('b', `their spread ${fmt(sd)} ≈ σ/√n = ${fmt(s)}`); hud.set('c', 'averages of many draws look normal, whatever the parent: the central limit theorem');
          const ns = Array.from({ length: 100 }, (_, i) => i + 1); plots.aux.draw({ xlim: [1, 100], cursor: state.n, series: [{ x: ns, y: ns.map((n) => 1 / Math.sqrt(n)), color: '--c-B', label: 'spread of the mean σ/√n vs n' }] });
        } else if (c === 'walk') {
          const S = state.steps, W = (CW.key === `${S},${state.pw}` ? CW.W : walks(state.nw, S, state.pw, 5)), upto = Math.max(1, Math.round(S * u)), xs = Array.from({ length: upto + 1 }, (_, i) => i), d = 2 * state.pw - 1, R = Math.max(3 * Math.sqrt(S), Math.abs(d) * S + 2 * Math.sqrt(S));
          top.range([0, S], [-R, R]); top.titles('step n', `position: ${state.nw} walkers, each step ±1; dashed = drift ± √n`); W.forEach((w, i) => top.line(`w${i}`, xs, w.slice(0, upto + 1), { color: i % 2 ? '--c-B' : '--c-I', width: 1 }));
          const ex = Array.from({ length: 101 }, (_, i) => S * i / 100); top.line('e1', ex, ex.map((n) => d * n + 2 * Math.sqrt(n * 4 * state.pw * (1 - state.pw))), { color: '--c-north', dashed: true, width: 1.4 }); top.line('e2', ex, ex.map((n) => d * n - 2 * Math.sqrt(n * 4 * state.pw * (1 - state.pw))), { color: '--c-north', dashed: true, width: 1.4 });
          const key = `${S},${state.pw}`; if (CW.key !== key) { CW.key = key; CW.many = walks(3000, S, state.pw, 11).map((w) => w[S]); CW.W = walks(state.nw, S, state.pw, 5); } const many = CW.many, h = hist(many, -R, R, 60), hx = h.map((_, i) => -R + (i + 0.5) * 2 * R / 60);
          bot.range([-R, R], [0, Math.max(...h) * 1.15]); bot.titles('final position', `count: 3000 walkers after ${S} steps`); bot.stems('h', hx, h, { color: '--c-v', width: 4 });
          const rms = Math.sqrt(many.reduce((a, b) => a + (b - d * S) ** 2, 0) / many.length);
          hud.set('a', `typical distance from the drift line: ${fmt(rms)} ≈ √${S} = ${fmt(Math.sqrt(S))}`); hud.set('b', d ? `drift ${fmt(d)} per step: after ${S} steps the crowd is centred at ${fmt(d * S)}` : 'fair coin: no drift, the crowd spreads symmetrically');
          hud.set('c', 'four times the steps, only twice the spread: diffusion grows as √t');
          plots.aux.draw({ xlim: [0, S], series: [{ x: ex, y: ex.map((n) => Math.sqrt(n)), color: '--c-north', label: '√n vs steps' }] });
        } else {
          const n = Math.max(10, Math.round(4000 * u)), P = PI.pts.slice(0, n), ar = SQL[3] / SQL[2]; sql.range([-0.05, 1.05], [-0.05, -0.05 + 1.1 * ar]); sql.titles('', 'darts in a unit square; green inside the quarter circle');
          sql.dots('in', P.filter((p) => p[2]).map((p) => p[0]), P.filter((p) => p[2]).map((p) => p[1]), { color: '--c-v', size: 4 }); sql.dots('out', P.filter((p) => !p[2]).map((p) => p[0]), P.filter((p) => !p[2]).map((p) => p[1]), { color: '--c-north', size: 4 });
          const arc = Array.from({ length: 101 }, (_, i) => [Math.cos(Math.PI / 2 * i / 100), Math.sin(Math.PI / 2 * i / 100)]); sql.line('arc', arc.map((p) => p[0]), arc.map((p) => p[1]), { color: '--ink', width: 1.6 }); sql.line('box', [0, 1, 1, 0, 0], [0, 0, 1, 1, 0], { color: '--ink-dim', width: 1 });
          const ks = Array.from({ length: n }, (_, i) => i + 1).filter((_, i) => i % 4 === 0), est = PI.est.slice(0, n).filter((_, i) => i % 4 === 0);
          right.range([0, 4000], [2.6, 3.7]); right.titles('darts thrown', '4 × (inside / total) → π'); right.line('e', ks, est, { color: '--c-B', width: 1.4 }); right.line('pi', [0, 4000], [Math.PI, Math.PI], { color: '--c-north', dashed: true, width: 1.2 });
          const band = Array.from({ length: 100 }, (_, i) => 40 * (i + 1)); right.line('b1', band, band.map((k) => Math.PI + 1.64 / Math.sqrt(k)), { color: '--ink-dim', dashed: true, width: 1 }); right.line('b2', band, band.map((k) => Math.PI - 1.64 / Math.sqrt(k)), { color: '--ink-dim', dashed: true, width: 1 });
          hud.set('a', `${n} darts: π ≈ ${fmt(PI.est[n - 1], 5)} (error ${fmt(Math.abs(PI.est[n - 1] - Math.PI), 2)})`); hud.set('b', 'quarter circle area / square area = π/4'); hud.set('c', 'the error shrinks only as 1/√n: 100 times the darts for one more digit');
          plots.aux.draw({ xlim: [0, 4000], series: [{ x: ks, y: est, color: '--c-B', label: 'estimate vs darts' }] });
        }
      },
      theme() { for (const k of all) k.theme(); },
    };
  },
};
