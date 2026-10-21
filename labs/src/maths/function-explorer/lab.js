// Functions: linear, quadratic, exponential, logarithm, with draggable handles and key points.
import { createGraph2D, fnSegments, createDots } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import { family } from './model.js';

const X = [-6, 6], Y = [-4.5, 4.5];

export default {
  id: 'function-explorer', title: 'Functions', size: 5, ortho: true, plain: true, timeless: true, cam: 'top',
  defaults: { family: 'linear', x1: -2, y1: -1, x2: 2, y2: 2, a: 1, h: 0, k: 0, A: 1, base: 2, inverse: false, points: true },
  cases: [
    { id: 'line', label: 'Line', set: { family: 'linear' }, examples: [
      { id: 'flat', label: 'Slope zero', set: { x1: -2, y1: 1, x2: 2, y2: 1 } },
      { id: 'origin', label: 'Through the origin', set: { x1: -2, y1: -2, x2: 2, y2: 2 } },
      { id: 'down', label: 'Negative slope', set: { x1: -2, y1: 2, x2: 2, y2: -1 } },
      { id: 'steep', label: 'Steep: m = 4', set: { x1: 0, y1: -2, x2: 1, y2: 2 } },
    ] },
    { id: 'parabola', label: 'Parabola', set: { family: 'quadratic' }, examples: [
      { id: 'two', label: 'Two roots: Δ > 0', set: { k: -2 } },
      { id: 'one', label: 'One root: Δ = 0', set: { h: 1, k: 0 } },
      { id: 'none', label: 'No roots: Δ < 0', set: { k: 1 } },
      { id: 'down', label: 'Opens down: a < 0', set: { a: -0.5, k: 2 } },
      { id: 'wide', label: 'Wider: small a', set: { a: 0.25, k: -1 } },
    ] },
    { id: 'exponential', label: 'Exponential', set: { family: 'exponential' }, examples: [
      { id: 'decay', label: 'Decay: b < 1', set: { base: 0.5 } },
      { id: 'e', label: 'Base e', set: { base: 2.718 } },
      { id: 'scale', label: 'Start at A = 3', set: { A: 3 } },
      { id: 'inverse', label: 'Its inverse: log', set: { inverse: true } },
    ] },
    { id: 'logarithm', label: 'Logarithm', set: { family: 'logarithm' }, examples: [
      { id: 'ln', label: 'Natural log: base e', set: { base: 2.718 } },
      { id: 'below', label: 'Base below 1', set: { base: 0.5 } },
      { id: 'inverse', label: 'Mirror of 2ˣ', set: { inverse: true } },
    ] },
  ],
  controls: [
    { title: 'Function', items: [
      { type: 'readout', label: 'Equation', value: (s) => family(s).text },
      { id: 'a', label: 'a', unit: '', min: -3, max: 3, step: 0.05, show: (s) => s.family === 'quadratic', hint: 'a > 0 opens up, a < 0 opens down; bigger |a| is steeper.' },
      { id: 'h', label: 'Vertex x', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.family === 'quadratic' },
      { id: 'k', label: 'Vertex y', unit: '', min: -4, max: 4, step: 0.05, show: (s) => s.family === 'quadratic' },
      { id: 'A', label: 'A', unit: '', min: 0.1, max: 4, step: 0.05, show: (s) => s.family === 'exponential' },
      { id: 'base', label: 'Base', unit: '', min: 0.2, max: 5, step: 0.01, show: (s) => s.family === 'exponential' || s.family === 'logarithm', hint: 'b > 1 grows, 0 < b < 1 decays.' },
      { id: 'x1', label: 'x₁', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.family === 'linear' },
      { id: 'y1', label: 'y₁', unit: '', min: -4, max: 4, step: 0.05, show: (s) => s.family === 'linear' },
      { id: 'x2', label: 'x₂', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.family === 'linear' },
      { id: 'y2', label: 'y₂', unit: '', min: -4, max: 4, step: 0.05, show: (s) => s.family === 'linear' },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'points', label: 'Key points', type: 'check' },
    { id: 'inverse', label: 'Inverse', type: 'check', color: '--c-ref', show: (s) => s.family === 'exponential' || s.family === 'logarithm' },
  ] }],
  hud: [{ id: 'eq', label: 'f' }, { id: 'yint', label: 'y-intercept' }, { id: 'roots', label: 'roots' }, { id: 'extra', label: '' }],

  setup(ctx) {
    const { scene, state, hud, handles, stage } = ctx;
    stage.controls.enableRotate = false;
    const graph = createGraph2D(stage, { x: X, y: Y });
    const curve = createCurve(stage, { max: 1400, width: 3.2, color: '--c-B' });
    const inv = createCurve(stage, { max: 1400, width: 2, color: '--c-ref', dashed: true });
    const diag = createCurve(stage, { max: 2, width: 1, color: '--c-ref' });
    const asym = createCurve(stage, { max: 2, width: 1.4, color: '--c-E', dashed: true });
    const dots = createDots(scene, 4, { r: 0.07, color: '--c-E' });
    const k1 = createKnob(scene, '--accent', 0.11), k2 = createKnob(scene, '--accent', 0.11);
    const clampX = (v) => Math.max(-5.5, Math.min(5.5, v)), clampY = (v) => Math.max(-4.2, Math.min(4.2, v));
    const knob = (k, which) => handles.add({
      object: k.group, axes: 'xy', hint: 'Drag me',
      get: () => k.get(),
      set: ([x, y]) => {
        const f = state.family;
        if (f === 'linear') { if (which === 1) { state.x1 = clampX(x); state.y1 = clampY(y); } else { state.x2 = clampX(x); state.y2 = clampY(y); } if (Math.abs(state.x2 - state.x1) < 0.05) state.x2 = state.x1 + 0.05; }
        else if (f === 'quadratic') { state.h = clampX(x); state.k = clampY(y); }
        else if (f === 'exponential') { if (which === 1) state.A = Math.max(0.1, Math.min(4, y)); else state.base = Math.max(0.2, Math.min(5, y / state.A)); }
        else state.base = Math.max(1.05, Math.min(5.5, x));
        ctx.requestUpdate(); ctx.panelSync();
      },
    });
    knob(k1, 1); knob(k2, 2);
    const fmt = (v) => String(Number(v.toPrecision(3)));
    return {
      update() {
        const F = family(state), fam = state.family;
        curve.segments(fnSegments(F.f, X, Y));
        const showInv = state.inverse && F.inv;
        inv.object.visible = diag.object.visible = !!showInv;
        if (showInv) { inv.segments(fnSegments(F.inv, X, Y)); diag.segments([-4.5, -4.5, 0, 4.5, 4.5, 0]); }
        asym.object.visible = F.asymptoteX != null || F.asymptoteY != null;
        if (F.asymptoteY != null) asym.segments([X[0], F.asymptoteY, 0.001, X[1], F.asymptoteY, 0.001]);
        if (F.asymptoteX != null) asym.segments([F.asymptoteX, Y[0], 0.001, F.asymptoteX, Y[1], 0.001]);
        const pts = [];
        if (state.points) {
          for (const r of F.roots) if (r > X[0] && r < X[1]) pts.push({ p: [r, 0, 0.01], text: `x = ${fmt(r)}` });
          if (Number.isFinite(F.yInt) && fam !== 'quadratic') pts.push({ p: [0, F.yInt, 0.01], text: `(0, ${fmt(F.yInt)})` });
          if (F.vertex) pts.push({ p: [...F.vertex, 0.01], text: `vertex (${fmt(F.vertex[0])}, ${fmt(F.vertex[1])})` });
        }
        dots.set(pts);
        // handles
        k2.group.visible = fam !== 'quadratic' && fam !== 'logarithm';
        if (fam === 'linear') { k1.set([state.x1, state.y1, 0.02]); k2.set([state.x2, state.y2, 0.02]); }
        else if (fam === 'quadratic') k1.set([state.h, state.k, 0.02]);
        else if (fam === 'exponential') { k1.set([0, state.A, 0.02]); k2.set([1, state.A * state.base, 0.02]); }
        else k1.set([state.base, 1, 0.02]);
        hud.set('eq', F.text);
        hud.set('yint', Number.isFinite(F.yInt) ? fmt(F.yInt) : 'none (x > 0 only)');
        hud.set('roots', F.roots.length ? F.roots.map(fmt).join(', ') : 'none');
        hud.set('extra', fam === 'linear' ? `slope m = ${fmt(F.m)}` : fam === 'quadratic' ? `Δ = b² − 4ac = ${fmt(F.D)}` : fam === 'exponential' ? 'asymptote y = 0' : 'asymptote x = 0');
      },
      theme() { graph.theme(); curve.theme(); inv.theme(); diag.theme(); asym.theme(); dots.theme(); k1.theme(); k2.theme(); },
    };
  },
};
