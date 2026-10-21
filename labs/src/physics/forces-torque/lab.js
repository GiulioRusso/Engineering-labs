// Forces and torque: vector sum of forces, torque on a pivoted bar, buoyancy.
import * as THREE from 'three';
import { createGraph2D } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { createKnob } from '../../lib/viz/knob.js';
import { si } from '../../lib/ui/format.js';
import { resultant, torque, barInertia, draft, pressure, bob, G } from './model.js';

const KF = 0.12; // world units per newton for force arrows

export default {
  id: 'forces-torque', title: 'Forces and torque', size: 4.6, ortho: true, plain: true, cam: 'top', duration: 4,
  defaults: { kind: 'resultant', f1x: 12, f1y: 6, f2x: -4, f2y: 10, f3x: -6, f3y: -8, m: 2, F: 10, r: 0.6, alpha: Math.PI / 2, L: 1, M: 2, s: 0.4, rb: 600, rf: 1000, tiptail: true },
  cases: [
    { id: 'sum', label: 'Adding forces', set: { kind: 'resultant' }, examples: [
      { id: 'line', label: 'Along one line', set: { f1x: 10, f1y: 0, f2x: -4, f2y: 0, f3x: 0, f3y: 0 } },
      { id: 'right', label: 'At right angles: 3-4-5', set: { f1x: 12, f1y: 0, f2x: 0, f2y: 9, f3x: 0, f3y: 0 } },
      { id: 'balance', label: 'Equilibrium: they cancel', set: { f1x: 12, f1y: 0, f2x: -6, f2y: 10.39, f3x: -6, f3y: -10.39 } },
    ] },
    { id: 'torque', label: 'Torque', set: { kind: 'torque' }, examples: [
      { id: 'end', label: 'Push at the end', set: { r: 1 } },
      { id: 'near', label: 'Near the pivot', set: { r: 0.1 } },
      { id: 'along', label: 'Along the bar: no torque', set: { alpha: 0 } },
      { id: 'd30', label: 'At 30°: half the torque', set: { alpha: Math.PI / 6 } },
    ] },
    { id: 'buoyancy', label: 'Buoyancy', set: { kind: 'buoyancy', rb: 600 }, examples: [
      { id: 'ice', label: 'Ice in water', set: { rb: 917 } },
      { id: 'sea', label: 'Ice in sea water', set: { rb: 917, rf: 1025 } },
      { id: 'same', label: 'Same density as water', set: { rb: 1000 } },
      { id: 'sink', label: 'Aluminium sinks', set: { rb: 2700 } },
    ] },
  ],
  controls: [
    { title: 'Forces', show: (s) => s.kind === 'resultant', items: [
      { id: 'm', label: 'Mass', unit: 'kg', min: 0.2, max: 10, log: true },
      { type: 'readout', label: 'Net force', value: (s) => { const R = resultant([[s.f1x, s.f1y], [s.f2x, s.f2y], [s.f3x, s.f3y]]); return `${Math.hypot(...R).toFixed(2)} N`; } },
    ] },
    { title: 'Lever', show: (s) => s.kind === 'torque', items: [
      { id: 'F', label: 'Force F', unit: 'N', min: 0, max: 30, step: 0.1 },
      { id: 'r', label: 'Distance r', unit: 'm', min: 0, max: 1, step: 0.01 },
      { id: 'alpha', label: 'Angle α', unit: '°', k: 180 / Math.PI, min: 0, max: Math.PI, step: Math.PI / 180 },
      { id: 'M', label: 'Bar mass', unit: 'kg', min: 0.2, max: 10, log: true },
    ] },
    { title: 'Block and liquid', show: (s) => s.kind === 'buoyancy', items: [
      { id: 'rb', label: 'Block ρ', unit: 'kg/m³', min: 100, max: 3000, step: 1 },
      { id: 'rf', label: 'Liquid ρ', unit: 'kg/m³', min: 700, max: 1500, step: 1, hint: 'Water 1000' },
      { id: 's', label: 'Side s', unit: 'm', min: 0.1, max: 0.8, step: 0.01 },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'tiptail', label: 'Tip to tail', type: 'check', show: (s) => s.kind === 'resultant' }] }],
  plots: [{ id: 'p1', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage, label } = ctx;
    stage.controls.enableRotate = false;
    const graph = createGraph2D(stage, { x: [-4, 4], y: [-3, 3], unit: '' });
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 40), new THREE.MeshStandardMaterial({ roughness: 0.6 }));
    puck.rotation.x = Math.PI / 2; scene.add(puck);
    const fv = [createVector(scene, '--c-F', 'F₁', { radius: 0.02 }), createVector(scene, '--c-F', 'F₂', { radius: 0.02 }), createVector(scene, '--c-F', 'F₃', { radius: 0.02 })];
    const knobs = [0, 1, 2].map(() => createKnob(scene, '--c-F', 0.07));
    const net = createVector(scene, '--ink', 'ΣF', { radius: 0.035 }), acc = createVector(scene, '--c-v', 'a', { radius: 0.02 });
    const chain = createCurve(stage, { max: 3, width: 1.4, color: '--c-ref', dashed: true });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.05), new THREE.MeshStandardMaterial({ roughness: 0.6 }));
    const barG = new THREE.Group(); barG.add(bar); scene.add(barG);
    const pivot = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), new THREE.MeshBasicMaterial()); scene.add(pivot);
    const fbar = createVector(scene, '--c-F', 'F', { radius: 0.025 }), knobR = createKnob(scene, '--accent', 0.07);
    const arc = createCurve(stage, { max: 60, width: 2.4, color: '--c-E' }), arcLabel = label('τ'); scene.add(arcLabel);
    const liquid = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35 }));
    liquid.position.set(0, -1.2, -0.01); scene.add(liquid);
    const surface = createCurve(stage, { max: 1, width: 2, color: '--c-B' });
    const block = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), new THREE.MeshStandardMaterial({ roughness: 0.7 })); scene.add(block);
    const wv = createVector(scene, '--c-F', 'W', { radius: 0.025 }), bv = createVector(scene, '--c-B', 'F_B', { radius: 0.025 });
    const W = 3.2; // world units per metre for the bar and the block
    let B = null;
    knobs.forEach((k, i) => ctx.handles.add({ object: k.group, axes: 'xy', hint: `Drag F${i + 1}`, get: () => k.get(), set: ([x, y]) => {
      state[`f${i + 1}x`] = Number((x / KF).toFixed(1)); state[`f${i + 1}y`] = Number((y / KF).toFixed(1)); ctx.requestUpdate(); ctx.panelSync(); } }));
    ctx.handles.add({ object: knobR.group, axes: 'xy', hint: 'Drag along the bar', get: () => knobR.get(), set: ([x]) => { state.r = Math.max(0, Math.min(state.L, (x + 1.6) / W)); ctx.requestUpdate(); ctx.panelSync(); } });

    return {
      changed() { B = state.kind === 'buoyancy' ? bob({ s: state.s, rb: state.rb, rf: state.rf }) : null; ctx.setDuration(state.kind === 'buoyancy' ? 6 : 4); },
      update() {
        const kind = state.kind, t = time.t;
        const vis = (o, on) => { (o.group || o.object || o).visible = on; };
        [puck, net, acc, chain, ...fv, ...knobs].forEach((o) => vis(o, kind === 'resultant'));
        [barG, pivot, fbar, knobR, arc, arcLabel].forEach((o) => vis(o, kind === 'torque'));
        [liquid, surface, block, wv, bv].forEach((o) => vis(o, kind === 'buoyancy'));
        graph.setVisible(kind !== 'buoyancy');
        if (kind === 'resultant') {
          const F = [[state.f1x, state.f1y], [state.f2x, state.f2y], [state.f3x, state.f3y]], R = resultant(F), a = [R[0] / state.m, R[1] / state.m];
          const x0 = 0.5 * a[0] * t * t * 0.02, y0 = 0.5 * a[1] * t * t * 0.02; // puck drifts (scaled ×0.02)
          puck.position.set(x0, y0, 0);
          F.forEach((f, i) => { fv[i].set([x0, y0, 0.02], [...f, 0], Math.hypot(...f) * KF); knobs[i].set([x0 + f[0] * KF, y0 + f[1] * KF, 0.03]); });
          net.set([x0, y0, 0.03], [...R, 0], Math.hypot(...R) * KF); acc.set([x0, y0, 0.04], [...a, 0], Math.hypot(...a) * KF * 0.5);
          chain.object.visible = state.tiptail;
          const p1 = [F[0][0] * KF + x0, F[0][1] * KF + y0], p2 = [p1[0] + F[1][0] * KF, p1[1] + F[1][1] * KF], p3 = [p2[0] + F[2][0] * KF, p2[1] + F[2][1] * KF];
          chain.set([p1[0], p1[1], 0.01, p2[0], p2[1], 0.01, p3[0], p3[1], 0.01]);
          const n = Math.hypot(...R);
          hud.set('a', `ΣF = (${R[0].toFixed(2)}, ${R[1].toFixed(2)}) N`); hud.set('b', `|ΣF| = ${si(n, 'N')}`); hud.set('c', `a = ΣF/m = ${si(n / state.m, 'm/s²')}`);
          hud.set('chk', n < 0.05 ? 'equilibrium: forces close the loop ✓' : 'not balanced: the puck accelerates', n < 0.05 ? 'good' : '');
          const ms = [0, 1, 2].map((i) => Math.hypot(...F[i]));
          plots.p1.draw({ xlim: [0.5, 4.5], series: [{ x: [1, 1, NaN, 2, 2, NaN, 3, 3, NaN, 4, 4], y: [0, ms[0], NaN, 0, ms[1], NaN, 0, ms[2], NaN, 0, n], color: '--c-F', width: 10, label: 'F₁, F₂, F₃, |ΣF| [N]' }] });
        } else if (kind === 'torque') {
          const tau = torque(state.r, state.F, state.alpha), I = barInertia(state.M, state.L), alpha = tau / I;
          const phi = Math.max(-1.2, Math.min(1.2, 0.5 * alpha * t * t)); // swings up to ±70°
          const x0 = -1.6, L = state.L * W;
          barG.position.set(x0, 0, 0); barG.rotation.z = phi; bar.scale.set(L, 1, 1); bar.position.x = L / 2;
          pivot.position.set(x0, 0, 0.03);
          const ux = Math.cos(phi), uy = Math.sin(phi), px = x0 + state.r * W * ux, py = state.r * W * uy, fa = phi + state.alpha;
          knobR.set([px, py, 0.04]);
          fbar.set([px - Math.cos(fa) * state.F * 0.06, py - Math.sin(fa) * state.F * 0.06, 0.03], [Math.cos(fa), Math.sin(fa), 0], state.F * 0.06);
          const pts = [], R = 0.45, sweep = Math.sign(tau) * Math.min(2.6, Math.abs(tau) / 3 + 0.4);
          for (let i = 0; i <= 40; i++) { const a = phi + sweep * i / 40; pts.push(x0 + R * Math.cos(a), R * Math.sin(a), 0.02); }
          arc.set(Math.abs(tau) > 1e-3 ? pts : []); arcLabel.position.set(x0 + R * 1.3 * Math.cos(phi + sweep / 2), R * 1.3 * Math.sin(phi + sweep / 2), 0);
          arcLabel.element.textContent = Math.abs(tau) < 1e-3 ? '' : tau > 0 ? 'τ (counter-clockwise)' : 'τ (clockwise)';
          hud.set('a', `τ = r·F·sin α = ${si(tau, 'N·m')}`); hud.set('b', `lever arm r·sin α = ${si(state.r * Math.sin(state.alpha), 'm')}`);
          hud.set('c', `angular acceleration τ/I = ${si(alpha, 'rad/s²')}`); hud.set('chk', `I = ML²/3 = ${si(I, 'kg·m²')}`);
          const as = [], ts = []; for (let i = 0; i <= 90; i++) { const a = Math.PI * i / 90; as.push(a * 180 / Math.PI); ts.push(torque(state.r, state.F, a)); }
          plots.p1.draw({ xlim: [0, 180], cursor: state.alpha * 180 / Math.PI, series: [{ x: as, y: ts, color: '--c-E', label: 'τ against α [N·m], α in degrees' }] });
        } else {
          const s = state.s, i = Math.min(B.t.length - 1, Math.round(t / 2e-3)), z = B.z[i], d = draft(s, state.rb, state.rf);
          const S = s * W;
          surface.segments([-3, 0, 0.02, 3, 0, 0.02]);
          const yb = -z * W; // bottom face, world units (surface at y = 0)
          block.scale.set(S, S, 1); block.position.set(0, yb + S / 2, 0.01);
          const m = state.rb * s ** 3, Wt = m * G, FB = state.rf * G * s * s * Math.max(0, Math.min(s, z));
          const kW = 1.4 / (state.rf * G * s ** 3);
          wv.set([0.15 * S, yb + S / 2, 0.05], [0, -1, 0], Wt * kW); bv.set([-0.15 * S, yb + S / 2, 0.05], [0, 1, 0], FB * kW);
          hud.set('a', `weight ${si(Wt, 'N')}, buoyancy ${si(FB, 'N')}`); hud.set('b', `depth now ${si(z, 'm')}`);
          hud.set('c', d >= s ? 'denser than the liquid: it sinks' : `floats with ${(100 * d / s).toFixed(1)} % under (ρ_b/ρ_f)`);
          hud.set('chk', `bottom pressure ${si(pressure(z, state.rf), 'Pa')}`);
          const T = [], Z = []; for (let j = 0; j < B.t.length; j += 10) { T.push(B.t[j]); Z.push(B.z[j]); }
          plots.p1.draw({ xlim: [0, 6], cursor: t, series: [{ x: T, y: Z, color: '--c-B', label: 'depth of the bottom face [m]' }, { x: [0, 6], y: [d, d], color: '--ink', dash: [4, 3], label: 'equilibrium s·ρ_b/ρ_f' }] });
        }
      },
      theme() {
        graph.theme(); for (const v of [...fv, net, acc, fbar, wv, bv]) v.theme(); for (const k of [...knobs, knobR]) k.theme(); chain.theme(); arc.theme(); surface.theme();
        puck.material.color.set(ctx.cssVar('--c-ref')); bar.material.color.set(ctx.cssVar('--copper')); pivot.material.color.set(ctx.cssVar('--ink'));
        liquid.material.color.set(ctx.cssVar('--c-B')); block.material.color.set(ctx.cssVar('--copper'));
      },
    };
  },
};
