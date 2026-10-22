// Integrals and optimisation in two variables: the volume under a surface built from boxes (3D),
// maximising a function on a circle with Lagrange multipliers, and the work done along a path in a field.
import * as THREE from 'three';
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createSurface } from '../../lib/viz/surface.js';
import { cssVar } from '../../lib/ui/theme.js';
import { contours } from '../../signal-theory/dipole/model.js';
import { SURFS, riemann2, OBJ, constrained, FIELDS, PATHS, work, A, B } from './model.js';

const fmt = (v, d = 4) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQL = [-4.3, -2.35, 4.4, 4.9], RIGHT = [0.6, -2.35, 3.95, 4.9], L = 1.5;

export default {
  id: 'multi-integrals', title: 'Integrals and constraints', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [4.2, -4.6, 3.6] } },
  camOf: (s) => (s.case === 'double' ? 'iso' : 'top'),
  defaults: { surf: 'bowl', n: 6, obj: 'sum', r: 1.5, field: 'grad', path: 'straight' },
  cases: [
    { id: 'double', label: 'Double integral', set: {}, examples: [
      { id: 'fine', label: '30 × 30 boxes', controls: ['n'], set: { n: 30 } },
      { id: 'bump', label: 'A bump', controls: ['surf'], set: { surf: 'bump', n: 12 } },
    ] },
    { id: 'lagrange', label: 'Lagrange multipliers', set: {}, examples: [
      { id: 'prod', label: 'Maximise xy on a circle', controls: ['obj'], set: { obj: 'prod' } },
      { id: 'tilt', label: '2x + y: the gradient decides', controls: ['obj'], set: { obj: 'tilt' } },
    ] },
    { id: 'line', label: 'Line integrals', set: {}, examples: [
      { id: 'curved', label: 'Another path: same work', controls: ['path'], set: { path: 'arc' } },
      { id: 'vortex', label: 'Vortex around a loop', controls: ['field'], set: { field: 'vortex', path: 'circle' } },
      { id: 'closed', label: 'Conservative, closed: zero', controls: ['field'], set: { field: 'grad', path: 'circle' } },
    ] },
  ],
  controls: [
    { title: 'Volume', show: (s) => s.case === 'double', items: [{ id: 'surf', label: 'f(x, y)', type: 'select', options: Object.entries(SURFS).map(([k, v]) => [k, v.label]) }, { id: 'n', label: 'Boxes per side', unit: '', min: 1, max: 30, step: 1 }] },
    { title: 'Problem', show: (s) => s.case === 'lagrange', items: [{ id: 'obj', label: 'Maximise f', type: 'select', options: Object.entries(OBJ).map(([k, v]) => [k, v.label]) }, { id: 'r', label: 'Circle radius', unit: '', min: 0.5, max: 2, step: 0.05 }] },
    { title: 'Path', show: (s) => s.case === 'line', items: [{ id: 'field', label: 'Field', type: 'select', options: Object.entries(FIELDS).map(([k, v]) => [k, v.label]) }, { id: 'path', label: 'Path', type: 'segmented', options: Object.entries(PATHS).map(([k, v]) => [k, v.label.split(' ')[0]]) }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    const sql = createChart(ctx, { box: SQL }), right = createChart(ctx, { box: RIGHT }), charts = [sql, right];
    const surf = createSurface(scene, { nx: 60, ny: 60, x: [-L, L], y: [-L, L], opacity: 0.35 }), boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: cssVar('--c-B') }), 900), edges = createCurve(stage, { max: 30, width: 1.4, color: '--ink-dim' });
    boxes.frustumCulled = false; scene.add(boxes);
    const lines = createCurve(stage, { max: 9000, width: 1, color: '--line' }), arrows = createCurve(stage, { max: 3000, width: 1.2, color: '--c-ref' }), hot = createCurve(stage, { max: 30, width: 3, color: '--c-B' }), hot2 = createCurve(stage, { max: 30, width: 3, color: '--c-I' }), all = [lines, arrows, hot, hot2];
    const m4 = new THREE.Matrix4(); let key = '';
    const arrow = (ch, x, y, vx, vy, s = 0.35) => { const L2 = Math.hypot(vx, vy) || 1, ux = vx / L2, uy = vy / L2, ex = x + s * ux, ey = y + s * uy, h = s * 0.3; return [ch.mx(x), ch.my(y), 0.004, ch.mx(ex), ch.my(ey), 0.004, ch.mx(ex), ch.my(ey), 0.004, ch.mx(ex - h * (ux - 0.5 * uy)), ch.my(ey - h * (uy + 0.5 * ux)), 0.004, ch.mx(ex), ch.my(ey), 0.004, ch.mx(ex - h * (ux + 0.5 * uy)), ch.my(ey - h * (uy - 0.5 * ux)), 0.004]; };
    return {
      changed() {
        const c = state.case, v3 = c === 'double'; stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        for (const k of charts) k.show(!v3); surf.mesh.visible = boxes.visible = edges.object.visible = v3; for (const o of all) o.object.visible = !v3; key = '';
        ctx.setClock(v3 ? 0 : 8);
      },
      update() {
        const c = state.case, u = (time.t % 8) / 8;
        if (c === 'double') {
          const S = SURFS[state.surf], sc = 0.5; if (key !== state.surf) { key = state.surf; surf.set((x, y) => S.f(x, y) * sc, { map: 'viridis' }); }
          const R = riemann2(S.f, -L, L, -L, L, state.n); boxes.count = R.boxes.length;
          R.boxes.forEach(([x, y, h], i) => { m4.makeScale(R.dx * 0.98, R.dy * 0.98, Math.max(1e-3, h * sc)); m4.setPosition(x, y, h * sc / 2); boxes.setMatrixAt(i, m4); }); boxes.instanceMatrix.needsUpdate = true;
          edges.segments([-L, -L, 0, L, -L, 0, L, -L, 0, L, L, 0, L, L, 0, -L, L, 0, -L, L, 0, -L, -L, 0]);
          let ex = S.exact ? S.exact(-L, L, -L, L) : null; if (ex == null) ex = riemann2(S.f, -L, L, -L, L, 300).V;
          hud.set('a', `∬ f dA over [−1.5, 1.5]²: ${state.n} × ${state.n} boxes give ${fmt(R.V)}`); hud.set('b', `exact ${fmt(ex)}: error ${fmt(Math.abs(R.V - ex), 2)} (${fmt(100 * Math.abs(R.V - ex) / ex, 2)} %)`, Math.abs(R.V - ex) / ex < 0.01 ? 'good' : '');
          hud.set('c', 'each box: base ΔxΔy, height f at its centre; more boxes → the exact volume');
          const ns = Array.from({ length: 30 }, (_, i) => i + 1); plots.aux.draw({ xlim: [1, 30], cursor: state.n, series: [{ x: ns, y: ns.map((n) => Math.abs(riemann2(S.f, -L, L, -L, L, n).V - ex)), color: '--c-B', label: 'error vs boxes per side' }] });
        } else if (c === 'lagrange') {
          const O = OBJ[state.obj], r = state.r, W = 2.3, ar = SQL[3] / SQL[2]; sql.range([-W, W], [-W * ar, W * ar]); sql.titles('x', `level curves of f = ${O.label} and the circle x² + y² = ${fmt(r * r, 3)}`);
          const n = 90, v = new Float64Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) v[j * n + i] = O.f(-W + 2 * W * i / (n - 1), -W * ar + 2 * W * ar * j / (n - 1));
          let lo = Infinity, hi = -Infinity; for (const q of v) { lo = Math.min(lo, q); hi = Math.max(hi, q); }
          const lv = Array.from({ length: 15 }, (_, i) => lo + (hi - lo) * (i + 1) / 16), seg = contours(v, n, n, [-W, W], [-W * ar, W * ar], lv), out = []; for (let q = 0; q < seg.length; q += 4) out.push(sql.mx(seg[q]), sql.my(seg[q + 1]), 0.002, sql.mx(seg[q + 2]), sql.my(seg[q + 3]), 0.002); lines.segments(out); lines.object.visible = true;
          const C = Array.from({ length: 181 }, (_, i) => [r * Math.cos(2 * Math.PI * i / 180), r * Math.sin(2 * Math.PI * i / 180)]); sql.line('c', C.map((p) => p[0]), C.map((p) => p[1]), { color: '--c-v', width: 2.4 });
          const t = 2 * Math.PI * u, P = [r * Math.cos(t), r * Math.sin(t)], gf = O.g(...P), gg = [2 * P[0], 2 * P[1]], cr = constrained(O.f, r);
          hot.segments(arrow(sql, P[0], P[1], gf[0], gf[1], 0.6)); hot.object.visible = true; hot2.segments(arrow(sql, P[0], P[1], gg[0], gg[1], 0.6)); hot2.object.visible = true;
          sql.dots('p', [P[0]], [P[1]], { color: '--accent', size: 11 }); sql.dots('m', [cr.max[0]], [cr.max[1]], { color: '--c-north', size: 12 });
          const ths = Array.from({ length: 361 }, (_, i) => i); right.range([0, 360], [Math.min(...ths.map((d) => O.f(r * Math.cos(d * Math.PI / 180), r * Math.sin(d * Math.PI / 180)))) - 0.2, cr.max[2] + 0.3]); right.titles('angle on the circle (°)', 'f(x, y): along the circle'); right.line('f', ths, ths.map((d) => O.f(r * Math.cos(d * Math.PI / 180), r * Math.sin(d * Math.PI / 180))), { color: '--c-B' }); right.dots('now', [(t * 180 / Math.PI) % 360], [O.f(...P)], { color: '--accent', size: 11 });
          const ang = Math.abs(Math.atan2(gf[0] * gg[1] - gf[1] * gg[0], gf[0] * gg[0] + gf[1] * gg[1])) * 180 / Math.PI;
          hud.set('a', `max f = ${fmt(cr.max[2])} at (${fmt(cr.max[0], 3)}, ${fmt(cr.max[1], 3)}) (red dot)`); hud.set('b', `∇f (blue) and ∇g (orange) now at ${fmt(Math.min(ang, 180 - ang), 3)}° — at the optimum they are parallel`, Math.min(ang, 180 - ang) < 3 ? 'good' : '');
          hud.set('c', '∇f = λ∇g: moving along the circle cannot increase f any more');
          plots.aux.draw({ xlim: [0, 360], series: [{ x: ths, y: ths.map((d) => O.f(r * Math.cos(d * Math.PI / 180), r * Math.sin(d * Math.PI / 180))), color: '--c-B', label: 'f on the circle vs angle' }] });
        } else {
          const Fd = FIELDS[state.field], Pth = PATHS[state.path], W = 3, ar = SQL[3] / SQL[2]; sql.range([-W, W], [-W * ar, W * ar]); sql.titles('x', Fd.label);
          const ar2 = []; for (let i = -6; i <= 6; i++) for (let j = -8; j <= 8; j++) { const x = i * W / 6.5, y = j * W * ar / 8.5, f = Fd.F(x, y), m = Math.hypot(...f); if (m > 1e-6) ar2.push(...arrow(sql, x, y, f[0], f[1], Math.min(0.35, 0.12 + 0.08 * m))); } arrows.segments(ar2); arrows.object.visible = true;
          const ps = Array.from({ length: 201 }, (_, i) => Pth.r(i / 200)); sql.line('path', ps.map((p) => p[0]), ps.map((p) => p[1]), { color: '--c-v', width: 2.4 });
          const p = Pth.r(u), f = Fd.F(...p); hot.segments(arrow(sql, p[0], p[1], f[0], f[1], 0.6)); hot.object.visible = true; hot2.object.visible = false; sql.dots('p', [p[0]], [p[1]], { color: '--accent', size: 12 });
          if (state.path !== 'circle') sql.dots('ab', [A[0], B[0]], [A[1], B[1]], { color: '--c-north', size: 10 }); else sql.dots('ab', [], [], { color: '--c-north' });
          const Wk = work(Fd.F, Pth.r), ts = Wk.map((_, i) => i / (Wk.length - 1)), k = Math.round(u * (Wk.length - 1));
          right.range([0, 1], [Math.min(0, ...Wk) - 0.5, Math.max(0, ...Wk) + 0.5]); right.titles('fraction of the path', 'work so far ∫ F · dr'); right.line('w', ts, Wk, { color: '--c-B' }); right.dots('now', [u], [Wk[k]], { color: '--accent', size: 11 });
          hud.set('a', `total work ∮ F · dr = ${fmt(Wk.at(-1))}`); hud.set('b', Fd.pot ? `conservative: work = φ(end) − φ(start)${state.path === 'circle' ? ' = 0 around a loop' : ` = ${fmt(Fd.pot(...B) - Fd.pot(...A))} for any path from A to B`}` : `rotational: the work depends on the path; around the circle it is 2πr² = ${fmt(2 * Math.PI * 1.6 ** 2)}`, Fd.pot ? 'good' : '');
          hud.set('c', 'at each step multiply the push along the path by the step length, and add');
          plots.aux.draw({ xlim: [0, 1], series: [{ x: ts, y: Wk, color: '--c-B', label: 'running work' }] });
        }
      },
      theme() { for (const k of charts) k.theme(); for (const o of all) o.theme(); edges.theme(); boxes.material.color.set(cssVar('--c-B')); key = ''; },
    };
  },
};
