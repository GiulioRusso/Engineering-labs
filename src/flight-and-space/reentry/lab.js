// Atmospheric entry: a capsule from 120 km; its path, deceleration and heating, ballistic or with lift.
import { createChart } from '../../lib/viz/chart.js';
import { entry } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 10;

export default {
  id: 'reentry', title: 'Atmospheric entry', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { v0: 7800, gam0: -1.5, beta: 300, LD: 0 },
  cases: [
    { id: 'entry', label: 'Entry', controls: ['v0', 'gam0', 'beta', 'LD'], set: { v0: 7800, gam0: -1.5, beta: 300, LD: 0 }, examples: [
      { id: 'lifting', label: 'With lift (L/D = 0.3)', set: { LD: 0.3 } },
      { id: 'steep', label: 'Steep: −20°', set: { gam0: -20 } },
      { id: 'lunar', label: 'Back from the Moon: 11 km/s', set: { v0: 11000, gam0: -6.5 } },
      { id: 'skip', label: 'Too shallow: skips out', set: { v0: 11000, gam0: -5 } },
      { id: 'apollo', label: 'Moon return with lift', set: { v0: 11000, gam0: -7.5, LD: 0.3 } },
      { id: 'dense', label: 'Dense capsule: β = 3000', set: { gam0: -6, beta: 3000 } },
    ] },
  ],
  controls: [{ title: 'Entry at 120 km', items: [
    { id: 'v0', label: 'Speed', unit: 'km/s', k: 1e-3, min: 6000, max: 13000, step: 100 },
    { id: 'gam0', label: 'Flight-path angle (below horizontal)', unit: '°', min: -30, max: -0.5, step: 0.1 },
    { id: 'beta', label: 'Ballistic coefficient β = m/(C_D A)', unit: 'kg/m²', min: 50, max: 5000, log: true },
    { id: 'LD', label: 'Lift / drag (lift up)', unit: '', min: 0, max: 0.5, step: 0.01 },
  ] }],
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
        const k = JSON.stringify([state.v0, state.gam0, state.beta, state.LD]);
        if (cache.k !== k) cache = { k, R: entry({ v0: state.v0, gam0: state.gam0, beta: state.beta, LD: state.LD }) };
        const { out, peakG, peakQ, Q, skipped, end } = cache.R, T = end.t, t = T * time.t / D, done = out.filter((o) => o.t <= t), p = done.at(-1) || out[0];
        const X = Math.max(200, end.s / 1000 * 1.05), ts = out.map((o) => o.t);
        sq.range([0, X], [0, 125]); sq.titles('downrange (km)', 'altitude (km)');
        sq.line('all', out.map((o) => o.s / 1000), out.map((o) => o.h / 1000), { color: '--ink-dim', width: 1.2, dashed: true });
        sq.line('now', done.map((o) => o.s / 1000), done.map((o) => o.h / 1000), { color: '--c-I', width: 2.6 });
        sq.dots('q', [p.s / 1000], [p.h / 1000], { color: '--accent', size: 12 });
        tr.range([0, T], [0, Math.max(peakG * 1.15, 1)]); tr.titles('time (s)', 'deceleration (g)');
        tr.line('g', ts, out.map((o) => o.a), { color: '--c-E', width: 2 }); tr.dots('q', [p.t], [p.a], { color: '--accent', size: 9 });
        br.range([0, T], [0, Math.max(peakQ / 1e6 * 1.15, 0.1)]); br.titles('time (s)', 'heating at the nose (MW/m²)');
        br.line('q', ts, out.map((o) => o.q / 1e6), { color: '--c-north', width: 2 }); br.dots('q', [p.t], [p.q / 1e6], { color: '--accent', size: 9 });
        plots.aux.draw({ xlim: [0, T], cursor: t, series: [{ x: ts, y: out.map((o) => o.v / 1000), color: '--c-I', label: 'speed (km/s)' }, { x: ts, y: out.map((o) => o.h / 1e4), color: '--c-B', label: 'altitude (10 km)' }] });
        hud.set('a', `now: ${fmt(p.h / 1000)} km, ${fmt(p.v / 1000)} km/s, path ${fmt(p.gam)}°, ${fmt(p.a)} g`);
        hud.set('b', skipped ? `skipped back out at ${fmt(end.v / 1000)} km/s after ${fmt(end.s / 1000)} km: too shallow, the capsule bounces off the air` : `peak ${fmt(peakG)} g, peak heating ${fmt(peakQ / 1e6)} MW/m², total heat ${fmt(Q / 1e6)} MJ/m² in ${fmt(T)} s`, skipped || peakG > 12 ? 'bad' : 'good');
        hud.set('c', 'the corridor: shallow enough to keep g and heating survivable, steep enough not to skip; lift widens it');
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
