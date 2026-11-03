// Aerodynamics: flow and pressure round a Joukowski airfoil, the drag polar and power curves,
// the take-off and landing ground roll, and longitudinal static stability.
import { createChart } from '../../lib/viz/chart.js';
import { airfoil, streamlines, drag, polarSpeeds, groundRoll, SURF, longitudinal, gust, PLANE, isa, WING } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], R = Math.PI / 180;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];

export default {
  id: 'aero', title: 'Aerodynamics of the aeroplane', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { alpha: 5, camber: 0.06, thick: 0.1, AR: 7.5, CD0: 0.027, m: 1000, h: 0, V: 45, kind: 'takeoff', mt: 1000, ht: 0, wind: 0, surf: 'dry', cg: 0.25, VH: 0.5, de: 0 },
  cases: [
    { id: 'airfoil', label: 'Airfoil', set: {}, examples: [
      { id: 'sym', label: 'Symmetric at 0°: no lift', set: { camber: 0, alpha: 0 } },
      { id: 'camber', label: 'Camber alone lifts', set: { camber: 0.1, alpha: 0 } },
      { id: 'high', label: '12°: a strong suction peak', set: { alpha: 12 } },
      { id: 'neg', label: 'Below the zero-lift angle', set: { alpha: -6 } },
    ] },
    { id: 'polar', label: 'Drag polar', set: {}, examples: [
      { id: 'glider', label: 'A long wing: aspect ratio 20', set: { AR: 20 } },
      { id: 'heavy', label: '40 % heavier', set: { m: 1400 } },
      { id: 'high', label: 'At 4000 m', set: { h: 4000 } },
      { id: 'slow', label: 'Slow: the back side of the curve', set: { V: 28 } },
    ] },
    { id: 'takeoff', label: 'Take-off and landing', set: {}, examples: [
      { id: 'hot', label: 'A high airfield: 2000 m', set: { ht: 2000 } },
      { id: 'heavy', label: '20 % heavier', set: { mt: 1200 } },
      { id: 'wind', label: '10 m/s headwind', set: { wind: 10 } },
      { id: 'grass', label: 'From grass', set: { surf: 'grass' } },
      { id: 'land', label: 'Landing on a wet runway', set: { kind: 'landing', surf: 'wet' } },
    ] },
    { id: 'stability', label: 'Static stability', set: {}, examples: [
      { id: 'fwd', label: 'Nose-heavy: very stable', set: { cg: 0.1 } },
      { id: 'aft', label: 'CG near the neutral point', set: { cg: 0.4, de: -3 } },
      { id: 'unstable', label: 'CG behind it: unstable', set: { cg: 0.55 } },
      { id: 'tail', label: 'A smaller tail', set: { VH: 0.25, cg: 0.3 } },
      { id: 'elev', label: 'Up elevator: trims slower', set: { de: 4 } },
    ] },
  ],
  controls: [
    { title: 'Airfoil (Joukowski)', show: (s) => s.case === 'airfoil', items: [
      { id: 'alpha', label: 'Angle of attack α', unit: '°', min: -10, max: 16, step: 0.1 },
      { id: 'camber', label: 'Camber', unit: '', min: 0, max: 0.2, step: 0.005 },
      { id: 'thick', label: 'Thickness', unit: '', min: 0.02, max: 0.25, step: 0.005 },
    ] },
    { title: 'Aircraft in level flight', show: (s) => s.case === 'polar', items: [
      { id: 'V', label: 'Airspeed', unit: 'm/s', min: 20, max: 90, step: 0.5 },
      { id: 'AR', label: 'Aspect ratio b²/S', unit: '', min: 4, max: 30, step: 0.5 },
      { id: 'CD0', label: 'Friction drag C_D0', unit: '', min: 0.012, max: 0.05, step: 0.001 },
      { id: 'm', label: 'Mass', unit: 'kg', min: 600, max: 1600, step: 10 },
      { id: 'h', label: 'Altitude', unit: 'm', min: 0, max: 6000, step: 50 },
    ] },
    { title: 'Ground roll', show: (s) => s.case === 'takeoff', items: [
      { id: 'kind', label: 'Phase', type: 'segmented', options: [['takeoff', 'Take-off'], ['landing', 'Landing']] },
      { id: 'mt', label: 'Mass', unit: 'kg', min: 700, max: 1300, step: 10 },
      { id: 'ht', label: 'Airfield altitude', unit: 'm', min: 0, max: 3000, step: 50 },
      { id: 'wind', label: 'Headwind', unit: 'm/s', min: -5, max: 15, step: 0.5 },
      { id: 'surf', label: 'Runway', type: 'select', options: Object.entries(SURF).map(([k, v]) => [k, v.label]) },
    ] },
    { title: 'Balance', show: (s) => s.case === 'stability', items: [
      { id: 'cg', label: 'Centre of gravity', unit: '% MAC', k: 100, min: 0.05, max: 0.65, step: 0.005 },
      { id: 'VH', label: 'Tail volume', unit: '', min: 0.15, max: 0.9, step: 0.01, hint: 'S_t l_t / S c̄' },
      { id: 'de', label: 'Elevator (up +)', unit: '°', min: -8, max: 8, step: 0.1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 10 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    let AF = null, afKey = '', GR = null, grKey = '';

    function airfoilCase() {
      const a = state.alpha * R, key = `${state.thick},${state.camber},${state.alpha}`;
      if (key !== afKey) { afKey = key; const A = airfoil(state.thick, state.camber, a); AF = { A, S: streamlines(A, a) }; }
      const { A, S } = AF, dsp = (z) => rot([z[0] - 0.0, z[1]], -a);
      sq.range([-3.4, 3.4], [-3.4, 3.4]); sq.titles('', 'streamlines (flow from the left); dots: air parcels released together');
      S.forEach((s, k) => { const P = s.pts.map(dsp); sq.line(`s${k}`, P.map((p) => p[0]), P.map((p) => p[1]), { color: '--c-B', width: 1.2 }); });
      const out = A.surf.map((p) => dsp(p.z)); sq.line('foil', out.map((p) => p[0]), out.map((p) => p[1]), { color: '--ink', width: 3 });
      // parcels: each streamline carries dots one time unit apart, all launched at the same instants
      const px = [], py = [], tt = (time.t * 0.9) % 1;
      S.forEach((s) => { const T = s.ts[s.ts.length - 1]; for (let q = tt; q < T; q += 1) { let i = 1; while (i < s.ts.length && s.ts[i] < q) i++; if (i >= s.ts.length) break; const f = (q - s.ts[i - 1]) / (s.ts[i] - s.ts[i - 1] || 1), z = [s.pts[i - 1][0] + f * (s.pts[i][0] - s.pts[i - 1][0]), s.pts[i - 1][1] + f * (s.pts[i][1] - s.pts[i - 1][1])], p = dsp(z); if (Math.abs(p[0]) < 3.4 && Math.abs(p[1]) < 3.4) { px.push(p[0]); py.push(p[1]); } } });
      sq.dots('parcels', px, py, { color: '--c-I', size: 5 });
      const up = A.surf.slice(0, A.le + 1), lo = A.surf.slice(A.le), xc = (p) => (p.z[0] - A.xle) / A.chord, cl = (v) => Math.max(-6, Math.min(1.2, v));
      tr.range([0, 1], [-1.2, 4]); tr.titles('position along the chord x/c', '−Cp: suction on the upper surface (blue), lower surface (orange)');
      tr.line('up', up.map(xc), up.map((p) => -cl(p.cp)), { color: '--c-B' }); tr.line('lo', lo.map(xc), lo.map((p) => -cl(p.cp)), { color: '--c-I' });
      const as = lin(-10, 16, 60), CLs = as.map((d) => airfoil(state.thick, state.camber, d * R).CL);
      br.range([-10, 16], [-1.5, 3.2]); br.titles('α (°)', 'lift coefficient: this airfoil (blue), thin flat plate 2πα (dashed)');
      br.line('cl', as, CLs, { color: '--c-B' }); br.line('fp', as, as.map((d) => 2 * Math.PI * d * R), { color: '--ink-dim', dashed: true, width: 1.2 }); br.dots('q', [state.alpha], [A.CL], { color: '--accent', size: 12 });
      plots.aux.draw({ xlim: [0, 1], series: [{ x: up.map(xc), y: up.map((p) => Math.min(3, p.v)), color: '--c-B', label: 'speed at the surface ÷ freestream: upper (blue)' }, { x: lo.map(xc), y: lo.map((p) => Math.min(3, p.v)), color: '--c-I', label: 'lower (orange)' }] });
      hud.set('a', `C_L = ${fmt(A.CL)} (flat plate 2πα = ${fmt(2 * Math.PI * a)}); zero-lift angle ${fmt(A.alpha0 / R)}° from the camber`);
      hud.set('b', `lowest pressure Cp = ${fmt(Math.min(...A.surf.map((p) => p.cp)))}: lift comes mostly from suction on top, not from air hitting the bottom`);
      hud.set('c', 'potential flow: no friction, so no drag and no stall — a real wing stalls near 15°', state.alpha > 13 ? 'bad' : '');
    }

    function polarCase() {
      const P = { ...PLANE, AR: state.AR, CD0: state.CD0, m: state.m }, Vs = lin(20, 90, 141), D = Vs.map((v) => drag(P, v, state.h)), S = polarSpeeds(P, state.h), here = drag(P, state.V, state.h), top = Math.max(2500, here.D * 1.1);
      sq.range([20, 90], [0, top]); sq.titles('airspeed (m/s)', 'drag (N) in level flight: friction (blue), induced (green), total (orange)');
      sq.line('p', Vs, D.map((d) => d.Dp), { color: '--c-B' }); sq.line('i', Vs, D.map((d) => d.Di), { color: '--c-v' }); sq.line('t', Vs, D.map((d) => d.D), { color: '--c-I', width: 3 });
      sq.line('vmd', [S.Vmd, S.Vmd], [0, top], { color: '--ink-dim', dashed: true, width: 1.2 }); put('least drag', sq.mx(S.Vmd), sq.my(top * 0.93));
      sq.dots('q', [state.V], [here.D], { color: '--accent', size: 12 });
      const cls = lin(0, 1.6, 80), k = 1 / (Math.PI * P.e * P.AR);
      tr.range([0, 0.12], [0, 1.6]); tr.titles('C_D', 'C_L: the drag polar C_D = C_D0 + kC_L²; tangent from 0 = best L/D');
      tr.line('pol', cls.map((c) => P.CD0 + k * c * c), cls, { color: '--c-B' }); tr.line('tan', [0, 2 * P.CD0 * 1.6 / S.CLmd], [0, 1.6], { color: '--c-I', dashed: true, width: 1.4 });
      tr.dots('q', [P.CD0 + k * here.cl * here.cl], [here.cl], { color: '--accent', size: 11 });
      const Pw = D.map((d, i) => d.D * Vs[i] / 1000), Pav = 134 * 0.8 * Math.min(1, isa(state.h).rho / 1.225 * 1.1);
      br.range([20, 90], [0, 160]); br.titles('airspeed (m/s)', 'power (kW): needed D·V (orange), engine available (dashed)');
      br.line('pr', Vs, Pw, { color: '--c-I' }); br.line('pa', [20, 90], [Pav, Pav], { color: '--c-v', dashed: true, width: 1.4 });
      br.line('vmp', [S.Vmp, S.Vmp], [0, 160], { color: '--ink-dim', dashed: true, width: 1.2 }); br.dots('q', [state.V], [here.D * state.V / 1000], { color: '--accent', size: 11 });
      plots.aux.draw({ xlim: [20, 90], cursor: state.V, series: [{ x: Vs, y: D.map((d) => P.m * 9.80665 / d.D), color: '--c-B', label: 'lift / drag = weight / drag' }] });
      const Vmax = Vs.filter((v, i) => Pw[i] <= Pav).pop();
      hud.set('a', `${fmt(state.V)} m/s: C_L = ${fmt(here.cl)}, drag ${fmt(here.D)} N (friction ${fmt(here.Dp)}, induced ${fmt(here.Di)}), L/D ${fmt(P.m * 9.80665 / here.D)}`);
      hud.set('b', `least drag at ${fmt(S.Vmd)} m/s (L/D max ${fmt(S.LDmax)}, the two parts equal); least power at ${fmt(S.Vmp)} m/s = V_md / 3^¼`);
      hud.set('c', state.V < S.Vmd ? 'back side of the drag curve: slowing down needs MORE thrust' : `top speed about ${fmt(Vmax)} m/s, where power needed meets power available`, state.V < S.Vmd ? 'bad' : '');
    }

    function takeoffCase() {
      const o = { m: state.mt, h: state.ht, wind: state.wind, surf: state.surf }, key = JSON.stringify([state.kind, o]);
      if (key !== grKey) { grKey = key; GR = groundRoll(state.kind, o); GR.ms = lin(700, 1300, 25); GR.dist = GR.ms.map((m) => groundRoll(state.kind, { ...o, m }).x); ctx.setClock(Math.ceil(GR.t + 1.5)); }
      const O = GR.out, i = Math.min(O.length - 1, Math.round(Math.min(time.t, GR.t) / 0.02)), c = O[i], xmax = 450;
      sq.range([0, xmax], [0, 40]); sq.titles('distance along the runway (m)', 'airspeed (m/s) against distance; dashed: lift-off / stall speed');
      sq.line('v', O.slice(0, i + 1).map((p) => p.x), O.slice(0, i + 1).map((p) => p.V), { color: '--c-I', width: 2.6 });
      sq.line('vs', [0, xmax], [GR.Vs, GR.Vs], { color: '--c-north', dashed: true, width: 1.2 }); sq.line('vl', [0, xmax], [GR.Vend, GR.Vend], { color: '--ink-dim', dashed: true, width: 1 });
      sq.line('rw', [0, Math.min(xmax, 400)], [1.2, 1.2], { color: '--ink-dim', width: 6 }); sq.dots('plane', [c.x], [1.2], { color: '--accent', size: 14 }); put('stall', sq.mx(xmax * 0.93), sq.my(GR.Vs) + 0.14);
      const Vo = O.map((p) => p.V);
      tr.range([0, 40], [0, 5000]); tr.titles('airspeed (m/s)', 'forces (N) during the roll: thrust (orange), wheel friction (red), drag (blue)');
      tr.line('T', Vo, O.map((p) => p.T), { color: '--c-I' }); tr.line('F', Vo, O.map((p) => p.Fr), { color: '--c-north' }); tr.line('D', Vo, O.map((p) => p.D), { color: '--c-B' });
      tr.line('now', [c.V, c.V], [0, 5000], { color: '--accent', width: 1.4 });
      const ms = GR.ms, dist = GR.dist;
      br.range([700, 1300], [0, 500]); br.titles('mass (kg)', 'ground roll (m) against mass: about ∝ m²');
      br.line('d', ms, dist, { color: '--c-B' }); br.dots('q', [state.mt], [GR.x], { color: '--accent', size: 11 });
      plots.aux.draw({ xlim: [0, GR.t], cursor: Math.min(time.t, GR.t), series: [{ x: O.map((p) => p.t), y: O.map((p) => p.V - state.wind), color: '--c-I', label: 'ground speed (m/s) against time (s)' }] });
      hud.set('a', `${state.kind === 'takeoff' ? 'lift-off' : 'touchdown'} at ${fmt(state.kind === 'takeoff' ? GR.Vend : 1.15 * GR.Vs)} m/s airspeed (stall ${fmt(GR.Vs)} m/s, density ${fmt(isa(state.ht).rho)} kg/m³)`);
      hud.set('b', GR.fail ? 'thrust never beats drag + friction: no take-off' : `ground roll ${fmt(GR.x)} m in ${fmt(GR.t)} s; now ${fmt(c.x)} m, ${fmt(c.V)} m/s`, GR.fail ? 'bad' : GR.x > 300 ? 'bad' : 'good');
      hud.set('c', `net force now ${fmt(c.net)} N = thrust ${fmt(c.T)} − drag ${fmt(c.D)} − friction ${fmt(c.Fr)}; a headwind gives airspeed for free`);
    }

    function stabilityCase() {
      const L = longitudinal(state.cg, state.VH, state.de * R), Gt = gust(L.Cma), k = Math.min(Gt.length - 1, Math.round(time.t / 0.01)), da = Gt[k][1];
      // side view, metres: wing leading edge of MAC at x = 0 (c̄ = 1.5 m), tail 4.5 m behind the wing's aerodynamic centre
      const c = 1.5, xac = 0.25 * c, xcg = state.cg * c, xnp = L.hn * c, xt = xac + 4.5, pit = (L.aTrim > 0 ? L.aTrim : 0) + da, P = (x, y) => rot([x - xcg, y], -pit);
      sq.range([-2.4, 5.6], [-2.6, 2.6]); sq.titles('', `side view (pitch ${fmt((pit) / R, 2)}°): CG (orange), neutral point (green), lift on wing and tail, weight`);
      const fus = [[-1.6, 0.25], [-1.2, 0.35], [xt + 0.3, 0.3], [xt + 0.3, 0.05], [-1.2, -0.3], [-1.6, -0.2], [-1.6, 0.25]].map((p) => P(...p)); sq.line('fus', fus.map((p) => p[0]), fus.map((p) => p[1]), { color: '--ink', width: 2 });
      const wing = [[0, 0.02], [c, 0.02]].map((p) => P(...p)), tail = [[xt - 0.2, 0.28], [xt + 0.3, 0.28]].map((p) => P(...p)), fin = [[xt, 0.25], [xt + 0.3, 0.95], [xt + 0.35, 0.25]].map((p) => P(...p));
      sq.line('wing', wing.map((p) => p[0]), wing.map((p) => p[1]), { color: '--c-B', width: 6 }); sq.line('tail', tail.map((p) => p[0]), tail.map((p) => p[1]), { color: '--c-B', width: 5 }); sq.line('fin', fin.map((p) => p[0]), fin.map((p) => p[1]), { color: '--ink', width: 2 });
      const aT = Number.isFinite(L.aTrim) ? L.aTrim : 4 * R, CL = Math.max(0.05, WING.a * aT), CLt = WING.at * (aT * (1 - WING.deps) + WING.it + WING.tau * state.de * R), Lw = 1.6, Lt = Lw * CLt * (state.VH * c / 4.5) / CL;
      const arrow = (key, x, y, dy, color) => { const a = P(x, y), b = P(x, y + dy); sq.line(key, [a[0], b[0]], [a[1], b[1]], { color, width: 3 }); sq.dots(`${key}h`, [b[0]], [b[1]], { color, size: 9 }); };
      arrow('lw', xac, 0.05, Lw, '--c-v'); arrow('w', xcg, -0.05, -1.4, '--c-north'); arrow('lt', xt, 0.3, Math.max(-1.2, Math.min(1.2, Lt)), '--c-v');
      const cg = P(xcg, 0), np = P(xnp, 0); sq.dots('cg', [cg[0]], [cg[1]], { color: '--accent', size: 15 }); sq.dots('np', [np[0]], [np[1]], { color: '--c-v', size: 12 });
      put('CG', sq.mx(cg[0]), sq.my(cg[1]) - 0.22); put('NP', sq.mx(np[0]), sq.my(np[1]) + 0.22);
      const as = lin(-4, 14, 60);
      tr.range([-4, 14], [-0.25, 0.25]); tr.titles('α from zero lift (°)', 'pitching moment Cm about the CG: must fall as α rises');
      tr.line('cm', as, as.map((d) => L.Cm(d * R)), { color: L.Cma < 0 ? '--c-B' : '--c-north' }); if (Number.isFinite(L.aTrim)) tr.dots('trim', [L.aTrim / R], [0], { color: '--accent', size: 12 }); else tr.hide('trim');
      br.range([0, 6], [-8, 8]); br.titles('time after a gust (s)', 'change of α (°): settles back if stable');
      br.line('g', Gt.slice(0, k + 1).map((p) => p[0]), Gt.slice(0, k + 1).map((p) => p[1] / R), { color: L.Cma < 0 ? '--c-B' : '--c-north' });
      const hs = lin(0.05, 0.65, 61), trimDe = hs.map((h) => { const L0 = longitudinal(h, state.VH, 0), a = 0.4 / 4.96; return L0.Cma < 0 ? (-(L0.Cm0 + L0.Cma * a) / (state.VH * 3.5 * 0.45)) / R : NaN; });
      plots.aux.draw({ xlim: [0.05, 0.65], cursor: state.cg, series: [{ x: hs, y: trimDe, color: '--c-I', label: 'elevator (°, up +) to trim at C_L = 0.4 against CG position (fraction of MAC)' }] });
      hud.set('a', `neutral point ${fmt(100 * L.hn, 3)} % MAC, CG ${fmt(100 * state.cg, 3)} %: static margin ${fmt(100 * L.margin, 3)} %`, L.margin > 0.05 ? 'good' : 'bad');
      hud.set('b', L.Cma < 0 ? `Cmα = ${fmt(L.Cma)} /rad < 0: a nose-up gust makes a nose-down moment; trims at α = ${fmt(L.aTrim / R)}° (C_L ${fmt(L.CLtrim)})` : `Cmα = ${fmt(L.Cma)} /rad > 0: a nose-up gust pitches it further up — divergent`, L.Cma < 0 ? '' : 'bad');
      hud.set('c', L.Cma < 0 && L.CLtrim < 0.1 ? 'trims at almost no lift: needs up elevator (or a CG further aft) to fly slowly' : 'more margin = more stable but heavier on the controls and more trim drag');
    }

    return {
      changed(id) {
        charts.forEach((k) => k.show(true));
        const c = state.case; if (c === 'airfoil') ctx.setClock(0, { ambient: true }); else if (c === 'stability') ctx.setClock(7); else if (c !== 'takeoff') ctx.setClock(0); else { grKey = ''; }
      },
      update() {
        charts.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        ({ airfoil: airfoilCase, polar: polarCase, takeoff: takeoffCase, stability: stabilityCase })[state.case]();
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
