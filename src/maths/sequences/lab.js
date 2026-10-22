// Sequences and series: a staircase of partial sums climbing (or not) towards its limit, with an ε band.
import * as THREE from 'three';
import { createCurve } from '../../lib/viz/curve.js';
import { niceStep } from '../../lib/viz/graph2d.js';
import { sequence, settleIndex } from './model.js';

const W = 9, H = 5, X0 = -4.5, Y0 = -2.5; // plot box in world units
const fmt = (v) => (v == null || !Number.isFinite(v) ? '—' : String(Number(v.toPrecision(6))));

export default {
  id: 'sequences', title: 'Sequences and series', size: 5, ortho: true, plain: true, cam: 'top', loop: false,
  defaults: { kind: 'geometric', a: 1, r: 0.5, p: 2, N: 20, eps: 0.05, band: true, steps: true },
  cases: [
    { id: 'geometric', label: 'Geometric', set: {}, examples: [
      { id: 'neg', label: 'r = −½: zig-zag to ⅔', set: { r: -0.5 } },
      { id: 'slow', label: 'r = 0.9: slow', set: { r: 0.9, N: 80 } },
      { id: 'one', label: 'r = 1: grows forever', set: { r: 1 } },
      { id: 'diverge', label: 'r = 1.1: explodes', set: { r: 1.1 } },
    ] },
    { id: 'pseries', label: '1/nᵖ', set: { kind: 'pseries', N: 60 }, examples: [
      { id: 'harmonic', label: 'p = 1: diverges, slowly', set: { p: 1, N: 200 } },
      { id: 'p4', label: 'p = 4: fast', set: { p: 4 } },
      { id: 'half', label: 'p = ½: diverges faster', set: { p: 0.5 } },
    ] },
    { id: 'alternating', label: 'Alternating', set: { kind: 'alternating', N: 60 }, examples: [
      { id: 'leibniz', label: 'Leibniz: π from odd numbers', set: { kind: 'leibniz', N: 100 } },
      { id: 'tight', label: 'Smaller ε: more terms', set: { eps: 0.01, N: 120 } },
    ] },
    { id: 'limit', label: 'Limit of a sequence', set: { kind: 'euler', N: 60 }, examples: [
      { id: 'eps', label: 'Shrink ε: N grows', set: { eps: 0.005, N: 400 } },
    ] },
  ],
  controls: [
    { title: 'Terms', items: [
      { id: 'a', label: 'First term a', unit: '', min: -3, max: 3, step: 0.05, show: (s) => s.kind === 'geometric' },
      { id: 'r', label: 'Ratio r', unit: '', min: -1.2, max: 1.2, step: 0.01, show: (s) => s.kind === 'geometric' },
      { id: 'p', label: 'Power p', unit: '', min: 0.3, max: 4, step: 0.05, show: (s) => s.kind === 'pseries' },
      { id: 'N', label: 'Number of terms', unit: '', min: 5, max: 400, step: 1, log: true },
      { id: 'eps', label: 'Tolerance ε', unit: '', min: 0.001, max: 0.5, log: true },
    ] },
  ],
  display: [{ title: 'Show', items: [
    { id: 'band', label: 'ε band around the limit', type: 'check', color: '--c-E' },
    { id: 'steps', label: 'Each term as a step', type: 'check', color: '--c-F' },
  ] }],
  plots: [{ id: 'err', title: 'Distance from the limit', xLabel: 'n', xUnit: '', yUnit: '' }],
  hud: [{ id: 'n', label: 'n' }, { id: 'an', label: 'aₙ' }, { id: 'Sn', label: 'value' }, { id: 'L', label: 'limit' }, 'sep', { id: 'Ne', label: 'inside ε from n =' }],

  setup(ctx) {
    const { scene, state, time, hud, plots, stage } = ctx;
    stage.controls.enableRotate = false;
    const axes = createCurve(stage, { max: 4, width: 1.4, color: '--ink-dim' });
    const ticks = createCurve(stage, { max: 40, width: 1, color: '--line' });
    const lim = createCurve(stage, { max: 1, width: 1.6, color: '--c-E', dashed: true });
    const band = createCurve(stage, { max: 2, width: 1, color: '--c-E', dashed: true });
    const steps = createCurve(stage, { max: 900, width: 3.4, color: '--c-F' });
    const path = createCurve(stage, { max: 900, width: 1.2, color: '--c-ref' });
    const bandFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1, depthWrite: false }));
    scene.add(bandFill);
    const dots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 7, sizeAttenuation: false }));
    dots.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3)); dots.frustumCulled = false; scene.add(dots);
    const now = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), new THREE.MeshBasicMaterial()); scene.add(now);
    const tl = []; for (let i = 0; i < 16; i++) { const l = ctx.label('', 'tick'); scene.add(l); tl.push(l); }
    const limLabel = ctx.label(''); scene.add(limLabel);
    let Q = null, lo = 0, hi = 1, D = 3;
    const X = (n) => X0 + W * n / state.N, Y = (v) => Y0 + H * (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo);

    function configure() {
      Q = sequence(state, state.N);
      const vals = [...Q.S, ...(Q.series ? Q.a : []), 0]; if (Q.limit != null) vals.push(Q.limit);
      lo = Math.min(...vals); hi = Math.max(...vals); const pad = (hi - lo || 1) * 0.08; lo -= pad; hi += pad;
      axes.segments([X0, Y(0), 0, X0 + W, Y(0), 0, X0, Y0, 0, X0, Y0 + H, 0]);
      const st = niceStep(hi - lo, 5), t = [], nst = niceStep(state.N, 5); let k = 0;
      for (const l of tl) l.visible = false;
      for (let v = Math.ceil(lo / st) * st; v <= hi && k < 8; v += st, k++) { t.push(X0, Y(v), 0, X0 + W, Y(v), 0); tl[k].element.textContent = fmt(v); tl[k].position.set(X0 - 0.3, Y(v), 0); tl[k].visible = true; }
      for (let n = nst; n <= state.N && k < 16; n += nst, k++) { tl[k].element.textContent = String(n); tl[k].position.set(X(n), Y(0) - 0.22, 0); tl[k].visible = true; }
      ticks.segments(t);
      D = Math.min(12, 0.15 * state.N + 1); ctx.setDuration(D);
    }

    return {
      changed() { configure(); },
      update() {
        const m = Math.max(1, Math.min(state.N, Math.ceil(time.t / (D - 0.5) * state.N))), L = Q.limit;
        lim.object.visible = limLabel.visible = L != null;
        const showBand = L != null && state.band;
        band.object.visible = bandFill.visible = showBand;
        if (L != null) { lim.segments([X0, Y(L), 0.001, X0 + W, Y(L), 0.001]); limLabel.element.textContent = `limit ${fmt(L)}`; limLabel.position.set(X0 + W + 0.55, Y(L), 0); }
        if (showBand) {
          band.segments([X0, Y(L + state.eps), 0, X0 + W, Y(L + state.eps), 0, X0, Y(L - state.eps), 0, X0 + W, Y(L - state.eps), 0]);
          const h = Math.max(0.005, Y(L + state.eps) - Y(L - state.eps)); bandFill.scale.set(W, h, 1); bandFill.position.set(X0 + W / 2, (Y(L + state.eps) + Y(L - state.eps)) / 2, -0.001);
        }
        const P = dots.geometry.attributes.position, st = [], pa = [];
        for (let i = 0; i < 400; i++) {
          if (i < m) {
            P.setXYZ(i, X(i + 1), Y(Q.S[i]), 0.002); pa.push(X(i + 1), Y(Q.S[i]), 0.001);
            if (Q.series && state.steps) st.push(X(i + 1), Y(i ? Q.S[i - 1] : 0), 0.0015, X(i + 1), Y(Q.S[i]), 0.0015);
          } else P.setXYZ(i, 0, 0, -50);
        }
        P.needsUpdate = true; dots.geometry.setDrawRange(0, m);
        steps.object.visible = Q.series && state.steps; if (st.length) steps.segments(st); else steps.segments([]);
        path.set(pa);
        now.position.set(X(m), Y(Q.S[m - 1]), 0.003);
        const Ne = showBand ? settleIndex(Q.S, L, state.eps) : null;
        hud.set('n', String(m)); hud.set('an', fmt(Q.a[m - 1])); hud.set('Sn', `${Q.series ? 'Sₙ' : 'aₙ'} = ${fmt(Q.S[m - 1])}`);
        hud.set('L', L == null ? 'none: diverges' : fmt(L));
        hud.set('Ne', L == null ? '—' : Ne == null ? `not within ${state.N} terms` : String(Ne), Ne != null ? 'good' : '');
        const xs = [], ys = [];
        if (L != null) for (let i = 0; i < state.N; i++) { const e = Math.abs(Q.S[i] - L); xs.push(i + 1); ys.push(e > 0 ? Math.log10(e) : NaN); }
        plots.err.draw({ xlim: [1, state.N], cursor: m, series: L != null ? [{ x: xs, y: ys, color: '--c-B', label: 'log₁₀ |value − limit|' }, { x: [1, state.N], y: [Math.log10(state.eps), Math.log10(state.eps)], color: '--c-E', dash: [4, 3], label: 'log₁₀ ε' }] : [] });
      },
      theme() {
        for (const c of [axes, ticks, lim, band, steps, path]) c.theme();
        bandFill.material.color.set(ctx.cssVar('--c-E')); dots.material.color.set(ctx.cssVar('--c-B')); now.material.color.set(ctx.cssVar('--accent'));
      },
    };
  },
};
