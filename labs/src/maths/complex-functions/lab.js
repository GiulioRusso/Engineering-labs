// Complex functions: Euler's formula assembled term by term from its power series, domain colouring of
// f(z) (colour = direction of f, rings = size), and how f bends a square grid of the plane.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { FUNCS, eulerTerms, domainColor } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '∞');
const SQL = [-4.3, -2.35, 4.4, 4.9], SQR = [0.35, -2.35, 4.2, 4.9], BIG = [-2.45, -2.35, 4.9, 4.9];
const OPTS = Object.entries(FUNCS).map(([k, v]) => [k, v.label]);

export default {
  id: 'complex-functions', title: 'Complex functions', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  defaults: { theta: 3.1416, nterms: 8, auto: true, fn: 'cube', mf: 'sq', zoom: 2 },
  cases: [
    { id: 'euler', label: "Euler's formula", set: {}, examples: [
      { id: 'pi', label: 'θ = π: e^(iπ) = −1', controls: ['nterms'], set: { theta: 3.1416, auto: false, nterms: 14 } },
      { id: 'quarter', label: 'θ = π/2: i', controls: ['nterms'], set: { theta: 1.5708, auto: false, nterms: 10 } },
    ] },
    { id: 'domain', label: 'Domain colouring', set: {}, examples: [
      { id: 'sq', label: 'z²: colours go round twice', controls: ['fn'], set: { fn: 'sq' } },
      { id: 'pole', label: '1/z: a pole', controls: ['fn'], set: { fn: 'inv' } },
      { id: 'exp', label: 'eᶻ: periodic up the imaginary axis', controls: ['fn', 'zoom'], set: { fn: 'exp', zoom: 4 } },
    ] },
    { id: 'mapping', label: 'Mapping a grid', set: {}, examples: [
      { id: 'exp', label: 'eᶻ: lines become circles and rays', controls: ['mf'], set: { mf: 'exp' } },
      { id: 'inv', label: '1/z: lines become circles', controls: ['mf'], set: { mf: 'inv' } },
    ] },
  ],
  controls: [
    { title: 'Series', show: (s) => s.case === 'euler', items: [{ id: 'auto', label: 'Sweep θ', type: 'check' }, { id: 'theta', label: 'Angle θ', unit: 'rad', min: 0, max: 6.2832, step: 0.01, show: (s) => !s.auto }, { id: 'nterms', label: 'Terms', unit: '', min: 1, max: 20, step: 1 }] },
    { title: 'Function', show: (s) => s.case === 'domain', items: [{ id: 'fn', label: 'f(z)', type: 'select', options: OPTS }, { id: 'zoom', label: 'View half-width', unit: '', min: 1, max: 6, step: 0.1 }] },
    { title: 'Function', show: (s) => s.case === 'mapping', items: [{ id: 'mf', label: 'f(z)', type: 'select', options: OPTS }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const big = createChart(ctx, { box: BIG }), sql = createChart(ctx, { box: SQL }), sqr = createChart(ctx, { box: SQR }), all = [big, sql, sqr];
    const arr = createCurve(stage, { max: 200, width: 2.4, color: '--c-I' }), gl = createCurve(stage, { max: 9000, width: 1.2, color: '--c-B' }), gl2 = createCurve(stage, { max: 9000, width: 1.2, color: '--c-I' }), gr = createCurve(stage, { max: 9000, width: 1.2, color: '--c-B' }), gr2 = createCurve(stage, { max: 9000, width: 1.2, color: '--c-I' }), extra = [arr, gl, gl2, gr, gr2];
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); for (const o of extra) o.object.visible = false; ({ euler: [big], domain: [big], mapping: [sql, sqr] })[c].forEach((k) => k.show(true)); ctx.setClock(c === 'euler' ? 8 : 0); },
      update() {
        const c = state.case;
        if (c === 'euler') {
          const th = state.auto ? 2 * Math.PI * (time.t % 8) / 8 : state.theta, E = eulerTerms(th, state.nterms), R = 1.1 * Math.max(1.3, ...E.arrows.flatMap(([, b]) => [Math.abs(b[0]), Math.abs(b[1])]));
          big.range([-R, R], [-R, R]); big.titles('Re', 'Im: the terms of Σ (iθ)ᵏ/k! laid tip to tail');
          const circ = Array.from({ length: 181 }, (_, i) => 2 * Math.PI * i / 180); big.line('u', circ.map(Math.cos), circ.map(Math.sin), { color: '--c-ref', dashed: true, width: 1.2 });
          const seg = []; E.arrows.forEach(([a, b]) => seg.push(big.mx(a[0]), big.my(a[1]), 0.004, big.mx(b[0]), big.my(b[1]), 0.004)); arr.segments(seg); arr.object.visible = true;
          big.dots('s', [E.sum[0]], [E.sum[1]], { color: '--accent', size: 12 }); big.dots('t', [Math.cos(th)], [Math.sin(th)], { color: '--c-north', size: 10 });
          hud.set('a', `e^(iθ) = cos θ + i sin θ = ${fmt(Math.cos(th))} + ${fmt(Math.sin(th))}i  (θ = ${fmt(th)})`); hud.set('b', `${state.nterms} terms reach ${fmt(E.sum[0])} + ${fmt(E.sum[1])}i`);
          hud.set('c', 'each term is the previous one × iθ/k: a quarter turn and a shrink — the spiral closes on the unit circle');
          const ns = Array.from({ length: 20 }, (_, i) => i + 1); plots.aux.draw({ xlim: [1, 20], cursor: state.nterms, series: [{ x: ns, y: ns.map((n) => { const s = eulerTerms(th, n).sum; return Math.log10(Math.hypot(s[0] - Math.cos(th), s[1] - Math.sin(th)) + 1e-16); }), color: '--c-I', label: 'log₁₀ error vs terms' }] });
        } else if (c === 'domain') {
          const F = FUNCS[state.fn].f, Z = state.zoom, n = 200, vals = new Float64Array(n * n), W = new Array(n * n);
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) W[j * n + i] = F([-Z + 2 * Z * (i + 0.5) / n, -Z + 2 * Z * (j + 0.5) / n]);
          big.range([-Z, Z], [-Z, Z]); big.titles('Re z', 'Im z: colour = direction of f(z), rings = size'); big.image('d', vals, n, n, { rgb: (k, out) => domainColor(W[k], out) });
          hud.set('a', `f(z) = ${FUNCS[state.fn].label}: red = positive real, cyan = negative real`); hud.set('b', 'a zero: all colours meet, going round once per order (counter-clockwise)'); hud.set('c', 'a pole: all colours meet going round the other way, with rings crowding in');
          plots.aux.draw({ xlim: [-Z, Z], series: [{ x: Array.from({ length: n }, (_, i) => -Z + 2 * Z * (i + 0.5) / n), y: Array.from({ length: n }, (_, i) => Math.log10(Math.hypot(...W[(n >> 1) * n + i]) + 1e-12)), color: '--c-B', label: 'log₁₀ |f| along the real axis' }] });
        } else {
          const F = FUNCS[state.mf].f, R = 1.5, ar = SQL[3] / SQL[2]; sql.range([-R, R], [-R * ar, R * ar]); sql.titles('Re z', 'Im z: a grid in the z-plane'); const S2 = 3; sqr.range([-S2, S2], [-S2 * ar, S2 * ar]); sqr.titles('Re w', `Im w: the image under w = ${FUNCS[state.mf].label}`);
          const L = [], L2 = [], M = [], M2 = [], N = 12, steps = 120, push = (arr2, ch, a, b) => { if ([a, b].every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])) && Math.hypot(a[0] - b[0], a[1] - b[1]) < 2) arr2.push(ch.mx(a[0]), ch.my(a[1]), 0.003, ch.mx(b[0]), ch.my(b[1]), 0.003); };
          for (let i = 0; i <= N; i++) { const v = -R + 2 * R * i / N; for (let k = 0; k < steps; k++) { const a = -R + 2 * R * k / steps, b = -R + 2 * R * (k + 1) / steps; push(L, sql, [v, a], [v, b]); push(L2, sql, [a, v], [b, v]); push(M, sqr, F([v, a]), F([v, b])); push(M2, sqr, F([a, v]), F([b, v])); } }
          gl.segments(L); gl2.segments(L2); gr.segments(M); gr2.segments(M2); for (const o of [gl, gl2, gr, gr2]) o.object.visible = true;
          hud.set('a', 'blue: vertical lines Re z = const · orange: horizontal lines Im z = const'); hud.set('b', 'the grid stays at right angles wherever f′ ≠ 0: complex functions preserve angles (conformal)');
          hud.set('c', state.mf === 'sq' ? 'z² doubles angles: the right half-plane covers the whole plane' : state.mf === 'exp' ? 'eᶻ: vertical lines → circles, horizontal lines → rays' : 'lines become circles or lines');
          plots.aux.draw({ xlim: [-R, R], series: [{ x: [-R, R], y: [0, 0], color: '--line' }] });
        }
      },
      theme() { for (const k of all) k.theme(); for (const o of extra) o.theme(); },
    };
  },
};
