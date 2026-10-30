// Inside one neuron: inputs, weights, bias, sum, activation, output, with every number shown; logic
// gates set by hand; the perceptron rule learning them (and failing on XOR).
import { createChart } from '../../lib/viz/chart.js';
import { ACTS, neuron, GATES, INPUTS, perceptron } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const sgn = (v) => (v < 0 ? `− ${fmt(-v)}` : `+ ${fmt(v)}`);
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], STEPS = 64, RATE = 4;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const AOPT = Object.entries(ACTS).map(([k, v]) => [k, v.label]), GOPT = Object.keys(GATES).map((k) => [k, k.toUpperCase()]);
const wcol = (w) => (w >= 0 ? '--c-B' : '--c-north'), wwid = (w) => (Math.abs(w) < 0.5 ? 1.4 : Math.abs(w) < 1.5 ? 3 : 5);

export default {
  id: 'neuron-anatomy', title: 'Inside a neuron', size: 4.4, ortho: true, plain: true, cam: 'top', duration: STEPS / RATE, loop: false,
  defaults: { x1: 0.8, x2: -0.4, x3: 0.5, w1: 1.2, w2: 0.75, w3: -0.5, b: 0.1, act: 'sigmoid', gate: 'and', eta: 0.5 },
  cases: [
    { id: 'anatomy', label: 'One neuron', controls: ['x1', 'x2', 'x3', 'w1', 'w2', 'w3', 'b', 'act'], set: { x1: 0.8, x2: -0.4, x3: 0.5, w1: 1.2, w2: 0.75, w3: -0.5, b: 0.1, act: 'sigmoid' }, examples: [
      { id: 'cancel', label: 'Two inputs cancel out', set: { x1: 1, x2: 1, x3: 0, w1: 1.5, w2: -1.5, b: 0 } },
      { id: 'saturate', label: 'Saturated: the slope vanishes', set: { w1: 3, w2: -3, w3: 2, b: 2 } },
      { id: 'dead', label: 'ReLU below zero: silent', set: { act: 'relu', b: -2 } },
      { id: 'linear', label: 'No activation: just a weighted sum', set: { act: 'linear' } },
    ] },
    { id: 'gates', label: 'Logic gates', controls: ['gate', 'w1', 'w2', 'b'], set: { gate: 'and', w1: 1, w2: 1, b: -1.5, act: 'step' }, examples: [
      { id: 'or', label: 'OR: lower the threshold', set: { gate: 'or', b: -0.5 } },
      { id: 'nand', label: 'NAND: flip every sign', set: { gate: 'nand', w1: -1, w2: -1, b: 1.5 } },
      { id: 'xor', label: 'XOR: no line works', set: { gate: 'xor', w1: 1, w2: 1, b: -0.5 } },
    ] },
    { id: 'learn', label: 'Perceptron learning', controls: ['gate', 'eta'], set: { gate: 'and', eta: 0.5, act: 'step' }, examples: [
      { id: 'or-learn', label: 'Learning OR', set: { gate: 'or' } },
      { id: 'xor-learn', label: 'XOR: it never settles', set: { gate: 'xor' } },
    ] },
  ],
  controls: [
    { title: 'Inputs', show: (s) => s.case === 'anatomy', items: [1, 2, 3].map((i) => ({ id: `x${i}`, label: `Input x${'₁₂₃'[i - 1]}`, unit: '', min: -2, max: 2, step: 0.05 })) },
    { title: 'Weights and bias', show: (s) => s.case !== 'learn', items: [
      ...[1, 2, 3].map((i) => ({ id: `w${i}`, label: `Weight w${'₁₂₃'[i - 1]}`, unit: '', min: -3, max: 3, step: 0.05, show: (s) => i < 3 || s.case === 'anatomy' })),
      { id: 'b', label: 'Bias b', unit: '', min: -3, max: 3, step: 0.05 },
      { id: 'act', label: 'Activation', type: 'select', options: AOPT, show: (s) => s.case === 'anatomy' },
    ] },
    { title: 'Gate', show: (s) => s.case !== 'anatomy', items: [
      { id: 'gate', label: 'Gate', type: 'segmented', options: GOPT },
      { id: 'eta', label: 'Learning rate η', unit: '', min: 0.05, max: 2, step: 0.05, show: (s) => s.case === 'learn' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 40 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, ch, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(ch ? ch.mx(x) : x, ch ? ch.my(y) : y, 0.02); l.visible = true; };
    let nk = 0; const keys = new Set();
    // colour and width are fixed when a curve is created: both go in the key
    const seg = (pts, o) => { const k = `g${nk++}${o.color}${o.dashed ? 'd' : ''}${o.width}`; keys.add(k); sq.line(k, pts.map((p) => p[0]), pts.map((p) => p[1]), o); };
    const circle = (cx, cy, r, o) => seg(lin(0, 2 * Math.PI, 33).map((a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]), o);
    let H = null;
    return {
      changed() {
        charts.forEach((c) => { c.clear(); c.show(false); c.show(true); });
        if (state.case === 'anatomy') sq.show(false);
        if (state.case === 'learn') H = perceptron(state.gate, state.eta, STEPS);
        ctx.setClock(state.case === 'learn' ? STEPS / RATE : 0);
      },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; }); nk = 0; keys.forEach((k) => sq.hide(k));
        const c = state.case;
        if (c === 'anatomy') {
          const x = [state.x1, state.x2, state.x3], w = [state.w1, state.w2, state.w3], N = neuron(x, w, state.b, state.act), A = ACTS[state.act];
          sq.range([0, 10], [0, 10]);
          const S = [5.4, 5], ys = [8.2, 5, 1.8];
          ys.forEach((y, i) => {
            seg([[1.7, y], [S[0] - 0.85, S[1] + (y - 5) * 0.25]], { color: wcol(w[i]), width: wwid(w[i]) });
            circle(1.2, y, 0.5, { color: '--ink', width: 2 }); text(`x${'₁₂₃'[i]} = ${fmt(x[i])}`, sq, 1.2, y + 0.85);
            text(`w = ${fmt(w[i])}`, sq, 3.3, y - 0.05 + (5 - y) * 0.2 + 0.45); text(`→ ${fmt(N.parts[i])}`, sq, 3.5, y + (5 - y) * 0.2 - 0.45);
          });
          seg([[S[0], 8.9], [S[0], S[1] + 0.9]], { color: wcol(state.b), width: wwid(state.b) }); circle(S[0], 9.3, 0.35, { color: '--ink-dim', width: 1.5 });
          text(`bias b = ${fmt(state.b)}`, sq, S[0] + 1.6, 9.3);
          circle(S[0], S[1], 0.9, { color: '--c-E', width: 3 }); text('Σ', sq, S[0], S[1] + 0.15); text(`z = ${fmt(N.z)}`, sq, S[0], S[1] - 1.3);
          seg([[S[0] + 0.9, S[1]], [7.0, S[1]]], { color: '--ink', width: 2 });
          // activation box with its curve and the current point
          seg([[7, 4], [8.6, 4], [8.6, 6], [7, 6], [7, 4]], { color: '--c-F', width: 2 });
          const zs = lin(-4, 4, 41), fy = (v) => { const r = state.act === 'relu' || state.act === 'linear' ? Math.max(-1, Math.min(1, v / 4)) : state.act === 'tanh' ? v : 2 * v - 1; return 5 + 0.8 * r; };
          seg(zs.map((v) => [7.8 + v * 0.18, fy(A.f(v))]), { color: '--c-F', width: 1.6 });
          sq.dots('az', [7.8 + Math.max(-4, Math.min(4, N.z)) * 0.18], [fy(A.f(Math.max(-4, Math.min(4, N.z))))], { color: '--accent', size: 10 });
          text(A.label, sq, 7.8, 6.45);
          seg([[8.6, S[1]], [9.0, S[1]]], { color: '--ink', width: 2 }); circle(9.4, S[1], 0.4, { color: '--c-v', width: 3 }); text(`y = ${fmt(N.y)}`, sq, 9.2, S[1] - 1);
          // contributions to z
          const v = [...N.parts, state.b, N.z], m = Math.max(1, ...v.map(Math.abs)) * 1.2;
          tr.range([0.4, 5.6], [-m, m]); tr.titles('', 'contributions to z: w₁x₁, w₂x₂, w₃x₃, bias, total z');
          v.forEach((q, i) => { const k = q >= 0 ? 'p' : 'n'; tr.stems(`s${i}${k}`, [i + 1], [q], { color: i === 4 ? '--c-E' : q >= 0 ? '--c-B' : '--c-north', width: 12 }); tr.hide(`s${i}${k === 'p' ? 'n' : 'p'}`); });
          ['w₁x₁', 'w₂x₂', 'w₃x₃', 'b', 'z'].forEach((t, i) => text(t, null, tr.mx(i + 1), TR[1] - 0.18));
          const zz = lin(-6, 6, 241), fmax = state.act === 'relu' || state.act === 'linear' ? 6 : 1.1, fmin = state.act === 'tanh' || state.act === 'linear' ? -fmax : -0.1;
          br.range([-6, 6], [fmin, fmax]); br.titles('z', `${A.label}: y = f(z) (solid), slope f′(z) (dashed)`);
          br.line('f', zz, zz.map(A.f), { color: '--c-F', width: 2.2 }); br.line('d', zz, zz.map(A.d), { color: '--ink-dim', dashed: true, width: 1.2 });
          br.dots('q', [Math.max(-6, Math.min(6, N.z))], [N.y], { color: '--accent', size: 11 });
          const xs = lin(-2, 2, 121);
          plots.aux.draw({ xlim: [-2, 2], cursor: state.x1, series: [{ x: xs, y: xs.map((q) => neuron([q, x[1], x[2]], w, state.b, state.act).y), color: '--c-v', label: 'output y as x₁ varies (the other inputs fixed)' }] });
          hud.set('a', `z = w₁x₁ + w₂x₂ + w₃x₃ + b = ${fmt(N.parts[0])} ${sgn(N.parts[1])} ${sgn(N.parts[2])} ${sgn(state.b)} = ${fmt(N.z)}`);
          hud.set('b', `y = ${A.label}(z) = ${fmt(N.y)}`);
          hud.set('c', state.act === 'step' ? 'step: fires (1) or not (0); no slope, so it cannot be trained by gradients' : `slope f′(z) = ${fmt(N.slope)}: how much y moves per unit of z — ${N.slope < 0.02 ? 'almost none: saturated, learning stalls' : 'gradients pass through'}`, N.slope < 0.02 && state.act !== 'step' ? 'bad' : '');
        } else {
          const T = GATES[state.gate], k = c === 'learn' ? Math.min(STEPS - 1, Math.floor(time.t * RATE)) : 0;
          const w = c === 'learn' ? H[k].w : [state.w1, state.w2], b = c === 'learn' ? H[k].b : state.b, out = INPUTS.map((x) => neuron(x, w, b, 'step'));
          sq.range([-0.6, 1.6], [-0.6, 1.6]); sq.titles('x₁', 'x₂');
          const n = 60, val = new Float64Array(n * n);
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) val[j * n + i] = w[0] * (-0.6 + 2.2 * (i + 0.5) / n) + w[1] * (-0.6 + 2.2 * (j + 0.5) / n) + b >= 0 ? 1 : 0;
          sq.image('fire', val, n, n, { rgb: (q, o) => { const f = val[q]; o[0] = 0.13 + 0.25 * f; o[1] = 0.15 + 0.2 * f; o[2] = 0.22 - 0.05 * f; } });
          // the line w₁x₁ + w₂x₂ + b = 0, sampled and kept inside the plot
          const L = []; for (const t of lin(-3, 3, 241)) { const nn = Math.hypot(w[0], w[1]) || 1e-9, px = -b * w[0] / nn ** 2 + (-w[1] / nn) * t, py = -b * w[1] / nn ** 2 + (w[0] / nn) * t; if (Math.abs(px - 0.5) <= 1.1 && Math.abs(py - 0.5) <= 1.1) L.push([px, py]); }
          if (L.length > 1 && (w[0] || w[1])) seg(L, { color: '--c-I', width: 2.4 });
          const bad = INPUTS.filter((_, i) => out[i].y !== T[i]);
          sq.dots('bad', bad.map((p) => p[0]), bad.map((p) => p[1]), { color: '--c-north', size: 26 });
          sq.dots('t1', INPUTS.filter((_, i) => T[i]).map((p) => p[0]), INPUTS.filter((_, i) => T[i]).map((p) => p[1]), { color: '--c-E', size: 16 });
          sq.dots('t0', INPUTS.filter((_, i) => !T[i]).map((p) => p[0]), INPUTS.filter((_, i) => !T[i]).map((p) => p[1]), { color: '--c-B', size: 16 });
          if (c === 'learn') sq.dots('cur', [INPUTS[H[k].i][0]], [INPUTS[H[k].i][1]], { color: '--accent', size: 9 }); else sq.dots('cur', [], []);
          // truth table
          tr.range([0, 1], [0, 1]); tr.titles('', `${state.gate.toUpperCase()}: truth table`); tr.show(false);
          const row = (cells, y) => cells.forEach((t, i) => text(t, null, TR[0] + TR[2] * (0.1 + 0.2 * i), TR[1] + TR[3] * y));
          row(['x₁', 'x₂', 'target', 'z', 'neuron'], 0.88);
          INPUTS.forEach((x, i) => row([x[0], x[1], T[i], fmt(out[i].z), `${out[i].y} ${out[i].y === T[i] ? '✓' : '✗'}`].map(String), 0.68 - 0.18 * i));
          if (c === 'learn') {
            const ks = H.map((_, q) => q / RATE);
            br.range([0, STEPS / RATE], [-3, 3]); br.titles('time (one example every ¼ s)', 'w₁ (blue), w₂ (orange), b (gold)');
            br.line('w1', ks, H.map((h) => h.w[0]), { color: '--c-B', width: 1.8 }); br.line('w2', ks, H.map((h) => h.w[1]), { color: '--c-I', width: 1.8 }); br.line('bb', ks, H.map((h) => h.b), { color: '--c-E', width: 1.8 });
            br.line('now', [k / RATE, k / RATE], [-3, 3], { color: '--accent', dashed: true, width: 1 });
            plots.aux.draw({ xlim: [0, STEPS / RATE], cursor: k / RATE, ylim: [0, 4], series: [{ x: ks, y: H.map((h) => h.errors), color: '--c-north', label: 'examples it gets wrong (of 4)' }] });
            const h = H[k];
            hud.set('a', `example (${INPUTS[h.i]}), target ${T[h.i]}: the neuron says ${out[h.i].y} — ${h.wrong ? `wrong, so w += η(t − y)x: η = ${fmt(state.eta)}` : 'right, no change'}`, h.wrong ? 'bad' : 'good');
            hud.set('b', `w = (${fmt(h.w[0])}, ${fmt(h.w[1])}), b = ${fmt(h.b)}: ${h.errors} of 4 wrong`);
            hud.set('c', state.gate === 'xor' ? 'XOR is not linearly separable: the rule keeps fixing one corner and breaking another, for ever' : 'Rosenblatt (1958): if a separating line exists, this rule is guaranteed to find one');
          } else {
            br.range([0.4, 4.6], [-3, 3]); br.titles('', 'z = w₁x₁ + w₂x₂ + b at the four inputs: fires when z ≥ 0');
            INPUTS.forEach((_, i) => { br.stems(`z${i}${T[i]}`, [i + 1], [out[i].z], { color: T[i] ? '--c-E' : '--c-B', width: 12 }); br.hide(`z${i}${1 - T[i]}`); });
            INPUTS.forEach((x, i) => text(`(${x})`, null, br.mx(i + 1), BR[1] - 0.18));
            plots.aux.draw({ xlim: [-3, 3], cursor: b, ylim: [0, 4], series: [{ x: lin(-3, 3, 121), y: lin(-3, 3, 121).map((q) => INPUTS.filter((x, i) => neuron(x, w, q, 'step').y !== T[i]).length), color: '--c-north', label: 'wrong outputs (of 4) as the bias b varies' }] });
            hud.set('a', `the neuron fires where w₁x₁ + w₂x₂ + b ≥ 0: the shaded half-plane, edge = the orange line`);
            hud.set('b', `${4 - bad.length} of 4 right${bad.length ? ` — red rings mark the wrong ones` : ' ✓'}`, bad.length ? 'bad' : 'good');
            hud.set('c', state.gate === 'xor' ? 'XOR needs (0,1) and (1,0) on one side, (0,0) and (1,1) on the other: no single line does that' : 'a gate is a threshold: weights set the direction of the line, the bias where it sits');
          }
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
