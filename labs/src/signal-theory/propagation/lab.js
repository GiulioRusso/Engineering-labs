// Propagation and simple antennas: the Friis link budget and free-space loss, the two-ray ground
// reflection with its breakpoint, a Yagi–Uda built from parasitic dipoles, and the microstrip patch.
import { createChart } from '../../lib/viz/chart.js';
import { createPolar, dbToR } from '../../lib/viz/polar.js';
import { fspl, friis, twoRay, breakpoint, yagi, yagiPattern, patchE, patchH, directivity2D } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const deg = Math.PI / 180, GHz = 1e9;
const TL = [-4.3, 0.55, 4.0, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0], TOP = [-4.3, 0.55, 8.85, 2.0], LEFT = [-4.3, -2.35, 3.2, 4.9];
const ds = Array.from({ length: 300 }, (_, i) => 10 ** (0 + 5 * i / 299));
const ths = Array.from({ length: 721 }, (_, i) => -180 + i * 0.5);

export default {
  id: 'propagation', title: 'Propagation', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { Pt: 20, Gt: 2, Gr: 2, f: 2.4, d: 1000, sens: -90, ht: 10, hr: 1.5, nd: 4, sp: 0.25, ph: 100, W: 0.6, L: 0.49, h: 0.04, floor: -30 },
  cases: [
    { id: 'friis', label: 'Free-space link', set: {}, examples: [
      { id: 'far', label: '10 km: out of range', controls: ['d'], set: { d: 10000 } },
      { id: 'dish', label: '30 dBi dishes: 50 km', controls: ['Gt', 'Gr', 'd'], set: { Gt: 30, Gr: 30, d: 50000 } },
      { id: 'mm', label: '60 GHz: +28 dB of loss', controls: ['f'], set: { f: 60 } },
    ] },
    { id: 'tworay', label: 'Ground reflection', set: {}, examples: [
      { id: 'tall', label: 'Taller mast: breakpoint moves out', controls: ['ht'], set: { ht: 50 } },
    ] },
    { id: 'yagi', label: 'Yagi–Uda', set: {}, examples: [
      { id: 'none', label: 'Dipole + reflector only', controls: ['nd'], set: { nd: 0 } },
      { id: 'long', label: '10 directors', controls: ['nd'], set: { nd: 10 } },
      { id: 'wrong', label: 'Wrong phasing: beam flips back', controls: ['ph'], set: { ph: 250 } },
    ] },
    { id: 'patch', label: 'Patch antenna', set: {}, examples: [
      { id: 'wide', label: 'Wide patch: narrow H-plane', controls: ['W'], set: { W: 1.2 } },
    ] },
  ],
  controls: [
    { title: 'Link', show: (s) => s.case === 'friis' || s.case === 'tworay', items: [
      { id: 'Pt', label: 'Transmit power', unit: 'dBm', min: -10, max: 60, step: 1 }, { id: 'Gt', label: 'Tx antenna gain', unit: 'dBi', min: 0, max: 40, step: 0.5 }, { id: 'Gr', label: 'Rx antenna gain', unit: 'dBi', min: 0, max: 40, step: 0.5 },
      { id: 'f', label: 'Frequency', unit: 'GHz', min: 0.1, max: 80, step: 0.1 }, { id: 'd', label: 'Distance', unit: 'm', min: 1, max: 100000, log: true, show: (s) => s.case === 'friis' },
      { id: 'sens', label: 'Receiver sensitivity', unit: 'dBm', min: -120, max: -40, step: 1, show: (s) => s.case === 'friis' },
      { id: 'ht', label: 'Tx height', unit: 'm', min: 1, max: 100, step: 0.5, show: (s) => s.case === 'tworay' }, { id: 'hr', label: 'Rx height', unit: 'm', min: 0.5, max: 50, step: 0.5, show: (s) => s.case === 'tworay' },
    ] },
    { title: 'Yagi', show: (s) => s.case === 'yagi', items: [
      { id: 'nd', label: 'Directors', unit: '', min: 0, max: 12, step: 1 }, { id: 'sp', label: 'Spacing', unit: 'λ', min: 0.1, max: 0.5, step: 0.01 }, { id: 'ph', label: 'Phase lag per element', unit: '°', min: 0, max: 270, step: 5 },
      { id: 'floor', label: 'Pattern floor', unit: 'dB', min: -50, max: -10, step: 5 },
    ] },
    { title: 'Patch', show: (s) => s.case === 'patch', items: [
      { id: 'W', label: 'Width W', unit: 'λ', min: 0.1, max: 1.5, step: 0.01 }, { id: 'L', label: 'Length L (≈ λ/2 in the substrate)', unit: 'λ', min: 0.3, max: 0.6, step: 0.01 }, { id: 'h', label: 'Substrate height', unit: 'λ', min: 0.01, max: 0.15, step: 0.005 },
      { id: 'floor', label: 'Pattern floor', unit: 'dB', min: -50, max: -10, step: 5 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT }), left = createChart(ctx, { box: LEFT }), tl = createChart(ctx, { box: TL });
    const pol = createPolar(ctx, { c: [1.9, -0.1], R: 2.3, from: -180, to: 179.9, rings: ['−30', '−20', '−10', '0 dB'] }), polE = createPolar(ctx, { c: [-2.2, -1.4], R: 2.0, from: -90, to: 90, rings: ['−30', '−20', '−10', '0 dB'] }), polH = createPolar(ctx, { c: [2.4, -1.4], R: 2.0, from: -90, to: 90, rings: ['−30', '−20', '−10', '0 dB'] });
    const all = [top, bot, left, tl], pols = [pol, polE, polH];
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); for (const p of pols) p.show(false); ({ friis: [top, bot], tworay: [top, bot], yagi: [left], patch: [] })[c].forEach((k) => k.show(true)); if (c === 'yagi') pol.show(true); if (c === 'patch') { polE.show(true); polH.show(true); } },
      update() {
        const c = state.case, L = { Pt: state.Pt, Gt: state.Gt, Gr: state.Gr, f: state.f * GHz, ht: state.ht, hr: state.hr };
        if (c === 'friis') {
          const lg = ds.map(Math.log10), P = ds.map((d) => friis(L, d)), Pd = friis(L, state.d), lam = 0.3 / state.f;
          top.range([0, 5], [-140, 40]); top.titles('log₁₀ distance (m)', 'received power (dBm): −20 dB per decade; red = sensitivity'); top.line('p', lg, P, { color: '--c-B' }); top.line('s', [0, 5], [state.sens, state.sens], { color: '--c-north', dashed: true, width: 1.4 }); top.dots('now', [Math.log10(state.d)], [Pd], { color: Pd >= state.sens ? '--c-v' : '--c-north', size: 12 });
          const terms = [['Pt', state.Pt], ['Gt', state.Gt], ['Gr', state.Gr], ['FSPL', -fspl(state.d, L.f)]]; let run = 0; const pts = terms.map(([, v]) => { const a = run; run += v; return [a, run]; });
          bot.range([-0.5, 5.5], [Math.min(-140, Pd - 10), 60]); bot.titles('Pt · Gt · Gr · free-space loss · received · sensitivity', 'link budget (dB)');
          pts.forEach(([a, b], i) => bot.line(`b${i}`, [i, i], [a, b], { color: b >= a ? '--c-v' : '--c-north', width: 16 })); bot.line('pr', [4, 4], [-140, Pd], { color: '--c-B', width: 16 }); bot.line('se', [5, 5], [-140, state.sens], { color: '--c-ref', width: 16 });
          const dmax = 10 ** ((state.Pt + state.Gt + state.Gr - state.sens - 20 * Math.log10(4 * Math.PI * L.f / 3e8)) / 20);
          hud.set('a', `FSPL = 20 log(4πd/λ) = ${fmt(fspl(state.d, L.f), 4)} dB at ${fmt(state.d)} m (λ = ${fmt(lam * 100)} cm)`); hud.set('b', `received ${fmt(Pd, 4)} dBm: margin ${fmt(Pd - state.sens, 3)} dB`, Pd >= state.sens ? 'good' : 'bad');
          hud.set('c', `maximum range ≈ ${fmt(dmax / 1000)} km; doubling distance or frequency costs 6 dB`);
          const fs = Array.from({ length: 101 }, (_, i) => 0.1 * 800 ** (i / 100)); plots.aux.draw({ xlim: [0.1, 80], cursor: state.f, series: [{ x: fs, y: fs.map((f) => fspl(state.d, f * GHz)), color: '--c-E', label: 'path loss (dB) vs frequency (GHz) at this distance' }] });
        } else if (c === 'tworay') {
          const lg = ds.map(Math.log10), F = ds.map((d) => friis(L, d)), T = ds.map((d) => twoRay(L, d)), db = breakpoint(L);
          top.range([0, 5], [-160, 20]); top.titles('log₁₀ distance (m)', 'free space (grey) vs two-ray (blue); breakpoint (dashed)'); top.line('f', lg, F, { color: '--c-ref', width: 1.4 }); top.line('t', lg, T, { color: '--c-B', width: 1.6 }); top.line('b', [Math.log10(db), Math.log10(db)], [-160, 20], { color: '--c-north', dashed: true, width: 1.4 });
          bot.range([0, 5], [-30, 10]); bot.titles('log₁₀ distance (m)', 'two-ray minus free space (dB): ripples, then −20 dB/decade extra'); bot.line('d', lg, T.map((v, i) => Math.max(-30, v - F[i])), { color: '--c-v' });
          hud.set('a', `breakpoint 4 hₜ hᵣ / λ = ${fmt(db / 1000)} km`); hud.set('b', 'before it the direct and reflected waves interfere: ±6 dB ripples'); hud.set('c', 'after it they nearly cancel (Γ = −1): power falls 40 dB/decade, as 1/d⁴');
          plots.aux.draw({ xlim: [0, 5], series: [{ x: lg, y: T, color: '--c-B', label: 'two-ray received power (dBm)' }] });
        } else if (c === 'yagi') {
          const els = yagi(state.nd, state.sp, state.ph), F = (p) => yagiPattern(els, p), m = Math.max(...ths.map((t) => F(t * deg))), fl = state.floor;
          pol.line('p', ths, ths.map((t) => dbToR(20 * Math.log10(F(t * deg) / m + 1e-9), -fl)), { color: '--c-B' });
          const xmax = Math.max(1, els[els.length - 1].x + 0.3); left.range([-0.6, 0.6], [-0.5, xmax]); left.titles('', 'elements (front up): reflector, driven (red), directors');
          els.forEach((e, i) => left.line(`e${i}`, [-0.25 * (i === 0 ? 1.05 : i === 1 ? 1 : 0.9), 0.25 * (i === 0 ? 1.05 : i === 1 ? 1 : 0.9)], [e.x, e.x], { color: i === 1 ? '--c-north' : '--c-I', width: 3 })); for (let i = els.length; i < 16; i++) left.hide(`e${i}`);
          const fb = 20 * Math.log10(F(0) / (F(Math.PI) + 1e-9)), D = directivity2D(F);
          hud.set('a', `${state.nd} directors spaced ${state.sp} λ: front-to-back ${fmt(fb)} dB`, fb > 10 ? 'good' : fb < 0 ? 'bad' : ''); hud.set('b', `2D directivity in this plane ≈ ${fmt(10 * Math.log10(D))} dB`);
          hud.set('c', 'only one element is fed: the others are driven by its field, and their currents lag so the waves add forward');
          const ns = Array.from({ length: 13 }, (_, i) => i); plots.aux.draw({ xlim: [0, 12], cursor: state.nd, series: [{ x: ns, y: ns.map((n) => 10 * Math.log10(directivity2D((p) => yagiPattern(yagi(n, state.sp, state.ph), p)))), color: '--c-B', label: 'directivity in this plane (dB) vs directors' }] });
        } else {
          const fl = state.floor, th = ths.filter((t) => Math.abs(t) <= 90), E = th.map((t) => patchE(t * deg, state.L, state.h)), H = th.map((t) => patchH(t * deg, state.W));
          polE.line('E', th, E.map((v) => dbToR(20 * Math.log10(v + 1e-9), -fl)), { color: '--c-B' }); polH.line('H', th, H.map((v) => dbToR(20 * Math.log10(v + 1e-9), -fl)), { color: '--c-v' });
          const bw = (arr) => { const k = th.findIndex((_, i) => arr[i] >= Math.SQRT1_2); return 2 * Math.abs(th[k]); }, bE = bw(E), bH = bw(H);
          hud.set('a', `E-plane (left, along L): ${fmt(bE)}°, H-plane (right, along W): ${fmt(bH)}°`); hud.set('b', `directivity ≈ 41253/(θE θH) = ${fmt(10 * Math.log10(41253 / (bE * bH)))} dBi`); hud.set('c', 'two radiating slots at the patch ends, half a wavelength apart: they add broadside, cancel sideways; the ground plane blocks the back');
          const Ws = Array.from({ length: 141 }, (_, i) => 0.1 + i * 0.01); plots.aux.draw({ xlim: [0.1, 1.5], cursor: state.W, series: [{ x: Ws, y: Ws.map((w) => bw(th.map((t) => patchH(t * deg, w)))), color: '--c-v', label: 'H-plane beamwidth (°) vs W (λ)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); for (const p of pols) p.theme(); },
    };
  },
};
