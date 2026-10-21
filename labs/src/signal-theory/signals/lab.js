// Signals in time and frequency: six pulse families, each taken apart in four panels (the pulse, |X(f)|
// against its closed form, the spectrum in dB on a log axis with its roll-off, and the phase), then the
// time–bandwidth product of all of them side by side.
import { createChart } from '../../lib/viz/chart.js';
import { PULSES, pair, rmsWidths, energyWithin } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const KINDS = ['rect', 'tri', 'gauss', 'sinc', 'exp', 'chirp'], COL = { rect: '--c-B', tri: '--c-I', gauss: '--c-v', sinc: '--c-north', exp: '--c-E', chirp: '--c-F' };
// roll-off guide: an envelope of |X|/|X(0)| that shows how fast each spectrum falls
const ENV = {
  rect: (f, p) => 1 / (Math.PI * f * p.tau), tri: (f, p) => 1 / (Math.PI * f * p.tau) ** 2, exp: (f, p) => p.lam / Math.hypot(p.lam, 2 * Math.PI * f),
  gauss: (f, p) => Math.exp(-2 * Math.PI ** 2 * p.sigma ** 2 * f * f), sinc: (f, p) => (f <= p.W ? 1 : 1e-6), chirp: null,
};
const ROLL = { rect: 'edges (jumps): −20 dB/decade', tri: 'kinks (no jumps): −40 dB/decade', gauss: 'smooth everywhere: faster than any power', sinc: 'a cliff at W: band-limited', exp: 'one jump at t₀: −20 dB/decade', chirp: 'flat over the swept band, then falls' };
const WIDTH = { rect: (p) => p.tau, tri: (p) => 2 * p.tau, gauss: (p) => 2.355 * p.sigma, sinc: (p) => 1 / p.W, exp: (p) => 1 / p.lam, chirp: (p) => p.tau };
const BAND = { rect: (p) => 1 / p.tau, tri: (p) => 1 / p.tau, gauss: (p) => 0.4697 / p.sigma, sinc: (p) => p.W, exp: (p) => p.lam / (2 * Math.PI), chirp: (p) => Math.abs(p.f1 - p.f0) };

