// Frequency response: the Nyquist plot of L(jω) (2D, from above); the docked plots are the Bode diagram and
// the closed-loop step response. The 3D view lifts the curve by log ω and adds Bode walls.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { polymul, evalTF, bode, margins, closedLoop, step, stepInfo, roots, cabs } from '../tf.js';

const W0 = 1e-2, W1 = 1e2, ZK = 0.75; // frequency range (rad/s), height per decade
const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const squash = (r) => (r <= 2 ? r : 2 + Math.log(r / 2)); // the floor plot is true up to |L| = 2, logarithmic beyond

// L(s) = K · C(s) · G(s), every factor in Bode form (1 + s/ω)
export function loop(s, withComp = true) {
  let num = [s.K], den = [1];
  if (s.int) den = polymul(den, [1, 0]);
  den = polymul(den, [1 / s.w1, 1]);
  if (s.pole2) den = polymul(den, [1 / s.w2, 1]);
  if (s.zero) num = polymul(num, [1 / s.wz, 1]);
  if (withComp && s.comp !== 'none') { num = polymul(num, [1 / s.cz, 1]); den = polymul(den, [1 / s.cp, 1]); }
  return { num, den };
}
const NYQ = { int: true, w1: 1, pole2: true, w2: 2, zero: false };

export default {
  id: 'frequency', title: 'Frequency response', size: 2.4, timeless: true, plain: true, camOf: (s) => (s.view3d ? 'iso' : 'top'),
  cameras: { front: { pos: [0, -9, 1.4], target: [0, 0, 1.2] }, side: { pos: [9, 0, 1.4], target: [0, 0, 1.2] }, top: { pos: [0, -0.01, 9.5], target: [0, 0, 0] }, iso: { pos: [5.2, -6.2, 5], target: [-0.3, 0, 1] } },
  defaults: { kind: 'bode', K: 1, int: false, w1: 1, pole2: false, w2: 10, zero: false, wz: 5, comp: 'none', cz: 0.8, cp: 8, w: 1, mirror: true, view3d: false },
  cases: [
    { id: 'bode', label: 'Bode', set: {}, examples: [
      { id: 'pole2', label: 'Second pole: −40 dB/decade', controls: ['pole2', 'w2'], set: { pole2: true } },
      { id: 'int', label: 'Integrator: −20 dB/dec everywhere', set: { int: true } },
      { id: 'zero', label: 'A zero lifts the slope', controls: ['zero', 'wz'], set: { pole2: true, zero: true } },
      { id: 'gain', label: 'Gain shifts magnitude, not phase', set: { K: 10 } },
    ] },
    { id: 'nyquist', label: 'Nyquist', set: { kind: 'nyquist', ...NYQ }, examples: [
      { id: 'small', label: 'Small gain: big margins', set: { K: 0.3 } },
      { id: 'more', label: 'More gain: margins shrink', set: { K: 2 } },
      { id: 'edge', label: 'K = 3: through −1', set: { K: 3 } },
      { id: 'over', label: 'K = 5: encircles −1, unstable', set: { K: 5 } },
    ] },
    { id: 'lead', label: 'Compensation', set: { kind: 'lead', ...NYQ, K: 2.5, comp: 'lead' }, examples: [
      { id: 'none', label: 'No compensator: PM 5°', set: { comp: 'none' } },
      { id: 'lag', label: 'Lag: 10× the gain, same margins', set: { comp: 'lag', K: 10, cz: 0.05, cp: 0.005 } },
      { id: 'wide', label: 'A wider lead', set: { cz: 0.5, cp: 20 } },
    ] },
  ],
  controls: [
    { title: 'Loop L(s)', items: [
      { id: 'K', label: 'Gain K', unit: '', min: 0.05, max: 50, log: true },
      { id: 'int', label: 'Integrator 1/s', type: 'check' },
      { id: 'w1', label: 'Pole at', unit: 'rad/s', min: 0.05, max: 50, log: true },
      { id: 'pole2', label: 'Second pole', type: 'check' },
      { id: 'w2', label: 'Second pole at', unit: 'rad/s', min: 0.05, max: 50, log: true, show: (s) => s.pole2 },
      { id: 'zero', label: 'Zero', type: 'check' },
      { id: 'wz', label: 'Zero at', unit: 'rad/s', min: 0.05, max: 50, log: true, show: (s) => s.zero },
    ] },
    { title: 'Compensator C(s) = (1 + s/z) / (1 + s/p)', show: (s) => s.kind === 'lead', items: [
      { id: 'comp', label: 'Type', type: 'segmented', options: [['none', 'None'], ['lead', 'Lead'], ['lag', 'Lag']] },
      { id: 'cz', label: 'Zero z', unit: 'rad/s', min: 0.002, max: 50, log: true, show: (s) => s.comp !== 'none' },
      { id: 'cp', label: 'Pole p', unit: 'rad/s', min: 0.002, max: 50, log: true, show: (s) => s.comp !== 'none' },
    ] },
    { title: 'Probe', items: [{ id: 'w', label: 'Frequency ω', unit: 'rad/s', min: W0, max: W1, log: true }] },
  ],
  display: [{ title: 'Show', items: [{ id: 'mirror', label: 'Negative frequencies (mirror)', type: 'check', color: '--c-ref' },
    { id: 'view3d', label: '3D view: lift by log ω', type: 'check', hint: 'Adds the 3D curve and the Bode walls; drag to orbit' }] }],
  plots: [
    { id: 'bode', title: 'Bode', xLabel: 'log₁₀ ω', xUnit: '', yUnit: 'dB', y2Unit: '°' },
    { id: 'step', title: 'Closed-loop step', xLabel: 't', xUnit: 's', yUnit: '' },
  ],
  hud: [{ id: 'L', label: '|L(jω)|, ∠L' }, { id: 'gm', label: 'gain margin' }, { id: 'pm', label: 'phase margin' }, 'sep', { id: 'chk', label: 'closed loop' }],

  setup(ctx) {
    const { scene, state, hud, plots, stage } = ctx;
    const helix = createCurve(stage, { max: 500, width: 3, color: '--c-B' }), ghost = createCurve(stage, { max: 500, width: 1.6, color: '--c-ref', dashed: true });
    const nyq = createCurve(stage, { max: 500, width: 2.2, color: '--c-E' }), mir = createCurve(stage, { max: 500, width: 1.4, color: '--c-E', dashed: true });
    const unit = createCurve(stage, { max: 129, width: 1, color: '--ink-dim', dashed: true }), axes = createCurve(stage, { max: 3, width: 1.2, color: '--ink-dim' });
    const drop = createCurve(stage, { max: 1, width: 1, color: '--c-ref', dashed: true }), margin = createCurve(stage, { max: 40, width: 3, color: '--c-I' });
    // Bode walls: magnitude on the back wall (y = WY), phase on the side wall (x = WX), both against log ω
    const WY = 3.2, WX = 2.8, wallMag = createCurve(stage, { max: 500, width: 2.4, color: '--c-B' }), wallPh = createCurve(stage, { max: 500, width: 2.4, color: '--c-E' });
    const wallGrid = createCurve(stage, { max: 20, width: 1, color: '--line' });
    wallGrid.segments([-4, WY, 0, 2.4, WY, 0, -4, WY, ZK * 4, 2.4, WY, ZK * 4, 0, WY, 0, 0, WY, ZK * 4, WX, -3, 0, WX, 3, 0, WX, -3, ZK * 4, WX, 3, ZK * 4, WX, 0, 0, WX, 0, ZK * 4]);
    const only3d = [wallMag, wallPh, wallGrid].map((c) => c.object);
    for (const [t, p] of [['|L| dB → (0 dB)', [0, WY, ZK * 4 + 0.25]], ['∠L (−180° ←)', [WX, 0, ZK * 4 + 0.25]]]) { const l = ctx.label(t, 'tick'); l.position.set(...p); scene.add(l); only3d.push(l); }
    const c = []; for (let i = 0; i <= 128; i++) { const a = 2 * Math.PI * i / 128; c.push(Math.cos(a), Math.sin(a), 0); } unit.set(c);
    axes.segments([-4.2, 0, 0, 2.6, 0, 0, 0, -3, 0, 0, 3, 0]);
    const zaxis = createCurve(stage, { max: 1, width: 1.2, color: '--ink-dim' }); zaxis.segments([0, 0, 0, 0, 0, ZK * 4]); only3d.push(zaxis.object, helix.object, drop.object);
    const minus1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial()); minus1.position.set(-1, 0, 0.01); scene.add(minus1);
    const ml = ctx.label('−1'); ml.position.set(-1, -0.25, 0); scene.add(ml);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshBasicMaterial()), sdot = dot.clone(); scene.add(dot, sdot); sdot.material = new THREE.MeshBasicMaterial();
    for (const [t, z] of [['ω = 0.01', 0], ['0.1', 1], ['1', 2], ['10', 3], ['100', 4]]) { const l = ctx.label(t, 'tick'); l.position.set(0.2, 0, ZK * z); scene.add(l); only3d.push(l); }
    const nyqLabels = [];
    for (const [t, p] of [['Re', [2.8, 0, 0]], ['Im', [0, 3.2, 0]], ['−2', [-2, -0.18, 0]], ['1', [1, -0.18, 0]], ['2', [2, -0.18, 0]], ['j', [0.15, 1, 0]], ['−j', [0.2, -1, 0]]]) { const l = ctx.label(t, 'tick'); l.position.set(...p); scene.add(l); nyqLabels.push(l); }
    only3d.push(dot);
    // Bode diagram drawn in the scene (Bode case, 2D): magnitude above, phase below, x = log ω
    const BX = (lw) => 1.4 * lw, MY = (db) => 0.25 + 2.3 * (Math.max(-80, Math.min(40, db)) + 80) / 120, PY = (ph) => -2.75 + 2.3 * (Math.max(-270, Math.min(0, ph)) + 270) / 270;
    const bMag = createCurve(stage, { max: 500, width: 3, color: '--c-B' }), bPh = createCurve(stage, { max: 500, width: 3, color: '--c-E' });
    const bAs = createCurve(stage, { max: 500, width: 1.6, color: '--c-ref', dashed: true }), bGrid = createCurve(stage, { max: 60, width: 1, color: '--line' }), bZero = createCurve(stage, { max: 2, width: 1.2, color: '--ink-dim' });
    const bodeObjs = [bMag, bPh, bAs, bGrid, bZero].map((c) => c.object), gg = [];
    for (let k = -2; k <= 2; k++) { gg.push(BX(k), MY(-80), 0, BX(k), MY(40), 0, BX(k), PY(-270), 0, BX(k), PY(0), 0); const l = ctx.label(`${10 ** k}`, 'tick'); l.position.set(BX(k), PY(-270) - 0.18, 0); scene.add(l); bodeObjs.push(l); }
    for (const db of [-80, -40, 0, 40]) { gg.push(BX(-2), MY(db), 0, BX(2), MY(db), 0); const l = ctx.label(`${db} dB`, 'tick'); l.position.set(BX(-2) - 0.4, MY(db), 0); scene.add(l); bodeObjs.push(l); }
    for (const ph of [-270, -180, -90, 0]) { gg.push(BX(-2), PY(ph), 0, BX(2), PY(ph), 0); const l = ctx.label(`${ph}°`, 'tick'); l.position.set(BX(-2) - 0.4, PY(ph), 0); scene.add(l); bodeObjs.push(l); }
    bGrid.segments(gg); bZero.segments([BX(-2), MY(0), 0.001, BX(2), MY(0), 0.001]);
    for (const [t, y] of [['|L(jω)|', MY(40) + 0.2], ['∠L(jω)', PY(0) + 0.2]]) { const l = ctx.label(t, 'tick'); l.position.set(0, y, 0); scene.add(l); bodeObjs.push(l); }
    const bDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial()), pDot = bDot.clone(); pDot.material = new THREE.MeshBasicMaterial(); scene.add(bDot, pDot); bodeObjs.push(bDot, pDot);
    const nyqObjs = [nyq, mir, unit, axes, margin].map((c) => c.object).concat([minus1, ml, sdot]);
    const asym = (w) => { let d = 20 * Math.log10(state.K) - (state.int ? 20 * Math.log10(w) : 0); for (const [on, c, sg] of [[true, state.w1, -1], [state.pole2, state.w2, -1], [state.zero, state.wz, 1]]) if (on) d += sg * Math.max(0, 20 * Math.log10(w / c)); return d; };
    const map = (g) => { const r = cabs(g), q = squash(r) / (r || 1); return [g[0] * q, g[1] * q]; };
    const curve = (B) => B.w.map((w, i) => [...map([B.re[i], B.im[i]]), ZK * (Math.log10(w) + 2)]);

    return {
      changed(id) {
        const bodeScene = state.kind === 'bode' && !state.view3d;
        for (const o of bodeObjs) o.visible = bodeScene; for (const o of nyqObjs) o.visible = !bodeScene; nyqLabels.forEach((l) => { l.visible = !bodeScene; });
        for (const o of only3d) o.visible = state.view3d; ctx.stage.setOrtho(!state.view3d); ctx.stage.controls.enableRotate = state.view3d; if (id === 'view3d') ctx.stage.preset(state.view3d ? 'iso' : 'top'); },
      update() {
        const L = loop(state), B = bode(L, W0, W1, 400), m = margins(L), P = roots(closedLoop(L).den), stable = P.every((p) => p[0] < -1e-9);
        const pts = curve(B);
        helix.set(pts.flat());
        wallMag.set(B.w.flatMap((w, i) => [Math.max(-4, Math.min(2.4, B.mag[i] / 20)), WY, ZK * (Math.log10(w) + 2)]));
        wallPh.set(B.w.flatMap((w, i) => [WX, Math.max(-3, Math.min(3, (B.ph[i] + 90) / 60)), ZK * (Math.log10(w) + 2)])); nyq.set(pts.flatMap(([x, y]) => [x, y, 0.004])); mir.set(pts.flatMap(([x, y]) => [x, -y, 0.003])); mir.object.visible = state.mirror && !(state.kind === 'bode' && !state.view3d);
        const show0 = state.kind === 'lead' && state.comp !== 'none';
        ghost.object.visible = show0; let B0 = null;
        if (show0) { B0 = bode(loop(state, false), W0, W1, 400); ghost.set(curve(B0).flatMap(([x, y, z]) => [x, y, state.view3d ? z : 0.002])); }
        const g = evalTF(L, [0, state.w]), [px, py] = map(g), pz = ZK * (Math.log10(state.w) + 2);
        dot.position.set(px, py, pz); sdot.position.set(px, py, 0.01); drop.segments([px, py, pz, px, py, 0]);
        // phase margin arc on the unit circle, gain margin segment on the real axis
        const seg = [];
        if (m.wgc) { const a0 = Math.PI, a1 = Math.PI + m.pm * Math.PI / 180; for (let i = 0; i < 16; i++) { const u = a0 + (a1 - a0) * i / 16, v = a0 + (a1 - a0) * (i + 1) / 16; seg.push(Math.cos(u), Math.sin(u), 0.006, Math.cos(v), Math.sin(v), 0.006); } }
        if (m.wpc) { const x = -(10 ** (-m.gm / 20)); seg.push(x, 0, 0.006, -1, 0, 0.006); }
        margin.segments(seg);
        if (state.kind === 'bode' && !state.view3d) {
          const lw = B.w.map(Math.log10);
          bMag.set(lw.flatMap((x, i) => [BX(x), MY(B.mag[i]), 0.002])); bPh.set(lw.flatMap((x, i) => [BX(x), PY(B.ph[i]), 0.002]));
          bAs.set(lw.flatMap((x) => [BX(x), MY(asym(10 ** x)), 0.001]));
          const gl = Math.log10(state.w), j = Math.max(0, Math.min(399, Math.round((gl + 2) / 4 * 399))); bDot.position.set(BX(gl), MY(B.mag[j]), 0.01); pDot.position.set(BX(gl), PY(B.ph[j]), 0.01);
        }
        hud.set('L', `${fmt(cabs(g))} (${fmt(20 * Math.log10(cabs(g)))} dB), ${fmt(Math.atan2(g[1], g[0]) * 180 / Math.PI)}° at ω = ${fmt(state.w)}`);
        hud.set('gm', m.wpc ? `${fmt(m.gm)} dB at ω = ${fmt(m.wpc)}` : '∞ (phase never reaches −180°)');
        hud.set('pm', m.wgc ? `${fmt(m.pm)}° at ω = ${fmt(m.wgc)}` : '∞ (|L| < 1 everywhere)');
        hud.set('chk', stable ? 'stable ✓' : 'unstable ✗', stable ? 'good' : 'bad');
        const lw = B.w.map(Math.log10), series = [{ x: lw, y: B.mag, color: '--c-B', label: '|L|' }, { x: lw, y: B.ph, color: '--c-E', axis: 1, label: '∠L' }];
        if (B0) series.push({ x: lw, y: B0.mag, color: '--c-ref', dash: [4, 3], label: 'without C' }, { x: lw, y: B0.ph, color: '--c-ref', dash: [2, 3], axis: 1 });
        series.push({ x: [lw[0], lw[lw.length - 1]], y: [0, 0], color: '--ink-dim', dash: [2, 4] });
        plots.bode.draw({ xlim: [-2, 2], cursor: Math.log10(state.w), series });
        const T = 20, s1 = step(closedLoop(L), T, 5e-3), ss = [{ x: Array.from(s1.t), y: Array.from(s1.y).map((v) => Math.max(-5, Math.min(5, v))), color: '--c-B', label: stable ? `overshoot ${fmt(stepInfo(s1, 1).overshoot)} %` : 'unstable' }];
        if (show0) { const s0 = step(closedLoop(loop(state, false)), T, 5e-3); ss.push({ x: Array.from(s0.t), y: Array.from(s0.y).map((v) => Math.max(-5, Math.min(5, v))), color: '--c-ref', dash: [4, 3], label: 'without C' }); }
        plots.step.draw({ xlim: [0, T], series: ss });
      },
      theme() {
        for (const k of [helix, ghost, nyq, mir, unit, axes, zaxis, drop, margin, wallMag, wallPh, wallGrid, bMag, bPh, bAs, bGrid, bZero]) k.theme();
        bDot.material.color.set(ctx.cssVar('--c-B')); pDot.material.color.set(ctx.cssVar('--c-E'));
        minus1.material.color.set(ctx.cssVar('--c-north')); dot.material.color.set(ctx.cssVar('--accent')); sdot.material.color.set(ctx.cssVar('--accent'));
      },
    };
  },
};
