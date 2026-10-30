// Radioactive decay: a grid of nuclei decaying at random, the count against the exponential law,
// and a decay chain A → B approaching equilibrium.
import { createChart } from '../../lib/viz/chart.js';
import { lambda, nuclei, census, exactA, exactB } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], NT = 241;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

export default {
  id: 'decay', title: 'Radioactive decay', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10, loop: false,
  defaults: { N: 400, half: 2, halfB: 0, seed: 7 },
  cases: [
    { id: 'decay', label: 'Half-life', controls: ['half', 'N', 'seed'], set: { N: 400, half: 2, halfB: 0 }, examples: [
      { id: 'small', label: 'Only 25 nuclei: chance shows', set: { N: 25 } },
      { id: 'long', label: 'Longer half-life: slower, same shape', set: { half: 4 } },
    ] },
    { id: 'chain', label: 'Decay chain', controls: ['half', 'halfB', 'seed'], set: { N: 400, half: 10, halfB: 1 }, examples: [
      { id: 'transient', label: 'Parent only a bit longer-lived', set: { half: 4, halfB: 1.5 } },
    ] },
  ],
  controls: [
    { title: 'Nuclei', items: [
      { id: 'N', label: 'Number at the start', unit: '', min: 4, max: 400, step: 1 },
      { id: 'half', label: 'Half-life of A', unit: 's', min: 0.5, max: 20, step: 0.1 },
      { id: 'halfB', label: 'Half-life of B (0: stable)', unit: 's', min: 0, max: 10, step: 0.1, show: (s) => s.case === 'chain' },
      { id: 'seed', label: 'Random sample', unit: '', min: 1, max: 50, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    let P = null, D = 10, ts = null, CA = null, CB = null, chain = false, gx = null, gy = null;
    return {
      changed() {
        const N = Math.round(state.N); chain = state.case === 'chain' && state.halfB > 0;
        P = nuclei(N, state.half, chain ? state.halfB : 0, Math.round(state.seed));
        D = chain ? 12 : Math.min(30, 5 * state.half);
        ts = lin(0, D, NT); const C = ts.map((t) => census(P, t)); CA = C.map((c) => c.a); CB = C.map((c) => c.b);
        const side = Math.ceil(Math.sqrt(N)); gx = []; gy = [];
        for (let i = 0; i < N; i++) { gx.push(i % side); gy.push(side - 1 - Math.floor(i / side)); }
        sq.range([-1, side], [-1, side]);
        ctx.setClock(D);
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); sq.show(false);
      },
      update() {
        const t = Math.min(time.t, D), N = P.tA.length, la = lambda(state.half), lb = chain ? lambda(state.halfB) : 0, k = Math.round(t / D * (NT - 1));
        const groups = { a: [[], []], b: [[], []], c: [[], []] };
        for (let i = 0; i < N; i++) { const g = t < P.tA[i] ? 'a' : t < P.tB[i] ? 'b' : 'c'; groups[g][0].push(gx[i]); groups[g][1].push(gy[i]); }
        const size = Math.max(6, Math.min(30, 320 / Math.ceil(Math.sqrt(N))));
        // a point cloud's size is fixed when created: one key per size (changed() clears the old ones)
        sq.dots(`a${size}`, ...groups.a, { color: '--c-E', size }); sq.dots(`b${size}`, ...groups.b, { color: '--c-I', size }); sq.dots(`c${size}`, ...groups.c, { color: '--ink-dim', size: size * 0.5 });
        const ex = ts.map((q) => exactA(N, la, q));
        tr.range([0, D], [0, N * 1.05]); tr.titles('time (s)', chain ? 'A (gold) and B (orange): counted vs exact (dashed)' : 'nuclei left: counted (gold), N₀e^(−λt) (dashed)');
        tr.line('ex', ts, ex, { color: '--ink-dim', dashed: true, width: 1.2 }); tr.line('ca', ts.slice(0, k + 1), CA.slice(0, k + 1), { color: '--c-E', width: 2 });
        if (chain) { tr.line('exb', ts, ts.map((q) => exactB(N, la, lb, q)), { color: '--ink-dim', dashed: true, width: 1.2 }); tr.line('cb', ts.slice(0, k + 1), CB.slice(0, k + 1), { color: '--c-I', width: 2 }); } else { tr.hide('exb'); tr.hide('cb'); }
        if (!chain) { const halves = []; for (let h = state.half; h < D; h += state.half) halves.push(h); tr.dots('half', halves, halves.map((h) => exactA(N, la, h)), { color: '--accent', size: 9 }); } else tr.dots('half', [], []);
        // activity: decays per second in 0.5 s bins
        const bw = D / 24, bins = Array.from({ length: 24 }, (_, j) => (j + 0.5) * bw), act = bins.map((c) => { let n = 0; for (let i = 0; i < N; i++) { if (Math.abs(P.tA[i] - c) < bw / 2) n++; } return n / bw; });
        br.range([0, D], [0, N * la * 1.3 + 1]); br.titles('time (s)', 'activity of A (decays/s): counted in bins, λN (dashed)');
        const kb = Math.floor(t / bw);
        br.stems('act', bins.slice(0, kb), act.slice(0, kb), { color: '--c-E', width: 6 }); br.line('lam', ts, ex.map((n) => la * n), { color: '--ink-dim', dashed: true, width: 1.2 });
        const ok = CA.map((n) => (n > 0 ? Math.log(n) : NaN));
        plots.aux.draw({ xlim: [0, D], cursor: t, series: [{ x: ts.slice(0, k + 1), y: ok.slice(0, k + 1), color: '--c-E', label: 'ln(nuclei left): a straight line of slope −λ' }, { x: ts, y: ts.map((q) => Math.log(N) - la * q), color: '--c-ref', dash: [4, 3], label: 'ln N₀ − λt' }] });
        const a = CA[k], b = CB[k];
        hud.set('a', `t = ${fmt(t)} s: ${a} of ${N} nuclei of A left (exact law ${fmt(exactA(N, la, t))})${chain ? `, ${b} of B (Bateman ${fmt(exactB(N, la, lb, t))})` : ''}`);
        hud.set('b', `half-life ${fmt(state.half)} s, λ = ln 2/T½ = ${fmt(la)} /s, mean life 1/λ = ${fmt(1 / la)} s; expected scatter ±√(N p(1 − p)) = ±${fmt(Math.sqrt(N * Math.exp(-la * t) * (1 - Math.exp(-la * t))))}`);
        hud.set('c', chain ? `activities: A ${fmt(la * a)} /s, B ${fmt(lb * b)} /s; ratio B/A → λ_B/(λ_B − λ_A) = ${fmt(lb / (lb - la))}` : 'no nucleus "ages": each one is equally likely to decay in the next second, whenever you look');
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
