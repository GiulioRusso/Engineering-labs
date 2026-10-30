// Newton's laws on an incline: free-body diagram, static vs kinetic friction, a hanging mass over a
// pulley. Drawing on the left, acceleration against the slope and the friction law on the right.
import { createChart } from '../../lib/viz/chart.js';
import { solve, reposeAngle, G } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], deg = Math.PI / 180;
const S = 4, B = 0.25, D = 3; // slope length (m), half block size, animated seconds

export default {
  id: 'incline', title: 'Newton’s laws on an incline', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { th: 35 * deg, m: 2, M: 0, mus: 0.5, muk: 0.4, pulley: false },
  cases: [
    { id: 'incline', label: 'Block on a slope', controls: ['th', 'mus', 'muk', 'm'], set: { pulley: false, M: 0, th: 35 * deg, mus: 0.5, muk: 0.4 }, examples: [
      { id: 'below', label: 'At 20°: friction holds it', set: { th: 20 * deg } },
      { id: 'ice', label: 'On ice: μ ≈ 0.05', set: { th: 20 * deg, mus: 0.1, muk: 0.05 } },
      { id: 'steep', label: 'At 60°: hardly slowed', set: { th: 60 * deg } },
    ] },
    { id: 'pulley', label: 'Pulled by a hanging mass', controls: ['M', 'm', 'th', 'mus', 'muk'], set: { pulley: true, th: 30 * deg, m: 2, M: 2, mus: 0.3, muk: 0.2 }, examples: [
      { id: 'balanced', label: 'Lighter weight: friction holds', set: { M: 1.5 } },
      { id: 'atwood', label: 'Vertical, no friction: Atwood', set: { th: 90 * deg, m: 1, M: 1.5, mus: 0, muk: 0 } },
    ] },
  ],
  controls: [
    { title: 'Slope', items: [
      { id: 'th', label: 'Angle θ', unit: '°', k: 1 / deg, min: 0, max: 90 * deg, step: deg },
      { id: 'mus', label: 'Static μs', unit: '', min: 0, max: 1, step: 0.01 },
      { id: 'muk', label: 'Kinetic μk', unit: '', min: 0, max: 1, step: 0.01 },
    ] },
    { title: 'Masses', items: [
      { id: 'm', label: 'Block m', unit: 'kg', min: 0.5, max: 10, step: 0.1 },
      { id: 'pulley', label: 'Hanging mass over a pulley', type: 'check' },
      { id: 'M', label: 'Hanging M', unit: 'kg', min: 0, max: 10, step: 0.1, show: (s) => s.pulley },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 8 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(sq.mx(x), sq.my(y), 0.02); l.visible = true; };
    let nk = 0; const keys = new Set();
    const seg = (pts, o) => { const k = `g${nk++}${o.color}${o.dashed ? 'd' : ''}`; keys.add(k); sq.line(k, pts.map((p) => p[0]), pts.map((p) => p[1]), o); };
    const arrow = ([x, y], [dx, dy], color, label) => {
      const L = Math.hypot(dx, dy); if (L < 0.02) return;
      const ux = dx / L, uy = dy / L, h = Math.min(0.18, L / 2), X = x + dx, Y = y + dy;
      seg([[x, y], [X, Y]], { color, width: 2.4 }); seg([[X - h * ux + 0.5 * h * uy, Y - h * uy - 0.5 * h * ux], [X, Y], [X - h * ux - 0.5 * h * uy, Y - h * uy + 0.5 * h * ux]], { color, width: 2.4 });
      text(label, X + 0.25 * ux, Y + 0.25 * uy);
    };
    const p = () => ({ m: state.m, M: state.pulley ? state.M : 0, th: state.th, mus: state.mus, muk: state.muk });
    const start = () => (state.pulley ? 1 : S - 1);
    const pos = (s, t) => Math.max(B + 0.05, Math.min(S - B - 0.1, start() + 0.5 * s.a * t * t));
    return {
      changed() { charts.forEach((c) => { c.show(false); c.show(true); }); sq.show(false); ctx.setClock(solve(p()).sticks ? 0 : D); },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; }); nk = 0; keys.forEach((k) => sq.hide(k));
        const P = p(), s = solve(P), th = state.th, c = Math.cos(th), sn = Math.sin(th), u = [c, sn], n = [-sn, c];
        const t = s.sticks ? 0 : time.t, x = pos(s, t), top = [S * c, S * sn];
        if (state.pulley) sq.range([-0.8, 5.4], [-2.0, 4.2]); else sq.range([-1, 4.6], [-1.9, 3.7]);
        seg([[0, 0], top, [top[0], 0], [0, 0]], { color: '--ink-dim', width: 2 });
        seg([[-0.6, 0], [5.4, 0]], { color: '--ink-dim', width: 1.2 });
        // block
        const C = [u[0] * x + n[0] * B, u[1] * x + n[1] * B], corner = (a, b) => [C[0] + a * B * u[0] + b * B * n[0], C[1] + a * B * u[1] + b * B * n[1]];
        seg([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1), corner(-1, -1)], { color: '--c-B', width: 3 });
        if (state.pulley) {
          const pc = [top[0] + 0.2 * n[0], top[1] + 0.2 * n[1]], yH = top[1] - 0.6 - (x - start()), hx = Math.max(pc[0] + 0.2, top[0] + 0.4);
          const circ = Array.from({ length: 25 }, (_, i) => [pc[0] + 0.2 * Math.cos(i * Math.PI / 12), pc[1] + 0.2 * Math.sin(i * Math.PI / 12)]);
          seg(circ, { color: '--ink', width: 1.6 });
          seg([[C[0] + B * u[0], C[1] + B * u[1]], pc, [hx, pc[1]], [hx, yH + 0.25]], { color: '--ink', width: 1.2 }); // rope, schematic
          seg([[hx - 0.25, yH - 0.25], [hx + 0.25, yH - 0.25], [hx + 0.25, yH + 0.25], [hx - 0.25, yH + 0.25], [hx - 0.25, yH - 0.25]], { color: '--c-I', width: 3 });
          arrow([hx + 0.45, yH], [0, -0.9], '--c-F', `Mg ${fmt(P.M * G)} N`);
        }
        // free-body diagram: arrows scaled to the weight
        const k = 1.5 / s.W;
        arrow(C, [0, -s.W * k], '--c-F', `mg ${fmt(s.W)} N`);
        arrow(C, [n[0] * s.N * k, n[1] * s.N * k], '--c-B', `N ${fmt(s.N)} N`);
        arrow(C, [u[0] * s.f * k, u[1] * s.f * k], '--c-north', `${s.sticks ? 'static' : 'kinetic'} f ${fmt(Math.abs(s.f))} N`);
        if (state.pulley) arrow(C, [u[0] * s.T * k, u[1] * s.T * k], '--c-I', `T ${fmt(s.T)} N`);
        text(`θ = ${fmt(th / deg)}°`, 0.9, 0.2);

        // acceleration against the slope angle
        const ths = Array.from({ length: 181 }, (_, i) => i * 0.5 * deg), A = ths.map((q) => solve({ ...P, th: q }).a), A0 = ths.map((q) => solve({ ...P, th: q, mus: 0, muk: 0 }).a);
        const am = Math.max(1, ...A0.map(Math.abs)) * 1.1;
        tr.range([0, 90], [-am, am]); tr.titles('slope θ (°)', 'a (m/s²): + up the slope; dashed: no friction');
        tr.line('a0', ths.map((q) => q / deg), A0, { color: '--ink-dim', dashed: true, width: 1.2 }); tr.line('a', ths.map((q) => q / deg), A, { color: '--c-v' });
        tr.dots('q', [th / deg], [s.a], { color: '--accent', size: 11 });
        // friction law: static friction matches the push up to μs N, then drops to μk N
        const fm = Math.max(s.fmax, s.N * state.muk, 1), Fx = Math.max(2 * fm, 1.2 * Math.abs(s.F));
        br.range([0, Fx], [0, fm * 1.3]); br.titles('push along the slope |F| (N)', 'friction |f| (N): equals |F| up to μs N, then μk N');
        br.line('f', [0, s.fmax, s.fmax, Fx], [0, s.fmax, s.N * state.muk, s.N * state.muk], { color: '--c-north' });
        br.dots('q', [Math.abs(s.F)], [Math.abs(s.f)], { color: '--accent', size: 11 });
        const ts = Array.from({ length: 61 }, (_, i) => i * D / 60);
        plots.aux.draw({ xlim: [0, D], cursor: t, series: [{ x: ts, y: ts.map((q) => pos(s, s.sticks ? 0 : q)), color: '--c-B', label: 'block position along the slope (m)' }] });

        hud.set('a', s.sticks ? `at rest: static friction ${fmt(Math.abs(s.f))} N is enough (it could give up to μs N = ${fmt(s.fmax)} N)` : `sliding ${s.a > 0 ? 'up' : 'down'}: a = ${fmt(Math.abs(s.a))} m/s²`, s.sticks ? 'good' : '');
        hud.set('b', `along the slope: ${state.pulley ? `T ${fmt(s.T)} N − ` : ''}mg sin θ ${fmt(s.W * sn)} N ${s.f >= 0 ? '+' : '−'} friction ${fmt(Math.abs(s.f))} N = m a ${fmt(state.m * s.a)} N; across: N = mg cos θ = ${fmt(s.N)} N`);
        hud.set('c', state.pulley ? `the rope pulls the block with T = M(g − a) = ${fmt(s.T)} N, less than Mg = ${fmt(P.M * G)} N whenever M accelerates down`
          : `alone on the slope it stays put up to tan θ = μs: θ = ${fmt(reposeAngle(state.mus) / deg)}° (now ${fmt(th / deg)}°)`);
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
