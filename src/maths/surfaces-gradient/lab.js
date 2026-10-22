// Surfaces z = f(x, y): walk on them, see the gradient, the tangent plane and the level curves.
import * as THREE from 'three';
import { createSurface } from '../../lib/viz/surface.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { createKnob } from '../../lib/viz/knob.js';
import { SURF, tangentPlane } from './model.js';

const R = 3, FLOOR = -1.6;

export default {
  id: 'surfaces-gradient', title: 'Surfaces and the gradient', size: 3, timeless: true, plain: true,
  cameras: { front: { pos: [0, -9, 2.2] }, side: { pos: [9, 0, 2.2] }, top: { pos: [0, -0.01, 9.5] }, iso: { pos: [6, -6.5, 5] } },
  defaults: { surf: 'bowl', x: 0.4, y: -0.3, plane: true, contours: true, floor: true, grad: true },
  cases: [
    { id: 'bowl', label: 'Bowl', set: { surf: 'bowl', x: 1.5, y: 1 }, examples: [
      { id: 'bottom', label: 'At the bottom: ∇f = 0', set: { x: 0, y: 0 } },
      { id: 'far', label: 'Far out: steeper', set: { x: 2.5, y: 0 } },
    ] },
    { id: 'saddle', label: 'Saddle', set: { surf: 'saddle', x: 0.6, y: 0.3 }, examples: [
      { id: 'centre', label: 'Centre: flat, not an extremum', set: { x: 0, y: 0 } },
      { id: 'x', label: 'Along x it rises', set: { x: 1.5, y: 0 } },
      { id: 'y', label: 'Along y it falls', set: { x: 0, y: 1.5 } },
    ] },
    { id: 'hills', label: 'Hills', set: { surf: 'hills', x: 0.2, y: -0.2 }, examples: [
      { id: 'top', label: 'On a summit', set: { x: 1, y: 0.6 } },
      { id: 'valley', label: 'In the hollow', set: { x: -0.3, y: 1.6 } },
    ] },
    { id: 'ripple', label: 'Ripple', set: { surf: 'ripple', x: 1.2, y: 0.8 }, examples: [
      { id: 'trough', label: 'In the trough ring', set: { x: 1.644, y: 0 } },
    ] },
  ],
  controls: [
    { title: 'Point', items: [
      { id: 'x', label: 'x', unit: '', min: -2.8, max: 2.8, step: 0.01 },
      { id: 'y', label: 'y', unit: '', min: -2.8, max: 2.8, step: 0.01 },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'grad', label: 'Gradient', type: 'check', color: '--c-F' },
    { id: 'plane', label: 'Tangent plane', type: 'check' },
    { id: 'contours', label: 'Level curves', type: 'check', color: '--c-E' },
    { id: 'floor', label: 'Contour map', type: 'check' },
  ] }],
  plots: [{ id: 'slice', title: 'Height along the gradient direction', xLabel: 's', xUnit: '', yUnit: '' }],
  hud: [{ id: 'f', label: 'f(x, y)' }, { id: 'gx', label: '∂f/∂x' }, { id: 'gy', label: '∂f/∂y' }, { id: 'g', label: '|∇f|' }, 'sep', { id: 'perp', label: '∇f vs level curve' }],

  setup(ctx) {
    const { scene, state, hud, plots } = ctx;
    const surf = createSurface(scene, { nx: 110, ny: 110, x: [-R, R], y: [-R, R], opacity: 0.94 });
    const cont = createCurve(ctx.stage, { max: 9000, width: 1.2, color: '--ink', opacity: 0.55 });
    const floorC = createCurve(ctx.stage, { max: 9000, width: 1.2, color: '--c-ref' });
    const level = createCurve(ctx.stage, { max: 2000, width: 3, color: '--c-E' });
    const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * R), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.05, depthWrite: false }));
    floorPlane.position.z = FLOOR; scene.add(floorPlane);
    const planeMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6, 1, 1), planeMat); scene.add(plane);
    const gradV = createVector(scene, '--c-F', '∇f', { radius: 0.02 }), upV = createVector(scene, '--c-F', '', { radius: 0.016 });
    const drop = createCurve(ctx.stage, { max: 1, width: 1, color: '--c-ref', dashed: true });
    const knob = createKnob(scene, '--accent', 0.07), shadow = createKnob(scene, '--c-ref', 0.04);
    let key = '';
    ctx.handles.add({
      object: knob.group, axes: 'xy', hint: 'Drag to walk on the surface',
      get: () => knob.get(),
      set: ([x, y]) => { state.x = Math.max(-2.8, Math.min(2.8, x)); state.y = Math.max(-2.8, Math.min(2.8, y)); ctx.requestUpdate(); ctx.panelSync(); },
    });

    return {
      update() {
        const S = SURF[state.surf];
        if (key !== state.surf) {
          key = state.surf;
          const { lo, hi } = surf.set(S.f, { map: 'viridis' });
          const levels = []; for (let i = 1; i < 12; i++) levels.push(lo + (hi - lo) * i / 12);
          cont.segments(surf.contours(levels, { lift: 0.004 }));
          floorC.segments(surf.contours(levels, { flat: FLOOR + 0.002 }));
        }
        cont.object.visible = state.contours; floorC.object.visible = floorPlane.visible = state.floor;
        const { x, y } = state, z = S.f(x, y), [gx, gy] = S.g(x, y), g = Math.hypot(gx, gy);
        knob.set([x, y, z]); shadow.set([x, y, FLOOR]); drop.segments([x, y, z, x, y, FLOOR]);
        level.object.visible = state.contours;
        const lv = surf.contours([z], { lift: 0.008 });
        level.segments(lv);
        // tangent plane: normal (−gx, −gy, 1)
        plane.visible = state.plane;
        plane.position.set(x, y, z);
        plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-gx, -gy, 1).normalize());
        gradV.group.visible = upV.group.visible = state.grad && g > 1e-6;
        if (state.grad && g > 1e-6) {
          gradV.set([x, y, FLOOR + 0.01], [gx, gy, 0], Math.min(1.6, 0.25 + 0.9 * g));
          upV.set([x, y, z], [gx, gy, g * g], 0.7);
        }
        // check: gradient against the level curve's direction, from the contour segment nearest the point
        let best = null, bd = Infinity;
        for (let i = 0; i < lv.length; i += 6) { const d = Math.hypot((lv[i] + lv[i + 3]) / 2 - x, (lv[i + 1] + lv[i + 4]) / 2 - y); if (d < bd) { bd = d; best = i; } }
        if (best != null && g > 1e-6) {
          const tx = lv[best + 3] - lv[best], ty = lv[best + 4] - lv[best + 1], ang = Math.acos(Math.abs(tx * gx + ty * gy) / (Math.hypot(tx, ty) * g || 1)) * 180 / Math.PI;
          hud.set('perp', `${ang.toFixed(1)}° ${Math.abs(ang - 90) < 3 ? '✓' : ''}`, Math.abs(ang - 90) < 3 ? 'good' : '');
        } else hud.set('perp', g < 1e-6 ? 'flat point: ∇f = 0' : '—');
        hud.set('f', z.toFixed(4)); hud.set('gx', gx.toFixed(4)); hud.set('gy', gy.toFixed(4)); hud.set('g', g.toFixed(4));
        const ux = g > 1e-9 ? gx / g : 1, uy = g > 1e-9 ? gy / g : 0, n = 200, s = new Float64Array(n), fz = new Float64Array(n), tz = new Float64Array(n), T = tangentPlane(S, x, y);
        for (let i = 0; i < n; i++) { s[i] = -2 + 4 * i / (n - 1); fz[i] = S.f(x + s[i] * ux, y + s[i] * uy); tz[i] = T(x + s[i] * ux, y + s[i] * uy); }
        plots.slice.draw({ xlim: [-2, 2], cursor: 0, markers: [{ x: 0, y: z, color: '--accent' }], series: [
          { x: s, y: fz, color: '--c-B', label: 'f' }, { x: s, y: tz, color: '--c-F', dash: [4, 3], label: 'tangent: slope |∇f|' }] });
      },
      theme() { for (const c of [cont, floorC, level, drop]) c.theme(); gradV.theme(); upV.theme(); knob.theme(); shadow.theme(); planeMat.color.set(ctx.cssVar('--c-F')); floorPlane.material.color.set(ctx.cssVar('--ink')); },
    };
  },
};
