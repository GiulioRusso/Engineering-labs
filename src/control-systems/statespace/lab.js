// State space on a mass–spring–damper: the phase plane with its arrow field and the eigenvalues of A,
// pole placement by state feedback (where the poles go, what it costs in force), and estimating the
// velocity from a noisy position with an observer or a Kalman filter.
import { createChart } from '../../lib/viz/chart.js';
import { plant, eig2, simulate, place, observerGain, kalmanGain, estimate, noiseModel } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const cpx = ([a, b]) => (Math.abs(b) < 1e-9 ? fmt(a) : `${fmt(a)} ± ${fmt(Math.abs(b))}j`);
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], T = 10;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));

export default {
  id: 'statespace', title: 'State space', size: 4.4, ortho: true, plain: true, cam: 'top', duration: T, loop: false,
  defaults: { m: 1, k: 4, c: 0.4, x0: 1, v0: 0, wn: 3, zeta: 0.7, est: 'luen', wo: 6, lq: 0, sigma: 0.02, dist: 1 },
  cases: [
    { id: 'model', label: 'State and eigenvalues', set: {}, examples: [
      { id: 'undamped', label: 'No damping: a closed orbit', controls: ['c'], set: { c: 0 } },
      { id: 'over', label: 'Heavy damping: two real poles', controls: ['c'], set: { c: 5 } },
      { id: 'negative', label: 'Negative damping: it grows', controls: ['c'], set: { c: -0.3 } },
    ] },
    { id: 'placement', label: 'Pole placement', set: {}, examples: [
      { id: 'fast', label: 'Twice as fast: four times the force', controls: ['wn'], set: { wn: 6 } },
      { id: 'critical', label: 'ζ = 1: no overshoot', controls: ['zeta'], set: { zeta: 1 } },
      { id: 'ringing', label: 'ζ = 0.2: rings', controls: ['zeta'], set: { zeta: 0.2 } },
    ] },
    { id: 'observer', label: 'Observers', set: {}, examples: [
      { id: 'slow', label: 'Slow observer: smooth but late', controls: ['wo'], set: { est: 'luen', wo: 1.5 } },
      { id: 'fast', label: 'Fast observer: passes the noise', controls: ['wo'], set: { est: 'luen', wo: 60 } },
      { id: 'kalman', label: 'Kalman: the noise decides', controls: ['lq', 'sigma', 'dist'], set: { est: 'kalman', lq: 0 } },
    ] },
  ],
  controls: [
    { title: 'Plant: m x″ + c x′ + k x = u', items: [
      { id: 'm', label: 'Mass m', unit: 'kg', min: 0.2, max: 5, step: 0.05 }, { id: 'k', label: 'Spring k', unit: 'N/m', min: 0, max: 20, step: 0.1 },
      { id: 'c', label: 'Damping c', unit: 'N·s/m', min: -1, max: 10, step: 0.05 },
      { id: 'x0', label: 'Start position', unit: 'm', min: -1.5, max: 1.5, step: 0.05, show: (s) => s.case === 'model' }, { id: 'v0', label: 'Start velocity', unit: 'm/s', min: -3, max: 3, step: 0.05, show: (s) => s.case === 'model' },
    ] },
    { title: 'Desired closed-loop poles', show: (s) => s.case === 'placement', items: [
      { id: 'wn', label: 'Natural frequency ωn', unit: 'rad/s', min: 0.5, max: 10, step: 0.1 }, { id: 'zeta', label: 'Damping ratio ζ', unit: '', min: 0.1, max: 1.5, step: 0.01 },
    ] },
    { title: 'Estimator (position measured with noise)', show: (s) => s.case === 'observer', items: [
      { id: 'est', label: 'Gain from', type: 'segmented', options: [['luen', 'Chosen poles'], ['kalman', 'Kalman']] },
      { id: 'wo', label: 'Observer speed ωo', unit: 'rad/s', min: 0.5, max: 60, log: true, show: (s) => s.est === 'luen' },
      { id: 'lq', label: 'Kalman: assumed disturbance ÷ true (log₁₀)', unit: '', min: -3, max: 3, step: 0.1, show: (s) => s.est === 'kalman', hint: '0: the filter assumes the true disturbance level' },
      { id: 'sigma', label: 'Measurement noise σ', unit: 'm', min: 0, max: 0.2, step: 0.005 }, { id: 'dist', label: 'Unknown disturbance force (rms)', unit: 'N', min: 0, max: 3, step: 0.05 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), all = [sq, tr, br];
    const splane = (ch, sets, R) => { ch.range([-R * 1.6, R * 0.6], [-R, R]); ch.titles('Re s (1/s)', 'Im s (rad/s): the s-plane'); ch.line('ax', [0, 0], [-R, R], { color: '--ink-dim', width: 1 }); sets.forEach(([k, ps, c, sz]) => ch.dots(k, ps.map((p) => p[0]), ps.map((p) => p[1]), { color: c, size: sz })); };

    function model() {
      const { A, B } = plant(state.m, state.k, state.c), R = simulate(A, B, [state.x0, state.v0], () => 0, T), e = eig2(A), n = Math.min(R.t.length - 1, Math.round(time.t / 0.005));
      const X = Math.max(1.6, ...R.X.map((p) => Math.abs(p[0]))) * 1.1, V = Math.max(2, ...R.X.map((p) => Math.abs(p[1]))) * 1.1, ar = SQ[2] / SQ[3], XR = Math.max(X, V / ar);
      sq.range([-XR * ar, XR * ar], [-XR, XR]); sq.titles('position x (m)', 'velocity v (m/s): the phase plane, arrows = ẋ = A x');
      const sx = [], sy = []; for (const gx of lin(-XR * ar * 0.9, XR * ar * 0.9, 15)) for (const gy of lin(-XR * 0.9, XR * 0.9, 11)) { const d = [A[0][0] * gx + A[0][1] * gy, A[1][0] * gx + A[1][1] * gy], L = Math.hypot(...d) || 1, s = 0.08 * XR; sx.push(gx, gx + s * d[0] / L, NaN); sy.push(gy, gy + s * d[1] / L, NaN); }
      for (let i = 0; i < sx.length; i += 3) sq.line(`a${i}`, [sx[i], sx[i + 1]], [sy[i], sy[i + 1]], { color: '--ink-dim', width: 1 });
      sq.line('tr', R.X.slice(0, n + 1).map((p) => p[0]), R.X.slice(0, n + 1).map((p) => p[1]), { color: '--c-B', width: 2.4, max: 3000 }); sq.dots('now', [R.X[n][0]], [R.X[n][1]], { color: '--accent', size: 12 });
      splane(tr, [['e', e, '--c-north', 12]], Math.max(3, ...e.map((p) => Math.hypot(...p))) * 1.2);
      br.range([0, T], [-XR, XR]); br.titles('time (s)', 'x (blue), v (orange)'); br.line('x', R.t.slice(0, n + 1), R.X.slice(0, n + 1).map((p) => p[0]), { color: '--c-B', max: 3000 }); br.line('v', R.t.slice(0, n + 1), R.X.slice(0, n + 1).map((p) => p[1]), { color: '--c-I', max: 3000 });
      plots.aux.draw({ xlim: [0, T], cursor: R.t[n], series: [{ x: R.t, y: R.X.map((p) => 0.5 * state.k * p[0] ** 2 + 0.5 * state.m * p[1] ** 2), color: '--c-v', label: 'energy ½kx² + ½mv² (J)' }], xlabel: 'time (s)' });
      hud.set('a', `A = [[0, 1], [${fmt(A[1][0])}, ${fmt(A[1][1])}]]: eigenvalues ${cpx(e[0])} — the poles of 1/(ms² + cs + k)`);
      hud.set('b', e[0][0] < 0 ? `Re < 0: every trajectory spirals or slides into the origin, at the rate e^(${fmt(e[0][0])} t)` : e[0][0] === 0 ? 'Re = 0: the state circles for ever on a closed orbit' : 'Re > 0: the state runs away from the origin', e[0][0] < 0 ? 'good' : e[0][0] > 0 ? 'bad' : '');
      hud.set('c', 'the state (x, v) is everything the system remembers: from it and the input, the whole future follows');
    }

    function placement() {
      const { A, B } = plant(state.m, state.k, state.c), { K, N } = place(state.m, state.k, state.c, state.wn, state.zeta), Acl = A.map((row, i) => row.map((v, j) => v - B[i] * K[j]));
      const C = simulate(Acl, B, [0, 0], () => N, T), O = simulate(A, B, [0, 0], () => Math.max(state.k, 1e-3), T), u = C.X.map((x) => -K[0] * x[0] - K[1] * x[1] + N);
      const top = Math.max(1.6, ...C.X.map((p) => p[0]), ...O.X.map((p) => p[0]).filter((v) => v < 5)) * 1.1;
      sq.range([0, T], [-0.2, top]); sq.titles('time (s)', 'position: step to r = 1, open loop (grey) and with u = −Kx + Nr (green)');
      sq.line('o', O.t, O.X.map((p) => p[0]), { color: '--ink-dim', width: 1.6, max: 3000 }); sq.line('c', C.t, C.X.map((p) => p[0]), { color: '--c-v', width: 2.4, max: 3000 }); sq.line('r', [0, T], [1, 1], { color: '--c-ref', width: 1, dashed: true });
      const e0 = eig2(A), e1 = eig2(Acl); splane(tr, [['o', e0, '--ink-dim', 10], ['c', e1, '--c-v', 12]], Math.max(3, state.wn, ...e0.map((p) => Math.hypot(...p))) * 1.2);
      const um = Math.max(...u.map(Math.abs)) * 1.15; br.range([0, T], [-um, um]); br.titles('time (s)', 'force u (N) the feedback asks for'); br.line('u', C.t, u, { color: '--c-I', max: 3000 });
      const ws = lin(0.5, 10, 60); plots.aux.draw({ xlim: [0.5, 10], cursor: state.wn, series: [{ x: ws, y: ws.map((w) => place(state.m, state.k, state.c, w, state.zeta).K[0]), color: '--c-B', label: 'K₁ (N/m), position gain' }, { x: ws, y: ws.map((w) => place(state.m, state.k, state.c, w, state.zeta).K[1]), color: '--c-I', label: 'K₂ (N·s/m), velocity gain' }], xlabel: 'ωn (rad/s)' });
      hud.set('a', `K = [${fmt(K[0])}, ${fmt(K[1])}]: closed-loop poles ${cpx(e1[0])} (open loop ${cpx(e0[0])})`);
      hud.set('b', `peak force ${fmt(Math.max(...u.map(Math.abs)))} N: the position gain grows as m ωn², so twice the speed costs four times the force`);
      hud.set('c', 'with the whole state fed back, the poles can go anywhere: this plant is controllable (B reaches every direction through A)');
    }

    function observer() {
      const { A } = plant(state.m, state.k, state.c), L = state.est === 'luen' ? observerGain(A, state.wo) : kalmanGain(A, 10 ** state.lq * Math.max(noiseModel(state.m, state.dist), 1e-6), state.sigma).L, R = estimate(state.m, state.k, state.c, L, state.sigma, T, 3, state.dist);
      const Ao = [[A[0][0] - L[0], A[0][1]], [A[1][0] - L[1], A[1][1]]], eo = eig2(Ao), v = R.x.map((p) => p[1]), vh = R.xh.map((p) => p[1]), vm = Math.max(1, ...v.map(Math.abs)) * 1.6;
      sq.range([0, T], [-1.2, 1.2]); sq.titles('time (s)', 'position: true (grey), measured (dots), estimate (green)');
      sq.dots('y', R.t.filter((_, i) => i % 8 === 0), R.y.filter((_, i) => i % 8 === 0), { color: '--c-I', size: 3 }); sq.line('x', R.t, R.x.map((p) => p[0]), { color: '--ink-dim', width: 2, max: 3000 }); sq.line('xh', R.t, R.xh.map((p) => p[0]), { color: '--c-v', width: 1.8, max: 3000 });
      tr.range([0, T], [-vm, vm]); tr.titles('time (s)', 'velocity: true (grey), difference of the measurements (orange), estimate (green)');
      tr.dots('vd', R.t.filter((_, i) => i % 10 === 0), R.vd.filter((_, i) => i % 10 === 0).map((q) => Math.max(-vm, Math.min(vm, q))), { color: '--c-I', size: 3 }); tr.line('v', R.t, v, { color: '--ink-dim', width: 2, max: 3000 }); tr.line('vh', R.t, vh, { color: '--c-v', width: 1.8, max: 3000 });
      const err = vh.map((q, i) => q - v[i]), em = Math.max(0.2, ...err.slice(400).map(Math.abs)) * 1.2; br.range([0, T], [-em, em]); br.titles('time (s)', 'velocity error of the estimate'); br.line('e', R.t, err, { color: '--c-v', max: 3000 });
      const rms = (a) => Math.sqrt(a.slice(400).reduce((s, q) => s + q * q, 0) / (a.length - 400)), eN = rms(R.vd.map((q, i) => q - v[i])), eO = rms(err);
      plots.aux.draw({ xlim: [0, T], series: [{ x: R.t, y: err.map(Math.abs), color: '--c-v', label: '|velocity error| of the estimate (m/s)' }], xlabel: 'time (s)' });
      hud.set('a', `L = [${fmt(L[0])}, ${fmt(L[1])}]: estimator poles ${cpx(eo[0])} (plant ${cpx(eig2(A)[0])})`);
      hud.set('b', `rms velocity error after 2 s: estimate ${fmt(eO)} m/s, differencing the measurement ${fmt(eN)} m/s`, eO < eN ? 'good' : '');
      hud.set('c', state.est === 'luen' ? 'a fast observer forgets a wrong start quickly but follows the noise; a slow one is smooth but lags: the trade-off is the pole speed' : 'Kalman picks the gain from the noise levels: trust the model when the measurement is noisy, the measurement when the model is uncertain');
    }

    return {
      changed() { all.forEach((k) => k.show(true)); ctx.setClock(state.case === 'model' ? T : 0); },
      update() { all.forEach((k) => k.clear()); ({ model, placement, observer })[state.case](); },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
