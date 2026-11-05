// Random variables you can see: any normal bell rescaled to the standard one (z-scores, percentiles,
// 68–95–99.7), and two jointly normal variables: the cloud, its two shadows (marginals), a vertical
// slice (the conditional distribution) and the spread of their sum.
import { createChart } from '../../lib/viz/chart.js';
import { normPdf, lin, fmt } from '../core/model.js';
import { bars, hist, edges } from '../core/draw.js';
import { zScore, within, normCdf, normQ, cloud, conditional, sumSd, ellipse } from './model.js';

const TOP = [-4.3, 0.55, 8.85, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0];
const SQ = [-4.2, -2.35, 3.4, 3.4], MT = [-4.2, 1.2, 3.4, 0.8], MR = [-0.65, -2.35, 0.8, 3.4], TR = [1.0, 0.45, 3.5, 1.8], BR = [1.0, -2.35, 3.5, 1.8];
const pct = (p) => `${fmt(100 * p, 3)} %`;
// horizontal histogram as a step outline: counts along x, bins along y
const hbars = (ch, key, e, h, color) => { const x = [0], y = [e[0]]; h.forEach((v, i) => { x.push(v, v); y.push(e[i], e[i + 1]); }); x.push(0); y.push(e.at(-1)); ch.line(key, x, y, { color, width: 1.8 }); };

