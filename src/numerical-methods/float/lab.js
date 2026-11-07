// Floating point: catastrophic cancellation (three formulas, naive against stable, the digits each keeps)
// and the order of a float32 sum (forward stalls, backward and Kahan keep going).
import { createChart } from '../../lib/viz/chart.js';
import { rect } from '../../probability/core/draw.js';
import { EPS64, EPS32, EXPR, relErr, sums } from './model.js';

const fmt = (v, d = 4) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const digits = (e) => Math.max(0, Math.min(16, -Math.log10(Math.max(e, 1e-17))));

export default {
  id: 'float', title: 'Floating point', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { expr: 'cos', lx: -6, ln: 5 },
  cases: [
    { id: 'cancel', label: 'Cancellation', set: {}, examples: [
      { id: 'tiny', label: 'x = 10⁻⁸: the naive answer is 0', controls: ['lx'], set: { expr: 'cos', lx: -8 } },
      { id: 'sqrt', label: '√(x² + 1) − x at x = 10⁸', controls: ['lx'], set: { expr: 'sqrt', lx: 8 } },
      { id: 'quad', label: 'The quadratic formula fails', controls: ['lx'], set: { expr: 'quad', lx: 6 } },
    ] },
    { id: 'sum', label: 'Summation order', set: {}, examples: [
      { id: 'small', label: '1000 terms: all agree', controls: ['ln'], set: { ln: 3 } },
      { id: 'big', label: '10⁶ terms: forward has stalled', controls: ['ln'], set: { ln: 6 } },
    ] },
  ],
  controls: [
    { title: 'Formula', show: (s) => s.case === 'cancel', items: [
      { id: 'expr', label: 'Compute', type: 'select', options: Object.entries(EXPR).map(([k, v]) => [k, v.label]) },
      { id: 'lx', label: 'log₁₀ of the input', unit: '', min: -9, max: 9, step: 0.05 },
    ] },
    { title: 'Σ 1/k² in float32', show: (s) => s.case === 'sum', items: [{ id: 'ln', label: 'log₁₀ of the number of terms', unit: '', min: 1, max: 7, step: 0.05 }] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), all = [sq, tr, br];
    const pool = Array.from({ length: 6 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    let SUM = null;

    function cancel() {
      const E = EXPR[state.expr], [l0, l1] = E.range, lx = Math.max(l0, Math.min(l1, state.lx)), x = 10 ** lx, ls = lin(l0, l1, 600), xs = ls.map((v) => 10 ** v);
      const nv = xs.map(E.naive), st = xs.map(E.stable), scale = state.expr === 'cos' ? 1 : null, yv = (arr) => (scale ? arr : arr.map((v, i) => v / st[i]));
      sq.range([l0, l1], state.expr === 'cos' ? [-0.1, 1.1] : [-0.1, 2]); sq.titles(`log₁₀ ${E.x}`, state.expr === 'cos' ? 'value: naive (orange), stable (green), exact ½ at 0' : 'value ÷ true value: naive (orange), stable (green)');
      sq.line('n', ls, yv(nv), { color: '--c-I', width: 1.4 }); sq.line('s', ls, yv(st), { color: '--c-v', width: 2.4 }); sq.line('cur', [lx, lx], [-0.1, 2], { color: '--accent', width: 1.2 });
      const er = xs.map((v) => Math.log10(Math.max(relErr(E, v), 1e-17)));
      tr.range([l0, l1], [-17, 1]); tr.titles(`log₁₀ ${E.x}`, 'log₁₀ relative error of the naive form; ε = 2.2·10⁻¹⁶ dashed');
      tr.line('e', ls, er, { color: '--c-I', width: 1.4 }); tr.line('eps', [l0, l1], [Math.log10(EPS64), Math.log10(EPS64)], { color: '--ink-dim', width: 1, dashed: true }); tr.line('cur', [lx, lx], [-17, 1], { color: '--accent', width: 1.2 });
      const dn = digits(relErr(E, x)), ds = 15.6;
      br.range([0, 3], [0, 17]); br.titles('', 'correct digits at this input: naive (orange), stable (green)');
      rect(br, 'bn', 0.5, 1.3, 0, dn, '--c-I'); rect(br, 'bs', 1.7, 2.5, 0, ds, '--c-v'); put(fmt(dn, 2), br.mx(0.9), br.my(dn) + 0.15); put('≈ 16', br.mx(2.1), br.my(ds) + 0.15);
      plots.aux.draw({ xlim: [l0, l1], cursor: lx, series: [{ x: ls, y: ls.map((_, i) => digits(relErr(E, xs[i]))), color: '--c-I', label: 'correct digits of the naive form' }], xlabel: `log₁₀ ${E.x}` });
      hud.set('a', `${E.label}, ${E.x} = ${fmt(x, 3)}: naive ${fmt(E.naive(x), 10)}, stable ${fmt(E.stable(x), 10)}`);
      hud.set('b', `naive keeps ${fmt(dn, 2)} of ~16 digits: ${E.why}`, dn < 8 ? 'bad' : 'good');
      hud.set('c', 'each number carries ~16 significant digits; subtracting two that agree in k of them leaves only 16 − k. The cure is algebra: rewrite to avoid the subtraction');
    }

    function sum() {
      if (!SUM) { const ls = lin(1, 7, 49); SUM = { ls, S: ls.map((l) => sums(Math.round(10 ** l))) }; }
      const n = Math.round(10 ** state.ln), s = sums(n), lg = (v) => Math.log10(Math.max(Math.abs(v), 1e-12)), e = (q) => lg(q - s.exact), E = (k) => SUM.S.map((q) => lg(q[k] - q.exact));
      sq.range([1, 7], [-12, -2]); sq.titles('log₁₀ n (terms)', 'log₁₀ error of Σ 1/k² in float32: forward (orange), backward (blue), Kahan (green)');
      sq.line('f', SUM.ls, E('forward'), { color: '--c-I', width: 2 }); sq.line('b', SUM.ls, E('backward'), { color: '--c-B', width: 2 }); sq.line('k', SUM.ls, E('kahan'), { color: '--c-v', width: 2 }); sq.line('cur', [state.ln, state.ln], [-12, -2], { color: '--accent', width: 1.2 });
      // where forward stalls: the terms drop below half an ulp of the running sum
      const ks = lin(0, Math.log10(n), 200).map((v) => Math.round(10 ** v)), f = Math.fround; let acc = f(0), ex = 0, j = 1; const fw = [], xw = [];
      for (const kk of ks) { while (j <= kk) { acc = f(acc + f(1 / (j * j))); ex += 1 / (j * j); j++; } fw.push(acc); xw.push(ex); }
      const lk = ks.map(Math.log10), stall = Math.sqrt(2 / (EPS32 * 1.6449));
      tr.range([0, Math.max(1, Math.log10(n))], [1.6, 1.6455]); tr.titles('log₁₀ k', 'running sum: float32 forward (orange) and exact (grey)');
      tr.line('x', lk, xw, { color: '--ink-dim', width: 1.6 }); tr.line('f', lk, fw, { color: '--c-I', width: 2 }); tr.line('st', [Math.log10(stall), Math.log10(stall)], [1.6, 1.6455], { color: '--c-north', width: 1, dashed: true });
      const d = [s.forward, s.backward, s.kahan].map((v) => digits(Math.abs(v - s.exact) / s.exact));
      br.range([0, 3], [0, 9]); br.titles('', 'correct digits: forward, backward, Kahan');
      ['--c-I', '--c-B', '--c-v'].forEach((c, i) => { rect(br, `b${i}`, i + 0.2, i + 0.8, 0, d[i], c); put(fmt(d[i], 2), br.mx(i + 0.5), br.my(d[i]) + 0.15); });
      plots.aux.draw({ xlim: [1, 7], cursor: state.ln, series: [{ x: SUM.ls, y: SUM.S.map((q) => q.exact), color: '--ink-dim', label: 'exact partial sum' }, { x: SUM.ls, y: SUM.S.map((q) => q.forward), color: '--c-I', label: 'float32 forward' }], xlabel: 'log₁₀ n' });
      hud.set('a', `n = ${fmt(n, 3)}: forward ${fmt(s.forward, 9)}, backward ${fmt(s.backward, 9)}, Kahan ${fmt(s.kahan, 9)}; exact ${fmt(s.exact, 9)}`);
      hud.set('b', `forward stalls near k ≈ ${fmt(stall, 2)}: there 1/k² is below half the spacing of float32 numbers around 1.64, so adding it changes nothing`, n > stall ? 'bad' : '');
      hud.set('c', 'add small numbers first (backward), or carry the lost low bits along (Kahan): same terms, same precision, many more correct digits');
    }

    return {
      changed() { all.forEach((k) => k.show(true)); ctx.setClock(0); },
      update() { all.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; }); (state.case === 'cancel' ? cancel : sum)(); },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
