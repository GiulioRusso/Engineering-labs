// Diodes: the exponential I–V curve and the load line that fixes the operating point, rectifiers turning
// AC into DC (with the smoothing capacitor and its ripple), and the Zener regulator holding a voltage.
import { createChart } from '../../lib/viz/chart.js';
import { createSchematic } from '../../lib/viz/schematic.js';
import { VT, diodeI, qpoint, rectifier, rippleEstimate, zener } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TR = [0.3, 0.55, 4.3, 2.0], BR = [0.3, -2.35, 4.3, 2.0];

export default {
  id: 'diodes', title: 'Diodes', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 6,
  defaults: { VS: 5, R: 1000, T: 300, Vp: 10, C: 100, RL: 1000, full: false, Vz: 5.1, Vs: 12, Rs: 220, RLz: 1000 },
  cases: [
    { id: 'iv', label: 'I–V curve', set: {}, examples: [
      { id: 'small', label: 'Small R: more current, V barely moves', controls: ['R'], set: { R: 100 } },
      { id: 'hot', label: 'Hotter: same current at lower V', controls: ['T'], set: { T: 350 } },
      { id: 'reverse', label: 'Reverse: almost nothing flows', controls: ['VS'], set: { VS: -5 } },
    ] },
    { id: 'rectifier', label: 'Rectifier', set: {}, examples: [
      { id: 'raw', label: 'No capacitor: bumps', controls: ['C'], set: { C: 0 } },
      { id: 'big', label: 'Big capacitor: small ripple', controls: ['C'], set: { C: 1000 } },
      { id: 'bridge', label: 'Full-wave bridge', controls: ['full'], set: { full: true } },
    ] },
    { id: 'zener', label: 'Zener regulator', set: {}, examples: [
      { id: 'heavy', label: 'Too heavy a load: drops out', controls: ['RLz'], set: { RLz: 150 } },
      { id: 'low', label: 'Supply too low', controls: ['Vs'], set: { Vs: 6 } },
    ] },
  ],
  controls: [
    { title: 'Circuit', show: (s) => s.case === 'iv', items: [
      { id: 'VS', label: 'Supply V_S', unit: 'V', min: -5, max: 10, step: 0.1 }, { id: 'R', label: 'Resistor R', unit: 'Ω', min: 10, max: 10000, log: true }, { id: 'T', label: 'Temperature', unit: 'K', min: 250, max: 400, step: 1 },
    ] },
    { title: 'Rectifier', show: (s) => s.case === 'rectifier', items: [
      { id: 'Vp', label: 'AC peak', unit: 'V', min: 2, max: 20, step: 0.5 }, { id: 'C', label: 'Capacitor', unit: 'µF', min: 0, max: 2000, step: 10 }, { id: 'RL', label: 'Load', unit: 'Ω', min: 100, max: 10000, log: true }, { id: 'full', label: 'Full wave (bridge)', type: 'check' },
    ] },
    { title: 'Regulator', show: (s) => s.case === 'zener', items: [
      { id: 'Vs', label: 'Supply', unit: 'V', min: 0, max: 20, step: 0.1 }, { id: 'Rs', label: 'Series R', unit: 'Ω', min: 47, max: 1000, log: true }, { id: 'RLz', label: 'Load', unit: 'Ω', min: 50, max: 10000, log: true }, { id: 'Vz', label: 'Zener voltage', unit: 'V', min: 2.7, max: 12, step: 0.1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), sch = createSchematic(ctx);
    return {
      changed() { ctx.setClock(state.case === 'rectifier' ? 6 : 0); },
      update() {
        const c = state.case; sch.begin();
        if (c === 'iv') {
          const p = { T: state.T }, q = state.VS > 0 ? qpoint(state.VS, state.R, p) : { V: state.VS, I: diodeI(state.VS, p) };
          sch.source([-4.4, -1.2], [-4.4, 1.2], `${state.VS} V`, false).wire([-4.4, 1.2], [-4.4, 1.6], [-3.4, 1.6]).arrowI([-4.4, 1.6], [-3.4, 1.6], 'I').resistor([-3.4, 1.6], [-2.0, 1.6], `R ${fmt(state.R)} Ω`).wire([-2.0, 1.6], [-1.4, 1.6]).diode([-1.4, 1.6], [-1.4, -1.6], `V_D ${fmt(q.V)} V`).wire([-1.4, -1.6], [-4.4, -1.6], [-4.4, -1.2]).ground([-2.9, -1.6]);
          const Vs = Array.from({ length: 300 }, (_, i) => -1 + 1.8 * i / 299), Imax = Math.max(1e-3, 1.4 * Math.abs(state.VS) / state.R);
          tr.range([-1, 0.8], [-0.1 * Imax * 1e3, Imax * 1e3]); tr.titles('V_D (V)', 'I (mA): diode (blue), load line (orange)');
          tr.line('d', Vs, Vs.map((v) => diodeI(v, p) * 1e3), { color: '--c-B' }); if (state.VS > 0) tr.line('ll', [-1, 0.8], [(state.VS + 1) / state.R * 1e3, (state.VS - 0.8) / state.R * 1e3], { color: '--c-I', width: 1.6 }); else tr.hide('ll'); tr.dots('q', [q.V], [q.I * 1e3], { color: '--accent', size: 12 });
          const lv = Array.from({ length: 200 }, (_, i) => 0.2 + 0.6 * i / 199); br.range([0.2, 0.8], [-12, 0]); br.titles('V_D (V)', 'log₁₀ I (A): exponential = straight line'); br.line('l', lv, lv.map((v) => Math.log10(diodeI(v, p))), { color: '--c-B' }); br.line('l300', lv, lv.map((v) => Math.log10(diodeI(v))), { color: '--c-ref', dashed: true, width: 1.2 });
          hud.set('a', `operating point: ${fmt(q.V)} V, ${fmt(q.I * 1e3)} mA — on the curve AND on the load line`); hud.set('b', `V_T = kT/q = ${fmt(VT(state.T) * 1e3)} mV: ×10 current costs ${fmt(VT(state.T) * Math.LN10 * 1e3)} mV`);
          hud.set('c', state.VS < 0 ? 'reverse biased: only the tiny saturation current flows' : '"0.7 V" is a rule of thumb: the voltage moves only a little as the current changes a lot');
          plots.aux.draw({ xlim: [250, 400], cursor: state.T, series: [{ x: Array.from({ length: 151 }, (_, i) => 250 + i), y: Array.from({ length: 151 }, (_, i) => qpoint(5, 1000, { T: 250 + i }).V), color: '--c-B', label: 'V_D at 5 V / 1 kΩ vs temperature (K): −2 mV/K' }] });
        } else if (c === 'rectifier') {
          const R = rectifier({ Vp: state.Vp, f: 50, R: state.RL, C: state.C * 1e-6, full: state.full, T: 0.08 }), ms = R.t.map((t) => t * 1e3), u = (time.t % 6) / 6, k = Math.floor(u * ms.length);
          // bridge drawn as a diamond: AC in at left/right corners, + out at the top, − at the bottom
          if (state.full) {
            const Lf = [-3.8, 0], T = [-3.2, 0.6], Rt = [-2.6, 0], Bt = [-3.2, -0.6];
            sch.source([-4.6, -1.4], [-4.6, 0], 'AC').wire([-4.6, 0], Lf).wire([-4.6, -1.4], [-2.3, -1.4], [-2.3, 0], Rt)
              .diode(Lf, T).diode(Rt, T).diode(Bt, Lf).diode(Bt, Rt).wire(T, [-3.2, 1.0], [-1.6, 1.0]).wire(Bt, [-3.2, -1.0], [-1.6, -1.0]);
          } else sch.source([-4.6, -0.6], [-4.6, 0.6], 'AC').wire([-4.6, 0.6], [-4.6, 1.0], [-3.8, 1.0]).diode([-3.8, 1.0], [-2.6, 1.0], 'D').wire([-2.6, 1.0], [-1.6, 1.0]).wire([-4.6, -0.6], [-4.6, -1.0], [-1.6, -1.0]);
          if (state.C > 0) sch.capacitor([-1.6, -1.0], [-1.6, 1.0], `${state.C} µF`);
          sch.wire([-1.6, 1.0], [-0.6, 1.0]).wire([-1.6, -1.0], [-0.6, -1.0]).resistor([-0.6, -1.0], [-0.6, 1.0], 'R_L').ground([-0.6, -1.0]).text('v_out', [-0.6, 1.3]);
          tr.range([0, 80], [-state.Vp * 1.1, state.Vp * 1.1]); tr.titles('t (ms)', 'AC in (grey) and DC out (blue)'); tr.line('i', ms, R.vin, { color: '--c-ref', width: 1.2 }); tr.line('o', ms, R.vout, { color: '--c-B' }); tr.dots('now', [ms[k]], [R.vout[k]], { color: '--accent', size: 10 });
          const last = R.vout.slice(-1000), rip = Math.max(...last) - Math.min(...last), avg = last.reduce((a, b) => a + b, 0) / last.length;
          const Cs = Array.from({ length: 100 }, (_, i) => 10 * (i + 1)); br.range([0, 1000], [0, Math.max(1, state.Vp)]); br.titles('C (µF)', 'ripple (V): measured dot, estimate V/(fRC) line'); br.line('r', Cs, Cs.map((cc) => Math.min(state.Vp, rippleEstimate(state.Vp - (state.full ? 1.4 : 0.7), 50, state.RL, cc * 1e-6, state.full))), { color: '--c-E' }); br.dots('m', [state.C], [rip], { color: '--accent', size: 11 });
          hud.set('a', `average DC ${fmt(avg)} V, ripple ${fmt(rip)} V peak-to-peak`); hud.set('b', state.C ? `the capacitor charges at each peak and drains through R_L in between: ΔV ≈ V/(f R C)` : 'no capacitor: the diode just chops off the negative half');
          hud.set('c', state.full ? 'bridge: both half-cycles used, ripple at 100 Hz, two diode drops' : 'half-wave: one pulse per cycle, ripple at 50 Hz');
          plots.aux.draw({ xlim: [0, 80], series: [{ x: ms, y: R.vout, color: '--c-B', label: 'v_out (V) vs t (ms)' }] });
        } else {
          const Z = zener({ Vs: state.Vs, Rs: state.Rs, Vz: state.Vz, RL: state.RLz });
          sch.source([-4.5, -0.9], [-4.5, 0.9], `${state.Vs} V`, false).wire([-4.5, 0.9], [-4.5, 1.5], [-4.0, 1.5]).resistor([-4.0, 1.5], [-2.6, 1.5], `R_s ${fmt(state.Rs)} Ω`).wire([-2.6, 1.5], [-0.6, 1.5]).diode([-1.9, -1.0], [-1.9, 1.5], `Z ${state.Vz} V`, 'zener').resistor([-0.6, -1.0], [-0.6, 1.5], `R_L ${fmt(state.RLz)} Ω`).wire([-0.6, -1.0], [-4.5, -1.0], [-4.5, -0.9]).ground([-3.2, -1.0]).dot([-1.9, 1.5]).dot([-1.9, -1.0]).text('v_out', [-0.6, 1.8]);
          const vs = Array.from({ length: 200 }, (_, i) => 20 * i / 199); tr.range([0, 20], [0, Math.max(12, state.Vz + 2)]); tr.titles('supply (V)', 'output (V): flat once the Zener conducts'); tr.line('v', vs, vs.map((v) => zener({ Vs: v, Rs: state.Rs, Vz: state.Vz, RL: state.RLz }).Vout), { color: '--c-B' }); tr.dots('now', [state.Vs], [Z.Vout], { color: '--accent', size: 11 });
          const rl = Array.from({ length: 200 }, (_, i) => 10 ** (1.7 + 2.3 * i / 199)); br.range([1.7, 4], [0, Math.max(12, state.Vz + 2)]); br.titles('log₁₀ load (Ω)', 'output (V) against the load'); br.line('l', rl.map(Math.log10), rl.map((r) => zener({ Vs: state.Vs, Rs: state.Rs, Vz: state.Vz, RL: r }).Vout), { color: '--c-v' }); br.dots('now', [Math.log10(state.RLz)], [Z.Vout], { color: '--accent', size: 11 });
          const minRL = state.Vz / ((state.Vs - state.Vz) / state.Rs);
          hud.set('a', Z.regulating ? `regulating: V_out ≈ ${fmt(Z.Vout)} V, Zener takes ${fmt(Z.Iz * 1e3)} mA` : 'not regulating: the Zener is off and V_out is a plain divider', Z.regulating ? 'good' : 'bad');
          hud.set('b', `R_s carries ${fmt(Z.Is * 1e3)} mA = load ${fmt(Z.IL * 1e3)} mA + Zener ${fmt(Z.Iz * 1e3)} mA`); hud.set('c', `works for loads above about ${fmt(minRL)} Ω (all of R_s's current would go to the load)`);
          plots.aux.draw({ xlim: [0, 20], cursor: state.Vs, series: [{ x: vs, y: vs.map((v) => 1e3 * zener({ Vs: v, Rs: state.Rs, Vz: state.Vz, RL: state.RLz }).Iz), color: '--c-I', label: 'Zener current (mA) vs supply (V)' }] });
        }
        sch.end();
      },
      theme() { tr.theme(); br.theme(); sch.theme(); },
    };
  },
};
