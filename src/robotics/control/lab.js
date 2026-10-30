// Robot dynamics and motion control, two links in a vertical plane: the free arm (energy and the changing
// inertia matrix), PD control with gravity compensation, and computed torque with an imperfect model.
import { createChart } from '../../lib/viz/chart.js';
import { drawArm } from '../kin/draw.js';
import { planar } from '../kin/model.js';
import { simulate, pdOffset, ARM2, dyn2 } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 8, DEG = Math.PI / 180, HANG = [-90, 0];

export default {
  id: 'control', title: 'Dynamics and control', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { a1: 0, a2: 0, damping: 0, t1: 30, t2: 60, Kp: 100, Kd: 20, gcomp: true, law: 'ct', err: 0 },
  cases: [
    { id: 'free', label: 'The free arm', controls: ['a1', 'a2', 'damping'], set: { a1: 0, a2: 0, damping: 0 }, examples: [
      { id: 'hang', label: 'Hanging: equilibrium', set: { a1: -90, a2: 0 } },
      { id: 'small', label: 'A small swing', set: { a1: -75, a2: 10 } },
      { id: 'friction', label: 'With joint friction', set: { damping: 2 } },
    ] },
    { id: 'pd', label: 'PD + gravity compensation', controls: ['t1', 't2', 'Kp', 'Kd', 'gcomp'], set: { t1: 30, t2: 60, Kp: 100, Kd: 20, gcomp: true }, examples: [
      { id: 'nog', label: 'No gravity compensation: it sags', set: { gcomp: false } },
      { id: 'lowd', label: 'Little damping: it swings', set: { Kd: 3 } },
      { id: 'stiff', label: 'Stiffer: Kp = 400', set: { Kp: 400, Kd: 40 } },
    ] },
    { id: 'ct', label: 'Computed torque', controls: ['law', 'err', 't1', 't2'], set: { t1: 30, t2: 60, Kp: 100, Kd: 20, law: 'ct', err: 0 }, examples: [
      { id: 'pdt', label: 'PD + gravity on the same path', set: { law: 'pdt' } },
      { id: 'err', label: 'Model 30 % too light', set: { err: 0.3 } },
      { id: 'pdstiff', label: 'PD with 4× the gains', set: { law: 'pdt', Kp: 400, Kd: 40 } },
    ] },
  ],
  controls: [
    { title: 'Release from', show: (s) => s.case === 'free', items: [
      { id: 'a1', label: 'Shoulder q₁ (0 = horizontal)', unit: '°', min: -180, max: 180, step: 1 }, { id: 'a2', label: 'Elbow q₂', unit: '°', min: -180, max: 180, step: 1 },
      { id: 'damping', label: 'Joint friction', unit: 'N·m·s', min: 0, max: 5, step: 0.1 },
    ] },
    { title: 'Target (from hanging straight down)', show: (s) => s.case !== 'free', items: [
      { id: 't1', label: 'q₁ target', unit: '°', min: -90, max: 180, step: 1 }, { id: 't2', label: 'q₂ target', unit: '°', min: -150, max: 150, step: 1 },
    ] },
    { title: 'Controller', show: (s) => s.case !== 'free', items: [
      { id: 'law', label: 'Law', type: 'segmented', options: [['ct', 'Computed torque'], ['pdt', 'PD + gravity']], show: (s) => s.case === 'ct' },
      { id: 'Kp', label: 'K_P', unit: 'N·m/rad', min: 10, max: 600, step: 5 }, { id: 'Kd', label: 'K_D', unit: 'N·m·s/rad', min: 0, max: 80, step: 1 },
      { id: 'gcomp', label: 'Gravity compensation ĝ(q)', type: 'check', show: (s) => s.case === 'pd' },
      { id: 'err', label: 'Error in the model’s masses', unit: '%', k: 100, min: 0, max: 0.6, step: 0.01, show: (s) => s.case === 'ct' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    let cache = {};
    const L = ARM2.L, X = (L[0] + L[1]) * 1.1;
    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); cache = {}; },
      update() {
        const c = state.case, T = c === 'free' ? 6 : 4, tgt = [state.t1 * DEG, state.t2 * DEG];
        const cfg = c === 'free' ? { mode: 'free', q0: [state.a1 * DEG, state.a2 * DEG], damping: state.damping, T } : { mode: c === 'pd' ? 'pd' : state.law, q0: HANG.map((x) => x * DEG), q1: tgt, Kp: state.Kp, Kd: state.Kd, gcomp: c === 'pd' ? state.gcomp : true, err: c === 'ct' ? state.err : 0, T };
        const k = JSON.stringify(cfg); if (cache.k !== k) cache = { k, R: simulate(cfg) };
        const R = cache.R, ts = R.map((s) => s.t), t = T * time.t / D, i = Math.min(R.length - 1, Math.round(t / 0.01)), s = R[i];
        sq.range([-X, X], [-X, X]); sq.titles('x (m)', 'y (m): the arm in a vertical plane, gravity down');
        const tips = R.slice(0, i + 1).map((r) => planar(L, r.q).P[2]); sq.line('trail', tips.map((p) => p[0]), tips.map((p) => p[1]), { color: '--c-I', width: 1.4 });
        if (s.ref) drawArm(sq, 'ref', planar(L, s.ref).P, { color: '--line', joints: '--ink-dim', tip: '--c-north', width: 3, jointSize: 6 }); else { sq.hide('refl'); sq.dots('refj', [], []); sq.dots('reft', [], []); }
        drawArm(sq, 'arm', planar(L, s.q).P);
        if (c === 'free') {
          const Es = R.map((r) => r.E), top = Math.max(...R.map((r) => Math.max(r.K, r.U, r.E))), bot = Math.min(...R.map((r) => Math.min(r.U, r.E)));
          tr.range([0, T], [bot - 5, top + 5]); tr.titles('time (s)', 'energy (J): kinetic (orange), potential (blue), total (green)');
          tr.line('K', ts, R.map((r) => r.K), { color: '--c-I', width: 1.6 }); tr.line('U', ts, R.map((r) => r.U), { color: '--c-B', width: 1.6 }); tr.line('E', ts, Es, { color: '--c-v', width: 2.2 });
          const b = (a, b2) => R.map((r) => r.B[a][b2]), bm = Math.max(...b(0, 0)) * 1.15;
          br.range([0, T], [0, bm]); br.titles('time (s)', 'inertia matrix B(q): B₁₁ (orange), B₁₂ (green), B₂₂ (blue)');
          br.line('b11', ts, b(0, 0), { color: '--c-I', width: 1.6 }); br.line('b12', ts, b(0, 1), { color: '--c-v', width: 1.6 }); br.line('b22', ts, b(1, 1), { color: '--c-B', width: 1.6 });
          plots.aux.draw({ xlim: [0, T], cursor: s.t, series: [{ x: ts, y: R.map((r) => r.q[1] / DEG), color: '--c-E', label: 'elbow angle q₂ (°)' }] });
          hud.set('a', `B(q) = [[${fmt(s.B[0][0])}, ${fmt(s.B[0][1])}], [${fmt(s.B[1][0])}, ${fmt(s.B[1][1])}]] kg·m²: the shoulder feels less inertia when the elbow folds`);
          hud.set('b', `energy: K ${fmt(s.K)} J + U ${fmt(s.U)} J = ${fmt(s.E)} J${state.damping ? ' (friction drains it)' : ' (constant)'}`, 'good');
          hud.set('c', 'B(q) q̈ + C(q, q̇) q̇ + g(q) = τ: coupled and nonlinear; two links already swing chaotically');
        } else {
          const e = [0, 1].map((j) => R.map((r) => r.e[j] / DEG)), em = Math.max(1e-3, ...e.flat().map(Math.abs)) * 1.15;
          tr.range([0, T], [-em, em]); tr.titles('time (s)', 'joint errors (°): shoulder (orange), elbow (blue)');
          tr.line('e1', ts, e[0], { color: '--c-I', width: 1.8 }); tr.line('e2', ts, e[1], { color: '--c-B', width: 1.8 });
          const tq = [0, 1].map((j) => R.map((r) => r.tau[j])), tm = Math.max(...tq.flat().map(Math.abs)) * 1.15;
          br.range([0, T], [-tm, tm]); br.titles('time (s)', 'motor torques (N·m): shoulder, elbow');
          br.line('t1', ts, tq[0], { color: '--c-I', width: 1.6 }); br.line('t2', ts, tq[1], { color: '--c-B', width: 1.6 });
          const en = R.map((r) => Math.hypot(...r.e) / DEG);
          plots.aux.draw({ xlim: [0, T], cursor: s.t, series: [{ x: ts, y: en, color: '--c-north', label: '|error| (°)' }] });
          const fin = Math.hypot(...R.at(-1).e) / DEG, peak = Math.max(...en);
          if (c === 'pd') {
            const g = dyn2(ARM2, tgt, [0, 0]).g, off = pdOffset(tgt, state.Kp);
            hud.set('a', `τ = K_P(q_d − q) − K_D q̇${state.gcomp ? ' + ĝ(q)' : ''}: error after ${T} s ${fmt(fin)}°`, fin < 0.5 ? 'good' : 'bad');
            hud.set('b', state.gcomp ? `gravity needs g(q_d) = (${fmt(g[0])}, ${fmt(g[1])}) N·m just to hold the pose; ĝ supplies it, the PD only corrects` : `without ĝ the arm settles where K_P e = g(q): sagging to (${fmt(off[0] / DEG)}°, ${fmt(off[1] / DEG)}°)`);
            hud.set('c', `damping ratio matters: K_D small and the arm overshoots and swings; K_D large and it creeps`);
          } else {
            hud.set('a', `${state.law === 'ct' ? 'computed torque τ = B̂(q)(q̈_d + K_D ė + K_P e) + Ĉq̇ + ĝ' : 'PD + ĝ along the same moving reference'}: largest error ${fmt(peak)}°, after ${T} s ${fmt(fin)}°`, peak < 1 ? 'good' : 'bad');
            hud.set('b', state.law === 'ct' ? `the model cancels the arm’s dynamics, leaving ë + K_D ė + K_P e = 0 for each joint, decoupled${state.err ? `; with the masses ${fmt(100 * state.err)} % wrong it no longer cancels exactly` : ''}` : 'PD reacts only once an error has appeared; computed torque supplies the needed torque in advance (feedforward)');
            hud.set('c', 'the move: a quintic from hanging to the target in 1.5 s, then hold');
          }
        }
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
