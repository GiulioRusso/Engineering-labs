// Optimisation: golden-section search shrinking a bracket by 0.618 per evaluation (drawn as a tower of
// nested intervals), and in two variables gradient descent, steepest descent with a line search and
// Newton's method walking over the contour map of a bowl or of Rosenbrock's banana valley.
import { createChart } from '../../lib/viz/chart.js';
import { PHI, F1, golden, quadratic, rosenbrock, descend } from './model.js';

const fmt = (v, d = 4) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], GS = 0.7, NG = 20, DS = 0.35, ND = 40;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const lg = (v) => Math.log10(Math.max(Math.abs(v), 1e-16));
const M = { gd: ['Gradient descent, fixed step', '--c-I'], line: ['Steepest descent + line search', '--c-B'], newton: ['Newton', '--c-v'] };

export default {
  id: 'optim', title: 'Optimisation', size: 4.4, ortho: true, plain: true, cam: 'top', duration: GS * NG + 0.4, loop: false,
  defaults: { f1: 'bowl', a: 0, b: 3, f2: 'bowl', kappa: 10, eta: 0.15, sx: 2.4, sy: 1.6, gd: true, line: true, newton: true },
  cases: [
    { id: 'golden', label: 'Golden section', set: {}, examples: [
      { id: 'kink', label: 'A kink: no derivative needed', controls: ['f1'], set: { f1: 'kink' } },
      { id: 'sine', label: '−sin x: the top of a hill', controls: ['f1'], set: { f1: 'sine' } },
    ] },
    { id: 'descent', label: 'Descent and Newton', set: {}, examples: [
      { id: 'round', label: 'Round bowl (κ = 1): all easy', controls: ['kappa'], set: { f2: 'bowl', kappa: 1 } },
      { id: 'zigzag', label: 'κ = 50: line search zig-zags', controls: ['kappa'], set: { f2: 'bowl', kappa: 50, gd: false } },
      { id: 'big', label: 'Step too big: gradient descent diverges', controls: ['eta'], set: { f2: 'bowl', kappa: 10, eta: 0.21, line: false, newton: false } },
      { id: 'banana', label: 'Rosenbrock: Newton follows the valley', controls: ['sx', 'sy'], set: { f2: 'rosen', sx: -1.2, sy: 1, gd: false } },
    ] },
  ],
  controls: [
    { title: 'Minimise f(x)', show: (s) => s.case === 'golden', items: [
      { id: 'f1', label: 'f', type: 'select', options: Object.entries(F1).map(([k, v]) => [k, v.label]) },
      { id: 'a', label: 'Bracket from', unit: '', min: 0, max: 1.4, step: 0.05 }, { id: 'b', label: 'Bracket to', unit: '', min: 1.6, max: 3, step: 0.05 },
    ] },
    { title: 'Minimise f(x, y)', show: (s) => s.case === 'descent', items: [
      { id: 'f2', label: 'f', type: 'segmented', options: [['bowl', 'Elongated bowl'], ['rosen', 'Rosenbrock']] },
      { id: 'kappa', label: 'Bowl elongation κ', unit: '', min: 1, max: 100, log: true, show: (s) => s.f2 === 'bowl' },
      { id: 'eta', label: 'Fixed step η', unit: '', min: 0.0005, max: 0.5, log: true },
      { id: 'sx', label: 'Start x', unit: '', min: -2.5, max: 2.5, step: 0.05 }, { id: 'sy', label: 'Start y', unit: '', min: -1, max: 2.8, step: 0.05 },
      { id: 'gd', label: M.gd[0], type: 'check', color: M.gd[1] }, { id: 'line', label: M.line[0], type: 'check', color: M.line[1] }, { id: 'newton', label: M.newton[0], type: 'check', color: M.newton[1] },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), all = [sq, tr, br];
    let MAP = { key: '' };

    function goldenCase() {
      const F = F1[state.f1], S = golden(F.f, state.a, state.b, NG), k = Math.min(NG, Math.floor(time.t / GS)), s = S[k], xs = lin(0, 3, 300), ys = xs.map(F.f), lo = Math.min(...ys), hi = Math.max(...ys), p = 0.1 * (hi - lo);
      sq.range([0, 3], [lo - p, hi + p]); sq.titles('x', 'f(x): bracket [a, b] (orange) and its two inner points');
      sq.line('f', xs, ys, { color: '--c-B', width: 2.6 }); sq.line('ab', [s.a, s.b], [lo - p / 2, lo - p / 2], { color: '--c-I', width: 6 });
      sq.line('ca', [s.c, s.c], [lo - p, s.fc], { color: '--c-v', width: 1.2, dashed: true }); sq.line('da', [s.d, s.d], [lo - p, s.fd], { color: '--c-v', width: 1.2, dashed: true }); sq.dots('cd', [s.c, s.d], [s.fc, s.fd], { color: '--accent', size: 11 });
      // the tower of brackets
      br.range([0, 3], [-0.5, NG + 0.5]); br.titles('x', 'step: every bracket so far, each 0.618 of the one above');
      for (let i = 0; i <= NG; i++) if (i <= k) br.line(`t${i}`, [S[i].a, S[i].b], [NG - i, NG - i], { color: i === k ? '--c-I' : '--c-B', width: i === k ? 4 : 2.4 }); else br.hide(`t${i}`);
      const it = S.map((_, i) => i), w = S.map((q) => lg(q.b - q.a));
      tr.range([0, NG], [-5, 0.6]); tr.titles('step', 'log₁₀ bracket width: slope log₁₀ 0.618 = −0.21');
      tr.line('w', it.slice(0, k + 1), w.slice(0, k + 1), { color: '--c-I' }); tr.line('ref', [0, NG], [w[0], w[0] + NG * Math.log10(PHI)], { color: '--ink-dim', dashed: true, width: 1 });
      plots.aux.draw({ xlim: [0, NG], cursor: k, series: [{ x: it, y: S.map((q) => (q.a + q.b) / 2), color: '--c-I', label: 'centre of the bracket' }, { x: [0, NG], y: [F.min, F.min], color: '--ink-dim', label: 'true minimum' }], xlabel: 'step' });
      hud.set('a', `step ${k}: [${fmt(s.a, 6)}, ${fmt(s.b, 6)}], width ${fmt(s.b - s.a, 3)}; f(c) = ${fmt(s.fc)}, f(d) = ${fmt(s.fd)}`);
      hud.set('b', `${s.fc < s.fd ? 'f(c) < f(d): the minimum is left of d, drop [d, b]' : 'f(d) ≤ f(c): the minimum is right of c, drop [a, c]'}; the kept inner point is reused, so each step costs one new evaluation`);
      hud.set('c', 'the points sit at 0.382 and 0.618 of the bracket because φ² + φ = 1: after cutting, the old point lands exactly where the next step needs one');
    }

    function descentCase() {
      const F = state.f2 === 'bowl' ? quadratic(state.kappa) : rosenbrock, [[x0, x1], [y0, y1]] = F.view, ar = SQ[2] / SQ[3], hw = (y1 - y0) / 2 * ar, X = [(x0 + x1) / 2 - hw, (x0 + x1) / 2 + hw];
      const key = `${state.f2},${state.kappa}`, NX = 160, NY = 120;
      if (MAP.key !== key) { const v = []; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) v.push(Math.log10(F.f([X[0] + (X[1] - X[0]) * (i + 0.5) / NX, y0 + (y1 - y0) * (j + 0.5) / NY]) + 1e-3)); MAP = { key, v, lo: Math.min(...v), hi: Math.max(...v) }; }
      sq.range(X, [y0, y1]); sq.titles('x', 'y: contours of log f (dark = low); the paths of the chosen methods');
      sq.image('map', MAP.v, NX, NY, { map: 'magma', norm: (v) => 1 - (v - MAP.lo) / (MAP.hi - MAP.lo) });
      const k = Math.min(ND, Math.floor(time.t / DS)), on = Object.keys(M).filter((m) => state[m]), P = Object.fromEntries(on.map((m) => [m, descend(F, [state.sx, state.sy], ND, m, state.eta)]));
      for (const m of on) { const p = P[m].slice(0, k + 1); sq.line(m, p.map((q) => q[0]), p.map((q) => q[1]), { color: M[m][1], width: 2 }); sq.dots(`${m}d`, p.map((q) => q[0]), p.map((q) => q[1]), { color: M[m][1], size: 5 }); }
      sq.dots('min', [F.min[0]], [F.min[1]], { color: '--ink', size: 10 }); sq.dots('st', [state.sx], [state.sy], { color: '--accent', size: 10 });
      const it = Array.from({ length: ND + 1 }, (_, i) => i);
      tr.range([0, ND], [-16, 4]); tr.titles('iteration', 'log₁₀ f (the minimum is 0)'); br.range([0, ND], [-16, 4]); br.titles('iteration', 'log₁₀ |∇f|');
      for (const m of on) { const p = P[m].slice(0, k + 1); tr.line(m, it.slice(0, p.length), p.map((q) => lg(F.f(q))), { color: M[m][1] }); br.line(m, it.slice(0, p.length), p.map((q) => lg(Math.hypot(...F.g(q)))), { color: M[m][1] }); }
      plots.aux.draw({ xlim: [0, ND], cursor: k, series: on.map((m) => ({ x: it.slice(0, P[m].length), y: P[m].map((q) => Math.hypot(q[0] - F.min[0], q[1] - F.min[1])), color: M[m][1], label: `${M[m][0]}: distance to the minimum` })), xlabel: 'iteration' });
      const lmax = state.f2 === 'bowl' ? state.kappa : NaN, at = (m) => (P[m] ? `${M[m][0]} f = ${fmt(F.f(P[m][Math.min(k, P[m].length - 1)]), 3)}` : '');
      hud.set('a', `iteration ${k}: ${on.map(at).join(' · ')}`);
      hud.set('b', state.f2 === 'bowl' ? `κ = ${fmt(state.kappa, 3)}: the fixed step is stable only below 2/λmax = ${fmt(2 / lmax, 3)} (η = ${fmt(state.eta, 3)}); a line search loses a factor ((κ−1)/(κ+1))² = ${fmt(((state.kappa - 1) / (state.kappa + 1)) ** 2, 3)} per step` : 'the valley is long, narrow and curved: steepest descent bounces between its walls, Newton reads the curvature and walks along it', state.f2 === 'bowl' && state.eta >= 2 / lmax && state.gd ? 'bad' : '');
      hud.set('c', 'Newton uses the Hessian: on a quadratic it lands on the minimum in one step, and near any minimum its digits double each step');
    }

    return {
      changed() { all.forEach((k) => k.show(true)); ctx.setClock(state.case === 'golden' ? GS * NG + 0.4 : DS * ND + 0.4); },
      update() { all.forEach((k) => k.clear()); (state.case === 'golden' ? goldenCase : descentCase)(); },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
