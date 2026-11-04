// Radar receivers: follow one pulse through a superheterodyne, a digital-IF and a direct-conversion
// (homodyne) chain — block diagram on top, the signal and its spectrum at the selected stage below —
// and the IQ demodulator itself (LO offset, filter bandwidth, rise time).
import { createChart } from '../../lib/viz/chart.js';
import { createBlocks } from '../../lib/viz/blocks.js';
import { chain, spectrumDb, iq, riseTime } from './model.js';

const MHz = 1e6, us = 1e-6, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const BASE = { fs: 2e9, n: 4096, fRF: 400e6, fInt: 650e6, phi: 0.7, tau: 1e-6, t0: 0.5e-6, noise: 0.02, gain: 10, bwBB: 8e6, fsADC: 100e6 };
const SHORT = { 'Antenna': 'Antenna', 'RF band-pass': 'RF BPF', 'LNA': 'LNA', 'Mixer → IF': 'Mixer', 'IF band-pass': 'IF BPF', 'IQ demodulator': 'IQ demod', 'ADC': 'ADC', 'ADC at IF': 'ADC @ IF', 'Digital down-conversion': 'DDC', 'Low-pass + decimate ÷4': 'LPF ÷4', 'RF filter + LNA': 'BPF+LNA', 'IQ mixer (LO = RF)': 'IQ mixer', 'Low-pass': 'LPF' };
const NOTE = {
  'Antenna': 'everything the antenna picks up: our pulse at 400 MHz, a strong interferer at 650 MHz, a weaker signal at the image frequency, and noise',
  'RF band-pass': 'keeps the band around 400 MHz: the interferer is gone, but the image is only partly attenuated',
  'LNA': 'the low-noise amplifier lifts everything by the same gain; its noise figure sets the noise floor of the whole receiver',
  'Mixer → IF': 'multiplying by the LO makes sum and difference frequencies: the pulse appears at |fRF − fLO| (IF) and at fRF + fLO; the image lands on the IF too',
  'IF band-pass': 'a narrow, sharp filter at the IF removes the sum term and sets the receiver bandwidth',
  'IQ demodulator': 'mixing the IF with cos and −sin and low-pass filtering gives I and Q: a complex baseband signal with amplitude and phase',
  'ADC': 'sampling and quantising I and Q; from here on everything is numbers',
  'ADC at IF': 'one fast ADC samples the real IF directly; the 70 MHz IF aliases to |70 − 100| = 30 MHz (bandpass sampling)',
  'Digital down-conversion': 'multiplying by e^(−j2π f n/fs) in software shifts the signal to 0 Hz: the spectrum is no longer symmetric',
  'Low-pass + decimate ÷4': 'a digital low-pass keeps the baseband and allows dropping 3 samples in 4: fewer numbers, same information',
  'RF filter + LNA': 'band-pass and amplify at RF; there is no IF in this architecture',
  'IQ mixer (LO = RF)': 'the LO sits exactly at the carrier: the pulse drops straight to 0 Hz; any LO error or leakage becomes a DC offset or a slow rotation',
  'Low-pass': 'keeps the baseband pulse and rejects the 2·fRF terms',
};

