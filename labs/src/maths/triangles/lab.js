// Triangles and curves: SOH-CAH-TOA on a right triangle, solving any triangle with the laws of sines and
// cosines (draggable vertices, circumcircle, area), Lissajous figures and polar curves traced point by point.
import { createGraph2D, createDots } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import { solve, lissajous, POLAR } from './model.js';

const X = [-6, 6], Y = [-4.5, 4.5], deg = 180 / Math.PI, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');

export default {
  id: 'triangles', title: 'Triangles and curves', size: 5, ortho: true, plain: true, cam: 'top', duration: 8,
  defaults: { tx: 3, ty: 2.2, ax: -3, ay: -2, bx: 3, by: -2, cx: 0.5, cy: 2.5, la: 1, lb: 2, ld: 90, lam: 3, pc: 'rose', pk: 3, trace: true },
  cases: [
    { id: 'right', label: 'Right triangle', set: {}, examples: [
      { id: 'd30', label: '30°: opposite = half the hypotenuse', controls: ['tx', 'ty'], set: { tx: 3.464, ty: 2 } },
      { id: 'd45', label: '45°: opposite = adjacent', controls: ['tx', 'ty'], set: { tx: 3, ty: 3 } },
      { id: 'steep', label: 'Steep: tan > 1', controls: ['tx', 'ty'], set: { tx: 1.2, ty: 3.5 } },
    ] },
    { id: 'solve', label: 'Any triangle', set: {}, examples: [
      { id: 'equi', label: 'Equilateral: all 60°', controls: ['cx', 'cy'], set: { ax: -2.5, ay: -1.6, bx: 2.5, by: -1.6, cx: 0, cy: 2.73 } },
      { id: 'obtuse', label: 'Obtuse: centre outside', controls: ['cx', 'cy'], set: { cx: -1, cy: 0.6 } },
      { id: 'flat', label: 'Almost flat: area → 0', controls: ['cx', 'cy'], set: { cx: 0, cy: -1.8 } },
    ] },
    { id: 'lissajous', label: 'Parametric curves', set: {}, examples: [
      { id: 'circle', label: '1 : 1 at 90°: a circle', controls: ['ld'], set: { la: 1, lb: 1, ld: 90 } },
      { id: 'line', label: '1 : 1 at 0°: a line', controls: ['ld'], set: { la: 1, lb: 1, ld: 0 } },
      { id: 'r32', label: '3 : 2', controls: ['la', 'lb'], set: { la: 3, lb: 2, ld: 90 } },
    ] },
    { id: 'polar', label: 'Polar curves', set: {}, examples: [
      { id: 'rose4', label: 'Rose k = 2: four petals', controls: ['pk'], set: { pc: 'rose', pk: 2 } },
      { id: 'cardioid', label: 'Cardioid', controls: ['pc'], set: { pc: 'cardioid' } },
      { id: 'loop', label: 'Limaçon with an inner loop', controls: ['pk'], set: { pc: 'limacon', pk: 0.5 } },
      { id: 'spiral', label: 'Archimedes spiral', controls: ['pc'], set: { pc: 'spiral' } },
    ] },
  ],
  controls: [
    { title: 'Triangle', show: (s) => s.case === 'right', items: [{ id: 'tx', label: 'Adjacent (x)', unit: '', min: 0.3, max: 5, step: 0.01 }, { id: 'ty', label: 'Opposite (y)', unit: '', min: 0.3, max: 4, step: 0.01 }] },
    { title: 'Vertices', show: (s) => s.case === 'solve', items: [
      { id: 'cx', label: 'C x', unit: '', min: -5, max: 5, step: 0.01 }, { id: 'cy', label: 'C y', unit: '', min: -4, max: 4, step: 0.01 },
    ] },
    { title: 'Curve', show: (s) => s.case === 'lissajous', items: [
      { id: 'la', label: 'x frequency a', unit: '', min: 1, max: 6, step: 1 }, { id: 'lb', label: 'y frequency b', unit: '', min: 1, max: 6, step: 1 }, { id: 'ld', label: 'Phase δ', unit: '°', min: 0, max: 180, step: 1 },
    ] },
    { title: 'Curve', show: (s) => s.case === 'polar', items: [
      { id: 'pc', label: 'Curve', type: 'select', options: Object.entries(POLAR).map(([k, v]) => [k, v.label]) },
      { id: 'pk', label: 'k (or b)', unit: '', min: 0.25, max: 7, step: 0.25, show: (s) => s.pc === 'rose' || s.pc === 'limacon' },
    ] },
  ],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, handles, stage } = ctx;
    stage.controls.enableRotate = false;
    const graph = createGraph2D(stage, { x: X, y: Y });
    const tri = createCurve(stage, { max: 20, width: 3, color: '--c-B' }), opp = createCurve(stage, { max: 4, width: 4, color: '--c-I' }), adj = createCurve(stage, { max: 4, width: 4, color: '--c-v' });
    const arcs = createCurve(stage, { max: 400, width: 1.6, color: '--c-E' }), circ = createCurve(stage, { max: 400, width: 1.2, color: '--c-ref', dashed: true }), path = createCurve(stage, { max: 3000, width: 2.6, color: '--c-B' }), ray = createCurve(stage, { max: 4, width: 1.6, color: '--accent' });
    const dots = createDots(scene, 8, { r: 0.07, color: '--c-E' }), all = [tri, opp, adj, arcs, circ, path, ray];
    const kA = createKnob(scene, '--accent', 0.11), kB = createKnob(scene, '--accent', 0.11), kC = createKnob(scene, '--accent', 0.11), knobs = [kA, kB, kC];
    const labels = []; for (let i = 0; i < 8; i++) { const l = ctx.label('', 'tick'); scene.add(l); labels.push(l); }
    const put = (i, text, x, y) => { labels[i].element.textContent = text; labels[i].position.set(x, y, 0.02); labels[i].visible = true; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const drag = (k, fn) => handles.add({ object: k.group, axes: 'xy', hint: 'Drag me', get: () => k.get(), set: ([x, y]) => { fn(clamp(x, -5.5, 5.5), clamp(y, -4.2, 4.2)); ctx.requestUpdate(); ctx.panelSync(); } });
    drag(kA, (x, y) => { if (state.case === 'right') { state.tx = clamp(x, 0.3, 5); state.ty = clamp(y, 0.3, 4); } else { state.ax = x; state.ay = y; } });
    drag(kB, (x, y) => { state.bx = x; state.by = y; }); drag(kC, (x, y) => { state.cx = x; state.cy = y; });
    const arc = (c, r, a0, a1) => { const s = []; for (let i = 0; i < 24; i++) { const u = a0 + (a1 - a0) * i / 24, v = a0 + (a1 - a0) * (i + 1) / 24; s.push(c[0] + r * Math.cos(u), c[1] + r * Math.sin(u), 0.01, c[0] + r * Math.cos(v), c[1] + r * Math.sin(v), 0.01); } return s; };
    return {
      changed() { const c = state.case; ctx.setDuration(c === 'lissajous' || c === 'polar' ? 8 : 0); },
      update() {
        const c = state.case, u = (time.t % 8) / 8; for (const o of all) o.object.visible = false; for (const k of knobs) k.group.visible = false; labels.forEach((l) => { l.visible = false; }); const pts = [];
        const show = (o, s) => { o.segments(s); o.object.visible = true; };
        if (c === 'right') {
          const O = [-2.5, -2], P = [O[0] + state.tx, O[1]], Q = [P[0], O[1] + state.ty], h = Math.hypot(state.tx, state.ty), th = Math.atan2(state.ty, state.tx);
          show(tri, [O[0], O[1], 0, Q[0], Q[1], 0]); show(adj, [O[0], O[1], 0.005, P[0], P[1], 0.005]); show(opp, [P[0], P[1], 0.005, Q[0], Q[1], 0.005]);
          show(arcs, [...arc(O, 0.7, 0, th), P[0] - 0.3, P[1], 0.01, P[0] - 0.3, P[1] + 0.3, 0.01, P[0] - 0.3, P[1] + 0.3, 0.01, P[0], P[1] + 0.3, 0.01]);
          kA.group.visible = true; kA.set([Q[0], Q[1], 0.02]);
          put(0, `hyp ${fmt(h)}`, (O[0] + Q[0]) / 2 - 0.4, (O[1] + Q[1]) / 2 + 0.3); put(1, `adj ${fmt(state.tx)}`, (O[0] + P[0]) / 2, O[1] - 0.35); put(2, `opp ${fmt(state.ty)}`, P[0] + 0.6, (P[1] + Q[1]) / 2); put(3, `θ = ${fmt(th * deg)}°`, O[0] + 1.2, O[1] + 0.3);
          hud.set('a', `sin θ = opp/hyp = ${fmt(state.ty / h)}   cos θ = adj/hyp = ${fmt(state.tx / h)}   tan θ = opp/adj = ${fmt(state.ty / state.tx)}`);
          hud.set('b', `opp² + adj² = ${fmt(state.ty ** 2 + state.tx ** 2)} = hyp² (Pythagoras)`); hud.set('c', 'scale the triangle: the ratios do not change — they depend only on θ');
        } else if (c === 'solve') {
          const A = [state.ax, state.ay], B = [state.bx, state.by], C = [state.cx, state.cy], S = solve(A, B, C);
          show(tri, [A[0], A[1], 0, B[0], B[1], 0, B[0], B[1], 0, C[0], C[1], 0, C[0], C[1], 0, A[0], A[1], 0]);
          const dir = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]), ang = (P, Q1, Q2) => { let a0 = dir(P, Q1), a1 = dir(P, Q2); let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return arc(P, 0.45, a0, a0 + d); };
          show(arcs, [...ang(A, B, C), ...ang(B, C, A), ...ang(C, A, B)]);
          // circumcircle
          const D = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1])), sq = (p) => p[0] ** 2 + p[1] ** 2;
          if (Math.abs(D) > 1e-6) { const ux = (sq(A) * (B[1] - C[1]) + sq(B) * (C[1] - A[1]) + sq(C) * (A[1] - B[1])) / D, uy = (sq(A) * (C[0] - B[0]) + sq(B) * (A[0] - C[0]) + sq(C) * (B[0] - A[0])) / D; show(circ, arc([ux, uy], S.R, 0, 2 * Math.PI).concat(arc([ux, uy], S.R, 0, 0))); pts.push({ p: [ux, uy], text: 'O' }); }
          knobs.forEach((k, i) => { k.group.visible = true; k.set([...[A, B, C][i], 0.02]); });
          put(0, `A ${fmt(S.A * deg)}°`, A[0] - 0.5, A[1] - 0.3); put(1, `B ${fmt(S.B * deg)}°`, B[0] + 0.5, B[1] - 0.3); put(2, `C ${fmt(S.C * deg)}°`, C[0], C[1] + 0.4);
          put(3, `a ${fmt(S.a)}`, (B[0] + C[0]) / 2 + 0.3, (B[1] + C[1]) / 2); put(4, `b ${fmt(S.b)}`, (A[0] + C[0]) / 2 - 0.3, (A[1] + C[1]) / 2); put(5, `c ${fmt(S.c)}`, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 0.3);
          hud.set('a', `a/sin A = b/sin B = c/sin C = ${fmt(S.a / Math.sin(S.A))} = 2R (sines)`); hud.set('b', `a² = b² + c² − 2bc cos A: ${fmt(S.a ** 2)} = ${fmt(S.b ** 2 + S.c ** 2 - 2 * S.b * S.c * Math.cos(S.A))} (cosines)`);
          hud.set('c', `angles sum to ${fmt((S.A + S.B + S.C) * deg)}°; area ½ab sin C = ${fmt(S.area)}`);
        } else if (c === 'lissajous') {
          const n = 1200, T = 2 * Math.PI, d = state.ld / deg, upto = state.trace ? Math.max(2, Math.round(n * u)) : n, s = [];
          for (let i = 0; i < upto; i++) { const a = lissajous(3, state.la, 3, state.lb, d, T * i / n), b = lissajous(3, state.la, 3, state.lb, d, T * (i + 1) / n); s.push(a[0], a[1], 0.005, b[0], b[1], 0.005); } show(path, s);
          const p = lissajous(3, state.la, 3, state.lb, d, T * u); pts.push({ p, text: '' }); show(ray, [p[0], -4.5, 0.01, p[0], p[1], 0.01, -6, p[1], 0.01, p[0], p[1], 0.01]);
          hud.set('a', `x = 3 sin(${state.la}t + ${state.ld}°),  y = 3 sin(${state.lb}t)`); hud.set('b', 'two independent oscillations, one across and one up: the point draws their combination');
          hud.set('c', `frequency ratio ${state.la}:${state.lb} → ${state.lb} lobes across, ${state.la} up the side`);
        } else {
          const P = POLAR[state.pc], k = state.pk, turns = P.turns(k), n = 1500, s = [], upto = Math.max(2, Math.round(n * u)), sc = state.pc === 'spiral' ? 0.7 : state.pc === 'rose' ? 3.5 : 2;
          for (let i = 0; i < upto; i++) { const t1 = turns * 2 * Math.PI * i / n, t2 = turns * 2 * Math.PI * (i + 1) / n, r1 = sc * P.r(t1, k), r2 = sc * P.r(t2, k); s.push(r1 * Math.cos(t1), r1 * Math.sin(t1), 0.005, r2 * Math.cos(t2), r2 * Math.sin(t2), 0.005); } show(path, s);
          const th = turns * 2 * Math.PI * u, r = sc * P.r(th, k); show(ray, [0, 0, 0.01, r * Math.cos(th), r * Math.sin(th), 0.01]); pts.push({ p: [r * Math.cos(th), r * Math.sin(th)], text: `θ = ${fmt((th * deg) % 360)}°, r = ${fmt(r / sc)}` });
          hud.set('a', `${P.label}: for each angle θ, go out a distance r`); hud.set('b', 'negative r means: go the same distance the opposite way');
          hud.set('c', state.pc === 'rose' ? `k = ${k}: ${Number.isInteger(k) ? (k % 2 ? `${k}` : `${2 * k}`) : 'many'} petals` : 'x = r cos θ, y = r sin θ');
        }
        dots.set(pts);
      },
      theme() { graph.theme(); for (const o of all) o.theme(); dots.theme(); for (const k of knobs) k.theme(); },
    };
  },
};
