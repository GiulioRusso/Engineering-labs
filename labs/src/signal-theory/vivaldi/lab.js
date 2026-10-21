// The Vivaldi (tapered-slot) antenna: the exponential flare, the travelling wave leaking out along the
// slot, the field in the slot, the endfire pattern in both planes, broadband match and gain against
// frequency, the taper rate trade-off, and Vivaldis side by side in an array.
import { createChart } from '../../lib/viz/chart.js';
import { createPolar, dbToR } from '../../lib/viz/polar.js';
import { halfWidth, envelope, patternE, patternH, hpbw, gainDb, gammaTaper, gammaAperture, s11 } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const deg = Math.PI / 180, K = 2 * Math.PI;
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const TOP = [-4.3, 0.2, 8.85, 2.35], BOT = [-4.3, -2.35, 8.85, 2.0];
const SWEEP = new Map(), sweep = (p) => { const key = `${p.L},${p.Wa},${p.R}`; if (!SWEEP.has(key)) SWEEP.set(key, frs.map((f) => ({ bE: hpbw((t) => patternE(t, p, f)), bH: hpbw((t) => patternH(t, p, f)), G: gainDb(p, f) }))); return SWEEP.get(key); };
const ths = Array.from({ length: 721 }, (_, i) => -180 + i * 0.5), frs = Array.from({ length: 136 }, (_, i) => 0.3 + i * 0.02);

