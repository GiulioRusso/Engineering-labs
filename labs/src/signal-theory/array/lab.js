// Phased arrays: wavefronts from delayed elements, how spacing shapes the beam, phase-shift vs
// true-time-delay steering (beam squint), the near-field beam forming, grating lobes over the (d, θ0)
// plane, scanning and its cost, the planar array in direction cosines, amplitude tapers, null steering.
import { createChart } from '../../lib/viz/chart.js';
import { createPolar, dbToR } from '../../lib/viz/polar.js';
import { nearField } from '../../electronic-warfare/beams/model.js';
import { elements, TAPER, steerWeights, af, squint, gratingAngles, nullWeights, planarAF, cx } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const deg = Math.PI / 180, K = 2 * Math.PI;
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const SQL = [-4.3, -2.35, 4.2, 4.9], SQR = [0.35, -2.35, 4.2, 4.9], TOP = [-4.3, 0.55, 8.85, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0];
const ths = Array.from({ length: 721 }, (_, i) => -90 + i * 0.25), dB = (v) => 20 * Math.log10(v + 1e-9);
const TAPERS = [['uniform', 'Uniform'], ['hamming', 'Hamming'], ['taylor', 'Taylor-like'], ['cheb', 'Chebyshev −40 dB']];
const pat = (N, d, w, fr = 1) => ths.map((t) => af(t * deg, N, d, w, fr));
const metrics = (p) => { const D = p.map(dB); let k = 0; D.forEach((v, i) => { if (v > D[k]) k = i; }); let a = k, b = k; while (a > 0 && D[a] > -3) a--; while (b < D.length - 1 && D[b] > -3) b++; let l = k, r = k; while (l > 0 && D[l - 1] < D[l]) l--; while (r < D.length - 1 && D[r + 1] < D[r]) r++; let sl = -99; D.forEach((v, i) => { if (i < l || i > r) sl = Math.max(sl, v); }); return { pk: ths[k], bw: ths[b] - ths[a], sl }; };

