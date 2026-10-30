// Approximation: interpolating polynomials (Runge's wiggles, Chebyshev nodes), numerical integration
// (trapezoid vs Simpson) and finite differences (truncation error vs round-off).
import { createChart } from '../../lib/viz/chart.js';
import { runge, nodes, interp, maxErr, INTEGRANDS, trapz, simpson, forward, central } from './model.js';

const fmt = (v, d = 4) => (Number.isFinite(v) ? (Math.abs(v) < 1e-14 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const IOPT = Object.entries(INTEGRANDS).map(([k, v]) => [k, v.label]), NS = [2, 4, 8, 16, 32, 64, 128, 256], X0 = 1;
const lg = (e) => Math.log10(Math.max(Math.abs(e), 1e-17));

export default {
  id: 'approx', title: 'Approximation', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { n: 11, kind: 'equi', fq: 'exp', np: 4, rule: 'trap', lh: -4, scheme: 'forward' },
  cases: [
    { id: 'runge', label: 'Interpolation', set: {}, examples: [
      { id: 'wild', label: '15 equispaced nodes: wild edges', controls: ['n', 'kind'], set: { n: 15 } },
      { id: 'cheb', label: '15 Chebyshev nodes: tamed', controls: ['n', 'kind'], set: { n: 15, kind: 'cheb' } },
    ] },
    { id: 'quad', label: 'Quadrature', set: {}, examples: [
      { id: 'simpson', label: 'Simpson: parabolas, error ÷ 16 per doubling', controls: ['np', 'rule'], set: { rule: 'simp' } },
      { id: 'bump', label: 'A narrow bump needs more panels', controls: ['np', 'rule', 'fq'], set: { fq: 'bump', np: 8 } },
    ] },
    { id: 'fdiff', label: 'Finite differences', set: {}, examples: [
      { id: 'tiny', label: 'h = 10⁻¹³: round-off takes over', controls: ['lh', 'scheme'], set: { lh: -13 } },
      { id: 'central', label: 'Central difference: best near h = 10⁻⁵', controls: ['lh', 'scheme'], set: { scheme: 'central', lh: -5 } },
    ] },
  ],
  controls: [
    { title: 'Nodes', show: (s) => s.case === 'runge', items: [{ id: 'n', label: 'Number of nodes', unit: '', min: 2, max: 25, step: 1 }, { id: 'kind', label: 'Placement', type: 'segmented', options: [['equi', 'Equispaced'], ['cheb', 'Chebyshev']] }] },
    { title: 'Integral', show: (s) => s.case === 'quad', items: [{ id: 'fq', label: 'Integrand', type: 'select', options: IOPT }, { id: 'np', label: 'Panels n', unit: '', min: 2, max: 64, step: 2 }, { id: 'rule', label: 'Rule', type: 'segmented', options: [['trap', 'Trapezoid'], ['simp', 'Simpson']] }] },
    { title: 'Derivative of sin at x = 1', show: (s) => s.case === 'fdiff', items: [{ id: 'lh', label: 'log₁₀ step h', unit: '', min: -15, max: 0, step: 0.1 }, { id: 'scheme', label: 'Scheme', type: 'segmented', options: [['forward', 'Forward'], ['central', 'Central']] }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const xs = lin(-1, 1, 500), ns = lin(2, 25, 24);
    let CURVE = null;
    return {
      changed() { charts.forEach((c) => { c.show(false); c.show(true); }); },
      update() {
        const c = state.case;
        if (c === 'runge') {
          const n = Math.round(state.n), X = nodes(n, state.kind), Y = X.map(runge), p = interp(X, Y), P = xs.map(p), E = xs.map((x, i) => Math.abs(runge(x) - P[i]));
          sq.range([-1, 1], [-0.6, 1.6]); sq.titles('x', 'f(x) = 1/(1 + 25x²) (blue) and the interpolating polynomial (orange)');
          sq.line('f', xs, xs.map(runge), { color: '--c-B', width: 2.6 }); sq.line('p', xs, P, { color: '--c-I', width: 1.8 }); sq.dots('n', X, Y, { color: '--accent', size: 10 });
          const em = Math.max(...E); tr.range([-1, 1], [0, Math.max(0.05, Math.min(5, em * 1.1))]); tr.titles('x', '|f − p|: where the error lives'); tr.line('e', xs, E, { color: '--c-north' });
          CURVE ??= { equi: ns.map((k) => lg(maxErr(runge, interp(nodes(k, 'equi'), nodes(k, 'equi').map(runge))))), cheb: ns.map((k) => lg(maxErr(runge, interp(nodes(k, 'cheb'), nodes(k, 'cheb').map(runge))))) };
          br.range([2, 25], [-3, 3]); br.titles('number of nodes', 'log₁₀ max error: equispaced (red) vs Chebyshev (green)'); br.line('e', ns, CURVE.equi, { color: '--c-north' }); br.line('c', ns, CURVE.cheb, { color: '--c-v' }); br.dots('q', [n], [lg(em)], { color: '--accent', size: 11 });
          hud.set('a', `${n} ${state.kind === 'cheb' ? 'Chebyshev' : 'equispaced'} nodes, degree ${n - 1}: max error ${fmt(em, 3)}`, em < 0.1 ? 'good' : 'bad');
          hud.set('b', 'error = f⁽ⁿ⁾(ξ)/n! · ∏(x − xᵢ): the node product (bottom plot) is huge near the ends for equispaced nodes');
          hud.set('c', 'Chebyshev nodes crowd towards the ends and make the product as small as possible: more nodes, then really means less error');
          const w = xs.map((x) => X.reduce((a, xi) => a * (x - xi), 1));
          plots.aux.draw({ xlim: [-1, 1], series: [{ x: xs, y: w, color: '--c-F', label: 'node polynomial ∏(x − xᵢ) vs x' }] });
        } else if (c === 'quad') {
          const I = INTEGRANDS[state.fq], n = Math.round(state.np), h = (I.b - I.a) / n, X = lin(I.a, I.b, n + 1), Y = X.map(I.f), simp = state.rule === 'simp';
          const fx = lin(I.a, I.b, 400), top = Math.max(...fx.map(I.f)) * 1.15;
          sq.range([I.a, I.b], [0, top]); sq.titles('x', `f(x) (blue) and the ${simp ? 'parabola through each pair of panels' : 'straight line across each panel'} (orange)`);
          sq.line('f', fx, fx.map(I.f), { color: '--c-B', width: 2.6 }); sq.stems('s', X, Y, { color: '--ink-dim', width: 1.2 });
          // the approximating curve: chords, or a parabola per pair of panels
          const ax = [], ay = [];
          for (let i = 0; i < n; i += simp ? 2 : 1) { const x0 = X[i], seg = lin(0, 1, simp ? 30 : 2); for (const u of seg) { const x = x0 + u * h * (simp ? 2 : 1); if (simp) { const [a, b, cc] = [Y[i], Y[i + 1], Y[i + 2]], s = u * 2; ax.push(x); ay.push(a * (s - 1) * (s - 2) / 2 - b * s * (s - 2) + cc * s * (s - 1) / 2); } else { ax.push(x); ay.push(Y[i] + u * (Y[i + 1] - Y[i])); } } }
          sq.line('a', ax, ay, { color: '--c-I', width: 1.8 }); sq.dots('n', X, Y, { color: '--accent', size: 8 });
          const est = (simp ? simpson : trapz)(I.f, I.a, I.b, n), err = est - I.exact, lns = NS.map(Math.log10);
          tr.range([0.2, 2.5], [-14, 0]); tr.titles('log₁₀ panels n', 'log₁₀ |error|: trapezoid slope −2 (red), Simpson −4 (green)');
          tr.line('t', lns, NS.map((k) => lg(trapz(I.f, I.a, I.b, k) - I.exact)), { color: '--c-north' }); tr.line('s', lns, NS.map((k) => lg(simpson(I.f, I.a, I.b, k) - I.exact)), { color: '--c-v' }); tr.dots('q', [Math.log10(n)], [lg(err)], { color: '--accent', size: 11 });
          // error per panel (pair of panels for Simpson)
          const step = simp ? 2 : 1, pe = [], px = []; for (let i = 0; i < n; i += step) { const a = X[i], b = X[i + step], f = (simp ? simpson : trapz)(I.f, a, b, step), ex = simpson(I.f, a, b, 400); pe.push(f - ex); px.push((a + b) / 2); }
          const pm = Math.max(1e-12, ...pe.map(Math.abs)) * 1.15; br.range([I.a, I.b], [-pm, pm]); br.titles('x', 'error contributed by each panel'); br.stems('p', px, pe, { color: '--c-I', width: 6 });
          hud.set('a', `${simp ? 'Simpson' : 'trapezoid'}, n = ${n}: ${fmt(est, 10)} vs exact ${fmt(I.exact, 10)}, error ${fmt(err, 3)}`);
          hud.set('b', simp ? 'Simpson: parabolas match f up to x³, error ∝ h⁴ — double n, error ÷ 16' : 'trapezoid: chords cut below a convex curve, error ∝ h² f″ — double n, error ÷ 4');
          hud.set('c', 'the panel errors (bottom) are largest where f curves most: adaptive rules put more panels exactly there');
          plots.aux.draw({ xlim: [0.2, 2.5], series: [{ x: lns, y: NS.map((k) => lg(trapz(I.f, I.a, I.b, k) - I.exact) - lg(simpson(I.f, I.a, I.b, k) - I.exact)), color: '--c-v', label: 'digits Simpson gains over trapezoid vs log₁₀ n' }] });
        } else {
          const h = 10 ** state.lh, D = state.scheme === 'central' ? central : forward, exact = Math.cos(X0), hs = lin(-16, 0, 321), ef = hs.map((l) => lg(forward(Math.sin, X0, 10 ** l) - exact)), ec = hs.map((l) => lg(central(Math.sin, X0, 10 ** l) - exact)), d = D(Math.sin, X0, h), eps = 2.2e-16;
          sq.range([-16, 0], [-12, 1]); sq.titles('log₁₀ h', 'log₁₀ |error| of f′(1): forward (red), central (green)'); sq.line('f', hs, ef, { color: '--c-north', width: 1.6 }); sq.line('c', hs, ec, { color: '--c-v', width: 1.6 });
          const tf = state.scheme === 'central' ? (l) => lg(exact * 10 ** (2 * l) / 6) : (l) => lg(Math.sin(X0) * 10 ** l / 2), ro = (l) => lg(eps * Math.sin(X0) / 10 ** l);
          sq.line('tr', hs, hs.map(tf), { color: '--c-B', dashed: true, width: 1 }); sq.line('ro', hs, hs.map(ro), { color: '--c-E', dashed: true, width: 1 }); sq.dots('q', [state.lh], [lg(d - exact)], { color: '--accent', size: 12 });
          // a zoom on sin near x = 1 with the difference chord
          const w = Math.max(3 * h, 0.15), zx = lin(X0 - w, X0 + w, 200), a = state.scheme === 'central' ? X0 - h : X0, b = X0 + h;
          tr.range([X0 - w, X0 + w], [Math.sin(X0 - w), Math.sin(X0 + w)]); tr.titles('x near 1', 'sin x, the chord used (orange) and the tangent (dashed)');
          tr.line('f', zx, zx.map(Math.sin), { color: '--c-B' }); tr.line('t', [X0 - w, X0 + w], [Math.sin(X0) - w * exact, Math.sin(X0) + w * exact], { color: '--ink-dim', dashed: true, width: 1.2 }); tr.line('c', [a, b], [Math.sin(a), Math.sin(b)], { color: '--c-I', width: 1.8 }); tr.dots('d', [a, b], [Math.sin(a), Math.sin(b)], { color: '--accent', size: 9 });
          br.range([-16, 0], [0, 12]); br.titles('log₁₀ h', 'correct digits of f′(1)'); br.line('f', hs, ef.map((e) => Math.max(0, -e)), { color: '--c-north' }); br.line('c', hs, ec.map((e) => Math.max(0, -e)), { color: '--c-v' }); br.dots('q', [state.lh], [Math.max(0, -lg(d - exact))], { color: '--accent', size: 11 });
          const good = Math.abs(d - exact) < 1e-6;
          hud.set('a', `h = 10^${fmt(state.lh, 3)}: ${state.scheme} difference ${fmt(d, 12)} vs cos 1 = ${fmt(exact, 12)}, error ${fmt(d - exact, 2)}`, good ? 'good' : 'bad');
          hud.set('b', `truncation (blue dashed) falls as h${state.scheme === 'central' ? '²' : ''}, round-off (yellow dashed) grows as ε/h with ε ≈ 2·10⁻¹⁶: the best h balances them`);
          hud.set('c', `best h ≈ ${state.scheme === 'central' ? '∛ε ≈ 10⁻⁵, about 11 digits' : '√ε ≈ 10⁻⁸, about 8 digits'} — smaller h subtracts two nearly equal numbers and loses everything`);
          plots.aux.draw({ xlim: [-16, 0], cursor: state.lh, series: [{ x: hs, y: hs.map((l) => D(Math.sin, X0, 10 ** l)), color: '--c-I', label: 'difference quotient vs log₁₀ h' }, { x: [-16, 0], y: [exact, exact], color: '--ink-dim', label: 'cos 1' }], ylim: [exact - 0.5, exact + 0.5] });
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
