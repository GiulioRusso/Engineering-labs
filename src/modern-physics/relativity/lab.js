// Special relativity: the light clock (time dilation), the twins on a spacetime diagram, and boosted
// axes showing that simultaneity is relative. c = 1: years and light-years.
import { createChart } from '../../lib/viz/chart.js';
import { gamma, boost, twins } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 12;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const tri = (u) => { const f = ((u % 2) + 2) % 2; return f < 1 ? -1 + 2 * f : 3 - 2 * f; }; // photon height: −1 → 1 → −1 every 2 units

export default {
  id: 'relativity', title: 'Special relativity', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: true,
  defaults: { b: 0.6, dist: 8 },
  cases: [
    { id: 'clock', label: 'Light clock', controls: ['b'], set: { b: 0.6 }, examples: [
      { id: 'fast', label: 'At 0.99 c: γ = 7.1', set: { b: 0.99 } },
      { id: 'slow', label: 'At 0.1 c: hardly any effect', set: { b: 0.1 } },
    ] },
    { id: 'twins', label: 'Twins', controls: ['b', 'dist'], set: { b: 0.8, dist: 8 }, examples: [
      { id: 'half', label: 'At 0.5 c', set: { b: 0.5 } },
    ] },
    { id: 'minkowski', label: 'Spacetime diagram', controls: ['b'], set: { b: 0.6 }, examples: [
      { id: 'flip', label: 'Moving the other way: A first', set: { b: -0.6 } },
      { id: 'near-c', label: 'At 0.9 c: axes close up', set: { b: 0.9 } },
    ] },
  ],
  controls: [{ title: 'Motion', items: [
    { id: 'b', label: 'Speed β = v/c', unit: '', min: -0.99, max: 0.99, step: 0.01 },
    { id: 'dist', label: 'Star distance', unit: 'ly', min: 1, max: 20, step: 0.5, show: (s) => s.case === 'twins' },
  ] }],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 8 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(sq.mx(x), sq.my(y), 0.02); l.visible = true; };
    let nk = 0; const keys = new Set();
    // colour and width are fixed when a curve is created: both go in the key
    const seg = (pts, o) => { const k = `g${nk++}${o.color}${o.dashed ? 'd' : ''}${o.width}`; keys.add(k); sq.line(k, pts.map((p) => p[0]), pts.map((p) => p[1]), o); };
    // a straight segment cut to the [−3, 3]² diagram (chart lines drop points outside their range)
    const clip = (a, b, o) => seg(lin(0, 1, 121).map((u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]).filter(([x, y]) => Math.abs(x) <= 3 && Math.abs(y) <= 3), o);
    const bs = lin(-0.99, 0.99, 199);
    return {
      changed() {
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); });
        if (state.case === 'clock') sq.show(false);
        ctx.setClock(state.case === 'minkowski' ? 0 : D);
      },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; }); nk = 0; keys.forEach((k) => sq.hide(k));
        const c = state.case, b = state.b, ab = Math.abs(b), g = gamma(b), t = time.t;
        if (c === 'clock') {
          sq.range([-4.2, 4.2], [-4.2, 4.2]);
          // clock at rest (left) and clock moving with the ship (right); the posts are the lab frame scrolling past
          for (const [cx, lab, ly] of [[-2.6, 'at rest: tick = 2', 1.5], [1.8, `moving at ${fmt(ab)} c: tick = ${fmt(2 * g)}`, 2.2]]) {
            seg([[cx - 0.6, 1], [cx + 0.6, 1]], { color: '--ink', width: 3 }); seg([[cx - 0.6, -1], [cx + 0.6, -1]], { color: '--ink', width: 3 }); text(lab, cx, ly);
          }
          sq.dots('ph', [-2.6, 1.8], [tri(t), tri(t / g)], { color: '--c-E', size: 12 });
          const trail = lin(Math.max(0, t - 8), t, 160).map((q) => [1.8 - ab * (t - q), tri(q / g)]); // the moving photon's path, seen from the lab
          seg(trail.filter((p) => p[0] > -0.9), { color: '--c-E', width: 1.4, dashed: true });
          for (let k = -6; k <= 6; k++) { const px = ((k - ab * t) % 6 + 9) % 6 - 3 + 1.8; if (px > -0.9 && px < 4.8) seg([[px, -1.6], [px, -1.3]], { color: '--ink-dim', width: 1.4 }); }
          text(`ticks so far: ${Math.floor(t / 2)} (rest) vs ${Math.floor(t / (2 * g))} (moving)`, 0, -2.6);
          tr.range([0, 1], [0, 8]); tr.titles('speed β', 'γ = 1/√(1 − β²): how much slower the moving clock ticks');
          tr.line('g', bs.filter((q) => q >= 0), bs.filter((q) => q >= 0).map(gamma), { color: '--c-v' }); tr.dots('q', [ab], [Math.min(8, g)], { color: '--accent', size: 11 });
          br.range([0, D], [0, D / 2 + 0.5]); br.titles('lab time', 'ticks counted: rest (blue), moving (orange)');
          const ts = lin(0, D, 241); br.line('r', ts, ts.map((q) => Math.floor(q / 2)), { color: '--c-B', width: 2 }); br.line('m', ts, ts.map((q) => Math.floor(q / (2 * g))), { color: '--c-I', width: 2 }); br.line('now', [t, t], [0, D / 2 + 0.5], { color: '--accent', dashed: true, width: 1 });
          plots.aux.draw({ xlim: [0, D], cursor: t, series: [{ x: ts, y: ts.map(tri), color: '--c-B', label: 'photon height, clock at rest' }, { x: ts, y: ts.map((q) => tri(q / g)), color: '--c-I', label: 'moving clock (seen from the lab)' }] });
          hud.set('a', `β = ${fmt(ab)}: γ = ${fmt(g, 4)}; the moving light runs a diagonal √(1 + (βt/2)²) per half tick, so its tick is γ times longer`);
          hud.set('b', `after ${fmt(t)} units of lab time the moving clock shows ${fmt(t / g)}: τ = t/γ`);
          hud.set('c', 'not a fault of this clock: every clock, heartbeat and decay on the ship slows by the same γ');
        } else if (c === 'twins') {
          const T = twins(state.dist, ab || 0.01), Te = T.earth, out = Te / 2, tN = t / D * Te, x = tN < out ? ab * tN : ab * (Te - tN), tau = tN / g;
          const span = Math.max(Te, state.dist * 2) * 1.08;
          sq.range([-span * 0.3, span * 0.7], [-span * 0.04, span * 0.96]); sq.titles('distance x (light-years)', 'Earth time ct (years)');
          seg([[0, 0], [0, Te]], { color: '--c-B', width: 2.5 }); seg([[0, 0], [state.dist, out], [0, Te]], { color: '--c-I', width: 2.5 });
          seg([[0, 0], [span * 0.65, span * 0.65]], { color: '--c-E', dashed: true, width: 1 });
          const ey = [], tx = [], ty = [];
          for (let y = 1; y < Te; y++) ey.push(y);
          for (let y = 1; y < T.traveller; y++) { const q = y * g; tx.push(q < out ? ab * q : ab * (Te - q)); ty.push(q); }
          sq.dots('ey', ey.map(() => 0), ey, { color: '--c-B', size: 6 }); sq.dots('ty', tx, ty, { color: '--c-I', size: 6 });
          sq.dots('now', [0, x], [tN, tN], { color: '--accent', size: 12 }); seg([[-span * 0.25, tN], [span * 0.65, tN]], { color: '--accent', dashed: true, width: 1 });
          text('Earth twin', 0, -span * 0.02); text(`star, ${fmt(state.dist)} ly`, state.dist, out + span * 0.04); text('light', span * 0.55, span * 0.6);
          tr.range([0, Te], [0, Te * 1.05]); tr.titles('Earth time (years)', 'age gained: Earth twin (blue), traveller (orange)');
          tr.line('e', [0, Te], [0, Te], { color: '--c-B' }); tr.line('t', [0, Te], [0, Te / g], { color: '--c-I' }); tr.dots('q', [tN, tN], [tN, tau], { color: '--accent', size: 9 });
          br.range([0, Te], [0, state.dist * 1.1]); br.titles('Earth time (years)', 'distance from Earth (ly)');
          br.line('x', [0, out, Te], [0, state.dist, 0], { color: '--c-I' }); br.dots('q', [tN], [x], { color: '--accent', size: 9 });
          plots.aux.draw({ xlim: [0.01, 0.99], cursor: ab, series: [{ x: bs.filter((q) => q > 0), y: bs.filter((q) => q > 0).map((q) => twins(state.dist, q).traveller), color: '--c-I', label: `traveller's trip time (years) vs speed β, for ${fmt(state.dist)} ly each way` }] });
          hud.set('a', `Earth: ${fmt(Te)} years for the round trip; traveller: ${fmt(T.traveller)} years (γ = ${fmt(g)})`);
          hud.set('b', `dots: one per year of each twin's own clock — ${Math.floor(Te)} on Earth's line, ${Math.floor(T.traveller)} on the traveller's`);
          hud.set('c', 'not symmetric: only the traveller turns round (changes frame), and the straight line in spacetime is the longest proper time');
        } else {
          sq.range([-3, 3], [-3, 3]); sq.titles('x (light-years)', 'ct (years)');
          seg([[-3, -3], [3, 3]], { color: '--c-E', dashed: true, width: 1.2 }); seg([[-3, 3], [3, -3]], { color: '--c-E', dashed: true, width: 1.2 });
          // boosted grid: lines of constant t' (slope β) and constant x' (slope 1/β), through (t', x') = (k, 0) and (0, k)
          for (let k = -2; k <= 2; k++) {
            const P = (tp, xp) => { const e = boost({ t: tp, x: xp }, -b); return [e.x, e.t]; };
            clip(P(k, -8), P(k, 8), { color: '--c-I', width: k ? 1 : 2.4 }); clip(P(-8, k), P(8, k), { color: '--c-I', width: k ? 1 : 2.4 });
          }
          const A = { t: 1, x: -1 }, B = { t: 1, x: 1 }, Ap = boost(A, b), Bp = boost(B, b);
          sq.dots('ev', [A.x, B.x], [A.t, B.t], { color: '--accent', size: 13 }); text('A', -1.25, 1.2); text('B', 1.25, 1.2);
          const sl = (e, tp) => { const P = (xp) => { const q = boost({ t: tp, x: xp }, -b); return [q.x, q.t]; }; return [P(-12), P(12)]; };
          clip(...sl(A, Ap.t), { color: '--c-north', dashed: true, width: 1.4 }); clip(...sl(B, Bp.t), { color: '--c-v', dashed: true, width: 1.4 });
          text("ct'", ...(() => { const q = boost({ t: 2.6, x: 0 }, -b); const k = Math.min(1, 2.7 / Math.max(Math.abs(q.x), q.t)); return [q.x * k + 0.2, q.t * k]; })()); // kept inside the diagram
          tr.range([-1, 1], [-3, 4]); tr.titles('frame speed β', "moving-frame time t' of A (red) and B (green)");
          tr.line('a', bs, bs.map((q) => boost(A, q).t), { color: '--c-north' }); tr.line('b', bs, bs.map((q) => boost(B, q).t), { color: '--c-v' }); tr.dots('q', [b, b], [Ap.t, Bp.t], { color: '--accent', size: 9 });
          br.range([-3, 3], [0, 3.2]); br.titles('x', 'ct: the event (ct, x) = (1, 0) seen from every frame lies on t² − x² = 1');
          const hs = lin(-2.8, 2.8, 120); br.line('h', hs, hs.map((x) => Math.sqrt(1 + x * x)), { color: '--c-B' });
          const E = boost({ t: 1, x: 0 }, b); br.dots('q', [E.x], [E.t], { color: '--accent', size: 11 });
          plots.aux.draw({ xlim: [-0.99, 0.99], cursor: b, series: [{ x: bs, y: bs.map((q) => boost(B, q).t - boost(A, q).t), color: '--c-F', label: "t'_B − t'_A: zero only for β = 0" }] });
          hud.set('a', `in the lab A and B happen at the same time, ct = 1, 2 light-years apart`);
          hud.set('b', `moving at β = ${fmt(b)}: t'_A = ${fmt(Ap.t)}, t'_B = ${fmt(Bp.t)} — ${Math.abs(b) < 1e-9 ? 'simultaneous' : Bp.t < Ap.t ? 'B happens first' : 'A happens first'}`);
          hud.set('c', `the orange axes are the moving frame: ct' along x = βt, x' along t = βx; the light lines (gold) are the same for both`);
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
