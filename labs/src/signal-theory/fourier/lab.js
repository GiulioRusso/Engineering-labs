// Fourier series and transform: harmonics as epicycles building a wave, how each coefficient is measured
// (multiply and take the area), the Gibbs overshoot, the line spectrum of a pulse train turning into a
// continuous transform as the period grows, DFT leakage and windows, and the uncertainty of a tone burst.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { WAVES, bn, partialSum, WINDOWS } from './model.js';
import { fft } from '../../lib/dsp.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const TOP = [-4.3, 0.55, 8.85, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0];
const ERR = { n: Array.from({ length: 40 }, (_, i) => i + 1) };
const errCurve = (kind) => (ERR[kind] ??= ERR.n.map((n) => { let e = 0; for (let i = 0; i < 200; i++) { const v = i / 200 + 0.0025; e += (partialSum(kind, n, v) - WAVES[kind].f(v)) ** 2; } return Math.sqrt(e / 200); }));
const sinc = (u) => (Math.abs(u) < 1e-12 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u));
const SERIES = [['square', 'Square'], ['saw', 'Sawtooth'], ['triangle', 'Triangle']];

export default {
  id: 'fourier', title: 'Fourier', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  defaults: { kind: 'square', N: 5, comps: false, n: 1, G: 9, tau: 1, T: 4, f1: 5.3, Ns: 64, win: 'rect', copies: true, sig: 0.5, fc: 6 },
  cases: [
    { id: 'series', label: 'Fourier series', set: {}, examples: [
      { id: 'one', label: 'One harmonic: just a sine', controls: ['N'], set: { N: 1 } },
      { id: 'three', label: 'Add the 3rd and 5th', controls: ['N', 'comps'], set: { N: 5, comps: true } },
      { id: 'saw', label: 'Sawtooth: every harmonic', controls: ['kind', 'N'], set: { kind: 'saw', N: 8 } },
      { id: 'triangle', label: 'Triangle: converges fast', controls: ['kind', 'N'], set: { kind: 'triangle', N: 3 } },
    ] },
    { id: 'project', label: 'Finding a coefficient', set: {}, examples: [
      { id: 'first', label: 'n = 1: area 4/π', controls: ['n'], set: { n: 1 } },
      { id: 'even', label: 'n = 2: the areas cancel', controls: ['n'], set: { n: 2 } },
      { id: 'third', label: 'n = 3: a third as big', controls: ['n'], set: { n: 3 } },
    ] },
    { id: 'gibbs', label: 'Gibbs phenomenon', set: { kind: 'square' }, examples: [
      { id: 'few', label: '5 harmonics', controls: ['G'], set: { G: 5 } },
      { id: 'many', label: '100 harmonics: still 9 %', controls: ['G'], set: { G: 100 } },
    ] },
    { id: 'transform', label: 'Series → transform', set: {}, examples: [
      { id: 'dense', label: 'Period 4×: lines 4× denser', controls: ['T'], set: { T: 16 } },
      { id: 'tight', label: 'Period = 2τ: square wave', controls: ['T'], set: { T: 2 } },
      { id: 'narrow', label: 'Narrow pulse: wide envelope', controls: ['tau'], set: { tau: 0.3 } },
    ] },
    { id: 'leakage', label: 'DFT leakage', set: {}, examples: [
      { id: 'onbin', label: 'Exactly 5 cycles: one bin', controls: ['f1'], set: { f1: 5 } },
      { id: 'half', label: '5.5 cycles: worst leakage', controls: ['f1'], set: { f1: 5.5 } },
      { id: 'hann', label: 'Hann window: leakage tamed', controls: ['win', 'f1'], set: { win: 'hann' } },
      { id: 'blackman', label: 'Blackman: lowest skirts', controls: ['win', 'f1'], set: { win: 'blackman' } },
    ] },
    { id: 'uncert', label: 'Uncertainty', set: {}, examples: [
      { id: 'short', label: 'Short burst: wide spectrum', controls: ['sig'], set: { sig: 0.1 } },
      { id: 'long', label: 'Long burst: sharp frequency', controls: ['sig'], set: { sig: 2 } },
    ] },
  ],
  controls: [
    { title: 'Series', show: (s) => s.case === 'series', items: [
      { id: 'kind', label: 'Waveform', type: 'segmented', options: SERIES },
      { id: 'N', label: 'Harmonics N', unit: '', min: 1, max: 40, step: 1 },
      { id: 'comps', label: 'Show each harmonic', type: 'check' },
    ] },
    { title: 'Coefficient', show: (s) => s.case === 'project', items: [{ id: 'n', label: 'Harmonic n', unit: '', min: 1, max: 9, step: 1 }] },
    { title: 'Gibbs', show: (s) => s.case === 'gibbs', items: [{ id: 'G', label: 'Harmonics N', unit: '', min: 1, max: 200, step: 1 }] },
    { title: 'Pulse train', show: (s) => s.case === 'transform', items: [
      { id: 'tau', label: 'Pulse width τ', unit: 's', min: 0.2, max: 2, step: 0.05 },
      { id: 'T', label: 'Period T', unit: 's', min: 1, max: 30, step: 0.5 },
    ] },
    { title: 'DFT', show: (s) => s.case === 'leakage', items: [
      { id: 'f1', label: 'Tone (cycles in the record)', unit: '', min: 2, max: 12, step: 0.05 },
      { id: 'Ns', label: 'Samples N', type: 'segmented', options: [[32, '32'], [64, '64'], [128, '128']] },
      { id: 'win', label: 'Window', type: 'segmented', options: Object.entries(WINDOWS).map(([k, v]) => [k, v.label]) },
      { id: 'copies', label: 'Show the repeated record', type: 'check' },
    ] },
    { title: 'Tone burst', show: (s) => s.case === 'uncert', items: [
      { id: 'sig', label: 'Burst length σt', unit: 's', min: 0.05, max: 3, step: 0.01 },
      { id: 'fc', label: 'Tone frequency', unit: 'Hz', min: 2, max: 10, step: 0.5 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR });
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT }), trace = createChart(ctx, { box: [-1.2, 0.35, 5.75, 2.3], x: [0, 1], y: [-1.5, 1.5] }), spec = createChart(ctx, { box: [-4.3, -2.35, 8.85, 1.6] });
    const circles = createCurve(stage, { max: 4000, width: 1.2, color: '--c-ref' }), arms = createCurve(stage, { max: 80, width: 2, color: '--c-E' }), link = createCurve(stage, { max: 1, width: 1, color: '--c-F', dashed: true });
    const EC = [-2.8, 1.5], ES = 1.0, all = [tl, tr, bl, br, top, bot, trace, spec], epi = [circles, arms, link];

    return {
      changed() {
        const c = state.case; for (const k of all) k.show(false); for (const o of epi) o.object.visible = c === 'series';
        ctx.setDuration(c === 'series' || c === 'project' ? 8 : 0);
        if (c === 'series') { trace.show(true); spec.show(true); }
        else if (c === 'gibbs' || c === 'transform') { top.show(true); bot.show(true); }
        else for (const k of [tl, tr, bl, br]) k.show(true);
      },
      update() {
        const c = state.case, t = time.t;
        if (c === 'series') {
          // harmonic n is a circle of radius |b_n| turning n times per period; the tip's height is the sum
          const u = (t / 4) % 1, seg = [], arm = []; let x = EC[0], y = EC[1];
          for (let n = 1; n <= state.N; n++) {
            const b = bn(state.kind, n); if (!b) continue;
            const r = Math.abs(b) * ES, a = 2 * Math.PI * n * u + (b < 0 ? Math.PI : 0);
            for (let k = 0; k < 40; k++) { const p = 2 * Math.PI * k / 40, q = 2 * Math.PI * (k + 1) / 40; seg.push(x + r * Math.cos(p), y + r * Math.sin(p), 0, x + r * Math.cos(q), y + r * Math.sin(q), 0); }
            const nx = x + r * Math.cos(a), ny = y + r * Math.sin(a); arm.push(x, y, 0.001, nx, ny, 0.001); x = nx; y = ny;
          }
          circles.segments(seg); arms.segments(arm);
          const xs = [], ys = [], tg = []; for (let i = 0; i <= 500; i++) { const v = i / 500; xs.push(v); ys.push(partialSum(state.kind, state.N, v)); tg.push(WAVES[state.kind].f(v)); }
          trace.range([0, 1], [-1.5, 1.5]); trace.titles('one period', 'partial sum (blue), target (dashed)');
          trace.line('target', xs, tg, { color: '--c-ref', dashed: true, width: 1.4 }); trace.line('sum', xs, ys);
          const now = []; for (let i = 0; i <= 500 * u; i++) now.push(i / 500); trace.line('now', now, now.map((v) => partialSum(state.kind, state.N, v)), { color: '--c-E', width: 3.4 });
          for (let n = 1; n <= 12; n++) { const b = bn(state.kind, n); if (state.comps && b && n <= state.N) trace.line(`c${n}`, xs, xs.map((v) => b * Math.sin(2 * Math.PI * n * v)), { color: '--c-I', width: 1 }); else trace.hide(`c${n}`); }
          link.segments([x, y, 0.001, trace.mx(u), trace.my(partialSum(state.kind, state.N, u)), 0.001]);
          const M = Math.max(state.N, 15), ns = Array.from({ length: M }, (_, i) => i + 1);
          spec.range([0, M + 1], [0, 1.4]); spec.titles('harmonic n', 'line spectrum |bₙ|');
          spec.stems('b', ns, ns.map((n) => Math.abs(bn(state.kind, n))), { color: '--c-ref', width: 3 }); spec.stems('used', ns.filter((n) => n <= state.N), ns.filter((n) => n <= state.N).map((n) => Math.abs(bn(state.kind, n))), { color: '--c-E', width: 4 });
          let err = 0; for (let i = 0; i < 500; i++) err += (ys[i] - tg[i]) ** 2; err = Math.sqrt(err / 500);
          hud.set('a', `${WAVES[state.kind].label}: ${state.N} harmonic${state.N > 1 ? 's' : ''} → ${ns.filter((n) => n <= state.N && bn(state.kind, n)).length} circles`);
          hud.set('b', state.kind === 'square' ? 'bₙ = 4/(nπ), odd n only: 1, 1/3, 1/5…' : state.kind === 'saw' ? 'bₙ = ±2/(nπ), every n' : 'bₙ = ±8/(n²π²), odd n: 1, 1/9, 1/25…');
          hud.set('c', `RMS error ${fmt(err)}`);
          plots.aux.draw({ xlim: [1, 40], cursor: state.N, series: [{ x: ERR.n, y: errCurve(state.kind), color: '--c-E', label: 'RMS error vs number of harmonics' }] });
        } else if (c === 'project') {
          // b_n = 2/T ∫ x(t) sin(2πnt/T) dt: multiply the wave by the probe, the area is the coefficient
          const n = state.n, xs = Array.from({ length: 601 }, (_, i) => i / 600), sq = xs.map((v) => WAVES.square.f(v)), pr = xs.map((v) => Math.sin(2 * Math.PI * n * v)), prod = xs.map((_, i) => sq[i] * pr[i]);
          const reveal = Math.min(1, (t % 8) / 6), upto = xs.filter((v) => v <= reveal);
          tl.range([0, 1], [-1.4, 1.4]); tl.titles('one period', 'the square wave x(t)'); tl.line('x', xs, sq, { color: '--c-B' });
          tr.range([0, 1], [-1.4, 1.4]); tr.titles('one period', `the probe sin(2π·${n}·t)`); tr.line('p', xs, pr, { color: '--c-I' });
          bl.range([0, 1], [-1.4, 1.4]); bl.titles('one period', 'their product: area above minus area below');
          bl.line('prod', xs, prod, { color: '--c-ref', width: 1.2 });
          bl.stems('pos', upto.filter((_, i) => prod[i] > 0), upto.map((_, i) => prod[i]).filter((p) => p > 0), { color: '--c-v', width: 1.4 }); bl.stems('neg', upto.filter((_, i) => prod[i] < 0), upto.map((_, i) => prod[i]).filter((p) => p < 0), { color: '--c-north', width: 1.4 });
          let area = 0; for (let i = 0; i < upto.length - 1; i++) area += prod[i] / 600; const bcalc = 2 * area;
          const cum = upto.map((_, i) => { let s = 0; for (let j = 0; j <= i; j++) s += prod[j] / 600; return 2 * s; });
          br.range([0, 1], [-0.5, 1.6]); br.titles('one period', `running 2∫x·probe → b${n}`); br.line('cum', upto, cum, { color: '--c-E' }); br.line('true', [0, 1], [bn('square', n), bn('square', n)], { color: '--c-north', dashed: true, width: 1.4 });
          hud.set('a', `measuring b${n}: multiply, then add up the area over one period`);
          hud.set('b', `so far 2∫ = ${fmt(bcalc)}${reveal >= 1 ? ` → b${n} = ${fmt(bn('square', n))}` : ''}`, reveal >= 1 ? 'good' : '');
          hud.set('c', n % 2 ? `odd n: green beats red, b${n} = 4/(${n}π)` : 'even n: green and red cancel exactly, bₙ = 0');
          const ks = Array.from({ length: 9 }, (_, i) => i + 1); plots.aux.draw({ xlim: [0.5, 9.5], cursor: n, series: [{ x: ks, y: ks.map((k) => bn('square', k)), color: '--c-E', label: 'bₙ of the square wave vs n' }] });
        } else if (c === 'gibbs') {
          const N = state.G, M = (k) => 2 * k - 1, sum = (v) => { let s = 0; for (let k = 1; k <= N; k++) s += 4 / (Math.PI * M(k)) * Math.sin(2 * Math.PI * M(k) * v); return s; };
          const xs = Array.from({ length: 1500 }, (_, i) => -0.5 + i / 1499), ys = xs.map(sum), tg = xs.map((v) => WAVES.square.f(v));
          top.range([-0.5, 0.5], [-1.5, 1.5]); top.titles('one period', `square wave and its first ${N} odd harmonics`); top.line('t', xs, tg, { color: '--c-ref', dashed: true, width: 1.4 }); top.line('s', xs, ys, { color: '--c-B', width: 1.8 });
          const span = Math.max(0.01, 3 / (2 * N)), zx = Array.from({ length: 800 }, (_, i) => -span / 4 + (span * 1.25) * i / 799), zy = zx.map(sum), pk = Math.max(...zy);
          bot.range([zx[0], zx[zx.length - 1]], [0.6, 1.25]); bot.titles(`zoom on the jump: the first ${fmt(span * 1000)} ms`, 'overshoot'); bot.line('z', zx, zy, { color: '--c-B' }); bot.line('one', [zx[0], zx[zx.length - 1]], [1, 1], { color: '--ink-dim', width: 1 }); bot.line('pk', [zx[0], zx[zx.length - 1]], [pk, pk], { color: '--c-north', dashed: true, width: 1.4 });
          hud.set('a', `peak ${fmt(pk, 4)}: overshoot ${fmt(100 * (pk - 1) / 2, 3)} % of the jump (2)`); hud.set('b', `the spike sits 1/(2·${2 * N}) of a period from the jump and gets narrower`); hud.set('c', 'its height never goes to zero: ≈ 8.95 %', 'bad');
          const Gs = [1, 2, 3, 5, 8, 12, 20, 30, 50, 80, 120, 200]; plots.aux.draw({ xlim: [1, 200], cursor: N, series: [{ x: Gs, y: Gs.map((g) => { let m = 0; for (let i = 1; i < 400; i++) { const v = i / (400 * 2 * g) * 1.5; let s = 0; for (let k = 1; k <= g; k++) s += 4 / (Math.PI * M(k)) * Math.sin(2 * Math.PI * M(k) * v); m = Math.max(m, s); } return 100 * (m - 1) / 2; }), color: '--c-north', label: 'overshoot (% of the jump) vs N: flat at 8.95' }] });
        } else if (c === 'transform') {
          // a pulse train of width τ and period T: lines at n/T, under the envelope (τ/T)·sinc(fτ)
          const tau = state.tau, T = Math.max(state.T, tau * 1.01), xs = Array.from({ length: 1600 }, (_, i) => -10 + 20 * i / 1599);
          top.range([-10, 10], [-0.2, 1.3]); top.titles('t (s)', `pulses of width τ = ${tau} s repeating every T = ${T} s`); top.line('x', xs, xs.map((v) => (Math.abs(((v % T) + 1.5 * T) % T - T / 2) <= tau / 2 ? 1 : 0)), { color: '--c-B' });
          const F = 6, ns = [], cs = []; for (let n = -Math.floor(F * T); n <= F * T; n++) { ns.push(n / T); cs.push(T * (tau / T) * Math.abs(sinc(n * tau / T))); }
          bot.range([-F, F], [0, tau * 1.15]); bot.titles('f (Hz)', 'T·|cₙ| at n/T (stems) and the transform τ·|sinc(fτ)| (dashed)');
          bot.stems('c', ns, cs, { color: '--c-E', width: T > 10 ? 1.4 : 3 }); const fx = Array.from({ length: 800 }, (_, i) => -F + 2 * F * i / 799); bot.line('env', fx, fx.map((f) => tau * Math.abs(sinc(f * tau))), { color: '--c-north', dashed: true, width: 1.4 });
          hud.set('a', `lines every 1/T = ${fmt(1 / T)} Hz; envelope zeros every 1/τ = ${fmt(1 / tau)} Hz`); hud.set('b', `${fmt(T / tau)} lines between two zeros of the envelope`); hud.set('c', T > 12 ? 'T → ∞: the lines merge into the continuous transform' : 'make T larger: the lines crowd together under the same envelope');
          plots.aux.draw({ xlim: [1, 30], cursor: T, series: [{ x: Array.from({ length: 59 }, (_, i) => 1 + i / 2), y: Array.from({ length: 59 }, (_, i) => 1 / (1 + i / 2)), color: '--c-E', label: 'line spacing 1/T (Hz) vs period T (s)' }] });
        } else if (c === 'leakage') {
          const N = state.Ns, n = Array.from({ length: N }, (_, i) => i), x = n.map((i) => Math.sin(2 * Math.PI * state.f1 * i / N)), w = n.map((i) => WINDOWS[state.win].w(i, N)), xw = x.map((v, i) => v * w[i]);
          const reps = state.copies ? 3 : 1, rn = Array.from({ length: N * reps }, (_, i) => i - (reps > 1 ? N : 0));
          tl.range([rn[0], rn[rn.length - 1]], [-1.4, 1.4]); tl.titles('sample n', state.copies ? 'the DFT assumes the record repeats: see the seams' : 'the record and the window');
          tl.line('x', rn, rn.map((i) => x[((i % N) + N) % N]), { color: '--c-B', width: 1.4 }); tl.line('w', n, w, { color: '--c-I', dashed: true, width: 1.4 });
          if (state.copies) { tl.line('s1', [0, 0], [-1.4, 1.4], { color: '--c-north', width: 1 }); tl.line('s2', [N, N], [-1.4, 1.4], { color: '--c-north', width: 1 }); } else { tl.hide('s1'); tl.hide('s2'); }
          tr.range([0, N - 1], [-1.4, 1.4]); tr.titles('sample n', 'windowed record: ends brought smoothly to zero'); tr.stems('xw', n, xw, { color: '--c-v', width: 2 });
          const re = Float64Array.from(xw), im = new Float64Array(N); fft(re, im); const g = w.reduce((a, b) => a + b, 0) / N;
          const k = Array.from({ length: N / 2 + 1 }, (_, i) => i), A = k.map((i) => (i === 0 ? 1 : 2) * Math.hypot(re[i], im[i]) / (N * g));
          bl.range([0, N / 2], [0, 1.1]); bl.titles('bin k (cycles per record)', 'DFT bins |X[k]|'); bl.stems('A', k, A, { color: '--c-E' }); bl.line('true', [state.f1, state.f1], [0, 1.1], { color: '--c-north', dashed: true, width: 1.2 });
          // dense spectrum (zero-padded) in dB to show the window's own shape
          const P = 4096, pr = new Float64Array(P), pi = new Float64Array(P); for (let i = 0; i < N; i++) pr[i] = xw[i]; fft(pr, pi);
          const fk = [], fd = []; for (let i = 0; i <= P / 2; i++) { fk.push(i * N / P); fd.push(Math.max(-100, 20 * Math.log10(2 * Math.hypot(pr[i], pi[i]) / (N * g) + 1e-9))); }
          br.range([0, N / 2], [-100, 5]); br.titles('frequency (bins)', 'in dB: the window’s main lobe and sidelobes'); br.line('d', fk, fd, { color: '--c-E', width: 1.4 }); br.dots('bins', k, A.map((v) => 20 * Math.log10(v + 1e-9)), { color: '--c-B', size: 6 });
          const on = Math.abs(state.f1 - Math.round(state.f1)) < 0.02, peak = Math.max(...A);
          hud.set('a', on ? `${state.f1} cycles exactly: the repeats join seamlessly → one bin` : `${state.f1} cycles: a jump at the seam → energy leaks into every bin`, on ? 'good' : 'bad');
          hud.set('b', `${WINDOWS[state.win].label}: peak reads ${fmt(peak)} (true amplitude 1)${on ? '' : `, scalloping loss ${fmt(20 * Math.log10(peak))} dB`}`);
          hud.set('c', { rect: 'main lobe 2 bins, sidelobes −13 dB', hann: 'main lobe 4 bins, sidelobes −31 dB', hamming: 'main lobe 4 bins, sidelobes −42 dB', blackman: 'main lobe 6 bins, sidelobes −58 dB' }[state.win]);
          plots.aux.draw({ xlim: [0, N - 1], series: Object.keys(WINDOWS).map((wk, j) => ({ x: n, y: n.map((i) => WINDOWS[wk].w(i, N)), color: ['--c-ref', '--c-B', '--c-I', '--c-v'][j], label: WINDOWS[wk].label })) });
        } else {
          // Gaussian tone burst: σt in time, σf = 1/(4πσt) in frequency
          const s = state.sig, fc = state.fc, xs = Array.from({ length: 1200 }, (_, i) => -6 + 12 * i / 1199), env = xs.map((v) => Math.exp(-v * v / (4 * s * s)));
          tl.range([-6, 6], [-1.2, 1.2]); tl.titles('t (s)', `tone burst: ${fc} Hz under a Gaussian envelope`); tl.line('x', xs, xs.map((v, i) => env[i] * Math.cos(2 * Math.PI * fc * v)), { color: '--c-B', width: 1.2 }); tl.line('e', xs, env, { color: '--c-I', dashed: true, width: 1.2 });
          const sf = 1 / (4 * Math.PI * s), fx = Array.from({ length: 800 }, (_, i) => fc - 4 + 8 * i / 799), Xf = fx.map((f) => Math.exp(-((f - fc) ** 2) / (4 * sf * sf)));
          tr.range([fc - 4, fc + 4], [0, 1.15]); tr.titles('f (Hz)', `|X(f)|: σf = ${fmt(sf)} Hz`); tr.line('X', fx, Xf, { color: '--c-E' }); tr.line('a', [fc - sf, fc - sf], [0, 1.15], { color: '--c-north', dashed: true, width: 1 }); tr.line('b', [fc + sf, fc + sf], [0, 1.15], { color: '--c-north', dashed: true, width: 1 });
          bl.range([-6, 6], [0, 1.1]); bl.titles('t (s)', `energy |x|² envelope: σt = ${fmt(s)} s`); bl.line('E', xs, env.map((v) => v * v), { color: '--c-I' }); bl.line('a', [-s, -s], [0, 1.1], { color: '--c-north', dashed: true, width: 1 }); bl.line('b', [s, s], [0, 1.1], { color: '--c-north', dashed: true, width: 1 });
          br.range([0, 3], [0, 1.6]); br.titles('σt (s)', 'σf (Hz): σt·σf = 1/4π'); const ss = Array.from({ length: 200 }, (_, i) => 0.04 + i * 0.015); br.line('h', ss, ss.map((v) => 1 / (4 * Math.PI * v)), { color: '--c-north' }); br.dots('now', [s], [sf], { color: '--accent', size: 11 });
          hud.set('a', `σt = ${fmt(s)} s, σf = ${fmt(sf)} Hz, product ${fmt(s * sf)} = 1/4π`); hud.set('b', s < 0.3 ? 'a click: sharp in time, smeared over many frequencies' : s > 1 ? 'a long note: its pitch is very precise' : 'halve the burst, double the spread in frequency');
          hud.set('c', `to tell two tones ${fmt(2 * sf)} Hz apart you must listen ≈ ${fmt(2 * s)} s`);
          plots.aux.draw({ xlim: [0.05, 3], cursor: s, series: [{ x: ss, y: ss.map((v) => 1 / (4 * Math.PI * v)), color: '--c-E', label: 'σf (Hz) vs σt (s)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); for (const o of epi) o.theme(); },
    };
  },
};
