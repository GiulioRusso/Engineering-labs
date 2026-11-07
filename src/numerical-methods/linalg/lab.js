// Linear systems: Gaussian elimination replayed one row operation at a time (the multipliers fill L, the
// matrix becomes U), with and without partial pivoting; Jacobi and Gauss–Seidel iterates walking to the
// crossing of two lines; and the condition number as the stretch of a cloud of perturbed solutions.
import { createChart } from '../../lib/viz/chart.js';
import { SYSTEMS, tinyA, eliminate, matvec, iterate, rhoJacobi, rhoGS, solve2, sv2, rowsAt } from './model.js';

const fmt = (v, d = 4) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], STEP = 1.1, NIT = 24, ISTEP = 0.45;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const lg = (v) => Math.log10(Math.max(Math.abs(v), 1e-17));

export default {
  id: 'linalg', title: 'Linear systems', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 12, loop: false,
  defaults: { sys: 'basic', pivot: true, eps: 1e-14, d: 3, c: 1, x0: -1.5, y0: 2.5, method: 'both', theta: 40, noise: 0.02 },
  cases: [
    { id: 'gauss', label: 'Gaussian elimination', set: {}, examples: [
      { id: 'zero', label: 'Zero pivot: swap rows', controls: ['pivot'], set: { sys: 'zero', pivot: true } },
      { id: 'nopivot', label: 'Zero pivot, no pivoting: stuck', controls: ['pivot'], set: { sys: 'zero', pivot: false } },
      { id: 'tiny', label: 'Tiny pivot without pivoting: wrong answer', controls: ['pivot', 'eps'], set: { sys: 'tiny', pivot: false, eps: 1e-15 } },
    ] },
    { id: 'iterative', label: 'Jacobi and Gauss–Seidel', set: {}, examples: [
      { id: 'dominant', label: 'Strong diagonal: fast', controls: ['d', 'c'], set: { d: 4, c: 1 } },
      { id: 'weak', label: 'Weak diagonal: slow', controls: ['d', 'c'], set: { d: 1.2, c: 1 } },
      { id: 'diverge', label: '|c| > |d|: they run away', controls: ['d', 'c'], set: { d: 1, c: 1.3 } },
    ] },
    { id: 'condition', label: 'Conditioning', set: {}, examples: [
      { id: 'square', label: 'At 90°: κ = 1', controls: ['theta', 'noise'], set: { theta: 90 } },
      { id: 'thin', label: 'At 3°: κ ≈ 38', controls: ['theta', 'noise'], set: { theta: 3 } },
    ] },
  ],
  controls: [
    { title: 'System', show: (s) => s.case === 'gauss', items: [
      { id: 'sys', label: 'Matrix', type: 'select', options: Object.entries(SYSTEMS).map(([k, v]) => [k, v.label]) },
      { id: 'pivot', label: 'Partial pivoting', type: 'check', hint: 'Before each column, swap in the row with the largest |entry|' },
      { id: 'eps', label: 'Pivot ε', unit: '', min: 1e-16, max: 1e-2, log: true, show: (s) => s.sys === 'tiny' },
    ] },
    { title: 'Matrix [[d, c], [c, d]], b = (1, 2)', show: (s) => s.case === 'iterative', items: [
      { id: 'd', label: 'Diagonal d', unit: '', min: 0.5, max: 5, step: 0.05 }, { id: 'c', label: 'Off-diagonal c', unit: '', min: -2, max: 2, step: 0.05 },
      { id: 'x0', label: 'Start x', unit: '', min: -3, max: 3, step: 0.1 }, { id: 'y0', label: 'Start y', unit: '', min: -3, max: 3, step: 0.1 },
      { id: 'method', label: 'Method', type: 'segmented', options: [['jacobi', 'Jacobi'], ['gs', 'Gauss–Seidel'], ['both', 'Both']] },
    ] },
    { title: 'Two lines', show: (s) => s.case === 'condition', items: [
      { id: 'theta', label: 'Angle between them', unit: '°', min: 1, max: 90, step: 0.5 }, { id: 'noise', label: 'Error in b (±)', unit: '', min: 0.001, max: 0.1, log: true },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene, cssVar } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, xTicks: false, yTicks: false, grid: false }), tr = createChart(ctx, { box: TR, xTicks: false, yTicks: false, grid: false }), br = createChart(ctx, { box: BR });
    const sq2 = createChart(ctx, { box: SQ }), tr2 = createChart(ctx, { box: TR }), all = [sq, tr, br, sq2, tr2];
    const pool = Array.from({ length: 40 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; if (!l) return; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    const hex = (v) => { const h = cssVar(v).trim().replace('#', ''), x = h.length === 3 ? h.replace(/./g, '$&$&') : h; return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255); };

    // a matrix as a grid of cells: lit row (orange), pivot cell (green), entries that are zero dimmed
    function matrix(ch, box, M, { row = -1, col = -1, sep = -1, names = [] } = {}) {
      const R = M.length, Cn = M[0].length, S = 16, bg = hex('--scene'), o = hex('--c-I'), g = hex('--c-v'), w = box[2] / Cn, h = box[3] / R;
      ch.range([0, Cn], [0, R]);
      ch.image('cells', new Array(Cn * S * R * S), Cn * S, R * S, { rgb: (k, out) => { const i = R - 1 - Math.floor(Math.floor(k / (Cn * S)) / S), j = Math.floor((k % (Cn * S)) / S), t = i === row && j === col ? [g, 0.35] : i === row ? [o, 0.18] : null; for (let q = 0; q < 3; q++) out[q] = t ? bg[q] * (1 - t[1]) + t[0][q] * t[1] : bg[q]; } });
      for (let j = 1; j < Cn; j++) ch.line(`v${j}`, [j, j], [0, R], { color: j === sep ? '--ink' : '--line', width: j === sep ? 2 : 1 });
      for (let i = 1; i < R; i++) ch.line(`h${i}`, [0, Cn], [i, i], { color: '--line', width: 1 });
      const cell = (v) => (v === 0 ? '0' : Math.abs(v) >= 1e5 || Math.abs(v) < 1e-3 ? v.toExponential(1).replace('e+', 'e') : fmt(v, 4));
      M.forEach((r, i) => r.forEach((v, j) => put(cell(v), box[0] + w * (j + 0.5), box[1] + h * (R - i - 0.5))));
      names.forEach((n, j) => put(n, box[0] + w * (j + 0.5), box[1] - 0.18));
    }

    function gauss() {
      const S = state.sys === 'tiny' ? { A: tinyA(state.eps), b: SYSTEMS.tiny.b } : SYSTEMS[state.sys], R = eliminate(S.A, S.b, state.pivot), n = R.steps.length;
      ctx.setDuration(n * STEP + 0.5); const k = Math.min(n - 1, Math.floor(time.t / STEP)), s = R.steps[k];
      sq.titles('', ': [A | b], one row operation at a time');
      matrix(sq, SQ, s.M, { row: s.row, col: s.col, sep: 3, names: ['x₁', 'x₂', 'x₃', 'b'] });
      tr.titles('', ': L, the multipliers (diagonal 1)'); matrix(tr, TR, s.L, { row: s.kind === 'elim' ? s.row : -1, col: s.kind === 'elim' ? s.col : -1 });
      // how a small pivot ruins elimination without pivoting
      const es = lin(-16, -2, 57), err = (p) => es.map((e) => { const A = tinyA(10 ** e), x = eliminate(A, SYSTEMS.tiny.b, p).x; return lg(Math.max(...matvec(A, x).map((v, i) => v - SYSTEMS.tiny.b[i]).map(Math.abs))); });
      br.range([-16, -2], [-17, 1]); br.titles('log₁₀ ε (the first pivot)', 'log₁₀ residual: with pivoting (green), without (orange)');
      br.line('np', es, err(false), { color: '--c-I', width: 2 }); br.line('p', es, err(true), { color: '--c-v', width: 2 });
      if (state.sys === 'tiny') br.line('cur', [Math.log10(state.eps), Math.log10(state.eps)], [-17, 1], { color: '--accent', width: 1.2 });
      const grow = R.steps.map((q) => Math.log10(Math.max(...q.M.flat().map(Math.abs))));
      plots.aux.draw({ xlim: [0, n - 1], cursor: k, series: [{ x: grow.map((_, i) => i), y: grow, color: '--c-I', label: 'log₁₀ of the largest |entry| in [A | b] after each step' }], xlabel: 'step' });
      const r = Number.isFinite(R.x[0]) ? Math.max(...matvec(S.A, R.x).map((v, i) => Math.abs(v - S.b[i]))) : NaN;
      hud.set('a', `step ${k + 1} of ${n}: ${s.op}`, s.kind === 'fail' ? 'bad' : '');
      hud.set('b', s.kind === 'back' || k === n - 1 ? `x = (${R.x.map((v) => fmt(v, 6)).join(', ')}); residual |Ax − b| = ${fmt(r, 2)}` : 'below the pivot each entry becomes 0; the multiplier m = entry ÷ pivot is stored in L', Number.isFinite(r) ? (r < 1e-9 ? 'good' : 'bad') : '');
      hud.set('c', `A = L·U${state.pivot ? ' (after the row swaps, P·A = L·U)' : ''}: the work is ≈ ⅔n³ operations, and then every new b costs only n²`);
    }

    function iterative() {
      const A = [[state.d, state.c], [state.c, state.d]], b = [1, 2], x = solve2(A, b), k = Math.min(NIT, Math.floor(time.t / ISTEP)), x0 = [state.x0, state.y0];
      ctx.setDuration(NIT * ISTEP + 0.5);
      const J = iterate(A, b, x0, NIT, 'jacobi'), G = iterate(A, b, x0, NIT, 'gs'), show = (m) => state.method === 'both' || state.method === m;
      const R = 3.2; sq2.range([-R, R], [-R, R]); sq2.titles('x', 'y: the two equations as lines; iterates walk to the crossing');
      const xs = lin(-R, R, 2); sq2.line('l1', xs, xs.map((v) => (b[0] - state.d * v) / (state.c || 1e-9)), { color: '--c-B', width: 2 }); sq2.line('l2', xs, xs.map((v) => (b[1] - state.c * v) / state.d), { color: '--c-B', width: 2 });
      if (show('jacobi')) sq2.line('j', J.slice(0, k + 1).map((p) => p[0]), J.slice(0, k + 1).map((p) => p[1]), { color: '--c-I', width: 1.8 });
      if (show('gs')) { const px = [G[0][0]], py = [G[0][1]]; for (let i = 1; i <= k; i++) { px.push(G[i][0], G[i][0]); py.push(G[i - 1][1], G[i][1]); } sq2.line('g', px, py, { color: '--c-v', width: 1.8 }); }
      sq2.dots('sol', [x[0]], [x[1]], { color: '--ink', size: 11 }); sq2.dots('st', [x0[0]], [x0[1]], { color: '--accent', size: 10 });
      const e = (P) => P.map((p) => lg(Math.hypot(p[0] - x[0], p[1] - x[1]))), it = J.map((_, i) => i);
      tr2.range([0, NIT], [-16, 3]); tr2.titles('iteration k', 'log₁₀ error: Jacobi (orange), Gauss–Seidel (green)');
      if (show('jacobi')) tr2.line('j', it.slice(0, k + 1), e(J).slice(0, k + 1), { color: '--c-I' }); if (show('gs')) tr2.line('g', it.slice(0, k + 1), e(G).slice(0, k + 1), { color: '--c-v' });
      const q = lin(-2, 2, 161); br.range([-2, 2], [0, 2]); br.titles('c / d', 'ρ: spectral radius, Jacobi (orange), Gauss–Seidel (green)');
      br.line('j', q, q.map(Math.abs), { color: '--c-I', width: 2 }); br.line('g', q, q.map((v) => v * v), { color: '--c-v', width: 2 }); br.line('one', [-2, 2], [1, 1], { color: '--c-north', width: 1.2, dashed: true }); br.line('cur', [state.c / state.d, state.c / state.d], [0, 2], { color: '--accent', width: 1.2 });
      const rj = rhoJacobi(A), rg = rhoGS(A);
      plots.aux.draw({ xlim: [0, NIT], cursor: k, series: [{ x: it, y: J.map((p) => p[0]), color: '--c-I', label: 'Jacobi: x estimate' }, { x: it, y: G.map((p) => p[0]), color: '--c-v', label: 'Gauss–Seidel: x estimate' }, { x: [0, NIT], y: [x[0], x[0]], color: '--ink-dim', label: 'exact x' }], xlabel: 'iteration' });
      hud.set('a', `iteration ${k}: Jacobi (${fmt(J[k][0])}, ${fmt(J[k][1])}), Gauss–Seidel (${fmt(G[k][0])}, ${fmt(G[k][1])}); exact (${fmt(x[0])}, ${fmt(x[1])})`);
      hud.set('b', `ρ(Jacobi) = |c/d| = ${fmt(rj, 3)}, ρ(Gauss–Seidel) = ${fmt(rg, 3)}: ${rj < 1 ? `each step multiplies the error by about ρ; Gauss–Seidel needs half the steps` : 'ρ > 1: the error grows every step'}`, rj < 1 ? 'good' : 'bad');
      hud.set('c', Math.abs(state.d) > Math.abs(state.c) ? 'diagonally dominant (|d| > |c|): convergence is guaranteed' : 'not diagonally dominant: no guarantee, and here they diverge');
    }

    function condition() {
      const th = state.theta * Math.PI / 180, A = rowsAt(th), b = [1, 1], x = solve2(A, b), { cond, smax, smin } = sv2(A), e = state.noise;
      // many solutions, each with b perturbed inside the ± box
      const pts = []; let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 400; i++) { const bb = [b[0] + e * (2 * rnd() - 1), b[1] + e * (2 * rnd() - 1)]; pts.push(solve2(A, bb)); }
      const spread = Math.max(0.6, 1.3 * Math.max(...pts.map((p) => Math.hypot(p[0] - x[0], p[1] - x[1])))), ar = SQ[2] / SQ[3];
      sq2.range([x[0] - spread * ar, x[0] + spread * ar], [x[1] - spread, x[1] + spread]); sq2.titles('x', 'y: each line drawn ± the error in b; dots: 400 perturbed solutions');
      const X = lin(x[0] - spread * ar, x[0] + spread * ar, 2);
      for (const [i, sgn] of [[0, 0], [0, 1], [0, -1], [1, 0], [1, 1], [1, -1]]) { const k = `l${i}${sgn}`, rhs = b[i] + sgn * e;
        if (i === 0) sq2.line(k, [rhs, rhs], [x[1] - spread, x[1] + spread], { color: '--c-B', width: sgn ? 1 : 2.2, dashed: !!sgn }); else sq2.line(k, X, X.map((v) => (rhs - A[1][0] * v) / A[1][1]), { color: '--c-I', width: sgn ? 1 : 2.2, dashed: !!sgn }); }
      sq2.dots('p', pts.map((p) => p[0]), pts.map((p) => p[1]), { color: '--c-v', size: 4 }); sq2.dots('x', [x[0]], [x[1]], { color: '--ink', size: 10 });
      const ths = lin(1, 90, 120); tr2.range([0, 90], [0, 2.2]); tr2.titles('angle between the lines (°)', 'log₁₀ κ: the condition number');
      tr2.line('k', ths, ths.map((t) => Math.log10(sv2(rowsAt(t * Math.PI / 180)).cond)), { color: '--c-B' }); tr2.dots('c', [state.theta], [Math.log10(cond)], { color: '--accent', size: 10 });
      const a = lin(0, 2 * Math.PI, 121), inv = (v) => solve2(A, v), E = a.map((t) => inv([Math.cos(t), Math.sin(t)])), m = 1.15 / smin, arb = BR[2] / BR[3];
      br.range([-m * arb, m * arb], [-m, m]); br.titles('', ': A⁻¹ turns the unit circle of errors (grey) into an ellipse');
      br.line('c', a.map(Math.cos), a.map(Math.sin), { color: '--ink-dim', width: 1.4 }); br.line('e', E.map((p) => p[0]), E.map((p) => p[1]), { color: '--c-v', width: 2 });
      const amp = pts.map((p) => (Math.hypot(p[0] - x[0], p[1] - x[1]) / Math.hypot(...x)) / (e * Math.SQRT2 / Math.hypot(...b))).sort((u, v) => u - v);
      plots.aux.draw({ xlim: [0, amp.length - 1], series: [{ x: amp.map((_, i) => i), y: amp, color: '--c-v', label: 'relative error in x ÷ relative error in b, 400 trials sorted' }, { x: [0, amp.length - 1], y: [cond, cond], color: '--c-north', label: 'κ: the worst case' }], xlabel: 'trial (sorted)' });
      hud.set('a', `κ = σmax / σmin = ${fmt(smax, 3)} / ${fmt(smin, 3)} = ${fmt(cond, 3)}`);
      hud.set('b', `an error of ±${fmt(e)} in b can move x by up to κ times as much, relatively: the cloud is ${fmt(cond, 2)}× longer than it is wide`, cond > 20 ? 'bad' : 'good');
      hud.set('c', 'nearly parallel lines: a small shift of either moves their crossing a long way. κ ≈ 10ᵏ costs about k digits');
    }

    return {
      changed() { const c = state.case; [sq, tr].forEach((k) => k.show(c === 'gauss')); [sq2, tr2].forEach((k) => k.show(c !== 'gauss')); br.show(true); ctx.setClock(c === 'condition' ? 0 : 12); },
      update() {
        all.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        ({ gauss, iterative, condition })[state.case]();
      },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
