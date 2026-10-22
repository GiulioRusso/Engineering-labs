// One neuron as a tilted sigmoid sheet over the data (3D), learning as a walk down the loss landscape,
// and a hidden layer bending the plane until two moons come apart.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createSurface } from '../../lib/viz/surface.js';
import { blobs, moons, sigmoid, logLoss, descend, accuracy, trainMLP, mlpForward } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const R = 3; // data window ±3
// the part of the line p + t·d inside the square ±R (Liang–Barsky), or null
const clip = (px, py, dx, dy) => { let t0 = -1e9, t1 = 1e9; for (const [p, q] of [[-dx, px + R], [dx, R - px], [-dy, py + R], [dy, R - py]]) { if (Math.abs(p) < 1e-12) { if (q < 0) return null; } else { const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r); } } return t0 < t1 ? [px + t0 * dx, py + t0 * dy, px + t1 * dx, py + t1 * dy] : null; };
const BLOBS = blobs(), MOONS = moons();

export default {
  id: 'neuron', title: 'Neurons and learning', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [7.5, -8, 6], target: [0, 0, 0.8] } },
  camOf: (s) => (s.case === 'neuron' ? 'iso' : 'top'),
  defaults: { w1: 1, w2: 1, b: 0, lr: 0.5, data: 'blobs', H: 6, act: 'tanh' },
  cases: [
    { id: 'neuron', label: 'A neuron in 3D', set: {}, examples: [
      { id: 'steep', label: 'Large weights: a sharp step', controls: ['w1', 'w2'], set: { w1: 4, w2: 4 } },
      { id: 'flat', label: 'Small weights: unsure everywhere', controls: ['w1', 'w2'], set: { w1: 0.3, w2: 0.3 } },
      { id: 'bias', label: 'The bias slides the line', controls: ['b'], set: { b: 2 } },
      { id: 'wrong', label: 'Pointing the wrong way', controls: ['w1', 'w2'], set: { w1: -1, w2: 1.5 } },
    ] },
    { id: 'descent', label: 'Learning: gradient descent', set: {}, examples: [
      { id: 'slow', label: 'Tiny learning rate: crawls', controls: ['lr'], set: { lr: 0.05 } },
      { id: 'fast', label: 'Big learning rate: bold steps', controls: ['lr'], set: { lr: 3 } },
      { id: 'moons', label: 'Moons: no line can do it', controls: ['data'], set: { data: 'moons' } },
    ] },
    { id: 'hidden', label: 'A hidden layer', set: {}, examples: [
      { id: 'two', label: 'Two hidden units: the hidden space', controls: ['H'], set: { H: 2 } },
      { id: 'relu', label: 'ReLU: folds made of straight pieces', controls: ['act'], set: { act: 'relu', H: 8 } },
      { id: 'wide', label: 'Sixteen units', controls: ['H'], set: { H: 16 } },
    ] },
  ],
  controls: [
    { title: 'Neuron', show: (s) => s.case === 'neuron', items: [
      { id: 'w1', label: 'Weight w₁', unit: '', min: -5, max: 5, step: 0.05 }, { id: 'w2', label: 'Weight w₂', unit: '', min: -5, max: 5, step: 0.05 }, { id: 'b', label: 'Bias b', unit: '', min: -5, max: 5, step: 0.05 },
    ] },
    { title: 'Training', show: (s) => s.case === 'descent', items: [
      { id: 'lr', label: 'Learning rate η', unit: '', min: 0.01, max: 5, log: true }, { id: 'data', label: 'Data', type: 'segmented', options: [['blobs', 'Two blobs'], ['moons', 'Two moons']] },
    ] },
    { title: 'Network', show: (s) => s.case === 'hidden', items: [
      { id: 'H', label: 'Hidden units', unit: '', min: 1, max: 16, step: 1 }, { id: 'act', label: 'Activation', type: 'segmented', options: [['tanh', 'tanh'], ['relu', 'ReLU']] },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    const sq = createChart(ctx, { box: SQ, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const surf = createSurface(scene, { nx: 70, ny: 70, x: [-R, R], y: [-R, R], opacity: 0.75 }), line = createCurve(stage, { max: 600, width: 3.4, color: '--c-I' }), floor = createCurve(stage, { max: 80, width: 1, color: '--line' });
    const p0 = createCurve(stage, { max: 2000, width: 2.4, color: '--c-B' }), p1 = createCurve(stage, { max: 2000, width: 2.4, color: '--c-E' }), hid = createCurve(stage, { max: 400, width: 1.4, color: '--c-ref' }), all3 = [line, floor, p0, p1];
    const lbl = ['x₁', 'x₂', 'p(class 1)'].map((t) => { const l = ctx.label(t, 'tick'); scene.add(l); return l; });
    lbl[0].position.set(3.4, -3.3, 0); lbl[1].position.set(-3.4, 3.4, 0); lbl[2].position.set(-3.2, -3.2, 2.3);
    const cross = (arr, x, y, z, r = 0.09) => arr.push(x - r, y, z, x + r, y, z, x, y - r, z, x, y + r, z);
    let T = null, tk = '', D = null, dk = '', land = null;
    const dataOf = () => (state.data === 'moons' ? MOONS : BLOBS);
    // decision region of f on the square chart: blue class 0, yellow class 1, faded near 0.5
    const region = (f) => { const n = 90, v = new Float64Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) v[j * n + i] = f(-R + 2 * R * (i + 0.5) / n, -R + 2 * R * (j + 0.5) / n); sq.image('reg', v, n, n, { rgb: (k, out) => { const p = v[k]; out[0] = 0.12 + 0.55 * p; out[1] = 0.16 + 0.35 * p; out[2] = 0.28 + 0.35 * (1 - p); } }); };
    const dots = (P) => { sq.dots('c0', P.filter((p) => !p[2]).map((p) => p[0]), P.filter((p) => !p[2]).map((p) => p[1]), { color: '--c-B', size: 7 }); sq.dots('c1', P.filter((p) => p[2]).map((p) => p[0]), P.filter((p) => p[2]).map((p) => p[1]), { color: '--c-E', size: 7 }); };
    return {
      changed() {
        const c = state.case, v3 = c === 'neuron';
        stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        charts.forEach((k) => k.show(!v3)); surf.mesh.visible = v3; all3.forEach((o) => { o.object.visible = v3; }); lbl.forEach((l) => { l.visible = v3; }); hid.object.visible = c === 'hidden';
        ctx.setClock(v3 ? 0 : 10);
      },
      update() {
        const c = state.case, u = Math.min(1, time.t / 9);
        if (c === 'neuron') {
          const { w1, w2, b } = state, f = (x, y) => sigmoid(w1 * x + w2 * y + b);
          surf.set(f, { zScale: 2, map: 'viridis', norm: (z) => z });
          // the decision line σ = ½ ⇔ w·x + b = 0, drawn at the surface's mid height and on the floor
          const seg = [], fl = [], n2 = Math.hypot(w1, w2) || 1e-9, px = -b * w1 / n2 ** 2, py = -b * w2 / n2 ** 2, dx = -w2 / n2, dy = w1 / n2;
          for (let k = -60; k < 60; k++) { const a = [px + dx * k / 10, py + dy * k / 10], q = [px + dx * (k + 1) / 10, py + dy * (k + 1) / 10]; if ([...a, ...q].every((v) => Math.abs(v) <= R)) { seg.push(a[0], a[1], 1, q[0], q[1], 1); fl.push(a[0], a[1], 0.01, q[0], q[1], 0.01); } }
          line.segments([...seg, ...fl]); floor.segments([-R, -R, 0, R, -R, 0, R, -R, 0, R, R, 0, R, R, 0, -R, R, 0, -R, R, 0, -R, -R, 0]);
          const A = [], B = []; for (const [x, y, t] of BLOBS) cross(t ? B : A, x, y, t ? 2 : 0); p0.segments(A); p1.segments(B);
          hud.set('a', `p = σ(w₁x₁ + w₂x₂ + b) = σ(${fmt(w1)}x₁ + ${fmt(w2)}x₂ + ${fmt(b)})`); hud.set('b', `accuracy ${fmt(accuracy(BLOBS, f) * 100)}% · cross-entropy loss ${fmt(logLoss(BLOBS, w1, w2, b))}`);
          hud.set('c', 'the weights tilt the sheet (direction = w, steepness = |w|); the bias slides it; orange = the line where p = ½');
          const zs = lin(-6, 6, 200); plots.aux.draw({ xlim: [-6, 6], series: [{ x: zs, y: zs.map(sigmoid), color: '--c-B', label: 'σ(z) vs z = w·x + b: the squash' }] });
        } else if (c === 'descent') {
          const P = dataOf(), key = `${state.data},${state.lr}`; if (key !== dk) { dk = key; D = descend(P, [-1.5, 2.5, 0], state.lr, 300); land = null; }
          const k = Math.min(D.length - 1, Math.floor(u * (D.length - 1))), [a, cc, bb] = D[k], f = (x, y) => sigmoid(a * x + cc * y + bb);
          sq.range([-R, R], [-R, R]); sq.titles('x₁', 'x₂: the data and the neuron’s current boundary'); region(f); dots(P);
          // loss landscape over (w₁, w₂), the bias held at its final value (computed once per run)
          const n = 60, W = 5;
          if (!land) { const bF = D.at(-1)[2], img = new Float64Array(n * n); let lo = Infinity, hi = -Infinity; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const L = logLoss(P, -W + 2 * W * (i + 0.5) / n, -W + 2 * W * (j + 0.5) / n, bF); img[j * n + i] = L; lo = Math.min(lo, L); hi = Math.max(hi, L); } land = { img, lo, hi }; }
          tr.range([-W, W], [-W, W]); tr.titles('w₁', 'w₂: loss landscape (dark = low), path of the weights'); tr.image('L', land.img, n, n, { map: 'magma', norm: (L) => 1 - Math.sqrt((L - land.lo) / (land.hi - land.lo || 1)) });
          tr.line('path', D.slice(0, k + 1).map((q) => q[0]), D.slice(0, k + 1).map((q) => q[1]), { color: '--c-v', width: 2 }); tr.dots('now', [a], [cc], { color: '--accent', size: 11 });
          const Ls = D.map((q) => logLoss(P, ...q)); br.range([0, D.length - 1], [0, Math.max(...Ls) * 1.1]); br.titles('step', 'loss (cross-entropy)'); br.line('l', Ls.map((_, i) => i).slice(0, k + 1), Ls.slice(0, k + 1), { color: '--c-north' });
          hud.set('a', `step ${k}: w = (${fmt(a)}, ${fmt(cc)}), b = ${fmt(bb)}, loss ${fmt(Ls[k])}`); hud.set('b', `each step: w ← w − η ∇L, with η = ${fmt(state.lr)}`);
          hud.set('c', state.data === 'moons' ? `accuracy stalls at ${fmt(accuracy(P, f) * 100)}%: a single neuron can only draw a straight line` : `accuracy ${fmt(accuracy(P, f) * 100)}%`, state.data === 'moons' ? 'bad' : '');
          plots.aux.draw({ xlim: [0, D.length - 1], cursor: k, series: [{ x: D.map((_, i) => i), y: D.map((q) => Math.hypot(q[0], q[1])), color: '--c-B', label: '|w| (steepness) vs step: keeps growing on separable data' }] });
        } else {
          const P = MOONS, key = `${state.H},${state.act}`; if (key !== tk) { tk = key; T = trainMLP(P, { H: state.H, act: state.act, epochs: 1500 }); }
          const si = Math.min(T.snaps.length - 1, Math.floor(u * (T.snaps.length - 1))), p = T.snaps[si], ep = si * T.every, f = (x, y) => mlpForward(p, x, y).out;
          sq.range([-R, R], [-R, R]); sq.titles('x₁', 'x₂: decision region of the network'); region(f); dots(P);
          // each hidden unit is a line w·x + b = 0 in the input plane (grey): the output combines the bends along them
          const hs = []; p.W1.forEach((w, j) => { const n2 = Math.hypot(...w) || 1e-9, px = -p.b1[j] * w[0] / n2 ** 2, py = -p.b1[j] * w[1] / n2 ** 2, dx = -w[1] / n2, dy = w[0] / n2; const c2 = clip(px, py, dx, dy); if (c2) hs.push(sq.mx(c2[0]), sq.my(c2[1]), 0.004, sq.mx(c2[2]), sq.my(c2[3]), 0.004); });
          hid.segments(hs);
          if (state.H === 2) {
            const Hp = P.map(([x, y, t]) => [...mlpForward(p, x, y).h, t]), m = state.act === 'relu' ? Math.max(1, ...Hp.flatMap((q) => [q[0], q[1]])) : 1.1;
            tr.range([state.act === 'relu' ? -0.1 : -m, m], [state.act === 'relu' ? -0.1 : -m, m]); tr.titles('h₁', 'h₂: the data seen by the output neuron');
            tr.dots('h0', Hp.filter((q) => !q[2]).map((q) => q[0]), Hp.filter((q) => !q[2]).map((q) => q[1]), { color: '--c-B', size: 5 }); tr.dots('h1', Hp.filter((q) => q[2]).map((q) => q[0]), Hp.filter((q) => q[2]).map((q) => q[1]), { color: '--c-E', size: 5 });
            const xs = lin(-m, m, 2); tr.line('sep', xs, xs.map((x) => (p.W2[1] ? -(p.W2[0] * x + p.b2) / p.W2[1] : NaN)), { color: '--c-I', width: 2 });
          } else { tr.dots('h0', [], [], {}); tr.dots('h1', [], [], {}); tr.hide('sep'); tr.range([0, T.losses.length - 1], [0, 1.05]); tr.titles('epoch', 'accuracy: fraction classified right'); }
          if (state.H !== 2) { const accs = T.snaps.map((q) => accuracy(P, (x, y) => mlpForward(q, x, y).out)); tr.line('acc', T.snaps.map((_, i) => i * T.every).slice(0, si + 1), accs.slice(0, si + 1), { color: '--c-v' }); } else tr.hide('acc');
          br.range([0, T.losses.length - 1], [0, Math.max(...T.losses) * 1.05]); br.titles('epoch', 'loss (cross-entropy)'); br.line('l', T.losses.map((_, i) => i).slice(0, ep + 1), T.losses.slice(0, ep + 1), { color: '--c-north' });
          hud.set('a', `epoch ${ep}: accuracy ${fmt(accuracy(P, f) * 100)}%, loss ${fmt(T.losses[ep])}`, accuracy(P, f) > 0.97 ? 'good' : '');
          hud.set('b', `${state.H} hidden ${state.act} units: each draws a line (grey) and bends the plane along it`);
          hud.set('c', state.H === 2 ? 'right: the points in the hidden space — bent until one straight line separates them' : 'the output neuron draws one line in the bent space: a curve back here');
          plots.aux.draw({ xlim: [0, T.losses.length - 1], cursor: ep, series: [{ x: T.losses.map((_, i) => i), y: T.losses.map((L) => Math.log10(L)), color: '--c-north', label: 'log₁₀ loss vs epoch' }] });
        }
      },
      theme() { charts.forEach((k) => k.theme()); all3.forEach((o) => o.theme()); hid.theme(); },
    };
  },
};
