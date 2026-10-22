// Radar waveforms: what each one is for. The plain pulse, the LFM chirp and the Barker-13 code taken
// apart (pulse, spectrum, received echo, compressed output), then each in the situation it wins or fails:
// two aircraft in formation (Doppler), fighter and tanker (chirp resolution, range–Doppler coupling),
// a drone beside a tanker (sidelobe masking).
import { createChart } from '../../lib/viz/chart.js';
import { createAircraft } from '../../lib/viz/glyphs.js';
import { rng } from '../../lib/random.js';
import { C0, waveform, echo, compress, metrics, spectrum, coupling, dopplerSpectrum } from './model.js';

const us = 1e-6, MHz = 1e6, LAM = 0.03, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0], RIGHT = [0.55, -2.35, 4.0, 4.9];
const dB = (y) => { const m = Math.max(...y); return Array.from(y, (v) => Math.max(-60, 20 * Math.log10(Math.max(v / m, 1e-6)))); };

export default {
  id: 'waveforms', title: 'Radar waveforms', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { kind: 'plain', tau: 10 * us, B: 10 * MHz, weight: 'none', snr: 10, Tms: 5, dv: 5, sep: 30, vt: 0, gap: 150, level: -25, wf: 'barker' },
  cases: [
    { id: 'plain', label: 'Plain pulse', set: { kind: 'plain' }, examples: [
      { id: 'short', label: 'Short pulse: wide spectrum', controls: ['tau'], set: { tau: 1 * us } },
      { id: 'long', label: 'Long pulse: narrow spectrum, fat triangle', controls: ['tau'], set: { tau: 20 * us } },
      { id: 'noisy', label: 'Weak echo: compression lifts it', controls: ['snr'], set: { snr: -5 } },
    ] },
    { id: 'chirp', label: 'LFM chirp', set: { kind: 'chirp', tau: 20 * us, B: 10 * MHz }, examples: [
      { id: 'wide', label: 'More bandwidth: sharper spike', controls: ['B'], set: { B: 20 * MHz } },
      { id: 'hamming', label: 'Hamming weighting: low sidelobes', controls: ['weight'], set: { weight: 'hamming' } },
      { id: 'noisy', label: 'Buried in noise, compressed out', controls: ['snr'], set: { snr: -10 } },
    ] },
    { id: 'barker', label: 'Barker-13', set: { kind: 'barker', tau: 13 * us }, examples: [
      { id: 'short', label: 'Shorter chips: finer range', controls: ['tau'], set: { tau: 3.25 * us } },
      { id: 'noisy', label: 'Noisy echo', controls: ['snr'], set: { snr: -5 } },
    ] },
    { id: 'formation', label: 'Formation (Doppler)', set: {}, examples: [
      { id: 'merge', label: '1 m/s apart: one line', controls: ['dv', 'Tms'], set: { dv: 1 } },
      { id: 'longer', label: 'Look longer: they split', controls: ['dv', 'Tms'], set: { dv: 1, Tms: 25 } },
    ] },
    { id: 'refuel', label: 'Fighter and tanker', set: {}, examples: [
      { id: 'narrow', label: 'Less bandwidth: they merge again', controls: ['B'], set: { B: 3 * MHz } },
      { id: 'coupling', label: 'Closing at 300 m/s: 6 m error', controls: ['vt'], set: { vt: 300 } },
    ] },
    { id: 'masking', label: 'Drone beside a tanker', set: {}, examples: [
      { id: 'visible', label: 'Drone at −18 dB: visible', controls: ['level'], set: { level: -18 } },
      { id: 'chirp', label: 'Unweighted chirp: worse', controls: ['wf'], set: { wf: 'chirp' } },
      { id: 'hamming', label: 'Hamming chirp: drone reappears', controls: ['wf'], set: { wf: 'chirpH' } },
    ] },
  ],
  controls: [
    { title: 'Waveform', show: (s) => ['plain', 'chirp', 'barker'].includes(s.case), items: [
      { id: 'tau', label: 'Pulse length τ', unit: 'µs', k: 1e6, min: 0.5 * us, max: 40 * us, log: true },
      { id: 'B', label: 'Sweep bandwidth B', unit: 'MHz', k: 1e-6, min: 1 * MHz, max: 30 * MHz, step: 0.5 * MHz, show: (s) => s.case === 'chirp' },
      { id: 'weight', label: 'Filter weighting', type: 'segmented', options: [['none', 'None'], ['hamming', 'Hamming']], show: (s) => s.case === 'chirp' },
      { id: 'snr', label: 'Echo SNR (before)', unit: 'dB', min: -15, max: 30, step: 1 },
    ] },
    { title: 'Formation', show: (s) => s.case === 'formation', items: [
      { id: 'dv', label: 'Speed difference', unit: 'm/s', min: 0.2, max: 15, step: 0.1 },
      { id: 'Tms', label: 'Burst length T', unit: 'ms', min: 1, max: 40, step: 0.5 },
    ] },
    { title: 'Refuelling', show: (s) => s.case === 'refuel', items: [
      { id: 'sep', label: 'Separation', unit: 'm', min: 5, max: 200, step: 1 },
      { id: 'B', label: 'Chirp bandwidth', unit: 'MHz', k: 1e-6, min: 1 * MHz, max: 30 * MHz, step: 0.5 * MHz },
      { id: 'vt', label: 'Closing speed', unit: 'm/s', min: 0, max: 600, step: 10 },
    ] },
    { title: 'Masking', show: (s) => s.case === 'masking', items: [
      { id: 'wf', label: 'Waveform', type: 'segmented', options: [['barker', 'Barker-13'], ['chirp', 'Chirp'], ['chirpH', 'Chirp + Hamming']] },
      { id: 'level', label: 'Drone below tanker', unit: 'dB', min: -50, max: -5, step: 1 },
      { id: 'gap', label: 'Gap', unit: 'm', min: 30, max: 600, step: 5 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR }), right = createChart(ctx, { box: RIGHT });
    const sceneC = createChart(ctx, { box: TL, y: [-1, 1], yTicks: false, grid: false });
    const ac = [createAircraft(stage), createAircraft(stage, '--c-E')];
    const all = [tl, tr, bl, br, right, sceneC];

    return {
      changed() {
        for (const k of all) k.show(false); for (const a of ac) a.object.visible = false;
        const c = state.case;
        if (['plain', 'chirp', 'barker'].includes(c)) for (const k of [tl, tr, bl, br]) k.show(true);
        else { sceneC.show(true); bl.show(true); right.show(true); }
      },
      update() {
        const c = state.case, rn = rng(5);
        const gauss = () => Math.sqrt(-2 * Math.log(1 - rn())) * Math.cos(2 * Math.PI * rn());
        if (['plain', 'chirp', 'barker'].includes(c)) {
          const prm = { tau: state.tau, B: c === 'chirp' ? state.B : 0 }, Bw = c === 'chirp' ? state.B : c === 'barker' ? 13 / state.tau : 1 / state.tau;
          const fs = Math.min(600 / state.tau, Math.max(8 * Bw, 40 / state.tau)), p = waveform(c, prm, fs);
          const t = Array.from({ length: p.n }, (_, i) => ((i + 0.5) / fs - state.tau / 2) / us);
          tl.range([t[0], t[t.length - 1]], [-1.3, 1.3]); tl.titles('time in the pulse (µs)', c === 'chirp' ? 'I (blue), Q (orange): the phase sweeps' : c === 'barker' ? 'the 13 chips: + + + + + − − + + − + − +' : 'on for τ, off otherwise');
          tl.line('I', t, p.re, { color: '--c-B' }); if (c === 'chirp') tl.line('Q', t, p.im, { color: '--c-I', width: 1.6 }); else tl.hide('Q');
          const S = spectrum(p, fs, 512), fm = S.f.map((f) => f / MHz), span = Math.min(fs / 2, 3 * Bw) / MHz;
          tr.range([-span, span], [-50, 2]); tr.titles('frequency (MHz)', `power (dB): bandwidth B ≈ ${fmt(Bw / MHz)} MHz`); tr.line('S', fm, S.dB, { color: '--c-E' });
          // received echo in noise, then compressed
          const L = 3 * p.n, sig = 10 ** (state.snr / 20), x = echo(p, [{ delay: p.n, amp: sig }], L, fs);
          for (let i = 0; i < L; i++) { x.re[i] += gauss() / Math.SQRT2; x.im[i] += gauss() / Math.SQRT2; }
          const tt = Array.from({ length: L }, (_, i) => (i / fs) / us);
          bl.range([0, tt[L - 1]], [-Math.max(3, 2 * sig), Math.max(3, 2 * sig)]); bl.titles('time (µs)', `voltage (÷ noise rms): received before compression, SNR ${state.snr} dB`); bl.line('x', tt, Array.from(x.re), { color: '--c-ref', width: 1.2 });
          const y = compress(x, p, c === 'chirp' ? state.weight : 'none'), yd = dB(y), r = Array.from({ length: L }, (_, i) => (i - p.n) / fs * C0 / 2);
          const clean = compress(echo(p, [{ delay: p.n, amp: 1 }], L, fs), p, c === 'chirp' ? state.weight : 'none'), m = metrics(clean);
          const win = Math.min(r[L - 1], Math.max(8 * C0 / (2 * Bw), 200));
          br.range([-win, win], [-60, 2]); br.titles('range from the target (m)', `output (dB): after the matched filter, sidelobes ${fmt(m.psl)} dB`); br.line('y', r, yd, { color: '--c-B' }); br.line('ref', r, dB(clean), { color: '--c-E', width: 1.2, dashed: true });
          const gain = 10 * Math.log10(Bw * state.tau);
          hud.set('a', `τ = ${fmt(state.tau / us)} µs, B ≈ ${fmt(Bw / MHz)} MHz → range resolution c/2B = ${fmt(C0 / (2 * Bw))} m`);
          hud.set('b', `time–bandwidth product Bτ = ${fmt(Bw * state.tau)} → compression gain ${fmt(gain)} dB`);
          hud.set('c', c === 'plain' ? 'no sidelobes: a clean triangle, but resolution tied to τ' : c === 'chirp' ? `peak sidelobe ${fmt(m.psl)} dB (${state.weight === 'hamming' ? 'Hamming: −42 dB, 1.5× wider' : 'unweighted: −13.3 dB'})` : 'Barker-13: sidelobes stuck at 1/13 = −22.3 dB');
          plots.aux.draw({ xlim: [0.5, 40], cursor: state.tau / us, series: [{ x: Array.from({ length: 80 }, (_, i) => 0.5 + i * 0.5), y: Array.from({ length: 80 }, (_, i) => (C0 * (0.5 + i * 0.5) * us / 2)), color: '--c-ref', label: 'plain pulse resolution cτ/2 (m) vs τ (µs)' }, ...(c === 'chirp' ? [{ x: [0.5, 40], y: [C0 / (2 * state.B), C0 / (2 * state.B)], color: '--c-B', label: 'chirp: c/2B, any τ' }] : [])] });
        } else if (c === 'formation') {
          const prf = 10e3, N = Math.round(state.Tms * 1e-3 * prf), v1 = 40, v2 = v1 + state.dv, dvRes = LAM * prf / (2 * N);
          sceneC.range([-1, 1], [-1, 1]); ac[0].set(sceneC.mx(-0.15), sceneC.my(0.3), Math.PI, 0.3); ac[1].set(sceneC.mx(0.15), sceneC.my(-0.3), Math.PI, 0.3); sceneC.titles('', `two aircraft 30 m apart, ${v1} and ${fmt(v2)} m/s`);
          const tau = 1 * us, xs = Array.from({ length: 300 }, (_, i) => -600 + 4 * i), prof = xs.map((x) => Math.max(0, 1 - Math.abs(x) / (C0 * tau / 2)) + Math.max(0, 1 - Math.abs(x - 30) / (C0 * tau / 2)) * 0.8);
          bl.range([-600, 600], [0, 2]); bl.titles('range (m)', `echo amplitude (norm.): one blob, ΔR = cτ/2 = ${fmt(C0 * tau / 2)} m`); bl.line('p', xs, prof, { color: '--c-ref' });
          const D = dopplerSpectrum([2 * v1 / LAM, 2 * v2 / LAM], N, prf, 1024), vs = D.f.map((f) => f * LAM / 2);
          right.range([v1 - 25, v1 + 25 + state.dv], [0, 1.1]); right.titles('radial velocity (m/s)', `spectrum amplitude (norm.): ${N} pulses, Δv = λ/2T = ${fmt(dvRes)} m/s`); right.line('D', vs, D.A, { color: '--c-B' });
          const split = state.dv > dvRes;
          hud.set('a', `burst T = ${state.Tms} ms (${N} pulses at 10 kHz)`); hud.set('b', `velocity resolution λ/2T = ${fmt(dvRes)} m/s vs Δv = ${fmt(state.dv)} m/s`);
          hud.set('c', split ? 'two Doppler lines: the formation is resolved by speed ✓' : 'one Doppler line: look longer ✗', split ? 'good' : 'bad');
          const Ts = Array.from({ length: 80 }, (_, i) => 0.5 + i * 0.5); plots.aux.draw({ xlim: [0.5, 40], cursor: state.Tms, series: [{ x: Ts, y: Ts.map((T) => LAM / (2 * T * 1e-3)), color: '--c-B', label: 'velocity resolution (m/s) vs burst length (ms)' }, { x: [0.5, 40], y: [state.dv, state.dv], color: '--c-E', dash: [4, 3], label: 'their speed difference' }] });
        } else if (c === 'refuel') {
          const tau = 20 * us, fs = Math.max(2 * state.B, 20e6), pc = waveform('chirp', { tau, B: state.B }, fs), pp = waveform('plain', { tau }, fs);
          const dsamp = Math.round(state.sep * 2 / C0 * fs), fd = 2 * state.vt / LAM, L = 3 * pc.n;
          const tg = [{ delay: pc.n, amp: 1, fd }, { delay: pc.n + dsamp, amp: 0.8, fd }];
          const yc = compress(echo(pc, tg, L, fs), pc), yp = compress(echo(pp, tg.map((t) => ({ ...t, fd: 0 })), L, fs), pp);
          const r = Array.from({ length: L }, (_, i) => (i - pc.n) / fs * C0 / 2), w = Math.max(150, 3 * state.sep);
          sceneC.range([-1, 1], [-1, 1]); ac[0].set(sceneC.mx(-0.2), sceneC.my(0), Math.PI, 0.25); ac[1].set(sceneC.mx(0.2), sceneC.my(0), Math.PI, 0.38); sceneC.titles('', `fighter and tanker ${state.sep} m apart, 80 km out`);
          bl.range([-w, w + state.sep], [0, 1.15]); bl.titles('range (m)', `echo amplitude (norm.): plain 20 µs pulse, ΔR = ${fmt(C0 * tau / 2 / 1000)} km → one target`); bl.line('p', r, Array.from(yp, (v) => v / Math.max(...yp)), { color: '--c-ref' });
          right.range([-w, w + state.sep], [0, 1.15]); right.titles('range (m)', `same pulse, ${fmt(state.B / MHz)} MHz chirp: ΔR = ${fmt(C0 / (2 * state.B))} m`); right.line('c', r, Array.from(yc, (v) => v / Math.max(...yc)), { color: '--c-B' });
          right.stems('true', [0, state.sep], [1.1, 1.1], { color: '--c-E', width: 1.4 });
          const res = C0 / (2 * state.B), err = coupling(fd, tau, state.B);
          hud.set('a', `separation ${state.sep} m vs chirp resolution c/2B = ${fmt(res)} m`, state.sep > res ? 'good' : 'bad');
          hud.set('b', state.vt ? `closing at ${state.vt} m/s: f_d = ${fmt(fd / 1e3)} kHz → reads ${fmt(-err)} m closer (yellow: true)` : 'stationary: peaks on the true positions (yellow)');
          hud.set('c', 'energy from the long pulse, resolution from the bandwidth');
          const vs = Array.from({ length: 61 }, (_, i) => i * 10); plots.aux.draw({ xlim: [0, 600], cursor: state.vt, series: [{ x: vs, y: vs.map((v) => -coupling(2 * v / LAM, tau, state.B)), color: '--c-I', label: 'range error from coupling (m) vs closing speed (m/s)' }] });
        } else {
          const kind = state.wf === 'barker' ? 'barker' : 'chirp', tau = kind === 'barker' ? 13 * 0.1 * us : 13 * 0.1 * us * 10, B = kind === 'barker' ? 10 * MHz : 10 * MHz;
          const fs = 40 * MHz, p = waveform(kind, { tau, B }, fs), dsamp = Math.round(state.gap * 2 / C0 * fs), L = 3 * p.n + dsamp;
          const y = compress(echo(p, [{ delay: p.n, amp: 1 }, { delay: p.n + dsamp, amp: 10 ** (state.level / 20) }], L, fs), p, state.wf === 'chirpH' ? 'hamming' : 'none');
          const solo = compress(echo(p, [{ delay: p.n, amp: 1 }], L, fs), p, state.wf === 'chirpH' ? 'hamming' : 'none'), mt = metrics(solo);
          const r = Array.from({ length: L }, (_, i) => (i - p.n) / fs * C0 / 2), w = Math.max(400, 1.6 * state.gap);
          sceneC.range([-1, 1], [-1, 1]); ac[1].set(sceneC.mx(-0.2), sceneC.my(0), Math.PI, 0.4); ac[0].set(sceneC.mx(0.35), sceneC.my(0), Math.PI, 0.13); sceneC.titles('', `tanker and a drone ${state.gap} m behind, ${state.level} dB weaker`);
          right.range([-w / 3, w], [-60, 2]); right.titles('range (m)', `output (dB): ${state.wf === 'barker' ? 'Barker-13' : state.wf === 'chirp' ? 'chirp, unweighted' : 'chirp, Hamming'}, sidelobe floor ${fmt(mt.psl)} dB`);
          right.line('y', r, dB(y), { color: '--c-B' }); right.line('floor', [-w / 3, w], [mt.psl, mt.psl], { color: '--c-north', dashed: true, width: 1.4 }); right.stems('drone', [state.gap], [state.level], { color: '--c-I', width: 2 });
          const vis = state.level > mt.psl + 1;
          bl.range([-50, 0], [0, 1]); bl.titles('level (dB)', 'drone (orange) against the sidelobe floor (red)'); bl.stems('lv', [state.level], [0.8], { color: '--c-I' }); bl.stems('fl', [mt.psl], [0.8], { color: '--c-north' });
          hud.set('a', `drone ${state.level} dB below the tanker, sidelobes at ${fmt(mt.psl)} dB`); hud.set('b', vis ? 'above the sidelobes: the drone is visible ✓' : 'under the sidelobes: the drone disappears ✗', vis ? 'good' : 'bad');
          hud.set('c', state.wf === 'barker' ? 'the code’s floor is fixed: no weighting can lower it' : state.wf === 'chirp' ? 'unweighted chirp: −13 dB, worse than Barker' : 'weighting lowers the floor, at 1.5× the main-lobe width');
          plots.aux.draw({ xlim: [-50, 0], cursor: state.level, series: [{ x: [-50, 0], y: [1, 1], color: '--line' }] });
        }
      },
      theme() { for (const k of all) k.theme(); ac.forEach((a) => a.theme()); },
    };
  },
};
