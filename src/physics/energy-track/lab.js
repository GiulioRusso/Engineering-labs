// A bead on a track: kinetic and potential energy trading places, a vertical loop, and friction
// turning energy into heat. Track on the left, energy bars and energies over time on the right.
import { createChart } from '../../lib/viz/chart.js';
import { track, simulate, G } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], deg = Math.PI / 180;
const BARS = [['K', 'kinetic', '--c-v'], ['U', 'potential', '--c-E'], ['Q', 'heat', '--c-north']];

export default {
  id: 'energy-track', title: 'Work and energy on a track', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8, loop: false,
  defaults: { kind: 'ramp', h: 3, ang: 30 * deg, R: 1, mu: 0, m: 1 },
  cases: [
    { id: 'ramp', label: 'Down a ramp', controls: ['h', 'ang', 'm'], set: { kind: 'ramp', h: 3, ang: 30 * deg, mu: 0 }, examples: [
      { id: 'higher', label: 'Start higher: faster at the bottom', set: { h: 5 } },
      { id: 'steeper', label: 'Steeper, same height: same speed', set: { ang: 60 * deg } },
    ] },
    { id: 'loop', label: 'Loop the loop', controls: ['h', 'R'], set: { kind: 'loop', h: 3, R: 1, ang: 40 * deg, mu: 0 }, examples: [
      { id: 'just', label: 'From 2.55 R: just makes it', set: { h: 2.55 } },
      { id: 'short', label: 'From 2.2 R: falls off', set: { h: 2.2 } },
    ] },
    { id: 'friction', label: 'Friction', controls: ['mu', 'h'], set: { kind: 'valley', h: 2, ang: 30 * deg, mu: 0.1 }, examples: [
      { id: 'none', label: 'No friction: it never stops', set: { mu: 0 } },
      { id: 'brake', label: 'Ramp with μ = 0.3: stops on the flat', set: { kind: 'ramp', h: 3, mu: 0.3 } },
    ] },
  ],
  controls: [
    { title: 'Track', items: [
      { id: 'h', label: 'Start height h', unit: 'm', min: 0.5, max: 6, step: 0.05 },
      { id: 'ang', label: 'Slope', unit: '°', k: 1 / deg, min: 10 * deg, max: 70 * deg, step: deg },
      { id: 'R', label: 'Loop radius R', unit: 'm', min: 0.5, max: 1.5, step: 0.05, show: (s) => s.kind === 'loop' },
      { id: 'mu', label: 'Friction μ', unit: '', min: 0, max: 0.5, step: 0.01 },
      { id: 'm', label: 'Mass m', unit: 'kg', min: 0.2, max: 5, step: 0.1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR, xTicks: false }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 6 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    const text = (i, t, x, y) => { pool[i].element.textContent = t; pool[i].position.set(x, y, 0.02); pool[i].visible = true; };
    let T = null, R = null, key = '';
    function configure() {
      const k = `${state.kind},${state.h},${state.ang},${state.R},${state.mu}`;
      if (k === key) return; key = k;
      T = track({ kind: state.kind, h: state.h, ang: state.ang, R: state.R });
      R = simulate(T, { mu: state.mu, tMax: state.kind === 'valley' ? 15 : 10 });
      ctx.setClock(R.t.at(-1) + 0.4);
    }
    return {
      changed() { configure(); charts.forEach((c) => { c.show(false); c.show(true); }); sq.show(false); },
      update() {
        const m = state.m, n = R.t.length, i = Math.min(n - 1, Math.round(time.t / 0.01)), y0 = Math.min(...T.y);
        pool.forEach((l) => { l.visible = false; });
        // track, square view
        const xs = T.x, ys = T.y, x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys, R.y[0]), span = Math.max(x1 - x0, y1 - y0) + 1.2;
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        sq.range([cx - span / 2, cx + span / 2], [cy - span / 2, cy + span / 2]);
        const tx = [], ty = []; for (let j = 0; j < xs.length; j += 3) { tx.push(xs[j]); ty.push(ys[j]); } tx.push(xs.at(-1)); ty.push(ys.at(-1));
        sq.line('track', tx, ty, { color: '--ink', width: 3 });
        sq.line('ground', [cx - span / 2, cx + span / 2], [y0 - 0.05, y0 - 0.05], { color: '--ink-dim', dashed: true, width: 1 });
        // energy level: the height the bead could still climb to, (K + U)/mg
        const lvl = y0 + (R.K[i] + R.U[i]) / G;
        sq.line('lvl', [cx - span / 2 + 0.2, cx + span / 2 - 0.2], [lvl, lvl], { color: '--c-E', dashed: true, width: 1.2 });
        text(0, 'energy level (K + U)/mg', sq.mx(cx + span / 2 - 1.6), sq.my(lvl) + 0.15);
        const air = R.phase.map((p, j) => (p === 'air' && j <= i ? j : -1)).filter((j) => j >= 0);
        if (air.length) sq.line('air', air.map((j) => R.x[j]), air.map((j) => R.y[j]), { color: '--c-north', dashed: true, width: 1.6 }); else sq.hide('air');
        sq.dots('bead', [R.x[i]], [R.y[i]], { color: '--accent', size: 16 });
        // energy bars (J)
        const E0 = m * (R.K[0] + R.U[0] + R.Q[0]), vals = [m * R.K[i], m * R.U[i], m * R.Q[i]];
        tr.range([0.3, 4.7], [0, E0 * 1.15]); tr.titles('', 'energy (J): kinetic, potential, heat and their total');
        BARS.forEach(([k, , c], j) => tr.stems(k, [j + 1], [vals[j]], { color: c, width: 14 }));
        tr.stems('E', [4], [vals[0] + vals[1] + vals[2]], { color: '--ink-dim', width: 14 });
        BARS.forEach(([, l], j) => text(1 + j, l, tr.mx(j + 1), TR[1] - 0.18)); text(4, 'total', tr.mx(4), TR[1] - 0.18);
        // energies over time
        const tEnd = R.t.at(-1) + 0.4;
        br.range([0, tEnd], [0, E0 * 1.15]); br.titles('time t (s)', 'energy (J): K (green), U (gold), heat (red), total (dashed)');
        BARS.forEach(([k, , c]) => br.line(k, R.t, R[k].map((v) => v * m), { color: c, width: 2 }));
        br.line('E', R.t, R.t.map((_, j) => m * (R.K[j] + R.U[j] + R.Q[j])), { color: '--ink-dim', dashed: true, width: 1.4 });
        br.line('now', [R.t[i], R.t[i]], [0, E0 * 1.15], { color: '--accent', dashed: true, width: 1 });
        plots.aux.draw({ xlim: [0, tEnd], cursor: R.t[i], series: [{ x: R.t, y: R.N.map((v, j) => (R.phase[j] === 'track' ? v / G : NaN)), color: '--c-F', label: 'normal force / weight (0: about to leave the track)' }] });

        const v = R.v[i], E = vals[0] + vals[1] + vals[2];
        hud.set('a', `t = ${fmt(R.t[i])} s: speed ${fmt(v)} m/s, height ${fmt(R.y[i] - y0)} m${R.phase[i] === 'air' ? ' — off the track!' : R.phase[i] === 'stuck' ? ' — at rest' : ''}`, R.phase[i] === 'air' ? 'bad' : '');
        hud.set('b', `K = ½mv² = ${fmt(vals[0])} J, U = mgh = ${fmt(vals[1])} J, heat ${fmt(vals[2])} J: total ${fmt(E, 5)} J (start ${fmt(E0, 5)} J)`, Math.abs(E / E0 - 1) < 1e-3 ? 'good' : 'bad');
        hud.set('c', state.kind === 'loop'
          ? `h = ${fmt(state.h / state.R)} R: needs h ≥ 2.5 R to stay on at the top (v² ≥ gR); N/mg now ${R.phase[i] === 'track' ? fmt(R.N[i] / G) : '—'}`
          : state.mu ? `friction μ = ${fmt(state.mu)} turns ${fmt(100 * vals[2] / E0)} % of the energy into heat so far`
            : `no friction: at the bottom v = √(2gh) = ${fmt(Math.sqrt(2 * G * state.h))} m/s, whatever the path or the mass`);
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
