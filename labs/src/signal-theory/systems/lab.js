// Systems: convolution as flip-and-slide, LTI systems (input → output, H(f)), and FIR filtering.
import { createChart } from '../../lib/viz/chart.js';
import { SHAPES, convolve, SYSTEMS, INPUTS, respond, fir, firResponse, filter } from './model.js';
import { spectrum, noise } from '../signals/model.js';

const TOP = [-4.2, 0.55, 8.6, 2.1], BOT = [-4.2, -2.35, 8.6, 2.1], DT = 0.01, T0 = -1.5, T1 = 4;
const fmt = (v) => String(Number(v.toPrecision(3)));

export default {
  id: 'systems', title: 'Systems', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 6,
  defaults: { x: 'rect', h: 'rect', sys: 'lowpass', inp: 'step', tau: 0.3, a: 0.6, T: 0.5, f: 1, ftype: 'lowpass', fc: 20, fc2: 200, M: 101, sn: 0.3 },
  cases: [
    { id: 'conv', label: 'Convolution', set: {}, examples: [
      { id: 'charge', label: 'Rectangle into an RC: charging', set: { h: 'exp' } },
      { id: 'tri', label: 'Triangle * rectangle: smoother', set: { x: 'tri' } },
      { id: 'gauss', label: 'Gaussian * Gaussian: wider Gaussian', set: { x: 'gauss', h: 'gauss' } },
    ] },
    { id: 'lti', label: 'LTI system', set: { sys: 'lowpass', inp: 'step' }, examples: [
      { id: 'square', label: 'Low-pass a square wave', set: { inp: 'square', f: 1 } },
      { id: 'hp', label: 'High-pass a square wave', set: { sys: 'highpass', inp: 'square', f: 0.5 } },
      { id: 'slow', label: 'Slow sine passes', set: { inp: 'sine', f: 0.2 } },
      { id: 'fast', label: 'Fast sine: smaller and late', set: { inp: 'sine', f: 2 } },
      { id: 'echo', label: 'Echo: impulse → two impulses', set: { sys: 'echo', inp: 'impulse' } },
      { id: 'avg', label: 'Moving average smooths', set: { sys: 'average', inp: 'square', f: 1 } },
    ] },
    { id: 'filter', label: 'Filtering', set: {}, examples: [
      { id: 'hp', label: 'High-pass: keep the 120 Hz tone', set: { ftype: 'highpass', fc: 60 } },
      { id: 'bp', label: 'Band-pass around 120 Hz', set: { ftype: 'bandpass', fc: 90, fc2: 150 } },
      { id: 'short', label: 'Few taps: a soft edge', set: { M: 15 } },
      { id: 'noisy', label: 'More noise: low-pass still cleans', set: { sn: 0.8 } },
    ] },
  ],
  controls: [
    { title: 'Signals', show: (s) => s.case === 'conv', items: [
      { id: 'x', label: 'x(t)', type: 'select', options: Object.entries(SHAPES).map(([k, v]) => [k, v.label]) },
      { id: 'h', label: 'h(t)', type: 'select', options: Object.entries(SHAPES).map(([k, v]) => [k, v.label]) },
    ] },
    { title: 'System', show: (s) => s.case === 'lti', items: [
      { id: 'sys', label: 'System', type: 'select', options: Object.entries(SYSTEMS).map(([k, v]) => [k, v.label]) },
      { id: 'inp', label: 'Input', type: 'segmented', options: Object.entries(INPUTS).map(([k, v]) => [k, v.label]) },
      { id: 'tau', label: 'Time constant τ', unit: 's', min: 0.05, max: 1, step: 0.01, show: (s) => s.sys === 'lowpass' || s.sys === 'highpass' },
      { id: 'a', label: 'Echo strength', unit: '', min: 0, max: 1, step: 0.01, show: (s) => s.sys === 'echo' },
      { id: 'T', label: 'Delay / length T', unit: 's', min: 0.05, max: 1.5, step: 0.01, show: (s) => s.sys === 'echo' || s.sys === 'average' },
      { id: 'f', label: 'Input frequency', unit: 'Hz', min: 0.1, max: 5, step: 0.05, show: (s) => s.inp === 'square' || s.inp === 'sine' },
    ] },
    { title: 'Filter', show: (s) => s.case === 'filter', items: [
      { id: 'ftype', label: 'Type', type: 'segmented', options: [['lowpass', 'Low-pass'], ['highpass', 'High-pass'], ['bandpass', 'Band-pass']] },
      { id: 'fc', label: 'Cut-off', unit: 'Hz', min: 5, max: 300, step: 1 },
      { id: 'fc2', label: 'Upper cut-off', unit: 'Hz', min: 10, max: 400, step: 1, show: (s) => s.ftype === 'bandpass' },
      { id: 'M', label: 'Taps', unit: '', min: 5, max: 201, step: 2 },
      { id: 'sn', label: 'Noise σ', unit: '', min: 0, max: 1, step: 0.01 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT });
    let C = null;

    return {
      changed() {
        top.clear(); bot.clear();
        const c = state.case;
        if (c === 'conv') {
          const n = Math.round((T1 - T0) / DT), tt = Array.from({ length: n }, (_, i) => T0 + i * DT), x = tt.map((t) => SHAPES[state.x].f(t)), h = tt.map((t) => SHAPES[state.h].f(t));
          const y = convolve(x, h, DT); C = { tt, x, h, y: Array.from({ length: n }, (_, i) => y[i - Math.round(T0 / DT)] ?? 0) }; // y on the same grid
          top.range([T0, T1], [-0.1, 1.2]); bot.range([T0, T1], [-0.05, Math.max(...C.y) * 1.15 + 0.01]);
          top.titles('τ', 'x(τ) and h(t − τ)'); bot.titles('t', 'y(t) = ∫ x(τ) h(t − τ) dτ');
          ctx.setDuration(6);
        } else if (c === 'lti') { top.titles('t (s)', 'input and output'); bot.titles('f (Hz)', '|H(f)|'); ctx.setDuration(0); }
        else { top.titles('t (s)', 'noisy input, filtered output'); bot.titles('f (Hz)', 'spectrum (dB)'); ctx.setDuration(0); }
      },
      update() {
        const c = state.case;
        if (c === 'conv') {
          const t = T0 + (T1 - T0) * Math.min(1, time.t / 5.5), flip = C.tt.map((tau) => SHAPES[state.h].f(t - tau)), prod = C.tt.map((tau, i) => C.x[i] * flip[i]);
          top.line('x', C.tt, C.x, { color: '--c-B' }); top.line('h', C.tt, flip, { color: '--c-I' }); top.line('p', C.tt, prod, { color: '--c-F', width: 3.4 });
          const k = Math.round((t - T0) / DT);
          bot.line('all', C.tt, C.y, { color: '--c-ref', dashed: true, width: 1.4 }); bot.line('y', C.tt.slice(0, k + 1), C.y.slice(0, k + 1), { color: '--c-F', width: 3 });
          bot.stems('now', [t], [C.y[Math.min(k, C.y.length - 1)] || 0], { color: '--accent', width: 2 });
          hud.set('a', `t = ${fmt(t)} s`); hud.set('b', `area of the violet product = y(t) = ${fmt(C.y[Math.min(k, C.y.length - 1)] || 0)}`); hud.set('c', 'flip h, slide it by t, multiply, integrate');
          plots.aux.draw({ xlim: [T0, T1], cursor: t, series: [{ x: C.tt, y: C.h, color: '--c-I', label: 'h(t)' }] });
        } else if (c === 'lti') {
          const Tt = state.inp === 'sine' || state.inp === 'square' ? Math.max(4, 4 / state.f) : 4, R = respond(state.sys, state.inp, state, Tt, 4e-3);
          const lim = state.inp === 'impulse' ? 3 / Math.max(state.tau, 0.05) : 1.6, cl = (v) => Math.max(-lim, Math.min(lim, v));
          top.range([0, Tt], state.inp === 'impulse' ? [-0.5, lim] : [-1.6, 1.6]); top.line('x', R.t, R.x.map(cl), { color: '--c-ref', width: 1.6 }); top.line('y', R.t, R.y.map(cl), { color: '--c-B' });
          const fs = Array.from({ length: 300 }, (_, i) => 5 * i / 299), H = fs.map((f) => Math.hypot(...SYSTEMS[state.sys].H(f, state)));
          bot.range([0, 5], [0, Math.max(1.1, ...H) * 1.05]); bot.line('H', fs, H, { color: '--c-E' });
          if (state.inp === 'sine') bot.stems('f', [state.f], [Math.hypot(...SYSTEMS[state.sys].H(state.f, state))], { color: '--accent', width: 2 });
          const Hf = SYSTEMS[state.sys].H(state.f, state);
          hud.set('a', `${SYSTEMS[state.sys].label}, ${INPUTS[state.inp].label.toLowerCase()} input`);
          hud.set('b', state.sys === 'lowpass' || state.sys === 'highpass' ? `corner f = 1/(2πτ) = ${fmt(1 / (2 * Math.PI * state.tau))} Hz` : state.sys === 'echo' ? `delay ${fmt(state.T)} s, strength ${fmt(state.a)}` : `window ${fmt(state.T)} s`);
          hud.set('c', state.inp === 'sine' ? `at ${fmt(state.f)} Hz: gain ${fmt(Math.hypot(...Hf))}, phase ${fmt(Math.atan2(Hf[1], Hf[0]) * 180 / Math.PI)}°` : 'grey: input · blue: output');
          plots.aux.draw({ xlim: [0, 5], series: [{ x: fs, y: fs.map((f) => { const h = SYSTEMS[state.sys].H(f, state); return Math.atan2(h[1], h[0]) * 180 / Math.PI; }), color: '--c-E', label: 'phase of H(f) [°]' }] });
        } else {
          const fsr = 1000, n = 1000, t = Array.from({ length: n }, (_, i) => i / fsr), nz = noise(n, state.sn, 5);
          const x = t.map((v, i) => Math.sin(2 * Math.PI * 5 * v) + 0.5 * Math.sin(2 * Math.PI * 120 * v) + nz[i]);
          const M = Math.max(5, state.M | 1), h = fir(state.ftype, state.fc, Math.max(state.fc2, state.fc + 5), fsr, M), y = filter(x, h), m = (M - 1) / 2;
          const yc = t.map((_, i) => y[i + m] ?? NaN); // compensate the (M − 1)/2 sample delay of a linear-phase FIR
          top.range([0, 0.5], [-2.5, 2.5]); top.line('x', t, x, { color: '--c-ref', width: 1.2 }); top.line('y', t, yc, { color: '--c-B', width: 2.6 });
          const N = 512, X = spectrum(x.slice(0, N), 'hann'), Y = spectrum(y.slice(m, m + N), 'hann'), fk = X.map((_, k) => k * fsr / N), dB = (a) => a.map((v) => Math.max(-80, 20 * Math.log10(v + 1e-9)));
          bot.range([0, 300], [-80, 5]); bot.line('X', fk, dB(X), { color: '--c-ref', width: 1.4 }); bot.line('Y', fk, dB(Y), { color: '--c-B' });
          hud.set('a', 'input: 5 Hz tone + 120 Hz tone (0.5) + noise'); hud.set('b', `${M}-tap FIR ${state.ftype}, ${state.ftype === 'bandpass' ? `${state.fc}–${Math.max(state.fc2, state.fc + 5)}` : state.fc} Hz`);
          hud.set('c', `gain at 5 Hz ${fmt(firResponse(h, 5, fsr))}, at 120 Hz ${fmt(firResponse(h, 120, fsr))}; delay ${m} samples = ${fmt(m)} ms`);
          const ff = Array.from({ length: 301 }, (_, i) => i * 400 / 300);
          plots.aux.draw({ xlim: [0, 400], series: [{ x: ff, y: ff.map((f) => Math.max(-100, 20 * Math.log10(firResponse(h, f, fsr) + 1e-9))), color: '--c-E', label: 'filter |H(f)| [dB]' }] });
        }
      },
      theme() { top.theme(); bot.theme(); },
    };
  },
};
