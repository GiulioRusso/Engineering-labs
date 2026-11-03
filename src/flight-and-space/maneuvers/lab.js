// Orbital manoeuvres: Hohmann against bi-elliptic, plane changes and where to do them, rendezvous in the
// target's frame (Clohessy–Wiltshire), and escape to the planets with patched conics.
import { createChart } from '../../lib/viz/chart.js';
import { solveKepler } from '../orbits/model.js';
import { hohmannN, biN, total, biLimit, crossover, planeDv, transferPlane, bestSplit, cw, rendezvousV, meanMotion, PLANETS, interplanetary, escapeDv, MU, RE, AU, SOI_EARTH } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], R = Math.PI / 180, D = 12;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const circle = (r, n = 120) => { const t = lin(0, 2 * Math.PI, n); return [t.map((a) => r * Math.cos(a)), t.map((a) => r * Math.sin(a))]; };
// ellipse with periapsis rp along +x (or apoapsis, if flip), half (from θ0 to θ0 + π) or whole
function conic(rp, ra, { half = false, flip = false, f = (r) => r } = {}) { const a = (rp + ra) / 2, e = (ra - rp) / (ra + rp), t = flip ? lin(Math.PI, 2 * Math.PI, 120) : lin(0, half ? Math.PI : 2 * Math.PI, 120); return [t.map((th) => { const r = a * (1 - e * e) / (1 + e * Math.cos(th)); return f(r) * Math.cos(th + (flip ? Math.PI : 0)); }), t.map((th) => { const r = a * (1 - e * e) / (1 + e * Math.cos(th)); return f(r) * Math.sin(th + (flip ? Math.PI : 0)); })]; }

