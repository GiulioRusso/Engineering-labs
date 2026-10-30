// Rotations in 3D: elementary rotation matrices, composing them about current or fixed axes, Euler and
// roll–pitch–yaw angles with their singularity, axis–angle and quaternions, and homogeneous transforms.
// The rotation is played from the identity so you can watch the frame turn.
import * as THREE from 'three';
import { createVector } from '../../lib/viz/vector.js';
import { createCurve } from '../../lib/viz/curve.js';
import { I3, Rx, Ry, Rz, mul, mv, zyz, rpy, toZYZ, toRPY, axisAngle, toAxisAngle, toQuat, fromQuat, quatError, slerp } from '../kin/model.js';

const D = 6, DEG = Math.PI / 180, ER = { x: Rx, y: Ry, z: Rz };
const f2 = (v) => (Math.abs(v) < 5e-4 ? ' 0.00' : (v < 0 ? '' : ' ') + v.toFixed(2));
const rows = (R) => R.map((r) => `[${r.map(f2).join(' ')} ]`);
const ease = (u) => Math.max(0, Math.min(1, u));
const AX = [['x', 'x'], ['y', 'y'], ['z', 'z']];

export default {
  id: 'rotations', title: 'Rotations', size: 1.6,
  cameras: { iso: { pos: [2.6, -3.2, 2.1] }, front: { pos: [0, -4.2, 0.4] }, top: { pos: [0, -0.01, 4.6] }, side: { pos: [4.4, 0, 0.4] } },
  cam: 'iso', duration: D, loop: false,
  defaults: { axis: 'z', a: 90, ax1: 'z', a1: 90, ax2: 'x', a2: 90, order: 'current', conv: 'zyz', p: 30, t: 45, s: 60, el: 30, az: 20, th: 120, px: 0.6, py: 0.3, pz: 0.4, bx: 0.5, by: 0.4, bz: 0.2 },
  cases: [
    { id: 'elementary', label: 'Elementary rotations', controls: ['axis', 'a'], set: { axis: 'z', a: 90 }, examples: [
      { id: 'x45', label: '45° about x', set: { axis: 'x', a: 45 } },
      { id: 'y180', label: '180° about y', set: { axis: 'y', a: 180 } },
      { id: 'neg', label: '−90° undoes +90°', set: { axis: 'z', a: -90 } },
    ] },
    { id: 'compose', label: 'Composing rotations', controls: ['ax1', 'a1', 'ax2', 'a2', 'order'], set: { ax1: 'z', a1: 90, ax2: 'x', a2: 90, order: 'current' }, examples: [
      { id: 'fixed', label: 'Same two, about fixed axes', set: { order: 'fixed' } },
      { id: 'swap', label: 'Swapped order: a different result', set: { ax1: 'x', ax2: 'z' } },
      { id: 'same', label: 'Same axis: angles just add', set: { ax1: 'z', ax2: 'z', a1: 30, a2: 60 } },
    ] },
    { id: 'euler', label: 'Euler angles', controls: ['conv', 'p', 't', 's'], set: { conv: 'zyz', p: 30, t: 45, s: 60 }, examples: [
      { id: 'lock', label: 'ZYZ with θ = 0: gimbal lock', set: { conv: 'zyz', t: 0 } },
      { id: 'rpy', label: 'Roll–pitch–yaw', set: { conv: 'rpy', p: 30, t: 20, s: 40 } },
      { id: 'rpylock', label: 'Pitch 90°: gimbal lock', set: { conv: 'rpy', p: 30, t: 90, s: 40 } },
    ] },
    { id: 'quaternion', label: 'Axis–angle and quaternions', controls: ['az', 'el', 'th'], set: { az: 20, el: 30, th: 120 }, examples: [
      { id: 'small', label: 'Small error: |ε| ≈ θ/2', set: { th: 10 } },
      { id: 'half', label: '180°: η = 0', set: { th: 180 } },
      { id: 'task3', label: '45° about z (Jaco2 task 3)', set: { az: 0, el: 90, th: 45 } },
    ] },
    { id: 'homogeneous', label: 'Homogeneous transforms', controls: ['p', 't', 's', 'bx', 'by', 'bz', 'px', 'py', 'pz'], set: { conv: 'rpy', p: 40, t: 0, s: 0, bx: 0.5, by: 0.4, bz: 0.2, px: 0.6, py: 0.3, pz: 0.4 }, examples: [
      { id: 'shift', label: 'Translation only', set: { p: 0, t: 0, s: 0 } },
      { id: 'turn', label: 'Rotation only', set: { bx: 0, by: 0, bz: 0, p: 90 } },
    ] },
  ],
  controls: [
    { title: 'Rotation', show: (s) => s.case === 'elementary', items: [
      { id: 'axis', label: 'About axis', type: 'segmented', options: AX },
      { id: 'a', label: 'Angle', unit: '°', min: -180, max: 180, step: 1 },
    ] },
    { title: 'Two rotations', show: (s) => s.case === 'compose', items: [
      { id: 'ax1', label: 'First about', type: 'segmented', options: AX }, { id: 'a1', label: 'First angle', unit: '°', min: -180, max: 180, step: 1 },
      { id: 'ax2', label: 'Then about', type: 'segmented', options: AX }, { id: 'a2', label: 'Second angle', unit: '°', min: -180, max: 180, step: 1 },
      { id: 'order', label: 'Second axis is', type: 'segmented', options: [['current', 'Current (moved) frame'], ['fixed', 'Fixed (world) frame']] },
    ] },
    { title: 'Angles', show: (s) => s.case === 'euler' || s.case === 'homogeneous', items: [
      { id: 'conv', label: 'Convention', type: 'segmented', options: [['zyz', 'ZYZ Euler'], ['rpy', 'Roll–pitch–yaw (ZYX)']], show: (s) => s.case === 'euler' },
      { id: 'p', label: 'φ (first, about z)', unit: '°', min: -180, max: 180, step: 1 },
      { id: 't', label: 'θ (second, about y)', unit: '°', min: -90, max: 180, step: 1 },
      { id: 's', label: 'ψ (third: z for ZYZ, x for RPY)', unit: '°', min: -180, max: 180, step: 1 },
    ] },
    { title: 'Axis and angle', show: (s) => s.case === 'quaternion', items: [
      { id: 'az', label: 'Axis azimuth', unit: '°', min: -180, max: 180, step: 1 },
      { id: 'el', label: 'Axis elevation', unit: '°', min: -90, max: 90, step: 1 },
      { id: 'th', label: 'Angle θ', unit: '°', min: 0, max: 360, step: 1 },
    ] },
    { title: 'Frame 1 origin, and a point in frame 1', show: (s) => s.case === 'homogeneous', items: [
      { id: 'bx', label: 'Origin x', unit: '', min: -1, max: 1, step: 0.05 }, { id: 'by', label: 'Origin y', unit: '', min: -1, max: 1, step: 0.05 }, { id: 'bz', label: 'Origin z', unit: '', min: -1, max: 1, step: 0.05 },
      { id: 'px', label: 'Point x¹', unit: '', min: -1, max: 1, step: 0.05 }, { id: 'py', label: 'Point y¹', unit: '', min: -1, max: 1, step: 0.05 }, { id: 'pz', label: 'Point z¹', unit: '', min: -1, max: 1, step: 0.05 },
    ] },
  ],
  hud: [{ id: 'r1', label: 'R' }, { id: 'r2', label: '' }, { id: 'r3', label: '' }, 'sep', { id: 'a', label: '' }, { id: 'b', label: '' }],

  setup(ctx) {
    const { scene, state, hud, time } = ctx;
    const frame = (rad, text) => ['--c-north', '--c-v', '--c-B'].map((c, i) => createVector(scene, c, text ? `${'xyz'[i]}${text}` : '', { radius: rad }));
    const main = frame(0.012, '′'), ghost = frame(0.005, ''), mid = frame(0.006, '');
    for (const v of [...ghost, ...mid]) { v.material.transparent = true; v.material.opacity = 0.45; }
    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true, opacity: 0.85 });
    const body = new THREE.Group(); body.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.12), bodyMat));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 16), bodyMat); nose.rotation.z = -Math.PI / 2; nose.position.x = 0.47; body.add(nose);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.2), bodyMat); fin.position.set(-0.28, 0, 0.14); body.add(fin);
    scene.add(body);
    const axisV = createVector(scene, '--accent', 'r', { radius: 0.008 }), pv = createVector(scene, '--c-I', 'p', { radius: 0.007 }), ov = createVector(scene, '--ink-dim', 'o₁', { radius: 0.006 }), p1v = createVector(scene, '--c-E', 'R p¹', { radius: 0.006 });
    const trail = createCurve(ctx.stage, { max: 200, width: 2, color: '--accent' });
    const m4 = new THREE.Matrix4();
    const setFrame = (F, R, o = [0, 0, 0], len = 1) => F.forEach((v, i) => v.set(o, [R[0][i], R[1][i], R[2][i]], len));
    const hide = (F) => F.forEach((v) => v.set([0, 0, 0], [1, 0, 0], 0));
    const place = (R, o = [0, 0, 0]) => { m4.set(R[0][0], R[0][1], R[0][2], o[0], R[1][0], R[1][1], R[1][2], o[1], R[2][0], R[2][1], R[2][2], o[2], 0, 0, 0, 1); body.matrix.copy(m4); body.matrixAutoUpdate = false; body.visible = true; };
    const showR = (R) => { const r = rows(R); hud.set('r1', r[0]); hud.set('r2', r[1]); hud.set('r3', r[2]); };
    return {
      update() {
        const u = ease(time.t / D); hide(ghost); hide(mid); axisV.set([0, 0, 0], [1, 0, 0], 0); pv.set([0, 0, 0], [1, 0, 0], 0); ov.set([0, 0, 0], [1, 0, 0], 0); p1v.set([0, 0, 0], [1, 0, 0], 0); trail.object.visible = false;
        let R = I3();
        if (state.case === 'elementary') {
          R = ER[state.axis](state.a * DEG * u); setFrame(ghost, I3());
          const p = [0.8, 0.2, 0.5]; pv.set([0, 0, 0], mv(R, p), Math.hypot(...p));
          hud.set('a', `R_${state.axis}(${(state.a * u).toFixed(0)}°): its columns are the new x′, y′, z′ written in the old frame`);
          hud.set('b', `the ${state.axis} axis does not move; det R = 1, Rᵀ R = I so R⁻¹ = Rᵀ`, 'good');
        } else if (state.case === 'compose') {
          const A = (k) => ER[state[`ax${k}`]], u1 = ease(2 * u), u2 = ease(2 * u - 1), R1 = A(1)(state.a1 * DEG * u1), R2 = A(2)(state.a2 * DEG * u2);
          R = state.order === 'current' ? mul(R1, R2) : mul(R2, R1); setFrame(mid, R1); setFrame(ghost, I3());
          const full = state.order === 'current' ? mul(A(1)(state.a1 * DEG), A(2)(state.a2 * DEG)) : mul(A(2)(state.a2 * DEG), A(1)(state.a1 * DEG)), other = state.order === 'current' ? mul(A(2)(state.a2 * DEG), A(1)(state.a1 * DEG)) : mul(A(1)(state.a1 * DEG), A(2)(state.a2 * DEG));
          const same = full.every((r, i) => r.every((x, j) => Math.abs(x - other[i][j]) < 1e-9));
          hud.set('a', state.order === 'current' ? `about the current frame: R = R_${state.ax1} R_${state.ax2} (post-multiply)` : `about the fixed frame: R = R_${state.ax2} R_${state.ax1} (pre-multiply)`);
          hud.set('b', same ? 'here both orders give the same result (rotations about one axis commute)' : 'the other convention would give a different orientation: rotations do not commute', same ? 'good' : 'bad');
        } else if (state.case === 'euler' || state.case === 'homogeneous') {
          const c = state.case === 'homogeneous' ? 'rpy' : state.conv, [p, t, s] = [state.p, state.t, state.s].map((x) => x * DEG), u1 = ease(3 * u), u2 = ease(3 * u - 1), u3 = ease(3 * u - 2);
          const R1 = Rz(p * u1), R2 = mul(R1, Ry(t * u2)); R = mul(R2, (c === 'zyz' ? Rz : Rx)(s * u3));
          if (state.case === 'euler') {
            setFrame(ghost, R1, [0, 0, 0], 0.8); setFrame(mid, R2, [0, 0, 0], 0.9);
            const full = c === 'zyz' ? zyz(p, t, s) : rpy(p, t, s), back = c === 'zyz' ? toZYZ(full) : toRPY(full);
            hud.set('a', `${c === 'zyz' ? 'ZYZ' : 'RPY'}: R = R_z(φ) R_y(θ) R_${c === 'zyz' ? 'z' : 'x'}(ψ), each about the current frame`);
            hud.set('b', back.singular ? `singular: θ = ${state.t}° lines up the first and third axes, only ${c === 'zyz' ? 'φ + ψ' : 'φ − ψ'} is defined — one degree of freedom lost` : `back from R: φ = ${(back.p / DEG).toFixed(1)}°, θ = ${(back.t / DEG).toFixed(1)}°, ψ = ${(back.s / DEG).toFixed(1)}°`, back.singular ? 'bad' : 'good');
          } else {
            const o = [state.bx, state.by, state.bz].map((x) => x * u), p1 = [state.px, state.py, state.pz], Rp = mv(R, p1), p0 = o.map((x, i) => x + Rp[i]);
            setFrame(ghost, I3()); ov.between([0, 0, 0], o); p1v.between(o, p0); pv.between([0, 0, 0], p0);
            setFrame(main, R, o, 0.7); place(R, o); showR(R);
            hud.set('a', `p⁰ = o₁ + R p¹ = [${p0.map(f2).join(' ')} ]`);
            hud.set('b', `T = [R o₁; 0 0 0 1] does both at once: [p⁰; 1] = T [p¹; 1], and T⁻¹ = [Rᵀ −Rᵀo₁; 0 1]`, 'good');
            return;
          }
        } else {
          const r = [Math.cos(state.el * DEG) * Math.cos(state.az * DEG), Math.cos(state.el * DEG) * Math.sin(state.az * DEG), Math.sin(state.el * DEG)], th = state.th * DEG;
          const q1 = toQuat(axisAngle(r, th)), q = slerp(toQuat(I3()), q1, u); R = fromQuat(q);
          axisV.set([0, 0, 0], r, 1.3); setFrame(ghost, I3());
          const pts = []; for (let k = 0; k <= 60; k++) { const Rk = axisAngle(r, th * u * k / 60); pts.push(Rk[0][0], Rk[1][0], Rk[2][0]); } trail.set(pts); trail.object.visible = true;
          const qf = toQuat(axisAngle(r, th * u)), e = quatError(toQuat(I3()), qf), aa = toAxisAngle(R);
          hud.set('a', `Q = {η, ε} = {cos(θ/2), sin(θ/2) r} = {${f2(Math.cos(th * u / 2))}; ${[0, 1, 2].map((i) => f2(Math.sin(th * u / 2) * r[i])).join(' ')} }`);
          hud.set('b', `orientation error from the start (QuatError): |e_O| = ${Math.hypot(...e).toFixed(3)} = |sin(θ/2)|; recovered angle ${(aa.th / DEG).toFixed(1)}°`, 'good');
        }
        setFrame(main, R); place(R); showR(R);
      },
      theme() { [...main, ...ghost, ...mid, axisV, pv, ov, p1v].forEach((v) => v.theme()); bodyMat.color.set(ctx.cssVar('--c-ref')); trail.theme(); },
    };
  },
};
