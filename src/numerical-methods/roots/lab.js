// Root finding replayed one iteration at a time: bisection halving a bracket, the secant method
// following chords, fixed-point iteration as a cobweb. Error charts show how many digits each step buys.
import { createChart } from '../../lib/viz/chart.js';
import { FUNCS, bisect, secant, relax, fixedPoint } from './model.js';

const fmt = (v, d = 4) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const FOPT = Object.entries(FUNCS).map(([k, v]) => [k, v.label]), STEP = 0.6, N = 16;
const lg = (e) => Math.log10(Math.max(Math.abs(e), 1e-16));

export default {
  id: 'roots', title: 'Root finding', size: 4.4, ortho: true, plain: true, cam: 'top', duration: STEP * N + 0.4, loop: false,
  defaults: { fn: 'cubic', a: 1, b: 3, x0: 1, x1: 3, lam: 0.2, g0: 0.5 },
  cases: [
    { id: 'bisect', label: 'Bisection', set: {}, examples: [
      { id: 'cos', label: 'cos x = x: same pace, any function', controls: ['fn', 'a', 'b'], set: { fn: 'cos', a: 0, b: 2 } },
      { id: 'nosign', label: 'No sign change: nothing to bisect', controls: ['a', 'b'], set: { a: 2.5, b: 3 } },
    ] },
    { id: 'secant', label: 'Secant method', set: {}, examples: [
      { id: 'close', label: 'Start close: digits double and more', controls: ['x0', 'x1'], set: { x0: 2, x1: 2.3 } },
      { id: 'far', label: 'Bad start: it wanders before it locks on', controls: ['x0', 'x1'], set: { x0: 0, x1: 0.6 } },
    ] },
    { id: 'fixed', label: 'Fixed-point iteration', set: {}, examples: [
      { id: 'best', label: 'λ = 0.354: g′(√2) = 0, quadratic', controls: ['lam'], set: { lam: 0.354 } },
      { id: 'slow', label: 'λ = 0.05: slow staircase', controls: ['lam'], set: { lam: 0.05 } },
      { id: 'spiral', label: 'λ = 0.6: spirals in', controls: ['lam'], set: { lam: 0.6 } },
      { id: 'diverge', label: 'λ = 0.8: |g′| > 1, spirals out', controls: ['lam'], set: { lam: 0.8 } },
    ] },
  ],
  controls: [
    { title: 'Function', show: (s) => s.case !== 'fixed', items: [{ id: 'fn', label: 'f(x)', type: 'select', options: FOPT }] },
    { title: 'Bracket', show: (s) => s.case === 'bisect', items: [{ id: 'a', label: 'Left end a', unit: '', min: -0.5, max: 3.5, step: 0.05 }, { id: 'b', label: 'Right end b', unit: '', min: -0.5, max: 3.5, step: 0.05 }] },
    { title: 'Start', show: (s) => s.case === 'secant', items: [{ id: 'x0', label: 'x₀', unit: '', min: -0.5, max: 3.5, step: 0.05 }, { id: 'x1', label: 'x₁', unit: '', min: -0.5, max: 3.5, step: 0.05 }] },
    { title: 'Iteration x ← x − λ(x² − 2)', show: (s) => s.case === 'fixed', items: [{ id: 'lam', label: 'Relaxation λ', unit: '', min: 0.02, max: 0.9, step: 0.002 }, { id: 'g0', label: 'Start x₀', unit: '', min: 0.1, max: 2.5, step: 0.05 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    // the function on its view, y range from its samples
    const graph = (F) => { const xs = lin(F.view[0], F.view[1], 300), ys = xs.map(F.f), lo = Math.max(-12, Math.min(...ys)), hi = Math.min(12, Math.max(...ys)), p = (hi - lo) * 0.08; sq.range(F.view, [lo - p, hi + p]); sq.line('f', xs, ys, { color: '--c-B', width: 2.6 }); };
    // error charts shared by every case: log error per iteration, and e(k+1) against e(k)
    const errors = (xs, root, k) => {
      const e = xs.filter(Number.isFinite).map((x) => lg(x - root)), it = e.map((_, i) => i); k = Math.min(k, e.length - 1);
      tr.range([0, N], [-16, 1]); tr.titles('iteration k', 'log₁₀ |error|'); tr.line('e', it.slice(0, k + 1), e.slice(0, k + 1), { color: '--c-I' }); tr.dots('q', k < 0 ? [] : [k], k < 0 ? [] : [e[k]], { color: '--accent', size: 10 });
      br.range([-16, 1], [-16, 1]); br.titles('log₁₀ |eₖ|', 'log₁₀ |eₖ₊₁|: slope = order (1, 1.618, 2 dashed)');
      for (const [id, p] of [['p1', 1], ['p16', 1.618], ['p2', 2]]) br.line(id, [-16 / p, 0], [-16, 0], { color: '--ink-dim', dashed: true, width: 1 });
      const a = e.slice(0, Math.max(0, k)), b = e.slice(1, k + 1); br.dots('o', a, b, { color: '--c-I', size: 8 }); br.line('ol', a, b, { color: '--c-I', width: 1.2 });
      plots.aux.draw({ xlim: [0, N], cursor: Math.max(0, k), series: [{ x: it, y: xs.slice(0, e.length), color: '--c-B', label: 'estimate xₖ vs iteration' }, { x: [0, N], y: [root, root], color: '--ink-dim', label: 'root' }] });
    };
    return {
      changed() { charts.forEach((k) => { k.show(false); k.show(true); }); },
      update() {
        const c = state.case, k = Math.min(N, Math.floor(time.t / STEP));
        if (c === 'bisect') {
          const F = FUNCS[state.fn], a = Math.min(state.a, state.b), b = Math.max(state.a, state.b); graph(F);
          if (F.f(a) * F.f(b) > 0) {
            sq.line('ab', [a, b], [0, 0], { color: '--c-north', width: 5 }); ['a1', 'b1', 'm', 'q'].forEach((id) => sq.hide(id)); sq.dots('mid', [], []);
            hud.set('a', `f(a) = ${fmt(F.f(a))} and f(b) = ${fmt(F.f(b))} have the same sign`, 'bad'); hud.set('b', 'bisection needs a bracket: a sign change guarantees a root inside (if f is continuous)'); hud.set('c', 'move a or b until the red segment straddles a crossing');
            errors([NaN], F.root, 0); return;
          }
          const S = bisect(F.f, a, b, N + 1), s = S[k], top = 12;
          sq.line('ab', [s.a, s.b], [0, 0], { color: '--c-I', width: 6 }); sq.line('a1', [s.a, s.a], [-top, F.f(s.a)], { color: '--c-I', dashed: true, width: 1.2 }); sq.line('b1', [s.b, s.b], [-top, F.f(s.b)], { color: '--c-I', dashed: true, width: 1.2 });
          sq.line('m', [s.m, s.m], [0, s.fm], { color: '--c-v', width: 1.6 }); sq.dots('mid', [s.m], [s.fm], { color: '--accent', size: 11 });
          sq.titles('x', `f(x): bracket [a, b] (orange), midpoint (green)`);
          errors(S.map((q) => q.m), F.root, k);
          hud.set('a', `step ${k + 1}: [${fmt(s.a, 6)}, ${fmt(s.b, 6)}], width ${fmt(s.b - s.a, 3)}, midpoint ${fmt(s.m, 8)}`);
          hud.set('b', `f(m) = ${fmt(s.fm, 3)}: keep the half where the sign still changes — the width halves every step, whatever f is`);
          hud.set('c', 'one bit per step: ≈ 3.3 steps per decimal digit, slope 1 in the bottom chart. Slow, but it cannot fail');
        } else if (c === 'secant') {
          const F = FUNCS[state.fn], S = secant(F.f, state.x0, state.x1, N), j = Math.min(k, S.length - 1); graph(F);
          if (!S.length) return;
          const s = S[j], xs = [state.x0, ...S.map((q) => q.x1), S.at(-1).x2];
          sq.line('ab', [s.x0, s.x2], [s.f0, 0], { color: '--c-I', width: 1.6 }); sq.line('a1', [s.x1, s.x1], [0, s.f1], { color: '--c-I', dashed: true, width: 1 }); sq.line('b1', [s.x2, s.x2], [0, F.f(s.x2)], { color: '--c-v', dashed: true, width: 1.2 }); sq.hide('m');
          const P = [[s.x0, s.f0], [s.x1, s.f1], [s.x2, 0]].filter((q) => q[0] >= F.view[0] && q[0] <= F.view[1]); sq.dots('mid', P.map((q) => q[0]), P.map((q) => q[1]), { color: '--accent', size: 10 }); sq.titles('x', 'f(x): the chord through the last two points (orange) and where it crosses zero');
          errors(xs.slice(1), F.root, Math.min(k, xs.length - 2));
          hud.set('a', `step ${j + 1}: chord through x = ${fmt(s.x0, 6)} and ${fmt(s.x1, 6)} → x = ${fmt(s.x2, 10)}`);
          hud.set('b', 'x₂ = x₁ − f(x₁)·(x₁ − x₀)/(f(x₁) − f(x₀)): Newton’s method with the derivative replaced by a difference quotient');
          hud.set('c', 'order φ ≈ 1.618: each error is about the product of the two before it — digits grow like Fibonacci numbers');
        } else {
          const g = relax(state.lam), xs = fixedPoint(g, state.g0, N), j = Math.min(k, xs.length - 1), r = Math.SQRT2, gp = 1 - 2 * r * state.lam;
          const v = lin(0, 2.6, 200); sq.range([0, 2.6], [0, 2.6]); sq.titles('xₖ', 'xₖ₊₁ = g(xₖ): the cobweb between g (blue) and y = x');
          sq.line('f', v, v.map(g), { color: '--c-B', width: 2.6 }); sq.line('ab', [0, 2.6], [0, 2.6], { color: '--ink-dim', width: 1.2 });
          const cx = [xs[0]], cy = [0]; for (let i = 0; i < j && Number.isFinite(xs[i + 1]); i++) { cx.push(xs[i], xs[i + 1]); cy.push(xs[i + 1], xs[i + 1]); }
          sq.line('m', cx, cy, { color: '--c-I', width: 1.6 }); sq.dots('mid', [r], [r], { color: '--c-v', size: 10 }); ['a1', 'b1'].forEach((id) => sq.hide(id));
          errors(xs, r, j);
          const cls = Math.abs(gp) < 1 ? 'good' : 'bad';
          hud.set('a', `step ${j}: x = ${fmt(xs[j], 10)} (target √2 = 1.414213562)`);
          hud.set('b', `g′(√2) = 1 − 2√2 λ = ${fmt(gp, 3)}: ${Math.abs(gp) < 1e-2 ? 'zero — quadratic convergence' : Math.abs(gp) < 1 ? `each error ≈ ${fmt(Math.abs(gp), 2)} × the last${gp < 0 ? ', alternating sides' : ''}` : 'bigger than 1 in size: errors grow, the cobweb spirals out'}`, cls);
          hud.set('c', 'a fixed point attracts when |g′| < 1 there; the smaller |g′|, the faster. Newton’s method is the choice that makes g′ = 0');
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
