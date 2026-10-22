// Convolution as a sliding area: flip, shift, multiply, integrate — for two rectangles, for any pair of
// shapes, for short discrete sequences (with the sum written out), and the convolution theorem.
import { createChart } from '../../lib/viz/chart.js';
import { fft } from '../../lib/dsp.js';
import { SIGS, grid, convAt, conv } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '∞');
const TOP = [-4.3, 0.55, 8.85, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0];
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const OPTS = Object.entries(SIGS).map(([k, v]) => [k, v.label]);
const SEQ = { x: [1, 2, 3, 2, 1, 0, -1, -2, -1], h3: [1, 1, 1], diff: [1, -1], echo: [1, 0, 0, 0.5] };
const cache = {};
const outOf = (h, g) => (cache[h + g] ??= (() => { const tau = grid(6, 0.01), ts = grid(5, 0.02); return { ts, ys: ts.map((t) => convAt(SIGS[h].f, SIGS[g].f, t, tau)) }; })());

export default {
  id: 'convolution', title: 'Convolution', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10,
  defaults: { auto: true, t: -1.5, h: 'rect', g: 'gauss', k: 'h3', n: 4, wr: 1, wh: 1 },
  cases: [
    { id: 'steps', label: 'Rectangle * rectangle', set: { h: 'rect', g: 'rect' }, examples: [
      { id: 'enter', label: 't = −0.7: overlap growing', controls: ['t'], set: { auto: false, t: -0.7 } },
      { id: 'full', label: 't = 0: full overlap', controls: ['t'], set: { auto: false, t: 0 } },
      { id: 'wide', label: 'Different widths: a trapezoid', controls: ['wr', 'wh'], set: { wr: 1, wh: 2 } },
    ] },
    { id: 'pairs', label: 'Any pair', set: { h: 'rect', g: 'gauss' }, examples: [
      { id: 'blur', label: 'Rectangle * Gaussian: blurred edges', controls: ['h', 'g'], set: { h: 'rect', g: 'gauss' } },
      { id: 'gg', label: 'Gaussian * Gaussian: wider Gaussian', controls: ['h', 'g'], set: { h: 'gauss', g: 'gauss' } },
      { id: 'charge', label: 'Rectangle * exponential: charging', controls: ['h', 'g'], set: { h: 'rect', g: 'exp' } },
      { id: 'flip', label: 'Ramp: watch the flip', controls: ['h', 'g'], set: { h: 'rect', g: 'ramp' } },
    ] },
    { id: 'discrete', label: 'Discrete, by hand', set: {}, examples: [
      { id: 'avg', label: '3-point sum: smoothing', controls: ['n'], set: { k: 'h3', auto: false, n: 3 } },
      { id: 'diff', label: 'Difference [1, −1]: edges', controls: ['n'], set: { k: 'diff', auto: false, n: 4 } },
      { id: 'echo', label: 'Echo [1, 0, 0, ½]', controls: ['n'], set: { k: 'echo', auto: false, n: 5 } },
    ] },
    { id: 'theorem', label: 'Convolution theorem', set: { h: 'rect', g: 'rect' }, examples: [
      { id: 'rr', label: 'rect * rect ↔ sinc · sinc', controls: ['h', 'g'], set: { h: 'rect', g: 'rect' } },
      { id: 'rg', label: 'Smoothing kills the sidelobes', controls: ['h', 'g'], set: { h: 'rect', g: 'gauss' } },
    ] },
  ],
  controls: [
    { title: 'Signals', show: (s) => s.case === 'pairs' || s.case === 'theorem', items: [
      { id: 'h', label: 'h(τ)', type: 'select', options: OPTS }, { id: 'g', label: 'g(τ) (flipped and slid)', type: 'select', options: OPTS },
    ] },
    { title: 'Widths', show: (s) => s.case === 'steps', items: [
      { id: 'wr', label: 'Width of h', unit: 's', min: 0.3, max: 3, step: 0.1 }, { id: 'wh', label: 'Width of g', unit: 's', min: 0.3, max: 3, step: 0.1 },
    ] },
    { title: 'Sliding', show: (s) => s.case !== 'theorem', items: [
      { id: 'auto', label: 'Slide automatically', type: 'check' },
      { id: 't', label: 'Shift t', unit: 's', min: -4, max: 4, step: 0.05, show: (s) => !s.auto && s.case !== 'discrete' },
      { id: 'k', label: 'Kernel h[k]', type: 'segmented', options: [['h3', '[1 1 1]'], ['diff', '[1 −1]'], ['echo', '[1 0 0 ½]']], show: (s) => s.case === 'discrete' },
      { id: 'n', label: 'Output index n', unit: '', min: 0, max: 11, step: 1, show: (s) => !s.auto && s.case === 'discrete' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT }), tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR });
    const all = [top, bot, tl, tr, bl, br];
    const slide = (hf, gf, ts, ys, t, labelH, labelG) => {
      const tau = grid(5, 0.01), hv = tau.map(hf), gv = tau.map((u) => gf(t - u)), pr = hv.map((v, i) => v * gv[i]), area = pr.reduce((a, b) => a + b, 0) * 0.01;
      const ymax = Math.max(1.2, ...hv, ...gv) * 1.1;
      top.range([-5, 5], [-0.15 * ymax, ymax]); top.titles('τ (s)', `${labelH}(τ) blue · ${labelG}(t − τ) orange, at t = ${fmt(t)} · overlap green`);
      top.line('h', tau, hv, { color: '--c-B' }); top.line('g', tau, gv, { color: '--c-I' });
      top.stems('p', tau.filter((_, i) => i % 3 === 0 && pr[i] > 1e-4), pr.filter((v, i) => i % 3 === 0 && v > 1e-4), { color: '--c-v', width: 1.6 });
      top.line('t', [t, t], [-0.15 * ymax, ymax], { color: '--c-north', dashed: true, width: 1 });
      const ym = Math.max(...ys) * 1.2 || 1, upto = ts.filter((v) => v <= t);
      bot.range([-5, 5], [Math.min(0, ...ys) * 1.2, ym]); bot.titles('t (s)', `output (h * g)(t): each point is one green area`);
      bot.line('ghost', ts, ys, { color: '--line', width: 1 }); bot.line('y', upto, ys.slice(0, upto.length), { color: '--c-E' }); bot.dots('now', [t], [area], { color: '--accent', size: 12 });
      return area;
    };
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); if (c === 'steps' || c === 'pairs') { top.show(true); bot.show(true); } else for (const k of [tl, tr, bl, br]) k.show(true); ctx.setClock(c === 'theorem' ? 0 : 10); },
      update() {
        const c = state.case, tt = time.t;
        if (c === 'steps') {
          const a = state.wr, b = state.wh, hf = (u) => (Math.abs(u) <= a / 2 ? 1 : 0), gf = (u) => (Math.abs(u) <= b / 2 ? 1 : 0), ts = grid(5, 0.02);
          const ys = ts.map((t) => Math.max(0, Math.min(a, b, (a + b) / 2 - Math.abs(t))));
          const t = state.auto ? -4 + 8 * (tt % 10) / 10 : state.t, area = slide(hf, gf, ts, ys, t, 'h', 'g');
          const phase = Math.abs(t) > (a + b) / 2 ? 'no overlap: output 0' : Math.abs(t) > Math.abs(a - b) / 2 ? (t < 0 ? 'entering: overlap grows linearly' : 'leaving: overlap shrinks linearly') : 'one inside the other: flat top';
          hud.set('a', `t = ${fmt(t)} s: overlap area = ${fmt(area)}`); hud.set('b', phase);
          hud.set('c', `output lasts ${fmt(a + b)} s = ${a} + ${b}: widths add`);
          plots.aux.draw({ xlim: [-5, 5], cursor: t, series: [{ x: ts, y: ys, color: '--c-E', label: '(h * g)(t)' }] });
        } else if (c === 'pairs') {
          const { ts, ys } = outOf(state.h, state.g), t = state.auto ? -4 + 8 * (tt % 10) / 10 : state.t, area = slide(SIGS[state.h].f, SIGS[state.g].f, ts, ys, t, 'h', 'g');
          const note = { 'gauss+gauss': 'σ² add: σ_out = √2 · 0.3 = 0.42 s', 'rect+exp': 'an RC circuit charging, then discharging', 'rect+gauss': 'the Gaussian blurs the rectangle’s edges', 'rect+ramp': 'flipped: the low end leads, the tall end trails — slow rise, sudden drop' }[`${state.h}+${state.g}`] || 'the output is smoother than either input';
          hud.set('a', `t = ${fmt(t)} s: area = ${fmt(area)}`); hud.set('b', note); hud.set('c', 'flip g, slide it to t, multiply by h, take the area');
          plots.aux.draw({ xlim: [-5, 5], cursor: t, series: [{ x: ts, y: ys, color: '--c-E', label: `${SIGS[state.h].label} * ${SIGS[state.g].label}` }] });
        } else if (c === 'discrete') {
          const x = SEQ.x, h = SEQ[state.k], y = conv(x, h), L = y.length, n = state.auto ? Math.floor(L * (tt % 10) / 10) : Math.min(state.n, L - 1), idx = Array.from({ length: L }, (_, i) => i);
          tl.range([-1, L], [-2.5, 3.5]); tl.titles('k', 'x[k]'); tl.stems('x', x.map((_, i) => i), x, { color: '--c-B', width: 3 }); tl.dots('xd', x.map((_, i) => i), x, { color: '--c-B', size: 8 });
          const hk = h.map((_, j) => n - j); tr.range([-1, L], [-1.5, 1.5]); tr.titles('k', `h[${n} − k]: the kernel flipped and moved to n = ${n}`); tr.stems('h', hk, h, { color: '--c-I', width: 3 }); tr.dots('hd', hk, h, { color: '--c-I', size: 8 });
          const terms = h.map((v, j) => [n - j, v, x[n - j] ?? 0]).filter(([k]) => k >= 0 && k < x.length), pr = terms.map(([k, v, xv]) => [k, v * xv]);
          bl.range([-1, L], [-4, 4]); bl.titles('k', 'products x[k]·h[n − k]'); bl.stems('p', pr.map((p) => p[0]), pr.map((p) => p[1]), { color: '--c-v', width: 4 });
          br.range([-1, L], [Math.min(...y) - 1, Math.max(...y) + 1]); br.titles('n', 'y[n] = sum of the products'); br.stems('y', idx.filter((i) => i <= n), y.slice(0, n + 1), { color: '--c-E', width: 3 }); br.dots('now', [n], [y[n]], { color: '--accent', size: 11 });
          hud.set('a', `y[${n}] = ${terms.map(([k, v, xv]) => `${fmt(xv)}·${fmt(v)}`).join(' + ') || '0'} = ${fmt(y[n])}`);
          hud.set('b', { h3: 'three neighbours added: a smoothed copy', diff: 'each sample minus the previous: only changes survive', echo: 'the input plus half of it 3 samples later' }[state.k]);
          hud.set('c', `${x.length} + ${h.length} − 1 = ${L} output samples`);
          plots.aux.draw({ xlim: [0, L - 1], cursor: n, series: [{ x: idx, y, color: '--c-E', label: 'y[n]' }] });
        } else {
          // h, g, their spectra, and the spectrum of h * g = product of spectra
          const N = 1024, d = 0.02, ts = Array.from({ length: N }, (_, i) => (i - N / 2) * d), hv = ts.map(SIGS[state.h].f), gv = ts.map(SIGS[state.g].f), { ys } = outOf(state.h, state.g), yts = grid(5, 0.02);
          tl.range([-3, 3], [-0.2, 1.2]); tl.titles('t (s)', 'h (blue) and g (orange)'); tl.line('h', ts, hv, { color: '--c-B' }); tl.line('g', ts, gv, { color: '--c-I' });
          tr.range([-3, 3], [-0.1, Math.max(...ys) * 1.2]); tr.titles('t (s)', 'h * g, computed by sliding'); tr.line('y', yts, ys, { color: '--c-E' });
          const spec = (v) => { const re = Float64Array.from(v), im = new Float64Array(N); fft(re, im); const f = [], m = []; for (let i = 0; i < N; i++) { const k = (i + N / 2) % N; f.push((k < N / 2 ? k : k - N) / (N * d)); m.push(Math.hypot(re[k], im[k]) * d); } return { f, m }; };
          const H = spec(hv), G = spec(gv), F = 4, sel = (S) => S.f.map((f, i) => [f, S.m[i]]).filter(([f]) => Math.abs(f) <= F);
          bl.range([-F, F], [0, Math.max(...H.m, ...G.m) * 1.15]); bl.titles('f (Hz)', '|H(f)| (blue) and |G(f)| (orange)'); bl.line('H', sel(H).map((p) => p[0]), sel(H).map((p) => p[1]), { color: '--c-B' }); bl.line('G', sel(G).map((p) => p[0]), sel(G).map((p) => p[1]), { color: '--c-I' });
          const yv = ts.map((t) => { const i = Math.round((t + 5) / 0.02); return i >= 0 && i < ys.length ? ys[i] : 0; }), Y = spec(yv), P = H.m.map((v, i) => v * G.m[i]);
          br.range([-F, F], [0, Math.max(...P) * 1.15]); br.titles('f (Hz)', '|H|·|G| (dashed) on top of the spectrum of h * g'); br.line('Y', sel(Y).map((p) => p[0]), sel(Y).map((p) => p[1]), { color: '--c-E' }); br.line('P', H.f.filter((f) => Math.abs(f) <= F), P.filter((_, i) => Math.abs(H.f[i]) <= F), { color: '--c-north', dashed: true, width: 1.4 });
          hud.set('a', 'convolution in time = multiplication in frequency'); hud.set('b', 'where either spectrum is zero, the product is zero: a filter can only remove'); hud.set('c', state.g === 'gauss' ? 'the Gaussian has no sidelobes, so neither has the product' : 'two sinc → sinc²: sidelobes squared, much lower');
          plots.aux.draw({ xlim: [-F, F], series: [{ x: H.f.filter((f) => Math.abs(f) <= F), y: P.filter((_, i) => Math.abs(H.f[i]) <= F).map((v) => 20 * Math.log10(v / Math.max(...P) + 1e-9)), color: '--c-E', label: '|H·G| (dB) vs f (Hz)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); },
    };
  },
};
