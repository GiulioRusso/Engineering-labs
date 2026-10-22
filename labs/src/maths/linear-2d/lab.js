// Linear algebra in the plane: a 2×2 system as two lines meeting, the determinant as the area of the
// parallelogram the columns span, eigenvectors as the directions a matrix only stretches, and fitting a
// line to points by least squares.
import { createGraph2D, fnSegments, createDots } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import { det, solve2, eig2, fit } from './model.js';

const X = [-6, 6], Y = [-4.5, 4.5], fmt = (v) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(3)))) : '—');
const term = (c, v, first) => `${c < 0 ? (first ? '−' : ' − ') : first ? '' : ' + '}${Math.abs(c) === 1 ? '' : fmt(Math.abs(c))}${v}`;

export default {
  id: 'linear-2d', title: 'Linear algebra in the plane', size: 5, ortho: true, plain: true, cam: 'top', duration: 10,
  defaults: { a: 1, b: 1, e: 3, c: 1, d: -1, f: 1, m11: 2, m12: 1, m21: 1, m22: 2, spin: true, px1: -4, py1: -2.5, px2: -2, py2: -1, px3: 0, py3: 0.5, px4: 2, py4: 0.8, px5: 4, py5: 3 },
  cases: [
    { id: 'system', label: 'Two equations', set: {}, examples: [
      { id: 'parallel', label: 'Parallel: no solution', controls: ['c', 'd', 'f'], set: { c: 2, d: 2, f: 2 } },
      { id: 'same', label: 'Same line: infinitely many', controls: ['c', 'd', 'f'], set: { c: 2, d: 2, f: 6 } },
      { id: 'steep', label: 'Nearly parallel: sensitive', controls: ['d'], set: { c: 1, d: 0.9, f: 3.2 } },
    ] },
    { id: 'det', label: 'Determinant', set: { spin: false }, examples: [
      { id: 'shear', label: 'Shear: same area', controls: ['m12'], set: { m11: 1, m12: 1.5, m21: 0, m22: 1 } },
      { id: 'flip', label: 'Columns swapped: det < 0', controls: ['m11', 'm21'], set: { m11: 1, m12: 2, m21: 2, m22: 1 } },
      { id: 'zero', label: 'Columns in line: det = 0', controls: ['m12', 'm22'], set: { m11: 1, m12: 2, m21: 1, m22: 2 } },
    ] },
    { id: 'eigen', label: 'Eigenvectors', set: { spin: true }, examples: [
      { id: 'diag', label: 'Diagonal: the axes', controls: ['m11', 'm22'], set: { m11: 2, m12: 0, m21: 0, m22: 0.5 } },
      { id: 'rot', label: 'Rotation: none real', controls: ['m12', 'm21'], set: { m11: 0, m12: -1, m21: 1, m22: 0 } },
      { id: 'shear', label: 'Shear: only one', controls: ['m12'], set: { m11: 1, m12: 1, m21: 0, m22: 1 } },
    ] },
    { id: 'fit', label: 'Least squares', set: {}, examples: [
      { id: 'outlier', label: 'One outlier pulls the line', controls: ['py5'], set: { py5: -4 } },
      { id: 'perfect', label: 'On a line: no residuals', controls: ['py1'], set: { py1: -3, py2: -1.5, py3: 0, py4: 1.5, py5: 3 } },
    ] },
  ],
  controls: [
    { title: 'Equations', show: (s) => s.case === 'system', items: [
      { type: 'readout', label: 'Line 1', value: (s) => `${term(s.a, 'x', true)}${term(s.b, 'y')} = ${fmt(s.e)}` },
      { id: 'a', label: 'a', unit: '', min: -3, max: 3, step: 0.1 }, { id: 'b', label: 'b', unit: '', min: -3, max: 3, step: 0.1 }, { id: 'e', label: 'right side', unit: '', min: -6, max: 6, step: 0.1 },
      { type: 'readout', label: 'Line 2', value: (s) => `${term(s.c, 'x', true)}${term(s.d, 'y')} = ${fmt(s.f)}` },
      { id: 'c', label: 'c', unit: '', min: -3, max: 3, step: 0.1 }, { id: 'd', label: 'd', unit: '', min: -3, max: 3, step: 0.1 }, { id: 'f', label: 'right side', unit: '', min: -6, max: 6, step: 0.1 },
    ] },
    { title: 'Matrix', show: (s) => s.case === 'det' || s.case === 'eigen', items: [
      { id: 'm11', label: 'a₁₁', unit: '', min: -3, max: 3, step: 0.05 }, { id: 'm12', label: 'a₁₂', unit: '', min: -3, max: 3, step: 0.05 },
      { id: 'm21', label: 'a₂₁', unit: '', min: -3, max: 3, step: 0.05 }, { id: 'm22', label: 'a₂₂', unit: '', min: -3, max: 3, step: 0.05 },
      { id: 'spin', label: 'Sweep the test vector', type: 'check', show: (s) => s.case === 'eigen' },
    ] },
  ],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, handles, stage } = ctx;
    stage.controls.enableRotate = false;
    const graph = createGraph2D(stage, { x: X, y: Y });
    const l1 = createCurve(stage, { max: 1400, width: 3, color: '--c-B' }), l2 = createCurve(stage, { max: 1400, width: 3, color: '--c-I' }), sq = createCurve(stage, { max: 20, width: 1.6, color: '--c-ref', dashed: true });
    const par = createCurve(stage, { max: 20, width: 2.4, color: '--c-v' }), cols = createCurve(stage, { max: 20, width: 4, color: '--c-E' }), ell = createCurve(stage, { max: 400, width: 2, color: '--c-B' }), circ = createCurve(stage, { max: 400, width: 1.2, color: '--c-ref', dashed: true });
    const vec = createCurve(stage, { max: 8, width: 3, color: '--c-I' }), avec = createCurve(stage, { max: 8, width: 3, color: '--c-v' }), eigl = createCurve(stage, { max: 8, width: 1.4, color: '--c-north', dashed: true }), resid = createCurve(stage, { max: 20, width: 1.6, color: '--c-north' });
    const all = [l1, l2, sq, par, cols, ell, circ, vec, avec, eigl, resid], dots = createDots(scene, 6, { r: 0.08, color: '--c-E' });
    const k1 = createKnob(scene, '--accent', 0.11), k2 = createKnob(scene, '--accent', 0.11), pk = Array.from({ length: 5 }, () => createKnob(scene, '--c-B', 0.11)), knobs = [k1, k2, ...pk];
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    handles.add({ object: k1.group, axes: 'xy', hint: 'Drag column 1', get: () => k1.get(), set: ([x, y]) => { state.m11 = cl(x, -3, 3); state.m21 = cl(y, -3, 3); ctx.requestUpdate(); ctx.panelSync(); } });
    handles.add({ object: k2.group, axes: 'xy', hint: 'Drag column 2', get: () => k2.get(), set: ([x, y]) => { state.m12 = cl(x, -3, 3); state.m22 = cl(y, -3, 3); ctx.requestUpdate(); ctx.panelSync(); } });
    pk.forEach((k, i) => handles.add({ object: k.group, axes: 'xy', hint: 'Drag the point', get: () => k.get(), set: ([x, y]) => { state[`px${i + 1}`] = cl(x, -5.5, 5.5); state[`py${i + 1}`] = cl(y, -4.2, 4.2); ctx.requestUpdate(); } }));
    const arrow = (x, y) => { const L = Math.hypot(x, y) || 1, ux = x / L, uy = y / L, h = 0.22; return [0, 0, 0.01, x, y, 0.01, x, y, 0.01, x - h * (ux - 0.5 * uy), y - h * (uy + 0.5 * ux), 0.01, x, y, 0.01, x - h * (ux + 0.5 * uy), y - h * (uy - 0.5 * ux), 0.01]; };
    return {
      changed() { ctx.setDuration(state.case === 'eigen' ? 10 : 0); },
      update() {
        const c = state.case; for (const o of all) o.object.visible = false; for (const k of knobs) k.group.visible = false; const pts = [];
        const show = (o, s) => { o.segments(s); o.object.visible = true; };
        const { m11, m12, m21, m22 } = state, D = det(m11, m12, m21, m22);
        if (c === 'system') {
          const line = (p, q, r) => (Math.abs(q) > 1e-9 ? fnSegments((x) => (r - p * x) / q, X, Y) : Math.abs(p) > 1e-9 ? [r / p, Y[0], 0, r / p, Y[1], 0] : []);
          show(l1, line(state.a, state.b, state.e)); show(l2, line(state.c, state.d, state.f));
          const s = solve2(state.a, state.b, state.c, state.d, state.e, state.f), Dd = det(state.a, state.b, state.c, state.d);
          if (s) pts.push({ p: s, text: `(${fmt(s[0])}, ${fmt(s[1])})` });
          const same = !s && Math.abs(det(state.a, state.e, state.c, state.f)) < 1e-9 && Math.abs(det(state.b, state.e, state.d, state.f)) < 1e-9;
          hud.set('a', `det = ad − bc = ${fmt(Dd)}`); hud.set('b', s ? `one solution: x = ${fmt(s[0])}, y = ${fmt(s[1])}` : same ? 'the same line twice: infinitely many solutions' : 'parallel lines: no solution', s ? 'good' : 'bad');
          hud.set('c', s ? `Cramer: x = (e d − b f)/det, y = (a f − e c)/det${Math.abs(Dd) < 0.3 ? ' — small det: a tiny change moves the answer a lot' : ''}` : 'det = 0: the two equations are not independent');
        } else if (c === 'det') {
          show(sq, [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0]);
          show(par, [0, 0, 0.005, m11, m21, 0.005, m11, m21, 0.005, m11 + m12, m21 + m22, 0.005, m11 + m12, m21 + m22, 0.005, m12, m22, 0.005, m12, m22, 0.005, 0, 0, 0.005]);
          show(cols, [...arrow(m11, m21), ...arrow(m12, m22)]); k1.group.visible = k2.group.visible = true; k1.set([m11, m21, 0.02]); k2.set([m12, m22, 0.02]);
          pts.push({ p: [(m11 + m12) / 2, (m21 + m22) / 2], text: `area ${fmt(Math.abs(D))}` });
          hud.set('a', `det A = a₁₁a₂₂ − a₁₂a₂₁ = ${fmt(D)}`); hud.set('b', `the unit square (dashed) becomes the green parallelogram, area |det| = ${fmt(Math.abs(D))}`);
          hud.set('c', Math.abs(D) < 1e-6 ? 'det = 0: the plane is squashed onto a line — no inverse' : D < 0 ? 'negative: the orientation is flipped (like a mirror)' : 'positive: orientation kept', Math.abs(D) < 1e-6 ? 'bad' : '');
        } else if (c === 'eigen') {
          const R0 = 1.3; const ring = [], img = []; for (let i = 0; i < 120; i++) { const a = 2 * Math.PI * i / 120, b = 2 * Math.PI * (i + 1) / 120; ring.push(R0 * Math.cos(a), R0 * Math.sin(a), 0, R0 * Math.cos(b), R0 * Math.sin(b), 0); const p = [Math.cos(a), Math.sin(a)], q = [Math.cos(b), Math.sin(b)]; img.push(R0 * (m11 * p[0] + m12 * p[1]), R0 * (m21 * p[0] + m22 * p[1]), 0, R0 * (m11 * q[0] + m12 * q[1]), R0 * (m21 * q[0] + m22 * q[1]), 0); }
          show(circ, ring); show(ell, img);
          const th = state.spin ? 2 * Math.PI * (time.t % 10) / 10 : 0.6, v = [R0 * Math.cos(th), R0 * Math.sin(th)], Av = [m11 * v[0] + m12 * v[1], m21 * v[0] + m22 * v[1]];
          show(vec, arrow(...v)); show(avec, arrow(...Av));
          const E = eig2(m11, m12, m21, m22), cross = v[0] * Av[1] - v[1] * Av[0], aligned = Math.abs(cross) < 0.05 * Math.hypot(...v) * Math.hypot(...Av);
          if (!E.complex) { const seg = []; for (const e of E.vectors) seg.push(-5 * e[0], -5 * e[1], 0, 5 * e[0], 5 * e[1], 0); show(eigl, seg); }
          hud.set('a', E.complex ? `no real eigenvectors: eigenvalues ${fmt(E.re)} ± ${fmt(E.im)}j — A turns every direction` : `λ₁ = ${fmt(E.values[0])} along (${fmt(E.vectors[0][0])}, ${fmt(E.vectors[0][1])}),  λ₂ = ${fmt(E.values[1])} along (${fmt(E.vectors[1][0])}, ${fmt(E.vectors[1][1])})`);
          hud.set('b', aligned ? 'now Av lies along v: an eigen-direction ✓' : 'orange v and green Av point different ways', aligned ? 'good' : '');
          hud.set('c', `trace = λ₁ + λ₂ = ${fmt(m11 + m22)},  det = λ₁λ₂ = ${fmt(D)}; the circle maps to the blue ellipse`);
        } else {
          const P = [1, 2, 3, 4, 5].map((i) => [state[`px${i}`], state[`py${i}`]]), F = fit(P);
          show(l1, fnSegments((x) => F.m * x + F.q, X, Y)); pk.forEach((k, i) => { k.group.visible = true; k.set([...P[i], 0.02]); });
          const r = []; for (const [x, y] of P) r.push(x, y, 0.005, x, F.m * x + F.q, 0.005); show(resid, r);
          hud.set('a', `best line y = ${fmt(F.m)}x ${F.q < 0 ? '−' : '+'} ${fmt(Math.abs(F.q))}`); hud.set('b', `sum of squared residuals (red) = ${fmt(F.sse)} — the smallest any line can get`); hud.set('c', `R² = ${fmt(F.r2)}: the share of the spread in y the line explains`);
        }
        dots.set(pts);
      },
      theme() { graph.theme(); for (const o of all) o.theme(); dots.theme(); for (const k of knobs) k.theme(); },
    };
  },
};
