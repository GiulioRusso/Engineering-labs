// Optics bench: ray diagrams for lenses and mirrors, Snell refraction, and two-slit waves.
import * as THREE from 'three';
import { createGraph2D } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import { createVector } from '../../lib/viz/vector.js';
import { createSlice } from '../../lib/viz/slice.js';
import { si } from '../../lib/ui/format.js';
import { image, snell, twoSlit, fringe } from './model.js';

const K = 10, XM = 0.45; // world units per metre; the bench spans ±0.45 m
const WAVE_SPEED = 0.3;  // ripple-tank wave speed, m/s

export default {
  id: 'optics-bench', title: 'Optics bench', size: 4.4, ortho: true, plain: true, cam: 'top',
  defaults: { kind: 'snell', f: 0.1, dobj: 0.25, ho: 0.04, conv: true, n1: 1, n2: 1.5, th1: 0.6, lam: 0.012, d: 0.05, L: 0.42, rays: true },
  scenarios: [
    { id: 'snell', label: 'Refraction', hint: 'Drag the source.', set: { kind: 'snell', n1: 1, n2: 1.5, th1: 0.7 } },
    { id: 'tir', label: 'Total reflection', set: { kind: 'snell', n1: 1.5, n2: 1, th1: 0.85 } },
    { id: 'real', label: 'Lens', hint: 'Drag the object.', set: { kind: 'lens', dobj: 0.25 } },
    { id: 'magnifier', label: 'Magnifier', set: { kind: 'lens', dobj: 0.06 } },
    { id: 'mirror', label: 'Mirror', set: { kind: 'mirror', f: 0.12, dobj: 0.3 } },
    { id: 'slits', label: 'Double slit', set: { kind: 'slits' } },
  ],
  controls: [
    { title: 'Lens or mirror', show: (s) => s.kind === 'lens' || s.kind === 'mirror', items: [
      { id: 'conv', label: 'Converging', type: 'check', show: (s) => s.kind === 'lens' },
      { id: 'f', label: 'Focal length', unit: 'cm', k: 100, min: 0.03, max: 0.2, step: 0.001 },
      { id: 'dobj', label: 'Distance', unit: 'cm', k: 100, min: 0.02, max: 0.42, step: 0.001 },
      { id: 'ho', label: 'Height', unit: 'cm', k: 100, min: 0.01, max: 0.08, step: 0.001 },
    ] },
    { title: 'Refraction', show: (s) => s.kind === 'snell', items: [
      { id: 'n1', label: 'n₁ (top)', unit: '', min: 1, max: 2.5, step: 0.01, hint: 'Air 1, water 1.33, glass 1.5' },
      { id: 'n2', label: 'n₂ (bottom)', unit: '', min: 1, max: 2.5, step: 0.01 },
      { id: 'th1', label: 'Angle θ₁', unit: '°', k: 180 / Math.PI, min: 0, max: 1.5, step: Math.PI / 360 },
    ] },
    { title: 'Double slit', show: (s) => s.kind === 'slits', items: [
      { id: 'lam', label: 'Wavelength λ', unit: 'cm', k: 100, min: 0.004, max: 0.03, step: 0.0005 },
      { id: 'd', label: 'Slit gap d', unit: 'cm', k: 100, min: 0.01, max: 0.15, step: 0.001 },
      { id: 'L', label: 'Screen L', unit: 'cm', k: 100, min: 0.15, max: 0.44, step: 0.005 },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'rays', label: 'Rays', type: 'check', show: (s) => s.kind === 'lens' || s.kind === 'mirror' }] }],
  plots: [{ id: 'p', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const graph = createGraph2D(stage, { x: [-XM, XM], y: [-0.2, 0.2], step: 0.05, k: K, unit: 'm' });
    const axisC = createCurve(stage, { max: 1, width: 1.4, color: '--ink-dim' });
    const lensMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const lens = new THREE.Mesh(new THREE.BufferGeometry(), lensMat); scene.add(lens);
    const lensEdge = createCurve(stage, { max: 200, width: 2, color: '--c-B' });
    const obj = createVector(scene, '--c-E', 'object', { radius: 0.03 }), img = createVector(scene, '--c-F', 'image', { radius: 0.03 });
    const knob = createKnob(scene, '--c-E', 0.1), src = createKnob(scene, '--c-E', 0.1);
    const rays = [createCurve(stage, { max: 3, width: 2, color: '--c-E' }), createCurve(stage, { max: 3, width: 2, color: '--c-v' }), createCurve(stage, { max: 3, width: 2, color: '--c-I' })];
    const virt = createCurve(stage, { max: 6, width: 1.4, color: '--c-ref', dashed: true });
    const marks = ['F', 'F′', 'C'].map((t) => { const l = ctx.label(t); scene.add(l); return l; });
    const dots = createCurve(stage, { max: 6, width: 4, color: '--ink' });
    const iface = new THREE.Mesh(new THREE.PlaneGeometry(2 * XM * K, 0.2 * K), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.18 }));
    iface.position.set(0, -0.1 * K, -0.01); scene.add(iface);
    const normal = createCurve(stage, { max: 1, width: 1.2, color: '--c-ref', dashed: true });
    const inc = createCurve(stage, { max: 1, width: 3, color: '--c-E' }), refr = createCurve(stage, { max: 1, width: 3, color: '--c-E' }), refl = createCurve(stage, { max: 1, width: 2, color: '--c-E', opacity: 0.6 });
    const slice = createSlice(stage, { w: 2 * XM * K, h: 2 * XM * K, res: [220, 220] });
    slice.place('xy', 0); slice.mesh.position.z = -0.02;
    const barrier = createCurve(stage, { max: 3, width: 5, color: '--ink' }), screen = createCurve(stage, { max: 1, width: 5, color: '--c-F' });
    const W = (x, y) => [x * K, y * K, 0.01];
    ctx.handles.add({ object: knob.group, axes: 'xy', hint: 'Drag the object', get: () => knob.get(), set: ([x, y]) => {
      state.dobj = Math.max(0.02, Math.min(0.42, -x / K)); state.ho = Math.max(0.01, Math.min(0.08, y / K)); ctx.requestUpdate(); ctx.panelSync(); } });
    ctx.handles.add({ object: src.group, axes: 'xy', hint: 'Drag the light source', get: () => src.get(), set: ([x, y]) => {
      state.th1 = Math.max(0, Math.min(1.5, Math.atan2(-x, Math.max(1e-6, y)))); ctx.requestUpdate(); ctx.panelSync(); } });
    let frame = 0;

    function rayTo(c, pts) { c.set(pts.flatMap(([x, y]) => W(x, y))); }

    function drawLens(f) {
      const h = 0.12, n = 40, bulge = Math.sign(f) * 0.012, pos = [], edge = [];
      for (let i = 0; i <= n; i++) { const y = -h + 2 * h * i / n, w = bulge * (1 - (y / h) ** 2) + (f < 0 ? 0.004 : 0); edge.push(...W(-w - 0.002, y)); }
      for (let i = n; i >= 0; i--) { const y = -h + 2 * h * i / n, w = bulge * (1 - (y / h) ** 2) + (f < 0 ? 0.004 : 0); edge.push(...W(w + 0.002, y)); }
      lensEdge.set(edge, true);
      for (let i = 0; i < n; i++) {
        const y0 = -h + 2 * h * i / n, y1 = y0 + 2 * h / n, w0 = bulge * (1 - (y0 / h) ** 2) + (f < 0 ? 0.004 : 0) + 0.002, w1 = bulge * (1 - (y1 / h) ** 2) + (f < 0 ? 0.004 : 0) + 0.002;
        pos.push(...W(-w0, y0), ...W(w0, y0), ...W(w1, y1), ...W(-w0, y0), ...W(w1, y1), ...W(-w1, y1));
      }
      lens.geometry.dispose(); lens.geometry = new THREE.BufferGeometry(); lens.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    }
    function drawMirror(f) {
      const R = 2 * f, h = 0.12, edge = [];
      for (let i = 0; i <= 60; i++) { const y = -h + 2 * h * i / 60; edge.push(...W(-R + Math.sqrt(R * R - y * y), y)); }
      lensEdge.set(edge);
      lens.geometry.dispose(); lens.geometry = new THREE.BufferGeometry();
    }

    return {
      changed() { time.scale = state.lam / WAVE_SPEED / 1.5; ctx.setDuration(0); },
      update() {
        const kind = state.kind, show = (arr, on) => arr.forEach((o) => { (o.group || o.object || o).visible = on; });
        const optic = kind === 'lens' || kind === 'mirror';
        show([lens, lensEdge, obj, img, knob, virt, dots, ...rays, ...marks], optic);
        show([iface, normal, inc, refr, refl, src], kind === 'snell');
        show([slice.mesh, barrier, screen], kind === 'slits');
        graph.setVisible(kind !== 'slits'); axisC.object.visible = optic;
        axisC.segments([...W(-XM, 0), ...W(XM, 0)]);
        if (optic) {
          const mirror = kind === 'mirror', f = mirror ? state.f : (state.conv ? 1 : -1) * state.f, d = state.dobj, h = state.ho;
          const { di, m, real } = image(f, d), hi = m * h, side = mirror ? -1 : 1; // image x = side·di
          mirror ? drawMirror(f) : drawLens(f);
          obj.set(W(-d, 0), [0, 1, 0], h * K); knob.set(W(-d, h));
          img.set(W(side * di, 0), [0, Math.sign(hi) || 1, 0], Math.abs(hi) * K * (Math.abs(di) < 3 ? 1 : 0));
          img.material.opacity = real ? 1 : 0.5; img.material.transparent = !real;
          const far = XM * 1.2, sF = -h / f;
          // ray 1: parallel → through the focus (lens: F′ at +f; mirror: back through F at −f)
          rayTo(rays[0], mirror ? [[-d, h], [0, h], [-far, h - sF * far]] : [[-d, h], [0, h], [far, h + sF * far]]);
          // ray 2: through the centre (lens) / to the vertex, reflected symmetrically (mirror)
          rayTo(rays[1], mirror ? [[-d, h], [0, 0], [-far, -h / d * far]] : [[-d, h], [0, 0], [far, -h / d * far]]);
          // ray 3: through the near focus → leaves parallel
          const y3 = -h * f / (d - f);
          rayTo(rays[2], mirror ? [[-d, h], [0, y3], [-far, y3]] : [[-d, h], [0, y3], [far, y3]]);
          for (const r of rays) r.object.visible = state.rays;
          // virtual image: dashed backward extensions to it
          virt.object.visible = state.rays && !real && Math.abs(di) < 3;
          if (!real) virt.segments([...W(0, h), ...W(side * di, hi), ...W(0, 0), ...W(side * di, hi), ...W(0, y3), ...W(side * di, hi)]);
          const Fx = mirror ? -f : f;
          marks[0].position.set(...W(mirror ? -f : -f, -0.012)); marks[1].position.set(...W(Fx, -0.012)); marks[1].visible = !mirror;
          marks[2].position.set(...W(-2 * f, -0.012)); marks[2].visible = mirror;
          dots.segments([...W(-f, 0), ...W(-f + 0.001, 0), ...W(Fx, 0), ...W(Fx + 0.001, 0), ...W(-2 * f, 0), ...W(-2 * f + 0.001, 0)]);
          hud.set('a', `f = ${si(f, 'm')}, d_o = ${si(d, 'm')}`);
          hud.set('b', `d_i = ${Math.abs(di) > 1e3 ? '∞ (object at F)' : si(di, 'm')}`);
          hud.set('c', `magnification m = ${m.toFixed(3)}`);
          hud.set('chk', real ? 'real, inverted image' : 'virtual, upright image (rays only seem to come from it)', 'good');
          const ds = [], dis = []; for (let i = 1; i <= 200; i++) { const x = 0.42 * i / 200; ds.push(x * 100); const q = image(f, x).di; dis.push(Math.abs(q) < 1.5 ? q * 100 : NaN); }
          plots.p.draw({ xlim: [0, 42], ylim: [-60, 60], cursor: d * 100, markers: [{ x: d * 100, y: di * 100, color: '--c-F' }], series: [{ x: ds, y: dis, color: '--c-F', label: 'image distance d_i [cm] against object distance d_o [cm]' }] });
        } else if (kind === 'snell') {
          const s = snell(state.n1, state.n2, state.th1), r = 0.3;
          const sx = -r * Math.sin(state.th1), sy = r * Math.cos(state.th1);
          src.set(W(sx, sy)); rayTo(inc, [[sx, sy], [0, 0]]);
          rayTo(refl, [[0, 0], [-sx, sy]]); refl.material.linewidth = 1 + 4 * s.R;
          refr.object.visible = !s.tir;
          if (!s.tir) rayTo(refr, [[0, 0], [r * Math.sin(s.th2), -r * Math.cos(s.th2)]]);
          normal.segments([...W(0, 0.2), ...W(0, -0.2)]);
          iface.material.opacity = 0.1 + 0.08 * (state.n2 - 1);
          const deg = (a) => `${(a * 180 / Math.PI).toFixed(1)}°`;
          hud.set('a', `θ₁ = ${deg(state.th1)}`); hud.set('b', s.tir ? 'θ₂: none — total internal reflection' : `θ₂ = ${deg(s.th2)}`);
          hud.set('c', s.crit != null ? `critical angle ${deg(s.crit)}` : 'no critical angle (n₂ ≥ n₁)');
          hud.set('chk', s.tir ? 'all light reflected' : `n₁ sin θ₁ = ${(state.n1 * Math.sin(state.th1)).toFixed(4)} = n₂ sin θ₂ ✓; reflected ${(100 * s.R).toFixed(1)} %`, 'good');
          const a = [], b = []; for (let i = 0; i <= 180; i++) { const t = 1.5 * i / 180, q = snell(state.n1, state.n2, t); a.push(t * 180 / Math.PI); b.push(q.tir ? NaN : q.th2 * 180 / Math.PI); }
          plots.p.draw({ xlim: [0, 86], ylim: [0, 90], cursor: state.th1 * 180 / Math.PI, series: [{ x: a, y: b, color: '--c-E', label: 'θ₂ against θ₁ (degrees)' }, { x: [0, 90], y: [0, 90], color: '--c-ref', dash: [3, 3], label: 'no bending' }] });
        } else {
          const { lam, d, L } = state, kw = 2 * Math.PI / lam, wt = 2 * Math.PI * time.t * WAVE_SPEED / lam;
          if (frame++ % 2 === 0 || !time.playing) {
            slice.compute((x, y) => {
              const X = x / K, Y = y / K;
              if (X < 0.002 || X > L) return null;
              const r1 = Math.hypot(X, Y - d / 2), r2 = Math.hypot(X, Y + d / 2);
              return Math.cos(kw * r1 - wt) / Math.sqrt(r1 / lam + 1) + Math.cos(kw * r2 - wt) / Math.sqrt(r2 / lam + 1);
            }, 'viridis', (v) => (v == null ? 0 : 0.5 + v / 2.4));
          }
          barrier.segments([...W(0, 0.45), ...W(0, d / 2 + 0.004), ...W(0, d / 2 - 0.004), ...W(0, -d / 2 + 0.004), ...W(0, -d / 2 - 0.004), ...W(0, -0.45)]);
          screen.segments([...W(L, -0.22), ...W(L, 0.22)]);
          const ys = [], I = [], Is = []; const dy = fringe(lam, d, L);
          for (let i = 0; i <= 400; i++) { const y = -0.22 + 0.44 * i / 400; ys.push(y * 100); I.push(twoSlit(lam, d, L, y)); Is.push(2 + 2 * Math.cos(2 * Math.PI * y / dy)); }
          plots.p.draw({ xlim: [-22, 22], ylim: [0, 4.3], series: [{ x: ys, y: I, color: '--c-F', label: 'intensity on the screen (exact) vs height [cm]' }, { x: ys, y: Is, color: '--c-ref', dash: [3, 3], label: 'small-angle' }] });
          hud.set('a', `λ = ${si(lam, 'm')}, d = ${si(d, 'm')}, L = ${si(L, 'm')}`);
          hud.set('b', `fringe spacing λL/d = ${si(dy, 'm')}`); hud.set('c', `angle to 1st maximum ${(Math.asin(Math.min(1, lam / d)) * 180 / Math.PI).toFixed(1)}°`);
          hud.set('chk', d / L < 0.2 ? 'small-angle formula fits' : 'wide angles: exact ≠ small-angle', d / L < 0.2 ? 'good' : '');
        }
      },
      theme() { graph.theme(); axisC.theme(); lensEdge.theme(); for (const r of [...rays, virt, dots, normal, inc, refr, refl, barrier, screen]) r.theme(); obj.theme(); img.theme(); knob.theme(); src.theme(); lensMat.color.set(ctx.cssVar('--c-B')); iface.material.color.set(ctx.cssVar('--c-B')); },
    };
  },
};
