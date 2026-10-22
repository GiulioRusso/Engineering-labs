// Radar receivers: follow one pulse through a superheterodyne, a digital-IF and a direct-conversion
// (homodyne) chain — block diagram on top, the signal and its spectrum at the selected stage below —
// and the IQ demodulator itself (LO offset, filter bandwidth, rise time).
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
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
  id: 'receiver', title: 'Receivers', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { arch: 'superhet', stage: 0, fLO: 330, bwRF: 60, bwIF: 20, aImg: 0.5, aInt: 1, bits: 12, fsIF: 100, dLO: 0, dc: 0, fc: 100, det: 0, bw: 16, phi: 40 },
  cases: [
    { id: 'superhet', label: 'Superheterodyne', set: { arch: 'superhet' }, examples: [
      { id: 'mixer', label: 'At the mixer: sum and difference', controls: ['stage', 'fLO'], set: { stage: 3 } },
      { id: 'image', label: 'The image problem', controls: ['stage', 'aImg', 'bwRF'], set: { stage: 4, aImg: 1, bwRF: 200 } },
      { id: 'iq', label: 'The IQ output', controls: ['stage'], set: { stage: 5 } },
      { id: 'adc', label: 'A 4-bit ADC', controls: ['stage', 'bits'], set: { stage: 6, bits: 4 } },
    ] },
    { id: 'digitalif', label: 'Digital IF', set: { arch: 'digitalif' }, examples: [
      { id: 'adc', label: 'ADC at IF: bandpass sampling', controls: ['stage', 'fsIF'], set: { stage: 5 } },
      { id: 'ddc', label: 'Digital down-conversion', controls: ['stage'], set: { stage: 6 } },
      { id: 'dec', label: 'Filter and decimate', controls: ['stage'], set: { stage: 7 } },
    ] },
    { id: 'homodyne', label: 'Homodyne', set: { arch: 'homodyne' }, examples: [
      { id: 'mix', label: 'Straight to baseband', controls: ['stage'], set: { stage: 2 } },
      { id: 'lo', label: 'LO 200 kHz off: the pulse rotates', controls: ['stage', 'dLO'], set: { stage: 3, dLO: 200 } },
      { id: 'dc', label: 'LO leakage: a DC offset', controls: ['stage', 'dc'], set: { stage: 3, dc: 2 } },
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
      { id: 'stage', label: 'Stage', unit: '', min: 0, max: 7, step: 1, hint: 'Pick a block in the diagram' },
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
    const { scene, state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tc = createChart(ctx, { box: [-4.3, -2.4, 4.2, 3.2], xTitle: 'time (µs)' }), sc = createChart(ctx, { box: [0.4, -2.4, 4.1, 3.2], xTitle: 'frequency (MHz)', yTitle: 'spectrum (dB)' });
    const q4 = [[-4.3, 0.5, 4.1, 2.0], [0.5, 0.5, 4.0, 2.0], [-4.3, -2.35, 4.1, 2.0], [0.5, -2.35, 4.0, 2.0]].map((b) => createChart(ctx, { box: b }));
    const boxes = createCurve(stage, { max: 200, width: 1.6, color: '--ink-dim' }), sel = createCurve(stage, { max: 8, width: 3, color: '--accent' }), arrows = createCurve(stage, { max: 80, width: 1.4, color: '--ink-dim' });
    const names = []; for (let i = 0; i < 8; i++) { const l = ctx.label('', 'tick'); scene.add(l); names.push(l); }
    let S = null;

    function diagram(list) {
      const n = list.length, W = 8.6 / n, y0 = 1.35, h = 0.75, b = [], a = [];
      names.forEach((l, i) => { l.visible = i < n; if (i < n) { l.element.textContent = SHORT[list[i].name] || list[i].name; l.position.set(-4.3 + W * (i + 0.5), y0 + h / 2, 0); } });
      for (let i = 0; i < n; i++) { const x0 = -4.3 + W * i + 0.08, x1 = x0 + W - 0.16; b.push(x0, y0, 0, x1, y0, 0, x1, y0, 0, x1, y0 + h, 0, x1, y0 + h, 0, x0, y0 + h, 0, x0, y0 + h, 0, x0, y0, 0); if (i) a.push(x0 - 0.16, y0 + h / 2, 0, x0, y0 + h / 2, 0, x0 - 0.05, y0 + h / 2 + 0.05, 0, x0, y0 + h / 2, 0, x0 - 0.05, y0 + h / 2 - 0.05, 0, x0, y0 + h / 2, 0); }
      boxes.segments(b); arrows.segments(a);
      const k = Math.min(state.stage, n - 1), x0 = -4.3 + W * k + 0.05, x1 = x0 + W - 0.1;
      sel.set([x0, y0 - 0.04, 0.01, x1, y0 - 0.04, 0.01, x1, y0 + h + 0.04, 0.01, x0, y0 + h + 0.04, 0.01], true);
    }
    const params = () => ({ ...BASE, fLO: state.fLO * MHz, bwRF: state.bwRF * MHz, bwIF: state.bwIF * MHz, aImg: state.aImg, aInt: state.aInt, bits: state.bits, fsIF: state.fsIF * MHz, dLO: state.dLO * 1e3, dc: state.dc });

    return {
      changed() {
        const iqc = state.case === 'iqdemod';
        tc.show(!iqc); sc.show(!iqc); for (const k of q4) k.show(iqc); boxes.object.visible = sel.object.visible = arrows.object.visible = !iqc; names.forEach((l) => { l.visible = !iqc && l.element.textContent; });
        if (!iqc) S = chain(state.arch, params());
      },
      update() {
        if (state.case === 'iqdemod') {
          const p = { fs: 1e9, n: 4096, fc: state.fc * MHz, fLO: (state.fc + state.det) * MHz, phi: state.phi * Math.PI / 180, tau: 0.5 * us, t0: 1 * us, bw: state.bw * MHz };
          const r = iq(p), t = Array.from({ length: p.n }, (_, i) => i / p.fs / us), mag = r.I.map((v, i) => Math.hypot(v, r.Q[i]));
          const [a, b, c, d] = q4, win = (arr) => arr.slice(800, 2000), tw = win(t);
          a.range([tw[0], tw[tw.length - 1]], [-1.3, 1.3]); a.titles('time (µs)', `RF voltage (norm.): at the antenna, carrier ${state.fc} MHz`); a.line('rf', tw, win(Array.from(r.rf)), { color: '--c-ref', width: 1.2 });
          const sp = spectrumDb({ re: r.rf, im: new Float64Array(p.n) }, p.fs), fm = sp.f.map((f) => f / MHz);
          b.range([0, 2.5 * state.fc], [-60, 2]); b.titles('frequency (MHz)', 'power (dB): the LO (red) sets what lands at 0 Hz'); b.line('s', fm, sp.dB, { color: '--c-E' }); b.stems('lo', [state.fc + state.det], [0], { color: '--c-north', width: 1.6 });
          c.range([tw[0], tw[tw.length - 1]], [-1.3, 1.3]); c.titles('time (µs)', 'I (blue) and Q (orange) after the low-pass'); c.line('I', tw, win(Array.from(r.I)), { color: '--c-B' }); c.line('Q', tw, win(Array.from(r.Q)), { color: '--c-I' });
          d.range([tw[0], tw[tw.length - 1]], [0, 1.3]); d.titles('time (µs)', '|I + jQ|² (norm.): the pulse envelope'); d.line('m', tw, win(mag.map((v) => v * v)), { color: '--c-v' });
          const mid = Math.round((p.t0 + p.tau / 2) * p.fs), rt = riseTime(mag.slice(0, mid), p.fs);
          hud.set('a', `at the pulse centre: |z| = ${fmt(mag[mid])}, ∠z = ${fmt(Math.atan2(r.Q[mid], r.I[mid]) * 180 / Math.PI)}° (true ${state.phi}°)`);
          hud.set('b', state.det ? `LO off by ${state.det} MHz: I and Q rotate at ${state.det} MHz` : 'LO on frequency: I and Q are flat during the pulse ✓', state.det ? '' : 'good');
          hud.set('c', `rise time ${fmt(rt * 1e9)} ns with a ${state.bw} MHz filter${rt > p.tau / 2 ? ' — longer than half the pulse: no flat top ✗' : ''}`, rt > p.tau / 2 ? 'bad' : '');
          const bws = Array.from({ length: 40 }, (_, i) => 1 + i); plots.aux.draw({ xlim: [1, 40], cursor: state.bw, series: [{ x: bws, y: bws.map((w) => 0.48 / w * 1e3), color: '--c-v', label: 'rise time (ns) ≈ 0.48 / bandwidth (MHz)' }] });
          return;
        }
        diagram(S); const k = Math.min(state.stage, S.length - 1), st = S[k], cplx = st.x.im.some((v) => Math.abs(v) > 1e-9);
        const n = st.x.re.length, t = Array.from({ length: n }, (_, i) => i / st.fs / us);
        const amp = Math.max(1e-9, ...Array.from(st.x.re, Math.abs), ...Array.from(st.x.im, Math.abs));
        tc.range([0, t[n - 1]], [-amp * 1.15, amp * 1.15]); tc.titles('time (µs)', cplx ? 'I (blue) and Q (orange)' : 'real signal');
        tc.line('re', t, Array.from(st.x.re), { color: '--c-B', width: cplx ? 2 : 1 }); if (cplx) tc.line('im', t, Array.from(st.x.im), { color: '--c-I', width: 2 }); else tc.hide('im');
        const sp = spectrumDb(st.x, st.fs), fm = sp.f.map((f) => f / MHz), span = st.fs / 2 / MHz;
        sc.range([cplx ? -span : 0, span], [-80, 2]); sc.line('s', fm, sp.dB, { color: '--c-E' });
        hud.set('a', `${k + 1}. ${st.name} — sampled at ${fmt(st.fs / MHz)} MS/s`); hud.set('b', NOTE[st.name] || ''); hud.set('c', state.arch === 'homodyne' ? 'no IF: cheap and small, but DC offsets and IQ imbalance land right on the signal' : `IF = |${fmt(BASE.fRF / MHz)} − ${state.fLO}| = ${fmt(Math.abs(BASE.fRF / MHz - state.fLO))} MHz; image at ${fmt(2 * state.fLO - BASE.fRF / MHz)} MHz`);
        plots.aux.draw({ xlim: [0, S.length - 1], cursor: k, series: [{ x: S.map((_, i) => i), y: S.map((s) => 20 * Math.log10(Math.max(1e-6, ...Array.from(s.x.re, Math.abs)))), color: '--c-B', label: 'peak level (dB) stage by stage' }] });
      },
      theme() { for (const k of [tc, sc, ...q4]) k.theme(); for (const k of [boxes, sel, arrows]) k.theme(); },
    };
  },
};
