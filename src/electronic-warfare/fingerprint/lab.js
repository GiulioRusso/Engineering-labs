// Emitter fingerprinting: one radar pulse through the transmitter, the channel and the receiver, drawn as
// the chain of physical blocks with the signal on every wire. Below, the pulse at the chosen stage in every
// representation (I/Q, amplitude, phase, instantaneous frequency, IQ plane, spectrum), for unit A, unit B
// (another unit of the same model, the same unit through another receiver, or at reference conditions), the
// ideal pulse as a ghost, residuals, edge zoom and the rise / plateau / fall segments as shaded bands.
import { createChart } from '../../lib/viz/chart.js';
import { createBlocks } from '../../lib/viz/blocks.js';
import { thin } from '../../lib/ui/schema.js';
import { DEFAULTS, T0, FS, STAGES, COEF, run, integrate, measure, spectrum, instFreq, separability, salehA, salehP, butter, filterC, txH, irr, RX2, waveformPhase, conditions, unit } from './model.js';

const us = 1e-6, ns = 1e-9, MHz = 1e6, deg = 180 / Math.PI, RSAT = 1 / Math.sqrt(1.1517);
const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const NAME = { wave: 'Waveform', mod: 'Modulator', osc: 'Oscillator + IQ mod', pa: 'Power amplifier', txf: 'Tx filter', chan: 'Channel', lo: 'Rx LO', rxf: 'Rx filter', iq: 'IQ + DC', adc: 'ADC' };
const FP = 'Fingerprint (the emitter): ', NU = 'Nuisance (not the emitter): ', ILL = ' Illustrative coefficients, not a real device.';
// the panels each case shows (the workbench shows all six)
const PANELS = { intro: ['amp', 'phase', 'iq', 'spec'], modulator: ['amp', 'phase', 'iq', 'plane'], oscillator: ['phase', 'freq', 'plane', 'amp'], amplifier: ['amp', 'phase', 'plane', 'spec'], txfilter: ['amp', 'phase', 'spec', 'freq'],
  lo: ['phase', 'iq', 'plane', 'amp'], rxbw: ['amp', 'phase', 'spec', 'iq'], iqimb: ['plane', 'amp', 'spec', 'iq'], adc: ['amp', 'iq', 'spec', 'phase'], channel: ['amp', 'phase', 'spec', 'plane'], drift: ['phase', 'amp', 'freq', 'spec'],
  workbench: ['iq', 'amp', 'phase', 'freq', 'plane', 'spec'] };
// the knobs each focused case shows in Free
const REL = { intro: ['wf', 'pw', 'bw', 'seedA', 'seedB', 'spread', 'snr'], modulator: ['edge', 'rise', 'fall', 'zeta', 'taud', 'ripple', 'fr', 'pw', 'seedA', 'spread'], oscillator: ['wf', 'bw', 'pw', 'cfo', 'lw', 'nl'],
  amplifier: ['drive', 'ampm', 'rise', 'fall', 'ripple', 'fr'], txfilter: ['wf', 'bw', 'txbw', 'txord', 'txrip', 'txg', 'txp'], lo: ['lo', 'lolw'], rxbw: ['rxbw', 'rxord', 'rise', 'seedB', 'spread'], iqimb: ['rxg', 'rxp', 'dc', 'lo'],
  adc: ['fsadc', 'bits', 'jit', 'sph', 'fsc', 'rxbw', 'rise'], channel: ['snr', 'vel', 'fc', 'mpa', 'mpd', 'mpp'], drift: ['temp', 'warm', 'age', 'vsup', 'fc'] };
const VIEW = ['stage', 'ph', 'two', 'cmp', 'resid', 'zoom', 'ghost', 'npulse'];
const NOTE = {
  intro: 'every unit of a model sends the same intended pulse; the hardware adds an unintended modulation of its own',
  modulator: 'the switch, the storage capacitor and the supply shape |z|: edges, droop and ripple are amplitude fingerprints',
  oscillator: 'an offset only tilts the phase (|z| is untouched); phase noise makes it wander; a non-linear chirp bends the frequency ramp',
  amplifier: 'compression flattens the top; AM/PM turns every change of amplitude, the edges above all, into a phase kick',
  txfilter: 'the output filter rounds the edges and rings; an echo inside it makes the amplitude ripple along a chirp',
  lo: 'the receiver adds its own offset: the phase ramps, |z| does not change; detrending removes it, whoever caused it',
  channel: 'noise, Doppler and a second path change what arrives, not the emitter: they are nuisances to see through',
};

