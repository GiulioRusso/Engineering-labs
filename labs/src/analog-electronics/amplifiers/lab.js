// Amplifier stages: the common emitter (gain, inversion, clipping and distortion), the emitter follower
// (no gain, but an impedance transformer), the differential pair (tanh and common-mode rejection), the
// Miller effect, negative feedback, and why cascaded stages load each other.
import { createChart } from '../../lib/viz/chart.js';
import { createSchematic } from '../../lib/viz/schematic.js';
import { VT } from '../transistors/model.js';
import { ceStage, ceOut, follower, pairI1, diffPair, miller, feedback, cascade } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TR = [0.3, 0.55, 4.3, 2.0], BR = [0.3, -2.35, 4.3, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const kOhm = (r) => (r >= 1e6 ? `${fmt(r / 1e6)} MΩ` : r >= 1000 ? `${fmt(r / 1000)} kΩ` : `${fmt(r)} Ω`);
const dB = (x) => 20 * Math.log10(Math.abs(x));
const hz = (f) => (f >= 1e6 ? `${fmt(f / 1e6)} MHz` : f >= 1e3 ? `${fmt(f / 1e3)} kHz` : `${fmt(f)} Hz`);

export default {
  id: 'amplifiers', title: 'Amplifier stages', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  defaults: { Ic: 1, Rc: 4700, Re: 0, amp: 5, Vcc: 12, fRe: 1000, RL: 1000, Rs: 10000, It: 1, vid: 10, vcm: 200, Rt: 50, gain: 100, Cmu: 5, Cpi: 20, Rsm: 1, A0: 100, bpct: 10, fp: 10, dA: -50, cIc: 1, buf: false, cRL: 1e6 },
  cases: [
    { id: 'ce', label: 'Common emitter', set: {}, examples: [
      { id: 'clip', label: '20 mV: clipped and lopsided', controls: ['amp'], set: { amp: 20 } },
      { id: 'degen', label: 'R_E = 470 Ω: less gain, clean', controls: ['Re', 'amp'], set: { Re: 470, amp: 300 } },
    ] },
    { id: 'follower', label: 'Emitter follower', set: {}, examples: [
      { id: 'heavy', label: '100 Ω load: the follower saves it', controls: ['RL'], set: { RL: 100 } },
      { id: 'weak', label: 'Weak source (100 kΩ)', controls: ['Rs'], set: { Rs: 100000 } },
    ] },
    { id: 'diff', label: 'Differential pair', set: {}, examples: [
      { id: 'large', label: '100 mV: the pair saturates', controls: ['vid'], set: { vid: 100 } },
      { id: 'poortail', label: 'Weak tail: common mode leaks', controls: ['Rt'], set: { Rt: 2 } },
    ] },
    { id: 'miller', label: 'Miller effect', set: {}, examples: [
      { id: 'high', label: 'Gain 400: bandwidth collapses', controls: ['gain'], set: { gain: 400 } },
      { id: 'lowrs', label: 'Low source resistance', controls: ['Rsm'], set: { Rsm: 0.05 } },
    ] },
    { id: 'feedback', label: 'Negative feedback', set: {}, examples: [
      { id: 'lowgain', label: 'Weak amplifier (40 dB)', controls: ['A0'], set: { A0: 40 } },
      { id: 'more', label: 'Gain 100 instead of 10', controls: ['bpct'], set: { bpct: 1 } },
    ] },
    { id: 'cascade', label: 'Cascading stages', set: {}, examples: [
      { id: 'buffer', label: 'Add a follower between', controls: ['buf'], set: { buf: true } },
      { id: 'load', label: 'Driving a 1 kΩ load', controls: ['cRL', 'buf'], set: { cRL: 1000 } },
    ] },
  ],
  controls: [
    { title: 'Stage', show: (s) => s.case === 'ce', items: [
      { id: 'amp', label: 'Input amplitude', unit: 'mV', min: 0.5, max: 500, log: true }, { id: 'Ic', label: 'Bias current', unit: 'mA', min: 0.1, max: 2.4, step: 0.01 }, { id: 'Rc', label: 'R_C', unit: 'Ω', min: 1000, max: 10000, log: true }, { id: 'Re', label: 'R_E', unit: 'Ω', min: 0, max: 2000, step: 10 },
    ] },
    { title: 'Follower', show: (s) => s.case === 'follower', items: [
      { id: 'RL', label: 'Load', unit: 'Ω', min: 10, max: 100000, log: true }, { id: 'Rs', label: 'Source resistance', unit: 'Ω', min: 100, max: 200000, log: true }, { id: 'fRe', label: 'R_E', unit: 'Ω', min: 100, max: 10000, log: true },
    ] },
    { title: 'Pair', show: (s) => s.case === 'diff', items: [
      { id: 'vid', label: 'Differential input', unit: 'mV', min: 1, max: 200, log: true }, { id: 'vcm', label: 'Common-mode noise', unit: 'mV', min: 0, max: 1000, step: 10 }, { id: 'Rt', label: 'Tail resistance', unit: 'kΩ', min: 1, max: 1000, log: true }, { id: 'It', label: 'Tail current', unit: 'mA', min: 0.1, max: 4, step: 0.05 },
    ] },
    { title: 'Stage', show: (s) => s.case === 'miller', items: [
      { id: 'gain', label: 'Voltage gain |A|', unit: '', min: 1, max: 500, log: true }, { id: 'Cmu', label: 'C_μ (base–collector)', unit: 'pF', min: 0.5, max: 20, step: 0.1 }, { id: 'Cpi', label: 'C_π (base–emitter)', unit: 'pF', min: 1, max: 50, step: 0.5 }, { id: 'Rsm', label: 'Source resistance', unit: 'kΩ', min: 0.01, max: 50, log: true },
    ] },
    { title: 'Loop', show: (s) => s.case === 'feedback', items: [
      { id: 'A0', label: 'Open-loop gain', unit: 'dB', min: 20, max: 120, step: 1 }, { id: 'bpct', label: 'Feedback fraction β', unit: '%', min: 0.1, max: 100, log: true }, { id: 'fp', label: 'Open-loop pole', unit: 'Hz', min: 1, max: 10000, log: true }, { id: 'dA', label: 'Change of A', unit: '%', min: -90, max: 100, step: 1 },
    ] },
    { title: 'Chain', show: (s) => s.case === 'cascade', items: [
      { id: 'buf', label: 'Follower between the stages', type: 'check' }, { id: 'cRL', label: 'Final load', unit: 'Ω', min: 100, max: 1e6, log: true }, { id: 'cIc', label: 'Bias current', unit: 'mA', min: 0.1, max: 3, step: 0.05 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), sch = createSchematic(ctx, { labelPool: 30 });
    return {
      changed() { ctx.setClock(['ce', 'follower', 'diff'].includes(state.case) ? 4 : 0); },
      update() {
        const c = state.case, t = time.t % 4; sch.begin();
        if (c === 'ce') {
          const p = { Ic: state.Ic * 1e-3, Rc: state.Rc, Re: state.Re, Vcc: state.Vcc }, S = ceStage(p), A = state.amp * 1e-3, Vq = ceOut(0, p), Q = sch.npn([-2.2, 0]);
          sch.wire(Q.B, [-3.4, 0]).source([-3.4, -0.6], [-3.4, 0], 'v_in', true).source([-3.4, -1.6], [-3.4, -0.6], 'bias', false).ground([-3.4, -1.6]).resistor(Q.C, [Q.C[0], 1.6], `R_C ${kOhm(state.Rc)}`).supply([Q.C[0], 1.6], `V_CC ${state.Vcc} V`);
          if (state.Re > 0) sch.resistor(Q.E, [Q.E[0], -1.6], `R_E ${kOhm(state.Re)}`); else sch.wire(Q.E, [Q.E[0], -1.6]);
          sch.ground([Q.E[0], -1.6]).wire(Q.C, [-0.8, Q.C[1]]).dot(Q.C).text('v_out', [-0.8, 0.7]);
          const ts = lin(0, 4, 400), vo = ts.map((x) => ceOut(A * Math.sin(Math.PI * x), p)), vl = ts.map((x) => Vq + S.Av * A * Math.sin(Math.PI * x));
          tr.range([0, 4], [0, state.Vcc * 1.05]); tr.titles('t', 'v_out (V): real blue, linear dashed'); tr.line('o', ts, vo, { color: '--c-B' }); tr.line('l', ts, vl.map((v) => Math.max(-1, Math.min(state.Vcc + 1, v))), { color: '--c-I', dashed: true, width: 1.3 });
          tr.line('rail', [0, 4], [state.Vcc, state.Vcc], { color: '--ink-dim', dashed: true, width: 1 }); tr.dots('n', [t], [ceOut(A * Math.sin(Math.PI * t), p)], { color: '--accent', size: 10 });
          const W = Math.max(A * 1.5, 0.02), vi = lin(-W, W, 300); br.range([-W * 1e3, W * 1e3], [0, state.Vcc * 1.05]); br.titles('v_in (mV)', 'transfer: v_out (V) vs v_in — slope = gain');
          br.line('tf', vi.map((v) => v * 1e3), vi.map((v) => ceOut(v, p)), { color: '--c-B' }); br.line('sw', [-A * 1e3, A * 1e3], [0.15, 0.15], { color: '--accent', width: 4 }); br.dots('n', [A * Math.sin(Math.PI * t) * 1e3], [ceOut(A * Math.sin(Math.PI * t), p)], { color: '--accent', size: 11 });
          const hi = Math.max(...vo), lo = Math.min(...vo), up = hi - Vq, dn = Vq - lo, clip = hi >= state.Vcc - 1e-6 || lo <= 0.2 + 1e-6;
          hud.set('a', `A_v = −g_m(R_C‖r_o)/(1 + g_m R_E) = ${fmt(S.Av)}  (${fmt(dB(S.Av))} dB) — inverted`); hud.set('b', `Q point V_C = ${fmt(Vq)} V; output swings +${fmt(up)} / −${fmt(dn)} V`, clip || Math.abs(up - dn) / (up + dn) > 0.1 ? 'bad' : 'good');
          hud.set('c', clip ? 'clipping: the output hit a rail (V_CC above, saturation below)' : `R_in = ${kOhm(S.Rin)}, R_out = ${kOhm(S.Rout)}`);
          const ics = lin(0.1, 2.4, 100); plots.aux.draw({ xlim: [0.1, 2.4], cursor: state.Ic, series: [{ x: ics, y: ics.map((i) => Math.abs(ceStage({ ...p, Ic: i * 1e-3 }).Av)), color: '--c-B', label: '|A_v| vs bias current (mA)' }, { x: ics, y: ics.map((i) => state.Vcc - i * 1e-3 * (state.Rc + state.Re)), color: '--c-I', label: 'V_C (V)' }] });
        } else if (c === 'follower') {
          const F = follower({ Ic: state.Ic * 1e-3, Re: state.fRe, RL: state.RL, Rs: state.Rs }), direct = state.RL / (state.Rs + state.RL), withF = F.Rin / (state.Rs + F.Rin) * F.Av, Q = sch.npn([-2.2, 0.3]);
          sch.source([-4.3, -1.6], [-4.3, 0.3], 'v_s', true).resistor([-4.3, 0.3], [-3.0, 0.3], `R_s ${kOhm(state.Rs)}`).wire([-3.0, 0.3], Q.B).wire(Q.C, [Q.C[0], 1.6]).supply([Q.C[0], 1.6], 'V_CC')
            .resistor(Q.E, [Q.E[0], -1.6], `R_E ${kOhm(state.fRe)}`).wire(Q.E, [-0.8, Q.E[1]]).dot(Q.E).resistor([-0.8, Q.E[1]], [-0.8, -1.6], `R_L ${kOhm(state.RL)}`).wire([-4.3, -1.6], [-0.8, -1.6]).ground([-2.6, -1.6]).text('v_out', [-0.8, 0.15]);
          const ts = lin(0, 4, 300); tr.range([0, 4], [-1.2, 1.2]); tr.titles('t', 'source grey · follower blue · direct red');
          tr.line('s', ts, ts.map((x) => Math.sin(Math.PI * x)), { color: '--c-ref', width: 1.2 }); tr.line('f', ts, ts.map((x) => withF * Math.sin(Math.PI * x)), { color: '--c-B' }); tr.line('d', ts, ts.map((x) => direct * Math.sin(Math.PI * x)), { color: '--c-north' }); tr.dots('n', [t], [withF * Math.sin(Math.PI * t)], { color: '--accent', size: 10 });
          const rl = lin(1, 5, 200); br.range([1, 5], [0, 1.05]); br.titles('log₁₀ load (Ω)', 'fraction of the source reaching the load');
          br.line('f', rl, rl.map((l) => { const f = follower({ Ic: state.Ic * 1e-3, Re: state.fRe, RL: 10 ** l, Rs: state.Rs }); return f.Rin / (state.Rs + f.Rin) * f.Av; }), { color: '--c-B' }); br.line('d', rl, rl.map((l) => 10 ** l / (state.Rs + 10 ** l)), { color: '--c-north' }); br.dots('q', [Math.log10(state.RL), Math.log10(state.RL)], [withF, direct], { color: '--accent', size: 11 });
          hud.set('a', `gain ${fmt(F.Av)}: the emitter follows the base, one V_BE lower`); hud.set('b', `R_in = ${kOhm(F.Rin)} (the source sees a big load) · R_out = ${kOhm(F.Rout)} (the load sees a strong source)`);
          hud.set('c', `load gets ${fmt(withF * 100)}% with the follower, ${fmt(direct * 100)}% connected directly`, withF > direct ? 'good' : '');
          const rs = lin(2, 5.3, 100); plots.aux.draw({ xlim: [2, 5.3], cursor: Math.log10(state.Rs), series: [{ x: rs, y: rs.map((l) => follower({ Ic: state.Ic * 1e-3, Re: state.fRe, RL: state.RL, Rs: 10 ** l }).Rout), color: '--c-E', label: 'R_out (Ω) vs log₁₀ source resistance: divided by β + 1' }] });
        } else if (c === 'diff') {
          const It = state.It * 1e-3, D = diffPair({ Itail: It, Rc: 5000, Rtail: state.Rt * 1e3 }), Q1 = sch.npn([-3.2, 0]), Q2 = sch.npn([-1.4, 0]);
          sch.wire(Q1.B, [-4.0, 0]).dot([-4.0, 0]).text('v₁', [-4.25, 0]).wire(Q2.B, [-2.2, 0]).dot([-2.2, 0]).text('v₂', [-2.2, 0.25]).wire(Q1.E, [Q1.E[0], -0.8], [Q2.E[0], -0.8], Q2.E)
            .source([-2.2, -1.8], [-2.2, -0.8], `I_tail ${fmt(state.It)} mA`, false).ground([-2.2, -1.8]).resistor(Q1.C, [Q1.C[0], 1.6], 'R_C').resistor(Q2.C, [Q2.C[0], 1.6], 'R_C').wire([Q1.C[0], 1.6], [Q2.C[0], 1.6]).supply([-2.2, 1.6], 'V_CC').text('out₁', [Q1.C[0] + 0.45, 0.55]).text('out₂', [Q2.C[0] + 0.45, 0.55]);
          const vd = lin(-150, 150, 300), A = state.vid * 1e-3, vnow = A * Math.sin(Math.PI * t);
          tr.range([-150, 150], [0, state.It * 1.05]); tr.titles('v₁ − v₂ (mV)', 'I_C1 blue, I_C2 orange (mA): sum = I_tail');
          tr.line('1', vd, vd.map((v) => pairI1(v * 1e-3, It) * 1e3), { color: '--c-B' }); tr.line('2', vd, vd.map((v) => pairI1(-v * 1e-3, It) * 1e3), { color: '--c-I' }); tr.line('sw', [-state.vid, state.vid], [0.02 * state.It, 0.02 * state.It], { color: '--accent', width: 4 }); tr.dots('n', [vnow * 1e3, vnow * 1e3], [pairI1(vnow, It) * 1e3, pairI1(-vnow, It) * 1e3], { color: '--accent', size: 10 });
          const ts = lin(0, 4, 400), cm = (x) => state.vcm * 1e-3 * Math.sin(2 * Math.PI * 3.3 * x), dd = (x) => A * Math.sin(Math.PI * x), out = ts.map((x) => 5000 * (pairI1(dd(x), It) - pairI1(-dd(x), It))), se = ts.map((x) => -5000 * (pairI1(dd(x), It) - It / 2) - D.Acm * cm(x));
          const M = Math.max(...out.map(Math.abs), ...se.map(Math.abs), 0.01) * 1.1; br.range([0, 4], [-M, M]); br.titles('t', 'out₂ − out₁ blue (clean) · out₁ grey (noisy)');
          br.line('se', ts, se, { color: '--c-ref', width: 1.2 }); br.line('d', ts, out, { color: '--c-B' });
          hud.set('a', `differential gain g_m R_C = ${fmt(D.Adm)} · common-mode gain ${fmt(D.Acm)} → CMRR ${fmt(D.cmrr)} dB`, D.cmrr > 40 ? 'good' : 'bad');
          hud.set('b', 'both inputs moving together just shares I_tail the same way: nothing changes at the output'); hud.set('c', state.vid > 2 * VT * 1e3 * 2 ? 'beyond ±4V_T ≈ ±100 mV all the current goes to one side: the pair limits (tanh)' : `linear range about ±${fmt(2 * VT * 1e3)} mV (I₁ − I₂ = I_tail tanh(v/2V_T))`);
          const rt = lin(0, 3, 100); plots.aux.draw({ xlim: [0, 3], cursor: Math.log10(state.Rt), series: [{ x: rt, y: rt.map((l) => diffPair({ Itail: It, Rc: 5000, Rtail: 10 ** l * 1e3 }).cmrr), color: '--c-E', label: 'CMRR (dB) vs log₁₀ tail resistance (kΩ)' }] });
        } else if (c === 'miller') {
          const Av = -state.gain, M = miller({ Av, Cmu: state.Cmu * 1e-12, Cpi: state.Cpi * 1e-12, Rs: state.Rsm * 1e3 }), naive = 1 / (2 * Math.PI * state.Rsm * 1e3 * (state.Cmu + state.Cpi) * 1e-12), Q = sch.npn([-2.0, 0]);
          sch.source([-4.4, -1.6], [-4.4, 0], 'v_s', true).resistor([-4.4, 0], [-3.1, 0], `R_s ${kOhm(state.Rsm * 1e3)}`).wire([-3.1, 0], Q.B).dot([-2.7, 0]).wire([-2.7, 0], [-2.7, 0.9]).capacitor([-2.7, 0.9], [Q.C[0], 0.9], 'C_μ').wire(Q.C, [Q.C[0], 0.9]).dot([Q.C[0], 0.9])
            .resistor([Q.C[0], 1.8], [Q.C[0], 0.9], 'R_C').wire([Q.C[0], 0.9], [-0.8, 0.9]).text(`v_out = −${fmt(state.gain)}·v_in`, [-1.1, 0.65]).wire(Q.E, [Q.E[0], -1.6]).wire([-4.4, -1.6], [Q.E[0], -1.6]).ground([-3.0, -1.6]).text(`C_in = ${fmt(M.Cin * 1e12)} pF`, [-2.7, -0.75]);
          const lf = lin(3, 10, 300); tr.range([3, 10], [Math.max(-20, dB(state.gain) - 60), dB(state.gain) + 6]); tr.titles('log₁₀ f (Hz)', 'gain (dB): Miller blue, naive dashed');
          tr.line('m', lf, lf.map((l) => dB(M.mag(10 ** l))), { color: '--c-B' }); tr.line('n', lf, lf.map((l) => dB(state.gain / Math.hypot(1, 10 ** l / naive))), { color: '--c-ref', dashed: true, width: 1.2 }); tr.dots('f3', [Math.log10(M.f3)], [dB(state.gain) - 3], { color: '--accent', size: 11 });
          const gs = lin(0, 2.7, 100); br.range([0, 2.7], [3, 10]); br.titles('log₁₀ |gain|', 'log₁₀ bandwidth (Hz): gain × BW ≈ const');
          br.line('f', gs, gs.map((g) => Math.log10(miller({ Av: -(10 ** g), Cmu: state.Cmu * 1e-12, Cpi: state.Cpi * 1e-12, Rs: state.Rsm * 1e3 }).f3)), { color: '--c-B' }); br.dots('q', [Math.log10(state.gain)], [Math.log10(M.f3)], { color: '--accent', size: 11 });
          hud.set('a', `C_in = C_π + C_μ(1 + |A|) = ${fmt(state.Cpi)} + ${fmt(state.Cmu)}×${fmt(1 + state.gain)} = ${fmt(M.Cin * 1e12)} pF`); hud.set('b', `bandwidth ${hz(M.f3)} (would be ${hz(naive)} without the Miller multiplication)`, M.f3 < naive / 10 ? 'bad' : '');
          hud.set('c', 'C_μ bridges two nodes swinging in opposite directions: it must take (1 + |A|) times the charge');
          plots.aux.draw({ xlim: [0, 2.7], cursor: Math.log10(state.gain), series: [{ x: gs, y: gs.map((g) => (state.Cpi + state.Cmu * (1 + 10 ** g))), color: '--c-I', label: 'C_in (pF) vs log₁₀ |gain|' }] });
        } else if (c === 'feedback') {
          const A0 = 10 ** (state.A0 / 20), b = state.bpct / 100, F = feedback({ A0, beta: b, fp: state.fp }), A1 = A0 * (1 + state.dA / 100), Acl1 = A1 / (1 + A1 * b), dcl = (Acl1 / F.Acl - 1) * 100;
          const S = sch.sum([-3.6, 0.7]), Bx = sch.box([-2.2, 0.7], 0.9, 0.7, `A ${fmt(state.A0)} dB`), Bb = sch.box([-2.2, -0.8], 0.9, 0.6, `β ${fmt(state.bpct)}%`);
          sch.wire([-4.5, 0.7], S.l).text('in', [-4.6, 0.95]).wire(S.r, Bx.l).wire(Bx.r, [-0.7, 0.7]).text('out', [-0.7, 0.95]).dot([-1.2, 0.7]).wire([-1.2, 0.7], [-1.2, -0.8], Bb.r).wire(Bb.l, [-3.6, -0.8], S.b).text('−', [-3.35, 0.35]).text('+', [-3.9, 0.95]).text(`closed loop: ${fmt(F.Acl)} ≈ 1/β = ${fmt(F.ideal)}`, [-2.6, -1.6]);
          const lf = lin(0, 8, 300); tr.range([0, 8], [-10, state.A0 + 5]); tr.titles('log₁₀ f (Hz)', 'gain (dB): open grey, closed blue');
          tr.line('o', lf, lf.map((l) => dB(F.open(10 ** l))), { color: '--c-ref', width: 1.3 }); tr.line('c', lf, lf.map((l) => dB(F.cl(10 ** l))), { color: '--c-B' }); tr.dots('f', [Math.log10(F.f3)], [dB(F.Acl) - 3], { color: '--accent', size: 11 });
          const la = lin(1, 6, 200); br.range([1, 6], [-3, 2]); br.titles('log₁₀ A₀', 'log₁₀ gain error (%): −1 means 0.1%');
          br.line('e', la, la.map((l) => Math.log10(100 / (1 + 10 ** l * b))), { color: '--c-v' }); br.dots('q', [Math.log10(A0)], [Math.log10(100 / (1 + F.loop))], { color: '--accent', size: 11 });
          hud.set('a', `loop gain Aβ = ${fmt(F.loop)}: closed-loop gain ${fmt(F.Acl)}, ${fmt(100 / (1 + F.loop))}% short of 1/β`, F.loop > 10 ? 'good' : 'bad');
          hud.set('b', `A changes by ${state.dA}% → closed loop changes by only ${fmt(dcl, 2)}%`); hud.set('c', `bandwidth grows from ${hz(state.fp)} to ${hz(F.f3)}: gain × bandwidth is conserved`);
          const da = lin(-90, 100, 100); plots.aux.draw({ xlim: [-90, 100], cursor: state.dA, series: [{ x: da, y: da, color: '--c-ref', label: 'change of A (%)' }, { x: da, y: da.map((d) => { const a = A0 * (1 + d / 100); return (a / (1 + a * b) / F.Acl - 1) * 100; }), color: '--c-B', label: 'change of closed-loop gain (%)' }] });
        } else {
          const C = cascade({ Ic: state.cIc * 1e-3, buffer: state.buf, RL: state.cRL }), n = C.chain.length, xs = lin(-4.2, -0.9, n);
          C.chain.forEach(([name, g], i) => { const bx = sch.box([xs[i], 0.4], 0.62, 0.5, ''); sch.text(name, [xs[i], 1.0]).text(`×${fmt(Math.abs(g), 2)}`, [xs[i], 0.4]); if (i) sch.wire([xs[i - 1] + 0.31, 0.4], bx.l); });
          sch.text(`R_out1 ${kOhm(C.Rout1)} drives R_in2 ${kOhm(C.Rin2)}`, [-2.5, -0.6]).text(`load ${kOhm(state.cRL)}`, [-0.9, -0.2]);
          let acc = 1; const cum = [0, ...C.chain.map(([, g]) => dB(acc *= g))], ix = lin(0, n, n + 1), idl = dB(C.ideal);
          tr.range([0, n], [Math.min(0, ...cum) - 5, Math.max(idl, ...cum) + 8]); tr.titles('step along the chain', 'running gain (dB); dashed = ideal');
          tr.line('s', ix, cum, { color: '--c-B' }); tr.dots('sd', ix, cum, { color: '--accent', size: 10 }); tr.line('i', [0, n], [idl, idl], { color: '--ink-dim', dashed: true, width: 1.2 });
          const rl = lin(2, 6, 200); br.range([2, 6], [0, Math.max(dB(cascade({ Ic: state.cIc * 1e-3, buffer: true, RL: 1e6 }).total), dB(cascade({ Ic: state.cIc * 1e-3, RL: 1e6 }).total)) + 6]); br.titles('log₁₀ final load (Ω)', 'total gain (dB): direct red, follower blue');
          br.line('d', rl, rl.map((l) => dB(cascade({ Ic: state.cIc * 1e-3, RL: 10 ** l }).total)), { color: '--c-north' }); br.line('b', rl, rl.map((l) => dB(cascade({ Ic: state.cIc * 1e-3, buffer: true, RL: 10 ** l }).total)), { color: '--c-B' }); br.dots('q', [Math.log10(state.cRL)], [dB(C.total)], { color: '--accent', size: 11 });
          hud.set('a', `total ${fmt(Math.abs(C.total))} (${fmt(dB(C.total))} dB) vs ideal ${fmt(Math.abs(C.ideal))} (${fmt(idl)} dB)`); hud.set('b', `at the junction R_out1 and R_in2 form a divider: only ${fmt(C.chain[1][1] * 100)}% gets through`, C.chain[1][1] < 0.5 ? 'bad' : 'good');
          hud.set('c', state.buf ? 'the follower presents a large R_in and a small R_out: little is lost on either side' : 'a CE stage has large R_out and small R_in — the worst possible pairing');
          const ics = lin(0.1, 3, 100); plots.aux.draw({ xlim: [0.1, 3], cursor: state.cIc, series: [{ x: ics, y: ics.map((i) => dB(cascade({ Ic: i * 1e-3, buffer: state.buf, RL: state.cRL }).total)), color: '--c-B', label: 'total gain (dB) vs bias current (mA)' }] });
        }
        sch.end();
      },
      theme() { tr.theme(); br.theme(); sch.theme(); },
    };
  },
};
