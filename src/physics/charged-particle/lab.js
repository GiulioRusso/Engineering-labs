// A charged particle in uniform E and B: gyration, helix, E×B drift, acceleration along B.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { si } from '../../lib/ui/format.js';
import { boris, gyro, larmor, drift, SPECIES } from './model.js';

const STEPS_PER_TURN = 200, TURNS = 5;

export default {
  id: 'charged-particle', title: 'Charged particle in E and B', size: 0.35,
  cameras: { front: { pos: [0, -1, 0.1] }, side: { pos: [1, 0, 0.1] }, top: { pos: [0, -0.001, 1] }, iso: { pos: [0.6, -0.75, 0.5] } },
  defaults: { species: 'proton', v: 1e4, pitch: Math.PI / 2, B: 1e-3, Ex: 0, Ey: 0, Ez: 0, anti: false, fields: true, vectors: true },
  cases: [
    { id: 'particle', label: 'Particle', set: {}, examples: [
      { id: 'strong-b', label: 'Stronger B: tighter, faster', set: { B: 3e-3 } },
      { id: 'speed', label: 'Faster particle: same period', set: { v: 3e4 } },
      { id: 'anti', label: 'Opposite charge: other way', set: { anti: true } },
      { id: 'electron', label: 'An electron', set: { species: 'electron', v: 3e6 } },
      { id: 'helix', label: 'At an angle to B: a helix', set: { pitch: Math.PI / 3 } },
      { id: 'shallow', label: 'Almost along B', set: { pitch: 0.3 } },
      { id: 'drift', label: 'E across B: drift', controls: ['Ex', 'B'], set: { Ex: 1, v: 4e3 } },
      { id: 'pair', label: 'Same drift for ±q', controls: ['Ex', 'anti'], set: { Ex: 1, v: 4e3, anti: true } },
      { id: 'strong-e', label: 'Stronger E: faster drift', controls: ['Ex'], set: { Ex: 3, v: 4e3 } },
      { id: 'along', label: 'E along B: speeds up', set: { Ez: 2 } },
      { id: 'brake', label: 'E against: slows, turns back', set: { Ez: -2, pitch: 1.2 } },
    ] },
  ],
  controls: [
    { title: 'Particle', items: [
      { id: 'species', label: 'Particle', type: 'segmented', options: Object.entries(SPECIES).map(([k, v]) => [k, v.label]) },
      { id: 'v', label: 'Speed', unit: 'm/s', min: 1e3, max: 1e7, log: true },
      { id: 'pitch', label: 'Angle v–B', unit: '°', k: 180 / Math.PI, min: 0.05, max: Math.PI / 2, step: Math.PI / 180 },
      { id: 'anti', label: 'Antiparticle too', type: 'check' },
    ] },
    { title: 'Fields', items: [
      { id: 'B', label: 'B (along z)', unit: 'mT', k: 1e3, min: 1e-4, max: 1e-2, log: true },
      { id: 'Ex', label: 'Eₓ', unit: 'V/m', min: -20, max: 20, step: 0.1 },
      { id: 'Ey', label: 'E_y', unit: 'V/m', min: -20, max: 20, step: 0.1 },
      { id: 'Ez', label: 'E_z', unit: 'V/m', min: -20, max: 20, step: 0.1 },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'fields', label: 'Field arrows', type: 'check', color: '--c-B' },
    { id: 'vectors', label: 'Velocity and force', type: 'check', color: '--c-F' },
  ] }],
  plots: [{ id: 'ke', title: 'Kinetic energy', xLabel: 't', xUnit: 's', yUnit: 'eV' }, { id: 'pos', title: 'Position', xLabel: 't', xUnit: 's', yUnit: 'm' }],
  hud: [{ id: 'w', label: 'ω_c = |q|B/m' }, { id: 'T', label: 'period' }, { id: 'r', label: 'Larmor radius' }, { id: 'vd', label: 'E×B drift (predicted)' }, 'sep', { id: 'vm', label: 'drift (measured)' }, { id: 'dke', label: 'ΔKE (pure B: 0)' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    const trail = createCurve(stage, { max: STEPS_PER_TURN * TURNS + 2, width: 2.6, color: '--c-I' });
    const trail2 = createCurve(stage, { max: STEPS_PER_TURN * TURNS + 2, width: 2, color: '--c-E', dashed: true });
    const ballMat = new THREE.MeshStandardMaterial({ roughness: 0.4 }), ball = new THREE.Mesh(new THREE.SphereGeometry(0.008, 20, 14), ballMat); scene.add(ball);
    const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.008, 20, 14), new THREE.MeshStandardMaterial({ roughness: 0.4 })); scene.add(ball2);
    const vv = createVector(scene, '--c-v', 'v', { radius: 0.003 }), fv = createVector(scene, '--c-F', 'F', { radius: 0.003 });
    const Bv = [], Ev = createVector(scene, '--c-E', 'E', { radius: 0.004 });
    for (let i = 0; i < 4; i++) Bv.push(createVector(scene, '--c-B', i === 0 ? 'B' : '', { radius: 0.0015 }));
    let R = null, R2 = null, sp = null, dt = 1, w = 1, view = 0.15, centre = [0, 0, 0];

    function configure() {
      sp = SPECIES[state.species];
      w = gyro(sp.q, sp.m, state.B); const T = 2 * Math.PI / w; dt = T / STEPS_PER_TURN;
      const v0 = [0, state.v * Math.sin(state.pitch), state.v * Math.cos(state.pitch)], E = [state.Ex, state.Ey, state.Ez], B = [0, 0, state.B];
      R = boris({ q: sp.q, m: sp.m, E, B, v0, dt, steps: STEPS_PER_TURN * TURNS });
      R2 = state.anti ? boris({ q: -sp.q, m: sp.m, E, B, v0, dt, steps: STEPS_PER_TURN * TURNS }) : null;
      // fit the view: scale world so the whole path fits ~0.3 world units
      const all = [...R.x, ...(R2 ? R2.x : [])], lo = [0, 1, 2].map((k) => Math.min(...all.map((p) => p[k]))), hi = [0, 1, 2].map((k) => Math.max(...all.map((p) => p[k])));
      centre = lo.map((v, k) => (v + hi[k]) / 2);
      view = 0.3 / Math.max(1e-9, ...hi.map((v, k) => v - lo[k]));
      time.scale = T / 2.5; // one gyration every 2.5 s of real time
      ctx.setDuration(T * TURNS);
    }
    const W = (p) => [(p[0] - centre[0]) * view, (p[1] - centre[1]) * view, (p[2] - centre[2]) * view];

    return {
      changed() { configure(); },
      update() {
        const i = Math.min(R.x.length - 1, Math.floor(time.t / dt)), p = R.x[i], v = R.v[i];
        trail.set(R.x.slice(0, i + 1).flatMap(W)); ball.position.set(...W(p));
        trail2.object.visible = ball2.visible = !!R2;
        if (R2) { trail2.set(R2.x.slice(0, i + 1).flatMap(W)); ball2.position.set(...W(R2.x[i])); }
        const E = [state.Ex, state.Ey, state.Ez], B = [0, 0, state.B];
        const F = [0, 1, 2].map((k) => sp.q * (E[k] + [v[1] * B[2] - v[2] * B[1], v[2] * B[0] - v[0] * B[2], v[0] * B[1] - v[1] * B[0]][k]));
        vv.set(W(p), v, state.vectors ? 0.06 : 0); fv.set(W(p), F, state.vectors && Math.hypot(...F) > 0 ? 0.05 : 0);
        Bv.forEach((a, k) => a.set([(k & 1 ? 1 : -1) * 0.2, (k & 2 ? 1 : -1) * 0.2, -0.1], [0, 0, 1], state.fields ? 0.16 : 0));
        const En = Math.hypot(...E); Ev.set([-0.16, -0.16, 0.14], E, state.fields && En > 0 ? 0.06 + 0.004 * En : 0);
        const vd = drift(E, B), vperp = state.v * Math.sin(state.pitch);
        hud.set('w', si(w, 'rad/s')); hud.set('T', si(2 * Math.PI / w, 's')); hud.set('r', si(larmor(sp.m, vperp, sp.q, state.B), 'm'));
        hud.set('vd', si(Math.hypot(...vd), 'm/s'));
        hud.set('vm', i >= STEPS_PER_TURN ? si(Math.hypot((R.x[i][0] - R.x[i - STEPS_PER_TURN][0]), (R.x[i][1] - R.x[i - STEPS_PER_TURN][1])) / (STEPS_PER_TURN * dt), 'm/s') : 'after one turn…');
        const eV = 1.602176634e-19, ke = (u) => 0.5 * sp.m * (u[0] ** 2 + u[1] ** 2 + u[2] ** 2) / eV, KE0 = ke(R.v[0]);
        hud.set('dke', si((ke(v) - KE0) * eV, 'J'), En === 0 ? 'good' : '');
        const T = [], K = [], X = [], Y = [], Z = [];
        for (let j = 0; j < R.x.length; j += 4) { T.push(j * dt); K.push(ke(R.v[j])); X.push(R.x[j][0]); Y.push(R.x[j][1]); Z.push(R.x[j][2]); }
        plots.ke.draw({ xlim: [0, time.D], cursor: time.t, series: [{ x: T, y: K, color: '--c-E', label: 'KE' }] });
        plots.pos.draw({ xlim: [0, time.D], cursor: time.t, series: [{ x: T, y: X, color: '--c-x', label: 'x' }, { x: T, y: Y, color: '--c-y', label: 'y' }, { x: T, y: Z, color: '--c-z', label: 'z' }] });
      },
      theme() { trail.theme(); trail2.theme(); vv.theme(); fv.theme(); Ev.theme(); for (const a of Bv) a.theme(); ballMat.color.set(ctx.cssVar('--c-I')); ball2.material.color.set(ctx.cssVar('--c-E')); },
    };
  },
};
