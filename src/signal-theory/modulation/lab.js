// Analog modulation: why a carrier is needed, AM (envelope, sidebands, overmodulation, the envelope
// detector, DSB-SC), FM (instantaneous frequency, Bessel sidebands, Carson's rule), PM against FM, and
// the three side by side.
import { createChart } from '../../lib/viz/chart.js';
import { fft } from '../../lib/dsp.js';
import { besselJ, modulate, envelope } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const ROW = (k, n, x = -4.3, w = 8.85) => [x, 2.55 - (k + 1) * (4.9 / n) + 0.25, w, 4.9 / n - 0.55];
const FS = 2048, N = 2048, ts = Array.from({ length: N }, (_, i) => i / FS);
const spec = (s) => { const re = Float64Array.from(s), im = new Float64Array(N); fft(re, im); const f = [], a = []; for (let k = 0; k <= N / 2; k++) { f.push(k * FS / N); a.push(2 * Math.hypot(re[k], im[k]) / N); } return { f, a }; };
const win = (a, lo, hi) => a.f.map((f, i) => [f, a.a[i]]).filter(([f]) => f >= lo && f <= hi);

export default {
  id: 'modulation', title: 'Modulation', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { fc: 100, fm: 8, mu: 0.8, dsb: false, df: 20, kp: 2.5, msg: 'sine', span: 0.5 },
  cases: [
    { id: 'carrier', label: 'Why a carrier', set: {}, examples: [
      { id: 'slow', label: 'Carrier only 4× the message', controls: ['fc'], set: { fc: 32 } },
    ] },
    { id: 'am', label: 'AM', set: {}, examples: [
      { id: 'full', label: 'μ = 1: envelope touches zero', controls: ['mu'], set: { mu: 1 } },
      { id: 'over', label: 'μ = 1.4: overmodulation', controls: ['mu'], set: { mu: 1.4 } },
      { id: 'dsb', label: 'DSB-SC: no carrier', controls: ['dsb'], set: { dsb: true } },
      { id: 'square', label: 'Square message: many sidebands', controls: ['msg'], set: { msg: 'square' } },
    ] },
    { id: 'fm', label: 'FM', set: {}, examples: [
      { id: 'narrow', label: 'β = 0.25: narrowband, like AM', controls: ['df'], set: { df: 2 } },
      { id: 'null', label: 'β = 2.405: the carrier vanishes', controls: ['df'], set: { df: 19.24 } },
      { id: 'wide', label: 'β = 6: wideband', controls: ['df'], set: { df: 48 } },
    ] },
    { id: 'pm', label: 'PM vs FM', set: {}, examples: [
      { id: 'faster', label: 'Faster message: PM swings more', controls: ['fm'], set: { fm: 20 } },
      { id: 'square', label: 'Square message: phase jumps vs frequency jumps', controls: ['msg'], set: { msg: 'square' } },
    ] },
    { id: 'compare', label: 'AM · FM · PM', set: {}, examples: [
      { id: 'tri', label: 'Triangle message', controls: ['msg'], set: { msg: 'tri' } },
    ] },
  ],
  controls: [
    { title: 'Message and carrier', items: [
      { id: 'msg', label: 'Message', type: 'segmented', options: [['sine', 'Sine'], ['square', 'Square'], ['tri', 'Triangle']] },
      { id: 'fm', label: 'Message frequency fm', unit: 'Hz', min: 1, max: 30, step: 1 },
      { id: 'fc', label: 'Carrier frequency fc', unit: 'Hz', min: 20, max: 300, step: 5 },
      { id: 'span', label: 'Time shown', unit: 's', min: 0.1, max: 1, step: 0.05 },
    ] },
    { title: 'Modulation', show: (s) => s.case !== 'carrier', items: [
      { id: 'mu', label: 'AM index μ', unit: '', min: 0, max: 1.5, step: 0.05, show: (s) => s.case === 'am' || s.case === 'compare' },
      { id: 'dsb', label: 'Suppress the carrier (DSB-SC)', type: 'check', show: (s) => s.case === 'am' },
      { id: 'df', label: 'FM deviation Δf', unit: 'Hz', min: 1, max: 80, step: 0.01, show: (s) => ['fm', 'pm', 'compare'].includes(s.case) },
      { id: 'kp', label: 'PM sensitivity kp', unit: 'rad', min: 0.1, max: 6, step: 0.1, show: (s) => s.case === 'pm' || s.case === 'compare' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR });
    const rows = [0, 1, 2].map((k) => createChart(ctx, { box: ROW(k, 3) })), cl = [0, 1, 2].map((k) => createChart(ctx, { box: ROW(k, 3, -4.3, 5.0) })), cr = [0, 1, 2].map((k) => createChart(ctx, { box: ROW(k, 3, 1.25, 3.3) }));
    const all = [tl, tr, bl, br, ...rows, ...cl, ...cr];
    const tsel = () => { const n = Math.round(state.span * FS); return { t: ts.slice(0, n), n }; };
    return {
      changed() { const c = state.case; for (const k of all) k.show(false); (c === 'carrier' ? rows : c === 'compare' ? [...cl, ...cr] : [tl, tr, bl, br]).forEach((k) => k.show(true)); },
      update() {
        const c = state.case, p = { fc: state.fc, fm: state.fm, mu: state.mu, df: state.df, kp: state.kp, msg: state.msg, dsb: state.dsb }, { t, n } = tsel();
        if (c === 'carrier') {
          const A = modulate('am', { ...p, mu: 0.6 }, FS, N);
          rows[0].range([0, state.span], [-1.3, 1.3]); rows[0].titles('t (s)', `message m(t), ${state.fm} Hz — baseband`); rows[0].line('m', t, A.m.slice(0, n), { color: '--c-B' });
          rows[1].range([0, state.span], [-1.3, 1.3]); rows[1].titles('t (s)', `carrier cos 2π·${state.fc}·t — ${fmt(state.fc / state.fm)}× faster`); rows[1].line('c', t, t.map((v) => Math.cos(2 * Math.PI * state.fc * v)), { color: '--c-I', width: 1.2 });
          rows[2].range([0, state.span], [-1.8, 1.8]); rows[2].titles('t (s)', 'message carried in the carrier’s amplitude: the envelope is m(t)'); rows[2].line('s', t, A.s.slice(0, n), { color: '--c-v', width: 1.2 }); rows[2].line('e', t, t.map((v, i) => 1 + 0.6 * A.m[i]), { color: '--c-B', dashed: true, width: 1.4 });
          hud.set('a', 'an antenna works when it is about λ/4 long'); hud.set('b', 'a 1 kHz voice signal: λ/4 = 75 km of antenna ✗', 'bad'); hud.set('c', 'the same voice on a 100 MHz carrier: λ/4 = 0.75 m ✓ — and each station gets its own fc', 'good');
          plots.aux.draw({ xlim: [1, 1e3], series: [{ x: Array.from({ length: 100 }, (_, i) => 10 ** (i * 0.03)), y: Array.from({ length: 100 }, (_, i) => 3e8 / (4 * 1e6 * 10 ** (i * 0.03))), color: '--c-I', label: 'λ/4 (m) vs frequency (MHz)' }] });
        } else if (c === 'am') {
          const A = modulate('am', p, FS, N), env = A.m.map((v) => (state.dsb ? v : 1 + state.mu * v)), det = envelope(A.s, FS, 3 * state.fm + 5);
          const ym = Math.max(2, ...env.map(Math.abs)) * 1.1; tl.range([0, state.span], [-ym, ym]); tl.titles('t (s)', state.dsb ? 'DSB-SC: m(t)·cos — the phase flips where m < 0' : `AM: [1 + μ m(t)]·cos, μ = ${state.mu}`);
          tl.line('s', t, A.s.slice(0, n), { color: '--c-v', width: 1.1 }); tl.line('e', t, env.slice(0, n), { color: '--c-B', dashed: true, width: 1.4 }); tl.line('e2', t, env.slice(0, n).map((v) => -v), { color: '--c-B', dashed: true, width: 1.4 });
          const S = spec(A.s), W = win(S, state.fc - 6 * state.fm - 10, state.fc + 6 * state.fm + 10);
          tr.range([W[0][0], W[W.length - 1][0]], [0, 1.15]); tr.titles('f (Hz)', state.dsb ? 'spectrum: two sidebands, no carrier' : 'spectrum: carrier + two sidebands at fc ± fm'); tr.stems('S', W.map((q) => q[0]), W.map((q) => q[1]), { color: '--c-E', width: 2.4 });
          bl.range([0, state.span], [-0.2, ym]); bl.titles('t (s)', 'envelope detector (rectify + low-pass, blue) vs 1 + μm (dashed)'); bl.line('d', t, det.slice(0, n), { color: '--c-B' }); bl.line('m', t, env.slice(0, n).map(Math.abs), { color: '--c-ref', dashed: true, width: 1.2 });
          const Pc = state.dsb ? 0 : 0.5, Ps = state.dsb ? 0.25 : state.mu ** 2 / 4, eff = Ps / (Pc + Ps);
          br.range([-0.5, 1.5], [0, 0.6]); br.titles('carrier · sidebands', 'average power (norm.)'); br.line('pc', [0, 0], [0, Pc], { color: '--c-ref', width: 24 }); br.line('ps', [1, 1], [0, Math.min(0.6, Ps)], { color: '--c-v', width: 24 });
          const over = !state.dsb && state.mu > 1;
          hud.set('a', state.dsb ? 'DSB-SC: all power in the sidebands — but the envelope is |m|, so a plain detector fails' : `μ = ${state.mu}: sidebands at ${state.fc - state.fm} and ${state.fc + state.fm} Hz, each μ/2 = ${fmt(state.mu / 2)}`);
          hud.set('b', over ? 'μ > 1: the envelope crosses zero → the detector distorts ✗' : `bandwidth 2·fm = ${2 * state.fm} Hz`, over ? 'bad' : '');
          hud.set('c', `power efficiency (sidebands / total) = ${fmt(100 * eff)} %${state.dsb ? '' : ' — the carrier carries no information'}`);
          const mus = Array.from({ length: 51 }, (_, i) => i / 50); plots.aux.draw({ xlim: [0, 1], cursor: Math.min(1, state.mu), series: [{ x: mus, y: mus.map((u) => 100 * (u * u / 4) / (0.5 + u * u / 4)), color: '--c-v', label: 'AM efficiency (%) vs μ: at most 33 %' }] });
        } else if (c === 'fm') {
          const F = modulate('fm', p, FS, N), beta = state.df / state.fm, carson = 2 * (state.df + state.fm);
          tl.range([0, state.span], [-1.4, 1.4]); tl.titles('t (s)', `FM: constant amplitude, the zero crossings bunch and spread`); tl.line('s', t, F.s.slice(0, n), { color: '--c-v', width: 1.1 }); tl.line('m', t, F.m.slice(0, n).map((v) => 1.2 * v), { color: '--c-B', dashed: true, width: 1 });
          tr.range([0, state.span], [state.fc - state.df * 1.5 - 2, state.fc + state.df * 1.5 + 2]); tr.titles('t (s)', `instantaneous frequency fᵢ = fc + Δf·m(t)`); tr.line('fi', t, F.fi.slice(0, n), { color: '--c-I' }); tr.line('fc', [0, state.span], [state.fc, state.fc], { color: '--ink-dim', dashed: true, width: 1 });
          const S = spec(F.s), lo = Math.max(0, state.fc - carson), hi = state.fc + carson, W = win(S, lo, hi);
          bl.range([lo, hi], [0, 1.1]); bl.titles('f (Hz)', `|X| (norm.): lines every fm, heights |Jₙ(β)| (dots), Carson band dashed`); bl.stems('S', W.map((q) => q[0]), W.map((q) => q[1]), { color: '--c-E', width: 2 });
          const ns = []; for (let k = -30; k <= 30; k++) if (state.fc + k * state.fm >= lo && state.fc + k * state.fm <= hi) ns.push(k);
          bl.dots('J', ns.map((k) => state.fc + k * state.fm), ns.map((k) => Math.abs(besselJ(Math.abs(k), beta))), { color: '--accent', size: 7 });
          bl.line('c1', [state.fc - carson / 2, state.fc - carson / 2], [0, 1.1], { color: '--c-north', dashed: true, width: 1 }); bl.line('c2', [state.fc + carson / 2, state.fc + carson / 2], [0, 1.1], { color: '--c-north', dashed: true, width: 1 });
          const bs = Array.from({ length: 300 }, (_, i) => i * 10 / 299);
          br.range([0, 10], [-0.5, 1.05]); br.titles('β = Δf / fm', 'J₀ (carrier), J₁, J₂, J₃ vs β');
          [0, 1, 2, 3].forEach((k) => br.line(`J${k}`, bs, bs.map((b) => besselJ(k, b)), { color: ['--c-E', '--c-B', '--c-I', '--c-v'][k], width: 1.6 })); br.line('now', [beta, beta], [-0.5, 1.05], { color: '--accent', dashed: true, width: 1.4 });
          let p98 = 0; for (const k of ns) if (Math.abs(k * state.fm) <= carson / 2) p98 += besselJ(Math.abs(k), beta) ** 2;
          hud.set('a', `β = ${fmt(beta)} — carrier line J₀(β) = ${fmt(besselJ(0, beta))}${Math.abs(besselJ(0, beta)) < 0.02 ? ': gone!' : ''}`); hud.set('b', `Carson: B ≈ 2(Δf + fm) = ${fmt(carson)} Hz holds ${fmt(100 * p98)} % of the power`);
          hud.set('c', beta < 0.5 ? 'narrowband: one pair of sidebands, like AM' : 'wideband: many sideband pairs — FM trades bandwidth for noise immunity');
          plots.aux.draw({ xlim: [0, 10], cursor: beta, series: [{ x: bs, y: bs.map((b) => 2 * (b + 1)), color: '--c-north', label: 'Carson bandwidth / fm vs β' }] });
        } else if (c === 'pm') {
          const P = modulate('pm', p, FS, N), F = modulate('fm', p, FS, N);
          tl.range([0, state.span], [-1.4, 1.4]); tl.titles('t (s)', `PM: phase = kp·m(t), kp = ${state.kp} rad`); tl.line('s', t, P.s.slice(0, n), { color: '--c-v', width: 1.1 }); tl.line('m', t, P.m.slice(0, n).map((v) => 1.2 * v), { color: '--c-B', dashed: true, width: 1 });
          tr.range([0, state.span], [-1.4, 1.4]); tr.titles('t (s)', `FM: frequency = fc + Δf·m(t), Δf = ${state.df} Hz`); tr.line('s', t, F.s.slice(0, n), { color: '--c-I', width: 1.1 }); tr.line('m', t, F.m.slice(0, n).map((v) => 1.2 * v), { color: '--c-B', dashed: true, width: 1 });
          const clip = (v) => Math.max(state.fc - 150, Math.min(state.fc + 150, v)), r = Math.max(state.df, state.kp * state.fm) * 1.6 + 5;
          bl.range([0, state.span], [state.fc - r, state.fc + r]); bl.titles('t (s)', 'instantaneous frequency (Hz): PM (green) follows dm/dt, FM (orange) follows m'); bl.line('p', t, P.fi.slice(0, n).map(clip), { color: '--c-v', width: 1.6 }); bl.line('f', t, F.fi.slice(0, n), { color: '--c-I', width: 1.6 });
          const SP = spec(P.s), SF = spec(F.s), lo = Math.max(0, state.fc - 3 * r), hi = state.fc + 3 * r, WP = win(SP, lo, hi), WF = win(SF, lo, hi);
          br.range([lo, hi], [0, 1.1]); br.titles('f (Hz)', '|X| (norm.): PM (green), FM (orange)'); br.line('P', WP.map((q) => q[0]), WP.map((q) => q[1]), { color: '--c-v', width: 1.4 }); br.line('F', WF.map((q) => q[0]), WF.map((q) => q[1]), { color: '--c-I', width: 1.4 });
          hud.set('a', `peak frequency swing: PM kp·fm = ${fmt(state.kp * state.fm)} Hz (grows with fm), FM Δf = ${state.df} Hz (fixed)`);
          hud.set('b', state.msg === 'square' ? 'square m: PM makes phase jumps (spikes in fᵢ), FM makes frequency jumps' : 'PM of m(t) is FM of dm/dt: the same family, angle modulation');
          hud.set('c', 'digital PSK (BPSK, QPSK) is PM with a square message');
          const fms = Array.from({ length: 30 }, (_, i) => i + 1); plots.aux.draw({ xlim: [1, 30], cursor: state.fm, series: [{ x: fms, y: fms.map((f) => state.kp * f), color: '--c-v', label: 'PM swing (Hz)' }, { x: [1, 30], y: [state.df, state.df], color: '--c-I', label: 'FM swing (Hz) vs fm (Hz)' }] });
        } else {
          const kinds = [['am', 'AM — amplitude', '--c-B'], ['fm', 'FM — frequency', '--c-I'], ['pm', 'PM — phase', '--c-v']];
          kinds.forEach(([k, label, col], j) => {
            const M = modulate(k, p, FS, N), ym = k === 'am' ? 1 + state.mu + 0.2 : 1.3;
            cl[j].range([0, state.span], [-ym, ym]); cl[j].titles(j === 2 ? 't (s)' : '', label); cl[j].line('s', t, M.s.slice(0, n), { color: col, width: 1.1 }); cl[j].line('m', t, M.m.slice(0, n).map((v) => (k === 'am' ? 1 + state.mu * v : 1.15 * v)), { color: '--ink-dim', dashed: true, width: 1 });
            const S = spec(M.s), W = win(S, Math.max(0, state.fc - 80), state.fc + 80); cr[j].range([W[0][0], W[W.length - 1][0]], [0, 1.1]); cr[j].titles(j === 2 ? 'f (Hz)' : '', '|S(f)|'); cr[j].stems('S', W.map((q) => q[0]), W.map((q) => q[1]), { color: col, width: 1.6 });
          });
          hud.set('a', `AM bandwidth 2fm = ${2 * state.fm} Hz`); hud.set('b', `FM ≈ 2(Δf + fm) = ${2 * (state.df + state.fm)} Hz`); hud.set('c', `PM ≈ 2(kp + 1)fm = ${fmt(2 * (state.kp + 1) * state.fm)} Hz`);
          plots.aux.draw({ xlim: [0, state.span], series: [{ x: t, y: modulate('am', p, FS, N).m.slice(0, n), color: '--c-ref', label: 'message m(t)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); },
    };
  },
};
