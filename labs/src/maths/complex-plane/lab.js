// The complex plane: drag z and w; sums, products, quotients, powers and roots as geometry.
import { createGraph2D, createDots } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { createKnob } from '../../lib/viz/knob.js';
import { abs, arg, add, mul, div, pow, roots, polar, fmt } from './model.js';

const X = [-4, 4], Y = [-3, 3];

export default {
  id: 'complex-plane', title: 'Complex numbers', size: 3.6, ortho: true, plain: true, timeless: true, cam: 'top',
  defaults: { op: 'add', zr: 2, zi: 1, wr: 1, wi: 2, n: 6, unit: true, arcs: true },
  cases: [
    { id: 'add', label: 'Sum', set: { op: 'add' }, examples: [
      { id: 'real', label: 'Two real numbers', set: { zr: 2, zi: 0, wr: 1, wi: 0 } },
      { id: 'conj', label: 'z + z̄ is real', set: { zr: 2, zi: 1, wr: 2, wi: -1 } },
      { id: 'opp', label: 'z + (−z) = 0', set: { wr: -2, wi: -1 } },
    ] },
    { id: 'mul', label: 'Product', set: { op: 'mul', zr: 1, zi: 1, wr: 1, wi: 1 }, examples: [
      { id: 'real', label: 'Times 2: stretch only', set: { wr: 2, wi: 0 } },
      { id: 'i', label: 'Times i: quarter turn', set: { zr: 2, zi: 1, wr: 0, wi: 1 } },
      { id: 'ii', label: 'i · i = −1', set: { zr: 0, zi: 1, wr: 0, wi: 1 } },
      { id: 'conj', label: 'z · z̄ = |z|²', set: { wr: 1, wi: -1 } },
    ] },
    { id: 'div', label: 'Quotient', set: { op: 'div', zr: 0, zi: 2, wr: 1, wi: 1 }, examples: [
      { id: 'self', label: 'z / z = 1', set: { zr: 1, zi: 1 } },
      { id: 'i', label: 'Divide by i: turn back', set: { zr: 1, zi: 1, wr: 0, wi: 1 } },
    ] },
    { id: 'pow', label: 'Powers', set: { op: 'pow', zr: 0.825, zi: 0.565, n: 8 }, examples: [
      { id: 'out', label: '|z| > 1: spirals out', set: { zr: 0.95, zi: 0.45, n: 10 } },
      { id: 'in', label: '|z| < 1: spirals in', set: { zr: 0.8, zi: 0.4, n: 12 } },
      { id: 'i', label: 'Powers of i', set: { zr: 0, zi: 1, n: 4 } },
    ] },
    { id: 'roots', label: 'Roots', set: { op: 'roots', zr: 1, zi: 0, n: 3 }, examples: [
      { id: 'square', label: 'Square roots of 1: ±1', set: { n: 2 } },
      { id: 'hex', label: 'Sixth roots: a hexagon', set: { n: 6 } },
      { id: 'i', label: 'Square roots of i', set: { zr: 0, zi: 1, n: 2 } },
      { id: 'minus', label: 'Cube roots of −1', set: { zr: -1 } },
    ] },
  ],
  controls: [
    { title: 'Numbers', items: [
      { id: 'n', label: 'n', unit: '', min: 2, max: 12, step: 1, show: (s) => s.op === 'pow' || s.op === 'roots' },
      { id: 'zr', label: 'Re z', unit: '', min: -3, max: 3, step: 0.01 },
      { id: 'zi', label: 'Im z', unit: '', min: -2.5, max: 2.5, step: 0.01 },
      { id: 'wr', label: 'Re w', unit: '', min: -3, max: 3, step: 0.01, show: (s) => ['add', 'mul', 'div'].includes(s.op) },
      { id: 'wi', label: 'Im w', unit: '', min: -2.5, max: 2.5, step: 0.01, show: (s) => ['add', 'mul', 'div'].includes(s.op) },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'unit', label: 'Unit circle', type: 'check', color: '--c-ref' },
    { id: 'arcs', label: 'Angle arcs', type: 'check' },
  ] }],
  hud: [{ id: 'z', label: 'z' }, { id: 'zp', label: '  polar' }, { id: 'w', label: 'w' }, { id: 'wp', label: '  polar' }, 'sep', { id: 'r', label: 'result' }, { id: 'rp', label: '  polar' }, { id: 'chk', label: 'check' }],

  setup(ctx) {
    const { scene, state, hud, stage } = ctx;
    stage.controls.enableRotate = false;
    const graph = createGraph2D(stage, { x: X, y: Y, step: 0.5 });
    const unitC = createCurve(stage, { max: 130, width: 1.4, color: '--c-ref', dashed: true });
    const ring = [];
    for (let i = 0; i <= 128; i++) ring.push(...polar(1, 2 * Math.PI * i / 128), 0);
    unitC.set(ring);
    const vz = createVector(scene, '--c-B', 'z', { radius: 0.022 }), vw = createVector(scene, '--c-E', 'w', { radius: 0.022 }), vr = createVector(scene, '--c-F', '', { radius: 0.026 });
    const guide = createCurve(stage, { max: 64, width: 1.4, color: '--c-ref', dashed: true });
    const poly = createCurve(stage, { max: 64, width: 2.4, color: '--c-F' });
    const arcs = [createCurve(stage, { max: 80, width: 2, color: '--c-B' }), createCurve(stage, { max: 80, width: 2, color: '--c-E' }), createCurve(stage, { max: 80, width: 2, color: '--c-F' })];
    const dots = createDots(scene, 13, { r: 0.05, color: '--c-F' });
    const kz = createKnob(scene, '--c-B', 0.08), kw = createKnob(scene, '--c-E', 0.08);
    const cl = (v, m) => Math.max(-m, Math.min(m, v));
    ctx.handles.add({ object: kz.group, axes: 'xy', hint: 'Drag z', get: () => kz.get(), set: ([x, y]) => { state.zr = cl(x, 3); state.zi = cl(y, 2.5); ctx.requestUpdate(); ctx.panelSync(); } });
    ctx.handles.add({ object: kw.group, axes: 'xy', hint: 'Drag w', get: () => kw.get(), set: ([x, y]) => { state.wr = cl(x, 3); state.wi = cl(y, 2.5); ctx.requestUpdate(); ctx.panelSync(); } });
    const arcPts = (r, a0, a1) => { const p = []; for (let i = 0; i <= 40; i++) p.push(...polar(r, a0 + (a1 - a0) * i / 40), 0.002); return p; };
    const pol = (q) => `${abs(q).toFixed(3)} ∠ ${(arg(q) * 180 / Math.PI).toFixed(1)}°`;

    return {
      update() {
        const z = [state.zr, state.zi], w = [state.wr, state.wi], op = state.op, two = ['add', 'mul', 'div'].includes(op);
        unitC.object.visible = state.unit;
        vz.set([0, 0, 0.003], [...z, 0], abs(z)); kz.set([...z, 0.01]);
        vw.group.visible = kw.group.visible = two;
        if (two) { vw.set([0, 0, 0.003], [...w, 0], abs(w)); kw.set([...w, 0.01]); }
        let res = null, check = '';
        guide.segments([]); poly.set([]); dots.set([]); for (const a of arcs) a.set([]);
        if (op === 'add') {
          res = add(z, w);
          guide.segments([...z, 0, ...res, 0, ...w, 0, ...res, 0]);
          check = 'parallelogram ✓';
        } else if (op === 'mul' || op === 'div') {
          res = op === 'mul' ? mul(z, w) : div(z, w);
          if (state.arcs) {
            arcs[0].set(arcPts(0.35, 0, arg(z))); arcs[1].set(arcPts(0.45, 0, arg(w))); arcs[2].set(arcPts(0.55, 0, arg(res)));
          }
          const expect = op === 'mul' ? abs(z) * abs(w) : abs(z) / abs(w);
          check = `|result| ${op === 'mul' ? '= |z|·|w|' : '= |z|/|w|'} = ${expect.toFixed(3)} ✓`;
        } else if (op === 'pow') {
          const pts = [0, 0, 0], dd = [];
          for (let k = 1; k <= state.n; k++) { const p = pow(z, k); pts.push(...p, 0.002); dd.push({ p: [...p, 0.004], text: k > 1 && k < 4 || k === state.n ? `z${'⁰¹²³⁴⁵⁶⁷⁸⁹'[k] ?? `^${k}`}` : '' }); }
          poly.set(pts.slice(3)); dots.set(dd);
          res = pow(z, state.n);
          check = `|zⁿ| = |z|ⁿ = ${(abs(z) ** state.n).toFixed(3)}`;
        } else {
          const R = roots(z, state.n);
          poly.set(R.flatMap((q) => [...q, 0.002]), true);
          dots.set(R.map((q, k) => ({ p: [...q, 0.004], text: k === 0 ? 'k = 0' : '' })));
          const r = abs(z) ** (1 / state.n), ring2 = [];
          for (let i = 0; i <= 64; i++) ring2.push(...polar(r, 2 * Math.PI * i / 64), 0);
          guide.set(ring2);
          res = R[0];
          const sum = R.reduce((a, q) => add(a, q), [0, 0]);
          check = `Σ roots = ${abs(sum).toExponential(1)} ✓`;
        }
        vr.group.visible = op !== 'roots';
        if (res && op !== 'roots') vr.set([0, 0, 0.004], [...res, 0], abs(res));
        hud.set('z', fmt(z)); hud.set('zp', pol(z));
        hud.show('w', two); hud.show('wp', two);
        if (two) { hud.set('w', fmt(w)); hud.set('wp', pol(w)); }
        hud.set('r', res ? fmt(res) : '—'); hud.set('rp', res ? pol(res) : '—'); hud.set('chk', check, 'good');
      },
      theme() { graph.theme(); unitC.theme(); guide.theme(); poly.theme(); for (const a of arcs) a.theme(); for (const v of [vz, vw, vr]) v.theme(); dots.theme(); kz.theme(); kw.theme(); },
    };
  },
};
