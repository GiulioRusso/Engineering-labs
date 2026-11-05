// Markov chains: a state diagram (arrow thickness = transition probability) with a walker hopping along
// the arrows, the share of time it spends in each state as the hops pile up, and the exact distribution
// p_t = p₀Pᵗ settling to the long-run share.
import { createChart } from '../../lib/viz/chart.js';
import { rect } from '../core/draw.js';
import { fmt } from '../core/model.js';
import { CHAINS, sticky, evolve, longRun, walk, tv } from './model.js';

const DG = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const COL = ['--c-I', '--c-B', '--c-v'], RATE = 2, D = 60, T = 30, NR = 0.24;
const CY = 1.27, POS = [90, 210, 330].map((a) => [0.8 * Math.cos(a * Math.PI / 180), CY + 0.8 * Math.sin(a * Math.PI / 180)]);   // y from 0: no zero line
const pct = (v) => `${Math.round(100 * v)} %`;
// the arrow i → j: a bent curve between the two circles (i → j and j → i bend to opposite sides)
function arc(i, j) {
  const [ax, ay] = POS[i], [bx, by] = POS[j], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = uy, ny = -ux;
  const p0 = [ax + ux * NR, ay + uy * NR], p2 = [bx - ux * NR, by - uy * NR], c = [(ax + bx) / 2 + nx * 0.22, (ay + by) / 2 + ny * 0.22];
  return (t) => [(1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * c[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * c[1] + t * t * p2[1]];
}
// the self-loop of state i: a small circle outside the node
function loop(i) { const [x, y] = POS[i], L = Math.hypot(x, y - CY), ux = x / L, uy = (y - CY) / L, cx = x + ux * (NR + 0.14), cy = y + uy * (NR + 0.14), a0 = Math.atan2(-uy, -ux); return (t) => [cx + 0.16 * Math.cos(a0 + 0.5 + t * (2 * Math.PI - 1)), cy + 0.16 * Math.sin(a0 + 0.5 + t * (2 * Math.PI - 1))]; }
const pts = (f, n = 40, t0 = 0, t1 = 1) => { const x = [], y = []; for (let k = 0; k <= n; k++) { const p = f(t0 + (t1 - t0) * k / n); x.push(p[0]); y.push(p[1]); } return { x, y }; };

export default {
  id: 'markov', title: 'Markov chains', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D,
  defaults: { chain: 'weather', stay: 0, start: '0' },
  cases: [
    { id: 'markov', label: 'Markov chain', set: {}, examples: [
      { id: 'sticky', label: 'Sticky states: slow to forget', set: { chain: 'sticky', stay: 0, start: '0' } },
      { id: 'cycle', label: 'A cycle never settles', set: { chain: 'cycle', stay: 0, start: '0' } },
      { id: 'absorb', label: 'Absorbing states: a game until ruin', set: { chain: 'absorb', stay: 0, start: '1' } },
      { id: 'stay', label: 'Weather that lingers', controls: ['stay'], set: { chain: 'weather', stay: 0.6, start: '2' } },
    ] },
  ],
  controls: [
    { title: 'Chain', items: [
      { id: 'chain', label: 'States and odds', type: 'select', options: Object.entries(CHAINS).map(([k, v]) => [k, v.label]) },
      { id: 'stay', label: 'Extra chance to stay put', unit: '', min: 0, max: 0.9, step: 0.01 },
      { id: 'start', label: 'Start in state', type: 'segmented', options: [['0', '1'], ['1', '2'], ['2', '3']] },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const dg = createChart(ctx, { box: DG, xTicks: false, yTicks: false, grid: false, frame: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), all = [dg, tr, br];
    const pool = Array.from({ length: 20 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(dg.mx(x), dg.my(y), 0.02); l.visible = true; };
    const putW = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    let C = { key: '' };

    return {
      changed() { all.forEach((k) => k.show(true)); ctx.setClock(D); },
      update() {
        all.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        const ch = CHAINS[state.chain], s0 = Number(state.start), key = `${state.chain},${state.stay},${s0}`;
        if (C.key !== key) { const P = sticky(ch.P, state.stay); C = { key, P, w: walk(P, s0, RATE * D + 2), ps: evolve(P, s0, T), L: longRun(P, s0) }; }
        const { P, w, ps, L } = C, f = time.t * RATE, k = Math.min(w.length - 2, Math.floor(f)), frac = f - k, from = w[k], to = w[k + 1];
        // the diagram
        dg.range([-1.35, 1.35], [0, 2.7]); dg.titles('', ': arrow thickness = chance of taking it at the next step');
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          const p = P[i][j]; if (p < 0.005) continue;
          const wd = Math.round(1 + 7 * p), f2 = i === j ? loop(i) : arc(i, j), c = pts(f2), col = i === j ? COL[i] : '--ink-dim';
          dg.line(`e${i}${j}w${wd}`, c.x, c.y, { color: col, width: wd });
          if (i !== j) { const [hx, hy] = f2(1), [bx, by] = f2(0.86), ux = hx - bx, uy = hy - by, L2 = Math.hypot(ux, uy), u = [ux / L2, uy / L2], s = 0.09; dg.line(`h${i}${j}`, [hx - s * u[0] + s * 0.6 * u[1], hx, hx - s * u[0] - s * 0.6 * u[1]], [hy - s * u[1] - s * 0.6 * u[0], hy, hy - s * u[1] + s * 0.6 * u[0]], { color: '--ink-dim', width: 2.2 }); }
          const [lx, ly] = f2(i === j ? 0.5 : 0.5), [cx, cy] = i === j ? POS[i] : [0, CY], d = Math.hypot(lx - cx, ly - cy) || 1;
          put(fmt(p, 2), lx + (lx - cx) / d * 0.13, ly + (ly - cy) / d * 0.13);
        }
        for (let i = 0; i < 3; i++) { const c = pts((t) => [POS[i][0] + NR * Math.cos(2 * Math.PI * t), POS[i][1] + NR * Math.sin(2 * Math.PI * t)], 60); dg.line(`n${i}`, c.x, c.y, { color: COL[i], width: i === (frac < 0.6 ? from : to) ? 5 : 2.4 }); put(`${i + 1} ${ch.names[i]}`, POS[i][0], POS[i][1]); }
        // the walker: hops along the arrow in the first 60 % of each step
        const m = Math.min(1, frac / 0.6), e = m * m * (3 - 2 * m), tok = from === to ? loop(from)(e) : arc(from, to)(e), rest = POS[frac < 0.6 ? from : to], at = frac < 0.6 && P[from][to] > 0 ? tok : [rest[0], rest[1] - 0.13];
        dg.dots('tok', [at[0]], [at[1]], { color: '--accent', size: 18 });
        // share of time so far
        const seen = w.slice(0, k + 1), share = [0, 1, 2].map((i) => seen.filter((v) => v === i).length / seen.length);
        tr.range([0, 3], [0, 1]); tr.titles('', `share of time after ${k} hops (bars), long run (dashed)`);
        share.forEach((v, i) => { rect(tr, `b${i}`, i + 0.2, i + 0.8, 0, v, COL[i]); tr.line(`l${i}`, [i + 0.08, i + 0.92], [L[i], L[i]], { color: '--ink', width: 1.8, dashed: true }); putW(`${i + 1}: ${pct(v)}`, tr.mx(i + 0.5), tr.my(Math.min(0.86, Math.max(v, L[i]))) + 0.14); });
        // exact distribution after t steps
        const ts = ps.map((_, t) => t);
        br.range([0, T], [0, 1]); br.titles('step t', `chance of each state after t steps, starting in ${s0 + 1}`);
        for (let i = 0; i < 3; i++) { br.line(`p${i}`, ts, ps.map((p) => p[i]), { color: COL[i], width: 2.2 }); br.line(`L${i}`, [0, T], [L[i], L[i]], { color: COL[i], width: 1, dashed: true }); }
        if (k <= T) br.line('now', [k, k], [0, 1], { color: '--accent', width: 1.4 });
        const dist = ps.map((p) => tv(p, L)), mix = dist.findIndex((d) => d < 0.05);
        plots.aux.draw({ xlim: [0, T], cursor: Math.min(k, T), series: [{ x: ts, y: dist, color: '--c-north', label: 'distance from the long-run share (total variation)' }] });
        hud.set('a', `now in ${ch.names[w[k]]}; time so far: ${share.map((v, i) => `${ch.names[i]} ${pct(v)}`).join(', ')}`);
        hud.set('b', `long run: ${L.map((v, i) => `${ch.names[i]} ${pct(v)}`).join(', ')}; ${mix >= 0 ? `p_t is within 5 % of it after ${mix} steps` : 'p_t never settles'}`, mix >= 0 && mix < 10 ? 'good' : 'bad');
        hud.set('c', state.chain === 'cycle' && !state.stay ? 'a cycle: p_t goes round for ever, yet a third of the time is spent in each state' : state.chain === 'absorb' ? `two absorbing states: from Playing, ruin ${pct(L[0])} and win ${pct(L[2])}; once there, the walk stays` : 'only the present state matters, not the path: the chain forgets where it started, and π = πP');
      },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
