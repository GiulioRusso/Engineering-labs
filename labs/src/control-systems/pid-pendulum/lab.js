// PID control: a motor at the pivot keeps a rod upright. Tune Kp, Ki, Kd; push it, load it, add noise.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { si } from '../../lib/ui/format.js';
import { simulate, G } from './model.js';

const D = 10, LW = 1.5, PZ = 0.35, deg = Math.PI / 180; // seconds shown; drawn rod length; pivot height

export default {
  id: 'pid-pendulum', title: 'PID control', size: 1.4, plain: true, cam: 'front', duration: D, loop: false,
  cameras: { front: { pos: [0, -5.5, 1.1], target: [0, 0, 1.1] }, side: { pos: [5.5, 0, 1.1], target: [0, 0, 1.1] }, top: { pos: [0, -0.01, 6], target: [0, 0, 0] }, iso: { pos: [3, -4.6, 2.6], target: [0, 0, 1] } },
  defaults: { m: 1, L: 0.5, b: 0.02, th0: 10 * deg, Kp: 20, Ki: 0, Kd: 2, tmax: 30, aw: false, noise: 0, push: 0, load: 0 },
  cases: [
    { id: 'pid', label: 'PID', set: {}, examples: [
      { id: 'weak', label: 'Kp too small: it falls', controls: ['Kp'], set: { Kp: 3 } },
      { id: 'p', label: 'P only: it rocks', controls: ['Kp', 'Kd'], set: { Kd: 0 } },
      { id: 'push', label: 'A push at 1 s', controls: ['push', 'Kd'], set: { push: 8 } },
      { id: 'noise', label: 'Noisy sensor: D shakes the motor', controls: ['noise', 'Kd'], set: { noise: 0.3 * deg, Kd: 4 } },
      { id: 'load', label: 'A load: PD leaves a tilt', controls: ['load', 'Kp'], set: { load: 2 } },
      { id: 'integral', label: 'Add I: the tilt goes away', controls: ['Ki', 'load'], set: { load: 2, Ki: 40 } },
      { id: 'windup', label: 'Weak motor: windup, it falls', controls: ['Ki', 'tmax', 'aw'], set: { th0: 30 * deg, tmax: 6, Ki: 80 } },
      { id: 'antiwindup', label: 'Anti-windup saves it', controls: ['Ki', 'tmax', 'aw'], set: { th0: 30 * deg, tmax: 6, Ki: 80, aw: true } },
    ] },
  ],
  controls: [
    { title: 'Controller', items: [
      { id: 'Kp', label: 'Kp', unit: 'N·m/rad', min: 0, max: 60, step: 0.5, hint: 'Must beat gravity: Kp > mgL' },
      { id: 'Ki', label: 'Ki', unit: 'N·m/(rad·s)', min: 0, max: 120, step: 1 },
      { id: 'Kd', label: 'Kd', unit: 'N·m·s/rad', min: 0, max: 8, step: 0.05 },
      { type: 'readout', label: 'mgL (gravity)', value: (s) => `${(s.m * G * s.L).toFixed(2)} N·m` },
    ] },
    { title: 'Motor', items: [
      { id: 'tmax', label: 'Max torque', unit: 'N·m', min: 3, max: 30, step: 0.5 },
      { id: 'aw', label: 'Anti-windup', type: 'check' },
    ] },
    { title: 'Disturbances', items: [
      { id: 'th0', label: 'Start tilted', unit: '°', k: 1 / deg, min: -45 * deg, max: 45 * deg, step: deg },
      { id: 'push', label: 'Push at 1 s', unit: 'N·m', min: -20, max: 20, step: 0.5 },
      { id: 'load', label: 'Load from 3 s', unit: 'N·m', min: -4, max: 4, step: 0.1 },
      { id: 'noise', label: 'Sensor noise', unit: '°', k: 1 / deg, min: 0, max: 1 * deg, step: 0.01 * deg },
    ] },
  ],
  plots: [{ id: 'th', title: 'Angle and torque', xLabel: 't', xUnit: 's', yUnit: '°', y2Unit: 'N·m' }],
  hud: [{ id: 'th', label: 'angle' }, { id: 'tau', label: 'motor torque' }, 'sep', { id: 'chk', label: '' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.grid.visible = false;
    const mat = (c) => new THREE.MeshStandardMaterial({ roughness: 0.5, color: c });
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 32), mat()); motor.position.set(0, 0, PZ); scene.add(motor);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, PZ - 0.05), mat()); base.position.set(0, 0, (PZ - 0.05) / 2); scene.add(base);
    const rod = createCurve(stage, { max: 1, width: 5, color: '--ink' });
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), mat()); scene.add(bob);
    const arc = createCurve(stage, { max: 60, width: 4, color: '--c-F' }), up = createCurve(stage, { max: 1, width: 1, color: '--c-ref', dashed: true });
    const floor = createCurve(stage, { max: 1, width: 1.4, color: '--ink-dim' }); floor.segments([-2.2, 0, 0, 2.2, 0, 0]);
    up.segments([0, -0.2, PZ, 0, -0.2, PZ + LW + 0.3]);
    const dist = createCurve(stage, { max: 3, width: 3, color: '--c-I' }), distL = ctx.label(''); scene.add(distL);
    let R = null;

    return {
      changed() { R = simulate(state, D); },
      update() {
        const i = Math.min(R.t.length - 1, Math.round(time.t / 1e-3)), th = R.th[i], tau = R.tau[i];
        const tip = [LW * Math.sin(th), -0.2, PZ + LW * Math.cos(th)];
        rod.segments([0, -0.2, PZ, ...tip]); bob.position.set(...tip);
        // torque as an arc around the pivot, length ∝ τ / τmax
        const a = [], f = Math.max(-1, Math.min(1, tau / state.tmax)), r0 = 0.38;
        for (let k = 0; k <= 40; k++) { const u = Math.PI / 2 - f * Math.PI * 0.9 * k / 40; a.push(r0 * Math.cos(u), -0.3, PZ + r0 * Math.sin(u)); }
        arc.set(a); arc.object.visible = Math.abs(f) > 0.01;
        arc.theme(); if (R.sat[i]) arc.object.material.color.set(ctx.cssVar('--c-north'));
        const t = R.t[i], push = t >= 1 && t < 1.1 && state.push, load = t >= 3 && state.load;
        dist.object.visible = distL.visible = !!(push || load);
        if (push || load) { const dir = Math.sign(push || load), p = [tip[0] - dir * 0.6, -0.2, tip[2]]; dist.segments([...p, tip[0] - dir * 0.15, -0.2, tip[2]]); distL.position.set(p[0], -0.2, p[2] + 0.15); distL.element.textContent = push ? 'push' : 'load'; }
        hud.set('th', R.fell != null && t >= R.fell ? `fell at ${R.fell.toFixed(2)} s` : `${(th / deg).toFixed(2)}°`, R.fell != null && t >= R.fell ? 'bad' : '');
        hud.set('tau', `${si(tau, 'N·m')}${R.sat[i] ? ' (saturated)' : ''}`, R.sat[i] ? 'bad' : '');
        const fin = R.th[R.th.length - 1];
        hud.set('chk', R.fell != null ? 'unstable or saturated' : `angle after ${D} s: ${(fin / deg).toFixed(2)}°`, R.fell != null ? 'bad' : Math.abs(fin) < 0.2 * deg ? 'good' : '');
        const T = [], A = [], U = []; for (let k = 0; k < R.t.length; k += 10) { T.push(R.t[k]); A.push(R.th[k] / deg); U.push(R.tau[k]); }
        plots.th.draw({ xlim: [0, D], cursor: t, series: [{ x: T, y: A, color: '--c-B', label: 'angle' }, { x: T, y: U, color: '--c-F', axis: 1, label: 'torque' }] });
      },
      theme() {
        for (const c of [rod, arc, up, floor, dist]) c.theme();
        motor.material.color.set(ctx.cssVar('--c-ref')); base.material.color.set(ctx.cssVar('--panel-2')); bob.material.color.set(ctx.cssVar('--c-B'));
      },
    };
  },
};
