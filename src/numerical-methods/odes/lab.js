// Time stepping the oscillator x'' = −x with four methods (phase portrait, energy), stability of explicit
// and implicit Euler on y' = λy, and the global error against the step size: the order made visible.
import { createChart } from '../../lib/viz/chart.js';
import { METHODS, integrate, energy, decay, growth, globalError } from './model.js';

const fmt = (v, d = 4) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const MOPT = Object.entries(METHODS).map(([k, v]) => [k, v.label]), T = 20, COL = { euler: '--c-north', semi: '--c-E', heun: '--c-v', rk4: '--c-I' };
const EVALS = { euler: 1, heun: 2, rk4: 4 }, ORD = Object.keys(EVALS), HS = lin(-3, -0.3, 28).map((l) => 10 ** l);

export default {
  id: 'odes', title: 'Solving ODEs step by step', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10, loop: false,
  defaults: { m: 'euler', h: 0.1, k: 10, hs: 0.15, ho: 0.1 },
  cases: [
    { id: 'euler', label: 'Methods compared', set: {}, examples: [
      { id: 'semi', label: 'Semi-implicit Euler: energy stays put', controls: ['m', 'h'], set: { m: 'semi' } },
      { id: 'rk4big', label: 'RK4 with h = 0.5: still on the circle', controls: ['m', 'h'], set: { m: 'rk4', h: 0.5 } },
    ] },
    { id: 'stability', label: 'Stability', set: {}, examples: [
      { id: 'edge', label: 'h = 2/|λ|: explicit Euler on the edge', controls: ['hs'], set: { hs: 0.2 } },
      { id: 'blow', label: 'h = 0.3: explicit blows up, implicit decays', controls: ['hs'], set: { hs: 0.3 } },
    ] },
    { id: 'order', label: 'Order of accuracy', set: {}, examples: [{ id: 'cost', label: 'Equal work: RK4 wins anyway', controls: ['ho'], set: { ho: 0.4 } }] },
  ],
  controls: [
    { title: 'Oscillator x″ = −x', show: (s) => s.case === 'euler', items: [{ id: 'm', label: 'Method', type: 'select', options: MOPT }, { id: 'h', label: 'Step h', unit: '', min: 0.01, max: 1, log: true }] },
    { title: 'Decay y′ = λy', show: (s) => s.case === 'stability', items: [{ id: 'k', label: 'Rate |λ|', unit: '1/s', min: 1, max: 50, log: true }, { id: 'hs', label: 'Step h', unit: 's', min: 0.005, max: 1, log: true }] },
    { title: 'Step', show: (s) => s.case === 'order', items: [{ id: 'ho', label: 'Step h (marked)', unit: '', min: 0.001, max: 0.5, log: true }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const circ = lin(0, 2 * Math.PI, 160);
    let R = null, rk = '', ERR = null;
    return {
      changed() { charts.forEach((c) => { c.show(false); c.show(true); }); ctx.setClock(state.case === 'euler' ? 10 : 0); },
      update() {
        const c = state.case;
        if (c === 'euler') {
          const key = `${state.m},${state.h}`; if (key !== rk) { rk = key; R = integrate(state.m, state.h, T); }
          const tn = Math.min(T, time.t / 9.5 * T), n = Math.max(1, Math.min(R.t.length, Math.floor(tn / state.h) + 1)), col = COL[state.m];
          const X = R.x.slice(0, n), V = R.v.slice(0, n), E = R.x.map((x, i) => energy(x, R.v[i]));
          sq.range([-2.2, 2.2], [-2.2, 2.2]); sq.titles('position x', 'velocity v: exact solution is the unit circle (dashed)');
          sq.line('ex', circ.map(Math.cos), circ.map(Math.sin), { color: '--ink-dim', dashed: true, width: 1.2 }); sq.line('p', X, V, { color: col, width: 2 }); sq.dots('q', [X.at(-1)], [V.at(-1)], { color: '--accent', size: 11 });
          const ts = lin(0, tn, 300);
          tr.range([0, T], [-2.2, 2.2]); tr.titles('time t', 'x(t): method (colour) vs cos t (dashed)'); tr.line('ex', ts, ts.map(Math.cos), { color: '--ink-dim', dashed: true, width: 1.2 }); tr.line('x', R.t.slice(0, n), X, { color: col });
          const Emax = Math.max(1, ...E.slice(0, n)); br.range([0, T], [0, Math.min(3, Emax * 1.1)]); br.titles('time t', 'energy ½(x² + v²): exact ½');
          br.line('ex', [0, T], [0.5, 0.5], { color: '--ink-dim', dashed: true, width: 1.2 }); br.line('E', R.t.slice(0, n), E.slice(0, n), { color: col });
          const drift = E[n - 1] / 0.5 - 1;
          hud.set('a', `${METHODS[state.m].label}, h = ${fmt(state.h, 3)}, t = ${fmt(R.t[n - 1], 3)}: energy ${drift >= 0 ? '+' : ''}${fmt(100 * drift, 3)} %`, Math.abs(drift) < 0.02 ? 'good' : 'bad');
          hud.set('b', { euler: 'Euler follows the tangent: on a circle the tangent always points outward, so it spirals out — energy × (1 + h²) per step', semi: 'update v first, then x with the new v: the error no longer accumulates in energy, which only wobbles', heun: 'average the slope at the start and at the Euler guess: second order, the spiral is far slower', rk4: 'four slopes per step, weighted 1-2-2-1: fourth order, the error is tiny even with big steps' }[state.m]);
          hud.set('c', 'same equation, same step: the method decides whether a simulated planet stays in orbit');
          plots.aux.draw({ xlim: [0, T], cursor: R.t[n - 1], series: [{ x: R.t, y: R.x.map((x, i) => x - Math.cos(R.t[i])), color: col, label: 'error x − cos t vs time' }] });
        } else if (c === 'stability') {
          const lam = -state.k, h = state.hs, Tm = Math.max(5 / state.k, 6 * h), z = h * lam;
          const ex = decay('explicit', lam, h, Tm), im = decay('implicit', lam, h, Tm), ts = lin(0, Tm, 300), m = Math.min(3, Math.max(1.2, ...ex.y.map(Math.abs)));
          sq.range([0, Tm], [-m, m]); sq.titles('time t (s)', 'y(t): exact e^(λt) (dashed), explicit Euler (red), implicit Euler (green)');
          sq.line('ex', ts, ts.map((t) => Math.exp(lam * t)), { color: '--ink-dim', dashed: true, width: 1.4 }); sq.line('e', ex.t, ex.y, { color: '--c-north' }); sq.dots('ed', ex.t, ex.y, { color: '--c-north', size: 7 }); sq.line('i', im.t, im.y, { color: '--c-v' }); sq.dots('id', im.t, im.y, { color: '--c-v', size: 7 });
          const zs = lin(-4, 0, 200); tr.range([-4, 0], [0, 2]); tr.titles('hλ', '|growth per step|: explicit |1 + hλ| (red), implicit (green), exact (dashed)');
          tr.line('e', zs, zs.map((q) => Math.abs(growth.explicit(q))), { color: '--c-north' }); tr.line('i', zs, zs.map((q) => Math.abs(growth.implicit(q))), { color: '--c-v' }); tr.line('x', zs, zs.map(growth.exact), { color: '--ink-dim', dashed: true, width: 1.2 }); tr.line('one', [-4, 0], [1, 1], { color: '--c-E', dashed: true, width: 1 }); tr.dots('q', [Math.max(-4, z)], [Math.min(2, Math.abs(growth.explicit(z)))], { color: '--accent', size: 11 });
          br.range([-4, 2], [-1.6, 1.6]); br.titles('Re hλ', 'Im hλ: explicit Euler stable inside the red circle, implicit outside the green one');
          br.line('e', circ.map((a) => -1 + Math.cos(a)), circ.map(Math.sin), { color: '--c-north' }); br.line('i', circ.map((a) => 1 + Math.cos(a)), circ.map(Math.sin), { color: '--c-v' }); br.dots('q', [Math.max(-4, z)], [0], { color: '--accent', size: 11 });
          const g = growth.explicit(z), ok = Math.abs(g) < 1;
          hud.set('a', `hλ = ${fmt(z, 3)}: explicit Euler multiplies by ${fmt(g, 3)} per step — ${ok ? (g < 0 ? 'stable but oscillating' : 'stable') : 'unstable'}`, ok ? 'good' : 'bad');
          hud.set('b', `explicit Euler needs h < 2/|λ| = ${fmt(2 / state.k, 3)} s; implicit Euler, 1/(1 − hλ) = ${fmt(growth.implicit(z), 3)}, is stable for every h`);
          hud.set('c', 'stiff systems (fast and slow rates together) force explicit methods to tiny steps: that is what implicit solvers are for');
          plots.aux.draw({ xlim: [0, Tm], series: [{ x: ex.t, y: ex.y.map((y, i) => Math.abs(y - Math.exp(lam * ex.t[i]))), color: '--c-north', label: 'explicit error vs time (s)' }, { x: im.t, y: im.y.map((y, i) => Math.abs(y - Math.exp(lam * im.t[i]))), color: '--c-v', label: 'implicit error' }] });
        } else {
          ERR ??= Object.fromEntries(ORD.map((m) => [m, HS.map((h) => Math.log10(globalError(m, h) + 1e-16))]));
          const lh = HS.map(Math.log10), lo = Math.log10(state.ho);
          sq.range([-3, -0.3], [-14, 1]); sq.titles('log₁₀ step h', 'log₁₀ error after one period: slope = order (1, 2, 4)');
          for (const m of ORD) { sq.line(m, lh, ERR[m], { color: COL[m] }); sq.dots(`${m}d`, [lo], [Math.log10(globalError(m, state.ho) + 1e-16)], { color: COL[m], size: 10 }); }
          sq.line('mark', [lo, lo], [-14, 1], { color: '--ink-dim', dashed: true, width: 1 });
          // error against work: function evaluations over one period
          const lw = (m) => HS.map((h) => Math.log10(EVALS[m] * 2 * Math.PI / h));
          tr.range([1, 5], [-14, 1]); tr.titles('log₁₀ slope evaluations', 'log₁₀ error: the same accuracy for less work');
          for (const m of ORD) tr.line(m, lw(m), ERR[m], { color: COL[m] });
          const R1 = integrate('euler', state.ho, 4 * Math.PI), R4 = integrate('rk4', state.ho, 4 * Math.PI), ts = lin(0, 4 * Math.PI, 300);
          br.range([0, 4 * Math.PI], [-2, 2]); br.titles('time t', 'x(t): Euler (red), RK4 (orange), exact (dashed)'); br.line('x', ts, ts.map(Math.cos), { color: '--ink-dim', dashed: true, width: 1.2 }); br.line('e', R1.t, R1.x, { color: '--c-north' }); br.line('r', R4.t, R4.x, { color: '--c-I' });
          const e1 = globalError('euler', state.ho), e4 = globalError('rk4', state.ho);
          hud.set('a', `h = ${fmt(state.ho, 3)}: Euler error ${fmt(e1, 2)}, Heun ${fmt(globalError('heun', state.ho), 2)}, RK4 ${fmt(e4, 2)}`);
          hud.set('b', 'error ∝ h^p: halve the step and Euler gains ×2, Heun ×4, RK4 ×16 — the slopes of the left chart');
          hud.set('c', 'per evaluation RK4 still wins (top right): higher order beats more, cheaper steps until round-off sets the floor');
          plots.aux.draw({ xlim: [-3, -0.3], series: ORD.map((m) => ({ x: lh, y: ERR[m].map((v, i) => (i ? (v - ERR[m][i - 1]) / (lh[i] - lh[i - 1]) : NaN)), color: COL[m], label: `${METHODS[m].label}: local slope vs log₁₀ h` })), ylim: [0, 5] });
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
