// Rockets: Tsiolkovsky's equation during a burn, why rockets have stages, and a gravity-turn launch with the
// speed lost to gravity and drag on the way up.
import { createChart } from '../../lib/viz/chart.js';
import { deltaV, burn, staging, ascent, ROCKET, G0 } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 10, TB = 120;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
// a filled rectangle: a tight zig-zag of thin lines (chart lines have round caps, so thick ones blur stacks)
function box(ch, key, x, w, y0, y1, color) {
  const n = Math.max(2, Math.ceil(Math.abs(ch.my(y1) - ch.my(y0)) / 0.025)), xs = [], ys = [];
  for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; xs.push(...(i % 2 ? [x + w / 2, x - w / 2] : [x - w / 2, x + w / 2])); ys.push(y, y); }
  ch.line(key, xs, ys, { color, width: 1.6, max: 4000 });
}

export default {
  id: 'rocket', title: 'Rockets', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { isp: 300, zeta: 0.9, n: 2, eps: 0.1, dv: 9400, TW: 1.5, kick: 2 },
  cases: [
    { id: 'equation', label: 'The rocket equation', controls: ['isp', 'zeta'], set: { isp: 300, zeta: 0.9 }, examples: [
      { id: 'hydrogen', label: 'Hydrogen engine: Isp 450 s', set: { isp: 450 } },
      { id: 'heavy', label: 'Heavier tanks: 80 % propellant', set: { zeta: 0.8 } },
      { id: 'r20', label: '95 % propellant', set: { zeta: 0.95 } },
    ] },
    { id: 'staging', label: 'Staging', controls: ['n', 'eps', 'isp', 'dv'], set: { n: 2, eps: 0.1, isp: 330, dv: 9400 }, examples: [
      { id: 'one', label: 'One stage: cannot reach orbit', set: { n: 1 } },
      { id: 'three', label: 'Three stages', set: { n: 3 } },
      { id: 'light', label: 'Lighter structure: ε = 0.05', set: { eps: 0.05 } },
      { id: 'moon', label: 'To the Moon: 12 km/s', set: { dv: 12000, n: 3 } },
    ] },
    { id: 'ascent', label: 'Launch: gravity turn', controls: ['TW', 'kick'], set: { TW: 1.5, kick: 2 }, examples: [
      { id: 'vertical', label: 'Straight up: no kick', set: { kick: 0 } },
      { id: 'good', label: 'A good turn: 2.2°', set: { kick: 2.2 } },
      { id: 'flat', label: 'Too flat: 3°', set: { kick: 3 } },
      { id: 'punchy', label: 'T/W = 3', set: { TW: 3, kick: 18 } },
    ] },
  ],
  controls: [
    { title: 'Engine and tanks', show: (s) => s.case !== 'ascent', items: [
      { id: 'isp', label: 'Specific impulse Isp', unit: 's', min: 200, max: 460, step: 5 },
      { id: 'zeta', label: 'Propellant share of lift-off mass', unit: '%', k: 100, min: 0.5, max: 0.96, step: 0.005, show: (s) => s.case === 'equation' },
    ] },
    { title: 'Stages', show: (s) => s.case === 'staging', items: [
      { id: 'n', label: 'Stages', unit: '', min: 1, max: 4, step: 1 },
      { id: 'eps', label: 'Structure share of each stage ε', unit: '%', k: 100, min: 0.04, max: 0.2, step: 0.005 },
      { id: 'dv', label: 'Δv needed', unit: 'km/s', k: 1e-3, min: 4000, max: 13000, step: 100 },
    ] },
    { title: 'Launch (one stage, Isp 350 s, 92 % propellant)', show: (s) => s.case === 'ascent', items: [
      { id: 'TW', label: 'Thrust / weight at lift-off', unit: '', min: 1.15, max: 3.5, step: 0.05 },
      { id: 'kick', label: 'Pitch kick at 60 m/s', unit: '°', min: 0, max: 25, step: 0.1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR, xTicks: false }), charts = [sq, tr, br];
    const pool = Array.from({ length: 16 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    let cache = {};

    function equation() {
      const { isp, zeta } = state, R = 1 / (1 - zeta), t = TB * time.t / D, ts = lin(0, TB, 200), b = burn(isp, zeta, TB, t), ve = isp * G0;
      const vs = ts.map((q) => burn(isp, zeta, TB, q).v / 1000), top = Math.max(12, vs.at(-1) * 1.15);
      sq.range([0, TB], [0, top]); sq.titles('time (s), constant thrust in empty space', 'speed (km/s)');
      sq.line('all', ts, vs, { color: '--ink-dim', width: 1.2, dashed: true }); sq.line('now', ts.filter((q) => q <= t), vs.filter((_, i) => ts[i] <= t), { color: '--c-I', width: 2.6 });
      sq.dots('q', [t], [b.v / 1000], { color: '--accent', size: 11 });
      for (const [k, v, txt] of [['o', 7.8, 'orbit 7.8'], ['e', 11.2, 'escape 11.2']]) { sq.line(k, [0, TB], [v, v], { color: '--c-v', width: 1, dashed: true }); put(txt, sq.mx(TB * 0.12), sq.my(v) + 0.12); }
      const Rs = lin(1, 25, 200);
      tr.range([1, 25], [0, 15]); tr.titles('mass ratio R = m₀/m_f', 'Δv (km/s): Isp 300 (grey), 450 (dashed), yours');
      tr.line('a', Rs, Rs.map((r) => deltaV(300, r) / 1000), { color: '--ink-dim', width: 1.2 }); tr.line('b', Rs, Rs.map((r) => deltaV(450, r) / 1000), { color: '--ink-dim', width: 1.2, dashed: true });
      tr.line('c', Rs, Rs.map((r) => deltaV(isp, r) / 1000), { color: '--c-I', width: 2.2 }); tr.dots('q', [R], [deltaV(isp, R) / 1000], { color: '--accent', size: 10 });
      br.range([0, 4], [0, 1]); br.titles('', 'mass now, share of lift-off: propellant (orange), the rest');
      box(br, 'dry', 2, 1, 0, 1 - zeta, '--ink-dim'); box(br, 'prop', 2, 1, 1 - zeta, b.mass, '--c-I');
      plots.aux.draw({ xlim: [0, TB], cursor: t, series: [{ x: ts, y: ts.map((q) => burn(isp, zeta, TB, q).a / G0), color: '--c-E', label: 'acceleration (g): same thrust, less and less mass' }] });
      hud.set('a', `exhaust speed vₑ = Isp·g₀ = ${fmt(ve)} m/s; mass ratio R = 1/(1 − ${fmt(zeta)}) = ${fmt(R)}`);
      hud.set('b', `Δv = vₑ ln R = ${fmt(deltaV(isp, R) / 1000)} km/s; now ${fmt(b.v / 1000)} km/s, ${fmt(100 * b.mass)} % of the lift-off mass left`, 'good');
      hud.set('c', 'ln: doubling the mass ratio adds only vₑ·ln 2 = 0.69 vₑ; most of a rocket is propellant to push propellant');
    }

    function stagingCase() {
      const { eps, isp, dv } = state, N = Math.round(state.n), all = [1, 2, 3, 4].map((n) => staging(n, eps, isp, dv));
      const fin = all.filter((s) => Number.isFinite(s.lift)), top = Math.min(250, Math.max(10, ...fin.map((s) => s.lift)) * 1.12);
      sq.range([0.3, 4.7], [0, top]); sq.titles('number of stages', 'lift-off mass for 1 t of payload (t)');
      sq.clear();
      all.forEach((s, c) => {
        const x = c + 1;
        if (!s.stages.length) { put('impossible', sq.mx(x), sq.my(top * 0.5)); return; }
        let y = 0; [...s.stages].reverse().forEach((st, i) => {
          box(sq, `p${c}${i}`, x, c + 1 === N ? 0.6 : 0.4, y, y + st.prop, i % 2 ? '--c-E' : '--c-I'); y += st.prop;
          box(sq, `s${c}${i}`, x, c + 1 === N ? 0.6 : 0.4, y, y + st.struct, '--ink-dim'); y += st.struct;
        });
        box(sq, `pl${c}`, x, c + 1 === N ? 0.6 : 0.4, y, y + 1, '--c-v'); put(`${c + 1 === N ? '▶ ' : ''}${fmt(s.lift)} t`, sq.mx(x), sq.my(Math.min(top, y + 1)) + 0.16);
      });
      const dvs = lin(3000, 13000, 200);
      tr.range([3, 13], [0, 20]); tr.titles('Δv needed (km/s)', 'payload share of lift-off (%): 1, 2, 3, 4 stages');
      [1, 2, 3, 4].forEach((n) => { const on = n === N; tr.line(`n${n}${on}`, dvs.map((v) => v / 1000), dvs.map((v) => 100 * staging(n, eps, isp, v).payload), { color: on ? '--c-I' : '--ink-dim', width: on ? 2.4 : 1.2 }); tr.hide(`n${n}${!on}`); });
      tr.dots('q', [dv / 1000], [100 * all[N - 1].payload], { color: '--accent', size: 10 });
      const es = lin(0.04, 0.2, 100);
      br.range([0.04, 0.2], [0, 10]); br.titles('structure share ε', `payload (%) with ${N} stage${N > 1 ? 's' : ''}`);
      br.line('e', es, es.map((e) => 100 * staging(N, e, isp, dv).payload), { color: '--c-B', width: 2 }); br.dots('q', [eps], [100 * all[N - 1].payload], { color: '--accent', size: 10 });
      plots.aux.draw({ xlim: [3, 13], cursor: dv / 1000, series: [1, 2, 3, 4].map((n) => ({ x: dvs.map((v) => v / 1000), y: dvs.map((v) => staging(n, eps, isp, v).lift), color: n === N ? '--c-I' : '--ink-dim', label: n === N ? `lift-off tonnes per tonne of payload, ${n} stages` : '' })), ylim: [0, 200] });
      const s = all[N - 1];
      hud.set('a', `${N} stage${N > 1 ? 's' : ''}: each gives ${fmt(dv / N / 1000)} km/s with mass ratio ${fmt(s.R)}; ${s.stages.length ? `payload ${fmt(100 * s.payload)} % of ${fmt(s.lift)} t` : 'impossible'}`, s.stages.length ? 'good' : 'bad');
      hud.set('b', `one stage alone, even empty, reaches at most Isp·g₀·ln(1/ε) = ${fmt(isp * G0 * Math.log(1 / eps) / 1000)} km/s`);
      hud.set('c', 'dropping empty tanks means later engines no longer push dead weight');
    }

    function ascentCase() {
      const k = `${state.TW}|${state.kick}`;
      if (cache.k !== k) cache = { k, A: ascent({ TW: state.TW, kick: state.kick }) };
      const { out, bo, tb } = cache.A, tEnd = Math.min(out.at(-1).t, tb * 1.6), t = tEnd * time.t / D;
      const shown = out.filter((o) => o.t <= tEnd), maxD = Math.max(100, ...shown.map((o) => o.down / 1000)), maxH = Math.max(100, ...shown.map((o) => o.h / 1000));
      sq.range([-maxD * 0.03, maxD * 1.05], [0, maxH * 1.1]); sq.titles('downrange (km)', 'altitude (km): burn (orange), coasting (dashed)');
      const on = shown.filter((o) => o.on), off = shown.filter((o) => !o.on), now = shown.filter((o) => o.t <= t);
      sq.line('on', on.map((o) => o.down / 1000), on.map((o) => o.h / 1000), { color: '--c-I', width: 1.4, dashed: true }); sq.line('off', off.map((o) => o.down / 1000), off.map((o) => o.h / 1000), { color: '--ink-dim', width: 1.2, dashed: true });
      sq.line('now', now.map((o) => o.down / 1000), now.map((o) => o.h / 1000), { color: '--c-I', width: 2.6 });
      const p = now.at(-1) || out[0]; sq.dots('q', [p.down / 1000], [p.h / 1000], { color: '--accent', size: 11 });
      const ts = out.filter((o) => o.t <= tb), ve = ROCKET.isp * G0, mdot = state.TW * G0 / ve;
      tr.range([0, tb], [0, 9.5]); tr.titles('time (s)', 'speed (km/s): real (orange), without losses (dashed)');
      tr.line('id', ts.map((o) => o.t), ts.map((o) => -ve * Math.log(1 - mdot * o.t) / 1000), { color: '--ink-dim', width: 1.2, dashed: true }); tr.line('v', ts.map((o) => o.t), ts.map((o) => o.v / 1000), { color: '--c-I', width: 2.2 });
      tr.dots('q', [Math.min(t, tb)], [(t <= tb ? p : bo).v / 1000], { color: '--accent', size: 9 });
      br.range([0.4, 4.6], [0, 9.5]); br.titles('', 'at burnout (km/s): ideal Δv, lost to gravity, to drag, speed left');
      [['i', bo.ideal, '--ink-dim', 'ideal'], ['g', bo.grav, '--c-B', 'gravity'], ['d', bo.drag, '--c-E', 'drag'], ['v', bo.v, '--c-v', 'speed']].forEach(([key, v, c, l], i) => { br.stems(key, [i + 1], [v / 1000], { color: c, width: 14 }); put(l, br.mx(i + 1), BR[1] - 0.18); });
      plots.aux.draw({ xlim: [0, tEnd], cursor: t, series: [{ x: shown.map((o) => o.t), y: shown.map((o) => o.q / 1000), color: '--c-E', label: 'dynamic pressure q = ½ρv² (kPa): the aerodynamic load, peaking at max-Q' }] });
      hud.set('a', bo.crashed ? `hit the ground at ${fmt(bo.t)} s, still burning: the turn was far too flat` : `burnout after ${fmt(tb)} s: ${fmt(bo.h / 1000)} km high, ${fmt(bo.v / 1000)} km/s, climbing at ${fmt(bo.gam)}° above horizontal`, bo.crashed ? 'bad' : '');
      hud.set('b', `ideal ${fmt(bo.ideal / 1000)} km/s − gravity ${fmt(bo.grav)} m/s − drag ${fmt(bo.drag)} m/s = ${fmt(bo.v / 1000)} km/s; max-Q ${fmt(bo.qmax / 1000)} kPa`);
      hud.set('c', 'orbit at 200 km needs 7.8 km/s, horizontal: steep and slow wastes thrust on gravity, flat and low on drag', !bo.crashed && bo.gam < 15 && bo.v > 7300 ? 'good' : '');
    }

    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); cache = {}; },
      update() {
        used = 0; pool.forEach((l) => { l.visible = false; });
        if (state.case === 'equation') equation(); else if (state.case === 'staging') stagingCase(); else ascentCase();
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
