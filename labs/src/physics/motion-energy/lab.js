// Motion, momentum and energy: projectile (with drag), circular motion, collisions.
import * as THREE from 'three';
import { createGraph2D, niceStep } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { createKnob } from '../../lib/viz/knob.js';
import { si } from '../../lib/ui/format.js';
import { projectile, range, apex, circular, collide, G } from './model.js';


export default {
  id: 'motion-energy', title: 'Motion, momentum and energy', size: 5, ortho: true, plain: true, cam: 'top',
  defaults: { kind: 'projectile', v0: 15, angle: 0.8, h0: 0, m: 1, drag: false, cd: 0.02, r: 2, w: 1.5, m1: 2, m2: 1, u1: 2, u2: -1, e: 1, trail: true, vectors: true },
  scenarios: [
    { id: 'projectile', label: 'Projectile', hint: 'Drag the arrow tip to aim.', set: { kind: 'projectile' } },
    { id: 'air', label: 'With air drag', set: { kind: 'projectile', v0: 30, drag: true, cd: 0.01 } },
    { id: 'circle', label: 'Circular motion', set: { kind: 'circular' } },
    { id: 'elastic', label: 'Elastic collision', set: { kind: 'collision', e: 1 } },
    { id: 'stick', label: 'Carts that stick', set: { kind: 'collision', e: 0 } },
  ],
  controls: [
    { title: 'Body', show: (s) => s.kind !== 'collision', items: [
      { id: 'm', label: 'Mass m', unit: 'kg', min: 0.1, max: 10, log: true, show: (s) => s.kind !== 'collision' },
    ] },
    { title: 'Launch', show: (s) => s.kind === 'projectile', items: [
      { id: 'v0', label: 'Speed v₀', unit: 'm/s', min: 1, max: 40, step: 0.1 },
      { id: 'angle', label: 'Angle θ', unit: '°', k: 180 / Math.PI, min: 0, max: Math.PI / 2, step: Math.PI / 360 },
      { id: 'h0', label: 'Height h₀', unit: 'm', min: 0, max: 20, step: 0.1 },
      { id: 'drag', label: 'Air drag', type: 'check' },
      { id: 'cd', label: 'Drag c = ½ρC_dA/m', unit: '1/m', min: 0.001, max: 0.1, log: true, show: (s) => s.drag },
    ] },
    { title: 'Circle', show: (s) => s.kind === 'circular', items: [
      { id: 'r', label: 'Radius r', unit: 'm', min: 0.2, max: 5, step: 0.05 },
      { id: 'w', label: 'Angular speed ω', unit: 'rad/s', min: 0.2, max: 6, step: 0.05 },
    ] },
    { title: 'Carts', show: (s) => s.kind === 'collision', items: [
      { id: 'm1', label: 'Mass 1', unit: 'kg', min: 0.2, max: 10, log: true },
      { id: 'm2', label: 'Mass 2', unit: 'kg', min: 0.2, max: 10, log: true },
      { id: 'u1', label: 'Speed 1', unit: 'm/s', min: -3, max: 4, step: 0.05 },
      { id: 'u2', label: 'Speed 2', unit: 'm/s', min: -4, max: 3, step: 0.05 },
      { id: 'e', label: 'Bounciness e', unit: '', min: 0, max: 1, step: 0.01, hint: '1 elastic, 0 sticky' },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'vectors', label: 'Vectors', type: 'check', color: '--c-v' },
    { id: 'trail', label: 'Path', type: 'check' },
  ] }],
  plots: [
    { id: 'energy', title: 'Energy', xLabel: 't', xUnit: 's', yUnit: 'J' },
    { id: 'second', title: '', xLabel: 't', xUnit: 's', yUnit: '' },
  ],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }, { id: 'd', label: '' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const world = new THREE.Group(); scene.add(world);
    const graph = createGraph2D(stage, { parent: world, unit: 'm' });
    const path = createCurve(stage, { max: 4000, width: 1.4, color: '--c-ref', dashed: true, parent: world });
    const trail = createCurve(stage, { max: 4000, width: 2.6, color: '--c-B', parent: world });
    const ballMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), ballMat); world.add(ball);
    const carts = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.6 })); world.add(m); return m; });
    const cartLabels = [ctx.label('1'), ctx.label('2')]; carts.forEach((c, i) => c.add(cartLabels[i]));
    const vV = createVector(world, '--c-v', 'v', { radius: 0.03 }), vA = createVector(world, '--c-F', 'a', { radius: 0.03 });
    const vL = createVector(world, '--c-v', 'v₀', { radius: 0.03 });
    const radius = createCurve(stage, { max: 1, width: 1.4, color: '--ink-dim', parent: world });
    const knob = createKnob(world, '--accent', 0.12);
    let k = 1, P = null, D = 1, KV = 0.1;
    ctx.handles.add({
      object: knob.group, axes: 'xy', hint: 'Drag to set launch speed and angle',
      get: () => knob.get(),
      set: ([x, y]) => {
        const ox = 0, oy = state.h0 * k, dx = x - ox, dy = y - oy;
        state.v0 = Math.max(1, Math.min(40, Math.hypot(dx, dy) / KV)); state.angle = Math.max(0, Math.min(Math.PI / 2, Math.atan2(dy, dx)));
        configure(); ctx.requestUpdate(); ctx.panelSync();
      },
    });

    function configure() {
      if (state.kind === 'projectile') {
        P = projectile({ v0: state.v0, th: state.angle, h0: state.h0, c: state.drag ? state.cd : 0 });
        const R = Math.max(...P.x), H = Math.max(...P.y), span = Math.max(R, H * 1.6, 5);
        k = 8.5 / span; KV = 2.2 / 40;
        world.position.set(-4.4, -2.4, 0);
        const st = niceStep(span);
        graph.set([0, span * 1.05], [0, span * 0.62], st, k);
        D = P.t[P.t.length - 1];
        const pts = []; for (let i = 0; i < P.t.length; i += 4) pts.push(P.x[i] * k, P.y[i] * k, 0.001);
        path.set(pts);
      } else if (state.kind === 'circular') {
        k = 3 / state.r; world.position.set(0, 0, 0);
        graph.set([-state.r * 1.5, state.r * 1.5], [-state.r * 1.25, state.r * 1.25], niceStep(state.r * 3), k);
        D = 2 * 2 * Math.PI / state.w;
        const pts = []; for (let i = 0; i <= 128; i++) { const a = 2 * Math.PI * i / 128; pts.push(3 * Math.cos(a), 3 * Math.sin(a), 0.001); }
        path.set(pts);
      } else {
        k = 1; world.position.set(0, -1, 0);
        graph.set([-5, 5], [0, 2], 1, k);
        D = 6; path.set([]);
      }
      ctx.setDuration(D);
    }

    // collision timeline: carts of width 0.8 m start 6 m apart (centre to centre)
    function cartsAt(t) {
      const { m1, m2, u1, u2, e } = state, w = 0.8, x10 = -3, x20 = 3, gap = x20 - x10 - w;
      const tc = u1 > u2 ? gap / (u1 - u2) : Infinity, [v1, v2] = collide(m1, m2, u1, u2, e);
      if (t < tc) return { x: [x10 + u1 * t, x20 + u2 * t], v: [u1, u2], tc };
      const xc1 = x10 + u1 * tc;
      return { x: [xc1 + v1 * (t - tc), xc1 + w + v2 * (t - tc)], v: [v1, v2], tc };
    }

    return {
      changed() { configure(); },
      update() {
        const t = time.t, kind = state.kind, m = state.m;
        ball.visible = kind !== 'collision'; for (const c of carts) c.visible = kind === 'collision';
        knob.group.visible = vL.group.visible = kind === 'projectile';
        radius.object.visible = kind === 'circular';
        path.object.visible = trail.object.visible = state.trail && kind !== 'collision';
        const T = [], E1 = [], E2 = [], E3 = [], S1 = [], S2 = [];
        if (kind === 'projectile') {
          const i = Math.min(P.t.length - 1, Math.max(0, Math.round(t / 1e-3)));
          const x = P.x[i], y = P.y[i], vx = P.vx[i], vy = P.vy[i], v = Math.hypot(vx, vy), c = state.drag ? state.cd : 0;
          const ax = -c * v * vx, ay = -G - c * v * vy;
          ball.position.set(x * k, y * k, 0.01);
          const tr = []; for (let j = 0; j <= i; j += 4) tr.push(P.x[j] * k, P.y[j] * k, 0.002); tr.push(x * k, y * k, 0.002);
          trail.set(tr);
          vV.set([x * k, y * k, 0.02], [vx, vy, 0], state.vectors ? v * 0.05 : 0); vA.set([x * k, y * k, 0.02], [ax, ay, 0], state.vectors ? Math.hypot(ax, ay) * 0.08 : 0);
          const tip = [state.v0 * KV * Math.cos(state.angle), state.h0 * k + state.v0 * KV * Math.sin(state.angle), 0.03];
          vL.set([0, state.h0 * k, 0.02], [tip[0], tip[1] - state.h0 * k, 0], Math.hypot(tip[0], tip[1] - state.h0 * k)); knob.set(tip);
          for (let j = 0; j < P.t.length; j += 8) { const KE = 0.5 * m * (P.vx[j] ** 2 + P.vy[j] ** 2), PE = m * G * P.y[j]; T.push(P.t[j]); E1.push(KE); E2.push(PE); E3.push(KE + PE); S1.push(P.y[j]); }
          const E0 = E3[0], Enow = 0.5 * m * v * v + m * G * y;
          hud.set('a', `x = ${si(x, 'm')}, y = ${si(y, 'm')}`); hud.set('b', `speed ${si(v, 'm/s')}`);
          hud.set('c', state.drag ? `range ${si(P.x[P.x.length - 1], 'm')} (no drag: ${si(range(state.v0, state.angle, state.h0), 'm')})` : `range ${si(range(state.v0, state.angle, state.h0), 'm')}`);
          hud.set('d', `apex ${si(state.drag ? Math.max(...P.y) : apex(state.v0, state.angle, state.h0), 'm')}`);
          hud.set('chk', `E now / E start = ${(Enow / E0).toFixed(6)}`, !state.drag && Math.abs(Enow / E0 - 1) < 1e-6 ? 'good' : '');
          plots.energy.draw({ xlim: [0, D], cursor: t, series: [{ x: T, y: E1, color: '--c-v', label: 'kinetic' }, { x: T, y: E2, color: '--c-E', label: 'potential' }, { x: T, y: E3, color: '--ink', dash: [4, 3], label: 'total' }] });
          plots.second.draw({ xlim: [0, D], cursor: t, series: [{ x: T, y: S1, color: '--c-B', label: 'height y [m]' }] });
        } else if (kind === 'circular') {
          const s = circular(state.r, state.w, t), pa = Math.atan2(s.p[1], s.p[0]);
          ball.position.set(s.p[0] * k, s.p[1] * k, 0.01);
          radius.segments([0, 0, 0, s.p[0] * k, s.p[1] * k, 0]);
          const tr = []; for (let j = 0; j <= 60; j++) { const a = pa - 1.2 + 1.2 * j / 60; tr.push(3 * Math.cos(a), 3 * Math.sin(a), 0.002); }
          trail.set(tr);
          const v = Math.hypot(...s.v), a = Math.hypot(...s.a);
          vV.set([s.p[0] * k, s.p[1] * k, 0.02], [...s.v, 0], state.vectors ? 1.4 : 0); vA.set([s.p[0] * k, s.p[1] * k, 0.02], [...s.a, 0], state.vectors ? 1.4 * Math.min(2, a / (v * state.w)) : 0);
          for (let j = 0; j <= 200; j++) { const tt = D * j / 200, q = circular(state.r, state.w, tt); T.push(tt); S1.push(q.p[0]); S2.push(q.p[1]); E1.push(0.5 * m * v * v); }
          hud.set('a', `speed v = ωr = ${si(v, 'm/s')}`); hud.set('b', `acceleration a = ${si(a, 'm/s²')}`); hud.set('c', `period T = ${si(2 * Math.PI / state.w, 's')}`);
          hud.set('d', `centripetal force m·a = ${si(m * a, 'N')}`);
          hud.set('chk', `a = v²/r = ${si(v * v / state.r, 'm/s²')} ✓`, 'good');
          plots.energy.draw({ xlim: [0, D], cursor: t, series: [{ x: T, y: E1, color: '--c-v', label: 'kinetic (constant)' }] });
          plots.second.draw({ xlim: [0, D], cursor: t, series: [{ x: T, y: S1, color: '--c-x', label: 'x(t) [m]' }, { x: T, y: S2, color: '--c-y', label: 'y(t) [m]' }] });
        } else {
          const c = cartsAt(t), { m1, m2 } = state, w = 0.8;
          carts.forEach((cart, i) => { const mass = i ? m2 : m1, h = 0.35 + 0.12 * Math.cbrt(mass); cart.scale.set(w, h, 0.3); cart.position.set(c.x[i] + (i ? w / 2 : -w / 2), h / 2, 0.01); });
          vV.set([c.x[0] - w / 2, 1.2, 0.02], [c.v[0], 0, 0], state.vectors ? Math.abs(c.v[0]) * 0.4 : 0);
          vA.set([c.x[1] + w / 2, 1.2, 0.02], [c.v[1], 0, 0], state.vectors ? Math.abs(c.v[1]) * 0.4 : 0);
          vA.label.element.textContent = 'v₂'; vV.label.element.textContent = 'v₁';
          for (let j = 0; j <= 300; j++) { const tt = D * j / 300, q = cartsAt(tt); T.push(tt); S1.push(m1 * q.v[0] + m2 * q.v[1]); E1.push(0.5 * m1 * q.v[0] ** 2 + 0.5 * m2 * q.v[1] ** 2); S2.push(m1 * q.v[0]); E2.push(m2 * q.v[1]); }
          const p = m1 * c.v[0] + m2 * c.v[1], KE = 0.5 * m1 * c.v[0] ** 2 + 0.5 * m2 * c.v[1] ** 2, KE0 = 0.5 * m1 * state.u1 ** 2 + 0.5 * m2 * state.u2 ** 2;
          hud.set('a', `v₁ = ${si(c.v[0], 'm/s')}, v₂ = ${si(c.v[1], 'm/s')}`); hud.set('b', `total momentum ${si(p, 'kg·m/s')}`);
          hud.set('c', `kinetic energy ${si(KE, 'J')}`); hud.set('d', Number.isFinite(c.tc) ? `impact at t = ${si(c.tc, 's')}` : 'they never meet');
          hud.set('chk', `energy lost ${(100 * (1 - KE / KE0)).toFixed(1)} %; momentum kept ✓`, 'good');
          plots.energy.draw({ xlim: [0, D], cursor: t, series: [{ x: T, y: E1, color: '--c-v', label: 'total kinetic' }] });
          plots.second.draw({ xlim: [0, D], cursor: t, series: [{ x: T, y: S1, color: '--ink', label: 'total momentum' }, { x: T, y: S2, color: '--c-B', dash: [4, 3], label: 'cart 1' }, { x: T, y: E2, color: '--c-E', dash: [4, 3], label: 'cart 2' }] });
        }
        if (kind !== 'collision') { vV.label.element.textContent = 'v'; vA.label.element.textContent = 'a'; }
      },
      theme() {
        graph.theme(); path.theme(); trail.theme(); radius.theme(); vV.theme(); vA.theme(); vL.theme(); knob.theme();
        ballMat.color.set(ctx.cssVar('--c-B')); carts[0].material.color.set(ctx.cssVar('--c-B')); carts[1].material.color.set(ctx.cssVar('--c-E'));
      },
    };
  },
};
