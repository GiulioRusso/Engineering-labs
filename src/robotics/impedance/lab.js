// Impedance control: a two-link arm (seen from above) pushes its desired point into a compliant wall; the
// tip behaves like a mass–spring–damper, so the contact force stays bounded and set by the gains.
import { createChart } from '../../lib/viz/chart.js';
import { thin } from '../../lib/ui/schema.js';
import { drawArm } from '../kin/draw.js';
import { planar } from '../kin/model.js';
import { simulate, steadyForce, zeta, ARM, WALL, START } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 8, T = 4;

export default {
  id: 'impedance', title: 'Impedance control', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { Md: 1, Kd: 40, Kp: 400, k: 2000, push: 0.05, tp: 2, wall: true },
  cases: [
    { id: 'impedance', label: 'Pushing on a wall', controls: ['Kp', 'Kd', 'Md', 'k', 'push', 'tp', 'wall'], set: { Md: 1, Kd: 40, Kp: 400, k: 2000, push: 0.05, tp: 2, wall: true }, examples: [
      { id: 'compliant', label: 'Compliant: K_P ≪ k', set: { Kp: 100, Kd: 20 } },
      { id: 'stiff', label: 'Stiff: K_P > k', set: { Kp: 5000, Kd: 150 } },
      { id: 'hard', label: 'A ten times harder wall', set: { k: 20000 } },
      { id: 'fast', label: 'A fast push: overshoot', set: { tp: 0.2 } },
      { id: 'free', label: 'No wall: plain tracking', set: { wall: false } },
    ] },
  ],
  controls: [
    { title: 'Target impedance', items: [
      { id: 'Kp', label: 'Stiffness K_P', unit: 'N/m', min: 10, max: 10000, log: true },
      { id: 'Kd', label: 'Damping K_D', unit: 'N·s/m', min: 1, max: 300, log: true },
      { id: 'Md', label: 'Virtual mass M_d', unit: 'kg', min: 0.2, max: 10, log: true },
    ] },
    { title: 'Wall and push', items: [
      { id: 'wall', label: 'Wall present', type: 'check' },
      { id: 'k', label: 'Wall stiffness k', unit: 'N/m', min: 100, max: 50000, log: true, show: (s) => s.wall },
      { id: 'push', label: 'Desired point pushed in by', unit: 'cm', k: 100, min: 0.01, max: 0.1, step: 0.005 },
      { id: 'tp', label: 'over', unit: 's', min: 0.1, max: 3, step: 0.1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, time } = ctx;
    stage.controls.enableRotate = false;
    const sch = ctx.schema({ title: 'impedance control against a wall', gap: 40, items: [{ id: 'xd', kind: 'node', c: 0 }, { id: 'e', kind: 'sum', c: 1, signs: { l: '+', b: '−' } }, { id: 'imp', kind: 'box', t: 'Md, Kd, Kp', c: 2, label: 'virtual spring–damper' }, { id: 'arm', kind: 'box', t: 'arm', c: 3, label: 'τ = Jᵀ F' },
      { id: 'x', kind: 'node', c: 4 }, { id: 'wall', kind: 'box', t: 'wall k', c: 4, r: 1, label: 'environment' }],
      wires: [['xd', 'e'], ['e', 'imp'], ['imp', 'arm', { label: 'F' }], ['arm', 'x'], ['x', 'wall', { v: true }], ['wall', 'arm', { up: true }], ['x', 'e', { loop: true, out: 22 }]], tiles: [{ id: 'x', wire: 3, cap: 'x(t)' }] });
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    let cache = {};
    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); cache = {}; },
      update() {
        const cfg = { Md: state.Md, Kd: state.Kd, Kp: state.Kp, k: state.k, push: state.push, tp: state.tp, wall: state.wall, T };
        const key = JSON.stringify(cfg); if (cache.k !== key) cache = { k: key, R: simulate(cfg) };
        const R = cache.R; if (sch.key !== key) { sch.key = key; sch.update({ lit: state.wall ? ['wall'] : [], text: { imp: `Kp = ${state.Kp}`, wall: state.wall ? `wall k = ${state.k}` : 'no wall' }, tiles: { x: [{ y: thin(R.map((r) => r.x[0])), color: '--c-B' }, { y: thin(R.map((r) => r.xd[0])), color: '--c-north' }] } }); }
        const ts = R.map((s) => s.t), t = T * time.t / D, i = Math.min(R.length - 1, Math.round(t / (R[1].t - R[0].t))), s = R[i];
        sq.range([-0.2, 1.6], [-0.9, 0.9]); sq.titles('x (m)', 'y (m): the arm seen from above, pushing right');
        if (state.wall) sq.line('wall', [WALL + 0.012, WALL + 0.012], [-0.5, 0.5], { color: '--ink-dim', width: 9 }); else sq.hide('wall');
        drawArm(sq, 'arm', planar(ARM.L, s.q).P); sq.dots('xd', [s.xd[0]], [s.xd[1]], { color: '--c-north', size: 10 });
        const mm = (x) => (x - WALL) * 1000, xs = R.map((r) => mm(r.x[0])), xds = R.map((r) => mm(r.xd[0])), top = state.push * 1000 * 1.15;
        tr.range([0, T], [Math.min(-2, ...xs) - 1, top]); tr.titles('time (s)', 'tip (orange) and desired point (red), mm past the wall');
        tr.line('xd', ts, xds, { color: '--c-north', width: 1.6, dashed: true }); tr.line('x', ts, xs, { color: '--c-I', width: 2.2 }); tr.dots('q', [s.t], [mm(s.x[0])], { color: '--accent', size: 9 });
        const fs = R.map((r) => r.f), fss = state.wall ? steadyForce(state.Kp, state.k, state.push) : 0, fm = Math.max(1, ...fs, fss) * 1.2;
        br.range([0, T], [0, fm]); br.titles('time (s)', 'contact force (N); dashed: k K_P Δ / (K_P + k)');
        br.line('f', ts, fs, { color: '--c-E', width: 2.2 }); br.line('fs', [0, T], [fss, fss], { color: '--c-v', width: 1.2, dashed: true }); br.dots('q', [s.t], [s.f], { color: '--accent', size: 9 });
        plots.aux.draw({ xlim: [0, T], cursor: s.t, series: [{ x: ts, y: R.map((r) => Math.hypot(...r.tau)), color: '--c-B', label: 'joint torque |τ| (N·m)' }] });
        const z = zeta(state.Md, state.Kd, state.Kp, state.wall ? state.k : 0), pen = state.wall ? fss / state.k : 0;
        hud.set('a', `M_d ẍ̃ + K_D ẋ̃ + K_P x̃ = force from the wall: the tip acts like a ${fmt(state.Md)} kg mass on a ${fmt(state.Kp)} N/m spring`);
        hud.set('b', state.wall ? `at rest K_P(x_d − x) = k(x − x_wall): force ${fmt(fss)} N, tip ${fmt(pen * 1000)} mm into the wall, ${fmt(state.push * 1000 - pen * 1000)} mm short of x_d` : `free space: the tip tracks x_d exactly, error ${fmt(Math.hypot(s.x[0] - s.xd[0], s.x[1] - s.xd[1]) * 1000)} mm`, 'good');
        hud.set('c', `damping ratio in contact ζ = K_D / 2√((K_P + k) M_d) = ${fmt(z)}; ${state.Kp < state.k ? 'K_P < k: the robot gives way, the force is set by K_P' : 'K_P > k: the wall gives way, the force is set by k'}`, z < 0.2 ? 'bad' : '');
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
