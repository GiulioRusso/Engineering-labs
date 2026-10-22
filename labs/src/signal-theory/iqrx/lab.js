// IQ demodulation in a receiver: the received pulse and its mirror lobes, quadrature mixing from RF to IF
// to baseband (sum and difference terms, the low-pass), the residual Δf when the oscillator is off-tune,
// and whether that residual lands in one DFT bin or leaks.
import { createChart } from '../../lib/viz/chart.js';
import { FS, N, pulse, mix, lpf, spectrum, bins } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const ROW = (k) => [-4.3, 2.55 - (k + 1) * (4.9 / 3) + 0.25, 8.85, 4.9 / 3 - 0.55];
const ts = Array.from({ length: N }, (_, i) => i / FS - 0.5), every = (a, k = 4) => a.filter((_, i) => i % k === 0);
const sel = (S, lo, hi, k = 1) => { const f = [], a = []; for (let i = 0; i < S.f.length; i += k) if (S.f[i] >= lo && S.f[i] <= hi) { f.push(S.f[i]); a.push(S.a[i]); } return { f, a }; };

export default {
  id: 'iqrx', title: 'IQ demodulation', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { fc: 600, w: 0.03, fLO: 600, cut: 150, phi: 0, nb: 100, fsb: 1000, dfb: 2, phb: 0 },
  cases: [
    { id: 'pulse', label: 'The received pulse', set: {}, examples: [
      { id: 'short', label: 'Shorter pulse: wider lobes', controls: ['w'], set: { w: 0.008 } },
      { id: 'move', label: 'Move the carrier: both lobes move', controls: ['fc'], set: { fc: 1200 } },
    ] },
    { id: 'mixing', label: 'Mixing', set: { fLO: 450 }, examples: [
      { id: 'zero', label: 'fLO = fc: straight to baseband', controls: ['fLO'], set: { fLO: 600 } },
      { id: 'if', label: 'fLO = 450 Hz: an IF of 150 Hz', controls: ['fLO', 'cut'], set: { fLO: 450, cut: 250 } },
      { id: 'tight', label: 'LPF too narrow: the pulse is cut', controls: ['cut'], set: { fLO: 600, cut: 10 } },
    ] },
    { id: 'residual', label: 'Residual Δf', set: { fLO: 590 }, examples: [
      { id: 'tuned', label: 'Perfectly tuned: flat I, Q = 0', controls: ['fLO'], set: { fLO: 600 } },
      { id: 'phase', label: 'Tuned, phase 90°: all in Q', controls: ['phi'], set: { fLO: 600, phi: 90 } },
      { id: 'far', label: 'Δf = 40 Hz: fast rotation', controls: ['fLO'], set: { fLO: 560 } },
    ] },
    { id: 'bins', label: 'Bin or leak', set: {}, examples: [
      { id: 'on', label: 'Δf = 3 bins: one bin', controls: ['dfb'], set: { dfb: 3 } },
      { id: 'half', label: 'Δf = 3.5 bins: leaks', controls: ['dfb'], set: { dfb: 3.5 } },
      { id: 'zero', label: 'Δf = 0: all at DC', controls: ['dfb'], set: { dfb: 0 } },
    ] },
  ],
  controls: [
    { title: 'Pulse', show: (s) => s.case !== 'bins', items: [
      { id: 'fc', label: 'Carrier fc', unit: 'Hz', min: 200, max: 1500, step: 10 },
      { id: 'w', label: 'Envelope σ', unit: 's', min: 0.005, max: 0.1, step: 0.001 },
      { id: 'phi', label: 'Carrier phase', unit: '°', min: -180, max: 180, step: 5, show: (s) => s.case === 'residual' },
    ] },
    { title: 'Receiver', show: (s) => s.case === 'mixing' || s.case === 'residual', items: [
      { id: 'fLO', label: 'Local oscillator fLO', unit: 'Hz', min: 200, max: 1500, step: 1 },
      { id: 'cut', label: 'Low-pass cut-off', unit: 'Hz', min: 5, max: 400, step: 5 },
    ] },
    { title: 'DFT', show: (s) => s.case === 'bins', items: [
      { id: 'dfb', label: 'Residual Δf', unit: 'bins', min: 0, max: 10, step: 0.05 },
      { id: 'nb', label: 'Samples N', unit: '', min: 20, max: 200, step: 2 },
      { id: 'phb', label: 'Phase', unit: '°', min: -180, max: 180, step: 5 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR }), rows = [0, 1, 2].map((k) => createChart(ctx, { box: ROW(k) }));
    const all = [tl, tr, bl, br, ...rows];
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); (c === 'mixing' ? rows : [tl, tr, bl, br]).forEach((k) => k.show(true)); },
      update() {
        const c = state.case, x = pulse(state.fc, state.w, state.phi * Math.PI / 180);
        if (c === 'pulse') {
          const zoom = Math.min(0.5, 4 * state.w), s = ts.map((t, i) => [t, x[i]]).filter(([t]) => Math.abs(t) <= zoom);
          tl.range([-zoom, zoom], [-1.2, 1.2]); tl.titles('t (s)', `x(t): ${state.fc} Hz under a Gaussian envelope (σ = ${state.w * 1000} ms)`); tl.line('x', s.map((q) => q[0]), s.map((q) => q[1]), { color: '--c-B', width: 1.2 }); tl.line('e', s.map((q) => q[0]), s.map((q) => Math.exp(-(q[0] ** 2) / (2 * state.w ** 2))), { color: '--c-I', dashed: true, width: 1.2 });
          const S = spectrum(x), W = sel(S, -2000, 2000, 2), m = Math.max(...W.a);
          tr.range([-2000, 2000], [0, m * 1.15]); tr.titles('f (Hz)', '|X| (norm.): two mirror lobes at ±fc'); tr.line('S', W.f, W.a, { color: '--c-E' });
          const Z = sel(S, state.fc - 6 / state.w / 6.28 * 3, state.fc + 6 / state.w / 6.28 * 3); bl.range([Z.f[0], Z.f[Z.f.length - 1]], [0, m * 1.15]); bl.titles('f (Hz)', '|X| (norm.): zoom on +fc, the lobe is the envelope’s spectrum'); bl.line('S', Z.f, Z.a, { color: '--c-E' });
          const sf = 1 / (2 * Math.PI * state.w); bl.line('w1', [state.fc - sf, state.fc - sf], [0, m * 1.15], { color: '--c-north', dashed: true, width: 1 }); bl.line('w2', [state.fc + sf, state.fc + sf], [0, m * 1.15], { color: '--c-north', dashed: true, width: 1 });
          const E = sel(spectrum(x.map((_, i) => Math.exp(-(ts[i] ** 2) / (2 * state.w ** 2)))), -3 * sf, 3 * sf); br.range([-3 * sf, 3 * sf], [0, Math.max(...E.a) * 1.15]); br.titles('f (Hz)', '|E| (norm.): the envelope alone, a lobe centred on 0'); br.line('E', E.f, E.a, { color: '--c-I' });
          hud.set('a', `X(f) = ½[E(f − fc) + E(f + fc)]`); hud.set('b', `lobe width σf = 1/(2πσ) = ${fmt(sf)} Hz`); hud.set('c', 'a real signal always has both lobes: they carry the same information');
          plots.aux.draw({ xlim: [-2000, 2000], series: [{ x: W.f, y: W.a, color: '--c-E', label: '|X(f)|' }] });
        } else if (c === 'mixing') {
          const z = mix(x, state.fLO), y = lpf(z, state.cut), S0 = spectrum(x), S1 = spectrum(z), S2 = spectrum(y), F = 2600, m = Math.max(...S0.a) * 2.2;
          const draw = (ch, S, title, col) => { const W = sel(S, -F, F, 2); ch.range([-F, F], [0, m]); ch.titles('', title); ch.line('S', W.f, W.a, { color: col, width: 1.4 }); };
          draw(rows[0], S0, `RF: lobes at ±${state.fc} Hz; LO at ${state.fLO} Hz (dashed)`, '--c-B'); rows[0].line('lo', [state.fLO, state.fLO], [0, m], { color: '--c-north', dashed: true, width: 1 });
          draw(rows[1], S1, `after × e^(−j2π·fLO·t): everything shifted down by fLO → ${state.fc - state.fLO} Hz and ${-state.fc - state.fLO} Hz`, '--c-I');
          rows[1].line('c1', [-state.cut, -state.cut], [0, m], { color: '--c-v', dashed: true, width: 1 }); rows[1].line('c2', [state.cut, state.cut], [0, m], { color: '--c-v', dashed: true, width: 1 });
          draw(rows[2], S2, `after the low-pass (±${state.cut} Hz): only the wanted lobe at IF = ${state.fc - state.fLO} Hz`, '--c-v'); rows[2].titles('f (Hz)', `after the low-pass (±${state.cut} Hz): only the wanted lobe at IF = ${state.fc - state.fLO} Hz`);
          const kept = Math.max(...S2.a) / Math.max(...S1.a), IF = state.fc - state.fLO, inband = Math.abs(IF) + 2 / state.w / 6.28 < state.cut;
          hud.set('a', `fIF = fc − fLO = ${IF} Hz${IF === 0 ? ' (zero-IF / homodyne)' : ''}`); hud.set('b', `image at −fc − fLO = ${-state.fc - state.fLO} Hz removed by the low-pass`);
          hud.set('c', inband ? `low-pass passes the pulse (peak ${fmt(100 * kept)} %)` : 'low-pass cuts into the pulse: it gets longer and weaker ✗', inband ? 'good' : 'bad');
          plots.aux.draw({ xlim: [-0.3, 0.3], series: [{ x: every(ts, 8).filter((t) => Math.abs(t) < 0.3), y: every(y.re, 8).filter((_, i) => Math.abs(every(ts, 8)[i]) < 0.3), color: '--c-B', label: 'I(t)' }, { x: every(ts, 8).filter((t) => Math.abs(t) < 0.3), y: every(y.im, 8).filter((_, i) => Math.abs(every(ts, 8)[i]) < 0.3), color: '--c-I', label: 'Q(t) after the chain' }] });
        } else if (c === 'residual') {
          const z = lpf(mix(x, state.fLO), state.cut), df = state.fc - state.fLO, S0 = spectrum(x), W0 = sel(S0, 0, 2000, 2), m0 = Math.max(...W0.a);
          tl.range([0, 2000], [0, m0 * 1.15]); tl.titles('f (Hz)', `RF: lobe at ${state.fc} Hz, LO at ${state.fLO} Hz (dashed)`); tl.line('S', W0.f, W0.a, { color: '--c-B' }); tl.line('lo', [state.fLO, state.fLO], [0, m0 * 1.15], { color: '--c-north', dashed: true, width: 1.2 });
          const zoom = Math.min(0.5, 4 * state.w), k = ts.map((t, i) => [t, z.re[i], z.im[i]]).filter(([t]) => Math.abs(t) <= zoom);
          tr.range([-zoom, zoom], [-1.15, 1.15]); tr.titles('t (s)', `I (blue), Q (orange): rotating at ${df} Hz`); tr.line('I', k.map((q) => q[0]), k.map((q) => q[1]), { color: '--c-B' }); tr.line('Q', k.map((q) => q[0]), k.map((q) => q[2]), { color: '--c-I' }); tr.line('e', k.map((q) => q[0]), k.map((q) => Math.hypot(q[1], q[2])), { color: '--ink-dim', dashed: true, width: 1 });
          const S = spectrum(z), W = sel(S, -state.cut, state.cut), m = Math.max(...W.a);
          bl.range([-state.cut, state.cut], [0, m * 1.15]); bl.titles('f (Hz)', `|I + jQ| spectrum (norm.): one lobe at Δf = ${df} Hz`); bl.line('S', W.f, W.a, { color: '--c-E' }); bl.line('z', [0, 0], [0, m * 1.15], { color: '--ink-dim', dashed: true, width: 1 });
          const ph = k.map((q) => Math.atan2(q[2], q[1])), env = k.map((q) => Math.hypot(q[1], q[2])), pk = Math.max(...env), pi = k.filter((_, i) => env[i] > 0.1 * pk);
          br.range([-zoom, zoom], [-3.3, 3.3]); br.titles('t (s)', 'phase of I + jQ (rad): slope 2π·Δf'); br.dots('p', pi.map((q) => q[0]), pi.map((q) => Math.atan2(q[2], q[1])), { color: '--c-v', size: 3 });
          hud.set('a', `Δf = fc − fLO = ${df} Hz${df === 0 ? ' — tuned' : ''}`, df === 0 ? 'good' : ''); hud.set('b', df === 0 ? `carrier phase ${state.phi}° appears as a fixed rotation: I = cos, Q = sin of it` : `I and Q oscillate ${fmt(Math.abs(df) * 2 * state.w * 2.355)} times under the envelope`);
          hud.set('c', 'the magnitude √(I² + Q²) is the envelope whatever Δf and phase are');
          plots.aux.draw({ xlim: [-zoom, zoom], series: [{ x: k.map((q) => q[0]), y: env, color: '--ink-dim', label: '|I + jQ| = envelope' }] });
        } else {
          const n = state.nb, fs = state.fsb, bw = fs / n, df = state.dfb * bw, B = bins(df, n, fs, state.phb * Math.PI / 180), idx = Array.from({ length: n }, (_, i) => i), tt = idx.map((i) => i / fs * 1000);
          tl.range([0, tt[n - 1]], [-1.2, 1.2]); tl.titles('t (ms)', `I and Q of a residual tone Δf = ${fmt(df)} Hz`); tl.line('I', tt, B.I, { color: '--c-B' }); tl.line('Q', tt, B.Q, { color: '--c-I' });
          const kk = idx.map((k) => (k < n / 2 ? k : k - n)), ord = idx.slice().sort((a, b) => kk[a] - kk[b]);
          tr.range([-n / 2, n / 2], [0, 1.1]); tr.titles('bin k', `all bins (width fs/N = ${fmt(bw)} Hz)`); tr.stems('b', ord.map((i) => kk[i]), ord.map((i) => B.mag[i]), { color: '--c-E', width: 2 });
          const near = ord.filter((i) => Math.abs(kk[i] - state.dfb) <= 6);
          bl.range([state.dfb - 6.5, state.dfb + 6.5], [0, 1.1]); bl.titles('bin k', '|X[k]| (norm.): dashed = the tone’s true position'); bl.stems('b', near.map((i) => kk[i]), near.map((i) => B.mag[i]), { color: '--c-E', width: 5 }); bl.line('t', [state.dfb, state.dfb], [0, 1.1], { color: '--c-north', dashed: true, width: 1.2 });
          const fr = Array.from({ length: 200 }, (_, i) => i / 199), peak = fr.map((d) => Math.abs(Math.sin(Math.PI * d) / (n * Math.sin(Math.PI * d / n))) || 1);
          br.range([0, 1], [0, 1.05]); br.titles('offset from a bin centre (bins)', 'highest bin (norm.): the scalloping loss'); br.line('p', fr, peak, { color: '--c-I' }); br.dots('now', [state.dfb % 1], [Math.max(...B.mag)], { color: '--accent', size: 11 });
          const on = Math.abs(state.dfb - Math.round(state.dfb)) < 0.01;
          hud.set('a', `Δf = ${fmt(state.dfb)} bins × ${fmt(bw)} Hz`); hud.set('b', on ? 'integer number of turns in the record: all energy in one bin ✓' : `between bins: peak ${fmt(Math.max(...B.mag))} (${fmt(20 * Math.log10(Math.max(...B.mag)))} dB), energy in neighbours ✗`, on ? 'good' : 'bad');
          hud.set('c', 'complex baseband: positive and negative Δf are different bins');
          plots.aux.draw({ xlim: [0, 10], cursor: state.dfb, series: [{ x: Array.from({ length: 201 }, (_, i) => i / 20), y: Array.from({ length: 201 }, (_, i) => { const d = (i / 20) % 1; return Math.abs(Math.sin(Math.PI * d) / (n * Math.sin(Math.PI * d / n))) || 1; }), color: '--c-I', label: 'nearest-bin height vs Δf (bins)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); },
    };
  },
};
