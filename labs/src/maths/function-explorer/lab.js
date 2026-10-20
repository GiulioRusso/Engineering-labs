// Functions: linear, quadratic, exponential, logarithm, with draggable handles and key points.
import { createGraph2D, fnSegments, createDots } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import { family } from './model.js';

const X = [-6, 6], Y = [-4.5, 4.5];
const FAM_HINT = {
  linear: 'Drag the two handles: two points fix a line.',
  quadratic: 'Drag the handle to move the vertex; the slider bends the parabola.',
  exponential: 'Drag the handle on the y axis (A) and the one at x = 1 (A·b).',
  logarithm: 'Drag the handle at y = 1: its x is the base b, since log_b(b) = 1.',
};

export default {
  id: 'function-explorer', title: 'Functions', size: 5, ortho: true, plain: true, timeless: true, cam: 'top',
  defaults: { family: 'quadratic', x1: -2, y1: -1, x2: 2, y2: 2, a: 0.5, h: 1, k: -2, A: 1, base: 2, inverse: false, points: true },
  scenarios: [
    { id: 'linear', label: 'Straight line', hint: 'Slope and intercept from two points.', set: { family: 'linear' } },
    { id: 'parabola', label: 'Parabola', hint: 'Vertex, roots and the discriminant.', set: { family: 'quadratic' } },
    { id: 'no-roots', label: 'Parabola with no roots', hint: 'Δ < 0: it never crosses the axis.', set: { family: 'quadratic', a: 0.6, h: -1, k: 1.2 } },
    { id: 'exponential', label: 'Exponential growth', hint: 'Doubles for every step in x.', set: { family: 'exponential', A: 0.5, base: 2 } },
    { id: 'log-inverse', label: 'Logarithm as inverse', hint: 'The mirror of the exponential across y = x.', set: { family: 'logarithm', base: 2, inverse: true } },
  ],
  controls: [
    { title: 'Function', items: [
      { id: 'family', label: 'Family', type: 'segmented', options: [['linear', 'Linear'], ['quadratic', 'Quadratic'], ['exponential', 'Exponential'], ['logarithm', 'Log']], hint: (s) => FAM_HINT[s.family] },
      { type: 'readout', label: 'Equation', value: (s) => family(s).text },
    ] },
    { title: 'Parameters', items: [
      { id: 'a', label: 'Opening a', unit: '', min: -3, max: 3, step: 0.05, show: (s) => s.family === 'quadratic', hint: 'a > 0 opens up, a < 0 opens down; bigger |a| is steeper.' },
      { id: 'h', label: 'Vertex x (h)', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.family === 'quadratic' },
      { id: 'k', label: 'Vertex y (k)', unit: '', min: -4, max: 4, step: 0.05, show: (s) => s.family === 'quadratic' },
      { id: 'A', label: 'Starting value A', unit: '', min: 0.1, max: 4, step: 0.05, show: (s) => s.family === 'exponential' },
      { id: 'base', label: 'Base b', unit: '', min: 0.2, max: 5, step: 0.01, show: (s) => s.family === 'exponential' || s.family === 'logarithm', hint: 'b > 1 grows, 0 < b < 1 decays.' },
      { id: 'x1', label: 'Point 1 x', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.family === 'linear' },
      { id: 'y1', label: 'Point 1 y', unit: '', min: -4, max: 4, step: 0.05, show: (s) => s.family === 'linear' },
      { id: 'x2', label: 'Point 2 x', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.family === 'linear' },
      { id: 'y2', label: 'Point 2 y', unit: '', min: -4, max: 4, step: 0.05, show: (s) => s.family === 'linear' },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'points', label: 'Key points (roots, vertex, intercept)', type: 'check' },
    { id: 'inverse', label: 'Inverse function (mirror across y = x)', type: 'check', color: '--c-ref', show: (s) => s.family === 'exponential' || s.family === 'logarithm' },
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
