// The components one at a time. Charges drift along the wires: each dot's displacement is the charge
// that has passed, so they speed up with the current, stop when it stops and reverse when it reverses.
import { createChart } from '../../lib/viz/chart.js';
import { createSchematic } from '../../lib/viz/schematic.js';
import { rc, rl, sineDrive, lcTank } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TR = [0.3, 0.55, 4.3, 2.0], BR = [0.3, -2.35, 4.3, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const ohm = (r) => (r >= 1e6 ? `${fmt(r / 1e6)} MΩ` : r >= 1000 ? `${fmt(r / 1000)} kΩ` : `${fmt(r)} Ω`);
// a loop: source on the left (x = −4.3), top wire at y = 1.4, part on the right at x = −1.2, bottom wire y = −1.4
const X0 = -4.3, X1 = -1.2, Y = 1.4;
const KIND = { R: 'resistor', C: 'capacitor', L: 'inductor' };

export default {
  id: 'components', title: 'Components', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  defaults: { V: 5, R: 100, Rc: 1000, C: 10, Lm: 100, kind: 'C', f: 50, Rt: 0 },
  cases: [
    { id: 'resistor', label: 'Source and resistor', set: {}, examples: [
      { id: 'double', label: 'Double the voltage: double the current', controls: ['V'], set: { V: 10 } },
      { id: 'small', label: 'Small R: lots of heat', controls: ['R'], set: { R: 10 } },
    ] },
    { id: 'capacitor', label: 'Capacitor', set: {}, examples: [
      { id: 'big', label: 'Bigger C: slower', controls: ['C'], set: { C: 47 } },
      { id: 'smallr', label: 'Smaller R: faster, bigger current', controls: ['Rc'], set: { Rc: 220 } },
    ] },
    { id: 'inductor', label: 'Inductor', set: {}, examples: [
      { id: 'bigl', label: 'Bigger L: current slower to change', controls: ['Lm'], set: { Lm: 470 } },
    ] },
    { id: 'sine', label: 'Under a sine', set: {}, examples: [
      { id: 'R', label: 'Resistor: in step', controls: ['kind'], set: { kind: 'R' } },
      { id: 'L', label: 'Inductor: current lags 90°', controls: ['kind'], set: { kind: 'L' } },
      { id: 'hf', label: 'Capacitor at high frequency', controls: ['f'], set: { kind: 'C', f: 500 } },
    ] },
    { id: 'lc', label: 'LC: energy back and forth', set: {}, examples: [
      { id: 'lossy', label: 'With resistance: it dies out', controls: ['Rt'], set: { Rt: 2 } },
    ] },
  ],
  controls: [
    { title: 'Circuit', show: (s) => s.case === 'resistor', items: [{ id: 'V', label: 'Voltage', unit: 'V', min: -10, max: 10, step: 0.1 }, { id: 'R', label: 'Resistance', unit: 'Ω', min: 1, max: 1000, log: true }] },
    { title: 'Circuit', show: (s) => s.case === 'capacitor', items: [{ id: 'C', label: 'Capacitance', unit: 'µF', min: 1, max: 100, log: true }, { id: 'Rc', label: 'Resistance', unit: 'Ω', min: 100, max: 10000, log: true }, { id: 'V', label: 'Source', unit: 'V', min: 1, max: 10, step: 0.1 }] },
    { title: 'Circuit', show: (s) => s.case === 'inductor', items: [{ id: 'Lm', label: 'Inductance', unit: 'mH', min: 10, max: 1000, log: true }, { id: 'R', label: 'Resistance', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'V', label: 'Source', unit: 'V', min: 1, max: 10, step: 0.1 }] },
    { title: 'Drive', show: (s) => s.case === 'sine', items: [{ id: 'kind', label: 'Part', type: 'segmented', options: [['R', 'R'], ['C', 'C'], ['L', 'L']] }, { id: 'f', label: 'Frequency', unit: 'Hz', min: 5, max: 1000, log: true }] },
    { title: 'Tank', show: (s) => s.case === 'lc', items: [{ id: 'Lm', label: 'Inductance', unit: 'mH', min: 10, max: 1000, log: true }, { id: 'C', label: 'Capacitance', unit: 'µF', min: 1, max: 100, log: true }, { id: 'Rt', label: 'Series resistance', unit: 'Ω', min: 0, max: 20, step: 0.1 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), sch = createSchematic(ctx);
    // the loop split at the part (gap g around its middle), oriented from the source's + terminal
    const loopTo = (g) => [[X0, 0.3], [X0, Y], [X1, Y], [X1, g]], loopFrom = (g) => [[X1, -g], [X1, -Y], [X0, -Y], [X0, -0.3]];
    // with a resistor on the top wire (x −3.7 … −2.3) the path is broken there too
    const flowLoop = (q, g = 0.25, res = false) => { if (res) sch.flow([[X0, 0.3], [X0, Y], [-3.7, Y]], q).flow([[-2.3, Y], [X1, Y], [X1, g]], q); else sch.flow(loopTo(g), q); sch.flow(loopFrom(g), q); };
    return {
      changed() { ctx.setClock(state.case === 'resistor' ? 0 : 8, { ambient: true }); },
      update() {
        const c = state.case, u = time.t; sch.begin();
        if (c === 'resistor') {
          const I = state.V / state.R, P = state.V * I;
          sch.source([X0, -0.3], [X0, 0.3], `${fmt(state.V)} V`, false).wire([X0, 0.3], [X0, Y], [X1, Y], [X1, 0.6]).resistor([X1, 0.6], [X1, -0.6], `R ${ohm(state.R)}`).wire([X1, -0.6], [X1, -Y], [X0, -Y], [X0, -0.3]);
          // ambient drift: speed ∝ current (scaled so 50 mA ≈ 1 unit/s), clipped so it stays readable
          const v = Math.max(-3, Math.min(3, I * 20)); sch.flow([[X0, 0.3], [X0, Y], [X1, Y], [X1, 0.6]], v * u).flow([[X1, -0.6], [X1, -Y], [X0, -Y], [X0, -0.3]], v * u);
          const vv = lin(-10, 10, 2); tr.range([-10, 10], [-Math.max(0.05, 10 / state.R) * 1e3, Math.max(0.05, 10 / state.R) * 1e3]); tr.titles('V (V)', 'I (mA): a straight line, slope 1/R');
          tr.line('ohm', vv, vv.map((x) => x / state.R * 1e3), { color: '--c-B' }); tr.dots('q', [state.V], [I * 1e3], { color: '--accent', size: 12 });
          br.range([-10, 10], [0, 100 / state.R * 1e3]); br.titles('V (V)', 'power (mW) = V²/R: heat in the resistor');
          br.line('p', lin(-10, 10, 200), lin(-10, 10, 200).map((x) => x * x / state.R * 1e3), { color: '--c-north' }); br.dots('q', [state.V], [P * 1e3], { color: '--accent', size: 12 });
          hud.set('a', `I = V/R = ${fmt(state.V)} / ${ohm(state.R)} = ${fmt(I * 1e3)} mA`); hud.set('b', `P = V·I = ${fmt(P * 1e3)} mW turned into heat`);
          hud.set('c', 'no memory: change V and the current changes at the same instant');
          plots.aux.draw({ xlim: [1, 1000], cursor: state.R, series: [{ x: lin(1, 1000, 200), y: lin(1, 1000, 200).map((r) => state.V / r * 1e3), color: '--c-B', label: `I (mA) vs R (Ω) at ${fmt(state.V)} V: halve R, double I` }] });
        } else if (c === 'capacitor' || c === 'inductor') {
          const cap = c === 'capacitor', R = cap ? state.Rc : state.R, tau = cap ? R * state.C * 1e-6 : state.Lm * 1e-3 / R, P = 10 * tau, T = 2 * P, t = u / 8 * T;
          const at = (x) => (cap ? rc(x, { V: state.V, R, C: state.C * 1e-6, P }) : rl(x, { V: state.V, R, L: state.Lm * 1e-3, P }));
          const s = at(t), vs = s.vs, i = s.i;
          sch.source([X0, -0.3], [X0, 0.3], `${fmt(vs)} V`, false).wire([X0, 0.3], [X0, Y], [-3.7, Y]).resistor([-3.7, Y], [-2.3, Y], `R ${ohm(R)}`).wire([-2.3, Y], [X1, Y], [X1, 0.6]).wire([X1, -0.6], [X1, -Y], [X0, -Y], [X0, -0.3]);
          if (cap) sch.capacitor([X1, 0.6], [X1, -0.6], `${fmt(state.C)} µF`).text(`${fmt(s.vC)} V`, [X1 + 0.6, -0.35]); else sch.inductor([X1, 0.6], [X1, -0.6], `${fmt(state.Lm)} mH`).text(`${fmt(s.vL)} V`, [X1 + 0.6, -0.35]);
          // dot displacement = charge passed: q = C v_C for the capacitor, ∫ i dt (numerically) for the inductor
          const q = cap ? state.C * 1e-6 * s.vC : (() => { let Q = 0; const n = 200; for (let k = 0; k < n; k++) Q += at((k + 0.5) * t / n).i * t / n; return Q; })(), scale = cap ? 3 / (state.C * 1e-6 * state.V) : 3 / (state.V / R * tau);
          flowLoop(q * scale, 0.65, true);
          const ts = lin(0, t, Math.max(2, Math.round(400 * t / T))), tt = (x) => x / tau;
          tr.range([0, T / tau], [-0.1 * state.V, state.V * 1.1]); tr.titles('t / τ', cap ? 'source (grey) and capacitor voltage (blue), V' : 'source (grey) and inductor voltage (blue), V');
          tr.line('s', ts.map(tt), ts.map((x) => at(x).vs), { color: '--c-ref', width: 1.2 }); tr.line('v', ts.map(tt), ts.map((x) => (cap ? at(x).vC : at(x).vL)), { color: '--c-B' }); if (cap) tr.line('n', [], [], {});
          const Im = state.V / R * 1e3; br.range([0, T / tau], [-Im * 1.15, Im * 1.15]); br.titles('t / τ', 'current (mA)'); br.line('i', ts.map(tt), ts.map((x) => at(x).i * 1e3), { color: '--c-I' }); br.dots('n', [tt(t)], [i * 1e3], { color: '--accent', size: 10 });
          hud.set('a', cap ? `τ = RC = ${fmt(tau * 1e3)} ms: 63% of the way after one τ, ~99% after 5τ` : `τ = L/R = ${fmt(tau * 1e3)} ms`);
          hud.set('b', cap ? 'i = C dv/dt: current flows only while the voltage is changing — the voltage cannot jump' : 'v = L di/dt: the voltage appears only while the current is changing — the current cannot jump');
          hud.set('c', cap ? `stored energy ½Cv² = ${fmt(0.5 * state.C * 1e-6 * s.vC ** 2 * 1e3)} mJ` : `stored energy ½Li² = ${fmt(0.5 * state.Lm * 1e-3 * i * i * 1e3)} mJ`);
          plots.aux.draw({ xlim: [0, T / tau], series: [{ x: ts.map(tt), y: ts.map((x) => { const z = at(x); return cap ? 0.5 * state.C * 1e-6 * z.vC ** 2 * 1e3 : 0.5 * state.Lm * 1e-3 * z.i ** 2 * 1e3; }), color: '--c-E', label: 'stored energy (mJ) vs t/τ' }] });
        } else if (c === 'sine') {
          const S = sineDrive(state.kind, { V: 1, f: state.f, R: 100, C: 10e-6, L: 0.1 }), w = 2 * Math.PI * state.f, cyc = 2, t = u / 8 * cyc / state.f, i = S.I * Math.sin(w * t + S.phi), v = Math.sin(w * t);
          sch.source([X0, -0.3], [X0, 0.3], '1 V', true).wire([X0, 0.3], [X0, Y], [X1, Y], [X1, 0.6]).wire([X1, -0.6], [X1, -Y], [X0, -Y], [X0, -0.3]);
          sch[KIND[state.kind]]([X1, 0.6], [X1, -0.6], { R: '100 Ω', C: '10 µF', L: '100 mH' }[state.kind]);
          flowLoop(-Math.cos(w * t + S.phi) * 0.8, 0.65);
          const ts = lin(0, cyc / state.f, 400), ms = (x) => x * 1e3, In = (x) => Math.sin(w * x + S.phi);
          tr.range([0, ms(cyc / state.f)], [-1.2, 1.2]); tr.titles('t (ms)', 'voltage (grey) and current (orange), each ÷ its peak');
          tr.line('v', ts.map(ms), ts.map((x) => Math.sin(w * x)), { color: '--c-ref', width: 1.3 }); tr.line('i', ts.map(ms), ts.map(In), { color: '--c-I' }); tr.dots('n', [ms(t), ms(t)], [v, i / S.I], { color: '--accent', size: 10 });
          br.range([-2.6, 2.6], [-2.6 * BR[3] / BR[2], 2.6 * BR[3] / BR[2]]); br.titles('real part (÷ peak)', 'imaginary part (÷ peak): phasors, voltage grey, current orange');
          const th = w * t, V = [Math.cos(th - Math.PI / 2), Math.sin(th - Math.PI / 2)], A = [Math.cos(th - Math.PI / 2 + S.phi), Math.sin(th - Math.PI / 2 + S.phi)];
          br.line('pv', [0, V[0]], [0, V[1]], { color: '--c-ref', width: 3 }); br.line('pi', [0, A[0] * 0.8], [0, A[1] * 0.8], { color: '--c-I', width: 3 }); br.line('circ', lin(0, 2 * Math.PI, 80).map(Math.cos), lin(0, 2 * Math.PI, 80).map(Math.sin), { color: '--line', width: 1 });
          hud.set('a', state.kind === 'R' ? 'resistor: current and voltage peak together (0°)' : state.kind === 'C' ? 'capacitor: current peaks a quarter cycle BEFORE the voltage (leads 90°)' : 'inductor: current peaks a quarter cycle AFTER the voltage (lags 90°)');
          hud.set('b', `|Z| = ${ohm(S.Z)}: current amplitude ${fmt(S.I * 1e3)} mA for 1 V`); hud.set('c', state.kind === 'C' ? 'X_C = 1/(ωC): higher frequency, LOWER opposition' : state.kind === 'L' ? 'X_L = ωL: higher frequency, HIGHER opposition' : 'R does not care about frequency');
          const fs = lin(0.7, 3, 100); plots.aux.draw({ xlim: [0.7, 3], cursor: Math.log10(state.f), series: [['R', '--c-B'], ['C', '--c-v'], ['L', '--c-I']].map(([k, col]) => ({ x: fs, y: fs.map((l) => Math.log10(sineDrive(k, { f: 10 ** l, R: 100, C: 10e-6, L: 0.1 }).Z)), color: col, label: `log₁₀|Z| ${k}` })) });
        } else {
          const L = state.Lm * 1e-3, C = state.C * 1e-6, w0 = 1 / Math.sqrt(L * C), T = 6 * 2 * Math.PI / w0, t = u / 8 * T, s = lcTank(t, { V0: 5, L, C, R: state.Rt }), E0 = 0.5 * C * 25;
          sch.capacitor([X0, 0.6], [X0, -0.6], `${fmt(state.C)} µF`).wire([X0, 0.6], [X0, Y], [X1, Y], [X1, 0.6]).inductor([X1, 0.6], [X1, -0.6], `${fmt(state.Lm)} mH`).wire([X1, -0.6], [X1, -Y], [X0, -Y], [X0, -0.6]);
          if (state.Rt > 0) sch.text(`R ${fmt(state.Rt)} Ω`, [-2.75, -Y - 0.3]);
          const q = C * (5 - s.vC); sch.flow([[X0, 0.6], [X0, Y], [X1, Y], [X1, 0.6]], q / (C * 5) * 1.2).flow([[X1, -0.6], [X1, -Y], [X0, -Y], [X0, -0.6]], q / (C * 5) * 1.2);
          const ts = lin(0, t, Math.max(2, Math.round(600 * t / T))), ms = (x) => x * 1e3, Imax = 5 * Math.sqrt(C / L);
          tr.range([0, ms(T)], [-5.5, 5.5]); tr.titles('t (ms)', 'v_C (blue, V) and current (orange, scaled)');
          tr.line('v', ts.map(ms), ts.map((x) => lcTank(x, { V0: 5, L, C, R: state.Rt }).vC), { color: '--c-B' }); tr.line('i', ts.map(ms), ts.map((x) => lcTank(x, { V0: 5, L, C, R: state.Rt }).i / Imax * 5), { color: '--c-I', width: 1.4 });
          br.range([0.4, 3.6], [0, E0 * 1.1e3]); br.titles('electric · magnetic · total', 'energy (mJ)'); br.stems('e', [1, 2, 3], [s.EC * 1e3, s.EL * 1e3, (s.EC + s.EL) * 1e3], { color: '--c-E', width: 16 });
          hud.set('a', `f₀ = 1/(2π√(LC)) = ${fmt(w0 / 2 / Math.PI)} Hz`); hud.set('b', 'the capacitor empties into the inductor’s magnetic field, which then refills the capacitor the other way');
          hud.set('c', state.Rt > 0 ? `R turns ${fmt((1 - (s.EC + s.EL) / E0) * 100, 2)}% of the energy into heat so far` : 'no resistance: the total never changes');
          plots.aux.draw({ xlim: [0, ms(T)], series: [{ x: ts.map(ms), y: ts.map((x) => { const z = lcTank(x, { V0: 5, L, C, R: state.Rt }); return z.EC * 1e3; }), color: '--c-B', label: 'electric energy (mJ)' }, { x: ts.map(ms), y: ts.map((x) => { const z = lcTank(x, { V0: 5, L, C, R: state.Rt }); return z.EL * 1e3; }), color: '--c-I', label: 'magnetic energy (mJ)' }] });
        }
        sch.end();
      },
      theme() { tr.theme(); br.theme(); sch.theme(); },
    };
  },
};
