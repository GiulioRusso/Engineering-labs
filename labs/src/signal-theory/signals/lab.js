// Signals: a gallery of waveforms with their spectra, Fourier series as epicycles, sampling and aliasing,
// the DFT and spectrum analysis with windows. 2D: time on top, frequency below.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { WAVES, wave, chirp, noise, bn, partialSum, spectrum, aliasOf, WINDOWS } from './model.js';

const TOP = [-4.2, 0.55, 8.6, 2.1], BOT = [-4.2, -2.35, 8.6, 2.1];
const fmt = (v) => String(Number(v.toPrecision(3)));
const KINDS = [...Object.entries(WAVES).map(([k, v]) => [k, v.label]), ['chirp', 'Chirp'], ['noise', 'Noise']];

export default {
  id: 'signals', title: 'Signals', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  defaults: { kind: 'sine', f: 3, A: 1, duty: 0.2, sn: 0, N: 5, fs: 30, Nfft: 64, f1: 8, f2: 13, A2: 0.5, win: 'rect' },
  cases: [
    { id: 'gallery', label: 'Signals', set: {}, examples: [
      { id: 'square', label: 'Square: odd harmonics', set: { kind: 'square' } },
      { id: 'saw', label: 'Sawtooth: all harmonics', set: { kind: 'saw' } },
      { id: 'pulse', label: 'Narrow pulses: a wide spectrum', set: { kind: 'pulse', duty: 0.05 } },
      { id: 'chirp', label: 'Chirp: frequency sweeps', set: { kind: 'chirp' } },
      { id: 'noise', label: 'White noise: flat spectrum', set: { kind: 'noise' } },
      { id: 'noisy', label: 'A sine in noise', set: { kind: 'sine', sn: 0.6 } },
    ] },
    { id: 'fourier', label: 'Fourier series', set: { kind: 'square', f: 0.5 }, examples: [
      { id: 'one', label: 'One harmonic: a sine', set: { N: 1 } },
      { id: 'three', label: 'Three harmonics', set: { N: 3 } },
      { id: 'gibbs', label: '50 harmonics: Gibbs overshoot', set: { N: 50 } },
      { id: 'saw', label: 'Sawtooth', set: { kind: 'saw', N: 10 } },
      { id: 'triangle', label: 'Triangle: converges fast', set: { kind: 'triangle', N: 3 } },
    ] },
    { id: 'sampling', label: 'Sampling', set: { f: 3, fs: 30 }, examples: [
      { id: 'enough', label: 'fs = 2.5 f: still fine', set: { fs: 7.5 } },
      { id: 'nyquist', label: 'fs = 2 f: on the edge', set: { fs: 6 } },
      { id: 'alias', label: 'fs < 2 f: an alias appears', set: { f: 7, fs: 10 } },
      { id: 'wheel', label: 'f close to fs: slow alias', set: { f: 9.5, fs: 10 } },
    ] },
    { id: 'dft', label: 'DFT', set: { Nfft: 64, f1: 8, A2: 0 }, examples: [
      { id: 'two', label: 'Two tones', set: { A2: 0.5 } },
      { id: 'between', label: 'Between two bins: leakage', set: { f1: 8.5 } },
      { id: 'close', label: 'Too close to resolve', set: { A2: 1, f2: 8.6, Nfft: 16 } },
      { id: 'longer', label: 'Longer record resolves them', set: { A2: 1, f2: 8.6, Nfft: 256 } },
    ] },
    { id: 'spectrum', label: 'Windows', set: { Nfft: 64, f1: 8.5, f2: 16, A2: 0.01, win: 'rect' }, examples: [
      { id: 'hann', label: 'Hann window: less leakage', set: { win: 'hann' } },
      { id: 'blackman', label: 'Blackman: the weak tone appears', set: { win: 'blackman' } },
      { id: 'centred', label: 'Bin-centred tone: no leakage', set: { f1: 8 } },
    ] },
  ],
  controls: [
    { title: 'Signal', items: [
      { id: 'kind', label: 'Waveform', type: 'select', options: KINDS, show: (s) => s.case === 'gallery' || s.case === 'fourier' },
      { id: 'f', label: 'Frequency f', unit: 'Hz', min: 0.2, max: 20, step: 0.05, show: (s) => s.case !== 'dft' && s.case !== 'spectrum' },
      { id: 'A', label: 'Amplitude', unit: '', min: 0.1, max: 1, step: 0.01, show: (s) => s.case === 'gallery' },
      { id: 'duty', label: 'Pulse width (duty)', unit: '', min: 0.02, max: 0.9, step: 0.01, show: (s) => s.case === 'gallery' && s.kind === 'pulse' },
      { id: 'sn', label: 'Added noise σ', unit: '', min: 0, max: 1, step: 0.01, show: (s) => s.case === 'gallery' },
      { id: 'N', label: 'Harmonics N', unit: '', min: 1, max: 60, step: 1, show: (s) => s.case === 'fourier' },
      { id: 'fs', label: 'Sampling rate fs', unit: 'Hz', min: 2, max: 60, step: 0.1, show: (s) => s.case === 'sampling' },
    ] },
    { title: 'Analysis', show: (s) => s.case === 'dft' || s.case === 'spectrum', items: [
      { id: 'Nfft', label: 'Samples N', type: 'segmented', options: [[16, '16'], [32, '32'], [64, '64'], [128, '128'], [256, '256']] },
      { id: 'f1', label: 'Tone 1', unit: 'cycles', min: 1, max: 30, step: 0.05 },
      { id: 'f2', label: 'Tone 2', unit: 'cycles', min: 1, max: 30, step: 0.05 },
      { id: 'A2', label: 'Tone 2 amplitude', unit: '', min: 0, max: 1, step: 0.005 },
      { id: 'win', label: 'Window', type: 'segmented', options: Object.entries(WINDOWS).map(([k, v]) => [k, v.label]) },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: TOP, xTitle: 't (s)', yTitle: 'x(t)' }), bot = createChart(ctx, { box: BOT, xTitle: 'f (Hz)', yTitle: '|X(f)|' });
    const fr = createChart(ctx, { box: [-0.9, -1.7, 5.2, 3.4], x: [0, 1], y: [-1.5, 1.5], xTitle: 'one period', yTitle: 'partial sum' });
    const circles = createCurve(stage, { max: 4000, width: 1.2, color: '--c-ref' }), arms = createCurve(stage, { max: 80, width: 2, color: '--c-E' }), link = createCurve(stage, { max: 1, width: 1, color: '--c-F', dashed: true });
    const EC = [-2.75, 0], ES = 1.05; // epicycle centre and scale (world units per unit amplitude)

    return {
      changed() {
        const c = state.case, f = c === 'fourier';
        top.show(!f); bot.show(!f); fr.show(f); top.clear(); bot.clear();
        top.titles(c === 'dft' || c === 'spectrum' ? 'n (sample)' : 't (s)', c === 'dft' || c === 'spectrum' ? 'x[n]' : 'x(t)'); bot.titles(c === 'dft' || c === 'spectrum' ? 'bin k' : 'f (Hz)', c === 'spectrum' ? '|X| (dB)' : '|X|'); circles.object.visible = arms.object.visible = link.object.visible = f;
      },
      update() {
        const c = state.case, t0 = time.t;
        if (c === 'gallery') {
          const fs = 256, n = 256, xs = [], ys = [], T = 1, nz = noise(n, state.sn, 3 + Math.floor(t0 * 4)), wn = state.kind === 'noise' ? noise(n, 0.5, 9 + Math.floor(t0 * 4)) : null;
          for (let i = 0; i < n; i++) { const t = i / fs + t0 * 0.25; xs.push(i / fs); ys.push((state.kind === 'chirp' ? state.A * chirp(i / fs, 1, 30, T) : wn ? wn[i] : wave(state.kind, t, state.f, state.A, state.duty)) + nz[i]); }
          top.range([0, T], [-1.6, 1.6]); top.line('x', xs, ys);
          const sp = spectrum(ys), fx = sp.map((_, k) => k);
          bot.range([0, 64], [0, Math.max(0.3, ...sp.slice(1)) * 1.1]); bot.stems('X', fx, sp, { color: '--c-E' });
          hud.set('a', `${KINDS.find((k) => k[0] === state.kind)[1]}${state.kind === 'chirp' || state.kind === 'noise' ? '' : `, f = ${fmt(state.f)} Hz`}`);
          hud.set('b', state.kind === 'square' ? 'harmonics at f, 3f, 5f… (1/n)' : state.kind === 'saw' ? 'harmonics at every n·f (1/n)' : state.kind === 'triangle' ? 'odd harmonics, falling as 1/n²' : state.kind === 'pulse' ? `narrower pulse → wider spectrum (first zero at ${fmt(state.f / state.duty)} Hz)` : '');
          hud.set('c', 'spectrum: 1 s record, 256 samples');
          plots.aux.draw({ xlim: [0, 64], series: [{ x: fx, y: sp.map((v) => 20 * Math.log10(v + 1e-6)), color: '--c-E', label: 'spectrum [dB]' }] });
        } else if (c === 'fourier') {
          // epicycles: harmonic n is a circle of radius |b_n| turning n times per period
          const u = (t0 * state.f) % 1, seg = [], arm = []; let x = EC[0], y = EC[1];
          for (let n = 1; n <= state.N; n++) {
            const b = bn(state.kind, n); if (!b) continue;
            const r = Math.abs(b) * ES, a = 2 * Math.PI * n * u + (b < 0 ? Math.PI : 0);
            for (let k = 0; k < 40; k++) { const p = 2 * Math.PI * k / 40, q = 2 * Math.PI * (k + 1) / 40; seg.push(x + r * Math.cos(p), y + r * Math.sin(p), 0, x + r * Math.cos(q), y + r * Math.sin(q), 0); }
            const nx = x + r * Math.cos(a), ny = y + r * Math.sin(a); arm.push(x, y, 0.001, nx, ny, 0.001); x = nx; y = ny;
          }
          circles.segments(seg); arms.segments(arm);
          const xs = [], ys = [], tg = []; for (let i = 0; i <= 400; i++) { const v = i / 400; xs.push(v); ys.push(partialSum(state.kind, state.N, v)); tg.push(WAVES[state.kind].f(v)); }
          fr.line('target', xs, tg, { color: '--c-ref', dashed: true, width: 1.4 }); fr.line('sum', xs, ys);
          // the trace so far, and the link from the last arm to the chart
          const now = []; for (let i = 0; i <= 400 * u; i++) now.push(i / 400); fr.line('now', now, now.map((v) => partialSum(state.kind, state.N, v)), { color: '--c-E', width: 3.4 });
          link.segments([x, y, 0.001, fr.mx(u), fr.my(partialSum(state.kind, state.N, u)), 0.001]);
          const peak = Math.max(...ys);
          hud.set('a', `${WAVES[state.kind].label}, N = ${state.N} harmonics`); hud.set('b', `b₁ = ${fmt(bn(state.kind, 1))}, b₃ = ${fmt(bn(state.kind, 3))}`);
          hud.set('c', state.kind === 'square' ? `peak ${fmt(peak)} (Gibbs: → 1.179)` : `peak ${fmt(peak)}`);
          const ns = Array.from({ length: Math.max(state.N, 9) }, (_, i) => i + 1);
          plots.aux.draw({ xlim: [0.5, ns.length + 0.5], series: [{ x: ns, y: ns.map((n) => Math.abs(bn(state.kind, n))), color: '--c-E', label: '|bₙ| (harmonic amplitudes)' }] });
        } else if (c === 'sampling') {
          const T = Math.max(1, 4 / state.f), fa = aliasOf(state.f, state.fs), xs = [], ys = [], sx = [], sy = [], ax = [];
          for (let i = 0; i <= 1500; i++) { const t = T * i / 1500; xs.push(t); ys.push(Math.sin(2 * Math.PI * state.f * t)); ax.push(Math.sin(2 * Math.PI * (state.f % state.fs > state.fs / 2 ? -fa : fa) * t)); }
          for (let n = 0; n <= T * state.fs; n++) { sx.push(n / state.fs); sy.push(Math.sin(2 * Math.PI * state.f * n / state.fs)); }
          top.range([0, T], [-1.3, 1.3]); top.line('x', xs, ys, { width: 1.6, color: '--c-ref' }); top.stems('s', sx, sy, { color: '--c-B' });
          top.line('alias', xs, ax, { color: '--c-I', dashed: fa !== state.f, width: 2 });
          bot.range([0, Math.max(state.fs, state.f) * 1.15], [0, 1.2]);
          bot.stems('X', [state.f], [1], { color: '--c-ref' }); bot.stems('A', [fa], [0.8], { color: '--c-I' }); bot.stems('N', [state.fs / 2], [1.2], { color: '--c-E', width: 1.4 });
          hud.set('a', `f = ${fmt(state.f)} Hz, fs = ${fmt(state.fs)} Hz, fs/2 = ${fmt(state.fs / 2)} Hz`);
          hud.set('b', state.fs > 2 * state.f ? 'fs > 2f: the samples identify f ✓' : `fs ≤ 2f: the samples also fit ${fmt(fa)} Hz`, state.fs > 2 * state.f ? 'good' : 'bad');
          hud.set('c', 'grey: signal · blue: samples · orange: what they look like');
          plots.aux.draw({ xlim: [0, 60], cursor: state.f, series: [{ x: Array.from({ length: 241 }, (_, i) => i / 4), y: Array.from({ length: 241 }, (_, i) => aliasOf(i / 4, state.fs)), color: '--c-I', label: 'apparent frequency vs true frequency (Hz)' }] });
        } else {
          const N = state.Nfft, x = Array.from({ length: N }, (_, n) => Math.sin(2 * Math.PI * state.f1 * n / N) + state.A2 * Math.sin(2 * Math.PI * state.f2 * n / N + 0.4));
          const sp = spectrum(x, state.win), k = sp.map((_, i) => i), db = sp.map((v) => Math.max(-100, 20 * Math.log10(v + 1e-9)));
          top.range([0, N], [-2, 2]); top.stems('n', Array.from({ length: N }, (_, i) => i), x, { color: '--c-B', width: 2 });
          if (c === 'spectrum') { bot.range([0, N / 2], [-100, 0]); bot.line('dB', k, db, { color: '--c-E' }); }
          else { bot.range([0, N / 2], [0, 1.15]); bot.stems('bins', k, sp, { color: '--c-E' }); }
          hud.set('a', `N = ${N} samples, resolution = 1 bin = 1 cycle per record`);
          hud.set('b', `tone 1 at ${fmt(state.f1)} bins${state.f1 % 1 ? ' (between bins → leakage)' : ' (on a bin)'}`);
          hud.set('c', `${WINDOWS[state.win].label} window${state.A2 ? `, tone 2 at ${fmt(state.f2)} bins, ${fmt(20 * Math.log10(state.A2))} dB` : ''}`);
          plots.aux.draw({ xlim: [0, N - 1], series: [{ x: k, y: k.map((n) => WINDOWS[state.win].w(n, N)), color: '--c-ref', label: 'window w[n]' }] });
        }
      },
      theme() { for (const k of [top, bot, fr]) k.theme(); for (const k of [circles, arms, link]) k.theme(); },
    };
  },
};
