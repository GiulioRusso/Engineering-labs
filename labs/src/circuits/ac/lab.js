// AC circuits: a sinusoid as a rotating phasor (and two of them adding), the phasors of a series RLC as
// helices in 3D, impedance as vectors, series resonance, the parallel tank, AC power and RC filters.
// In the circuit drawings the charges swing back and forth (slowed down) with the current's amplitude.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createSchematic } from '../../lib/viz/schematic.js';
import { seriesZ, resonance, tankZ, acPower, rcFilter, cabs, carg } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TR = [0.3, 0.55, 4.3, 2.0], BR = [0.3, -2.35, 4.3, 2.0], SQ = [-4.6, -2.0, 4.0, 4.0], WV = [0.3, -2.0, 4.3, 4.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const ohm = (r) => (r >= 1e6 ? `${fmt(r / 1e6)} MΩ` : r >= 1000 ? `${fmt(r / 1000)} kΩ` : `${fmt(r)} Ω`);
const hz = (f) => (f >= 1e6 ? `${fmt(f / 1e6)} MHz` : f >= 1e3 ? `${fmt(f / 1e3)} kHz` : `${fmt(f)} Hz`);
const deg = (r) => `${fmt(r * 180 / Math.PI)}°`;
const dB = (x) => 20 * Math.log10(x);
const X0 = -4.3, X1 = -1.2, Y = 1.4;

export default {
  id: 'ac', title: 'AC circuits', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [7, -7.5, 4.5], target: [0.5, 0, 0] } },
  camOf: (s) => (s.case === 'helix' ? 'iso' : 'top'),
  defaults: { A1: 1, p1: 0, A2: 0.7, p2: 90, two: false, fr: 1, R: 10, Lm: 10, Cu: 1, Rp: 1000, phi: 40, RCk: 1, Cf: 100, f: 1000, high: false },
  cases: [
    { id: 'phasor', label: 'Phasors', set: {}, examples: [
      { id: 'sum', label: 'Adding two sines = adding arrows', controls: ['two', 'p2'], set: { two: true } },
      { id: 'cancel', label: 'Opposite phase: they cancel', controls: ['p2'], set: { two: true, A2: 1, p2: 180 } },
    ] },
    { id: 'helix', label: 'Phasors in 3D', set: {}, examples: [
      { id: 'res', label: 'At resonance: V and I in step', controls: ['fr'], set: { fr: 1 } },
      { id: 'low', label: 'Below resonance: current leads', controls: ['fr'], set: { fr: 0.5 } },
    ] },
    { id: 'impedance', label: 'Impedance', set: {}, examples: [
      { id: 'low', label: 'Low frequency: C dominates', controls: ['fr'], set: { fr: 0.3 } },
      { id: 'high', label: 'High frequency: L dominates', controls: ['fr'], set: { fr: 3 } },
    ] },
    { id: 'resonance', label: 'Series resonance', set: {}, examples: [
      { id: 'sharp', label: 'Small R: sharp, high Q', controls: ['R'], set: { R: 2 } },
      { id: 'flat', label: 'Large R: broad', controls: ['R'], set: { R: 60 } },
    ] },
    { id: 'tank', label: 'Parallel tank', set: {}, examples: [
      { id: 'off', label: 'Off resonance', controls: ['fr'], set: { fr: 1.5 } },
    ] },
    { id: 'power', label: 'AC power', set: {}, examples: [
      { id: 'reactive', label: 'φ = 90°: no real power at all', controls: ['phi'], set: { phi: 90 } },
      { id: 'resistive', label: 'φ = 0: all real', controls: ['phi'], set: { phi: 0 } },
    ] },
    { id: 'filter', label: 'RC filter', set: {}, examples: [
      { id: 'high', label: 'High-pass', controls: ['high'], set: { high: true } },
      { id: 'above', label: 'Ten times above f_c', controls: ['f'], set: { f: 16000 } },
    ] },
  ],
  controls: [
    { title: 'Phasors', show: (s) => s.case === 'phasor', items: [
      { id: 'A1', label: 'Amplitude 1', unit: '', min: 0.1, max: 1.5, step: 0.01 }, { id: 'p1', label: 'Phase 1', unit: '°', min: -180, max: 180, step: 1 }, { id: 'two', label: 'Add a second sine', type: 'check' },
      { id: 'A2', label: 'Amplitude 2', unit: '', min: 0.1, max: 1.5, step: 0.01, show: (s) => s.two }, { id: 'p2', label: 'Phase 2', unit: '°', min: -180, max: 180, step: 1, show: (s) => s.two },
    ] },
    { title: 'Series RLC', show: (s) => ['helix', 'impedance', 'resonance'].includes(s.case), items: [
      { id: 'fr', label: 'Frequency f / f₀', unit: '', min: 0.1, max: 10, log: true }, { id: 'R', label: 'R', unit: 'Ω', min: 1, max: 100, log: true }, { id: 'Lm', label: 'L', unit: 'mH', min: 1, max: 100, log: true }, { id: 'Cu', label: 'C', unit: 'µF', min: 0.1, max: 10, log: true },
    ] },
    { title: 'Tank', show: (s) => s.case === 'tank', items: [{ id: 'fr', label: 'Frequency f / f₀', unit: '', min: 0.1, max: 10, log: true }, { id: 'Rp', label: 'R', unit: 'Ω', min: 100, max: 10000, log: true }, { id: 'Lm', label: 'L', unit: 'mH', min: 1, max: 100, log: true }, { id: 'Cu', label: 'C', unit: 'µF', min: 0.1, max: 10, log: true }] },
    { title: 'Load', show: (s) => s.case === 'power', items: [{ id: 'phi', label: 'Phase of the current φ', unit: '°', min: -90, max: 90, step: 1 }] },
    { title: 'Filter', show: (s) => s.case === 'filter', items: [{ id: 'high', label: 'High-pass (output across R)', type: 'check' }, { id: 'f', label: 'Frequency', unit: 'Hz', min: 10, max: 100000, log: true }, { id: 'RCk', label: 'R', unit: 'kΩ', min: 0.1, max: 10, log: true }, { id: 'Cf', label: 'C', unit: 'nF', min: 1, max: 1000, log: true }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), sq = createChart(ctx, { box: SQ, grid: true }), wv = createChart(ctx, { box: WV }), sch = createSchematic(ctx, { labelPool: 30 }), charts = [tr, br, sq, wv];
    const hv = createCurve(stage, { max: 2000, width: 3, color: '--c-B' }), hi = createCurve(stage, { max: 2000, width: 3, color: '--c-I' }), sh = createCurve(stage, { max: 4000, width: 1.3, color: '--c-ref' }), ax3 = createCurve(stage, { max: 200, width: 1.2, color: '--ink-dim' }), arr = createCurve(stage, { max: 40, width: 4, color: '--accent' }), all3 = [hv, hi, sh, ax3, arr];
    const lbl = ['time →', 'Re', 'Im'].map((t) => { const l = ctx.label(t, 'tick'); scene.add(l); return l; });
    const P = () => ({ R: state.R, L: state.Lm * 1e-3, C: state.Cu * 1e-6 });
    // series loop: R and L on the top wire, C on the right; charges swing with amplitude a and phase ph
    const seriesLoop = (Rv, Lv, Cv, src, a, ph) => {
      sch.source([X0, -0.3], [X0, 0.3], src, true).wire([X0, 0.3], [X0, Y], [-4.0, Y]).resistor([-4.0, Y], [-3.0, Y], Rv).wire([-3.0, Y], [-2.7, Y]).inductor([-2.7, Y], [-1.7, Y], Lv).wire([-1.7, Y], [X1, Y], [X1, 0.5]).capacitor([X1, 0.5], [X1, -0.5], Cv).wire([X1, -0.5], [X1, -Y], [X0, -Y], [X0, -0.3]);
      const q = a * Math.sin(2 * Math.PI * 0.5 * time.t + ph); sch.flow([[X0, 0.3], [X0, Y], [-4.0, Y]], q).flow([[-3.0, Y], [-2.7, Y]], q).flow([[-1.7, Y], [X1, Y], [X1, 0.5]], q).flow([[X1, -0.5], [X1, -Y], [X0, -Y], [X0, -0.3]], q);
    };
    const vec = (ch, key, a, b, color, width = 3) => ch.line(key, [a[0], b[0]], [a[1], b[1]], { color, width });
    return {
      changed() {
        const c = state.case, v3 = c === 'helix', two = c === 'phasor';
        stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        tr.show(!v3 && !two); br.show(!v3 && !two); sq.show(two); wv.show(two); sch.show(!v3 && !two); all3.forEach((o) => { o.object.visible = v3; }); lbl.forEach((l) => { l.visible = v3; });
        ctx.setClock(c === 'phasor' || c === 'helix' || c === 'power' ? 8 : 0, { ambient: true });
      },
      update() {
        const c = state.case, u = time.t; sch.begin();
        if (c === 'phasor') {
          const th = 2 * Math.PI * u / 4, ph1 = state.p1 * Math.PI / 180, ph2 = state.p2 * Math.PI / 180, z1 = [state.A1 * Math.cos(th + ph1), state.A1 * Math.sin(th + ph1)], z2 = state.two ? [state.A2 * Math.cos(th + ph2), state.A2 * Math.sin(th + ph2)] : [0, 0], s = [z1[0] + z2[0], z1[1] + z2[1]];
          sq.range([-2.6, 2.6], [-2.6, 2.6]); sq.titles('real part (V)', 'imaginary part (V): the arrow turns, its shadow is the signal');
          sq.line('c', lin(0, 2 * Math.PI, 90).map((a) => state.A1 * Math.cos(a)), lin(0, 2 * Math.PI, 90).map((a) => state.A1 * Math.sin(a)), { color: '--line', width: 1 });
          vec(sq, 'v1', [0, 0], z1, '--c-B'); if (state.two) { vec(sq, 'v2', z1, s, '--c-I'); vec(sq, 'vs', [0, 0], s, '--c-v', 4); } else { sq.hide('v2'); sq.hide('vs'); }
          sq.line('drop', [s[0], s[0]], [s[1], 0], { color: '--ink-dim', dashed: true, width: 1 }); sq.dots('tip', [s[0]], [s[1]], { color: '--accent', size: 11 });
          // the signal: the real part (horizontal shadow) against time, drawn up to now
          const ts = lin(0, u, Math.max(2, Math.round(u * 60))), re = (t, A, p) => A * Math.cos(2 * Math.PI * t / 4 + p);
          wv.range([0, 8], [-2.6, 2.6]); wv.titles('t (s)', 'signal = real part of the arrow(s)');
          wv.line('w1', ts, ts.map((t) => re(t, state.A1, ph1)), { color: '--c-B', width: state.two ? 1.3 : 3 }); if (state.two) { wv.line('w2', ts, ts.map((t) => re(t, state.A2, ph2)), { color: '--c-I', width: 1.3 }); wv.line('ws', ts, ts.map((t) => re(t, state.A1, ph1) + re(t, state.A2, ph2)), { color: '--c-v', width: 3 }); } else { wv.hide('w2'); wv.hide('ws'); }
          wv.dots('n', [u], [s[0]], { color: '--accent', size: 11 });
          const S = cabs([state.A1 * Math.cos(ph1) + (state.two ? state.A2 * Math.cos(ph2) : 0), state.A1 * Math.sin(ph1) + (state.two ? state.A2 * Math.sin(ph2) : 0)]);
          hud.set('a', `A cos(ωt + φ) = Re{A e^{jφ} · e^{jωt}}: the arrow (length A, start angle φ) turns at ω`); hud.set('b', state.two ? `sum: amplitude ${fmt(S)} — add the arrows tip to tail, not the amplitudes` : `amplitude ${fmt(state.A1)}, phase ${state.p1}°`);
          hud.set('c', 'same frequency → the arrows turn together and keep their angles: the whole picture is frozen in the phasor');
          plots.aux.draw({ xlim: [-180, 180], cursor: state.p2, series: [{ x: lin(-180, 180, 181), y: lin(-180, 180, 181).map((p) => cabs([state.A1 * Math.cos(ph1) + state.A2 * Math.cos(p * Math.PI / 180), state.A1 * Math.sin(ph1) + state.A2 * Math.sin(p * Math.PI / 180)])), color: '--c-v', label: 'sum amplitude vs phase 2 (°)' }] });
        } else if (c === 'helix') {
          const p = P(), { f0 } = resonance(p), Z = seriesZ(p, state.fr * f0), phi = -carg(Z), Im = 0.8 / cabs(Z) * state.R, th0 = 2 * Math.PI * u / 4;
          // time runs along x from 0 to 6; the phasor turns in the (y, z) plane; shadows on the floor (z = −1.4) and the back wall (y = 1.4)
          const N = 300, Hv = [], Hi = [], S = [], tx = (k) => -3 + 6 * k / N, ang = (k) => th0 - 2 * Math.PI * 2 * k / N;
          for (let k = 0; k < N; k++) { const a = ang(k), b = ang(k + 1);
            Hv.push(tx(k), Math.cos(a), Math.sin(a), tx(k + 1), Math.cos(b), Math.sin(b)); Hi.push(tx(k), Im * Math.cos(a + phi), Im * Math.sin(a + phi), tx(k + 1), Im * Math.cos(b + phi), Im * Math.sin(b + phi));
            S.push(tx(k), Math.cos(a), -1.4, tx(k + 1), Math.cos(b), -1.4, tx(k), 1.4, Math.sin(a), tx(k + 1), 1.4, Math.sin(b)); }
          hv.segments(Hv); hi.segments(Hi); sh.segments(S); ax3.segments([-3.4, 0, 0, 3.2, 0, 0, -3, -1.3, 0, -3, 1.3, 0, -3, 0, -1.3, -3, 0, 1.3]);
          arr.segments([-3, 0, 0, -3, Math.cos(th0), Math.sin(th0), -3, 0, 0, -3, Im * Math.cos(th0 + phi), Im * Math.sin(th0 + phi)]);
          lbl[0].position.set(3.3, 0, 0.2); lbl[1].position.set(-3, 1.5, 0); lbl[2].position.set(-3, 0, 1.5);
          hud.set('a', `blue: voltage phasor sweeping out a helix in time; orange: current, ${phi > 0.01 ? 'ahead by' : phi < -0.01 ? 'behind by' : 'in step,'} ${deg(Math.abs(phi))}`); hud.set('b', `f = ${fmt(state.fr)} f₀: |Z| = ${ohm(cabs(Z))}, current ×${fmt(Im / 0.8)} of its value at resonance (drawn at 0.8)`);
          hud.set('c', 'the shadow on the floor is cos (what a scope shows), on the back wall sin: one helix, two waves');
          const fr = lin(-1, 1, 200); plots.aux.draw({ xlim: [-1, 1], cursor: Math.log10(state.fr), series: [{ x: fr, y: fr.map((l) => -carg(seriesZ(p, 10 ** l * f0)) * 180 / Math.PI), color: '--c-I', label: 'phase of the current (°) vs log₁₀ f/f₀' }] });
        } else if (c === 'impedance' || c === 'resonance') {
          const p = P(), { f0, Q, bw } = resonance(p), f = state.fr * f0, w = 2 * Math.PI * f, XL = w * p.L, XC = 1 / (w * p.C), Z = seriesZ(p, f), I = 1 / cabs(Z), phi = carg(Z);
          seriesLoop(`R ${ohm(p.R)}`, `L ${fmt(state.Lm)} mH`, `C ${fmt(state.Cu)} µF`, `1 V ${hz(f)}`, Math.min(1.5, I * p.R * 0.8), -phi);
          if (c === 'impedance') {
            const M = Math.max(XL, XC, p.R) * 1.15, ar = TR[3] / TR[2]; tr.range([-M / ar * 0.3, M / ar * 1.7], [-M, M]); tr.titles('resistance (Ω)', 'reactance (Ω): R → then +X_L ↑ then −X_C ↓');
            vec(tr, 'r', [0, 0], [p.R, 0], '--c-B'); vec(tr, 'l', [p.R, 0], [p.R, XL], '--c-I'); vec(tr, 'cc', [p.R, XL], [p.R, XL - XC], '--c-v'); vec(tr, 'z', [0, 0], [Z[0], Z[1]], '--accent', 4.5);
            const lf = lin(-1, 1, 200); br.range([-1, 1], [0, Math.log10(Math.max(...lf.map((l) => cabs(seriesZ(p, 10 ** l * f0))))) * 1.05]); br.titles('log₁₀ f/f₀', 'log₁₀ |Z| (Ω): minimum at resonance');
            br.line('z', lf, lf.map((l) => Math.log10(cabs(seriesZ(p, 10 ** l * f0)))), { color: '--c-B' }); br.dots('q', [Math.log10(state.fr)], [Math.log10(cabs(Z))], { color: '--accent', size: 11 });
            hud.set('a', `Z = R + j(X_L − X_C) = ${fmt(Z[0])} ${Z[1] >= 0 ? '+' : '−'} j${fmt(Math.abs(Z[1]))} Ω, |Z| = ${ohm(cabs(Z))} at ${deg(phi)}`); hud.set('b', `X_L = ωL = ${ohm(XL)} (up), X_C = 1/(ωC) = ${ohm(XC)} (down)`);
            hud.set('c', XL > XC * 1.02 ? 'inductive: current lags the voltage' : XC > XL * 1.02 ? 'capacitive: current leads the voltage' : 'resonance: the reactances cancel, only R is left');
            plots.aux.draw({ xlim: [-1, 1], cursor: Math.log10(state.fr), series: [{ x: lf, y: lf.map((l) => carg(seriesZ(p, 10 ** l * f0)) * 180 / Math.PI), color: '--c-I', label: 'angle of Z (°) vs log₁₀ f/f₀' }] });
          } else {
            const lf = lin(-1, 1, 400); tr.range([-1, 1], [0, 1.08]); tr.titles('log₁₀ f/f₀', 'I / I_max: dashed = −3 dB (1/√2)');
            tr.line('i', lf, lf.map((l) => p.R / cabs(seriesZ(p, 10 ** l * f0))), { color: '--c-B' }); tr.line('h', [-1, 1], [Math.SQRT1_2, Math.SQRT1_2], { color: '--ink-dim', dashed: true, width: 1 }); tr.dots('q', [Math.log10(state.fr)], [p.R * I], { color: '--accent', size: 11 });
            // voltage phasors across each part, taking the current as reference
            const VR = [I * p.R, 0], VL = [0, I * XL], VC = [0, -I * XC], M = Math.max(I * XL, I * XC, 1.2) * 1.1, ar = BR[3] / BR[2];
            br.range([-M / ar * 0.25, M / ar * 1.75], [-M, M]); br.titles('', 'voltages across R (blue), L (orange), C (green); purple = source');
            vec(br, 'r', [0, 0], VR, '--c-B'); vec(br, 'l', VR, [VR[0], VL[1]], '--c-I'); vec(br, 'cc', [VR[0], VL[1]], [VR[0], VL[1] + VC[1]], '--c-v'); vec(br, 's', [0, 0], [VR[0], VL[1] + VC[1]], '--c-E', 4.5);
            hud.set('a', `f₀ = 1/(2π√(LC)) = ${hz(f0)}, Q = √(L/C)/R = ${fmt(Q)}, bandwidth f₀/Q = ${hz(bw)}`); hud.set('b', `at this frequency: |V_L| = ${fmt(I * XL)} V and |V_C| = ${fmt(I * XC)} V — from a 1 V source`, I * XL > 1.5 ? 'bad' : '');
            hud.set('c', 'at resonance V_L and V_C are Q times the source but opposite: they cancel and R gets everything');
            plots.aux.draw({ xlim: [-1, 1], cursor: Math.log10(state.fr), series: [{ x: lf, y: lf.map((l) => { const ff = 10 ** l * f0; return 2 * Math.PI * ff * p.L / cabs(seriesZ(p, ff)); }), color: '--c-I', label: '|V_L| (V) for a 1 V source' }] });
          }
        } else if (c === 'tank') {
          const p = { R: state.Rp, L: state.Lm * 1e-3, C: state.Cu * 1e-6 }, { f0 } = resonance(p), f = state.fr * f0, w = 2 * Math.PI * f, Z = tankZ(p, f), IR = 1 / p.R, IL = 1 / (w * p.L), IC = w * p.C;
          sch.source([X0, -0.3], [X0, 0.3], `1 V ${hz(f)}`, true).wire([X0, 0.3], [X0, Y], [X1, Y]).wire([X0, -0.3], [X0, -Y], [X1, -Y]);
          [[-3.3, 'resistor', `R ${ohm(p.R)}`, IR, 0], [-2.25, 'inductor', `L ${fmt(state.Lm)} mH`, IL, -Math.PI / 2], [X1, 'capacitor', `C ${fmt(state.Cu)} µF`, IC, Math.PI / 2]].forEach(([x, k, n, i, ph]) => {
            sch.wire([x, Y], [x, 0.5])[k]([x, 0.5], [x, -0.5], n).wire([x, -0.5], [x, -Y]); const q = Math.min(1.5, i * p.R * 0.5) * Math.sin(Math.PI * time.t + ph); sch.flow([[x, Y], [x, 0.5]], q).flow([[x, -0.5], [x, -Y]], q); });
          const lf = lin(-1, 1, 400); tr.range([-1, 1], [0, p.R * 1.08]); tr.titles('log₁₀ f/f₀', '|Z| (Ω): the tank PEAKS at resonance');
          tr.line('z', lf, lf.map((l) => cabs(tankZ(p, 10 ** l * f0))), { color: '--c-B' }); tr.dots('q', [Math.log10(state.fr)], [cabs(Z)], { color: '--accent', size: 11 });
          const M = Math.max(IR, IL, IC) * 1.1e3, ar = BR[3] / BR[2]; br.range([-M / ar * 0.25, M / ar * 1.75], [-M, M]); br.titles('', 'branch currents (mA): I_R blue, I_C green up, I_L orange down');
          vec(br, 'r', [0, 0], [IR * 1e3, 0], '--c-B'); vec(br, 'cc', [IR * 1e3, 0], [IR * 1e3, IC * 1e3], '--c-v'); vec(br, 'l', [IR * 1e3, IC * 1e3], [IR * 1e3, (IC - IL) * 1e3], '--c-I'); vec(br, 's', [0, 0], [IR * 1e3, (IC - IL) * 1e3], '--c-E', 4.5);
          hud.set('a', `f₀ = ${hz(f0)}: |Z| = ${ohm(cabs(Z))} (maximum ${ohm(p.R)} at f₀)`); hud.set('b', `I_L = ${fmt(IL * 1e3)} mA and I_C = ${fmt(IC * 1e3)} mA circulate between L and C; the source supplies only ${fmt(1 / cabs(Z) * 1e3)} mA`);
          hud.set('c', 'everything flips from series: admittances add, the impedance peaks, the line current dips');
          plots.aux.draw({ xlim: [-1, 1], cursor: Math.log10(state.fr), series: [{ x: lf, y: lf.map((l) => carg(tankZ(p, 10 ** l * f0)) * 180 / Math.PI), color: '--c-I', label: 'phase of Z (°): inductive below f₀, capacitive above' }] });
        } else if (c === 'power') {
          const phi = state.phi * Math.PI / 180, W = acPower(10, 2, phi), ts = lin(0, 8, 600), v = (t) => 10 * Math.cos(2 * Math.PI * t / 4), i = (t) => 2 * Math.cos(2 * Math.PI * t / 4 - phi);
          seriesLoop('R', phi > 0 ? 'L' : '—', phi < 0 ? 'C' : '—', '10 V', 1, -phi);
          tr.range([0, 8], [-21, 21]); tr.titles('t (s)', 'v (grey, V), i (orange, ×5), p = v·i (red, W)');
          tr.line('v', ts, ts.map(v), { color: '--c-ref', width: 1.2 }); tr.line('i', ts, ts.map((t) => 5 * i(t)), { color: '--c-I', width: 1.3 }); tr.line('p', ts, ts.map((t) => v(t) * i(t)), { color: '--c-north' }); tr.line('P', [0, 8], [W.P, W.P], { color: '--c-north', dashed: true, width: 1 }); tr.dots("n", [u], [v(u) * i(u)], { color: "--accent", size: 10 });
          br.range([0.4, 3.6], [Math.min(0, W.Q) * 1.15 - 1, W.S * 1.15]); br.titles('P (W) · Q (var) · S (VA)', 'power (W, var, VA): average real, reactive, apparent'); br.stems('b', [1, 2, 3], [W.P, W.Q, W.S], { color: '--c-E', width: 16 });
          hud.set('a', `P = ½VI cos φ = ${fmt(W.P)} W, power factor cos φ = ${fmt(W.pf)}`, W.pf > 0.9 ? 'good' : 'bad'); hud.set('b', `Q = ½VI sin φ = ${fmt(W.Q)} var: energy borrowed and returned every cycle (p < 0 parts)`);
          hud.set('c', 'the wires must carry the full current for S = ½VI, but only P does useful work');
          plots.aux.draw({ xlim: [-90, 90], cursor: state.phi, series: [{ x: lin(-90, 90, 181), y: lin(-90, 90, 181).map((x) => acPower(10, 2, x * Math.PI / 180).P), color: '--c-north', label: 'P (W) vs φ (°)' }] });
        } else {
          const R = state.RCk * 1e3, C = state.Cf * 1e-9, F = rcFilter(R, C, state.f, state.high);
          sch.source([X0, -0.3], [X0, 0.3], `v_in ${hz(state.f)}`, true).wire([X0, 0.3], [X0, Y], [-3.8, Y]);
          if (!state.high) sch.resistor([-3.8, Y], [-2.6, Y], `R ${ohm(R)}`).wire([-2.6, Y], [-2.0, Y], [-2.0, 0.5]).capacitor([-2.0, 0.5], [-2.0, -0.5], `C ${fmt(state.Cf)} nF`).wire([-2.0, -0.5], [-2.0, -Y]);
          else sch.capacitor([-3.8, Y], [-2.6, Y], `C ${fmt(state.Cf)} nF`).wire([-2.6, Y], [-2.0, Y], [-2.0, 0.5]).resistor([-2.0, 0.5], [-2.0, -0.5], `R ${ohm(R)}`).wire([-2.0, -0.5], [-2.0, -Y]);
          sch.wire([-2.0, Y], [-0.8, Y]).wire([-2.0, -Y], [X0, -Y], [X0, -0.3]).wire([-2.0, -Y], [-0.8, -Y]).dot([-0.8, Y]).dot([-0.8, -Y]).text(`v_out ×${fmt(F.mag, 2)}`, [-0.8, 0]);
          const i = state.high ? F.mag / R : F.mag * 2 * Math.PI * state.f * C, q = Math.min(1.5, i * R * 0.8) * Math.sin(Math.PI * time.t); sch.flow([[X0, 0.3], [X0, Y], [-3.8, Y]], q).flow([[-2.6, Y], [-2.0, Y], [-2.0, 0.5]], q).flow([[-2.0, -0.5], [-2.0, -Y], [X0, -Y], [X0, -0.3]], q);
          const lf = lin(1, 5, 300), mag = (f) => rcFilter(R, C, f, state.high).mag; tr.range([1, 5], [-60, 3]); tr.titles('log₁₀ f (Hz)', `gain (dB): ${state.high ? 'passes highs' : 'passes lows'}, −20 dB/decade beyond f_c`);
          tr.line('m', lf, lf.map((l) => dB(mag(10 ** l))), { color: '--c-B' }); tr.line('c', [Math.log10(F.fc), Math.log10(F.fc)], [-60, 3], { color: '--ink-dim', dashed: true, width: 1 }); tr.dots('q', [Math.log10(state.f)], [dB(F.mag)], { color: '--accent', size: 11 });
          br.range([1, 5], [-95, 95]); br.titles('log₁₀ f (Hz)', 'phase (°): ∓45° at f_c'); br.line('p', lf, lf.map((l) => rcFilter(R, C, 10 ** l, state.high).ph * 180 / Math.PI), { color: '--c-I' }); br.dots('q', [Math.log10(state.f)], [F.ph * 180 / Math.PI], { color: '--accent', size: 11 });
          hud.set('a', `f_c = 1/(2πRC) = ${hz(F.fc)}`); hud.set('b', `at ${hz(state.f)}: output ×${fmt(F.mag)} (${fmt(dB(F.mag))} dB), phase ${deg(F.ph)}`);
          hud.set('c', state.high ? 'C blocks slow signals; fast ones pass to R' : 'C shorts fast signals to ground; slow ones pass');
          const ts = lin(0, 3 / state.f, 300); plots.aux.draw({ xlim: [0, 3e3 / state.f], series: [{ x: ts.map((t) => t * 1e3), y: ts.map((t) => Math.sin(2 * Math.PI * state.f * t)), color: '--c-ref', label: 'v_in' }, { x: ts.map((t) => t * 1e3), y: ts.map((t) => F.mag * Math.sin(2 * Math.PI * state.f * t + F.ph)), color: '--c-B', label: 'v_out vs t (ms)' }] });
        }
        sch.end();
      },
      theme() { charts.forEach((k) => k.theme()); sch.theme(); all3.forEach((o) => o.theme()); },
    };
  },
};
