// Gas in a piston: atoms bouncing in a box, pressure measured from wall impacts, PV diagram.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import { cmap } from '../../lib/viz/colormap.js';
import { si } from '../../lib/ui/format.js';
import { createGas, step, temperature, readPressure, idealPressure, rescaleTo, maxwell, KB } from './model.js';

const A = 0.1, H0 = 0.1, N = 500, CYCLE = 0.05, DT = 1e-6, K = 10; // box side (m), atoms, cycle (s), step (s), world/m
const MODE_HINT = {
  adiabatic: 'Insulated walls: the piston squeezes the gas and lets it expand; watch T rise and fall.',
  isothermal: 'Walls at fixed temperature: compressing raises the pressure but not T.',
  heating: 'Fixed volume, the bottom heats the gas: pressure follows temperature.',
  manual: 'Drag the round handle on the piston yourself. Fast pushes heat the gas more.',
};

export default {
  id: 'gas-piston', title: 'Gas in a piston', size: 0.9, scrub: false,
  cameras: { front: { pos: [0.5, -2.6, 0.55], target: [0.5, 0.5, 0.55] }, side: { pos: [3, 0.5, 0.55], target: [0.5, 0.5, 0.55] }, top: { pos: [0.5, 0.49, 3], target: [0.5, 0.5, 0.5] }, iso: { pos: [2.1, -1.6, 1.6], target: [0.5, 0.5, 0.5] } },
  defaults: { mode: 'adiabatic', T0: 300, squeeze: 0.5, moles: 0.01, color: true },
  scenarios: [
    { id: 'adiabatic', label: 'Squeeze it (adiabatic)', hint: 'Work in, temperature up.', set: { mode: 'adiabatic' } },
    { id: 'isothermal', label: 'Squeeze it (isothermal)', hint: 'Heat out, temperature constant.', set: { mode: 'isothermal' } },
    { id: 'heating', label: 'Heat it', hint: 'Fixed volume: p ∝ T.', set: { mode: 'heating' } },
    { id: 'manual', label: 'Push it yourself', hint: 'Drag the piston.', set: { mode: 'manual' } },
  ],
  controls: [
    { title: 'Process', items: [
      { id: 'mode', label: 'Walls and piston', type: 'segmented', options: [['adiabatic', 'Adiabatic'], ['isothermal', 'Isothermal'], ['heating', 'Heating'], ['manual', 'By hand']], hint: (s) => MODE_HINT[s.mode] },
      { id: 'squeeze', label: 'Compress to (fraction of the volume)', unit: '', min: 0.25, max: 0.9, step: 0.01, show: (s) => s.mode === 'adiabatic' || s.mode === 'isothermal' },
    ] },
    { title: 'Gas', items: [
      { id: 'T0', label: 'Starting temperature', unit: 'K', min: 100, max: 800, step: 1 },
      { id: 'moles', label: 'Amount of gas', unit: 'mol', min: 0.002, max: 0.05, log: true, hint: 'Argon. More gas: more pressure, same temperature.' },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'color', label: 'Colour atoms by speed', type: 'check' }] }],
  plots: [{ id: 'pv', title: 'p–V diagram', xLabel: 'V', xUnit: 'm³', yUnit: 'Pa' }, { id: 'hist', title: 'Speeds', xLabel: 'v', xUnit: 'm/s', yUnit: '' }],
  hud: [{ id: 'V', label: 'volume V' }, { id: 'T', label: 'temperature T' }, { id: 'Pm', label: 'pressure (measured)' }, { id: 'Pi', label: 'NkT/V' }, 'sep', { id: 'chk', label: 'T·V^(2/3) / start' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.grid.position.z = -0.02; stage.axes.visible = false;
    const box = createCurve(stage, { max: 12, width: 1.6, color: '--ink-dim' });
    const pistonMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.4, transparent: true, opacity: 0.85 });
    const piston = new THREE.Mesh(new THREE.BoxGeometry(A * K, A * K, 0.03), pistonMat); scene.add(piston);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 12), pistonMat); rod.rotation.x = Math.PI / 2; scene.add(rod);
    const heater = new THREE.Mesh(new THREE.PlaneGeometry(A * K, A * K), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })); heater.position.set(A * K / 2, A * K / 2, 0.002); scene.add(heater);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const atoms = new THREE.Points(geo, new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true })); atoms.frustumCulled = false; scene.add(atoms);
    const knob = createKnob(scene, '--accent', 0.04);
    let G = null, simT = 0, h = H0, u = 0, hist = [], P = 0, start = null, lastRead = 0, drag = { h: H0, prevT: 0 };
    ctx.handles.add({ object: knob.group, axes: 'z', hint: 'Drag the piston', get: () => knob.get(), set: ([, , z]) => {
      if (state.mode !== 'manual') return;
      drag.h = Math.max(0.25 * H0, Math.min(1.2 * H0, z / K - 0.0)); ctx.setPlaying(true); } });

    function reset() {
      G = createGas({ N, moles: state.moles, T: state.T0, a: A, h: H0 }); simT = 0; h = H0; u = 0; hist = []; drag.h = H0;
      for (let i = 0; i < 300; i++) step(G, DT, H0, 0); readPressure(G);
      start = { T: temperature(G), V: A * A * H0, P: idealPressure(G) };
      time.t = 0;
    }
    const lidAt = (t) => H0 * (1 - (1 - state.squeeze) * (1 - Math.cos(2 * Math.PI * t / CYCLE)) / 2);

    return {
      changed(id) {
        time.live = state.mode === 'manual';
        time.scale = CYCLE / 12;
        ctx.setDuration(state.mode === 'manual' ? 0 : CYCLE);
        if (id !== 'color') reset();
      },
      update() {
        if (time.t < simT - 1e-12) reset(); // looped or restarted
        let n = 0;
        while (simT < time.t && n++ < 600) {
          let hn = h, un = 0;
          if (state.mode === 'adiabatic' || state.mode === 'isothermal') { hn = lidAt(simT + DT); un = (hn - h) / DT; }
          else if (state.mode === 'manual') { un = Math.max(-30, Math.min(30, (drag.h - h) / 2e-3)); hn = h + un * DT; }
          step(G, DT, hn, un); h = hn; u = un; simT += DT;
          if (state.mode === 'isothermal') rescaleTo(G, state.T0);
          if (state.mode === 'heating') { const target = state.T0 * (1 + 0.8 * (1 - Math.cos(2 * Math.PI * simT / CYCLE)) / 2); rescaleTo(G, target); }
          if (simT - lastRead > 5e-4 || simT < lastRead) { P = readPressure(G); lastRead = simT; hist.push([A * A * h, P, temperature(G), idealPressure(G)]); if (hist.length > 400) hist.shift(); }
        }
        // draw
        const pos = geo.attributes.position, col = geo.attributes.color, rgb = [0, 0, 0], vr = Math.sqrt(3 * KB * temperature(G) / 6.63e-26);
        for (let i = 0; i < N; i++) {
          pos.setXYZ(i, G.x[3 * i] * K, G.x[3 * i + 1] * K, G.x[3 * i + 2] * K);
          const sp = Math.hypot(G.v[3 * i], G.v[3 * i + 1], G.v[3 * i + 2]);
          if (state.color) cmap('magma', 0.15 + 0.8 * Math.min(1, sp / (2 * vr)), rgb); else rgb[0] = rgb[1] = rgb[2] = 0.85;
          col.setXYZ(i, rgb[0], rgb[1], rgb[2]);
        }
        pos.needsUpdate = col.needsUpdate = true;
        const H = h * K, a = A * K, top = Math.max(1.25 * H0 * K, H);
        box.segments([0, 0, 0, a, 0, 0, a, 0, 0, a, a, 0, a, a, 0, 0, a, 0, 0, a, 0, 0, 0, 0, 0, 0, 0, 0, 0, top, a, 0, 0, a, 0, top, a, a, 0, a, a, top, 0, a, 0, 0, a, top]);
        piston.position.set(a / 2, a / 2, H + 0.015); rod.position.set(a / 2, a / 2, H + 0.32); knob.set([a / 2, a / 2 - a / 2 - 0.05, H + 0.015]);
        knob.group.visible = state.mode === 'manual';
        heater.material.opacity = state.mode === 'heating' ? 0.15 + 0.5 * (temperature(G) / state.T0 - 1) : 0;
        const T = temperature(G), V = A * A * h;
        hud.set('V', si(V, 'm³')); hud.set('T', `${T.toFixed(1)} K`); hud.set('Pm', si(P, 'Pa')); hud.set('Pi', si(idealPressure(G), 'Pa'));
        const ratio = T * V ** (2 / 3) / (start.T * start.V ** (2 / 3));
        hud.set('chk', state.mode === 'adiabatic' ? `${ratio.toFixed(3)} (adiabat: 1)` : state.mode === 'isothermal' ? `pV/start = ${(P * V / (start.P * start.V)).toFixed(3)}` : '—', state.mode === 'adiabatic' && Math.abs(ratio - 1) < 0.05 ? 'good' : '');
        const Vs = [], iso = [], adi = [];
        for (let i = 0; i <= 60; i++) { const v = start.V * (0.22 + 1.0 * i / 60); Vs.push(v); iso.push(start.P * start.V / v); adi.push(start.P * (start.V / v) ** (5 / 3)); }
        plots.pv.draw({ xlim: [start.V * 0.22, start.V * 1.22], ylim: [0, start.P * Math.min(12, 1 / state.squeeze ** (5 / 3) * 1.3 + (state.mode === 'heating' ? 1 : 0))], series: [
          { x: Vs, y: iso, color: '--c-ref', dash: [4, 3], label: 'isotherm' }, { x: Vs, y: adi, color: '--c-E', dash: [2, 3], label: 'adiabat' },
          { x: hist.map((r) => r[0]), y: hist.map((r) => r[1]), color: '--c-B', label: 'measured' }], markers: [{ x: V, y: P, color: '--accent' }] });
        const bins = 30, vmax = 3 * vr, cnt = new Float64Array(bins), xs = [], mb = [];
        for (let i = 0; i < N; i++) { const b = Math.floor(Math.hypot(G.v[3 * i], G.v[3 * i + 1], G.v[3 * i + 2]) / vmax * bins); if (b < bins) cnt[b]++; }
        const yc = [], xc = [];
        for (let b = 0; b < bins; b++) { const v0 = vmax * b / bins, v1 = vmax * (b + 1) / bins; xc.push(v0, v0, v1, v1); const d = cnt[b] / (N * (v1 - v0)); yc.push(0, d, d, 0); }
        for (let i = 0; i <= 100; i++) { const v = vmax * i / 100; xs.push(v); mb.push(maxwell(v, T)); }
        plots.hist.draw({ xlim: [0, vmax], series: [{ x: xc, y: yc, color: '--c-B', label: 'atoms' }, { x: xs, y: mb, color: '--c-E', label: 'Maxwell–Boltzmann at T' }] });
      },
      theme() { box.theme(); knob.theme(); pistonMat.color.set(ctx.cssVar('--c-ref')); heater.material.color.set(ctx.cssVar('--c-north')); },
    };
  },
};
