// Nuclear binding energy: B/A along the valley of stability from the semi-empirical mass formula with the
// measured values, the five terms of the formula for the chosen nucleus, and the energy of splitting a
// nucleus in two (fission) against joining light ones (fusion).
import { createChart } from '../../lib/viz/chart.js';
import { rect } from '../../probability/core/draw.js';
import { terms, B, zStable, perNucleon, MEASURED, fissionQ, dtQ } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const AS = Array.from({ length: 249 }, (_, i) => i + 2);
const TERMS = [['volume', '--c-v'], ['surface', '--c-I'], ['coulomb', '--c-north'], ['asymmetry', '--c-B'], ['pairing', '--c-E']];

export default {
  id: 'binding', title: 'Binding energy', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { A: 56 },
  cases: [
    { id: 'binding', label: 'Binding energy', set: {}, examples: [
      { id: 'iron', label: 'Iron and nickel: the top of the curve', controls: ['A'], set: { A: 62 } },
      { id: 'fission', label: 'Uranium splits: ≈ 200 MeV', controls: ['A'], set: { A: 236 } },
      { id: 'fusion', label: 'Light nuclei join: D + T', controls: ['A'], set: { A: 4 } },
    ] },
  ],
  controls: [{ title: 'Nucleus', items: [{ id: 'A', label: 'Mass number A', unit: '', min: 2, max: 250, step: 1 }, { type: 'readout', label: 'Most stable Z', value: (s) => String(zStable(Math.round(s.A))) }] }],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), all = [sq, tr, br];
    const pool = Array.from({ length: 24 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    return {
      changed() { all.forEach((k) => k.show(true)); ctx.setClock(0); },
      update() {
        all.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; });
        const A = Math.round(state.A), Z = zStable(A), b = B(A, Z), t = terms(A, Z), curve = AS.map(perNucleon);
        sq.range([0, 250], [0, 9.5]); sq.titles('mass number A', 'binding energy per nucleon B/A (MeV): formula (blue), measured (dots)');
        sq.line('f', AS, curve.map((v) => Math.max(0, v)), { color: '--c-B', width: 2.2 }); sq.dots('m', MEASURED.map((m) => m.A), MEASURED.map((m) => m.B / m.A), { color: '--c-I', size: 9 });
        MEASURED.forEach((m) => put(m.name, sq.mx(m.A) + 0.18, sq.my(m.B / m.A) - 0.16));
        sq.dots('cur', [A], [Math.max(0, b / A)], { color: '--accent', size: 13 }); sq.line('cl', [A, A], [0, Math.max(0, b / A)], { color: '--accent', width: 1, dashed: true });
        sq.line('fis', [235, 118], [7.59, 8.5], { color: '--c-v', width: 1.6 }); put('fission →', sq.mx(180), sq.my(8.25) + 0.15); sq.line('fus', [2, 4], [1.11, 7.07], { color: '--c-v', width: 1.6 }); put('← fusion', sq.mx(18), sq.my(4.2));
        // the five terms, per nucleon
        tr.range([0, 5], [-20, 17]); tr.titles('', `MeV per nucleon for A = ${A}, Z = ${Z}: volume, surface, Coulomb, asymmetry, pairing`);
        TERMS.forEach(([k, c], i) => { const v = t[k] / A; rect(tr, k, i + 0.2, i + 0.8, Math.min(0, v), Math.max(0, v), c); put(fmt(v, 3), tr.mx(i + 0.5), tr.my(v > 0 ? v : 0) + (v > 0 ? 0.14 : 0.14)); });
        // splitting in two
        const q = AS.filter((a) => a >= 10).map((a) => fissionQ(a)); br.range([10, 250], [-40, 240]); br.titles('mass number A', 'energy released by splitting A in two halves (MeV)');
        br.line('q', AS.filter((a) => a >= 10), q, { color: '--c-v' }); br.line('z', [10, 250], [0, 0], { color: '--ink-dim', width: 1 }); if (A >= 10) br.dots('c', [A], [fissionQ(A)], { color: '--accent', size: 10 });
        plots.aux.draw({ xlim: [2, 250], cursor: A, series: [{ x: AS, y: AS.map((a) => B(a, zStable(a))), color: '--c-B', label: 'total binding energy B (MeV)' }], xlabel: 'mass number A' });
        hud.set('a', `A = ${A}, Z = ${Z}: B = ${fmt(b, 4)} MeV, ${fmt(b / A, 3)} MeV per nucleon — the mass defect Δm = B/c² = ${fmt(b / 931.494, 3)} u`);
        hud.set('b', A >= 10 ? `splitting it in two halves would ${fissionQ(A) > 0 ? `release ${fmt(fissionQ(A), 3)} MeV` : `cost ${fmt(-fissionQ(A), 3)} MeV`}` : `D + T → ⁴He + n releases ${fmt(dtQ(), 4)} MeV (measured masses)`, (A >= 10 ? fissionQ(A) > 0 : true) ? 'good' : '');
        hud.set('c', 'nuclei near iron are the most tightly bound: energy comes out by splitting heavy ones (fission) or joining light ones (fusion), both toward the top of the curve');
      },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
