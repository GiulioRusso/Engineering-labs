// Signal analysis in practice: reading FFT bins (raw order, fftshift, zero padding, resolution = 1/T),
// a window rescuing a weak tone, shifting a spectrum with a complex phasor, resampling with and without an
// anti-alias filter, amplitude/phase/instantaneous frequency from I/Q, frequency estimation against the
// Cramér–Rao bound, and finding plateaus with a derivative and a kernel density.
import { createChart } from '../../lib/viz/chart.js';
import { gaussian, WINDOWS } from '../../lib/dsp.js';
import { rawFFT, shift, estimate, crlb, monteCarlo, decimate, smoothDeriv, kde } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0];
const pow2 = (n) => 2 ** Math.ceil(Math.log2(n));
const MCC = {};

export default {
  id: 'analysis', title: 'Signal analysis', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  defaults: { fs: 1000, T: 0.128, pad: 1, f1: 100, f2: 118, a2: 0.01, win: 'hamming', fLO: 300, D: 4, aa: false, snr: 20, Ne: 128, sn: 0.05, thr: 0.4, bw: 0.06, sw: 21 },
  cases: [
    { id: 'bins', label: 'FFT bins', set: { a2: 1, win: 'rect' }, examples: [
      { id: 'resolve', label: 'Observe longer: the tones split', controls: ['T'], set: { T: 0.512 } },
      { id: 'pad', label: 'Zero-pad ×8: smoother, not sharper', controls: ['pad'], set: { pad: 8 } },
    ] },
    { id: 'window', label: 'Hamming window', set: { a2: 0.01 }, examples: [
      { id: 'rect', label: 'No window: the weak tone is buried', controls: ['win'], set: { win: 'rect' } },
      { id: 'hamming', label: 'Hamming: it stands out', controls: ['win'], set: { win: 'hamming' } },
    ] },
    { id: 'shift', label: 'RF → IF shift', set: {}, examples: [
      { id: 'dc', label: 'fLO = fc: to DC', controls: ['fLO'], set: { fLO: 400 } },
    ] },
    { id: 'resample', label: 'Resampling', set: {}, examples: [
      { id: 'alias', label: 'Decimate ×4, no filter: aliases', controls: ['D', 'aa'], set: { D: 4, aa: false } },
      { id: 'clean', label: 'With the anti-alias filter', controls: ['D', 'aa'], set: { D: 4, aa: true } },
    ] },
    { id: 'iq', label: 'I/Q → amplitude and phase', set: {}, examples: [
      { id: 'noisy', label: 'With noise', controls: ['sn'], set: { sn: 0.15 } },
    ] },
    { id: 'crlb', label: 'Frequency estimation', set: {}, examples: [
      { id: 'low', label: 'Low SNR: far from the bound', controls: ['snr'], set: { snr: 0 } },
      { id: 'long', label: 'Longer pulse: N^(3/2) better', controls: ['Ne'], set: { Ne: 512 } },
    ] },
    { id: 'plateau', label: 'Plateau detection', set: {}, examples: [
      { id: 'noisy', label: 'More noise: smooth harder', controls: ['sn', 'sw'], set: { sn: 0.15, sw: 41 } },
      { id: 'narrow', label: 'Narrow kernel: false peaks', controls: ['bw'], set: { bw: 0.015 } },
    ] },
  ],
  controls: [
    { title: 'Record', show: (s) => s.case === 'bins' || s.case === 'window', items: [
      { id: 'fs', label: 'Sampling rate', unit: 'Hz', min: 250, max: 2000, step: 50 },
      { id: 'T', label: 'Duration T', unit: 's', min: 0.032, max: 1, step: 0.002 },
      { id: 'pad', label: 'Zero padding', type: 'segmented', options: [[1, '×1'], [2, '×2'], [4, '×4'], [8, '×8']] },
      { id: 'f1', label: 'Tone 1', unit: 'Hz', min: 20, max: 400, step: 0.5 }, { id: 'f2', label: 'Tone 2', unit: 'Hz', min: 20, max: 400, step: 0.5 },
      { id: 'a2', label: 'Tone 2 amplitude', unit: '', min: 0.001, max: 1, log: true },
      { id: 'win', label: 'Window', type: 'segmented', options: Object.entries(WINDOWS).map(([k, v]) => [k, v.label]) },
    ] },
    { title: 'Mixer', show: (s) => s.case === 'shift', items: [{ id: 'fLO', label: 'Oscillator fLO', unit: 'Hz', min: 0, max: 600, step: 5 }] },
    { title: 'Resampler', show: (s) => s.case === 'resample', items: [
      { id: 'D', label: 'Decimation factor', unit: '', min: 1, max: 8, step: 1 }, { id: 'aa', label: 'Anti-alias filter first', type: 'check' },
    ] },
    { title: 'Estimator', show: (s) => s.case === 'crlb', items: [
      { id: 'snr', label: 'SNR', unit: 'dB', min: -5, max: 40, step: 1 }, { id: 'Ne', label: 'Samples N', unit: '', min: 32, max: 1024, step: 32 },
    ] },
    { title: 'Noise', show: (s) => s.case === 'iq' || s.case === 'plateau', items: [{ id: 'sn', label: 'Noise σ', unit: '', min: 0, max: 0.3, step: 0.005 }] },
    { title: 'Detector', show: (s) => s.case === 'plateau', items: [
      { id: 'sw', label: 'Smoothing window', unit: 'samples', min: 5, max: 61, step: 2 },
      { id: 'thr', label: 'Flatness threshold |A′|', unit: '/s', min: 0.05, max: 2, step: 0.05 },
      { id: 'bw', label: 'KDE bandwidth h', unit: '', min: 0.01, max: 0.3, step: 0.005 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR }), bot = createChart(ctx, { box: BOT }), all = [tl, tr, bl, br, bot];
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); (c === 'window' ? [tl, tr, bot] : [tl, tr, bl, br]).forEach((k) => k.show(true)); ctx.setClock(c === 'iq' ? 8 : 0); },
      update() {
        const c = state.case;
        if (c === 'bins' || c === 'window') {
          const fs = state.fs, N = Math.max(8, Math.round(state.T * fs)), P = pow2(N) * state.pad, x = Array.from({ length: N }, (_, n) => Math.cos(2 * Math.PI * state.f1 * n / fs) + state.a2 * Math.cos(2 * Math.PI * state.f2 * n / fs + 1)), tt = x.map((_, n) => n / fs);
          tl.range([0, tt[N - 1]], [-2.2, 2.2]); tl.titles('t (s)', `${N} samples = ${fmt(N / fs)} s${state.win !== 'rect' ? `, ${WINDOWS[state.win].label} window (dashed)` : ''}`); tl.line('x', tt, x, { color: '--c-B', width: 1.2 });
          if (state.win !== 'rect') tl.line('w', tt, tt.map((_, n) => 2 * WINDOWS[state.win].w(n, N)), { color: '--c-I', dashed: true, width: 1.2 }); else tl.hide('w');
          const F = rawFFT(x, P, state.win), k = F.mag.map((_, i) => i), fk = k.map((i) => i * fs / P), df = fs / N;
          if (c === 'bins') {
            tr.range([0, fs], [0, 1.2]); tr.titles('f (Hz): raw fft order 0 … fs', 'the upper half is the negative frequencies'); tr.line('r', fk, F.mag, { color: '--c-E', width: 1.2 }); tr.line('ny', [fs / 2, fs / 2], [0, 1.2], { color: '--c-north', dashed: true, width: 1 });
            const sh = shift(F.mag), fsh = k.map((i) => (i - P / 2) * fs / P); bl.range([-fs / 2, fs / 2], [0, 1.2]); bl.titles('f (Hz): after fftshift, −fs/2 … fs/2', 'centred on DC'); bl.line('s', fsh, sh, { color: '--c-E', width: 1.2 });
            const lo = Math.min(state.f1, state.f2) - 6 * df, hi = Math.max(state.f1, state.f2) + 6 * df, z = fk.map((f, i) => [f, F.mag[i]]).filter(([f]) => f >= lo && f <= hi), Fu = rawFFT(x, pow2(N), state.win), zu = Fu.mag.map((v, i) => [i * fs / pow2(N), v]).filter(([f]) => f >= lo && f <= hi);
            br.range([lo, hi], [0, 1.2]); br.titles('f (Hz)', 'zoom: padded (line), unpadded bins (dots), tones (dashed)'); br.line('z', z.map((q) => q[0]), z.map((q) => q[1]), { color: '--c-E', width: 1.4 }); br.dots('u', zu.map((q) => q[0]), zu.map((q) => q[1]), { color: '--c-B', size: 7 });
            br.line('t1', [state.f1, state.f1], [0, 1.2], { color: '--c-north', dashed: true, width: 1 }); br.line('t2', [state.f2, state.f2], [0, 1.2], { color: '--c-north', dashed: true, width: 1 });
            const ok = Math.abs(state.f2 - state.f1) > df;
            hud.set('a', `Δf = fs/N = 1/T = ${fmt(df)} Hz; bins drawn every fs/P = ${fmt(fs / P)} Hz (P = ${P})`); hud.set('b', ok ? `tones ${fmt(Math.abs(state.f2 - state.f1))} Hz apart > 1/T: resolved ✓` : `tones ${fmt(Math.abs(state.f2 - state.f1))} Hz apart < 1/T: one blob ✗`, ok ? 'good' : 'bad');
            hud.set('c', 'zero padding interpolates between bins; only a longer T sharpens the peaks');
            const Ts = Array.from({ length: 50 }, (_, i) => 0.02 + i * 0.02); plots.aux.draw({ xlim: [0, 1], cursor: state.T, series: [{ x: Ts, y: Ts.map((q) => 1 / q), color: '--c-E', label: 'resolution 1/T (Hz) vs T (s)' }] });
          } else {
            const R = rawFFT(x, P * 4, 'rect'), H = rawFFT(x, P * 4, 'hamming'), fx = R.mag.map((_, i) => i * fs / (P * 4)), lo = Math.max(0, state.f1 - 60), hi = state.f1 + 80, sel = (M) => fx.map((f, i) => [f, M[i]]).filter(([f]) => f >= lo && f <= hi);
            tr.range([lo, hi], [0, 1.2]); tr.titles('f (Hz)', 'linear: rectangular (grey), Hamming (blue)'); tr.line('r', sel(R.mag).map((q) => q[0]), sel(R.mag).map((q) => q[1]), { color: '--c-ref', width: 1.4 }); tr.line('h', sel(H.mag).map((q) => q[0]), sel(H.mag).map((q) => q[1]), { color: '--c-B', width: 1.6 });
            const dbs = (M) => sel(M).map((q) => Math.max(-100, 20 * Math.log10(q[1] + 1e-9)));
            bot.range([lo, hi], [-100, 5]); bot.titles('f (Hz)', `dB: tone 2 at ${state.f2} Hz is ${fmt(20 * Math.log10(state.a2))} dB — rect sidelobes (grey) vs Hamming (blue)`); bot.line('r', sel(R.mag).map((q) => q[0]), dbs(R.mag), { color: '--c-ref', width: 1.4 }); bot.line('h', sel(H.mag).map((q) => q[0]), dbs(H.mag), { color: '--c-B', width: 1.8 }); bot.line('t2', [state.f2, state.f2], [-100, 5], { color: '--c-north', dashed: true, width: 1 });
            const side = (f) => { const d = Math.abs(f - state.f1) * N / fs; return d < 1 ? 0 : 20 * Math.log10(Math.abs(Math.sin(Math.PI * d) / (Math.PI * d)) + 1e-9); };
            hud.set('a', `rect sidelobes near ${state.f2} Hz ≈ ${fmt(side(state.f2))} dB, Hamming below −43 dB`); hud.set('b', 20 * Math.log10(state.a2) > -43 ? 'Hamming: the weak tone rises above its sidelobes ✓' : 'even Hamming cannot reach this deep: try Blackman', 20 * Math.log10(state.a2) > -43 ? 'good' : 'bad');
            hud.set('c', 'price: Hamming’s main lobe is twice as wide');
            plots.aux.draw({ xlim: [0, N - 1], series: [{ x: tt.map((_, n) => n), y: tt.map((_, n) => WINDOWS.hamming.w(n, N)), color: '--c-B', label: 'Hamming w[n] = 0.54 − 0.46 cos(2πn/(N−1))' }] });
          }
        } else if (c === 'shift') {
          const fs = 2048, N = 2048, fc = 400, x = Array.from({ length: N }, (_, n) => { const t = n / fs - 0.5; return Math.exp(-t * t / (2 * 0.02 ** 2)) * Math.cos(2 * Math.PI * fc * t); });
          const I = x.map((v, n) => v * Math.cos(2 * Math.PI * state.fLO * n / fs)), Q = x.map((v, n) => -v * Math.sin(2 * Math.PI * state.fLO * n / fs)), tt = x.map((_, n) => n / fs - 0.5), zi = tt.map((t, i) => [t, x[i], I[i], Q[i]]).filter(([t]) => Math.abs(t) < 0.08);
          tl.range([-0.08, 0.08], [-1.2, 1.2]); tl.titles('t (s)', `RF pulse at fc = ${fc} Hz`); tl.line('x', zi.map((q) => q[0]), zi.map((q) => q[1]), { color: '--c-B', width: 1.2 });
          tr.range([-0.08, 0.08], [-1.2, 1.2]); tr.titles('t (s)', `× e^(−j2π·${state.fLO}·t): I (blue), Q (orange)`); tr.line('i', zi.map((q) => q[0]), zi.map((q) => q[2]), { color: '--c-B', width: 1.2 }); tr.line('q', zi.map((q) => q[0]), zi.map((q) => q[3]), { color: '--c-I', width: 1.2 });
          const R1 = rawFFT(x, N), sx = shift(R1.mag), fk = sx.map((_, i) => (i - N / 2) * fs / N);
          bl.range([-1000, 1000], [0, Math.max(...sx) * 1.2]); bl.titles('f (Hz)', 'RF spectrum: ±fc'); bl.line('s', fk, sx, { color: '--c-E' });
          // complex spectrum of I + jQ by direct shifting of the RF lobes
          const shifted = fk.map((f) => { const a = Math.round((f + state.fLO) * N / fs) + N / 2; return a >= 0 && a < N ? sx[a] : 0; });
          br.range([-1000, 1000], [0, Math.max(...sx) * 1.2]); br.titles('f (Hz)', `after mixing: everything moved down by ${state.fLO} Hz`); br.line('s', fk, shifted, { color: '--c-v' }); br.line('z', [0, 0], [0, Math.max(...sx) * 1.2], { color: '--ink-dim', dashed: true, width: 1 });
          hud.set('a', `IF = fc − fLO = ${fc - state.fLO} Hz; image at −fc − fLO = ${-fc - state.fLO} Hz`); hud.set('b', 'y(t) = x(t)·e^(−j2πfLO t) ⇔ Y(f) = X(f + fLO): a pure shift'); hud.set('c', 'a low-pass then keeps only the lobe near 0');
          plots.aux.draw({ xlim: [-1000, 1000], series: [{ x: fk, y: shifted, color: '--c-v', label: 'shifted spectrum' }] });
        } else if (c === 'resample') {
          const fs = 1000, N = 1024, tones = [[50, 1], [180, 0.6], [320, 0.4]], x = Array.from({ length: N }, (_, n) => tones.reduce((a, [f, A]) => a + A * Math.cos(2 * Math.PI * f * n / fs), 0)), D = state.D, fn = fs / D, y = decimate(x, D, state.aa);
          const tt = x.map((_, n) => n / fs), w = 0.1; tl.range([0, w], [-2.2, 2.2]); tl.titles('t (s)', `original: 50, 180, 320 Hz at ${fs} Hz`); tl.line('x', tt.filter((t) => t <= w), x.filter((_, n) => tt[n] <= w), { color: '--c-B', width: 1.2 });
          const ty = y.map((_, n) => n / fn); tr.range([0, w], [-2.2, 2.2]); tr.titles('t (s)', `resampled to ${fmt(fn)} Hz${state.aa ? ' after the anti-alias filter' : ''}`); tr.stems('y', ty.filter((t) => t <= w), y.filter((_, n) => ty[n] <= w), { color: state.aa ? '--c-v' : '--c-north', width: 2 });
          const X = rawFFT(x, 1024, 'hann'); bl.range([0, fs / 2], [0, 1.2]); bl.titles('f (Hz)', 'original spectrum; new Nyquist fs/2D (dashed)'); bl.line('X', X.mag.slice(0, 513).map((_, i) => i * fs / 1024), X.mag.slice(0, 513), { color: '--c-B' }); bl.line('ny', [fn / 2, fn / 2], [0, 1.2], { color: '--c-north', dashed: true, width: 1.2 });
          const P = pow2(y.length), Y = rawFFT(y, P, 'hann'); br.range([0, fn / 2], [0, 1.2]); br.titles('f (Hz)', 'resampled spectrum: aliases where tones folded (red)'); br.line('Y', Y.mag.slice(0, P / 2 + 1).map((_, i) => i * fn / P), Y.mag.slice(0, P / 2 + 1), { color: state.aa ? '--c-v' : '--c-E' });
          const al = tones.filter(([f]) => f > fn / 2).map(([f]) => { const r = ((f % fn) + fn) % fn; return Math.min(r, fn - r); }); br.stems('al', al, al.map(() => (state.aa ? 0 : 1.1)), { color: '--c-north', width: 2 });
          hud.set('a', `new rate ${fmt(fn)} Hz → Nyquist ${fmt(fn / 2)} Hz`); hud.set('b', al.length ? (state.aa ? `${al.length} tone(s) above Nyquist removed by the filter ✓` : `${al.length} tone(s) folded to ${al.map((v) => fmt(v)).join(', ')} Hz ✗`) : 'all tones below the new Nyquist ✓', al.length && !state.aa ? 'bad' : 'good');
          hud.set('c', 'filter first, then keep every D-th sample');
          plots.aux.draw({ xlim: [1, 8], cursor: D, series: [{ x: [1, 2, 3, 4, 5, 6, 7, 8], y: [1, 2, 3, 4, 5, 6, 7, 8].map((d) => fs / (2 * d)), color: '--c-north', label: 'new Nyquist (Hz) vs decimation factor' }] });
        } else if (c === 'iq') {
          const fs = 2000, N = 400, g = gaussian(9), tt = Array.from({ length: N }, (_, n) => n / fs), env = tt.map((t) => Math.exp(-((t - 0.1) ** 2) / (2 * 0.03 ** 2))), ph = tt.map((t) => 2 * Math.PI * (-40 * t + 0.5 * 800 * t * t));
          const I = env.map((e, n) => e * Math.cos(ph[n]) + state.sn * g()), Q = env.map((e, n) => e * Math.sin(ph[n]) + state.sn * g()), A = I.map((v, n) => Math.hypot(v, Q[n]));
          const un = []; let prev = 0, off = 0; for (let n = 0; n < N; n++) { let a = Math.atan2(Q[n], I[n]) + off; while (a - prev > Math.PI) { a -= 2 * Math.PI; off -= 2 * Math.PI; } while (a - prev < -Math.PI) { a += 2 * Math.PI; off += 2 * Math.PI; } un.push(a); prev = a; }
          const fi = un.map((_, n) => (n > 0 && n < N - 1 ? (un[n + 1] - un[n - 1]) * fs / (4 * Math.PI) : NaN)), cur = Math.min(N - 1, Math.floor(N * (time.t % 8) / 8)), upto = Array.from({ length: cur + 1 }, (_, i) => i);
          tl.range([-1.6, 1.6], [-0.85, 0.85].map((v) => v * 1.6)); tl.titles('I', `Q: the phasor traced up to t = ${fmt(tt[cur] * 1000)} ms`); tl.line('tr', upto.map((i) => I[i]), upto.map((i) => Q[i]), { color: '--c-B', width: 1.2 }); tl.line('ph', [0, I[cur]], [0, Q[cur]], { color: '--accent', width: 2.4 }); tl.dots('now', [I[cur]], [Q[cur]], { color: '--accent', size: 10 });
          const ms = tt.map((t) => t * 1000); tr.range([0, 200], [-1.3, 1.3]); tr.titles('t (ms)', 'I (blue), Q (orange), amplitude √(I² + Q²) (green)'); tr.line('I', ms, I, { color: '--c-B', width: 1 }); tr.line('Q', ms, Q, { color: '--c-I', width: 1 }); tr.line('A', ms, A, { color: '--c-v', width: 2 }); tr.line('c', [ms[cur], ms[cur]], [-1.3, 1.3], { color: '--accent', dashed: true, width: 1 });
          const strong = (n) => env[n] > 0.15, pu = un.map((v, n) => (strong(n) ? v : NaN)); bl.range([0, 200], [Math.min(...pu.filter(Number.isFinite)) - 1, Math.max(...pu.filter(Number.isFinite)) + 1]); bl.titles('t (ms)', 'unwrapped phase φ(t) (rad): a parabola for a chirp'); bl.line('p', ms.filter((_, n) => strong(n)), pu.filter(Number.isFinite), { color: '--c-E' });
          br.range([0, 200], [-120, 160]); br.titles('t (ms)', 'instantaneous frequency (1/2π) dφ/dt (Hz): a ramp'); br.dots('f', ms.filter((_, n) => strong(n) && Number.isFinite(fi[n])), fi.filter((v, n) => strong(n) && Number.isFinite(v)), { color: '--c-I', size: 3 }); br.line('true', ms, tt.map((t) => -40 + 800 * t), { color: '--ink-dim', dashed: true, width: 1 });
          hud.set('a', `A = √(I² + Q²) = ${fmt(A[cur])}, φ = atan2(Q, I) = ${fmt(Math.atan2(Q[cur], I[cur]) * 180 / Math.PI)}°`); hud.set('b', 'chirp: the phasor spins slowly backwards, stops, then faster and faster forwards');
          hud.set('c', state.sn > 0.05 ? 'noise: the derivative of the phase is noisy where the amplitude is small' : 'fᵢ = (1/2π) dφ/dt goes from −40 to +120 Hz');
          plots.aux.draw({ xlim: [0, 200], cursor: ms[cur], series: [{ x: ms, y: A, color: '--c-v', label: 'amplitude A(t)' }] });
        } else if (c === 'crlb') {
          const fs = 1000, N = state.Ne, P = 4 * pow2(N), snr = 10 ** (state.snr / 10), sigma = Math.sqrt(1 / (2 * snr)), f0 = 123.4, key = `${N}`;
          const g = gaussian(3), x = Array.from({ length: N }, (_, n) => Math.cos(2 * Math.PI * f0 * n / fs + 0.3) + sigma * g()), tt = x.map((_, n) => n / fs * 1000);
          tl.range([0, tt[N - 1]], [-2.5, 2.5]); tl.titles('t (ms)', `one noisy pulse, N = ${N}, SNR = ${state.snr} dB`); tl.line('x', tt, x, { color: '--c-B', width: 1 });
          const F = rawFFT(x, P, 'hann'), df = fs / N, fk = F.mag.map((_, i) => i * fs / P), z = fk.map((f, i) => [f, F.mag[i]]).filter(([f]) => Math.abs(f - f0) < 4 * df), e = estimate(x, fs, P);
          tr.range([f0 - 4 * df, f0 + 4 * df], [0, Math.max(...z.map((q) => q[1])) * 1.2]); tr.titles('f (Hz)', `spectrum near the peak: bin ${fmt(df)} Hz wide`); tr.line('S', z.map((q) => q[0]), z.map((q) => q[1]), { color: '--c-E' });
          tr.line('t', [f0, f0], [0, 2], { color: '--c-north', dashed: true, width: 1 }); tr.line('e', [e.fine, e.fine], [0, 2], { color: '--c-v', width: 1.6 });
          const M = monteCarlo(f0, 1, sigma, N, fs, P, 200, 4), bins = 41, w = Math.max(3 * M.sdFine, 0.2 * df), hist = (k) => { const h = new Array(bins).fill(0); M.est.forEach((q) => { const i = Math.round((q[k] - f0) / w * 20 + 20); if (i >= 0 && i < bins) h[i]++; }); return h; }, hx = Array.from({ length: bins }, (_, i) => f0 + (i - 20) * w / 20);
          bl.range([f0 - w, f0 + w], [0, 200 / 4]); bl.titles('estimated f (Hz)', '200 interpolated estimates'); bl.stems('h', hx, hist('fine'), { color: '--c-v', width: 4 });
          const snrs = Array.from({ length: 10 }, (_, i) => -5 + i * 5); MCC[key] ??= snrs.map((s) => monteCarlo(f0, 1, Math.sqrt(1 / (2 * 10 ** (s / 10))), N, fs, P, 120, 7));
          br.range([-5, 40], [-5, 2]); br.titles('SNR (dB)', 'log₁₀ σf: CRLB red · interpolated green · bin grey');
          const sx = Array.from({ length: 91 }, (_, i) => -5 + i / 2); br.line('c', sx, sx.map((s) => Math.log10(crlb(10 ** (s / 10), N, fs))), { color: '--c-north' });
          br.dots('f', snrs, MCC[key].map((r) => Math.log10(r.sdFine)), { color: '--c-v', size: 9 }); br.dots('k', snrs, MCC[key].map((r) => Math.log10(r.sdCoarse)), { color: '--c-ref', size: 7 }); br.dots('now', [state.snr], [Math.log10(M.sdFine)], { color: '--accent', size: 12 });
          const cb = crlb(snr, N, fs);
          hud.set('a', `CRLB σf ≥ ${fmt(cb)} Hz; measured ${fmt(M.sdFine)} Hz (${fmt(M.sdFine / cb)}× the bound)`); hud.set('b', `bin width fs/N = ${fmt(df)} Hz: interpolation does ${fmt(df / M.sdFine)}× better`);
          hud.set('c', 'σf ∝ 1/(√SNR · N^(3/2)): doubling N gains 2.8×, +3 dB gains only 1.4×');
          plots.aux.draw({ xlim: [-5, 40], cursor: state.snr, series: [{ x: sx, y: sx.map((s) => crlb(10 ** (s / 10), N, fs)), color: '--c-north', label: 'CRLB σf (Hz) vs SNR (dB)' }] });
        } else {
          const fs = 200, N = 600, g = gaussian(13), tt = Array.from({ length: N }, (_, n) => n / fs), lv = (t) => (t < 0.6 ? 0.2 : t < 0.9 ? 0.2 + 0.8 * (t - 0.6) / 0.3 : t < 1.6 ? 1 : t < 1.8 ? 1 - 0.4 * (t - 1.6) / 0.2 : t < 2.4 ? 0.6 : 0.6 + 0.4 * Math.min(1, (t - 2.4) / 0.2)), x = tt.map((t) => lv(t) + state.sn * g());
          const { s, d } = smoothDeriv(x, state.sw, 1 / fs), flat = d.map((v) => Math.abs(v) < state.thr);
          tl.range([0, 3], [-0.2, 1.3]); tl.titles('t (s)', `signal (grey) and quadratic smoothing over ${state.sw} samples (blue)`); tl.line('x', tt, x, { color: '--c-ref', width: 1 }); tl.line('s', tt, s, { color: '--c-B' });
          tr.range([0, 3], [-6, 6]); tr.titles('t (s)', `smoothed derivative A′(t), flat where |A′| < ${state.thr}`); tr.line('d', tt, d, { color: '--c-I', width: 1.4 }); tr.line('p', [0, 3], [state.thr, state.thr], { color: '--c-north', dashed: true, width: 1 }); tr.line('m', [0, 3], [-state.thr, -state.thr], { color: '--c-north', dashed: true, width: 1 });
          const vals = s.filter((_, i) => flat[i]), gr = Array.from({ length: 141 }, (_, i) => -0.2 + i * 0.01), K = kde(vals, gr, state.bw);
          bl.range([-0.2, 1.2], [0, Math.max(...K.k) * 1.15]); bl.titles('amplitude', `density of the flat samples (h = ${state.bw}): ${K.peaks.length} level(s)`); bl.line('k', gr, K.k, { color: '--c-E' }); K.peaks.forEach((p, i) => bl.line(`p${i}`, [p, p], [0, Math.max(...K.k) * 1.15], { color: '--c-v', dashed: true, width: 1.2 })); for (let i = K.peaks.length; i < 12; i++) bl.hide(`p${i}`);
          br.range([0, 3], [-0.2, 1.3]); br.titles('t (s)', 'plateaus found (green) and their levels'); br.line('s', tt, s, { color: '--c-ref', width: 1.2 }); br.dots('f', tt.filter((_, i) => flat[i]), s.filter((_, i) => flat[i]), { color: '--c-v', size: 3 }); K.peaks.forEach((p, i) => br.line(`l${i}`, [0, 3], [p, p], { color: '--c-v', dashed: true, width: 1 })); for (let i = K.peaks.length; i < 12; i++) br.hide(`l${i}`);
          hud.set('a', `true levels 0.2, 1.0, 0.6, 1.0 → found ${K.peaks.map((p) => fmt(p, 2)).join(', ') || 'none'}`, K.peaks.length === 3 ? 'good' : 'bad'); hud.set('b', 'derivative says WHERE it is flat; the density says AT WHAT LEVEL');
          hud.set('c', 'the 1.0 plateau appears twice in time but once in the density');
          plots.aux.draw({ xlim: [0, 3], series: [{ x: tt, y: flat.map((f) => (f ? 1 : 0)), color: '--c-v', label: 'flat (1) or not (0)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); },
    };
  },
};
