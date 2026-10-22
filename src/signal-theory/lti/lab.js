// LTI systems: linearity and time invariance checked numerically, the impulse as a limit of narrow pulses,
// any input as a sum of impulses (each answered by a shifted h), poles in the s-plane against the time
// response, the Bode plot, and the sinusoidal steady state emerging from the transient.
import { createChart } from '../../lib/viz/chart.js';
import { rc, rcImpulse, second, poles, H2, H1, stepInfo } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const TOP = [-4.3, 0.55, 8.85, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0], PLANE = [-4.3, -2.35, 4.2, 4.9];
const dt = 2e-3, T = 10, N = Math.round(T / dt), ts = Array.from({ length: N }, (_, i) => i * dt);
const every = (a, k = 5) => a.filter((_, i) => i % k === 0);

export default {
  id: 'lti', title: 'LTI systems', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { sys: 'second', zeta: 0.3, wn: 2, tau: 1, a: 1, b: 0.5, d: 2, w: 0.5, strips: 8, reveal: 8, om: 1 },
  cases: [
    { id: 'linear', label: 'Linearity', set: {}, examples: [
      { id: 'neg', label: 'Negative weights', controls: ['a', 'b'], set: { a: -1, b: 1.5 } },
      { id: 'rc', label: 'Same test on an RC', controls: ['sys', 'a', 'b'], set: { sys: 'rc' } },
    ] },
    { id: 'invariant', label: 'Time invariance', set: {}, examples: [
      { id: 'late', label: 'Delay the input 4 s', controls: ['d'], set: { d: 4 } },
    ] },
    { id: 'impulse', label: 'Impulse response', set: {}, examples: [
      { id: 'wide', label: 'Wide pulse: not yet h(t)', controls: ['w'], set: { w: 1.5 } },
      { id: 'narrow', label: 'Narrow pulse: almost h(t)', controls: ['w'], set: { w: 0.05 } },
    ] },
    { id: 'decompose', label: 'Input = sum of impulses', set: {}, examples: [
      { id: 'few', label: '4 slices: rough', controls: ['strips'], set: { strips: 4, reveal: 4 } },
      { id: 'many', label: '40 slices: the convolution', controls: ['strips'], set: { strips: 40, reveal: 40 } },
      { id: 'one', label: 'Slices one at a time', controls: ['reveal'], set: { strips: 8, reveal: 2 } },
    ] },
    { id: 'poles', label: 'Poles', set: {}, examples: [
      { id: 'under', label: 'ζ = 0.1: poles near the axis, long ringing', controls: ['zeta'], set: { zeta: 0.1 } },
      { id: 'crit', label: 'ζ = 1: critically damped', controls: ['zeta'], set: { zeta: 1 } },
      { id: 'over', label: 'ζ = 2: two real poles, sluggish', controls: ['zeta'], set: { zeta: 2 } },
      { id: 'unstable', label: 'ζ < 0: right half-plane, it grows', controls: ['zeta'], set: { zeta: -0.1 } },
    ] },
    { id: 'bode', label: 'Bode plot', set: {}, examples: [
      { id: 'peak', label: 'ζ = 0.1: resonance peak', controls: ['zeta'], set: { zeta: 0.1 } },
      { id: 'rc', label: 'First order: −20 dB/decade', controls: ['sys', 'tau'], set: { sys: 'rc' } },
    ] },
    { id: 'steady', label: 'Sinusoidal steady state', set: {}, examples: [
      { id: 'resonance', label: 'ω = ωn: amplified, −90°', controls: ['om'], set: { om: 2, zeta: 0.15 } },
      { id: 'high', label: 'ω ≫ ωn: small and lagging', controls: ['om'], set: { om: 6 } },
    ] },
  ],
  controls: [
    { title: 'System', items: [
      { id: 'sys', label: 'System', type: 'segmented', options: [['rc', 'RC (1st order)'], ['second', '2nd order']], show: (s) => !['poles', 'steady'].includes(s.case) },
      { id: 'tau', label: 'Time constant τ', unit: 's', min: 0.1, max: 4, step: 0.05, show: (s) => s.sys === 'rc' && !['poles', 'steady'].includes(s.case) },
      { id: 'zeta', label: 'Damping ζ', unit: '', min: -0.3, max: 2.5, step: 0.01, show: (s) => s.sys === 'second' || ['poles', 'steady'].includes(s.case) },
      { id: 'wn', label: 'Natural frequency ωn', unit: 'rad/s', min: 0.5, max: 6, step: 0.1, show: (s) => s.sys === 'second' || ['poles', 'steady'].includes(s.case) },
    ] },
    { title: 'Test', items: [
      { id: 'a', label: 'Weight a (on the step)', unit: '', min: -2, max: 2, step: 0.1, show: (s) => s.case === 'linear' },
      { id: 'b', label: 'Weight b (on the sine)', unit: '', min: -2, max: 2, step: 0.1, show: (s) => s.case === 'linear' },
      { id: 'd', label: 'Delay', unit: 's', min: 0, max: 6, step: 0.1, show: (s) => s.case === 'invariant' },
      { id: 'w', label: 'Pulse width (area 1)', unit: 's', min: 0.02, max: 2, step: 0.01, show: (s) => s.case === 'impulse' },
      { id: 'strips', label: 'Slices', unit: '', min: 2, max: 60, step: 1, show: (s) => s.case === 'decompose' },
      { id: 'reveal', label: 'Slices added', unit: '', min: 1, max: 60, step: 1, show: (s) => s.case === 'decompose' },
      { id: 'om', label: 'Input frequency ω', unit: 'rad/s', min: 0.1, max: 10, step: 0.05, show: (s) => s.case === 'steady' || s.case === 'bode' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR });
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT }), plane = createChart(ctx, { box: PLANE }), all = [tl, tr, bl, br, top, bot, plane];
    const sim = (x) => (state.sys === 'rc' && !['poles', 'steady'].includes(state.case) ? rc(x, dt, state.tau) : second(x, dt, state.zeta, state.wn));
    const hOf = (t) => (state.sys === 'rc' && !['poles', 'steady'].includes(state.case) ? rcImpulse(t, state.tau) : (() => { const z = state.zeta, w = state.wn; if (t < 0) return 0; if (Math.abs(z) < 1) { const wd = w * Math.sqrt(1 - z * z); return w * w / wd * Math.exp(-z * w * t) * Math.sin(wd * t); } if (z === 1) return w * w * t * Math.exp(-w * t); const r = w * Math.sqrt(z * z - 1), p1 = -z * w + r, p2 = -z * w - r; return w * w / (p1 - p2) * (Math.exp(p1 * t) - Math.exp(p2 * t)); })());
    const name = () => (state.sys === 'rc' && !['poles', 'steady'].includes(state.case) ? `RC, τ = ${state.tau} s` : `2nd order, ζ = ${state.zeta}, ωn = ${state.wn} rad/s`);

    return {
      changed() {
        const c = state.case; for (const k of all) k.show(false);
        if (c === 'linear') for (const k of [tl, tr, bl, br]) k.show(true);
        else if (c === 'poles') { plane.show(true); tr.show(true); br.show(true); }
        else { top.show(true); bot.show(true); }
      },
      update() {
        const c = state.case;
        if (c === 'linear') {
          const x1 = ts.map((t) => (t >= 1 ? 1 : 0)), x2 = ts.map((t) => Math.sin(2 * t)), x = x1.map((v, i) => state.a * v + state.b * x2[i]);
          const y1 = sim(x1), y2 = sim(x2), y = sim(x), sup = y1.map((v, i) => state.a * v + state.b * y2[i]), e = y.map((v, i) => Math.abs(v - sup[i]));
          const s = every(ts), lim = (...a) => Math.max(1.2, ...a.map((q) => Math.max(...q.map(Math.abs)))) * 1.1;
          tl.range([0, T], [-lim(x), lim(x)]); tl.titles('t (s)', `x(t): x₁ step (blue), x₂ sine (orange), a·x₁ + b·x₂ (grey)`); tl.line('x1', s, every(x1), { color: '--c-B', width: 1.2 }); tl.line('x2', s, every(x2), { color: '--c-I', width: 1.2 }); tl.line('x', s, every(x), { color: '--c-ref' });
          tr.range([0, T], [-lim(y1, y2), lim(y1, y2)]); tr.titles('t (s)', 'responses y₁ (blue) and y₂ (orange), separately'); tr.line('y1', s, every(y1), { color: '--c-B' }); tr.line('y2', s, every(y2), { color: '--c-I' });
          bl.range([0, T], [-lim(y, sup), lim(y, sup)]); bl.titles('t (s)', 'response to the sum (solid) vs a·y₁ + b·y₂ (dashed)'); bl.line('y', s, every(y), { color: '--c-v', width: 3 }); bl.line('s', s, every(sup), { color: '--c-north', dashed: true, width: 1.6 });
          const le = e.map((v) => Math.log10(v + 1e-18)); br.range([0, T], [-18, 0]); br.titles('t (s)', 'log₁₀ |difference|: rounding errors only'); br.line('e', s, every(le), { color: '--c-E', width: 1.2 });
          hud.set('a', name()); hud.set('b', `max difference ${Math.max(...e).toExponential(1)}: superposition holds exactly`, 'good'); hud.set('c', 'linear: scale or add inputs → the outputs scale or add the same way');
          plots.aux.draw({ xlim: [0, T], series: [{ x: s, y: every(y), color: '--c-v', label: 'y for a·x₁ + b·x₂' }] });
        } else if (c === 'invariant') {
          const p = (t, d) => (t >= d && t < d + 0.6 ? 1 : 0), x0 = ts.map((t) => p(t, 0.5)), xd = ts.map((t) => p(t, 0.5 + state.d)), y0 = sim(x0), yd = sim(xd), s = every(ts);
          const shifted = ts.map((t) => { const i = Math.round((t - state.d) / dt); return i >= 0 ? y0[i] : 0; });
          top.range([0, T], [-0.2, 1.3]); top.titles('t (s)', `input pulse (blue) and the same pulse ${state.d} s later (orange)`); top.line('a', s, every(x0), { color: '--c-B' }); top.line('b', s, every(xd), { color: '--c-I' });
          const m = Math.max(...y0.map(Math.abs)) * 1.3; bot.range([0, T], [-m, m]); bot.titles('t (s)', 'y(t): blue, response to the late pulse orange, y(t − d) dashed');
          bot.line('a', s, every(y0), { color: '--c-B' }); bot.line('b', s, every(yd), { color: '--c-I', width: 3 }); bot.line('c', s, every(shifted), { color: '--c-north', dashed: true, width: 1.6 });
          const err = Math.max(...yd.map((v, i) => Math.abs(v - shifted[i])));
          hud.set('a', name()); hud.set('b', `delay the input by ${state.d} s → the output is the same, ${state.d} s later (max diff ${err.toExponential(1)})`, 'good'); hud.set('c', 'time-invariant: the system does not care what time it is');
          plots.aux.draw({ xlim: [0, T], series: [{ x: s, y: every(yd), color: '--c-I', label: 'response to the delayed pulse' }] });
        } else if (c === 'impulse') {
          const w = state.w, x = ts.map((t) => (t >= 0.5 && t < 0.5 + w ? 1 / w : 0)), y = sim(x), h = ts.map((t) => hOf(t - 0.5)), s = every(ts, 2);
          top.range([0, T], [-0.1 * Math.min(1 / w, 30), Math.min(1 / w, 30) * 1.1]); top.titles('t (s)', `x(t): a pulse ${w} s wide and ${fmt(1 / w)} tall — area always 1`); top.line('x', s, every(x, 2), { color: '--c-B' });
          const m = Math.max(...h.map(Math.abs)) * 1.3; bot.range([0, T], [-m, m]); bot.titles('t (s)', 'output (blue) and the impulse response h(t) (dashed)'); bot.line('y', s, every(y, 2), { color: '--c-B' }); bot.line('h', s, every(h, 2), { color: '--c-north', dashed: true, width: 1.6 });
          const err = Math.max(...y.map((v, i) => Math.abs(v - h[i]))) / (m / 1.3);
          hud.set('a', name()); hud.set('b', `difference from h(t): ${fmt(100 * err)} % of its peak`, err < 0.05 ? 'good' : ''); hud.set('c', 'δ(t) = the limit of narrower and taller pulses of area 1');
          const ws = [2, 1.5, 1, 0.7, 0.5, 0.3, 0.2, 0.1, 0.05, 0.02]; plots.aux.draw({ xlim: [0.02, 2], cursor: w, series: [{ x: ws, y: ws.map((q) => { const xx = ts.map((t) => (t >= 0.5 && t < 0.5 + q ? 1 / q : 0)), yy = sim(xx); return 100 * Math.max(...yy.map((v, i) => Math.abs(v - h[i]))) / (m / 1.3); }), color: '--c-E', label: 'error (% of peak) vs pulse width (s)' }] });
        } else if (c === 'decompose') {
          // a smooth input cut into slices; each slice is a short pulse → a scaled, delayed copy of h
          const X = (t) => (t > 0 && t < 4 ? Math.sin(Math.PI * t / 4) ** 2 * (1 + 0.5 * Math.sin(3 * t)) : 0), K = state.strips, W = 4 / K, R = Math.min(state.reveal, K), s = every(ts, 4);
          top.range([0, T], [-0.1, 1.6]); top.titles('t (s)', `x(t) in ${K} slices of ${fmt(W)} s · ${R} added`);
          top.line('x', s, every(ts.map(X), 4), { color: '--c-ref', width: 1.4 });
          const stair = ts.map((t) => { const k = Math.floor(t / W); return k >= 0 && k < R ? X((k + 0.5) * W) : 0; }); top.line('st', s, every(stair, 4), { color: '--c-B' });
          const xs = ts.map(X), yTrue = sim(xs), parts = []; let sum = new Float64Array(N);
          for (let k = 0; k < R; k++) { const a = X((k + 0.5) * W) * W, yk = ts.map((t) => a * hOf(t - (k + 0.5) * W)); parts.push(yk); for (let i = 0; i < N; i++) sum[i] += yk[i]; }
          const m = Math.max(...yTrue.map(Math.abs), ...sum.map(Math.abs)) * 1.2 || 1;
          bot.range([0, T], [-m * 0.6, m]); bot.titles('t (s)', 'slice k → area·h(t − tₖ) orange · sum blue · true dashed');
          for (let k = 0; k < 60; k++) { if (k < parts.length && k < 24) bot.line(`p${k}`, s, every(parts[k], 4), { color: '--c-I', width: 1 }); else bot.hide(`p${k}`); }
          bot.line('sum', s, every(Array.from(sum), 4), { color: '--c-B', width: 2.6 }); bot.line('true', s, every(Array.from(yTrue), 4), { color: '--c-north', dashed: true, width: 1.6 });
          const err = Math.max(...yTrue.map((v, i) => Math.abs(v - sum[i]))) / (m / 1.2);
          hud.set('a', name()); hud.set('b', R < K ? `${R} of ${K} slices: the sum is building up` : `all ${K} slices: error ${fmt(100 * err)} % of the peak`, R === K && err < 0.03 ? 'good' : '');
          hud.set('c', 'y(t) = Σ x(tₖ)·Δ·h(t − tₖ) → ∫ x(τ) h(t − τ) dτ as Δ → 0');
          plots.aux.draw({ xlim: [0, T], series: [{ x: s, y: every(Array.from(yTrue), 4), color: '--c-north', label: 'x * h' }] });
        } else if (c === 'poles') {
          const P = poles(state.zeta, state.wn), L = Math.max(3, state.wn * 1.4);
          plane.range([-L, L * 0.5], [-0.875 * L, 0.875 * L]); plane.titles('Re s (decay rate, 1/s)', 'Im s (oscillation, rad/s)');
          plane.line('jw', [0, 0], [-L, L], { color: '--c-north', width: 1.6 });
          const circ = Array.from({ length: 121 }, (_, i) => Math.PI / 2 + Math.PI * i / 120); plane.line('wn', circ.map((a) => state.wn * Math.cos(a)), circ.map((a) => state.wn * Math.sin(a)), { color: '--line', dashed: true, width: 1 });
          plane.dots('p', P.map((p) => p[0]), P.map((p) => p[1]), { color: state.zeta < 0 ? '--c-north' : '--c-E', size: 16 });
          const step = ts.map(() => 1), y = second(step, dt, state.zeta, state.wn), h = ts.map(hOf), s = every(ts), env = ts.map((t) => Math.exp(-state.zeta * state.wn * t));
          const mh = Math.min(20, Math.max(...h.map(Math.abs)) * 1.2); tr.range([0, T], [-mh, mh]); tr.titles('t (s)', 'impulse response h(t), envelope e^(−ζωn·t)'); tr.line('h', s, every(h), { color: '--c-B' });
          tr.line('e1', s, every(env.map((v) => Math.min(mh, v * state.wn))), { color: '--c-ref', dashed: true, width: 1 }); tr.line('e2', s, every(env.map((v) => Math.max(-mh, -v * state.wn))), { color: '--c-ref', dashed: true, width: 1 });
          const my = Math.min(6, Math.max(1.6, ...y.map(Math.abs)) * 1.1); br.range([0, T], [state.zeta < 0 ? -my : 0, my]); br.titles('t (s)', 'y(t): step response'); br.line('y', s, every(y), { color: '--c-v' }); br.line('one', [0, T], [1, 1], { color: '--ink-dim', dashed: true, width: 1 });
          const si = stepInfo(state.zeta, state.wn);
          hud.set('a', `poles ${P.map((p) => `${fmt(p[0])} ${p[1] >= 0 ? '+' : '−'} j${fmt(Math.abs(p[1]))}`).join(', ')}`);
          hud.set('b', state.zeta < 0 ? 'right half-plane: the response grows without bound ✗' : state.zeta < 1 ? `complex poles: rings at ω_d = ${fmt(state.wn * Math.sqrt(1 - state.zeta ** 2))} rad/s, overshoot ${fmt(100 * si.os)} %` : 'real poles: no oscillation', state.zeta < 0 ? 'bad' : 'good');
          hud.set('c', 'left = how fast it dies, up = how fast it oscillates');
          const zs = Array.from({ length: 100 }, (_, i) => 0.01 + i * 0.01); plots.aux.draw({ xlim: [0, 1], cursor: state.zeta, series: [{ x: zs, y: zs.map((z) => 100 * stepInfo(z, 1).os), color: '--c-E', label: 'overshoot (%) vs ζ' }] });
        } else if (c === 'bode') {
          const ws = Array.from({ length: 400 }, (_, i) => 10 ** (-2 + 4 * i / 399)), Hf = (w) => (state.sys === 'rc' ? H1(w, state.tau) : H2(w, state.zeta, state.wn)), lw = ws.map(Math.log10);
          const mag = ws.map((w) => 20 * Math.log10(Hf(w).mag)), ph = ws.map((w) => Hf(w).ph * 180 / Math.PI), lo = Math.max(-80, Math.min(...mag)), hi = Math.max(5, ...mag) + 5;
          top.range([-2, 2], [lo, hi]); top.titles('log₁₀ ω (rad/s)', '|H(jω)| (dB)'); top.line('m', lw, mag, { color: '--c-B' }); top.line('m3', [-2, 2], [-3, -3], { color: '--c-north', dashed: true, width: 1 }); top.dots('om', [Math.log10(state.om)], [20 * Math.log10(Hf(state.om).mag)], { color: '--accent', size: 11 });
          bot.range([-2, 2], [-190, 10]); bot.titles('log₁₀ ω (rad/s)', '∠H(jω) (degrees)'); bot.line('p', lw, ph, { color: '--c-I' }); bot.dots('om', [Math.log10(state.om)], [Hf(state.om).ph * 180 / Math.PI], { color: '--accent', size: 11 });
          const corner = state.sys === 'rc' ? 1 / state.tau : state.wn; top.line('c', [Math.log10(corner), Math.log10(corner)], [lo, hi], { color: '--ink-dim', dashed: true, width: 1 }); bot.line('c', [Math.log10(corner), Math.log10(corner)], [-190, 10], { color: '--ink-dim', dashed: true, width: 1 });
          const pk = Math.max(...mag);
          hud.set('a', name()); hud.set('b', state.sys === 'rc' ? `corner 1/τ = ${fmt(1 / state.tau)} rad/s: −3 dB, −45°; then −20 dB/decade` : `at ωn: ${fmt(20 * Math.log10(1 / (2 * Math.abs(state.zeta))))} dB, −90°; peak ${fmt(pk)} dB; then −40 dB/decade`);
          hud.set('c', `at ω = ${state.om} rad/s: gain ${fmt(Hf(state.om).mag)}, phase ${fmt(Hf(state.om).ph * 180 / Math.PI)}°`);
          plots.aux.draw({ xlim: [-2, 2], cursor: Math.log10(state.om), series: [{ x: lw, y: ws.map((w) => Hf(w).mag), color: '--c-B', label: '|H| (linear) vs log₁₀ ω' }] });
        } else {
          const w = state.om, x = ts.map((t) => Math.sin(w * t)), y = second(x, dt, state.zeta, state.wn), Hs = H2(w, state.zeta, state.wn), yss = ts.map((t) => Hs.mag * Math.sin(w * t + Hs.ph)), s = every(ts, 2);
          const m = Math.max(1.2, Hs.mag * 1.3, ...y.map(Math.abs)); top.range([0, T], [-m, m]); top.titles('t (s)', 'input sin ωt (grey), output (blue), predicted |H| sin(ωt + ∠H) (dashed)');
          top.line('x', s, every(x, 2), { color: '--c-ref', width: 1.2 }); top.line('y', s, every(y, 2), { color: '--c-B' }); top.line('ss', s, every(yss, 2), { color: '--c-north', dashed: true, width: 1.4 });
          const res = y.map((v, i) => v - yss[i]), mr = Math.max(0.05, ...res.map(Math.abs)) * 1.2; bot.range([0, T], [-mr, mr]); bot.titles('t (s)', 'output − steady state: the transient, dies as e^(−ζωn·t)'); bot.line('r', s, every(res, 2), { color: '--c-E' });
          bot.line('e1', s, every(ts.map((t) => Math.min(mr, mr / 1.2 * Math.exp(-state.zeta * state.wn * t))), 2), { color: '--c-ref', dashed: true, width: 1 }); bot.line('e2', s, every(ts.map((t) => Math.max(-mr, -mr / 1.2 * Math.exp(-state.zeta * state.wn * t))), 2), { color: '--c-ref', dashed: true, width: 1 });
          hud.set('a', `ω = ${w} rad/s: |H| = ${fmt(Hs.mag)} (${fmt(20 * Math.log10(Hs.mag))} dB), ∠H = ${fmt(Hs.ph * 180 / Math.PI)}°`);
          hud.set('b', `after ≈ ${fmt(4 / (state.zeta * state.wn))} s (4/ζωn) only the steady state is left`); hud.set('c', 'same frequency out as in: only amplitude and phase change');
          const ws = Array.from({ length: 200 }, (_, i) => 0.05 * (i + 1)); plots.aux.draw({ xlim: [0, 10], cursor: w, series: [{ x: ws, y: ws.map((q) => H2(q, state.zeta, state.wn).mag), color: '--c-B', label: '|H(jω)| vs ω (rad/s)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); },
    };
  },
};