const sl = (lo, hi, step) => ({ unit: '', min: lo, max: hi, step });
const LAB = {
  id: 'fingerprint', title: 'Emitter fingerprinting', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { wf: 'pulse', pw: 1, bw: 20, fc: 9.4, seedA: 1, seedB: 2, spread: 1, edge: 'rc', rise: 20, fall: 30, zeta: 0.5, taud: 30, ripple: 0, fr: 3, cfo: 0, lw: 0, nl: 0, drive: -6, ampm: 1, txbw: 60, txord: 3, txrip: 0, txg: 0, txp: 0,
    temp: 25, warm: 60, age: 0, vsup: 100, snr: 40, vel: 0, mpa: 0, mpd: 50, mpp: 0, lo: 0, lolw: 0, rxbw: 100, rxord: 4, rxg: 0, rxp: 0, dc: 0, fsadc: 500, bits: 12, jit: 0, sph: 0, fsc: 1.5,
    stage: 'adc', ph: 'detrend', two: false, cmp: 'units', resid: 'off', zoom: 'all', ghost: true, npulse: 1 },
  cases: [
    { id: 'intro', label: 'Fingerprint', set: { stage: 'adc' }, examples: [
      { id: 'ideal', label: 'Ideal pulse', controls: ['wf', 'stage'], set: { stage: 'wave', two: false } },
      { id: 'units', label: 'Two units, same model', controls: ['seedB', 'spread', 'zoom'], set: { two: true, zoom: 'all' } },
      { id: 'pdw', label: 'Same PDW, different shape', controls: ['resid', 'zoom'], set: { two: true, resid: 'ab', zoom: 'rise' } },
    ] },
    { id: 'modulator', label: 'Modulator', set: { stage: 'mod' }, examples: [
      { id: 'slow', label: 'Slow switch: long rise', controls: ['rise', 'zoom'], set: { rise: 80, zoom: 'rise' } },
      { id: 'ring', label: 'Overshoot and ringing', controls: ['zeta', 'rise'], set: { edge: '2nd', zeta: 0.25, rise: 15, zoom: 'rise' } },
      { id: 'droop', label: 'Droop over a long pulse', controls: ['pw', 'taud'], set: { pw: 3, taud: 10 } },
      { id: 'ripple', label: 'Supply ripple on the top', controls: ['ripple', 'fr'], set: { ripple: 3, fr: 4 } },
    ] },
    { id: 'oscillator', label: 'Oscillator', set: { stage: 'osc' }, examples: [
      { id: 'offset', label: 'Offset: phase ramp, flat amplitude', controls: ['cfo', 'ph'], set: { cfo: 20, ph: 'unwrap' } },
      { id: 'pn', label: 'Phase noise wanders', controls: ['lw'], set: { lw: 50, ph: 'detrend' } },
      { id: 'nl', label: 'Chirp non-linearity', controls: ['nl', 'bw'], set: { wf: 'lfm', nl: 2, bw: 20 } },
    ] },
    { id: 'amplifier', label: 'Amplifier', set: { stage: 'pa' }, examples: [
      { id: 'backoff', label: 'Back-off: linear', controls: ['drive'], set: { drive: -15, ripple: 3 } },
      { id: 'compress', label: 'Driven into compression', controls: ['drive'], set: { drive: 0, ripple: 3 } },
      { id: 'ampm', label: 'AM/PM: phase kicks on the edges', controls: ['drive', 'ampm', 'zoom'], set: { drive: -3, ampm: 2, rise: 60, fall: 60, zoom: 'rise', ph: 'detrend' } },
    ] },
    { id: 'txfilter', label: 'Tx filter', set: { stage: 'txf' }, examples: [
      { id: 'narrow', label: 'Narrow filter: ringing', controls: ['txbw', 'txord', 'zoom'], set: { txbw: 12, txord: 5, rise: 3, fall: 3, zoom: 'rise' } },
      { id: 'chirp', label: 'Ripple along a chirp', controls: ['txrip', 'bw'], set: { wf: 'lfm', bw: 40, txbw: 60, txrip: 1.5 } },
    ] },
    { id: 'lo', label: 'Rx LO', set: { stage: 'lo' }, examples: [
      { id: 'rotate', label: 'LO offset rotates I/Q', controls: ['lo', 'ph'], set: { lo: 300, ph: 'unwrap' } },
      { id: 'detrend', label: 'Detrend removes it', controls: ['lo', 'ph'], set: { lo: 300, ph: 'detrend' } },
    ] },
    { id: 'rxbw', label: 'Rx bandwidth', set: { stage: 'adc', two: true, zoom: 'rise', resid: 'ab' }, examples: [
      { id: 'slow', label: 'Rx slower than the Tx edge', controls: ['rxbw', 'rxord'], set: { rxbw: 5, rise: 10 } },
      { id: 'wide', label: 'Wide Rx: the edge is back', controls: ['rxbw', 'rxord'], set: { rxbw: 200, rise: 10 } },
    ] },
    { id: 'iqimb', label: 'IQ imbalance', set: { stage: 'iq' }, examples: [
      { id: 'gain', label: 'Gain mismatch', controls: ['rxg'], set: { rxg: 1.5, lo: 400 } },
      { id: 'phase', label: 'Phase mismatch', controls: ['rxp'], set: { rxp: 8, lo: 400 } },
      { id: 'ripple', label: 'With offset: ripple on |z|', controls: ['lo', 'rxg', 'rxp'], set: { lo: 2000, rxg: 1.5, rxp: 8 } },
    ] },
    { id: 'adc', label: 'ADC', set: { stage: 'adc' }, examples: [
      { id: 'bits4', label: '4 bits', controls: ['bits', 'fsc'], set: { bits: 4 } },
      { id: 'jitter', label: 'Jitter on fast edges', controls: ['jit'], set: { jit: 100, rise: 3, rxbw: 250, fsadc: 1000, zoom: 'rise' } },
      { id: 'phase', label: 'Sampling phase moves the edge samples', controls: ['sph', 'fsadc'], set: { fsadc: 100, sph: 0.5, zoom: 'rise' } },
    ] },
    { id: 'channel', label: 'Channel', set: { stage: 'adc' }, examples: [
      { id: 'snr', label: 'Low SNR buries the units', controls: ['snr', 'npulse'], set: { snr: 8, two: true } },
      { id: 'doppler', label: 'Doppler shifts the CFO', controls: ['vel', 'ph'], set: { vel: 600, ph: 'unwrap' } },
      { id: 'multipath', label: 'Multipath eats the back edge', controls: ['mpa', 'mpd', 'mpp', 'zoom'], set: { mpa: 0.5, mpd: 100, mpp: 120, zoom: 'fall' } },
    ] },
    { id: 'drift', label: 'Conditions', set: { stage: 'adc', two: true, ph: 'unwrap' }, examples: [
      { id: 'cold', label: 'Cold start → warm', controls: ['warm'], set: { warm: 0 } },
      { id: 'hot', label: 'Hot day', controls: ['temp'], set: { temp: 45 } },
      { id: 'sag', label: 'Supply sag', controls: ['vsup'], set: { vsup: 88, ph: 'detrend' } },
    ] },
    { id: 'workbench', label: 'Workbench', set: { stage: 'adc' }, examples: [
      { id: 'separate', label: 'Separate two units', controls: ['seedB', 'spread', 'snr', 'resid'], set: { two: true, cmp: 'units', snr: 40, resid: 'ab' } },
      { id: 'receivers', label: 'Same unit, two receivers', controls: ['rxbw', 'stage'], set: { two: true, cmp: 'receivers' } },
      { id: 'integrate', label: 'Integrate N pulses', controls: ['npulse', 'snr'], set: { two: true, cmp: 'units', snr: 25, npulse: 64 } },
    ] },
  ],
  controls: [
    { title: 'Waveform (intended, not a fingerprint)', fold: 'open', items: [
      { id: 'wf', label: 'Waveform', type: 'segmented', options: [['pulse', 'Pulse'], ['lfm', 'LFM chirp'], ['barker', 'Barker-13']], hint: 'The intended modulation: the same for every unit of the model' },
      { id: 'pw', label: 'Pulse width', ...sl(0.2, 3, 0.05), unit: 'µs' }, { id: 'bw', label: 'Chirp bandwidth', ...sl(1, 60, 1), unit: 'MHz', show: (s) => s.wf === 'lfm' },
      { id: 'fc', label: 'Carrier', ...sl(1, 18, 0.1), unit: 'GHz', hint: 'Sets what a ppm offset and a Doppler speed mean in Hz' },
    ] },
    { title: 'Transmitter', fold: 'open', items: [
      { id: 'seedA', label: 'Unit A (serial no.)', ...sl(1, 99, 1), hint: `${FP}which unit of the model: each draws its parts within the tolerance` },
      { id: 'seedB', label: 'Unit B (serial no.)', ...sl(1, 99, 1), hint: `${FP}a second unit of the same model` },
      { id: 'spread', label: 'Tolerance spread', ...sl(0, 3, 0.05), hint: `${FP}how much units differ; 0 makes every unit identical.${ILL}` },
      { id: 'edge', label: 'Modulator edge', type: 'segmented', options: [['rc', 'RC (1st order)'], ['2nd', '2nd order']], hint: `${FP}the pulse switch and its driver` },
      { id: 'rise', label: 'Rise time 10–90 %', ...sl(1, 150, 1), unit: 'ns', hint: `${FP}how fast the modulator switches on` }, { id: 'fall', label: 'Fall time 10–90 %', ...sl(1, 150, 1), unit: 'ns', hint: `${FP}how fast it switches off` },
      { id: 'zeta', label: 'Edge damping ζ', ...sl(0.1, 1.5, 0.01), show: (s) => s.edge === '2nd', hint: `${FP}below 1: overshoot and ringing on the edges` },
      { id: 'taud', label: 'Droop time constant', unit: 'µs', min: 3, max: 1000, log: true, hint: `${FP}the storage capacitor discharging during the pulse` },
      { id: 'ripple', label: 'Supply ripple', ...sl(0, 10, 0.1), unit: '%', hint: `${FP}AM (and a little PM) from the high-voltage supply` }, { id: 'fr', label: 'Ripple frequency', ...sl(0.5, 20, 0.1), unit: 'MHz', show: (s) => s.ripple > 0 },
      { id: 'cfo', label: 'Oscillator offset', ...sl(-30, 30, 0.1), unit: 'ppm', hint: `${FP}the reference oscillator: a carrier offset (on its own not an identity: see Doppler)` },
      { id: 'lw', label: 'Phase-noise linewidth', ...sl(0, 300, 1), unit: 'kHz', hint: `${FP}the synthesizer's phase wanders as a random walk` },
      { id: 'nl', label: 'Chirp non-linearity', ...sl(0, 5, 0.05), unit: '%', show: (s) => s.wf === 'lfm', hint: `${FP}a bent frequency ramp` },
      { id: 'drive', label: 'PA drive (re saturation)', ...sl(-20, 6, 0.5), unit: 'dB', hint: `${FP}near 0 dB the amplifier compresses` }, { id: 'ampm', label: 'AM/PM strength', ...sl(0, 3, 0.05), unit: '×', hint: `${FP}scales the Saleh AM/PM curve` },
      { id: 'txbw', label: 'Tx filter bandwidth (RF)', ...sl(5, 300, 1), unit: 'MHz', hint: `${FP}the output filter / waveguide band` }, { id: 'txord', label: 'Tx filter order', ...sl(1, 8, 1) },
      { id: 'txrip', label: 'Tx passband ripple', ...sl(0, 3, 0.05), unit: 'dB', hint: `${FP}a weak echo inside the filter or waveguide` },
      { id: 'txg', label: 'Tx IQ gain mismatch', ...sl(-2, 2, 0.05), unit: 'dB', hint: `${FP}a digital transmitter's IQ modulator; the same physics as the receiver's` }, { id: 'txp', label: 'Tx IQ phase mismatch', ...sl(-10, 10, 0.1), unit: '°' },
    ] },
    { title: 'Operating conditions (illustrative)', fold: 'open', items: [
      { id: 'temp', label: 'Ambient temperature', ...sl(-20, 60, 1), unit: '°C', hint: `${NU}moves the oscillator (${COEF.oscPpmPerC} ppm/°C), the PA gain and the edges of the same unit.${ILL}` },
      { id: 'warm', label: 'Time since switch-on', ...sl(0, 60, 1), unit: 'min', hint: `${NU}the unit warms by ${COEF.warmRise} °C with a ${COEF.warmTau}-minute time constant.${ILL}` },
      { id: 'age', label: 'Age', ...sl(0, 10, 0.1), unit: 'years', hint: `${NU}oscillator aging, ${COEF.agePpmPerYear} ppm/year.${ILL}` },
      { id: 'vsup', label: 'Supply voltage', ...sl(80, 110, 0.5), unit: '%', hint: `${NU}changes the PA drive and the droop.${ILL}` },
    ] },
    { title: 'Channel', fold: 'open', items: [
      { id: 'snr', label: 'SNR (in the Rx band)', ...sl(-5, 60, 0.5), unit: 'dB', hint: `${NU}noise per sample, on the plateau` },
      { id: 'vel', label: 'Radial speed', ...sl(-900, 900, 10), unit: 'm/s', hint: `${NU}one-way Doppler v·fc/c adds to the offset` },
      { id: 'mpa', label: 'Second path amplitude', ...sl(0, 0.9, 0.01), hint: `${NU}a reflection arriving later` }, { id: 'mpd', label: 'Second path delay', ...sl(1, 400, 1), unit: 'ns', show: (s) => s.mpa > 0 },
      { id: 'mpp', label: 'Second path phase', ...sl(-180, 180, 1), unit: '°', show: (s) => s.mpa > 0 },
    ] },
    { title: 'Receiver', fold: 'open', items: [
      { id: 'lo', label: 'LO offset', ...sl(-5000, 5000, 10), unit: 'kHz', hint: `${NU}the receiver's own oscillator` }, { id: 'lolw', label: 'LO phase-noise linewidth', ...sl(0, 300, 1), unit: 'kHz', hint: NU },
      { id: 'rxbw', label: 'Rx low-pass bandwidth', ...sl(1, 400, 1), unit: 'MHz', hint: `${NU}a slower receiver hides faster transmitter edges` }, { id: 'rxord', label: 'Rx filter order', ...sl(1, 8, 1), hint: NU },
      { id: 'rxg', label: 'IQ gain mismatch', ...sl(-3, 3, 0.05), unit: 'dB', hint: NU }, { id: 'rxp', label: 'IQ phase mismatch', ...sl(-15, 15, 0.1), unit: '°', hint: NU },
      { id: 'dc', label: 'DC offset', ...sl(0, 30, 0.5), unit: '%', hint: `${NU}added to I and Q` },
      { id: 'fsadc', label: 'ADC sample rate', ...sl(50, 1000, 10), unit: 'MS/s', hint: NU }, { id: 'bits', label: 'ADC bits', ...sl(2, 16, 1), hint: NU },
      { id: 'jit', label: 'Clock jitter (rms)', ...sl(0, 500, 1), unit: 'ps', hint: `${NU}noise grows with how fast the signal moves` },
      { id: 'sph', label: 'Sampling phase', ...sl(0, 1, 0.01), unit: 'sample', hint: `${NU}where the samples fall on the edge` },
      { id: 'fsc', label: 'ADC full scale', ...sl(0.5, 4, 0.05), unit: '× pulse', hint: `${NU}below 1 the ADC clips` },
    ] },
    { title: 'Show', items: [
      { id: 'stage', label: 'Signal at', type: 'select', options: STAGES.map((k, i) => [k, `${i + 1}. ${NAME[k]}`]), hint: 'Every plot shows the pulse at this point of the chain' },
      { id: 'ph', label: 'Phase', type: 'segmented', options: [['wrap', 'Wrapped'], ['unwrap', 'Unwrapped'], ['detrend', 'Detrended']], hint: 'Detrended: the intended waveform and the best straight line removed' },
      { id: 'two', label: 'Show unit B', type: 'check', color: '--c-I' },
      { id: 'cmp', label: 'B is', type: 'segmented', options: [['units', 'Another unit'], ['receivers', 'Another receiver'], ['conditions', 'Reference conditions']], show: (s) => s.two && s.case === 'workbench' },
      { id: 'resid', label: 'Residual', type: 'segmented', options: [['off', 'Off'], ['nominal', 'A − nominal'], ['ab', 'A − B']], hint: 'Nominal: the model with no tolerance spread' },
      { id: 'zoom', label: 'Time axis', type: 'segmented', options: [['all', 'Whole pulse'], ['rise', 'Rising edge'], ['fall', 'Falling edge']] },
      { id: 'ghost', label: 'Ideal pulse (ghost)', type: 'check', color: '--c-ref' },
      { id: 'npulse', label: 'Pulses integrated', ...sl(1, 64, 1), hint: 'Averaging N aligned pulses lowers the noise by √N', show: (s) => ['workbench', 'channel', 'intro'].includes(s.case) },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage: st, cssVar } = ctx;
    st.controls.enableRotate = false;
    const G4 = [[-3.75, -0.85], [0.75, -0.85], [-3.75, -3.55], [0.75, -3.55]].map(([x, y]) => createChart(ctx, { box: [x, y, 3.7, 1.65] }));
    const G6 = [[-3.8, -0.85], [-0.8, -0.85], [2.2, -0.85], [-3.8, -3.55], [-0.8, -3.55], [2.2, -3.55]].map(([x, y]) => createChart(ctx, { box: [x, y, 2.25, 1.65] }));
    const bd = createBlocks(ctx, { labels: 40 });
    let C = { key: '' };

    const toP = (s) => ({ ...DEFAULTS, wf: s.wf, pw: s.pw * us, bw: s.bw * MHz, fc: s.fc * 1e9, edge: s.edge, rise: s.rise * ns, fall: s.fall * ns, zeta: s.zeta, taud: s.taud * us, ripple: s.ripple / 100, fr: s.fr * MHz, cfo: s.cfo, lw: s.lw * 1e3, nl: s.nl / 100,
      drive: s.drive, ampm: s.ampm, txbw: s.txbw * MHz, txord: s.txord, txrip: s.txrip, txg: s.txg, txp: s.txp, spread: s.spread, temp: s.temp, warm: s.warm, age: s.age, vsup: s.vsup / 100, snr: s.snr, vel: s.vel, mpa: s.mpa, mpd: s.mpd * ns, mpp: s.mpp,
      lo: s.lo * 1e3, lolw: s.lolw * 1e3, rxbw: s.rxbw * MHz, rxord: s.rxord, rxg: s.rxg, rxp: s.rxp, dc: s.dc / 100, fsadc: s.fsadc * MHz, bits: s.bits, jit: s.jit * 1e-12, sph: s.sph, fsc: s.fsc });
    // every run the view needs, recomputed only when a physical knob changes
    function compute() {
      const P = toP(state), N = Math.round(state.npulse), mode = state.case === 'drift' ? 'conditions' : state.case === 'workbench' ? state.cmp : 'units';
      const key = JSON.stringify([P, state.seedA, state.seedB, state.two, mode, N]); if (C.key === key) return C;
      const bo = mode === 'receivers' ? { rx: RX2(P) } : {}, PB = mode === 'conditions' ? { ...P, temp: 25, warm: 60, age: 0, vsup: 1 } : P, sB = mode === 'units' ? state.seedB : state.seedA;
      const A = integrate(P, state.seedA, N), An = run(P, state.seedA, { noise: false }), Bn = run(PB, sB, { ...bo, noise: false }), Nom = run(P, state.seedA, { noise: false, ideal: true });
      const B = state.two ? integrate(PB, sB, N, { ...bo, pulse0: 500 }) : null, ad = An.stages[9], ts = ad.t, sep = separability(ad.z, Bn.stages[9].z, ts, P, P.snr);
      C = { key, P, N, mode, A, An, B, Bn, Nom, sep };
      return C;
    }
    const tOf = (s) => s.t || Array.from({ length: s.z.re.length }, (_, i) => i / s.fs);
    const mag = (z) => Array.from(z.re, (v, i) => Math.hypot(v, z.im[i]));
    const hex = (v) => { const c = cssVar(v).trim(), h = c.startsWith('#') ? c.slice(1) : 'cccccc', x = h.length === 3 ? h.replace(/./g, '$&$&') : h; return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255); };

    // ---- the chain of physical blocks, with I and Q on every wire ----
    function schema(c, k) {
      const y = 1.68, W = 0.87, x = (i) => -4.3 + W * (i + 0.5), on = (i) => i === k, A = c.A;
      bd.begin();
      const fx0 = x(0) - 0.36, fx1 = x(5) - 0.08, rx0 = x(5) + 0.08, rx1 = x(9) + 0.4;
      bd.frame([(fx0 + fx1) / 2, 1.78], fx1 - fx0, 1.2, { dashed: true }); bd.frame([(rx0 + rx1) / 2, 1.78], rx1 - rx0, 1.2, { dashed: true });
      bd.text('TRANSMITTER · fingerprint', [fx0 + 0.92, 2.27]).text('RECEIVER · nuisance', [rx1 - 0.72, 2.27]);
      const b0 = bd.block('box', [x(0), y], { t: 'f(t)', w: 0.5, on: on(0), label: 'waveform' }), b1 = bd.block('box', [x(1), y], { t: 'MOD', w: 0.52, on: on(1), label: 'modulator' });
      const b2 = bd.block('mixer', [x(2), y], { on: on(2), label: 'osc · IQ mod', w: 0.34, h: 0.34 }), l2 = bd.block('lo', [x(2), 2.2], { w: 0.26, h: 0.26, on: on(2) });
      const b3 = bd.block('amp', [x(3), y], { on: on(3), label: 'PA' }), b4 = bd.block('filter', [x(4), y], { type: 'bp', on: on(4), label: 'Tx filter' });
      const ta = bd.block('antenna', [x(5) - 0.27, y + 0.1], { w: 0.28, h: 0.36, on: on(5) }), ra = bd.block('antenna', [x(5) + 0.27, y + 0.1], { w: 0.28, h: 0.36, on: on(5) });
      const b6 = bd.block('mixer', [x(6), y], { on: on(6), label: 'Rx LO', w: 0.34, h: 0.34 }), l6 = bd.block('lo', [x(6), 2.2], { w: 0.26, h: 0.26, on: on(6) });
      const b7 = bd.block('filter', [x(7), y], { type: 'lp', on: on(7), label: 'Rx filter' }), b8 = bd.block('box', [x(8), y], { t: 'I/Q', w: 0.48, on: on(8), label: 'IQ + DC' }), b9 = bd.block('adc', [x(9), y], { on: on(9), label: 'ADC', w: 0.56 });
      bd.wire(b0.r, b1.l, { on: on(1) }); bd.wire(b1.r, b2.l, { on: on(2) }); bd.wire(l2.b, b2.t, { on: on(2) }); bd.wire(b2.r, b3.l, { on: on(3) }); bd.wire(b3.r, b4.l, { on: on(4) });
      bd.wire(b4.r, [ta.b[0], y], ta.b, { on: on(5) }); bd.wire([ta.c[0] + 0.1, y + 0.2], [ra.c[0] - 0.1, y + 0.2], { dashed: true, on: on(5) }); bd.text('channel', [x(5), y - 0.33], on(5) ? 'blk on' : 'blk');
      bd.wire(ra.b, [ra.b[0], y], b6.l, { on: on(6) }); bd.wire(l6.b, b6.t, { on: on(6) }); bd.wire(b6.r, b7.l, { on: on(7) }); bd.wire(b7.r, b8.l, { on: on(8) }); bd.wire(b8.r, b9.l, { on: on(9) });
      // tiles: the output of every stage (I blue, Q orange) over the pulse
      const S = A.stages, i0 = (s) => Math.max(0, Math.floor((T0 - 0.08 * us) * s.fs)), i1 = (s) => Math.min(s.z.re.length, Math.ceil((T0 + c.P.pw + 0.2 * us) * s.fs));
      S.forEach((s, i) => { const a = i0(s), b = i1(s), re = thin(s.z.re.slice(a, b), i === 9 ? 40 : 110), im = thin(s.z.im.slice(a, b), i === 9 ? 40 : 110), m = Math.max(1e-9, ...re.map(Math.abs), ...im.map(Math.abs));
        bd.wave([i === 9 ? x(9) + 0.13 : x(i) + W / 2, 2.6], [{ y: re, color: '--c-B', stems: i === 9 }, { y: im, color: '--c-I', stems: i === 9 }], { w: i === 9 ? 0.5 : 0.6, h: 0.3, norm: m, on: on(i) }); });
      bd.end();
    }

    // ---- one panel of the chosen stage ----
    function panel(ch, kind, c, k, mA) {
      const P = c.P, sA = c.A.stages[k], sB = c.B?.stages[k], sN = c.Nom.stages[k], ts = tOf(sA), tu = ts.map((v) => v / us), L = mA.L || 1;
      const idl = c.Nom.stages[0], ti = tOf(idl), tiu = ti.map((v) => v / us), ref = state.resid === 'ab' && sB ? sB : sN, mN = measure(c.An.stages[k].z, tOf(c.An.stages[k]), P);
      const zr = state.zoom === 'rise' ? [mN.r10 / us - 0.04, mN.r10 / us + 0.12] : state.zoom === 'fall' ? [mN.f90 / us - 0.06, mN.f90 / us + 0.14] : [Math.max(0, T0 / us - 0.15), (T0 + P.pw) / us + 0.3];
      const X = zr.map((v) => (Number.isFinite(v) ? v : 0)), dots = k === 9 && state.fsadc <= 200, mask = (arr, z) => { const m = mag(z); return Array.from(arr, (v, i) => (m[i] > 0.2 * L ? v : NaN)); };
      const bands = () => { const [b, p, f, e] = [mN.r10, mN.r90, mN.f90, mN.f10].map((v) => v / us), bg = hex('--scene'), tint = [hex('--c-v'), hex('--c-B'), hex('--c-I')], nx = 240;
        ch.image('bands', new Array(nx), nx, 1, { rgb: (i, out) => { const t = X[0] + (X[1] - X[0]) * (i + 0.5) / nx, j = t >= b && t < p ? 0 : t >= p && t < f ? 1 : t >= f && t < e ? 2 : -1; for (let q = 0; q < 3; q++) out[q] = j < 0 ? bg[q] : bg[q] * 0.86 + tint[j][q] * 0.14; } }); };
      const L9 = { max: 9000 }, dashed = { color: '--c-ref', width: 1.1, max: 9000 };   // the ideal pulse: a thin grey ghost
      if (kind === 'amp') {
        if (state.resid !== 'off' && ref) { const d = mag(sA.z).map((v, i) => v - Math.hypot(ref.z.re[i], ref.z.im[i])), M = Math.max(0.01, ...d.filter((_, i) => tu[i] >= X[0] && tu[i] <= X[1]).map(Math.abs)) * 1.2;
          ch.range(X, [-M, M]); ch.titles('time (µs)', `Δ|z|: A − ${state.resid === 'ab' ? 'B' : 'nominal'}`); bands(); ch.line('r', tu, d, { color: '--c-north', ...L9, width: 1.6 }); return; }
        const ma = mag(sA.z), top = Math.max(1.2, ...ma) * 1.08; ch.range(X, [0, top]); ch.titles('time (µs)', `|z|: amplitude${sB ? ', A blue, B orange' : ''}`); bands();
        if (state.ghost) ch.line('g', tiu, mag(idl.z), dashed); if (sB) ch.line('b', tu, mag(sB.z), { color: '--c-I', width: 1.6, ...L9 }); ch.line('a', tu, ma, { color: '--c-B', width: 2, ...L9 });
        if (dots) ch.dots('s', tu.filter((v) => v >= X[0] && v <= X[1]), ma.filter((_, i) => tu[i] >= X[0] && tu[i] <= X[1]), { color: '--ink', size: 6 });
      } else if (kind === 'iq') {
        const top = Math.max(1.2, ...mag(sA.z)) * 1.08; ch.range(X, [-top, top]); ch.titles('time (µs)', 'I (blue), Q (orange)'); bands();
        if (state.ghost) ch.line('g', tiu, idl.z.re, dashed); ch.line('i', tu, sA.z.re, { color: '--c-B', width: 1.8, ...L9 }); ch.line('q', tu, sA.z.im, { color: '--c-I', width: 1.8, ...L9 });
        if (dots) ch.dots('s', tu.filter((v) => v >= X[0] && v <= X[1]), Array.from(sA.z.re).filter((_, i) => tu[i] >= X[0] && tu[i] <= X[1]), { color: '--ink', size: 5 });
      } else if (kind === 'phase') {
        const mode = state.ph, of = (s, m) => (mode === 'wrap' ? mask(Array.from(s.z.re, (v, i) => Math.atan2(s.z.im[i], v)), s.z) : mode === 'unwrap' ? mask(m.unwrapped, s.z) : mask(m.det.map((v) => v * deg), s.z));
        const ya = of(sA, mA), mB = sB && measure(sB.z, tOf(sB), P);
        if (state.resid !== 'off' && ref) { const mr = measure(ref.z, tOf(ref), P), d = mask(mA.det.map((v, i) => (v - mr.det[i]) * deg), sA.z), M = Math.max(0.5, ...d.filter((v, i) => Number.isFinite(v) && tu[i] >= X[0] && tu[i] <= X[1]).map(Math.abs)) * 1.2;
          ch.range(X, [-M, M]); ch.titles('time (µs)', `Δφ (°): A − ${state.resid === 'ab' ? 'B' : 'nominal'}, detrended`); bands(); ch.line('r', tu, d, { color: '--c-north', ...L9, width: 1.6 }); return; }
        const vis = [...ya, ...(mB ? of(sB, mB) : [])].filter((v, i) => Number.isFinite(v) && tu[i % tu.length] >= X[0] && tu[i % tu.length] <= X[1]), lo = Math.min(...vis), hi = Math.max(...vis), pad = Math.max(mode === 'detrend' ? 1 : 0.1, 0.15 * (hi - lo));
        ch.range(X, mode === 'wrap' ? [-3.4, 3.4] : [lo - pad, hi + pad]); ch.titles('time (µs)', mode === 'wrap' ? 'phase (rad): wrapped' : mode === 'unwrap' ? 'phase (rad): unwrapped' : 'phase (°): detrended'); bands();
        if (state.ghost && mode !== 'detrend') { const g = ti.map((t) => waveformPhase(P, t)); ch.line('g', tiu, mask(mode === 'wrap' ? g.map((v) => Math.atan2(Math.sin(v), Math.cos(v))) : g, idl.z), dashed); }
        if (mB) ch.line('b', tu, of(sB, mB), { color: '--c-I', width: 1.6, ...L9 }); ch.line('a', tu, ya, { color: '--c-B', width: 2, ...L9 });
      } else if (kind === 'freq') {
        const fa = Array.from(instFreq(sA.z, sA.fs, 0.2 * L), (v) => v / MHz), fb = sB && Array.from(instFreq(sB.z, sB.fs, 0.2 * L), (v) => v / MHz), vis = fa.filter((v, i) => Number.isFinite(v) && tu[i] >= X[0] && tu[i] <= X[1]).sort((a, b) => a - b);
        const lo = vis[Math.floor(0.02 * vis.length)] ?? -1, hi = vis[Math.floor(0.98 * vis.length)] ?? 1, pad = Math.max(0.3, 0.2 * (hi - lo)); ch.range(X, [lo - pad, hi + pad]); ch.titles('time (µs)', 'f (MHz): instantaneous frequency'); bands();
        if (state.ghost) ch.line('g', tiu, ti.map((t) => (t >= T0 && t < T0 + P.pw ? (P.wf === 'lfm' ? P.bw * ((t - T0) / P.pw - 0.5) / MHz : 0) : NaN)), dashed);
        if (fb) ch.line('b', tu, fb, { color: '--c-I', width: 1.4, ...L9 }); ch.line('a', tu, fa, { color: '--c-B', width: 1.8, ...L9 });
      } else if (kind === 'plane') {
        const box = ch === G6[4] ? [2.25, 1.65] : [3.7, 1.65], R = Math.max(1.1, ...mag(sA.z)) * 1.15, ar = box[0] / box[1]; ch.range([-R * ar, R * ar], [-R, R]); ch.titles('I', 'Q: the IQ plane');
        if (state.ghost) { const a = Array.from({ length: 121 }, (_, i) => 2 * Math.PI * i / 120); ch.line('g', a.map(Math.cos), a.map(Math.sin), dashed); }
        if (sB) ch.line('b', Array.from(sB.z.re), Array.from(sB.z.im), { color: '--c-I', width: 1.2, ...L9 }); ch.line('a', Array.from(sA.z.re), Array.from(sA.z.im), { color: '--c-B', width: 1.6, ...L9 });
      } else {
        const ref0 = spectrum(idl.z, idl.fs).peak, sa = spectrum(sA.z, sA.fs, ref0), span = Math.min(sA.fs / 2, P.wf === 'lfm' ? 1.5 * P.bw + 10 * MHz : P.wf === 'barker' ? 40 * MHz : 25 * MHz) / MHz;
        ch.range([-span, span], [-70, 5]); ch.titles('frequency (MHz)', 'dB: spectrum re the ideal pulse');
        if (state.ghost) { const g = spectrum(idl.z, idl.fs, ref0); ch.line('g', g.f.map((v) => v / MHz), g.dB, dashed); }
        if (sB) { const sb = spectrum(sB.z, sB.fs, ref0); ch.line('b', sb.f.map((v) => v / MHz), sb.dB, { color: '--c-I', width: 1.2, max: 9000 }); }
        ch.line('a', sa.f.map((v) => v / MHz), sa.dB, { color: '--c-B', width: 1.6, max: 9000 });
      }
    }

    function aux(c, mA) {
      const P = c.P, s = state.case, cur = (x, series, xlim, xlabel) => plots.aux.draw({ xlim, cursor: x, series, xlabel });
      if (s === 'modulator') { const a = c.A.stages[1], ts = tOf(a).map((v) => v / us), m = mag(a.z), n = mag(c.Nom.stages[1].z), L = mA.L || 1, w = (arr) => arr.map((v, i) => (ts[i] >= mA.plateau[0] / us && ts[i] <= mA.plateau[1] / us ? 100 * (v / L - 1) : NaN));
        return cur(null, [{ x: ts, y: w(m), color: '--c-B', label: 'top of the pulse: |z| − level (%), unit A' }, { x: ts, y: w(n), color: '--c-ref', label: 'nominal', dash: [4, 3] }], [mA.plateau[0] / us, mA.plateau[1] / us], 'time (µs)'); }
      if (s === 'oscillator' || s === 'lo') { const k = s === 'lo' ? 6 : 2, a = c.A.stages[k], ts = tOf(a).map((v) => v / us), m = measure(a.z, tOf(a), P), on = (arr) => arr.map((v, i) => (mag(a.z)[i] > 0.2 * (m.L || 1) ? v : NaN));
        return cur(null, [{ x: ts, y: on(Array.from(m.rel)), color: '--c-B', label: 'phase relative to the waveform (rad)' }, { x: ts, y: on(Array.from(m.det)), color: '--c-v', label: 'after detrending' }], [T0 / us - 0.05, (T0 + P.pw) / us + 0.1], 'time (µs)'); }
      if (s === 'amplifier') { const d = Array.from({ length: 121 }, (_, i) => -25 + 0.25 * i), r = d.map((v) => RSAT * 10 ** (v / 20));
        return cur(state.drive, [{ x: d, y: r.map((v) => salehA(v) / salehA(RSAT)), color: '--c-B', label: 'AM/AM: output ÷ saturated output' }, { x: d, y: r.map((v) => state.ampm * salehP(v)), color: '--c-I', label: 'AM/PM: phase added (rad)' }], [-25, 5], 'input drive re saturation (dB)'); }
      if (s === 'txfilter') { const H = txH(unit(P, state.seedA)), f = Array.from({ length: 241 }, (_, i) => -1.5 * P.txbw + 3 * P.txbw * i / 240);
        return cur(null, [{ x: f.map((v) => v / MHz), y: f.map((v) => { const [a, b] = H(v); return 20 * Math.log10(Math.hypot(a, b) + 1e-9); }), color: '--c-B', label: '|H(f)| of the Tx filter (dB), unit A' }], [-1.5 * P.txbw / MHz, 1.5 * P.txbw / MHz], 'frequency (MHz)'); }
      if (s === 'rxbw') { const n = 4096, g = { re: Float64Array.from({ length: n }, (_, i) => (i >= 400 && i < 2400 ? 1 : 0)), im: new Float64Array(n) }, ts = Array.from({ length: n }, (_, i) => i / FS), Bs = [1, 2, 3, 5, 8, 12, 20, 30, 50, 80, 120, 200, 300, 400];
        const tr = Bs.map((B) => measure(filterC(g, FS, (f) => butter(f, B * MHz, state.rxord)), ts, P).rise / ns), tx = measure(c.An.stages[4].z, tOf(c.An.stages[4]), P).rise / ns;
        return cur(state.rxbw, [{ x: Bs, y: tr, color: '--c-B', label: `rise time of the Rx filter alone (ns), order ${state.rxord}` }, { x: Bs, y: Bs.map(() => tx), color: '--c-I', label: 'the transmitter edge (ns)', dash: [4, 3] }], [1, 400], 'Rx bandwidth (MHz)'); }
      if (s === 'iqimb') { const g = Array.from({ length: 61 }, (_, i) => 3 * i / 60); return cur(Math.abs(state.rxg), [{ x: g, y: g.map((v) => 10 * Math.log10(irr(v, state.rxp))), color: '--c-B', label: `image rejection (dB) against gain mismatch (dB), phase ${state.rxp}°` }], [0, 3], 'gain mismatch (dB)'); }
      if (s === 'adc') { const b = Array.from({ length: 15 }, (_, i) => i + 2), jl = state.jit ? -20 * Math.log10(2 * Math.PI * state.rxbw * MHz * state.jit * 1e-12) : NaN;
        return cur(state.bits, [{ x: b, y: b.map((v) => 6.02 * v + 1.76), color: '--c-B', label: 'quantisation SNR 6.02 N + 1.76 (dB)' }, ...(state.jit ? [{ x: b, y: b.map(() => jl), color: '--c-north', label: `jitter limit at ${state.rxbw} MHz (dB)`, dash: [4, 3] }] : [])], [2, 16], 'ADC bits'); }
      if (s === 'drift') { const m = Array.from({ length: 61 }, (_, i) => i), U = unit(P, state.seedA); return cur(state.warm, [{ x: m, y: m.map((w) => conditions({ ...U, warm: w }).cfoHz / 1e3), color: '--c-B', label: `oscillator offset (kHz) after switch-on (min), at ${state.temp} °C (illustrative)` }], [0, 60], 'minutes since switch-on'); }
      const snr = Array.from({ length: 66 }, (_, i) => -5 + i), d1 = (v) => c.sep.d * 10 ** ((v - P.snr) / 20);
      cur(P.snr, [{ x: snr, y: snr.map(d1), color: '--c-B', label: 'A against B: rms difference per sample ÷ noise σ, 1 pulse' }, ...(c.N > 1 ? [{ x: snr, y: snr.map((v) => d1(v) * Math.sqrt(c.N)), color: '--c-v', label: `${c.N} pulses (×√N)` }] : []), { x: snr, y: snr.map(() => 1), color: '--c-ref', label: '1σ: visible in one pulse', dash: [4, 3] }], [-5, 60], 'SNR (dB)');
    }

    function draw() {
      const c = compute(), k = Math.max(0, STAGES.indexOf(state.stage)), list = PANELS[state.case] || PANELS.workbench, G = list.length === 6 ? G6 : G4;
      for (const ch of [...G4, ...G6]) { ch.clear(); ch.show(false); }
      schema(c, k);
      const sA = c.A.stages[k], mA = measure(sA.z, tOf(sA), c.P);
      list.forEach((kind, i) => { G[i].show(true); panel(G[i], kind, c, k, mA); });
      aux(c, mA);
      const U = c.An.U, ma = measure(c.A.stages[9].z, tOf(c.A.stages[9]), c.P), sep = c.sep, rt = (v) => fmt(v / ns, 3);
      hud.set('a', `at ${k + 1}. ${NAME[STAGES[k]]}: rise ${rt(mA.rise)} ns · fall ${rt(mA.fall)} ns · droop ${fmt(100 * mA.droop, 2)} % · ripple ${fmt(100 * mA.ripple, 2)} % p-p (noise included)`);
      hud.set('b', `at the ADC: CFO ${fmt(ma.cfo / 1e3)} kHz (Tx ${fmt(U.ppm, 2)} ppm = ${fmt(U.cfoHz / 1e3)} kHz${c.P.vel ? `, Doppler ${fmt(c.P.vel * c.P.fc / 299792458 / 1e3)} kHz` : ''}${c.P.lo ? `, LO ${fmt(c.P.lo / 1e3)} kHz` : ''}) · rms phase after detrend ${fmt(ma.phRms * deg, 2)}° · SNR ${fmt(c.P.snr)} dB${c.N > 1 ? ` + ${fmt(10 * Math.log10(c.N), 2)} dB from ${c.N} pulses` : ''}`);
      const dN = sep.d * Math.sqrt(c.N), sepTxt = `A vs B, rms per sample: amplitude ${fmt(sep.dA, 2)}σ, phase ${fmt(sep.dP, 2)}σ${c.N > 1 ? `; ×√${c.N} = ${fmt(dN, 2)}σ` : ''}: ${dN >= 1 ? 'visible pulse by pulse' : `needs about ${fmt(Math.ceil(1 / (sep.d * sep.d)), 2)} pulses averaged`}`;
      const s = state.case;
      const note = s === 'rxbw' ? (() => { const tx = measure(c.An.stages[4].z, tOf(c.An.stages[4]), c.P).rise, rx = measure(c.An.stages[9].z, tOf(c.An.stages[9]), c.P).rise; return [`Tx edge ${rt(tx)} ns, after the receiver ${rt(rx)} ns: ${rx > 2 * tx ? 'the receiver sets the edge, the fingerprint is gone' : 'the edge still belongs to the transmitter'}; ${sepTxt}`, rx > 2 * tx ? 'bad' : 'good']; })()
        : s === 'iqimb' ? [`image rejection ${fmt(10 * Math.log10(irr(state.rxg, state.rxp)))} dB: the circle becomes an ellipse${state.lo ? `, and with a ${fmt(state.lo / 1e3)} MHz offset |z| ripples at ${fmt(2 * state.lo / 1e3)} MHz` : ''}`, '']
        : s === 'adc' ? [`${state.bits} bits: quantisation SNR ≈ ${fmt(6.02 * state.bits + 1.76)} dB${state.jit ? `; ${state.jit} ps jitter limits a ${state.rxbw} MHz signal to ${fmt(-20 * Math.log10(2 * Math.PI * state.rxbw * MHz * state.jit * 1e-12))} dB` : ''}; ${state.fsadc} MS/s = one sample every ${fmt(1e3 / state.fsadc)} ns`, '']
        : s === 'drift' ? [`internal ${fmt(U.Ti)} °C: offset ${fmt(U.ppm, 2)} ppm = ${fmt(U.cfoHz / 1e3)} kHz; B is the same unit warm at 25 °C (orange). Coefficients are illustrative`, '']
        : s === 'intro' && state.example === 'pdw' ? [`PDW of A: RF ${state.fc} GHz ${ma.cfo >= 0 ? '+' : '−'} ${fmt(Math.abs(ma.cfo / 1e3))} kHz, PW ${fmt((ma.f90 + ma.f10 - ma.r10 - ma.r90) / 2 / us)} µs — the same as B within a measurement's resolution; the shape still differs: ${sepTxt}`, dN >= 1 ? 'good' : '']
        : state.two ? [sepTxt, dN >= 1 ? 'good' : 'bad'] : [NOTE[s] || sepTxt, ''];
      hud.set('c', note[0], note[1]);
    }

    return {
      changed() { draw(); ctx.setClock(0); },
      update() { draw(); },
      theme() { for (const k of [...G4, ...G6]) k.theme(); bd.theme(); draw(); },
    };
  },
};

// each focused case shows its own knobs (the workbench shows them all); the Show group is always there
for (const g of LAB.controls) for (const it of g.items) {
  if (VIEW.includes(it.id)) continue;
  const own = it.show; it.show = (s) => (s.case === 'workbench' || REL[s.case].includes(it.id)) && (!own || own(s));
}
export default LAB;
