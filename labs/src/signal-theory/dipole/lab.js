// The dipole antenna: the standing-wave current on the wire, E and H radiating in the E-plane, the
// Hertzian dipole's field lines pinching off into radiation, E- and H-plane patterns, the 3D pattern,
// the pattern as the length grows, input impedance and directivity against length, and the near and far
// field regions.
import * as THREE from 'three';
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { createPolar, dbToR } from '../../lib/viz/polar.js';
import { cssVar } from '../../lib/ui/theme.js';
import { K, current, F, Fmax, directivity, impedance, PSI, nearE, contours } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const TL = [-4.3, 0.55, 4.0, 2.0], TR = [0.55, 0.55, 4.0, 2.0], BL = [-4.3, -2.35, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0];
const SQL = [-4.3, -2.35, 4.2, 4.9], SQR = [0.35, -2.35, 4.2, 4.9], LEFT = [-4.3, -2.35, 2.6, 4.9], MID = [-0.9, -2.35, 5.45, 4.9];
const deg = Math.PI / 180, Ls = Array.from({ length: 291 }, (_, i) => 0.1 + i * 0.01);
const CACHE = {};
const sweepD = () => (CACHE.D ??= Ls.map((L) => directivity(L)));
const sweepZ = (a) => (CACHE[`Z${a}`] ??= Ls.map((L) => impedance(L, a)));

