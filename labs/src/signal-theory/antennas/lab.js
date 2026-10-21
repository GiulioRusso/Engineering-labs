// Antennas and propagation: link budget, dipole patterns, phased arrays, polarization, waveguide modes.
// 2D by default (polar plots, cross-sections); the dipole and polarization cases offer a 3D view.
import * as THREE from 'three';
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createArrows } from '../../lib/viz/arrows.js';
import { logNorm } from '../../lib/viz/colormap.js';
import { C0, fspl, received, dipole, dipoleNorm, directivity, arrayFactor, efield, throughPolarizer, cutoff, guideWavelength, modeE } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞'), R = 2.4, DB = 30; // polar radius, dB range
const WG = { a: 0.02286, b: 0.01016 }; // WR-90

export default {
  id: 'antennas', title: 'Antennas', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  camOf: (s) => (s.view3d && (s.case === 'dipole' || s.case === 'polarization') ? 'iso' : 'top'),
  cameras: { front: { pos: [0, -12, 0.5] }, side: { pos: [12, 0, 0.5] }, top: { pos: [0, -0.01, 12] }, iso: { pos: [6, -7.5, 5.5] } },
  defaults: { Pt: 20, Gt: 2, Gr: 2, f: 2.4, d: 100, sens: -80, L: 0.5, N: 8, sp: 0.5, steer: 0, ay: 1, delta: 0, pol: 0, wm: 1, wn: 0, wtype: 'TE', wf: 10, view3d: false },
  cases: [
    { id: 'link', label: 'Link budget', set: {}, examples: [
      { id: 'double', label: 'Twice the distance: −6 dB', controls: ['d'], set: { d: 200 } },
      { id: 'far', label: 'Out of range', controls: ['d'], set: { d: 3000 } },
      { id: 'freq', label: '5 GHz: more loss, same antennas', controls: ['f'], set: { f: 5 } },
      { id: 'sat', label: 'Satellite at 36 000 km', set: { f: 12, d: 3.6e7, Pt: 50, Gt: 40, Gr: 35, sens: -120 } },
    ] },
    { id: 'dipole', label: 'Dipole', set: {}, examples: [
      { id: 'short', label: 'Short dipole', set: { L: 0.1 } },
      { id: 'full', label: 'Full-wave: narrower', set: { L: 1 } },
      { id: 'long', label: '1.5 λ: side lobes', set: { L: 1.5 } },
    ] },
    { id: 'array', label: 'Phased array', set: {}, examples: [
      { id: 'two', label: 'Two elements', set: { N: 2 } },
      { id: 'many', label: '16 elements: a narrow beam', set: { N: 16 } },
      { id: 'steer', label: 'Steer to 30°', set: { steer: 30 } },
      { id: 'grating', label: 'Spacing λ: grating lobes', set: { sp: 1, steer: 20 } },
    ] },
    { id: 'polarization', label: 'Polarization', set: {}, examples: [
      { id: 'linear', label: 'Linear at 45°', set: { ay: 1, delta: 0 } },
      { id: 'circular', label: 'Circular', set: { ay: 1, delta: 90 } },
      { id: 'ellipse', label: 'Elliptical', set: { ay: 0.5, delta: 60 } },
      { id: 'crossed', label: 'Crossed polarizer: dark', set: { ay: 0, delta: 0, pol: 90 } },
    ] },
    { id: 'waveguide', label: 'Waveguide', set: {}, examples: [
      { id: 'below', label: 'Below cut-off: no propagation', controls: ['wf'], set: { wf: 6 } },
      { id: 'te20', label: 'TE₂₀', set: { wm: 2, wf: 15 } },
      { id: 'te11', label: 'TE₁₁', set: { wm: 1, wn: 1, wf: 18 } },
      { id: 'tm11', label: 'TM₁₁', set: { wtype: 'TM', wm: 1, wn: 1, wf: 18 } },
    ] },
  ],
  controls: [
    { title: 'Link', show: (s) => s.case === 'link', items: [
      { id: 'Pt', label: 'Transmit power', unit: 'dBm', min: -10, max: 60, step: 1 },
      { id: 'Gt', label: 'Transmit antenna gain', unit: 'dBi', min: 0, max: 50, step: 0.5 },
      { id: 'Gr', label: 'Receive antenna gain', unit: 'dBi', min: 0, max: 50, step: 0.5 },
      { id: 'f', label: 'Frequency', unit: 'GHz', min: 0.1, max: 30, log: true },
      { id: 'd', label: 'Distance', unit: 'km', k: 1e-3, min: 1, max: 4e7, log: true },
      { id: 'sens', label: 'Receiver sensitivity', unit: 'dBm', min: -130, max: -40, step: 1 },
    ] },
    { title: 'Dipole', show: (s) => s.case === 'dipole', items: [{ id: 'L', label: 'Length', unit: 'λ', min: 0.02, max: 2, step: 0.01 }] },
    { title: 'Array', show: (s) => s.case === 'array', items: [
      { id: 'N', label: 'Elements', unit: '', min: 1, max: 32, step: 1 },
      { id: 'sp', label: 'Spacing', unit: 'λ', min: 0.1, max: 1.5, step: 0.01 },
      { id: 'steer', label: 'Steering angle', unit: '°', min: -60, max: 60, step: 1 },
    ] },
    { title: 'Wave', show: (s) => s.case === 'polarization', items: [
      { id: 'ay', label: 'Eᵧ amplitude (Eₓ = 1)', unit: '', min: 0, max: 1, step: 0.01 },
      { id: 'delta', label: 'Phase of Eᵧ', unit: '°', min: -180, max: 180, step: 1 },
      { id: 'pol', label: 'Polarizer angle', unit: '°', min: 0, max: 180, step: 1 },
    ] },
    { title: 'Mode', show: (s) => s.case === 'waveguide', items: [
      { id: 'wtype', label: 'Type', type: 'segmented', options: [['TE', 'TE'], ['TM', 'TM']] },
      { id: 'wm', label: 'm (across a)', unit: '', min: 0, max: 3, step: 1 },
      { id: 'wn', label: 'n (across b)', unit: '', min: 0, max: 2, step: 1 },
      { id: 'wf', label: 'Frequency', unit: 'GHz', min: 4, max: 30, step: 0.1 },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'view3d', label: '3D view', type: 'check', show: (s) => s.case === 'dipole' || s.case === 'polarization', hint: 'Pattern as a solid, or the field along the wave' }] }],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    const chart = createChart(ctx, { box: [-4.2, -2.4, 8.6, 4.8], xTitle: 'distance (log₁₀ m)', yTitle: 'received power (dBm)' });
    const grid = createCurve(stage, { max: 400, width: 1, color: '--line' }), pat = createCurve(stage, { max: 2000, width: 3, color: '--c-B' }), extra = createCurve(stage, { max: 400, width: 2, color: '--c-I' });
    const ring = []; for (let k = 1; k <= 3; k++) for (let i = 0; i < 72; i++) { const a = 2 * Math.PI * i / 72, b = 2 * Math.PI * (i + 1) / 72, r = R * k / 3; ring.push(r * Math.cos(a), r * Math.sin(a), 0, r * Math.cos(b), r * Math.sin(b), 0); }
    for (let i = 0; i < 12; i++) { const a = Math.PI * i / 6; ring.push(0, 0, 0, R * Math.cos(a), R * Math.sin(a), 0); } grid.segments(ring);
    const rl = ['−20 dB', '−10 dB', '0 dB'].map((t, k) => { const l = ctx.label(t, 'tick'); l.position.set(0.25, R * (k + 1) / 3 + 0.1, 0); scene.add(l); return l; });
    const solid = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.8, side: THREE.DoubleSide })); scene.add(solid);
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial(), 40); scene.add(dots);
    const arrows = createArrows(stage, 600), box = createCurve(stage, { max: 4, width: 2, color: '--ink' });
    const m4 = new THREE.Matrix4(), dbR = (v) => R * Math.max(0, 1 + 20 * Math.log10(Math.max(1e-9, v)) / DB);

    const hideAll = () => { chart.show(false); for (const o of [grid.object, pat.object, extra.object, solid, dots, arrows.mesh, box.object, ...rl]) o.visible = false; };
    return {
      changed(id) {
        hideAll(); const c = state.case, v3 = state.view3d && (c === 'dipole' || c === 'polarization');
        stage.setOrtho(!v3); stage.controls.enableRotate = v3; if (id === 'view3d') stage.preset(v3 ? 'iso' : 'top');
        if (c === 'link') { chart.show(true); chart.range([0, 8], [-180, 40]); }
        if (c === 'dipole' || c === 'array') { grid.object.visible = pat.object.visible = true; for (const l of rl) l.visible = true; }
        ctx.setDuration(c === 'polarization' ? 4 : 0);
      },
      update() {
        const c = state.case, v3 = state.view3d;
        if (c === 'link') {
          const ds = Array.from({ length: 321 }, (_, i) => i / 40), pr = ds.map((l) => received({ ...state, f: state.f * 1e9, d: 10 ** l }));
          chart.line('pr', ds, pr, { color: '--c-B' }); chart.line('sens', [0, 8], [state.sens, state.sens], { color: '--c-north', dashed: true, width: 1.6 });
          const P = received({ ...state, f: state.f * 1e9 }), ok = P >= state.sens; chart.dots('now', [Math.log10(state.d)], [P], { color: ok ? '--c-v' : '--c-north', size: 12 });
          hud.set('a', `FSPL = 20 log(4πd/λ) = ${fmt(fspl(state.d, state.f * 1e9), 4)} dB at ${fmt(state.d / 1e3)} km`);
          hud.set('b', `received ${fmt(P, 4)} dBm`); hud.set('c', ok ? `margin ${fmt(P - state.sens, 3)} dB ✓` : `${fmt(state.sens - P, 3)} dB short ✗`);
          const fs = Array.from({ length: 101 }, (_, i) => 0.1 * 300 ** (i / 100));
          plots.aux.draw({ xlim: [0.1, 30], cursor: state.f, series: [{ x: fs, y: fs.map((f) => fspl(state.d, f * 1e9)), color: '--c-E', label: 'path loss vs frequency (GHz) [dB]' }] });
        } else if (c === 'dipole') {
          const m = dipoleNorm(state.L), F = (t) => Math.abs(dipole(state.L, t)) / m, p = [];
          for (let i = 0; i <= 720; i++) { const t = 2 * Math.PI * i / 720, r = dbR(F(t)); p.push(r * Math.sin(t), r * Math.cos(t), 0.002); }
          pat.set(p); extra.object.visible = true; extra.segments([0, -state.L * 0.8, 0.004, 0, state.L * 0.8, 0.004]);
          solid.visible = v3; grid.object.visible = !v3;
          if (v3) { const pts = []; for (let i = 0; i <= 120; i++) { const t = Math.PI * i / 120, r = dbR(F(t)); pts.push(new THREE.Vector2(r * Math.sin(t), r * Math.cos(t))); } solid.geometry.dispose(); solid.geometry = new THREE.LatheGeometry(pts, 64); /* revolved about the dipole (y) axis */ solid.geometry.computeVertexNormals(); }
          const D = directivity(F);
          hud.set('a', `length ${fmt(state.L)} λ (vertical); pattern in dB, ${DB} dB range`); hud.set('b', `directivity ${fmt(D)} = ${fmt(10 * Math.log10(D))} dBi`);
          hud.set('c', state.L < 0.2 ? 'short dipole: D → 1.5 (1.76 dBi)' : Math.abs(state.L - 0.5) < 0.01 ? 'half-wave: 1.64 (2.15 dBi) ✓' : '');
          const th = Array.from({ length: 181 }, (_, i) => i); plots.aux.draw({ xlim: [0, 180], series: [{ x: th, y: th.map((d) => F(d * Math.PI / 180)), color: '--c-B', label: 'field pattern F(θ) vs θ from the axis (°)' }] });
        } else if (c === 'array') {
          const t0 = state.steer * Math.PI / 180, p = [];
          for (let i = 0; i <= 720; i++) { const t = -Math.PI / 2 + Math.PI * i / 720, r = dbR(arrayFactor(state.N, state.sp, t0, t)); p.push(r * Math.sin(t), r * Math.cos(t), 0.002); }
          pat.set(p); extra.object.visible = true; extra.segments([0, 0, 0.004, R * 1.08 * Math.sin(t0), R * 1.08 * Math.cos(t0), 0.004]);
          dots.visible = true; const w = Math.min(2.2, (state.N - 1) * 0.3) / Math.max(1, state.N - 1);
          for (let i = 0; i < state.N; i++) { m4.makeTranslation((i - (state.N - 1) / 2) * w, -0.3, 0.01); dots.setMatrixAt(i, m4); } dots.count = state.N; dots.instanceMatrix.needsUpdate = true;
          const bw = 0.886 / (state.N * state.sp * Math.cos(t0)) * 180 / Math.PI, grating = state.sp > 1 / (1 + Math.abs(Math.sin(t0)));
          hud.set('a', `${state.N} elements, ${fmt(state.sp)} λ apart, steered to ${state.steer}° (phase step ${fmt(-360 * state.sp * Math.sin(t0))}° per element)`);
          hud.set('b', `half-power beam width ≈ ${fmt(bw)}°`); hud.set('c', grating ? 'grating lobes: spacing too large ✗' : 'no grating lobes ✓', grating ? 'bad' : 'good');
          const th = Array.from({ length: 181 }, (_, i) => i - 90); plots.aux.draw({ xlim: [-90, 90], cursor: state.steer, series: [{ x: th, y: th.map((d) => Math.max(-40, 20 * Math.log10(arrayFactor(state.N, state.sp, t0, d * Math.PI / 180) + 1e-9))), color: '--c-B', label: 'array factor (dB) vs angle (°)' }] });
        } else if (c === 'polarization') {
          const dl = state.delta * Math.PI / 180, wt = 2 * Math.PI * time.t / 2, S = 1.8, tr = [];
          for (let i = 0; i <= 200; i++) { const [x, y] = efield(state.ay, dl, 2 * Math.PI * i / 200); tr.push(S * x, S * y, 0); }
          pat.object.visible = true; pat.set(tr); grid.object.visible = false;
          const [ex, ey] = efield(state.ay, dl, wt), a = state.pol * Math.PI / 180;
          extra.object.visible = true; extra.segments([-2.4 * Math.cos(a), -2.4 * Math.sin(a), 0.003, 2.4 * Math.cos(a), 2.4 * Math.sin(a), 0.003]);
          const items = [{ p: [0, 0, 0.01], v: [ex * S, ey * S, 0] }];
          if (v3) for (let k = 0; k < 60; k++) { const z = -3 + 6 * k / 60, [x, y] = efield(state.ay, dl, wt - 2 * Math.PI * z / 2); items.push({ p: [0, 0, z], v: [x, y, 0] }); }
          arrows.mesh.visible = true; arrows.set(items.map((it) => ({ p: [it.p[0] + it.v[0] / 2, it.p[1] + it.v[1] / 2, it.p[2]], v: it.v })), { len: (mg) => mg, width: 0.1, color: ctx.cssVar('--c-E') });
          const T = throughPolarizer(state.ay, dl, a), ar = (() => { let mx = 0, mn = Infinity; for (let i = 0; i < 360; i++) { const [x, y] = efield(state.ay, dl, Math.PI * i / 180), r = Math.hypot(x, y); mx = Math.max(mx, r); mn = Math.min(mn, r); } return mx / Math.max(mn, 1e-9); })();
          hud.set('a', state.ay === 0 || Math.abs(Math.sin(dl)) < 1e-6 ? 'linear polarization' : Math.abs(state.ay - 1) < 1e-6 && Math.abs(Math.abs(state.delta) - 90) < 1e-6 ? `circular, ${state.delta > 0 ? 'left' : 'right'}-handed` : 'elliptical');
          hud.set('b', `axial ratio ${ar > 1e6 ? '∞' : fmt(ar)}`); hud.set('c', `through the polarizer (red): ${fmt(100 * T)} % of the power`);
          const as = Array.from({ length: 181 }, (_, i) => i); plots.aux.draw({ xlim: [0, 180], cursor: state.pol, series: [{ x: as, y: as.map((d) => throughPolarizer(state.ay, dl, d * Math.PI / 180)), color: '--c-I', label: 'transmitted power vs polarizer angle (°)' }] });
        } else {
          const { a, b } = WG, W = 7, Hh = W * b / a, f = state.wf * 1e9, ok = (state.wtype === 'TE' && state.wm + state.wn > 0) || (state.wtype === 'TM' && state.wm > 0 && state.wn > 0);
          box.object.visible = true; box.set([-W / 2, -Hh / 2, 0, W / 2, -Hh / 2, 0, W / 2, Hh / 2, 0, -W / 2, Hh / 2, 0], true);
          const fc = cutoff(state.wm, state.wn, a, b), prop = ok && f > fc, items = [];
          if (ok) for (let i = 0; i < 24; i++) for (let j = 0; j < 10; j++) { const x = a * (i + 0.5) / 24, y = b * (j + 0.5) / 10, [ux, uy] = modeE(state.wtype, state.wm, state.wn, a, b, x, y); items.push({ p: [-W / 2 + W * x / a, -Hh / 2 + Hh * y / b, 0.01], v: [ux, uy, 0] }); }
          const mx = Math.max(1e-12, ...items.map((it) => Math.hypot(...it.v))), att = prop ? 1 : 0.35;
          arrows.mesh.visible = true; arrows.set(items, { len: (m) => 0.26 * m / mx * att, width: 0.09, map: 'viridis', norm: logNorm(mx / 50, mx) });
          hud.set('a', ok ? `${state.wtype}${'₀₁₂₃'[state.wm]}${'₀₁₂₃'[state.wn]} in WR-90 (22.86 × 10.16 mm)` : `${state.wtype}${state.wm}${state.wn} does not exist`, ok ? '' : 'bad');
          hud.set('b', ok ? `cut-off ${fmt(fc / 1e9, 4)} GHz` : ''); hud.set('c', ok ? (prop ? `propagates: λg = ${fmt(guideWavelength(f, fc) * 1000)} mm (free space ${fmt(C0 / f * 1000)} mm)` : 'below cut-off: decays, no propagation ✗') : '', prop ? 'good' : 'bad');
          const modes = [[1, 0], [2, 0], [0, 1], [1, 1], [3, 0], [2, 1]];
          plots.aux.draw({ xlim: [0, modes.length + 1], cursor: null, series: [{ x: modes.map((_, i) => i + 1), y: modes.map(([m, n]) => cutoff(m, n, a, b) / 1e9), color: '--c-E', label: 'cut-off (GHz) of TE10, TE20, TE01, TE11, TE30, TE21' }, { x: [0, modes.length + 1], y: [state.wf, state.wf], color: '--accent', dash: [4, 3], label: 'your frequency' }] });
        }
      },
      theme() {
        chart.theme(); for (const k of [grid, pat, extra, box]) k.theme();
        solid.material.color.set(ctx.cssVar('--c-B')); dots.material.color.set(ctx.cssVar('--c-I'));
      },
    };
  },
};
