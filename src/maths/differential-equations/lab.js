// Differential equations: the slope field, the solution through a point you drag, and Euler's steps.
import * as THREE from 'three';
import { createGraph2D } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import { KINDS, euler, rk4 } from './model.js';

const X = [-4, 4], Y = [-3, 3];
const fmt = (v) => (Number.isFinite(v) ? String(Number(v.toPrecision(4))) : '—');

export default {
  id: 'differential-equations', title: 'Differential equations', size: 4.4, ortho: true, plain: true, timeless: true, cam: 'top',
  defaults: { kind: 'growth', k: 0.5, r: 1, K: 2, gamma: 0, x0: -3, y0: 0.4, h: 0.5, euler: true, field: true },
  cases: [
    { id: 'growth', label: 'y′ = ky', set: {}, examples: [
      { id: 'decay', label: 'k < 0: decay', set: { k: -0.8, y0: 2.5 } },
      { id: 'small', label: 'Smaller step: closer', set: { h: 0.1 } },
      { id: 'big', label: 'Big step: Euler lags', set: { h: 1 } },
      { id: 'unstable', label: 'Stiff: Euler blows up', controls: ['h'], set: { k: -3, y0: 2, h: 0.8 } },
    ] },
    { id: 'logistic', label: 'Logistic', set: { kind: 'logistic', y0: 0.1 }, examples: [
      { id: 'above', label: 'Start above K: falls back', set: { y0: 2.8 } },
      { id: 'eq', label: 'Start at K: stays', set: { y0: 2 } },
      { id: 'fast', label: 'Faster growth rate', set: { r: 2.5 } },
    ] },
    { id: 'forced', label: 'Driven', set: { kind: 'forced', y0: 2.5, h: 0.3 }, examples: [
      { id: 'low', label: 'Start below: same fate', set: { y0: -2.5 } },
      { id: 'on', label: 'Start on the steady curve', set: { y0: -0.565 } },
    ] },
    { id: 'oscillator', label: 'Phase plane', set: { kind: 'oscillator', x0: 2, y0: 0, h: 0.2 }, examples: [
      { id: 'damped', label: 'Damped: spiral in', set: { gamma: 0.2 } },
      { id: 'euler', label: 'Euler spirals out', controls: ['h'], set: { h: 0.4 } },
      { id: 'over', label: 'Overdamped: no turn', set: { gamma: 1.5, x0: 2.5, y0: 1 } },
    ] },
  ],
  controls: [
    { title: 'Equation', items: [
      { type: 'readout', label: 'Equation', value: (s) => KINDS[s.kind].label },
      { id: 'k', label: 'Rate k', unit: '', min: -3, max: 1.5, step: 0.05, show: (s) => s.kind === 'growth' },
      { id: 'r', label: 'Growth rate r', unit: '', min: 0.1, max: 3, step: 0.05, show: (s) => s.kind === 'logistic' },
      { id: 'K', label: 'Capacity K', unit: '', min: 0.5, max: 2.8, step: 0.05, show: (s) => s.kind === 'logistic' },
      { id: 'gamma', label: 'Damping γ', unit: '', min: 0, max: 2, step: 0.01, show: (s) => s.kind === 'oscillator' },
    ] },
    { title: 'Start and step', items: [
      { id: 'x0', label: 'Start x₀', unit: '', min: -4, max: 3, step: 0.05 },
      { id: 'y0', label: 'Start y₀', unit: '', min: -2.9, max: 2.9, step: 0.05 },
      { id: 'h', label: 'Euler step h', unit: '', min: 0.02, max: 1.2, log: true },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'field', label: 'Slope field', type: 'check', color: '--c-ref' },
    { id: 'euler', label: 'Euler steps', type: 'check', color: '--c-F' },
  ] }],
  plots: [{ id: 'err', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'eq', label: '' }, { id: 'end', label: 'at the end' }, { id: 'eu', label: '  Euler' }, { id: 'err', label: '  error' }],

  setup(ctx) {
    const { scene, state, hud, plots, handles, stage } = ctx;
    stage.controls.enableRotate = false;
    const graph = createGraph2D(stage, { x: X, y: Y });
    const field = createCurve(stage, { max: 1400, width: 1.2, color: '--c-ref' });
    const sol = createCurve(stage, { max: 4000, width: 3, color: '--c-B' });
    const eu = createCurve(stage, { max: 400, width: 2, color: '--c-F' });
    const dots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 6, sizeAttenuation: false }));
    dots.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3)); dots.frustumCulled = false; scene.add(dots);
    const knob = createKnob(scene, '--accent', 0.1);
    handles.add({ object: knob.group, axes: 'xy', hint: 'Drag the starting point', get: () => knob.get(),
      set: ([x, y]) => { state.x0 = Math.max(-4, Math.min(3, x)); state.y0 = Math.max(-2.9, Math.min(2.9, y)); ctx.requestUpdate(); ctx.panelSync(); } });
    const inside = ([x, y]) => x >= X[0] - 0.01 && x <= X[1] + 0.01 && Math.abs(y) <= 4;

    return {
      update() {
        const K = KINDS[state.kind], F = K.F(state), sys = !!K.system, p0 = [state.x0, state.y0];
        // slope field: short segments along F, normalised
        const seg = [];
        for (let i = 0; i <= 24; i++) for (let j = 0; j <= 18; j++) {
          const x = X[0] + 8 * i / 24, y = Y[0] + 6 * j / 18, [a, b] = F(x, y), n = Math.hypot(a, b) || 1, L = 0.13;
          seg.push(x - L * a / n, y - L * b / n, 0, x + L * a / n, y + L * b / n, 0);
        }
        field.segments(seg); field.object.visible = state.field;
        // the solution (closed form when known, else RK4 with a fine step), forward and backward for y′ = f
        let path;
        if (sys) path = rk4(F, p0, 0.01, 3000);
        else { const fwd = rk4(F, p0, 0.01, Math.ceil((X[1] - state.x0) / 0.01)), back = rk4(F, p0, -0.01, Math.ceil((state.x0 - X[0]) / 0.01)); path = [...back.reverse(), ...fwd.slice(1)]; }
        sol.set(path.filter(inside).flatMap(([x, y]) => [x, Math.max(-3.5, Math.min(3.5, y)), 0.001]));
        // Euler from the start, to the right edge (or for the same time span in the phase plane)
        const n = sys ? Math.min(399, Math.ceil(30 / state.h)) : Math.min(399, Math.ceil((X[1] - state.x0) / state.h));
        const E = euler(F, p0, state.h, n).filter(inside);
        eu.set(E.flatMap(([x, y]) => [x, Math.max(-3.5, Math.min(3.5, y)), 0.002])); eu.object.visible = dots.visible = state.euler;
        const P = dots.geometry.attributes.position; E.forEach(([x, y], i) => P.setXYZ(i, x, Math.max(-3.5, Math.min(3.5, y)), 0.003)); P.needsUpdate = true; dots.geometry.setDrawRange(0, E.length);
        knob.set([state.x0, state.y0, 0.02]);
        hud.set('eq', K.label);
        const last = E[E.length - 1];
        if (sys) {
          const en = ([x, v]) => x * x + v * v, R = rk4(F, p0, state.h / 20, E.length * 20);
          hud.set('end', `energy x² + x′² = ${fmt(en(R[R.length - 1]))} (start ${fmt(en(p0))})`); hud.set('eu', `energy ${fmt(en(last))}`); hud.set('err', `×${fmt(en(last) / en(R[R.length - 1]))}`);
          const ts = [], e1 = [], e2 = []; for (let i = 0; i < E.length; i++) { ts.push(i * state.h); e1.push(en(E[i])); e2.push(en(R[i * 20] || R[R.length - 1])); }
          plots.err.draw({ xlim: [0, Math.max(state.h, (E.length - 1) * state.h)], series: [{ x: ts, y: e2, color: '--c-B', label: 'energy, exact' }, { x: ts, y: e1, color: '--c-F', label: 'Euler' }] });
        } else {
          const ex = K.exact(state), yx = ex(last[0]);
          hud.set('end', `y(${fmt(last[0])}) = ${fmt(yx)}`); hud.set('eu', fmt(last[1])); hud.set('err', fmt(Math.abs(last[1] - yx)), Math.abs(last[1] - yx) < 0.05 ? 'good' : '');
          const xs = E.map((p) => p[0]), er = E.map(([x, y]) => y - ex(x));
          plots.err.draw({ xlim: [state.x0, Math.max(state.x0 + state.h, xs[xs.length - 1])], series: [{ x: xs, y: er, color: '--c-F', label: 'Euler − exact' }] });
        }
      },
      theme() { graph.theme(); for (const c of [field, sol, eu]) c.theme(); knob.theme(); dots.material.color.set(ctx.cssVar('--c-F')); },
    };
  },
};
