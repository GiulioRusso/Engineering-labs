// Coupled oscillators: two masses swapping energy (beats) and their normal modes; a chain of N beads
// and its modes. Masses on the left, mode spectrum and motion over time on the right.
import { createChart } from '../../lib/viz/chart.js';
import { modes, motion, velocity, modeEnergy } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], A = 0.3, NS = 2000;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

export default {
  id: 'coupled', title: 'Coupled oscillators and normal modes', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 20, loop: false,
  defaults: { N: 2, k: 10, kc: 2, m: 1, init: 'one', p: 1 },
  cases: [
    { id: 'two', label: 'Two masses', controls: ['kc', 'init'], set: { N: 2, k: 10, kc: 2, init: 'one', p: 1 }, examples: [
      { id: 'mode1', label: 'Mode 1: together', set: { init: 'mode', p: 1 } },
      { id: 'mode2', label: 'Mode 2: opposite', set: { init: 'mode', p: 2 } },
      { id: 'weak', label: 'Weak coupling: slow swaps', set: { kc: 0.5 } },
    ] },
    { id: 'chain', label: 'A chain of beads', controls: ['N', 'p', 'init'], set: { N: 8, k: 10, kc: 10, init: 'mode', p: 1 }, examples: [
      { id: 'n3', label: 'Third mode', set: { p: 3 } },
      { id: 'pluck', label: 'Pull one bead: all modes', set: { init: 'one' } },
    ] },
  ],
  controls: [
    { title: 'Springs', items: [
      { id: 'N', label: 'Masses N', unit: '', min: 2, max: 12, step: 1 },
      { id: 'k', label: 'Wall springs k', unit: 'N/m', min: 1, max: 30, step: 0.5 },
      { id: 'kc', label: 'Coupling κ', unit: 'N/m', min: 0.1, max: 30, step: 0.1 },
    ] },
    { title: 'Start', items: [
      { id: 'init', label: 'Start from', type: 'segmented', options: [['one', 'First mass pulled'], ['mode', 'A mode shape']] },
      { id: 'p', label: 'Mode number', unit: '', min: 1, max: 12, step: 1, show: (s) => s.init === 'mode' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    let nk = 0; const keys = new Set();
    const seg = (pts, o) => { const k = `g${nk++}${o.color}`; keys.add(k); sq.line(k, pts.map((p) => p[0]), pts.map((p) => p[1]), o); };
    const spring = (x0, x1, y = 0) => { const n = 24, pts = [[x0, y]]; for (let i = 1; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y + (i % 2 ? 0.12 : -0.12)]); pts.push([x1, y]); seg(pts, { color: '--copper', width: 1.6 }); };
    let M = null, x0 = null, D = 20, T = null, X = null, E = null, Em = null;
    return {
      changed() {
        const N = Math.round(state.N), p = Math.min(N, Math.max(1, Math.round(state.p)));
        M = modes(N, state.k, state.kc, state.m);
        x0 = state.init === 'mode' ? M.shape[p - 1].map((c) => (A * c) / Math.max(...M.shape[p - 1].map(Math.abs))) : Array.from({ length: N }, (_, i) => (i ? 0 : A));
        D = N === 2 && state.init === 'one' ? Math.min(60, Math.max(20, 2.2 * Math.PI / (M.w[1] - M.w[0]))) : 20;
        T = lin(0, D, NS); X = T.map((t) => Array.from(motion(M, x0, t)));
        E = T.map((t, j) => { const v = velocity(M, x0, t); return [0, N - 1].map((i) => 0.5 * state.m * v[i] ** 2 + 0.5 * state.k * X[j][i] ** 2); });
        Em = modeEnergy(M, x0, state.m);
        ctx.setClock(D);
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); sq.show(false);
      },
      update() {
        nk = 0; keys.forEach((k) => sq.hide(k));
        const N = x0.length, x = motion(M, x0, time.t), two = N === 2;
        sq.range([-4, 4], [-4, 4]);
        if (two) { // side view: wall – spring – mass – spring – mass – spring – wall, displacements to scale ×3
          const p1 = -1.2 + 3 * x[0], p2 = 1.2 + 3 * x[1];
          seg([[-3.6, -0.6], [-3.6, 0.6]], { color: '--ink', width: 4 }); seg([[3.6, -0.6], [3.6, 0.6]], { color: '--ink', width: 4 });
          spring(-3.6, p1 - 0.3); spring(p1 + 0.3, p2 - 0.3); spring(p2 + 0.3, 3.6);
          for (const [c, q] of [['--c-B', p1], ['--c-I', p2]]) seg([[q - 0.3, -0.3], [q + 0.3, -0.3], [q + 0.3, 0.3], [q - 0.3, 0.3], [q - 0.3, -0.3]], { color: c, width: 3 });
          seg([[-1.2, -0.6], [-1.2, -0.45]], { color: '--ink-dim', width: 1 }); seg([[1.2, -0.6], [1.2, -0.45]], { color: '--ink-dim', width: 1 });
        } else { // beads on a string, displacement drawn across (×5)
          const xs = [-3.6, ...x.map((_, i) => -3.6 + 7.2 * (i + 1) / (N + 1)), 3.6], ys = [0, ...Array.from(x, (v) => 5 * v), 0];
          seg(xs.map((q, i) => [q, ys[i]]), { color: '--copper', width: 1.6 }); seg([[-3.6, 0], [3.6, 0]], { color: '--ink-dim', width: 1, dashed: true });
          sq.dots('beads', xs.slice(1, -1), ys.slice(1, -1), { color: '--c-B', size: 14 });
        }
        if (two) sq.hide('beads');
        // mode spectrum: stems at each ωₙ, height = share of the energy
        const Et = Em.reduce((a, b) => a + b, 0);
        tr.range([0, Math.max(...M.w) * 1.15], [0, 1]); tr.titles('frequency ω (rad/s)', 'share of energy in each normal mode');
        tr.stems('modes', M.w, Em.map((e) => e / Et), { color: '--c-v', width: 5 }); tr.dots('w', M.w, M.w.map(() => 0), { color: '--ink-dim', size: 6 });
        const i = Math.min(NS - 1, Math.round(time.t / D * (NS - 1))), xm = Math.max(A, ...X.flatMap((r) => r.map(Math.abs))) * 1.1;
        br.range([0, D], [-xm, xm]); br.titles('time t (s)', two ? 'x₁ (blue), x₂ (orange) in m' : 'first bead (blue), middle bead (orange) in m');
        const j2 = two ? 1 : Math.floor((N - 1) / 2);
        br.line('x1', T, X.map((r) => r[0]), { color: '--c-B', width: 1.6 }); br.line('x2', T, X.map((r) => r[j2]), { color: '--c-I', width: 1.6 });
        br.line('now', [T[i], T[i]], [-xm, xm], { color: '--accent', dashed: true, width: 1 });
        plots.aux.draw({ xlim: [0, D], cursor: time.t, series: [{ x: T, y: E.map((e) => e[0]), color: '--c-B', label: `energy of the first ${two ? 'mass' : 'bead'} (J)` }, { x: T, y: E.map((e) => e[1]), color: '--c-I', label: `last ${two ? 'mass' : 'bead'}` }] });
        hud.set('a', `normal modes: ω = ${M.w.slice(0, 6).map((w) => fmt(w)).join(', ')}${N > 6 ? ', …' : ''} rad/s`);
        hud.set('b', `energy per mode: ${Em.slice(0, 6).map((e) => `${fmt(100 * e / Et, 2)} %`).join(', ')}${N > 6 ? ', …' : ''}: each mode keeps its share forever`);
        hud.set('c', two ? (state.init === 'one' ? `beats: the energy swaps from one mass to the other in π/(ω₂ − ω₁) = ${fmt(Math.PI / (M.w[1] - M.w[0]))} s` : 'a single mode: every mass moves at the same frequency, the pattern never changes')
          : state.init === 'one' ? 'one bead pulled = a mix of every mode: each runs at its own frequency, so the shape keeps changing' : `mode ${Math.min(N, Math.round(state.p))}: ${Math.min(N, Math.round(state.p)) - 1} node(s) between the walls, ω = ${fmt(M.w[Math.min(N, Math.round(state.p)) - 1])} rad/s`);
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
