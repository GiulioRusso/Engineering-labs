// Beams: a simply supported beam and a cantilever under a point or uniform load, with the shear force,
// bending moment and (exaggerated) deflected shape; then cross sections, second moment and bending stress.
import { createChart } from '../../lib/viz/chart.js';
import { diagrams, section, bendingStress, lin } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const E = 200e9, BEAM = section('rect', { b: 0.1, h: 0.2 }), EI = E * BEAM.I, kN = 1e-3, SY = 250e6;
const span = (v) => Math.max(1e-9, ...v.map(Math.abs)) * 1.15;

export default {
  id: 'beams', title: 'Beams in bending', size: 4.4, ortho: true, plain: true, cam: 'top', timeless: true,
  defaults: { L: 4, load: 'point', P: 10e3, a: 2, w: 5e3, sec: 'ibeam', b: 0.1, h: 0.2, tf: 0.012, tw: 0.008, M: 20e3 },
  cases: [
    { id: 'simply', label: 'Simply supported', set: {}, examples: [
      { id: 'off', label: 'Load off centre: unequal reactions', controls: ['a'], set: { a: 1 } },
      { id: 'udl', label: 'Uniform load: parabolic moment', controls: ['w', 'L'], set: { load: 'udl' } },
      { id: 'long', label: 'Twice the span: 8× the sag', controls: ['L'], set: { L: 8, a: 4 } },
    ] },
    { id: 'cantilever', label: 'Cantilever', set: { a: 4 }, examples: [
      { id: 'mid', label: 'Load halfway out: the tip still moves', controls: ['a'], set: { a: 2 } },
      { id: 'udl', label: 'Uniform load: δ = wL⁴/8EI', controls: ['w', 'L'], set: { load: 'udl' } },
    ] },
    { id: 'section', label: 'Cross section', set: {}, examples: [
      { id: 'rect', label: 'Solid rectangle, same area', controls: ['sec', 'M'], set: { sec: 'rect' } },
      { id: 'deep', label: 'Twice as deep: 5× stiffer for 1.4× the steel', controls: ['h', 'M'], set: { h: 0.4 } },
    ] },
  ],
  controls: [
    { title: 'Beam (steel, 100 × 200 mm)', show: (s) => s.case !== 'section', items: [
      { id: 'L', label: 'Span L', unit: 'm', min: 1, max: 10, step: 0.1 }, { id: 'load', label: 'Load', type: 'segmented', options: [['point', 'Point load'], ['udl', 'Uniform']] },
      { id: 'P', label: 'Point load P', unit: 'kN', k: kN, min: 1e3, max: 50e3, step: 500, show: (s) => s.load === 'point' }, { id: 'a', label: 'Position a', unit: 'm', min: 0, max: 10, step: 0.05, show: (s) => s.load === 'point' },
      { id: 'w', label: 'Uniform load w', unit: 'kN/m', k: kN, min: 0.5e3, max: 20e3, step: 250, show: (s) => s.load === 'udl' },
    ] },
    { title: 'Section', show: (s) => s.case === 'section', items: [
      { id: 'sec', label: 'Shape', type: 'segmented', options: [['ibeam', 'I-beam'], ['rect', 'Rectangle']] },
      { id: 'h', label: 'Depth h', unit: 'mm', k: 1e3, min: 0.05, max: 0.4, step: 0.005 }, { id: 'b', label: 'Flange width b', unit: 'mm', k: 1e3, min: 0.03, max: 0.3, step: 0.005, show: (s) => s.sec === 'ibeam' },
      { id: 'tf', label: 'Flange thickness', unit: 'mm', k: 1e3, min: 0.004, max: 0.04, step: 0.001, show: (s) => s.sec === 'ibeam' }, { id: 'tw', label: 'Web thickness', unit: 'mm', k: 1e3, min: 0.003, max: 0.03, step: 0.001, show: (s) => s.sec === 'ibeam' },
      { id: 'M', label: 'Bending moment M', unit: 'kN·m', k: kN, min: 1e3, max: 200e3, log: true },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 24 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(sq.mx(x), sq.my(y), 0.02); l.visible = true; };
    let nk = 0; const keys = new Set();
    const seg = (pts, o) => { const k = `g${nk++}${o.color}${o.dashed ? 'd' : ''}`; keys.add(k); sq.line(k, pts.map((p) => p[0]), pts.map((p) => p[1]), o); };
    const arrow = (x, y0, y1, o) => { const d = Math.sign(y1 - y0) * 0.14, s = 0.08 * (o.s || 1); seg([[x, y0], [x, y1]], o); seg([[x - s, y1 - d], [x, y1], [x + s, y1 - d]], o); };
    return {
      changed() { charts.forEach((c) => { c.show(false); c.show(true); }); sq.show(false); },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; }); nk = 0; keys.forEach((k) => sq.hide(k));
        const c = state.case;
        if (c !== 'section') {
          const L = state.L, pt = state.load === 'point', a = Math.min(state.a, L), load = pt ? { P: state.P, a } : { w: state.w }, D = diagrams(c, L, load, EI), s = L / 4;
          sq.range([-0.12 * L, 1.12 * L], [-0.62 * L, 0.62 * L]);
          // deflected shape, exaggerated so the largest sag is a fixed height on screen
          const ymax = Math.max(...D.y.map(Math.abs)), amp = 0.22 * L / ymax;
          seg([[0, 0], [L, 0]], { color: '--ink-dim', dashed: true, width: 1 }); seg(D.x.map((x, i) => [x, D.y[i] * amp]), { color: '--c-B', width: 7 });
          if (c === 'simply') for (const x of [0, L]) seg([[x, 0], [x - 0.04 * L, -0.07 * L], [x + 0.04 * L, -0.07 * L], [x, 0]], { color: '--ink', width: 2 });
          else { seg([[0, -0.18 * L], [0, 0.18 * L]], { color: '--ink', width: 4 }); for (let i = 0; i < 6; i++) seg([[0, -0.18 * L + i * 0.07 * L], [-0.05 * L, -0.23 * L + i * 0.07 * L]], { color: '--ink-dim', width: 1.2 }); }
          if (pt) { arrow(a, 0.3 * L, 0.03 * L, { color: '--c-north', width: 2.6, s: L / 4 }); text(`P = ${fmt(state.P * kN)} kN`, a, 0.34 * L); }
          else { for (const x of lin(0, L, 9)) arrow(x, 0.2 * L, 0.03 * L, { color: '--c-north', width: 1.6, s: L / 6 }); seg([[0, 0.2 * L], [L, 0.2 * L]], { color: '--c-north', width: 1.6 }); text(`w = ${fmt(state.w * kN)} kN/m`, L / 2, 0.25 * L); }
          if (c === 'simply') { arrow(0, -0.3 * L, -0.09 * L, { color: '--c-v', width: 2.4, s }); arrow(L, -0.3 * L, -0.09 * L, { color: '--c-v', width: 2.4, s }); text(`R₁ = ${fmt(D.R1 * kN)} kN`, 0, -0.35 * L); text(`R₂ = ${fmt(D.R2 * kN)} kN`, L, -0.35 * L); }
          else { arrow(0.06 * L, -0.3 * L, -0.03 * L, { color: '--c-v', width: 2.4, s }); text(`R = ${fmt(D.R1 * kN)} kN, M = ${fmt(D.M0 * kN)} kN·m`, 0.3 * L, -0.35 * L); }
          text(`deflection drawn × ${fmt(amp, 2)}`, L / 2, -0.52 * L);
          const V = D.V.map((v) => v * kN), M = D.M.map((v) => v * kN), y = D.y.map((v) => v * 1e3), Mx = Math.max(...M.map(Math.abs)), iM = M.findIndex((v) => Math.abs(v) === Mx);
          tr.range([0, L], [-span(V), span(V)]); tr.titles('x (m)', 'shear force V (kN): jumps at point loads'); tr.line('v', D.x, V, { color: '--c-I' });
          br.range([0, L], [Math.min(0, -span(M)), Math.max(0, span(M))]); br.titles('x (m)', 'bending moment M (kN·m): V is its slope'); br.line('m', D.x, M, { color: '--c-F' }); br.dots('q', [D.x[iM]], [M[iM]], { color: '--accent', size: 10 });
          const sMax = Mx / kN * (BEAM.h / 2) / BEAM.I;
          hud.set('a', `largest moment ${fmt(Mx)} kN·m at x = ${fmt(D.x[iM])} m · largest deflection ${fmt(ymax * 1e3)} mm (span/${fmt(L / ymax, 3)})`);
          hud.set('b', `bending stress at the outer fibres σ = M c / I = ${fmt(sMax / 1e6)} MPa (steel yields at 250)`, sMax < SY ? 'good' : 'bad');
          hud.set('c', c === 'simply' ? 'statics first (reactions), then cut the beam anywhere: V and M are what holds the two pieces together' : 'a cantilever carries everything back to the wall: the moment is largest there, and it hogs (tension on top)');
          plots.aux.draw({ xlim: [0, L], series: [{ x: D.x, y, color: '--c-B', label: 'deflection (mm) vs x (m)' }] });
        } else {
          const g = { b: state.b, h: state.h, tf: Math.min(state.tf, state.h / 2.5), tw: Math.min(state.tw, state.b) }, S = section(state.sec, g), Ar = S.A, rect = state.sec === 'rect', bR = rect ? g.b : Ar / g.h;
          const B = rect ? bR : g.b, H = g.h, h2 = H / 2, ys = lin(-h2, h2, 201), sig = ys.map((y) => bendingStress(state.M, y, S.I) / 1e6), R = 0.24;
          sq.range([-R, R], [-R, R]);
          const outline = rect ? [[-bR / 2, -h2], [bR / 2, -h2], [bR / 2, h2], [-bR / 2, h2], [-bR / 2, -h2]]
            : [[-B / 2, -h2], [B / 2, -h2], [B / 2, -h2 + g.tf], [g.tw / 2, -h2 + g.tf], [g.tw / 2, h2 - g.tf], [B / 2, h2 - g.tf], [B / 2, h2], [-B / 2, h2], [-B / 2, h2 - g.tf], [-g.tw / 2, h2 - g.tf], [-g.tw / 2, -h2 + g.tf], [-B / 2, -h2 + g.tf], [-B / 2, -h2]];
          seg(outline, { color: '--c-B', width: 3 }); seg([[-R, 0], [R, 0]], { color: '--ink-dim', dashed: true, width: 1 });
          // stress arrows across the depth, compression (top) pointing in, tension (bottom) out
          const sm = Math.max(...sig.map(Math.abs)); for (const y of lin(-h2, h2, 11)) { const v = bendingStress(state.M, y, S.I) / 1e6, len = 0.09 * v / sm; if (Math.abs(len) > 1e-3) seg([[Math.max(B, bR) / 2 + 0.02, y], [Math.max(B, bR) / 2 + 0.02 + Math.abs(len), y]], { color: v > 0 ? '--c-I' : '--c-B', width: 2 }); }
          text('neutral axis', -R * 0.7, 0.012); text('compression', 0.16, h2 + 0.015); text('tension', 0.16, -h2 - 0.015); text(`A = ${fmt(Ar * 1e4)} cm²`, 0, -R * 0.9);
          tr.range([-sm * 1.15, sm * 1.15], [-h2 * 1e3, h2 * 1e3]); tr.titles('σ (MPa): − compression, + tension', 'height y (mm)'); tr.line('s', sig, ys.map((y) => y * 1e3), { color: '--c-I' }); tr.line('y1', [SY / 1e6, SY / 1e6], [-h2 * 1e3, h2 * 1e3], { color: '--c-north', dashed: true, width: 1 }); tr.line('y2', [-SY / 1e6, -SY / 1e6], [-h2 * 1e3, h2 * 1e3], { color: '--c-north', dashed: true, width: 1 });
          // where I comes from: width × y² across the depth
          const wAt = (y) => (rect ? bR : Math.abs(y) > h2 - g.tf ? B : g.tw), dI = ys.map((y) => wAt(y) * y * y * 1e6);
          br.range([-h2 * 1e3, h2 * 1e3], [0, Math.max(...dI) * 1.15]); br.titles('height y (mm)', 'b(y)·y²: what each layer adds to I'); br.line('d', ys.map((y) => y * 1e3), dI, { color: '--c-v' });
          const Ir = section('rect', { b: Ar / H, h: H }).I, smax = sm;
          hud.set('a', `${rect ? 'rectangle' : 'I-beam'} ${fmt(H * 1e3)} mm deep: I = ${fmt(S.I * 1e8)} cm⁴ (a rectangle with the same area: ${fmt(Ir * 1e8)} cm⁴)`);
          hud.set('b', `σ = M y / I: ${fmt(smax)} MPa at the top and bottom under M = ${fmt(state.M * kN)} kN·m`, smax < SY / 1e6 ? 'good' : 'bad');
          hud.set('c', 'stress grows linearly away from the neutral axis, and I weighs area by y²: put the material far out, in the flanges');
          const Ms = lin(0, 200e3, 50);
          plots.aux.draw({ xlim: [0, 200], cursor: state.M * kN, series: [{ x: Ms.map((m) => m * kN), y: Ms.map((m) => m * h2 / S.I / 1e6), color: '--c-I', label: 'outer-fibre stress (MPa) vs moment (kN·m)' }, { x: [0, 200], y: [SY / 1e6, SY / 1e6], color: '--c-north', label: 'yield' }] });
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
