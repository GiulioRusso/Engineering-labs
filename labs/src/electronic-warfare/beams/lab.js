// Beams: a phased array's instantaneous near field beside its far-field pattern, Maxwell's equations
// solved on a grid (FDTD), pointing a beam at a receiver, lobing for angle tracking, and nodding search.
import { createChart } from '../../lib/viz/chart.js';
import { createPolar, dbToR } from '../../lib/viz/polar.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createAircraft, createRadar } from '../../lib/viz/glyphs.js';
import { nearField, arrayFactor, patternMetrics, gratingFree, createFDTD, gain0, beamGain, friis, lobes, barHeight } from './model.js';

const deg = Math.PI / 180, km = 1e3, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const NXF = 200, NYF = 130, PPW = 20;

export default {
  id: 'beams', title: 'Beams', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 12,
  defaults: {
    N: 16, d: 0.5, steer: 0, taper: 'uniform',
    S: 0.5, obstacle: 'none',
    bw: 4, Pt: 10, Rk: 50, sens: -90, aim: 0,
    sq: 1.5, lbw: 4, gainL: 0.4, amp: 2,
    bel: 4, bars: 4, dwell: 1.2,
  },
  cases: [
    { id: 'array', label: 'Phased array', set: {}, examples: [
      { id: 'steer', label: 'Steer to 30°', controls: ['steer'], set: { steer: 30 * deg } },
      { id: 'taper', label: 'Hamming taper: low sidelobes', controls: ['taper'], set: { taper: 'hamming' } },
      { id: 'grating', label: 'Spacing λ: a second beam', controls: ['d', 'steer'], set: { d: 1, steer: 20 * deg } },
      { id: 'few', label: 'Four elements: a wide beam', controls: ['N'], set: { N: 4 } },
    ] },
    { id: 'fdtd', label: 'Maxwell on a grid', set: {}, examples: [
      { id: 'wall', label: 'A metal wall: standing waves', controls: ['obstacle'], set: { obstacle: 'wall' } },
      { id: 'slit', label: 'A slit: diffraction', controls: ['obstacle'], set: { obstacle: 'slit' } },
      { id: 'double', label: 'Two slits: interference', controls: ['obstacle'], set: { obstacle: 'double' } },
      { id: 'courant', label: 'Near the Courant limit', controls: ['S'], set: { S: 0.7 } },
    ] },
    { id: 'pointing', label: 'Pointing a beam', set: {}, examples: [
      { id: 'narrow', label: 'Narrow beam: stronger, shorter', controls: ['bw'], set: { bw: 2 } },
      { id: 'miss', label: 'Aimed 4° off: −12 dB', controls: ['aim'], set: { aim: 4 } },
      { id: 'far', label: 'Twice as far: −6 dB', controls: ['Rk'], set: { Rk: 100 } },
    ] },
    { id: 'lobing', label: 'Lobing', set: {}, examples: [
      { id: 'tight', label: 'Small squint: gentle slope', controls: ['sq'], set: { sq: 0.5 } },
      { id: 'agile', label: 'Agile target', controls: ['amp', 'gainL'], set: { amp: 5 } },
      { id: 'lazy', label: 'Low loop gain: lags behind', controls: ['gainL'], set: { gainL: 0.08 } },
    ] },
    { id: 'nodding', label: 'Search volume', set: {}, examples: [
      { id: 'gaps', label: 'Narrow bars: gaps far out', controls: ['bel', 'bars'], set: { bel: 2, bars: 4 } },
      { id: 'more', label: 'More bars: covered, slower', controls: ['bars', 'bel'], set: { bel: 2, bars: 8 } },
    ] },
  ],
  controls: [
    { title: 'Array', show: (s) => s.case === 'array', items: [
      { id: 'N', label: 'Elements', unit: '', min: 2, max: 32, step: 1 },
      { id: 'd', label: 'Spacing', unit: 'λ', min: 0.2, max: 1.5, step: 0.01 },
      { id: 'steer', label: 'Steering angle', unit: '°', k: 1 / deg, min: -60 * deg, max: 60 * deg, step: deg },
      { id: 'taper', label: 'Taper', type: 'segmented', options: [['uniform', 'Uniform'], ['hamming', 'Hamming']] },
    ] },
    { title: 'Grid', show: (s) => s.case === 'fdtd', items: [
      { id: 'obstacle', label: 'Obstacle', type: 'segmented', options: [['none', 'None'], ['wall', 'Wall'], ['slit', 'Slit'], ['double', 'Two slits']] },
      { id: 'S', label: 'Courant number cΔt/Δx', unit: '', min: 0.1, max: 0.7, step: 0.01, hint: 'Above 1/√2 ≈ 0.707 the scheme explodes' },
    ] },
    { title: 'Link', show: (s) => s.case === 'pointing', items: [
      { id: 'bw', label: 'Beam width', unit: '°', min: 1, max: 15, step: 0.1 },
      { id: 'Pt', label: 'Transmit power', unit: 'W', min: 0.1, max: 100, log: true },
      { id: 'Rk', label: 'Range', unit: 'km', min: 5, max: 200, step: 1 },
      { id: 'aim', label: 'Pointing error', unit: '°', min: -10, max: 10, step: 0.1 },
      { id: 'sens', label: 'Receiver sensitivity', unit: 'dBm', min: -120, max: -50, step: 1 },
    ] },
    { title: 'Tracker', show: (s) => s.case === 'lobing', items: [
      { id: 'sq', label: 'Squint', unit: '°', min: 0.2, max: 3, step: 0.05 },
      { id: 'lbw', label: 'Beam width', unit: '°', min: 1, max: 10, step: 0.1 },
      { id: 'gainL', label: 'Loop gain', unit: '', min: 0.02, max: 1, step: 0.01 },
      { id: 'amp', label: 'Target weave', unit: '°', min: 0, max: 8, step: 0.1 },
    ] },
    { title: 'Search', show: (s) => s.case === 'nodding', items: [
      { id: 'bel', label: 'Bar height (elevation beam)', unit: '°', min: 1, max: 8, step: 0.1 },
      { id: 'bars', label: 'Bars', unit: '', min: 1, max: 10, step: 1 },
      { id: 'dwell', label: 'Time per bar', unit: 's', min: 0.3, max: 3, step: 0.1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const nf = createChart(ctx, { box: [-4.3, -2.4, 4.7, 4.8], x: [-12, 12], y: [0, 24], xTitle: 'x (wavelengths)', yTitle: 'instantaneous field' });
    const pol = createPolar(ctx, { c: [2.55, -2.25], R: 2.05, rings: ['−30', '−20', '−10', '0 dB'] });
    const ez = createChart(ctx, { box: [-4.3, -2.4, 5.4, 4.8], x: [0, NXF / PPW], y: [0, NYF / PPW], xTitle: 'x (λ)', yTitle: 'E_z, instantaneous' });
    const hm = createChart(ctx, { box: [1.45, 0.35, 3.0, 2.0], x: [0, NXF / PPW], y: [0, NYF / PPW], xTitle: '', yTitle: '|H|: peaks where E_z crosses zero' }), cut = createChart(ctx, { box: [1.45, -2.35, 3.0, 2.1], x: [0, NXF / PPW], y: [-1, 1], xTitle: 'x along the dotted line (λ)', yTitle: 'E_z (blue), H_y (orange)' });
    const plan = createChart(ctx, { box: [-4.3, -2.4, 4.6, 4.8], x: [0, 1.3], y: [-0.95, 0.95], xTitle: 'gain along each direction (angles ×5)', yTicks: false, grid: false });
    const r1 = createChart(ctx, { box: [0.9, 0.6, 3.6, 1.8] }), r2 = createChart(ctx, { box: [0.9, -2.35, 3.6, 1.8] });
    const polL = createPolar(ctx, { c: [-1.9, -2.3], R: 2.5, from: -90, to: 90, rings: ['', '', '', ''] });
    const vcut = createChart(ctx, { box: [-4.3, -2.4, 4.7, 4.8], x: [0, 60], y: [0, 12], xTitle: 'range (km)', yTitle: 'altitude (km)' });
    const lobe = createCurve(stage, { max: 400, width: 2, color: '--c-B' }), wedges = createCurve(stage, { max: 200, width: 1.2, color: '--c-ref' }), cur = createCurve(stage, { max: 8, width: 3, color: '--c-E' });
    const radar = createRadar(stage), acs = [createAircraft(stage), createAircraft(stage, '--c-E'), createAircraft(stage, '--c-v')];
    const all = [nf, ez, hm, cut, plan, r1, r2, vcut];
    let F = null, hist = [];

    function obstacles() {
      F.pec.fill(0); const x = Math.round(NXF * 0.62);
      if (state.obstacle === 'none') return;
      for (let j = 0; j < NYF; j++) {
        const y = j / PPW, mid = NYF / PPW / 2, open = state.obstacle === 'slit' ? Math.abs(y - mid) < 0.6 : state.obstacle === 'double' ? Math.abs(Math.abs(y - mid) - 1.1) < 0.35 : false;
        if (!open) { F.pec[j * NXF + x] = 1; F.pec[j * NXF + x + 1] = 1; }
      }
    }
    return {
      changed() {
        for (const k of all) k.show(false); pol.show(false); polL.show(false); lobe.object.visible = wedges.object.visible = cur.object.visible = false; radar.object.visible = false; for (const a of acs) a.object.visible = false;
        const c = state.case;
        if (c === 'array') { nf.show(true); pol.show(true); }
        if (c === 'fdtd') { ez.show(true); hm.show(true); cut.show(true); F = createFDTD(NXF, NYF, { S: state.S, ppw: PPW }); obstacles(); }
        if (c === 'pointing') { plan.show(true); r1.show(true); r2.show(true); lobe.object.visible = true; }
        if (c === 'lobing') { polL.show(true); r1.show(true); r2.show(true); hist = []; }
        if (c === 'nodding') { vcut.show(true); r1.show(true); wedges.object.visible = cur.object.visible = true; hist = []; }
        ctx.setClock(c === 'pointing' ? 10 : 0);
      },
      update() {
        const c = state.case, t = time.t;
        if (c === 'array') {
          const nx = 140, ny = 140, img = new Float32Array(nx * ny), wt = 2 * Math.PI * t * 0.7; let m = 1e-9;
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = nearField(-12 + 24 * (i + 0.5) / nx, 24 * (j + 0.5) / ny, wt, state); img[j * nx + i] = v; m = Math.max(m, Math.abs(v)); }
          nf.image('f', img, nx, ny, { map: 'field', norm: (v) => 0.5 + 0.5 * Math.max(-1, Math.min(1, v / (0.6 * m))) });
          const th = [], r = [], dbs = []; for (let i = 0; i <= 720; i++) { const a = -90 + 180 * i / 720, g = arrayFactor(a * deg, state), dB = 20 * Math.log10(Math.max(g, 1e-6)); th.push(a); dbs.push(dB); r.push(dbToR(dB)); }
          pol.line('p', th, r, { color: '--c-B' }); pol.ray('s', state.steer / deg, { color: '--c-I' });
          const M = patternMetrics(th, dbs), gf = gratingFree(state.d, state.steer);
          hud.set('a', `${state.N} elements, ${fmt(state.d)} λ apart, phase step ${fmt(-360 * state.d * Math.sin(state.steer))}° per element`);
          hud.set('b', `beam width ${fmt(M.bw)}°, peak sidelobe ${fmt(M.psl)} dB (${state.taper})`); hud.set('c', gf ? 'no grating lobe ✓' : 'grating lobe: a second beam at full strength ✗', gf ? 'good' : 'bad');
          plots.aux.draw({ xlim: [-90, 90], cursor: state.steer / deg, series: [{ x: th, y: dbs.map((v) => Math.max(-50, v)), color: '--c-B', label: 'far-field pattern (dB) vs angle (°)' }] });
        } else if (c === 'fdtd') {
          if (F.S !== state.S) { F = createFDTD(NXF, NYF, { S: state.S, ppw: PPW }); obstacles(); }
          const period = PPW / state.S, sx = Math.round(NXF * 0.2), sy = Math.round(NYF / 2);
          F.run(4, (n, E) => { E[sy * NXF + sx] += 0.5 * Math.sin(2 * Math.PI * n / period) * Math.min(1, n / (3 * period)); });
          const hmag = new Float32Array(NXF * NYF); for (let k = 0; k < NXF * NYF; k++) hmag[k] = Math.hypot(F.Hx[k], F.Hy[k]);
          ez.image('ez', F.Ez, NXF, NYF, { map: 'field', norm: (v) => 0.5 + 0.5 * Math.max(-1, Math.min(1, v / 0.15)) }); hm.image('h', hmag, NXF, NYF, { map: 'magma', norm: (v) => Math.min(1, v / 0.12) });
          const row = sy, xs = Array.from({ length: NXF }, (_, i) => i / PPW);
          cut.line('e', xs, xs.map((_, i) => F.Ez[row * NXF + i] / 0.15), { color: '--c-B' }); cut.line('h', xs, xs.map((_, i) => F.Hy[row * NXF + i] / 0.15), { color: '--c-I', width: 1.6 });
          ez.line('row', [0, NXF / PPW], [row / PPW, row / PPW], { color: '--ink-dim', dashed: true, width: 1 });
          hud.set('a', `Yee grid ${NXF} × ${NYF}, ${PPW} cells per wavelength, step ${F.step}`); hud.set('b', `Courant number S = ${state.S} (limit 1/√2 = 0.707)`, state.S < 0.707 ? 'good' : 'bad');
          hud.set('c', state.obstacle === 'wall' ? 'reflection: E nodes where H has antinodes' : state.obstacle === 'none' ? 'a point source: cylindrical waves leaving the grid' : 'openings act as new sources (Huygens): diffraction');
          plots.aux.draw({ xlim: [0, NXF / PPW], series: [{ x: xs, y: xs.map((_, i) => F.Ez[row * NXF + i] ** 2 + F.Hy[row * NXF + i] ** 2), color: '--c-v', label: 'E² + H² along the cut' }] });
        } else if (c === 'pointing') {
          const R = state.Rk * km, lam = 0.03, G0 = gain0(state.bw), Ymax = R * Math.tan(3 * state.bw * deg), u = (t % 10) / 10, y = -Ymax + 2 * Ymax * u;
          const psi = Math.atan2(y, R) / deg - state.aim, Pr = 10 * Math.log10(friis(state.Pt, G0 * beamGain(psi, state.bw), 10, lam, Math.hypot(R, y)) * 1e3), ok = Pr >= state.sens;
          plan.range([0, 1.3], [-0.95, 0.95]); radar.set(plan.mx(0.03), plan.my(0), 0, 0.3);
          const X = 5; // angles drawn ×5 so a few degrees are visible; beam and aircraft use the same scale
          const L = []; for (let i = 0; i <= 200; i++) { const a = (-4 + 8 * i / 200) * state.bw, g = beamGain(a, state.bw), A = (a + state.aim) * deg * X; L.push(plan.mx(0.05 + g * Math.cos(A)), plan.my(g * Math.sin(A)), 0.003); }
          const ang = Math.atan2(y, R) * X; lobe.set(L); acs[0].set(plan.mx(0.05 + Math.cos(ang)), plan.my(Math.sin(ang)), -Math.PI / 2, 0.2); acs[0].color(ctx.cssVar(ok ? '--c-v' : '--c-north'));
          const ts = Array.from({ length: 200 }, (_, i) => i / 199), prs = ts.map((v) => { const yy = -Ymax + 2 * Ymax * v, p = Math.atan2(yy, R) / deg - state.aim; return 10 * Math.log10(friis(state.Pt, G0 * beamGain(p, state.bw), 10, lam, Math.hypot(R, yy)) * 1e3); });
          r1.range([0, 1], [state.sens - 40, state.sens + 40]); r1.titles('position along the track', 'received power (dBm), threshold (red)'); r1.line('p', ts, prs, { color: '--c-B' }); r1.line('th', [0, 1], [state.sens, state.sens], { color: '--c-north', dashed: true, width: 1.4 }); r1.dots('now', [u], [Pr], { color: ok ? '--c-v' : '--c-north', size: 11 });
          const ps = Array.from({ length: 201 }, (_, i) => -2 * state.bw + 4 * state.bw * i / 200);
          r2.range([-2 * state.bw, 2 * state.bw], [-40, 2]); r2.titles('off boresight ψ (°)', 'gain loss (dB): −12 dB one beam width off'); r2.line('g', ps, ps.map((p) => 10 * Math.log10(beamGain(p, state.bw))), { color: '--c-E' }); r2.dots('now', [psi], [10 * Math.log10(beamGain(psi, state.bw))], { color: '--accent', size: 10 });
          hud.set('a', `beam ${state.bw}° → peak gain 4π/θ² = ${fmt(10 * Math.log10(G0))} dBi`); hud.set('b', `off boresight ${fmt(psi)}° costs ${fmt(-10 * Math.log10(beamGain(psi, state.bw)))} dB`);
          hud.set('c', ok ? `link closed: ${fmt(Pr)} dBm ≥ ${state.sens} dBm ✓` : `link open: ${fmt(Pr)} dBm ✗`, ok ? 'good' : 'bad');
          plots.aux.draw({ xlim: [1, 15], cursor: state.bw, series: [{ x: Array.from({ length: 141 }, (_, i) => 1 + i * 0.1), y: Array.from({ length: 141 }, (_, i) => 10 * Math.log10(gain0(1 + i * 0.1))), color: '--c-B', label: 'peak gain (dBi) vs beam width (°)' }] });
        } else if (c === 'lobing') {
          const dtk = 0.05; while (hist.length < t / dtk) { const k = hist.length, tt = k * dtk, tg = state.amp * Math.sin(2 * Math.PI * tt / 6), b = k ? hist[k - 1].b : 0, e = lobes(tg, b, state.sq, state.lbw).err; hist.push({ t: tt, tg, b: b + state.gainL * e * state.lbw }); if (hist.length > 4000) break; }
          const h = hist[hist.length - 1] || { tg: 0, b: 0 }, Lo = lobes(h.tg, h.b, state.sq, state.lbw), sc = 8;
          const th = [], ra = [], rb = []; for (let i = 0; i <= 400; i++) { const a = h.b - 3 * state.lbw + 6 * state.lbw * i / 400; th.push(a * sc); ra.push(Math.sqrt(beamGain(a - (h.b - state.sq), state.lbw))); rb.push(Math.sqrt(beamGain(a - (h.b + state.sq), state.lbw))); }
          polL.line('A', th, ra, { color: '--c-B' }); polL.line('B', th, rb, { color: '--c-E' }); polL.ray('t', h.tg * sc, { color: '--c-I', width: 2.2 }); polL.ray('b', h.b * sc, { color: '--ink', dashed: true });
          const as = Array.from({ length: 301 }, (_, i) => -3 * state.lbw + 6 * state.lbw * i / 300);
          r1.range([-3 * state.lbw, 3 * state.lbw], [-1.1, 1.1]); r1.titles('target off boresight (°)', 'A (blue), B (yellow), Δ/Σ (orange)');
          r1.line('A', as, as.map((a) => lobes(a, 0, state.sq, state.lbw).A), { color: '--c-B', width: 1.6 }); r1.line('B', as, as.map((a) => lobes(a, 0, state.sq, state.lbw).B), { color: '--c-E', width: 1.6 }); r1.line('e', as, as.map((a) => lobes(a, 0, state.sq, state.lbw).err), { color: '--c-I' }); r1.dots('now', [h.tg - h.b], [Lo.err], { color: '--accent', size: 10 });
          const T = Math.max(6, t), sel = hist.filter((p) => p.t > T - 12);
          r2.range([T - 12, T], [-state.amp * 1.4 - 1, state.amp * 1.4 + 1]); r2.titles('time (s)', 'target (orange) and where the antenna points (blue)'); r2.line('tg', sel.map((p) => p.t), sel.map((p) => p.tg), { color: '--c-I' }); r2.line('b', sel.map((p) => p.t), sel.map((p) => p.b), { color: '--c-B' });
          hud.set('a', `two beams squinted ±${state.sq}° (angles drawn ×${sc})`); hud.set('b', `A = ${fmt(Lo.A)}, B = ${fmt(Lo.B)} → Δ/Σ = ${fmt(Lo.err)}`); hud.set('c', `pointing error ${fmt(h.tg - h.b)}°`, Math.abs(h.tg - h.b) < 0.2 * state.lbw ? 'good' : 'bad');
          plots.aux.draw({ xlim: [-3 * state.lbw, 3 * state.lbw], series: [{ x: as, y: as.map((a) => 10 * Math.log10(beamGain(a, state.lbw))), color: '--c-ref', label: 'one beam: almost flat at the peak — useless for angle' }] });
        } else {
          const bars = state.bars, k = Math.floor(t / state.dwell) % bars, u = (t / state.dwell) % 1, el0 = 0.5, els = Array.from({ length: bars }, (_, i) => el0 + state.bel * (i + 0.5));
          vcut.range([0, 60], [0, 12]); radar.set(vcut.mx(0.6), vcut.my(0.3), Math.PI / 2, 0.2);
          const seg = [], dist = 60; for (const e of els) for (const s of [-1, 1]) { const a = (e + s * state.bel / 2) * deg; seg.push(vcut.mx(0), vcut.my(0), 0, vcut.mx(dist * Math.cos(a)), vcut.my(dist * Math.sin(a)), 0); }
          wedges.segments(seg); const a0 = (els[k] - state.bel / 2) * deg, a1 = (els[k] + state.bel / 2) * deg;
          cur.set([vcut.mx(0), vcut.my(0), 0.01, vcut.mx(dist * Math.cos(a0)), vcut.my(dist * Math.sin(a0)), 0.01, vcut.mx(dist * Math.cos(a1)), vcut.my(dist * Math.sin(a1)), 0.01], true);
          const planes = [[45 - 3 * t % 40, 3], [20 + 2 * t % 35, 6], [55 - 1.5 * t % 50, 9]];
          planes.forEach(([x, z], i) => { const el = Math.atan2(z, x) / deg, inBar = el > els[k] - state.bel / 2 && el < els[k] + state.bel / 2, inAz = Math.abs(u - 0.5) < 0.12; acs[i].set(vcut.mx(x), vcut.my(z), Math.PI, 0.17); acs[i].color(ctx.cssVar(inBar && inAz ? '--c-v' : '--c-ref')); if (inBar && inAz && (!hist.length || hist[hist.length - 1].t < t - 0.15 || hist[hist.length - 1].i !== i)) hist.push({ t, i }); });
          const recent = hist.filter((h) => h.t > t - 20);
          r1.range([Math.max(0, t - 20), Math.max(20, t)], [-0.5, 2.5]); r1.titles('time (s)', 'aircraft number: a dot for each hit'); r1.dots('hits', recent.map((h) => h.t), recent.map((h) => h.i), { color: '--c-v', size: 8 });
          hud.set('a', `${bars} bars of ${state.bel}°, ${state.dwell} s each → frame time ${fmt(bars * state.dwell)} s`); hud.set('b', `bar height at 5 km ${fmt(barHeight(5e3, state.bel))} m, at 50 km ${fmt(barHeight(50e3, state.bel))} m`);
          hud.set('c', `covered up to ${fmt(el0 + bars * state.bel)}° elevation; above it nothing is seen`);
          plots.aux.draw({ xlim: [1, 10], cursor: bars, series: [{ x: Array.from({ length: 10 }, (_, i) => i + 1), y: Array.from({ length: 10 }, (_, i) => (i + 1) * state.dwell), color: '--c-E', label: 'frame time (s) vs number of bars' }] });
        }
      },
      theme() { for (const k of all) k.theme(); pol.theme(); polL.theme(); for (const k of [lobe, wedges, cur]) k.theme(); radar.theme(); acs.forEach((a) => a.theme()); },
    };
  },
};
