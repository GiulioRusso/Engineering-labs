// System architectures: the physical blocks of a pulsed radar, a coherent pulse-Doppler radar, an AESA,
// an ESM receiver and a DRFM jammer, drawn as a block diagram with the signal shape on every wire. The
// signal is followed block by block (or a block is picked): the block lights up, the HUD says what it
// physically is and does, and the plot below shows the quantity that architecture is about.
import { createBlocks } from '../../lib/viz/blocks.js';
import { pulsed, coherent, aesa, esm, drfm, PULSES } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const TX = 2.35, RX = 0.45, TT = 2.9, TB = -0.1;
// layouts are written in a compact frame and stretched onto the stage (wider row spacing; symbols keep their size)
const SX = 1.08, SY = 1.33, mp = (p) => [p[0] * SX, (p[1] - 3.05) * SY + 2.5];

// ---- layouts: blocks { id: [kind, [x, y], opts] }, wires [from, to, opts?, ...via], steps (the signal's path) ----
const ARCH = {
  pulsed: {
    blocks: {
      sync: ['clock', [-3.75, TX], { label: 'synchronizer', labelAt: 't' }], mod: ['box', [-2.55, TX], { t: 'modulator', w: 0.9, label: 'HV pulser' }], mag: ['box', [-1.2, TX], { t: 'magnetron', w: 0.9, label: 'transmitter' }],
      dup: ['circ', [2.7, 1.4], { label: 'duplexer', labelAt: 'l' }], ant: ['antenna', [3.75, 1.95], { label: 'antenna', labelAt: 't' }],
      lim: ['box', [1.85, RX], { t: 'limiter', w: 0.7 }], lna: ['amp', [0.95, RX], { flip: true, label: 'LNA' }], mix: ['mixer', [0.1, RX], { label: 'mixer', labelAt: 't' }], lo: ['lo', [0.1, -0.6], { label: 'LO', labelAt: 'r' }],
      ifa: ['amp', [-0.8, RX], { flip: true, t: 'IF', label: 'IF amp' }], det: ['box', [-1.75, RX], { t: 'detector', w: 0.75 }], vid: ['amp', [-2.7, RX], { flip: true, label: 'video' }], disp: ['display', [-3.7, RX], { t: 'A', label: 'display' }],
    },
    wires: [['sync.r', 'mod.l'], ['mod.r', 'mag.l'], ['mag.r', 'dup.t', {}, [2.7, TX]], ['dup.r', 'ant.b', { arrow: false }, [3.75, 1.4]], ['dup.b', 'lim.r', {}, [2.7, RX]], ['lim.l', 'lna.r'], ['lna.l', 'mix.r'], ['lo.t', 'mix.b'], ['mix.l', 'ifa.r'], ['ifa.l', 'det.r'], ['det.l', 'vid.r'], ['vid.l', 'disp.r'], ['sync.b', 'disp.t', { dashed: true, label: 'trigger', dx: 0.36, labelAt: 0 }]],
    steps: [
      { b: 'sync', title: 'Synchronizer', what: 'a crystal-timed counter: it fires once per PRI and starts everything — the transmitter and the display sweep', tile: [-3.15, TT], win: [0, 0.3], sig: (M) => M.sig.sync },
      { b: 'mod', title: 'Modulator (pulser)', what: 'stores energy and dumps it as a high-voltage pulse (tens of kV, ~1 µs) into the tube: it sets the pulse width', tile: [-1.88, TT], win: [0, 0.3], sig: (M) => M.sig.mod, color: '--c-I' },
      { b: 'mag', title: 'Magnetron', what: 'a vacuum-tube oscillator: during the HV pulse it rings at ~10 GHz with ~1 MW peak. Its start phase is random every pulse: non-coherent', tile: [0.5, TT], win: [0, 0.3], sig: (M) => M.sig.tx, dbm: (M) => M.levels.Pt, cap: 'RF pulse' },
      { b: 'dup', title: 'Duplexer (transmit)', what: 'a ferrite circulator (plus a TR tube): transmitter → antenna, antenna → receiver. Its isolation keeps most of the 1 MW out of the receiver', tile: [2.12, 1.95], win: [0, 0.3], sig: (M) => M.sig.tx, dbm: (M) => M.levels.Pt - 0.5 },
      { b: 'ant', title: 'Antenna (transmit)', what: 'a dish or slotted array, gain ~33 dBi: it squeezes the pulse into a narrow beam', tile: [3.75, 2.72], win: [0, 0.3], sig: (M) => M.sig.tx, dbm: (M) => M.levels.Pt - 0.5, cap: 'radiated' },
      { b: 'ant', title: 'Antenna (receive)', what: 'the same antenna catches the echo 2R/c later, about 10⁻¹² of a watt, buried in thermal noise', tile: [3.75, 0.95], sig: (M) => M.sig.ant, norm: (M) => M.norm, dbm: (M) => M.levels.Pr, cap: 'echo + noise' },
      { b: 'dup', title: 'Duplexer (receive)', what: 'routes the echo to the receiver. During transmission a leak of the pulse (Pt − isolation) also arrives: far larger than any echo', tile: [3.25, 0.15], sig: (M) => M.sig.dup, norm: (M) => M.norm, dbm: (M) => M.levels.Pr - 0.5, cap: 'leak + echo' },
      { b: 'lim', title: 'Limiter', what: 'PIN diodes that short anything above ~+10 dBm to ground: the leak is clipped, the weak echo passes untouched', tile: [1.4, TB], sig: (M) => M.sig.lim, norm: (M) => M.norm, dbm: (M) => M.levels.Pr - 1 },
      { b: 'lna', title: 'Low-noise amplifier', what: 'a GaAs/GaN transistor stage, ~25 dB gain, 2–3 dB noise figure: it sets the noise of the whole receiver', tile: [0.52, TB], sig: (M) => M.sig.lna, norm: (M) => M.norm, dbm: (M) => M.levels.Pr - 1 + 25 },
      { b: 'mix', title: 'Mixer + local oscillator', what: 'a diode mixer multiplies the echo by the LO: it comes out at the intermediate frequency (e.g. 60 MHz), where filters are easy', tile: [-0.35, TB], sig: (M) => M.sig.mix, norm: (M) => M.norm, dbm: (M) => M.levels.Pr - 1 + 25 - 7, cap: 'at IF' },
      { b: 'ifa', title: 'IF amplifier and filter', what: 'most of the gain (~40–60 dB) and the bandwidth B ≈ 1/τ: the filter keeps the pulse and rejects the noise outside it', tile: [-1.28, TB], sig: (M) => M.sig.ifa, norm: (M) => M.norm, dbm: (M) => M.levels.Pr - 1 + 25 - 7 + 40 },
      { b: 'det', title: 'Envelope detector', what: 'a diode and an RC: it keeps only the amplitude of the IF pulse. The phase is thrown away — no Doppler from this radar', tile: [-2.22, TB], sig: (M) => M.sig.det, color: '--c-v' },
      { b: 'vid', title: 'Video amplifier', what: 'amplifies the detected pulse (video) to volts for the display or a threshold detector', tile: [-3.2, TB], sig: (M) => M.sig.vid, color: '--c-v' },
      { b: 'disp', title: 'Display', what: 'the sweep starts with the trigger, so the position of a blip is the delay, i.e. the range: A-scope (amplitude vs range) or PPI (range and bearing)', tile: [-3.3, -0.95], sig: (M) => M.sig.vid, color: '--c-v', w: 1.1, h: 0.45, cap: 'echo vs range' },
    ],
  },
  coherent: {
    blocks: {
      ref: ['lo', [-3.6, 1.45], { label: 'reference 10 MHz' }], coho: ['lo', [-0.9, 1.45], { label: 'COHO', labelAt: 'tl' }], stalo: ['lo', [0.8, 1.45], { label: 'STALO', labelAt: 'tr' }],
      dds: ['dac', [-0.9, TX + 0.1], { t: 'DDS', label: 'waveform generator', labelAt: 't' }], up: ['mixer', [0.8, TX + 0.1], { label: 'up-converter', labelAt: 't' }], twt: ['amp', [2.0, TX + 0.1], { w: 0.6, h: 0.52, t: 'TWT', label: 'power amp', labelAt: 't' }],
      circ: ['circ', [3.4, 1.45], { label: 'circulator', labelAt: 'l' }], ant: ['antenna', [4.0, 2.05], { label: 'antenna', labelAt: 't' }],
      lna: ['amp', [2.5, RX], { flip: true, label: 'limiter + LNA' }], down: ['mixer', [0.8, RX], { label: 'down-conv.', labelAt: 'br' }], ifb: ['filter', [-0.05, RX], { type: 'bp', label: 'IF filter' }], iqd: ['box', [-0.95, RX], { t: 'IQ demod', w: 0.8 }], adc: ['adc', [-2.1, RX], { flip: true, label: 'ADC ×2' }],
      pc: ['box', [-3.0, -0.75], { t: 'compression', w: 1.05 }], fft: ['box', [-1.6, -0.75], { t: 'Doppler FFT', w: 1.0 }], cfar: ['box', [-0.25, -0.75], { t: 'CFAR', w: 0.7 }], trk: ['box', [1.05, -0.75], { t: 'tracker', w: 0.8, label: 'data processor' }], disp: ['display', [2.5, -0.75], { t: '•', label: 'display' }],
    },
    wires: [['ref.r', 'coho.l', { dashed: true, label: 'one clock for all', dy: 0.14 }], ['coho.r', 'stalo.l', { dashed: true }], ['coho.t', 'dds.b'], ['stalo.t', 'up.b'], ['dds.r', 'up.l'], ['up.r', 'twt.l'], ['twt.r', 'circ.t', {}, [3.4, TX + 0.1]], ['circ.r', 'ant.b', { arrow: false }, [4.0, 1.45]],
      ['circ.b', 'lna.r', {}, [3.4, RX]], ['lna.l', 'down.r'], ['stalo.b', 'down.t'], ['down.l', 'ifb.r'], ['ifb.l', 'iqd.r'], ['coho.b', 'iqd.t'], ['iqd.l', 'adc.r'], ['adc.l', 'pc.l', {}, [-3.85, RX], [-3.85, -0.75]], ['pc.r', 'fft.l'], ['fft.r', 'cfar.l'], ['cfar.r', 'trk.l'], ['trk.r', 'disp.l']],
    frames: [[[-1.55, -0.72], 3.6, 0.82, 'signal processor']],
    steps: [
      { b: 'ref', title: 'Reference oscillator', what: 'an oven-controlled crystal (OCXO): COHO, STALO, the DDS clock and the ADC clock are all synthesised from it, so every phase is known', tile: [-2.25, 1.85], w: 0.8, win: [0, 0.3], sig: (M) => M.sig.ref, color: '--c-ref' },
      { b: 'coho', title: 'COHO (coherent oscillator)', what: 'the IF reference: it clocks the waveform generator and demodulates the echo, so the transmit phase is remembered at reception', tile: [-1.55, 1.98], w: 0.55, win: [0, 0.4], sig: (M) => M.sig.coho, color: '--c-ref' },
      { b: 'dds', title: 'Waveform generator (DDS + DAC)', what: 'a direct digital synthesiser writes the chirp sample by sample at IF: frequency swept across B', tile: [-0.05, 2.98], w: 0.8, win: [0.03, 0.26], sig: (M) => M.sig.dds },
      { b: 'stalo', title: 'STALO (stable local oscillator)', what: 'a low-phase-noise synthesiser at ~10 GHz: up-converts on transmit and down-converts on receive — the same oscillator both ways', tile: [1.45, 1.98], w: 0.6, win: [0, 0.3], sig: (M) => M.sig.stalo, color: '--c-ref' },
      { b: 'up', title: 'Up-converter', what: 'mixer + filter: IF chirp × STALO → the chirp at RF', tile: [1.4, 2.98], w: 0.65, win: [0.03, 0.26], sig: (M) => M.sig.up },
      { b: 'twt', title: 'Power amplifier (TWT or GaN)', what: 'a travelling-wave tube (or solid-state amplifier) amplifies the chirp to kW without changing its phase: an amplifier, not an oscillator, so the radar stays coherent', tile: [2.75, 2.98], w: 0.7, win: [0.03, 0.26], sig: (M) => M.sig.twt },
      { b: 'circ', title: 'Circulator', what: 'ferrite: port 1 → 2 → 3. Transmitter to antenna, antenna to receiver', sig: (M) => M.sig.circ },
      { b: 'ant', title: 'Antenna', what: 'radiates the chirp; the echo returns after 2R/c with a phase that advances from pulse to pulse because the target moves (Doppler)', tile: [3.95, 0.95], w: 0.6, sig: (M) => M.sig.ant, cap: 'echo + noise' },
      { b: 'lna', title: 'Limiter + LNA', what: 'protection and the first low-noise gain', tile: [1.65, TB], w: 0.6, sig: (M) => M.sig.lna },
      { b: 'down', title: 'Down-converter (STALO)', what: 'the echo × the same STALO → back to IF; the STALO phase cancels out, the target\'s phase remains', tile: [0.38, TB], w: 0.48, sig: (M) => M.sig.down },
      { b: 'ifb', title: 'IF filter', what: 'band-pass of width ≈ B around the IF: rejects the image and out-of-band noise', tile: [-0.47, TB], w: 0.48, sig: (M) => M.sig.down },
      { b: 'iqd', title: 'IQ demodulator (COHO)', what: 'two mixers with cos and −sin of the COHO and two low-passes: I and Q, the echo as a complex number (amplitude and phase)', tile: [-1.5, TB], w: 0.6, sig: (M) => [{ y: M.sig.iq[0], color: '--c-B' }, { y: M.sig.iq[1], color: '--c-I' }], cap: 'I, Q' },
      { b: 'adc', title: 'ADCs', what: 'two matched ADCs (or one at IF + digital down-conversion) sample I and Q at ≥ B: from here on it is all numbers', tile: [-3.05, -0.08], w: 0.55, sig: (M) => [{ y: M.sig.adc[0], color: '--c-B', stems: true }, { y: M.sig.adc[1], color: '--c-I', stems: true }] },
      { b: 'pc', title: 'Pulse compression', what: 'a matched filter (correlation with the transmitted chirp, done by FFT): the long pulse collapses to a peak c/2B wide at the target range', tile: [-2.3, -1.4], w: 0.6, sig: (M) => M.sig.pc, color: '--c-v', cap: 'range' },
      { b: 'fft', title: 'Doppler filter bank (FFT)', what: 'for each range cell, an FFT across the 16 pulses of the dwell: the phase rotation from pulse to pulse becomes a peak at the target\'s Doppler', tile: [-0.92, -1.4], w: 0.6, sig: (M) => ({ stems: true, y: M.sig.fft, color: '--c-v' }), cap: 'Doppler' },
      { b: 'cfar', title: 'CFAR detector', what: 'a threshold set from the neighbouring cells (constant false-alarm rate): only cells above it become detections', tile: [0.42, -1.4], w: 0.6, sig: (M) => [{ y: M.sig.fft, color: '--c-v', stems: true }, { y: M.sig.cfar[1], color: '--c-north' }] },
      { b: 'trk', title: 'Tracker (data processor)', what: 'associates detections from scan to scan and filters them (Kalman): position, velocity, track ID', tile: [1.8, -1.4], w: 0.55, sig: (M) => M.sig.hit, color: '--c-v' },
      { b: 'disp', title: 'Display', what: 'tracks on a map; the operator never sees the raw echoes', sig: (M) => M.sig.hit },
    ],
  },
  aesa: (() => {
    const rows = [2.75, 2.1, 1.45, 0.8, 0.15, -0.5], blocks = { bf: ['box', [-1.6, 1.125], { t: 'Σ', w: 0.36, h: 3.6, label: 'beamformer', labelAt: 'r' }],
      rex: ['box', [-0.45, -1.3], { t: 'REX', w: 0.6, label: 'receiver / exciter' }], adc: ['adc', [0.65, -1.3], {}], proc: ['box', [1.9, -1.3], { t: 'processor', w: 1.0, label: 'beam steering + DSP' }], disp: ['display', [3.4, -1.3], { t: '•', label: 'display' }],
      ps: ['box', [0.15, 2.0], { t: 'φ', w: 0.45, label: 'phase' }], att: ['box', [0.95, 2.0], { t: 'att', w: 0.45, label: 'amplitude' }], sw: ['node', [1.55, 2.0]], pa: ['amp', [2.3, 2.6], { label: 'PA (GaN)', labelAt: 't' }], lnam: ['amp', [2.3, 1.4], { flip: true, label: 'LNA' }], limm: ['box', [3.0, 1.4], { t: 'lim', w: 0.42, label: 'limiter' }], cm: ['circ', [3.55, 2.0], {}], el: ['antenna', [4.05, 2.35], { label: 'element', labelAt: 't' }] };
    rows.forEach((y, m) => { blocks[`e${m}`] = ['antenna', [-4.05, y], {}]; blocks[`m${m}`] = ['box', [-2.8, y], { t: 'T/R', w: 0.5, h: 0.34 }]; });
    const wires = [['bf.b', 'rex.l', { arrow: true }, [-1.6, -1.3]], ['rex.r', 'adc.l'], ['adc.r', 'proc.l'], ['proc.r', 'disp.l'], ['proc.t', 'm5.b', { dashed: true, label: 'phase commands', dx: -0.5 }, [1.9, -0.92], [-2.8, -0.92]],
      ['ps.r', 'att.l'], ['att.r', 'sw.l'], ['sw.c', 'pa.l', {}, [1.55, 2.6]], ['pa.r', 'cm.t', {}, [3.55, 2.6]], ['cm.r', 'el.b', { arrow: false }, [4.05, 2.0]], ['cm.b', 'limm.r', {}, [3.55, 1.4]], ['limm.l', 'lnam.r'], ['lnam.l', 'sw.c', {}, [1.55, 1.4]]];
    rows.forEach((y, m) => { wires.push([`e${m}.b`, `m${m}.l`, { arrow: false }], [`m${m}.r`, [-1.78, y], { arrow: false }]); });
    const all = rows.map((_, m) => `m${m}`), els = rows.map((_, m) => `e${m}`);
    return { blocks, wires, frames: [[[1.85, 2.0], 4.25, 1.95, 'inside one T/R module']], rows,
      steps: [
        { b: 'proc', title: 'Beam-steering computer', what: 'for a beam at angle θ it computes the phase of every element, φₘ = −m·π·sin θ (spacing λ/2), and loads them in microseconds: no moving parts', sig: (M) => M.sig.sum },
        { b: 'rex', title: 'Receiver / exciter', what: 'generates the transmit waveform and, on receive, down-converts and filters the summed beam — one REX for the whole array', sig: (M) => M.sig.sum },
        { b: 'bf', title: 'Beamformer (corporate feed)', what: 'a tree of power dividers / combiners: on transmit it splits the drive to every module, on receive it adds their outputs', lit: all, sig: (M) => M.sig.sum },
        { b: 'ps', title: 'Phase shifter', what: 'a digital (e.g. 6-bit) phase shifter in each module: this is what steers the beam', lit: all, sig: (M) => M.sig.tx[1] },
        { b: 'att', title: 'Attenuator', what: 'sets the amplitude of each element: a taper across the array lowers the sidelobes', lit: all, sig: (M) => M.sig.tx[1] },
        { b: 'pa', title: 'Power amplifier', what: 'every module has its own GaN PA (a few to tens of W): no single big tube, and losing a few modules only degrades the beam', lit: all, sig: (M) => M.sig.tx[1] },
        { b: 'cm', title: 'Circulator', what: 'separates transmit and receive at each element', lit: all, sig: (M) => M.sig.tx[1] },
        { b: 'el', title: 'Radiating elements (transmit)', what: 'each element radiates its own phase; the waves add up in the direction θ and cancel elsewhere: the beam', lit: [...all, ...els], tiles: 'tx', sig: (M) => M.sig.tx[1] },
        { b: 'el', title: 'Elements (receive)', what: 'an echo from angle θₜ reaches element m a little later: its phase lags by m·π·sin θₜ — the tiles at the elements', lit: els, tiles: 'before', sig: (M) => M.sig.before[1] },
        { b: 'limm', title: 'Limiter', what: 'protects the LNA of each module', lit: all, sig: (M) => M.sig.before[1] },
        { b: 'lnam', title: 'LNA', what: 'low-noise gain right behind each element: the losses of the feed come after it and no longer count', lit: all, sig: (M) => M.sig.before[1] },
        { b: 'ps', title: 'Phase shifter (receive)', what: 'the same phase shifter undoes the lag of its element: if the beam points at the target the outputs line up (tiles after the modules)', lit: all, tiles: 'after', sig: (M) => M.sig.after[1] },
        { b: 'bf', title: 'Beamformer (sum)', what: 'adds the M module outputs: in phase they add up to M times one element; off the beam they partly cancel', lit: all, tiles: 'after', sig: (M) => M.sig.sum },
        { b: 'adc', title: 'ADC and processing', what: 'the beam output is digitised and processed (pulse compression, Doppler, detection) as in any coherent radar', sig: (M) => M.sig.sum },
      ] };
  })(),
  esm: {
    blocks: {
      omni: ['antenna', [-4.05, 2.55], { label: 'spiral', labelAt: 't' }], rff: ['filter', [-3.05, 2.55], { type: 'bp', label: 'band filter' }], rfa: ['amp', [-2.2, 2.55], { label: 'LNA' }], ifm: ['box', [-1.05, 2.55], { t: 'IFM', w: 0.7, label: 'freq. measurement', labelAt: 't' }],
      d0: ['antenna', [-4.05, 1.55], {}], d1: ['antenna', [-4.05, 0.95], {}], d2: ['antenna', [-4.05, 0.35], {}], d3: ['antenna', [-4.05, -0.25], {}],
      l0: ['box', [-3.0, 1.55], { t: 'log', w: 0.46, h: 0.3 }], l1: ['box', [-3.0, 0.95], { t: 'log', w: 0.46, h: 0.3 }], l2: ['box', [-3.0, 0.35], { t: 'log', w: 0.46, h: 0.3 }], l3: ['box', [-3.0, -0.25], { t: 'log', w: 0.46, h: 0.3 }],
      aoa: ['box', [-1.05, 0.65], { t: 'AOA', w: 0.7, h: 1.2, label: 'amplitude compare' }], enc: ['box', [0.4, 1.6], { t: 'encoder', w: 0.85, h: 1.4, label: 'pulse encoder' }],
      pdw: ['memory', [1.8, 1.6], { t: 'PDW', label: 'PDW buffer' }], dei: ['box', [3.3, 1.6], { t: 'deinterleave', w: 1.3, label: 'by PRI, RF, AOA' }],
      lib: ['memory', [3.3, 2.75], { t: 'library', w: 0.8, h: 0.36 }], id: ['box', [3.3, 0.1], { t: 'emitter ID', w: 1.0 }], thr: ['display', [1.7, 0.1], { t: '◆', label: 'threat display' }], ecm: ['box', [0.4, -0.45], { t: 'jam / decoy', w: 1.1, label: 'countermeasures' }],
    },
    wires: [['omni.b', 'rff.l', { arrow: false }, [-4.05, 2.55]], ['rff.r', 'rfa.l'], ['rfa.r', 'ifm.l'], ['ifm.r', 'enc.l', {}, [-0.4, 2.55], [-0.4, 2.05], [-0.03, 2.05]], ['aoa.r', 'enc.l', {}, [-0.4, 0.65], [-0.4, 1.15], [-0.03, 1.15]], ['enc.r', 'pdw.l'], ['pdw.r', 'dei.l'], ['lib.b', 'dei.t', { dashed: true }], ['dei.b', 'id.t'], ['lib.r', 'id.r', { dashed: true }, [4.1, 2.75], [4.1, 0.1]], ['id.l', 'thr.r'], ['id.b', 'ecm.r', {}, [3.3, -0.45]],
      ...[0, 1, 2, 3].flatMap((k) => [[`d${k}.b`, `l${k}.l`, { arrow: false }, [-4.05, [1.55, 0.95, 0.35, -0.25][k]]], [`l${k}.r`, [-1.375, [1.2, 0.85, 0.45, 0.1][k]], {}, [-2.2, [1.55, 0.95, 0.35, -0.25][k]], [-2.2, [1.2, 0.85, 0.45, 0.1][k]]]])],
    steps: [
      { b: 'omni', title: 'Wide-band antenna', what: 'a cavity-backed spiral or horn covering 2–18 GHz: it hears every radar around at once, so the pulses of different emitters arrive interleaved', tile: [-2.6, 3.05], w: 0.9, sig: (M) => M.sig.rf, cap: 'interleaved pulses' },
      { b: 'rfa', title: 'Band filter + LNA', what: 'pre-selection and low-noise gain; an ESM listens one-way, so it detects a radar long before the radar sees it', sig: (M) => M.sig.rf },
      { b: 'ifm', title: 'Frequency measurement (IFM)', what: 'an instantaneous frequency measurement receiver: a delay line and a phase discriminator give the carrier of every pulse in ~100 ns (channelised or digital receivers do the same)', tile: [0.15, 3.05], w: 0.7, sig: (M) => ({ y: M.pdw.map((p) => p.f), stems: true, color: '--c-I' }), cap: 'RF per pulse' },
      { b: 'd0', title: 'Direction-finding antennas', what: 'four squinted spirals at 90°: the same pulse is stronger in the one facing the radar', lit: ['d0', 'd1', 'd2', 'd3'], sig: (M) => M.sig.video },
      { b: 'l0', title: 'Log video detectors', what: 'detector-log amplifiers turn each channel into a video pulse whose height is the power in dB', lit: ['l0', 'l1', 'l2', 'l3'], tile: [-2.0, -0.6], w: 0.75, sig: (M) => M.sig.video, color: '--c-v', cap: 'video' },
      { b: 'aoa', title: 'Amplitude comparison (AOA)', what: 'the ratio of the two strongest channels gives the angle of arrival (a few degrees)', tile: [-1.05, -0.35], w: 0.6, sig: (M) => ({ y: M.pdw.map((p) => p.aoa), stems: true, color: '--c-F' }), cap: 'AOA per pulse' },
      { b: 'enc', title: 'Pulse encoder', what: 'for every pulse it writes one pulse descriptor word: time of arrival, frequency, pulse width, amplitude, angle of arrival', tile: [1.1, 2.75], w: 0.75, sig: (M) => ({ y: M.pdw.map((p) => p.amp), stems: true, color: '--c-v' }), cap: 'one PDW per pulse' },
      { b: 'pdw', title: 'PDW buffer', what: 'thousands of PDWs per second from all emitters, still mixed together', sig: (M) => ({ y: M.pdw.map((p) => p.amp), stems: true, color: '--c-v' }) },
      { b: 'dei', title: 'Deinterleaver', what: 'groups the PDWs by frequency and angle, then a histogram of time differences finds each pulse train\'s PRI', tile: [2.55, 0.75], w: 0.75, sig: (M) => M.sig.split.map((y, k) => ({ y, color: ['--c-B', '--c-I'][k] })), cap: 'one train each' },
      { b: 'id', title: 'Emitter identification', what: 'matches (RF, PRI, PW, scan) against the threat library: "search radar", "fire-control radar — locked on"', sig: (M) => M.sig.split[0] },
      { b: 'thr', title: 'Threat display', what: 'each emitter as a symbol at its bearing; a lock-on raises an alarm (radar warning receiver)', sig: (M) => M.sig.split[0] },
      { b: 'ecm', title: 'Countermeasures', what: 'the identified threat cues a jammer, chaff or a decoy', sig: (M) => M.sig.split[0] },
    ],
  },
  drfm: {
    blocks: {
      rxa: ['antenna', [-4.05, 1.95], { label: 'receive', labelAt: 't' }], lna: ['amp', [-3.25, 1.7], { label: 'LNA' }], dn: ['mixer', [-2.45, 1.7], { label: 'down', labelAt: 't' }], adc: ['adc', [-1.6, 1.7], {}],
      mem: ['memory', [-0.55, 1.7], { t: 'DRFM', label: 'memory' }], mod: ['box', [0.55, 1.7], { t: 'Δt  Δf', w: 0.7, label: 'delay · Doppler' }], dac: ['dac', [1.55, 1.7], {}], upm: ['mixer', [2.4, 1.7], { label: 'up', labelAt: 't' }], pa: ['amp', [3.2, 1.7], { label: 'PA' }], txa: ['antenna', [4.05, 1.95], { label: 'transmit', labelAt: 't' }],
      lo: ['lo', [0.0, 0.7], { label: 'one LO for both: the copy is coherent', labelAt: 'b' }], radar: ['box', [0.0, -0.8], { t: 'victim radar receiver', w: 2.2 }],
    },
    wires: [['rxa.b', 'lna.l', { arrow: false }, [-4.05, 1.7]], ['lna.r', 'dn.l'], ['dn.r', 'adc.l'], ['adc.r', 'mem.l'], ['mem.r', 'mod.l'], ['mod.r', 'dac.l'], ['dac.r', 'upm.l'], ['upm.r', 'pa.l'], ['pa.r', 'txa.b', { arrow: false }, [4.05, 1.7]], ['lo.l', 'dn.b', {}, [-2.45, 0.7]], ['lo.r', 'upm.b', {}, [2.4, 0.7]], [[4.3, 2.1], 'radar.r', { dashed: true, label: 'false echo, back to the radar', labelAt: 2 }, [4.4, 2.1], [4.4, -0.8]]],
    steps: [
      { b: 'rxa', title: 'Receive antenna', what: 'the jammer hears the radar\'s own pulse (one-way: strong)', tile: [-3.65, 2.75], w: 0.75, sig: (M) => M.sig.rx },
      { b: 'lna', title: 'LNA', what: 'amplification and band filtering', sig: (M) => M.sig.lna },
      { b: 'dn', title: 'Down-converter', what: 'the pulse is mixed down to a band the ADC can sample', tile: [-2.03, 2.75], w: 0.7, sig: (M) => M.sig.down },
      { b: 'adc', title: 'Fast ADC', what: 'samples the pulse at GS/s; even 2–4 bits are enough to reproduce it convincingly', tile: [-1.05, 2.75], w: 0.7, sig: (M) => ({ y: M.sig.adc.filter((_, i) => i % 3 === 0), stems: true, color: '--c-B' }), cap: (M) => `${M.bits} bits` },
      { b: 'mem', title: 'Digital RF memory', what: 'the samples are stored: an exact copy of the radar\'s waveform, chirp and code included, so the copy passes the radar\'s matched filter', sig: (M) => M.sig.mem },
      { b: 'mod', title: 'Delay and Doppler', what: 'reads the memory late (Δt: a false range) and adds a phase ramp (Δf: a false velocity); slowly increasing Δt is range-gate pull-off', tile: [1.05, 2.75], w: 0.9, sig: (M) => M.sig.mod, cap: 'played back late' },
      { b: 'dac', title: 'DAC', what: 'back to an analogue signal', sig: (M) => M.sig.dac },
      { b: 'upm', title: 'Up-converter', what: 'the same LO moves it back to the radar\'s frequency, phase-locked to the original', tile: [2.8, 2.75], w: 0.75, sig: (M) => M.sig.up },
      { b: 'pa', title: 'Power amplifier', what: 'a TWT or GaN PA sends the copy back, stronger than the skin echo (J/S > 0 dB)', sig: (M) => M.sig.pa },
      { b: 'radar', title: 'What the radar receives', what: 'its true echo plus the jammer\'s copy, later and stronger: the range gate locks on the copy and is walked away from the target', tile: [0.0, -1.55], w: 2.2, h: 0.5, sig: (M) => M.sig.victim, cap: 'skin echo, then the jammer copy' },
    ],
  },
};
// a step's tile can zoom on part of the window (the transmit pulse)
const cut = (sg, win) => { if (!win) return sg; const f = (y) => y.slice(Math.floor(win[0] * y.length), Math.ceil(win[1] * y.length)); return Array.isArray(sg) ? (typeof sg[0] === 'object' ? sg.map((o) => ({ ...o, y: f(o.y) })) : f(sg)) : { ...sg, y: f(sg.y) }; };
const ORDER = ['pulsed', 'coherent', 'aesa', 'esm', 'drfm'], SEL = { pulsed: 'sP', coherent: 'sC', aesa: 'sA', esm: 'sE', drfm: 'sJ' };
const opts = (a) => ARCH[a].steps.map((s, i) => [i, `${i + 1}. ${s.title}`]);

