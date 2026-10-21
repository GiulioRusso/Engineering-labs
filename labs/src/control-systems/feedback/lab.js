// Feedback: unity feedback around K·G(s). Steady-state error by system type and input; the root locus.
import * as THREE from 'three';
import { createSPlane, SX, SY, VIEW3D, camOf } from '../splane.js';
import { roots, polyscale, closedLoop, errorTF, simulate, step, stepInfo, polyadd } from '../tf.js';
import { TYPES, PLANTS, INPUT, ssError } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const cpx = ([x, y]) => (Math.abs(y) < 1e-6 ? fmt(x) : `${fmt(x)} ± ${fmt(Math.abs(y))}j`);
export default {
  id: 'feedback', title: 'Feedback', size: 3.4, timeless: true, plain: true, camOf,
  cameras: { front: { pos: [-1.7, -8, 2.2], target: [-1.7, 0, 0.6] }, side: { pos: [5, 0, 2.5], target: [-1.7, 0, 0.6] }, top: { pos: [-1.7, -0.01, 9], target: [-1.7, 0, 0] }, iso: { pos: [2.6, -6.4, 5], target: [-1.7, 0, 0.4] } },
  defaults: { kind: 'error', type: 0, input: 'step', K: 5, plant: 'p3', locus: true, view3d: false },
  cases: [
    { id: 'error', label: 'Steady-state error', set: {}, examples: [
      { id: 'gain', label: 'More gain: smaller error', set: { K: 20 } },
      { id: 't1', label: 'Type 1: no step error', set: { type: 1 } },
      { id: 'ramp1', label: 'Type 1, ramp: a finite lag', set: { type: 1, input: 'ramp' } },
      { id: 'ramp0', label: 'Type 0, ramp: falls behind', set: { input: 'ramp' } },
      { id: 'para2', label: 'Type 2, parabola', set: { type: 2, input: 'parabola' } },
    ] },
    { id: 'locus', label: 'Root locus', set: { kind: 'locus', K: 0.2 }, examples: [
      { id: 'meet', label: 'K ≈ 0.63: the poles meet', set: { K: 0.631 } },
      { id: 'under', label: 'K = 2: oscillatory', set: { K: 2 } },
      { id: 'edge', label: 'K = 12: on the jω axis', set: { K: 12 } },
      { id: 'unstable', label: 'K = 20: unstable', set: { K: 20 } },
      { id: 'zero', label: 'A zero pulls the locus left', set: { plant: 'zero', K: 10 } },
      { id: 'two', label: 'Two poles: never unstable', set: { plant: 'p2', K: 50 } },
    ] },
  ],
  controls: [
    { title: 'Loop', items: [
      { id: 'type', label: 'Plant type', type: 'segmented', options: [[0, 'Type 0'], [1, 'Type 1'], [2, 'Type 2']], show: (s) => s.kind === 'error' },
      { id: 'input', label: 'Input', type: 'segmented', options: [['step', 'Step'], ['ramp', 'Ramp'], ['parabola', 'Parabola']], show: (s) => s.kind === 'error' },
      { id: 'plant', label: 'Plant G(s)', type: 'select', options: Object.entries(PLANTS).map(([k, v]) => [k, v.label]), show: (s) => s.kind === 'locus' },
      { type: 'readout', label: 'G(s)', value: (s) => (s.kind === 'error' ? TYPES[s.type].label : PLANTS[s.plant].label) },
      { id: 'K', label: 'Gain K', unit: '', min: 0.01, max: 100, log: true },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'locus', label: 'Root locus', type: 'check', color: '--c-E', show: (s) => s.kind === 'locus' }, VIEW3D] }],
  plots: [{ id: 'y', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'cl', label: 'closed-loop poles' }, { id: 'a', label: '' }, { id: 'b', label: '' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, hud, plots } = ctx;
    const sp = createSPlane(ctx);
    const pts = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 3, sizeAttenuation: false }));
    pts.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 400 * 3), 3)); pts.frustumCulled = false; scene.add(pts);
    const cl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial(), 4); scene.add(cl);
    const m4 = new THREE.Matrix4();
    let locusKey = '';

    return {
      changed(id) { sp.view(state.view3d); if (id === 'view3d') ctx.stage.preset(camOf(state)); },
      update() {
        const G = state.kind === 'error' ? TYPES[state.type] : PLANTS[state.plant], L = { num: polyscale(G.num, state.K), den: G.den }, T = closedLoop(L);
        const P = roots(T.den), unstable = P.some((p) => p[0] > 1e-9);
        sp.setTF(state.kind === 'locus' ? G : T);
        if (state.kind === 'locus') sp.marks(G.poles, G.zeros); else sp.marks(P);
        P.forEach((p, i) => { m4.makeTranslation(p[0], p[1], 0.05); cl.setMatrixAt(i, m4); }); cl.count = state.kind === 'locus' ? P.length : 0; cl.instanceMatrix.needsUpdate = true;
        // the locus: closed-loop roots for K over six decades
        pts.visible = state.kind === 'locus' && state.locus;
        if (state.kind === 'locus' && locusKey !== state.plant) {
          locusKey = state.plant; const A = pts.geometry.attributes.position; let c = 0;
          for (let i = 0; i < 400; i++) { const k = 1e-3 * 1e6 ** (i / 399); for (const r of roots(polyadd(G.den, polyscale(G.num, k)))) if (c < 1200 && r[0] > SX[0] && r[0] < SX[1] && Math.abs(r[1]) < SY[1]) A.setXYZ(c++, r[0], r[1], 0.006); }
          A.needsUpdate = true; pts.geometry.setDrawRange(0, c);
        }
        hud.set('cl', P.map(cpx).join(', '));
        if (state.kind === 'error') {
          const u = INPUT[state.input], Tt = 20, y = simulate(T, u, Tt, 5e-3), e = simulate(errorTF(L), u, Tt, 5e-3), ef = e.y[e.y.length - 1], want = ssError(state.type, state.input, state.K);
          const t = Array.from(y.t), r = t.map(u);
          hud.set('a', `type ${state.type}, ${state.input} input`); hud.set('b', `steady-state error ${fmt(want)} (formula)`);
          hud.set('chk', Number.isFinite(want) ? `simulated e(${Tt} s) = ${fmt(ef)} ${Math.abs(ef - want) < 0.02 + 0.02 * want ? '✓' : ''}` : `simulated e grows: ${fmt(ef)} at ${Tt} s`, Number.isFinite(want) ? 'good' : 'bad');
          plots.y.draw({ xlim: [0, Tt], series: [{ x: t, y: r, color: '--c-ref', dash: [4, 3], label: 'reference r' }, { x: t, y: Array.from(y.y), color: '--c-B', label: 'output y' }, { x: t, y: Array.from(e.y), color: '--c-I', label: 'error e = r − y' }] });
        } else {
          const pair = P.filter((p) => p[1] > 1e-6).sort((a, b) => b[0] - a[0])[0], z = pair ? -pair[0] / Math.hypot(...pair) : 1;
          hud.set('a', unstable ? 'a closed-loop pole crossed into the right half plane: unstable' : 'all closed-loop poles in the left half plane: stable');
          hud.set('b', pair ? `dominant pair: ζ = ${fmt(z)}` : 'all poles real: no overshoot');
          const r = step(T, unstable ? 8 : 25, 5e-3), t = Array.from(r.t), y = Array.from(r.y).map((v) => Math.max(-20, Math.min(20, v)));
          hud.set('chk', unstable ? 'step response grows' : `overshoot ${fmt(stepInfo(r).overshoot)} %`, unstable ? 'bad' : 'good');
          plots.y.draw({ xlim: [0, t[t.length - 1]], series: [{ x: t, y, color: '--c-B', label: 'closed-loop step response' }] });
        }
      },
      theme() { sp.theme(); pts.material.color.set(ctx.cssVar('--c-E')); cl.material.color.set(ctx.cssVar('--accent')); },
    };
  },
};