export default {
  id: 'receiver', title: 'Receivers', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  defaults: { arch: 'superhet', auto: true, stage: 0, fLO: 330, bwRF: 60, bwIF: 20, aImg: 0.5, aInt: 1, bits: 12, fsIF: 100, dLO: 0, dc: 0, fc: 100, det: 0, bw: 16, phi: 40 },
  cases: [
    { id: 'superhet', label: 'Superheterodyne', set: { arch: 'superhet' }, examples: [
      { id: 'mixer', label: 'At the mixer: sum and difference', controls: ['stage', 'fLO'], set: { auto: false, stage: 3 } },
      { id: 'image', label: 'The image problem', controls: ['stage', 'aImg', 'bwRF'], set: { auto: false, stage: 4, aImg: 1, bwRF: 200 } },
      { id: 'iq', label: 'The IQ output', controls: ['stage'], set: { auto: false, stage: 5 } },
      { id: 'adc', label: 'A 4-bit ADC', controls: ['stage', 'bits'], set: { auto: false, stage: 6, bits: 4 } },
    ] },
    { id: 'digitalif', label: 'Digital IF', set: { arch: 'digitalif' }, examples: [
      { id: 'adc', label: 'ADC at IF: bandpass sampling', controls: ['stage', 'fsIF'], set: { auto: false, stage: 5 } },
      { id: 'ddc', label: 'Digital down-conversion', controls: ['stage'], set: { auto: false, stage: 6 } },
      { id: 'dec', label: 'Filter and decimate', controls: ['stage'], set: { auto: false, stage: 7 } },
    ] },
    { id: 'homodyne', label: 'Homodyne', set: { arch: 'homodyne' }, examples: [
      { id: 'mix', label: 'Straight to baseband', controls: ['stage'], set: { auto: false, stage: 2 } },
      { id: 'lo', label: 'LO 200 kHz off: the pulse rotates', controls: ['stage', 'dLO'], set: { auto: false, stage: 3, dLO: 200 } },
      { id: 'dc', label: 'LO leakage: a DC offset', controls: ['stage', 'dc'], set: { auto: false, stage: 3, dc: 2 } },
    ] },
    { id: 'iqdemod', label: 'IQ demodulator', set: {}, examples: [
      { id: 'detune', label: 'LO detuned 2 MHz: I and Q rotate', controls: ['det'], set: { det: 2 } },
      { id: 'narrow', label: 'Narrow filter: slow edges', controls: ['bw'], set: { bw: 4 } },
      { id: 'tooNarrow', label: 'Too narrow: no flat top', controls: ['bw'], set: { bw: 1.5 } },
      { id: 'phase', label: 'A different phase', controls: ['phi'], set: { phi: 150 } },
    ] },
  ],
  controls: [
    { title: 'Follow the pulse', show: (s) => s.case !== 'iqdemod', items: [
      { id: 'auto', label: 'Follow the pulse through the chain', type: 'check' },
      { id: 'stage', label: 'Stage', unit: '', min: 0, max: 7, step: 1, hint: 'Pick a block in the diagram', show: (s) => !s.auto },
    ] },
    { title: 'Receiver', show: (s) => s.case !== 'iqdemod', items: [
      { id: 'fLO', label: 'LO frequency', unit: 'MHz', min: 250, max: 380, step: 1, show: (s) => s.arch !== 'homodyne' },
      { id: 'bwRF', label: 'RF filter bandwidth', unit: 'MHz', min: 20, max: 400, step: 5 },
      { id: 'bwIF', label: 'IF filter bandwidth', unit: 'MHz', min: 4, max: 60, step: 1, show: (s) => s.arch !== 'homodyne' },
      { id: 'aImg', label: 'Signal at the image frequency', unit: '', min: 0, max: 1.5, step: 0.05, show: (s) => s.arch !== 'homodyne' },
      { id: 'aInt', label: 'Out-of-band interferer', unit: '', min: 0, max: 3, step: 0.1 },
      { id: 'bits', label: 'ADC bits', unit: '', min: 2, max: 16, step: 1 },
      { id: 'fsIF', label: 'IF sampling rate', unit: 'MS/s', min: 60, max: 250, step: 5, show: (s) => s.arch === 'digitalif' },
      { id: 'dLO', label: 'LO error', unit: 'kHz', min: -500, max: 500, step: 10, show: (s) => s.arch === 'homodyne' },
      { id: 'dc', label: 'LO leakage (DC offset)', unit: '', min: 0, max: 5, step: 0.1, show: (s) => s.arch === 'homodyne' },
    ] },
    { title: 'Demodulator', show: (s) => s.case === 'iqdemod', items: [
      { id: 'fc', label: 'Carrier', unit: 'MHz', min: 40, max: 200, step: 1 },
      { id: 'det', label: 'LO detuning', unit: 'MHz', min: -5, max: 5, step: 0.1 },
      { id: 'bw', label: 'Low-pass bandwidth', unit: 'MHz', min: 1, max: 40, step: 0.5 },
      { id: 'phi', label: 'Echo phase', unit: '°', min: -180, max: 180, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, time } = ctx;
    stage.controls.enableRotate = false;
    // chain cases: block row on top, the selected stage's signal (left) and spectrum (right) below
    const tc = createChart(ctx, { box: [-4.3, -3.6, 4.2, 3.45], xTitle: 'time (µs)' }), sc = createChart(ctx, { box: [0.4, -3.6, 4.1, 3.45], xTitle: 'frequency (MHz)', yTitle: 'spectrum (dB)' });
    // IQ case: one schema with the signal before and after every block; spectra and I/Q in time below
    const q2 = [[-4.3, -3.6, 4.0, 2.3], [0.55, -3.6, 3.8, 2.3]].map((b) => createChart(ctx, { box: b }));
    const bd = createBlocks(ctx, { labels: 70 });
    let S = null, SP = null;

    // ---- chain: physical symbol per stage, a mini-spectrum on the wire after it ----
    const SYM = {
      'Antenna': ['antenna'], 'RF band-pass': ['filter', { type: 'bp' }], 'LNA': ['amp'], 'Mixer → IF': ['mixer', {}, 'LO'], 'IF band-pass': ['filter', { type: 'bp' }],
      'IQ demodulator': ['box', { t: 'I/Q', w: 0.5 }, 'LO (IF)'], 'ADC': ['adc'], 'ADC at IF': ['adc'], 'Digital down-conversion': ['mixer', {}, 'NCO e^−jωn'], 'Low-pass + decimate ÷4': ['filter', { type: 'lp' }],
      'RF filter + LNA': ['amp'], 'IQ mixer (LO = RF)': ['mixer', {}, 'LO = fRF'], 'Low-pass': ['filter', { type: 'lp' }],
    };
    const mini = (st) => { const sp = spectrumDb(st.x, st.fs), cplx = st.x.im.some((v) => Math.abs(v) > 1e-9), out = [], K = 90; let lo = 0; while (!cplx && sp.f[lo] < 0) lo++; const n = sp.f.length - lo;
      for (let j = 0; j < K; j++) { let m = -80; for (let i = lo + Math.floor(j * n / K); i < lo + Math.floor((j + 1) * n / K); i++) m = Math.max(m, sp.dB[i]); out.push(Math.max(-1, (m + 60) / 30 - 1)); } return out; };
    function chainDiagram(list, k, f) {
      const n = list.length, W = 8.4 / n, y = 1.55, x = (i) => -4.2 + W * (i + 0.5);
      bd.begin(); const P = list.map((st, i) => { const [kind, o = {}, lo] = SYM[st.name] || ['box', { t: SHORT[st.name] }]; const p = bd.block(kind, [x(i), y], { ...o, on: i === k, label: kind === 'antenna' ? '' : SHORT[st.name] || st.name, labelAt: lo ? 't' : 'b' });
        if (lo) { const l = bd.block('lo', [x(i), y - 0.75], { label: lo, labelAt: 'r', on: i === k }); bd.wire(l.t, p.b); } return p; });
      for (let i = 1; i < n; i++) { const a = list[i - 1].name === 'Antenna' ? [x(i - 1), y - 0.25] : P[i - 1].r; if (list[i - 1].name === 'Antenna') bd.wire([x(i - 1), y - 0.25], [x(i - 1), y - 0.4], [P[i].l[0] - 0.12, y - 0.4], [P[i].l[0] - 0.12, y], P[i].l, { on: i === k }); else bd.wire(a, P[i].l, { on: i === k }); }
      list.forEach((st, i) => bd.wave([x(i) + (i < n - 1 ? W / 2 : 0), 2.45], SP[i], { w: Math.min(0.82, W - 0.14), h: 0.4, norm: 1, zero: false, color: '--c-E', on: i === k, cap: i === 0 ? 'spectrum' : '' }));
      if (state.auto && k < n - 1 && f < 1) bd.token([x(k) + W * Math.min(1, f * 1.4), y]);
      bd.end();
    }
    const params = () => ({ ...BASE, fLO: state.fLO * MHz, bwRF: state.bwRF * MHz, bwIF: state.bwIF * MHz, aImg: state.aImg, aInt: state.aInt, bits: state.bits, fsIF: state.fsIF * MHz, dLO: state.dLO * 1e3, dc: state.dc });

    // ---- the IQ demodulator as one schema. RF, LO and mixer tiles draw the carrier at FC_TILE so its cycles can be
    // seen; I, Q and the samples come from the real receiver (after the low-pass they do not depend on the carrier) ----
    const FC_TILE = 10 * MHz, I0 = 800, I1 = 2000, DS = 4, sl = (a) => Array.from(a).slice(I0, I1).filter((_, i) => i % DS === 0);
    function iqSchema(T, R) {
      const yI = 2.1, yQ = 0.3, yc = 1.2, xs = { ant: -4.35, lna: -3.4, sp: -2.6, mx: -1.6, lp: 0.15, adc: 1.55, pl: 3.55 };
      const nm = Math.max(...sl(T.mI).map(Math.abs), ...sl(T.mQ).map(Math.abs), 1e-9), nb = Math.max(...sl(R.I).map(Math.abs), ...sl(R.Q).map(Math.abs), 1e-9), part = (a) => a.slice(0, 110);
      bd.begin();
      const ant = bd.block('antenna', [xs.ant, yc + 0.25], {}), lna = bd.block('amp', [xs.lna, yc], { label: 'BPF + LNA' }), sp = bd.block('node', [xs.sp, yc]);
      const mI = bd.block('mixer', [xs.mx, yI], {}), mQ = bd.block('mixer', [xs.mx, yQ], {}), lo = bd.block('lo', [xs.mx, yc + 0.08], { label: 'LO', labelAt: 'l' }), ph = bd.block('phase', [xs.mx, yc - 0.48], { w: 0.42, h: 0.26 });
      const fI = bd.block('filter', [xs.lp, yI], { type: 'lp', label: 'low-pass', labelAt: 't' }), fQ = bd.block('filter', [xs.lp, yQ], { type: 'lp', label: 'low-pass' }), aI = bd.block('adc', [xs.adc, yI], {}), aQ = bd.block('adc', [xs.adc, yQ], {});
      bd.wire(ant.b, lna.l, { arrow: true }); bd.wire(lna.r, sp.c, { arrow: false }); bd.wire(sp.c, [xs.sp, yI], mI.l); bd.wire(sp.c, [xs.sp, yQ], mQ.l);
      bd.wire(lo.t, mI.b, { label: 'cos', dx: 0.17, dy: 0 }); bd.wire(lo.b, ph.t); bd.wire(ph.b, mQ.t, { label: '−sin', dx: 0.22, dy: 0.02 });
      bd.wire(mI.r, fI.l); bd.wire(mQ.r, fQ.l); bd.wire(fI.r, aI.l); bd.wire(fQ.r, aQ.l);
      // the IQ plane: z = I + jQ during the pulse, and the phasor at its centre
      const pc = [xs.pl, yc], pr = 0.62; bd.frame(pc, 1.36, 1.36); bd.wire([pc[0] - pr, yc], [pc[0] + pr, yc], { dim: true }); bd.wire([pc[0], yc - pr], [pc[0], yc + pr], { dim: true });
      bd.wire(aI.r, [pc[0] - 0.95, yI], [pc[0] - 0.95, yc + 0.25], [pc[0] - 0.7, yc + 0.25], {}); bd.wire(aQ.r, [pc[0] - 0.95, yQ], [pc[0] - 0.95, yc - 0.25], [pc[0] - 0.7, yc - 0.25], {});
      bd.text('I', [pc[0] + pr + 0.08, yc]).text('Q', [pc[0], yc + pr + 0.1]).text('z = I + jQ', [pc[0], yc - 0.82]);
      const zs = sl(R.I).map((v, i) => [pc[0] + pr * 0.85 * v / R.m, yc + pr * 0.85 * sl(R.Q)[i] / R.m]); bd.path(zs, '--c-v');
      const zc = [pc[0] + pr * 0.85 * R.I[R.mid] / R.m, yc + pr * 0.85 * R.Q[R.mid] / R.m]; bd.path([pc, zc], '--c-north'); bd.token(zc, 0.045);
      // signal tiles: before and after every block
      const t = (c, y, o) => bd.wave(c, y, { w: 0.74, h: 0.34, ...o });
      t([-3.75, yc + 0.62], sl(T.rf), { color: '--c-E', cap: 'RF echo', w: 0.62 });
      t([-2.15, yI + 0.5], sl(T.rf), { color: '--c-E', w: 0.6, cap: 'RF' }); t([-2.15, yQ - 0.5], sl(T.rf), { color: '--c-E', w: 0.6, cap: 'RF' });
      t([-0.95, yc + 0.34], part(sl(T.loI)), { color: '--c-ref', w: 0.5, h: 0.26 }); t([-0.95, yc - 0.44], part(sl(T.loQ)), { color: '--c-ref', w: 0.5, h: 0.26 });
      t([-0.72, yI + 0.5], sl(T.mI), { color: '--c-I', norm: nm, cap: '0 Hz + 2f' }); t([-0.72, yQ - 0.5], sl(T.mQ), { color: '--c-I', norm: nm, cap: '0 Hz + 2f' });
      t([0.85, yI + 0.5], sl(R.I), { color: '--c-B', norm: nb, cap: 'I(t)' }); t([0.85, yQ - 0.5], sl(R.Q), { color: '--c-B', norm: nb, cap: 'Q(t)' });
      t([2.35, yI + 0.5], [{ y: sl(R.I).filter((_, i) => i % 12 === 0), color: '--c-B', stems: true }], { norm: nb, cap: 'samples I[n]' }); t([2.35, yQ - 0.5], [{ y: sl(R.Q).filter((_, i) => i % 12 === 0), color: '--c-B', stems: true }], { norm: nb, cap: 'samples Q[n]' });
      bd.end();
    }

    return {
      changed() {
        const iqc = state.case === 'iqdemod';
        tc.show(!iqc); sc.show(!iqc); for (const k of q2) k.show(iqc);
        if (!iqc) { S = chain(state.arch, params()); SP = S.map(mini); }
        ctx.setClock(!iqc && state.auto ? 8 : 0);
      },
      update() {
        if (state.case === 'iqdemod') {
          const p = { fs: 1e9, n: 4096, fc: state.fc * MHz, fLO: (state.fc + state.det) * MHz, phi: state.phi * Math.PI / 180, tau: 0.5 * us, t0: 1 * us, bw: state.bw * MHz };
          const r = iq(p), T = iq({ ...p, fc: FC_TILE, fLO: FC_TILE + state.det * MHz }), mid = Math.round((p.t0 + p.tau / 2) * p.fs), mag = r.I.map((v, i) => Math.hypot(v, r.Q[i]));
          iqSchema(T, { I: r.I, Q: r.Q, mid, m: Math.max(1, ...mag) });
          const [a, b] = q2, t = Array.from({ length: p.n }, (_, i) => i / p.fs / us), win = (arr) => Array.from(arr).slice(I0, I1), tw = win(t);
          const spec = (x) => spectrumDb({ re: Float64Array.from(x), im: new Float64Array(p.n) }, p.fs, 1), fm = spectrumDb({ re: r.rf, im: new Float64Array(p.n) }, p.fs).f.map((f) => f / MHz), ref = spectrumDb({ re: r.mI, im: new Float64Array(p.n) }, p.fs).peak;
          const db = (x) => { const s = spectrumDb({ re: Float64Array.from(x), im: new Float64Array(p.n) }, p.fs, ref); return s.dB; };
          a.range([0, 2.4 * state.fc], [-60, 6]); a.titles('frequency (MHz)', 'spectrum (dB): RF, mixer out, after LPF');
          a.line('rf', fm, db(r.rf), { color: '--c-E', width: 1.4 }); a.line('m', fm, db(r.mI), { color: '--c-I', width: 1.4 }); a.line('i', fm, db(r.I), { color: '--c-B', width: 2 }); a.stems('lo', [state.fc + state.det], [0], { color: '--c-north', width: 1.6 });
          b.range([tw[0], tw[tw.length - 1]], [-1.3, 1.3]); b.titles('time (µs)', 'voltage: I, Q, |z| after the low-pass'); b.line('I', tw, win(r.I), { color: '--c-B' }); b.line('Q', tw, win(r.Q), { color: '--c-I' }); b.line('m', tw, win(mag), { color: '--c-v', width: 1.4 });
          const rt = riseTime(mag.slice(0, mid), p.fs);
          hud.set('a', `at the pulse centre: |z| = ${fmt(mag[mid])}, ∠z = ${fmt(Math.atan2(r.Q[mid], r.I[mid]) * 180 / Math.PI)}° (true ${state.phi}°)`);
          hud.set('b', state.det ? `LO off by ${state.det} MHz: z turns at ${state.det} MHz (the green arc in the IQ plane)` : 'LO on frequency: I and Q are flat during the pulse, z is one point ✓', state.det ? '' : 'good');
          hud.set('c', `rise time ${fmt(rt * 1e9)} ns with a ${state.bw} MHz filter${rt > p.tau / 2 ? ' — longer than half the pulse: no flat top ✗' : ''}`, rt > p.tau / 2 ? 'bad' : '');
          const bws = Array.from({ length: 40 }, (_, i) => 1 + i); plots.aux.draw({ xlim: [1, 40], cursor: state.bw, series: [{ x: bws, y: bws.map((w) => 0.48 / w * 1e3), color: '--c-v', label: 'rise time (ns) ≈ 0.48 / bandwidth (MHz)' }] });
          return;
        }
        const seg = 8 / S.length, k = state.auto ? Math.min(S.length - 1, Math.floor(time.t / seg)) : Math.min(state.stage, S.length - 1), f = state.auto ? (time.t % seg) / seg : 1;
        chainDiagram(S, k, f); const st = S[k], cplx = st.x.im.some((v) => Math.abs(v) > 1e-9);
        const n = st.x.re.length, t = Array.from({ length: n }, (_, i) => i / st.fs / us);
        const amp = Math.max(1e-9, ...Array.from(st.x.re, Math.abs), ...Array.from(st.x.im, Math.abs));
        tc.range([0, t[n - 1]], [-amp * 1.15, amp * 1.15]); tc.titles('time (µs)', cplx ? 'voltage (norm.): I blue, Q orange' : 'voltage (norm.): the real signal at this stage');
        const upto = Math.max(2, Math.round(n * Math.min(1, f * 1.6))), cut = (a) => Array.from(a).slice(0, upto), tt = t.slice(0, upto); // the pulse arrives: the trace is drawn as it comes in
        tc.line('re', tt, cut(st.x.re), { color: '--c-B', width: cplx ? 2 : 1 }); if (cplx) tc.line('im', tt, cut(st.x.im), { color: '--c-I', width: 2 }); else tc.hide('im');
        const sp = spectrumDb(st.x, st.fs), fm = sp.f.map((f) => f / MHz), span = st.fs / 2 / MHz;
        sc.range([cplx ? -span : 0, span], [-80, 2]); sc.line('s', fm, sp.dB, { color: '--c-E' });
        hud.set('a', `${k + 1}. ${st.name} — sampled at ${fmt(st.fs / MHz)} MS/s`); hud.set('b', NOTE[st.name] || ''); hud.set('c', state.arch === 'homodyne' ? 'no IF: cheap and small, but DC offsets and IQ imbalance land right on the signal' : `IF = |${fmt(BASE.fRF / MHz)} − ${state.fLO}| = ${fmt(Math.abs(BASE.fRF / MHz - state.fLO))} MHz; image at ${fmt(2 * state.fLO - BASE.fRF / MHz)} MHz`);
        plots.aux.draw({ xlim: [0, S.length - 1], cursor: k, series: [{ x: S.map((_, i) => i), y: S.map((s) => 20 * Math.log10(Math.max(1e-6, ...Array.from(s.x.re, Math.abs)))), color: '--c-B', label: 'peak level (dB) stage by stage' }] });
      },
      theme() { for (const k of [tc, sc, ...q2]) k.theme(); bd.theme(); },
    };
  },
};
