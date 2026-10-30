// Kepler's laws: equal areas in equal times on an ellipse, T² ∝ a³ for the real planets, and Newton's
// cannon (fire faster: fall back, circle, ellipse, escape).
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { si } from '../../lib/ui/format.js';
import { onOrbit, meanAnomaly, sectorAreas, periodYears, PLANETS, cannon, RE, MU } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 10, G = 140, KMS = 4.7405; // 1 AU/yr in km/s
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const circ = (cx, cy, r, n = 120) => lin(0, 2 * Math.PI, n).map((t) => [cx + r * Math.cos(t), cy + r * Math.sin(t)]);

// Newton's cannon integrated in time (RK4), so the ball moves at its real speed along the conic
function fly(r0, v) {
  const c = cannon(r0, v), tEnd = Math.min(Number.isFinite(c.T) ? c.T : 4 * 3600, 6 * 3600), n = 1200, h = tEnd / n, P = [[r0, 0, 0]];
  let s = [r0, 0, 0, v]; const f = (q) => { const r3 = Math.hypot(q[0], q[1]) ** 3; return [q[2], q[3], -MU * q[0] / r3, -MU * q[1] / r3]; };
  for (let i = 1; i <= n; i++) {
    for (let k = 0; k < 4; k++) { const hh = h / 4, k1 = f(s), k2 = f(s.map((x, j) => x + hh / 2 * k1[j])), k3 = f(s.map((x, j) => x + hh / 2 * k2[j])), k4 = f(s.map((x, j) => x + hh * k3[j])); s = s.map((x, j) => x + hh / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); }
    P.push([s[0], s[1], i * h]);
    if (Math.hypot(s[0], s[1]) < RE) break;
  }
  return { c, P, tEnd: P.at(-1)[2] };
}