export default {
  id: 'signals', title: 'Signals', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { kind: 'rect', A: 1, tau: 1, half: 0.5, T: 4, sigma: 0.5, W: 1, lam: 1, f0: 1, f1: 5, t0: 0, scale: 1 },
  cases: [
    { id: 'rect', label: 'Rectangle', set: { kind: 'rect', tau: 1 }, examples: [
      { id: 'wide', label: 'Wider pulse: narrower spectrum', controls: ['tau'], set: { tau: 3 } },
      { id: 'narrow', label: 'Narrow pulse: wide spectrum', controls: ['tau'], set: { tau: 0.25 } },
      { id: 'shift', label: 'Shift it: only the phase changes', controls: ['t0'], set: { t0: 2 } },
      { id: 'tall', label: 'Twice as tall: twice the spectrum', controls: ['A'], set: { A: 2 } },
    ] },
    { id: 'tri', label: 'Triangle', set: { kind: 'tri' }, examples: [
      { id: 'same', label: 'Same width as the rectangle', controls: ['half'], set: { half: 0.5 } },
      { id: 'wide', label: 'Wider triangle', controls: ['half'], set: { half: 1.5 } },
    ] },
    { id: 'gauss', label: 'Gaussian', set: { kind: 'gauss', sigma: 0.5 }, examples: [
      { id: 'narrow', label: 'Narrow: a wide Gaussian spectrum', controls: ['sigma'], set: { sigma: 0.15 } },
      { id: 'wide', label: 'Wide: a narrow Gaussian spectrum', controls: ['sigma'], set: { sigma: 1.5 } },
    ] },
    { id: 'sinc', label: 'Sinc', set: { kind: 'sinc', W: 1 }, examples: [
      { id: 'wide', label: 'Wider band: tighter sinc', controls: ['W'], set: { W: 3 } },
      { id: 'narrow', label: 'Narrow band: slow, long sinc', controls: ['W'], set: { W: 0.3 } },
    ] },
    { id: 'exp', label: 'Exponential', set: { kind: 'exp', lam: 1 }, examples: [
      { id: 'fast', label: 'Fast decay: wide spectrum', controls: ['lam'], set: { lam: 5 } },
      { id: 'slow', label: 'Slow decay: narrow spectrum', controls: ['lam'], set: { lam: 0.4 } },
    ] },
    { id: 'chirp', label: 'Chirp', set: { kind: 'chirp', f0: 1, f1: 5 }, examples: [
      { id: 'wide', label: 'Sweep 1 → 7 Hz: wide flat band', controls: ['f0', 'f1'], set: { f1: 7 } },
      { id: 'short', label: 'Too short: not flat any more', controls: ['T'], set: { T: 0.6 } },
      { id: 'down', label: 'Sweep down: same |X|', controls: ['f0', 'f1'], set: { f0: 5, f1: 1 } },
    ] },
    { id: 'tbp', label: 'Time–bandwidth', set: {}, examples: [
      { id: 'narrow', label: 'All narrower: all spectra wider', controls: ['scale'], set: { scale: 0.4 } },
      { id: 'wide', label: 'All wider: all spectra narrower', controls: ['scale'], set: { scale: 2.5 } },
    ] },
  ],
  controls: [
    { title: 'Pulse', show: (s) => s.case !== 'tbp', items: [
      { id: 'A', label: 'Amplitude A', unit: '', min: 0.1, max: 3, step: 0.1 },
      { id: 'tau', label: 'Width τ', unit: 's', min: 0.1, max: 4, step: 0.05, show: (s) => s.kind === 'rect' },
      { id: 'half', label: 'Half-width τ', unit: 's', min: 0.1, max: 3, step: 0.05, show: (s) => s.kind === 'tri' },
      { id: 'T', label: 'Duration T', unit: 's', min: 0.3, max: 8, step: 0.1, show: (s) => s.kind === 'chirp' },
      { id: 'sigma', label: 'Spread σ', unit: 's', min: 0.05, max: 3, step: 0.05, show: (s) => s.kind === 'gauss' },
      { id: 'W', label: 'Bandwidth W', unit: 'Hz', min: 0.1, max: 4, step: 0.05, show: (s) => s.kind === 'sinc' },
      { id: 'lam', label: 'Decay rate λ', unit: '1/s', min: 0.2, max: 8, step: 0.1, show: (s) => s.kind === 'exp' },
      { id: 'f0', label: 'Start frequency f₀', unit: 'Hz', min: 0.5, max: 8, step: 0.5, show: (s) => s.kind === 'chirp' },
      { id: 'f1', label: 'End frequency f₁', unit: 'Hz', min: 0.5, max: 8, step: 0.5, show: (s) => s.kind === 'chirp' },
      { id: 't0', label: 'Shift t₀', unit: 's', min: -3, max: 3, step: 0.1 },
    ] },
    { title: 'Scale', show: (s) => s.case === 'tbp', items: [{ id: 'scale', label: 'Common width τ', unit: 's', min: 0.2, max: 4, step: 0.05 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR });
    const all = [tl, tr, bl, br];
    return {
      changed() { for (const k of all) { k.show(false); k.show(true); } },
      update() {
        if (state.case === 'tbp') return tbp();
        const k = state.kind, p = { A: state.A, tau: k === 'tri' ? state.half : k === 'chirp' ? state.T : state.tau, sigma: state.sigma, W: state.W, lam: state.lam, f0: state.f0, f1: state.f1, t0: state.t0 };
        const S = pair(k, p), sel = (lo, hi) => S.t.map((v, i) => [v, S.x[i]]).filter(([v]) => v >= lo && v <= hi);
        const tt = sel(-5, 5), ymax = Math.max(1.2, state.A * 1.15);
        tl.range([-5, 5], [k === 'sinc' || k === 'chirp' ? -ymax : -0.2 * ymax, ymax]); tl.titles('t (s)', `x(t): ${PULSES[k].label.toLowerCase()}`);
        tl.line('x', tt.map((a) => a[0]), tt.map((a) => a[1]), { color: COL[k] });
        const fmax = 8, fi = [], fm = []; for (let i = 0; i < S.f.length; i++) if (Math.abs(S.f[i]) <= fmax) { fi.push(S.f[i]); fm.push(S.mag[i]); }
        const peak = Math.max(...fm);
        tr.range([-fmax, fmax], [0, peak * 1.15]); tr.titles('f (Hz)', PULSES[k].X ? '|X(f)|: computed (solid), formula (dashed)' : '|X(f)|: peaks at ±f, the cosine’s two halves');
        tr.line('X', fi, fm, { color: '--c-E' }); if (PULSES[k].X) tr.line('F', fi, fi.map((f) => PULSES[k].X(f, p)), { color: '--ink-dim', dashed: true, width: 1.4 }); else tr.hide('F');
        // dB on a log-frequency axis, normalised to the peak
        const lf = [], ld = [], X0 = Math.max(...S.mag); for (let i = 0; i < S.f.length; i++) if (S.f[i] > 0.05 && S.f[i] <= 40) { lf.push(Math.log10(S.f[i])); ld.push(Math.max(-90, 20 * Math.log10(S.mag[i] / X0 + 1e-12))); }
        bl.range([-1, 1.6], [-90, 5]); bl.titles('log₁₀ f (Hz)', `|X| in dB: ${ROLL[k]}`); bl.line('d', lf, ld, { color: '--c-E', width: 1.6 });
        if (ENV[k]) { const g = lf.map((l) => Math.max(-90, 20 * Math.log10(Math.min(1, ENV[k](10 ** l, p))))); bl.line('g', lf, g, { color: '--c-north', dashed: true, width: 1.4 }); } else bl.hide('g');
        // phase where the spectrum is not negligible
        // unwrapped phase from f = 0 outwards, where the spectrum is not negligible
        const i0 = S.f.findIndex((v) => v >= 0), unwrap = (dir) => { const out = []; let prev = 0, off = 0; for (let i = i0; i >= 0 && i < S.f.length && Math.abs(S.f[i]) <= fmax; i += dir) { let a = Math.atan2(S.im[i], S.re[i]) + off; while (a - prev > Math.PI) { a -= 2 * Math.PI; off -= 2 * Math.PI; } while (a - prev < -Math.PI) { a += 2 * Math.PI; off += 2 * Math.PI; } prev = a; if (S.mag[i] > 1e-3 * X0) out.push([S.f[i], a]); } return out; };
        const P = [...unwrap(-1).reverse(), ...unwrap(1)], pmax = Math.max(3.3, ...P.map((q) => Math.abs(q[1])));
        br.range([-fmax, fmax], [-pmax, pmax]); br.titles('f (Hz)', state.t0 ? `phase ∠X (rad, unwrapped): slope −2πt₀ = ${fmt(-2 * Math.PI * state.t0)} rad/Hz` : 'phase ∠X (rad, unwrapped)'); br.dots('p', P.map((q) => q[0]), P.map((q) => q[1]), { color: '--c-I', size: 3 });
        const w = rmsWidths(S.t, S.x, S.f, S.mag), B = BAND[k](p), F90 = (() => { for (let F = 0.01; F < 40; F *= 1.02) if (energyWithin(S.f, S.mag, F) >= 0.9) return F; return Infinity; })();
        hud.set('a', `duration ≈ ${fmt(WIDTH[k](p))} s · bandwidth ≈ ${fmt(B)} Hz · product ≈ ${fmt(WIDTH[k](p) * B)}`);
        hud.set('b', `90 % of the energy lies below ${fmt(F90)} Hz${k === 'sinc' ? ' — and 100 % below W' : ''}`);
        hud.set('c', `σt·σf = ${fmt(w.st * w.sf)} = ${fmt(w.st * w.sf * 4 * Math.PI)} × the bound 1/4π${k === 'gauss' ? ' ✓ the minimum' : ''}`, k === 'gauss' ? 'good' : '');
        const Fs = Array.from({ length: 120 }, (_, i) => 0.05 * 1.045 ** i); plots.aux.draw({ xlim: [0, 8], cursor: F90, series: [{ x: Fs, y: Fs.map((F) => 100 * energyWithin(S.f, S.mag, F)), color: COL[k], label: 'energy (%) inside ±F vs F (Hz)' }] });
      },
      theme() { for (const k of all) k.theme(); },
    };

    function tbp() {
      const s = state.scale, shapes = [['rect', { tau: s }], ['tri', { tau: s / 2 }], ['gauss', { sigma: s / 2.355 }], ['sinc', { W: 1 / (2 * s) }], ['exp', { lam: 1 / s }]];
      tl.range([-4, 4], [-0.3, 1.15]); tl.titles('t (s)', `five pulses, all about ${fmt(s)} s wide`);
      tr.range([-6, 6], [0, 1.1]); tr.titles('f (Hz)', '|X(f)| normalised: wider pulse ↔ narrower spectrum');
      const ratios = [];
      for (const [k, q] of shapes) {
        const p = { A: 1, tau: 1, sigma: 1, W: 1, lam: 1, f0: 1, f1: 5, t0: k === 'exp' ? -s / 2 : 0, ...q }, S = pair(k, p, 8192, 160);
        const ts = [], xs = []; for (let i = 0; i < S.t.length; i += 4) if (Math.abs(S.t[i]) <= 4) { ts.push(S.t[i]); xs.push(S.x[i]); }
        tl.line(k, ts, xs, { color: COL[k], width: 1.8 });
        const m = Math.max(...S.mag), fs = [], ms = []; for (let i = 0; i < S.f.length; i++) if (Math.abs(S.f[i]) <= 6) { fs.push(S.f[i]); ms.push(S.mag[i] / m); }
        tr.line(k, fs, ms, { color: COL[k], width: 1.8 });
        const w = rmsWidths(S.t, S.x, S.f, S.mag); ratios.push([k, w.st * w.sf * 4 * Math.PI, w]);
      }
      bl.range([-0.5, 4.5], [0, 4]); bl.titles('rect · triangle · Gaussian · sinc · exponential', 'σt·σf ÷ (1/4π): never below 1');
      ratios.forEach(([k, r], i) => bl.line(`b${k}`, [i, i], [0, Math.min(4, r)], { color: COL[k], width: 16 })); bl.line('one', [-0.5, 4.5], [1, 1], { color: '--c-north', dashed: true, width: 1.4 });
      const sfm = Math.max(1.5, ...ratios.map((q) => q[2].sf * 1.15)); br.range([0, 1.5], [0, sfm]); br.titles('σt (s)', 'σf (Hz): the forbidden zone is below the curve');
      const xs = Array.from({ length: 150 }, (_, i) => 0.05 + i * 0.01); br.line('bound', xs, xs.map((x) => 1 / (4 * Math.PI * x)), { color: '--c-north', width: 1.6 });
      ratios.forEach(([k, , w]) => br.dots(k, [w.st], [w.sf], { color: COL[k], size: 10 }));
      hud.set('a', `rect ${fmt(ratios[0][1])} (σf grows with the grid: the jumps never die) · triangle ${fmt(ratios[1][1])} · Gaussian ${fmt(ratios[2][1])}`);
      hud.set('b', 'σt·σf ≥ 1/4π ≈ 0.0796: no pulse is narrow in both domains'); hud.set('c', 'only the Gaussian sits on the bound', 'good');
      plots.aux.draw({ xlim: [0.2, 4], cursor: s, series: [{ x: Array.from({ length: 80 }, (_, i) => 0.2 + i * 0.048), y: Array.from({ length: 80 }, (_, i) => 1 / (0.2 + i * 0.048)), color: '--c-B', label: 'bandwidth ≈ 1/duration (Hz) vs duration (s)' }] });
    }
  },
};
