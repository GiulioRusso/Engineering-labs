// From the Fourier integral to the DFT to the FFT: correlation with a probe, winding the signal around a
// circle (the DFT bin is N × the centre of mass), the spectrum built one bin at a time, DFT dots sitting on
// the continuous transform, and the butterfly that makes the FFT fast (with timings measured here).
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { twoTones, wind, dftDirect, butterflies, bitReverse, ops } from './model.js';
import { fft } from '../../lib/dsp.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], PLANE = [0.75, -2.35, 3.8, 4.9], TR = [0.55, 0.55, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const TOP = [-4.3, 0.55, 8.85, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0];
const sinc = (u) => (Math.abs(u) < 1e-12 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u));
let TIMES = null; // measured once: DFT vs FFT wall clock in this browser
function measure() {
  const Ns = [16, 32, 64, 128, 256, 512, 1024, 2048], d = [], f = [];
  for (const N of Ns) {
    const x = twoTones(N, 3, 7), reps = Math.max(1, Math.round(20000 / (N * N)));
    let t0 = performance.now(); for (let r = 0; r < reps; r++) dftDirect(x); d.push((performance.now() - t0) / reps);
    const fr = Math.max(5, Math.round(200000 / (N * Math.log2(N)))); t0 = performance.now(); for (let r = 0; r < fr; r++) { const re = Float64Array.from(x), im = new Float64Array(N); fft(re, im); } f.push((performance.now() - t0) / fr);
  }
  return { Ns, d, f };
}

