// Coil: magnetic field and induction. Scene and controls around model/coil.js.
import * as THREE from 'three';
import { createFieldLines, traceBoth } from '../../lib/viz/fieldlines.js';
import { createParticles } from '../../lib/viz/particles.js';
import { createArrows } from '../../lib/viz/arrows.js';
import { createSlice } from '../../lib/viz/slice.js';
import { createVector } from '../../lib/viz/vector.js';
import { logNorm } from '../../lib/viz/colormap.js';
import { sampleStack, addStackField } from '../../lib/physics/axisym.js';
import { MU0 } from '../../lib/physics/loop.js';
import { si } from '../../lib/ui/format.js';
import { createModel, scripted, simulateDrop, BOX, DEFAULTS } from './model/coil.js';

const MODE_HINT = {
  probe: 'The coil is driven by a current. You move a small ring and see the EMF induced in the ring.',
  magnet: 'Nothing drives the coil: it is a pickup. You move a magnet and see the EMF induced in the coil.',
};
const MOTION_HINT = {
  still: 'The object stays where it is (set its position below).',
  push: 'The object slides from its start position to the coil centre in the push time.',
  drop: 'The magnet is released from rest and falls through the coil under gravity.',
  live: 'Grab the ring or the magnet in the scene and move it yourself.',
};