export default {
  id: 'kepler', title: 'Kepler’s laws', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D,
  defaults: { e: 0.5, n: 8, a: 1.5, M: 1, v: 7669, h: 400e3 },
  cases: [
    { id: 'areas', label: 'Ellipses and equal areas', controls: ['e', 'n'], set: { e: 0.5, n: 8 }, examples: [
      { id: 'circle', label: 'A circle: steady speed', set: { e: 0 } },
      { id: 'earth', label: 'Earth: e = 0.017', set: { e: 0.0167 } },
      { id: 'mercury', label: 'Mercury: e = 0.21', set: { e: 0.2056 } },
      { id: 'comet', label: 'A comet: e = 0.9', set: { e: 0.9, n: 12 } },
    ] },
    { id: 'third', label: 'T² ∝ a³', controls: ['a', 'M'], set: { a: 1.5, M: 1 }, examples: [
      { id: 'jupiter', label: 'Jupiter’s distance: 11.9 years', set: { a: 5.2 } },
      { id: 'four', label: 'Four times as far: 8 times as long', set: { a: 4 } },
      { id: 'heavy', label: 'A star of 4 Suns: half the period', set: { a: 1, M: 4 } },
    ] },
    { id: 'cannon', label: 'Newton’s cannon', controls: ['v', 'h'], set: { v: 7669, h: 400e3 }, examples: [
      { id: 'slow', label: '6 km/s: falls back', set: { v: 6000 } },
      { id: 'ellipse', label: '9 km/s: an ellipse', set: { v: 9000 } },
      { id: 'escape', label: '10.85 km/s: escape', set: { v: 10845 } },
      { id: 'hyper', label: '12 km/s: a hyperbola', set: { v: 12000 } },
    ] },
  ],
  controls: [
    { title: 'Orbit (a = 1 AU round the Sun)', show: (s) => s.case === 'areas', items: [
      { id: 'e', label: 'Eccentricity e', unit: '', min: 0, max: 0.95, step: 0.005 },
      { id: 'n', label: 'Equal time slices', unit: '', min: 4, max: 16, step: 1 },
    ] },
    { title: 'Your planet', show: (s) => s.case === 'third', items: [
      { id: 'a', label: 'Distance a', unit: 'AU', min: 0.3, max: 35, log: true },
      { id: 'M', label: 'Star mass', unit: 'Suns', min: 0.25, max: 4, log: true },
    ] },
    { title: 'Cannon on a tall mountain', show: (s) => s.case === 'cannon', items: [
      { id: 'v', label: 'Launch speed (horizontal)', unit: 'km/s', k: 1e-3, min: 3000, max: 13000, step: 5 },
      { id: 'h', label: 'Mountain height', unit: 'km', k: 1e-3, min: 100e3, max: 3000e3, step: 10e3 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const ray = createCurve(stage, { max: 2, width: 2, color: '--accent' });
    const pool = Array.from({ length: 12 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    const xy = (L) => [L.map((p) => p[0]), L.map((p) => p[1])];
    let cache = {};

    function areas() {
      const { e, n } = state, N = Math.round(n), a = 1, b = Math.sqrt(1 - e * e), X = 1.95;
      const k = `${e}|${N}`;
      if (cache.k !== k) { // shade the ellipse by time slice: alternate colours for alternate slices
        const v = new Float64Array(G * G);
        for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const x = -X + 2 * X * (i + 0.5) / G, y = -X + 2 * X * (j + 0.5) / G, u = (x + a * e) / a, w = y / b; v[j * G + i] = u * u + w * w > 1 ? -1 : Math.floor(meanAnomaly(Math.atan2(y, x), e) / (2 * Math.PI) * N) % 2; }
        cache = { k, v, A: sectorAreas(a, e, N, 800) };
      }
      sq.range([-X, X], [-X, X]); sq.titles('x (AU)', 'y (AU)');
      sq.image('s', cache.v, G, G, { rgb: (q, o) => { const s = cache.v[q]; if (s < 0) { o[0] = 0.07; o[1] = 0.08; o[2] = 0.11; } else if (s) { o[0] = 0.85; o[1] = 0.55; o[2] = 0.2; } else { o[0] = 0.25; o[1] = 0.4; o[2] = 0.75; } } });
      const T = time.t / D, p = onOrbit(a, e, 2 * Math.PI * T);
      sq.dots('sun', [0], [0], { color: '--c-F', size: 16 }); sq.dots('f2', [-2 * a * e], [0], { color: '--ink-dim', size: 6 }); sq.dots('pl', [p.x], [p.y], { color: '--accent', size: 11 });
      ray.set([sq.mx(0), sq.my(0), 0.02, sq.mx(p.x), sq.my(p.y), 0.02]); ray.object.visible = true;
      put('Sun', sq.mx(0), sq.my(-0.13)); if (e > 0.05) put('empty focus', sq.mx(-2 * e), sq.my(-0.13));
      const ts = lin(0, 1, 241), vs = ts.map((t) => onOrbit(a, e, 2 * Math.PI * t).v * KMS);
      tr.range([0, 1], [0, Math.max(...vs) * 1.15]); tr.titles('time (orbits)', 'speed (km/s)'); tr.line('v', ts, vs, { color: '--c-I', width: 2 }); tr.dots('q', [T], [p.v * KMS], { color: '--accent', size: 10 });
      const ab = Math.PI * a * b, A = cache.A;
      br.range([0.5, N + 0.5], [0, ab / N * 1.6]); br.titles('time slice', 'area swept in each slice (AU²)');
      br.stems('A', A.map((_, i) => i + 1), A, { color: '--c-v', width: 10 });
      plots.aux.draw({ xlim: [0, 1], cursor: T, series: [{ x: ts, y: ts.map((t) => onOrbit(a, e, 2 * Math.PI * t).r), color: '--c-B', label: 'distance from the Sun r (AU)' }] });
      hud.set('a', `now: r = ${fmt(p.r)} AU, v = ${fmt(p.v * KMS)} km/s; perihelion ${fmt(1 - e)} AU at ${fmt(onOrbit(a, e, 0).v * KMS)} km/s, aphelion ${fmt(1 + e)} AU at ${fmt(onOrbit(a, e, Math.PI).v * KMS)} km/s`);
      hud.set('b', `each slice lasts 1/${N} of a year and sweeps ${fmt(ab / N)} AU² (πab/${N}): short and wide near the Sun, long and thin far away`, 'good');
      hud.set('c', `speed ratio perihelion/aphelion = (1 + e)/(1 − e) = ${fmt((1 + e) / (1 - e))}: r × v is the same at both (angular momentum)`);
    }

    function third() {
      const { a, M } = state, Tu = periodYears(a, M), la = lin(-0.7, 1.7, 50);
      sq.range([-0.7, 1.7], [-1.2, 2.8]); sq.titles('log₁₀ a (AU)', 'log₁₀ T (years): a straight line of slope 3/2');
      sq.line('law', la, la.map((x) => 1.5 * x), { color: '--ink-dim', width: 1.4, dashed: true });
      if (M !== 1) sq.line('lawM', la, la.map((x) => 1.5 * x - 0.5 * Math.log10(M)), { color: '--c-I', width: 1.4, dashed: true }); else sq.hide('lawM');
      sq.dots('pl', PLANETS.map((P) => Math.log10(P.a)), PLANETS.map((P) => Math.log10(P.T)), { color: '--c-B', size: 9 });
      PLANETS.forEach((P) => put(P.name, sq.mx(Math.log10(P.a)) + 0.35, sq.my(Math.log10(P.T)) - 0.12));
      sq.dots('you', [Math.log10(a)], [Math.log10(Tu)], { color: '--accent', size: 13 });
      // a top view: the planets inside your orbit, moving at their real periods; 10 s show two of your years
      const yrs = 2 * Tu * time.t / D, R = a * 1.15, shown = PLANETS.filter((P) => P.a < R);
      tr.range([-R, R], [-R, R]); tr.titles('', `top view: ${fmt(yrs)} years`);
      tr.line('o', ...xy(circ(0, 0, a)), { color: '--accent', width: 1.2 });
      shown.forEach((P, i) => tr.line(`o${i}`, ...xy(circ(0, 0, P.a)), { color: '--line', width: 1 })); for (let i = shown.length; i < 8; i++) tr.hide(`o${i}`);
      tr.dots('pp', shown.map((P) => P.a * Math.cos(2 * Math.PI * yrs / P.T)), shown.map((P) => P.a * Math.sin(2 * Math.PI * yrs / P.T)), { color: '--c-B', size: 6 });
      tr.dots('pu', [a * Math.cos(2 * Math.PI * yrs / Tu)], [a * Math.sin(2 * Math.PI * yrs / Tu)], { color: '--accent', size: 9 }); tr.dots('sun', [0], [0], { color: '--c-F', size: 9 });
      br.range([0.5, 9.5], [0, 1.6]); br.titles('', 'T²/a³ (years²/AU³): the same for all');
      br.stems('r', PLANETS.map((_, i) => i + 1), PLANETS.map((P) => P.T ** 2 / P.a ** 3), { color: '--c-B', width: 8 }); br.stems('u', [9], [Tu ** 2 / a ** 3], { color: '--accent', width: 8 });
      plots.aux.draw({ xlim: [0, 35], series: [{ x: lin(0.05, 35, 200), y: lin(0.05, 35, 200).map((x) => periodYears(x, M)), color: '--c-I', label: 'period T (years) against distance a (AU)' }], cursor: a });
      hud.set('a', `your planet: a = ${fmt(a)} AU, T = √(a³/M) = ${fmt(Tu)} years${Tu < 1 ? ` (${fmt(Tu * 365.25)} days)` : ''}`);
      hud.set('b', `speed on a circle 2πa/T = ${fmt(2 * Math.PI * a / Tu * KMS)} km/s: further out is slower`, 'good');
      hud.set('c', 'the eight planets sit on one line of slope 3/2 in log–log: T² ∝ a³, with the constant set only by the star’s mass');
    }

    function cannonCase() {
      const r0 = RE + state.h, k = `${state.v}|${state.h}`;
      if (cache.k !== k) cache = { k, F: fly(r0, state.v) };
      const { c, P, tEnd } = cache.F, X = 4 * RE / 1e6, s = 1e-6;
      sq.range([-X, X], [-X, X]); sq.titles('x (1000 km)', 'y (1000 km)');
      const v = new Float64Array(G * G); for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const x = -X + 2 * X * (i + 0.5) / G, y = -X + 2 * X * (j + 0.5) / G; v[j * G + i] = Math.hypot(x, y) < RE * s ? 1 : 0; }
      sq.image('earth', v, G, G, { rgb: (q, o) => { if (v[q]) { o[0] = 0.15; o[1] = 0.35; o[2] = 0.6; } else { o[0] = 0.06; o[1] = 0.07; o[2] = 0.1; } } });
      sq.line('mtn', [RE * s, r0 * s], [0, 0], { color: '--ink', width: 3 });
      const path = c.path.filter(([x, y]) => Math.abs(x * s) < X && Math.abs(y * s) < X);
      sq.line('conic', path.map((p) => p[0] * s), path.map((p) => p[1] * s), { color: '--ink-dim', width: 1.2, dashed: true });
      const tt = (time.t / D) * tEnd, done = P.filter((p) => p[2] <= tt), last = done.at(-1);
      sq.line('trail', done.map((p) => p[0] * s), done.map((p) => p[1] * s), { color: '--c-I', width: 2.4 });
      if (Math.abs(last[0] * s) < X && Math.abs(last[1] * s) < X) sq.dots('ball', [last[0] * s], [last[1] * s], { color: '--accent', size: 11 }); else sq.dots('ball', [], []);
      const vs = lin(3000, 13000, 201), eps = vs.map((u) => (u * u / 2 - MU / r0) / 1e6), ecc = vs.map((u) => cannon(r0, u).e);
      tr.range([3, 13], [Math.min(...eps), Math.max(...eps)]); tr.titles('launch speed (km/s)', 'energy per kg ε = v²/2 − μ/r (MJ/kg)');
      tr.line('e', vs.map((u) => u / 1000), eps, { color: '--c-I', width: 2 }); tr.dots('q', [state.v / 1000], [(state.v ** 2 / 2 - MU / r0) / 1e6], { color: '--accent', size: 10 });
      tr.dots('m', [c.vc / 1000, c.vesc / 1000], [-MU / (2 * r0) / 1e6, 0], { color: '--c-v', size: 8 });
      br.range([3, 13], [0, 2]); br.titles('launch speed (km/s)', 'eccentricity e: 0 circle, 1 escape');
      br.line('ecc', vs.map((u) => u / 1000), ecc, { color: '--c-B', width: 2 }); br.dots('q', [state.v / 1000], [Math.min(c.e, 2)], { color: '--accent', size: 10 });
      br.line('one', [3, 13], [1, 1], { color: '--ink-dim', width: 1, dashed: true });
      plots.aux.draw({ xlim: [0, tEnd / 60], cursor: tt / 60, series: [{ x: P.map((p) => p[2] / 60), y: P.map((p) => (Math.hypot(p[0], p[1]) - RE) / 1000), color: '--c-B', label: 'altitude (km) against time (min)' }] });
      hud.set('a', `${c.kind}: ε = ${fmt((state.v ** 2 / 2 - MU / r0) / 1e6)} MJ/kg, e = ${fmt(c.e)}${Number.isFinite(c.T) && c.rp >= RE ? `, period ${fmt(c.T / 60)} min, apogee ${fmt((c.ra - RE) / 1000)} km` : ''}`, c.kind === 'falls back' ? 'bad' : 'good');
      hud.set('b', `from ${fmt(state.h / 1000)} km: circular speed √(μ/r) = ${fmt(c.vc / 1000)} km/s, escape speed √(2μ/r) = ${fmt(c.vesc / 1000)} km/s`);
      hud.set('c', 'an orbit is falling and missing: fast enough, and the ground curves away as fast as the ball drops');
    }

    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); ray.object.visible = false; cache = {}; },
      update() {
        used = 0; pool.forEach((l) => { l.visible = false; });
        if (state.case === 'areas') areas(); else if (state.case === 'third') third(); else cannonCase();
      },
      theme() { charts.forEach((k) => k.theme()); ray.theme(); },
    };
  },
};
