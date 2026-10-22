// Monte Carlo: random points estimating an area (and π), why the error shrinks only as 1/√N, Buffon's
// needle dropping onto ruled lines, and importance sampling for a narrow peak.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { CURVES, hitMiss, spread, buffon, importance, peak, peakExact } from './model.js';

const fmt = (v, d = 4) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const COPT = Object.entries(CURVES).map(([k, v]) => [k, v.label]);
const hist = (v, lo, hi, nb) => { const h = new Array(nb).fill(0); for (const x of v) { const i = Math.floor((x - lo) / (hi - lo) * nb); if (i >= 0 && i < nb) h[i]++; } return h; };

export default {
  id: 'montecarlo', title: 'Monte Carlo', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10, loop: false,
  defaults: { curve: 'circle', N: 2000, n: 100, l: 0.8, m: 0.75, s: 0.1 },
  cases: [
    { id: 'hitmiss', label: 'Areas with random points', set: {}, examples: [
      { id: 'bell', label: 'An integral with no formula: e^(−x²)', controls: ['curve'], set: { curve: 'bell' } },
    ] },
    { id: 'error', label: 'How fast it converges', set: {}, examples: [
      { id: 'small', label: 'n = 10: wide spread', controls: ['n'], set: { n: 10 } },
      { id: 'big', label: 'n = 1000: ten times narrower than n = 10', controls: ['n'], set: { n: 1000 } },
    ] },
    { id: 'buffon', label: 'Buffon’s needle', set: {}, examples: [{ id: 'short', label: 'Shorter needles', controls: ['l'], set: { l: 0.4 } }] },
    { id: 'importance', label: 'Importance sampling', set: {}, examples: [
      { id: 'off', label: 'Proposal in the wrong place', controls: ['m'], set: { m: 0.4 } },
      { id: 'narrow', label: 'Proposal too narrow', controls: ['s'], set: { s: 0.015 } },
    ] },
  ],
  controls: [
    { title: 'Area', show: (s) => s.case === 'hitmiss', items: [{ id: 'curve', label: 'Region', type: 'select', options: COPT }, { id: 'N', label: 'Points', unit: '', min: 100, max: 5000, step: 100 }] },
    { title: 'Estimates', show: (s) => s.case === 'error', items: [{ id: 'curve', label: 'Integrand', type: 'select', options: COPT }, { id: 'n', label: 'Points per estimate', unit: '', min: 10, max: 2000, log: true }] },
    { title: 'Needles', show: (s) => s.case === 'buffon', items: [{ id: 'l', label: 'Needle length (line spacing 1)', unit: '', min: 0.1, max: 1, step: 0.01 }] },
    { title: 'Proposal', show: (s) => s.case === 'importance', items: [{ id: 'm', label: 'Centre', unit: '', min: 0, max: 1, step: 0.01 }, { id: 's', label: 'Width', unit: '', min: 0.01, max: 0.4, step: 0.005 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const nIn = createCurve(stage, { max: 20000, width: 1.4, color: '--c-I' }), nOut = createCurve(stage, { max: 20000, width: 1.2, color: '--c-ref' }), rules = createCurve(stage, { max: 40, width: 1.4, color: '--ink-dim' });
    let H = null, hk = '', B = null, bk = '', SP = null, sk = '', IM = null, ik = '';
    return {
      changed() { const c = state.case; nIn.object.visible = nOut.object.visible = rules.object.visible = c === 'buffon'; charts.forEach((k) => k.show(true)); ctx.setClock(c === 'hitmiss' || c === 'buffon' ? 10 : 0); },
      update() {
        const c = state.case, u = Math.min(1, time.t / 9.5);
        if (c === 'hitmiss') {
          const C = CURVES[state.curve], key = `${state.curve},${state.N}`; if (key !== hk) { hk = key; H = hitMiss(C.f, state.N); }
          const k = Math.max(1, Math.floor(u * state.N)), P = H.pts.slice(0, k), est = H.est[k - 1], xs = lin(0, 1, 200), scale = state.curve === 'circle' ? 4 : 1;
          sq.range([0, 1], [0, 1]); sq.titles('x (uniform in [0, 1])', 'y: points under the curve (orange) vs above it (grey)');
          sq.dots('in', P.filter((p) => p[2]).map((p) => p[0]), P.filter((p) => p[2]).map((p) => p[1]), { color: '--c-I', size: 4 }); sq.dots('out', P.filter((p) => !p[2]).map((p) => p[0]), P.filter((p) => !p[2]).map((p) => p[1]), { color: '--c-ref', size: 4 }); sq.line('f', xs, xs.map(C.f), { color: '--c-B', width: 2.6 });
          const ns = lin(1, k, Math.min(k, 600)).map(Math.round), sdv = (n) => Math.sqrt(C.exact * (1 - C.exact) / n) * scale;
          tr.range([0, state.N], [C.exact * scale * 0.7, C.exact * scale * 1.3]); tr.titles('points so far', state.curve === 'circle' ? 'estimate of π = 4 × fraction under' : 'estimate of the area');
          tr.line('e', ns, ns.map((n) => H.est[n - 1] * scale), { color: '--c-B' }); tr.line('x', [0, state.N], [C.exact * scale, C.exact * scale], { color: '--ink-dim', dashed: true, width: 1 }); tr.line('u', ns, ns.map((n) => C.exact * scale + 2 * sdv(n)), { color: '--c-v', dashed: true, width: 1 }); tr.line('d', ns, ns.map((n) => C.exact * scale - 2 * sdv(n)), { color: '--c-v', dashed: true, width: 1 });
          br.range([0, 4], [-3, 0]); br.titles('log₁₀ points', 'log₁₀ |error|: falls with slope −½'); br.line('err', ns.map(Math.log10), ns.map((n) => Math.log10(Math.abs(H.est[n - 1] - C.exact) * scale + 1e-6)), { color: '--c-north', width: 1.2 }); br.line('ref', [0, 4], [Math.log10(2 * sdv(1)), Math.log10(2 * sdv(1e4))], { color: '--c-v', dashed: true, width: 1.2 });
          hud.set('a', `${k} points: ${fmt(P.filter((p) => p[2]).length)} under the curve → area ≈ ${fmt(est)}${state.curve === 'circle' ? `, π ≈ ${fmt(4 * est)}` : ''} (exact ${fmt(C.exact * scale)})`);
          hud.set('b', 'throw uniform random points into a box: the fraction that lands in a region estimates its area'); hud.set('c', 'it needs no formula for the region at all — only a way to tell inside from outside');
          plots.aux.draw({ xlim: [1, state.N], series: [{ x: ns, y: ns.map((n) => (H.est[n - 1] - C.exact) * scale), color: '--c-north', label: 'error vs points' }] });
        } else if (c === 'error') {
          const C = CURVES[state.curve], key = `${state.curve},${state.n}`; if (key !== sk) { sk = key; SP = { cur: spread(C.f, Math.round(state.n)), ns: [10, 30, 100, 300, 1000, 3000].map((n) => [n, spread(C.f, n, 120).sd]) }; }
          const lo = C.exact - 0.25, hi = C.exact + 0.25, nb = 50, h = hist(SP.cur.e, lo, hi, nb), xs = h.map((_, i) => lo + (i + 0.5) * (hi - lo) / nb);
          sq.range([lo, hi], [0, Math.max(...h) * 1.15]); sq.titles(`estimate of ∫₀¹ f (each from ${Math.round(state.n)} random points)`, 'count of 200 independent estimates'); sq.stems('h', xs, h, { color: '--c-B', width: 5 }); sq.line('x', [C.exact, C.exact], [0, Math.max(...h) * 1.15], { color: '--c-I', width: 2 });
          tr.range([0, 1], [0, 1.05]); tr.titles('x', 'f(x): the integrand'); tr.line('f', lin(0, 1, 200), lin(0, 1, 200).map(C.f), { color: '--c-B' });
          br.range([0.8, 3.7], [-3.2, -0.5]); br.titles('log₁₀ points per estimate', 'log₁₀ spread (standard deviation)'); br.line('s', SP.ns.map((q) => Math.log10(q[0])), SP.ns.map((q) => Math.log10(q[1])), { color: '--c-north' }); br.dots('q', [Math.log10(state.n)], [Math.log10(SP.cur.sd)], { color: '--accent', size: 12 });
          hud.set('a', `spread of the estimates ${fmt(SP.cur.sd, 3)} with ${Math.round(state.n)} points each`); hud.set('b', 'σ_estimate = σ_f / √N: 100 times the points for 10 times the precision — the slope −½ in the bottom chart');
          hud.set('c', 'but the rate does not depend on the dimension: in 10 dimensions grids are hopeless, Monte Carlo still converges as 1/√N');
          plots.aux.draw({ xlim: [0.8, 3.7], series: [{ x: SP.ns.map((q) => Math.log10(q[0])), y: SP.ns.map((q) => q[1] * Math.sqrt(q[0])), color: '--c-v', label: 'spread × √N vs log₁₀ N: constant' }] });
        } else if (c === 'buffon') {
          const key = `${state.l}`; if (key !== bk) { bk = key; B = buffon(3000, state.l); }
          const k = Math.max(1, Math.floor(u * B.length)), sl = B.slice(0, k), sh = sl.slice(-400);
          sq.range([-3, 3], [0, 4]); sq.titles('x', 'y: needles crossing a line (orange) and not (grey); lines 1 apart');
          const map = (x, y) => [sq.mx(x), sq.my(y), 0.01], inS = [], outS = [];
          for (const n of sh) (n.cross ? inS : outS).push(...map(n.x1, n.y1), ...map(n.x2, n.y2)); nIn.segments(inS); nOut.segments(outS);
          const R = []; for (let yv = 0; yv <= 4; yv++) R.push(...map(-3, yv), ...map(3, yv)); rules.segments(R);
          const ns = lin(1, k, Math.min(k, 500)).map(Math.round), est = sl.at(-1).est;
          tr.range([0, B.length], [2.6, 3.7]); tr.titles('needles dropped', 'π estimate: 2l·N / crossings'); tr.line('e', ns, ns.map((n) => B[n - 1].est), { color: '--c-B' }); tr.line('pi', [0, B.length], [Math.PI, Math.PI], { color: '--ink-dim', dashed: true, width: 1 });
          const th = lin(0, Math.PI, 100); br.range([0, Math.PI], [0, 0.6]); br.titles('needle angle θ (rad)', 'P(cross | θ): l·sin θ / 2, lines 1 apart'); br.line('p', th, th.map((t) => state.l * Math.sin(t) / 2), { color: '--c-I' });
          hud.set('a', `${k} needles, ${sl.filter((n) => n.cross).length} crossings → π ≈ ${fmt(est)}`); hud.set('b', `P(cross) = 2l/(π d) = ${fmt(2 * state.l / Math.PI, 3)}: the angle brings π in`);
          hud.set('c', 'a 1777 experiment that estimates π with nothing but needles and a ruled floor — slowly');
          plots.aux.draw({ xlim: [1, B.length], cursor: k, series: [{ x: ns, y: ns.map((n) => Math.abs(B[n - 1].est - Math.PI)), color: '--c-north', label: '|estimate − π| vs needles' }] });
        } else {
          const key = `${state.m},${state.s}`; if (key !== ik) { ik = key; IM = importance(100, state.m, state.s, 200); }
          const ex = peakExact(), xs = lin(0, 1, 400), q = (x) => Math.exp(-((x - state.m) ** 2) / (2 * state.s ** 2)) / (state.s * Math.sqrt(2 * Math.PI)), qm = q(state.m);
          sq.range([0, 1], [0, 1.1]); sq.titles('x', 'the narrow peak g(x) (blue) and where we sample from (green, scaled)'); sq.line('g', xs, xs.map((x) => peak(x)), { color: '--c-B', width: 2.6 }); sq.line('q', xs, xs.map((x) => q(x) / qm), { color: '--c-v', width: 1.6 }); sq.line('u', [0, 1], [0.05, 0.05], { color: '--c-ref', dashed: true, width: 1 });
          const lo = 0, hi = ex * 3, nb = 40, hu = hist(IM.U, lo, hi, nb), hI = hist(IM.I, lo, hi, nb), bx = hu.map((_, i) => lo + (i + 0.5) * (hi - lo) / nb);
          tr.range([lo, hi], [0, Math.max(...hu) * 1.15]); tr.titles('estimate (100 uniform points)', 'count of 200 estimates'); tr.stems('u', bx, hu, { color: '--c-ref', width: 4 }); tr.line('x', [ex, ex], [0, Math.max(...hu) * 1.15], { color: '--c-I', width: 1.6 });
          br.range([lo, hi], [0, Math.max(...hI) * 1.15]); br.titles('estimate (100 points from the proposal, weighted g/q)', 'count of 200 estimates'); br.stems('i', bx, hI, { color: '--c-v', width: 4 }); br.line('x', [ex, ex], [0, Math.max(...hI) * 1.15], { color: '--c-I', width: 1.6 });
          const ratio = IM.sdU / IM.sdI;
          hud.set('a', `uniform: spread ${fmt(IM.sdU, 3)} · importance: spread ${fmt(IM.sdI, 3)} (true value ${fmt(ex, 4)})`, ratio > 2 ? 'good' : 'bad');
          hud.set('b', `≈ ${fmt(ratio * ratio, 2)}× fewer points for the same precision`); hud.set('c', 'sample where the function matters and weight each point by g/q: still unbiased, much less spread — if q covers the peak');
          plots.aux.draw({ xlim: [0, 1], series: [{ x: xs, y: xs.map((x) => (q(x) > 1e-9 ? peak(x) / q(x) : NaN)), color: '--c-v', label: 'weight g/q vs x: flat = ideal proposal' }] });
        }
      },
      theme() { charts.forEach((k) => k.theme()); nIn.theme(); nOut.theme(); rules.theme(); },
    };
  },
};