export default {
  id: 'coil-induction',
  title: 'Coil: magnetic field and induction',
  summary: 'Move a magnet or a ring through a coil: flux, EMF, Lenz.',
  size: 0.5,
  cameras: { front: { pos: [0, -1.25, 0.05] }, side: { pos: [1.25, 0, 0.05] }, top: { pos: [0, -0.001, 1.3] }, iso: { pos: [0.75, -0.85, 0.5] } },
  gif: { scenario: 'magnet-push' },
  defaults: {
    ...DEFAULTS, open: false, pushT: 0.15, x: 0, z: 0, motion: 'still',
    lines: true, particles: true, arrows: false, arrowField: 'B', slice: true, sliceField: 'B', sliceOrient: 'xz',
    lenz: true, forces: true, labels: true, grid: true,
  },
  scenarios: [
    { id: 'single-loop', label: 'Single loop', hint: 'One ring of current and its field.', cam: 'iso',
      set: { mode: 'probe', N: 1, R: 0.05, L: 0.002, I0: 5, f: 0, a: 0.02, x: 0.13, z: 0.12 } },
    { id: 'long-solenoid', label: 'Long solenoid', hint: 'Many turns: uniform field inside, weak outside.', cam: 'front',
      set: { mode: 'probe', N: 150, R: 0.025, L: 0.6, I0: 2, f: 0, a: 0.015, x: 0, z: 0.1 } },
    { id: 'short-coil', label: 'Short coil', hint: 'A wide, short coil: the field fringes out.', cam: 'front',
      set: { mode: 'probe', N: 12, R: 0.06, L: 0.03, I0: 4, f: 0, a: 0.02, x: 0, z: 0.09 } },
    { id: 'magnet-push', label: 'Push the magnet in', hint: 'A changing flux makes an EMF.', cam: 'iso', speed: 0.25,
      set: { mode: 'magnet', motion: 'push', N: 40, R: 0.04, L: 0.16, Rc: 0.5, pushT: 0.15, pol: 1, x: 0, z: -0.3 } },
    { id: 'magnet-still', label: 'Magnet held still', hint: 'Maximum flux, yet zero EMF.', cam: 'iso',
      set: { mode: 'magnet', N: 40, R: 0.04, L: 0.16, Rc: 0.5, pol: 1, x: 0, z: 0 } },
    { id: 'ac-coil', label: 'AC coil, nearby ring', hint: 'An alternating current induces without motion.', cam: 'iso', speed: 0.02,
      set: { mode: 'probe', N: 60, R: 0.03, L: 0.12, I0: 3, f: 50, a: 0.03, Rp: 0.05, x: 0, z: 0.12, sliceField: 'E', arrows: true, arrowField: 'E' } },
    { id: 'drop', label: 'Drop: magnetic braking', hint: 'The induced current slows the falling magnet.', cam: 'front', speed: 0.5,
      set: { mode: 'magnet', motion: 'drop', N: 200, R: 0.02, L: 0.2, Rc: 0.05, mass: 0.05, pol: 1, x: 0, z: 0.3 } },
  ],
  controls: [
    { title: 'Experiment', items: [
      { id: 'mode', label: 'What moves', type: 'segmented', options: [['probe', 'Probe ring'], ['magnet', 'Bar magnet']], hint: (s) => MODE_HINT[s.mode] },
      { id: 'motion', label: 'How it moves', type: 'segmented', options: [['still', 'Hold'], ['push', 'Push in'], ['drop', 'Drop'], ['live', 'Drag']],
        hint: (s) => (s.mode === 'probe' && s.motion === 'drop' ? 'Drop works with the magnet only.' : MOTION_HINT[s.motion]) },
    ] },
    { title: 'Coil', items: [
      { id: 'N', label: 'Turns N', unit: '', min: 1, max: 200, step: 1 },
      { id: 'R', label: 'Radius R', unit: 'cm', k: 100, min: 0.01, max: 0.08, step: 0.0005 },
      { id: 'L', label: 'Length L', unit: 'cm', k: 100, min: 0.002, max: 0.7, step: 0.001, log: true },
      { type: 'readout', label: 'Turns per metre n = N/L', value: (s) => `${(s.N / s.L).toFixed(0)} /m` },
      { id: 'I0', label: 'Current I', unit: 'A', min: 0, max: 10, step: 0.1, show: (s) => s.mode === 'probe', hint: 'Peak value when the current alternates.' },
      { id: 'f', label: 'Frequency f', unit: 'Hz', min: 0, max: 100, step: 1, show: (s) => s.mode === 'probe', hint: '0 means a steady (DC) current.' },
      { id: 'Rc', label: 'Circuit resistance', unit: 'Ω', min: 0.01, max: 100, log: true, show: (s) => s.mode === 'magnet', hint: 'Lower resistance: more induced current, stronger braking.' },
      { id: 'open', label: 'Open circuit (no current can flow)', type: 'check', show: (s) => s.mode === 'magnet', hint: 'The EMF is still there; the current and the braking are gone.' },
    ] },
    { title: 'Probe ring', show: (s) => s.mode === 'probe', items: [
      { id: 'a', label: 'Ring radius a', unit: 'cm', k: 100, min: 0.005, max: 0.05, step: 0.0005 },
      { id: 'Rp', label: 'Ring resistance', unit: 'Ω', min: 0.001, max: 10, log: true },
    ] },
    { title: 'Magnet', show: (s) => s.mode === 'magnet', items: [
      { id: 'pol', label: 'Polarity', type: 'segmented', options: [[1, 'N pole up'], [-1, 'N pole down']] },
      { id: 'Br', label: 'Strength (remanence B_r)', unit: 'T', min: 0.1, max: 1.4, step: 0.01, hint: 'About 1.2 T for a neodymium magnet.' },
      { id: 'mass', label: 'Mass', unit: 'kg', min: 0.01, max: 0.5, log: true, show: (s) => s.motion === 'drop' },
    ] },
    { title: 'Position and timing', open: false, items: [
      { id: 'x', label: 'Start x (across the axis)', unit: 'cm', k: 100, min: -0.2, max: 0.2, step: 0.001 },
      { id: 'z', label: 'Start z (along the axis)', unit: 'cm', k: 100, min: -0.35, max: 0.35, step: 0.001 },
      { id: 'pushT', label: 'Push duration', unit: 's', min: 0.05, max: 3, log: true, show: (s) => s.motion === 'push', hint: 'Faster push: bigger EMF for a shorter time.' },
    ] },
  ],
  display: [
    { title: 'Magnetic field', items: [
      { id: 'lines', label: 'Field lines', type: 'check', color: '--c-B' },
      { id: 'particles', label: 'Flowing particles (speed ∝ |B|)', type: 'check' },
      { id: 'slice', label: 'Colour slice', type: 'check', hint: 'Drag the round knob to slide it.' },
      { id: 'sliceField', label: 'Slice shows', type: 'select', options: [['B', '|B| magnetic'], ['E', '|E| induced electric']], show: (s) => s.slice },
      { id: 'sliceOrient', label: 'Slice plane', type: 'select', options: [['xz', 'along the axis'], ['xy', 'across the axis']], show: (s) => s.slice },
      { id: 'arrows', label: 'Arrow grid', type: 'check' },
      { id: 'arrowField', label: 'Arrows show', type: 'select', options: [['B', 'B'], ['E', 'E (induced)']], show: (s) => s.arrows },
    ] },
    { title: 'Annotations', open: false, items: [
      { id: 'lenz', label: 'Lenz arrows: dΦ/dt and induced B', type: 'check', color: '--c-ref' },
      { id: 'forces', label: 'Force and velocity', type: 'check', color: '--c-F' },
      { id: 'labels', label: 'Labels and axes', type: 'check' },
      { id: 'grid', label: 'Ground grid', type: 'check' },
    ] },
  ],
  plots: [
    { id: 'axis', title: 'Bz on the axis', xLabel: 'z', xUnit: 'm', yUnit: 'T' },
    { id: 'flux', title: 'Flux Φ(t)', xLabel: 't', xUnit: 's', yUnit: 'Wb' },
    { id: 'emf', title: 'EMF and induced current', xLabel: 't', xUnit: 's', yUnit: 'V', y2Unit: 'A' },
  ],
  hud: [
    { id: 'I', label: 'I coil' }, { id: 'B0', label: 'B at coil centre' }, { id: 'phi', label: 'Φ' }, { id: 'emf', label: 'EMF' },
    { id: 'iind', label: 'I induced' }, { id: 'Fz', label: 'F_z on object' }, { id: 'vz', label: 'v_z' }, { id: 'pj', label: 'Joule power' }, 'sep',
    { id: 'faraday', label: 'EMF vs −ΔΦ/Δt' }, { id: 'energy', label: 'F·v + I²R' }, { id: 'div', label: '|∇·B| / |∂B|' },
  ],
  tour: [
    { title: 'One loop of current', scenario: 'single-loop', text: 'Current in a single ring makes a field that threads the middle and curls back around the wire. The particles flow faster where the field is stronger.' },
    { title: 'Stack the loops', scenario: 'long-solenoid', text: 'Put 150 rings side by side. Inside, their fields add up to a nearly uniform B = μ0·n·I; outside they almost cancel. The model curve sits on the dashed formula.' },
    { title: 'Push the magnet in', scenario: 'magnet-push', text: 'The flux through the coil changes, so an EMF appears. The induced field (blue arrow) points against the change in flux (grey arrow): Lenz’s law.' },
    { title: 'Ten times slower', scenario: 'magnet-push', set: { pushT: 1.5, speed: 1 }, text: 'Same push, ten times slower: the EMF peak is ten times smaller but lasts ten times longer. The area under EMF(t) is the total change in flux.' },
    { title: 'Hold it still', scenario: 'magnet-still', text: 'Maximum flux, zero EMF: only a change in flux induces anything. Switch “How it moves” to Drag and move the magnet yourself.' },
    { title: 'Why the magnet is slowed down', scenario: 'drop', text: 'The induced current pushes back on the falling magnet; its kinetic energy becomes heat (F·v + I²R stays zero). Tick “Open circuit” and it falls freely.' },
  ],

  setup(ctx) {
    const { scene, stage, state, time, plots, hud, legend, label, cssVar } = ctx;
    const model = createModel();
    stage.grid.position.z = -BOX.z - 0.02;

    const mats = {
      copper: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.35, transparent: true, opacity: 0.62, depthWrite: false }),
      probe: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2 }),
      north: new THREE.MeshStandardMaterial({ roughness: 0.7 }), south: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
    };
    const coilGroup = new THREE.Group(); scene.add(coilGroup);
    let coilMesh = null, coilCurve = null;
    const coilLabel = label('coil'); scene.add(coilLabel);
    const probe = new THREE.Group(); scene.add(probe);
    const probeMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 1, 8, 72), mats.probe); probe.add(probeMesh);
    const probeHit = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.02, 32), new THREE.MeshBasicMaterial({ visible: false }));
    probeHit.rotation.x = Math.PI / 2; probe.add(probeHit);
    const probeLabel = label('probe ring'); probe.add(probeLabel);
    const magnet = new THREE.Group(); scene.add(magnet);
    const magTop = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), mats.north), magBot = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), mats.south);
    for (const m of [magTop, magBot]) { m.rotation.x = Math.PI / 2; magnet.add(m); }
    const nLabel = label('N'), sLabel = label('S'); magnet.add(nLabel, sLabel);

    const carriers = (n, parent) => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
      const pts = new THREE.Points(geom, new THREE.PointsMaterial({ size: 4.5, sizeAttenuation: false, depthTest: false }));
      pts.frustumCulled = false; pts.renderOrder = 2; parent.add(pts);
      return { pts, u: 0, n };
    };
    const coilCarriers = carriers(1300, scene), probeCarriers = carriers(48, probe);
    const fArrow = createVector(scene, '--c-F', 'F'), vArrow = createVector(scene, '--c-v', 'v');
    const dphiArrow = createVector(scene, '--c-ref', 'dΦ/dt'), bindArrow = createVector(scene, '--c-B', 'B ind');
    const lines = createFieldLines(stage), parts = createParticles(stage, { count: 700, size: 2.6 });
    const arrows = createArrows(stage, 800);
    const slice = createSlice(stage, { w: 2 * BOX.rho, h: 2 * BOX.z, res: [120, 160] });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.5 }));
    scene.add(knob);

    let timeline = null, drop = null, snap = null, lineRange = [1e-6, 1], linesKey = '', frameNo = 0, sliceDirty = true, arrowsDirty = true;
    let maxima = { emf: 1e-9, I: 1e-9, F: 1e-12, v: 1e-3, phi: 1e-15 };
    const live = { pos: [0, 0, 0], vel: [0, 0, 0], prev: null, hist: [] };
    let normB = logNorm(1e-6, 1), normE = logNorm(1e-6, 1);
    const b3 = [0, 0, 0], e3 = [0, 0, 0];
    const tube = () => Math.max(0.0005, Math.min(state.N > 1 ? 0.4 * state.L / state.N : 0.0025, 0.0025));

    function rebuildCoilMesh() {
      const { N, R, L } = state;
      if (coilMesh) { coilGroup.remove(coilMesh); coilMesh.geometry.dispose(); }
      coilCurve = new (class extends THREE.Curve {
        getPoint(u, o = new THREE.Vector3()) { const th = 2 * Math.PI * N * u; return o.set(R * Math.cos(th), R * Math.sin(th), N === 1 ? 0 : -L / 2 + L * u); }
      })();
      coilMesh = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, Math.min(6000, Math.max(96, N * 28)), tube(), 6, false), mats.copper);
      coilGroup.add(coilMesh);
      coilLabel.position.set(R + 0.03, 0, N === 1 ? 0.02 : L / 2 + 0.02);
    }

    // equal-flux seeds on the source mid-plane: Φ(r) = 2πr·A(r, 0), so line density follows |B|
    function seeds(T, radius) {
      const tmp = { Br: 0, Bz: 0, A: 0 }, phi = (r) => (sampleStack(T, r, 0, tmp), 2 * Math.PI * r * tmp.A);
      let rmax = radius, best = 0;
      for (let r = radius * 0.02; r < radius * 2; r += radius * 0.01) { const p = phi(r); if (p > best) { best = p; rmax = r; } }
      const out = [];
      for (const frac of [0.08, 0.3, 0.55, 0.78, 0.94]) {
        let lo = 0, hi = rmax;
        for (let k = 0; k < 40; k++) { const mid = 0.5 * (lo + hi); phi(mid) < frac * best ? (lo = mid) : (hi = mid); }
        const r = 0.5 * (lo + hi);
        for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; out.push([r * Math.cos(a), r * Math.sin(a), 0]); }
      }
      return out;
    }
    function rebuildLines() {
      const key = state.mode === 'probe' ? `c${state.N},${state.R},${state.L}` : `m${state.Br},${state.pol}`;
      if (key === linesKey) return;
      linesKey = key;
      const T = state.mode === 'probe' ? model.coil : model.magnet, I = state.mode === 'probe' ? 1 : model.magnetRingCurrent();
      const field = (x, y, z, b) => { b[0] = b[1] = b[2] = 0; addStackField(T, I, 0, 0, 0, x, y, z, b); return Math.hypot(b[0], b[1], b[2]); };
      const inside = (x, y, z) => Math.hypot(x, y) < BOX.rho + 0.05 && Math.abs(z) < BOX.z + 0.05;
      const t0 = performance.now();
      const L = seeds(T, state.mode === 'probe' ? state.R : model.p.rm).map((s) => traceBoth(field, s, { hMin: 2e-4, hMax: 0.01, tol: 2e-4, maxLen: 2.5, inside }));
      ctx.timings.lines = performance.now() - t0;
      lines.set(L); parts.setLines(L);
      // colours span the 2nd–97th percentile of |B| along the lines (the top few % sit on the ring currents)
      const all = L.flatMap((l) => l.mags).filter((m) => m > 0).sort((a, b) => a - b);
      lineRange = all.length ? [all[Math.floor(0.02 * all.length)], all[Math.floor(0.97 * (all.length - 1))]] : [1e-6, 1];
    }
    const bRange = () => { const k = state.mode === 'probe' ? Math.max(Math.abs(state.I0), 1e-3) : 1; return [lineRange[0] * k, lineRange[1] * k]; };
    const bRef = () => Math.sqrt(bRange()[0] * bRange()[1]);
    const eRef = () => (state.mode === 'probe'
      ? Math.max(1e-9, 2 * Math.PI * (state.f || 0) * Math.abs(state.I0) * MU0 * state.N / Math.max(state.L, 2 * state.R) * state.R / 2)
      : Math.max(1e-9, (maxima.v || 0.5) * state.Br / 2 * model.p.rm));

    function kinAt(tt) {
      if (state.motion === 'push') return scripted({ x: state.x, z0: state.z, z1: 0, t0: 0.2, T: state.pushT })(tt);
      if (state.motion === 'drop' && drop) {
        const i = Math.min(drop.t.length - 2, Math.max(0, Math.floor(tt / drop.dt))), u = Math.min(1, (tt - drop.t[i]) / drop.dt);
        return { pos: [state.x, 0, drop.z[i] + u * (drop.z[i + 1] - drop.z[i])], vel: [0, 0, drop.v[i] + u * (drop.v[i + 1] - drop.v[i])] };
      }
      if (state.motion === 'live') return { pos: [...live.pos], vel: [...live.vel] };
      return { pos: [state.x, 0, state.z], vel: [0, 0, 0] };
    }

    function buildTimeline() {
      time.live = state.motion === 'live';
      drop = state.motion === 'drop' ? simulateDrop(model, { x: state.x, z0: state.z, tEnd: 1.6 }) : null;
      let D = 2;
      if (state.motion === 'push') D = 0.2 + state.pushT + 0.5;
      else if (state.motion === 'drop') D = drop.t[drop.t.length - 1];
      else if (state.mode === 'probe' && state.f) D = 3 / state.f;
      ctx.setDuration(D);
      if (time.live) { timeline = null; return; }
      const n = 400, T = new Float64Array(n), phi = new Float64Array(n), emf = new Float64Array(n), iInd = new Float64Array(n);
      maxima = { emf: 1e-9, I: 1e-9, F: 1e-12, v: 1e-6, phi: 1e-15 };
      for (let i = 0; i < n; i++) {
        T[i] = D * i / (n - 1);
        const k = kinAt(T[i]), s = model.evaluate({ t: T[i], ...k });
        phi[i] = s.phi; emf[i] = s.emf; iInd[i] = s.iInd;
        maxima.emf = Math.max(maxima.emf, Math.abs(s.emf)); maxima.I = Math.max(maxima.I, Math.abs(s.iInd));
        maxima.F = Math.max(maxima.F, Math.hypot(...s.F)); maxima.v = Math.max(maxima.v, Math.hypot(...k.vel));
      }
      timeline = { t: T, phi, emf, iInd };
    }

    function refreshLegend() {
      const [blo, bhi] = bRange();
      normB = logNorm(blo, bhi); normE = logNorm(eRef() / 1000, eRef() * 3);
      const showE = state.slice && state.sliceField === 'E';
      legend.set({
        title: showE ? '|E| slice' : '|B| lines and slice', map: showE ? 'magma' : 'viridis',
        lo: showE ? eRef() / 1000 : blo, hi: showE ? eRef() * 3 : bhi, unit: showE ? 'V/m' : 'T',
        swatches: [
          { color: '--c-I', label: 'charge carriers (speed ∝ I)' },
          ...(state.forces ? [{ color: '--c-F', label: 'force on object' }, { color: '--c-v', label: 'velocity' }] : []),
          ...(state.lenz ? [{ color: '--c-ref', label: 'dΦ/dt' }, { color: '--c-B', label: 'induced B (Lenz)' }] : []),
        ],
      });
    }

    function placeKnob() {
      if (slice.orientation === 'xz') knob.position.set(BOX.rho, slice.offset, BOX.z);
      else knob.position.set(BOX.rho, BOX.rho, slice.offset);
    }
    function placeStatic() {
      const pr = state.mode === 'probe';
      probe.visible = pr; magnet.visible = !pr;
      probeMesh.geometry.dispose(); probeMesh.geometry = new THREE.TorusGeometry(state.a, 0.0018, 8, 72);
      probeHit.scale.set(state.a, 1, state.a);
      probeLabel.position.set(state.a + 0.02, 0, 0.012);
      const { rm, lm } = model.p, nUp = state.pol > 0;
      for (const [m, up] of [[magTop, true], [magBot, false]]) { m.scale.set(rm, lm / 2, rm); m.position.z = (up ? 1 : -1) * lm / 4; m.material = up === nUp ? mats.north : mats.south; }
      nLabel.position.set(0, 0, (nUp ? 1 : -1) * (lm / 2 + 0.012)); sLabel.position.set(0, 0, (nUp ? -1 : 1) * (lm / 2 + 0.012));
      lines.object.visible = state.lines; parts.object.visible = state.particles;
      arrows.mesh.visible = state.arrows; slice.mesh.visible = state.slice; knob.visible = state.slice;
      stage.grid.visible = state.grid; stage.axes.visible = state.labels;
      for (const o of [coilLabel, probeLabel, nLabel, sLabel]) o.visible = state.labels;
      slice.place(state.sliceOrient, slice.offset ?? 0); placeKnob();
      sliceDirty = arrowsDirty = true;
    }

    function placeCarriers() {
      const N = state.N, a = coilCarriers.pts.geometry.attributes.position, n = Math.min(coilCarriers.n, Math.max(23, Math.round(N * 6.37))), v = new THREE.Vector3(), off = tube() * 1.4;
      for (let i = 0; i < n; i++) {
        coilCurve.getPoint((((i + 0.5) / n + coilCarriers.u) % 1 + 1) % 1, v);
        const r = Math.hypot(v.x, v.y), f = (r + off) / r;
        a.setXYZ(i, v.x * f, v.y * f, v.z);
      }
      coilCarriers.pts.geometry.setDrawRange(0, n); a.needsUpdate = true;
      const p = probeCarriers.pts.geometry.attributes.position, ra = state.a + 0.003;
      for (let i = 0; i < probeCarriers.n; i++) { const th = 2 * Math.PI * ((i / probeCarriers.n + probeCarriers.u) % 1); p.setXYZ(i, ra * Math.cos(th), ra * Math.sin(th), 0); }
      p.needsUpdate = true;
    }

    const fieldMag = (kind, x, y, z) => { const v = kind === 'E' ? model.efield(x, y, z, snap, e3) : model.field(x, y, z, snap, b3); return Math.hypot(v[0], v[1], v[2]); };
    function drawArrowGrid() {
      const items = [], E = state.arrowField === 'E';
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) for (let k = -4; k <= 4; k++) {
        const x = i * 0.045, y = j * 0.045, z = k * 0.08;
        items.push({ p: [x, y, z], v: E ? model.efield(x, y, z, snap, [0, 0, 0]) : model.field(x, y, z, snap, [0, 0, 0]) });
      }
      const norm = E ? normE : normB;
      arrows.set(items, { len: (m) => 0.008 + 0.03 * norm(m), width: 0.013, map: E ? 'magma' : 'viridis', norm });
    }

    function drawPlots() {
      const n = 160, zs = new Float64Array(n), m1 = new Float64Array(n), ref = new Float64Array(n), pr = state.mode === 'probe';
      for (let i = 0; i < n; i++) {
        const z = zs[i] = -BOX.z + 2 * BOX.z * i / (n - 1);
        b3[2] = 0;
        if (pr) { addStackField(model.coil, state.I0, 0, 0, 0, 0, 0, z, b3); m1[i] = b3[2]; ref[i] = model.solenoidAxis(z, state.I0); }
        else {
          addStackField(model.magnet, model.magnetRingCurrent(), 0, 0, snap.pos[2], snap.pos[0], 0, z, b3); m1[i] = b3[2];
          const d = Math.abs(z - snap.pos[2]);
          ref[i] = d > model.p.lm && !snap.pos[0] ? MU0 * model.magnetMoment() / (2 * Math.PI * d ** 3) : NaN;
        }
      }
      plots.axis.draw({ xlim: [-BOX.z, BOX.z], shade: [-state.L / 2, state.L / 2], cursor: snap.pos[2], series: [
        { x: zs, y: m1, color: '--c-B', label: pr ? 'model (peak I)' : 'magnet' },
        { x: zs, y: ref, color: '--ink', dash: [3, 4], width: 1.3, label: pr ? 'continuous formula' : 'dipole' }] });
      let T, phi, emf, iInd, xlim;
      if (timeline) { ({ t: T, phi, emf, iInd } = timeline); xlim = [0, time.D]; }
      else { const h = live.hist; T = h.map((r) => r[0]); phi = h.map((r) => r[1]); emf = h.map((r) => r[2]); iInd = h.map((r) => r[3]); xlim = [Math.max(0, time.t - 3), Math.max(3, time.t)]; }
      plots.flux.draw({ xlim, cursor: time.t, series: [{ x: T, y: phi, color: '--c-B', label: pr ? 'through the ring' : 'through the coil' }] });
      plots.emf.draw({ xlim, cursor: time.t, series: [{ x: T, y: emf, color: '--c-E', label: 'EMF' }, { x: T, y: iInd, color: '--c-I', dash: [5, 3], axis: 1, label: 'I induced' }] });
    }

    function drawHud(s, k) {
      hud.set('I', si(s.iCoil, 'A'));
      model.field(0, 0, 0, snap, b3); hud.set('B0', si(b3[2], 'T'));
      hud.set('phi', si(s.phi, 'Wb')); hud.set('emf', si(s.emf, 'V')); hud.set('iind', si(s.iInd, 'A'));
      hud.set('Fz', si(s.F[2], 'N')); hud.set('vz', si(k.vel[2], 'm/s')); hud.set('pj', si(s.pJoule, 'W'));
      let fd = NaN;
      if (timeline) { const h = 1e-5, t = time.t; fd = -(model.evaluate({ t: t + h, ...kinAt(t + h) }).phi - model.evaluate({ t: t - h, ...kinAt(t - h) }).phi) / (2 * h); }
      else if (live.hist.length > 2) { const [p, q] = live.hist.slice(-2); fd = -(q[1] - p[1]) / (q[0] - p[0] || 1); }
      const ok = Math.abs(fd - s.emf) <= 0.02 * Math.max(Math.abs(s.emf), maxima.emf * 1e-3);
      hud.set('faraday', `${si(fd, 'V')} ${ok ? '✓' : '≠'}`, ok ? 'good' : 'bad');
      hud.show('energy', state.mode === 'magnet');
      const res = s.pMech + s.pJoule;
      hud.set('energy', `${si(res, 'W', 2)} ✓`, Math.abs(res) <= 1e-9 * Math.max(s.pJoule, 1e-12) ? 'good' : 'bad');
      const [x, y, z] = [k.pos[0] + 0.018, k.pos[1] + 0.011, k.pos[2] + 0.02], hh = 1e-3, B = (a, b, c) => model.field(a, b, c, snap, [0, 0, 0]);
      const d = [B(x + hh, y, z)[0] - B(x - hh, y, z)[0], B(x, y + hh, z)[1] - B(x, y - hh, z)[1], B(x, y, z + hh)[2] - B(x, y, z - hh)[2]];
      const rel = Math.abs(d[0] + d[1] + d[2]) / (Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]) || 1);
      hud.set('div', `${(rel * 100).toFixed(2)} %`, rel < 0.03 ? 'good' : 'bad');
    }

    function highlightNow() {
      const k = ctx.highlight;
      mats.copper.emissive.set(k === 'coil' ? 0x553311 : 0x000000);
      lines.object.material.linewidth = k === 'lines' ? 3.4 : 2.2;
      mats.probe.emissive.set(k === 'pickup' ? 0x334455 : 0x000000);
      for (const m of [mats.north, mats.south]) m.emissive.set(k === 'pickup' ? 0x222222 : 0x000000);
      if (k === 'lenz' && !state.lenz) { state.lenz = true; placeStatic(); }
      if (k === 'efield' && state.sliceField !== 'E') { state.sliceField = 'E'; state.slice = true; placeStatic(); refreshLegend(); }
    }

    // drag the ring or the magnet: switches to live motion, velocity from the pointer
    const dragObj = {
      axes: 'xz', hint: 'Drag to move it along or across the axis — the EMF follows your speed',
      get: () => [...(state.motion === 'live' ? live.pos : kinAt(time.t).pos)],
      set: (p) => {
        p[0] = Math.max(-0.2, Math.min(0.2, p[0])); p[2] = Math.max(-0.35, Math.min(0.35, p[2]));
        live.pos = [p[0], 0, p[2]];
        ctx.requestUpdate();
      },
      onStart: () => {
        if (state.motion !== 'live') {
          live.pos = kinAt(time.t).pos; live.prev = [...live.pos]; live.vel = [0, 0, 0]; live.hist = [];
          state.motion = 'live'; time.t = 0; buildTimeline();
          maxima = { emf: 1e-9, I: 1e-9, F: 1e-12, v: 1e-3, phi: 1e-15 };
        }
        ctx.setPlaying(true);
      },
      onEnd: () => { state.x = live.pos[0]; state.z = live.pos[2]; },
    };
    ctx.handles.add({ ...dragObj, object: probe });
    ctx.handles.add({ ...dragObj, object: magnet });
    ctx.handles.add({
      object: knob, hint: 'Drag to slide the colour slice', get axes() { return slice.orientation === 'xz' ? 'y' : 'z'; },
      get: () => knob.position.toArray(),
      set: (p) => {
        const i = slice.orientation === 'xz' ? 1 : 2, lim = i === 1 ? BOX.rho : BOX.z;
        slice.place(slice.orientation, Math.max(-lim, Math.min(lim, p[i]))); placeKnob(); sliceDirty = arrowsDirty = true; ctx.requestUpdate();
      },
    });

    return {
      changed(id) {
        if (state.mode === 'probe' && state.motion === 'drop') state.motion = 'still';
        if (id === '*') { slice.offset = 0; live.hist = []; }
        model.configure({ ...Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, state[k]])), Rc: state.open ? Infinity : state.Rc });
        rebuildCoilMesh(); rebuildLines();
        if (!['lines', 'particles', 'slice', 'sliceField', 'sliceOrient', 'arrows', 'arrowField', 'lenz', 'forces', 'labels', 'grid', 'restart'].includes(id)) buildTimeline();
        placeStatic(); refreshLegend(); highlightNow();
      },
      highlight() { highlightNow(); },
      update(dt) {
        if (state.motion === 'live' && dt > 0) {
          const a = 1 - Math.exp(-dt / 0.06);
          const raw = live.prev ? live.pos.map((p, i) => (p - live.prev[i]) / Math.max(dt, 1e-3)) : [0, 0, 0];
          live.vel = live.vel.map((v, i) => v + a * (raw[i] - v));
          live.prev = [...live.pos];
        }
        const t = time.t, k = kinAt(t), s = model.evaluate({ t, ...k }), drive = model.drive(t);
        snap = { ...k, t, iCoil: s.iCoil, iProbe: s.iProbe, dI: state.mode === 'probe' ? drive.dI : 0 };
        if (state.motion === 'live' && dt > 0) {
          live.hist.push([t, s.phi, s.emf, s.iInd]);
          while (live.hist.length && live.hist[0][0] < t - 3) live.hist.shift();
          for (const [key, v] of [['emf', Math.abs(s.emf)], ['I', Math.abs(s.iInd)], ['F', Math.hypot(...s.F)], ['v', Math.hypot(...k.vel)]])
            maxima[key] = Math.max(maxima[key] * 0.995, v, 1e-12);
        }
        const pos = k.pos;
        probe.position.set(...pos); magnet.position.set(...pos);
        const src = state.mode === 'magnet' ? pos : [0, 0, 0];
        lines.object.position.set(...src); parts.object.position.set(...src);
        const iSrc = state.mode === 'probe' ? drive.I / Math.max(Math.abs(state.I0), 1e-9) : 1;
        if (time.playing && dt > 0) {
          parts.advance(dt, 0.06 * iSrc, state.mode === 'probe' ? bRef() / Math.max(Math.abs(state.I0), 1e-9) : bRef());
          coilCarriers.u += dt * 0.25 * (state.mode === 'probe' ? iSrc : s.iCoil / maxima.I) / Math.max(1, state.N);
          probeCarriers.u += dt * 0.25 * (s.iProbe / maxima.I);
        }
        lines.color('viridis', normB, state.mode === 'probe' ? Math.abs(drive.I) : 1);
        placeCarriers();
        const vmag = Math.hypot(...k.vel), fmag = Math.hypot(...s.F);
        fArrow.set([pos[0] + 0.03, pos[1], pos[2]], s.F, state.forces ? 0.12 * Math.sqrt(fmag / maxima.F) : 0);
        vArrow.set([pos[0] - 0.03, pos[1], pos[2]], k.vel, state.forces ? 0.12 * Math.sqrt(vmag / maxima.v) : 0);
        const pc = state.mode === 'probe' ? pos : [0, 0, 0], rel = Math.abs(s.emf) / maxima.emf, on = state.lenz && rel > 0.02;
        dphiArrow.set([pc[0] + 0.012, pc[1], pc[2]], [0, 0, Math.sign(-s.emf)], on ? 0.1 * Math.sqrt(rel) : 0);
        const iInd = state.mode === 'probe' ? s.iProbe : s.iCoil;
        bindArrow.set([pc[0] - 0.012, pc[1], pc[2]], [0, 0, Math.sign(iInd) || 1], on && iInd ? 0.1 * Math.sqrt(Math.abs(iInd) / maxima.I) : 0);
        const moving = time.playing && (vmag > 0 || (state.mode === 'probe' && state.f));
        if (moving && frameNo % 3 === 0) sliceDirty = arrowsDirty = true;
        if (state.slice && sliceDirty) {
          const E = state.sliceField === 'E';
          slice.compute((x, y, z) => fieldMag(state.sliceField, x, y, z), E ? 'magma' : 'viridis', E ? normE : normB);
          sliceDirty = false;
        }
        if (state.arrows && arrowsDirty) { drawArrowGrid(); arrowsDirty = false; }
        if (frameNo % 2 === 0 || !time.playing) { drawPlots(); drawHud(s, k); }
        frameNo++;
      },
      theme() {
        mats.copper.color.set(cssVar('--copper')); mats.probe.color.set(cssVar('--c-ref'));
        mats.north.color.set(cssVar('--c-north')); mats.south.color.set(cssVar('--c-south'));
        coilCarriers.pts.material.color.set(cssVar('--c-I')); probeCarriers.pts.material.color.set(cssVar('--c-I'));
        parts.material.color.set(cssVar('--ink')); parts.material.opacity = 0.7;
        knob.material.color.set(cssVar('--accent'));
        for (const a of [fArrow, vArrow, dphiArrow, bindArrow]) a.theme();
        refreshLegend();
      },
    };
  },
};
