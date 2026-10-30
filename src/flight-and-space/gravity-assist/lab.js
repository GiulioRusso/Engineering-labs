// Gravity assist: the flyby in the planet's frame (a hyperbola, same speed in and out), the same flyby seen
// from the Sun (the planet's velocity added: faster or slower), and the velocity triangle that explains it.
import { createChart } from '../../lib/viz/chart.js';
import { PLANETS, flyby, hyperPos, sideFor, timeTo } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 10;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const POPT = Object.entries(PLANETS).map(([k, v]) => [k, v.label]);

export default {
  id: 'gravity-assist', title: 'Gravity assist', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { planet: 'jupiter', vinf: 6000, rp: 5, th: 100, pass: 'behind', frame: 'planet' },
  cases: [
    { id: 'assist', label: 'Flyby', controls: ['planet', 'vinf', 'rp', 'th', 'pass', 'frame'], set: { planet: 'jupiter', vinf: 6000, rp: 5, th: 100, pass: 'behind', frame: 'planet' }, examples: [
      { id: 'sun', label: 'Seen from the Sun: faster', set: { frame: 'sun' } },
      { id: 'front', label: 'Pass in front: slower', set: { pass: 'front' } },
      { id: 'close', label: 'Skim the cloud tops', set: { rp: 1.1 } },
      { id: 'far', label: 'Far pass: small turn', set: { rp: 30 } },
      { id: 'earth', label: 'An Earth flyby', set: { planet: 'earth', vinf: 9000, rp: 1.1 } },
      { id: 'venus', label: 'Braking at Venus', set: { planet: 'venus', vinf: 5000, rp: 1.1, pass: 'front' } },
    ] },
  ],
  controls: [{ title: 'Flyby', items: [
    { id: 'planet', label: 'Planet', type: 'select', options: POPT },
    { id: 'vinf', label: 'Approach speed v∞ (relative to the planet)', unit: 'km/s', k: 1e-3, min: 1000, max: 20000, step: 100 },
    { id: 'rp', label: 'Closest approach', unit: 'planet radii', min: 1.05, max: 40, log: true },
    { id: 'th', label: 'Arrival direction (0° = along the planet’s motion)', unit: '°', min: 10, max: 170, step: 1 },
    { id: 'pass', label: 'Pass', type: 'segmented', options: [['behind', 'Behind the planet'], ['front', 'In front']] },
    { id: 'frame', label: 'Seen from', type: 'segmented', options: [['planet', 'The planet'], ['sun', 'The Sun']] },
  ] }],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 'days', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR, xTicks: false }), charts = [sq, tr, br];
    const pool = Array.from({ length: 10 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); },
      update() {
        used = 0; pool.forEach((l) => { l.visible = false; });
        const P = PLANETS[state.planet], th = state.th * Math.PI / 180, s = sideFor(state.pass), rp = state.rp * P.R, f = flyby(P, state.vinf, rp, th, s);
        const L = 6 * rp + 10 * P.R, tw = timeTo(P, f, L), ts = lin(-tw, tw, 400), t = -tw + 2 * tw * time.t / D, sun = state.frame === 'sun', V = sun ? P.V : 0;
        const pos = (q) => { const p = hyperPos(P, f, th, s, q); return [(p.x + V * q) / P.R, (p.y) / P.R]; };
        const path = ts.map(pos), now = path.filter((_, i) => ts[i] <= t), c = pos(t), pl = [V * t / P.R, 0];
        const ext = Math.max(L / P.R, ...path.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])))) * 1.05;
        sq.range([-ext, ext], [-ext, ext]); sq.titles('planet radii', sun ? 'seen from the Sun: the planet moves right; the craft leaves faster or slower' : 'seen from the planet: a hyperbola, same speed in and out');
        sq.line('all', path.map((p) => p[0]), path.map((p) => p[1]), { color: '--ink-dim', width: 1.2, dashed: true });
        sq.line('now', now.map((p) => p[0]), now.map((p) => p[1]), { color: '--c-I', width: 2.6 });
        const pr = Math.max(1, ext * 0.02), disc = lin(0, 2 * Math.PI, 60).map((a) => [pl[0] + pr * Math.cos(a), pl[1] + pr * Math.sin(a)]); // drawn at least 2 % of the view
        sq.line('pl', disc.map((p) => p[0]), disc.map((p) => p[1]), { color: '--c-F', width: 2.2 });
        sq.dots('craft', [c[0]], [c[1]], { color: '--accent', size: 11 });
        put(`${P.label} →`, sq.mx(pl[0]), sq.my(pl[1]) - 0.22);
        // the velocity triangle (km/s): planet velocity, v∞ in and out on a circle, heliocentric in and out
        const k = 1e-3, Vp = P.V * k, vi = state.vinf * k, ring = lin(0, 2 * Math.PI, 80);
        const R0 = Math.max(Vp + vi, Math.hypot(...f.hout) * k) * 1.1;
        tr.range([-0.15 * R0, R0], [-0.6 * R0, 0.6 * R0]); tr.titles('km/s', 'velocities: planet (grey), v∞ in/out, Sun frame in (blue), out (orange)');
        tr.line('ring', ring.map((a) => Vp + vi * Math.cos(a)), ring.map((a) => vi * Math.sin(a)), { color: '--line', width: 1, dashed: true });
        tr.line('V', [0, Vp], [0, 0], { color: '--ink-dim', width: 2.4 });
        tr.line('hin', [0, f.hin[0] * k], [0, f.hin[1] * k], { color: '--c-B', width: 2.4 }); tr.line('hout', [0, f.hout[0] * k], [0, f.hout[1] * k], { color: '--c-I', width: 2.4 });
        tr.line('vin', [Vp, f.hin[0] * k], [0, f.hin[1] * k], { color: '--c-B', width: 1.2, dashed: true }); tr.line('vout', [Vp, f.hout[0] * k], [0, f.hout[1] * k], { color: '--c-I', width: 1.2, dashed: true });
        tr.dots('tips', [f.hin[0] * k, f.hout[0] * k], [f.hin[1] * k, f.hout[1] * k], { color: '--accent', size: 7 });
        const hi = Math.hypot(...f.hin) * k, ho = Math.hypot(...f.hout) * k;
        br.range([0.4, 4.6], [0, Math.max(hi, ho, state.vinf * k) * 1.25]); br.titles('', 'speed (km/s): from the Sun in, out; from the planet in, out');
        [['a', hi, '--c-B', 'Sun in'], ['b', ho, '--c-I', 'Sun out'], ['c', state.vinf * k, '--ink-dim', 'planet in'], ['d', state.vinf * k, '--ink-dim', 'planet out']].forEach(([key, v, col, l], i) => { br.stems(key, [i + 1], [v], { color: col, width: 14 }); put(l, br.mx(i + 1), BR[1] - 0.18); });
        const day = 86400, sp = ts.map((q) => { const p = hyperPos(P, f, th, s, q); return [Math.hypot(p.vx, p.vy) * k, Math.hypot(p.vx + P.V, p.vy) * k]; });
        plots.aux.draw({ xlim: [-tw / day, tw / day], cursor: t / day, series: [{ x: ts.map((q) => q / day), y: sp.map((q) => q[1]), color: '--c-I', label: 'speed seen from the Sun (km/s)' }, { x: ts.map((q) => q / day), y: sp.map((q) => q[0]), color: '--ink-dim', label: 'speed seen from the planet' }] });
        hud.set('a', `turned by δ = 2 asin(1/(1 + r_p v∞²/μ)) = ${fmt(f.d * 180 / Math.PI)}°; ${fmt(f.vp * k)} km/s at closest approach, ${fmt(state.rp)} radii`);
        hud.set('b', `from the Sun: ${fmt(hi)} → ${fmt(ho)} km/s (${f.gain >= 0 ? '+' : ''}${fmt(f.gain * k)} km/s) without burning any fuel`, f.gain >= 0 ? 'good' : 'bad');
        hud.set('c', `from ${P.label}: ${fmt(state.vinf * k)} km/s in and out; the planet ${f.gain >= 0 ? 'loses' : 'gains'} the same momentum, a negligible change to its orbit`);
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
