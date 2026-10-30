// Heat conduction in a rod: temperature as colour and as a profile T(x), the steady straight line,
// a spreading hot spot, and copper joined to wood. 10 s of playback cover the whole simulated time.
import { createChart } from '../../lib/viz/chart.js';
import { MATERIALS, rod, step, fluxes, heat, steady, diffusivity } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const ROD = [-4.6, 1.3, 4.6, 0.7], PRO = [-4.6, -2.35, 4.6, 3.0], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], F = 300, SUB = 4, PLAY = 10, L = 0.2;
const MOPT = Object.entries(MATERIALS).map(([k, v]) => [k, v.label]);
const dur = (s) => (s >= 7200 ? `${fmt(s / 3600)} h` : s >= 120 ? `${fmt(s / 60)} min` : `${fmt(s)} s`);

export default {
  id: 'heat-conduction', title: 'Heat conduction', size: 4.4, ortho: true, plain: true, cam: 'top', duration: PLAY, loop: false,
  defaults: { left: 'copper', right: 'copper', fixed: true, TL: 100, TR: 0, init: 'cold', tEnd: 600 },
  cases: [
    { id: 'rod', label: 'Hot end, cold end', controls: ['left', 'TL'], set: { left: 'copper', right: 'copper', fixed: true, TL: 100, TR: 0, init: 'cold', tEnd: 600 }, examples: [
      { id: 'steel', label: 'Steel: 9 times slower', set: { left: 'steel', right: 'steel', tEnd: 5400 } },
    ] },
    { id: 'pulse', label: 'A hot spot spreads', controls: ['left'], set: { left: 'steel', right: 'steel', fixed: false, init: 'pulse', tEnd: 40 }, examples: [
      { id: 'copper', label: 'In copper: 9 times faster', set: { left: 'copper', right: 'copper', tEnd: 5 } },
    ] },
    { id: 'composite', label: 'Two materials', controls: ['left', 'right'], set: { left: 'copper', right: 'wood', fixed: true, TL: 100, TR: 0, init: 'cold', tEnd: 2e5 }, examples: [
      { id: 'cu-steel', label: 'Copper and steel', set: { right: 'steel', tEnd: 3000 } },
    ] },
  ],
  controls: [
    { title: 'Rod (20 cm)', items: [
      { id: 'left', label: 'Left half', type: 'select', options: MOPT },
      { id: 'right', label: 'Right half', type: 'select', options: MOPT },
    ] },
    { title: 'Ends', items: [
      { id: 'fixed', label: 'Ends held at fixed temperatures (off: insulated)', type: 'check' },
      { id: 'TL', label: 'Left end', unit: '°C', min: 0, max: 100, step: 1, show: (s) => s.fixed },
      { id: 'TR', label: 'Right end', unit: '°C', min: 0, max: 100, step: 1, show: (s) => s.fixed },
      { id: 'tEnd', label: 'Simulated time', unit: 's', min: 10, max: 3e5, log: true },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const strip = createChart(ctx, { box: ROD, yTicks: false, grid: false }), pro = createChart(ctx, { box: PRO }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [strip, pro, tr, br];
    let R = null, frames = null, ts = null, Q = null, bc = null;
    return {
      changed() {
        R = rod({ left: state.left, right: state.right, L });
        bc = { fixed: state.fixed, TL: state.TL, TR: state.TR };
        const T = state.init === 'pulse' ? Float64Array.from(R.x, (x) => 100 * Math.exp(-(((x - L / 2) / 0.01) ** 2) / 2)) : new Float64Array(R.n);
        const dt = state.tEnd / (F * SUB);
        frames = [Float64Array.from(T)]; ts = [0]; Q = [fluxes(R, T, bc)];
        for (let f = 1; f <= F; f++) { for (let s = 0; s < SUB; s++) step(R, T, dt, bc); frames.push(Float64Array.from(T)); ts.push(f * SUB * dt); Q.push(fluxes(R, T, bc)); }
        ctx.setClock(PLAY);
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); });
      },
      update() {
        const f = Math.min(F, Math.round(time.t / PLAY * F)), T = frames[f], xs = R.x.map((x) => x * 100), two = state.left !== state.right;
        strip.range([0, L * 100], [0, 1]); strip.titles('', `${MATERIALS[state.left].label}${two ? ` | ${MATERIALS[state.right].label}` : ''}: colour = temperature (0–100 °C)`);
        strip.image('rod', T, R.n, 1, { map: 'magma', norm: (v) => Math.max(0, Math.min(1, v / 100)) });
        const tmax = Math.max(100, ...frames[0]);
        pro.range([0, L * 100], [0, tmax * 1.05]); pro.titles('position x (cm)', 'temperature T (°C): now (solid), steady state (dashed)');
        pro.line('T', xs, Array.from(T), { color: '--c-north', width: 2.4 });
        if (state.fixed) { const s = steady(state.left, state.right, L, state.TL, state.TR); pro.line('ss', [0, L * 50, L * 100], [state.TL, s.Ti, state.TR], { color: '--ink-dim', dashed: true, width: 1.4 }); } else pro.hide('ss');
        if (two) pro.line('if', [L * 50, L * 50], [0, tmax * 1.05], { color: '--c-ref', dashed: true, width: 1 }); else pro.hide('if');
        const tEnd = ts.at(-1), qm = state.fixed ? 3 * Math.abs(steady(state.left, state.right, L, state.TL, state.TR).q) + 1 : 1; // the first instant's flux is huge: clip at 3× steady
        tr.range([0, tEnd], [0, qm * 1.1]); tr.titles('time (s)', state.fixed ? 'heat flux (W/m²): in at the left (red), out at the right (blue)' : 'heat flux at the ends: 0 (insulated)');
        tr.line('qL', ts, Q.map((q) => q[0]), { color: '--c-north' }); tr.line('qR', ts, Q.map((q) => q[1]), { color: '--c-B' }); tr.line('now', [ts[f], ts[f]], [0, qm * 1.1], { color: '--accent', dashed: true, width: 1 });
        const probes = [25, 50, 75], cols = ['--c-north', '--c-E', '--c-B'];
        br.range([0, tEnd], [0, tmax * 1.05]); br.titles('time (s)', 'T at x = 5 (red), 10 (gold), 15 cm (blue)');
        probes.forEach((p, j) => br.line(`p${j}`, ts, frames.map((F2) => F2[p]), { color: cols[j], width: 1.8 }));
        br.line('now', [ts[f], ts[f]], [0, tmax * 1.05], { color: '--accent', dashed: true, width: 1 });
        const H = frames.map((F2) => heat(R, F2) / 1e6);
        plots.aux.draw({ xlim: [0, tEnd], ylim: [0, Math.max(...H) * 1.15 + 1e-9], cursor: ts[f], series: [{ x: ts, y: H, color: '--c-E', label: 'heat stored in the rod (MJ/m² of cross-section)' }] });
        hud.set('a', `t = ${dur(ts[f])} of ${dur(tEnd)}; α = k/ρc: ${MATERIALS[state.left].label} ${fmt(diffusivity(state.left) * 1e6)} mm²/s${two ? `, ${MATERIALS[state.right].label} ${fmt(diffusivity(state.right) * 1e6)} mm²/s` : ''}`);
        if (state.fixed) {
          const s = steady(state.left, state.right, L, state.TL, state.TR), [qL, qR] = Q[f];
          hud.set('b', `flux in ${fmt(qL)} W/m², out ${fmt(qR)} W/m²: steady state q = ΔT/Σ(L/k) = ${fmt(s.q)} W/m²`, Math.abs(qL - qR) < 0.01 * s.q ? 'good' : '');
          hud.set('c', two ? `interface at ${fmt(s.Ti)} °C: the temperature drops mostly across the poorer conductor` : `diffusion time L²/α = ${dur(L * L / diffusivity(state.left))}: after a few of these the line is straight`);
        } else {
          const m = T.reduce((a, b) => a + b, 0), v = T.reduce((a, t, i) => a + t * (R.x[i] - L / 2) ** 2, 0) / m;
          hud.set('b', `width σ = ${fmt(Math.sqrt(v) * 100)} cm; theory √(σ₀² + 2αt) = ${fmt(Math.sqrt(1e-4 + 2 * diffusivity(state.left) * ts[f]) * 100)} cm`);
          hud.set('c', `insulated ends: the heat stored stays at ${fmt(H[f], 4)} MJ/m² (start ${fmt(H[0], 4)}); it only spreads out`);
        }
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
