// Filtering and the Fourier duality: smoothing by convolving with a kernel (rect or Gaussian) and what it
// does to the spectrum; masking the spectrum (brick-wall or Butterworth) and the ringing it costs in time;
// the Gaussian, which is the same shape in both domains; and windowed-sinc FIR design.
import { createChart } from '../../lib/viz/chart.js';
import { fft, gaussian } from '../../lib/dsp.js';
import { kernel, convSame, response, mask, applyMask, maskImpulse, fir } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const FS = 512, N = 1024, ts = Array.from({ length: N }, (_, i) => i / FS);
// test signal: a 2 Hz square wave (sharp edges), a 60 Hz hum and white noise
const g = gaussian(4), NOISE = Array.from({ length: N }, () => g());
const signal = (sn, hum) => ts.map((t, i) => (((t * 2) % 1) < 0.5 ? 1 : -1) + hum * Math.sin(2 * Math.PI * 60 * t) + sn * NOISE[i]);
const specDb = (x) => { const re = Float64Array.from(x, (v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)))), im = new Float64Array(N); fft(re, im); const f = [], d = []; for (let k = 0; k <= N / 2; k++) { f.push(k * FS / N); d.push(Math.max(-90, 20 * Math.log10(4 * Math.hypot(re[k], im[k]) / N + 1e-9))); } return { f, d }; };
const every = (a, k = 2) => a.filter((_, i) => i % k === 0);