export default {
  id: 'systems', title: 'System architectures', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 14,
  defaults: { auto: true, sP: 0, sC: 0, sA: 0, sE: 0, sJ: 0, Rkm: 60, isol: 25, Rc: 40, v: 120, snr: 6, B: 6, steer: 20, target: 20, two: true, delay: 0.12, dop: 0, js: 6, bits: 3 },
  cases: [
    { id: 'pulsed', label: 'Pulsed radar', set: {}, examples: [
      { id: 'leak', label: 'Duplexer leak and the limiter', controls: ['sP', 'isol'], set: { auto: false, sP: 7 } },
      { id: 'far', label: 'A far target: the echo in the noise', controls: ['sP', 'Rkm'], set: { auto: false, sP: 5, Rkm: 140 } },
      { id: 'det', label: 'The detector drops the phase', controls: ['sP'], set: { auto: false, sP: 11 } },
    ] },
    { id: 'coherent', label: 'Coherent pulse-Doppler', set: {}, examples: [
      { id: 'iq', label: 'IQ: the echo as a complex number', controls: ['sC'], set: { auto: false, sC: 11 } },
      { id: 'pc', label: 'Pulse compression', controls: ['sC', 'B'], set: { auto: false, sC: 13 } },
      { id: 'doppler', label: 'Doppler FFT across pulses', controls: ['sC', 'v'], set: { auto: false, sC: 14, v: -200 } },
    ] },
    { id: 'aesa', label: 'AESA', set: {}, examples: [
      { id: 'on', label: 'Beam on the target: in phase', controls: ['sA', 'steer', 'target'], set: { auto: false, sA: 12 } },
      { id: 'off', label: 'Target off the beam: they cancel', controls: ['sA', 'steer', 'target'], set: { auto: false, sA: 12, target: -15 } },
    ] },
    { id: 'esm', label: 'ESM receiver', set: {}, examples: [
      { id: 'pdw', label: 'Pulse descriptor words', controls: ['sE'], set: { auto: false, sE: 6 } },
      { id: 'dei', label: 'Deinterleaving two radars', controls: ['sE', 'two'], set: { auto: false, sE: 8 } },
    ] },
    { id: 'drfm', label: 'DRFM jammer', set: {}, examples: [
      { id: 'rgpo', label: 'Range-gate pull-off: delay the copy', controls: ['sJ', 'delay'], set: { auto: false, sJ: 9, delay: 0.3 } },
      { id: 'bits', label: 'One bit is not enough', controls: ['sJ', 'bits'], set: { auto: false, sJ: 3, bits: 1 } },
    ] },
  ],
  controls: [
    { title: 'Follow the signal', items: [
      { id: 'auto', label: 'Follow the signal block by block', type: 'check' },
      ...ORDER.map((a) => ({ id: SEL[a], label: 'Block', type: 'select', options: opts(a), show: (s) => s.case === a && !s.auto })),
    ] },
    { title: 'Scenario', items: [
      { id: 'Rkm', label: 'Target range', unit: 'km', min: 5, max: 150, step: 1, show: (s) => s.case === 'pulsed' },
      { id: 'isol', label: 'Duplexer isolation', unit: 'dB', min: 10, max: 60, step: 1, show: (s) => s.case === 'pulsed' },
      { id: 'Rc', label: 'Target range', unit: 'km', min: 5, max: 95, step: 1, show: (s) => s.case === 'coherent' },
      { id: 'v', label: 'Radial velocity', unit: 'm/s', min: -290, max: 290, step: 5, show: (s) => s.case === 'coherent' },
      { id: 'snr', label: 'Echo SNR per sample', unit: 'dB', min: -15, max: 20, step: 1, show: (s) => s.case === 'coherent' },
      { id: 'B', label: 'Chirp sweep', unit: '', min: 0, max: 12, step: 0.5, show: (s) => s.case === 'coherent' },
      { id: 'steer', label: 'Beam steering angle', unit: '°', min: -60, max: 60, step: 1, show: (s) => s.case === 'aesa' },
      { id: 'target', label: 'Target angle', unit: '°', min: -60, max: 60, step: 1, show: (s) => s.case === 'aesa' },
      { id: 'two', label: 'Two radars on the air', type: 'check', show: (s) => s.case === 'esm' },
      { id: 'delay', label: 'Playback delay Δt', unit: '× window', min: 0, max: 0.55, step: 0.01, show: (s) => s.case === 'drfm' },
      { id: 'dop', label: 'Doppler offset Δf', unit: 'cycles', min: -6, max: 6, step: 0.5, show: (s) => s.case === 'drfm' },
      { id: 'js', label: 'J/S', unit: 'dB', min: -10, max: 20, step: 1, show: (s) => s.case === 'drfm' },
      { id: 'bits', label: 'DRFM bits', unit: '', min: 1, max: 8, step: 1, show: (s) => s.case === 'drfm' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, time } = ctx;
    stage.controls.enableRotate = false;
    const bd = createBlocks(ctx, { labels: 90 });
    let M = null, P = null;

    const model = () => {
      const a = state.case;
      if (a === 'pulsed') { const m = pulsed({ Rkm: state.Rkm, isol: state.isol }); m.levels = { Pt: 90, Pr: m.levels.Pr, Pn: m.levels.Pn }; m.norm = 3 * Math.max(10 ** (m.snr / 20) * Math.SQRT2, 3); return m; }
      if (a === 'coherent') return coherent({ Rkm: state.Rc, v: state.v, snrDb: state.snr, B: state.B });
      if (a === 'aesa') return aesa({ steer: state.steer, target: state.target });
      if (a === 'esm') return esm({ show: state.two ? 2 : 1 });
      return { ...drfm({ delay: state.delay, dop: state.dop, js: state.js, bits: state.bits }), bits: state.bits };
    };
    // ports: 'id.side' → point; raw points pass through
    const port = (q) => { if (Array.isArray(q)) return mp(q); const [id, s] = q.split('.'); return P[id][s]; };

    function draw(k, f) {
      const A = ARCH[state.case], st = A.steps[k], lit = new Set(st.lit || [st.b]), prev = A.steps[k - 1];
      bd.begin(); P = {};
      for (const [id, [kind, at, o = {}]] of Object.entries(A.blocks)) P[id] = bd.block(kind, mp(at), { ...o, h: o.h > 0.8 ? o.h * SY : o.h, on: lit.has(id) });
      for (const fr of A.frames || []) bd.frame(mp(fr[0]), fr[1] * SX, fr[2] * SY, { dashed: true, label: fr[3] });
      let tokenPath = null;
      for (const [a, b, o = {}, ...via] of A.wires) {
        const pts = [port(a), ...via.map(mp), port(b)], onw = prev && typeof a === 'string' && a.split('.')[0] === prev.b && b.split?.('.')[0] === st.b;
        bd.wire(...pts, { ...o, on: onw }); if (onw) tokenPath = pts;
      }
      if (state.case === 'aesa') aesaTiles(st);
      A.steps.forEach((s, i) => { if (!s.tile) return; const cap = typeof s.cap === 'function' ? s.cap(M) : s.cap, sg = cut(s.sig(M), s.win); bd.wave(mp(s.tile), Array.isArray(sg) && typeof sg[0] === 'object' ? sg : Array.isArray(sg) ? sg : [sg], { on: i === k, w: s.w, h: s.h, color: s.color, norm: s.norm?.(M), cap }); });
      // the signal travelling along the wire into the lit block
      if (tokenPath && state.auto && f < 1) { const L = [0]; for (let i = 1; i < tokenPath.length; i++) L.push(L[i - 1] + Math.hypot(tokenPath[i][0] - tokenPath[i - 1][0], tokenPath[i][1] - tokenPath[i - 1][1])); const d = Math.min(1, f * 2) * L.at(-1); let j = 0; while (j < L.length - 2 && L[j + 1] < d) j++; const u = (d - L[j]) / (L[j + 1] - L[j] || 1); bd.token([tokenPath[j][0] + u * (tokenPath[j + 1][0] - tokenPath[j][0]), tokenPath[j][1] + u * (tokenPath[j + 1][1] - tokenPath[j][1])]); }
      bd.end();
    }
    // AESA: one tile per element (as received, or as transmitted) and one after each module (after the phase shift)
    function aesaTiles(st) {
      const rows = ARCH.aesa.rows, show = st.tiles;
      rows.forEach((y, m) => {
        bd.wave(mp([-3.45, y + 0.2]), (show === 'tx' ? M.sig.tx : M.sig.before)[m], { w: 0.44, h: 0.2, color: show === 'tx' ? '--c-I' : '--c-B', on: show === 'before' || show === 'tx', zero: false });
        bd.wave(mp([-2.2, y + 0.2]), M.sig.after[m], { w: 0.44, h: 0.2, color: '--c-v', on: show === 'after', zero: false });
        bd.text(`${fmt(M.shifts[m], 2)}°`, mp([-2.8, y - 0.21]));
      });
      bd.wave(mp([-0.6, 0.55]), M.sig.sum, { w: 0.7, h: 0.5, norm: 1, color: '--c-v', on: st.b === 'bf' && show === 'after', cap: `sum: ${fmt(M.gain * 100, 2)} %` });
    }

    return {
      changed() { M = model(); ctx.setClock(state.auto ? ARCH[state.case].steps.length * 1.6 : 0); },
      update() {
        const A = ARCH[state.case], n = A.steps.length, seg = 1.6;
        const k = state.auto ? Math.min(n - 1, Math.floor(time.t / seg)) : Math.min(n - 1, state[SEL[state.case]]), f = state.auto ? (time.t % seg) / seg : 1;
        draw(k, f); const st = A.steps[k];
        hud.set('a', `${k + 1}/${n} · ${st.title}`); hud.set('b', st.what);
        const c = state.case;
        if (c === 'pulsed') {
          const lv = A.steps.map((s) => (s.dbm ? s.dbm(M) : NaN)), gain = A.steps.map((s) => (s.dbm ? s.dbm(M) - M.levels.Pr : NaN)), noise = gain.map((g, i) => (i >= 5 && Number.isFinite(g) ? M.levels.Pn + g : NaN));
          hud.set('c', `echo ${fmt(M.levels.Pr)} dBm vs noise ${fmt(M.levels.Pn)} dBm: SNR ${fmt(M.snr, 2)} dB · leak into the receiver ${fmt(M.leakDbm, 2)} dBm${M.leakDbm > 30 ? ' — the limiter must clip it' : ''}`, M.snr < 10 ? 'bad' : '');
          plots.aux.draw({ xlim: [0, n - 1], cursor: k, xlabel: 'block (signal path order)', series: [{ x: lv.map((_, i) => i), y: lv, color: '--c-B', label: 'signal power (dBm)' }, { x: lv.map((_, i) => i), y: noise, color: '--c-ref', dash: [4, 3], label: 'noise power (dBm)' }] });
        } else if (c === 'coherent') {
          hud.set('c', `Doppler ${fmt(M.fd, 2)} cycles per pulse → peak in bin ${M.bin} of ${PULSES} (v = ${state.v} m/s) · range peak at ${fmt(M.peak / 360 * 100, 3)} % of the window`);
          const ks = M.sig.cells.map((_, i) => i);
          plots.aux.draw({ xlim: [0, PULSES - 1], xlabel: 'pulse number in the dwell', series: [{ x: ks, y: M.sig.cells.map((z) => z[0]), color: '--c-B', label: 'I of the target cell' }, { x: ks, y: M.sig.cells.map((z) => z[1]), color: '--c-I', label: 'Q: they rotate at the Doppler frequency' }] });
        } else if (c === 'aesa') {
          hud.set('c', `beam at ${state.steer}°, target at ${state.target}°: the sum is ${fmt(M.gain * 100, 2)} % of the in-phase maximum (${fmt(20 * Math.log10(Math.max(M.gain, 1e-4)), 2)} dB)`, M.gain > 0.7 ? 'good' : 'bad');
          const th = Array.from({ length: 241 }, (_, i) => -90 + i * 0.75);
          plots.aux.draw({ xlim: [-90, 90], cursor: state.target, xlabel: 'angle (°)', ylim: [-40, 1], series: [{ x: th, y: th.map((t) => Math.max(-40, 20 * Math.log10(Math.max(M.af(t), 1e-4)))), color: '--c-v', label: 'array pattern (dB): the beam the phase shifters made' }] });
        } else if (c === 'esm') {
          hud.set('c', `${M.pdw.length} pulses intercepted; PRIs found: ${M.pri.filter(Boolean).map((p) => fmt(p * 100, 2)).join(', ')} (% of the window)`);
          plots.aux.draw({ xlim: [0, 1], xlabel: 'time of arrival (window)', ylim: [0, 11], series: [{ x: [0, 1], y: [NaN, NaN], color: '--c-B', label: 'PDWs: frequency (GHz) per pulse — blue search radar, orange fire control' }], markers: M.pdw.map((p) => ({ x: p.toa, y: p.f, color: p.f > 5 ? '--c-I' : '--c-B' })) });
        } else {
          hud.set('c', `copy delayed by ${fmt(state.delay * 100, 2)} % of the window, J/S = ${state.js} dB${state.js > 0 ? ': the copy is stronger, the range gate follows it' : ': weaker than the skin echo — ignored'}`, state.js > 0 ? 'good' : '');
          const ts = M.sig.victim.map((_, i) => i / 360);
          plots.aux.draw({ xlim: [0, 1], xlabel: 'time in the radar\'s range window', series: [{ x: ts, y: M.sig.victim, color: '--c-B', width: 1, label: 'radar receiver input: skin echo, then the jammer copy' }] });
        }
      },
      theme() { bd.theme(); },
    };
  },
};