export default {
  id: 'vivaldi', title: 'Vivaldi antenna', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  defaults: { L: 4, Wa: 1.5, Wt: 0.05, R: 0.5, fr: 1, N: 4, de: 0.5, scan: 0, floor: -30 },
  cases: [
    { id: 'geometry', label: 'The flare', set: {}, examples: [
      { id: 'steep', label: 'Steep taper R = 1.5', controls: ['R'], set: { R: 1.5 } },
      { id: 'gentle', label: 'Almost linear R = 0.1', controls: ['R'], set: { R: 0.1 } },
    ] },
    { id: 'current', label: 'Travelling wave', set: {}, examples: [
      { id: 'steep', label: 'Steep taper: leaks out early', controls: ['R'], set: { R: 1.5 } },
    ] },
    { id: 'field', label: 'Field in the slot', set: {}, examples: [
      { id: 'high', label: 'At 2 f₀: shorter waves', controls: ['fr'], set: { fr: 2 } },
    ] },
    { id: 'pattern', label: 'Endfire pattern', set: {}, examples: [
      { id: 'low', label: 'At 0.5 f₀: wide beam', controls: ['fr'], set: { fr: 0.5 } },
      { id: 'high', label: 'At 2.5 f₀: narrow beam', controls: ['fr'], set: { fr: 2.5 } },
    ] },
    { id: 'band', label: 'Bandwidth and gain', set: {}, examples: [
      { id: 'short', label: 'Short antenna L = 1.5 λ₀', controls: ['L'], set: { L: 1.5 } },
      { id: 'narrow', label: 'Small opening: low band edge moves up', controls: ['Wa'], set: { Wa: 0.6 } },
    ] },
    { id: 'array', label: 'Vivaldi array', set: {}, examples: [
      { id: 'scan', label: 'Scan to 40°', controls: ['scan'], set: { scan: 40 } },
      { id: 'grating', label: 'High frequency: grating lobes', controls: ['fr', 'scan'], set: { fr: 2.2, scan: 30 } },
    ] },
  ],
  controls: [
    { title: 'Antenna', items: [
      { id: 'L', label: 'Length L', unit: 'λ₀', min: 1, max: 8, step: 0.1 }, { id: 'Wa', label: 'Opening Wa', unit: 'λ₀', min: 0.3, max: 3, step: 0.05 },
      { id: 'R', label: 'Taper rate R', unit: '1/λ₀', min: 0.05, max: 2, step: 0.05 },
      { id: 'fr', label: 'Frequency f/f₀', unit: '', min: 0.3, max: 3, step: 0.01, show: (s) => ['field', 'pattern', 'array'].includes(s.case) },
      { id: 'floor', label: 'Pattern floor', unit: 'dB', min: -50, max: -10, step: 5, show: (s) => s.case === 'pattern' || s.case === 'array' },
    ] },
    { title: 'Array', show: (s) => s.case === 'array', items: [
      { id: 'N', label: 'Elements', unit: '', min: 1, max: 12, step: 1 }, { id: 'de', label: 'Spacing', unit: 'λ₀', min: 0.3, max: 1.2, step: 0.01 },
      { id: 'scan', label: 'Scan', unit: '°', min: -60, max: 60, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR }), top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT });
    const polE = createPolar(ctx, { c: [-2.2, -1.5], R: 2.0, from: -90, to: 90, rings: ['−30', '−20', '−10', '0 dB'] }), polH = createPolar(ctx, { c: [2.4, -1.5], R: 2.0, from: -90, to: 90, rings: ['−30', '−20', '−10', '0 dB'] }), all = [tl, tr, bl, br, top, bot], pols = [polE, polH];
    const P = () => ({ L: state.L, Wa: state.Wa, Wt: state.Wt, R: state.R });
    const outline = (ch, p, ext = 0) => { const xs = Array.from({ length: 200 }, (_, i) => p.L * i / 199), hw = xs.map((x) => halfWidth(x, p)), H = Math.max(p.Wa / 2 + 0.4, 1); ch.line('up', xs, hw, { color: '--c-I', width: 2.4 }); ch.line('dn', xs, hw.map((v) => -v), { color: '--c-I', width: 2.4 }); ch.line('box', [0, p.L, p.L, 0, 0], [H, H, -H, -H, H], { color: '--ink-dim', width: 1 }); ch.line('feed', [ext, ext], [-0.1, 0.1], { color: '--c-north', width: 4 }); return { xs, hw, H }; };
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); for (const p of pols) p.show(false); ({ geometry: [top, bot], current: [top, bot], field: [top, bot], pattern: [], band: [tl, tr, bl, br], array: [] })[c].forEach((k) => k.show(true)); if (c === 'pattern' || c === 'array') { polE.show(true); polH.show(c === 'pattern'); } ctx.setDuration(c === 'current' || c === 'field' ? 4 : 0); },
      update() {
        const c = state.case, p = P(), wt = 2 * Math.PI * (time.t % 4) / 4, fr = state.fr;
        if (c === 'geometry') {
          const ar = TOP[3] / TOP[2]; top.range([-0.3, state.L + 0.3], [-(state.L + 0.6) * ar / 2, (state.L + 0.6) * ar / 2]); top.titles('x (λ₀): the feed at left, the opening at right', 'the two metal flares (orange) and the slot between them');
          outline(top, p);
          const xs = Array.from({ length: 200 }, (_, i) => state.L * i / 199); bot.range([0, state.L], [0, state.Wa * 1.15]); bot.titles('x (λ₀)', 'slot width w(x) (blue) and where w ≈ λ/2 for f₀, 2f₀, 3f₀ (dashed)');
          bot.line('w', xs, xs.map((x) => 2 * halfWidth(x, p)), { color: '--c-B' }); [1, 2, 3].forEach((k) => { const xr = xs.find((x) => 2 * halfWidth(x, p) >= 0.5 / k); bot.line(`r${k}`, xr !== undefined ? [xr, xr] : [-1, -1], [0, state.Wa * 1.15], { color: ['--c-v', '--c-E', '--c-north'][k - 1], dashed: true, width: 1.2 }); });
          hud.set('a', `w(x) = c₁e^{Rx} + c₂: from ${state.Wt} λ₀ at the throat to ${state.Wa} λ₀ at the opening over ${state.L} λ₀`); hud.set('b', 'each frequency radiates mostly where the slot is about half its wavelength wide'); hud.set('c', 'high frequencies leave near the throat, low ones near the opening: a frequency-independent shape');
          plots.aux.draw({ xlim: [0, state.L], series: [{ x: xs, y: xs.map((x) => 2 * halfWidth(x, p)), color: '--c-B', label: 'w(x) (λ₀)' }] });
        } else if (c === 'current' || c === 'field') {
          const ar = TOP[3] / TOP[2], L = state.L; top.range([-0.3, L + 0.3], [-(L + 0.6) * ar / 2, (L + 0.6) * ar / 2]);
          const { xs: ex, env } = envelope(p, 300), kk = K * (c === 'field' ? fr : 1);
          if (c === 'current') {
            outline(top, p); const seg = ex.filter((_, i) => i % 6 === 0); top.stems('j', seg, seg.map((x, i) => halfWidth(x, p) + 0.25 * env[i * 6] * Math.cos(kk * x - wt)), { color: '--c-B', width: 2 }); top.hide('img'); top.titles('x (λ₀)', 'current on the flare edges (blue bars): a wave travelling toward the opening');
            bot.range([0, L], [-1.2, 1.2]); bot.titles('x (λ₀)', 'J(x, t) (blue) inside its envelope e^{−∫α dx} (dashed): leaking away as it goes'); bot.line('j', ex, ex.map((x, i) => env[i] * Math.cos(kk * x - wt)), { color: '--c-B' }); bot.line('e1', ex, env, { color: '--c-I', dashed: true, width: 1.2 }); bot.line('e2', ex, env.map((v) => -v), { color: '--c-I', dashed: true, width: 1.2 });
            hud.set('a', `${fmt(100 * (1 - env[env.length - 1] ** 2))} % of the power has left before the opening`); hud.set('b', 'leakage rate α grows with the slot width: the wider it gets, the faster it radiates'); hud.set('c', 'a travelling-wave antenna: no resonance, hence broadband');
          } else {
            const nx = 180, ny = 110, H = (L + 0.6) * ar / 2, img = new Float64Array(nx * ny);
            for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = -0.3 + (L + 0.6) * i / (nx - 1), y = -H + 2 * H * j / (ny - 1); if (x < 0) { img[j * nx + i] = 0; continue; } if (x > L) { const r = Math.hypot(x - L, y); img[j * nx + i] = env[env.length - 1] * Math.cos(kk * (L + r) - wt) * Math.exp(-((Math.atan2(y, x - L)) ** 2) * 3) / Math.sqrt(1 + 2 * r) * 1.2; continue; } const hw = halfWidth(x, p), e = env[Math.min(env.length - 1, Math.round(x / L * (env.length - 1)))]; img[j * nx + i] = Math.abs(y) <= hw + 0.15 ? e * Math.exp(-Math.abs(y) / (hw + 0.05)) / Math.sqrt(2 * hw + 0.05) * 0.25 * Math.cos(kk * x - wt) : 0; }
            top.image('img', img, nx, ny, { map: 'field', norm: (v) => 0.5 + Math.max(-0.5, Math.min(0.5, v)) }); outline(top, p); top.hide('j'); top.titles('x (λ₀)', `E across the slot at ${fr} f₀: bound near the throat, spreading out into free space`);
            bot.range([0, L], [0, 1.05]); bot.titles('x (λ₀)', 'fraction of the wave still guided'); bot.line('j', ex, env.map((v) => v * v), { color: '--c-v' }); bot.hide('e1'); bot.hide('e2');
            hud.set('a', 'near the throat the field is squeezed in a narrow slot: a guided slot-line wave'); hud.set('b', 'as the slot opens, the field spreads and its speed approaches c: it peels off into free space'); hud.set('c', `wavelength along the slot at ${fr} f₀: ${fmt(1 / fr)} λ₀`);
          }
          plots.aux.draw({ xlim: [0, L], series: [{ x: ex, y: env, color: '--c-I', label: 'guided amplitude vs x (λ₀)' }] });
        } else if (c === 'pattern') {
          const fl = state.floor, E = ths.map((t) => patternE(t * deg, p, fr)), Hh = ths.map((t) => patternH(t * deg, p, fr));
          polE.line('E', ths, E.map((v) => dbToR(20 * Math.log10(v + 1e-9), -fl)), { color: '--c-B' }); polH.line('H', ths, Hh.map((v) => dbToR(20 * Math.log10(v + 1e-9), -fl)), { color: '--c-v' });
          const bE = hpbw((t) => patternE(t, p, fr)), bH = hpbw((t) => patternH(t, p, fr));
          hud.set('a', `E-plane (left, in the plane of the slot): ${fmt(bE)}° wide · H-plane (right): ${fmt(bH)}°`); hud.set('b', `gain ≈ 41253/(θE θH) = ${fmt(gainDb(p, fr))} dBi`); hud.set('c', 'endfire: the beam leaves along the slot axis (up in both plots)');
          plots.aux.draw({ xlim: [0.3, 3], cursor: fr, series: [{ x: frs, y: sweep(p).map((q) => q.bE), color: '--c-B', label: 'E-plane beamwidth (°)' }, { x: frs, y: sweep(p).map((q) => q.bH), color: '--c-v', label: 'H-plane beamwidth (°) vs f/f₀' }] });
        } else if (c === 'band') {
          const S = frs.map((f) => s11(p, f)), G = sweep(p).map((q) => q.G), ok = frs.filter((_, i) => S[i] < -10), lo = ok[0], hi = ok[ok.length - 1];
          tl.range([0.3, 3], [-40, 0]); tl.titles('f / f₀', 'S11 (dB): below −10 dB is a good match'); tl.line('s', frs, S, { color: '--c-B' }); tl.line('m', [0.3, 3], [-10, -10], { color: '--c-north', dashed: true, width: 1 });
          tr.range([0.3, 3], [0, 1]); tr.titles('f / f₀', '|Γ| from the taper (blue) and from a too-small opening (orange)'); tr.line('t', frs, frs.map((f) => gammaTaper(p, f)), { color: '--c-B' }); tr.line('a', frs, frs.map((f) => gammaAperture(p, f)), { color: '--c-I' });
          bl.range([0.3, 3], [0, 20]); bl.titles('f / f₀', 'gain (dBi): grows with electrical size'); bl.line('g', frs, G, { color: '--c-v' });
          br.range([0.3, 3], [0, 180]); br.titles('f / f₀', 'beamwidth (°): E-plane (blue), H-plane (green)'); br.line('e', frs, sweep(p).map((q) => q.bE), { color: '--c-B' }); br.line('h', frs, sweep(p).map((q) => q.bH), { color: '--c-v' });
          hud.set('a', lo ? `matched from ${fmt(lo)} to ${hi >= 2.99 ? '3+' : fmt(hi)} f₀: ${hi >= 2.99 ? 'more than' : ''} ${fmt(hi / lo)}:1 bandwidth` : 'nowhere below −10 dB', lo ? 'good' : 'bad');
          hud.set('b', `low edge set by the opening: Wa ≈ λ/2 at ${fmt(0.5 / state.Wa)} f₀`); hud.set('c', 'the taper is an exponential impedance transformer from 50 Ω to 377 Ω (|Γ| ∝ sin βL / βL)');
          plots.aux.draw({ xlim: [0.3, 3], series: [{ x: frs, y: S.map((v) => Math.max(-60, v)), color: '--c-B', label: 'S11 (dB) vs f/f₀' }] });
        } else {
          const { N, de } = state, s0 = state.scan * deg, k = K * fr, fl = state.floor, th90 = ths.filter((t) => Math.abs(t) <= 90);
          const af = (th) => { const psi = k * de * (Math.sin(th) - Math.sin(s0)), d = N * Math.sin(psi / 2); return Math.abs(Math.sin(psi / 2)) < 1e-9 ? 1 : Math.abs(Math.sin(N * psi / 2) / d); };
          const tot = th90.map((t) => af(t * deg) * patternH(t * deg, p, fr)), el = th90.map((t) => patternH(t * deg, p, fr));
          polE.line('E', th90, tot.map((v) => dbToR(20 * Math.log10(v + 1e-9), -fl)), { color: '--c-B' }); polE.line('el', th90, el.map((v) => dbToR(20 * Math.log10(v + 1e-9), -fl)), { color: '--c-ref', dashed: true, width: 1.2 }); polE.ray('s', state.scan, { color: '--c-v' });
          const gl = []; for (let m = -3; m <= 3; m++) if (m) { const sv = Math.sin(s0) + m / (de * fr); if (Math.abs(sv) <= 1) gl.push(Math.asin(sv) / deg); }
          hud.set('a', `${N} Vivaldis, ${de} λ₀ apart = ${fmt(de * fr)} λ at ${fr} f₀`); hud.set('b', gl.length ? `grating lobe at ${gl.map((v) => fmt(v)).join(', ')}° ✗ — the spacing that is fine at f₀ is too wide here` : 'no grating lobes ✓', gl.length ? 'bad' : 'good');
          hud.set('c', 'total = element pattern (dashed) × array factor; Vivaldis tile tightly, so wideband arrays use them');
          plots.aux.draw({ xlim: [0.3, 3], cursor: fr, series: [{ x: frs, y: frs.map((f) => 1 / (de * f) - 1), color: '--c-north', label: 'max grating-free scan sin θ = λ/d − 1 vs f/f₀' }] });
        }
      },
      theme() { for (const k of all) k.theme(); for (const p of pols) p.theme(); },
    };
  },
};