export default {
  id: 'maneuvers', title: 'Orbital manoeuvres', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { Rr: 15, kb: 3, di: 28.5, split: 0, r2: 42164e3, mode: 'burn', x0: 0, y0: -10, dvx: 0, dvy: 1, T: 0.5, orbits: 2, planet: 'mars', alt: 200e3 },
  cases: [
    { id: 'bielliptic', label: 'Hohmann vs bi-elliptic', set: {}, examples: [
      { id: 'near', label: 'r₂/r₁ = 5: Hohmann wins', set: { Rr: 5, kb: 3 } },
      { id: 'far', label: 'r₂/r₁ = 40, r_b = 10 r₂', set: { Rr: 40, kb: 10 } },
      { id: 'cross', label: 'r₂/r₁ = 11.94: the crossover', set: { Rr: 11.94, kb: 100 } },
    ] },
    { id: 'plane', label: 'Plane change', set: {}, examples: [
      { id: 'leo', label: 'All 28.5° at the start: costly', set: { split: 1 } },
      { id: 'best', label: 'The best split', set: { split: 0.08 } },
      { id: 'kourou', label: 'From Kourou: 5°', set: { di: 5, split: 0 } },
      { id: 'baikonur', label: 'From Baikonur: 51.6°', set: { di: 51.6, split: 0.1 } },
    ] },
    { id: 'rendezvous', label: 'Rendezvous', set: {}, examples: [
      { id: 'retro', label: 'Brake 1 m/s: drop and pull ahead', set: { mode: 'burn', dvy: -1 } },
      { id: 'radial', label: 'A radial burn: a loop that comes back', set: { mode: 'burn', dvx: 1, dvy: 0, orbits: 2 } },
      { id: 'lower', label: '5 km lower: catching up', set: { mode: 'burn', x0: -5, y0: -40, dvy: 0, orbits: 1 } },
      { id: 'transfer', label: 'Two-burn rendezvous in half an orbit', set: { mode: 'transfer', y0: -10, x0: 0, T: 0.5 } },
      { id: 'fast', label: 'A quick one: 0.2 orbit', set: { mode: 'transfer', y0: -10, x0: 0, T: 0.2 } },
    ] },
    { id: 'escape', label: 'Escape to the planets', set: {}, examples: [
      { id: 'venus', label: 'Venus: going inwards', set: { planet: 'venus' } },
      { id: 'jupiter', label: 'Jupiter', set: { planet: 'jupiter' } },
      { id: 'geo', label: 'From a high orbit: the Oberth effect lost', set: { planet: 'mars', alt: 35786e3 } },
    ] },
  ],
  controls: [
    { title: 'Transfer', show: (s) => s.case === 'bielliptic', items: [
      { id: 'Rr', label: 'Radius ratio r₂/r₁', unit: '', min: 2, max: 100, log: true },
      { id: 'kb', label: 'Bi-elliptic apoapsis r_b / r₂', unit: '', min: 1, max: 100, log: true },
    ] },
    { title: 'LEO (300 km) to a circular orbit', show: (s) => s.case === 'plane', items: [
      { id: 'di', label: 'Inclination change', unit: '°', min: 0, max: 60, step: 0.1 },
      { id: 'split', label: 'Share done at the first burn', unit: '%', k: 100, min: 0, max: 1, step: 0.005 },
      { id: 'r2', label: 'Target radius', unit: 'km', k: 1e-3, min: 10000e3, max: 60000e3, step: 100e3, hint: 'GEO 42 164 km' },
    ] },
    { title: 'Chaser near the ISS (420 km)', show: (s) => s.case === 'rendezvous', items: [
      { id: 'mode', label: 'Manoeuvre', type: 'segmented', options: [['burn', 'One burn'], ['transfer', 'Rendezvous']] },
      { id: 'x0', label: 'Start: height above the target', unit: 'km', min: -10, max: 10, step: 0.1 },
      { id: 'y0', label: 'Start: distance ahead', unit: 'km', min: -50, max: 50, step: 0.5 },
      { id: 'dvx', label: 'Burn: radial (up)', unit: 'm/s', min: -5, max: 5, step: 0.05, show: (s) => s.mode === 'burn' },
      { id: 'dvy', label: 'Burn: along the orbit', unit: 'm/s', min: -5, max: 5, step: 0.05, show: (s) => s.mode === 'burn' },
      { id: 'orbits', label: 'Orbits to show', unit: '', min: 0.5, max: 5, step: 0.5, show: (s) => s.mode === 'burn' },
      { id: 'T', label: 'Transfer time', unit: 'orbits', min: 0.1, max: 1.5, step: 0.01, show: (s) => s.mode === 'transfer' },
    ] },
    { title: 'Departure', show: (s) => s.case === 'escape', items: [
      { id: 'planet', label: 'Target', type: 'select', options: Object.entries(PLANETS).map(([k, v]) => [k, v.label]) },
      { id: 'alt', label: 'Parking orbit altitude', unit: 'km', k: 1e-3, min: 150e3, max: 40000e3, log: true },
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
    const bar = (ch, key, x0, x1, y1, color) => { const xs = [], ys = []; for (let k = 0; k <= 30; k++) { const x = x0 + (x1 - x0) * k / 30; xs.push(x, x); ys.push(k % 2 ? y1 : 0, k % 2 ? 0 : y1); } ch.line(key, xs, ys, { color, width: 2.4 }); };

    function biCase() {
      const Rr = state.Rr, kb = state.kb, H = hohmannN(Rr), B = biN(Rr, kb * Rr), ls = lin(Math.log10(2), 2, 120), Rs = ls.map((l) => 10 ** l);
      sq.range([Math.log10(2), 2], [0.38, 0.56]); sq.titles('log₁₀ r₂/r₁', 'total Δv ÷ starting circular speed: Hohmann (blue), bi-elliptic (orange), r_b → ∞ (green)');
      sq.line('h', ls, Rs.map((r) => total(hohmannN(r))), { color: '--c-B' }); sq.line('b', ls, Rs.map((r) => total(biN(r, kb * r))), { color: '--c-I' }); sq.line('l', ls, Rs.map(biLimit), { color: '--c-v', dashed: true, width: 1.6 });
      const xc = crossover((r) => total(hohmannN(r)) - total(biN(r, kb * r)), 2, 100);
      if (xc < 99.9) { sq.line('x', [Math.log10(xc), Math.log10(xc)], [0.38, 0.56], { color: '--ink-dim', dashed: true, width: 1.2 }); put(`crossover ${fmt(xc)}`, sq.mx(Math.log10(xc)), sq.my(0.39) + 0.12); } else sq.hide('x');
      sq.dots('q', [Math.log10(Rr), Math.log10(Rr)], [total(H), total(B)], { color: '--accent', size: 12 });
      const f = Math.sqrt, M = f(kb * Rr) * 1.08;
      tr.range([-M * 1.6, M * 1.6], [-M, M]); tr.titles('', 'the orbits, radius on a √ scale: Hohmann (blue), bi-elliptic (orange)');
      const c1 = circle(1), c2 = circle(f(Rr)); tr.line('c1', ...c1, { color: '--ink-dim', width: 1.2 }); tr.line('c2', ...c2, { color: '--ink-dim', width: 1.2 });
      tr.line('h', ...conic(1, Rr, { half: true, f }), { color: '--c-B', width: 2 }); tr.line('b1', ...conic(1, kb * Rr, { half: true, f }), { color: '--c-I', width: 2 });
      const [bx, by] = conic(Rr, kb * Rr, { half: true, f }); tr.line('b2', bx.map((x) => -x), by.map((y) => -y), { color: '--c-I', width: 2 });
      br.range([0, 6], [0, 0.45]); br.titles('', 'Δv of each burn: Hohmann (blue, 2), bi-elliptic (orange, 3)');
      H.dv.forEach((d, i) => bar(br, `h${i}`, 0.3 + i, 0.9 + i, Math.abs(d), '--c-B')); B.dv.forEach((d, i) => bar(br, `b${i}`, 2.6 + i, 3.2 + i, Math.abs(d), '--c-I'));
      plots.aux.draw({ xlim: [Math.log10(2), 2], cursor: Math.log10(Rr), series: [{ x: ls, y: Rs.map((r) => hohmannN(r).tof / (2 * Math.PI)), color: '--c-B', label: 'transfer time in starting-orbit periods: Hohmann' }, { x: ls, y: Rs.map((r) => biN(r, kb * r).tof / (2 * Math.PI)), color: '--c-I', label: 'bi-elliptic' }] });
      const win = total(B) < total(H);
      hud.set('a', `Hohmann: ${H.dv.map((d) => fmt(Math.abs(d))).join(' + ')} = ${fmt(total(H))} v₁; bi-elliptic: ${B.dv.map((d) => fmt(Math.abs(d))).join(' + ')} = ${fmt(total(B))} v₁`);
      hud.set('b', `${win ? 'bi-elliptic' : 'Hohmann'} saves ${fmt(100 * Math.abs(total(B) - total(H)) / Math.max(total(B), total(H)), 2)} % of Δv; from LEO (v₁ = 7.7 km/s) that is ${fmt(7.73 * Math.abs(total(B) - total(H)) * 1000)} m/s`, win ? 'good' : '');
      hud.set('c', `but the bi-elliptic takes ${fmt(B.tof / H.tof, 3)} × as long; above r₂/r₁ = 15.58 it wins for any r_b > r₂, below 11.94 never`);
    }

    function planeCase() {
      const r1 = RE + 300e3, r2 = state.r2, di = state.di * R, T = transferPlane(r1, r2, di, state.split), B = bestSplit(r1, r2, di), ss = lin(0, 1, 101);
      sq.range([0, 100], [3.5, 7.5]); sq.titles('share of the inclination change done at the first burn (%)', 'total Δv (km/s): first burn + second burn');
      sq.line('t', ss.map((s) => 100 * s), ss.map((s) => transferPlane(r1, r2, di, s).total / 1000), { color: '--c-B' });
      sq.line('d1', ss.map((s) => 100 * s), ss.map((s) => transferPlane(r1, r2, di, s).d1 / 1000), { color: '--c-v', width: 1.4, dashed: true });
      sq.line('d2', ss.map((s) => 100 * s), ss.map((s) => transferPlane(r1, r2, di, s).d2 / 1000), { color: '--c-I', width: 1.4, dashed: true });
      sq.dots('best', [100 * B.s], [B.total / 1000], { color: '--c-v', size: 11 }); sq.dots('q', [100 * state.split], [T.total / 1000], { color: '--accent', size: 13 });
      put('first burn', sq.mx(80), sq.my(transferPlane(r1, r2, di, 0.8).d1 / 1000) + 0.15); put('second burn', sq.mx(80), sq.my(transferPlane(r1, r2, di, 0.8).d2 / 1000) + 0.15);
      const a2 = (1 - state.split) * di, va = T.va / 1000, vc = T.vc2 / 1000, M = Math.max(va, vc) * 1.15;
      tr.range([-0.2 * M, M * 1.3], [-0.15 * M, M * 0.75]); tr.titles('km/s', 'second burn: arrival speed v_a → circular v_c turned by the rest of Δi; Δv (red)');
      tr.line('va', [0, va], [0, 0], { color: '--c-B', width: 2.6 }); tr.line('vc', [0, vc * Math.cos(a2)], [0, vc * Math.sin(a2)], { color: '--c-v', width: 2.6 }); tr.line('dv', [va, vc * Math.cos(a2)], [0, vc * Math.sin(a2)], { color: '--c-north', width: 2.6 });
      tr.dots('tips', [va, vc * Math.cos(a2)], [0, vc * Math.sin(a2)], { color: '--accent', size: 8 });
      const ds = lin(0, 60, 61);
      br.range([0, 60], [0, 8]); br.titles('inclination change (°)', 'Δv (km/s) to turn the orbit alone: at LEO speed (blue), at GEO apogee (orange)');
      br.line('l', ds, ds.map((d) => planeDv(T.vc1, d * R) / 1000), { color: '--c-B' }); br.line('g', ds, ds.map((d) => planeDv(T.va, d * R) / 1000), { color: '--c-I' }); br.dots('q', [state.di, state.di], [planeDv(T.vc1, di) / 1000, planeDv(T.va, di) / 1000], { color: '--accent', size: 10 });
      plots.aux.draw({ xlim: [0, 60], cursor: state.di, series: [{ x: ds, y: ds.map((d) => bestSplit(r1, r2, d * R).total / 1000), color: '--c-B', label: 'best total Δv (km/s) against inclination change' }, { x: ds, y: ds.map((d) => transferPlane(r1, r2, d * R, 1).total / 1000), color: '--c-north', label: 'all of it at the first burn' }] });
      hud.set('a', `first burn ${fmt(T.d1)} m/s + second ${fmt(T.d2)} m/s = ${fmt(T.total)} m/s (no plane change: ${fmt(transferPlane(r1, r2, 0, 0).total)} m/s)`);
      hud.set('b', `best: ${fmt(100 * B.s, 2)} % at the first burn, ${fmt(B.total)} m/s; you are ${fmt(T.total - B.total)} m/s above it`, T.total - B.total < 20 ? 'good' : 'bad');
      hud.set('c', `turning costs 2v sin(Δi/2): ${fmt(T.vc1)} m/s at LEO but only ${fmt(T.va)} m/s at apogee, and combining it with a burn saves more`);
    }

    function rdvCase() {
      const n = meanMotion(420e3), P = 2 * Math.PI / n, x0 = state.x0 * 1e3, y0 = state.y0 * 1e3, vy0 = -1.5 * n * x0;   // chaser on its own circular orbit
      let v0, Tend, dv1, dv2 = 0;
      if (state.mode === 'burn') { v0 = [state.dvx, vy0 + state.dvy]; Tend = state.orbits * P; dv1 = Math.hypot(state.dvx, state.dvy); }
      else { Tend = state.T * P; v0 = rendezvousV(x0, y0, n, Tend); dv1 = Math.hypot(v0[0], v0[1] - vy0); const e = cw([x0, y0, ...v0], n, Tend); dv2 = Math.hypot(e[2], e[3]); }
      const ts = lin(0, Tend, 400), S = ts.map((t) => cw([x0, y0, ...v0], n, t)), u = Math.min(1, time.t / (D - 1)), k = Math.round(u * 399), cur = S[k];
      const ys = S.map((s) => s[1] / 1e3), xs = S.map((s) => s[0] / 1e3), Y = Math.max(5, ...ys.map(Math.abs)) * 1.1, X = Math.max(1, ...xs.map(Math.abs)) * 1.2;
      sq.range([-Y, Y], [-X, X]); sq.titles('distance ahead of the target (km)', 'height above the target (km), not to scale; the target (green) at 0');
      sq.line('path', ys, xs, { color: '--c-B', width: 1.6 }); sq.line('done', ys.slice(0, k + 1), xs.slice(0, k + 1), { color: '--c-I', width: 2.6 });
      sq.dots('tgt', [0], [0], { color: '--c-v', size: 14 }); sq.dots('ch', [cur[1] / 1e3], [cur[0] / 1e3], { color: '--accent', size: 13 });
      put('target', sq.mx(0), sq.my(0) + 0.2); put('chaser', sq.mx(cur[1] / 1e3), sq.my(cur[0] / 1e3) - 0.22);
      const to = ts.map((t) => t / P);
      tr.range([0, Tend / P], [-X, X]); tr.titles('time (orbits)', 'height above the target (km)'); tr.line('x', to, xs, { color: '--c-I' }); tr.line('now', [u * Tend / P, u * Tend / P], [-X, X], { color: '--accent', width: 1.2 });
      br.range([0, Tend / P], [-Y, Y]); br.titles('time (orbits)', 'distance ahead (km)'); br.line('y', to, ys, { color: '--c-B' }); br.line('now', [u * Tend / P, u * Tend / P], [-Y, Y], { color: '--accent', width: 1.2 });
      plots.aux.draw({ xlim: [0, Tend / P], cursor: u * Tend / P, series: [{ x: to, y: S.map((s) => Math.hypot(s[0], s[1]) / 1e3), color: '--c-v', label: 'distance to the target (km)' }] });
      hud.set('a', `ISS orbit: ${fmt(P / 60)} min; after ${fmt(u * Tend / P, 2)} orbits the chaser is ${fmt(cur[1] / 1e3)} km ahead, ${fmt(cur[0] / 1e3)} km above`);
      hud.set('b', state.mode === 'burn' ? `burn ${fmt(dv1)} m/s; drift per orbit ${fmt((cw([x0, y0, ...v0], n, P)[1] - y0) / 1e3)} km along the track` : `first burn ${fmt(dv1)} m/s, braking at arrival ${fmt(dv2)} m/s: total ${fmt(dv1 + dv2)} m/s`, state.mode === 'transfer' ? 'good' : '');
      hud.set('c', state.mode === 'burn' && state.dvy > 0 ? 'speeding up raises the orbit; higher orbits are slower, so you fall behind' : state.mode === 'burn' && state.dvy < 0 ? 'braking lowers the orbit: a lower orbit is faster, so you pull ahead' : 'the faster the rendezvous, the more Δv it costs');
    }

    function escCase() {
      const P = PLANETS[state.planet], I = interplanetary(P.a, state.alt), Rm = Math.max(1, P.a) * 1.18, u = Math.min(1, time.t / (D - 1)), t = u * I.tof;
      sq.range([-Rm, Rm], [-Rm, Rm]); sq.titles('AU', `the Sun (centre), the Earth's orbit, ${P.label}'s, and the Hohmann transfer (orange)`);
      sq.line('e', ...circle(1), { color: '--c-B', width: 1.2 }); sq.line('p', ...circle(P.a), { color: '--ink-dim', width: 1.2 }); sq.line('tr', ...conic(Math.min(1, P.a), Math.max(1, P.a), { half: true, flip: !I.outward }), { color: '--c-I', width: 2 });
      const yr = 365.25 * 86400, nE = 2 * Math.PI / yr, nP = Math.sqrt(1.32712440018e20 / (P.a * AU) ** 3), a = (1 + P.a) / 2, e = Math.abs(P.a - 1) / (1 + P.a), Mt = (I.outward ? 0 : Math.PI) + Math.PI * t / I.tof, E = solveKepler(Mt, e), nu = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2)), r = a * (1 - e * Math.cos(E)), th = I.outward ? nu : nu + Math.PI;
      const ph = I.phase;
      sq.dots('sun', [0], [0], { color: '--c-I', size: 16 }); sq.dots('earth', [Math.cos(nE * t)], [Math.sin(nE * t)], { color: '--c-B', size: 11 }); sq.dots('pl', [P.a * Math.cos(ph + nP * t)], [P.a * Math.sin(ph + nP * t)], { color: '--c-north', size: 11 }); sq.dots('sc', [r * Math.cos(th)], [r * Math.sin(th)], { color: '--accent', size: 9 });
      put('Earth', sq.mx(Math.cos(nE * t)), sq.my(Math.sin(nE * t)) + 0.2); put(P.label, sq.mx(P.a * Math.cos(ph + nP * t)), sq.my(P.a * Math.sin(ph + nP * t)) + 0.2);
      const ls = lin(Math.log10(RE + 150e3), Math.log10(SOI_EARTH), 100);
      const lk = ls.map((l) => l - 3);
      tr.range([lk[0], lk[lk.length - 1]], [0, 13]); tr.titles('log₁₀ parking orbit radius (km)', `Δv to leave with v∞ = ${fmt(I.vinf / 1e3)} km/s (blue) against v∞ itself (dashed)`);
      tr.line('d', lk, ls.map((l) => escapeDv(I.vinf, 10 ** l) / 1e3), { color: '--c-B' }); tr.line('vi', [lk[0], lk[lk.length - 1]], [I.vinf / 1e3, I.vinf / 1e3], { color: '--ink-dim', dashed: true, width: 1.2 });
      tr.dots('q', [Math.log10(RE + state.alt) - 3], [I.dv / 1e3], { color: '--accent', size: 12 });
      br.range([0, 4], [0, 16]); br.titles('', 'km/s at the parking orbit: circular, escape, needed, Δv');
      [[I.vc, '--c-B'], [I.vesc, '--c-v'], [I.vhyp, '--c-I'], [I.dv, '--c-north']].forEach(([v, c], i) => { bar(br, `b${i}`, i + 0.2, i + 0.8, v / 1e3, c); put(fmt(v / 1e3), br.mx(i + 0.5), br.my(v / 1e3) + 0.14); });
      const as = lin(0.3, 10, 100);
      plots.aux.draw({ xlim: [0.3, 10], cursor: P.a, series: [{ x: as, y: as.map((x) => interplanetary(x, state.alt).tof / 86400), color: '--c-I', label: 'Hohmann transfer time (days) against the target orbit (AU)' }] });
      hud.set('a', `${P.label}: v∞ = ${fmt(I.vinf / 1e3)} km/s (C3 = ${fmt(I.C3 / 1e6)} km²/s²), ${I.outward ? 'added to' : 'taken from'} the Earth's 29.8 km/s round the Sun`);
      hud.set('b', `from ${fmt(state.alt / 1e3)} km: Δv = √(v∞² + v_esc²) − v_c = ${fmt(I.dv / 1e3)} km/s; arrival v∞ ${fmt(I.vinfArr / 1e3)} km/s; ${fmt(I.tof / 86400)} days`);
      hud.set('c', `launch when ${P.label} is ${fmt(Math.abs(I.phase) / R)}° ${I.phase > 0 ? 'ahead of' : 'behind'} the Earth; burning deep in the well (low orbit) gives more v∞ per Δv: the Oberth effect`);
    }

    return {
      changed() { charts.forEach((k) => k.show(true)); ctx.setClock(state.case === 'rendezvous' || state.case === 'escape' ? D : 0); },
      update() {
        charts.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        ({ bielliptic: biCase, plane: planeCase, rendezvous: rdvCase, escape: escCase })[state.case]();
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
