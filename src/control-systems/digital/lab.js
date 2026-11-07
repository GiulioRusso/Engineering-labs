// Digital control: the z-plane (z = e^{sT}: where sampling sends the poles, with the spiral each pole
// traces as T grows), the sampled step response against the continuous one, and a PD controller run by
// a computer every T seconds against the same controller in continuous time.
import { createChart } from '../../lib/viz/chart.js';
import { s2z, poles2, stepCont, stepSampled, pdLoop, overshoot } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const TS = [0, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];

export default {
  id: 'digital', title: 'Digital control', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { wn: 2, zeta: 0.3, T: 0.3, Kp: 4, Kd: 1, Tc: 0.2 },
  cases: [
    { id: 'zplane', label: 'The z-plane', set: {}, examples: [
      { id: 'fast', label: 'Fast sampling: poles near z = 1', controls: ['T'], set: { T: 0.05 } },
      { id: 'nyquist', label: 'T = π/ωd: the pole reaches −1', controls: ['T'], set: { T: Math.PI / (2 * Math.sqrt(1 - 0.09)) } },
      { id: 'unstable', label: 'ζ < 0: outside the circle', controls: ['zeta'], set: { zeta: -0.1 } },
    ] },
    { id: 'discrete', label: 'A controller in a computer', set: {}, examples: [
      { id: 'quick', label: 'T = 0.02 s: like continuous', controls: ['Tc'], set: { Tc: 0.02 } },
      { id: 'slow', label: 'T = 0.4 s: more overshoot', controls: ['Tc'], set: { Tc: 0.4 } },
      { id: 'tooslow', label: 'T = 0.8 s: unstable', controls: ['Tc'], set: { Tc: 0.8 } },
    ] },
  ],
  controls: [
    { title: 'System ωn² / (s² + 2ζωn s + ωn²)', show: (s) => s.case === 'zplane', items: [
      { id: 'wn', label: 'Natural frequency ωn', unit: 'rad/s', min: 0.5, max: 6, step: 0.05 }, { id: 'zeta', label: 'Damping ratio ζ', unit: '', min: -0.3, max: 1.5, step: 0.01 },
      { id: 'T', label: 'Sample time T', unit: 's', min: 0.01, max: 3, log: true },
    ] },
    { title: 'Motor 1/(s(s + 1)), PD controller', show: (s) => s.case === 'discrete', items: [
      { id: 'Kp', label: 'Kp', unit: '', min: 0.5, max: 20, step: 0.1 }, { id: 'Kd', label: 'Kd', unit: 's', min: 0, max: 5, step: 0.05 },
      { id: 'Tc', label: 'Sample time T', unit: 's', min: 0.005, max: 1, log: true },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), all = [sq, tr, br];
    let OV = { key: '' };

    function zplane() {
      const P = poles2(state.wn, state.zeta), Z = P.map((p) => s2z(p, state.T)), ar = SQ[2] / SQ[3];
      sq.range([-1.5 * ar, 1.5 * ar], [-1.5, 1.5]); sq.titles('Re z', 'Im z: the z-plane; unit circle = the jω axis, spirals = the pole as T grows');
      const a = lin(0, 2 * Math.PI, 181); sq.line('uc', a.map(Math.cos), a.map(Math.sin), { color: '--ink', width: 1.6 });
      P.forEach((p, i) => { const Tn = lin(0, 3, 300).map((t) => s2z(p, t)); sq.line(`sp${i}`, Tn.map((z) => z[0]), Tn.map((z) => z[1]), { color: '--ink-dim', width: 1, dashed: true }); });
      sq.dots('z', Z.map((z) => z[0]), Z.map((z) => z[1]), { color: '--c-north', size: 13 }); sq.dots('one', [1], [0], { color: '--c-v', size: 7 });
      const R = Math.max(3, state.wn * 1.3); tr.range([-R * 1.6, R * 0.6], [-R, R]); tr.titles('Re s', 'Im s: the s-plane poles'); tr.line('ax', [0, 0], [-R, R], { color: '--ink-dim', width: 1 });
      tr.dots('s', P.map((p) => p[0]), P.map((p) => p[1]), { color: '--c-north', size: 12 }); const wN = Math.PI / state.T; tr.line('ny1', [-R * 1.6, R * 0.6], [wN, wN], { color: '--c-I', width: 1, dashed: true }); tr.line('ny2', [-R * 1.6, R * 0.6], [-wN, -wN], { color: '--c-I', width: 1, dashed: true });
      const Tend = 8, C = stepCont(state.wn, state.zeta, Tend), S = stepSampled(state.wn, state.zeta, state.T, Tend), top = Math.max(1.6, ...C.y.filter(Number.isFinite).map(Math.abs)) * 1.1;
      br.range([0, Tend], [-Math.min(top, 4), Math.min(top, 4)]); br.titles('time (s)', 'step response: continuous (grey), samples every T (stems)');
      br.line('c', C.t, C.y, { color: '--ink-dim', width: 1.6, max: 5000 }); br.stems('s', S.t, S.y, { color: '--c-B', width: 3 }); br.dots('sd', S.t, S.y, { color: '--c-B', size: 6 });
      const Ts = lin(0.01, 3, 200); plots.aux.draw({ xlim: [0.01, 3], cursor: state.T, series: [{ x: Ts, y: Ts.map((t) => Math.hypot(...s2z(P[0], t))), color: '--c-north', label: '|z| of the pole' }, { x: Ts, y: Ts.map((t) => Math.abs(Math.atan2(...s2z(P[0], t).slice().reverse()))), color: '--c-I', label: 'angle of the pole (rad), = ωd T until it wraps at π' }], xlabel: 'sample time T (s)' });
      const r = Math.hypot(...Z[0]), ang = Math.abs(Math.atan2(Z[0][1], Z[0][0]));
      hud.set('a', `s = ${fmt(P[0][0])} ± ${fmt(Math.abs(P[0][1]))}j → z = e^(sT): |z| = e^(σT) = ${fmt(r)}, angle ωd T = ${fmt(ang)} rad`);
      hud.set('b', r < 1 ? 'inside the unit circle: the samples decay, the sampled system is stable' : r === 1 ? 'on the circle: the samples neither grow nor decay' : 'outside the circle: the samples grow', r < 1 ? 'good' : 'bad');
      hud.set('c', `${(Math.abs(P[0][1]) * state.T) > Math.PI ? 'ωd T > π: the samples can no longer show the oscillation (aliasing): sample at least twice per period' : `${fmt(2 * Math.PI / (Math.abs(P[0][1]) * state.T || 1e-9), 2)} samples per oscillation period`}`);
    }

    function discrete() {
      const key = `${state.Kp},${state.Kd}`; if (OV.key !== key) OV = { key, o: TS.map((t) => overshoot(pdLoop(state.Kp, state.Kd, t).y)) };
      const C = pdLoop(state.Kp, state.Kd, 0), D = pdLoop(state.Kp, state.Kd, state.Tc), top = Math.min(4, Math.max(1.6, ...D.y.map(Math.abs)) * 1.1);
      sq.range([0, 10], [-top * 0.3, top]); sq.titles('time (s)', 'motor angle: continuous PD (grey), PD computed every T (blue)');
      sq.line('c', C.t, C.y, { color: '--ink-dim', width: 2, max: 12000 }); sq.line('d', D.t, D.y, { color: '--c-B', width: 2.2, max: 12000 }); sq.line('r', [0, 10], [1, 1], { color: '--c-ref', width: 1, dashed: true });
      const um = Math.min(30, Math.max(...D.u.map(Math.abs), ...C.u.map(Math.abs)) * 1.1); tr.range([0, 4], [-um, um]); tr.titles('time (s)', 'control u: continuous (grey), held between samples (orange)');
      tr.line('c', C.t, C.u, { color: '--ink-dim', width: 1.6, max: 12000 }); tr.line('d', D.t, D.u, { color: '--c-I', width: 1.8, max: 12000 });
      br.range([0, 0.7], [0, 2]); br.titles('sample time T (s)', 'overshoot: how it grows with T'); br.line('o', TS, OV.o.map((v) => Math.min(2, v)), { color: '--c-B' }); br.dots('cur', [Math.min(0.7, state.Tc)], [Math.min(2, overshoot(D.y))], { color: '--accent', size: 10 });
      const wc = Math.sqrt(state.Kp), lag = wc * state.Tc / 2 * 180 / Math.PI;
      plots.aux.draw({ xlim: [0, 10], series: [{ x: D.t, y: D.y.map((v) => 1 - v), color: '--c-B', label: 'error r − θ, digital' }, { x: C.t, y: C.y.map((v) => 1 - v), color: '--ink-dim', label: 'continuous' }], xlabel: 'time (s)' });
      hud.set('a', `overshoot: continuous ${fmt(100 * overshoot(C.y), 2)} %, every ${fmt(state.Tc)} s ${fmt(100 * overshoot(D.y), 2)} %`, overshoot(D.y) > 1 ? 'bad' : '');
      hud.set('b', `the hold delays the control by about T/2 on average: near the crossover ω ≈ ${fmt(wc)} rad/s that is ${fmt(lag, 2)}° of phase margin lost`);
      hud.set('c', 'rule of thumb: sample 10–30 times faster than the closed-loop bandwidth, and the digital loop behaves like the continuous one');
    }

    return {
      changed() { all.forEach((k) => k.show(true)); ctx.setClock(0); },
      update() { all.forEach((k) => k.clear()); (state.case === 'zplane' ? zplane : discrete)(); },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