export default {
  id: 'dft', title: 'DFT and FFT', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 12,
  defaults: { f: 4, auto: true, fw: 5, path: true, kmax: 47, pw: 0.5, Nb: 64, stage: 3 },
  cases: [
    { id: 'correlate', label: 'Correlation', set: {}, examples: [
      { id: 'match', label: 'Probe on a tone: net area', controls: ['f'], set: { auto: false, f: 4 } },
      { id: 'miss', label: 'Probe between tones: no area', controls: ['f'], set: { auto: false, f: 6.5 } },
    ] },
    { id: 'wind', label: 'Winding', set: {}, examples: [
      { id: 'on', label: 'Wind at bin 5: the mass flies out', controls: ['fw'], set: { auto: false, fw: 5 } },
      { id: 'off', label: 'Wind at 8.5: balanced', controls: ['fw'], set: { auto: false, fw: 8.5 } },
      { id: 'zero', label: 'Wind at 0: the average', controls: ['fw'], set: { auto: false, fw: 0 } },
    ] },
    { id: 'bins', label: 'Bin by bin', set: {}, examples: [
      { id: 'tone', label: 'Stop on bin 6', controls: ['kmax'], set: { auto: false, kmax: 6 } },
      { id: 'mirror', label: 'Bins past N/2: the mirror', controls: ['kmax'], set: { auto: false, kmax: 42 } },
    ] },
    { id: 'bridge', label: 'DFT vs transform', set: {}, examples: [
      { id: 'narrow', label: 'Narrower pulse: wider sinc', controls: ['pw'], set: { pw: 0.15 } },
      { id: 'more', label: 'More samples: denser dots', controls: ['Nb'], set: { Nb: 256 } },
    ] },
    { id: 'fft', label: 'Why the FFT is fast', set: {}, examples: [
      { id: 'first', label: 'Stage 1: pairs', controls: ['stage'], set: { stage: 1 } },
      { id: 'last', label: 'Last stage: halves', controls: ['stage'], set: { stage: 3 } },
    ] },
  ],
  controls: [
    { title: 'Probe', show: (s) => s.case === 'correlate', items: [
      { id: 'auto', label: 'Sweep automatically', type: 'check' },
      { id: 'f', label: 'Test frequency f', unit: 'Hz', min: 0, max: 15, step: 0.05, show: (s) => !s.auto },
    ] },
    { title: 'Winding', show: (s) => s.case === 'wind', items: [
      { id: 'auto', label: 'Sweep automatically', type: 'check' },
      { id: 'fw', label: 'Winding frequency', unit: 'cycles/record', min: 0, max: 20, step: 0.05, show: (s) => !s.auto },
      { id: 'path', label: 'Connect the points', type: 'check' },
    ] },
    { title: 'Bins', show: (s) => s.case === 'bins', items: [
      { id: 'auto', label: 'Step automatically', type: 'check' },
      { id: 'kmax', label: 'Bin k', unit: '', min: 0, max: 47, step: 1, show: (s) => !s.auto },
    ] },
    { title: 'Pulse', show: (s) => s.case === 'bridge', items: [
      { id: 'pw', label: 'Pulse width', unit: 's', min: 0.1, max: 1.5, step: 0.05 },
      { id: 'Nb', label: 'Samples N', type: 'segmented', options: [[16, '16'], [32, '32'], [64, '64'], [128, '128'], [256, '256']] },
    ] },
    { title: 'Butterfly', show: (s) => s.case === 'fft', items: [{ id: 'stage', label: 'Stage shown', unit: '', min: 1, max: 3, step: 1 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), bl = createChart(ctx, { box: BL }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR });
    const plane = createChart(ctx, { box: PLANE, x: [-1.6, 1.6], y: [-2.06, 2.06] }), top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT });
    const RIGHT = createChart(ctx, { box: [0.55, -2.35, 4.0, 4.9] });
    const ring = createCurve(stage, { max: 120, width: 1, color: '--line' }), com = createCurve(stage, { max: 1, width: 3, color: '--accent' });
    const bfly = createCurve(stage, { max: 200, width: 1.2, color: '--ink-dim' }), hot = createCurve(stage, { max: 60, width: 2.6, color: '--c-E' }), bl8 = [];
    for (let i = 0; i < 16; i++) { const l = ctx.label('', 'tick'); scene.add(l); bl8.push(l); }
    const all = [tl, bl, tr, br, plane, top, bot, RIGHT];
    const x48 = twoTones(48, 5, 12), xb = twoTones(48, 6, 17), sig = (t) => Math.cos(2 * Math.PI * 4 * t) + 0.6 * Math.cos(2 * Math.PI * 9 * t + 0.6);

    const SWEEP = { f: Array.from({ length: 301 }, (_, i) => i * 0.05) };
    SWEEP.m = SWEEP.f.map((ff) => { let a = 0, b = 0; for (let i = 0; i < 400; i++) { const v = i / 200; a += sig(v) * Math.cos(2 * Math.PI * ff * v) / 200; b += sig(v) * Math.sin(2 * Math.PI * ff * v) / 200; } return Math.hypot(a, b); });
    const drawPlane = (x, f) => {
      const W = wind(x, f), L = 1.6; plane.range([-L, L], [-L * 4.9 / 3.8, L * 4.9 / 3.8]);
      const r = Math.max(...x.map(Math.abs)), seg = []; for (let i = 0; i < 100; i++) { const a = 2 * Math.PI * i / 100, b = 2 * Math.PI * (i + 1) / 100; seg.push(plane.mx(r * Math.cos(a)), plane.my(r * Math.sin(a)), 0, plane.mx(r * Math.cos(b)), plane.my(r * Math.sin(b)), 0); }
      ring.segments(seg); ring.object.visible = true;
      if (state.path) plane.line('path', [...W.pts.map((p) => p[0]), W.pts[0][0]], [...W.pts.map((p) => p[1]), W.pts[0][1]], { color: '--c-ref', width: 1 }); else plane.hide('path');
      plane.dots('pts', W.pts.map((p) => p[0]), W.pts.map((p) => p[1]), { color: '--c-B', size: 6 });
      com.segments([plane.mx(0), plane.my(0), 0.003, plane.mx(W.com[0]), plane.my(W.com[1]), 0.003]); com.object.visible = true; plane.dots('com', [W.com[0]], [W.com[1]], { color: '--accent', size: 14 });
      return W;
    };

    return {
      changed() {
        const c = state.case; for (const k of all) k.show(false); for (const o of [ring, com, bfly, hot]) o.object.visible = false; bl8.forEach((l) => { l.visible = false; });
        if (c === 'correlate') { tl.show(true); bl.show(true); RIGHT.show(true); }
        else if (c === 'wind' || c === 'bins') { tl.show(true); bl.show(true); plane.show(true); }
        else if (c === 'bridge') { top.show(true); bot.show(true); }
        else { tr.show(true); br.show(true); }
        ctx.setClock(c === 'bridge' || c === 'fft' ? 0 : 12);
      },
      update() {
        const c = state.case, t = time.t;
        if (c === 'correlate') {
          const f = state.auto ? 15 * (t % 12) / 12 : state.f, ts = Array.from({ length: 800 }, (_, i) => i / 800 * 2), x = ts.map(sig), p = ts.map((v) => Math.cos(2 * Math.PI * f * v)), prod = x.map((v, i) => v * p[i]);
          tl.range([0, 2], [-1.8, 1.8]); tl.titles('t (s)', `signal (blue: tones at 4 and 9 Hz) and probe cos 2π·${fmt(f)}·t (orange)`); tl.line('x', ts, x, { color: '--c-B', width: 1.6 }); tl.line('p', ts, p, { color: '--c-I', width: 1.2 });
          let re = 0, im = 0; for (let i = 0; i < ts.length; i++) { re += prod[i] / 800 * 2; im -= x[i] * Math.sin(2 * Math.PI * f * ts[i]) / 800 * 2; }
          bl.range([0, 2], [-1.8, 1.8]); bl.titles('t (s)', `x(t)·cos: net area Re X = ${fmt(re)}`);
          bl.stems('pos', ts.filter((_, i) => i % 2 === 0 && prod[i] > 0), ts.map((_, i) => prod[i]).filter((v, i) => i % 2 === 0 && v > 0), { color: '--c-v', width: 1.2 });
          bl.stems('neg', ts.filter((_, i) => i % 2 === 0 && prod[i] < 0), ts.map((_, i) => prod[i]).filter((v, i) => i % 2 === 0 && v < 0), { color: '--c-north', width: 1.2 });
          const fs = SWEEP.f, mag = SWEEP.m;
          RIGHT.range([0, 15], [0, 1.2]); RIGHT.titles('test frequency f (Hz)', '|X(f)| built by sweeping f'); RIGHT.line('m', fs.filter((v) => v <= f), mag.filter((_, i) => fs[i] <= f), { color: '--c-E' }); RIGHT.line('ghost', fs, mag, { color: '--line', width: 1 }); RIGHT.dots('now', [f], [Math.hypot(re, im)], { color: '--accent', size: 12 });
          const hit = Math.abs(f - 4) < 0.3 || Math.abs(f - 9) < 0.3;
          hud.set('a', `probe ${fmt(f)} Hz: |X| = ${fmt(Math.hypot(re, im))}`, hit ? 'good' : ''); hud.set('b', hit ? 'probe matches a tone: the product stays mostly positive → area' : 'probe unrelated: the product averages to zero');
          hud.set('c', 'X(f) = ∫ x(t) cos(2πft) dt − j ∫ x(t) sin(2πft) dt');
          plots.aux.draw({ xlim: [0, 15], cursor: f, series: [{ x: fs, y: mag, color: '--c-E', label: '|X(f)| of the 2 s record' }] });
        } else if (c === 'wind' || c === 'bins') {
          const x = c === 'wind' ? x48 : xb, N = 48, f = c === 'wind' ? (state.auto ? 20 * (t % 12) / 12 : state.fw) : (state.auto ? Math.floor(48 * (t % 12) / 12) : state.kmax);
          const n = Array.from({ length: N }, (_, i) => i);
          tl.range([0, N], [-1.8, 1.8]); tl.titles('sample n', c === 'wind' ? 'x[n]: tones at bins 5 and 12' : 'x[n]: tones at bins 6 and 17'); tl.stems('x', n, x, { color: '--c-B', width: 2 });
          const W = drawPlane(x, f);
          if (c === 'wind') {
            const fs = Array.from({ length: 401 }, (_, i) => i * 0.05), m = fs.map((ff) => Math.hypot(...wind(x, ff).com));
            bl.range([0, 20], [0, 0.6]); bl.titles('winding frequency (cycles per record)', '|centre of mass|: = |X|/N'); bl.line('m', fs, m, { color: '--c-E' }); bl.dots('now', [f], [Math.hypot(...W.com)], { color: '--accent', size: 12 });
            hud.set('a', `wound at ${fmt(f)} cycles per record`); hud.set('b', `centre of mass (${fmt(W.com[0])}, ${fmt(W.com[1])}) → |X| = N·|com| = ${fmt(N * Math.hypot(...W.com))}`, Math.hypot(...W.com) > 0.1 ? 'good' : '');
            hud.set('c', Math.abs(f - Math.round(f)) > 0.02 ? 'not an integer: it is between DFT bins' : Number(Math.round(f)) === 5 || Number(Math.round(f)) === 12 ? 'a tone: the points bunch on one side' : 'an integer, no tone: perfectly balanced');
            plots.aux.draw({ xlim: [0, 20], cursor: f, series: [{ x: fs, y: m.map((v) => v * N), color: '--c-E', label: '|X| vs winding frequency' }] });
          } else {
            const D = dftDirect(x), ks = n.filter((k) => k <= f), mg = ks.map((k) => Math.hypot(D.re[k], D.im[k]));
            bl.range([-0.5, N - 0.5], [0, 26]); bl.titles('bin k', `|X[k]|: filled up to bin ${f}`); bl.stems('X', ks, mg, { color: '--c-E', width: 3 });
            hud.set('a', `bin k = ${f}: wind exactly ${f} turns per record`); hud.set('b', `|X[${f}]| = ${fmt(Math.hypot(D.re[f], D.im[f]))}`, Math.hypot(D.re[f], D.im[f]) > 1 ? 'good' : '');
            hud.set('c', f > N / 2 ? `k > N/2: bin ${f} is the mirror of bin ${N - f} (negative frequency)` : 'integer turns: everything except a tone cancels exactly');
            plots.aux.draw({ xlim: [0, N - 1], cursor: f, series: [{ x: n, y: n.map((k) => Math.hypot(D.re[k], D.im[k])), color: '--c-E', label: '|X[k]| (all bins)' }] });
          }
        } else if (c === 'bridge') {
          const N = state.Nb, T = 4, dt = T / N, ts = Array.from({ length: N }, (_, i) => -T / 2 + i * dt), x = ts.map((v) => (Math.abs(v) <= state.pw / 2 ? 1 : 0));
          top.range([-2, 2], [-0.2, 1.3]); top.titles('t (s)', `x[n]: rect of width ${state.pw} s, ${N} samples over 4 s`); top.stems('x', ts, x, { color: '--c-B', width: N > 128 ? 1.2 : 2.4 });
          const re = Float64Array.from(x), im = new Float64Array(N); fft(re, im);
          const fk = [], Xr = []; for (let i = 0; i < N; i++) { const k = (i + N / 2) % N, f = (k < N / 2 ? k : k - N) / T, ph = 2 * Math.PI * f * T / 2; fk.push(f); Xr.push((re[k] * Math.cos(ph) - im[k] * Math.sin(ph)) * dt); }
          const F = Math.min(N / (2 * T), 16), fx = Array.from({ length: 1000 }, (_, i) => -F + 2 * F * i / 999), w = Math.round(state.pw / dt) * dt;
          bot.range([-F, F], [-0.3 * w, 1.15 * w]); bot.titles('f (Hz)', 'continuous transform w·sinc(fw) (line) and DFT·Δt (dots)'); bot.line('c', fx, fx.map((f) => w * sinc(f * w)), { color: '--c-ref', width: 1.6 }); bot.dots('d', fk, Xr, { color: '--c-E', size: 7 });
          hud.set('a', `bin spacing Δf = 1/T = ${fmt(1 / T)} Hz (record length decides it)`); hud.set('b', `highest frequency fs/2 = ${fmt(N / (2 * T))} Hz (sampling rate decides it)`); hud.set('c', `main lobe ±1/w = ±${fmt(1 / state.pw)} Hz`);
          plots.aux.draw({ xlim: [-F, F], series: [{ x: fk.filter((f) => Math.abs(f) <= F), y: Xr.filter((_, i) => Math.abs(fk[i]) <= F), color: '--c-E', label: 'DFT × Δt vs f (Hz)' }] });
        } else {
          // the 8-point butterfly: inputs in bit-reversed order, three stages of pairs
          const N = 8, S = butterflies(N), X0 = -3.9, dx = 1.12, y = (i) => 2.1 - i * 0.6, seg = [], hs = [];
          for (let s = 0; s < 3; s++) for (const [u, v] of S[s]) { const a = X0 + s * dx, b = a + dx; for (const [p, q] of [[u, u], [v, v], [u, v], [v, u]]) (s + 1 === state.stage ? hs : seg).push(a, y(p), 0, b, y(q), 0); }
          bfly.segments(seg); hot.segments(hs); bfly.object.visible = hot.object.visible = true;
          for (let i = 0; i < 8; i++) { bl8[i].element.textContent = `x[${bitReverse(i, 3)}]`; bl8[i].position.set(X0 - 0.35, y(i), 0); bl8[i].visible = true; bl8[8 + i].element.textContent = `X[${i}]`; bl8[8 + i].position.set(X0 + 3 * dx + 0.35, y(i), 0); bl8[8 + i].visible = true; }
          const Ns = Array.from({ length: 12 }, (_, i) => 2 ** (i + 2));
          tr.range([0.5, 4.5], [0, 7.5]); tr.titles('log₁₀ N', 'log₁₀ multiplications: DFT N² (red), FFT (N/2)log₂N (blue)');
          tr.line('d', Ns.map(Math.log10), Ns.map((n) => Math.log10(ops(n).dft)), { color: '--c-north' }); tr.line('f', Ns.map(Math.log10), Ns.map((n) => Math.log10(ops(n).fft)), { color: '--c-B' });
          TIMES ??= measure();
          const lo = Math.log10(Math.min(...TIMES.f)) - 0.3, hi = Math.log10(Math.max(...TIMES.d)) + 0.3;
          br.range([1, 3.5], [lo, hi]); br.titles('log₁₀ N', 'log₁₀ time (ms), measured in this browser'); br.line('d', TIMES.Ns.map(Math.log10), TIMES.d.map(Math.log10), { color: '--c-north' }); br.line('f', TIMES.Ns.map(Math.log10), TIMES.f.map(Math.log10), { color: '--c-B' });
          br.dots('dd', TIMES.Ns.map(Math.log10), TIMES.d.map(Math.log10), { color: '--c-north', size: 7 }); br.dots('fd', TIMES.Ns.map(Math.log10), TIMES.f.map(Math.log10), { color: '--c-B', size: 7 });
          const n = 1024, sp = TIMES.d[6] / TIMES.f[6];
          hud.set('a', `stage ${state.stage}: ${['pairs of 2-point DFTs', 'two 4-point DFTs from the pairs', 'one 8-point DFT from two halves'][state.stage - 1]}`);
          hud.set('b', `N = ${n}: DFT ${fmt(ops(n).dft)} products, FFT ${fmt(ops(n).fft)} → ${fmt(ops(n).dft / ops(n).fft)}× fewer`); hud.set('c', `measured here at N = 1024: ${fmt(sp)}× faster`, 'good');
          plots.aux.draw({ xlim: [4, 8192], series: [{ x: Ns, y: Ns.map((m) => ops(m).dft / ops(m).fft), color: '--c-B', label: 'speed-up N²/((N/2)log₂N) vs N' }] });
        }
      },
      theme() { for (const k of all) k.theme(); for (const o of [ring, com, bfly, hot]) o.theme(); },
    };
  },
};