export default {
  id: 'variables', title: 'Random variables', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { mu: 70, sg: 8, x: 82, two: false, mu2: 60, sg2: 5, x2: 75, rho: 0.7, sy: 1.5, x0: 1 },
  cases: [
    { id: 'normal', label: 'The normal curve', set: {}, examples: [
      { id: 'compare', label: 'Two exams: who did better?', controls: ['x', 'x2'], set: { two: true, mu: 70, sg: 8, x: 82, mu2: 60, sg2: 5, x2: 75 } },
      { id: 'iq', label: 'IQ 130 (μ 100, σ 15)', controls: ['x'], set: { two: false, mu: 100, sg: 15, x: 130 } },
      { id: 'one', label: 'One σ above: the 84th percentile', controls: ['sg'], set: { two: false, mu: 70, sg: 8, x: 78 } },
    ] },
    { id: 'joint', label: 'Two variables', set: {}, examples: [
      { id: 'indep', label: 'Independent: the slice looks like the whole', controls: ['x0'], set: { rho: 0, sy: 1.5, x0: 1.5 } },
      { id: 'strong', label: 'ρ = 0.95: X almost tells you Y', controls: ['x0'], set: { rho: 0.95, sy: 1.5, x0: 1 } },
      { id: 'hedge', label: 'ρ = −0.8: the sum barely moves', controls: ['rho'], set: { rho: -0.8, sy: 1, x0: 1 } },
    ] },
  ],
  controls: [
    { title: 'Exam A', show: (s) => s.case === 'normal', items: [
      { id: 'mu', label: 'Class mean μ', unit: '', min: 0, max: 150, step: 1 }, { id: 'sg', label: 'Standard deviation σ', unit: '', min: 1, max: 30, step: 0.5 },
      { id: 'x', label: 'Your score x', unit: '', min: 0, max: 200, step: 1 },
    ] },
    { title: 'Exam B', show: (s) => s.case === 'normal', items: [
      { id: 'two', label: 'Compare with a second exam', type: 'check', color: '--c-E' },
      { id: 'mu2', label: 'Class mean μ', unit: '', min: 0, max: 150, step: 1, show: (s) => s.two }, { id: 'sg2', label: 'Standard deviation σ', unit: '', min: 1, max: 30, step: 0.5, show: (s) => s.two },
      { id: 'x2', label: 'Your score x', unit: '', min: 0, max: 200, step: 1, show: (s) => s.two },
    ] },
    { title: 'Pairs (X, Y), σx = 1', show: (s) => s.case === 'joint', items: [
      { id: 'rho', label: 'Correlation ρ', unit: '', min: -0.99, max: 0.99, step: 0.01 }, { id: 'sy', label: 'Spread of Y, σy', unit: '', min: 0.3, max: 2, step: 0.05 },
      { id: 'x0', label: 'Slice at X =', unit: '', min: -2.5, max: 2.5, step: 0.05 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT });
    const sq = createChart(ctx, { box: SQ }), mt = createChart(ctx, { box: MT, xTicks: false, yTicks: false, grid: false }), mr = createChart(ctx, { box: MR, xTicks: false, yTicks: false, grid: false });
    const tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), N = [top, bot], J = [sq, mt, mr, tr, br];
    const pool = Array.from({ length: 12 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    let C = { key: '' };

    function normal() {
      const ex = [{ mu: state.mu, sg: state.sg, x: state.x, c: '--c-I', n: 'A' }]; if (state.two) ex.push({ mu: state.mu2, sg: state.sg2, x: state.x2, c: '--c-E', n: 'B' });
      const lo = Math.min(...ex.map((e) => Math.min(e.mu - 4 * e.sg, e.x))), hi = Math.max(...ex.map((e) => Math.max(e.mu + 4 * e.sg, e.x))), xs = lin(lo, hi, 400);
      const peak = Math.max(...ex.map((e) => normPdf(e.mu, e.mu, e.sg)));
      top.range([lo, hi], [0, peak * 1.25]); top.titles('score', `density: ${state.two ? 'two exams in their own units; shaded = share of the class below you' : 'the class in score units; shaded = share of the class below you'}`);
      ex.forEach((e, k) => {
        const ys = xs.map((v) => normPdf(v, e.mu, e.sg)), sx = lin(lo, Math.min(e.x, hi), 140).filter((v) => v <= e.x);
        top.stems(`s${k}`, sx, sx.map((v) => normPdf(v, e.mu, e.sg)), { color: e.c, width: 1.2 }); top.line(`p${k}`, xs, ys, { color: e.c, width: 2.4 });
        top.line(`x${k}`, [e.x, e.x], [0, peak * 1.12], { color: e.c, width: 2.6 }); put(`${e.n}: x = ${fmt(e.x)}`, top.mx(e.x), top.my(peak * 1.18));
        for (const s of [-2, -1, 1, 2]) top.line(`g${k}${s}`, [e.mu + s * e.sg, e.mu + s * e.sg], [0, normPdf(e.mu + s * e.sg, e.mu, e.sg)], { color: '--ink-dim', width: 1.2, dashed: true });
      });
      // the standard bell with the classic bands
      const z = lin(-4, 4, 401), band = (a, b) => z.filter((v, i) => i % 2 === 0 && Math.abs(v) >= a && Math.abs(v) <= b);
      bot.range([-4, 4], [0, 0.5]); bot.titles('z = (x − μ) / σ', 'density: every normal becomes this one after subtracting μ and dividing by σ');
      [[0, 1, '--c-v'], [1, 2, '--c-B'], [2, 3, '--c-ref']].forEach(([a, b, c], i) => { const s = band(a, b); bot.stems(`b${i}`, s, s.map((v) => normPdf(v)), { color: c, width: 1.6 }); });
      bot.line('p', z, z.map((v) => normPdf(v)), { color: '--ink', width: 2 });
      const half = (a, b) => pct(normCdf(b) - normCdf(a)); put(half(0, 1), bot.mx(-0.5), bot.my(0.17)); put(half(0, 1), bot.mx(0.5), bot.my(0.17));
      put(half(1, 2), bot.mx(-1.5), bot.my(0.06)); put(half(1, 2), bot.mx(1.5), bot.my(0.06)); put(half(2, 3), bot.mx(-2.5), bot.my(0.035)); put(half(2, 3), bot.mx(2.5), bot.my(0.035));
      const zs = ex.map((e) => zScore(e.x, e.mu, e.sg));
      zs.forEach((v, k) => { bot.line(`z${k}`, [v, v], [0, 0.44], { color: ex[k].c, width: 2.6 }); put(`${ex[k].n}: z = ${fmt(v)}`, bot.mx(Math.max(-3.6, Math.min(3.6, v))), bot.my(0.475)); });
      const P = zs.map(normCdf), q = state.mu + normQ(0.9) * state.sg;
      hud.set('a', `z = (${fmt(state.x)} − ${fmt(state.mu)}) / ${fmt(state.sg)} = ${fmt(zs[0])}: ${fmt(Math.abs(zs[0]))} standard deviations ${zs[0] >= 0 ? 'above' : 'below'} the mean`);
      hud.set('b', `P(X ≤ ${fmt(state.x)}) = Φ(${fmt(zs[0])}) = ${pct(P[0])}: you beat ${pct(P[0])} of the class`);
      if (state.two) hud.set('c', `B: z = ${fmt(zs[1])}, percentile ${pct(P[1])}: ${zs[1] > zs[0] ? 'B is the better result, though its score is lower' : 'A is the better result'}`, 'good');
      else hud.set('c', `68–95–99.7: ${pct(within(1))} within ±1σ, ${pct(within(2))} within ±2σ, ${pct(within(3))} within ±3σ; the top 10 % starts at μ + 1.28σ = ${fmt(q)}`);
      plots.aux.draw({ xlim: [-4, 4], cursor: zs[0], series: [{ x: z, y: z.map(normCdf), color: '--c-I', label: 'Φ(z) = share below z (the percentile)' }] });
    }

    function joint() {
      const { rho, sy, x0 } = state, key = `${rho},${sy}`; if (C.key !== key) C = { key, ...cloud(1500, rho, sy) };
      const R = 3.5, RY = 3.5 * sy, inS = C.x.map((v) => Math.abs(v - x0) < 0.2), sx = C.x.filter((_, i) => inS[i]), syv = C.y.filter((_, i) => inS[i]);
      sq.range([-R, R], [-RY, RY]); sq.titles('X', 'Y');
      sq.dots('all', C.x.filter((_, i) => !inS[i]), C.y.filter((_, i) => !inS[i]), { color: '--c-B', size: 4 }); sq.dots('sl', sx, syv, { color: '--c-I', size: 5 });
      for (const k of [1, 2]) { const e = ellipse(k, rho, sy); sq.line(`e${k}`, e.x, e.y, { color: '--c-v', width: 1.4, dashed: true }); }
      sq.line('reg', [-R, R], [-R * rho * sy, R * rho * sy], { color: '--c-north', width: 2 });
      for (const s of [-0.2, 0.2]) sq.line(`cut${s}`, [x0 + s, x0 + s], [-RY, RY], { color: '--c-I', width: 1.2, dashed: true });
      // the two shadows
      const nb = 28, ex = edges(-R, R, nb), hx = hist(C.x, -R, R, nb).map((c) => c / (C.x.length * 2 * R / nb)), ey = edges(-RY, RY, nb), hy = hist(C.y, -RY, RY, nb).map((c) => c / (C.y.length * 2 * RY / nb));
      mt.range([-R, R], [0, 0.5]); mt.titles('', ': X alone (its marginal)'); bars(mt, 'h', ex, hx, { color: '--c-B', fill: 3 }); const gx = lin(-R, R, 160); mt.line('p', gx, gx.map((v) => normPdf(v)), { color: '--ink', width: 1.6 });
      mr.range([0, 0.5 / sy], [-RY, RY]); mr.titles('', ': Y alone'); hbars(mr, 'h', ey, hy, '--c-B'); const gy = lin(-RY, RY, 160); mr.line('p', gy.map((v) => normPdf(v, 0, sy)), gy, { color: '--ink', width: 1.6 });
      // the slice: Y given X ≈ x0
      const K = conditional(x0, rho, sy), nbs = 18, es = edges(-RY, RY, nbs), hs = hist(syv, -RY, RY, nbs).map((c) => c / Math.max(1, syv.length * 2 * RY / nbs)), pk = normPdf(K.m, K.m, K.s);
      tr.range([-RY, RY], [0, Math.max(pk, ...hs) * 1.15]); tr.titles('Y', `density: Y given X ≈ ${fmt(x0)} (orange) against Y alone (dashed)`);
      bars(tr, 'h', es, hs, { color: '--c-I', fill: 4 }); tr.line('c', gy, gy.map((v) => normPdf(v, K.m, K.s)), { color: '--c-I', width: 2.2 }); tr.line('m', gy, gy.map((v) => normPdf(v, 0, sy)), { color: '--c-B', width: 1.6, dashed: true });
      // the sum
      const S = C.x.map((v, i) => v + C.y[i]), s = sumSd(rho, sy), s0 = Math.sqrt(1 + sy * sy), RS = 3.5 * (1 + sy), esum = edges(-RS, RS, 40), hsum = hist(S, -RS, RS, 40).map((c) => c / (S.length * 2 * RS / 40)), g = lin(-RS, RS, 200);
      br.range([-RS, RS], [0, normPdf(0, 0, s) * 1.15]); br.titles('X + Y', 'density: the sum (green) against independent X and Y (dashed)');
      bars(br, 'h', esum, hsum, { color: '--c-v', fill: 3 }); br.line('p', g, g.map((v) => normPdf(v, 0, s)), { color: '--c-v', width: 2.2 }); br.line('i', g, g.map((v) => normPdf(v, 0, s0)), { color: '--ink-dim', width: 1.4, dashed: true });
      const rs = lin(-0.99, 0.99, 100);
      plots.aux.draw({ xlim: [-1, 1], cursor: rho, series: [{ x: rs, y: rs.map((r) => sumSd(r, sy)), color: '--c-v', label: 'sd of X + Y against the correlation ρ' }] });
      hud.set('a', `ρ = ${fmt(rho)}: covariance ρ·σx·σy = ${fmt(rho * sy)}; ellipses hold 39 % and 86 % of pairs; red line = mean Y for each X`);
      hud.set('b', `slice at X = ${fmt(x0)} (${sx.length} pairs): Y has mean ${fmt(K.m)} and sd ${fmt(K.s)}; on its own, mean 0 and sd ${fmt(sy)}`, Math.abs(rho) > 0.5 ? 'good' : '');
      hud.set('c', `Var(X + Y) = 1 + ${fmt(sy * sy)} + 2·(${fmt(rho * sy)}) = ${fmt(s * s)}: sd ${fmt(s)} against ${fmt(s0)} if independent`, rho < 0 ? 'good' : '');
    }

    return {
      changed() { const n = state.case === 'normal'; N.forEach((k) => k.show(n)); J.forEach((k) => k.show(!n)); ctx.setClock(0); },
      update() {
        [...N, ...J].forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        (state.case === 'normal' ? normal : joint)();
      },
      theme() { [...N, ...J].forEach((k) => k.theme()); },
    };
  },
};
