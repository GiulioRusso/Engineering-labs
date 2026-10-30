// A two-link planar arm: forward kinematics and workspace, inverse kinematics (elbow up and down), the
// Jacobian with its velocity ellipse and singularities, and statics (τ = Jᵀ F) with the force ellipse.
import { createChart } from '../../lib/viz/chart.js';
import { drawArm, ellipsePts } from '../kin/draw.js';
import { ik2, manip, torques, jointSpeeds, planar } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], X = 2, G = 100, DEG = Math.PI / 180;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const xy = (P) => [P.map((p) => p[0]), P.map((p) => p[1])];

export default {
  id: 'planar', title: 'Planar arm', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { L1: 1, L2: 0.7, q1: 30, q2: 60, x: 1.1, y: 0.6, elbow: 'up', qd1: 1, qd2: 0, Fx: 0, Fy: -10 },
  cases: [
    { id: 'fk', label: 'Forward kinematics', controls: ['q1', 'q2', 'L1', 'L2'], set: { q1: 30, q2: 60, L1: 1, L2: 0.7 }, examples: [
      { id: 'stretch', label: 'Stretched: the outer edge', set: { q2: 0 } },
      { id: 'fold', label: 'Folded: the inner edge', set: { q2: 180 } },
      { id: 'equal', label: 'Equal links: reach the base', set: { L2: 1, q2: 150 } },
    ] },
    { id: 'ik', label: 'Inverse kinematics', controls: ['x', 'y', 'elbow'], set: { x: 1.1, y: 0.6, elbow: 'up' }, examples: [
      { id: 'down', label: 'Elbow down', set: { elbow: 'down' } },
      { id: 'edge', label: 'On the edge: one solution', set: { x: 1.7, y: 0 } },
      { id: 'out', label: 'Out of reach', set: { x: 1.6, y: 0.9 } },
    ] },
    { id: 'jac', label: 'Jacobian and singularities', controls: ['q1', 'q2', 'qd1', 'qd2'], set: { q1: 30, q2: 60, qd1: 1, qd2: 0 }, examples: [
      { id: 'best', label: 'q₂ = 90°: roundest ellipse', set: { q2: 90 } },
      { id: 'near', label: 'Nearly stretched: q₂ = 5°', set: { q2: 5, qd1: 0, qd2: 1 } },
      { id: 'sing', label: 'Stretched: singular', set: { q2: 0 } },
    ] },
    { id: 'statics', label: 'Statics: τ = Jᵀ F', controls: ['q1', 'q2', 'Fx', 'Fy'], set: { q1: 30, q2: 60, Fx: 0, Fy: -10 }, examples: [
      { id: 'hold', label: 'Holding 1 kg at arm’s length', set: { q1: 0, q2: 0, Fx: 0, Fy: 9.81 } },
      { id: 'push', label: 'Pushing along a stretched arm', set: { q1: 0, q2: 0, Fx: 20, Fy: 0 } },
      { id: 'bent', label: 'Same push, elbow bent', set: { q1: -30, q2: 60, Fx: 20, Fy: 0 } },
    ] },
  ],
  controls: [
    { title: 'Joints', show: (s) => s.case !== 'ik', items: [
      { id: 'q1', label: 'Shoulder q₁', unit: '°', min: -180, max: 180, step: 1 }, { id: 'q2', label: 'Elbow q₂', unit: '°', min: -180, max: 180, step: 1 },
    ] },
    { title: 'Links', show: (s) => s.case === 'fk', items: [
      { id: 'L1', label: 'Link 1', unit: 'm', min: 0.3, max: 1.2, step: 0.05 }, { id: 'L2', label: 'Link 2', unit: 'm', min: 0.3, max: 1.2, step: 0.05 },
    ] },
    { title: 'Target', show: (s) => s.case === 'ik', items: [
      { id: 'x', label: 'Target x', unit: 'm', min: -1.9, max: 1.9, step: 0.01 }, { id: 'y', label: 'Target y', unit: 'm', min: -1.9, max: 1.9, step: 0.01 },
      { id: 'elbow', label: 'Solution', type: 'segmented', options: [['up', 'Elbow up'], ['down', 'Elbow down']] },
    ] },
    { title: 'Joint speeds', show: (s) => s.case === 'jac', items: [
      { id: 'qd1', label: 'q̇₁', unit: 'rad/s', min: -1.5, max: 1.5, step: 0.05 }, { id: 'qd2', label: 'q̇₂', unit: 'rad/s', min: -1.5, max: 1.5, step: 0.05 },
    ] },
    { title: 'Force applied by the tip', show: (s) => s.case === 'statics', items: [
      { id: 'Fx', label: 'F_x', unit: 'N', min: -30, max: 30, step: 0.5 }, { id: 'Fy', label: 'F_y', unit: 'N', min: -30, max: 30, step: 0.5 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 'q₂', xUnit: '°', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 6 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    let wsKey = '';
    const workspace = (L) => { // shade the reachable annulus
      const k = L.join(); if (k === wsKey) return sq.image('ws', wsVals, G, G, { rgb: wsRgb }); wsKey = k;
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const r = Math.hypot(-X + 2 * X * (i + 0.5) / G, -X + 2 * X * (j + 0.5) / G); wsVals[j * G + i] = r <= L[0] + L[1] && r >= Math.abs(L[0] - L[1]) ? 1 : 0; }
      sq.image('ws', wsVals, G, G, { rgb: wsRgb });
    };
    const wsVals = new Float64Array(G * G), wsRgb = (k, o) => { const v = wsVals[k]; o[0] = v ? 0.14 : 0.07; o[1] = v ? 0.2 : 0.08; o[2] = v ? 0.3 : 0.11; };
    const jointSpace = (pts) => { tr.range([-180, 180], [-180, 180]); tr.titles('q₁ (°)', 'q₂ (°): joint space'); tr.dots('js', pts.map((p) => p[0] / DEG), pts.map((p) => p[1] / DEG), { color: '--accent', size: 10 }); };
    const detCurve = (L, q2) => { const qs = lin(-180, 180, 181); br.range([-180, 180], [0, L[0] * L[1] * 1.15]); br.titles('elbow q₂ (°)', '|det J| = l₁ l₂ |sin q₂|'); br.line('det', qs, qs.map((d) => L[0] * L[1] * Math.abs(Math.sin(d * DEG))), { color: '--c-B', width: 2 }); br.dots('q', [q2], [L[0] * L[1] * Math.abs(Math.sin(q2 * DEG))], { color: '--accent', size: 10 }); };
    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); },
      update() {
        used = 0; pool.forEach((l) => { l.visible = false; });
        const L = state.case === 'fk' ? [state.L1, state.L2] : [1, 0.7], q = [state.q1 * DEG, state.q2 * DEG];
        sq.range([-X, X], [-X, X]); sq.titles('x (m)', 'y (m)'); workspace(L);
        if (state.case === 'fk') {
          const { P, phi } = planar(L, q); drawArm(sq, 'arm', P);
          jointSpace([q]);
          const qs = lin(-180, 180, 181), r = (d) => Math.sqrt(L[0] ** 2 + L[1] ** 2 + 2 * L[0] * L[1] * Math.cos(d * DEG));
          br.range([-180, 180], [0, (L[0] + L[1]) * 1.1]); br.titles('elbow q₂ (°)', 'reach: distance from the base to the tip (m)'); br.line('r', qs, qs.map(r), { color: '--c-v', width: 2 }); br.dots('q', [state.q2], [r(state.q2)], { color: '--accent', size: 10 });
          plots.aux.draw({ xlim: [-180, 180], cursor: state.q2, series: [{ x: qs, y: qs.map(r), color: '--c-v', label: 'reach (m)' }] });
          hud.set('a', `tip x = l₁cos q₁ + l₂cos(q₁+q₂) = ${fmt(P[2][0])} m, y = ${fmt(P[2][1])} m, pointing ${fmt(phi / DEG)}°`);
          hud.set('b', `reach ${fmt(Math.hypot(...P[2]))} m: only the elbow changes it; the shoulder only turns the arm round`);
          hud.set('c', `workspace (shaded): a ring from |l₁ − l₂| = ${fmt(Math.abs(L[0] - L[1]))} m to l₁ + l₂ = ${fmt(L[0] + L[1])} m`, 'good');
        } else if (state.case === 'ik') {
          const { c2, sols } = ik2(L, state.x, state.y), pick = sols.length ? sols[state.elbow === 'up' ? 1 : 0] : null; // q₂ < 0 lifts the elbow above the line to the target
          sq.dots('tgt', [state.x], [state.y], { color: '--c-north', size: 14 });
          sols.forEach((s, i) => { const P = planar(L, s).P; if (s === pick) drawArm(sq, 'arm', P); else drawArm(sq, 'ghost', P, { color: '--line', joints: '--ink-dim', tip: null, width: 3 }); });
          if (!pick) { sq.hide('arml'); sq.dots('armj', [], []); sq.dots('armt', [], []); }
          if (sols.length < 2) { sq.hide('ghostl'); sq.dots('ghostj', [], []); }
          jointSpace(sols);
          br.range([-1.5, 1.5], [0, 1]); br.titles('cos q₂ = (x² + y² − l₁² − l₂²)/(2 l₁ l₂)', 'must lie in [−1, 1]');
          br.line('lo', [-1, -1], [0, 1], { color: '--c-v', width: 1.4, dashed: true }); br.line('hi', [1, 1], [0, 1], { color: '--c-v', width: 1.4, dashed: true }); br.stems('c', [Math.max(-1.5, Math.min(1.5, c2))], [0.8], { color: sols.length ? '--accent' : '--c-north', width: 6 });
          const xs = lin(-1.9, 1.9, 200);
          plots.aux.draw({ xlim: [-1.9, 1.9], ylim: [-2, 2], cursor: state.x, series: [{ x: xs, y: xs.map((x) => ik2(L, x, state.y).c2), color: '--c-B', label: `cos q₂ as the target slides along x at y = ${fmt(state.y)} m (reachable between −1 and 1)` }] });
          hud.set('a', pick ? `q₁ = ${fmt(pick[0] / DEG)}°, q₂ = ${fmt(pick[1] / DEG)}° (elbow ${state.elbow}); the other solution: q₁ = ${fmt(sols[state.elbow === 'up' ? 0 : 1][0] / DEG)}°, q₂ = ${fmt(sols[state.elbow === 'up' ? 0 : 1][1] / DEG)}°` : 'no solution: the target is outside the ring the arm can reach', pick ? '' : 'bad');
          hud.set('b', `cos q₂ = ${fmt(c2)}; q₂ = ±acos(cos q₂): two mirror-image elbows${Math.abs(Math.abs(c2) - 1) < 1e-3 ? ', merged into one on the edge' : ''}`);
          hud.set('c', 'then q₁ = atan2(y, x) − atan2(l₂ sin q₂, l₁ + l₂ cos q₂)', 'good');
        } else {
          const { P } = planar(L, q), m = manip(L, q), tip = P[2]; drawArm(sq, 'arm', P);
          const s = 0.5, ve = ellipsePts(tip, m.vel.a * s, m.vel.b * s, m.vel.th);
          sq.line('vel', ...xy(ve), { color: '--c-B', width: 2 });
          if (state.case === 'jac') {
            const qd = [state.qd1, state.qd2], v = [m.J[0][0] * qd[0] + m.J[0][1] * qd[1], m.J[1][0] * qd[0] + m.J[1][1] * qd[1]];
            sq.line('v', [tip[0], tip[0] + s * v[0]], [tip[1], tip[1] + s * v[1]], { color: '--c-I', width: 3 }); sq.hide('F'); sq.hide('fe');
            tr.range([-1.6, 1.6], [-1.6, 1.6]); tr.titles('q̇₁ (rad/s)', 'q̇₂: unit circle maps to the ellipse');
            tr.line('c', ...xy(ellipsePts([0, 0], 1, 1, 0)), { color: '--c-B', width: 1.4 }); tr.line('v', [0, qd[0]], [0, qd[1]], { color: '--c-I', width: 2.4 });
            detCurve(L, state.q2);
            const need = jointSpeeds(m.J, [0, 0.5]);
            plots.aux.draw({ xlim: [-180, 180], cursor: state.q2, series: [{ x: lin(-180, 180, 181), y: lin(-180, 180, 181).map((d) => 0.7 * Math.abs(Math.sin(d * DEG))), color: '--c-B', label: '|det J|' }] });
            hud.set('a', `v = J q̇ = (${fmt(v[0])}, ${fmt(v[1])}) m/s; J = [[${fmt(m.J[0][0])}, ${fmt(m.J[0][1])}], [${fmt(m.J[1][0])}, ${fmt(m.J[1][1])}]]`);
            hud.set('b', `ellipse (blue, half scale): unit joint speeds reach ${fmt(m.vel.a)} m/s along its long axis, only ${fmt(m.vel.b)} m/s across; |det J| = ${fmt(m.w)}`, m.w < 0.05 ? 'bad' : 'good');
            hud.set('c', need ? `to move the tip 0.5 m/s straight up: q̇ = (${fmt(need[0])}, ${fmt(need[1])}) rad/s` : 'singular: J has no inverse, the tip cannot move along the arm at all', need && Math.hypot(...need) < 5 ? '' : 'bad');
          } else {
            const F = [state.Fx, state.Fy], tau = torques(m.J, F), sF = 0.03, fe = ellipsePts(tip, Math.min(m.force.a, 6) * 0.25, m.force.b * 0.25, m.force.th);
            sq.line('F', [tip[0], tip[0] + sF * F[0]], [tip[1], tip[1] + sF * F[1]], { color: '--c-north', width: 3 }); sq.line('fe', ...xy(fe), { color: '--c-north', width: 1.4, dashed: true }); sq.hide('v');
            const top = Math.max(10, ...tau.map(Math.abs)) * 1.2;
            tr.range([0.4, 2.6], [-top, top]); tr.titles('', 'joint torques τ = Jᵀ F (N·m)'); tr.stems('t1', [1], [tau[0]], { color: '--c-I', width: 16 }); tr.stems('t2', [2], [tau[1]], { color: '--c-E', width: 16 });
            put('shoulder', tr.mx(1), TR[1] - 0.18); put('elbow', tr.mx(2), TR[1] - 0.18);
            detCurve(L, state.q2);
            const an = lin(-180, 180, 181), fa = Math.atan2(F[1], F[0]) / DEG;
            plots.aux.draw({ xlim: [-180, 180], cursor: fa, series: [{ x: an, y: an.map((d) => Math.hypot(...torques(m.J, [Math.cos(d * DEG), Math.sin(d * DEG)]))), color: '--c-north', label: '|τ| for a 1 N push in each direction (°): small where the arm pushes easily' }] });
            hud.set('a', `tip pushes with F = (${fmt(F[0])}, ${fmt(F[1])}) N: needs τ₁ = ${fmt(tau[0])} N·m, τ₂ = ${fmt(tau[1])} N·m`);
            hud.set('b', 'force ellipse (red dashed) is the velocity ellipse turned inside out: where the tip moves easily it pushes weakly, and the reverse');
            hud.set('c', m.w < 1e-3 ? 'singular: a force along the arm costs no torque at all, the structure carries it' : `power balance: τ·q̇ = F·v for any motion (virtual work)`, 'good');
          }
        }
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
