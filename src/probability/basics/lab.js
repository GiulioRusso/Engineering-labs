// Probability from the start: events as sets of outcomes (two dice), counting, conditional probability as
// areas of a square, the law of large numbers, and expected value of a game.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { OUTCOMES, EVENTS, prob, both, choose, birthday, conditional, frequencies, GAMES, moments, plays } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const EOPT = Object.entries(EVENTS).map(([k, v]) => [k, v.label]), GOPT = Object.entries(GAMES).map(([k, v]) => [k, v.label]);
const frac = (p) => `${Math.round(p * 36)}/36`;

export default {
  id: 'basics', title: 'Probability basics', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10, loop: false,
  defaults: { eA: 'sum', kA: 7, eB: 'doubles', kB: 8, n: 6, k: 2, g: 23, pA: 0.3, pBA: 0.8, pBnA: 0.1, p: 0.5, game: 'die' },
  cases: [
    { id: 'space', label: 'Outcomes and events', set: {}, examples: [
      { id: 'seven', label: 'Sum 7: the most likely sum', controls: ['kA'], set: { eA: 'sum', kA: 7, eB: 'six' } },
      { id: 'six', label: 'At least one 6: count the cells', controls: ['eA'], set: { eA: 'six', eB: 'doubles' } },
      { id: 'disjoint', label: 'Disjoint events', controls: ['kA'], set: { eA: 'sum', kA: 7, eB: 'doubles' } },
    ] },
    { id: 'counting', label: 'Counting', set: {}, examples: [
      { id: 'pascal', label: 'C(10, 5) = 252', controls: ['n', 'k'], set: { n: 10, k: 5 } },
      { id: 'bday', label: '23 people: better than even odds', controls: ['g'], set: { g: 23 } },
    ] },
    { id: 'conditional', label: 'Conditional probability', set: {}, examples: [
      { id: 'indep', label: 'Independent: P(B|A) = P(B|not A)', controls: ['pBA', 'pBnA'], set: { pBA: 0.4, pBnA: 0.4 } },
      { id: 'rare', label: 'Rare A, reliable B', controls: ['pA'], set: { pA: 0.02, pBA: 0.95, pBnA: 0.05 } },
    ] },
    { id: 'lln', label: 'Law of large numbers', set: {}, examples: [
      { id: 'rare', label: 'p = 0.05: slower to settle', controls: ['p'], set: { p: 0.05 } },
    ] },
    { id: 'expect', label: 'Expected value', set: {}, examples: [
      { id: 'roulette', label: 'Roulette: the house edge', controls: ['game'], set: { game: 'roulette' } },
      { id: 'lottery', label: 'Lottery: rare big prizes', controls: ['game'], set: { game: 'lottery' } },
    ] },
  ],
  controls: [
    { title: 'Events', show: (s) => s.case === 'space', items: [
      { id: 'eA', label: 'Event A (blue)', type: 'select', options: EOPT }, { id: 'kA', label: 'k for A', unit: '', min: 2, max: 12, step: 1, show: (s) => s.eA.startsWith('sum') },
      { id: 'eB', label: 'Event B (orange)', type: 'select', options: EOPT }, { id: 'kB', label: 'k for B', unit: '', min: 2, max: 12, step: 1, show: (s) => s.eB.startsWith('sum') },
    ] },
    { title: 'Counting', show: (s) => s.case === 'counting', items: [{ id: 'n', label: 'n (objects)', unit: '', min: 0, max: 12, step: 1 }, { id: 'k', label: 'k (chosen)', unit: '', min: 0, max: 12, step: 1 }, { id: 'g', label: 'People in the room', unit: '', min: 2, max: 70, step: 1 }] },
    { title: 'Probabilities', show: (s) => s.case === 'conditional', items: [{ id: 'pA', label: 'P(A)', unit: '', min: 0.01, max: 0.99, step: 0.01 }, { id: 'pBA', label: 'P(B | A)', unit: '', min: 0, max: 1, step: 0.01 }, { id: 'pBnA', label: 'P(B | not A)', unit: '', min: 0, max: 1, step: 0.01 }] },
    { title: 'Coin', show: (s) => s.case === 'lln', items: [{ id: 'p', label: 'P(success)', unit: '', min: 0.01, max: 0.99, step: 0.01 }] },
    { title: 'Game', show: (s) => s.case === 'expect', items: [{ id: 'game', label: 'Game', type: 'select', options: GOPT }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), wide = createChart(ctx, { box: [-4.4, -2.35, 8.8, 4.6] }), charts = [sq, tr, br, wide];
    const lines = createCurve(stage, { max: 3000, width: 1.4, color: '--line' }), hot = createCurve(stage, { max: 600, width: 3, color: '--accent' });
    const pool = Array.from({ length: 100 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    let F = null, fk = '', G = null, gk = '';
    return {
      changed() {
        const c = state.case; charts.forEach((k) => k.show(false));
        if (c === 'lln') wide.show(true); else { sq.show(c !== 'counting'); tr.show(c !== 'conditional'); br.show(c !== 'expect'); }
        ctx.setClock(c === 'lln' || c === 'expect' ? 10 : 0);
      },
      update() {
        const c = state.case, u = Math.min(1, time.t / 9.5); nl = 0; pool.forEach((l) => { l.visible = false; }); let L = [], H = [];
        if (c === 'space') {
          const A = OUTCOMES.map((o) => EVENTS[state.eA].f(o, state.kA)), B = OUTCOMES.map((o) => EVENTS[state.eB].f(o, state.kB));
          sq.range([0.5, 6.5], [0.5, 6.5]); sq.titles('first die', 'second die: the 36 equally likely outcomes');
          const pick = (f) => OUTCOMES.filter((_, i) => f(i)); const xs = (P) => P.map((o) => o[0]), ys = (P) => P.map((o) => o[1]);
          const none = pick((i) => !A[i] && !B[i]), a = pick((i) => A[i] && !B[i]), b = pick((i) => B[i] && !A[i]), ab = pick((i) => A[i] && B[i]);
          sq.dots('n', xs(none), ys(none), { color: '--c-ref', size: 26 }); sq.dots('a', xs(a), ys(a), { color: '--c-B', size: 30 }); sq.dots('b', xs(b), ys(b), { color: '--c-I', size: 30 }); sq.dots('ab', xs(ab), ys(ab), { color: '--c-v', size: 34 });
          const pA = prob(state.eA, state.kA), pB = prob(state.eB, state.kB), pAB = both(state.eA, state.kA, state.eB, state.kB);
          const ss = lin(2, 12, 11); tr.range([1.5, 12.5], [0, 0.2]); tr.titles('sum of the two dice', 'P(sum)'); tr.stems('s', ss, ss.map((s) => prob('sum', s)), { color: '--c-B', width: 8 });
          br.range([0.4, 4.6], [0, 1]); br.titles('A · B · A and B · A or B', 'probability'); br.stems('p', [1, 2, 3, 4], [pA, pB, pAB, pA + pB - pAB], { color: '--c-E', width: 16 });
          hud.set('a', `P(A) = ${frac(pA)} = ${fmt(pA)} · P(B) = ${frac(pB)} = ${fmt(pB)}`); hud.set('b', `P(A and B) = ${frac(pAB)} (green) · P(A or B) = P(A) + P(B) − P(A and B) = ${frac(pA + pB - pAB)}`);
          hud.set('c', pAB === 0 ? 'no outcome in both: A and B are disjoint (mutually exclusive)' : 'probability = favourable outcomes ÷ possible outcomes, when all outcomes are equally likely');
          plots.aux.draw({ xlim: [2, 12], series: [{ x: ss, y: ss.map((s) => prob('sumge', s)), color: '--c-B', label: 'P(sum ≥ k) vs k' }] });
        } else if (c === 'counting') {
          const n = state.n, k = Math.min(state.k, n), cs = 0.32; text('Pascal’s triangle: each number = the two above it added', -2.3, 2.4);
          for (let r = 0; r <= n; r++) for (let j = 0; j <= r; j++) { const x = -2.3 + (j - r / 2) * cs * 1.15, y = 1.9 - r * cs; text(String(choose(r, j)), x, y); if (r === n && j === k) H.push(x - 0.17, y - 0.12, 0.01, x + 0.17, y - 0.12, 0.01, x + 0.17, y + 0.12, 0.01, x + 0.17, y + 0.12, 0.01, x - 0.17, y + 0.12, 0.01, x - 0.17, y + 0.12, 0.01, x - 0.17, y - 0.12, 0.01, x - 0.17, y - 0.12, 0.01, x + 0.17, y - 0.12, 0.01); }
          const ks = lin(0, n, n + 1); tr.range([-0.5, n + 0.5], [0, Math.max(1, choose(n, Math.floor(n / 2))) * 1.1]); tr.titles('k', `C(${n}, k): ways to choose k of ${n}`); tr.stems('c', ks, ks.map((j) => choose(n, j)), { color: '--c-B', width: 8 }); tr.dots('q', [k], [choose(n, k)], { color: '--accent', size: 12 });
          const gs = lin(2, 70, 69); br.range([2, 70], [0, 1]); br.titles('people in the room', 'P(two share a birthday)'); br.line('b', gs, gs.map(birthday), { color: '--c-I' }); br.line('h', [2, 70], [0.5, 0.5], { color: '--ink-dim', dashed: true, width: 1 }); br.dots('q', [state.g], [birthday(state.g)], { color: '--accent', size: 12 });
          hud.set('a', `C(${n}, ${k}) = ${n}! / (${k}! · ${n - k}!) = ${choose(n, k)} ways to choose ${k} of ${n} (order does not matter)`);
          hud.set('b', `${state.g} people: P(at least two share a birthday) = 1 − (365·364·…)/365^${state.g} = ${fmt(birthday(state.g))}`, birthday(state.g) > 0.5 ? 'good' : '');
          hud.set('c', 'it is easier to count the complement: P(all different) and subtract from 1');
          plots.aux.draw({ xlim: [0, 12], series: [{ x: lin(0, 12, 13), y: lin(0, 12, 13).map((m) => Math.log10(choose(12, m))), color: '--c-B', label: 'log₁₀ C(12, k) vs k' }] });
        } else if (c === 'conditional') {
          const { pA, pBA, pBnA } = state, C = conditional(pA, pBA, pBnA);
          // the unit square: columns A / not A (width = probability), each split by B within it
          sq.range([0, 1], [0, 1]); sq.titles('A (left, width P(A)) · not A (right)', 'P(B | column): B is the lower part of each column');
          const rect = (x0, y0, x1, y1) => L.push(sq.mx(x0), sq.my(y0), 0.01, sq.mx(x1), sq.my(y0), 0.01, sq.mx(x1), sq.my(y0), 0.01, sq.mx(x1), sq.my(y1), 0.01, sq.mx(x1), sq.my(y1), 0.01, sq.mx(x0), sq.my(y1), 0.01, sq.mx(x0), sq.my(y1), 0.01, sq.mx(x0), sq.my(y0), 0.01);
          const n = 60, img = new Float64Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = (i + 0.5) / n, y = (j + 0.5) / n, inA = x < pA, inB = y < (inA ? pBA : pBnA); img[j * n + i] = (inA ? 1 : 0) + (inB ? 2 : 0); }
          sq.image('m', img, n, n, { rgb: (k, out) => { const v = img[k]; const C3 = [[0.18, 0.2, 0.26], [0.2, 0.42, 0.75], [0.8, 0.5, 0.3], [0.3, 0.7, 0.45]][v]; out[0] = C3[0]; out[1] = C3[1]; out[2] = C3[2]; } });
          rect(0, 0, 1, 1); rect(0, 0, pA, pBA); rect(pA, 0, 1, pBnA);
          text(`A and B = ${fmt(pA * pBA)}`, sq.mx(pA / 2), sq.my(pBA / 2)); text(`not A and B = ${fmt((1 - pA) * pBnA)}`, sq.mx((1 + pA) / 2), sq.my(pBnA / 2));
          // tree diagram on the right
          const tx = 1.3, ty = 1.5, nodes = [[tx, ty], [tx + 1.2, ty + 0.35], [tx + 1.2, ty - 0.35], [tx + 2.6, ty + 0.55], [tx + 2.6, ty + 0.15], [tx + 2.6, ty - 0.15], [tx + 2.6, ty - 0.55]];
          [[0, 1, `P(A)=${fmt(pA, 2)}`], [0, 2, `${fmt(1 - pA, 2)}`], [1, 3, `P(B|A)=${fmt(pBA, 2)}`], [1, 4, fmt(1 - pBA, 2)], [2, 5, `P(B|¬A)=${fmt(pBnA, 2)}`], [2, 6, fmt(1 - pBnA, 2)]].forEach(([a, b, t]) => { L.push(nodes[a][0], nodes[a][1], 0.01, nodes[b][0], nodes[b][1], 0.01); text(t, (nodes[a][0] + nodes[b][0]) / 2, (nodes[a][1] + nodes[b][1]) / 2 + 0.12); });
          ['A, B', 'A, not B', 'not A, B', 'not A, not B'].forEach((t, i) => text(t, nodes[3 + i][0] + 0.55, nodes[3 + i][1]));
          br.range([0.4, 3.6], [0, 1]); br.titles('P(B) · P(A | B) · P(A)', 'probability'); br.stems('p', [1, 2, 3], [C.pB, C.pAB, pA], { color: '--c-E', width: 16 });
          hud.set('a', `P(B) = P(A)P(B|A) + P(not A)P(B|not A) = ${fmt(C.pB)} (total probability: add the orange-green areas)`);
          hud.set('b', `P(A | B) = P(A and B)/P(B) = ${fmt(C.pAB)}: of the B region, the share that lies in A (Bayes)`);
          hud.set('c', Math.abs(pBA - pBnA) < 0.005 ? 'P(B | A) = P(B | not A): knowing A tells nothing about B — independent' : 'P(B | A) ≠ P(B | not A): A and B are dependent', Math.abs(pBA - pBnA) < 0.005 ? 'good' : '');
          plots.aux.draw({ xlim: [0, 1], cursor: pA, series: [{ x: lin(0.001, 1, 100), y: lin(0.001, 1, 100).map((a) => conditional(a, pBA, pBnA).pAB), color: '--c-B', label: 'P(A | B) vs P(A)' }] });
        } else if (c === 'lln') {
          const N = 3000, key = `${state.p}`; if (key !== fk) { fk = key; F = frequencies(state.p, N, 5); }
          const k = Math.max(2, Math.floor(10 ** (u * Math.log10(N)))), ln = lin(0, Math.log10(N), 200);
          wide.range([0, Math.log10(N)], [0, 1]); wide.titles('log₁₀ number of trials n', 'relative frequency of successes: 5 runs; band = p ± 2√(p(1−p)/n)');
          F.forEach((f, r) => wide.line(`r${r}`, f.slice(0, k).map((_, i) => Math.log10(i + 1)), f.slice(0, k), { color: ['--c-B', '--c-I', '--c-v', '--c-E', '--c-F'][r], width: 1.6 }));
          const band = (sg) => ln.map((l) => state.p + sg * 2 * Math.sqrt(state.p * (1 - state.p) / 10 ** l)); wide.line('u', ln, band(1), { color: '--ink-dim', dashed: true, width: 1 }); wide.line('d', ln, band(-1), { color: '--ink-dim', dashed: true, width: 1 }); wide.line('p', [0, Math.log10(N)], [state.p, state.p], { color: '--ink', width: 1 });
          hud.set('a', `after ${k} trials: frequencies ${F.map((f) => fmt(f[k - 1], 2)).join(', ')} — true p = ${state.p}`);
          hud.set('b', 'early on the frequency jumps around; it settles toward p, with typical error √(p(1−p)/n)'); hud.set('c', 'to halve the error you need four times the trials — and the coin has no memory: no “catching up” after a run of losses');
          plots.aux.draw({ xlim: [0, Math.log10(N)], series: [{ x: ln, y: ln.map((l) => Math.log10(Math.sqrt(state.p * (1 - state.p) / 10 ** l))), color: '--c-north', label: 'log₁₀ typical error vs log₁₀ n: slope −½' }] });
        } else {
          const Gm = GAMES[state.game], { mean, sd } = moments(Gm.X), N = 2000; if (gk !== state.game) { gk = state.game; G = plays(Gm.X, N); }
          const k = Math.max(1, Math.floor(u * N)), vs = Gm.X.map((x) => x[0]), lo = Math.min(...vs), hi = Math.max(...vs), pad = (hi - lo) * 0.1 || 1;
          sq.range([lo - pad, hi + pad], [0, 1.05]); sq.titles('value of the outcome', 'probability: the balance point is the mean');
          sq.stems('x', vs, Gm.X.map((x) => x[1]), { color: '--c-B', width: 8 }); sq.line('mean', [mean, mean], [0, 1.05], { color: '--c-I', width: 2.4 }); sq.line('sd', [mean - sd, mean + sd], [0.95, 0.95], { color: '--c-v', width: 4 });
          const tri = sq.mx(mean), ty = sq.my(0); L.push(tri - 0.15, ty - 0.25, 0.01, tri + 0.15, ty - 0.25, 0.01, tri + 0.15, ty - 0.25, 0.01, tri, ty, 0.01, tri, ty, 0.01, tri - 0.15, ty - 0.25, 0.01);
          const ns = lin(1, k, Math.min(k, 400)).map(Math.round); tr.range([1, N], [mean - 3 * sd, mean + 3 * sd]); tr.titles('plays', 'running average winnings per play'); tr.line('avg', ns, ns.map((i) => G[i - 1]), { color: '--c-B' }); tr.line('E', [1, N], [mean, mean], { color: '--c-I', dashed: true, width: 1.4 });
          hud.set('a', `E[X] = Σ x·P(x) = ${fmt(mean)} per play · standard deviation ${fmt(sd)}`, mean < 0 ? 'bad' : 'good');
          hud.set('b', `after ${k} plays the average is ${fmt(G[k - 1])}: it drifts to E[X], whatever happened in the first rounds`);
          hud.set('c', state.game === 'roulette' ? 'the 0 makes red lose 19 of 37 spins: −2.7 cents per euro, forever' : state.game === 'lottery' ? 'big prizes are so rare that the mean is still negative; the spread (σ) is huge' : state.game === 'insurance' ? 'the insurer wins on average; you pay a little to remove a large risk' : 'mean 3.5, never an actual outcome');
          plots.aux.draw({ xlim: [1, N], cursor: k, series: [{ x: ns, y: ns.map((i) => Math.abs(G[i - 1] - mean)), color: '--c-north', label: '|average − E[X]| vs plays' }] });
        }
        lines.segments(L); hot.segments(H);
      },
      theme() { charts.forEach((k) => k.theme()); lines.theme(); hot.theme(); },
    };
  },
};
