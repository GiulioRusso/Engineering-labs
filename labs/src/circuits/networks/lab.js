// Networks: series and parallel, Kirchhoff's current law, Thévenin, superposition, the circuit as a 3D
// potential landscape (every node lifted to its voltage, resistors as slopes), and the RLC step.
// Charges drift along every branch at a speed proportional to its current.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createSchematic } from '../../lib/viz/schematic.js';
import { solve, parallel, thevenin, rlcStep, damping } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TR = [0.3, 0.55, 4.3, 2.0], BR = [0.3, -2.35, 4.3, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const ohm = (r) => (r >= 1e6 ? `${fmt(r / 1e6)} MΩ` : r >= 1000 ? `${fmt(r / 1000)} kΩ` : `${fmt(r)} Ω`);
const ma = (i) => `${fmt(i * 1e3)} mA`;
const K = 40; // dot speed (units/s) per ampere

export default {
  id: 'networks', title: 'Networks', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [6.5, -8, 6.5], target: [0, 0, 1] } },
  camOf: (s) => (s.case === 'landscape' ? 'iso' : 'top'),
  defaults: { V: 10, R1: 100, R2: 200, R3: 300, R4: 150, par: false, on3: true, RL: 470, V2: 5, on1: true, on2: true, Rs: 10, Lm: 10, Cu: 1 },
  cases: [
    { id: 'sp', label: 'Series and parallel', set: {}, examples: [
      { id: 'par', label: 'Parallel: same voltage, currents split', controls: ['par', 'R2'], set: { par: true } },
      { id: 'big', label: 'Series with a big R2: it takes most of V', controls: ['R2'], set: { R2: 900 } },
    ] },
    { id: 'kcl', label: 'Kirchhoff: currents at a node', set: {}, examples: [
      { id: 'open', label: 'Open one branch', controls: ['on3'], set: { on3: false } },
    ] },
    { id: 'thevenin', label: 'Thévenin equivalent', set: {}, examples: [
      { id: 'match', label: 'Load = R_th: maximum power', controls: ['RL'], set: { RL: 66.7 } },
    ] },
    { id: 'super', label: 'Superposition', set: {}, examples: [
      { id: 'one', label: 'Only V1 (V2 replaced by a wire)', controls: ['on2'], set: { on2: false } },
      { id: 'two', label: 'Only V2', controls: ['on1'], set: { on1: false } },
    ] },
    { id: 'landscape', label: 'Potential landscape (3D)', set: {}, examples: [
      { id: 'steep', label: 'Big R1: a long steep drop', controls: ['R1'], set: { R1: 600 } },
    ] },
    { id: 'rlc', label: 'RLC step response', set: {}, examples: [
      { id: 'under', label: 'Small R: rings', controls: ['Rs'], set: { Rs: 20 } },
      { id: 'crit', label: 'Critically damped', controls: ['Rs'], set: { Rs: 200 } },
      { id: 'over', label: 'Large R: sluggish', controls: ['Rs'], set: { Rs: 800 } },
    ] },
  ],
  controls: [
    { title: 'Circuit', show: (s) => s.case === 'sp', items: [{ id: 'par', label: 'Parallel', type: 'check' }, { id: 'V', label: 'Source', unit: 'V', min: 1, max: 20, step: 0.1 }, { id: 'R1', label: 'R1', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'R2', label: 'R2', unit: 'Ω', min: 10, max: 1000, log: true }] },
    { title: 'Branches', show: (s) => s.case === 'kcl', items: [{ id: 'V', label: 'Source', unit: 'V', min: 1, max: 20, step: 0.1 }, { id: 'R1', label: 'R1', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'R2', label: 'R2', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'R3', label: 'R3', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'on3', label: 'Branch 3 connected', type: 'check' }] },
    { title: 'Network', show: (s) => s.case === 'thevenin', items: [{ id: 'RL', label: 'Load', unit: 'Ω', min: 10, max: 10000, log: true }, { id: 'V', label: 'Source', unit: 'V', min: 1, max: 20, step: 0.1 }, { id: 'R1', label: 'R1', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'R2', label: 'R2', unit: 'Ω', min: 10, max: 1000, log: true }] },
    { title: 'Sources', show: (s) => s.case === 'super', items: [{ id: 'on1', label: 'V1 on', type: 'check' }, { id: 'on2', label: 'V2 on', type: 'check' }, { id: 'V', label: 'V1', unit: 'V', min: 0, max: 20, step: 0.1 }, { id: 'V2', label: 'V2', unit: 'V', min: -20, max: 20, step: 0.1 }] },
    { title: 'Circuit', show: (s) => s.case === 'landscape', items: [{ id: 'V', label: 'Source', unit: 'V', min: 1, max: 20, step: 0.1 }, { id: 'R1', label: 'R1', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'R2', label: 'R2', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'R3', label: 'R3', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'R4', label: 'R4', unit: 'Ω', min: 10, max: 1000, log: true }] },
    { title: 'Circuit', show: (s) => s.case === 'rlc', items: [{ id: 'Rs', label: 'R', unit: 'Ω', min: 1, max: 1000, log: true }, { id: 'Lm', label: 'L', unit: 'mH', min: 1, max: 100, log: true }, { id: 'Cu', label: 'C', unit: 'µF', min: 0.1, max: 10, log: true }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), sch = createSchematic(ctx, { labelPool: 30 });
    const land = createCurve(stage, { max: 3000, width: 3, color: '--c-B' }), ramp = createCurve(stage, { max: 3000, width: 3, color: '--c-I' }), floor = createCurve(stage, { max: 1000, width: 1.2, color: '--line' }), balls = createCurve(stage, { max: 6000, width: 2.6, color: '--c-E' }), pump = createCurve(stage, { max: 200, width: 4, color: '--c-north' });
    const nodeL = [0, 1, 2, 3].map(() => { const l = ctx.label('', 'tick'); scene.add(l); return l; }), all3 = [land, ramp, floor, balls, pump];
    const bars = (ch, key, labels, vals, unit) => { ch.range([0.4, vals.length + 0.6], [Math.min(0, ...vals) * 1.15, Math.max(1e-9, ...vals) * 1.15]); ch.titles(labels, unit); ch.stems(key, vals.map((_, i) => i + 1), vals, { color: '--c-B', width: 14 }); };
    return {
      changed() {
        const v3 = state.case === 'landscape'; stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        tr.show(!v3); br.show(!v3); sch.show(!v3); all3.forEach((o) => { o.object.visible = v3; }); nodeL.forEach((l) => { l.visible = v3; });
        ctx.setClock(state.case === 'rlc' ? 8 : 0, { ambient: true });
      },
      update() {
        const c = state.case, u = time.t; sch.begin();
        if (c === 'sp') {
          const { V, R1, R2 } = state;
          if (!state.par) {
            const I = V / (R1 + R2), V1 = I * R1, V2 = I * R2;
            sch.source([-4.3, -0.3], [-4.3, 0.3], `${fmt(V)} V`, false).wire([-4.3, 0.3], [-4.3, 1.4], [-3.6, 1.4]).resistor([-3.6, 1.4], [-2.2, 1.4], `R1 ${ohm(R1)}`).wire([-2.2, 1.4], [-1.2, 1.4], [-1.2, 0.6]).resistor([-1.2, 0.6], [-1.2, -0.6], `R2 ${ohm(R2)}`).wire([-1.2, -0.6], [-1.2, -1.4], [-4.3, -1.4], [-4.3, -0.3]);
            sch.flow([[-4.3, 0.3], [-4.3, 1.4], [-3.6, 1.4]], K * I * u).flow([[-2.2, 1.4], [-1.2, 1.4], [-1.2, 0.6]], K * I * u).flow([[-1.2, -0.6], [-1.2, -1.4], [-4.3, -1.4], [-4.3, -0.3]], K * I * u);
            bars(tr, 'v', 'V across R1 · R2', [V1, V2], 'volts: the voltage splits in proportion to R'); bars(br, 'i', 'I in R1 · R2', [I * 1e3, I * 1e3], 'mA: the same current through both');
            hud.set('a', `series: R = R1 + R2 = ${ohm(R1 + R2)}, I = ${ma(I)} through both`); hud.set('b', `V splits: ${fmt(V1)} V + ${fmt(V2)} V = ${fmt(V)} V (divider V·R2/(R1+R2))`); hud.set('c', 'same charge must pass through both: one current, shared voltage');
          } else {
            const I1 = V / R1, I2 = V / R2, I = I1 + I2, x1 = -2.6;
            sch.source([-4.3, -0.3], [-4.3, 0.3], `${fmt(V)} V`, false).wire([-4.3, 0.3], [-4.3, 1.4], [-1.2, 1.4], [-1.2, 0.6]).wire([x1, 1.4], [x1, 0.6]).resistor([x1, 0.6], [x1, -0.6], `R1 ${ohm(R1)}`).resistor([-1.2, 0.6], [-1.2, -0.6], `R2 ${ohm(R2)}`).wire([x1, -0.6], [x1, -1.4]).wire([-1.2, -0.6], [-1.2, -1.4], [-4.3, -1.4], [-4.3, -0.3]).dot([x1, 1.4]).dot([x1, -1.4]);
            sch.flow([[-4.3, 0.3], [-4.3, 1.4], [x1, 1.4]], K * I * u).flow([[x1, 1.4], [x1, 0.6]], K * I1 * u).flow([[x1, -0.6], [x1, -1.4]], K * I1 * u).flow([[x1, 1.4], [-1.2, 1.4], [-1.2, 0.6]], K * I2 * u).flow([[-1.2, -0.6], [-1.2, -1.4], [x1, -1.4]], K * I2 * u).flow([[x1, -1.4], [-4.3, -1.4], [-4.3, -0.3]], K * I * u);
            bars(tr, 'v', 'V across R1 · R2', [V, V], 'volts: the same voltage across both'); bars(br, 'i', 'I in R1 · R2 · total', [I1 * 1e3, I2 * 1e3, I * 1e3], 'mA: the current splits, smaller R takes more');
            hud.set('a', `parallel: R = R1R2/(R1+R2) = ${ohm(parallel(R1, R2))} — less than either`); hud.set('b', `I = ${ma(I1)} + ${ma(I2)} = ${ma(I)}`); hud.set('c', 'same two nodes: one voltage, shared current');
          }
          const r2 = lin(10, 1000, 200); plots.aux.draw({ xlim: [10, 1000], cursor: R2, series: [{ x: r2, y: r2.map((r) => (state.par ? parallel(R1, r) : R1 + r)), color: '--c-B', label: `equivalent resistance (Ω) vs R2 — ${state.par ? 'never above R1' : 'grows with R2'}` }] });
        } else if (c === 'kcl') {
          const Rs = [state.R1, state.R2, state.R3], on = [true, true, state.on3], Is = Rs.map((r, k) => (on[k] ? state.V / r : 0)), I = Is.reduce((a, b) => a + b, 0), xs = [-3.2, -2.2, -1.2];
          sch.source([-4.3, -0.3], [-4.3, 0.3], `${fmt(state.V)} V`, false).wire([-4.3, 0.3], [-4.3, 1.4], [-1.2, 1.4]).wire([-1.2, -1.4], [-4.3, -1.4], [-4.3, -0.3]).dot([-3.2, 1.4]).text('node', [-3.2, 1.7]);
          xs.forEach((x, k) => { if (k === 2) sch.switch([x, 1.4], [x, 0.9], on[2]).wire([x, 0.9], [x, 0.6]); else sch.wire([x, 1.4], [x, 0.6]); sch.resistor([x, 0.6], [x, -0.6], `R${k + 1} ${ohm(Rs[k])}`).wire([x, -0.6], [x, -1.4]);
            if (on[k]) sch.flow([[x, 1.4], [x, 0.6]], K * Is[k] * u).flow([[x, -0.6], [x, -1.4]], K * Is[k] * u); });
          sch.flow([[-4.3, 0.3], [-4.3, 1.4], [-3.2, 1.4]], K * I * u).flow([[-3.2, 1.4], [-2.2, 1.4]], K * (Is[1] + Is[2]) * u).flow([[-2.2, 1.4], [-1.2, 1.4]], K * Is[2] * u).flow([[-2.2, -1.4], [-3.2, -1.4]], K * (Is[1] + Is[2]) * u).flow([[-1.2, -1.4], [-2.2, -1.4]], K * Is[2] * u).flow([[-3.2, -1.4], [-4.3, -1.4], [-4.3, -0.3]], K * I * u);
          bars(tr, 'i', 'I1 · I2 · I3 · total', [...Is, I].map((x) => x * 1e3), 'mA: what flows in = what flows out');
          bars(br, 'p', 'P1 · P2 · P3', Is.map((x) => x * state.V * 1e3), 'power (mW): the smallest R heats most');
          hud.set('a', `KCL at the node: ${ma(I)} in = ${Is.map(ma).join(' + ')} out`); hud.set('b', 'charge cannot pile up at a junction: the dots never bunch or vanish'); hud.set('c', 'each branch sees the full source voltage and draws V/R independently');
          plots.aux.draw({ xlim: [10, 1000], cursor: state.R3, series: [{ x: lin(10, 1000, 200), y: lin(10, 1000, 200).map((r) => (Is[0] + Is[1] + (on[2] ? state.V / r : 0)) * 1e3), color: '--c-B', label: 'total current (mA) vs R3 (Ω)' }] });
        } else if (c === 'thevenin') {
          const { V, R1, R2, RL } = state, T = thevenin(V, R1, R2), IL = T.Vth / (T.Rth + RL), VL = IL * RL, s = solve(2, [[1, 2, R1], [2, 0, R2], [2, 0, RL]], { 1: V });
          sch.text('the network', [-2.8, 2.35]).source([-4.4, 0.7], [-4.4, 1.3], `${fmt(V)} V`, false).wire([-4.4, 1.3], [-4.4, 1.8], [-4.1, 1.8]).resistor([-4.1, 1.8], [-3.1, 1.8], `R1 ${ohm(R1)}`).wire([-3.1, 1.8], [-1.2, 1.8]).resistor([-2.4, 1.8], [-2.4, 0.3], `R2 ${ohm(R2)}`).resistor([-1.2, 1.8], [-1.2, 0.3], `R_L ${ohm(RL)}`).wire([-1.2, 0.3], [-4.4, 0.3], [-4.4, 0.7]).dot([-2.4, 1.8]).dot([-2.4, 0.3]);
          sch.text('its Thévenin equivalent', [-2.8, -2.15]).source([-4.4, -1.4], [-4.4, -0.8], `${fmt(T.Vth)} V`, false).wire([-4.4, -0.8], [-4.4, -0.3], [-4.1, -0.3]).resistor([-4.1, -0.3], [-3.1, -0.3], `R_th ${ohm(T.Rth)}`).wire([-3.1, -0.3], [-1.2, -0.3]).resistor([-1.2, -0.3], [-1.2, -1.8], `R_L ${ohm(RL)}`).wire([-1.2, -1.8], [-4.4, -1.8], [-4.4, -1.4]);
          sch.flow([[-2.4, 1.8], [-1.2, 1.8], [-1.2, 1.45]], K * s.I[2] * u).flow([[-1.2, 0.65], [-1.2, 0.3], [-2.4, 0.3]], K * s.I[2] * u).flow([[-3.1, -0.3], [-1.2, -0.3], [-1.2, -0.7]], K * IL * u).flow([[-1.2, -1.4], [-1.2, -1.8], [-4.4, -1.8], [-4.4, -1.4]], K * IL * u);
          const rl = lin(1, 4, 200); tr.range([1, 4], [0, T.Vth * 1.1]); tr.titles('log₁₀ R_L (Ω)', 'V_load (V): network (blue) = equivalent (dashed)');
          tr.line('n', rl, rl.map((l) => solve(2, [[1, 2, R1], [2, 0, R2], [2, 0, 10 ** l]], { 1: V }).v[2]), { color: '--c-B', width: 4 }); tr.line('e', rl, rl.map((l) => T.Vth * 10 ** l / (T.Rth + 10 ** l)), { color: '--c-I', dashed: true, width: 1.6 }); tr.dots('q', [Math.log10(RL)], [VL], { color: '--accent', size: 11 });
          const P = (r) => (T.Vth / (T.Rth + r)) ** 2 * r * 1e3; br.range([1, 4], [0, P(T.Rth) * 1.15]); br.titles('log₁₀ R_L (Ω)', 'power into the load (mW): peak at R_L = R_th');
          br.line('p', rl, rl.map((l) => P(10 ** l)), { color: '--c-north' }); br.dots('q', [Math.log10(RL)], [P(RL)], { color: '--accent', size: 11 });
          hud.set('a', `V_th = V·R2/(R1+R2) = ${fmt(T.Vth)} V (open-circuit), R_th = R1‖R2 = ${ohm(T.Rth)} (sources off)`); hud.set('b', `load gets ${fmt(VL)} V and ${ma(IL)} — identical in both circuits: the dots move at the same speed`);
          hud.set('c', RL > 0.9 * T.Rth && RL < 1.1 * T.Rth ? 'matched: maximum power, but half of it is lost inside the source' : `max power when R_L = R_th = ${ohm(T.Rth)}`);
          plots.aux.draw({ xlim: [1, 4], cursor: Math.log10(RL), series: [{ x: rl, y: rl.map((l) => 10 ** l / (T.Rth + 10 ** l) * 100), color: '--c-v', label: 'efficiency (%) = share of power that reaches the load' }] });
        } else if (c === 'super') {
          const R1 = 100, R2 = 200, R3 = 300, V1 = state.on1 ? state.V : 0, V2 = state.on2 ? state.V2 : 0;
          const vm = (a, b) => solve(3, [[2, 1, R1], [3, 1, R2], [1, 0, R3]], { 2: a, 3: b }).v[1], only1 = vm(state.V, 0), only2 = vm(0, state.V2), both = vm(V1, V2);
          const draw = (on, x, v, name) => (on ? sch.source([x, -0.3], [x, 0.3], `${name} ${fmt(v)} V`, false) : sch.wire([x, -0.3], [x, 0.3]).text(`${name} off`, [x + (x < -2 ? -0.5 : 0.5), 0]));
          draw(state.on1, -4.3, state.V, 'V1'); draw(state.on2, -0.6, state.V2, 'V2');
          sch.wire([-4.3, 0.3], [-4.3, 1.4], [-4.0, 1.4]).resistor([-4.0, 1.4], [-3.0, 1.4], 'R1 100 Ω').wire([-3.0, 1.4], [-1.9, 1.4]).resistor([-1.9, 1.4], [-0.9, 1.4], 'R2 200 Ω').wire([-0.9, 1.4], [-0.6, 1.4], [-0.6, 0.3]).resistor([-2.45, 1.4], [-2.45, -1.4], 'R3 300 Ω').wire([-4.3, -0.3], [-4.3, -1.4], [-0.6, -1.4], [-0.6, -0.3]).dot([-2.45, 1.4]).dot([-2.45, -1.4]).text(`${fmt(both)} V`, [-2.45, 1.75]);
          const i1 = (V1 - both) / R1, i2 = (V2 - both) / R2, i3 = both / R3;
          sch.flow([[-4.3, 0.3], [-4.3, 1.4], [-4.0, 1.4]], K * i1 * u).flow([[-3.0, 1.4], [-2.45, 1.4]], K * i1 * u).flow([[-0.6, 0.3], [-0.6, 1.4], [-0.9, 1.4]], K * i2 * u).flow([[-1.9, 1.4], [-2.45, 1.4]], K * i2 * u).flow([[-2.45, 1.4], [-2.45, 0.6]], K * i3 * u).flow([[-2.45, -0.6], [-2.45, -1.4]], K * i3 * u);
          bars(tr, 'v', 'V1 alone · V2 alone · sum · both on', [only1, only2, only1 + only2, both], 'middle-node voltage (V)');
          bars(br, 'i', 'I1 · I2 · I3', [i1, i2, i3].map((x) => x * 1e3), 'branch currents (mA) for the sources switched on');
          hud.set('a', `V1 alone gives ${fmt(only1)} V, V2 alone ${fmt(only2)} V: together ${fmt(only1 + only2)} V`); hud.set('b', 'a source switched off is replaced by a wire (a current source by an open circuit)');
          hud.set('c', 'works because every equation is linear — it fails for powers (I²R) and for diodes');
          plots.aux.draw({ xlim: [-20, 20], cursor: state.V2, series: [{ x: lin(-20, 20, 100), y: lin(-20, 20, 100).map((v) => vm(V1, v)), color: '--c-B', label: 'middle-node voltage (V) vs V2 (V): a straight line' }] });
        } else if (c === 'landscape') {
          const { V, R1, R2, R3, R4 } = state, s = solve(3, [[1, 2, R1], [2, 0, R2], [2, 3, R3], [3, 0, R4]], { 1: V }), v = s.v, k = 2.6 / V, z = (x) => x * k;
          // floor positions: node1 (−3, 1.5), node2 (0, 1.5), node3 (3, 1.5); ground rail y = −1.5
          const P = { 1: [-3, 1.5], 2: [0, 1.5], 3: [3, 1.5] }, G = (x) => [x, -1.5], L = [], R = [], F = [];
          const seg = (arr, a, b) => arr.push(...a, ...b), zig = (a, b, za, zb) => { const n = 24, out = []; for (let i = 0; i <= n; i++) { const t = i / n, w = i === 0 || i === n ? 0 : (i % 2 ? 0.12 : -0.12), x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); out.push([x - dy / l * w, y + dx / l * w, za + (zb - za) * t]); } for (let i = 0; i < n; i++) seg(R, out[i], out[i + 1]); };
          // resistors are ramps: they carry the drop; wires stay level at their node's potential
          zig([-2.6, 1.5], [-0.4, 1.5], z(v[1]), z(v[2])); seg(L, [-3, 1.5, z(v[1])], [-2.6, 1.5, z(v[1])]); seg(L, [-0.4, 1.5, z(v[2])], [0.4, 1.5, z(v[2])]);
          zig([0, 1.2], [0, -1.2], z(v[2]), 0); seg(L, [0, 1.5, z(v[2])], [0, 1.2, z(v[2])]);
          zig([0.4, 1.5], [2.6, 1.5], z(v[2]), z(v[3])); seg(L, [2.6, 1.5, z(v[3])], [3, 1.5, z(v[3])]);
          zig([3, 1.2], [3, -1.2], z(v[3]), 0); seg(L, [3, 1.5, z(v[3])], [3, 1.2, z(v[3])]);
          seg(L, [-3, -1.5, 0], [3, -1.5, 0]); seg(L, [0, -1.2, 0], [0, -1.5, 0]); seg(L, [3, -1.2, 0], [3, -1.5, 0]);
          land.segments(L); ramp.segments(R); pump.segments([-3, -1.5, 0, -3, 1.5, z(V)]);
          for (const [a, b] of [[[-3, 1.5], [3, 1.5]], [[0, 1.5], [0, -1.5]], [[3, 1.5], [3, -1.5]], [[-3, 1.5], [-3, -1.5]], [[-3, -1.5], [3, -1.5]]]) seg(F, [...a, 0], [...b, 0]);
          for (const [p, vv] of [[P[1], v[1]], [P[2], v[2]], [P[3], v[3]]]) for (let h = 0; h < z(vv); h += 0.16) seg(F, [p[0], p[1], h], [p[0], p[1], Math.min(z(vv), h + 0.08)]);
          floor.segments(F);
          // charges: along each branch, moving downhill at a speed ∝ its current
          const B = []; const ball = (p) => { for (let i = 0; i < 6; i++) { const a0 = Math.PI * i / 3, a1 = Math.PI * (i + 1) / 3; B.push(p[0] + 0.07 * Math.cos(a0), p[1], p[2] + 0.07 * Math.sin(a0), p[0] + 0.07 * Math.cos(a1), p[1], p[2] + 0.07 * Math.sin(a1)); } };
          const path3 = (pts, shift) => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2])); const sp = 0.4, off = ((shift % sp) + sp) % sp; let j = 0; for (let d = off; d < cum.at(-1); d += sp) { while (cum[j + 1] < d) j++; const t = (d - cum[j]) / (cum[j + 1] - cum[j] || 1); ball(pts[j].map((x, q) => x + t * (pts[j + 1][q] - x))); } };
          const [I1, I2, I3] = s.I;
          path3([[-3, -1.5, 0], [-3, 1.5, z(V)], [-2.6, 1.5, z(v[1])], [-0.4, 1.5, z(v[2])], [0, 1.5, z(v[2])]], K * I1 * u * 0.6);
          path3([[0, 1.5, z(v[2])], [0, 1.2, z(v[2])], [0, -1.2, 0], [0, -1.5, 0], [-3, -1.5, 0]], K * I2 * u * 0.6);
          path3([[0, 1.5, z(v[2])], [0.4, 1.5, z(v[2])], [2.6, 1.5, z(v[3])], [3, 1.5, z(v[3])], [3, 1.2, z(v[3])], [3, -1.2, 0], [3, -1.5, 0], [0, -1.5, 0]], K * I3 * u * 0.6);
          balls.segments(B);
          [[P[1], v[1], 'node 1'], [P[2], v[2], 'node 2'], [P[3], v[3], 'node 3'], [[-3, -1.5], 0, 'ground']].forEach(([p, vv, n], i) => { nodeL[i].element.textContent = `${n}: ${fmt(vv)} V`; nodeL[i].position.set(p[0], p[1] + 0.35, z(vv) + 0.25); });
          hud.set('a', `the source lifts charge from 0 to ${fmt(V)} V (red); every resistor is a slope down (orange)`); hud.set('b', `node 2 at ${fmt(v[2])} V, node 3 at ${fmt(v[3])} V; ground is the floor`);
          hud.set('c', 'KVL: around any loop you climb exactly as much as you descend; steeper ramp = more voltage dropped');
          const dist = [0, 3, 3.4, 5.6, 6.0, 9.0], prof = [0, V, v[1], v[2], v[2], 0]; plots.aux.draw({ xlim: [0, 9], series: [{ x: dist, y: prof, color: '--c-B', label: 'potential (V) walking the loop source → R1 → R2 → ground' }] });
        } else {
          const R = state.Rs, L = state.Lm * 1e-3, C = state.Cu * 1e-6, D = damping({ R, L, C }), T = 30 / D.w0, t = u / 8 * T, vC = rlcStep(t, { R, L, C });
          sch.source([-4.3, -0.3], [-4.3, 0.3], `${t > 0 ? 1 : 0} V step`, false).wire([-4.3, 0.3], [-4.3, 1.4], [-4.0, 1.4]).resistor([-4.0, 1.4], [-3.0, 1.4], `R ${ohm(R)}`).wire([-3.0, 1.4], [-2.6, 1.4]).inductor([-2.6, 1.4], [-1.6, 1.4], `L ${fmt(state.Lm)} mH`).wire([-1.6, 1.4], [-1.2, 1.4], [-1.2, 0.5]).capacitor([-1.2, 0.5], [-1.2, -0.5], `C ${fmt(state.Cu)} µF`).wire([-1.2, -0.5], [-1.2, -1.4], [-4.3, -1.4], [-4.3, -0.3]).text(`v_C ${fmt(vC)} V`, [-0.5, -0.8]);
          const q = vC * 2.5; sch.flow([[-4.3, 0.3], [-4.3, 1.4], [-4.0, 1.4]], q).flow([[-1.6, 1.4], [-1.2, 1.4], [-1.2, 0.5]], q).flow([[-1.2, -0.5], [-1.2, -1.4], [-4.3, -1.4], [-4.3, -0.3]], q);
          const ts = lin(0, t, Math.max(2, Math.round(500 * t / T))); tr.range([0, 30], [0, 2.05]); tr.titles('ω₀t', 'v_C (V): after a 1 V step'); tr.line('v', ts.map((x) => x * D.w0), ts.map((x) => rlcStep(x, { R, L, C })), { color: '--c-B' }); tr.line('one', [0, 30], [1, 1], { color: '--ink-dim', dashed: true, width: 1 });
          const z = D.z, p = z < 1 ? [[-z, Math.sqrt(1 - z * z)], [-z, -Math.sqrt(1 - z * z)]] : [[-z + Math.sqrt(z * z - 1), 0], [-z - Math.sqrt(z * z - 1), 0]];
          br.range([-4.3, 0.5], [-1.15, 1.15]); br.titles('σ / ω₀', 'poles s / ω₀ (on the unit circle while ζ < 1)'); br.line('ax', [0, 0], [-1.2, 1.2], { color: '--ink-dim', width: 1 }); br.line('c', lin(Math.PI / 2, 1.5 * Math.PI, 60).map(Math.cos), lin(Math.PI / 2, 1.5 * Math.PI, 60).map(Math.sin), { color: '--line', dashed: true, width: 1 }); br.dots('p', p.map((x) => Math.max(-4.3, x[0])), p.map((x) => x[1]), { color: '--c-north', size: 12 });
          hud.set('a', `ζ = (R/2)√(C/L) = ${fmt(z)} — ${z < 0.98 ? 'underdamped: it overshoots and rings' : z < 1.02 ? 'critically damped: fastest without overshoot' : 'overdamped: slow, no overshoot'}`, z < 0.5 ? 'bad' : '');
          hud.set('b', `ω₀ = 1/√(LC) = ${fmt(D.w0)} rad/s (f₀ = ${fmt(D.w0 / 2 / Math.PI)} Hz)`); hud.set('c', 'energy sloshes between L and C; R decides how fast it is burned');
          plots.aux.draw({ xlim: [0, 30], series: [{ x: lin(0, 30, 300), y: lin(0, 30, 300).map((x) => { const h = 1e-3 / D.w0; return (rlcStep(x / D.w0 + h, { R, L, C }) - rlcStep(x / D.w0, { R, L, C })) / h * C * 1e3; }), color: '--c-I', label: 'current (mA) = C dv/dt vs ω₀t' }] });
        }
        sch.end();
      },
      theme() { tr.theme(); br.theme(); sch.theme(); all3.forEach((o) => o.theme()); },
    };
  },
};
