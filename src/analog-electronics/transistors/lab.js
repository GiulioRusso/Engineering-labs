// Transistors: the BJT's exponential control and output curves, the MOSFET's three regions (also as a
// 3D surface I_D(V_GS, V_DS)), transconductance of both, the bias point on a load line and why an
// emitter resistor stabilises it, the small-signal tangent, and the current mirror.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createSurface } from '../../lib/viz/surface.js';
import { createSchematic } from '../../lib/viz/schematic.js';
import { VT, KN, VTH, VA, bjtIc, mosId, mosRegion, gmBjt, gmMos, solveBias, smallSignal, mirror } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TR = [0.3, 0.55, 4.3, 2.0], BR = [0.3, -2.35, 4.3, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const kOhm = (r) => (r >= 1000 ? `${fmt(r / 1000)} kΩ` : `${fmt(r)} Ω`);
// surface frame: V_DS 0..5 → x −3..3, V_GS 0..4 → y −2.4..2.4, I_D (mA) × 0.25 → z
const SX = (v) => -3 + 6 * v / 5, SY = (v) => -2.4 + 4.8 * v / 4, SZ = 0.25;

export default {
  id: 'transistors', title: 'Transistors', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [7.5, -7.5, 6], target: [0, 0, 0.8] } },
  camOf: (s) => (s.case === 'surface' ? 'iso' : 'top'),
  defaults: { vbe: 0.66, vce: 5, vgs: 2.5, vds: 3, vth: 1, I: 1, Vcc: 12, Rc: 4700, Re: 1000, Vb: 2, dT: 0, Ic0: 1, amp: 5, dev: 'bjt', Vm: 2.5, dv: 0, beta: 150 },
  cases: [
    { id: 'bjt', label: 'BJT: exponential control', set: {}, examples: [
      { id: 'decade', label: '+60 mV: ten times the current', controls: ['vbe'], set: { vbe: 0.72 } },
      { id: 'sat', label: 'Saturation: V_CE too small', controls: ['vce'], set: { vce: 0.1 } },
    ] },
    { id: 'mosfet', label: 'MOSFET: three regions', set: {}, examples: [
      { id: 'cutoff', label: 'Below threshold: off', controls: ['vgs'], set: { vgs: 0.8 } },
      { id: 'triode', label: 'Small V_DS: a resistor', controls: ['vds'], set: { vds: 0.4 } },
      { id: 'sat', label: 'Large V_DS: a current source', controls: ['vds'], set: { vds: 4 } },
    ] },
    { id: 'surface', label: 'MOSFET in 3D', set: {}, examples: [
      { id: 'edge', label: 'On the region boundary', controls: ['vds'], set: { vgs: 3, vds: 2 } },
    ] },
    { id: 'gm', label: 'Transconductance', set: {}, examples: [
      { id: 'low', label: '10 µA: the two are close', controls: ['I'], set: { I: 0.01 } },
      { id: 'high', label: '20 mA: the BJT wins by far', controls: ['I'], set: { I: 20 } },
    ] },
    { id: 'bias', label: 'Bias point', set: {}, examples: [
      { id: 'hot', label: '+50 K: stable thanks to R_E', controls: ['dT'], set: { dT: 50 } },
      { id: 'nore', label: 'No R_E: runaway', controls: ['dT'], set: { Re: 0, Vb: 0.62, dT: 20 } },
      { id: 'sat', label: 'Too much R_C: saturated', controls: ['Rc'], set: { Rc: 12000 } },
    ] },
    { id: 'small', label: 'Small signal', set: {}, examples: [
      { id: 'tiny', label: '1 mV: perfectly linear', controls: ['amp'], set: { amp: 1 } },
      { id: 'big', label: '40 mV: badly distorted', controls: ['amp'], set: { amp: 40 } },
      { id: 'mos', label: 'MOSFET: linear for longer', controls: ['amp'], set: { dev: 'mos', amp: 200 } },
    ] },
    { id: 'mirror', label: 'Current mirror', set: {}, examples: [
      { id: 'mismatch', label: '5 mV mismatch: 20% error', controls: ['dv'], set: { dv: 5 } },
      { id: 'lowbeta', label: 'Low β: base currents steal', controls: ['beta'], set: { beta: 20 } },
    ] },
  ],
  controls: [
    { title: 'BJT', show: (s) => s.case === 'bjt', items: [
      { id: 'vbe', label: 'V_BE', unit: 'V', min: 0.5, max: 0.78, step: 0.002 }, { id: 'vce', label: 'V_CE', unit: 'V', min: 0, max: 12, step: 0.05 },
    ] },
    { title: 'MOSFET', show: (s) => s.case === 'mosfet' || s.case === 'surface', items: [
      { id: 'vgs', label: 'V_GS', unit: 'V', min: 0, max: 4, step: 0.02 }, { id: 'vds', label: 'V_DS', unit: 'V', min: 0, max: 5, step: 0.02 }, { id: 'vth', label: 'Threshold V_th', unit: 'V', min: 0.3, max: 2, step: 0.05 },
    ] },
    { title: 'Bias current', show: (s) => s.case === 'gm', items: [{ id: 'I', label: 'Current', unit: 'mA', min: 0.001, max: 40, log: true }] },
    { title: 'Circuit', show: (s) => s.case === 'bias', items: [
      { id: 'Vb', label: 'Base voltage', unit: 'V', min: 0.5, max: 5, step: 0.01 }, { id: 'Rc', label: 'R_C', unit: 'Ω', min: 500, max: 20000, log: true }, { id: 'Re', label: 'R_E', unit: 'Ω', min: 0, max: 3000, step: 50 }, { id: 'Vcc', label: 'V_CC', unit: 'V', min: 5, max: 20, step: 0.5 }, { id: 'dT', label: 'Warming', unit: 'K', min: -40, max: 100, step: 1 },
    ] },
    { title: 'Signal', show: (s) => s.case === 'small', items: [
      { id: 'dev', label: 'Device', type: 'segmented', options: [['bjt', 'BJT'], ['mos', 'MOSFET']] }, { id: 'Ic0', label: 'Bias current', unit: 'mA', min: 0.1, max: 5, step: 0.05 }, { id: 'amp', label: 'Input amplitude', unit: 'mV', min: 0.5, max: 400, log: true },
    ] },
    { title: 'Mirror', show: (s) => s.case === 'mirror', items: [
      { id: 'Vm', label: 'Output voltage', unit: 'V', min: 0, max: 5, step: 0.02 }, { id: 'dv', label: 'V_BE mismatch', unit: 'mV', min: -20, max: 20, step: 0.1 }, { id: 'beta', label: 'β', unit: '', min: 10, max: 400, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), sch = createSchematic(ctx);
    const surf = createSurface(scene, { nx: 90, ny: 90, x: [-3, 3], y: [-2.4, 2.4], opacity: 0.9 }), edge = createCurve(stage, { max: 200, width: 3, color: '--c-I' }), op = createCurve(stage, { max: 40, width: 3, color: '--accent' });
    const axl = ['V_DS →', 'V_GS →', 'I_D ↑'].map((t) => { const l = ctx.label(t, 'tick'); scene.add(l); return l; });
    axl[0].position.set(0, -2.9, 0); axl[1].position.set(3.6, 0, 0); axl[2].position.set(-3, 2.4, 2.8);
    let sk = '';
    return {
      changed() {
        const v3 = state.case === 'surface'; stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        tr.show(!v3); br.show(!v3); sch.show(!v3); surf.mesh.visible = edge.object.visible = op.object.visible = v3; axl.forEach((l) => { l.visible = v3; });
        ctx.setClock(state.case === 'small' ? 4 : 0);
      },
      update() {
        const c = state.case; sch.begin();
        if (c === 'bjt') {
          const Ic = bjtIc(state.vbe, state.vce), Q = sch.npn([-2.4, 0]);
          sch.wire(Q.B, [-3.8, 0]).source([-3.8, -1.4], [-3.8, 0], `V_BE ${fmt(state.vbe)} V`, false).wire([-3.8, -1.4], [-0.8, -1.4]).wire(Q.E, [Q.E[0], -1.4]).wire(Q.C, [Q.C[0], 1.4], [-0.8, 1.4]).source([-0.8, -1.4], [-0.8, 1.4], `V_CE ${fmt(state.vce)} V`, false).ground([-2.28, -1.4]).arrowI([Q.C[0], 1.4], [-0.8, 1.4], `I_C ${fmt(Ic * 1e3)} mA`);
          const vb = lin(0.5, 0.78, 300), top = Math.max(1, bjtIc(0.78, state.vce) * 1e3); tr.range([0.5, 0.78], [0, Math.min(top, 20)]); tr.titles('V_BE (V)', 'I_C (mA): exponential in V_BE');
          tr.line('c', vb, vb.map((v) => bjtIc(v, state.vce) * 1e3), { color: '--c-B' }); tr.dots('q', [state.vbe], [Ic * 1e3], { color: '--accent', size: 12 });
          const vc = lin(0, 12, 300), fam = [0.6, 0.62, 0.64, 0.66, 0.68, 0.7], ymax = 1.15 * bjtIc(0.7, 12) * 1e3;
          br.range([0, 12], [0, Math.max(ymax, Ic * 1.2e3)]); br.titles('V_CE (V)', 'I_C (mA) for V_BE = 0.60 … 0.70 V');
          fam.forEach((v, i) => br.line(`f${i}`, vc, vc.map((x) => bjtIc(v, x) * 1e3), { color: '--c-ref', width: 1.1 })); br.line('me', vc, vc.map((x) => bjtIc(state.vbe, x) * 1e3), { color: '--c-B' }); br.dots('q', [state.vce], [Ic * 1e3], { color: '--accent', size: 12 });
          hud.set('a', `I_C = ${fmt(Ic * 1e3)} mA at V_BE = ${fmt(state.vbe)} V`); hud.set('b', `every +${fmt(VT * Math.LN10 * 1e3)} mV of V_BE multiplies I_C by 10 (V_T = ${VT * 1e3} mV)`);
          hud.set('c', state.vce < 0.2 ? 'saturated: V_CE too small, the collector stops collecting' : 'active: the curves are almost flat — I_C barely depends on V_CE (slight slope = Early effect)', state.vce < 0.2 ? 'bad' : '');
          plots.aux.draw({ xlim: [0.5, 0.78], cursor: state.vbe, series: [{ x: vb, y: vb.map((v) => Math.log10(bjtIc(v, state.vce))), color: '--c-B', label: 'log₁₀ I_C (A) vs V_BE (V): a straight line' }] });
        } else if (c === 'mosfet' || c === 'surface') {
          const p = { vth: state.vth }, Id = mosId(state.vgs, state.vds, p), reg = mosRegion(state.vgs, state.vds, state.vth), vov = state.vgs - state.vth;
          if (c === 'mosfet') {
            const Q = sch.mos([-2.4, 0]);
            sch.wire(Q.G, [-3.8, 0]).source([-3.8, -1.4], [-3.8, 0], `V_GS ${fmt(state.vgs)} V`, false).wire([-3.8, -1.4], [-0.8, -1.4]).wire(Q.S, [Q.S[0], -1.4]).wire(Q.D, [Q.D[0], 1.4], [-0.8, 1.4]).source([-0.8, -1.4], [-0.8, 1.4], `V_DS ${fmt(state.vds)} V`, false).ground([-2.26, -1.4]).arrowI([Q.D[0], 1.4], [-0.8, 1.4], `I_D ${fmt(Id * 1e3)} mA`);
            const vg = lin(0, 4, 300), Imax = 1e3 * mosId(4, 5, p) * 1.1 || 1; tr.range([0, 4], [0, Imax]); tr.titles('V_GS (V)', `I_D (mA) at V_DS = ${fmt(state.vds)} V`);
            tr.line('t', vg, vg.map((v) => mosId(v, state.vds, p) * 1e3), { color: '--c-B' }); tr.line('th', [state.vth, state.vth], [0, Imax], { color: '--ink-dim', dashed: true, width: 1.2 }); tr.dots('q', [state.vgs], [Id * 1e3], { color: '--accent', size: 12 });
            const vd = lin(0, 5, 300); br.range([0, 5], [0, Imax]); br.titles('V_DS (V)', 'I_D (mA): dashed = edge of saturation');
            [1.5, 2, 2.5, 3, 3.5, 4].forEach((v, i) => br.line(`f${i}`, vd, vd.map((x) => mosId(v, x, p) * 1e3), { color: '--c-ref', width: 1.1 }));
            br.line('me', vd, vd.map((x) => mosId(state.vgs, x, p) * 1e3), { color: '--c-B' }); br.line('edge', vd, vd.map((x) => 0.5 * KN * x * x * 1e3), { color: '--c-I', dashed: true, width: 1.4 }); br.dots('q', [state.vds], [Id * 1e3], { color: '--accent', size: 12 });
            plots.aux.draw({ xlim: [0, 5], cursor: state.vds, series: [{ x: vd, y: vd.map((x) => { const i = mosId(state.vgs, x, p); return i > 0 ? x / i / 1e3 : NaN; }), color: '--c-E', label: 'V_DS / I_D (kΩ): a resistor in triode, a rising wall in saturation' }] });
          } else {
            const k = `${state.vth}`;
            if (k !== sk) { sk = k; surf.set((x, y) => 1e3 * mosId((y + 2.4) / 4.8 * 4, (x + 3) / 6 * 5, p), { zScale: SZ, color: (x, y) => { const r = mosRegion((y + 2.4) / 4.8 * 4, (x + 3) / 6 * 5, state.vth); return r === 'cutoff' ? 0.05 : r === 'triode' ? 0.45 : 0.85; } });
              const e = []; for (let i = 0; i < 60; i++) { const a = state.vth + (4 - state.vth) * i / 60, b = state.vth + (4 - state.vth) * (i + 1) / 60; e.push(SX(a - state.vth), SY(a), 1e3 * mosId(a, a - state.vth, p) * SZ + 0.02, SX(b - state.vth), SY(b), 1e3 * mosId(b, b - state.vth, p) * SZ + 0.02); } edge.segments(e); }
            const z = Id * 1e3 * SZ, X = SX(state.vds), Y = SY(state.vgs); op.segments([X, Y, 0, X, Y, z + 0.4, X - 0.15, Y, z + 0.02, X + 0.15, Y, z + 0.02, X, Y - 0.15, z + 0.02, X, Y + 0.15, z + 0.02]);
            plots.aux.draw({ xlim: [0, 5], cursor: state.vds, series: [{ x: lin(0, 5, 200), y: lin(0, 5, 200).map((x) => mosId(state.vgs, x, p) * 1e3), color: '--c-B', label: `slice at V_GS = ${fmt(state.vgs)} V: I_D (mA) vs V_DS` }] });
          }
          hud.set('a', `${reg}: I_D = ${fmt(Id * 1e3)} mA (V_ov = V_GS − V_th = ${fmt(vov)} V)`, reg === 'cutoff' ? 'bad' : 'good');
          hud.set('b', reg === 'triode' ? 'triode: V_DS < V_ov, the channel acts like a resistor set by V_GS' : reg === 'saturation' ? `saturation: V_DS ≥ V_ov, I_D = ½k V_ov² ≈ ${fmt(0.5 * KN * vov * vov * 1e3)} mA whatever V_DS` : 'cutoff: no channel, no current');
          hud.set('c', c === 'surface' ? 'purple: off · teal: triode · yellow: saturation · orange line: the boundary V_DS = V_ov' : 'the gate takes no current at all: control by voltage alone');
        } else if (c === 'gm') {
          const I = state.I * 1e-3, gb = gmBjt(I), gmo = gmMos(I), Q = sch.npn([-3.4, 0.3]), M = sch.mos([-1.4, 0.3]);
          sch.text('BJT: g_m = I/V_T', [-3.3, -0.8]).text('MOS: g_m = √(2kI)', [-1.3, -0.8]).text(`${fmt(gb * 1e3)} mS`, [-3.3, -1.2]).text(`${fmt(gmo * 1e3)} mS`, [-1.3, -1.2]);
          sch.wire(Q.C, [Q.C[0], 1.2]).wire(Q.E, [Q.E[0], -0.4]).wire(M.D, [M.D[0], 1.2]).wire(M.S, [M.S[0], -0.4]);
          const li = lin(-3, 1.6, 200); tr.range([-3, 1.6], [-2, 3.5]); tr.titles('log₁₀ I (mA)', 'log₁₀ g_m (mS): BJT blue, MOSFET orange');
          tr.line('b', li, li.map((l) => Math.log10(gmBjt(10 ** l * 1e-3) * 1e3)), { color: '--c-B' }); tr.line('m', li, li.map((l) => Math.log10(gmMos(10 ** l * 1e-3) * 1e3)), { color: '--c-I' }); tr.dots('q', [Math.log10(state.I), Math.log10(state.I)], [Math.log10(gb * 1e3), Math.log10(gmo * 1e3)], { color: '--accent', size: 11 });
          br.range([-3, 1.6], [0, 45]); br.titles('log₁₀ I (mA)', 'g_m / I (1/V): what each milliamp buys');
          br.line('b', li, li.map(() => 1 / VT), { color: '--c-B' }); br.line('m', li, li.map((l) => gmMos(10 ** l * 1e-3) / (10 ** l * 1e-3)), { color: '--c-I' }); br.dots('q', [Math.log10(state.I), Math.log10(state.I)], [gb / I, gmo / I], { color: '--accent', size: 11 });
          hud.set('a', `at ${fmt(state.I)} mA: BJT ${fmt(gb * 1e3)} mS, MOSFET ${fmt(gmo * 1e3)} mS (${fmt(gb / gmo)}× less)`); hud.set('b', 'BJT: g_m grows in proportion to I (slope 1); MOSFET: as √I (slope ½)');
          hud.set('c', `MOSFET overdrive needed: V_ov = √(2I/k) = ${fmt(Math.sqrt(2 * I / KN))} V`);
          plots.aux.draw({ xlim: [-3, 1.6], cursor: Math.log10(state.I), series: [{ x: li, y: li.map((l) => gmBjt(10 ** l * 1e-3) / gmMos(10 ** l * 1e-3)), color: '--c-E', label: 'ratio g_m,BJT / g_m,MOS vs log₁₀ I (mA)' }] });
        } else if (c === 'bias') {
          const B = solveBias({ Vcc: state.Vcc, Rc: state.Rc, Re: state.Re, Vb: state.Vb, dT: state.dT }), Vce = Math.max(B.Vce, 0.05), Q = sch.npn([-2.3, 0]);
          sch.wire(Q.B, [-3.8, 0]).source([-3.8, -1.6], [-3.8, 0], `V_B ${fmt(state.Vb)} V`, false).ground([-3.8, -1.6]).resistor(Q.C, [Q.C[0], 1.6], `R_C ${kOhm(state.Rc)}`).supply([Q.C[0], 1.6], `V_CC ${state.Vcc} V`);
          if (state.Re > 0) sch.resistor(Q.E, [Q.E[0], -1.6], `R_E ${kOhm(state.Re)}`).ground([Q.E[0], -1.6]); else sch.wire(Q.E, [Q.E[0], -1.6]).ground([Q.E[0], -1.6]);
          sch.wire(Q.C, [-0.9, Q.C[1]]).dot([Q.C[0], Q.C[1]]).text(`V_C ${fmt(state.Vcc - B.Ic * state.Rc)} V`, [-0.9, 0.75]);
          const vc = lin(0, state.Vcc, 200), Imax = 1.25 * state.Vcc / (state.Rc + state.Re) * 1e3; tr.range([0, state.Vcc], [0, Imax]); tr.titles('V_CE (V)', 'I_C (mA): load line meets the device curve');
          tr.line('ll', [0, state.Vcc], [state.Vcc / (state.Rc + state.Re) * 1e3, 0], { color: '--c-I', width: 1.6 }); tr.line('dev', vc, vc.map((x) => B.Ic * 1e3 * (1 + x / VA) / (1 + Vce / VA) * (1 - Math.exp(-x / 0.06))), { color: '--c-B' }); tr.dots('q', [Vce], [B.Ic * 1e3], { color: '--accent', size: 12 });
          const dts = lin(-40, 100, 141), re = Math.max(state.Re, 1), base = solveBias({ Vcc: 1e3, Rc: 0, Re: re, Vb: state.Vb }).Ic, now = solveBias({ Vcc: 1e3, Rc: 0, Re: state.Re, Vb: state.Vb, dT: state.dT }).Ic / solveBias({ Vcc: 1e3, Rc: 0, Re: state.Re, Vb: state.Vb }).Ic;
          br.range([-40, 100], [0, 3]); br.titles('warming (K)', 'I_C / I_C(0 K): with R_E (blue), without (red)');
          br.line('re', dts, dts.map((d) => solveBias({ Vcc: 1e3, Rc: 0, Re: re, Vb: state.Vb, dT: d }).Ic / base), { color: '--c-B' });
          br.line('no', dts, dts.map((d) => Math.min(3.2, Math.exp(2e-3 * d / VT))), { color: '--c-north' }); br.dots('q', [state.dT], [Math.min(3, now)], { color: '--accent', size: 11 });
          hud.set('a', B.sat ? `saturated: V_CE ≈ ${fmt(Math.max(B.Vce, 0))} V — no room to swing` : `I_C = ${fmt(B.Ic * 1e3)} mA, V_CE = ${fmt(B.Vce)} V`, B.sat ? 'bad' : 'good');
          hud.set('b', state.Re > 0 ? `R_E sets the current: I_E ≈ (V_B − 0.7)/R_E = ${fmt((state.Vb - 0.7) / state.Re * 1e3)} mA` : 'no R_E: the current is exponential in (V_B − V_BE(T)) — 2 mV/K moves it 8% per kelvin');
          hud.set('c', `best swing: V_CE near the middle of 0 … ${state.Vcc} V`);
          const vbs = lin(0.5, 5, 200); plots.aux.draw({ xlim: [0.5, 5], cursor: state.Vb, series: [{ x: vbs, y: vbs.map((v) => Math.max(0.1, solveBias({ Vcc: state.Vcc, Rc: state.Rc, Re: state.Re, Vb: v, dT: state.dT }).Vce)), color: '--c-B', label: 'V_CE (V) vs base voltage (V)' }] });
        } else if (c === 'small') {
          const bjt = state.dev === 'bjt', I0 = state.Ic0 * 1e-3, A = state.amp * 1e-3, ph = 2 * Math.PI * (time.t % 4) / 2, v = A * Math.sin(ph), S = smallSignal(state.dev, I0, v), gm = S.gm;
          const V0 = bjt ? VT * Math.log(I0 / 1e-15) : VTH + Math.sqrt(2 * I0 / KN), Q = bjt ? sch.npn([-2.3, 0]) : sch.mos([-2.3, 0]), inp = bjt ? Q.B : Q.G, out = bjt ? Q.C : Q.D, gnd = bjt ? Q.E : Q.S;
          sch.wire(inp, [-3.2, 0]).source([-3.2, -0.2], [-3.2, 0], '', true).wire([-3.2, -0.2], [-3.2, -0.5]).source([-3.2, -1.6], [-3.2, -0.5], `bias ${fmt(V0)} V`, false).ground([-3.2, -1.6]).text(`v_in ${fmt(state.amp)} mV`, [-4.0, 0.15]).wire(gnd, [gnd[0], -1.6]).ground([gnd[0], -1.6]).wire(out, [out[0], 1.3]).arrowI([out[0], 1.0], [out[0], 1.3], `I ${fmt((I0 + S.exact) * 1e3)} mA`);
          const W = 4 * Math.max(A, bjt ? 0.004 : 0.05), vv = lin(V0 - W, V0 + W, 300), f = (x) => (bjt ? 1e-15 * Math.exp(x / VT) : 0.5 * KN * Math.max(x - VTH, 0) ** 2) * 1e3;
          tr.range([V0 - W, V0 + W], [0, f(V0 + W) * 1.05]); tr.titles(bjt ? 'V_BE (V)' : 'V_GS (V)', 'curve (blue) and its tangent at the bias (orange)');
          tr.line('c', vv, vv.map(f), { color: '--c-B' }); tr.line('t', vv, vv.map((x) => (I0 + gm * (x - V0)) * 1e3), { color: '--c-I', width: 1.4 }); tr.line('sw', [V0 - A, V0 + A], [0, 0], { color: '--accent', width: 4 }); tr.dots('q', [V0 + v], [(I0 + S.exact) * 1e3], { color: '--accent', size: 12 });
          const ts = lin(0, 4, 400), ex = ts.map((t) => smallSignal(state.dev, I0, A * Math.sin(Math.PI * t)).exact * 1e3), ln = ts.map((t) => gm * A * Math.sin(Math.PI * t) * 1e3), M = Math.max(...ex.map(Math.abs), ...ln.map(Math.abs)) * 1.1;
          br.range([0, 4], [-M, M]); br.titles('time (one period = 2)', 'signal current (mA): real (blue) vs g_m·v (orange)'); br.line('e', ts, ex, { color: '--c-B' }); br.line('l', ts, ln, { color: '--c-I', dashed: true, width: 1.4 }); br.dots('n', [time.t % 4], [S.exact * 1e3], { color: '--accent', size: 10 });
          const up = smallSignal(state.dev, I0, A).exact, dn = -smallSignal(state.dev, I0, -A).exact, asym = (up - dn) / (up + dn) * 100;
          hud.set('a', `g_m = ${fmt(gm * 1e3)} mS at ${fmt(state.Ic0)} mA: the slope of the curve at the bias point`); hud.set('b', `peak up ${fmt(up * 1e3)} mA vs peak down ${fmt(dn * 1e3)} mA: ${fmt(Math.abs(asym), 2)}% lopsided`, Math.abs(asym) < 5 ? 'good' : 'bad');
          hud.set('c', bjt ? `linear only while v ≪ V_T = ${VT * 1e3} mV` : `linear while v ≪ 2V_ov = ${fmt(2 * Math.sqrt(2 * I0 / KN) * 1e3)} mV — much wider than the BJT`);
          const aa = lin(-0.3, 2.6, 120); plots.aux.draw({ xlim: [-0.3, 2.6], cursor: Math.log10(state.amp), series: [{ x: aa, y: aa.map((l) => { const a = 10 ** l * 1e-3, u = smallSignal(state.dev, I0, a).exact, d = -smallSignal(state.dev, I0, -a).exact; return (u - d) / (u + d) * 100; }), color: '--c-north', label: 'distortion (% lopsided) vs log₁₀ amplitude (mV)' }] });
        } else {
          const M = mirror({ Vout: state.Vm, dvbe: state.dv * 1e-3, beta: state.beta }), Q1 = sch.npn([-3.3, 0]), Q2 = sch.npn([-2.0, 0]), N = [Q1.C[0], 0.8];
          sch.wire(Q1.C, N).wire(Q1.B, [Q1.B[0], 0.8], N).wire(N, [-2.6, 0.8], [-2.6, 0], Q2.B).dot(N).resistor(N, [N[0], 1.8], `R ${kOhm(4300)}`).supply([N[0], 1.8], 'V_CC 5 V')
            .wire(Q1.E, [Q1.E[0], -1.4]).wire(Q2.E, [Q2.E[0], -1.4]).wire([Q1.E[0], -1.4], [-0.6, -1.4]).ground([-2.6, -1.4]).wire(Q2.C, [Q2.C[0], 1.4], [-0.6, 1.4]).source([-0.6, -1.4], [-0.6, 1.4], `${fmt(state.Vm)} V`, false)
            .arrowI([Q2.C[0], 1.4], [-0.6, 1.4], `I_out ${fmt(M.iout * 1e3)} mA`);
          const vo = lin(0, 5, 200); tr.range([0, 5], [0, M.iref * 1.6e3]); tr.titles('V_out (V)', 'I_out (mA): flat = a current source; dashed = I_ref');
          tr.line('o', vo, vo.map((x) => mirror({ Vout: x, dvbe: state.dv * 1e-3, beta: state.beta }).iout * 1e3), { color: '--c-B' }); tr.line('r', [0, 5], [M.iref * 1e3, M.iref * 1e3], { color: '--ink-dim', dashed: true, width: 1.2 }); tr.dots('q', [state.Vm], [M.iout * 1e3], { color: '--accent', size: 12 });
          const dvs = lin(-20, 20, 200); br.range([-20, 20], [0, 2.4]); br.titles('mismatch (mV)', 'I_out / I_ref = e^(ΔV/V_T)'); br.line('m', dvs, dvs.map((d) => mirror({ Vout: state.Vm, dvbe: d * 1e-3, beta: state.beta }).iout / M.iref), { color: '--c-E' }); br.dots('q', [state.dv], [M.iout / M.iref], { color: '--accent', size: 11 });
          hud.set('a', `I_ref = ${fmt(M.iref * 1e3)} mA → I_out = ${fmt(M.iout * 1e3)} mA (ratio ${fmt(M.iout / M.iref)})`, Math.abs(M.iout / M.iref - 1) < 0.05 ? 'good' : 'bad'); hud.set('b', 'Q1 is wired as a diode: it finds the V_BE that carries I_ref; Q2 gets the same V_BE, so the same current');
          hud.set('c', `errors: Early effect (V_out vs V_BE, slope 1/V_A), base currents 2/β = ${fmt(200 / state.beta)}%, mismatch (×${fmt(Math.exp(state.dv * 1e-3 / VT))})`);
          const bs = lin(10, 400, 200); plots.aux.draw({ xlim: [10, 400], cursor: state.beta, series: [{ x: bs, y: bs.map((b) => mirror({ Vout: state.Vm, dvbe: state.dv * 1e-3, beta: b }).iout / M.iref), color: '--c-B', label: 'I_out / I_ref vs β' }] });
        }
        sch.end();
      },
      theme() { tr.theme(); br.theme(); sch.theme(); edge.theme(); op.theme(); sk = ''; },
    };
  },
};
