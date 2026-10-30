// Diffraction: one slit (intensity, phasor chain, screen) and gratings of N slits, with two close
// wavelengths to resolve. Static: the controls change the pattern.
import { createChart } from '../../lib/viz/chart.js';
import { single, grating, phasors } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -1.25, 3.5, 0.8], deg = Math.PI / 180, um = 1e-6, nm = 1e-9, NP = 1500;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
// approximate colour of a wavelength (nm), components 0–1
function spectral(l, out) {
  let r = 0, g = 0, b = 0;
  if (l < 440) { r = (440 - l) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = (510 - l) / 20; }
  else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = (645 - l) / 65; } else r = 1;
  out[0] = r; out[1] = g; out[2] = b; return out;
}

export default {
  id: 'diffraction', title: 'Diffraction and gratings', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { N: 1, a: 5 * um, d: 5 * um, lam: 550 * nm, lam2: 0, th: 3 * deg },
  cases: [
    { id: 'single', label: 'Single slit', controls: ['a', 'lam'], set: { N: 1, a: 5 * um, lam: 550 * nm, lam2: 0, th: 3 * deg }, examples: [
      { id: 'wide', label: 'Wider slit: narrower pattern', set: { a: 10 * um } },
      { id: 'narrow', label: 'Narrow slit: wide spread', set: { a: 2.5 * um } },
      { id: 'red', label: 'Red light spreads more', set: { lam: 650 * nm } },
    ] },
    { id: 'phasor', label: 'Phasors', controls: ['th', 'a'], set: { N: 1, a: 5 * um, lam: 550 * nm, lam2: 0, th: 3 * deg }, examples: [
      { id: 'first-zero', label: 'First zero: the chain closes', set: { th: Math.asin(0.11) } },
      { id: 'side', label: 'First side maximum: 4.7 %', set: { th: Math.asin(1.4303 * 0.11) } },
    ] },
    { id: 'grating', label: 'Grating', controls: ['N', 'd', 'lam'], set: { N: 5, a: 1 * um, d: 5 * um, lam: 550 * nm, lam2: 0, th: 3 * deg }, examples: [
      { id: 'n2', label: 'Two slits', set: { N: 2 } },
      { id: 'n20', label: 'Twenty slits: sharp lines', set: { N: 20 } },
      { id: 'blur', label: '550 and 570 nm, 10 slits: blurred', controls: ['N', 'lam2'], set: { N: 10, lam2: 570 * nm } },
      { id: 'sharp', label: 'Same, 40 slits: resolved', controls: ['N', 'lam2'], set: { N: 40, lam2: 570 * nm } },
    ] },
  ],
  controls: [
    { title: 'Light', items: [
      { id: 'lam', label: 'Wavelength λ', unit: 'nm', k: 1e9, min: 400 * nm, max: 700 * nm, step: nm },
      { id: 'lam2', label: 'Second wavelength (0: off)', unit: 'nm', k: 1e9, min: 0, max: 700 * nm, step: nm, show: (s) => s.case === 'grating' },
    ] },
    { title: 'Slits', items: [
      { id: 'a', label: 'Slit width a', unit: 'µm', k: 1e6, min: 0.5 * um, max: 20 * um, step: 0.1 * um },
      { id: 'N', label: 'Number of slits N', unit: '', min: 1, max: 40, step: 1, show: (s) => s.case === 'grating' },
      { id: 'd', label: 'Slit spacing d', unit: 'µm', k: 1e6, min: 1 * um, max: 20 * um, step: 0.1 * um, show: (s) => s.case === 'grating' },
      { id: 'th', label: 'Probe angle θ', unit: '°', k: 1 / deg, min: 0, max: 30 * deg, step: 0.05 * deg, show: (s) => s.case !== 'grating' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 'θ', xUnit: '°', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR, yTicks: false, grid: false }), charts = [sq, tr, br];
    const cap = ctx.label('', 'tick'); scene.add(cap);
    const rgb = [0, 0, 0], c2 = [0, 0, 0];
    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); },
      update() {
        const g = state.case === 'grating', N = g ? Math.round(state.N) : 1, a = state.a, d = Math.max(state.d, a), lam = state.lam, l2 = g && state.lam2 > 0 ? state.lam2 : 0;
        const I = (th, l) => (g ? grating(th, N, a, d, l) : single(th, a, l));
        const smax = Math.min(0.95, g ? 2.6 * Math.max(lam, l2) / d : 3.5 * lam / a), tmax = Math.asin(smax) / deg, ths = lin(-tmax, tmax, NP);
        const Y1 = ths.map((t) => I(t * deg, lam)), Y2 = l2 ? ths.map((t) => I(t * deg, l2)) : null, Ys = Y2 ? Y1.map((v, i) => v + Y2[i]) : Y1;
        // main chart: intensity against angle (phasor case: the phasor chain is the main picture)
        const main = state.case === 'phasor' ? tr : sq, side = state.case === 'phasor' ? sq : tr;
        main.range([-tmax, tmax], [0, Y2 ? 2.1 : 1.05]); main.titles('angle θ (°)', g ? 'intensity: grating (solid), one slit alone (dashed)' : 'intensity I/I₀ = sinc²(πa sin θ/λ)');
        main.line('I', ths, Ys, { color: '--c-E', width: 2 });
        if (g) main.line('env', ths, ths.map((t) => single(t * deg, a, lam) * (Y2 ? 2 : 1)), { color: '--ink-dim', dashed: true, width: 1.2 }); else main.hide('env');
        if (!g) { main.line('probe', [state.th / deg, state.th / deg], [0, 1.05], { color: '--accent', dashed: true, width: 1.2 }); main.dots('q', [state.th / deg], [single(state.th, a, lam)], { color: '--accent', size: 10 }); } else { main.hide('probe'); main.dots('q', [], []); }
        // phasor chain at the probe angle (single slit), or N = 2, 5, 20 compared (grating)
        if (!g) {
          const P = phasors(state.th, a, lam, 60); // equal scales on both axes, so circles stay round
          if (side === sq) side.range([-4, 62], [-10, 56]); else side.range([-4, -4 + 46 * TR[2] / TR[3]], [-4, 42]); side.titles('', 'phasors: 60 wavelets across the slit, tip to tail; resultant (dashed)');
          side.line('chain', P.pts.map((p) => p[0]), P.pts.map((p) => p[1]), { color: '--c-B', width: 2.2 });
          side.line('res', [0, P.pts.at(-1)[0]], [0, P.pts.at(-1)[1]], { color: '--accent', dashed: true, width: 2 });
          side.line('ref', [0, 60], [0, 0], { color: '--ink-dim', dashed: true, width: 1 });
          for (const n of [2, 20]) side.hide(`n${n}`);
        } else {
          side.range([-tmax, tmax], [0, 1.05]); side.titles('angle θ (°)', 'N = 2 (blue), 20 (orange): more slits, sharper lines');
          side.line('n2', ths, ths.map((t) => grating(t * deg, 2, a, d, lam)), { color: '--c-B', width: 1.4 }); side.line('n20', ths, ths.map((t) => grating(t * deg, 20, a, d, lam)), { color: '--c-I', width: 1.4 });
          for (const k of ['chain', 'res', 'ref']) side.hide(k);
        }
        // the screen, in the colour of the light
        br.range([-tmax, tmax], [0, 1]); br.titles('angle θ (°)', '');
        br.image('screen', null, NP, 1, { rgb: (k, out) => {
          spectral(lam / nm, rgb); const s1 = Math.min(1, Math.sqrt(Y1[k])); out[0] = rgb[0] * s1; out[1] = rgb[1] * s1; out[2] = rgb[2] * s1;
          if (Y2) { spectral(l2 / nm, c2); const s2 = Math.min(1, Math.sqrt(Y2[k])); out[0] = Math.min(1, out[0] + c2[0] * s2); out[1] = Math.min(1, out[1] + c2[1] * s2); out[2] = Math.min(1, out[2] + c2[2] * s2); }
        } });
        cap.element.textContent = 'what you see on a screen (brightness ∝ √I so the faint fringes show)'; cap.position.set(BR[0] + BR[2] / 2, BR[1] + BR[3] + 0.15, 0.02); cap.visible = true;
        const z = Math.asin(Math.min(1, lam / a)) / deg;
        if (g) { // zoom on the first order, where two close wavelengths separate (or not)
          const m1 = Math.asin(Math.min(0.99, lam / d)) / deg, zs = lin(m1 - 0.7, m1 + 0.9, 800), Z = zs.map((t) => I(t * deg, lam) + (l2 ? I(t * deg, l2) : 0));
          plots.aux.draw({ xlim: [zs[0], zs.at(-1)], series: [{ x: zs, y: Z, color: '--c-E', label: 'zoom on the first order: intensity' }] });
        } else plots.aux.draw({ xlim: [-tmax, tmax], series: [{ x: ths, y: Ys.map((v) => Math.log10(Math.max(v, 1e-6))), color: '--c-E', label: 'log₁₀ intensity: the faint fringes' }], ylim: [-5, 0.5] });
        if (!g) {
          const P = phasors(state.th, a, lam, 60);
          hud.set('a', `first zeros at sin θ = ±λ/a: θ = ±${fmt(z)}°; central peak ${fmt(2 * z)}° wide`);
          hud.set('b', `at θ = ${fmt(state.th / deg)}°: edge-to-edge path difference a sin θ = ${fmt(a * Math.sin(state.th) / lam)} λ, I/I₀ = ${fmt(single(state.th, a, lam))} (60 phasors: ${fmt(P.I)})`);
          hud.set('c', 'a narrower slit or a longer wavelength spreads the light more: θ ≈ λ/a');
        } else {
          const m1 = Math.asin(Math.min(1, lam / d)) / deg, R = lam / Math.abs(l2 - lam);
          hud.set('a', `principal maxima at d sin θ = mλ: first order at ${fmt(m1)}°; ${N - 2 > 0 ? N - 2 : 0} weak maxima between each pair`);
          hud.set('b', `line width ∝ 1/N: from a principal maximum to its first zero Δ(sin θ) = λ/(Nd) = ${fmt(lam / (N * d))}`);
          hud.set('c', l2 ? `to separate ${fmt(lam / nm)} and ${fmt(l2 / nm)} nm needs λ/Δλ = ${fmt(R)} ≤ mN: first order with N = ${N} gives ${N} — ${N >= R ? 'resolved' : 'blurred'}` : 'the single-slit envelope (dashed) decides how bright each order is', l2 ? (N >= R ? 'good' : 'bad') : '');
        }
      },
      theme() { charts.forEach((c) => c.theme()); },
    };
  },
};
