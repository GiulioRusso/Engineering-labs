// An electromagnetic plane wave: E and B travelling together; reflection, transmission, standing waves.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { createArrows } from '../../lib/viz/arrows.js';
import { si } from '../../lib/ui/format.js';
import { fields, fresnel, C0, ETA0 } from './model.js';

const L = 3; // the scene shows three incident wavelengths (world units = wavelengths)

export default {
  id: 'em-wave', title: 'Electromagnetic waves', size: 1.5,
  cameras: { front: { pos: [0, -4.2, 0.3] }, side: { pos: [4.5, 0, 0.3] }, top: { pos: [0, -0.01, 4.4] }, iso: { pos: [2.6, -3.2, 1.8] } },
  defaults: { mode: 'travel', f: 1e9, E0: 10, n2: 1.5, showB: true, glyphs: true },
  cases: [
    { id: 'travel', label: 'Free space', set: { mode: 'travel' }, examples: [
      { id: 'high', label: 'Ten times the frequency', set: { f: 1e10 } },
      { id: 'strong', label: 'Double the amplitude', set: { E0: 20 } },
    ] },
    { id: 'interface', label: 'Into a material', set: { mode: 'interface', n2: 1.5 }, examples: [
      { id: 'matched', label: 'n₂ = 1: no reflection', set: { n2: 1 } },
      { id: 'dense', label: 'n₂ = 4: strong reflection', set: { n2: 4 } },
    ] },
    { id: 'mirror', label: 'Mirror', set: { mode: 'conductor' } },
  ],
  controls: [
    { title: 'Wave', items: [
      { id: 'f', label: 'Frequency f', unit: 'GHz', k: 1e-9, min: 1e8, max: 1e11, log: true },
      { id: 'E0', label: 'Amplitude', unit: 'V/m', min: 1, max: 100, step: 1 },
      { id: 'n2', label: 'Index n₂', unit: '', min: 1, max: 5, step: 0.01, show: (s) => s.mode === 'interface' },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'showB', label: 'B field', type: 'check', color: '--c-B' },
    { id: 'glyphs', label: 'Arrows', type: 'check' },
  ] }],
  plots: [{ id: 'snap', title: 'Fields along x, now', xLabel: 'x', xUnit: 'm', yUnit: 'V/m' }, { id: 'power', title: 'Power balance', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'lam', label: 'λ = c/f' }, { id: 'k', label: 'k, ω' }, { id: 'ratio', label: '|E|/|B|' }, 'sep', { id: 'R', label: 'reflected R' }, { id: 'T', label: 'transmitted T' }, { id: 'sum', label: 'R + T' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.axes.visible = false;
    const eC = createCurve(stage, { max: 400, width: 2.6, color: '--c-E' }), bC = createCurve(stage, { max: 400, width: 2.6, color: '--c-B' });
    const axis = createCurve(stage, { max: 1, width: 1.4, color: '--ink-dim' });
    axis.segments([-L / 2, 0, 0, L / 2, 0, 0]);
    const eA = createArrows(stage, 80), bA = createArrows(stage, 80);
    const slabMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(L / 2, 1.4, 1.4), slabMat); slab.position.set(L / 4, 0, 0); scene.add(slab);
    const mirrorMat = new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.8 });
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.4, 1.4), mirrorMat); scene.add(mirror);
    const labels = { E: ctx.label('E'), B: ctx.label('B'), k: ctx.label('travels →'), n: ctx.label('') };
    for (const l of Object.values(labels)) scene.add(l);
    labels.k.position.set(L / 2 - 0.3, 0, -0.75); labels.n.position.set(L / 4, 0, 0.78);
    let lam = 1;

    return {
      changed() { lam = C0 / state.f; time.scale = 1 / state.f / 2; ctx.setDuration(0); },
      update() {
        const m = state.mode, t = time.t, s = 0.55 / state.E0; // world units per V/m
        slab.visible = m === 'interface'; mirror.visible = m === 'conductor';
        labels.n.element.textContent = m === 'interface' ? `n₂ = ${state.n2}` : m === 'conductor' ? 'mirror' : ''; labels.n.visible = m !== 'travel';
        const pe = [], pb = [], ge = [], gb = [], n = 300, X = [], EZ = [], CB = [];
        for (let i = 0; i <= n; i++) {
          const u = -L / 2 + L * i / n, x = u * lam;
          const [E, B] = fields(state, x, t);
          pe.push(u, 0, E * s); pb.push(u, -B * C0 * s, 0);
          X.push(x); EZ.push(E); CB.push(B * C0);
          if (i % 6 === 0) { ge.push({ p: [u, 0, E * s / 2], v: [0, 0, E] }); gb.push({ p: [u, -B * C0 * s / 2, 0], v: [0, -B, 0] }); }
        }
        eC.set(pe); bC.set(pb); bC.object.visible = bA.mesh.visible = state.showB; eA.mesh.visible = state.glyphs; bA.mesh.visible = state.glyphs && state.showB;
        eA.set(ge, { len: (q) => q * s, width: 0.05, color: ctx.cssVar('--c-E') });
        bA.set(gb, { len: (q) => q * C0 * s, width: 0.05, color: ctx.cssVar('--c-B') });
        const [E1] = fields(state, -lam, t); labels.E.position.set(-1, 0, E1 * s + 0.08 * Math.sign(E1 || 1));
        labels.B.position.set(-1.25, -fields(state, -1.25 * lam, t)[1] * C0 * s, 0.1); labels.B.visible = state.showB;
        const F = m === 'travel' ? { R: 0, T: 1 } : fresnel(1, state.n2, m === 'conductor');
        hud.set('lam', si(lam, 'm')); hud.set('k', `${si(2 * Math.PI / lam, 'rad/m')}, ${si(2 * Math.PI * state.f, 'rad/s')}`);
        const [Ea, Ba] = fields({ ...state, mode: 'travel' }, 0.1 * lam, t);
        hud.set('ratio', `${si(Math.abs(Ea / Ba), 'm/s')} = c ✓`, 'good');
        hud.set('R', `${(100 * F.R).toFixed(2)} %`); hud.set('T', `${(100 * F.T).toFixed(2)} %`); hud.set('sum', `${(F.R + F.T).toFixed(6)} ✓`, 'good');
        plots.snap.draw({ xlim: [X[0], X[X.length - 1]], ylim: [-2.2 * state.E0, 2.2 * state.E0], shade: m !== 'travel' ? [0, X[X.length - 1]] : null, series: [
          { x: X, y: EZ, color: '--c-E', label: 'E_z' }, ...(state.showB ? [{ x: X, y: CB, color: '--c-B', dash: [4, 3], label: 'c·B_y' }] : [])] });
        const I0 = state.E0 ** 2 / (2 * ETA0);
        plots.power.draw({ xlim: [0.5, 3.5], ylim: [0, 1.05], series: [{ x: [1, 1, NaN, 2, 2, NaN, 3, 3], y: [0, 1, NaN, 0, F.R, NaN, 0, F.T], color: '--c-F', width: 14, label: `incident (${si(I0, 'W/m²')}), reflected, transmitted` }] });
      },
      theme() { eC.theme(); bC.theme(); axis.theme(); slabMat.color.set(ctx.cssVar('--c-ref')); mirrorMat.color.set(ctx.cssVar('--c-ref')); },
    };
  },
};
