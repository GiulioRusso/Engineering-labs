// CMOS logic seen as analog circuits: the inverter (transfer curve, threshold, crowbar current), noise
// margins and how a chain of gates restores a noisy signal, gate delay, dynamic power against supply
// voltage, and the cross-coupled latch that stores a bit.
import { createChart } from '../../lib/viz/chart.js';
import { createSchematic } from '../../lib/viz/schematic.js';
import { VTN, VTP, invOut, crowbar, threshold, margins, gateDelay, dynPower, latch } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TR = [0.3, 0.55, 4.3, 2.0], BR = [0.3, -2.35, 4.3, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const ps = (t) => (t >= 1e-9 ? `${fmt(t * 1e9)} ns` : `${fmt(t * 1e12)} ps`);

// CMOS inverter at x: PMOS on top, NMOS below, shared gate and drain; returns its in/out points
function inverter(sch, x, pOn, nOn) {
  const P = sch.mos([x, 0.8], '', true), N = sch.mos([x, -0.8]), xi = x - 0.7, xo = P.S[0];
  sch.wire(P.S, N.D).wire(P.G, [xi, 0.8], [xi, -0.8], N.G).supply(P.D, 'V_DD').ground(N.S).dot([xo, 0]).dot([xi, 0]);
  sch.text(pOn ? 'on' : 'off', [x + 0.55, 0.8]).text(nOn ? 'on' : 'off', [x + 0.55, -0.8]);
  if (pOn) sch.hotWire(P.D, P.S, [xo, 0]); if (nOn) sch.hotWire([xo, 0], N.D, N.S);
  return { in: [xi, 0], out: [xo, 0] };
}
// logic-symbol inverter (triangle + bubble) pointing right (dir 1) or left (−1)
function gate(sch, c, dir = 1, s = 0.32) {
  const a = [c[0] - dir * s, c[1] + s], b = [c[0] - dir * s, c[1] - s], o = [c[0] + dir * s, c[1]];
  sch.wire(a, b, o, a).dot([o[0] + dir * 0.06, o[1]], 0.06);
  return { in: [c[0] - dir * s, c[1]], out: [o[0] + dir * 0.12, o[1]] };
}

export default {
  id: 'cmos', title: 'CMOS logic', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  defaults: { vin: 1, auto: true, r: 2, vdd: 3.3, noise: 400, W: 1, fan: 2, Cg: 2, Cw: 1, Cp: 100, fMHz: 100, alpha: 0.1, leak: 10, off: 1, Cn: 10 },
  cases: [
    { id: 'inverter', label: 'The inverter', set: {}, examples: [
      { id: 'mid', label: 'Input at V_DD/2: both on', controls: ['vin'], set: { auto: false, vin: 1.65 } },
      { id: 'skew', label: 'Equal-size PMOS: threshold drops', controls: ['r'], set: { r: 1 } },
    ] },
    { id: 'margins', label: 'Noise margins', set: {}, examples: [
      { id: 'loud', label: 'Big noise: still restored', controls: ['noise'], set: { noise: 900 } },
      { id: 'skew', label: 'Skewed gate: one margin shrinks', controls: ['r'], set: { r: 0.6 } },
    ] },
    { id: 'delay', label: 'Gate delay', set: {}, examples: [
      { id: 'fanout', label: 'Fan-out 8: 3.4× slower', controls: ['fan'], set: { fan: 8 } },
      { id: 'wide', label: 'Wider driver', controls: ['W'], set: { W: 4, fan: 8 } },
    ] },
    { id: 'power', label: 'Power', set: {}, examples: [
      { id: 'lowv', label: '1.2 V: power ÷ 7.6', controls: ['vdd'], set: { vdd: 1.2 } },
      { id: 'leaky', label: 'Leakage dominates when idle', controls: ['alpha'], set: { alpha: 0.001, leak: 200 } },
    ] },
    { id: 'latch', label: 'Memory: the latch', set: {}, examples: [
      { id: 'tiny', label: '1 µV push: slow decision', controls: ['off'], set: { off: 0.001 } },
      { id: 'neg', label: 'Push the other way', controls: ['off'], set: { off: -1 } },
    ] },
  ],
  controls: [
    { title: 'Inverter', show: (s) => s.case === 'inverter', items: [{ id: 'auto', label: 'Sweep the input', type: 'check' }, { id: 'vin', label: 'Input', unit: 'V', min: 0, max: 3.3, step: 0.01, show: (s) => !s.auto }, { id: 'r', label: 'PMOS / NMOS width', unit: '', min: 0.5, max: 4, step: 0.05 }] },
    { title: 'Noise', show: (s) => s.case === 'margins', items: [{ id: 'noise', label: 'Noise on the input', unit: 'mV', min: 0, max: 1500, step: 10 }, { id: 'r', label: 'PMOS / NMOS width', unit: '', min: 0.5, max: 4, step: 0.05 }] },
    { title: 'Load', show: (s) => s.case === 'delay', items: [
      { id: 'fan', label: 'Fan-out (gates driven)', unit: '', min: 1, max: 12, step: 1 }, { id: 'W', label: 'Driver width', unit: '×', min: 0.5, max: 8, step: 0.1 }, { id: 'Cg', label: 'Gate capacitance', unit: 'fF', min: 0.5, max: 10, step: 0.1 }, { id: 'Cw', label: 'Wire capacitance', unit: 'fF', min: 0, max: 20, step: 0.1 }, { id: 'vdd', label: 'V_DD', unit: 'V', min: 1, max: 5, step: 0.05 },
    ] },
    { title: 'Chip', show: (s) => s.case === 'power', items: [
      { id: 'vdd', label: 'V_DD', unit: 'V', min: 0.8, max: 5, step: 0.05 }, { id: 'fMHz', label: 'Clock', unit: 'MHz', min: 1, max: 3000, log: true }, { id: 'Cp', label: 'Switched capacitance', unit: 'pF', min: 1, max: 1000, log: true }, { id: 'alpha', label: 'Activity α', unit: '', min: 0.001, max: 1, log: true }, { id: 'leak', label: 'Leakage', unit: 'µA', min: 0, max: 1000, step: 1 },
    ] },
    { title: 'Latch', show: (s) => s.case === 'latch', items: [{ id: 'off', label: 'Initial imbalance', unit: 'mV', min: -10, max: 10, step: 0.001 }, { id: 'Cn', label: 'Node capacitance', unit: 'fF', min: 1, max: 50, step: 0.5 }, { id: 'r', label: 'PMOS / NMOS width', unit: '', min: 0.5, max: 4, step: 0.05 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    let ek = '', energy = [];
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), sch = createSchematic(ctx, { labelPool: 30 });
    return {
      changed() { ctx.setClock(state.case === 'inverter' ? 4 : 0); },
      update() {
        const c = state.case, t = time.t % 4, V = 3.3; sch.begin();
        if (c === 'inverter') {
          const vin = state.auto ? V * (0.5 - 0.5 * Math.cos(Math.PI * t / 2)) : state.vin, vo = invOut(vin, state.r), I = crowbar(vin, state.r), Vm = threshold(state.r);
          const g = inverter(sch, -2.4, vin < V - VTP, vin > VTN); sch.wire(g.in, [-3.8, 0]).text(`in ${fmt(vin)} V`, [-3.9, 0.25]).wire(g.out, [-0.8, 0]).text(`out ${fmt(vo)} V`, [-0.9, 0.25]);
          const vi = lin(0, V, 300); tr.range([0, V], [0, V]); tr.titles('v_in (V)', 'v_out (V); dashed: v_out = v_in');
          tr.line('vtc', vi, vi.map((v) => invOut(v, state.r)), { color: '--c-B' }); tr.line('d', [0, V], [0, V], { color: '--ink-dim', dashed: true, width: 1 }); tr.dots('q', [vin], [vo], { color: '--accent', size: 12 });
          br.range([0, V], [0, crowbar(Vm, state.r) * 1.25e6]); br.titles('v_in (V)', 'current from V_DD to ground (µA)');
          br.line('i', vi, vi.map((v) => crowbar(v, state.r) * 1e6), { color: '--c-north' }); br.dots('q', [vin], [I * 1e6], { color: '--accent', size: 11 });
          hud.set('a', vin < VTN ? 'input low: NMOS off, PMOS on → output pulled to V_DD' : vin > V - VTP ? 'input high: PMOS off, NMOS on → output pulled to ground' : 'in between: both transistors conduct', vin < VTN || vin > V - VTP ? 'good' : 'bad');
          hud.set('b', `switching threshold V_M = ${fmt(Vm)} V (where v_out = v_in)`); hud.set('c', `${fmt(I * 1e6)} µA flows straight through ("crowbar") — zero in both stable states`);
          const tr2 = lin(-1, 2, 60); if (ek !== `${state.r}`) { ek = `${state.r}`; let E1 = 0; for (let k = 0; k < 100; k++) E1 += crowbar(V * (k + 0.5) / 100, state.r) * V / 100; energy = tr2.map((l) => E1 * 10 ** l * 1e-9 * 1e15); }
          plots.aux.draw({ xlim: [-1, 2], series: [{ x: tr2, y: energy, color: '--c-north', label: 'crowbar energy per edge (fJ) vs log₁₀ input rise time (ns): slow edges waste energy' }] });
        } else if (c === 'margins') {
          const M = margins(state.r), Vm = threshold(state.r), xs = [-4.1, -3.2, -2.3, -1.4, -0.5];
          xs.slice(0, 4).forEach((x, i) => { const gg = gate(sch, [x + 0.45, 0]); sch.wire([x, 0], gg.in); if (i === 0) sch.text('noisy in', [x - 0.1, 0.45]); sch.text(`${i + 1}`, [x + 0.4, -0.55]); });
          sch.wire([-0.6, 0], [-0.4, 0]).text('clean', [-0.5, 0.45]);
          const vi = lin(0, V, 300), vtc = vi.map((v) => invOut(v, state.r)); tr.range([0, V], [0, V]); tr.titles('v_in (V)', 'v_out (V): transfer curve, slope −1 at V_IL and V_IH');
          tr.line('vtc', vi, vtc, { color: '--c-B' }); tr.dots('m', [M.VIL, M.VIH], [M.VOH, M.VOL], { color: '--accent', size: 11 }); tr.line('il', [M.VIL, M.VIL], [0, V], { color: '--c-v', dashed: true, width: 1 }); tr.line('ih', [M.VIH, M.VIH], [0, V], { color: '--c-v', dashed: true, width: 1 });
          const ts = lin(0, 4, 800), n = state.noise / 1000, sig = ts.map((x, i) => Math.min(V, Math.max(0, (Math.floor(x) % 2 ? V : 0) + n * (Math.sin(37 * x + 1) * 0.6 + Math.sin(91 * x) * 0.4) * (Math.floor(x) % 2 ? -1 : 1) * (0.6 + 0.4 * Math.sin(i)))));
          const s1 = sig.map((v) => invOut(v, state.r)), s2 = s1.map((v) => invOut(v, state.r)), s4 = s2.map((v) => invOut(invOut(v, state.r), state.r));
          br.range([0, 4], [-0.2, V + 0.2]); br.titles('t (bit periods)', 'voltage (V): input grey → after 2 gates orange → after 4 blue'); br.line('i', ts, sig, { color: '--c-ref', width: 1 }); br.line('2', ts, s2, { color: '--c-I', width: 1.3 }); br.line('4', ts, s4, { color: '--c-B' });
          hud.set('a', `NM_L = V_IL − V_OL = ${fmt(M.NML)} V · NM_H = V_OH − V_IH = ${fmt(M.NMH)} V`, Math.min(M.NML, M.NMH) > 0.5 ? 'good' : 'bad'); hud.set('b', `V_IL ${fmt(M.VIL)} V, V_IH ${fmt(M.VIH)} V, V_M ${fmt(Vm)} V`);
          hud.set('c', 'outside the steep middle the gain is below 1: each gate squeezes noise out instead of passing it on');
          plots.aux.draw({ xlim: [0.5, 4], cursor: state.r, series: [{ x: lin(0.5, 4, 40), y: lin(0.5, 4, 40).map((r) => margins(r).NML), color: '--c-B', label: 'NM_L (V) vs PMOS/NMOS width' }, { x: lin(0.5, 4, 40), y: lin(0.5, 4, 40).map((r) => margins(r).NMH), color: '--c-I', label: 'NM_H (V)' }] });
        } else if (c === 'delay') {
          const CL = (state.fan * state.Cg + state.Cw) * 1e-15, D = gateDelay(state.vdd, state.W, CL), tau = D.Ron * CL;
          const g = inverter(sch, -3.0, false, true); sch.wire(g.in, [-4.2, 0]).text('in ↑', [-4.2, 0.25]).wire(g.out, [-1.6, 0]).capacitor([-1.6, 0], [-1.6, -1.4], `C_L ${fmt(CL * 1e15)} fF`).ground([-1.6, -1.4]);
          for (let i = 0; i < Math.min(state.fan, 4); i++) { const gg = gate(sch, [-0.8, 1.2 - 0.55 * i], 1, 0.2); sch.wire([-1.6, 0], [-1.2, 0], [-1.2, 1.2 - 0.55 * i], gg.in); }
          if (state.fan > 4) sch.text(`… ${state.fan} gates`, [-0.8, -1.1]);
          const ts = lin(0, 6 * tau, 300); tr.range([0, 6 * tau * 1e12], [0, state.vdd * 1.05]); tr.titles('t (ps)', 'v_out (V): C_L discharging via R_on');
          tr.line('v', ts.map((x) => x * 1e12), ts.map((x) => state.vdd * Math.exp(-x / tau)), { color: '--c-B' }); tr.line('h', [0, 6 * tau * 1e12], [state.vdd / 2, state.vdd / 2], { color: '--ink-dim', dashed: true, width: 1 }); tr.dots('tp', [D.tp * 1e12], [state.vdd / 2], { color: '--accent', size: 12 });
          const fo = lin(1, 12, 12); br.range([1, 12], [0, gateDelay(state.vdd, state.W, (12 * state.Cg + state.Cw) * 1e-15).tp * 1.1e12]); br.titles('fan-out', 't_p (ps): grows linearly with the load');
          br.line('t', fo, fo.map((f) => gateDelay(state.vdd, state.W, (f * state.Cg + state.Cw) * 1e-15).tp * 1e12), { color: '--c-B' }); br.dots('q', [state.fan], [D.tp * 1e12], { color: '--accent', size: 11 });
          hud.set('a', `t_p = 0.69 R_on C_L = 0.69 × ${fmt(D.Ron / 1e3)} kΩ × ${fmt(CL * 1e15)} fF = ${ps(D.tp)}`); hud.set('b', `R_on = 1/(k W (V_DD − V_th)): a wider or harder-driven transistor is a smaller resistor`);
          hud.set('c', 'but a wider driver has a bigger input capacitance: it loads the gate before it');
          const vs = lin(1, 5, 100); plots.aux.draw({ xlim: [1, 5], cursor: state.vdd, series: [{ x: vs, y: vs.map((v) => gateDelay(v, state.W, CL).tp * 1e12), color: '--c-I', label: 't_p (ps) vs V_DD (V): low supply, slow gates' }] });
        } else if (c === 'power') {
          const P = dynPower({ alpha: state.alpha, C: state.Cp * 1e-12, vdd: state.vdd, f: state.fMHz * 1e6, Ileak: state.leak * 1e-6 }), tot = P.dyn + P.leak;
          const g = inverter(sch, -3.0, true, false); sch.wire(g.in, [-4.2, 0]).text('clock', [-4.2, 0.25]).wire(g.out, [-1.6, 0]).capacitor([-1.6, 0], [-1.6, -1.4], 'C').ground([-1.6, -1.4]).text('E = C V_DD² per cycle', [-1.4, 1.5]);
          const vs = lin(0.8, 5, 200), pw = (v) => { const q = dynPower({ alpha: state.alpha, C: state.Cp * 1e-12, vdd: v, f: state.fMHz * 1e6, Ileak: state.leak * 1e-6 }); return (q.dyn + q.leak) * 1e3; };
          tr.range([0.8, 5], [0, pw(5) * 1.05]); tr.titles('V_DD (V)', 'power (mW) = α C V² f + I_leak V'); tr.line('p', vs, vs.map(pw), { color: '--c-north' }); tr.dots('q', [state.vdd], [tot * 1e3], { color: '--accent', size: 12 });
          const td = (v) => gateDelay(v, 1, 10e-15).tp * 1e12; br.range([0.8, 5], [0, td(0.8) * 1.05]); br.titles('V_DD (V)', 'gate delay (ps): the price of a low supply');
          br.line('d', vs, vs.map(td), { color: '--c-B' }); br.dots('q', [state.vdd], [td(state.vdd)], { color: '--accent', size: 11 });
          hud.set('a', `${fmt(tot * 1e3)} mW: switching ${fmt(P.dyn * 1e3)} mW + leakage ${fmt(P.leak * 1e3)} mW`, P.leak > P.dyn ? 'bad' : ''); hud.set('b', `halving V_DD quarters the switching power: (${fmt(state.vdd)} V)² vs (3.3 V)² = ×${fmt((state.vdd / 3.3) ** 2)}`);
          hud.set('c', 'every transition charges C to V_DD and dumps it: ½CV² lost in each switch');
          plots.aux.draw({ xlim: [0.8, 5], cursor: state.vdd, series: [{ x: vs, y: vs.map((v) => pw(v) * td(v)), color: '--c-E', label: 'power × delay (energy per operation, arb.) vs V_DD' }] });
        } else {
          const L = latch(state.off * 1e-3, { r: state.r, C: state.Cn * 1e-15 }), tps = L.ta.map((_, i) => i * L.dt * 1e12).filter((_, i) => i % 2 === 0), A = L.ta.filter((_, i) => i % 2 === 0), B = L.tb.filter((_, i) => i % 2 === 0);
          const g1 = gate(sch, [-2.6, 0.6], 1), g2 = gate(sch, [-2.6, -0.6], -1); sch.wire(g1.out, [-1.6, 0.6], [-1.6, -0.6], g2.in).wire(g2.out, [-3.6, -0.6], [-3.6, 0.6], g1.in).dot([-1.6, 0.6]).dot([-3.6, -0.6]).text('A', [-1.35, 0.6]).text('B', [-3.85, -0.6]).text(`A = ${fmt(A.at(-1), 2)} V, B = ${fmt(B.at(-1), 2)} V`, [-2.6, -1.4]);
          tr.range([0, tps.at(-1)], [0, V]); tr.titles('t (ps)', 'node A (blue), node B (orange)');
          tr.line('a', tps, A, { color: '--c-B' }); tr.line('b', tps, B, { color: '--c-I' }); if (Number.isFinite(L.res)) tr.dots('r', [L.res * 1e12], [V / 2], { color: '--accent', size: 11 }); else tr.hide('r');
          const vi = lin(0, V, 200); br.range([0, V], [0, V]); br.titles('V_A (V)', 'V_B (V): butterfly, the curves cross 3 times');
          br.line('f', vi, vi.map((v) => invOut(v, state.r)), { color: '--c-B' }); br.line('g', vi.map((v) => invOut(v, state.r)), vi, { color: '--c-I' }); br.dots('fp', [0, L.Vm, V], [V, L.Vm, 0], { color: '--accent', size: 11 });
          hud.set('a', Number.isFinite(L.res) ? `decided in ${ps(L.res)}: A went ${A.at(-1) > V / 2 ? 'high' : 'low'}` : 'still undecided (metastable)', Number.isFinite(L.res) ? 'good' : 'bad');
          hud.set('b', 'two stable points (the rails) and one unstable in the middle: a bit of memory'); hud.set('c', 'resolution time grows only with log(1/imbalance) — but a perfect tie never resolves');
          const lo = lin(-6, 1, 30); plots.aux.draw({ xlim: [-6, 1], cursor: Math.log10(Math.abs(state.off) * 1e-3 + 1e-12), series: [{ x: lo, y: lo.map((l) => latch(10 ** l, { r: state.r, C: state.Cn * 1e-15 }).res * 1e12), color: '--c-B', label: 'decision time (ps) vs log₁₀ imbalance (V): a straight line' }] });
        }
        sch.end();
      },
      theme() { tr.theme(); br.theme(); sch.theme(); },
    };
  },
};
