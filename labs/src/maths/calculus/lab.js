// Calculus: secant → tangent, Riemann sums → integral, Taylor polynomials, on one draggable curve.
import { createGraph2D, fnSegments, createDots } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import * as THREE from 'three';
import { FUNCS, f, df, integral, riemann, taylor } from './model.js';

const X = [-5, 5], Y = [-3, 3.5];

export default {
  id: 'calculus', title: 'Derivative, integral, Taylor', size: 4.4, ortho: true, plain: true, timeless: true, cam: 'top',
  defaults: { mode: 'derivative', fn: 'sq', x0: 0.8, h: 1.2, a: -1, b: 2.5, n: 8, rule: 'mid', N: 3 },
  scenarios: [
    { id: 'derivative', label: 'Derivative', hint: 'Shrink h: the secant becomes the tangent.', set: { mode: 'derivative', fn: 'sq', x0: 1, h: 1 } },
    { id: 'integral', label: 'Integral', hint: 'Add strips: the sum becomes the area.', set: { mode: 'integral', fn: 'sq', a: 0, b: 2, n: 4, rule: 'left' } },
    { id: 'taylor', label: 'Taylor', hint: 'Raise N: the polynomial hugs the curve.', set: { mode: 'taylor', fn: 'sin', x0: 0, N: 1 } },
  ],
  controls: [
    { title: 'Function', items: [
      { id: 'fn', label: 'f(x)', type: 'select', options: Object.entries(FUNCS).map(([k, v]) => [k, v.label]) },
    ] },
    { title: 'Derivative', show: (s) => s.mode === 'derivative', items: [
      { id: 'x0', label: 'Point x₀', unit: '', min: -4.5, max: 4.5, step: 0.01 },
      { id: 'h', label: 'Step h', unit: '', min: 0.001, max: 3, log: true, },
    ] },
    { title: 'Integral', show: (s) => s.mode === 'integral', items: [
      { id: 'a', label: 'From a', unit: '', min: -4.5, max: 4.5, step: 0.01 },
      { id: 'b', label: 'To b', unit: '', min: -4.5, max: 4.5, step: 0.01 },
      { id: 'n', label: 'Strips n', unit: '', min: 1, max: 100, step: 1, log: true },
      { id: 'rule', label: 'Height of each strip', type: 'segmented', options: [['left', 'Left'], ['mid', 'Middle'], ['right', 'Right'], ['trap', 'Trapezoid']] },
    ] },
    { title: 'Taylor', show: (s) => s.mode === 'taylor', items: [
      { id: 'x0', label: 'Centre x₀', unit: '', min: -4.5, max: 4.5, step: 0.01 },
      { id: 'N', label: 'Order N', unit: '', min: 0, max: 15, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 'x', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a1', label: '' }, { id: 'a2', label: '' }, { id: 'a3', label: '' }, { id: 'a4', label: '' }],

  setup(ctx) {
    const { scene, state, hud, stage, plots } = ctx;
    stage.controls.enableRotate = false;
    const graph = createGraph2D(stage, { x: X, y: Y });
    const curve = createCurve(stage, { max: 1400, width: 3.2, color: '--c-B' });
    const tangent = createCurve(stage, { max: 1, width: 2.2, color: '--c-F' }), secant = createCurve(stage, { max: 1, width: 2, color: '--c-E', dashed: true });
    const poly = createCurve(stage, { max: 1400, width: 2.4, color: '--c-F' });
    const strips = createCurve(stage, { max: 600, width: 1.2, color: '--c-E' });
    const fillMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    const fill = new THREE.Mesh(new THREE.BufferGeometry(), fillMat); scene.add(fill);
    const dots = createDots(scene, 2, { r: 0.06, color: '--c-E' });
    const k0 = createKnob(scene, '--accent', 0.1), ka = createKnob(scene, '--accent', 0.1), kb = createKnob(scene, '--accent', 0.1);
    const cl = (v) => Math.max(-4.5, Math.min(4.5, v));
    ctx.handles.add({ object: k0.group, axes: 'x', hint: 'Drag along the curve', get: () => k0.get(), set: ([x]) => { state.x0 = cl(x); ctx.requestUpdate(); ctx.panelSync(); } });
    ctx.handles.add({ object: ka.group, axes: 'x', hint: 'Drag a', get: () => ka.get(), set: ([x]) => { state.a = cl(x); ctx.requestUpdate(); ctx.panelSync(); } });
    ctx.handles.add({ object: kb.group, axes: 'x', hint: 'Drag b', get: () => kb.get(), set: ([x]) => { state.b = cl(x); ctx.requestUpdate(); ctx.panelSync(); } });
    const n6 = (v) => (Number.isFinite(v) ? v.toFixed(6) : '—');

    function setFill(k, a, b, n, rule) {
      const pos = [], seg = [], h = (b - a) / n;
      for (let i = 0; i < n; i++) {
        const x0 = a + i * h, x1 = x0 + h;
        const y0 = rule === 'left' ? f(k, x0) : rule === 'right' ? f(k, x1) : rule === 'mid' ? f(k, x0 + h / 2) : f(k, x0), y1 = rule === 'trap' ? f(k, x1) : y0;
        pos.push(x0, 0, -0.002, x1, 0, -0.002, x1, y1, -0.002, x0, 0, -0.002, x1, y1, -0.002, x0, y0, -0.002);
        seg.push(x0, 0, 0, x0, y0, 0, x0, y0, 0, x1, y1, 0, x1, y1, 0, x1, 0, 0);
      }
      fill.geometry.dispose(); fill.geometry = new THREE.BufferGeometry(); fill.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      strips.segments(seg);
    }

    return {
      update() {
        const k = state.fn, F = (x) => f(k, x), m = state.mode;
        curve.segments(fnSegments(F, X, Y));
        for (const o of [tangent.object, secant.object, k0.group]) o.visible = m !== 'integral';
        secant.object.visible = m === 'derivative';
        poly.object.visible = m === 'taylor';
        strips.object.visible = fill.visible = ka.group.visible = kb.group.visible = m === 'integral';
        const xs = new Float64Array(300), y1 = new Float64Array(300), y2 = new Float64Array(300);
        if (m === 'derivative') {
          const x0 = state.x0, y0 = F(x0), s = df(k, x0), x1 = x0 + state.h, sec = (F(x1) - y0) / state.h;
          k0.set([x0, y0, 0.02]);
          tangent.segments([x0 - 3, y0 - 3 * s, 0, x0 + 3, y0 + 3 * s, 0]);
          secant.segments([x0 - 3, y0 - 3 * sec, 0, x0 + 3, y0 + 3 * sec, 0]);
          dots.set([{ p: [x1, F(x1), 0.01], text: 'x₀ + h' }]);
          hud.set('a1', `f′(x₀) = ${n6(s)}  (tangent)`); hud.set('a2', `secant slope = ${n6(sec)}`);
          hud.set('a3', `error = ${(sec - s).toExponential(2)}`, Math.abs(sec - s) < 1e-3 ? 'good' : '');
          hud.set('a4', `h = ${state.h.toPrecision(3)}: halve h, error ≈ halves`);
          for (let i = 0; i < 300; i++) { xs[i] = X[0] + (X[1] - X[0]) * i / 299; y1[i] = df(k, xs[i]); }
          plots.aux.draw({ xlim: X, cursor: x0, markers: [{ x: x0, y: s, color: '--c-F' }, { x: x0, y: sec, color: '--c-E' }],
            series: [{ x: xs, y: y1, color: '--c-F', label: "f′(x), the slope everywhere" }] });
        } else if (m === 'integral') {
          const [a, b] = [Math.min(state.a, state.b), Math.max(state.a, state.b)];
          ka.set([state.a, 0, 0.02]); kb.set([state.b, 0, 0.02]); dots.set([]);
          setFill(k, a, b, state.n, state.rule);
          const ex = integral(k, a, b), sum = riemann(k, a, b, state.n, state.rule);
          hud.set('a1', `exact ∫ = ${n6(ex)}`); hud.set('a2', `sum with ${state.n} strips = ${n6(sum)}`);
          hud.set('a3', `error = ${(sum - ex).toExponential(2)}`, Math.abs(sum - ex) < 1e-3 ? 'good' : '');
          hud.set('a4', state.rule === 'mid' || state.rule === 'trap' ? 'error ∝ 1/n²' : 'error ∝ 1/n');
          const ns = [], errs = { left: [], mid: [], trap: [] };
          for (let n = 1; n <= 60; n++) { ns.push(n); for (const r of Object.keys(errs)) errs[r].push(Math.abs(riemann(k, a, b, n, r) - ex)); }
          plots.aux.draw({ xlim: [1, 60], cursor: state.n, series: [
            { x: ns, y: errs.left, color: '--c-E', label: '|error| left' }, { x: ns, y: errs.mid, color: '--c-F', label: 'middle' }, { x: ns, y: errs.trap, color: '--c-v', dash: [4, 3], label: 'trapezoid' }] });
        } else {
          const x0 = state.x0, T = taylor(k, x0, state.N);
          k0.set([x0, F(x0), 0.02]); dots.set([]);
          tangent.object.visible = false;
          poly.segments(fnSegments(T, X, Y));
          hud.set('a1', `T_${state.N}(x) around x₀ = ${x0.toFixed(2)}`);
          hud.set('a2', `error at x₀ + 1: ${Math.abs(T(x0 + 1) - F(x0 + 1)).toExponential(2)}`);
          hud.set('a3', `error at x₀ + 2: ${Math.abs(T(x0 + 2) - F(x0 + 2)).toExponential(2)}`); hud.set('a4', 'one more term: ×|x − x₀|/(N+1) smaller');
          for (let i = 0; i < 300; i++) { xs[i] = X[0] + (X[1] - X[0]) * i / 299; y2[i] = Math.log10(Math.abs(T(xs[i]) - F(xs[i])) + 1e-16); }
          plots.aux.draw({ xlim: X, cursor: x0, series: [{ x: xs, y: y2, color: '--c-F', label: 'log₁₀ |f − T_N|' }] });
        }
      },
      theme() { graph.theme(); for (const c of [curve, tangent, secant, poly, strips]) c.theme(); fillMat.color.set(ctx.cssVar('--c-E')); dots.theme(); for (const kk of [k0, ka, kb]) kk.theme(); },
    };
  },
};
