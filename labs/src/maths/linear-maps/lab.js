// Linear maps: a 3×3 matrix deforms the unit cube; eigenvectors and the determinant as a volume.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { createKnob } from '../../lib/viz/knob.js';
import { cols, apply, det, eigenvalues, eigenvector } from './model.js';

const I = { a11: 1, a12: 0, a13: 0, a21: 0, a22: 1, a23: 0, a31: 0, a32: 0, a33: 1 };
const rot = (a) => ({ ...I, a11: Math.cos(a), a12: -Math.sin(a), a21: Math.sin(a), a22: Math.cos(a) });
const CORNERS = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
const FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
const entry = (r, c) => ({ id: `a${r}${c}`, label: `a${'₀₁₂₃'[r]}${'₀₁₂₃'[c]}`, unit: '', min: -2.5, max: 2.5, step: 0.01 });

export default {
  id: 'linear-maps', title: 'Linear maps on the unit cube', size: 1.6, duration: 4,
  cameras: { front: { pos: [0.4, -5, 0.6], target: [0.4, 0.4, 0.4] }, side: { pos: [5, 0.4, 0.6], target: [0.4, 0.4, 0.4] }, top: { pos: [0.4, 0.39, 5], target: [0.4, 0.4, 0.4] }, iso: { pos: [3.2, -3.4, 2.6], target: [0.4, 0.4, 0.4] } },
  defaults: { ...I, morph: true, eigen: true, ghost: true },
  cases: [
    { id: 'stretch', label: 'Stretch', controls: ['a11', 'a22', 'a33'], set: { ...I, a11: 1.8, a22: 0.6, a33: 1.2 }, examples: [
      { id: 'identity', label: 'Identity: nothing moves', set: { a11: 1, a22: 1, a33: 1 } },
      { id: 'uniform', label: 'Uniform ×1.5', set: { a11: 1.5, a22: 1.5, a33: 1.5 } },
      { id: 'squash', label: 'Squash one axis', set: { a11: 1, a22: 1, a33: 0.3 } },
    ] },
    { id: 'rotation', label: 'Rotation', controls: [], set: rot(0.8), examples: [
      { id: 'r90', label: '90°', set: rot(Math.PI / 2) },
      { id: 'r180', label: '180°', set: rot(Math.PI) },
    ] },
    { id: 'shear', label: 'Shear', controls: ['a12', 'a13', 'a23'], set: { ...I, a12: 1 }, examples: [
      { id: 'small', label: 'Gentle shear', set: { a12: 0.4 } },
      { id: 'two', label: 'Shear along z', set: { a12: 0, a13: 0.6, a23: 0.6 } },
    ] },
    { id: 'reflection', label: 'Reflection', controls: ['a11', 'a22', 'a33'], set: { ...I, a11: -1 }, examples: [
      { id: 'floor', label: 'Mirror in the floor', set: { a11: 1, a33: -1 } },
      { id: 'point', label: 'Through the origin: −I', set: { a11: -1, a22: -1, a33: -1 } },
    ] },
    { id: 'projection', label: 'Projection', controls: ['a13', 'a23', 'a33'], set: { ...I, a33: 0, a13: 0.4, a23: 0.3 }, examples: [
      { id: 'floor', label: 'Straight onto the floor', set: { a13: 0, a23: 0 } },
      { id: 'line', label: 'Onto a line: rank 1', set: { a22: 0, a13: 0, a23: 0 } },
    ] },
    { id: 'general', label: 'Any', set: { a11: 1.5, a12: 0.5, a13: 0.2, a21: 0.5, a22: 1, a23: 0.4, a31: 0.2, a32: 0.4, a33: 0.7 }, examples: [
      { id: 'inverse', label: 'Undo it: the inverse', set: { a11: 0.8, a12: -0.4, a13: 0, a21: -0.4, a22: 1.496, a23: -0.741, a31: 0, a32: -0.741, a33: 1.852 } },
    ] },
  ],
  controls: [
    { title: 'Matrix', items: [
      { type: 'readout', label: 'det A (volume)', value: (s) => det(cols(s)).toFixed(3) },
      { type: 'readout', label: 'trace', value: (s) => (s.a11 + s.a22 + s.a33).toFixed(3) },
    ] },
    { title: 'Column 1', items: [entry(1, 1), entry(2, 1), entry(3, 1)] },
    { title: 'Column 2', items: [entry(1, 2), entry(2, 2), entry(3, 2)] },
    { title: 'Column 3', items: [entry(1, 3), entry(2, 3), entry(3, 3)] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'morph', label: 'Morph from identity', type: 'check' },
    { id: 'ghost', label: 'Original cube', type: 'check', color: '--c-ref' },
    { id: 'eigen', label: 'Eigenvectors', type: 'check', color: '--c-E' },
  ] }],
  hud: [{ id: 'm1', label: 'A =' }, { id: 'm2', label: '' }, { id: 'm3', label: '' }, 'sep', { id: 'det', label: 'det A' }, { id: 'ev', label: 'eigenvalues' }],

  setup(ctx) {
    const { scene, state, time, hud, stage, label } = ctx;
    stage.grid.position.z = -0.6;
    const ghost = createCurve(stage, { max: 12, width: 1.4, color: '--c-ref', dashed: true });
    ghost.segments(EDGES.flatMap(([a, b]) => [...CORNERS[a], ...CORNERS[b]]));
    const edges = createCurve(stage, { max: 12, width: 2.4, color: '--ink' });
    const faceMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    const box = new THREE.Mesh(new THREE.BufferGeometry(), faceMat); scene.add(box);
    const pos = new Float32Array(FACES.length * 6 * 3); box.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const vecs = [createVector(scene, '--c-x', 'c₁', { radius: 0.014 }), createVector(scene, '--c-y', 'c₂', { radius: 0.014 }), createVector(scene, '--c-z', 'c₃', { radius: 0.014 })];
    const knobs = [createKnob(scene, '--c-x', 0.05), createKnob(scene, '--c-y', 0.05), createKnob(scene, '--c-z', 0.05)];
    const eig = createCurve(stage, { max: 3, width: 2.2, color: '--c-E', dashed: true });
    const eigLabels = [label(''), label(''), label('')]; for (const l of eigLabels) scene.add(l);
    const cl = (v) => Math.max(-2.5, Math.min(2.5, v));
    knobs.forEach((k, j) => ctx.handles.add({
      object: k.group, axes: 'xyz', hint: `Drag column ${j + 1}`,
      get: () => k.get(),
      set: (p) => { for (let i = 0; i < 3; i++) state[`a${i + 1}${j + 1}`] = Number(cl(p[i]).toFixed(3)); time.t = time.D / 2; ctx.requestUpdate(); ctx.panelSync(); },
    }));
    const m3 = (v) => v.toFixed(2).padStart(6);

    return {
      update() {
        const C = cols(state);
        const u = state.morph ? 0.5 - 0.5 * Math.cos(2 * Math.PI * time.t / time.D) : 1; // 0 → 1 → 0 over the loop
        const Cu = C.map((c, j) => c.map((x, i) => (1 - u) * (i === j ? 1 : 0) + u * x));
        const P = CORNERS.map((p) => apply(Cu, p));
        ghost.object.visible = state.ghost;
        edges.segments(EDGES.flatMap(([a, b]) => [...P[a], ...P[b]]));
        let o = 0;
        for (const [a, b, c, d] of FACES) for (const k of [a, b, c, a, c, d]) { pos[o++] = P[k][0]; pos[o++] = P[k][1]; pos[o++] = P[k][2]; }
        box.geometry.attributes.position.needsUpdate = true; box.geometry.computeVertexNormals();
        const dU = det(Cu);
        faceMat.color.set(ctx.cssVar(dU < 0 ? '--c-north' : '--c-B'));
        Cu.forEach((c, j) => { vecs[j].set([0, 0, 0], c, Math.hypot(...c)); knobs[j].set(c); });
        const E = eigenvalues(C), seg = [];
        eigLabels.forEach((l) => { l.visible = false; });
        if (state.eigen) E.forEach((e, k) => {
          if (Math.abs(e.im) > 1e-9) return;
          const v = eigenvector(C, e.re);
          seg.push(...v.map((x) => -1.8 * x), ...v.map((x) => 1.8 * x));
          eigLabels[k].visible = true; eigLabels[k].element.textContent = `λ = ${e.re.toFixed(2)}`; eigLabels[k].position.set(...v.map((x) => 1.9 * x));
        });
        eig.segments(seg);
        hud.set('m1', `[${m3(state.a11)} ${m3(state.a12)} ${m3(state.a13)} ]`);
        hud.set('m2', `[${m3(state.a21)} ${m3(state.a22)} ${m3(state.a23)} ]`);
        hud.set('m3', `[${m3(state.a31)} ${m3(state.a32)} ${m3(state.a33)} ]`);
        const d = det(C);
        hud.set('det', `${d.toFixed(3)}${Math.abs(d) < 1e-9 ? '  (flattened)' : d < 0 ? '  (inside out)' : ''}`);
        hud.set('ev', E.map((e) => (Math.abs(e.im) < 1e-9 ? e.re.toFixed(2) : `${e.re.toFixed(2)}${e.im < 0 ? '−' : '+'}${Math.abs(e.im).toFixed(2)}i`)).join(', '));
      },
      theme() { ghost.theme(); edges.theme(); eig.theme(); for (const v of vecs) v.theme(); for (const k of knobs) k.theme(); },
    };
  },
};