export default {
  id: 'filtering', title: 'Filtering', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { kern: 'gauss', M: 31, mk: 'brick', fc: 20, order: 2, sig: 4, sn: 0.15, hum: 0.5, ftype: 'lowpass', ffc: 20, ffc2: 80, taps: 101 },
  cases: [
    { id: 'kernel', label: 'Smoothing in time', set: {}, examples: [
      { id: 'rect', label: 'Moving average: sinc sidelobes', controls: ['kern', 'M'], set: { kern: 'rect' } },
      { id: 'long', label: 'Longer kernel: more blur', controls: ['M'], set: { M: 101 } },
      { id: 'short', label: 'Short kernel: hum gets through', controls: ['M'], set: { M: 5 } },
    ] },
    { id: 'mask', label: 'Masking the spectrum', set: {}, examples: [
      { id: 'brick', label: 'Brick wall: ringing at every edge', controls: ['mk', 'fc'], set: { mk: 'brick', fc: 10 } },
      { id: 'butter', label: 'Butterworth n = 2: gentle', controls: ['mk', 'order'], set: { mk: 'butter', order: 2 } },
      { id: 'steep', label: 'Butterworth n = 10: steep, rings', controls: ['mk', 'order'], set: { mk: 'butter', order: 10 } },
    ] },
    { id: 'gauss', label: 'Gaussian self-duality', set: {}, examples: [
      { id: 'narrow', label: 'Narrow in time: wide in frequency', controls: ['sig'], set: { sig: 1 } },
      { id: 'wide', label: 'Wide in time: narrow in frequency', controls: ['sig'], set: { sig: 15 } },
    ] },
    { id: 'fir', label: 'FIR design', set: {}, examples: [
      { id: 'hp', label: 'High-pass: keep the hum', controls: ['ftype', 'ffc'], set: { ftype: 'highpass', ffc: 40 } },
      { id: 'bp', label: 'Band-pass around 60 Hz', controls: ['ftype', 'ffc', 'ffc2'], set: { ftype: 'bandpass', ffc: 45, ffc2: 75 } },
      { id: 'few', label: '15 taps: a soft edge', controls: ['taps'], set: { taps: 15 } },
    ] },
  ],
  controls: [
    { title: 'Signal', items: [
      { id: 'sn', label: 'Noise σ', unit: '', min: 0, max: 1, step: 0.01 },
      { id: 'hum', label: '60 Hz hum', unit: '', min: 0, max: 1, step: 0.01 },
    ] },
    { title: 'Kernel', show: (s) => s.case === 'kernel', items: [
      { id: 'kern', label: 'Kernel', type: 'segmented', options: [['rect', 'Rectangular'], ['gauss', 'Gaussian']] },
      { id: 'M', label: 'Length M', unit: 'samples', min: 3, max: 151, step: 2 },
    ] },
    { title: 'Mask', show: (s) => s.case === 'mask', items: [
      { id: 'mk', label: 'Mask', type: 'segmented', options: [['brick', 'Brick wall'], ['butter', 'Butterworth']] },
      { id: 'fc', label: 'Cut-off', unit: 'Hz', min: 2, max: 100, step: 1 },
      { id: 'order', label: 'Order n', unit: '', min: 1, max: 12, step: 1, show: (s) => s.mk === 'butter' },
    ] },
    { title: 'Gaussian', show: (s) => s.case === 'gauss', items: [{ id: 'sig', label: 'σ in time', unit: 'ms', min: 0.5, max: 30, step: 0.5 }] },
    { title: 'FIR', show: (s) => s.case === 'fir', items: [
      { id: 'ftype', label: 'Type', type: 'segmented', options: [['lowpass', 'Low-pass'], ['highpass', 'High-pass'], ['bandpass', 'Band-pass']] },
      { id: 'ffc', label: 'Cut-off', unit: 'Hz', min: 2, max: 200, step: 1 },
      { id: 'ffc2', label: 'Upper cut-off', unit: 'Hz', min: 5, max: 240, step: 1, show: (s) => s.ftype === 'bandpass' },
      { id: 'taps', label: 'Taps', unit: '', min: 5, max: 301, step: 2 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR }), all = [tl, tr, bl, br];
    const shared = (x, y, title) => {
      const s = every(ts); tl.range([0, 2], [-2.6, 2.6]); tl.titles('t (s)', title); tl.line('x', s, every(x), { color: '--line', width: 1 }); tl.line('y', s, every(y), { color: '--c-B', width: 2 });
      const X = specDb(x), Y = specDb(y); bl.range([0, 150], [-90, 5]); bl.titles('f (Hz)', 'spectrum in (grey) and out (blue), dB'); bl.line('X', X.f, X.d, { color: '--c-ref', width: 1.2 }); bl.line('Y', Y.f, Y.d, { color: '--c-B', width: 1.6 });
    };
    return {
      changed() { for (const k of all) { k.show(false); k.show(true); } },
      update() {
        const c = state.case, x = signal(state.sn, state.hum);
        if (c === 'kernel') {
          const h = kernel(state.kern, state.M), y = convSame(x, h); shared(x, y, 'input (grey) and smoothed output (blue)');
          const m = (h.length - 1) / 2, hk = h.map((_, i) => (i - m) / FS * 1000);
          tr.range([Math.min(-20, hk[0] * 1.2), Math.max(20, hk[hk.length - 1] * 1.2)], [0, Math.max(...h) * 1.2]); tr.titles('lag (ms)', `h[n]: kernel of ${state.M} samples = ${fmt(1000 * state.M / FS)} ms`); tr.stems('h', hk, h, { color: '--c-I', width: state.M > 60 ? 1.2 : 2.4 });
          const fs = Array.from({ length: 400 }, (_, i) => i * 150 / 399), H = fs.map((f) => Math.max(-90, 20 * Math.log10(response(h, f / FS) + 1e-9)));
          br.range([0, 150], [-90, 5]); br.titles('f (Hz)', `|H(f)| (dB): ${state.kern === 'rect' ? 'a sinc — zeros at multiples of fs/M' : 'a Gaussian — no sidelobes'}`); br.line('H', fs, H, { color: '--c-I' }); br.line('hum', [60, 60], [-90, 5], { color: '--c-north', dashed: true, width: 1 });
          const g60 = 20 * Math.log10(response(h, 60 / FS) + 1e-9), edge = 1000 * (state.kern === 'rect' ? state.M : state.M / 3) / FS;
          hud.set('a', `${state.kern === 'rect' ? 'moving average' : 'Gaussian'} of ${state.M} samples: y = h * x  ↔  Y = H·X`); hud.set('b', `60 Hz hum attenuated by ${fmt(-g60)} dB`, g60 < -30 ? 'good' : g60 > -10 ? 'bad' : '');
          hud.set('c', `price: each edge is smeared over ≈ ${fmt(edge)} ms`);
          const Ms = Array.from({ length: 75 }, (_, i) => 3 + 2 * i); plots.aux.draw({ xlim: [3, 151], cursor: state.M, series: [{ x: Ms, y: Ms.map((M) => -20 * Math.log10(response(kernel(state.kern, M), 60 / FS) + 1e-9)), color: '--c-I', label: 'hum attenuation (dB) vs kernel length' }] });
        } else if (c === 'mask') {
          const M = mask(state.mk, state.fc, state.order), y = applyMask(x, FS, M); shared(x, y, 'input (grey) and masked output (blue): look at the edges');
          const m = maskImpulse(FS, N, M), lag = m.map((_, i) => (i - N / 2) / FS * 1000), W = Math.min(400, 3000 / state.fc);
          tr.range([-W, W], [Math.min(...m) * 1.3, Math.max(...m) * 1.15]); tr.titles('lag (ms)', 'm(t): equivalent impulse response F⁻¹{M}'); tr.line('m', lag, m, { color: '--c-I', width: 1.6 });
          const fs = Array.from({ length: 400 }, (_, i) => i * 150 / 399); br.range([0, 150], [0, 1.1]); br.titles('f (Hz)', state.mk === 'brick' ? `mask: 1 below ${state.fc} Hz, 0 above` : `mask 1/√(1 + (f/fc)^${2 * state.order})`); br.line('M', fs, fs.map(M), { color: '--c-I' });
          const under = -Math.min(...m) / Math.max(...m), clean = applyMask(signal(0, 0), FS, M), over = Math.max(...clean.slice(FS / 4 - 40, FS / 4 + 120));
          hud.set('a', `${state.mk === 'brick' ? 'brick wall' : `Butterworth n = ${state.order}`} at ${state.fc} Hz: Y = M·X  ↔  y = m * x`);
          hud.set('b', `the impulse response dips to ${fmt(100 * under)} % below zero → ringing`, under > 0.1 ? 'bad' : 'good'); hud.set('c', `without noise, the square wave's edge overshoots to ${fmt(over)} (Gibbs: 1.18)`);
          const ns = Array.from({ length: 12 }, (_, i) => i + 1); plots.aux.draw({ xlim: [1, 12], cursor: state.mk === 'butter' ? state.order : 12, series: [{ x: ns, y: ns.map((n) => { const q = maskImpulse(FS, N, mask('butter', state.fc, n)); return -100 * Math.min(...q) / Math.max(...q); }), color: '--c-I', label: 'impulse-response undershoot (%) vs Butterworth order' }] });
        } else if (c === 'gauss') {
          const s = state.sig / 1000, L = Math.max(3, 2 * Math.ceil(4 * s * FS) + 1), m = (L - 1) / 2, h = Array.from({ length: L }, (_, i) => Math.exp(-(((i - m) / FS) ** 2) / (2 * s * s))), tot = h.reduce((a, b) => a + b, 0), hn = h.map((v) => v / tot);
          const y = convSame(x, hn); shared(x, y, 'input (grey) and Gaussian-smoothed output (blue): no ringing');
          const lag = hn.map((_, i) => (i - m) / FS * 1000); tr.range([-Math.max(5, 4 * state.sig), Math.max(5, 4 * state.sig)], [0, Math.max(...hn) * 1.2]); tr.titles('lag (ms)', `h(t): Gaussian kernel, σt = ${state.sig} ms`); tr.line('h', lag, hn, { color: '--c-I' });
          const sf = 1 / (2 * Math.PI * s), fs = Array.from({ length: 400 }, (_, i) => i * 150 / 399);
          br.range([0, 150], [0, 1.1]); br.titles('f (Hz)', `|H(f)| = Gaussian with σf = 1/(2πσt) = ${fmt(sf)} Hz`); br.line('H', fs, fs.map((f) => response(hn, f / FS)), { color: '--c-I' }); br.line('sf', [sf, sf], [0, 1.1], { color: '--c-north', dashed: true, width: 1 });
          hud.set('a', `σt = ${state.sig} ms ↔ σf = ${fmt(sf)} Hz: σt·σf = 1/2π for the amplitude`); hud.set('b', 'Gaussian in, Gaussian out: no sidelobes in frequency, no ringing in time', 'good');
          hud.set('c', `hum at 60 Hz: ${fmt(20 * Math.log10(response(hn, 60 / FS) + 1e-12))} dB`);
          const ss = Array.from({ length: 60 }, (_, i) => 0.5 + i * 0.5); plots.aux.draw({ xlim: [0.5, 30], cursor: state.sig, series: [{ x: ss, y: ss.map((q) => 1000 / (2 * Math.PI * q)), color: '--c-I', label: 'σf (Hz) vs σt (ms)' }] });
        } else {
          const h = fir(state.ftype, state.ffc, state.ffc2, FS, state.taps), y = convSame(x, h); shared(x, y, `input (grey) and ${state.ftype} output (blue)`);
          const m = (h.length - 1) / 2, lag = h.map((_, i) => (i - m) / FS * 1000); tr.range([lag[0] * 1.1, lag[lag.length - 1] * 1.1], [Math.min(...h) * 1.3, Math.max(...h) * 1.2]); tr.titles('lag (ms)', `h[n]: ${state.taps} taps, a windowed sinc`); tr.stems('h', lag, h, { color: '--c-I', width: state.taps > 80 ? 1 : 2 });
          const fs = Array.from({ length: 400 }, (_, i) => i * 250 / 399); br.range([0, 250], [-90, 5]); br.titles('f (Hz)', '|H(f)| (dB)'); br.line('H', fs, fs.map((f) => Math.max(-90, 20 * Math.log10(response(h, f / FS) + 1e-9))), { color: '--c-I' }); br.line('hum', [60, 60], [-90, 5], { color: '--c-north', dashed: true, width: 1 });
          const tw = 3.3 * FS / state.taps;
          hud.set('a', `${state.ftype}, ${state.taps} taps (${fmt(1000 * state.taps / FS)} ms): transition band ≈ 3.3·fs/M = ${fmt(tw)} Hz`); hud.set('b', `60 Hz: ${fmt(20 * Math.log10(response(h, 60 / FS) + 1e-12))} dB`); hud.set('c', 'Hamming window: stop band about −53 dB');
          const Ts = Array.from({ length: 50 }, (_, i) => 5 + 6 * i); plots.aux.draw({ xlim: [5, 301], cursor: state.taps, series: [{ x: Ts, y: Ts.map((M) => 3.3 * FS / M), color: '--c-I', label: 'transition width (Hz) vs taps' }] });
        }
      },
      theme() { for (const k of all) k.theme(); },
    };
  },
};
