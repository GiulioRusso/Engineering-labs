// Vectors and vector fields: dot and cross products, a gravitational field, divergence and curl.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { createKnob } from '../../lib/viz/knob.js';
import { createArrows } from '../../lib/viz/arrows.js';
import { createGraph2D } from '../../lib/viz/graph2d.js';
import { logNorm } from '../../lib/viz/colormap.js';
import { si } from '../../lib/ui/format.js';
import { dot, cross, norm, gravity, FIELDS, measure } from './model.js';


export default {
  id: 'vector-fields', title: 'Vectors and vector fields', size: 2.4,
  cameras: { front: { pos: [0, -6, 0.3] }, side: { pos: [6, 0, 0.3] }, top: { pos: [0, -0.01, 6.5] }, iso: { pos: [3.5, -4.2, 3] } },
  duration: 2.5,
  defaults: { kind: 'products', ax: 1.6, ay: 0.3, az: 0.2, bx: 0.6, by: 1.4, bz: 0.4, m1: 4e10, m2: 2e10, x1: -0.9, y1: 0.2, x2: 1, y2: -0.3, px: 0.1, py: 0.9, field: 'vortex', qx: 0.8, qy: 0.4, tracers: true },
  cases: [
    { id: 'dot', label: 'Dot product', set: { kind: 'products', ax: 1.6, ay: 0.3, az: 0, bx: 0.6, by: 1.4, bz: 0 }, examples: [
      { id: 'perp', label: 'At 90°: a·b = 0', set: { ax: 1.5, ay: 0, bx: 0, by: 1.5 } },
      { id: 'same', label: 'Same direction: |a||b|', set: { ax: 1.5, ay: 0, bx: 1, by: 0 } },
      { id: 'obtuse', label: 'Obtuse angle: a·b < 0', set: { ax: 1.5, ay: 0, bx: -0.8, by: 1.2 } },
      { id: 'opposite', label: 'Opposite: −|a||b|', set: { ax: 1.5, ay: 0, bx: -1, by: 0 } },
    ] },
    { id: 'cross', label: 'Cross product', set: { kind: 'products', ax: 1.5, ay: 0, az: 0, bx: 0.6, by: 1.4, bz: 0 }, examples: [
      { id: 'axes', label: 'x̂ × ŷ = ẑ', set: { ax: 1, bx: 0, by: 1 } },
      { id: 'perp', label: 'At 90°: largest', set: { bx: 0, by: 1.5 } },
      { id: 'parallel', label: 'Parallel: a × b = 0', set: { bx: 1, by: 0 } },
      { id: 'swap', label: 'Swap a and b: it flips', set: { ax: 0.6, ay: 1.4, bx: 1.5, by: 0 } },
    ] },
    { id: 'gravity', label: 'Gravity field', cam: 'top', set: { kind: 'gravity' }, examples: [
      { id: 'equal', label: 'Equal masses: g = 0 midway', set: { m1: 3e10, m2: 3e10, x1: -0.9, y1: 0, x2: 0.9, y2: 0, px: 0, py: 0 } },
      { id: 'unequal', label: 'Unequal: null point moves', set: { m1: 1e11, m2: 1e10, x1: -0.9, y1: 0, x2: 0.9, y2: 0, px: 0.5, py: 0 } },
      { id: 'far', label: 'Far away: like one mass', set: { px: 2.1, py: 1.7 } },
    ] },
    { id: 'div', label: 'Divergence', cam: 'top', set: { kind: 'divcurl', field: 'source' }, examples: [
      { id: 'sink', label: 'A sink: div < 0', set: { field: 'sink' } },
      { id: 'vortex', label: 'A vortex: div = 0', set: { field: 'vortex' } },
      { id: 'bump', label: 'Div changes sign', set: { field: 'gauss', qx: 1.2, qy: 0 } },
    ] },
    { id: 'curl', label: 'Curl', cam: 'top', set: { kind: 'divcurl', field: 'vortex' }, examples: [
      { id: 'source', label: 'A source: curl = 0', set: { field: 'source' } },
      { id: 'shear', label: 'Shear: straight but curl ≠ 0', set: { field: 'shear', qx: 0, qy: 0.4 } },
      { id: 'spiral', label: 'Spiral: both at once', set: { field: 'swirl' } },
    ] },
  ],
  controls: [
    { title: 'Vectors', show: (s) => s.kind === 'products', items: [
      ...['ax', 'ay', 'az', 'bx', 'by', 'bz'].map((id) => ({ id, label: `${id[0]} ${id[1]}`, unit: '', min: -2, max: 2, step: 0.01 })),
    ] },
    { title: 'Masses', show: (s) => s.kind === 'gravity', items: [
      { id: 'm1', label: 'Mass 1', unit: 'kg', min: 1e9, max: 1e11, log: true },
      { id: 'm2', label: 'Mass 2', unit: 'kg', min: 1e9, max: 1e11, log: true },
    ] },
    { title: 'Field', show: (s) => s.kind === 'divcurl', items: [
      { id: 'field', label: 'Field F', type: 'select', options: Object.entries(FIELDS).map(([k, v]) => [k, v.label]) },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'tracers', label: 'Tracers', type: 'check', show: (s) => s.kind === 'divcurl' }] }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, stage } = ctx;
    const va = createVector(scene, '--c-B', 'a', { radius: 0.018 }), vb = createVector(scene, '--c-E', 'b', { radius: 0.018 }), vc = createVector(scene, '--c-F', 'a × b', { radius: 0.02 });
    const ka = createKnob(scene, '--c-B', 0.06), kb = createKnob(scene, '--c-E', 0.06);
    const paraMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    const para = new THREE.Mesh(new THREE.BufferGeometry(), paraMat); scene.add(para);
    para.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
    const proj = createCurve(stage, { max: 2, width: 1.6, color: '--c-ref', dashed: true }), projSeg = createCurve(stage, { max: 1, width: 4, color: '--c-v' });
    const plane = createGraph2D(stage, { x: [-2.4, 2.4], y: [-2, 2], step: 0.5, unit: 'm' });
    const arrows = createArrows(stage, 900);
    const massMeshes = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ roughness: 0.5 })); scene.add(m); return m; });
    const mk = [createKnob(scene, '--c-ref', 0.05), createKnob(scene, '--c-ref', 0.05)];
    const probe = createKnob(scene, '--accent', 0.05), gv = createVector(scene, '--c-F', 'g', { radius: 0.015 });
    const ring = createCurve(stage, { max: 64, width: 2.2, color: '--accent' });
    const N = 160, tracer = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 4, sizeAttenuation: false }));
    tracer.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); tracer.frustumCulled = false; scene.add(tracer);
    const seed = []; for (let i = 0; i < N; i++) { const r = 0.25 * Math.sqrt((i + 0.5) / N), a = i * 2.39996; seed.push([r * Math.cos(a), r * Math.sin(a)]); }
    const cl = (v, m) => Math.max(-m, Math.min(m, v));
    ctx.handles.add({ object: ka.group, axes: 'xyz', hint: 'Drag the tip of a', get: () => ka.get(), set: ([x, y, z]) => { state.ax = cl(x, 2); state.ay = cl(y, 2); state.az = cl(z, 2); ctx.requestUpdate(); ctx.panelSync(); } });
    ctx.handles.add({ object: kb.group, axes: 'xyz', hint: 'Drag the tip of b', get: () => kb.get(), set: ([x, y, z]) => { state.bx = cl(x, 2); state.by = cl(y, 2); state.bz = cl(z, 2); ctx.requestUpdate(); ctx.panelSync(); } });
    mk.forEach((k, i) => ctx.handles.add({ object: k.group, axes: 'xy', hint: `Drag mass ${i + 1}`, get: () => k.get(), set: ([x, y]) => { state[`x${i + 1}`] = cl(x, 2.2); state[`y${i + 1}`] = cl(y, 1.8); ctx.requestUpdate(); ctx.panelSync(); } }));
    ctx.handles.add({ object: probe.group, axes: 'xy', hint: 'Drag the probe', get: () => probe.get(), set: ([x, y]) => {
      if (state.kind === 'gravity') { state.px = cl(x, 2.2); state.py = cl(y, 1.8); } else { state.qx = cl(x, 2); state.qy = cl(y, 1.7); time.t = 0; }
      ctx.requestUpdate(); ctx.panelSync(); } });
    const deg = (r) => `${(r * 180 / Math.PI).toFixed(1)}°`;

    return {
      update() {
        const kind = state.kind, show = (objs, on) => objs.forEach((o) => { (o.group || o.object || o).visible = on; });
        show([va, vb, vc, ka, kb, para, proj, projSeg], kind === 'products');
        show([...massMeshes, ...mk, gv], kind === 'gravity');
        show([ring, tracer], kind === 'divcurl'); tracer.visible = kind === 'divcurl' && state.tracers;
        plane.setVisible(kind !== 'products'); arrows.mesh.visible = kind !== 'products'; probe.group.visible = kind !== 'products';
        stage.axes.visible = kind === 'products'; stage.grid.visible = kind === 'products';
        if (kind === 'products') {
          const a = [state.ax, state.ay, state.az], b = [state.bx, state.by, state.bz], c = cross(a, b), d = dot(a, b), na = norm(a), nb = norm(b);
          va.set([0, 0, 0], a, na); vb.set([0, 0, 0], b, nb); vc.set([0, 0, 0], c, Math.min(2.4, norm(c))); ka.set(a); kb.set(b);
          const s = a.map((x, i) => x + b[i]), P = para.geometry.attributes.position;
          [[0, 0, 0], a, s, [0, 0, 0], s, b].forEach((p, i) => P.setXYZ(i, ...p)); P.needsUpdate = true;
          const foot = a.map((x) => x * d / (na * na));
          proj.segments([...b, ...foot]); projSeg.segments([0, 0, 0, ...foot]);
          const th = Math.acos(Math.max(-1, Math.min(1, d / (na * nb))));
          hud.set('a', `a·b = ${d.toFixed(3)}  (|a||b|cos θ, θ = ${deg(th)})`); hud.set('b', `|a × b| = ${norm(c).toFixed(3)} = parallelogram area`);
          hud.set('c', `projection of b on a: ${(d / na).toFixed(3)}`);
          hud.set('chk', `|a×b|² + (a·b)² − |a|²|b|² = ${(norm(c) ** 2 + d * d - na * na * nb * nb).toExponential(1)} ✓`, 'good');
        } else if (kind === 'gravity') {
          const M = [{ m: state.m1, x: state.x1, y: state.y1 }, { m: state.m2, x: state.x2, y: state.y2 }];
          M.forEach((q, i) => { const r = 0.06 + 0.05 * Math.log10(q.m / 1e9); massMeshes[i].scale.setScalar(r); massMeshes[i].position.set(q.x, q.y, 0); mk[i].set([q.x, q.y + r + 0.06, 0.02]); });
          const items = [], ref = 6.6743e-11 * Math.max(state.m1, state.m2);
          for (let i = -10; i <= 10; i++) for (let j = -8; j <= 8; j++) { const x = i * 0.22, y = j * 0.22; const [gx, gy] = gravity(M, x, y); items.push({ p: [x, y, 0], v: [gx, gy, 0] }); }
          const norm2 = logNorm(ref / 40, ref * 4);
          arrows.set(items, { len: (m) => 0.04 + 0.13 * norm2(m), width: 0.09, map: 'viridis', norm: norm2 });
          const [gx, gy, V] = gravity(M, state.px, state.py);
          probe.set([state.px, state.py, 0.03]); gv.set([state.px, state.py, 0.04], [gx, gy, 0], 0.15 + 0.4 * norm2(Math.hypot(gx, gy)));
          hud.set('a', `g at the probe = ${si(Math.hypot(gx, gy), 'm/s²')}`); hud.set('b', `potential V = ${si(V, 'J/kg')}`);
          hud.set('c', `masses ${si(state.m1, 'kg')} and ${si(state.m2, 'kg')}`); hud.set('chk', 'g = −∇V: arrows point down the potential');
        } else {
          const f = FIELDS[state.field], items = [];
          for (let i = -10; i <= 10; i++) for (let j = -8; j <= 8; j++) { const x = i * 0.2, y = j * 0.2; items.push({ p: [x, y, 0], v: [...f.F(x, y), 0] }); }
          const nm = logNorm(0.05, 3);
          arrows.set(items, { len: (m) => 0.03 + 0.12 * nm(m), width: 0.09, map: 'viridis', norm: nm });
          const R = 0.25, rp = []; for (let k = 0; k <= 48; k++) { const a = 2 * Math.PI * k / 48; rp.push(state.qx + R * Math.cos(a), state.qy + R * Math.sin(a), 0.02); }
          ring.set(rp); probe.set([state.qx, state.qy, 0.03]);
          // tracers: start on the probe disc, carried by the flow for time t (RK4 steps)
          const P = tracer.geometry.attributes.position, t = time.t, steps = Math.ceil(t / 0.02), h = t / Math.max(1, steps);
          seed.forEach(([sx, sy], i) => {
            let x = state.qx + sx, y = state.qy + sy;
            for (let k = 0; k < steps; k++) {
              const k1 = f.F(x, y), k2 = f.F(x + h / 2 * k1[0], y + h / 2 * k1[1]), k3 = f.F(x + h / 2 * k2[0], y + h / 2 * k2[1]), k4 = f.F(x + h * k3[0], y + h * k3[1]);
              x += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
              if (Math.abs(x) > 5 || Math.abs(y) > 5) break;
            }
            P.setXYZ(i, x, y, 0.03);
          });
          P.needsUpdate = true;
          const m = measure(f.F, state.qx, state.qy, R), m0 = measure(f.F, state.qx, state.qy, 1e-4);
          hud.set('a', `div F = ${f.div(state.qx, state.qy).toFixed(3)}  (flux/area: ${m0.div.toFixed(3)})`);
          hud.set('b', `curl F = ${f.curl(state.qx, state.qy).toFixed(3)}  (circulation/area: ${m0.curl.toFixed(3)})`);
          hud.set('c', `on the drawn circle (r = 0.25): ${m.div.toFixed(3)}, ${m.curl.toFixed(3)}`);
          hud.set('chk', Math.abs(f.div(state.qx, state.qy)) > 1e-9 ? (f.div(state.qx, state.qy) > 0 ? 'source: tracers spread' : 'sink: tracers bunch up') : 'no divergence: tracer area kept', 'good');
        }
      },
      theme() {
        for (const v of [va, vb, vc, gv]) v.theme(); for (const k of [ka, kb, probe, ...mk]) k.theme(); proj.theme(); projSeg.theme(); plane.theme(); ring.theme();
        paraMat.color.set(ctx.cssVar('--c-F')); massMeshes.forEach((m) => m.material.color.set(ctx.cssVar('--c-ref'))); tracer.material.color.set(ctx.cssVar('--c-E'));
      },
    };
  },
};
