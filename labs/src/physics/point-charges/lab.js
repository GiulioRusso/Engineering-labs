// Point charges in 3D: field lines, |E| slice with equipotential contours, Gauss's law.
import * as THREE from 'three';
import { createFieldLines, traceBoth } from '../../lib/viz/fieldlines.js';
import { createSlice } from '../../lib/viz/slice.js';
import { createKnob } from '../../lib/viz/knob.js';
import { createVector } from '../../lib/viz/vector.js';
import { logNorm } from '../../lib/viz/colormap.js';
import { si } from '../../lib/ui/format.js';
import { field, gaussFlux, EPS0, KC } from './model.js';

const BOX = 0.5, NC = 1e-9;
const charge = (i) => [
  { id: `q${i}`, label: `Charge ${i}`, unit: 'nC', k: 1e9, min: -5e-9, max: 5e-9, step: 1e-10, show: (s) => s.n >= i },
];

export default {
  id: 'point-charges', title: 'Point charges', size: 0.6,
  cameras: { front: { pos: [0, -1.6, 0.05] }, side: { pos: [1.6, 0, 0.05] }, top: { pos: [0, -0.001, 1.7] }, iso: { pos: [1, -1.15, 0.7] } },
  timeless: true,
  defaults: { n: 2, q1: 2e-9, x1: -0.15, z1: 0, q2: -2e-9, x2: 0.15, z2: 0, q3: 1e-9, x3: 0, z3: 0.2, q4: -1e-9, x4: 0, z4: -0.2, lines: true, slice: true, contours: true, gauss: false },
  cases: [
    { id: 'charges', label: 'Charges', set: { n: 1, q1: 2e-9, x1: 0, z1: 0 }, examples: [
      { id: 'neg', label: 'A negative charge', set: { q1: -2e-9 } },
      { id: 'big', label: 'More charge: more lines', set: { q1: 5e-9 } },
      { id: 'pair', label: 'Two opposite charges', set: { n: 2, q1: 2e-9, x1: -0.15, q2: -2e-9 } },
      { id: 'like', label: 'Like charges: a null point', set: { n: 2, q1: 2e-9, x1: -0.15, q2: 2e-9 } },
      { id: 'unequal', label: 'Unequal: lines escape', set: { n: 2, q1: 3e-9, x1: -0.15, q2: -1e-9 } },
      { id: 'close', label: 'Close together: a dipole', set: { n: 2, q1: 2e-9, x1: -0.04, q2: -2e-9, x2: 0.04 } },
      { id: 'four', label: 'Four charges: a quadrupole', controls: ['q1', 'q2', 'q3', 'q4'], set: { n: 4, q1: 2e-9, x1: -0.15, z1: -0.15, q2: -2e-9, x2: 0.15, z2: -0.15, q3: 2e-9, x3: 0.15, z3: 0.15, q4: -2e-9, x4: -0.15, z4: 0.15 } },
      { id: 'same', label: 'Four positive charges', controls: ['q1', 'q2', 'q3', 'q4'], set: { n: 4, q1: 2e-9, x1: -0.15, z1: -0.15, q2: 2e-9, x2: 0.15, z2: -0.15, q3: 2e-9, x3: 0.15, z3: 0.15, q4: 2e-9, x4: -0.15, z4: 0.15 } },
      { id: 'gauss', label: "Gauss's law: charge outside", controls: ['q1', 'q2'], set: { n: 2, q1: 2e-9, x1: -0.08, q2: -1e-9, x2: 0.25, gauss: true } },
      { id: 'inside', label: "Gauss's law: both inside", controls: ['q1', 'q2'], set: { n: 2, q1: 2e-9, x1: -0.05, q2: -1e-9, x2: 0.05, gauss: true } },
    ] },
  ],
  controls: [
    { title: 'Charges', items: [
      { id: 'n', label: 'Charges', unit: '', min: 1, max: 4, step: 1 },
      ...charge(1), ...charge(2), ...charge(3), ...charge(4),
    ] },
  ],
  display: [{ title: 'Field', items: [
    { id: 'lines', label: 'Field lines', type: 'check', color: '--c-E' },
    { id: 'slice', label: '|E| slice', type: 'check' },
    { id: 'contours', label: 'Equipotentials', type: 'check', show: (s) => s.slice },
    { id: 'gauss', label: 'Gauss sphere', type: 'check' },
  ] }],
  hud: [{ id: 'q', label: 'total charge' }, { id: 'E', label: '|E| at the probe' }, { id: 'V', label: 'V at the probe' }, 'sep', { id: 'flux', label: 'Gauss: flux·ε₀' }, { id: 'qin', label: '  charge inside' }],

  setup(ctx) {
    const { scene, state, hud, legend, stage } = ctx;
    const lines = createFieldLines(stage, { width: 2 });
    const slice = createSlice(stage, { w: 2 * BOX, h: 2 * BOX, res: [180, 180] });
    const mats = { pos: new THREE.MeshStandardMaterial({ roughness: 0.4 }), neg: new THREE.MeshStandardMaterial({ roughness: 0.4 }) };
    const balls = [1, 2, 3, 4].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mats.pos); const l = ctx.label(''); m.add(l); scene.add(m); return { m, l, i }; });
    const probe = createKnob(scene, '--accent', 0.012), ev = createVector(scene, '--c-E', 'E', { radius: 0.004 });
    let px = 0, pz = 0.25;
    const sphereMat = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.25 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), sphereMat); scene.add(sphere);
    const cl = (v) => Math.max(-0.42, Math.min(0.42, v));
    balls.forEach((b, j) => ctx.handles.add({ object: b.m, axes: 'xz', hint: `Drag charge ${j + 1}`, get: () => balls[j].m.position.toArray(), set: ([x, , z]) => { state[`x${j + 1}`] = cl(x); state[`z${j + 1}`] = cl(z); ctx.requestUpdate(); ctx.panelSync(); } }));
    ctx.handles.add({ object: probe.group, axes: 'xz', hint: 'Drag the probe', get: () => probe.get(), set: ([x, , z]) => { px = cl(x); pz = cl(z); ctx.requestUpdate(); } });
    const charges = () => [1, 2, 3, 4].slice(0, state.n).map((i) => ({ q: state[`q${i}`], x: state[`x${i}`], y: 0, z: state[`z${i}`] }));
    let key = '', normE = logNorm(1, 1e4), Vstep = 10;

    function rebuild(C) {
      const qmax = Math.max(...C.map((c) => Math.abs(c.q)), 1e-12), e = [0, 0, 0];
      const f = (x, y, z, b) => { field(C, x, y, z, b); for (const c of C) if (Math.hypot(x - c.x, y - c.y, z - c.z) < 0.012) return 0; return Math.hypot(b[0], b[1], b[2]); };
      const inside = (x, y, z) => Math.abs(x) < BOX && Math.abs(y) < BOX && Math.abs(z) < BOX;
      const L = [], src = C.filter((c) => c.q > 0).length ? C.filter((c) => c.q > 0) : C;
      for (const c of src) {
        const n = Math.max(4, Math.round(22 * Math.abs(c.q) / qmax));
        for (let k = 0; k < n; k++) { // Fibonacci sphere seeds, density ∝ |q|
          const u = 1 - 2 * (k + 0.5) / n, w = Math.sqrt(1 - u * u), a = k * 2.39996;
          const s = [c.x + 0.016 * w * Math.cos(a), c.y + 0.016 * w * Math.sin(a), c.z + 0.016 * u];
          L.push(traceBoth(f, s, { hMin: 1e-4, hMax: 0.01, tol: 1e-4, maxLen: 3, inside }));
        }
      }
      lines.set(L);
      const Eref = Math.hypot(...(field(C, C[0].x + 0.1, 0, C[0].z, e), e));
      normE = logNorm(Eref / 100, Eref * 30);
      Vstep = KC * qmax / 0.4 / 6; // about six contours out to 0.4 m from the largest charge
      legend.set({ title: '|E| lines and slice', map: 'magma', lo: Eref / 100, hi: Eref * 30, unit: 'V/m', swatches: [{ color: '--c-north', label: 'positive charge' }, { color: '--c-B', label: 'negative charge' }, ...(state.contours ? [{ color: '--ink', label: `equipotentials (bright rings) every ${si(Vstep, 'V', 2)}` }] : [])] });
    }

    return {
      update() {
        const C = charges();
        const k = JSON.stringify([C, state.contours]);
        if (k !== key) {
          key = k; rebuild(C);
          const e = [0, 0, 0];
          slice.compute((x, y, z) => (field(C, x, y, z, e), Math.hypot(...e)), 'magma', normE, state.contours ? (x, y, z) => {
            const V = field(C, x, y, z, e) / Vstep, d = Math.abs(V - Math.round(V));
            return d < 0.05 && Math.abs(V) < 12 ? 3 : 1; // bright thin rings where V crosses a level
          } : null);
        }
        lines.color('magma', normE, 1);
        lines.object.visible = state.lines; slice.mesh.visible = state.slice;
        balls.forEach(({ m, l, i }) => {
          const on = i <= state.n; m.visible = on;
          if (!on) return;
          const q = state[`q${i}`];
          m.scale.setScalar(0.012 + 0.006 * Math.sqrt(Math.abs(q) / NC)); m.position.set(state[`x${i}`], 0, state[`z${i}`]);
          m.material = q >= 0 ? mats.pos : mats.neg; l.element.textContent = `${q >= 0 ? '+' : '−'}${Math.abs(q / NC).toFixed(1)} nC`; l.position.set(0, 0, 2.2);
        });
        const e = [0, 0, 0], V = field(C, px, 0, pz, e);
        probe.set([px, 0, pz]); ev.set([px, 0, pz], e, 0.05 + 0.08 * normE(Math.hypot(...e)));
        hud.set('q', si(C.reduce((a, c) => a + c.q, 0), 'C'));
        hud.set('E', si(Math.hypot(...e), 'V/m')); hud.set('V', si(V, 'V'));
        sphere.visible = state.gauss; hud.show('flux', state.gauss); hud.show('qin', state.gauss);
        if (state.gauss) {
          const c0 = C[0], R = 0.14; sphere.position.set(c0.x, 0, c0.z);
          const flux = gaussFlux(C, c0.x, 0, c0.z, R, 60) * EPS0, qin = C.filter((c) => Math.hypot(c.x - c0.x, c.z - c0.z) < R).reduce((a, c) => a + c.q, 0);
          hud.set('flux', si(flux, 'C')); hud.set('qin', `${si(qin, 'C')} ${Math.abs(flux - qin) < 0.01 * Math.abs(qin || 1e-9) ? '✓' : ''}`, 'good');
        }
      },
      theme() { mats.pos.color.set(ctx.cssVar('--c-north')); mats.neg.color.set(ctx.cssVar('--c-B')); probe.theme(); ev.theme(); sphereMat.color.set(ctx.cssVar('--ink')); key = ''; },
    };
  },
};
