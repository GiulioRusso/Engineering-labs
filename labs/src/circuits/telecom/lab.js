// Radio circuits: how many poles a filter needs (Butterworth), the LC ladder that builds it, an
// L-network that makes a load look like the source, the diode envelope detector, and the mixer.
import { createChart } from '../../lib/viz/chart.js';
import { createSchematic } from '../../lib/viz/schematic.js';
import { butterworth, ladder, lMatch, matchedPower, mismatchPower, envelope, mixLines } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const TR = [0.3, 0.55, 4.3, 2.0], BR = [0.3, -2.35, 4.3, 2.0];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const ohm = (r) => (r >= 1000 ? `${fmt(r / 1000)} kΩ` : `${fmt(r)} Ω`);
const si = (v, u) => { const p = [[1e-12, 'p'], [1e-9, 'n'], [1e-6, 'µ'], [1e-3, 'm'], [1, '']].reverse().find(([s]) => Math.abs(v) >= s) || [1e-12, 'p']; return `${fmt(v / p[0])} ${p[1]}${u}`; };
const dB = (x) => 20 * Math.log10(Math.max(x, 1e-9));

export default {
  id: 'telecom', title: 'Radio circuits', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  defaults: { n: 3, fn: 2, R0: 50, Rs: 50, RLm: 200, fr: 1, m: 0.6, tau: 0.15, f1: 10, f2: 9 },
  cases: [
    { id: 'select', label: 'Selectivity', set: {}, examples: [
      { id: 'n1', label: 'One pole: the neighbour gets through', controls: ['n'], set: { n: 1 } },
      { id: 'n7', label: 'Seven poles: a wall', controls: ['n'], set: { n: 7 } },
    ] },
    { id: 'ladder', label: 'LC ladder', set: {}, examples: [
      { id: 'n5', label: 'Fifth order', controls: ['n'], set: { n: 5 } },
    ] },
    { id: 'match', label: 'Impedance matching', set: {}, examples: [
      { id: 'big', label: '50 Ω into 1 kΩ: high Q, narrow', controls: ['RLm'], set: { RLm: 1000 } },
      { id: 'off', label: 'Used at 1.5 f₀', controls: ['fr'], set: { fr: 1.5 } },
    ] },
    { id: 'envelope', label: 'Envelope detector', set: {}, examples: [
      { id: 'slow', label: 'τ too long: it cannot follow', controls: ['tau'], set: { tau: 1.5 } },
      { id: 'fast', label: 'τ too short: carrier ripple', controls: ['tau'], set: { tau: 0.02 } },
    ] },
    { id: 'mixer', label: 'Mixer', set: {}, examples: [
      { id: 'if', label: '10 MHz with 10.7 MHz: IF 0.7 MHz', controls: ['f2'], set: { f2: 10.7 } },
    ] },
  ],
  controls: [
    { title: 'Filter', show: (s) => s.case === 'select' || s.case === 'ladder', items: [{ id: 'n', label: 'Order n (poles)', unit: '', min: 1, max: 9, step: 1 }, { id: 'fn', label: 'Neighbour channel', unit: '× f_c', min: 1.1, max: 5, step: 0.05, show: (s) => s.case === 'select' }, { id: 'R0', label: 'System impedance', unit: 'Ω', min: 50, max: 600, step: 1, show: (s) => s.case === 'ladder' }] },
    { title: 'Match', show: (s) => s.case === 'match', items: [{ id: 'Rs', label: 'Source R', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'RLm', label: 'Load R', unit: 'Ω', min: 10, max: 1000, log: true }, { id: 'fr', label: 'Frequency f / f₀', unit: '', min: 0.3, max: 3, log: true }] },
    { title: 'Detector', show: (s) => s.case === 'envelope', items: [{ id: 'm', label: 'Modulation depth m', unit: '', min: 0, max: 1, step: 0.01 }, { id: 'tau', label: 'RC time constant', unit: 's (msg periods)', min: 0.01, max: 2, log: true }] },
    { title: 'Mixer', show: (s) => s.case === 'mixer', items: [{ id: 'f1', label: 'Signal', unit: 'MHz', min: 1, max: 20, step: 0.1 }, { id: 'f2', label: 'Local oscillator', unit: 'MHz', min: 1, max: 20, step: 0.1 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), sch = createSchematic(ctx, { labelPool: 30 });
    return {
      changed() { ctx.setClock(state.case === 'envelope' || state.case === 'mixer' ? 8 : 0); },
      update() {
        const c = state.case, u = time.t; sch.begin();
        if (c === 'select' || c === 'ladder') {
          const n = state.n, R0 = c === 'ladder' ? state.R0 : 50, fc = 1e6, parts = ladder(n, R0, fc), dx = Math.min(0.6, 3.0 / n), x0 = -3.6, Y = 1.0;
          sch.source([-4.6, -0.3], [-4.6, 0.3], '', true).wire([-4.6, 0.3], [-4.6, Y], [-4.4, Y]).resistor([-4.4, Y], [x0, Y], `${ohm(R0)}`).wire([-4.6, -0.3], [-4.6, -Y], [x0, -Y]);
          let x = x0; parts.forEach((p, k) => { if (p.kind === 'C') { sch.capacitor([x, Y], [x, -Y], k < 5 || n < 6 ? si(p.value, 'F') : '').dot([x, Y]).dot([x, -Y]); } else { sch.inductor([x, Y], [x + dx, Y], k < 5 || n < 6 ? si(p.value, 'H') : '').wire([x, -Y], [x + dx, -Y]); x += dx; } });
          const xe = Math.max(x + 0.4, -1.2); sch.wire([x, Y], [xe, Y]).wire([x, -Y], [xe, -Y]).resistor([xe, Y], [xe, -Y], `load ${ohm(R0)}`).text(`order ${n}: ${parts.filter((p) => p.kind === 'C').length} C + ${parts.filter((p) => p.kind === 'L').length} L`, [-2.6, -1.5]);
          const lf = lin(-1, 1, 300); tr.range([-1, 1], [-100, 3]); tr.titles('log₁₀ f / f_c', 'gain (dB): orders 1 … 9 (grey), this one (blue)');
          for (let k = 1; k <= 9; k++) if (k !== n) tr.line(`o${k}`, lf, lf.map((l) => dB(butterworth(10 ** l, 1, k))), { color: '--line', width: 1 }); else tr.hide(`o${k}`);
          tr.line('me', lf, lf.map((l) => dB(butterworth(10 ** l, 1, n))), { color: '--c-B', width: 3 });
          if (c === 'select') { tr.dots('nb', [Math.log10(state.fn)], [dB(butterworth(state.fn, 1, n))], { color: '--c-north', size: 12 }); tr.line('nbl', [Math.log10(state.fn), Math.log10(state.fn)], [-100, 3], { color: '--c-north', dashed: true, width: 1 }); } else { tr.dots('nb', [], [], {}); tr.hide('nbl'); }
          const ns = lin(1, 9, 9); br.range([0.5, 9.5], [-100, 0]); br.titles('order n', `rejection of the neighbour at ${fmt(state.fn)} f_c (dB)`); br.stems('r', ns, ns.map((k) => dB(butterworth(state.fn, 1, k))), { color: '--c-north', width: 8 }); br.dots('me', [n], [dB(butterworth(state.fn, 1, n))], { color: '--accent', size: 12 });
          hud.set('a', `|H|² = 1/(1 + (f/f_c)^2n): −3 dB at f_c for every order, then −${20 * n} dB per decade`); hud.set('b', `neighbour at ${fmt(state.fn)} f_c is attenuated by ${fmt(-dB(butterworth(state.fn, 1, n)))} dB`, -dB(butterworth(state.fn, 1, n)) > 40 ? 'good' : 'bad');
          hud.set('c', c === 'ladder' ? `values from the prototype g = 2 sin((2k − 1)π/2n): L = g·R₀/(2πf_c), C = g/(R₀·2πf_c), here f_c = 1 MHz` : 'each pole needs one L or C: more poles, sharper skirt, more parts');
          const fs = lin(0, 3, 200); plots.aux.draw({ xlim: [0, 3], series: [{ x: fs, y: fs.map((f) => -2 * n * Math.atan(f) * 180 / Math.PI / 2), color: '--c-I', label: 'approximate phase (°) vs f / f_c' }] });
        } else if (c === 'match') {
          const f0 = 10e6, M = lMatch(state.Rs, state.RLm, f0), P = matchedPower(state.Rs, state.RLm, f0, state.fr * f0), Pd = mismatchPower(state.Rs, state.RLm), Y = 1.0;
          sch.source([-4.5, -0.3], [-4.5, 0.3], '', true).wire([-4.5, 0.3], [-4.5, Y], [-4.3, Y]).resistor([-4.3, Y], [-3.4, Y], `R_s ${ohm(state.Rs)}`).wire([-4.5, -0.3], [-4.5, -Y], [-0.8, -Y]);
          if (M.shuntAtLoad) sch.inductor([-3.4, Y], [-2.4, Y], `L ${si(M.L, 'H')}`).wire([-2.4, Y], [-0.8, Y]).capacitor([-1.8, Y], [-1.8, -Y], `C ${si(M.C, 'F')}`).dot([-1.8, Y]).dot([-1.8, -Y]);
          else sch.wire([-3.4, Y], [-2.9, Y]).capacitor([-2.9, Y], [-2.9, -Y], `C ${si(M.C, 'F')}`).dot([-2.9, Y]).dot([-2.9, -Y]).inductor([-2.9, Y], [-1.9, Y], `L ${si(M.L, 'H')}`).wire([-1.9, Y], [-0.8, Y]);
          sch.resistor([-0.8, Y], [-0.8, -Y], `R_L ${ohm(state.RLm)}`).text('f₀ = 10 MHz', [-2.6, -1.5]);
          const lf = lin(-0.5, 0.5, 300); tr.range([-0.5, 0.5], [0, 1.05]); tr.titles('log₁₀ f / f₀', 'P_load / P_available: matched (blue), direct (grey)');
          tr.line('m', lf, lf.map((l) => matchedPower(state.Rs, state.RLm, f0, 10 ** l * f0)), { color: '--c-B' }); tr.line('d', [-0.5, 0.5], [Pd, Pd], { color: '--c-ref', dashed: true, width: 1.4 }); tr.dots('q', [Math.log10(state.fr)], [P], { color: '--accent', size: 12 });
          const rl = lin(1, 3, 200); br.range([1, 3], [0, 1.05]); br.titles('log₁₀ R_L (Ω)', 'P_load / P_available at f₀: matched (blue), direct (grey)');
          br.line('m', rl, rl.map(() => 1), { color: '--c-B' }); br.line('d', rl, rl.map((l) => mismatchPower(state.Rs, 10 ** l)), { color: '--c-ref' }); br.dots('q', [Math.log10(state.RLm)], [Pd], { color: '--accent', size: 11 });
          hud.set('a', `Q = √(R_high/R_low − 1) = ${fmt(M.Q)}: X_series = ${fmt(M.Xs)} Ω, X_shunt = ${fmt(M.Xp)} Ω`); hud.set('b', `at ${fmt(state.fr)} f₀: ${fmt(P * 100)}% of the available power reaches the load (direct: ${fmt(Pd * 100)}%)`, P > 0.95 ? 'good' : '');
          hud.set('c', 'L and C waste nothing: they only transform how big the load looks — but only near f₀ (bandwidth ≈ f₀/Q)');
          plots.aux.draw({ xlim: [-0.5, 0.5], cursor: Math.log10(state.fr), series: [{ x: lf, y: lf.map((l) => 10 * Math.log10(Math.max(1e-6, 1 - matchedPower(state.Rs, state.RLm, f0, 10 ** l * f0)))), color: '--c-north', label: 'return loss: reflected power (dB) vs log₁₀ f / f₀' }] });
        } else if (c === 'envelope') {
          const E = envelope({ m: state.m, tau: state.tau, T: 3 }), k = Math.min(E.t.length - 1, Math.floor(u / 8 * E.t.length)), Y = 1.0;
          sch.source([-4.5, -0.3], [-4.5, 0.3], 'AM', true).wire([-4.5, 0.3], [-4.5, Y], [-3.8, Y]).diode([-3.8, Y], [-2.6, Y], 'D').wire([-2.6, Y], [-0.8, Y]).capacitor([-2.0, Y], [-2.0, -Y], 'C').resistor([-0.8, Y], [-0.8, -Y], 'R').wire([-4.5, -0.3], [-4.5, -Y], [-0.8, -Y]).dot([-2.0, Y]).dot([-2.0, -Y]).text(`τ = RC = ${fmt(state.tau)} T_msg`, [-2.2, -1.5]);
          const sl = (a) => a.slice(0, k + 1).filter((_, i) => i % 2 === 0), ts = sl(E.t);
          tr.range([0, 3], [-1.1 - state.m, 1.1 + state.m]); tr.titles('t (message periods)', 'voltage (V): AM input (grey), detector output (blue)');
          tr.line('x', ts, sl(E.x), { color: '--c-ref', width: 1 }); tr.line('y', ts, sl(E.y), { color: '--c-B', width: 2.4 }); tr.line('env', ts, ts.map((t) => 1 + state.m * Math.cos(2 * Math.PI * t)), { color: '--c-I', dashed: true, width: 1.2 });
          const taus = lin(-2, 0.3, 40), errOf = (tau) => { const e = envelope({ m: state.m, tau, T: 3 }); let s = 0, n = 0; e.t.forEach((t, i) => { if (t > 1) { s += (e.y[i] - (1 + state.m * Math.cos(2 * Math.PI * t))) ** 2; n++; } }); return Math.sqrt(s / n); };
          br.range([-2, 0.3], [0, 0.8]); br.titles('log₁₀ τ (message periods)', 'RMS error (V): too fast = ripple, too slow = lag'); br.line('e', taus, taus.map(errOf), { color: '--c-north' }); br.dots('q', [Math.log10(state.tau)], [errOf(state.tau)], { color: '--accent', size: 11 });
          hud.set('a', 'the diode passes only the peaks; C holds each peak; R lets it leak away between them'); hud.set('b', `need 1/f_carrier ≪ τ ≪ 1/f_message: here the carrier is 20× the message`);
          hud.set('c', state.tau > 0.3 ? 'too slow: the output cannot fall as fast as the envelope (diagonal clipping)' : state.tau < 0.05 ? 'too fast: the capacitor empties between carrier peaks (ripple)' : 'good choice: the output follows the envelope (dashed)');
          plots.aux.draw({ xlim: [0, 3], series: [{ x: E.t.filter((_, i) => i % 3 === 0), y: E.y.filter((_, i) => i % 3 === 0), color: '--c-B', label: 'detector output (V) vs t (message periods)' }] });
        } else {
          const { f1, f2 } = state, L = mixLines(f1, f2), T = 2, ts = lin(0, T, 1500), w = (t) => Math.cos(2 * Math.PI * f1 * t) * Math.cos(2 * Math.PI * f2 * t), Y = 1.0;
          sch.source([-4.5, -0.3], [-4.5, 0.3], `${fmt(f1)} MHz`, true).wire([-4.5, 0.3], [-4.5, Y], [-2.98, Y]); sch.sum([-2.8, Y], 0.18, true);
          sch.text('mixer', [-2.8, Y + 0.35]).source([-2.8, -0.6], [-2.8, Y - 0.18], `LO ${fmt(f2)} MHz`, true).wire([-2.62, Y], [-1.6, Y]); sch.box([-1.2, Y], 0.8, 0.5, 'filter');
          sch.wire([-0.8, Y], [-0.4, Y]).text(`IF ${fmt(L[0].f)} MHz`, [-0.9, Y + 0.45]).wire([-4.5, -0.3], [-4.5, -1.2], [-2.8, -1.2], [-2.8, -0.6]);
          const shown = Math.min(T, u / 8 * T), tt = ts.filter((t) => t <= shown);
          tr.range([0, T], [-1.1, 1.1]); tr.titles('t (µs)', 'product (V): fast wiggle at f₁ + f₂ under a slow beat at |f₁ − f₂|');
          tr.line('p', tt, tt.map(w), { color: '--c-B', width: 1.2 }); tr.line('d', tt, tt.map((t) => 0.5 * Math.cos(2 * Math.PI * (f1 - f2) * t)), { color: '--c-I', width: 2.2 });
          const F = Math.max(f1 + f2, f1, f2) * 1.15; br.range([0, F], [0, 1.1]); br.titles('f (MHz)', 'amplitude: inputs (grey, dashed) and product (blue)');
          br.stems('in', [f1, f2], [1, 1], { color: '--c-ref', width: 2 }); br.stems('out', L.map((q) => q.f), L.map((q) => q.a), { color: '--c-B', width: 6 });
          hud.set('a', `cos(2πf₁t)·cos(2πf₂t) = ½cos(2π(f₁ − f₂)t) + ½cos(2π(f₁ + f₂)t)`); hud.set('b', `output lines at ${fmt(L[0].f)} MHz and ${fmt(L[1].f)} MHz — nothing at ${fmt(f1)} or ${fmt(f2)}`);
          hud.set('c', 'a filter keeps the difference (the IF): every station is moved to the same frequency before the sharp filtering');
          plots.aux.draw({ xlim: [0, 20], cursor: f2, series: [{ x: lin(0, 20, 200), y: lin(0, 20, 200).map((x) => Math.abs(f1 - x)), color: '--c-I', label: 'IF = |f₁ − f_LO| (MHz) vs LO frequency (MHz)' }] });
        }
        sch.end();
      },
      theme() { tr.theme(); br.theme(); sch.theme(); },
    };
  },
};
