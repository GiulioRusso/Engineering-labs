// Optimizers racing on a 3D loss surface: gradient descent, momentum, RMSProp and Adam start from the same
// point and walk downhill; the floor carries the contour map, the bottom plot the loss of each.
import { createCurve } from '../../lib/viz/curve.js';
import { createSurface } from '../../lib/viz/surface.js';
import { SURFACES, OPTS, run } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : 'diverged');
const COL = { gd: '--c-ref', momentum: '--c-B', rmsprop: '--c-v', adam: '--c-I' }, NAME = { gd: 'gradient descent', momentum: 'momentum', rmsprop: 'RMSProp', adam: 'Adam' };
const H = 2.2, N = 200;

export default {
  id: 'optimizers', title: 'Optimizers on a loss surface', size: 4, plain: true, cam: 'iso', duration: 12, loop: false,
  cameras: { iso: { pos: [6.5, -8.5, 7], target: [0, 0, 0.6] }, top: { pos: [0, -0.01, 11] } },
  defaults: { surf: 'ravine', lr: 0.03, beta: 0.9, noise: 0, gd: true, momentum: true, rmsprop: true, adam: true },
  cases: [
    { id: 'ravine', label: 'Ravine', set: { surf: 'ravine', lr: 0.03 }, examples: [
      { id: 'zig', label: 'Larger step: GD zig-zags across', controls: ['lr'], set: { lr: 0.15 } },
      { id: 'blow', label: 'Too large: GD diverges', controls: ['lr'], set: { lr: 0.18 } },
    ] },
    { id: 'rosen', label: 'Banana valley', set: { surf: 'rosen', lr: 0.01 }, examples: [
      { id: 'adam', label: 'Adam with a bigger step', controls: ['lr'], set: { lr: 0.05, gd: false, momentum: false, rmsprop: false } },
    ] },
    { id: 'saddle', label: 'Saddle point', set: { surf: 'saddle', lr: 0.05 }, examples: [
      { id: 'noise', label: 'Noisy gradients knock it off', controls: ['noise'], set: { noise: 0.5 } },
    ] },
    { id: 'wells', label: 'Two valleys', set: { surf: 'wells', lr: 0.1 }, examples: [
      { id: 'mom', label: 'Momentum rolls over the ridge', controls: ['beta'], set: { beta: 0.95 } },
      { id: 'sgd', label: 'Noise: different runs, different valleys', controls: ['noise'], set: { noise: 1 } },
    ] },
  ],
  controls: [
    { title: 'Optimizers', items: [
      { id: 'lr', label: 'Learning rate η', unit: '', min: 0.001, max: 0.5, log: true }, { id: 'beta', label: 'Momentum β', unit: '', min: 0, max: 0.99, step: 0.01 }, { id: 'noise', label: 'Gradient noise', unit: '', min: 0, max: 2, step: 0.05 },
      { id: 'gd', label: 'Gradient descent (grey)', type: 'check' }, { id: 'momentum', label: 'Momentum (blue)', type: 'check' }, { id: 'rmsprop', label: 'RMSProp (green)', type: 'check' }, { id: 'adam', label: 'Adam (orange)', type: 'check' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    const surf = createSurface(scene, { nx: 90, ny: 90, x: [-3, 3], y: [-3, 3], opacity: 0.82 }), cont = createCurve(stage, { max: 20000, width: 1, color: '--ink-dim' });
    const paths = Object.fromEntries(OPTS.map((k) => [k, createCurve(stage, { max: 1200, width: 3, color: COL[k] })])), balls = Object.fromEntries(OPTS.map((k) => [k, createCurve(stage, { max: 40, width: 4, color: COL[k] })]));
    const star = createCurve(stage, { max: 20, width: 2.4, color: '--c-north' });
    let key = '', R = {}, map = null;
    return {
      changed() {
        const S = SURFACES[state.surf], s = 3 / S.box, k2 = `${state.surf},${state.lr},${state.beta},${state.noise}`;
        if (k2 !== key) {
          key = k2; let lo = Infinity, hi = -Infinity; for (let j = 0; j <= 60; j++) for (let i = 0; i <= 60; i++) { const v = S.f(-S.box + 2 * S.box * i / 60, -S.box + 2 * S.box * j / 60); lo = Math.min(lo, v); hi = Math.max(hi, v); }
          // height: log-compressed loss, so both the steep walls and the flat floor stay readable
          const h = (v) => H * Math.log1p(Math.max(0, v - lo)) / Math.log1p(hi - lo);
          map = { s, h, lo };
          surf.set((x, y) => h(S.f(x / s, y / s)), { map: 'viridis' });
          cont.segments(surf.contours(Array.from({ length: 14 }, (_, i) => H * (i + 0.5) / 14), { lift: 0.012 }));
          R = Object.fromEntries(OPTS.map((o) => [o, run(S, o, { lr: state.lr, beta: state.beta, noise: state.noise, n: N })]));
        }
      },
      update() {
        const S = SURFACES[state.surf], { s, h } = map, k = Math.min(N, Math.floor(Math.min(1, time.t / 11) * N)), P3 = (p) => [p[0] * s, p[1] * s, h(S.f(p[0], p[1])) + 0.04];
        const lines = [];
        for (const o of OPTS) {
          const on = state[o], P = R[o]; paths[o].object.visible = balls[o].object.visible = on; if (!on) continue;
          const seg = []; for (let i = 0; i < Math.min(k, P.length - 1); i++) { if (!Number.isFinite(P[i + 1][0]) || Math.abs(P[i + 1][0]) > S.box * 1.2 || Math.abs(P[i + 1][1]) > S.box * 1.2) break; seg.push(...P3(P[i]), ...P3(P[i + 1])); } paths[o].segments(seg);
          const q = P[Math.min(k, P.length - 1)], ok = Number.isFinite(q[0]) && Math.abs(q[0]) <= S.box * 1.2 && Math.abs(q[1]) <= S.box * 1.2;
          if (ok) { const [x, y, z] = P3(q), b = []; for (let i = 0; i < 8; i++) { const a = Math.PI * i / 4, c = Math.PI * (i + 1) / 4; b.push(x + 0.11 * Math.cos(a), y + 0.11 * Math.sin(a), z + 0.05, x + 0.11 * Math.cos(c), y + 0.11 * Math.sin(c), z + 0.05); } balls[o].segments(b); } else balls[o].segments([]);
          lines.push(`${NAME[o]} ${ok ? fmt(S.f(...q)) : 'diverged'}`);
        }
        const [sx, sy] = S.start; star.segments([sx * s - 0.15, sy * s, 0.02, sx * s + 0.15, sy * s, 0.02, sx * s, sy * s - 0.15, 0.02, sx * s, sy * s + 0.15, 0.02]);
        hud.set('a', `${S.label} · step ${k} of ${N}: loss ${lines.join(' · ')}`);
        hud.set('b', `η = ${fmt(state.lr)}, β = ${fmt(state.beta)}${state.noise ? `, gradient noise ${fmt(state.noise)} (like mini-batches)` : ''}`);
        hud.set('c', { ravine: 'steep across, gentle along: GD bounces between the walls; momentum averages the bounces out; Adam rescales each direction', rosen: 'the valley floor curves: progress is a long walk along it, not down it', saddle: 'the gradient almost vanishes at a saddle: plain GD lingers, momentum and Adam leave faster', wells: 'two minima: which one you reach depends on the start, the step and the noise' }[state.surf]);
        plots.aux.draw({ xlim: [0, N], cursor: k, series: OPTS.filter((o) => state[o]).map((o) => ({ x: R[o].map((_, i) => i), y: R[o].map((p) => (Number.isFinite(p[0]) ? Math.log10(Math.max(1e-6, S.f(...p) - map.lo + 1e-6)) : NaN)), color: COL[o], label: `${NAME[o]}` })).concat([{ x: [], y: [], color: '--ink-dim', label: 'log₁₀ (loss − minimum) vs step' }]) });
      },
      theme() { cont.theme(); star.theme(); OPTS.forEach((o) => { paths[o].theme(); balls[o].theme(); }); key = ''; this.changed(); },
    };
  },
};
