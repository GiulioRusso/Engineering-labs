// Op-amps: the virtual short (inverting, non-inverting, follower), what a finite gain costs, bandwidth
// versus slew rate, DC errors, stability (phase margin and ringing), and the Sallen-Key filter.
import { createChart } from '../../lib/viz/chart.js';
import { createSchematic } from '../../lib/viz/schematic.js';
import { RAIL, idealGain, finiteGain, speed, dcError, loop, stepResponse, sallenKey } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TR = [0.3, 0.55, 4.3, 2.0], BR = [0.3, -2.35, 4.3, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const kOhm = (r) => (r >= 1e6 ? `${fmt(r / 1e6)} MΩ` : r >= 1000 ? `${fmt(r / 1000)} kΩ` : `${fmt(r)} Ω`);
const hz = (f) => (f >= 1e6 ? `${fmt(f / 1e6)} MHz` : f >= 1e3 ? `${fmt(f / 1e3)} kHz` : `${fmt(f)} Hz`);
const dB = (x) => 20 * Math.log10(Math.abs(x));

// op-amp with its feedback network; cfg 'inv' | 'non' | 'fol'
function drawAmp(sch, cfg, r1 = 'R1', r2 = 'R2') {
  const P = sch.opamp([-2.0, 0], 0.6), n = P.inN[1], p = P.inP[1];
  sch.wire(P.out, [-0.6, 0]).text('v_out', [-0.6, 0.25]).dot([-0.6, 0]);
  if (cfg === 'inv') {
    sch.dot([-4.5, n]).text('v_in', [-4.5, n + 0.25]).resistor([-4.5, n], [-3.1, n], r1).wire([-3.1, n], P.inN).dot([-3.1, n]).wire([-3.1, n], [-3.1, 1.3]).resistor([-3.1, 1.3], [-1.0, 1.3], r2).wire([-1.0, 1.3], [-1.0, 0])
      .wire(P.inP, [-2.9, p], [-2.9, -1.0]).ground([-2.9, -1.0]).text('virtual ground: 0 V', [-3.3, -0.45]);
  } else {
    sch.wire(P.inP, [-2.8, p], [-2.8, -1.2]).dot([-2.8, -1.2]).text('v_in', [-2.8, -1.45]);
    if (cfg === 'non') sch.wire(P.inN, [-3.2, n]).dot([-3.2, n]).resistor([-3.2, n], [-4.4, n], r1).ground([-4.4, n]).wire([-3.2, n], [-3.2, 1.3]).resistor([-3.2, 1.3], [-1.0, 1.3], r2).wire([-1.0, 1.3], [-1.0, 0]);
    else sch.wire(P.inN, [-3.0, n], [-3.0, 1.3], [-1.0, 1.3], [-1.0, 0]);
  }
  return P;
}

export default {
  id: 'opamps', title: 'Op-amps', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  defaults: { cfg: 'inv', R1: 10000, R2: 100000, vin: 0.5, A: 60, G: 11, Gsp: 10, Gdc: 101, GBW: 1, SR: 0.5, Vp: 0.1, f: 10, Vos: 2, Ib: 100, comp: false, f2: 2, Gs: 1, R: 10000, C: 10, K: 1.586 },
  cases: [
    { id: 'ideal', label: 'Virtual short', set: {}, examples: [
      { id: 'non', label: 'Non-inverting: 1 + R2/R1', controls: ['cfg', 'vin'], set: { cfg: 'non' } },
      { id: 'fol', label: 'Follower: gain 1', controls: ['cfg'], set: { cfg: 'fol' } },
      { id: 'clip', label: 'Too much input: rails', controls: ['vin'], set: { vin: 2 } },
    ] },
    { id: 'finite', label: 'Finite gain', set: {}, examples: [
      { id: 'weak', label: 'A = 40 dB: 9% error', controls: ['A'], set: { A: 40 } },
      { id: 'strong', label: 'A = 100 dB: 0.01%', controls: ['A'], set: { A: 100 } },
    ] },
    { id: 'speed', label: 'Bandwidth and slew', set: {}, examples: [
      { id: 'bw', label: 'Too fast for the bandwidth', controls: ['f'], set: { f: 200, Vp: 0.01 } },
      { id: 'slew', label: 'Big and fast: slew-limited', controls: ['Vp'], set: { Vp: 1, f: 30 } },
    ] },
    { id: 'dc', label: 'Offset and bias', set: {}, examples: [
      { id: 'comp', label: 'Bias-current compensation', controls: ['comp'], set: { comp: true } },
      { id: 'g1000', label: 'Gain 1000: millivolts become volts', controls: ['Gdc'], set: { Gdc: 1000 } },
    ] },
    { id: 'stability', label: 'Stability', set: {}, examples: [
      { id: 'ring', label: 'Low phase margin: ringing', controls: ['f2'], set: { f2: 0.3 } },
      { id: 'gain10', label: 'Gain 10: stable again', controls: ['Gs'], set: { f2: 0.3, Gs: 10 } },
    ] },
    { id: 'sallen', label: 'Sallen-Key filter', set: {}, examples: [
      { id: 'bessel', label: 'K = 1: gentle (Q = 0.5)', controls: ['K'], set: { K: 1 } },
      { id: 'peak', label: 'K = 2.5: peaked (Q = 2)', controls: ['K'], set: { K: 2.5 } },
    ] },
  ],
  controls: [
    { title: 'Circuit', show: (s) => s.case === 'ideal', items: [
      { id: 'cfg', label: 'Configuration', type: 'segmented', options: [['inv', 'Inverting'], ['non', 'Non-inv.'], ['fol', 'Follower']] }, { id: 'R1', label: 'R1', unit: 'Ω', min: 1000, max: 100000, log: true, show: (s) => s.cfg !== 'fol' }, { id: 'R2', label: 'R2', unit: 'Ω', min: 1000, max: 1e6, log: true, show: (s) => s.cfg !== 'fol' }, { id: 'vin', label: 'Input amplitude', unit: 'V', min: 0.01, max: 5, log: true },
    ] },
    { title: 'Op-amp', show: (s) => s.case === 'finite', items: [{ id: 'A', label: 'Open-loop gain', unit: 'dB', min: 20, max: 120, step: 1 }, { id: 'G', label: 'Ideal gain 1 + R2/R1', unit: '', min: 1, max: 1000, log: true }] },
    { title: 'Speed', show: (s) => s.case === 'speed', items: [
      { id: 'Gsp', label: 'Closed-loop gain', unit: '', min: 1, max: 1000, log: true }, { id: 'GBW', label: 'Gain–bandwidth', unit: 'MHz', min: 0.1, max: 100, log: true }, { id: 'SR', label: 'Slew rate', unit: 'V/µs', min: 0.1, max: 50, log: true }, { id: 'Vp', label: 'Input amplitude', unit: 'V', min: 0.001, max: 1, log: true }, { id: 'f', label: 'Frequency', unit: 'kHz', min: 0.1, max: 1000, log: true },
    ] },
    { title: 'Errors', show: (s) => s.case === 'dc', items: [
      { id: 'Gdc', label: 'Noise gain 1 + R2/R1', unit: '', min: 1, max: 1000, log: true }, { id: 'Vos', label: 'Offset V_os', unit: 'mV', min: 0, max: 10, step: 0.1 }, { id: 'Ib', label: 'Bias current', unit: 'nA', min: 0, max: 1000, step: 1 }, { id: 'comp', label: 'Compensating resistor', type: 'check' },
    ] },
    { title: 'Loop', show: (s) => s.case === 'stability', items: [{ id: 'f2', label: 'Second pole', unit: 'MHz', min: 0.05, max: 20, log: true }, { id: 'Gs', label: 'Closed-loop gain', unit: '', min: 1, max: 100, log: true }] },
    { title: 'Filter', show: (s) => s.case === 'sallen', items: [{ id: 'K', label: 'Gain K', unit: '', min: 1, max: 2.95, step: 0.005 }, { id: 'R', label: 'R', unit: 'Ω', min: 1000, max: 100000, log: true }, { id: 'C', label: 'C', unit: 'nF', min: 1, max: 100, log: true }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), sch = createSchematic(ctx, { labelPool: 30 });
    return {
      changed() { ctx.setClock(state.case === 'ideal' ? 4 : 0); },
      update() {
        const c = state.case; sch.begin();
        if (c === 'ideal') {
          const G = idealGain(state.cfg, state.R1, state.R2), t = time.t % 4, ts = lin(0, 4, 400), sin = (x) => state.vin * Math.sin(Math.PI * x), out = (v) => Math.max(-RAIL, Math.min(RAIL, G * v));
          drawAmp(sch, state.cfg, `R1 ${kOhm(state.R1)}`, `R2 ${kOhm(state.R2)}`);
          const M = Math.min(13, Math.max(Math.abs(G) * state.vin, state.vin) * 1.15); tr.range([0, 4], [-M, M]); tr.titles('time (one period = 2)', 'v_in (grey) and v_out (blue), V');
          tr.line('i', ts, ts.map(sin), { color: '--c-ref', width: 1.2 }); tr.line('o', ts, ts.map((x) => out(sin(x))), { color: '--c-B' }); tr.dots('n', [t], [out(sin(t))], { color: '--accent', size: 10 });
          const W = Math.max(state.vin * 1.3, RAIL / Math.abs(G) * 1.3), vi = lin(-W, W, 300); br.range([-W, W], [-13, 13]); br.titles('v_in (V)', 'v_out (V): slope = gain, flat = rails ±12 V');
          br.line('tf', vi, vi.map(out), { color: '--c-B' }); br.dots('n', [sin(t)], [out(sin(t))], { color: '--accent', size: 11 });
          const clip = Math.abs(G) * state.vin > RAIL;
          hud.set('a', `gain ${fmt(G)} (${state.cfg === 'inv' ? '−R2/R1' : state.cfg === 'non' ? '1 + R2/R1' : 'follower'})`, clip ? 'bad' : 'good');
          hud.set('b', state.cfg === 'inv' ? `the − input is held at 0 V: i = v_in/R1 = ${fmt(state.vin / state.R1 * 1e6)} µA, all of it flows on through R2` : 'the − input copies the + input; no current enters the op-amp');
          hud.set('c', clip ? 'the output cannot go past the supply rails: clipped' : `input resistance ${state.cfg === 'inv' ? kOhm(state.R1) : 'practically infinite'}`);
          plots.aux.draw({ xlim: [0, 4], series: [{ x: ts, y: ts.map((x) => out(sin(x)) / -1e5), color: '--c-I', label: 'v₊ − v₋ = v_out / A (µV-scale, A = 10⁵): the "virtual short"' }] });
        } else if (c === 'finite') {
          const A = 10 ** (state.A / 20), b = 1 / state.G, Acl = finiteGain(A, b), err = (Acl / state.G - 1) * 100;
          drawAmp(sch, 'non', 'R1', `R2 = ${fmt(state.G - 1)}·R1`); sch.text(`A = ${fmt(state.A)} dB`, [-1.6, -1.0]);
          const la = lin(1, 6, 200); tr.range([1, 6], [0, state.G * 1.15]); tr.titles('log₁₀ A', 'closed-loop gain (V/V): approaches 1 + R2/R1 (dashed)');
          tr.line('g', la, la.map((l) => finiteGain(10 ** l, b)), { color: '--c-B' }); tr.line('i', [1, 6], [state.G, state.G], { color: '--ink-dim', dashed: true, width: 1.2 }); tr.dots('q', [Math.log10(A)], [Acl], { color: '--accent', size: 12 });
          br.range([1, 6], [-4, 2]); br.titles('log₁₀ A', 'log₁₀ |gain error| (%): one decade per decade of A');
          br.line('e', la, la.map((l) => Math.log10(100 / (1 + 10 ** l * b))), { color: '--c-north' }); br.dots('q', [Math.log10(A)], [Math.log10(Math.abs(err))], { color: '--accent', size: 11 });
          hud.set('a', `gain ${fmt(Acl, 5)} instead of ${fmt(state.G)}: ${fmt(err, 3)}% error`, Math.abs(err) < 0.1 ? 'good' : 'bad'); hud.set('b', `loop gain Aβ = ${fmt(A * b)}; error = −1/(1 + Aβ)`);
          hud.set('c', `v₊ − v₋ = v_out/A = ${fmt(1e6 / A)} µV per volt out: tiny, but not zero`);
          const gs = lin(0, 3, 100); plots.aux.draw({ xlim: [0, 3], cursor: Math.log10(state.G), series: [{ x: gs, y: gs.map((l) => Math.abs(finiteGain(A, 10 ** -l) / 10 ** l - 1) * 100), color: '--c-north', label: 'error (%) vs log₁₀ ideal gain, for this A' }] });
        } else if (c === 'speed') {
          const S = speed({ G: state.Gsp, GBW: state.GBW * 1e6, SR: state.SR * 1e6, Vp: state.Vp, f: state.f * 1e3 }), us = S.t.map((x) => x * 1e6), Rf = state.Gsp - 1;
          drawAmp(sch, state.Gsp > 1.001 ? 'non' : 'fol', 'R1', `R2 = ${fmt(Rf)}·R1`); sch.text(`GBW ${fmt(state.GBW)} MHz · SR ${fmt(state.SR)} V/µs`, [-1.5, -1.0]);
          const M = Math.min(13, state.Gsp * state.Vp * 1.2); tr.range([0, us[us.length - 1]], [-M, M]); tr.titles('t (µs)', 'ideal G·v_in (grey) and real output (blue)');
          tr.line('x', us, S.x.map((v) => Math.max(-13, Math.min(13, v))), { color: '--c-ref', width: 1.2 }); tr.line('y', us, S.y, { color: '--c-B' });
          const lf = lin(2, 8, 200), ol = (f) => Math.min(100, dB(state.GBW * 1e6 / f)); br.range([2, 8], [-20, 100]); br.titles('log₁₀ f (Hz)', 'gain (dB): open loop (grey), closed loop (blue)');
          br.line('o', lf, lf.map((l) => ol(10 ** l)), { color: '--c-ref', width: 1.2 }); br.line('c', lf, lf.map((l) => dB(state.Gsp / Math.hypot(1, 10 ** l / S.f3))), { color: '--c-B' }); br.dots('f', [Math.log10(state.f * 1e3)], [dB(state.Gsp / Math.hypot(1, state.f * 1e3 / S.f3))], { color: '--accent', size: 11 });
          const need = 2 * Math.PI * state.f * 1e3 * state.Gsp * state.Vp, slew = need > state.SR * 1e6, bw = state.f * 1e3 > S.f3 / 2;
          hud.set('a', `bandwidth = GBW / G = ${hz(S.f3)}${bw ? ' — signal near or above it: attenuated and delayed' : ''}`, bw ? 'bad' : 'good');
          hud.set('b', `the output needs ${fmt(need / 1e6)} V/µs, the op-amp can give ${fmt(state.SR)} V/µs${slew ? ' — slew-limited: sine becomes triangle' : ''}`, slew ? 'bad' : 'good');
          hud.set('c', `full-power bandwidth for this amplitude: ${hz(S.fpbw)}`);
          plots.aux.draw({ xlim: [0, us[us.length - 1]], series: [{ x: us, y: us.map((_, i) => (i ? (S.y[i] - S.y[i - 1]) / ((S.t[i] - S.t[i - 1]) * 1e6) : 0)), color: '--c-I', label: 'output slope dv/dt (V/µs): flat-topped when slewing' }] });
        } else if (c === 'dc') {
          const R1 = 1000, R2 = (state.Gdc - 1) * R1, D = dcError({ Vos: state.Vos * 1e-3, Ib: state.Ib * 1e-9, Ios: state.Ib * 1e-10, R1, R2, comp: state.comp });
          const P = sch.opamp([-2.0, 0], 0.6), n = P.inN[1], p = P.inP[1];
          sch.wire(P.out, [-0.6, 0]).text('error out', [-0.6, 0.25]).wire(P.inN, [-3.2, n]).dot([-3.2, n]).resistor([-3.2, n], [-4.4, n], `R1 ${kOhm(R1)}`).ground([-4.4, n]).wire([-3.2, n], [-3.2, 1.3]).resistor([-3.2, 1.3], [-1.0, 1.3], `R2 ${kOhm(R2)}`).wire([-1.0, 1.3], [-1.0, 0]);
          if (state.comp) sch.wire(P.inP, [-2.8, p]).resistor([-2.8, p], [-2.8, -1.4], 'R1‖R2').ground([-2.8, -1.4]); else sch.wire(P.inP, [-2.8, p], [-2.8, -1.4]).ground([-2.8, -1.4]);
          sch.text(`V_os ${state.Vos} mV`, [-2.0, -0.85]);
          const parts = [D.eV * 1e3, D.eI * 1e3, D.total * 1e3]; tr.range([0.5, 3.5], [0, Math.max(...parts, 1) * 1.2]); tr.titles('offset · bias current · total', 'output error (mV) with the input grounded');
          tr.stems('b', [1, 2, 3], parts, { color: '--c-north', width: 10 });
          const gs = lin(0, 3, 100); br.range([0, 3], [-1, 4]); br.titles('log₁₀ noise gain', 'log₁₀ output error (mV)');
          br.line('e', gs, gs.map((l) => Math.log10(1e3 * dcError({ Vos: state.Vos * 1e-3, Ib: state.Ib * 1e-9, Ios: state.Ib * 1e-10, R1, R2: (10 ** l - 1) * R1, comp: state.comp }).total + 1e-6)), { color: '--c-north' }); br.dots('q', [Math.log10(state.Gdc)], [Math.log10(D.total * 1e3 + 1e-6)], { color: '--accent', size: 11 });
          hud.set('a', `output error ${fmt(D.total * 1e3)} mV with nothing at the input`, D.total > 0.1 ? 'bad' : ''); hud.set('b', `offset: V_os × (1 + R2/R1) = ${fmt(state.Vos)} mV × ${fmt(D.ng)} = ${fmt(D.eV * 1e3)} mV`);
          hud.set('c', state.comp ? `bias: with R1‖R2 at + the two bias currents cancel, leaving the offset current: ${fmt(D.eI * 1e3)} mV` : `bias: I_B flows through R2 → ${fmt(D.eI * 1e3)} mV`);
          plots.aux.draw({ xlim: [0, 10], cursor: state.Vos, series: [{ x: lin(0, 10, 50), y: lin(0, 10, 50).map((v) => v * D.ng / 1e3), color: '--c-north', label: 'output error (V) vs V_os (mV) at this gain' }] });
        } else if (c === 'stability') {
          const beta = 1 / state.Gs, L = loop({ f2: state.f2 * 1e6, beta }), T = Math.max(4e-6, 12 / (2 * Math.PI * Math.min(L.fc || 1e6, state.f2 * 1e6))), S = stepResponse({ f2: state.f2 * 1e6, beta, T }), us = S.t.map((x) => x * 1e6);
          drawAmp(sch, state.Gs > 1.001 ? 'non' : 'fol', 'R1', `R2 = ${fmt(state.Gs - 1)}·R1`); sch.text(`poles: 10 Hz and ${fmt(state.f2)} MHz`, [-1.5, -1.0]);
          const lf = lin(0, 8, 300); tr.range([0, 8], [-40, 100]); tr.titles('log₁₀ f (Hz)', '|Aβ| dB (blue) · (phase + 180°)/2 (orange)');
          tr.line('m', lf, lf.map((l) => dB(L.mag(10 ** l))), { color: '--c-B' }); tr.line('p', lf, lf.map((l) => (L.ph(10 ** l) + 180) / 2), { color: '--c-I', width: 1.4 }); tr.line('z', [0, 8], [0, 0], { color: '--ink-dim', dashed: true, width: 1 }); if (Number.isFinite(L.fc)) tr.dots('c', [Math.log10(L.fc), Math.log10(L.fc)], [0, L.pm / 2], { color: '--accent', size: 11 });
          br.range([0, us[us.length - 1]], [0, Math.max(1.6, ...S.y) * 1.05]); br.titles('t (µs)', 'step response (÷ ideal gain)'); br.line('s', us, S.y, { color: '--c-B' }); br.line('one', [0, us[us.length - 1]], [1, 1], { color: '--ink-dim', dashed: true, width: 1 });
          const os = (Math.max(...S.y) - 1) * 100;
          hud.set('a', `phase margin ${fmt(L.pm, 2)}° at ${hz(L.fc)}`, L.pm > 45 ? 'good' : 'bad'); hud.set('b', `overshoot ${fmt(Math.max(0, os), 2)}%: the less margin, the more ringing`);
          hud.set('c', 'margin = how far the phase still is from −180° when the loop gain falls to 1 (0 dB)');
          const fs2 = lin(-1.3, 1.3, 100); plots.aux.draw({ xlim: [-1.3, 1.3], cursor: Math.log10(state.f2), series: [{ x: fs2, y: fs2.map((l) => loop({ f2: 10 ** l * 1e6, beta }).pm), color: '--c-B', label: 'phase margin (°) vs log₁₀ second pole (MHz)' }] });
        } else {
          const F = sallenKey({ R: state.R, C: state.C * 1e-9, K: state.K }), P = sch.opamp([-1.5, 0], 0.6), p = P.inP[1];
          sch.dot([-4.6, p]).text('v_in', [-4.6, p + 0.25]).resistor([-4.6, p], [-3.6, p], 'R').dot([-3.5, p]).wire([-3.6, p], [-3.5, p]).resistor([-3.5, p], [-2.5, p], 'R').wire([-2.5, p], P.inP).dot([-2.4, p]).capacitor([-2.4, p], [-2.4, -1.4], 'C').ground([-2.4, -1.4])
            .wire([-3.5, p], [-3.5, 1.3]).capacitor([-3.5, 1.3], [-0.7, 1.3], 'C').wire([-0.7, 1.3], [-0.7, 0]).wire(P.out, [-0.5, 0]).text('v_out', [-0.5, 0.25]).wire(P.inN, [-2.3, P.inN[1]], [-2.3, 0.75]).text(`gain K = ${fmt(state.K)}`, [-1.4, -0.85]);
          const lf = lin(1, 6, 300); tr.range([1, 6], [-60, 30]); tr.titles('log₁₀ f (Hz)', '|H| (dB): −40 dB/decade past f₀');
          tr.line('h', lf, lf.map((l) => dB(F.H(10 ** l))), { color: '--c-B' }); tr.dots('f0', [Math.log10(F.f0)], [dB(F.H(F.f0))], { color: '--accent', size: 11 });
          const W = F.w0 * 1.2, X = W * 4.3; br.range([-X * 0.82, X * 0.18], [-W, W]); br.titles('σ (rad/s)', 'jω (rad/s): the two poles (left half = stable)');
          br.line('ax', [0, 0], [-W, W], { color: '--ink-dim', width: 1 }); br.line('c', lin(0, 2 * Math.PI, 100).map((a) => F.w0 * Math.cos(a)), lin(0, 2 * Math.PI, 100).map((a) => F.w0 * Math.sin(a)), { color: '--c-ref', dashed: true, width: 1 }); br.dots('p', F.poles.map((q) => q[0]), F.poles.map((q) => q[1]), { color: '--c-north', size: 12 });
          hud.set('a', `f₀ = 1/(2πRC) = ${hz(F.f0)}, Q = 1/(3 − K) = ${fmt(F.Q)}`, F.Q > 2 ? 'bad' : 'good'); hud.set('b', F.Q > 0.71 ? `peaking: ${fmt(dB(F.Q))} dB at f₀` : F.Q > 0.7 ? 'Butterworth: the flattest possible response' : 'no peaking: gentle roll-off, clean step response');
          hud.set('c', 'the capacitor to the output is positive feedback: more K, poles move toward the jω axis (K = 3: oscillator)');
          const ts = lin(0, 12 / F.w0 * Math.max(1, F.Q), 400), z = 1 / (2 * F.Q), wd = F.w0 * Math.sqrt(Math.max(1 - z * z, 1e-9));
          plots.aux.draw({ xlim: [0, ts[ts.length - 1] * 1e3], series: [{ x: ts.map((x) => x * 1e3), y: ts.map((x) => (z < 1 ? 1 - Math.exp(-z * F.w0 * x) * (Math.cos(wd * x) + z / Math.sqrt(1 - z * z) * Math.sin(wd * x)) : 1 - Math.exp(-F.w0 * x) * (1 + F.w0 * x))), color: '--c-B', label: 'step response (÷K) vs t (ms)' }] });
        }
        sch.end();
      },
      theme() { tr.theme(); br.theme(); sch.theme(); },
    };
  },
};
