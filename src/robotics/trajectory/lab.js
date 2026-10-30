// Joint trajectories: the trapezoidal velocity profile (with the admissible cruise speeds), and cubic and
// quintic polynomials compared with it. A one-joint arm swings along the profile.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { trapezoidal, cubic, quintic } from '../kin/model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 6, DEG = Math.PI / 180;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const LAW = { trap: trapezoidal, cubic: (a, b, _v, tf, t) => cubic(a, b, tf, t), quintic: (a, b, _v, tf, t) => quintic(a, b, tf, t) };
const COL = { trap: '--c-I', cubic: '--c-B', quintic: '--c-v' };

export default {
  id: 'trajectory', title: 'Trajectories', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { qi: 0, qf: 90, tf: 2, vc: 60, law: 'trap' },
  cases: [
    { id: 'trap', label: 'Trapezoidal profile', controls: ['qi', 'qf', 'tf', 'vc'], set: { qi: 0, qf: 90, tf: 2, vc: 60, law: 'trap' }, examples: [
      { id: 'triangle', label: 'Fastest cruise: a triangle', set: { vc: 90 } },
      { id: 'slowcruise', label: 'Barely fast enough: a jolt', set: { vc: 46 } },
      { id: 'bad', label: 'Too slow to arrive in time', set: { vc: 40 } },
    ] },
    { id: 'poly', label: 'Polynomials', controls: ['law', 'qi', 'qf', 'tf'], set: { qi: 0, qf: 90, tf: 2, law: 'cubic' }, examples: [
      { id: 'quintic', label: 'Quintic: smooth acceleration', set: { law: 'quintic' } },
      { id: 'trapcmp', label: 'Trapezoid with the same time', set: { law: 'trap', vc: 67.5 } },
    ] },
  ],
  controls: [
    { title: 'Move one joint', items: [
      { id: 'qi', label: 'From q_i', unit: '°', min: -90, max: 90, step: 1 }, { id: 'qf', label: 'To q_f', unit: '°', min: -90, max: 180, step: 1 },
      { id: 'tf', label: 'In time t_f', unit: 's', min: 0.5, max: 5, step: 0.1 },
      { id: 'vc', label: 'Cruise speed q̇_c', unit: '°/s', min: 5, max: 400, step: 1, show: (s) => s.law === 'trap' },
      { id: 'law', label: 'Law', type: 'segmented', options: [['trap', 'Trapezoid'], ['cubic', 'Cubic'], ['quintic', 'Quintic']], show: (s) => s.case === 'poly' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const link = createCurve(stage, { max: 2, width: 8, color: '--c-ref' }), arc = createCurve(stage, { max: 80, width: 1.4, color: '--ink-dim', dashed: true });
    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); },
      update() {
        const { qi, qf, tf, vc } = state, law = state.case === 'trap' ? 'trap' : state.law, f = LAW[law], T = tf * 1.25, t = Math.min(T, T * time.t / D);
        const d = qf - qi, ok = law !== 'trap' || trapezoidal(qi, qf, vc, tf, 0).ok, g = (x) => (ok ? f(qi, qf, vc, tf, x) : { q: NaN, v: NaN, a: NaN }); // an inadmissible profile is not drawn
        const ts = lin(0, T, 400), S = ts.map(g), now = g(t);
        const vmin = Math.abs(d) / tf, vmax = 2 * vmin;
        // position chart, with a one-link arm drawn in its top-left corner
        const lo = Math.min(qi, qf) - 10, hi = Math.max(qi, qf) + 10;
        sq.range([0, T], [lo, hi]); sq.titles('time (s)', 'joint angle q (°)');
        sq.line('q', ts, S.map((s) => s.q), { color: COL[law], width: 2.4 }); sq.dots('n', [t], [now.q], { color: '--accent', size: 11 });
        if (law !== 'trap') sq.line('qt', ts, ts.map((x) => trapezoidal(qi, qf, 1.5 * Math.abs(d) / tf, tf, x).q), { color: '--ink-dim', width: 1.2, dashed: true }); else sq.hide('qt');
        const cx = sq.mx(T * 0.15), cy = sq.my(hi - (hi - lo) * 0.3), R = 0.9;
        link.set([cx, cy, 0.03, cx + R * Math.cos(now.q * DEG), cy + R * Math.sin(now.q * DEG), 0.03]); link.object.visible = true;
        arc.set(lin(qi, qf, 40).flatMap((a) => [cx + R * Math.cos(a * DEG), cy + R * Math.sin(a * DEG), 0.02])); arc.object.visible = true;
        const v = S.map((s) => s.v), a = S.map((s) => s.a), vm = Math.max(...v.filter(Number.isFinite).map(Math.abs), 2 * Math.abs(d) / tf, 1) * 1.2, am = Math.max(...a.filter(Number.isFinite).map(Math.abs), 1) * 1.2;
        tr.range([0, T], [-vm * 0.1 * Math.sign(d || 1), vm]); if (d < 0) tr.range([0, T], [-vm, vm * 0.1]); tr.titles('time (s)', 'speed q̇ (°/s)');
        tr.line('v', ts, v, { color: COL[law], width: 2 }); tr.dots('n', [t], [now.v], { color: '--accent', size: 9 });
        if (law === 'trap') { tr.line('vmin', [0, T], [Math.sign(d) * vmin, Math.sign(d) * vmin], { color: '--c-v', width: 1, dashed: true }); tr.line('vmax', [0, T], [Math.sign(d) * vmax, Math.sign(d) * vmax], { color: '--c-v', width: 1, dashed: true }); } else { tr.hide('vmin'); tr.hide('vmax'); }
        br.range([0, T], [-am, am]); br.titles('time (s)', 'acceleration q̈ (°/s²)'); br.line('a', ts, a, { color: COL[law], width: 2 }); br.dots('n', [t], [now.a], { color: '--accent', size: 9 });
        const jerk = ts.slice(1).map((x, i) => (a[i + 1] - a[i]) / (ts[1] - ts[0]));
        plots.aux.draw({ xlim: [0, T], cursor: t, series: [{ x: ts.slice(1), y: jerk.map((j) => Math.max(-5e4, Math.min(5e4, j))), color: '--c-E', label: 'jerk (°/s³): spikes where the acceleration jumps' }] });
        if (law === 'trap') {
          const tc = tf - d / (Math.sign(d) * vc);
          hud.set('a', ok ? `accelerate for t_c = t_f − Δq/q̇_c = ${fmt(tc)} s at q̈_c = q̇_c/t_c = ${fmt(vc / tc)} °/s², cruise, then brake symmetrically` : `q̇_c = ${fmt(vc)} °/s is not admissible`, ok ? '' : 'bad');
          hud.set('b', `admissible cruise speeds: |Δq|/t_f = ${fmt(vmin)} < q̇_c ≤ 2|Δq|/t_f = ${fmt(vmax)} °/s (dashed)`, ok ? 'good' : 'bad');
          hud.set('c', 'speed continuous, acceleration piecewise constant: jumps at four instants (infinite jerk there)');
        } else {
          const pk = Math.max(...v.map(Math.abs)), pa = Math.max(...a.map(Math.abs));
          hud.set('a', `${law}: peak speed ${fmt(pk)} °/s (${fmt(pk / (Math.abs(d) / tf))} × the average), peak acceleration ${fmt(pa)} °/s²`);
          hud.set('b', law === 'cubic' ? 'q(t) = q_i + Δq(3s² − 2s³), s = t/t_f: rest to rest, but the acceleration starts and ends with a jump' : 'q(t) = q_i + Δq(10s³ − 15s⁴ + 6s⁵): zero acceleration at both ends, no jumps anywhere', 'good');
          hud.set('c', 'dashed: a trapezoid with cruise 1.5 |Δq|/t_f for comparison');
        }
      },
      theme() { charts.forEach((c) => c.theme()); link.theme(); arc.theme(); },
    };
  },
};
