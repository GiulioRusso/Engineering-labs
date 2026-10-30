// Maxwell's equations, the two the other labs do not show: no magnetic charge (flux of B through a closed
// surface round a bar magnet is zero, unlike E round a charge), Ampère's circulation law round wires, and the
// displacement current that keeps Ampère's law true across a charging capacitor.
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { si } from '../../lib/ui/format.js';
import { magnet, magnetB, chargeE, sphereFlux, fieldLine, wiresB, loop, circulation, enclosed, capacitor } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], X = 2.3, G = 72;
const M = magnet(), WIRES = [[-0.7, 0.1], [0.8, 0.5], [0.1, -1.1]];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

export default {
  id: 'maxwell', title: "Maxwell's equations", size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { src: 'magnet', cx: 0, cy: 0, R: 1.1, I1: 2, I2: 0, I3: 0, shape: 'circle', lx: 0, ly: 0, lr: 1.2, Ic: 1, a: 5, r: 3, where: 'wire', surface: 'flat' },
  cases: [
    { id: 'gauss-b', label: 'No magnetic charge', controls: ['src', 'cx', 'cy', 'R'], set: { src: 'magnet', cx: 0, cy: 0, R: 1.1 }, examples: [
      { id: 'cut', label: 'A sphere round one pole', set: { cx: 0.6, cy: 0, R: 0.5 } },
      { id: 'beside', label: 'Beside the magnet', set: { cx: 0, cy: 1, R: 0.6 } },
      { id: 'charge', label: 'Compare: a charge, flux = q/ε₀', set: { src: 'charge', cx: 0, cy: 0, R: 1.1 } },
      { id: 'charge-out', label: 'Charge outside: flux 0', set: { src: 'charge', cx: 1.3, cy: 0.6, R: 0.7 } },
    ] },
    { id: 'ampere', label: "Ampère's law", controls: ['I1', 'I2', 'I3', 'shape', 'lx', 'ly', 'lr'], set: { I1: 2, I2: 0, I3: 0, shape: 'circle', lx: -0.7, ly: 0.1, lr: 0.8 }, examples: [
      { id: 'off', label: 'Off-centre: same total', set: { lx: -0.3, ly: 0.3, lr: 0.9 } },
      { id: 'square', label: 'Any shape: a square', set: { shape: 'square', lx: -0.5, ly: 0, lr: 0.9 } },
      { id: 'two', label: 'Two opposite currents: 0', set: { I2: -2, lx: 0, ly: 0.3, lr: 1.3 } },
      { id: 'outside', label: 'Wire outside the loop', set: { I1: 2, I2: 3, lx: -0.7, ly: 0.1, lr: 0.6 } },
    ] },
    { id: 'displacement', label: 'Displacement current', controls: ['Ic', 'a', 'r', 'where', 'surface'], set: { Ic: 1, a: 5, r: 3, where: 'wire', surface: 'flat' }, examples: [
      { id: 'bag', label: 'Same loop, bulging surface', set: { surface: 'bulge' } },
      { id: 'gap', label: 'A loop in the gap', set: { where: 'gap', r: 3 } },
      { id: 'wide', label: 'Gap loop wider than the plates', set: { where: 'gap', r: 8 } },
    ] },
  ],
  controls: [
    { title: 'Source and closed surface', show: (s) => s.case === 'gauss-b', items: [
      { id: 'src', label: 'Inside', type: 'segmented', options: [['magnet', 'Bar magnet'], ['charge', 'Charge']] },
      { id: 'cx', label: 'Sphere centre x', unit: '', min: -1.5, max: 1.5, step: 0.05 },
      { id: 'cy', label: 'Sphere centre y', unit: '', min: -1.5, max: 1.5, step: 0.05 },
      { id: 'R', label: 'Sphere radius', unit: '', min: 0.2, max: 1.5, step: 0.05 },
    ] },
    { title: 'Wires (current out of the screen)', show: (s) => s.case === 'ampere', items: [1, 2, 3].map((i) => ({ id: `I${i}`, label: `Wire ${i}`, unit: 'A', min: -5, max: 5, step: 0.5 })) },
    { title: 'Loop', show: (s) => s.case === 'ampere', items: [
      { id: 'shape', label: 'Shape', type: 'segmented', options: [['circle', 'Circle'], ['square', 'Square']] },
      { id: 'lx', label: 'Centre x', unit: '', min: -1.5, max: 1.5, step: 0.05 },
      { id: 'ly', label: 'Centre y', unit: '', min: -1.5, max: 1.5, step: 0.05 },
      { id: 'lr', label: 'Size', unit: '', min: 0.1, max: 1.6, step: 0.05 },
    ] },
    { title: 'Charging capacitor', show: (s) => s.case === 'displacement', items: [
      { id: 'Ic', label: 'Current I', unit: 'A', min: 0.1, max: 5, step: 0.1 },
      { id: 'a', label: 'Plate radius', unit: 'cm', min: 2, max: 8, step: 0.5 },
      { id: 'where', label: 'Loop', type: 'segmented', options: [['wire', 'Round the wire'], ['gap', 'In the gap']] },
      { id: 'r', label: 'Loop radius r', unit: 'cm', min: 0.5, max: 9, step: 0.25 },
      { id: 'surface', label: 'Surface bounded by the loop', type: 'segmented', options: [['flat', 'Flat disc'], ['bulge', 'Bag into the gap']], show: (s) => s.where === 'wire' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR, xTicks: false }), charts = [sq, tr, br];
    const own = { pos: createCurve(stage, { max: 800, width: 5, color: '--c-north' }), neg: createCurve(stage, { max: 800, width: 5, color: '--c-B' }), arrows: createCurve(stage, { max: 900, width: 1.4, color: '--ink-dim' }), body: createCurve(stage, { max: 60, width: 2, color: '--ink' }), e: createCurve(stage, { max: 60, width: 1.6, color: '--c-E' }), bag: createCurve(stage, { max: 12, width: 2, color: '--c-I', dashed: true }) };
    const pool = Array.from({ length: 14 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };
    const W = (x, y) => [sq.mx(x), sq.my(y), 0.01];
    // colour a closed path by the sign of f along it (one segment per step)
    const signed = (pts, f) => { const P = [], N = []; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; (f(i) >= 0 ? P : N).push(...W(...p), ...W(...q)); }); own.pos.segments(P); own.neg.segments(N); own.pos.object.visible = own.neg.object.visible = true; };
    const lines = {};
    const fieldLines = (src) => (lines[src] ??= src === 'magnet'
      ? lin(-0.26, 0.26, 8).flatMap((y) => { const F = (a, b, c, o) => magnetB(M, a, b, c, o), f = fieldLine(F, 0, y, { box: X }); return f.length > 1 && Math.hypot(...f.at(-1).map((v, i) => v - [0, y][i])) < 0.05 ? [f] : [f, fieldLine(F, 0, y, { box: X, dir: -1 })]; })
      : lin(0, 2 * Math.PI, 17).slice(0, 16).map((t) => [[0.06 * Math.cos(t), 0.06 * Math.sin(t)], [X * 1.5 * Math.cos(t), X * 1.5 * Math.sin(t)]]));

    function gauss() {
      const isM = state.src === 'magnet', F = isM ? (x, y, z, b) => magnetB(M, x, y, z, b) : (x, y, z, b) => chargeE(1, 0, 0, x, y, z, b);
      sq.range([-X, X], [-X, X]); sq.titles('x', 'y: field lines in the plane through the magnet; the circle is the sphere seen edge-on');
      fieldLines(state.src).forEach((L, i) => sq.line(`f${i}`, L.map((p) => p[0]), L.map((p) => p[1]), { color: isM ? '--c-B' : '--c-E', width: 1.6 }));
      if (isM) { const { L, a } = M; own.body.segments([...W(-L / 2, -a), ...W(L / 2, -a), ...W(L / 2, -a), ...W(L / 2, a), ...W(L / 2, a), ...W(-L / 2, a), ...W(-L / 2, a), ...W(-L / 2, -a), ...W(0, -a), ...W(0, a)]); put('N', sq.mx(L / 4), sq.my(0)); put('S', sq.mx(-L / 4), sq.my(0)); }
      else { own.body.segments([]); put('+q', sq.mx(0), sq.my(0.12)); }
      own.body.object.visible = true;
      const { cx, cy, R } = state, th = lin(0, 2 * Math.PI, 241).slice(0, 240), pts = th.map((t) => [cx + R * Math.cos(t), cy + R * Math.sin(t)]), b = [0, 0, 0];
      const Bn = th.map((t, i) => (F(pts[i][0], pts[i][1], 0, b), b[0] * Math.cos(t) + b[1] * Math.sin(t)));
      signed(pts, (i) => Bn[i]);
      const f = sphereFlux(F, cx, cy, R, 90), deg = th.map((t) => t * 180 / Math.PI), m = Math.max(...Bn.map(Math.abs)) * 1.1 || 1;
      tr.range([0, 360], [-m, m]); tr.titles('angle round the circle (°)', `${isM ? 'B' : 'E'}·n: outward (red) and inward (blue)`);
      tr.line('bn', deg, Bn, { color: '--c-I', width: 2 });
      const top = Math.max(f.out, f.in, 1e-9) * 1.25;
      br.range([0.4, 3.6], [-top, top]); br.titles('', `flux through the whole sphere: out, in, net`);
      br.stems('o', [1], [f.out], { color: '--c-north', width: 16 }); br.stems('i', [2], [-f.in], { color: '--c-B', width: 16 }); br.stems('n', [3], [f.net], { color: '--accent', width: 16 });
      put('out', br.mx(1), BR[1] - 0.18); put('in', br.mx(2), BR[1] - 0.18); put('net', br.mx(3), BR[1] - 0.18);
      plots.aux.draw({ xlim: [0, 360], series: [{ x: deg, y: Bn, color: '--c-I', label: `${isM ? 'B' : 'E'}·n round the circle (positive = leaving the sphere)` }] });
      hud.set('a', `${isM ? 'magnetic' : 'electric'} flux leaving the sphere ${fmt(f.out)}, entering ${fmt(f.in)}${isM ? ' (units μ₀I)' : ' (units q/ε₀)'}`);
      hud.set('b', isM ? `net ∮B·dA = ${fmt(f.net / Math.max(f.out, 1e-9) * 100, 2)} % of the outflow: zero, wherever the sphere is` : `net ∮E·dA = ${fmt(f.net)} q/ε₀: ${Math.abs(f.net) > 0.5 ? 'the charge is inside' : 'the charge is outside'}`, 'good');
      hud.set('c', isM ? 'every B line that leaves the sphere comes back in: B lines have no ends, there are no magnetic charges' : 'E lines start on the charge: a closed surface counts the charge inside');
    }

    function ampere() {
      const Wr = WIRES.map(([x, y], i) => ({ x, y, I: state[`I${i + 1}`] })).filter((w) => w.I !== 0), b = [0, 0, 0];
      sq.range([-X, X], [-X, X]); sq.titles('x', 'y: |B| (bright = strong) and its direction; wires carry current out of (⊙) or into (⊗) the screen');
      const v = new Float64Array(G * G); for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { wiresB(Wr, -X + 2 * X * (i + 0.5) / G, -X + 2 * X * (j + 0.5) / G, b); v[j * G + i] = Math.hypot(b[0], b[1]); }
      sq.image('B', v, G, G, { map: 'magma', norm: (q) => Math.max(0, Math.min(1, (Math.log10(q + 1e-9) + 1.3) / 1.8)) });
      const A = []; for (const x of lin(-2.1, 2.1, 15)) for (const y of lin(-2.1, 2.1, 15)) { wiresB(Wr, x, y, b); const m = Math.hypot(b[0], b[1]); if (!m) continue; const ux = 0.11 * b[0] / m, uy = 0.11 * b[1] / m; A.push(...W(x - ux, y - uy), ...W(x + ux, y + uy), ...W(x + ux, y + uy), ...W(x + ux - 0.45 * ux + 0.3 * uy, y + uy - 0.45 * uy - 0.3 * ux)); }
      own.arrows.segments(A); own.arrows.object.visible = true;
      WIRES.forEach(([x, y], i) => { const I = state[`I${i + 1}`]; if (I) put(`${I > 0 ? '⊙' : '⊗'} ${fmt(Math.abs(I))} A`, sq.mx(x), sq.my(y)); });
      const P = loop(state.shape, state.lx, state.ly, state.lr, 720), C = circulation(Wr, P), Ienc = enclosed(Wr, P);
      signed(P, (i) => C.Bt[i]);
      const m = Math.max(...C.Bt.map(Math.abs)) * 1.1 || 1;
      tr.range([0, C.len], [-m, m]); tr.titles('distance along the loop', 'B along the loop (B·t): ∮ is the area under this');
      tr.line('bt', C.s, C.Bt, { color: '--c-I', width: 2 });
      const top = Math.max(Math.abs(C.sum), Math.abs(Ienc), 1) * 1.25;
      br.range([0.4, 2.6], [-top, top]); br.titles('', '∮B·dl / μ₀ and the current enclosed (A)');
      br.stems('c', [1], [C.sum], { color: '--c-I', width: 16 }); br.stems('e', [2], [Ienc], { color: '--c-v', width: 16 });
      put('∮B·dl/μ₀', br.mx(1), BR[1] - 0.18); put('I inside', br.mx(2), BR[1] - 0.18);
      plots.aux.draw({ xlim: [0, C.len], ylim: [-m, m], series: [{ x: C.s, y: C.Bt, color: '--c-I', label: 'B·t along the loop (counter-clockwise)' }] });
      hud.set('a', `∮B·dl = μ₀ × ${fmt(C.sum)} A (sum of B·t × step along the ${state.shape})`);
      hud.set('b', `current through the loop: ${fmt(Ienc)} A ${Math.abs(C.sum - Ienc) < 1e-3 ? '✓ equal' : ''}`, 'good');
      hud.set('c', Wr.some((w) => enclosed([w], P) === 0) ? 'a wire outside pushes B one way on the near side and the other way on the far side: its contribution cancels' : 'B is not uniform along the loop, but the total ∮B·dl only counts the current inside');
    }

    function displacement() {
      const { Ic: I, a, r, where, surface } = state, C = capacitor({ I, a: a / 100, r: r / 100, where, surface: where === 'gap' ? 'flat' : surface });
      sq.range([-12, 12], [-10, 10]); sq.titles('along the wire (cm)', 'distance from the axis (cm): side view of a capacitor charging');
      const g = 1, xl = where === 'wire' ? -7 : 0;
      own.body.segments([...W(-12, 0), ...W(-g, 0), ...W(g, 0), ...W(12, 0), ...W(-g, -a), ...W(-g, a), ...W(g, -a), ...W(g, a)]); own.body.object.visible = true;
      const E = []; for (const y of lin(-a * 0.85, a * 0.85, 7)) E.push(...W(-g + 0.15, y), ...W(g - 0.15, y), ...W(g - 0.15, y), ...W(g - 0.55, y + 0.35), ...W(g - 0.15, y), ...W(g - 0.55, y - 0.35));
      own.e.segments(E); own.e.object.visible = true;
      put('+ + +', sq.mx(-g - 0.9), sq.my(a + 0.8)); put('− − −', sq.mx(g + 0.9), sq.my(a + 0.8)); put(`I = ${fmt(I)} A →`, sq.mx(-8), sq.my(-1)); put('→ I', sq.mx(8), sq.my(-1)); put('E grows', sq.mx(0), sq.my(-a - 0.9));
      // the loop seen edge on: a thin ellipse; B circulates round it (out of the screen on top, into it below)
      const el = lin(0, 2 * Math.PI, 61).slice(0, 60).map((t) => [xl + 0.5 * Math.cos(t), r * Math.sin(t)]);
      signed(el, () => 1); own.neg.segments([]);
      put('⊙ B', sq.mx(xl + 1.2), sq.my(r)); put('⊗ B', sq.mx(xl + 1.2), sq.my(-r));
      const bag = where === 'wire' && surface === 'bulge';
      own.bag.set(bag ? [[xl, r], [-3, a + 1.5], [0, a + 1.5], [0, -a - 1.5], [-3, -a - 1.5], [xl, -r]].flatMap((p) => W(...p)) : [...W(xl, r), ...W(xl, -r)]); own.bag.object.visible = true;
      const rs = lin(0.3, 10, 120), Bg = rs.map((q) => capacitor({ I, a: a / 100, r: q / 100, where: 'gap', surface: 'flat' }).B * 1e6), Bw = rs.map((q) => capacitor({ I, a: a / 100, r: q / 100, where: 'wire', surface: 'flat' }).B * 1e6);
      const top = Math.max(C.B, ...Bg) * 1.3; tr.range([0, 10], [0, top]); tr.titles('loop radius r (cm)', 'B on the loop (μT): round the wire (dashed), in the gap (solid)');
      tr.line('w', rs, Bw, { color: '--ink-dim', width: 1.4, dashed: true }); tr.line('g', rs, Bg, { color: '--c-B', width: 2.4 }); tr.dots('q', [r], [C.B * 1e6], { color: '--accent', size: 11 });
      br.range([0.4, 3.6], [0, I * 1.3]); br.titles('', 'current through the surface (A)');
      br.stems('c', [1], [C.cond], { color: '--c-I', width: 16 }); br.stems('d', [2], [C.disp], { color: '--c-E', width: 16 }); br.stems('t', [3], [C.total], { color: '--accent', width: 16 });
      put('conduction', br.mx(1), BR[1] - 0.18); put('ε₀ dΦ/dt', br.mx(2), BR[1] - 0.18); put('total', br.mx(3), BR[1] - 0.18);
      plots.aux.draw({ xlim: [0, 10], ylim: [0, top], cursor: r, series: [{ x: rs, y: Bw, color: '--ink-dim', label: 'B round the wire (μT)' }, { x: rs, y: Bg, color: '--c-B', label: 'B in the gap (μT): grows inside the plates, then the same' }] });
      hud.set('a', `through this ${where === 'gap' ? 'flat disc in the gap' : surface === 'flat' ? 'flat disc' : 'bag'}: conduction current ${fmt(C.cond)} A, displacement current ε₀ dΦ_E/dt ${fmt(C.disp)} A`);
      hud.set('b', `B on the loop = μ₀(I + ε₀dΦ/dt)/(2πr) = ${si(C.B, 'T')}; dE/dt between the plates ${si(C.dEdt, 'V/(m·s)')}`);
      hud.set('c', where === 'wire' ? (surface === 'flat' ? 'without Maxwell’s term the bag would give 0 A for the same loop: a contradiction. Try the bag.' : 'no charge crosses the bag, yet the total is the same: the growing E field counts as a current') : 'in the gap no charge flows, but B still circles round: the changing E field makes it', 'good');
    }

    return {
      changed() { charts.forEach((c) => { c.clear(); c.show(false); c.show(true); }); Object.values(own).forEach((c) => { c.object.visible = false; }); },
      update() {
        used = 0; pool.forEach((l) => { l.visible = false; });
        if (state.case === 'gauss-b') gauss(); else if (state.case === 'ampere') ampere(); else displacement();
      },
      theme() { charts.forEach((k) => k.theme()); Object.values(own).forEach((c) => c.theme()); },
    };
  },
};
