// Closed-loop inverse kinematics on a three-link planar arm: the Jaco2 project's square path tracked with
// the pseudo-inverse, the transpose or damped least squares; and the arm's redundancy used for a second goal.
import { createChart } from '../../lib/viz/chart.js';
import { drawArm } from '../kin/draw.js';
import { clik, planar, ARM3, STARTS, DEG } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 12;
const ALG = { pinv: 'pseudo-inverse J⁺', transpose: 'transpose Jᵀ', dls: 'damped least squares' };

export default {
  id: 'clik', title: 'CLIK', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { path: 'square', start: 'comfortable', alg: 'pinv', K: 50, lambda: 0.1, task: 'pos', nul: 'none', k0: 5 },
  cases: [
    { id: 'clik', label: 'CLIK tracking', controls: ['path', 'alg', 'K', 'lambda', 'task', 'start'], set: { path: 'square', start: 'comfortable', alg: 'pinv', K: 50, task: 'pos', nul: 'none' }, examples: [
      { id: 'transpose', label: 'Transpose: simpler, lags', set: { alg: 'transpose', K: 20 } },
      { id: 'lowgain', label: 'Low gain K = 5', set: { K: 5 } },
      { id: 'pose', label: 'Hold the orientation too', set: { task: 'pose' } },
      { id: 'circle', label: 'A circle', set: { path: 'circle' } },
      { id: 'singular', label: 'Out of reach: J⁺ blows up', set: { start: 'stretched' } },
      { id: 'dls', label: 'Same, damped least squares', set: { start: 'stretched', alg: 'dls', lambda: 0.3 } },
    ] },
    { id: 'redundancy', label: 'Redundancy', controls: ['nul', 'k0', 'path'], set: { path: 'square', start: 'comfortable', alg: 'pinv', K: 50, task: 'pos', nul: 'center', k0: 5 }, examples: [
      { id: 'none', label: 'No second goal', set: { nul: 'none' } },
      { id: 'manip', label: 'Maximise manipulability', set: { nul: 'manip' } },
      { id: 'self', label: 'Tip still, arm moves', set: { path: 'still', nul: 'center', k0: 2 } },
    ] },
  ],
  controls: [
    { title: 'Task', items: [
      { id: 'path', label: 'Tip path', type: 'segmented', options: [['square', 'Square'], ['circle', 'Circle'], ['still', 'Stay still']] },
      { id: 'task', label: 'Controlled', type: 'segmented', options: [['pos', 'Position (x, y)'], ['pose', 'Position and angle']], show: (s) => s.case === 'clik' },
      { id: 'start', label: 'Start', type: 'segmented', options: [['comfortable', 'Comfortable'], ['stretched', 'Nearly stretched']], show: (s) => s.case === 'clik' },
    ] },
    { title: 'CLIK law', show: (s) => s.case === 'clik', items: [
      { id: 'alg', label: 'Inverse', type: 'segmented', options: [['pinv', 'J⁺'], ['transpose', 'Jᵀ'], ['dls', 'Damped']] },
      { id: 'K', label: 'Gain K', unit: '1/s', min: 1, max: 90, step: 1 },
      { id: 'lambda', label: 'Damping λ', unit: '', min: 0.01, max: 0.5, step: 0.01, show: (s) => s.alg === 'dls' },
    ] },
    { title: 'Second goal (null space)', show: (s) => s.case === 'redundancy', items: [
      { id: 'nul', label: 'Goal', type: 'segmented', options: [['none', 'None'], ['center', 'Centre the joints'], ['manip', 'Manipulability']] },
      { id: 'k0', label: 'Gain k₀', unit: '', min: 0, max: 10, step: 0.5 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    let cache = {};
    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); cache = {}; },
      update() {
        const red = state.case === 'redundancy', cfg = { q0: STARTS[red ? 'comfortable' : state.start], path: state.path, alg: red ? 'pinv' : state.alg, K: state.K, lambda: state.lambda, task: red ? 'pos' : state.task, nul: red ? state.nul : 'none', k0: state.k0 };
        const k = JSON.stringify(cfg); if (cache.k !== k) cache = { k, R: clik(cfg) };
        const { out, total } = cache.R, ts = out.map((o) => o.t), t = total * time.t / D, i = Math.min(out.length - 1, Math.round(t / 0.01)), o = out[i];
        sq.range([-0.3, 2.1], [-0.6, 1.8]); sq.titles('x (m)', 'y (m)');
        sq.line('pd', out.map((p) => p.pd[0]), out.map((p) => p.pd[1]), { color: '--ink-dim', width: 1.4, dashed: true });
        const done = out.slice(0, i + 1); sq.line('pe', done.map((p) => p.pe[0]), done.map((p) => p.pe[1]), { color: '--c-I', width: 2.4 });
        [0.25, 0.5, 0.75].forEach((f, j) => { const g = out[Math.round(f * (out.length - 1))]; if (g.t <= t) drawArm(sq, `g${j}`, planar(ARM3, g.q).P, { color: '--line', joints: '--ink-dim', tip: null, width: 3, jointSize: 6 }); else { sq.hide(`g${j}l`); sq.dots(`g${j}j`, [], []); } });
        drawArm(sq, 'arm', planar(ARM3, o.q).P); sq.dots('tgt', [o.pd[0]], [o.pd[1]], { color: '--c-north', size: 8 });
        const emm = out.map((p) => p.e * 1000), em = Math.max(...emm);
        tr.range([0, total], [0, Math.max(em * 1.15, 1e-3)]); tr.titles('time (s)', 'tracking error |p_d − p_e| (mm)'); tr.line('e', ts, emm, { color: '--c-north', width: 2 }); tr.dots('q', [o.t], [o.e * 1000], { color: '--accent', size: 9 });
        const qs = [0, 1, 2].map((j) => out.map((p) => p.q[j] / DEG)), lo = Math.min(...qs.flat()), hi = Math.max(...qs.flat());
        br.range([0, total], [Math.min(lo, -10) - 10, Math.max(hi, 10) + 10]); br.titles('time (s)', 'joint angles q₁, q₂, q₃ (°)');
        ['--c-B', '--c-v', '--c-E'].forEach((c, j) => br.line(`q${j}`, ts, qs[j], { color: c, width: 1.8 }));
        if (red) plots.aux.draw({ xlim: [0, total], cursor: o.t, series: [{ x: ts, y: out.map((p) => p.dist), color: '--c-v', label: 'distance of the joints from the centres of their ranges (rad)' }, { x: ts, y: out.map((p) => p.w), color: '--c-B', label: 'manipulability √det(J Jᵀ)' }] });
        else plots.aux.draw({ xlim: [0, total], cursor: o.t, series: [{ x: ts, y: out.map((p) => p.qdn), color: '--c-E', label: 'joint speed |q̇| (rad/s)' }] });
        const qmax = Math.max(...out.map((p) => p.qdn)), rms = Math.sqrt(out.reduce((s, p) => s + p.e * p.e, 0) / out.length) * 1000;
        if (red) {
          hud.set('a', `q̇ = J⁺(ẋ_d + K e) + (I − J⁺J) k₀ ∇w: 3 joints, 2 coordinates to control, one spare`);
          hud.set('b', `tip error at most ${fmt(em)} mm: the null-space term never disturbs the tip`, 'good');
          hud.set('c', state.nul === 'none' ? 'no second goal: the posture drifts wherever the minimum-speed solution takes it' : `${state.nul === 'center' ? 'joints pulled towards the middle of their ranges' : 'posture steered to make the tip move freely'}: distance from the centres ${fmt(o.dist)} rad, manipulability ${fmt(o.w)}`);
        } else {
          hud.set('a', `${ALG[state.alg]}, K = ${state.K}: error now ${fmt(o.e * 1000)} mm, largest ${fmt(em)} mm, RMS ${fmt(rms)} mm${state.task === 'pose' ? `, angle error ${fmt(o.eo / DEG)}°` : ''}`, em > 5 ? 'bad' : 'good');
          hud.set('b', state.alg === 'transpose' ? 'q̇ = Jᵀ K e: no inverse to compute and no blow-up, but no feedforward of ẋ_d either: it always lags' : `q̇ = J${state.alg === 'dls' ? 'ᵀ(JJᵀ + λ²I)⁻¹' : '⁺'}(ẋ_d + K e): feedforward of the path speed plus a correction K e, so e decays as e^(−Kt)`);
          hud.set('c', `largest joint speed ${fmt(qmax)} rad/s${qmax > 10 ? ': near a singularity the inverse explodes' : ''}`, qmax > 10 ? 'bad' : '');
        }
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
