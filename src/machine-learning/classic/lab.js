// Classic machine learning on the plane: k-NN votes and decision-tree boxes (with their accuracy on new data),
// k-means moving its centres iteration by iteration, PCA sweeping a direction until the variance peaks.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { blobs, moons } from '../neuron/model.js';
import { clusters, neighbours, knn, accuracy, growTree, predict, leaves, splits, kmeans, cloud, pca, along } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const R = 3, DEG = Math.PI / 180;
const DATA = { blobs: [blobs(), blobs(80, { seed: 13 })], moons: [moons(200, { noise: 0.45 }), moons(400, { noise: 0.45, seed: 11 })] };
const COL = ['--c-B', '--c-E', '--c-v', '--c-north', '--c-I', '--accent', '--c-ref', '--ink-dim'];
const KS = lin(1, 51, 26), DEPTHS = lin(1, 10, 10);

export default {
  id: 'classic', title: 'Classic machine learning', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10,
  defaults: { k: 5, data: 'moons', qx: 0.4, qy: 0.2, depth: 3, K: 4, set: 'four', start: 1, ang: 30, ratio: 0.3 },
  cases: [
    { id: 'knn', label: 'k-nearest neighbours', set: {}, examples: [
      { id: 'one', label: 'k = 1: every point is its own island', controls: ['k'], set: { k: 1 } },
      { id: 'many', label: 'k = 41: a smooth, simple border', controls: ['k'], set: { k: 41 } },
      { id: 'edge', label: 'A query on the border: a close vote', controls: ['qx', 'qy'], set: { qx: 1.0, qy: -0.35 } },
    ] },
    { id: 'tree', label: 'Decision trees', set: {}, examples: [
      { id: 'stump', label: 'Depth 1: a single question', controls: ['depth'], set: { depth: 1 } },
      { id: 'deep', label: 'Depth 10: memorizes the noise', controls: ['depth'], set: { depth: 10 } },
      { id: 'blobs', label: 'Blobs: diagonal border, staircase boxes', controls: ['data'], set: { data: 'blobs', depth: 4 } },
    ] },
    { id: 'kmeans', label: 'k-means clustering', set: {}, examples: [
      { id: 'badstart', label: 'Unlucky start: two centres share a cluster', controls: ['start'], set: { start: 3 } },
      { id: 'uneven', label: 'One big, one small cluster', controls: ['set', 'K'], set: { set: 'uneven', K: 2 } },
      { id: 'moons', label: 'Moons: k-means only cuts straight', controls: ['set'], set: { set: 'moons', K: 2 } },
    ] },
    { id: 'pca', label: 'Principal components', set: {}, examples: [
      { id: 'thin', label: 'Almost a line: one number per point is enough', controls: ['ratio'], set: { ratio: 0.08 } },
      { id: 'round', label: 'Round cloud: no preferred direction', controls: ['ratio'], set: { ratio: 1 } },
    ] },
  ],
  controls: [
    { title: 'Neighbours', show: (s) => s.case === 'knn', items: [
      { id: 'k', label: 'Neighbours k', unit: '', min: 1, max: 51, step: 2 }, { id: 'qx', label: 'Query point x₁', unit: '', min: -3, max: 3, step: 0.05 }, { id: 'qy', label: 'Query point x₂', unit: '', min: -3, max: 3, step: 0.05 },
    ] },
    { title: 'Tree', show: (s) => s.case === 'tree', items: [{ id: 'depth', label: 'Maximum depth', unit: '', min: 1, max: 10, step: 1 }] },
    { title: 'Data', show: (s) => s.case === 'knn' || s.case === 'tree', items: [{ id: 'data', label: 'Data', type: 'segmented', options: [['moons', 'Two moons'], ['blobs', 'Two blobs']] }] },
    { title: 'Clustering', show: (s) => s.case === 'kmeans', items: [
      { id: 'K', label: 'Clusters k', unit: '', min: 1, max: 8, step: 1 }, { id: 'start', label: 'Random start (seed)', unit: '', min: 1, max: 20, step: 1 },
      { id: 'set', label: 'Data', type: 'segmented', options: [['four', 'Four groups'], ['uneven', 'Uneven'], ['moons', 'Moons']] },
    ] },
    { title: 'Cloud', show: (s) => s.case === 'pca', items: [
      { id: 'ang', label: 'Cloud direction', unit: '°', min: -90, max: 90, step: 1 }, { id: 'ratio', label: 'Width / length', unit: '', min: 0.05, max: 1, step: 0.01 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const thin = createCurve(stage, { max: 3000, width: 1, color: '--ink-dim' }), bold = createCurve(stage, { max: 3000, width: 2.6, color: '--accent' }), edges = createCurve(stage, { max: 600, width: 1.4, color: '--line' }), extra = [thin, bold, edges];
    const pool = Array.from({ length: 40 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    const memo = {}, once = (key, f) => (memo[key] ??= f());
    // shaded decision region of f (p of class 1) over the square
    const field = (f) => { const n = 80, v = new Float64Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) v[j * n + i] = f(-R + 2 * R * (i + 0.5) / n, -R + 2 * R * (j + 0.5) / n); return v; };
    const paint = (v) => sq.image('reg', v, 80, 80, { rgb: (k, out) => { const p = v[k]; out[0] = 0.12 + 0.55 * p; out[1] = 0.16 + 0.35 * p; out[2] = 0.28 + 0.35 * (1 - p); } });
    const two = (P) => { for (const t of [0, 1]) { const Q = P.filter((p) => p[2] === t); sq.dots(`c${t}`, Q.map((p) => p[0]), Q.map((p) => p[1]), { color: COL[t], size: 7 }); } };
    const circle = (out, cx, cy, r) => { for (let i = 0; i < 64; i++) { const a = 2 * Math.PI * i / 64, b = 2 * Math.PI * (i + 1) / 64; out.push(sq.mx(cx + r * Math.cos(a)), sq.my(cy + r * Math.sin(a)), 0.01, sq.mx(cx + r * Math.cos(b)), sq.my(cy + r * Math.sin(b)), 0.01); } };
    return {
      changed() {
        const c = state.case; charts.forEach((k) => { k.show(false); k.show(true); }); if (c === 'tree') br.show(false);
        edges.object.visible = c === 'tree'; ctx.setClock(c === 'kmeans' || c === 'pca' ? 10 : 0);
      },
      update() {
        const c = state.case; nl = 0; pool.forEach((l) => { l.visible = false; }); const T = [], B = [];
        if (c === 'knn') {
          const [P, Q] = DATA[state.data], k = Math.round(state.k), { qx, qy } = state, f = (x, y) => knn(P, x, y, k);
          sq.range([-R, R], [-R, R]); sq.titles('x₁', 'x₂: shading = vote of the k nearest training points'); paint(once(`knn${state.data}${k}`, () => field(f))); two(P);
          const N = neighbours(P, qx, qy, k), p1 = N.filter(({ i }) => P[i][2]).length;
          for (const { i } of N) T.push(sq.mx(qx), sq.my(qy), 0.01, sq.mx(P[i][0]), sq.my(P[i][1]), 0.01); circle(B, qx, qy, N.at(-1).d);
          sq.dots('q', [qx], [qy], { color: '--accent', size: 14 });
          const acc = once(`acc${state.data}`, () => ({ tr: KS.map((kk) => accuracy(P, (x, y) => knn(P, x, y, kk))), te: KS.map((kk) => accuracy(Q, (x, y) => knn(P, x, y, kk))) }));
          tr.range([1, 51], [0.7, 1.01]); tr.titles('k (neighbours)', 'accuracy: training (blue), new data (orange)'); tr.line('tr', KS, acc.tr, { color: '--c-B' }); tr.line('te', KS, acc.te, { color: '--c-I' });
          const ki = KS.indexOf(k); tr.dots('q', [k], [acc.te[ki]], { color: '--accent', size: 11 });
          br.range([0.5, k + 0.5], [0, Math.max(0.5, N.at(-1).d * 1.1)]); br.titles('neighbour, nearest first', 'distance to the query: blue class 0, yellow class 1');
          const rk = N.map((_, j) => j + 1); for (const t of [0, 1]) { const J = rk.filter((_, j) => P[N[j].i][2] === t); br.stems(`v${t}`, J, J.map((j) => N[j - 1].d), { color: COL[t], width: Math.max(2, 40 / k) }); }
          hud.set('a', `query (${fmt(qx)}, ${fmt(qy)}): ${p1} of ${k} neighbours are class 1 → class ${p1 * 2 > k ? 1 : 0}`, '');
          hud.set('b', `accuracy: training ${fmt(acc.tr[ki] * 100)}%, new data ${fmt(acc.te[ki] * 100)}%`, acc.te[ki] > 0.95 ? 'good' : '');
          hud.set('c', k === 1 ? 'k = 1 never errs on the training set: it remembers it — new data tells the truth' : 'no training at all: the data is the model; every prediction searches it');
          const xs = lin(-R, R, 120); plots.aux.draw({ xlim: [-R, R], cursor: qx, series: [{ x: xs, y: xs.map((x) => f(x, qy)), color: '--c-B', label: `p(class 1) vs x₁ along x₂ = ${fmt(qy)}: steps of 1/k` }] });
        } else if (c === 'tree') {
          const [P, Q] = DATA[state.data], depth = Math.round(state.depth), Tr = once(`tree${state.data}${depth}`, () => growTree(P, depth)), f = (x, y) => predict(Tr, x, y);
          sq.range([-R, R], [-R, R]); sq.titles('x₁', 'x₂: every box gets the majority class of its points'); paint(once(`reg${state.data}${depth}`, () => field(f))); two(P);
          for (const [x0, y0, x1, y1] of splits(Tr, [-R, R, -R, R])) T.push(sq.mx(x0), sq.my(y0), 0.01, sq.mx(x1), sq.my(y1), 0.01);
          const acc = once(`tacc${state.data}`, () => DEPTHS.map((d) => { const t = growTree(P, d); return [accuracy(P, (x, y) => predict(t, x, y)), accuracy(Q, (x, y) => predict(t, x, y)), leaves(t)]; }));
          tr.range([1, 10], [0.7, 1.01]); tr.titles('maximum depth', 'accuracy: training (blue), new data (orange)'); tr.line('tr', DEPTHS, acc.map((a) => a[0]), { color: '--c-B' }); tr.line('te', DEPTHS, acc.map((a) => a[1]), { color: '--c-I' }); tr.dots('q', [depth], [acc[depth - 1][1]], { color: '--accent', size: 11 });
          // the tree itself, top levels: questions at the nodes, leaf colour = its class
          const [bx, by, bw, bh] = BR, lev = Math.min(depth, 4), E = [], L0 = [], L1 = [];
          text('the tree: each node asks one question', bx + bw / 2, by + bh + 0.15);
          (function node(t, d, i) {
            const x = bx + bw * (i + 0.5) / 2 ** d, y = by + bh - 0.5 - d * (bh - 0.65) / lev;
            if (t.leaf || d === lev) { (t.p > 0.5 ? L1 : L0).push([x, y]); return; }
            if (d < 2) text(`${t.f ? 'x₂' : 'x₁'} < ${fmt(t.thr, 2)}?`, x, y + 0.12);
            for (const [ch, j] of [[t.left, 2 * i], [t.right, 2 * i + 1]]) { E.push(x, y, 0.01, bx + bw * (j + 0.5) / 2 ** (d + 1), by + bh - 0.5 - (d + 1) * (bh - 0.65) / lev, 0.01); node(ch, d + 1, j); }
          })(Tr, 0, 0);
          edges.segments(E); br.range([bx, bx + bw], [by, by + bh]);
          br.dots('l0', L0.map((p) => p[0]), L0.map((p) => p[1]), { color: COL[0], size: 10 }); br.dots('l1', L1.map((p) => p[0]), L1.map((p) => p[1]), { color: COL[1], size: 10 });
          hud.set('a', `depth ${depth}: ${leaves(Tr)} leaves (boxes) · accuracy training ${fmt(acc[depth - 1][0] * 100)}%, new data ${fmt(acc[depth - 1][1] * 100)}%`);
          hud.set('b', 'each split: the threshold on x₁ or x₂ that leaves the two halves purest (lowest Gini impurity 2p(1 − p))');
          const over = acc[depth - 1][1] < Math.max(...acc.map((a) => a[1])) - 0.01;
          hud.set('c', over ? 'too deep: small boxes around single noisy points — better on training data, worse on new data' : 'only horizontal and vertical cuts: a diagonal border becomes a staircase', over ? 'bad' : '');
          plots.aux.draw({ xlim: [1, 10], cursor: depth, series: [{ x: DEPTHS, y: acc.map((a) => a[2]), color: '--c-v', label: 'leaves (boxes) vs maximum depth' }] });
        } else if (c === 'kmeans') {
          const P = state.set === 'moons' ? DATA.moons[0] : clusters(state.set), K = Math.round(state.K), H = once(`km${state.set}${K}${state.start}`, () => kmeans(P, K, { seed: state.start, iters: 20 })), it = Math.min(H.length - 1, Math.floor(time.t / 0.45)), S = H[it];
          sq.range([-R, R], [-R, R]); sq.titles('x₁', 'x₂: colour = nearest centre; centres move to the mean of their points');
          for (let j = 0; j < 8; j++) { const I = P.filter((_, i) => S.A[i] === j); sq.dots(`k${j}`, I.map((p) => p[0]), I.map((p) => p[1]), { color: COL[j], size: 7 }); }
          for (let j = 0; j < K; j++) for (let t = 0; t < it; t++) T.push(sq.mx(H[t].C[j][0]), sq.my(H[t].C[j][1]), 0.01, sq.mx(H[t + 1].C[j][0]), sq.my(H[t + 1].C[j][1]), 0.01);
          sq.dots('C', S.C.map((q) => q[0]), S.C.map((q) => q[1]), { color: '--ink', size: 16 });
          const its = H.map((_, i) => i), top = H[0].inertia * 1.05;
          tr.range([0, H.length - 1], [0, top]); tr.titles('iteration', 'inertia: Σ squared distance to own centre'); tr.line('in', its.slice(0, it + 1), H.slice(0, it + 1).map((h) => h.inertia), { color: '--c-north' });
          const ks = lin(1, 8, 8), el = once(`elbow${state.set}${state.start}`, () => ks.map((kk) => kmeans(P, kk, { seed: state.start }).at(-1).inertia));
          br.range([1, 8], [0, el[0] * 1.05]); br.titles('number of clusters k', 'final inertia: look for the elbow'); br.line('e', ks, el, { color: '--c-v' }); br.dots('q', [K], [el[K - 1]], { color: '--accent', size: 11 });
          const moved = its.slice(1).map((i) => H[i].A.filter((a, n) => a !== H[i - 1].A[n]).length);
          hud.set('a', `iteration ${it}: inertia ${fmt(S.inertia)}${it > 0 && moved[it - 1] === 0 ? ' — nothing moved: converged' : ''}`, it > 0 && moved[it - 1] === 0 ? 'good' : '');
          hud.set('b', 'repeat: (1) give each point to its nearest centre, (2) move each centre to the mean of its points');
          hud.set('c', state.set === 'four' ? 'the result depends on the start: rerun with other seeds and keep the lowest inertia' : 'k-means assumes round clusters of similar size: borders are straight, halfway between centres', state.set === 'four' ? '' : 'bad');
          plots.aux.draw({ xlim: [1, H.length - 1], cursor: it, series: [{ x: its.slice(1), y: moved, color: '--c-B', label: 'points that changed cluster vs iteration' }] });
        } else {
          const s1 = 1.3, P = once(`cl${state.ang}${state.ratio}`, () => cloud(state.ang * DEG, s1, s1 * state.ratio)), Q = pca(P), th = -Math.PI / 2 + Math.PI * Math.min(1, time.t / 9.5), [mx, my] = Q.mean;
          sq.range([-R, R], [-R, R]); sq.titles('x₁', 'x₂: the cloud, a direction θ sweeping, the projections on it');
          sq.dots('c0', P.map((p) => p[0]), P.map((p) => p[1]), { color: '--c-B', size: 6 });
          const c = Math.cos(th), s = Math.sin(th), pr = P.map(([x, y]) => { const u = (x - mx) * c + (y - my) * s; return [mx + u * c, my + u * s, u]; });
          P.forEach(([x, y], i) => T.push(sq.mx(x), sq.my(y), 0.005, sq.mx(pr[i][0]), sq.my(pr[i][1]), 0.005));
          sq.dots('pr', pr.map((q) => q[0]), pr.map((q) => q[1]), { color: '--c-I', size: 5 });
          B.push(sq.mx(mx - 4 * c), sq.my(my - 4 * s), 0.01, sq.mx(mx + 4 * c), sq.my(my + 4 * s), 0.01);
          sq.line('pc1', [mx, mx + 2 * Math.sqrt(Q.l1) * Q.v1[0]], [my, my + 2 * Math.sqrt(Q.l1) * Q.v1[1]], { color: '--c-v', width: 4 }); sq.line('pc2', [mx, mx + 2 * Math.sqrt(Math.max(0, Q.l2)) * Q.v2[0]], [my, my + 2 * Math.sqrt(Math.max(0, Q.l2)) * Q.v2[1]], { color: '--c-north', width: 4 });
          text('PC1', sq.mx(mx + 2.3 * Math.sqrt(Q.l1) * Q.v1[0]), sq.my(my + 2.3 * Math.sqrt(Q.l1) * Q.v1[1]));
          const ths = lin(-90, 90, 181), A = ths.map((d) => along(P, d * DEG)), now = along(P, th);
          tr.range([-90, 90], [0, (Q.l1 + Q.l2) * 1.05]); tr.titles('direction θ (°)', 'variance: along θ (blue), left over (orange)'); tr.line('v', ths, A.map((a) => a.variance), { color: '--c-B' }); tr.line('r', ths, A.map((a) => a.residual), { color: '--c-I' }); tr.dots('q', [th / DEG], [now.variance], { color: '--accent', size: 11 });
          br.range([0.5, 2.5], [0, 100]); br.titles('principal component', 'share of the total variance (%)'); br.stems('e', [1, 2], [100 * Q.l1 / (Q.l1 + Q.l2), 100 * Q.l2 / (Q.l1 + Q.l2)], { color: '--c-v', width: 22 });
          hud.set('a', `θ = ${fmt(th / DEG, 3)}°: variance along θ ${fmt(now.variance)} + left over ${fmt(now.residual)} = total ${fmt(Q.l1 + Q.l2)}`);
          hud.set('b', `PC1 at ${fmt(Q.angle / DEG, 3)}° keeps ${fmt(100 * Q.l1 / (Q.l1 + Q.l2))}% of the variance: largest spread = smallest error when squashed to 1D`, Q.l1 / (Q.l1 + Q.l2) > 0.9 ? 'good' : '');
          hud.set('c', 'PC1, PC2 = eigenvectors of the covariance matrix; their eigenvalues are the variances along them');
          const us = pr.map((q) => q[2]), bins = lin(-3.5, 3.5, 29), cnt = bins.map((b) => us.filter((u) => Math.abs(u - b) <= 0.125).length);
          plots.aux.draw({ xlim: [-3.5, 3.5], series: [{ x: bins, y: cnt, color: '--c-I', label: 'points vs position along θ: the 1D picture after projecting' }] });
        }
        thin.segments(T); bold.segments(B);
      },
      theme() { charts.forEach((k) => k.theme()); extra.forEach((o) => o.theme()); },
    };
  },
};
