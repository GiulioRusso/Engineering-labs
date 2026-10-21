// Oscillations: a mass on a spring and a pendulum; damping and a periodic drive (resonance).
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { createVector } from '../../lib/viz/vector.js';
import { si } from '../../lib/ui/format.js';
import { simulate, energy, period, omega0, steadyAmplitude, measuredPeriod, G } from './model.js';

const D = 20, K = 3, PIVOT = 1.5; // simulated seconds; world units per metre (spring); pendulum pivot height

export default {
  id: 'oscillations', title: 'Oscillations', size: 1.5, plain: true, duration: D, scrub: true,
  cameras: { front: { pos: [0, -6, 0.6], target: [0, 0, 0.6] }, side: { pos: [6, 0, 0.6], target: [0, 0, 0.6] }, top: { pos: [0, -0.01, 6], target: [0, 0, 0] }, iso: { pos: [3.2, -4.8, 2.2], target: [0, 0, 0.6] } },
  cam: 'front',
  defaults: { kind: 'spring', m: 1, k: 10, x0: 0.3, L: 1, th0: 0.2, gamma: 0, F0: 0, wd: 2, vectors: true },
  cases: [
    { id: 'spring', label: 'Spring', set: {}, examples: [
      { id: 'heavy', label: '4× the mass: 2× the period', set: { m: 4 } },
      { id: 'stiff', label: '4× stiffer: half the period', set: { k: 40 } },
      { id: 'wide', label: 'Bigger swing: same period', set: { x0: 0.6 } },
      { id: 'light', label: 'Light damping', set: { gamma: 0.08 } },
      { id: 'critical', label: 'Critical damping', set: { gamma: Math.sqrt(10) } },
      { id: 'over', label: 'Overdamped: creeps back', set: { gamma: 8 } },
      { id: 'resonance', label: 'Driven at resonance', controls: ['gamma', 'F0', 'wd'], set: { x0: 0, gamma: 0.2, F0: 1, wd: Math.sqrt(10) } },
      { id: 'above', label: 'Driven far above: out of phase', controls: ['wd'], set: { x0: 0, gamma: 0.2, F0: 1, wd: 7 } },
      { id: 'sharp', label: 'Less damping: sharper peak', controls: ['gamma', 'wd'], set: { x0: 0, gamma: 0.05, F0: 1, wd: Math.sqrt(10) } },
    ] },
    { id: 'pendulum', label: 'Pendulum', set: { kind: 'pendulum' }, examples: [
      { id: 'long', label: '4× longer: 2× the period', set: { L: 4 } },
      { id: 'heavy', label: 'Heavier bob: same period', set: { m: 5 } },
      { id: 'big', label: 'Big swing: slower', set: { th0: 2 } },
      { id: 'top', label: 'Almost over the top', set: { th0: 3 } },
      { id: 'damped', label: 'With air friction', controls: ['gamma'], set: { th0: 0.8, gamma: 0.15 } },
      { id: 'pushed', label: 'Pushed in rhythm: resonance', controls: ['F0', 'wd'], set: { th0: 0, gamma: 0.1, F0: 0.3, wd: 3.13 } },
    ] },
  ],

  controls: [
    { title: 'Oscillator', items: [
      { id: 'm', label: 'Mass m', unit: 'kg', min: 0.1, max: 10, log: true },
      { id: 'k', label: 'Spring constant k', unit: 'N/m', min: 1, max: 100, log: true, show: (s) => s.kind === 'spring' },
      { id: 'L', label: 'Length L', unit: 'm', min: 0.1, max: 5, log: true, show: (s) => s.kind === 'pendulum' },
      { type: 'readout', label: 'Natural frequency ω₀', value: (s) => `${omega0(s).toFixed(3)} rad/s` },
    ] },
    { title: 'Start', items: [
      { id: 'x0', label: 'Pulled out by', unit: 'cm', k: 100, min: 0, max: 0.6, step: 0.005, show: (s) => s.kind === 'spring' },
      { id: 'th0', label: 'Released at', unit: '°', k: 180 / Math.PI, min: 0, max: 3.1, step: Math.PI / 180, show: (s) => s.kind === 'pendulum' },
    ] },
    { title: 'Damping and drive', items: [
      { id: 'gamma', label: 'Damping γ', unit: '1/s', min: 0, max: 10, step: 0.01 },
      { id: 'F0', label: 'Drive force F₀', unit: 'N', min: 0, max: 5, step: 0.05 },
      { id: 'wd', label: 'Drive frequency ω_d', unit: 'rad/s', min: 0.2, max: 10, step: 0.01 },
    ] },
  ],
  display: [{ title: 'Show', items: [{ id: 'vectors', label: 'Force and velocity', type: 'check', color: '--c-F' }] }],
  plots: [{ id: 'pos', title: 'Position', xLabel: 't', xUnit: 's', yUnit: '' }, { id: 'second', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'T', label: 'period (measured)' }, { id: 'Tf', label: '  formula' }, { id: 'q', label: 'position' }, { id: 'E', label: 'energy' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    const mat = (c) => new THREE.MeshStandardMaterial({ roughness: 0.5, color: c });
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat()); scene.add(block);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), mat()); scene.add(bob);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 1), mat()); wall.position.set(-2.2, 0, 0.5); scene.add(wall);
    const floor = createCurve(stage, { max: 1, width: 1.4, color: '--ink-dim' }); floor.segments([-2.2, 0, 0.3, 2.2, 0, 0.3]);
    const mark = createCurve(stage, { max: 1, width: 1.2, color: '--c-ref', dashed: true });
    const coil = createCurve(stage, { max: 400, width: 2, color: '--copper' });
    const rod = createCurve(stage, { max: 1, width: 2, color: '--ink-dim' });
    const arc = createCurve(stage, { max: 120, width: 1.2, color: '--c-ref', dashed: true });
    const vF = createVector(scene, '--c-F', 'F', { radius: 0.02 }), vV = createVector(scene, '--c-v', 'v', { radius: 0.02 });
    let R = null, Tf = 1, Tm = NaN;

    function configure() {
      R = simulate(state, D, 2e-3);
      Tf = period(state); Tm = measuredPeriod(R, state.F0 ? 10 : 0);
      ctx.setDuration(D);
    }
    const pend = () => state.kind === 'pendulum';

    return {
      changed() { configure(); },
      update() {
        const i = Math.min(R.t.length - 1, Math.round(time.t / 2e-3)), q = R.q[i], v = R.v[i], p = pend();
        block.visible = coil.object.visible = wall.visible = floor.object.visible = !p;
        bob.visible = rod.object.visible = arc.object.visible = p;
        const w2 = omega0(state) ** 2, acc = (p ? -w2 * Math.sin(q) : -w2 * q) - 2 * state.gamma * v + (state.F0 / (p ? state.m * state.L : state.m)) * Math.cos(state.wd * time.t);
        let pos, tang;
        if (p) {
          const Lw = Math.min(1.3, 0.8 * Math.sqrt(state.L)); // drawn length (true length in the readouts)
          pos = [Lw * Math.sin(q), 0, PIVOT - Lw * Math.cos(q)]; tang = [Math.cos(q), 0, Math.sin(q)];
          bob.position.set(...pos); rod.segments([0, 0, PIVOT, ...pos]);
          const a = []; const A = Math.max(Math.abs(state.th0), 0.05); for (let j = 0; j <= 100; j++) { const u = -A + 2 * A * j / 100; a.push(Lw * Math.sin(u), 0.01, PIVOT - Lw * Math.cos(u)); } arc.set(a);
          mark.segments([0, 0, PIVOT, 0, 0, PIVOT - Lw - 0.25]);
        } else {
          const x = q * K; pos = [x, 0, 0.5]; tang = [1, 0, 0];
          block.position.set(...pos);
          const pts = [], x0 = -2.16, x1 = x - 0.2, turns = 14;
          for (let j = 0; j <= 280; j++) { const u = j / 280, a = 2 * Math.PI * turns * u; pts.push(x0 + (x1 - x0) * u, 0.1 * Math.sin(a), 0.5 + 0.1 * Math.cos(a)); }
          coil.set(pts); mark.segments([0, 0, 0.25, 0, 0, 0.8]);
        }
        const sF = state.vectors ? Math.min(1.2, Math.abs(acc) / (w2 * Math.max(p ? Math.abs(state.th0) : state.x0, 0.05)) * 0.7) : 0;
        vF.set([pos[0], -0.25, pos[2] + 0.35], tang.map((c) => c * Math.sign(acc)), sF);
        vV.set([pos[0], -0.25, pos[2] + 0.35], tang.map((c) => c * Math.sign(v)), state.vectors ? Math.min(1.2, Math.abs(v) / (Math.sqrt(w2) * Math.max(p ? Math.abs(state.th0) : state.x0, 0.05)) * 0.7) : 0);

        const E = energy(state, q, v), f = p ? 180 / Math.PI : 1;
        hud.set('T', Number.isFinite(Tm) ? si(Tm, 's', 4) : '—');
        hud.set('Tf', state.F0 ? `drive ${si(2 * Math.PI / state.wd, 's', 4)}` : p ? `T = ${si(Tf, 's', 4)} (small angle ${si(2 * Math.PI * Math.sqrt(state.L / G), 's', 4)})` : `2π√(m/k) = ${si(Tf, 's', 4)}`);
        hud.set('q', p ? `${(q * f).toFixed(1)}°` : si(q, 'm'));
        hud.set('E', `${si(E.K + E.U, 'J')}  (K ${si(E.K, 'J')}, U ${si(E.U, 'J')})`);
        const E0 = energy(state, R.q[0], R.v[0]), lossless = !state.gamma && !state.F0;
        const fm = state.F0 / (p ? state.m * state.L : state.m), A = steadyAmplitude(omega0(state), state.gamma, fm, state.wd);
        hud.set('chk', lossless ? `energy kept: ${((E.K + E.U) / (E0.K + E0.U)).toFixed(7)} ✓` : state.F0 ? `steady amplitude ${p ? `${(A * f).toFixed(1)}° (linear)` : si(A, 'm')}` : `envelope e^(−γt) = ${Math.exp(-state.gamma * time.t).toFixed(3)}`, lossless ? 'good' : '');

        const T = [], Q = [], Ev = [], Up = [], Lo = [], Ks = [], Us = [];
        for (let j = 0; j < R.t.length; j += 20) {
          T.push(R.t[j]); Q.push(R.q[j] * f);
          const e = energy(state, R.q[j], R.v[j]); Ks.push(e.K); Us.push(e.U); Ev.push(e.K + e.U);
          if (state.gamma && !state.F0 && state.gamma < omega0(state)) { const a = (p ? state.th0 : state.x0) * f * Math.exp(-state.gamma * R.t[j]); Up.push(a); Lo.push(-a); }
        }
        const series = [{ x: T, y: Q, color: '--c-B', label: p ? 'θ(t) [°]' : 'x(t) [m]' }];
        if (Up.length) series.push({ x: T, y: Up, color: '--c-ref', dash: [4, 3], label: 'e^(−γt)' }, { x: T, y: Lo, color: '--c-ref', dash: [4, 3] });
        plots.pos.draw({ xlim: [0, D], cursor: time.t, series });
        if (state.F0) {
          const W = [], Am = [], w0 = omega0(state); for (let j = 0; j <= 300; j++) { const w = 0.2 + 9.8 * j / 300; W.push(w); Am.push(steadyAmplitude(w0, state.gamma, fm, w) * f); }
          plots.second.draw({ xlim: [0.2, 10], cursor: state.wd, series: [{ x: W, y: Am, color: '--c-F', label: `resonance: amplitude vs ω_d [${p ? '°' : 'm'}]` }] });
        } else plots.second.draw({ xlim: [0, D], cursor: time.t, series: [{ x: T, y: Ks, color: '--c-v', label: 'kinetic [J]' }, { x: T, y: Us, color: '--c-E', label: 'potential [J]' }, { x: T, y: Ev, color: '--ink', dash: [4, 3], label: 'total' }] });
      },
      theme() {
        for (const c of [floor, mark, coil, rod, arc]) c.theme(); vF.theme(); vV.theme();
        block.material.color.set(ctx.cssVar('--c-B')); bob.material.color.set(ctx.cssVar('--c-B')); wall.material.color.set(ctx.cssVar('--c-ref'));
      },
    };
  },
};
