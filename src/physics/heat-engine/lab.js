// Heat engines: Carnot and Otto cycles of an ideal gas. p–V diagram (or T–S), a piston with heat
// flowing in and out, and the other diagram; a point runs round the cycle leg by leg.
import { createChart } from '../../lib/viz/chart.js';
import { carnot, otto, totals } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], LEG = 2;
const NAME = { isothermal: 'isothermal', adiabatic: 'adiabatic (insulated)', isochoric: 'constant volume', isobaric: 'constant pressure' };
const col = (l) => (l.Q > 1e-9 ? '--c-north' : l.Q < -1e-9 ? '--c-B' : '--ink-dim');

export default {
  id: 'heat-engine', title: 'Heat engines', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8, loop: true,
  defaults: { cycle: 'carnot', Th: 600, Tc: 300, r: 8, T3: 2400, ts: false },
  cases: [
    { id: 'carnot', label: 'Carnot cycle', controls: ['Th', 'Tc'], set: { cycle: 'carnot', Th: 600, Tc: 300, ts: false }, examples: [
      { id: 'hotter', label: 'Hotter source: more efficient', set: { Th: 900 } },
      { id: 'close', label: 'Temperatures close: almost nothing', set: { Th: 330 } },
    ] },
    { id: 'otto', label: 'Otto cycle', controls: ['r', 'T3'], set: { cycle: 'otto', r: 8, T3: 2400, ts: false }, examples: [
      { id: 'low', label: 'Compression ratio 4', set: { r: 4 } },
    ] },
    { id: 'ts', label: 'T–S diagram', controls: ['cycle', 'Th', 'Tc'], set: { cycle: 'carnot', Th: 600, Tc: 300, ts: true }, examples: [
      { id: 'otto-ts', label: 'Otto on the T–S diagram', set: { cycle: 'otto' } },
    ] },
  ],
  controls: [
    { title: 'Cycle', items: [
      { id: 'cycle', label: 'Cycle', type: 'segmented', options: [['carnot', 'Carnot'], ['otto', 'Otto']] },
      { id: 'Th', label: 'Hot source T_h', unit: 'K', min: 310, max: 1200, step: 5, show: (s) => s.cycle === 'carnot' },
      { id: 'Tc', label: 'Cold sink T_c', unit: 'K', min: 200, max: 500, step: 5, show: (s) => s.cycle === 'carnot' },
      { id: 'r', label: 'Compression ratio r', unit: '', min: 2, max: 12, step: 0.5, show: (s) => s.cycle === 'otto' },
      { id: 'T3', label: 'Peak temperature', unit: 'K', min: 1300, max: 3000, step: 50, show: (s) => s.cycle === 'otto' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 8 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, ch, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(ch.mx(x), ch.my(y), 0.02); l.visible = true; };
    let nk = 0; const keys = new Set();
    const seg = (pts, o) => { const k = `g${nk++}${o.color}`; keys.add(k); tr.line(k, pts.map((p) => p[0]), pts.map((p) => p[1]), o); };
    let C = null, Tot = null;
    const diagram = (ch, which, i, u) => { // which: 'pv' or 'ts'
      const X = (l) => (which === 'pv' ? l.V.map((v) => v * 1e3) : l.S), Y = (l) => (which === 'pv' ? l.P.map((p) => p / 1e3) : l.T);
      const xs = C.flatMap(X), ys = C.flatMap(Y), x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys), y0 = which === 'pv' ? 0 : Math.min(...ys) * 0.8, dx = (x1 - x0) * 0.08;
      ch.range([x0 - dx, x1 + dx], [y0, y1 * 1.08]);
      ch.titles(which === 'pv' ? 'volume V (L)' : 'entropy S (J/K, from an arbitrary zero)', which === 'pv' ? 'pressure p (kPa): red takes heat in, blue gives it out, grey insulated' : 'temperature T (K): area under a leg = heat; enclosed area = net work');
      C.forEach((l, j) => ch.line(`l${j}${col(l)}`, X(l), Y(l), { color: col(l), width: 2 }));
      for (const c of ['--c-north', '--c-B', '--ink-dim']) ch.hide(`h${c}`); // a curve's width is fixed when created: highlight with a second, thick one
      ch.line(`h${col(C[i])}`, X(C[i]), Y(C[i]), { color: col(C[i]), width: 5 });
      const k = Math.round(u * (C[i].V.length - 1));
      ch.dots('now', [X(C[i])[k]], [Y(C[i])[k]], { color: '--accent', size: 13 });
    };
    return {
      changed() {
        C = state.cycle === 'carnot' ? carnot({ Th: state.Th, Tc: Math.min(state.Tc, state.Th - 5) }) : otto({ r: state.r, T3: Math.max(state.T3, 300 * state.r ** (2 / 3) + 50) });
        Tot = totals(C);
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); tr.show(false);
      },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; }); nk = 0; keys.forEach((k) => tr.hide(k));
        const tc = time.t % (4 * LEG), i = Math.min(3, Math.floor(tc / LEG)), u = (tc - i * LEG) / LEG, l = C[i], k = Math.round(u * (l.V.length - 1));
        diagram(sq, state.ts ? 'ts' : 'pv', i, u); diagram(br, state.ts ? 'pv' : 'ts', i, u);
        // piston: gas column height ∝ V
        const Vmax = Math.max(...C.flatMap((q) => q.V)), Tmax = Math.max(...C.flatMap((q) => q.T)), Tmin = Math.min(...C.flatMap((q) => q.T)), h = 0.15 + 0.75 * l.V[k] / Vmax;
        tr.range([0, 1.6], [-0.25, 1.05]);
        seg([[0.1, 1], [0.1, 0], [0.6, 0], [0.6, 1]], { color: '--ink', width: 2.5 });
        seg([[0.11, h], [0.59, h]], { color: '--c-ref', width: 6 }); seg([[0.35, h], [0.35, 1.03]], { color: '--c-ref', width: 3 });
        const hot = (l.T[k] - Tmin) / (Tmax - Tmin + 1e-9), gas = hot > 0.66 ? '--c-north' : hot > 0.33 ? '--c-E' : '--c-B';
        for (let j = 1; j < 8; j++) { const y = h * j / 8; seg([[0.13, y], [0.57, y]], { color: gas, width: 1.2 }); }
        const qc = col(l);
        if (qc !== '--ink-dim') { // heat arrow under the cylinder: in (up) or out (down)
          const up = l.Q > 0, y0 = up ? -0.22 : -0.02, y1 = up ? -0.02 : -0.22;
          seg([[0.35, y0], [0.35, y1]], { color: qc, width: 3 }); seg([[0.3, y1 + (up ? -0.06 : 0.06)], [0.35, y1], [0.4, y1 + (up ? -0.06 : 0.06)]], { color: qc, width: 3 });
        }
        text(`${i + 1}. ${NAME[l.kind]}`, tr, 1.15, 0.85);
        text(l.Q > 1e-9 ? `heat in ${fmt(l.Q)} J` : l.Q < -1e-9 ? `heat out ${fmt(-l.Q)} J` : 'no heat', tr, 1.15, 0.6);
        text(`gas does work ${fmt(l.W)} J`, tr, 1.15, 0.35); text(`T = ${fmt(l.T[k])} K`, tr, 1.15, 0.1);
        const ts = [], Ts = []; C.forEach((q, j) => q.T.forEach((T, m) => { ts.push((j + m / (q.T.length - 1)) * LEG); Ts.push(T); }));
        plots.aux.draw({ xlim: [0, 4 * LEG], cursor: tc, series: [{ x: ts, y: Ts, color: '--c-north', label: 'gas temperature over one cycle (K)' }] });
        const Th = Tmax, Tc = Tmin;
        hud.set('a', `leg ${i + 1}, ${NAME[l.kind]}: Q = ${fmt(l.Q)} J, W = ${fmt(l.W)} J, ΔU = ${fmt(l.dU)} J (Q = ΔU + W)`);
        hud.set('b', `per cycle: heat in ${fmt(Tot.Qin)} J, out ${fmt(Tot.Qout)} J, net work ${fmt(Tot.W)} J: efficiency η = W/Q_in = ${fmt(100 * Tot.eta)} %`, 'good');
        hud.set('c', state.cycle === 'carnot' ? `Carnot: η = 1 − T_c/T_h = 1 − ${fmt(Tc)}/${fmt(Th)} — the best any engine between these temperatures can do`
          : `Otto: η = 1 − 1/r^(γ−1) = ${fmt(100 * Tot.eta)} %; a Carnot engine between ${fmt(Tc)} K and ${fmt(Th)} K would reach ${fmt(100 * (1 - Tc / Th))} %`);
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