export default {
  id: 'dipole', title: 'Dipole antenna', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [6, -7.5, 5.5] } },
  camOf: (s) => (s.case === 'pattern3d' ? 'iso' : 'top'),
  defaults: { L: 0.5, part: 'full', rmax: 2, a: 0.001, floor: -30, span: 3 },
  cases: [
    { id: 'current', label: 'Current on the wire', set: {}, examples: [
      { id: 'short', label: 'Short dipole: triangular', controls: ['L'], set: { L: 0.1 } },
      { id: 'full', label: 'Full wave: null at the feed', controls: ['L'], set: { L: 1 } },
      { id: 'long', label: '1.5 λ: lobes in opposite phase', controls: ['L'], set: { L: 1.5 } },
    ] },
    { id: 'fields', label: 'E and H fields', set: {}, examples: [
      { id: 'long', label: '1.25 λ: side lobes in the field', controls: ['L'], set: { L: 1.25 } },
    ] },
    { id: 'hertz', label: 'Field lines detaching', set: {}, examples: [
      { id: 'bound', label: 'Bound term only: never escapes', controls: ['part'], set: { part: 'bound' } },
      { id: 'rad', label: 'Radiated term only', controls: ['part'], set: { part: 'radiated' } },
    ] },
    { id: 'planes', label: 'E- and H-plane', set: {}, examples: [
      { id: 'one', label: 'L = λ: narrower lobe', controls: ['L'], set: { L: 1 } },
      { id: 'tilt', label: 'L = 1.5 λ: lobes tilt', controls: ['L'], set: { L: 1.5 } },
    ] },
    { id: 'pattern3d', label: '3D pattern', set: {}, examples: [
      { id: 'one', label: 'L = λ', controls: ['L'], set: { L: 1 } },
      { id: 'multi', label: 'L = 2 λ: a cone of lobes', controls: ['L'], set: { L: 2 } },
    ] },
    { id: 'sweep', label: 'Pattern vs length', set: {}, examples: [
      { id: 'split', label: '1.25 λ: the lobe splits', controls: ['L'], set: { L: 1.25 } },
    ] },
    { id: 'impedance', label: 'Input impedance', set: {}, examples: [
      { id: 'res', label: 'Resonance at ≈ 0.48 λ', controls: ['L'], set: { L: 0.48 } },
      { id: 'thick', label: 'Thick wire: flatter reactance', controls: ['a'], set: { a: 0.008 } },
    ] },
    { id: 'directivity', label: 'Directivity', set: {}, examples: [
      { id: 'max', label: '1.25 λ: the maximum broadside gain', controls: ['L'], set: { L: 1.25 } },
    ] },
    { id: 'nearfar', label: 'Near and far field', set: { L: 1 }, examples: [
      { id: 'big', label: 'L = 2 λ: far field starts at 8 λ', controls: ['L', 'span'], set: { L: 2, span: 6 } },
    ] },
  ],
  controls: [
    { title: 'Dipole', items: [
      { id: 'L', label: 'Length L', unit: 'λ', min: 0.05, max: 3, step: 0.01 },
      { id: 'a', label: 'Wire radius a', unit: 'λ', min: 0.0002, max: 0.01, step: 0.0001, show: (s) => s.case === 'impedance' },
      { id: 'part', label: 'Field term', type: 'segmented', options: [['full', 'Full'], ['bound', 'Bound 1/r²'], ['radiated', 'Radiated 1/r']], show: (s) => s.case === 'hertz' },
      { id: 'rmax', label: 'View radius', unit: 'λ', min: 0.5, max: 4, step: 0.1, show: (s) => s.case === 'hertz' || s.case === 'fields' },
      { id: 'span', label: 'View radius', unit: 'λ', min: 1, max: 10, step: 0.5, show: (s) => s.case === 'nearfar' },
      { id: 'floor', label: 'Pattern floor', unit: 'dB', min: -50, max: -10, step: 5, show: (s) => ['planes', 'pattern3d', 'sweep'].includes(s.case) },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    const tl = createChart(ctx, { box: TL }), tr = createChart(ctx, { box: TR }), bl = createChart(ctx, { box: BL }), br = createChart(ctx, { box: BR });
    const sql = createChart(ctx, { box: SQL, grid: false }), sqr = createChart(ctx, { box: SQR, grid: false }), left = createChart(ctx, { box: LEFT }), mid = createChart(ctx, { box: MID });
    const polE = createPolar(ctx, { c: [-2.3, 0.95], R: 1.35, from: -180, to: 179.9 }), polH = createPolar(ctx, { c: [2.5, 0.95], R: 1.35, from: -180, to: 179.9 }), polS = createPolar(ctx, { c: [3.0, -0.1], R: 1.45, from: -180, to: 179.9 });
    const pbl = createChart(ctx, { box: [-4.3, -2.35, 4.0, 1.5] }), pbr = createChart(ctx, { box: [0.55, -2.35, 4.0, 1.5] });
    const lines = createCurve(stage, { max: 30000, width: 1.4, color: '--c-B' }), wire = createCurve(stage, { max: 200, width: 3, color: '--c-I' });
    const solid = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ color: cssVar('--c-B'), transparent: true, opacity: 0.85, side: THREE.DoubleSide })); solid.rotation.x = Math.PI / 2; scene.add(solid);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 12), new THREE.MeshLambertMaterial({ color: cssVar('--c-I') })); rod.rotation.x = Math.PI / 2; scene.add(rod);
    const all = [tl, tr, bl, br, sql, sqr, left, mid, pbl, pbr], pols = [polE, polH, polS];
    const patR = (L, th, floor) => dbToR(20 * Math.log10(Math.abs(F(L, th)) / Fmax(L) + 1e-9), -floor);

    return {
      changed() {
        const c = state.case; for (const k of all) k.show(false); for (const p of pols) p.show(false); lines.object.visible = c === 'hertz'; wire.object.visible = c === 'current'; solid.visible = rod.visible = c === 'pattern3d';
        const v3 = c === 'pattern3d'; stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        ({ current: [left, mid], fields: [sql, sqr], hertz: [sql, sqr], planes: [pbl, pbr], pattern3d: [], sweep: [sql], impedance: [tl, tr, bl, br], directivity: [tl, tr, bl, br], nearfar: [sql, sqr] })[c].forEach((k) => k.show(true));
        if (c === 'planes') { polE.show(true); polH.show(true); } if (c === 'sweep') polS.show(true);
        ctx.setDuration(['current', 'fields', 'hertz'].includes(c) ? 4 : 0);
      },
      update() {
        const c = state.case, L = state.L, wt = 2 * Math.PI * (time.t % 4) / 4;
        if (c === 'current') {
          const zs = Array.from({ length: 201 }, (_, i) => -L / 2 + L * i / 200), I = zs.map((z) => current(z, L)), m = Math.max(...I.map(Math.abs)), ph = Math.cos(wt);
          left.range([-1.3, 1.3], [-Math.max(0.8, L * 0.6), Math.max(0.8, L * 0.6)]); left.titles('', `the wire, L = ${L} λ`);
          const seg = []; zs.forEach((z, i) => { if (i % 4 === 0) seg.push(left.mx(0), left.my(z), 0.003, left.mx(I[i] / m * ph), left.my(z), 0.003); }); wire.segments(seg);
          left.line('w', [0, 0], [-L / 2, L / 2], { color: '--ink', width: 4 }); left.dots('feed', [0], [0], { color: '--c-north', size: 10 });
          mid.range([-Math.max(0.8, L * 0.6), Math.max(0.8, L * 0.6)], [-1.15, 1.15]); mid.titles('z (λ)', 'current I(z) = I₀ sin(k(L/2 − |z|)): envelope (dashed) and now (blue)');
          mid.line('env', zs, I.map((v) => v / m), { color: '--ink-dim', dashed: true, width: 1.2 }); mid.line('env2', zs, I.map((v) => -v / m), { color: '--ink-dim', dashed: true, width: 1.2 }); mid.line('now', zs, I.map((v) => v / m * ph), { color: '--c-B' });
          const I0 = current(0, L) / m;
          hud.set('a', `L = ${L} λ: ${fmt(2 * L)} half-wavelengths of standing wave`); hud.set('b', `feed current ${fmt(Math.abs(I0))} of the maximum${Math.abs(I0) < 0.05 ? ' — almost zero: very high impedance' : ''}`, Math.abs(I0) < 0.05 ? 'bad' : '');
          hud.set('c', L < 0.25 ? 'short: nearly triangular current, weak radiation' : L > 1 ? 'parts of the wire carry current in opposite directions' : 'one lobe of current: every part pushes the same way');
          plots.aux.draw({ xlim: [-L / 2, L / 2], series: [{ x: zs, y: I.map((v) => v / m), color: '--c-I', label: 'I(z)/I_max' }] });
        } else if (c === 'fields') {
          // far-field snapshot in the xz-plane: E_θ ∝ F(θ)/r sin(ωt − kr), H_φ = E_θ/η
          const R = state.rmax, n = 140, img = new Float64Array(n * n), m = Fmax(L);
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -R + 2 * R * i / (n - 1), z = -R + 2 * R * j / (n - 1), r = Math.hypot(x, z), th = Math.atan2(Math.abs(x), z); img[j * n + i] = r < 0.06 ? 0 : (F(L, th) / m) * Math.sin(wt - K * r) / Math.max(r, 0.15) * 0.3; }
          const ar = SQL[3] / SQL[2]; sql.range([-R, R], [-R * ar, R * ar]); sqr.range([-R, R], [-R * ar, R * ar]);
          sql.image('E', img, n, n, { map: 'field', norm: (v) => 0.5 + Math.max(-0.5, Math.min(0.5, v)) }); sql.titles('x (λ)', 'E_θ in the plane of the wire (± colours)');
          sqr.image('H', img.map((v, k) => v * ((k % n) < n / 2 ? -1 : 1)), n, n, { map: 'field', norm: (v) => 0.5 + Math.max(-0.5, Math.min(0.5, v)) }); sqr.titles('x (λ)', 'H: out of (+) / into (−) the page');
          sql.line('w', [0, 0], [-L / 2, L / 2], { color: '--c-I', width: 4 }); sqr.line('w', [0, 0], [-L / 2, L / 2], { color: '--c-I', width: 4 });
          hud.set('a', 'the wave leaves as expanding rings, strongest broadside, zero along the wire'); hud.set('b', `E and H in phase, |E|/|H| = η₀ = 377 Ω, both fall as 1/r`); hud.set('c', `L = ${L} λ`);
          plots.aux.draw({ xlim: [0, R], series: [{ x: Array.from({ length: 200 }, (_, i) => 0.05 + i * R / 200), y: Array.from({ length: 200 }, (_, i) => Math.sin(wt - K * (0.05 + i * R / 200)) / Math.max(0.15, 0.05 + i * R / 200) * 0.3), color: '--c-B', label: 'E along the broadside direction vs r (λ)' }] });
        } else if (c === 'hertz') {
          const R = state.rmax, n = 160, ar = SQR[3] / SQR[2], v = new Float64Array(n * n), fn = PSI[state.part];
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -R + 2 * R * i / (n - 1), z = -R * ar + 2 * R * ar * j / (n - 1), r = Math.hypot(x, z), u = K * r, th = Math.atan2(Math.abs(x), z); v[j * n + i] = r < 0.04 ? NaN : fn(u, th, wt); }
          sqr.range([-R, R], [-R * ar, R * ar]); sqr.titles('x (λ)', `E-field lines (${state.part}), ωt = ${fmt(wt * 180 / Math.PI, 3)}°`);
          const rr = Array.from({ length: 300 }, (_, i) => 0.03 + i * (R - 0.03) / 299); sql.range([0, R], [-3, 3]); sql.titles('r (λ), broadside', 'Ψ now: bound (orange), radiated (blue), full (green)');
          sql.line('b', rr, rr.map((r) => Math.max(-3, Math.min(3, PSI.bound(K * r, Math.PI / 2, wt)))), { color: '--c-I', width: 1.4 }); sql.line('r', rr, rr.map((r) => PSI.radiated(K * r, Math.PI / 2, wt)), { color: '--c-B', width: 1.4 }); sql.line('f', rr, rr.map((r) => Math.max(-3, Math.min(3, PSI.full(K * r, Math.PI / 2, wt)))), { color: '--c-v' }); sql.line('k', [1 / K, 1 / K], [-3, 3], { color: '--c-north', dashed: true, width: 1 });
          const lv = [-0.6, -0.35, -0.2, -0.1, -0.04, 0.04, 0.1, 0.2, 0.35, 0.6], seg = contours(v, n, n, [-R, R], [-R * ar, R * ar], lv), out = [];
          for (let q = 0; q < seg.length; q += 4) out.push(sqr.mx(seg[q]), sqr.my(seg[q + 1]), 0.003, sqr.mx(seg[q + 2]), sqr.my(seg[q + 3]), 0.003); lines.segments(out);
          sqr.line('rr', Array.from({ length: 121 }, (_, i) => Math.cos(2 * Math.PI * i / 120) / K), Array.from({ length: 121 }, (_, i) => Math.sin(2 * Math.PI * i / 120) / K), { color: '--c-north', dashed: true, width: 1 });
          hud.set('a', 'E_θ ∝ (1 + 1/jkr − 1/(kr)²) e^(−jkr) / r'); hud.set('b', state.part === 'bound' ? 'bound term alone: loops grow and shrink back into the source — no radiation' : state.part === 'radiated' ? 'radiated term alone: closed loops travelling outward' : 'full field: loops pinch off near r = λ/2π (red circle) and escape');
          hud.set('c', 'that pinch-off is radiation: energy that never comes back');
          const us = Array.from({ length: 200 }, (_, i) => 10 ** (-1 + 2 * i / 199)); plots.aux.draw({ xlim: [-1, 1], series: [{ x: us.map(Math.log10), y: us.map((u) => -Math.log10(u)), color: '--c-B', label: '1/kr' }, { x: us.map(Math.log10), y: us.map((u) => -2 * Math.log10(u)), color: '--c-I', label: '1/(kr)²' }, { x: us.map(Math.log10), y: us.map((u) => -3 * Math.log10(u)), color: '--c-north', label: '1/(kr)³ — log₁₀ term size vs log₁₀ kr' }] });
        } else if (c === 'planes') {
          const ths = Array.from({ length: 721 }, (_, i) => -180 + i * 0.5), fl = state.floor, m = Fmax(L), Fh = Math.abs(F(L, Math.PI / 2)) / m;
          polE.line('E', ths, ths.map((t) => patR(L, Math.abs(t) * deg, fl)), { color: '--c-B' }); polE.line('w', [0, 180], [0.15, 0.15], { color: '--c-I', width: 3 });
          polH.line('H', ths, ths.map(() => dbToR(20 * Math.log10(Fh + 1e-9), -fl)), { color: '--c-v' });
          const t2 = Array.from({ length: 181 }, (_, i) => i); pbl.range([0, 180], [fl, 2]); pbl.titles('θ from the wire (°)', 'E-plane pattern (dB)'); pbl.line('d', t2, t2.map((t) => Math.max(fl, 20 * Math.log10(Math.abs(F(L, t * deg)) / m + 1e-9))), { color: '--c-B' }); pbl.line('m3', [0, 180], [-3, -3], { color: '--c-north', dashed: true, width: 1 });
          let a = 90, b = 90; const pk = t2.reduce((q, t) => (Math.abs(F(L, t * deg)) > Math.abs(F(L, q * deg)) ? t : q), 90); for (let t = pk; t > 0; t -= 0.25) if (Math.abs(F(L, t * deg)) / m < Math.SQRT1_2) { a = t; break; } for (let t = pk; t < 180; t += 0.25) if (Math.abs(F(L, t * deg)) / m < Math.SQRT1_2) { b = t; break; }
          const D = directivity(L);
          pbr.range([0, 3], [0, 6]); pbr.titles('L (λ)', 'directivity (dBi) vs length'); pbr.line('D', Ls, sweepD().map((d) => 10 * Math.log10(d)), { color: '--c-E' }); pbr.dots('now', [L], [10 * Math.log10(D)], { color: '--accent', size: 11 });
          hud.set('a', `E-plane (left, wire vertical): ${L <= 1.1 ? 'two lobes broadside' : 'lobes off broadside'}; H-plane (right): a circle`); hud.set('b', `half-power beamwidth ${fmt(b - a)}° (main lobe at ${pk}°)`); hud.set('c', `D = ${fmt(D)} = ${fmt(10 * Math.log10(D))} dBi`);
          plots.aux.draw({ xlim: [0, 180], series: [{ x: t2, y: t2.map((t) => Math.abs(F(L, t * deg)) / m), color: '--c-B', label: '|F(θ)| normalised' }] });
        } else if (c === 'pattern3d') {
          const fl = state.floor, pts = []; for (let i = 0; i <= 180; i++) { const t = Math.PI * i / 180, r = 2.4 * patR(L, t, fl); pts.push(new THREE.Vector2(r * Math.sin(t), r * Math.cos(t))); }
          solid.geometry.dispose(); solid.geometry = new THREE.LatheGeometry(pts, 72); solid.geometry.computeVertexNormals(); rod.scale.set(1, Math.max(0.3, L * 1.2), 1);
          hud.set('a', `L = ${L} λ: the E-plane pattern revolved around the wire`); hud.set('b', `D = ${fmt(10 * Math.log10(directivity(L)))} dBi`); hud.set('c', 'drag to rotate: the doughnut has no lobe along the wire');
          const t2 = Array.from({ length: 181 }, (_, i) => i); plots.aux.draw({ xlim: [0, 180], series: [{ x: t2, y: t2.map((t) => Math.max(fl, 20 * Math.log10(Math.abs(F(L, t * deg)) / Fmax(L) + 1e-9))), color: '--c-B', label: 'E-plane pattern (dB) vs θ (°)' }] });
        } else if (c === 'sweep') {
          const nx = 146, ny = 91, img = new Float64Array(nx * ny), fl = state.floor;
          CACHE.sweep ??= (() => { const a = new Float64Array(nx * ny); for (let i = 0; i < nx; i++) { const LL = 0.1 + 2.9 * i / (nx - 1), m = Fmax(LL); for (let j = 0; j < ny; j++) a[j * nx + i] = 20 * Math.log10(Math.abs(F(LL, Math.PI * j / (ny - 1))) / m + 1e-9); } return a; })();
          for (let k = 0; k < nx * ny; k++) img[k] = CACHE.sweep[k];
          sql.range([0.1, 3], [0, 180]); sql.image('s', img, nx, ny, { map: 'magma', norm: (v) => Math.max(0, 1 + v / -fl) }); sql.titles('L (λ)', 'pattern in dB: θ from the wire (vertical) vs length'); sql.line('cur', [L, L], [0, 180], { color: '--c-v', width: 1.6 });
          const ths = Array.from({ length: 721 }, (_, i) => -180 + i * 0.5); polS.line('p', ths, ths.map((t) => patR(L, Math.abs(t) * deg, fl)), { color: '--c-v' });
          hud.set('a', `L = ${L} λ`); hud.set('b', L < 1.2 ? 'one main lobe broadside, narrowing as L grows' : 'past ≈ 1.25 λ the broadside lobe splits: current lobes start cancelling'); hud.set('c', 'bright = strong; each column is one pattern');
          plots.aux.draw({ xlim: [0.1, 3], cursor: L, series: [{ x: Ls, y: sweepD().map((d) => 10 * Math.log10(d)), color: '--c-E', label: 'directivity (dBi) vs L (λ)' }] });
        } else if (c === 'impedance') {
          const Z = sweepZ(state.a), z = impedance(L, state.a), R = Z.map((q) => Math.min(2000, q.R)), X = Z.map((q) => Math.max(-1500, Math.min(1500, q.X)));
          tl.range([0.1, 3], [0, 1000]); tl.titles('L (λ)', 'input resistance R_in (Ω)'); tl.line('R', Ls, R, { color: '--c-B' }); tl.dots('now', [L], [Math.min(1000, z.R)], { color: '--accent', size: 10 }); tl.line('73', [0.1, 3], [73, 73], { color: '--ink-dim', dashed: true, width: 1 });
          tr.range([0.1, 3], [-1000, 1000]); tr.titles('L (λ)', `input reactance X_in (Ω), a = ${state.a} λ`); tr.line('X', Ls, X, { color: '--c-I' }); tr.dots('now', [L], [Math.max(-1000, Math.min(1000, z.X))], { color: '--accent', size: 10 });
          const Zs = Ls.map((_, i) => [Z[i].R, Z[i].X]), G = Zs.map(([r, x]) => { const nr = r - 50, d = (r + 50) ** 2 + x * x; return Math.sqrt((nr * nr + x * x) / d); });
          bl.range([0.1, 3], [0, 1.05]); bl.titles('L (λ)', '|Γ| against a 50 Ω cable: 0 = all power accepted'); bl.line('g', Ls, G, { color: '--c-v' }); bl.dots('now', [L], [Math.sqrt(((z.R - 50) ** 2 + z.X ** 2) / ((z.R + 50) ** 2 + z.X ** 2))], { color: '--accent', size: 10 });
          br.range([0.1, 3], [0, 300]); br.titles('L (λ)', 'radiation resistance at the current maximum (Ω)'); br.line('Rm', Ls, Z.map((q) => q.Rm), { color: '--c-E' });
          hud.set('a', `Z_in = ${fmt(z.R)} ${z.X >= 0 ? '+' : '−'} j${fmt(Math.abs(z.X))} Ω`); hud.set('b', Math.abs(z.X) < 10 ? 'resonant: purely resistive ✓' : z.X < 0 ? 'too short: capacitive' : 'too long: inductive', Math.abs(z.X) < 10 ? 'good' : '');
          hud.set('c', L > 0.9 && L < 1.1 ? 'near L = λ the feed sits at a current null: R and X blow up' : 'resonances near 0.48 λ (series, ~70 Ω) and 0.95 λ (parallel, kΩ)');
          plots.aux.draw({ xlim: [0.1, 3], cursor: L, series: [{ x: Ls, y: R.map((v) => Math.min(v, 500)), color: '--c-B', label: 'R_in' }, { x: Ls, y: X.map((v) => Math.max(-500, Math.min(500, v))), color: '--c-I', label: 'X_in (Ω) vs L (λ)' }] });
        } else if (c === 'directivity') {
          const D = sweepD(), dn = directivity(L), hp = CACHE.hp ??= Ls.map((LL) => { const m = Fmax(LL); let pk = 90, best = 0; for (let t = 1; t < 180; t++) { const v = Math.abs(F(LL, t * deg)); if (v > best) { best = v; pk = t; } } let a = pk, b = pk; while (a > 0 && Math.abs(F(LL, a * deg)) / m >= Math.SQRT1_2) a -= 0.5; while (b < 180 && Math.abs(F(LL, b * deg)) / m >= Math.SQRT1_2) b += 0.5; return b - a; });
          tl.range([0.1, 3], [1, 4]); tl.titles('L (λ)', 'directivity D (linear)'); tl.line('D', Ls, D, { color: '--c-E' }); tl.dots('now', [L], [dn], { color: '--accent', size: 10 }); tl.line('15', [0.1, 3], [1.5, 1.5], { color: '--ink-dim', dashed: true, width: 1 });
          tr.range([0.1, 3], [0, 6]); tr.titles('L (λ)', 'directivity (dBi)'); tr.line('D', Ls, D.map((d) => 10 * Math.log10(d)), { color: '--c-E' }); tr.dots('now', [L], [10 * Math.log10(dn)], { color: '--accent', size: 10 });
          bl.range([0.1, 3], [0, 100]); bl.titles('L (λ)', 'half-power beamwidth of the main lobe (°)'); bl.line('h', Ls, hp, { color: '--c-B' });
          const t2 = Array.from({ length: 181 }, (_, i) => i); br.range([0, 180], [0, 1.05]); br.titles('θ (°)', `|F(θ)| at L = ${L} λ`); br.line('f', t2, t2.map((t) => Math.abs(F(L, t * deg)) / Fmax(L)), { color: '--c-B' });
          hud.set('a', `D = ${fmt(dn)} (${fmt(10 * Math.log10(dn))} dBi)`); hud.set('b', 'D = 4π U_max / P_rad: how much the peak beats an isotropic source'); hud.set('c', 'short 1.76 dBi · λ/2 2.15 dBi · 1.25 λ ≈ 5.2 dBi broadside');
          plots.aux.draw({ xlim: [0.1, 3], cursor: L, series: [{ x: Ls, y: D, color: '--c-E', label: 'D vs L (λ)' }] });
        } else {
          const R = state.span, n = 120, ar = SQL[3] / SQL[2], img = new Float64Array(n * n);
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -R + 2 * R * i / (n - 1), z = -R * ar + 2 * R * ar * j / (n - 1); img[j * n + i] = 20 * Math.log10(nearE(L, Math.abs(x) + 1e-3, z, 30) + 1e-9); }
          let mx = -Infinity; for (const v of img) if (Number.isFinite(v)) mx = Math.max(mx, v);
          sql.range([-R, R], [-R * ar, R * ar]); sql.image('n', img, n, n, { map: 'magma', norm: (v) => Math.max(0, Math.min(1, 1 + (v - mx) / 50)) }); sql.titles('x (λ)', '|E| (dB, 50 dB range): all three terms');
          const circ = (r) => [Array.from({ length: 121 }, (_, i) => r * Math.cos(2 * Math.PI * i / 120)), Array.from({ length: 121 }, (_, i) => r * Math.sin(2 * Math.PI * i / 120))];
          const r1 = 1 / K, rf = 2 * L * L; sql.line('c1', ...circ(r1), { color: '--c-v', dashed: true, width: 1.2 }); sql.line('c2', ...circ(Math.min(R * 2, rf)), { color: '--c-B', dashed: true, width: 1.2 }); sql.line('w', [0, 0], [-L / 2, L / 2], { color: '--c-I', width: 3 });
          const rs = Array.from({ length: 160 }, (_, i) => 10 ** (-1.5 + 2.5 * i / 159)), E = rs.map((r) => nearE(L, r, 0, 30));
          sqr.range([-1.5, 1], [-60, 40]); sqr.titles('log₁₀ r (λ), broadside', '|E| (dB): slope −60 dB/dec near, −20 far'); sqr.line('e', rs.map(Math.log10), E.map((v) => 20 * Math.log10(v)), { color: '--c-E' });
          sqr.line('a', [Math.log10(r1), Math.log10(r1)], [-60, 40], { color: '--c-v', dashed: true, width: 1 }); sqr.line('b', [Math.log10(rf), Math.log10(rf)], [-60, 40], { color: '--c-B', dashed: true, width: 1 });
          hud.set('a', `reactive near field inside λ/2π = ${fmt(r1)} λ (green): energy stored, 1/r³`); hud.set('b', `far field beyond 2D²/λ = ${fmt(rf)} λ (blue): pattern fixed, 1/r`); hud.set('c', 'in between (Fresnel): the pattern still changes with distance');
          plots.aux.draw({ xlim: [-1.5, 1], series: [{ x: rs.map(Math.log10), y: E.map((v) => 20 * Math.log10(v)), color: '--c-E', label: '|E| (dB) vs log₁₀ r' }] });
        }
      },
      theme() { for (const k of all) k.theme(); for (const p of pols) p.theme(); lines.theme(); wire.theme(); solid.material.color.set(cssVar('--c-B')); rod.material.color.set(cssVar('--c-I')); },
    };
  },
};
