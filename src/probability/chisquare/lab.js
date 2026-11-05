// Chi-square tests: goodness of fit (a die rolled again and again; Mendel's peas) and independence
// in a 2 × 3 table (treatment against outcome).
import { createChart } from '../../lib/viz/chart.js';
import { lin, fmt, fmtP, chi2Pdf, chi2Cdf, chi2Q } from '../core/model.js';
import { rect } from '../core/draw.js';
import { dieProbs, rolls, counts, MENDEL, gof, ROWS, COLS, table, independence, phi2 } from './model.js';

const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], D = 12, NMAX = 2000;

export default {
  id: 'chisquare', title: 'Chi-square tests', size: 4.4, ortho: true, plain: true, cam: 'top', duration: D, loop: false,
  defaults: { data: 'die', p6: 1 / 6, n: 120, a: 0.5, nt: 200 },
  cases: [
    { id: 'gof', label: 'Goodness of fit', set: {}, examples: [
      { id: 'loaded', label: 'Loaded die (six: 1 in 4), 60 rolls', set: { p6: 0.25, n: 60 } },
      { id: 'caught', label: 'Same die, 600 rolls: caught', set: { p6: 0.25, n: 600 } },
      { id: 'mendel', label: 'Mendel’s peas: 9 : 3 : 3 : 1', set: { data: 'mendel' } },
    ] },
    { id: 'independence', label: 'Independence', set: {}, examples: [
      { id: 'none', label: 'No association', set: { a: 0 } },
      { id: 'strong', label: 'Strong association', set: { a: 1 } },
      { id: 'tiny', label: 'Tiny effect, 2000 patients', set: { a: 0.15, nt: 2000 } },
    ] },
  ],
  controls: [
    { title: 'Categories', show: (s) => s.case === 'gof', items: [
      { id: 'data', label: 'Data', type: 'segmented', options: [['die', 'A die'], ['mendel', 'Mendel']] },
      { id: 'p6', label: 'Chance of a six', unit: '', min: 0.05, max: 0.5, step: 0.005, show: (s) => s.data === 'die', hint: 'fair: 0.167' },
      { id: 'n', label: 'Rolls', unit: '', min: 12, max: NMAX, log: true, show: (s) => s.data === 'die' },
    ] },
    { title: 'Trial', show: (s) => s.case === 'independence', items: [
      { id: 'a', label: 'Strength of the effect', unit: '', min: 0, max: 1, step: 0.01 },
      { id: 'nt', label: 'Patients', unit: '', min: 30, max: 3000, log: true },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene, time } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 24 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    const cache = {}; const memo = (k, f) => (cache[k] ??= f());

    function density(df, x2) {
      const hi = Math.max(chi2Q(0.999, df), x2 * 1.1), xs = lin(0.02, hi, 300), ys = xs.map((x) => chi2Pdf(x, df)), top = Math.min(Math.max(...ys.slice(3)) * 1.2, 1.2), c = chi2Q(0.95, df);
      tr.range([0, hi], [0, top]); tr.titles('χ²', `χ² distribution with ${df} degree${df > 1 ? 's' : ''} of freedom if H₀ is true; red = p`);
      tr.line('pdf', xs, ys, { color: '--c-B' }); const tail = xs.filter((x) => x >= x2); tr.stems('tail', tail, tail.map((x) => chi2Pdf(x, df)), { color: '--c-north', width: 1.2 });
      tr.line('obs', [x2, x2], [0, top], { color: '--accent', width: 2 }); tr.line('c', [c, c], [0, top], { color: '--ink-dim', width: 1, dashed: true });
      return c;
    }

    function gofCase() {
      const die = state.data === 'die';
      let obs, p, names, n = 0;
      if (die) { const N = Math.round(state.n), F = memo(`r${state.p6}`, () => rolls(state.p6, NMAX)); n = Math.max(6, Math.min(N, Math.ceil(N * Math.min(1, time.t / (D - 1))))); obs = counts(F, n); p = Array(6).fill(1 / 6); names = ['1', '2', '3', '4', '5', '6']; }
      else { obs = MENDEL.obs; p = MENDEL.p; names = MENDEL.labels; }
      const G = gof(obs, p), k = obs.length, top = Math.max(...obs, ...G.E) * 1.25;
      sq.range([0, k], [0, top]); sq.titles('', `${die ? `${n} rolls` : `${G.n} peas`}: observed counts (blue) against expected under H₀ (dashed)`);
      obs.forEach((o, i) => { rect(sq, `o${i}`, i + 0.2, i + 0.8, 0, o, '--c-B'); sq.line(`e${i}`, [i + 0.1, i + 0.9], [G.E[i], G.E[i]], { color: '--c-I', width: 2.4, dashed: true }); put(names[i], sq.mx(i + 0.5), sq.my(0) - 0.42); put(String(o), sq.mx(i + 0.5), sq.my(o) + 0.15); });
      const c = density(G.df, G.x2), pt = Math.max(...G.parts, 1) * 1.2;
      br.range([0, k], [0, pt]); br.titles('', 'each category’s share of χ²: (O − E)² / E');
      G.parts.forEach((v, i) => rect(br, `c${i}`, i + 0.2, i + 0.8, 0, v, '--c-north'));
      if (die) { const F = memo(`r${state.p6}`, () => rolls(state.p6, NMAX)), N = Math.round(state.n), ns = lin(12, N, 120).map(Math.round); plots.aux.draw({ xlim: [12, N], cursor: n, series: [{ x: ns, y: ns.map((m) => gof(counts(F, m), p).x2), color: '--c-I', label: 'χ² as the rolls come in' }, { x: [12, N], y: [c, c], color: '--ink-dim', label: '5 % critical value' }] }); }
      else plots.aux.draw({ xlim: [0, 3], series: [{ x: [0, 1, 2, 3], y: obs.map((o, i) => o / G.E[i]), color: '--c-B', label: 'observed ÷ expected, per category (1 = perfect)' }] });
      hud.set('a', `χ² = Σ (O − E)² / E = ${fmt(G.x2)} with ${G.df} degrees of freedom (categories − 1); 5 % critical value ${fmt(c)}`);
      hud.set('b', `p = ${fmtP(G.p)} → ${G.p < 0.05 ? 'reject H₀: the data do not fit' : 'no evidence against H₀'}`, G.p < 0.05 ? 'bad' : 'good');
      hud.set('c', die ? (Math.abs(state.p6 - 1 / 6) > 0.01 ? `truly loaded (six: ${fmt(100 * state.p6, 2)} %, ${dieProbs(state.p6).map((q) => fmt(q * 6, 2)).join(':')} × fair)${G.p >= 0.05 ? ': not enough rolls to tell yet' : ''}` : 'a fair die; about 1 test in 20 still rejects at 5 %') : 'Mendel’s fit is close: χ² = 0.47 on 3 df (p = 0.93); some say too close to be true', die && Math.abs(state.p6 - 1 / 6) > 0.01 && G.p >= 0.05 ? 'bad' : '');
    }

    function indCase() {
      const n = Math.round(state.nt), T = memo(`t${state.a}${n}`, () => table(state.a, n)), I = independence(T);
      sq.range([0, 3], [0, 2]); sq.titles('', 'share of each row in each outcome: treatment (blue), placebo (orange)');
      COLS.forEach((c, j) => { const a = T[0][j] / I.R[0], b = T[1][j] / I.R[1]; rect(sq, `a${j}`, j + 0.15, j + 0.48, 0, a, '--c-B'); rect(sq, `b${j}`, j + 0.52, j + 0.85, 0, b, '--c-I'); put(c, sq.mx(j + 0.5), sq.my(0) - 0.42); });
      put('observed (expected if independent)', sq.mx(1.5), sq.my(1.88));
      COLS.forEach((c, j) => put(c, sq.mx(j + 1.12) - 0.35, sq.my(1.65)));
      ROWS.forEach((r, i) => { put(r, sq.mx(0.25), sq.my(1.38 - 0.25 * i)); T[i].forEach((o, j) => put(`${o} (${fmt(I.E[i][j], 3)})`, sq.mx(j + 1.12) - 0.35, sq.my(1.38 - 0.25 * i))); });
      const c = density(I.df, I.x2), rm = Math.max(3, ...I.res.flat().map(Math.abs)) * 1.15;
      br.range([0, 6], [-rm, rm]); br.titles('', 'Pearson residuals (O − E)/√E: treatment cells (blue), placebo (orange)');
      I.res.flat().forEach((z, k) => { const i = Math.floor(k / 3), j = k % 3, x = j * 2 + i; rect(br, `r${k}`, x + 0.2, x + 0.8, 0, z, i ? '--c-I' : '--c-B'); });
      const ns = lin(30, 3000, 200), f2 = phi2(state.a);
      plots.aux.draw({ xlim: [30, 3000], cursor: n, series: [{ x: ns, y: ns.map((m) => 1 - chi2Cdf(m * f2 + I.df, I.df)), color: '--c-I', label: 'typical p-value for this effect against the number of patients' }, { x: [30, 3000], y: [0.05, 0.05], color: '--ink-dim', label: '' }] });
      hud.set('a', `χ² = ${fmt(I.x2)} on (2 − 1)(3 − 1) = ${I.df} df; 5 % critical value ${fmt(c)}; expected count = row total × column total / n`);
      hud.set('b', `p = ${fmtP(I.p)} → ${I.p < 0.05 ? 'outcome depends on treatment' : 'no evidence of a dependence'}`, I.p < 0.05 ? 'good' : '');
      hud.set('c', `Cramér's V = ${fmt(I.V)} (0 none … 1 total): ${I.V < 0.1 ? 'a negligible association' : I.V < 0.3 ? 'a modest association' : 'a strong association'}${I.p < 0.05 && I.V < 0.1 ? ' — significant is not the same as important' : ''}`, I.p < 0.05 && I.V < 0.1 ? 'bad' : '');
    }

    return {
      changed() { charts.forEach((k) => k.show(true)); ctx.setClock(state.case === 'gof' && state.data === 'die' ? D : 0); },
      update() {
        charts.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        (state.case === 'gof' ? gofCase : indCase)();
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
