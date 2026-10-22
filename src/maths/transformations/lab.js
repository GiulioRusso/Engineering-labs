// Working with functions: shifting, stretching and reflecting a graph; composing two functions; inverses
// and the horizontal-line test; polynomials built from their roots; rational functions and asymptotes.
import { createGraph2D, fnSegments, createDots } from '../../lib/viz/graph2d.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createKnob } from '../../lib/viz/knob.js';
import { BASE, transform, compose, poly, coeffs, rational } from './model.js';

const X = [-6, 6], Y = [-4.5, 4.5], fmt = (v) => (Number.isFinite(v) ? String(Number(v.toPrecision(3))) : '—');
const OPTS = Object.entries(BASE).map(([k, v]) => [k, v.label]);
const sup = (n) => String(n).split('').map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c] ?? c).join('');
const polyText = (c) => c.map((v, i) => { const p = c.length - 1 - i; if (Math.abs(v) < 1e-9) return ''; const s = v < 0 ? ' − ' : ' + ', m = Math.abs(v), co = m === 1 && p ? '' : fmt(m); return `${s}${co}${p ? `x${p > 1 ? sup(p) : ''}` : ''}`; }).join('').replace(/^ \+ /, '').replace(/^ − /, '−') || '0';

export default {
  id: 'transformations', title: 'Working with functions', size: 5, ortho: true, plain: true, timeless: true, cam: 'top',
  defaults: { base: 'sq', a: 1, b: 1, h: 0, k: 0, f: 'sq', g: 'lin', x0: 1, restrict: false, n: 3, r1: -2, r2: 0.5, r3: 2, r4: 3, pa: 0.5, nz: 1, z1: 1, z2: 3, np: 1, p1: -1, p2: 2, ra: 1 },
  cases: [
    { id: 'shift', label: 'Shift and stretch', set: {}, examples: [
      { id: 'right', label: 'f(x − 2): right by 2', controls: ['h'], set: { h: 2 } },
      { id: 'up', label: 'f(x) + 2: up by 2', controls: ['k'], set: { k: 2 } },
      { id: 'tall', label: '2 f(x): twice as tall', controls: ['a'], set: { a: 2 } },
      { id: 'flip', label: '−f(x): upside down', controls: ['a'], set: { a: -1 } },
      { id: 'squeeze', label: 'f(2x): squeezed sideways', controls: ['b'], set: { base: 'sin', b: 2 } },
      { id: 'mirror', label: 'f(−x): mirror left–right', controls: ['b'], set: { base: 'sqrt', b: -1 } },
    ] },
    { id: 'compose', label: 'Composition', set: {}, examples: [
      { id: 'order', label: '(x + 1)² vs x² + 1', controls: ['x0'], set: { f: 'sq', g: 'lin' } },
      { id: 'sin', label: 'sin(x²) vs (sin x)²', controls: ['x0'], set: { f: 'sin', g: 'sq' } },
      { id: 'undo', label: '√ after ²: |x|', controls: ['x0'], set: { f: 'sqrt', g: 'sq' } },
    ] },
    { id: 'inverse', label: 'Inverse', set: { f: 'cube' }, examples: [
      { id: 'exp', label: 'eˣ and ln x', controls: ['x0'], set: { f: 'exp', x0: 0.5 } },
      { id: 'square', label: 'x² fails the line test', controls: ['x0'], set: { f: 'sq', x0: 1.5, restrict: false } },
      { id: 'restrict', label: 'Keep x ≥ 0: now √', controls: ['restrict'], set: { f: 'sq', x0: 1.5, restrict: true } },
    ] },
    { id: 'polynomial', label: 'Polynomials', set: {}, examples: [
      { id: 'double', label: 'Double root: it touches', controls: ['r2'], set: { r2: -2 } },
      { id: 'neg', label: 'a < 0: ends flip', controls: ['pa'], set: { pa: -0.5 } },
      { id: 'quartic', label: 'Degree 4: both ends up', controls: ['n', 'r4'], set: { n: 4, pa: 0.25 } },
      { id: 'triple', label: 'Triple root: flat crossing', controls: ['r1', 'r2', 'r3'], set: { r1: 1, r2: 1, r3: 1, pa: 1 } },
    ] },
    { id: 'rational', label: 'Rational functions', set: {}, examples: [
      { id: 'recip', label: '1/x', controls: ['ra'], set: { nz: 0, np: 1, p1: 0, ra: 1 } },
      { id: 'two', label: '1/(x² − 1): two walls', controls: ['p1', 'p2'], set: { nz: 0, np: 2, p1: -1, p2: 1 } },
      { id: 'hole', label: 'Zero = pole: a hole', controls: ['z1', 'p1'], set: { nz: 1, np: 2, z1: 2, p1: -1, p2: 2 } },
      { id: 'slant', label: 'Degree up by one: slant asymptote', controls: ['z1', 'z2', 'p1'], set: { nz: 2, np: 1, z1: -2, z2: 1, p1: 0, ra: 0.5 } },
    ] },
  ],
  controls: [
    { title: 'Function', show: (s) => s.case === 'shift', items: [
      { id: 'base', label: 'Base f', type: 'select', options: OPTS },
      { id: 'a', label: 'a (vertical stretch)', unit: '', min: -3, max: 3, step: 0.05 }, { id: 'b', label: 'b (horizontal squeeze)', unit: '', min: -3, max: 3, step: 0.05 },
      { id: 'h', label: 'h (shift right)', unit: '', min: -4, max: 4, step: 0.05 }, { id: 'k', label: 'k (shift up)', unit: '', min: -3, max: 3, step: 0.05 },
    ] },
    { title: 'Functions', show: (s) => s.case === 'compose' || s.case === 'inverse', items: [
      { id: 'f', label: 'f', type: 'select', options: OPTS }, { id: 'g', label: 'g (applied first)', type: 'select', options: OPTS, show: (s) => s.case === 'compose' },
      { id: 'x0', label: 'Probe x', unit: '', min: -4, max: 4, step: 0.05 }, { id: 'restrict', label: 'Restrict to x ≥ 0', type: 'check', show: (s) => s.case === 'inverse' },
    ] },
    { title: 'Polynomial', show: (s) => s.case === 'polynomial', items: [
      { id: 'n', label: 'Degree', type: 'segmented', options: [[1, '1'], [2, '2'], [3, '3'], [4, '4']] }, { id: 'pa', label: 'Leading coefficient a', unit: '', min: -2, max: 2, step: 0.05 },
      { id: 'r1', label: 'Root 1', unit: '', min: -5, max: 5, step: 0.05 }, { id: 'r2', label: 'Root 2', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.n >= 2 },
      { id: 'r3', label: 'Root 3', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.n >= 3 }, { id: 'r4', label: 'Root 4', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.n >= 4 },
    ] },
    { title: 'Rational', show: (s) => s.case === 'rational', items: [
      { id: 'ra', label: 'Factor a', unit: '', min: -3, max: 3, step: 0.05 },
      { id: 'nz', label: 'Zeros on top', type: 'segmented', options: [[0, '0'], [1, '1'], [2, '2']] }, { id: 'z1', label: 'Zero 1', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.nz >= 1 }, { id: 'z2', label: 'Zero 2', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.nz >= 2 },
      { id: 'np', label: 'Poles below', type: 'segmented', options: [[1, '1'], [2, '2']] }, { id: 'p1', label: 'Pole 1', unit: '', min: -5, max: 5, step: 0.05 }, { id: 'p2', label: 'Pole 2', unit: '', min: -5, max: 5, step: 0.05, show: (s) => s.np >= 2 },
    ] },
  ],
  hud: [{ id: 'eq', label: 'f' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { scene, state, hud, handles, stage } = ctx;
    stage.controls.enableRotate = false;
    const graph = createGraph2D(stage, { x: X, y: Y });
    const main = createCurve(stage, { max: 1400, width: 3.2, color: '--c-B' }), second = createCurve(stage, { max: 1400, width: 2.6, color: '--c-I' });
    const ghost = createCurve(stage, { max: 1400, width: 1.6, color: '--c-ref', dashed: true }), ghost2 = createCurve(stage, { max: 1400, width: 1.6, color: '--c-v', dashed: true });
    const lines = createCurve(stage, { max: 20, width: 1.4, color: '--c-E', dashed: true }), probe = createCurve(stage, { max: 20, width: 1.4, color: '--accent' });
    const dots = createDots(scene, 8, { r: 0.07, color: '--c-E' }), knob = createKnob(scene, '--accent', 0.11), all = [main, second, ghost, ghost2, lines, probe];
    const cx = (v) => Math.max(-5.5, Math.min(5.5, v)), cy = (v) => Math.max(-4.2, Math.min(4.2, v));
    handles.add({ object: knob.group, axes: 'xy', hint: 'Drag me', get: () => knob.get(), set: ([x, y]) => {
      const c = state.case;
      if (c === 'shift') { state.h = cx(x); state.k = cy(y); } else if (c === 'compose' || c === 'inverse') state.x0 = Math.max(-4, Math.min(4, x));
      else if (c === 'polynomial') state.r1 = cx(x); else state.p1 = cx(x);
      ctx.requestUpdate(); ctx.panelSync();
    } });
    return {
      update() {
        const c = state.case; for (const o of all) o.object.visible = false; const pts = [];
        const show = (o, seg) => { o.segments(seg); o.object.visible = true; };
        if (c === 'shift') {
          const B = BASE[state.base], g = transform(B.f, state);
          show(ghost, fnSegments(B.f, X, Y)); show(main, fnSegments(g, X, Y)); knob.set([state.h, state.k, 0.02]);
          hud.set('eq', `${fmt(state.a)} · f(${fmt(state.b)}(x − ${fmt(state.h)})) + ${fmt(state.k)},  f(x) = ${B.label}`);
          hud.set('b', 'inside the brackets (b, h) acts on x: sideways, and backwards (x − 2 moves right)'); hud.set('c', 'outside (a, k) acts on y: up/down as you would expect');
        } else if (c === 'compose') {
          const f = BASE[state.f].f, g = BASE[state.g].f, fg = compose(f, g), gf = compose(g, f), x0 = state.x0;
          show(ghost, fnSegments(f, X, Y)); show(ghost2, fnSegments(g, X, Y)); show(main, fnSegments(fg, X, Y)); show(second, fnSegments(gf, X, Y));
          const y1 = g(x0), y2 = f(y1); knob.set([x0, 0, 0.02]);
          if (Number.isFinite(y1) && Number.isFinite(y2)) { show(probe, [x0, 0, 0.01, x0, cy(y1), 0.01, x0, cy(y1), 0.01, x0, cy(y2), 0.01]); pts.push({ p: [x0, cy(y1)], text: `g(x) = ${fmt(y1)}` }, { p: [x0, cy(y2)], text: `f(g(x)) = ${fmt(y2)}` }); }
          hud.set('eq', `f = ${BASE[state.f].label} (grey), g = ${BASE[state.g].label} (green dashed)`); hud.set('b', `blue: f(g(x)) — first g, then f;  orange: g(f(x))`);
          hud.set('c', `x = ${fmt(x0)} → g → ${fmt(y1)} → f → ${fmt(y2)};  the other order gives ${fmt(gf(x0))}`);
        } else if (c === 'inverse') {
          const B = BASE[state.f], dom = state.restrict ? (x) => (x >= 0 ? B.f(x) : NaN) : B.f, x0 = state.x0, y0 = dom(x0);
          show(main, fnSegments(dom, X, Y)); show(lines, [-4.5, -4.5, 0, 4.5, 4.5, 0]);
          const inv = state.restrict || ['cube', 'exp', 'lin', 'recip'].includes(state.f) || (state.f === 'sqrt') ? B.inv : null;
          if (inv) show(second, fnSegments(state.restrict && state.f === 'sq' ? (y) => (y >= 0 ? Math.sqrt(y) : NaN) : inv, X, Y));
          knob.set([x0, 0, 0.02]);
          if (Number.isFinite(y0)) { pts.push({ p: [x0, cy(y0)], text: `(${fmt(x0)}, ${fmt(y0)})` }, { p: [cy(y0), x0], text: `(${fmt(y0)}, ${fmt(x0)})` }); show(probe, [x0, y0, 0.01, y0, x0, 0.01, -6, y0, 0.01, 6, y0, 0.01]); }
          const hits = []; for (let i = 0; i < 2400; i++) { const a = -6 + 12 * i / 2400, b = a + 12 / 2400, fa = dom(a) - y0, fb = dom(b) - y0; if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb <= 0 && !(fa === 0 && i > 0)) hits.push(a); }
          hud.set('eq', `f = ${B.label}${state.restrict ? ', x ≥ 0' : ''}; mirror across y = x (dashed)`);
          hud.set('b', hits.length > 1 ? `the horizontal line y = ${fmt(y0)} hits the graph ${hits.length} times: no inverse ✗` : 'every horizontal line hits once: invertible ✓', hits.length > 1 ? 'bad' : 'good');
          hud.set('c', 'the inverse swaps input and output: (a, b) on f is (b, a) on f⁻¹');
        } else if (c === 'polynomial') {
          const R = [state.r1, state.r2, state.r3, state.r4].slice(0, state.n), P = poly(state.pa, R), C = coeffs(state.pa, R);
          show(main, fnSegments(P, X, Y)); knob.set([state.r1, 0, 0.02]);
          const mult = (r) => R.filter((q) => Math.abs(q - r) < 0.03).length; [...new Set(R.map((r) => r.toFixed(2)))].forEach((r) => pts.push({ p: [+r, 0], text: mult(+r) > 1 ? `×${mult(+r)}` : '' })); pts.push({ p: [0, cy(P(0))], text: `${fmt(P(0))}` });
          hud.set('eq', `${fmt(state.pa)}${R.map((r) => `(x ${r < 0 ? '+' : '−'} ${fmt(Math.abs(r))})`).join('')} = ${polyText(C)}`);
          hud.set('b', `degree ${state.n}, ${state.pa > 0 ? 'positive' : 'negative'} lead: ${state.n % 2 ? (state.pa > 0 ? 'down on the left, up on the right' : 'up on the left, down on the right') : (state.pa > 0 ? 'both ends up' : 'both ends down')}`);
          hud.set('c', 'odd multiplicity crosses the axis, even multiplicity bounces; at most n roots, at most n − 1 turns');
        } else {
          const Z = [state.z1, state.z2].slice(0, state.nz), Pp = [state.p1, state.p2].slice(0, state.np), Rf = rational(state.ra, Z, Pp);
          show(main, fnSegments(Rf.f, X, Y, { n: 1600 })); knob.set([state.p1, 0, 0.02]);
          const seg = []; for (const p of Rf.vertical) seg.push(p, Y[0], 0.001, p, Y[1], 0.001); if (Rf.horiz != null) seg.push(X[0], Rf.horiz, 0.001, X[1], Rf.horiz, 0.001); if (Rf.slant) seg.push(X[0], Rf.slant[0] * X[0] + Rf.slant[1], 0.001, X[1], Rf.slant[0] * X[1] + Rf.slant[1], 0.001); show(lines, seg);
          for (const hx of Rf.holes) { const yv = state.ra * Rf.zeros.reduce((p, z) => p * (hx - z), 1) / Rf.vertical.reduce((p, q) => p * (hx - q), 1); pts.push({ p: [hx, cy(yv)], text: 'hole' }); }
          for (const z of Rf.zeros) pts.push({ p: [z, 0], text: '' });
          hud.set('eq', `${fmt(state.ra)} ${Z.length ? Z.map((z) => `(x ${z < 0 ? '+' : '−'} ${fmt(Math.abs(z))})`).join('') : '1'} / ${Pp.map((p) => `(x ${p < 0 ? '+' : '−'} ${fmt(Math.abs(p))})`).join('')}`);
          hud.set('b', `vertical asymptotes at ${Rf.vertical.map(fmt).join(', ') || '—'} (where the bottom is 0)${Rf.holes.length ? `; hole at x = ${Rf.holes.map(fmt).join(', ')}` : ''}`);
          hud.set('c', Rf.horiz != null ? `far away it flattens to y = ${fmt(Rf.horiz)}` : Rf.slant ? `far away it follows the line y = ${fmt(Rf.slant[0])}x + ${fmt(Rf.slant[1])}` : 'top grows faster than the bottom: no horizontal asymptote');
        }
        dots.set(pts);
      },
      theme() { graph.theme(); for (const o of all) o.theme(); dots.theme(); knob.theme(); },
    };
  },
};
