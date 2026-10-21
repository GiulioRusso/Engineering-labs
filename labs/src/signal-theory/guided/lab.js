// Guided waves, from two conductors to none: the TEM coax line, mismatch with standing waves and the Smith
// chart, the cutoff of a hollow guide, what a mode looks like and where its wall currents flow (slots),
// dispersion and a pulse spreading, and the dielectric slab with total internal reflection.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { C0, coaxZ0, gamma, vswr, gammaAt, vmag, zFromGamma, smithGrid, cutoff, beta, alpha, vp, vg, modes, teField, te10Current, propagate, slabModes, slabProfile } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const deg = Math.PI / 180, GHz = 1e9, mm = 1e-3;
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0];
const SQL = [-4.3, -2.35, 4.2, 4.9], SQR = [0.35, -2.35, 4.2, 4.9];
const GRID = smithGrid();

export default {
  id: 'guided', title: 'Guided waves', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 6,
  defaults: { ba: 3.5, er: 2.25, RL: 100, XL: 50, a: 22.86, b: 10.16, f: 10, m: 1, n: 0, slot: 'centre', L: 2, sig: 1, n1: 1.48, n2: 1.46, h: 4, ang: 84, lam: 1.55 },
  cases: [
    { id: 'tem', label: 'TEM line', set: {}, examples: [
      { id: 'tv', label: '75 Ω TV cable: foam, b/a ≈ 4.4', controls: ['ba', 'er'], set: { ba: 4.4, er: 1.4 } },
    ] },
    { id: 'smith', label: 'Standing waves and Smith chart', set: {}, examples: [
      { id: 'match', label: '50 Ω load: no reflection', controls: ['RL', 'XL'], set: { RL: 50, XL: 0 } },
      { id: 'short', label: 'Short: full standing wave', controls: ['RL', 'XL'], set: { RL: 0, XL: 0 } },
      { id: 'reactive', label: 'Pure reactance: no power absorbed', controls: ['RL', 'XL'], set: { RL: 0, XL: 80 } },
    ] },
    { id: 'cutoff', label: 'Waveguide cutoff', set: {}, examples: [
      { id: 'below', label: '5 GHz: below cutoff, evanescent', controls: ['f'], set: { f: 5 } },
      { id: 'multi', label: '16 GHz: several modes', controls: ['f'], set: { f: 16 } },
    ] },
    { id: 'mode', label: 'Mode fields and slots', set: {}, examples: [
      { id: 'te20', label: 'TE20: two half-waves across', controls: ['m', 'n'], set: { m: 2, n: 0 } },
      { id: 'te11', label: 'TE11', controls: ['m', 'n'], set: { m: 1, n: 1 } },
      { id: 'offset', label: 'Offset slot: radiates', controls: ['slot'], set: { slot: 'offset' } },
    ] },
    { id: 'dispersion', label: 'Dispersion', set: {}, examples: [
      { id: 'near', label: 'Close to cutoff: slow, smeared', controls: ['f'], set: { f: 7 } },
      { id: 'far', label: 'Far above cutoff: almost TEM', controls: ['f'], set: { f: 14 } },
    ] },
    { id: 'fibre', label: 'Dielectric guide', set: {}, examples: [
      { id: 'leak', label: 'Below the critical angle: it leaks', controls: ['ang'], set: { ang: 78 } },
      { id: 'single', label: 'Thin core: single mode', controls: ['h'], set: { h: 1 } },
    ] },
  ],
  controls: [
    { title: 'Line', show: (s) => s.case === 'tem' || s.case === 'smith', items: [
      { id: 'ba', label: 'Radius ratio b/a', unit: '', min: 1.2, max: 10, step: 0.05, show: (s) => s.case === 'tem' },
      { id: 'er', label: 'Dielectric εr', unit: '', min: 1, max: 10, step: 0.05, show: (s) => s.case === 'tem' },
      { id: 'RL', label: 'Load resistance', unit: 'Ω', min: 0, max: 300, step: 1, show: (s) => s.case === 'smith' },
      { id: 'XL', label: 'Load reactance', unit: 'Ω', min: -200, max: 200, step: 1, show: (s) => s.case === 'smith' },
    ] },
    { title: 'Waveguide', show: (s) => ['cutoff', 'mode', 'dispersion'].includes(s.case), items: [
      { id: 'a', label: 'Width a', unit: 'mm', min: 5, max: 50, step: 0.1 }, { id: 'b', label: 'Height b', unit: 'mm', min: 2, max: 30, step: 0.1 },
      { id: 'f', label: 'Frequency', unit: 'GHz', min: 1, max: 20, step: 0.05, show: (s) => s.case !== 'mode' },
      { id: 'm', label: 'Mode index m', unit: '', min: 0, max: 3, step: 1, show: (s) => s.case === 'mode' }, { id: 'n', label: 'Mode index n', unit: '', min: 0, max: 3, step: 1, show: (s) => s.case === 'mode' },
      { id: 'slot', label: 'Slot in the broad wall', type: 'segmented', options: [['centre', 'Centred, along'], ['offset', 'Offset, along'], ['across', 'Across']], show: (s) => s.case === 'mode' },
      { id: 'L', label: 'Guide length', unit: 'm', min: 0.1, max: 10, step: 0.1, show: (s) => s.case === 'dispersion' },
      { id: 'sig', label: 'Pulse width σ', unit: 'ns', min: 0.3, max: 5, step: 0.05, show: (s) => s.case === 'dispersion' },
    ] },
    { title: 'Slab', show: (s) => s.case === 'fibre', items: [
      { id: 'n1', label: 'Core index n₁', unit: '', min: 1.4, max: 1.7, step: 0.001 }, { id: 'n2', label: 'Cladding index n₂', unit: '', min: 1.3, max: 1.6, step: 0.001 },
      { id: 'h', label: 'Core half-thickness', unit: 'µm', min: 0.5, max: 15, step: 0.1 }, { id: 'ang', label: 'Ray angle to the normal', unit: '°', min: 60, max: 89, step: 0.5 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR }), bot = createChart(ctx, { box: BOT });
    const sql = createChart(ctx, { box: SQL, grid: false, yTicks: false, xTicks: false }), sqr = createChart(ctx, { box: SQR, grid: false, xTicks: false, yTicks: false }), all = [tl, tr, bl, br, bot, sql, sqr];
    const grid = createCurve(stage, { max: 6000, width: 1, color: '--line' }), lines = createCurve(stage, { max: 6000, width: 1.6, color: '--c-B' }), lines2 = createCurve(stage, { max: 6000, width: 1.6, color: '--c-I' }), extra = [grid, lines, lines2];
    const circle = (cx, cy, r, n = 90) => { const p = []; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n, b = 2 * Math.PI * (i + 1) / n; p.push(cx + r * Math.cos(a), cy + r * Math.sin(a), 0.002, cx + r * Math.cos(b), cy + r * Math.sin(b), 0.002); } return p; };
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); for (const o of extra) o.object.visible = c === 'tem' || c === 'smith' || c === 'mode'; ({ tem: [tr, bot], smith: [tr, br], cutoff: [tl, tr, bot], mode: [sqr], dispersion: [tl, tr, bot], fibre: [tl, tr, bot] })[c].forEach((k) => k.show(true)); if (c === 'smith') sql.show(true); ctx.setDuration(c === 'tem' || c === 'smith' || c === 'mode' ? 6 : 0); },
      update() {
        const c = state.case, wt = 2 * Math.PI * (time.t % 6) / 6;
        if (c === 'tem') {
          const Z0 = coaxZ0(state.ba, state.er), cx = -2.3, cy = -0.1, Rb = 2.0, Ra = Rb / state.ba, amp = Math.cos(wt);
          const g = [...circle(cx, cy, Rb), ...circle(cx, cy, Ra)]; grid.segments(g);
          const e = []; for (let i = 0; i < 16; i++) { const a = 2 * Math.PI * i / 16, r1 = Ra, r2 = Ra + (Rb - Ra) * Math.abs(amp); e.push(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a), 0.003, cx + r2 * Math.cos(a), cy + r2 * Math.sin(a), 0.003); } lines.segments(e);
          const h = []; for (const f of [0.25, 0.5, 0.75]) h.push(...circle(cx, cy, Ra + (Rb - Ra) * f * Math.abs(amp) + 1e-3)); lines2.segments(h);
          const zs = Array.from({ length: 300 }, (_, i) => i / 100); tr.range([0, 3], [-1.3, 1.3]); tr.titles('z (λ)', `V (blue) and I·Z₀ (orange) travel together, in phase`); tr.line('v', zs, zs.map((z) => Math.cos(wt - 2 * Math.PI * z)), { color: '--c-B' }); tr.line('i', zs, zs.map((z) => 0.85 * Math.cos(wt - 2 * Math.PI * z)), { color: '--c-I', width: 1.6 });
          const bs = Array.from({ length: 200 }, (_, i) => 1.1 + i * 0.045); bot.range([1, 10], [0, 160]); bot.titles('b/a', 'Z₀ (Ω) for air (grey), εr = 2.25 (blue) and your εr (green)');
          bot.line('a', bs, bs.map((q) => coaxZ0(q, 1)), { color: '--c-ref', width: 1.4 }); bot.line('p', bs, bs.map((q) => coaxZ0(q, 2.25)), { color: '--c-B', width: 1.4 }); bot.line('u', bs, bs.map((q) => coaxZ0(q, state.er)), { color: '--c-v' }); bot.dots('now', [state.ba], [Z0], { color: '--accent', size: 11 }); bot.line('50', [1, 10], [50, 50], { color: '--ink-dim', dashed: true, width: 1 });
          hud.set('a', `Z₀ = (η₀ / 2π√εr) ln(b/a) = ${fmt(Z0)} Ω`); hud.set('b', `v = c/√εr = ${fmt(1 / Math.sqrt(state.er))} c — the same for every frequency`); hud.set('c', 'left: cross-section — E radial (blue), H in circles (orange), pulsing as the wave passes');
          plots.aux.draw({ xlim: [1, 10], cursor: state.ba, series: [{ x: bs, y: bs.map((q) => coaxZ0(q, state.er)), color: '--c-v', label: 'Z₀ (Ω) vs b/a' }] });
        } else if (c === 'smith') {
          const g = gamma(state.RL, state.XL), l = 0.5 * (time.t % 6) / 6, gl = gammaAt(g, l), ar = SQL[3] / SQL[2]; sql.range([-1.15, 1.15], [-1.15 * ar, 1.15 * ar]); sql.titles('', 'Smith chart: Γ plane with the impedance grid');
          const seg = []; for (const p of GRID) for (let i = 0; i + 1 < p.length; i++) if (Math.hypot(...p[i]) <= 1.0001 && Math.hypot(...p[i + 1]) <= 1.0001) seg.push(sql.mx(p[i][0]), sql.my(p[i][1]), 0.001, sql.mx(p[i + 1][0]), sql.my(p[i + 1][1]), 0.001); grid.segments(seg);
          const m = Math.hypot(...g), arc = []; for (let i = 0; i <= 100; i++) { const q = gammaAt(g, l * i / 100); arc.push(sql.mx(q[0]), sql.my(q[1]), 0.002); } lines.set(arc);
          const circ = []; for (let i = 0; i < 120; i++) { const a = 2 * Math.PI * i / 120, b = 2 * Math.PI * (i + 1) / 120; circ.push(sql.mx(m * Math.cos(a)), sql.my(m * Math.sin(a)), 0.0015, sql.mx(m * Math.cos(b)), sql.my(m * Math.sin(b)), 0.0015); } lines2.segments(circ);
          sql.dots('L', [g[0]], [g[1]], { color: '--c-north', size: 11 }); sql.dots('now', [gl[0]], [gl[1]], { color: '--accent', size: 12 });
          const ls = Array.from({ length: 300 }, (_, i) => i / 200), V = ls.map((q) => vmag(g, q)), inst = ls.map((q) => { const ph = 2 * Math.PI * q; return Math.cos(wt + ph) + m * Math.cos(wt - ph + Math.atan2(g[1], g[0])); });
          tr.range([0, 1.5], [-2.2, 2.2]); tr.titles('distance from the load (λ)', '|V| envelope (blue) and V now (grey): forward + reflected'); tr.line('env', ls, V, { color: '--c-B' }); tr.line('e2', ls, V.map((v) => -v), { color: '--c-B', width: 1 }); tr.line('i', ls, inst, { color: '--c-ref', width: 1.2 }); tr.line('l', [l, l], [-2.2, 2.2], { color: '--accent', dashed: true, width: 1 });
          const zs = ls.map((q) => zFromGamma(gammaAt(g, q))); br.range([0, 1.5], [-4, 6]); br.titles('distance from the load (λ)', 'impedance seen z = Z/Z₀: r (blue), x (orange)'); br.line('r', ls, zs.map((z) => Math.min(6, z[0])), { color: '--c-B' }); br.line('x', ls, zs.map((z) => Math.max(-4, Math.min(6, z[1]))), { color: '--c-I' });
          const zl = zFromGamma(gl);
          hud.set('a', `Γ_L = (Z_L − Z₀)/(Z_L + Z₀) = ${fmt(m)} ∠ ${fmt(Math.atan2(g[1], g[0]) / deg)}°, VSWR ${fmt(vswr(g))}`, m < 0.1 ? 'good' : m > 0.9 ? 'bad' : '');
          hud.set('b', `at ${fmt(l)} λ from the load: Z = ${fmt(50 * zl[0])} ${zl[1] >= 0 ? '+' : '−'} j${fmt(Math.abs(50 * zl[1]))} Ω`); hud.set('c', `moving toward the generator turns Γ clockwise by 4π l/λ: a full turn every λ/2; power reflected ${fmt(100 * m * m)} %`);
          plots.aux.draw({ xlim: [0, 1.5], series: [{ x: ls, y: V, color: '--c-B', label: '|V|/|V⁺| vs distance (λ)' }] });
        } else if (c === 'cutoff' || c === 'dispersion') {
          const a = state.a * mm, b = state.b * mm, f = state.f * GHz, M = modes(a, b, 25 * GHz), fc = cutoff(1, 0, a, b), fcs = M.slice(0, 8);
          if (c === 'cutoff') {
            tl.range([0, 25], [-0.5, fcs.length - 0.5]); tl.titles('f (GHz)', 'cutoff of each mode (bars); operating frequency (green)');
            fcs.forEach((q, i) => tl.line(`m${i}`, [q.fc / GHz, 25], [i, i], { color: f > q.fc ? '--c-v' : '--c-ref', width: 8 })); for (let i = fcs.length; i < 8; i++) tl.hide(`m${i}`); tl.line('f', [state.f, state.f], [-0.5, fcs.length - 0.5], { color: '--accent', dashed: true, width: 1.6 });
            const fx = Array.from({ length: 300 }, (_, i) => 25 * GHz * i / 299); tr.range([0, 25], [0, 500]); tr.titles('f (GHz)', 'β (rad/m) for each mode, and the light line (dashed)'); fcs.slice(0, 5).forEach((q, i) => tr.line(`b${i}`, fx.filter((v) => v > q.fc).map((v) => v / GHz), fx.filter((v) => v > q.fc).map((v) => beta(v, q.fc)), { color: ['--c-B', '--c-I', '--c-v', '--c-E', '--c-F'][i], width: 1.6 })); tr.line('light', [0, 25], [0, 2 * Math.PI * 25 * GHz / C0], { color: '--ink-dim', dashed: true, width: 1 });
            const zs = Array.from({ length: 400 }, (_, i) => i * 0.25 / 399), on = f > fc;
            bot.range([0, 250], [-1.2, 1.2]); bot.titles('z (mm) along the guide', on ? `TE10 propagates: λg = ${fmt(2 * Math.PI / beta(f, fc) / mm)} mm` : `TE10 is evanescent: falls 1/e every ${fmt(1 / alpha(f, fc) / mm)} mm`);
            bot.line('e', zs.map((z) => z / mm), zs.map((z) => (on ? Math.cos(wt * 0 + 2 * Math.PI * (time.t % 6) / 6 - beta(f, fc) * z) : Math.exp(-alpha(f, fc) * z) * Math.cos(2 * Math.PI * (time.t % 6) / 6))), { color: on ? '--c-v' : '--c-north' });
            const n = fcs.filter((q) => f > q.fc).length;
            hud.set('a', `${state.a} × ${state.b} mm: TE10 cutoff c/2a = ${fmt(fc / GHz)} GHz, next ${fcs[1] ? `${fcs[1].name} at ${fmt(fcs[1].fc / GHz)} GHz` : '—'}`); hud.set('b', `at ${state.f} GHz: ${n} mode${n === 1 ? '' : 's'} propagate${n === 1 ? ' — single-mode ✓' : n ? ' ✗ multimode' : ' — none: the guide reflects everything'}`, n === 1 ? 'good' : 'bad');
            hud.set('c', 'f_c,mn = (c/2)√((m/a)² + (n/b)²): a pattern must fit across the pipe');
            plots.aux.draw({ xlim: [0, 25], cursor: state.f, series: [{ x: fx.map((v) => v / GHz), y: fx.map((v) => (v > fc ? 0 : -alpha(v, fc))), color: '--c-north', label: '−α (Np/m) below cutoff vs f (GHz)' }] });
          } else {
            const fx = Array.from({ length: 300 }, (_, i) => fc * 1.0005 + (25 * GHz - fc) * i / 299), bf = beta(f, fc), Vp = vp(f, fc), Vg = vg(f, fc);
            tl.range([0, 500], [0, 25]); tl.titles('β (rad/m)', 'f (GHz): ω–β diagram; chord slope = vp, tangent = vg'); tl.line('d', fx.map((v) => beta(v, fc)), fx.map((v) => v / GHz), { color: '--c-B' }); tl.line('light', [0, 500], [0, 500 * C0 / (2 * Math.PI) / GHz], { color: '--ink-dim', dashed: true, width: 1 });
            if (f > fc) { tl.line('ch', [0, bf * 1.4], [0, state.f * 1.4], { color: '--c-I', width: 1.4 }); const sl = Vg / (2 * Math.PI) / GHz; tl.line('tg', [bf - 150, bf + 150], [state.f - 150 * sl, state.f + 150 * sl], { color: '--c-v', width: 1.4 }); tl.dots('p', [bf], [state.f], { color: '--accent', size: 10 }); } else { tl.hide('ch'); tl.hide('tg'); }
            tr.range([0, 25], [0, 3]); tr.titles('f (GHz)', 'vp / c (orange) and vg / c (green): vp·vg = c²'); tr.line('vp', fx.map((v) => v / GHz), fx.map((v) => Math.min(3, vp(v, fc) / C0)), { color: '--c-I' }); tr.line('vg', fx.map((v) => v / GHz), fx.map((v) => vg(v, fc) / C0), { color: '--c-v' }); tr.line('c', [0, 25], [1, 1], { color: '--ink-dim', dashed: true, width: 1 }); tr.line('f', [state.f, state.f], [0, 3], { color: '--accent', dashed: true, width: 1 });
            const sig = state.sig * 1e-9, L = state.L, span = 16 * sig + 2 * L / Math.max(Vg, 0.05 * C0), P = propagate(f, sig, L, fc, 16384, span), T = propagate(f, sig, L, 0, 16384, span), ns = P.t.map((t) => t * 1e9), keep = (a) => a.filter((_, i) => i % 8 === 0);
            const tEnd = Math.min(ns[ns.length - 1], (5 * sig + L / Math.max(Vg, 0.05 * C0) + 10 * sig) * 1e9);
            bot.range([0, tEnd], [-1.2, 1.2]); bot.titles('t (ns)', `pulse in (grey), after ${L} m of air line (blue), after ${L} m of guide (green)`); bot.line('x', keep(ns), keep(P.x), { color: '--c-ref', width: 1 }); bot.line('t', keep(ns), keep(T.y), { color: '--c-B', width: 1 }); bot.line('y', keep(ns), keep(P.y), { color: '--c-v', width: 1.2 });
            const below = f - 3 / (2 * Math.PI * sig) < fc;
            hud.set('a', f > fc ? `vp = ${fmt(Vp / C0)} c (faster than light — no information), vg = ${fmt(Vg / C0)} c` : 'below cutoff: nothing propagates', f > fc ? '' : 'bad'); hud.set('b', f > fc ? `the pulse arrives ${fmt((L / Vg - L / C0) * 1e9)} ns later than in air, and wider` : '—');
            hud.set('c', below ? 'part of the pulse spectrum is below cutoff: it is filtered, not just delayed ✗' : 'each frequency in the pulse has its own vg: the pulse spreads', below ? 'bad' : '');
            plots.aux.draw({ xlim: [0, 25], cursor: state.f, series: [{ x: fx.map((v) => v / GHz), y: fx.map((v) => vg(v, fc) / C0), color: '--c-v', label: 'vg / c vs f (GHz)' }] });
          }
        } else if (c === 'mode') {
          const a = state.a * mm, b = state.b * mm, m = state.m, n = state.n || (m ? 0 : 1), ar = SQR[3] / SQR[2];
          // cross-section with E arrows (blue), then the broad wall seen from above with its current (orange)
          const y0 = -2.3 * b, sp = Math.max(1.2 * a, (b + 2.6 * b) / ar); sqr.range([0.55 * a - 0.6 * sp, 0.55 * a + 0.6 * sp], [y0, y0 + 1.2 * sp * ar]); sqr.titles('', `TE${m}${n}: E across the guide (blue), broad-wall current (orange)`);
          const seg = [], nx = 10, ny = Math.max(3, Math.round(10 * b / a)); let mxE = 1e-9; const E = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = (i + 0.5) * a / nx, y = (j + 0.5) * b / ny, e = teField(m, n, a, b, x, y); E.push([x, y, e]); mxE = Math.max(mxE, Math.hypot(...e)); }
          const cw = Math.cos(wt), s = 0.9 * a / nx * Math.sign(cw || 1) * (0.35 + 0.65 * Math.abs(cw)); for (const [x, y, e] of E) seg.push(sqr.mx(x), sqr.my(y), 0.003, sqr.mx(x + s * e[0] / mxE * 2), sqr.my(y + s * e[1] / mxE * 2), 0.003); lines.segments(seg);
          const box = []; const B = (x0, y0, x1, y1) => box.push(sqr.mx(x0), sqr.my(y0), 0.002, sqr.mx(x1), sqr.my(y0), 0.002, sqr.mx(x1), sqr.my(y0), 0.002, sqr.mx(x1), sqr.my(y1), 0.002, sqr.mx(x1), sqr.my(y1), 0.002, sqr.mx(x0), sqr.my(y1), 0.002, sqr.mx(x0), sqr.my(y1), 0.002, sqr.mx(x0), sqr.my(y0), 0.002);
          const wy0 = -0.5 * b - 1.6 * b, wy1 = -0.4 * b; B(0, 0, a, b); B(0, wy0, a, wy1); grid.segments(box);
          const cur = []; if (m === 1 && n === 0) for (let j = 0; j < 8; j++) for (let i = 0; i < 9; i++) { const x = (i + 0.5) * a / 9, z = wy0 + (j + 0.5) * (wy1 - wy0) / 8, ph = wt - 2 * Math.PI * (j / 8), J = te10Current(x, a, ph), sc = 0.4 * a / 9; cur.push(sqr.mx(x), sqr.my(z), 0.003, sqr.mx(x + sc * J[0]), sqr.my(z + sc * J[1]), 0.003); } lines2.segments(cur);
          const sl = state.slot, slot = sl === 'centre' ? [[a / 2, wy0 + 0.3 * (wy1 - wy0)], [a / 2, wy0 + 0.7 * (wy1 - wy0)]] : sl === 'offset' ? [[0.78 * a, wy0 + 0.3 * (wy1 - wy0)], [0.78 * a, wy0 + 0.7 * (wy1 - wy0)]] : [[0.3 * a, (wy0 + wy1) / 2], [0.7 * a, (wy0 + wy1) / 2]];
          sqr.line('slot', slot.map((p) => p[0]), slot.map((p) => p[1]), { color: '--c-north', width: 6 });
          const rad = m === 1 && n === 0 ? sl !== 'centre' : null, fc = cutoff(m, n, a, b);
          hud.set('a', `TE${m}${n}: ${m} half-wave${m === 1 ? '' : 's'} across a, ${n} across b; cutoff ${fmt(fc / GHz)} GHz`); hud.set('b', m === 1 && n === 0 ? (rad ? 'the slot cuts across current lines: it radiates ✓' : 'the centred longitudinal slot lies along the current: invisible, no radiation') : 'wall-current view shown for TE10', rad ? 'good' : '');
          hud.set('c', 'J_s = n̂ × H: a slot radiates only if it interrupts the wall current');
          plots.aux.draw({ xlim: [0, a / mm], series: [{ x: Array.from({ length: 101 }, (_, i) => i * a / mm / 100), y: Array.from({ length: 101 }, (_, i) => Math.abs(Math.sin(m * Math.PI * i / 100))), color: '--c-B', label: '|E| across the width (mm) at mid-height' }] });
        } else {
          const { n1, n2, ang } = state, h = state.h, lam = state.lam, thc = Math.asin(n2 / n1) / deg, S = slabModes(h * 1e-6, n1, n2, lam * 1e-6), trap = ang > thc;
          // ray in the slab: core |x| < h, bounce at the walls; below θc part of it escapes
          tl.range([0, 40], [-2.2 * h, 2.2 * h]); tl.titles('z (µm)', `ray at ${ang}° to the normal; critical angle ${fmt(thc)}°`); tl.line('c1', [0, 40], [h, h], { color: '--c-ref', width: 1.4 }); tl.line('c2', [0, 40], [-h, -h], { color: '--c-ref', width: 1.4 });
          const zs = [0], xs = [0], tanA = Math.tan(ang * deg); let z = 0, x = 0, dir = 1, k = 0; while (z < 40 && k < 200) { const dz = (h - dir * x) * tanA; z += dz; x = dir * h; zs.push(z); xs.push(x); dir = -dir; k++; } tl.line('ray', zs, xs, { color: '--c-v', width: 1.6 });
          if (!trap) { const th2 = Math.asin(Math.min(1, n1 / n2 * Math.sin(ang * deg))), z1 = zs[1]; tl.line('out', [z1, z1 + 2 * h / Math.tan(Math.PI / 2 - th2)], [h, 3 * h], { color: '--c-north', width: 1.6 }); } else tl.hide('out');
          const xh = Array.from({ length: 300 }, (_, i) => -3 + 6 * i / 299); tr.range([-3, 3], [-1.2, 1.2]); tr.titles('x / h (core between the lines)', `${S.modes.length} guided mode${S.modes.length === 1 ? '' : 's'}: fields leak into the cladding`);
          S.modes.slice(0, 6).forEach((md, i) => tr.line(`m${i}`, xh, xh.map((q) => slabProfile(md, q)), { color: ['--c-B', '--c-I', '--c-v', '--c-E', '--c-F', '--c-north'][i], width: 1.6 })); for (let i = S.modes.length; i < 6; i++) tr.hide(`m${i}`); tr.line('l', [-1, -1], [-1.2, 1.2], { color: '--c-ref', width: 1 }); tr.line('r', [1, 1], [-1.2, 1.2], { color: '--c-ref', width: 1 });
          const hs = Array.from({ length: 150 }, (_, i) => 0.1 + i * 0.1), NA = Math.sqrt(n1 * n1 - n2 * n2); bot.range([0, 15], [0, 12]); bot.titles('core half-thickness (µm)', 'number of guided modes (blue) and V/(π/2) (dashed)'); bot.line('n', hs, hs.map((q) => slabModes(q * 1e-6, n1, n2, lam * 1e-6).modes.length), { color: '--c-B' }); bot.line('V', hs, hs.map((q) => 2 * Math.PI / lam * q * NA / (Math.PI / 2)), { color: '--ink-dim', dashed: true, width: 1 }); bot.dots('now', [h], [S.modes.length], { color: '--accent', size: 10 });
          hud.set('a', trap ? `${ang}° > θc = ${fmt(thc)}°: total internal reflection, trapped ✓` : `${ang}° < θc: part of the light escapes at each bounce ✗`, trap ? 'good' : 'bad'); hud.set('b', `NA = √(n₁² − n₂²) = ${fmt(NA)} (acceptance ±${fmt(Math.asin(Math.min(1, NA)) / deg)}° in air)`);
          hud.set('c', `V = (2π h/λ)·NA = ${fmt(S.V)}: ${S.V < Math.PI / 2 ? 'single-mode (V < π/2)' : `${S.modes.length} modes`}`);
          plots.aux.draw({ xlim: [-3, 3], series: S.modes.slice(0, 1).map((md) => ({ x: xh, y: xh.map((q) => slabProfile(md, q) ** 2), color: '--c-B', label: 'fundamental mode intensity vs x/h' })) });
        }
      },
      theme() { for (const k of all) k.theme(); for (const o of extra) o.theme(); },
    };
  },
};
