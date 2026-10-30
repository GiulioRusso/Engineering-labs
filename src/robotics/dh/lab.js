// Forward kinematics with the Denavit–Hartenberg convention, in 3D: an anthropomorphic arm and the 7-joint
// Kinova Jaco2 of the course project. Every frame of the chain is drawn; one is highlighted with its DH row.
import * as THREE from 'three';
import { createVector } from '../../lib/viz/vector.js';
import { createCurve } from '../../lib/viz/curve.js';
import { fk, jacobian, pof, Rof, toRPY, rank, ROBOTS } from '../kin/model.js';

const DEG = Math.PI / 180, D = 8;
const f2 = (v) => (Math.abs(v) < 5e-4 ? '0' : v.toFixed(3));
const joints = (n) => Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}`, label: `Joint ${i + 1}`, unit: '°', min: -180, max: 180, step: 1 }));

export default {
  id: 'dh', title: 'Denavit–Hartenberg', size: 1.3,
  cameras: { iso: { pos: [2.1, -2.4, 1.6], target: [0, 0, 0.45] }, front: { pos: [0, -3.2, 0.6], target: [0, 0, 0.45] }, top: { pos: [0, -0.01, 3.4] }, side: { pos: [3.2, 0, 0.6], target: [0, 0, 0.45] } },
  cam: 'iso', duration: D, loop: true,
  defaults: { robot: 'anthropomorphic', k: 3, sweep: false, q1: 0, q2: 30, q3: -60, q4: 0, q5: 0, q6: 0, q7: 0 },
  cases: [
    { id: 'anthro', label: 'Anthropomorphic arm', controls: ['q1', 'q2', 'q3', 'k'], set: { robot: 'anthropomorphic', k: 3, q1: 0, q2: 30, q3: -60 }, examples: [
      { id: 'base', label: 'Turn the base: the whole arm swings', set: { q1: 60 } },
      { id: 'down', label: 'Elbow down', set: { q2: -20, q3: 60 } },
      { id: 'reach', label: 'Stretched out', set: { q2: 0, q3: 0 } },
      { id: 'frame1', label: 'Frame 1: the first DH row', set: { k: 1 } },
    ] },
    { id: 'jaco2', label: 'Kinova Jaco2 (7 joints)', controls: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'k'], set: { robot: 'jaco2', k: 7, q1: 77, q2: -17, q3: 0, q4: 43, q5: -94, q6: 77, q7: 71 }, examples: [
      { id: 'zero', label: 'All joints at zero', set: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0 } },
      { id: 'wrist', label: 'Only the wrist turns', set: { q7: 161 } },
      { id: 'elbow', label: 'Joint 3: the redundant elbow', set: { q3: 60 } },
    ] },
  ],
  controls: [
    { title: 'Joint angles θᵢ', items: joints(7).map((j, i) => ({ ...j, show: (s) => i < (s.case === 'jaco2' ? 7 : 3) })) },
    { title: 'Inspect', items: [{ id: 'k', label: 'Highlight frame', unit: '', min: 0, max: 7, step: 1 }, { id: 'sweep', label: 'Sweep the highlighted joint', type: 'check' }] },
  ],
  hud: [{ id: 'row', label: 'DH row' }, { id: 'p', label: 'tip position' }, { id: 'o', label: 'tip roll–pitch–yaw' }, 'sep', { id: 'c', label: '' }],

  setup(ctx) {
    const { scene, state, hud, time } = ctx;
    const linkMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 }), jointMat = new THREE.MeshStandardMaterial({ roughness: 0.4 }), hiMat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
    const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
    const links = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1, 16).translate(0, 0.5, 0), linkMat); scene.add(m); return m; });
    const jts = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 20), jointMat); scene.add(m); return m; });
    const triads = Array.from({ length: 8 }, () => ['--c-north', '--c-v', '--c-B'].map((c) => createVector(scene, c, '', { radius: 0.004 })));
    const big = ['--c-north', '--c-v', '--c-B'].map((c, i) => createVector(scene, c, `${'xyz'[i]}`, { radius: 0.008 }));
    const trail = createCurve(ctx.stage, { max: 400, width: 2, color: '--accent' });
    const tags = Array.from({ length: 8 }, (_, i) => { const l = ctx.label(`${i}`, 'tick'); scene.add(l); return l; });
    const between = (m, a, b) => { tmp.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = tmp.length(); m.visible = L > 1e-4; if (!m.visible) return; m.position.set(...a); m.quaternion.setFromUnitVectors(up, tmp.normalize()); m.scale.set(1, L, 1); };
    return {
      update() {
        const R = ROBOTS[state.robot], n = R.rows.length, k = Math.min(Math.round(state.k), n);
        const q = Array.from({ length: n }, (_, i) => state[`q${i + 1}`] * DEG);
        if (state.sweep && k >= 1) q[k - 1] += 60 * DEG * Math.sin(2 * Math.PI * time.t / D);
        const F = fk(R.rows, q), O = F.map(pof);
        links.forEach((m, i) => { if (i < n) between(m, O[i], O[i + 1]); else m.visible = false; });
        jts.forEach((m, i) => { m.visible = i < n; if (!m.visible) return; const z = Rof(F[i]).map((r) => r[2]); m.position.set(...O[i]); m.quaternion.setFromUnitVectors(up, tmp.set(...z)); m.material = i === k - 1 ? hiMat : jointMat; });
        triads.forEach((T, i) => T.forEach((v, c) => { if (i > n) return v.set([0, 0, 0], [1, 0, 0], 0); const Rm = Rof(F[i]); v.set(O[i], [Rm[0][c], Rm[1][c], Rm[2][c]], 0.09); }));
        tags.forEach((l, i) => { l.visible = i <= n; if (l.visible) { l.element.textContent = `${i}`; l.position.set(O[i][0], O[i][1], O[i][2] + 0.07); } });
        const Rk = Rof(F[k]); big.forEach((v, c) => v.set(O[k], [Rk[0][c], Rk[1][c], Rk[2][c]], 0.22));
        if (state.sweep && k >= 1) { const pts = []; for (let s = 0; s <= 120; s++) { const qq = [...q]; qq[k - 1] = state[`q${k}`] * DEG + 60 * DEG * Math.sin(2 * Math.PI * s / 120); pts.push(...pof(fk(R.rows, qq).at(-1))); } trail.set(pts); trail.object.visible = true; } else trail.object.visible = false;
        const r = k >= 1 ? R.rows[k - 1] : null, tip = O[n], e = toRPY(Rof(F[n])), J = jacobian(F);
        hud.set('row', r ? `frame ${k}: a = ${r.a} m, α = ${(r.al / DEG).toFixed(0)}°, d = ${r.d} m, θ = q${k} = ${(q[k - 1] / DEG).toFixed(0)}°` : 'frame 0: the base');
        hud.set('p', `(${tip.map(f2).join(', ')}) m`);
        hud.set('o', `φ ${(e.p / DEG).toFixed(1)}°, θ ${(e.t / DEG).toFixed(1)}°, ψ ${(e.s / DEG).toFixed(1)}°`);
        const rk = rank(J);
        const pr = rank(J.slice(0, 3)), bad = n > 6 ? rk < 6 : pr < 3;
        hud.set('c', n > 6 ? (rk < 6 ? `singular: Jacobian rank ${rk} of 6, the hand cannot move or turn in every direction` : `7 joints for a 6-D task: one spare degree of freedom (Jacobian rank ${rk}); the elbow can move with the hand still`) : `3 joints set the tip position; its orientation just follows. Position Jacobian rank ${pr} of 3${pr < 3 ? ': singular, the tip cannot move in every direction' : ''}`, bad ? 'bad' : 'good');
      },
      theme() { linkMat.color.set(ctx.cssVar('--c-ref')); jointMat.color.set(ctx.cssVar('--ink-dim')); hiMat.color.set(ctx.cssVar('--accent')); [...triads.flat(), ...big].forEach((v) => v.theme()); trail.theme(); },
    };
  },
};