export default {
  id: 'array', title: 'Phased array', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  defaults: { N: 8, d: 0.5, steer: 20, taper: 'uniform', fr: 1.2, Nx: 8, Ny: 8, u0: 0.3, v0: 0.2, n1: 40, n2: -25, nn: 1, floor: -40 },
  cases: [
    { id: 'wavefronts', label: 'Wavefronts', set: {}, examples: [
      { id: 'broad', label: 'No delay: broadside', controls: ['steer'], set: { steer: 0 } },
      { id: 'steep', label: 'Steer to 50°', controls: ['steer'], set: { steer: 50 } },
    ] },
    { id: 'spacing', label: 'Spacing', set: { steer: 0 }, examples: [
      { id: 'tight', label: 'd = 0.25 λ: wide beam', controls: ['d'], set: { d: 0.25 } },
      { id: 'wide', label: 'd = 1.2 λ: grating lobes', controls: ['d'], set: { d: 1.2 } },
    ] },
    { id: 'squint', label: 'Phase vs time delay', set: { steer: 40, N: 16 }, examples: [
      { id: 'wideband', label: '±30 % bandwidth', controls: ['fr'], set: { fr: 1.3 } },
    ] },
    { id: 'nearfield', label: 'Near-field beam', set: { N: 16, steer: 0 }, examples: [
      { id: 'big', label: '32 elements: far field at 512 λ', controls: ['N'], set: { N: 32 } },
    ] },
    { id: 'grating', label: 'Grating lobes', set: { d: 0.6, steer: 50 }, examples: [
      { id: 'safe', label: 'd = 0.5 λ: safe to ±90°', controls: ['d', 'steer'], set: { d: 0.5, steer: 60 } },
      { id: 'enter', label: 'd = 0.7 λ at 40°: a lobe enters', controls: ['d', 'steer'], set: { d: 0.7, steer: 40 } },
    ] },
    { id: 'scan', label: 'Scanning', set: { N: 16 }, examples: [
      { id: 'far', label: 'Steer to 60°: twice as wide', controls: ['steer'], set: { steer: 60 } },
    ] },
    { id: 'planar', label: 'Planar array', set: {}, examples: [
      { id: 'grating', label: 'd = 0.8 λ steered: lobe through the rim', controls: ['d', 'u0'], set: { d: 0.8, u0: 0.6, v0: 0 } },
    ] },
    { id: 'taper', label: 'Tapering', set: { N: 16, steer: 0 }, examples: [
      { id: 'cheb', label: 'Chebyshev: equal sidelobes', controls: ['taper'], set: { taper: 'cheb' } },
      { id: 'hamming', label: 'Hamming: −42 dB', controls: ['taper'], set: { taper: 'hamming' } },
    ] },
    { id: 'nulls', label: 'Null steering', set: { N: 12, steer: 0 }, examples: [
      { id: 'two', label: 'Two interferers nulled', controls: ['nn', 'n1', 'n2'], set: { nn: 2 } },
      { id: 'close', label: 'Null close to the beam: costs gain', controls: ['n1'], set: { nn: 1, n1: 12 } },
    ] },
  ],
  controls: [
    { title: 'Array', show: (s) => s.case !== 'planar', items: [
      { id: 'N', label: 'Elements N', unit: '', min: 2, max: 32, step: 1 },
      { id: 'd', label: 'Spacing d', unit: 'λ', min: 0.1, max: 1.5, step: 0.01 },
      { id: 'steer', label: 'Steer θ₀', unit: '°', min: -80, max: 80, step: 1 },
      { id: 'taper', label: 'Taper', type: 'select', options: TAPERS, show: (s) => s.case === 'taper' || s.case === 'scan' },
      { id: 'fr', label: 'Frequency f/f₀', unit: '', min: 0.6, max: 1.5, step: 0.01, show: (s) => s.case === 'squint' },
      { id: 'floor', label: 'Pattern floor', unit: 'dB', min: -60, max: -20, step: 5 },
    ] },
    { title: 'Planar', show: (s) => s.case === 'planar', items: [
      { id: 'Nx', label: 'Elements in x', unit: '', min: 2, max: 16, step: 1 }, { id: 'Ny', label: 'Elements in y', unit: '', min: 2, max: 16, step: 1 },
      { id: 'd', label: 'Spacing d', unit: 'λ', min: 0.2, max: 1.2, step: 0.01 },
      { id: 'u0', label: 'Steer u₀ = sin θ cos φ', unit: '', min: -0.9, max: 0.9, step: 0.01 }, { id: 'v0', label: 'Steer v₀ = sin θ sin φ', unit: '', min: -0.9, max: 0.9, step: 0.01 },
    ] },
    { title: 'Nulls', show: (s) => s.case === 'nulls', items: [
      { id: 'nn', label: 'Nulls', type: 'segmented', options: [[0, 'None'], [1, 'One'], [2, 'Two']] },
      { id: 'n1', label: 'Interferer 1', unit: '°', min: -85, max: 85, step: 1, show: (s) => s.nn >= 1 }, { id: 'n2', label: 'Interferer 2', unit: '°', min: -85, max: 85, step: 1, show: (s) => s.nn >= 2 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR });
    const sql = createChart(ctx, { box: SQL, grid: false }), sqr = createChart(ctx, { box: SQR, grid: false }), top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT });
    const pol = createPolar(ctx, { c: [2.45, -1.3], R: 2.1, from: -90, to: 90 }), all = [tl, tr, bl, br, sql, sqr, top, bot];
    const fieldMap = (ch, box, wt, opts, W, H0, n = 120) => { const ar = box[3] / box[2], img = new Float64Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -W + 2 * W * i / (n - 1), y = H0 + 2 * W * ar * j / (n - 1); img[j * n + i] = nearField(x, y, wt, opts); } ch.range([-W, W], [H0, H0 + 2 * W * ar]); let m = 0; for (const v of img) m = Math.max(m, Math.abs(v)); ch.image('f', img, n, n, { map: 'field', norm: (v) => 0.5 + 0.5 * v / (0.6 * m) }); ch.dots('el', elements(opts.N, opts.d), elements(opts.N, opts.d).map(() => H0 + 0.05), { color: '--c-I', size: 7 }); };
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); pol.show(false); ({ wavefronts: [sql, sqr], spacing: [sql], squint: [tl, tr, bot], nearfield: [sql, sqr], grating: [sql, sqr], scan: [sql, tr, br], planar: [sql, sqr], taper: [tl, bot], nulls: [tl, bot] })[c].forEach((k) => k.show(true)); if (c === 'spacing') pol.show(true); ctx.setClock(c === 'wavefronts' || c === 'spacing' ? 4 : 0); },
      update() {
        const c = state.case, N = state.N, d = state.d, t0 = state.steer * deg, wt = 2 * Math.PI * (time.t % 4) / 4, fl = state.floor, opts = { N, d, steer: t0, taper: 'uniform' };
        if (c === 'wavefronts') {
          const W = Math.max(3, N * d * 0.8); fieldMap(sql, SQL, wt, opts, W, 0); sql.titles('x (λ)', `y (λ): field E_z, ${N} elements, each delayed to steer to ${state.steer}°`);
          const xs = elements(N, d), delay = xs.map((x) => -x * Math.sin(t0)), mn = Math.min(...delay);
          sqr.range([-0.5, N - 0.5], [-0.05, Math.max(0.5, N * d * Math.abs(Math.sin(t0))) * 1.2]); sqr.titles('element n', 'delay per element (periods)'); sqr.stems('dl', xs.map((_, n) => n), delay.map((v) => v - mn), { color: '--c-I', width: 6 });
          hud.set('a', `Δτ = d sin θ₀ / c = ${fmt(d * Math.sin(t0))} periods between neighbours`); hud.set('b', 'each element’s ripples start a little later: they line up into a tilted front');
          hud.set('c', `front tilted by ${state.steer}°: the beam goes where the delays line up`);
          plots.aux.draw({ xlim: [-90, 90], cursor: state.steer, series: [{ x: ths, y: pat(N, d, steerWeights(N, d, t0)).map((v) => Math.max(fl, dB(v))), color: '--c-B', label: 'pattern (dB) vs θ (°)' }] });
        } else if (c === 'spacing') {
          const W = Math.max(2.5, N * d * 0.7); fieldMap(sql, SQL, wt, opts, W, 0); sql.titles('x (λ)', `y (λ): field E_z, ${N} elements spaced ${d} λ`);
          const p = pat(N, d, steerWeights(N, d, t0)), m = metrics(p), g = gratingAngles(d, t0);
          pol.line('p', ths, p.map((v) => dbToR(dB(v), -fl)), { color: '--c-B' }); pol.ray('s', state.steer, { color: '--c-v' });
          hud.set('a', `aperture N·d = ${fmt(N * d)} λ → beamwidth ≈ 0.886/(N d) = ${fmt(0.886 / (N * d) / deg)}° (measured ${fmt(m.bw)}°)`); hud.set('b', g.length ? `grating lobe${g.length > 1 ? 's' : ''} at ${g.map((a) => fmt(a / deg)).join(', ')}° ✗` : 'no grating lobes ✓', g.length ? 'bad' : 'good');
          hud.set('c', 'wider spacing = bigger aperture = narrower beam… until copies of the beam appear');
          const ds = Array.from({ length: 141 }, (_, i) => 0.1 + i * 0.01); plots.aux.draw({ xlim: [0.1, 1.5], cursor: d, series: [{ x: ds, y: ds.map((q) => 0.886 / (N * q) / deg), color: '--c-B', label: 'beamwidth (°) vs spacing (λ)' }] });
        } else if (c === 'squint') {
          const fr = state.fr, fs = [1 / fr, 1, fr], cols = ['--c-north', '--c-v', '--c-B'];
          tl.range([-90, 90], [fl, 2]); tl.titles('θ (°)', 'pattern (dB): phase shifters, the beam squints with frequency'); tr.range([-90, 90], [fl, 2]); tr.titles('θ (°)', 'pattern (dB): true time delay, the beam stays put');
          fs.forEach((f, j) => { tl.line(`p${j}`, ths, pat(N, d, steerWeights(N, d, t0, { mode: 'phase', fr: f }), f).map((v) => Math.max(fl, dB(v))), { color: cols[j], width: 1.6 }); tr.line(`p${j}`, ths, pat(N, d, steerWeights(N, d, t0, { mode: 'ttd', fr: f }), f).map((v) => Math.max(fl, dB(v))), { color: cols[j], width: 1.6 }); });
          const frs = Array.from({ length: 91 }, (_, i) => 0.6 + i * 0.01); bot.range([0.6, 1.5], [0, 90]); bot.titles('f / f₀', 'beam direction (°): phase shifters (orange) vs time delay (blue)');
          bot.line('ph', frs, frs.map((f) => squint(t0, f) / deg), { color: '--c-I' }); bot.line('td', [0.6, 1.5], [state.steer, state.steer], { color: '--c-B' }); bot.dots('now', [fr, 1 / fr], [squint(t0, fr) / deg, squint(t0, 1 / fr) / deg], { color: '--accent', size: 10 });
          const bw = 0.886 / (N * d * Math.cos(t0)) / deg;
          hud.set('a', `phase shift φ = −k₀ x sin θ₀ is right only at f₀; at ${fr} f₀ the beam points to ${fmt(squint(t0, fr) / deg)}° (blue), at f₀/${fr} to ${fmt(squint(t0, 1 / fr) / deg)}° (red)`);
          hud.set('b', `squint ${fmt(Math.abs(squint(t0, fr) / deg - state.steer))}° vs beamwidth ${fmt(bw)}°`, Math.abs(squint(t0, fr) / deg - state.steer) > bw / 2 ? 'bad' : ''); hud.set('c', 'a true delay τ = x sin θ₀ / c is right at every frequency');
          plots.aux.draw({ xlim: [0.6, 1.5], cursor: fr, series: [{ x: frs, y: frs.map((f) => squint(t0, f) / deg - state.steer), color: '--c-I', label: 'squint (°) vs f/f₀' }] });
        } else if (c === 'nearfield') {
          // time-averaged intensity Σ e^{−jkR}/√R, out to beyond the Fraunhofer distance
          const D = N * d, Rff = 2 * D * D, W = D * 0.9, Ymax = Math.max(3 * D, Math.min(Rff * 1.3, 40)), n = 120, img = new Float64Array(n * n), xs = elements(N, d);
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -W + 2 * W * i / (n - 1), y = 0.1 + Ymax * j / (n - 1); let re = 0, im = 0; for (const e of xs) { const R = Math.hypot(x - e, y), p = -K * R - K * e * Math.sin(t0); re += Math.cos(p) / Math.sqrt(R); im += Math.sin(p) / Math.sqrt(R); } img[j * n + i] = 10 * Math.log10((re * re + im * im) * y / N + 1e-9); }
          let mx = -Infinity; for (const v of img) mx = Math.max(mx, v); sql.range([-W, W], [0.1, Ymax + 0.1]); sql.image('i', img, n, n, { map: 'magma', norm: (v) => Math.max(0, 1 + (v - mx) / 25) }); sql.titles('x (λ)', 'intensity × r (dB)');
          if (Rff < Ymax) sql.line('ff', [-W, W], [Rff, Rff], { color: '--c-v', dashed: true, width: 1.4 }); else sql.hide('ff');
          const cut = (y) => Array.from({ length: 201 }, (_, i) => { const x = -W + 2 * W * i / 200; let re = 0, im = 0; for (const e of xs) { const R = Math.hypot(x - e, y), p = -K * R; re += Math.cos(p) / Math.sqrt(R); im += Math.sin(p) / Math.sqrt(R); } return Math.hypot(re, im); });
          sqr.range([-W, W], [0, 1.1]); sqr.titles('x (λ)', '|E_z| (norm.): near · mid · far cross-sections'); [[D / 4, '--c-I'], [D, '--c-v'], [Ymax, '--c-B']].forEach(([y, col], j) => { const q = cut(y), m = Math.max(...q); sqr.line(`c${j}`, Array.from({ length: 201 }, (_, i) => -W + 2 * W * i / 200), q.map((v) => v / m), { color: col, width: 1.6 }); });
          hud.set('a', `aperture D = ${fmt(D)} λ → Fraunhofer distance 2D²/λ = ${fmt(Rff)} λ${Rff > Ymax ? ' (beyond the view)' : ' (green line)'}`); hud.set('b', 'close in, the beam is as wide as the array and ripples across'); hud.set('c', 'far away it spreads at a fixed angle: that is the far-field pattern');
          plots.aux.draw({ xlim: [-W, W], series: [{ x: Array.from({ length: 201 }, (_, i) => -W + 2 * W * i / 200), y: cut(Ymax).map((v, i, a) => v / Math.max(...a)), color: '--c-B', label: 'far cross-section' }] });
        } else if (c === 'grating') {
          const nx = 141, ny = 121, img = new Float64Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const dd = 0.1 + 1.4 * i / (nx - 1), th = 90 * j / (ny - 1) * deg; img[j * nx + i] = dd > 1 / (1 + Math.sin(th)) ? 1 : 0; }
          sql.range([0.1, 1.5], [0, 90]); sql.image('g', img, nx, ny, { map: 'magma', norm: (v) => 0.15 + 0.5 * v }); sql.titles('spacing d (λ)', '|θ₀| (°): bright = grating lobes'); sql.line('b', Array.from({ length: 91 }, (_, j) => 1 / (1 + Math.sin(j * deg))), Array.from({ length: 91 }, (_, j) => j), { color: '--c-v', width: 1.6 }); sql.dots('now', [d], [Math.abs(state.steer)], { color: '--accent', size: 12 });
          const p = pat(N, d, steerWeights(N, d, t0)), g = gratingAngles(d, t0);
          sqr.range([-90, 90], [fl, 2]); sqr.titles('θ (°)', 'pattern (dB), red = grating lobes'); sqr.line('p', ths, p.map((v) => Math.max(fl, dB(v))), { color: '--c-B' }); for (let i = 0; i < 6; i++) { if (i < g.length) sqr.line(`g${i}`, [g[i] / deg, g[i] / deg], [fl, 2], { color: '--c-north', dashed: true, width: 1.4 }); else sqr.hide(`g${i}`); }
          hud.set('a', `sin θ_GL = sin θ₀ + m λ/d: ${g.length ? g.map((a) => `${fmt(a / deg)}°`).join(', ') : 'none in visible space'}`, g.length ? 'bad' : 'good'); hud.set('b', `rule: d < λ/(1 + |sin θ_max|) = ${fmt(1 / (1 + Math.abs(Math.sin(t0))))} λ for ${state.steer}°`);
          hud.set('c', 'a grating lobe is a full-strength copy of the beam pointing the wrong way');
          plots.aux.draw({ xlim: [0, 90], series: [{ x: Array.from({ length: 91 }, (_, j) => j), y: Array.from({ length: 91 }, (_, j) => 1 / (1 + Math.sin(j * deg))), color: '--c-v', label: 'largest safe spacing (λ) vs max scan (°)' }] });
        } else if (c === 'scan') {
          const nx = 121, ny = 181, img = new Float64Array(nx * ny), sc = Array.from({ length: nx }, (_, i) => -60 + 120 * i / (nx - 1));
          for (let i = 0; i < nx; i++) { const w = steerWeights(N, d, sc[i] * deg, { taper: state.taper }); for (let j = 0; j < ny; j++) { const th = (-90 + 180 * j / (ny - 1)) * deg; img[j * nx + i] = dB(af(th, N, d, w) * Math.sqrt(Math.max(0, Math.cos(th)))); } }
          sql.range([-60, 60], [-90, 90]); sql.image('s', img, nx, ny, { map: 'magma', norm: (v) => Math.max(0, 1 + v / -fl) }); sql.titles('steering θ₀ (°)', 'pattern (dB) vs θ, one beam per column'); sql.line('now', [state.steer, state.steer], [-90, 90], { color: '--c-v', width: 1.4 });
          const scs = Array.from({ length: 121 }, (_, i) => -60 + i), bws = scs.map((s) => metrics(pat(N, d, steerWeights(N, d, s * deg, { taper: state.taper }))).bw);
          tr.range([-60, 60], [0, Math.max(...bws) * 1.2]); tr.titles('θ₀ (°)', 'beamwidth (°): grows as 1/cos θ₀'); tr.line('b', scs, bws, { color: '--c-B' }); tr.line('c', scs, scs.map((s) => bws[60] / Math.cos(s * deg)), { color: '--c-north', dashed: true, width: 1.2 }); tr.dots('now', [state.steer], [bws[state.steer + 60] ?? 0], { color: '--accent', size: 10 });
          br.range([-60, 60], [-6, 0.5]); br.titles('θ₀ (°)', 'gain change (dB): projected aperture + element pattern'); br.line('g', scs, scs.map((s) => 10 * Math.log10(Math.cos(s * deg)) + 10 * Math.log10(Math.cos(s * deg))), { color: '--c-E' }); br.dots('now', [state.steer], [20 * Math.log10(Math.cos(t0))], { color: '--accent', size: 10 });
          hud.set('a', `at ${state.steer}°: beamwidth ${fmt(bws[state.steer + 60])}° (${fmt(1 / Math.cos(t0))}× broadside)`); hud.set('b', `scan loss ≈ ${fmt(-20 * Math.log10(Math.cos(t0)))} dB (cos θ₀ aperture × cos θ₀ element)`); hud.set('c', 'the array looks foreshortened from the side: smaller, so a wider, weaker beam');
          plots.aux.draw({ xlim: [-60, 60], cursor: state.steer, series: [{ x: scs, y: bws, color: '--c-B', label: 'beamwidth (°) vs scan (°)' }] });
        } else if (c === 'planar') {
          const { Nx, Ny, u0, v0 } = state;
          const ar = SQL[3] / SQL[2]; sql.range([-1.2, 1.2], [-1.2 * ar, 1.2 * ar]);
          const n2 = 141, img2 = new Float64Array(n2 * n2); for (let j = 0; j < n2; j++) for (let i = 0; i < n2; i++) { const u = -1.2 + 2.4 * i / (n2 - 1), v = (-1.2 + 2.4 * j / (n2 - 1)) * ar; img2[j * n2 + i] = u * u + v * v > 1 ? -80 : dB(planarAF(u, v, Nx, Ny, d, u0, v0)); }
          sql.image('a', img2, n2, n2, { map: 'magma', norm: (v) => Math.max(0, 1 + v / -fl) }); sql.titles('u = sin θ cos φ', '|AF| (dB) in u, v');
          sql.line('c', Array.from({ length: 121 }, (_, i) => Math.cos(2 * Math.PI * i / 120)), Array.from({ length: 121 }, (_, i) => Math.sin(2 * Math.PI * i / 120)), { color: '--c-v', width: 1.4 }); sql.dots('s', [u0], [v0], { color: '--c-v', size: 8 });
          const us = Array.from({ length: 481 }, (_, i) => -1 + i / 240); sqr.range([-1, 1], [fl, 2]); sqr.titles('u or v', 'cuts: u (blue), v (orange)');
          sqr.line('u', us, us.map((u) => Math.max(fl, dB(planarAF(u, v0, Nx, Ny, d, u0, v0)))), { color: '--c-B' }); sqr.line('v', us, us.map((v) => Math.max(fl, dB(planarAF(u0, v, Nx, Ny, d, u0, v0)))), { color: '--c-I' });
          const gl = []; for (let m = -3; m <= 3; m++) for (let q = -3; q <= 3; q++) if (m || q) { const u = u0 + m / d, v = v0 + q / d; if (u * u + v * v <= 1) gl.push([u, v]); }
          const th = Math.asin(Math.min(1, Math.hypot(u0, v0))) / deg, ph = Math.atan2(v0, u0) / deg;
          hud.set('a', `beam at θ = ${fmt(th)}°, φ = ${fmt(ph)}° (${Nx} × ${Ny} elements, d = ${d} λ)`); hud.set('b', gl.length ? `${gl.length} grating lobe(s) inside the visible circle ✗` : 'replicas every 1/d stay outside the circle ✓', gl.length ? 'bad' : 'good');
          hud.set('c', 'the pattern repeats every λ/d in u and v; only |u, v| ≤ 1 is real space');
          plots.aux.draw({ xlim: [-1, 1], series: [{ x: us, y: us.map((u) => Math.max(fl, dB(planarAF(u, v0, Nx, Ny, d, u0, v0)))), color: '--c-B', label: 'u cut (dB)' }] });
        } else if (c === 'taper') {
          const a = TAPER[state.taper](N), w = steerWeights(N, d, t0, { taper: state.taper }), p = pat(N, d, w), m = metrics(p), mu = metrics(pat(N, d, steerWeights(N, d, t0)));
          tl.range([-0.5, N - 0.5], [0, 1.15]); tl.titles('element n', `weight (norm.): ${TAPERS.find((q) => q[0] === state.taper)[1]} taper`); tl.stems('a', a.map((_, n) => n), a, { color: '--c-I', width: 6 });
          bot.range([-90, 90], [fl, 2]); bot.titles('θ (°)', 'pattern (dB): this taper (blue) vs uniform (grey)'); bot.line('u', ths, pat(N, d, steerWeights(N, d, t0)).map((v) => Math.max(fl, dB(v))), { color: '--c-ref', width: 1.2 }); bot.line('p', ths, p.map((v) => Math.max(fl, dB(v))), { color: '--c-B' }); bot.line('sl', [-90, 90], [m.sl, m.sl], { color: '--c-north', dashed: true, width: 1 });
          const eff = a.reduce((s, v) => s + v, 0) ** 2 / (N * a.reduce((s, v) => s + v * v, 0));
          hud.set('a', `peak sidelobe ${fmt(m.sl)} dB (uniform ${fmt(mu.sl)} dB)`); hud.set('b', `beamwidth ${fmt(m.bw)}° = ${fmt(m.bw / mu.bw)}× uniform`); hud.set('c', `taper efficiency ${fmt(100 * eff)} %: the edges are under-used`);
          plots.aux.draw({ xlim: [0, N - 1], series: TAPERS.map(([k, l], j) => ({ x: a.map((_, n) => n), y: TAPER[k](N), color: ['--c-ref', '--c-B', '--c-I', '--c-v'][j], label: l })) });
        } else {
          const nulls = [state.n1, state.n2].slice(0, state.nn).map((v) => v * deg), w = nullWeights(N, d, t0, nulls), p = pat(N, d, w), p0 = pat(N, d, steerWeights(N, d, t0));
          tl.range([-0.5, N - 0.5], [-1.5, 1.5]); tl.titles('element n', 'weight (norm.): real (blue) and imaginary (orange) parts'); tl.stems('re', w.map((_, n) => n - 0.1), w.map((q) => q[0] / Math.max(...w.map(cx.abs))), { color: '--c-B', width: 4 }); tl.stems('im', w.map((_, n) => n + 0.1), w.map((q) => q[1] / Math.max(...w.map(cx.abs))), { color: '--c-I', width: 4 });
          bot.range([-90, 90], [-80, 2]); bot.titles('θ (°)', 'pattern (dB): with nulls (blue), plain steering (grey); interferers red');
          bot.line('u', ths, p0.map((v) => Math.max(-80, dB(v))), { color: '--c-ref', width: 1.2 }); bot.line('p', ths, p.map((v) => Math.max(-80, dB(v))), { color: '--c-B' });
          for (let i = 0; i < 2; i++) { if (i < nulls.length) bot.line(`n${i}`, [nulls[i] / deg, nulls[i] / deg], [-80, 2], { color: '--c-north', dashed: true, width: 1.4 }); else bot.hide(`n${i}`); }
          const pk = dB(af(t0, N, d, w) / Math.max(...p)), g = 20 * Math.log10(af(t0, N, d, w) / af(t0, N, d, steerWeights(N, d, t0)));
          hud.set('a', nulls.length ? `interferers at ${nulls.map((q) => fmt(q / deg)).join(', ')}°: ${nulls.map((q) => fmt(dB(af(q, N, d, w)))).join(', ')} dB` : 'no constraints: plain steering');
          hud.set('b', `w = a₀ − A(AᴴA)⁻¹Aᴴa₀: remove from the steering vector its part along each interferer`); hud.set('c', `main-beam gain change ${fmt(g)} dB${pk < -0.5 ? ', and the peak moved' : ''}`, g < -1 ? 'bad' : '');
          plots.aux.draw({ xlim: [-90, 90], series: [{ x: ths, y: p.map((v) => Math.max(-80, dB(v))), color: '--c-B', label: 'pattern with nulls (dB)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); pol.theme(); },
    };
  },
};
