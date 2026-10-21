// Sampling and the Nyquist–Shannon theorem: a tone sampled and rebuilt (samples, sinc reconstruction, DFT,
// spectral replicas), the reconstruction kernel by kernel, aliasing seen three ways (two tones through the
// same samples, the folding roof, a strobed wheel), and the replicas of a band-limited pulse colliding.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { fft } from '../../lib/dsp.js';
import { sinc, aliasOf, signedAlias, reconstruct, gpulse, gspec, replicas } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const TOP = [-4.3, 0.55, 8.85, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0];

export default {
  id: 'sampling', title: 'Sampling', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10,
  defaults: { f0: 4, fs: 22, build: true, fa: 7, fsa: 10, rps: 2, fps: 24, B: 3, fsb: 20 },
  cases: [
    { id: 'tone', label: 'Sample a tone', set: {}, examples: [
      { id: 'ok', label: 'fs = 5.5 f₀: easy', controls: ['fs'], set: { fs: 22 } },
      { id: 'edge', label: 'fs just above 2 f₀', controls: ['fs'], set: { fs: 8.5 } },
      { id: 'alias', label: 'fs below 2 f₀: an alias', controls: ['fs'], set: { fs: 6 } },
    ] },
    { id: 'rebuild', label: 'Sinc reconstruction', set: {}, examples: [
      { id: 'fine', label: 'Many samples per cycle', controls: ['fs'], set: { fs: 20 } },
      { id: 'tight', label: 'Barely 2.2 per cycle: still exact', controls: ['fs'], set: { fs: 9 } },
      { id: 'under', label: 'Too few: rebuilds the wrong tone', controls: ['fs'], set: { fs: 6 } },
    ] },
    { id: 'alias', label: 'Aliasing', set: {}, examples: [
      { id: 'pair', label: '7 Hz at 10 Hz looks like 3 Hz', controls: ['fa'], set: { fa: 7 } },
      { id: 'near', label: 'Just below fs: a slow alias', controls: ['fa'], set: { fa: 9.6 } },
      { id: 'multiple', label: 'Exactly 2 fs: looks like DC', controls: ['fa'], set: { fa: 20 } },
    ] },
    { id: 'wheel', label: 'Wagon wheel', set: {}, examples: [
      { id: 'still', label: 'Wheel freezes', controls: ['rps'], set: { rps: 4, fps: 24 } },
      { id: 'back', label: 'Wheel turns backwards', controls: ['rps'], set: { rps: 3.8, fps: 24 } },
    ] },
    { id: 'replicas', label: 'Spectral replicas', set: {}, examples: [
      { id: 'apart', label: 'fs = 30 Hz: replicas apart', controls: ['fsb'], set: { fsb: 30 } },
      { id: 'touch', label: 'fs = 6B: they just touch', controls: ['fsb'], set: { fsb: 18 } },
      { id: 'crash', label: 'fs = 6 Hz: they crash', controls: ['fsb'], set: { fsb: 6 } },
    ] },
  ],
  controls: [
    { title: 'Tone', show: (s) => s.case === 'tone' || s.case === 'rebuild', items: [
      { id: 'f0', label: 'Tone f₀', unit: 'Hz', min: 1, max: 20, step: 0.5 },
      { id: 'fs', label: 'Sampling rate fs', unit: 'Hz', min: 3, max: 80, step: 0.5 },
      { id: 'build', label: 'Build it kernel by kernel', type: 'check', show: (s) => s.case === 'rebuild' },
    ] },
    { title: 'Alias', show: (s) => s.case === 'alias', items: [
      { id: 'fa', label: 'Tone f', unit: 'Hz', min: 0.2, max: 25, step: 0.1 },
      { id: 'fsa', label: 'Sampling rate fs', unit: 'Hz', min: 4, max: 30, step: 0.5 },
    ] },
    { title: 'Wheel', show: (s) => s.case === 'wheel', items: [
      { id: 'rps', label: 'Wheel speed', unit: 'rev/s', min: 0, max: 8, step: 0.05 },
      { id: 'fps', label: 'Camera frame rate', unit: 'frames/s', min: 6, max: 60, step: 1 },
    ] },
    { title: 'Pulse', show: (s) => s.case === 'replicas', items: [
      { id: 'B', label: 'Pulse bandwidth B', unit: 'Hz', min: 0.5, max: 10, step: 0.25 },
      { id: 'fsb', label: 'Sampling rate fs', unit: 'Hz', min: 2, max: 40, step: 0.5 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR });
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT }), all = [tl, tr, bl, br, top, bot];
    const wheelC = [-2.3, -0.1], WR = 1.8, spokes = createCurve(stage, { max: 60, width: 3, color: '--c-B' }), rim = createCurve(stage, { max: 200, width: 2, color: '--ink-dim' }), dot = createCurve(stage, { max: 1, width: 10, color: '--c-I' });
    const ghost = createCurve(stage, { max: 60, width: 1.4, color: '--line' }), wheel = [spokes, rim, dot, ghost];
    const ring = []; for (let i = 0; i < 100; i++) { const a = 2 * Math.PI * i / 100, b = 2 * Math.PI * (i + 1) / 100; ring.push(wheelC[0] + WR * Math.cos(a), wheelC[1] + WR * Math.sin(a), 0, wheelC[0] + WR * Math.cos(b), wheelC[1] + WR * Math.sin(b), 0); }
    rim.segments(ring);

    return {
      changed() {
        const c = state.case; for (const k of all) k.show(false); for (const w of wheel) w.object.visible = c === 'wheel';
        if (c === 'tone' || c === 'replicas') for (const k of [tl, tr, bl, br]) k.show(true);
        else if (c === 'rebuild' || c === 'alias') { top.show(true); bot.show(true); }
        else { tr.show(true); br.show(true); }
        ctx.setDuration(c === 'rebuild' || c === 'wheel' ? 10 : 0);
      },
      update() {
        const c = state.case, t = time.t;
        if (c === 'tone') {
          const f0 = state.f0, fs = state.fs, T = 1, ok = fs > 2 * f0, fa = aliasOf(f0, fs), xs = Array.from({ length: 1000 }, (_, i) => T * i / 999);
          const S = []; for (let n = 0; n <= T * fs; n++) S.push([n / fs, Math.sin(2 * Math.PI * f0 * n / fs)]);
          tl.range([0, T], [-1.4, 1.4]); tl.titles('t (s)', `${S.length} samples at fs = ${fs} Hz`); tl.line('x', xs, xs.map((v) => Math.sin(2 * Math.PI * f0 * v)), { color: '--c-ref', width: 1.4 }); tl.stems('s', S.map((p) => p[0]), S.map((p) => p[1]), { color: '--c-B', width: 2.4 }); tl.dots('d', S.map((p) => p[0]), S.map((p) => p[1]), { color: '--c-B', size: 7 });
          const Sx = []; for (let n = -60; n <= T * fs + 60; n++) Sx.push([n / fs, Math.sin(2 * Math.PI * f0 * n / fs)]);
          tr.range([0, T], [-1.4, 1.4]); tr.titles('t (s)', ok ? 'sinc reconstruction = the original ✓' : `sinc reconstruction = a ${fmt(fa)} Hz tone ✗`);
          tr.line('x', xs, xs.map((v) => Math.sin(2 * Math.PI * f0 * v)), { color: '--c-ref', width: 1.2, dashed: true }); tr.line('r', xs, xs.map((v) => reconstruct(Sx, 1 / fs, v)), { color: ok ? '--c-v' : '--c-north' });
          const N = 256, re = new Float64Array(N), im = new Float64Array(N); for (let n = 0; n < N; n++) re[n] = Math.sin(2 * Math.PI * f0 * n / fs) * (0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1))); fft(re, im);
          const fk = [], A = []; for (let k = 0; k <= N / 2; k++) { fk.push(k * fs / N); A.push(4 * Math.hypot(re[k], im[k]) / N); }
          bl.range([0, fs / 2], [0, 1.15]); bl.titles(`f (Hz), up to fs/2 = ${fmt(fs / 2)}`, ok ? 'DFT of the samples: peak at f₀' : `DFT: the peak is at ${fmt(fa)} Hz, not ${f0}`); bl.line('A', fk, A, { color: '--c-E' });
          const F = Math.max(3 * fs, 2.2 * f0), lines = [], lh = []; for (let k = -4; k <= 4; k++) for (const s of [-1, 1]) { const f = s * f0 + k * fs; if (Math.abs(f) <= F) { lines.push(f); lh.push(k === 0 ? 1 : 0.8); } }
          br.range([-F, F], [0, 1.2]); br.titles('f (Hz)', 'sampled spectrum: ±f₀ repeated every fs'); br.stems('rep', lines, lh, { color: '--c-I', width: 2.4 }); br.stems('orig', [-f0, f0], [1, 1], { color: '--c-B', width: 3.4 });
          br.line('n1', [-fs / 2, -fs / 2], [0, 1.2], { color: '--c-north', dashed: true, width: 1.2 }); br.line('n2', [fs / 2, fs / 2], [0, 1.2], { color: '--c-north', dashed: true, width: 1.2 });
          hud.set('a', `f₀ = ${f0} Hz, fs = ${fs} Hz → ${fmt(fs / f0)} samples per cycle`); hud.set('b', ok ? `fs > 2f₀ = ${2 * f0} Hz: recoverable ✓` : `fs < 2f₀ = ${2 * f0} Hz: aliased to ${fmt(fa)} Hz ✗`, ok ? 'good' : 'bad');
          hud.set('c', 'dashed red: the Nyquist band ±fs/2 that the reconstruction keeps');
          plots.aux.draw({ xlim: [0, 3 * fs], cursor: f0, series: [{ x: Array.from({ length: 301 }, (_, i) => i * fs / 100), y: Array.from({ length: 301 }, (_, i) => aliasOf(i * fs / 100, fs)), color: '--c-I', label: 'apparent frequency vs true frequency (Hz)' }] });
        } else if (c === 'rebuild') {
          // each sample contributes one sinc; their sum is the reconstruction
          const f0 = state.f0, fs = state.fs, T = 1, xs = Array.from({ length: 1200 }, (_, i) => -0.1 + 1.2 * i / 1199);
          const S = []; for (let n = -40; n <= T * fs + 40; n++) S.push([n / fs, Math.sin(2 * Math.PI * f0 * n / fs)]);
          const inWin = S.filter(([tn]) => tn >= 0 && tn <= T), upto = state.build ? Math.floor(inWin.length * Math.min(1, (t % 10) / 8)) : inWin.length, used = inWin.slice(0, upto);
          top.range([-0.1, 1.1], [-1.6, 1.6]); top.titles('t (s)', `each sample → one sinc kernel (${used.length} of ${inWin.length} drawn)`);
          for (let i = 0; i < 40; i++) { const k = `k${i}`; if (i < used.length && i < 40) top.line(k, xs, xs.map((v) => used[i][1] * sinc((v - used[i][0]) * fs)), { color: '--c-I', width: 1 }); else top.hide(k); }
          top.dots('s', used.map((p) => p[0]), used.map((p) => p[1]), { color: '--c-B', size: 8 });
          const part = xs.map((v) => used.reduce((a, [tn, xn]) => a + xn * sinc((v - tn) * fs), 0)), full = xs.map((v) => reconstruct(S, 1 / fs, v));
          bot.range([-0.1, 1.1], [-1.6, 1.6]); bot.titles('t (s)', 'the running sum (blue) against the original (dashed)');
          bot.line('o', xs, xs.map((v) => Math.sin(2 * Math.PI * f0 * v)), { color: '--c-ref', dashed: true, width: 1.4 }); bot.line('p', xs, state.build ? part : full, { color: fs > 2 * f0 ? '--c-B' : '--c-north' }); bot.dots('s', used.map((p) => p[0]), used.map((p) => p[1]), { color: '--c-B', size: 7 });
          hud.set('a', `x̂(t) = Σ x[n]·sinc((t − nTs)/Ts), Ts = ${fmt(1000 / fs)} ms`); hud.set('b', 'each kernel is 1 at its own sample and 0 at every other sample');
          hud.set('c', fs > 2 * f0 ? 'between samples the sincs fill in exactly the original ✓' : `undersampled: the sum is the ${fmt(aliasOf(f0, fs))} Hz alias ✗`, fs > 2 * f0 ? 'good' : 'bad');
          const ks = Array.from({ length: 401 }, (_, i) => -5 + i / 40); plots.aux.draw({ xlim: [-5, 5], series: [{ x: ks, y: ks.map(sinc), color: '--c-I', label: 'one kernel sinc(t/Ts) vs t/Ts' }] });
        } else if (c === 'alias') {
          const f = state.fa, fs = state.fsa, fa = signedAlias(f, fs), T = 1, xs = Array.from({ length: 1500 }, (_, i) => T * i / 1499);
          const S = []; for (let n = 0; n <= T * fs; n++) S.push([n / fs, Math.cos(2 * Math.PI * f * n / fs)]);
          top.range([0, T], [-1.4, 1.4]); top.titles('t (s)', `${f} Hz (grey) and ${fmt(Math.abs(fa))} Hz (orange) through the same samples`);
          top.line('f', xs, xs.map((v) => Math.cos(2 * Math.PI * f * v)), { color: '--c-ref', width: 1.2 }); top.line('a', xs, xs.map((v) => Math.cos(2 * Math.PI * fa * v)), { color: '--c-I', width: 2 }); top.dots('s', S.map((p) => p[0]), S.map((p) => p[1]), { color: '--c-B', size: 9 });
          const fx = Array.from({ length: 600 }, (_, i) => 25 * i / 599);
          bot.range([0, 25], [0, Math.max(fs / 2, 1) * 1.3]); bot.titles('true frequency (Hz)', `apparent frequency: rises to fs/2 = ${fmt(fs / 2)}, then folds back`);
          bot.line('roof', fx, fx.map((v) => aliasOf(v, fs)), { color: '--c-I' }); bot.line('id', [0, fs / 2], [0, fs / 2], { color: '--line', dashed: true, width: 1.2 }); bot.dots('now', [f], [aliasOf(f, fs)], { color: '--accent', size: 12 });
          for (let k = 1; k <= 4; k++) bot.line(`m${k}`, [k * fs / 2, k * fs / 2], [0, fs / 2], { color: '--c-north', dashed: true, width: 1 });
          hud.set('a', `f = ${f} Hz sampled at ${fs} Hz → appears at ${fmt(Math.abs(fa))} Hz`, f < fs / 2 ? 'good' : 'bad'); hud.set('b', `f̂ = |f − n·fs| with n = round(f/fs) = ${Math.round(f / fs)}`);
          hud.set('c', 'once sampled, no algorithm can tell them apart: filter BEFORE sampling');
          plots.aux.draw({ xlim: [0, 25], cursor: f, series: [{ x: fx, y: fx.map((v) => aliasOf(v, fs)), color: '--c-I', label: 'folding roof: apparent vs true (Hz)' }] });
        } else if (c === 'wheel') {
          // a wheel with one marked spoke, seen by a camera at fps frames per second
          const fr = Math.floor(t * state.fps), tc = fr / state.fps, ang = 2 * Math.PI * state.rps * tc, seg = [], gh = [];
          for (let k = 0; k < 6; k++) { const a = ang + k * Math.PI / 3; seg.push(wheelC[0], wheelC[1], 0.002, wheelC[0] + WR * Math.sin(a), wheelC[1] + WR * Math.cos(a), 0.002); }
          for (let k = 0; k < 6; k++) { const a = 2 * Math.PI * state.rps * t + k * Math.PI / 3; gh.push(wheelC[0], wheelC[1], 0.001, wheelC[0] + WR * Math.sin(a), wheelC[1] + WR * Math.cos(a), 0.001); }
          spokes.segments(seg); ghost.segments(gh); dot.segments([wheelC[0] + 0.85 * WR * Math.sin(ang), wheelC[1] + 0.85 * WR * Math.cos(ang), 0.003, wheelC[0] + 0.85 * WR * Math.sin(ang) + 0.001, wheelC[1] + 0.85 * WR * Math.cos(ang), 0.003]);
          // six identical spokes: the pattern repeats every 1/6 turn, so the spoke rate is 6·rps
          const fsp = 6 * state.rps, app = signedAlias(fsp, state.fps) / 6, appDot = signedAlias(state.rps, state.fps);
          const rs = Array.from({ length: 400 }, (_, i) => 8 * i / 399);
          tr.range([0, 8], [-state.fps / 12, state.fps / 12]); tr.titles('true speed (rev/s)', 'apparent speed of the spoke pattern (rev/s)'); tr.line('a', rs, rs.map((r) => signedAlias(6 * r, state.fps) / 6), { color: '--c-B' }); tr.dots('now', [state.rps], [app], { color: '--accent', size: 12 });
          br.range([0, 8], [-state.fps / 2, state.fps / 2]); br.titles('true speed (rev/s)', 'apparent speed of the orange marker (rev/s)'); br.line('a', rs, rs.map((r) => signedAlias(r, state.fps)), { color: '--c-I' }); br.dots('now', [state.rps], [appDot], { color: '--accent', size: 12 });
          hud.set('a', `wheel ${state.rps} rev/s, camera ${state.fps} frames/s (grey: what really happens)`);
          hud.set('b', Math.abs(app) < 0.02 ? 'the spokes look frozen: each frame they moved exactly a spoke' : app < 0 ? `the spokes seem to turn backwards at ${fmt(-app)} rev/s` : `the spokes seem to turn at ${fmt(app)} rev/s`, Math.abs(app - state.rps) < 0.01 ? 'good' : 'bad');
          hud.set('c', `6 identical spokes → the pattern repeats ${fmt(6 * state.rps)} times per second; Nyquist needs ${fmt(12 * state.rps)} frames/s`);
          plots.aux.draw({ xlim: [0, 8], cursor: state.rps, series: [{ x: rs, y: rs.map((r) => signedAlias(6 * r, state.fps) / 6), color: '--c-B', label: 'apparent spoke speed (rev/s) vs true' }] });
        } else {
          const B = state.B, fs = state.fsb, F = Math.max(2.5 * fs, 4 * B), fx = Array.from({ length: 1400 }, (_, i) => -F + 2 * F * i / 1399), X = (f) => gspec(f, B);
          const ts = Array.from({ length: 800 }, (_, i) => -1 + 2 * i / 799), S = []; for (let n = -Math.floor(fs); n <= fs; n++) S.push([n / fs, gpulse(n / fs, B)]);
          tl.range([-1, 1], [-0.1, 1.15]); tl.titles('t (s)', `Gaussian pulse (spectral width B = ${B} Hz) sampled at ${fs} Hz`); tl.line('x', ts, ts.map((v) => gpulse(v, B)), { color: '--c-ref', width: 1.4 }); tl.stems('s', S.map((p) => p[0]).filter((v) => Math.abs(v) <= 1), S.filter((p) => Math.abs(p[0]) <= 1).map((p) => p[1]), { color: '--c-B', width: 2 });
          tr.range([-F, F], [0, 1.6]); tr.titles('f (Hz)', 'replicas X(f − k·fs): original (blue), copies (orange)');
          for (let k = -4; k <= 4; k++) { if (k) tr.line(`r${k}`, fx, fx.map((f) => X(f - k * fs)), { color: '--c-I', dashed: true, width: 1.2 }); } tr.line('o', fx, fx.map(X), { color: '--c-B' });
          tr.line('n1', [-fs / 2, -fs / 2], [0, 1.6], { color: '--c-north', dashed: true, width: 1 }); tr.line('n2', [fs / 2, fs / 2], [0, 1.6], { color: '--c-north', dashed: true, width: 1 });
          const sum = fx.map((f) => replicas(X, f, fs)), over = fx.map((f, i) => sum[i] - X(f));
          bl.range([-F, F], [0, 1.6]); bl.titles('f (Hz)', 'what the samples actually contain: the sum'); bl.line('s', fx, sum, { color: '--c-E' });
          bl.stems('over', fx.filter((f, i) => Math.abs(f) <= fs / 2 && over[i] > 0.01 && i % 3 === 0), fx.map((f, i) => [f, sum[i], over[i]]).filter(([f, , o], i) => Math.abs(f) <= fs / 2 && o > 0.01 && i % 3 === 0).map((a) => a[1]), { color: '--c-north', width: 1.2 });
          // rebuild by keeping only |f| < fs/2 of the sum, compare with the original pulse
          const rec = ts.map((v) => reconstruct(S, 1 / fs, v)), err = Math.sqrt(ts.reduce((a, v, i) => a + (rec[i] - gpulse(v, B)) ** 2, 0) / ts.length);
          br.range([-1, 1], [-0.2, 1.2]); br.titles('t (s)', `rebuilt from the samples: RMS error ${fmt(err)}`); br.line('o', ts, ts.map((v) => gpulse(v, B)), { color: '--c-ref', dashed: true, width: 1.4 }); br.line('r', ts, rec, { color: err < 0.01 ? '--c-v' : '--c-north' });
          const inband = (() => { let a = 0, b = 0; for (const f of fx) { const o = replicas(X, f, fs) - X(f); if (Math.abs(f) <= fs / 2) { a += o; b += X(f); } } return a / b; })();
          hud.set('a', `fs = ${fs} Hz vs 2·(3B) = ${6 * B} Hz (the pulse's spectrum is ~0 beyond 3B)`, fs >= 6 * B ? 'good' : fs >= 4 * B ? '' : 'bad');
          hud.set('b', `aliased energy in the band: ${fmt(100 * inband)} % (red stems)`); hud.set('c', err < 0.01 ? 'replicas apart: an ideal low-pass rebuilds the pulse' : 'replicas overlap: the extra is folded in for good');
          const fsx = Array.from({ length: 77 }, (_, i) => 2 + i / 2); plots.aux.draw({ xlim: [2, 40], cursor: fs, series: [{ x: fsx, y: fsx.map((q) => { let a = 0, b = 0; for (let f = -q / 2; f <= q / 2; f += q / 200) { a += replicas(X, f, q) - X(f); b += X(f); } return 100 * a / b; }), color: '--c-north', label: 'aliased energy (%) vs fs (Hz)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); for (const w of wheel) w.theme(); },
    };
  },
};
