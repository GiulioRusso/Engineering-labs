// Modulation: AM and FM with their spectra; digital constellations over noise with the bit error rate;
// IQ demodulation with phase and frequency errors.
import { createChart } from '../../lib/viz/chart.js';
import { amLines, fmLines, besselJ, constellation, berTheory, transmit, iqDemod } from './model.js';
import { rng } from '../../maths/probability/model.js';

const FC = 40, fmt = (v) => String(Number(v.toPrecision(3)));
const SCHEMES = [['bpsk', 'BPSK'], ['qpsk', 'QPSK'], ['8psk', '8-PSK'], ['16qam', '16-QAM']];

export default {
  id: 'modulation', title: 'Modulation', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  defaults: { mod: 'am', m: 0.5, beta: 1, fm: 4, scheme: 'qpsk', ebn0: 10, n: 1000, dphi: 0, df: 0, sigma: 0.05 },
  cases: [
    { id: 'analog', label: 'AM and FM', set: {}, examples: [
      { id: 'full', label: 'AM, m = 1', set: { m: 1 } },
      { id: 'over', label: 'Over-modulated: m = 1.4', set: { m: 1.4 } },
      { id: 'fm', label: 'FM, β = 1', set: { mod: 'fm', beta: 1 } },
      { id: 'wide', label: 'FM, β = 5: wide band', set: { mod: 'fm', beta: 5 } },
      { id: 'null', label: 'FM, β = 2.405: no carrier', set: { mod: 'fm', beta: 2.405 } },
    ] },
    { id: 'digital', label: 'Constellations', set: {}, examples: [
      { id: 'bpsk', label: 'BPSK: most robust', set: { scheme: 'bpsk', ebn0: 6 } },
      { id: 'noisy', label: 'QPSK at 4 dB: errors', set: { ebn0: 4 } },
      { id: 'qam', label: '16-QAM: more bits, more SNR', set: { scheme: '16qam', ebn0: 12 } },
      { id: 'psk8', label: '8-PSK', set: { scheme: '8psk', ebn0: 12 } },
    ] },
    { id: 'iq', label: 'IQ demodulation', set: {}, examples: [
      { id: 'phase', label: 'Phase error 30°: rotated', set: { dphi: 30 } },
      { id: 'quarter', label: 'Phase error 90°: I and Q swap', set: { dphi: 90 } },
      { id: 'spin', label: 'Frequency offset: it spins', set: { df: 0.05 } },
      { id: 'noise', label: 'Noise: clouds', set: { sigma: 0.4 } },
    ] },
  ],
  controls: [
    { title: 'Analog', show: (s) => s.case === 'analog', items: [
      { id: 'mod', label: 'Modulation', type: 'segmented', options: [['am', 'AM'], ['fm', 'FM']] },
      { id: 'm', label: 'AM index m', unit: '', min: 0, max: 1.6, step: 0.01, show: (s) => s.mod === 'am' },
      { id: 'beta', label: 'FM index β', unit: '', min: 0, max: 8, step: 0.005, show: (s) => s.mod === 'fm' },
      { id: 'fm', label: 'Message frequency', unit: 'Hz', min: 1, max: 8, step: 0.1 },
    ] },
    { title: 'Digital', show: (s) => s.case === 'digital', items: [
      { id: 'scheme', label: 'Scheme', type: 'segmented', options: SCHEMES },
      { id: 'ebn0', label: 'Eb/N0', unit: 'dB', min: 0, max: 18, step: 0.5 },
      { id: 'n', label: 'Symbols', unit: '', min: 100, max: 4000, step: 100 },
    ] },
    { title: 'Receiver', show: (s) => s.case === 'iq', items: [
      { id: 'dphi', label: 'Phase error', unit: '°', min: -180, max: 180, step: 1 },
      { id: 'df', label: 'Frequency offset', unit: 'Hz', min: -0.2, max: 0.2, step: 0.005 },
      { id: 'sigma', label: 'Noise σ', unit: '', min: 0, max: 0.8, step: 0.01 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: [-4.2, 0.55, 8.6, 2.1], xTitle: 't (s)', yTitle: 'signal' }), bot = createChart(ctx, { box: [-4.2, -2.35, 8.6, 2.1], xTitle: 'f (Hz)', yTitle: 'amplitude' });
    const cons = createChart(ctx, { box: [-4.2, -2.4, 4.6, 4.6], x: [-1.6, 1.6], y: [-1.6, 1.6], xTitle: 'I', yTitle: 'Q' }), side = createChart(ctx, { box: [1.4, -1.6, 3.0, 3.2], xTitle: '', yTitle: '' });
    let TX = null;

    return {
      changed() {
        const c = state.case; for (const k of [top, bot, cons, side]) k.clear();
        top.show(c === 'analog'); bot.show(c === 'analog'); cons.show(c !== 'analog'); side.show(c !== 'analog');
        if (c === 'digital') { TX = transmit(state.scheme, 10 ** (state.ebn0 / 10), state.n); side.range([0, 18], [-6, 0]); side.titles('Eb/N0 (dB)', 'log₁₀ BER'); }
        if (c === 'iq') { side.range([0, 8], [-1.6, 1.6]); side.titles('symbol', 'I (blue), Q (orange)'); }
        ctx.setDuration(c === 'iq' ? 8 : c === 'analog' ? 4 : 0);
      },
      update() {
        const c = state.case;
        if (c === 'analog') {
          const T = 2, n = 2000, ts = [], s = [], msg = [], am = state.mod === 'am', ph = time.t * 0.5;
          for (let i = 0; i <= n; i++) { const t = T * i / n + ph; ts.push(T * i / n); const m = Math.cos(2 * Math.PI * state.fm * t); msg.push(am ? 1 + state.m * m : m); s.push(am ? (1 + state.m * m) * Math.cos(2 * Math.PI * FC * t) : Math.cos(2 * Math.PI * FC * t + state.beta * Math.sin(2 * Math.PI * state.fm * t))); }
          top.range([0, T], [-2.7, 2.7]); top.line('s', ts, s, { color: '--c-B', width: 1.4 }); top.line('m', ts, msg, { color: '--c-I', dashed: true, width: 2 });
          const L = am ? amLines(FC, state.fm, state.m) : fmLines(FC, state.fm, state.beta).filter(([, A]) => A > 1e-3);
          bot.range([FC - 50, FC + 50], [0, 1.1]); bot.stems('X', L.map((l) => l[0]), L.map((l) => l[1]), { color: '--c-E' });
          const bw = am ? 2 * state.fm : 2 * (state.beta + 1) * state.fm;
          hud.set('a', am ? `AM, m = ${fmt(state.m)}${state.m > 1 ? ' (over-modulated: the envelope folds)' : ''}` : `FM, β = ${fmt(state.beta)}, carrier J₀(β) = ${fmt(besselJ(0, state.beta))}`);
          hud.set('b', `bandwidth ${am ? '2 fm' : 'Carson 2(β + 1) fm'} = ${fmt(bw)} Hz`);
          hud.set('c', am ? `power in sidebands ${fmt(100 * state.m ** 2 / 2 / (1 + state.m ** 2 / 2))} %` : 'constant envelope: all the information is in the phase');
          const bs = Array.from({ length: 81 }, (_, i) => i / 10);
          plots.aux.draw({ xlim: [0, 8], cursor: am ? null : state.beta, series: [0, 1, 2].map((k, j) => ({ x: bs, y: bs.map((b) => besselJ(k, b)), color: ['--c-B', '--c-E', '--c-I'][j], label: `J${'₀₁₂'[k]}(β)` })) });
        } else if (c === 'digital') {
          const C = TX.C;
          cons.dots('rx', TX.rx.map((p) => p[0]), TX.rx.map((p) => p[1]), { color: '--c-B', size: 3 }); cons.dots('ideal', C.pts.map((p) => p[0]), C.pts.map((p) => p[1]), { color: '--c-I', size: 9 });
          const db = Array.from({ length: 73 }, (_, i) => i / 4), th = db.map((d) => Math.log10(Math.max(1e-9, berTheory(state.scheme, 10 ** (d / 10)))));
          side.line('th', db, th, { color: '--c-E' }); side.dots('sim', [state.ebn0], [Math.log10(Math.max(1e-6, TX.ber))], { color: '--accent', size: 10 });
          hud.set('a', `${SCHEMES.find((s) => s[0] === state.scheme)[1]}: ${C.bits} bit${C.bits > 1 ? 's' : ''} per symbol, Eb/N0 = ${state.ebn0} dB`);
          hud.set('b', `measured BER ${TX.ber ? TX.ber.toExponential(2) : `0 (< ${fmt(1 / (state.n * C.bits))})`}`); hud.set('c', `theory ${berTheory(state.scheme, 10 ** (state.ebn0 / 10)).toExponential(2)}`);
          plots.aux.draw({ xlim: [0, 18], cursor: state.ebn0, series: SCHEMES.map(([k, l], j) => ({ x: db, y: db.map((d) => Math.log10(Math.max(1e-9, berTheory(k, 10 ** (d / 10))))), color: ['--c-B', '--c-E', '--c-I', '--c-F'][j], label: l })) });
        } else {
          const r = rng(4), C = constellation('qpsk'), N = 64, sym = Array.from({ length: N }, () => C.pts[Math.floor(r() * 4)]);
          const rx = iqDemod(sym, { dphi: state.dphi * Math.PI / 180, df: state.df, sigma: state.sigma }), k = Math.max(1, Math.min(N, Math.ceil(time.t / 8 * N)));
          cons.dots('ideal', C.pts.map((p) => p[0]), C.pts.map((p) => p[1]), { color: '--c-ref', size: 9 }); cons.dots('rx', rx.slice(0, k).map((p) => p[0]), rx.slice(0, k).map((p) => p[1]), { color: '--c-B', size: 6 });
          cons.dots('now', [rx[k - 1][0]], [rx[k - 1][1]], { color: '--accent', size: 12 });
          const ii = [], qi = [], xs = []; for (let j = 0; j < Math.min(k, 8); j++) { const p = rx[Math.max(0, k - 8) + j]; xs.push(j, j + 1); ii.push(p[0], p[0]); qi.push(p[1], p[1]); }
          side.line('I', xs, ii, { color: '--c-B' }); side.line('Q', xs, qi, { color: '--c-I' });
          hud.set('a', 'QPSK on a 40 Hz carrier, 4 symbols per second'); hud.set('b', `receiver phase error ${state.dphi}°, frequency offset ${state.df} Hz`);
          hud.set('c', state.df ? `the constellation turns by ${fmt(360 * state.df * 0.25)}° per symbol` : state.dphi ? `rotated by −${state.dphi}°` : 'aligned: points on the ideal positions ✓');
          plots.aux.draw({ xlim: [0, N], cursor: k, series: [{ x: rx.map((_, j) => j), y: rx.map(([x, y]) => Math.atan2(y, x) * 180 / Math.PI), color: '--c-E', label: 'received phase per symbol [°]' }] });
        }
      },
      theme() { for (const k of [top, bot, cons, side]) k.theme(); },
    };
  },
};
