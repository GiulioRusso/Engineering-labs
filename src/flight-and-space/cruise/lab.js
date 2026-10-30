// Cruise flight: the standard atmosphere, gliding (the sink polar, best glide, speed to fly into wind),
// and the Breguet range of a jet.
import { createChart } from '../../lib/viz/chart.js';
import { isa, sound, CRAFT, glide, bestGlideV, minSinkV, speedToFly, breguet, endurance } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 10;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const COPT = Object.entries(CRAFT).map(([k, v]) => [k, v.label]);

export default {
  id: 'cruise', title: 'Cruise flight', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { h: 3000, craft: 'trainer', V: 37, hg: 1500, wind: 0, LD: 18, c: 0.55, ff: 0.35, Vc: 240 },
  cases: [
    { id: 'atmosphere', label: 'Standard atmosphere', controls: ['h'], set: { h: 3000 }, examples: [
      { id: 'everest', label: 'Top of Everest', set: { h: 8849 } },
      { id: 'airliner', label: 'Airliner cruise: 11 km', set: { h: 11000 } },
      { id: 'concorde', label: 'Concorde: 18 km', set: { h: 18000 } },
    ] },
    { id: 'glide', label: 'Gliding', controls: ['craft', 'V', 'hg', 'wind'], set: { craft: 'trainer', V: 37, hg: 1500, wind: 0 }, examples: [
      { id: 'sailplane', label: 'A sailplane: 1 in 38', set: { craft: 'glider', V: 28 } },
      { id: 'slow', label: 'Slower: minimum sink', set: { V: 28.3 } },
      { id: 'fast', label: 'Too fast', set: { V: 60 } },
      { id: 'wind', label: 'Into a 10 m/s headwind', set: { wind: 10, V: 37 } },
      { id: 'stf', label: 'Headwind: fly faster', set: { wind: 10, V: 40.4 } },
    ] },
    { id: 'range', label: 'Range (Breguet)', controls: ['LD', 'c', 'ff', 'Vc'], set: { LD: 18, c: 0.55, ff: 0.35, Vc: 240 }, examples: [
      { id: 'fuel', label: 'Half the take-off weight in fuel', set: { ff: 0.5 } },
      { id: 'fighter', label: 'A fighter: L/D 8', set: { LD: 8, c: 0.8, Vc: 250, ff: 0.3 } },
      { id: 'clean', label: 'A cleaner wing: L/D 25', set: { LD: 25 } },
    ] },
  ],
  controls: [
    { title: 'Altitude', show: (s) => s.case === 'atmosphere', items: [{ id: 'h', label: 'Altitude', unit: 'km', k: 1e-3, min: 0, max: 20000, step: 50 }] },
    { title: 'Glide (engine off)', show: (s) => s.case === 'glide', items: [
      { id: 'craft', label: 'Aircraft', type: 'select', options: COPT },
      { id: 'V', label: 'Airspeed', unit: 'm/s', min: 18, max: 70, step: 0.1 },
      { id: 'hg', label: 'Starting height', unit: 'm', min: 200, max: 3000, step: 50 },
      { id: 'wind', label: 'Headwind', unit: 'm/s', min: -10, max: 15, step: 0.5 },
    ] },
    { title: 'Jet cruise', show: (s) => s.case === 'range', items: [
      { id: 'LD', label: 'Lift / drag', unit: '', min: 5, max: 30, step: 0.5 },
      { id: 'c', label: 'Fuel use per thrust (TSFC)', unit: '/h', min: 0.3, max: 1, step: 0.01 },
      { id: 'ff', label: 'Fuel share of take-off weight', unit: '%', k: 100, min: 0.05, max: 0.55, step: 0.005 },
      { id: 'Vc', label: 'Cruise speed', unit: 'km/h', k: 3.6, min: 120, max: 300, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 8 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };

    function atmosphere() {
      const h = state.h, A = isa(h), A0 = isa(0), hs = lin(0, 20000, 201), km = hs.map((q) => q / 1000);
      sq.range([0, 1.05], [0, 20]); sq.titles('share of the sea-level value', 'altitude (km): temperature T (red), pressure p (blue), density ρ (green)');
      sq.line('T', hs.map((q) => isa(q).T / A0.T), km, { color: '--c-north', width: 2.4 }); sq.line('p', hs.map((q) => isa(q).p / A0.p), km, { color: '--c-B', width: 2.4 }); sq.line('r', hs.map((q) => isa(q).rho / A0.rho), km, { color: '--c-v', width: 2.4 });
      sq.line('h', [0, 1.05], [h / 1000, h / 1000], { color: '--accent', width: 1.6, dashed: true }); sq.line('trop', [0, 1.05], [11, 11], { color: '--ink-dim', width: 1, dashed: true });
      put('tropopause', sq.mx(0.15), sq.my(11) + 0.12);
      tr.range([0, 20], [280, 345]); tr.titles('altitude (km)', 'speed of sound (m/s)');
      tr.line('a', km, hs.map(sound), { color: '--c-I', width: 2 }); tr.dots('q', [h / 1000], [sound(h)], { color: '--accent', size: 10 });
      br.range([0.4, 3.6], [0, 1.1]); br.titles('', 'at this altitude, share of sea level');
      [['T', A.T / A0.T, '--c-north', 'T'], ['p', A.p / A0.p, '--c-B', 'p'], ['r', A.rho / A0.rho, '--c-v', 'ρ']].forEach(([k, v, c, l], i) => { br.stems(k, [i + 1], [v], { color: c, width: 16 }); put(l, br.mx(i + 1), BR[1] - 0.18); });
      plots.aux.draw({ xlim: [0, 20], cursor: h / 1000, series: [{ x: km, y: hs.map((q) => isa(q).T - 273.15), color: '--c-north', label: 'temperature (°C) against altitude (km)' }] });
      hud.set('a', `${fmt(h / 1000)} km: T = ${fmt(A.T - 273.15)} °C, p = ${fmt(A.p / 100)} hPa, ρ = ${fmt(A.rho)} kg/m³`);
      hud.set('b', `speed of sound ${fmt(sound(h))} m/s (${fmt(sound(h) * 3.6)} km/h); a wing makes ${fmt(100 * A.rho / A0.rho)} % of its sea-level lift at the same speed`);
      hud.set('c', h <= 11000 ? 'below 11 km temperature falls 6.5 °C per km; pressure and density fall about 12 % per km' : 'above 11 km temperature stays at −56.5 °C; pressure and density keep falling, now exactly exponentially');
    }

    function glideCase() {
      const P = CRAFT[state.craft], { V, hg, wind } = state, g = glide(P, V, 0, wind), vb = bestGlideV(P), ms = minSinkV(P), s2f = speedToFly(P, wind), gb = glide(P, vb, 0, wind);
      const dist = hg * g.ground, distB = hg * gb.ground, t = (hg / g.sink) * time.t / D, X = Math.max(dist, distB, hg * 15) / 1000 * 1.08;
      sq.range([0, X], [0, hg * 1.15]); sq.titles('distance over the ground (km)', 'height (m): your glide (orange), best glide (dashed)');
      sq.line('best', [0, distB / 1000], [hg, 0], { color: '--ink-dim', width: 1.4, dashed: true });
      sq.line('path', [0, dist / 1000], [hg, 0], { color: g.stalled ? '--c-north' : '--c-I', width: 2.4 });
      const y = Math.max(0, hg - g.sink * t); sq.dots('q', [(V - wind) * t / 1000], [y], { color: '--accent', size: 12 });
      const vs = lin(18, 70, 300).filter((q) => !glide(P, q).stalled), sink = vs.map((q) => -glide(P, q).sink);
      tr.range([0, 70], [-8, 0.5]); tr.titles('airspeed (m/s)', 'sink (m/s): the polar; tangent = best glide');
      tr.line('pol', vs, sink, { color: '--c-B', width: 2 });
      const tx = s2f.V, ty = -glide(P, tx).sink; tr.line('tan', [wind, tx * 1.6 - wind * 0.6], [0, ty * (tx * 1.6 - wind * 0.6 - wind) / (tx - wind)], { color: '--c-v', width: 1.2, dashed: true });
      tr.dots('q', [V], [-g.sink], { color: '--accent', size: 10 }); tr.dots('ms', [ms], [-glide(P, ms).sink], { color: '--ink-dim', size: 7 });
      br.range([0, 70], [0, 45]); br.titles('airspeed (m/s)', 'glide ratio over the ground (distance / height)');
      br.line('gr', vs, vs.map((q) => glide(P, q, 0, wind).ground), { color: '--c-I', width: 2 }); br.dots('q', [V], [g.ground], { color: '--accent', size: 10 });
      plots.aux.draw({ xlim: [18, 70], cursor: V, series: [{ x: vs, y: vs.map((q) => glide(P, q).LD), color: '--c-B', label: 'lift / drag in still air' }] });
      hud.set('a', g.stalled ? `${fmt(V)} m/s is below the stall speed: the wing cannot hold the weight` : `${P.label} at ${fmt(V)} m/s: sinks ${fmt(g.sink)} m/s, L/D ${fmt(g.LD)}, ${fmt(g.ground)} m forward per metre down`, g.stalled ? 'bad' : '');
      hud.set('b', `from ${fmt(hg)} m: ${fmt(dist / 1000)} km in ${fmt(hg / g.sink / 60)} min; best glide ${fmt(vb)} m/s would give ${fmt(distB / 1000)} km`);
      hud.set('c', wind ? `with ${fmt(wind)} m/s ${wind > 0 ? 'headwind' : 'tailwind'} the best speed over the ground is ${fmt(s2f.V)} m/s (${fmt(s2f.ratio)} : 1)` : `minimum sink at ${fmt(ms)} m/s (${fmt(glide(P, ms).sink)} m/s): longest in the air, not furthest`, 'good');
    }

    function rangeCase() {
      const { LD, c, ff, Vc } = state, R = breguet(Vc, LD, c, ff) / 1000, E = endurance(LD, c, ff), fs = lin(0.01, 0.6, 120);
      sq.range([0, 0.6], [0, 25000]); sq.titles('fuel share of take-off weight', 'range (km): Breguet (orange), if weight did not fall (dashed)');
      sq.line('R', fs, fs.map((f) => breguet(Vc, LD, c, f) / 1000), { color: '--c-I', width: 2.4 }); sq.line('lin', fs, fs.map((f) => Vc / (c / 3600) * LD * f / 1000), { color: '--ink-dim', width: 1.2, dashed: true });
      sq.dots('q', [ff], [R], { color: '--accent', size: 12 });
      const xs = lin(0, R, 100);
      tr.range([0, Math.max(R, 1)], [0.4, 1.02]); tr.titles('distance flown (km)', 'weight / take-off weight');
      tr.line('W', xs, xs.map((x) => Math.exp(-x * 1000 * (c / 3600) / (Vc * LD))), { color: '--c-B', width: 2 });
      const lds = lin(5, 30, 100);
      br.range([5, 30], [0, 25000]); br.titles('lift / drag', 'range (km) with this fuel');
      br.line('rl', lds, lds.map((l) => breguet(Vc, l, c, ff) / 1000), { color: '--c-v', width: 2 }); br.dots('q', [LD], [R], { color: '--accent', size: 10 });
      plots.aux.draw({ xlim: [0, 0.6], cursor: ff, series: [{ x: fs, y: fs.map((f) => endurance(LD, c, f)), color: '--c-E', label: 'endurance (hours)' }] });
      hud.set('a', `range = (V/c)(L/D) ln(W₀/W₁) = ${fmt(Vc * 3.6)} km/h ÷ ${fmt(c)}/h × ${fmt(LD)} × ${fmt(Math.log(1 / (1 - ff)))} = ${fmt(R)} km`);
      hud.set('b', `${fmt(E)} hours in the air; burning fuel makes the aircraft lighter, so it needs less thrust as it goes`, 'good');
      hud.set('c', 'range is speed × aerodynamics (L/D) × engine (1/c) × fuel (ln of the weight ratio): each a different design team');
    }

    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); ctx.setClock(state.case === 'glide' ? D : 0); },
      update() {
        used = 0; pool.forEach((l) => { l.visible = false; });
        if (state.case === 'atmosphere') atmosphere(); else if (state.case === 'glide') glideCase(); else rangeCase();
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
