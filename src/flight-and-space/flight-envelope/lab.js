// Flight: a light aircraft with its four forces; lift curve, drag polar and V–n envelope linked.
import * as THREE from 'three';
import { createVector } from '../../lib/viz/vector.js';
import { createCurve } from '../../lib/viz/curve.js';
import { si } from '../../lib/ui/format.js';
import { isa, PLANE, CL, CD, forces, trimAlpha, stallSpeed, stallAlpha, bestLD } from './model.js';

const deg = Math.PI / 180;

export default {
  id: 'flight-envelope', title: 'Flight: lift, drag, envelope', size: 7, timeless: true,
  cameras: { front: { pos: [0, -24, 2] }, side: { pos: [24, 0, 2] }, top: { pos: [0, -0.01, 24] }, iso: { pos: [15, -15, 8] } },
  defaults: { mode: 'trim', V: 55, h: 1000, alpha: 4 * deg, bank: 0, flow: true },
  cases: [
    { id: 'flight', label: 'Flight', set: { V: 55, h: 1000 }, examples: [
      { id: 'slow', label: 'Slow: big angle of attack', set: { V: 30 } },
      { id: 'fast', label: 'Fast: small angle', set: { V: 80 } },
      { id: 'high', label: 'Thin air at 4000 m', set: { h: 4000 } },
      { id: 'b30', label: 'Turn, 30° bank', set: { bank: 30 * deg } },
      { id: 'b60', label: 'Turn, 60° bank: n = 2', set: { V: 50, bank: 60 * deg } },
      { id: 'slowturn', label: 'Too slow for that bank', controls: ['V', 'bank'], set: { V: 34, bank: 60 * deg } },
      { id: 'stall', label: 'Stall: α past 15°', controls: ['alpha'], set: { mode: 'free', V: 30, alpha: 18 * deg } },
      { id: 'before', label: 'Just below the stall', controls: ['alpha'], set: { mode: 'free', V: 30, alpha: 13 * deg } },
      { id: 'neg', label: 'Negative angle: pushes down', controls: ['alpha'], set: { mode: 'free', V: 30, alpha: -3 * deg } },
    ] },
  ],
  controls: [
    { title: 'Flight', items: [
      { id: 'mode', label: 'Angle of attack', type: 'segmented', options: [['trim', 'For level flight'], ['free', 'By hand']] },
      { id: 'V', label: 'Airspeed', unit: 'm/s', min: 20, max: 82, step: 0.5 },
      { id: 'h', label: 'Altitude', unit: 'm', min: 0, max: 6000, step: 50 },
      { id: 'bank', label: 'Bank', unit: '°', k: 1 / deg, min: 0, max: 70 * deg, step: deg },
      { id: 'alpha', label: 'Angle of attack', unit: '°', k: 1 / deg, min: -5 * deg, max: 22 * deg, step: 0.1 * deg, show: (s) => s.mode === 'free' },
      { type: 'readout', label: 'Stall speed', value: (s) => `${stallSpeed(PLANE, s.h, 1 / Math.cos(s.bank)).toFixed(1)} m/s` },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'flow', label: 'Airflow', type: 'check' }] }],
  plots: [
    { id: 'cl', title: 'Lift curve C_L(α)', xLabel: 'α', xUnit: '°', yUnit: '' },
    { id: 'polar', title: 'Drag polar', xLabel: 'C_D', xUnit: '', yUnit: '' },
    { id: 'vn', title: 'V–n envelope', xLabel: 'V', xUnit: 'm/s', yUnit: '' },
  ],
  hud: [{ id: 'alpha', label: 'angle of attack' }, { id: 'cl', label: 'C_L, C_D' }, { id: 'L', label: 'lift L' }, { id: 'D', label: 'drag D (= thrust)' }, { id: 'W', label: 'weight W · n' }, 'sep', { id: 'LD', label: 'L/D (best)' }, { id: 'air', label: 'air' }],

  setup(ctx) {
    const { scene, state, hud, plots, stage } = ctx;
    stage.grid.position.z = -4;
    const plane = new THREE.Group(), body = new THREE.Group(); plane.add(body); scene.add(plane);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.55 }), dark = new THREE.MeshStandardMaterial({ roughness: 0.6 });
    const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 6.5, 6, 16), mat); fus.rotation.z = Math.PI / 2; body.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 11, 0.12), mat); wing.position.set(0.6, 0, 0.45); body.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.4, 0.08), mat); tail.position.set(-3.6, 0, 0.1); body.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 1.4), mat); fin.position.set(-3.6, 0, 0.75); body.add(fin);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2, 0.15), dark); prop.position.set(3.85, 0, 0); body.add(prop);
    const vL = createVector(scene, '--c-B', 'lift L', { radius: 0.09 }), vD = createVector(scene, '--c-E', 'drag D', { radius: 0.09 });
    const vW = createVector(scene, '--c-F', 'weight W', { radius: 0.09 }), vT = createVector(scene, '--c-v', 'thrust T', { radius: 0.09 });
    const flow = createCurve(stage, { max: 60, width: 1.2, color: '--c-ref', opacity: 0.6 });

    return {
      update() {
        const n = 1 / Math.cos(state.bank), ta = trimAlpha(PLANE, state.V, state.h, n);
        const a = state.mode === 'trim' ? (ta ?? stallAlpha(PLANE) + 0.5 * deg) : state.alpha;
        const f = forces(PLANE, state.V, state.h, a), W = f.W, k = 3.2 / (W * Math.max(1, n));
        // flight path horizontal (+x); body pitched by α, banked by φ about the flight path
        plane.rotation.set(state.bank, 0, 0); body.rotation.set(0, -a, 0);
        const up = [0, -Math.sin(state.bank), Math.cos(state.bank)];   // lift ⟂ to the flight path, in the banked plane
        vL.set([0.6, 0, 0.5], up, f.L * k); vD.set([0, 0, 0], [-1, 0, 0], f.D * k * 4); vT.set([3.9, 0, 0], [1, 0, 0], f.D * k * 4);
        vW.set([0, 0, 0], [0, 0, -1], W * k);
        vD.label.element.textContent = 'drag D (×4)'; vT.label.element.textContent = 'thrust T (×4)';
        flow.object.visible = state.flow;
        const seg = []; for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) seg.push(9, i * 2.2, j * 1.6 + 0.3, -9, i * 2.2, j * 1.6 + 0.3);
        flow.segments(seg);
        const b = bestLD(PLANE), r = isa(state.h);
        hud.set('alpha', `${(a / deg).toFixed(2)}°${f.stalled ? '  STALL' : ta === null && state.mode === 'trim' ? '  (cannot trim: too slow)' : ''}`, f.stalled || ta === null ? 'bad' : '');
        hud.set('cl', `${f.cl.toFixed(3)}, ${f.cd.toFixed(4)}`); hud.set('L', si(f.L, 'N')); hud.set('D', si(f.D, 'N')); hud.set('W', `${si(W, 'N')} × ${n.toFixed(2)}`);
        hud.set('LD', `${(f.L / f.D).toFixed(1)} (${b.LD.toFixed(1)})`); hud.set('air', `${r.T.toFixed(1)} K, ${si(r.p, 'Pa')}, ρ = ${r.rho.toFixed(3)} kg/m³`);
        // lift curve
        const as = [], cls = []; for (let i = 0; i <= 200; i++) { const x = (-6 + 30 * i / 200) * deg; as.push(x / deg); cls.push(CL(PLANE, x)); }
        plots.cl.draw({ xlim: [-6, 24], cursor: a / deg, markers: [{ x: a / deg, y: f.cl, color: f.stalled ? '--c-north' : '--accent' }], shade: [stallAlpha(PLANE) / deg, 24], series: [{ x: as, y: cls, color: '--c-B', label: 'C_L' }] });
        // polar with the tangent from the origin (best L/D)
        const cds = [], cl2 = []; for (let i = 0; i <= 100; i++) { const c = -0.2 + 1.7 * i / 100; cl2.push(c); cds.push(CD(PLANE, c)); }
        plots.polar.draw({ xlim: [0, 0.16], ylim: [-0.2, 1.6], markers: [{ x: f.cd, y: f.cl, color: '--accent' }, { x: CD(PLANE, b.CL), y: b.CL, color: '--c-v' }], series: [
          { x: cds, y: cl2, color: '--c-E', label: 'C_L against C_D' }, { x: [0, 0.16], y: [0, 0.16 * b.LD], color: '--c-v', dash: [3, 3], label: 'best L/D' }] });
        // V–n envelope
        const vs = [], np = [], nn = []; for (let i = 0; i <= 120; i++) { const v = 90 * i / 120; vs.push(v); const q = 0.5 * r.rho * v * v * PLANE.S / W; np.push(Math.min(PLANE.nMax, q * PLANE.CLmax)); nn.push(Math.max(PLANE.nMin, -q * PLANE.CLmax * 0.6)); }
        plots.vn.draw({ xlim: [0, 90], ylim: [-2, 4.5], markers: [{ x: state.V, y: n, color: ta === null || f.stalled ? '--c-north' : '--accent' }], series: [
          { x: vs, y: np, color: '--c-B', label: 'n limit (stall, structure)' }, { x: vs, y: nn, color: '--c-B' }, { x: [PLANE.Vne, PLANE.Vne], y: [PLANE.nMin, PLANE.nMax], color: '--c-north', dash: [4, 3], label: 'V_ne' }] });
      },
      theme() { for (const v of [vL, vD, vW, vT]) v.theme(); flow.theme(); mat.color.set(ctx.cssVar('--c-ref')); dark.color.set(ctx.cssVar('--ink-dim')); },
    };
  },
};
