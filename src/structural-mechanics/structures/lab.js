// Structures: a truss with every member coloured by its force (blue tension, red compression) and the
// influence line as the load moves; torsion across a solid or hollow shaft; the stress field around a hole
// with its concentration factor and what it does to fatigue life; and a propped cantilever.
import { createChart } from '../../lib/viz/chart.js';
import { rect } from '../../probability/core/draw.js';
import { makeTruss, solveTruss, torsion, kirsch, ktEllipse, life, snCurve, SN, propped } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : '∞');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const MAT = { steel: { label: 'Steel (G = 80 GPa)', G: 80e9 }, alu: { label: 'Aluminium (G = 26 GPa)', G: 26e9 } };

export default {
  id: 'structures', title: 'Structures', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 0, loop: false,
  defaults: { tt: 'pratt', np: 4, lj: 2, P: 10, T: 500, ro: 20, rr: 0, Lsh: 1, mat: 'steel', sig: 100, ab: 1, ltype: 'w', w: 10, Pb: 20, ab2: 2 },
  cases: [
    { id: 'truss', label: 'Trusses', set: {}, examples: [
      { id: 'howe', label: 'Howe: the diagonals swap sign', controls: ['tt'], set: { tt: 'howe' } },
      { id: 'edge', label: 'Load near a support', controls: ['lj'], set: { lj: 1 } },
      { id: 'warren', label: 'Warren: no verticals', controls: ['tt'], set: { tt: 'warren' } },
    ] },
    { id: 'torsion', label: 'Torsion', set: {}, examples: [
      { id: 'hollow', label: 'Hollow tube, same mass', controls: ['rr'], set: { rr: 0.7, ro: 28 } },
      { id: 'alu', label: 'Aluminium: three times the twist', controls: ['mat'], set: { mat: 'alu' } },
    ] },
    { id: 'hole', label: 'Holes and fatigue', set: {}, examples: [
      { id: 'crack', label: 'A slit across the load: Kt = 11', controls: ['ab'], set: { ab: 5 } },
      { id: 'safe', label: 'Low stress: below the endurance limit even with the hole', controls: ['sig'], set: { sig: 70 } },
    ] },
    { id: 'propped', label: 'Propped cantilever', set: {}, examples: [
      { id: 'point', label: 'A point load at midspan: R = 5P/16', controls: ['ab2'], set: { ltype: 'P', ab2: 2 } },
    ] },
  ],
  controls: [
    { title: 'Truss (span 8 m, height 2 m)', show: (s) => s.case === 'truss', items: [
      { id: 'tt', label: 'Type', type: 'segmented', options: [['pratt', 'Pratt'], ['howe', 'Howe'], ['warren', 'Warren']] },
      { id: 'np', label: 'Panels', unit: '', min: 2, max: 8, step: 2 }, { id: 'lj', label: 'Loaded bottom joint', unit: '', min: 1, max: 7, step: 1 }, { id: 'P', label: 'Load', unit: 'kN', min: 1, max: 50, step: 1 },
    ] },
    { title: 'Shaft', show: (s) => s.case === 'torsion', items: [
      { id: 'T', label: 'Torque', unit: 'N·m', min: 10, max: 3000, log: true }, { id: 'ro', label: 'Outer radius', unit: 'mm', min: 5, max: 50, step: 0.5 },
      { id: 'rr', label: 'Inner ÷ outer radius', unit: '', min: 0, max: 0.95, step: 0.01 }, { id: 'Lsh', label: 'Length', unit: 'm', min: 0.1, max: 5, step: 0.05 },
      { id: 'mat', label: 'Material', type: 'select', options: Object.entries(MAT).map(([k, v]) => [k, v.label]) },
    ] },
    { title: 'Plate with a hole', show: (s) => s.case === 'hole', items: [
      { id: 'sig', label: 'Remote stress amplitude σ', unit: 'MPa', min: 10, max: 400, step: 1 },
      { id: 'ab', label: 'Hole: width across ÷ length along the load', unit: '', min: 0.2, max: 10, log: true, hint: '1 is a circle; large values are a slit across the load' },
    ] },
    { title: 'Beam (L = 4 m, fixed at the left, roller at the right)', show: (s) => s.case === 'propped', items: [
      { id: 'ltype', label: 'Load', type: 'segmented', options: [['w', 'Uniform'], ['P', 'Point']] },
      { id: 'w', label: 'Uniform load', unit: 'kN/m', min: 1, max: 50, step: 0.5, show: (s) => s.ltype === 'w' }, { id: 'Pb', label: 'Point load', unit: 'kN', min: 1, max: 100, step: 1, show: (s) => s.ltype === 'P' },
      { id: 'ab2', label: 'Point load position', unit: 'm', min: 0.1, max: 3.9, step: 0.05, show: (s) => s.ltype === 'P' },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), bare = createChart(ctx, { box: SQ, xTicks: false, yTicks: false, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), all = [sq, bare, tr, br];
    const pool = Array.from({ length: 40 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; });
    let used = 0; const put = (t, x, y) => { const l = pool[used++]; if (!l) return; l.element.textContent = t; l.position.set(x, y, 0.02); l.visible = true; };

    function trussCase() {
      const n = Math.round(state.np), T = makeTruss(state.tt, n, 8, 2), lj = Math.min(n - 1, Math.max(1, Math.round(state.lj))), P = state.P * 1e3, S = solveTruss(T, { [lj]: [0, -P] }), fm = Math.max(...S.f.map(Math.abs)), ar = SQ[2] / SQ[3];
      bare.range([4 - 3.2 * ar, 4 + 3.2 * ar], [-1.6, 4.8]); bare.titles('', ': members: blue = tension, red = compression, thickness ∝ force (kN)');
      T.M.forEach(([p, q], k) => { const f = S.f[k], wd = 1 + Math.round(6 * Math.abs(f) / fm), c = Math.abs(f) < 1e-6 * fm ? '--ink-dim' : f > 0 ? '--c-B' : '--c-north';
        bare.line(`m${k}w${wd}${c}`, [T.J[p][0], T.J[q][0]], [T.J[p][1], T.J[q][1]], { color: c, width: wd }); put(fmt(f / 1e3, 3), bare.mx((T.J[p][0] + T.J[q][0]) / 2), bare.my((T.J[p][1] + T.J[q][1]) / 2) + 0.12); });
      bare.dots('j', T.J.map((j) => j[0]), T.J.map((j) => j[1]), { color: '--ink', size: 8 });
      bare.line('pin', [-0.3, 0, 0.3, -0.3], [-0.45, 0, -0.45, -0.45], { color: '--ink', width: 1.6 }); bare.line('rol', [7.7, 8, 8.3, 7.7], [-0.45, 0, -0.45, -0.45], { color: '--ink', width: 1.6 });
      const lx = T.J[lj][0]; bare.line('load', [lx, lx], [-1.3, -0.08], { color: '--c-I', width: 3 }); bare.line('head', [lx - 0.15, lx, lx + 0.15], [-0.3, -0.08, -0.3], { color: '--c-I', width: 3 }); put(`${state.P} kN`, bare.mx(lx) + 0.3, bare.my(-1.2));
      put(`${fmt(S.Ay / 1e3)} kN`, bare.mx(0), bare.my(-0.8)); put(`${fmt(S.By / 1e3)} kN`, bare.mx(8), bare.my(-0.8));
      tr.range([0, T.M.length], [-fm / 1e3 * 1.2, fm / 1e3 * 1.2]); tr.titles('member', 'force (kN): + tension, − compression'); S.f.forEach((f, k) => rect(tr, `b${k}`, k + 0.15, k + 0.85, Math.min(0, f / 1e3), Math.max(0, f / 1e3), f > 0 ? '--c-B' : '--c-north'));
      const mid = T.M.findIndex(([p, q]) => p === Math.floor(n / 2) - 1 && q === Math.floor(n / 2)), js = Array.from({ length: n - 1 }, (_, i) => i + 1), inf = js.map((j) => solveTruss(T, { [j]: [0, -P] }).f[mid] / 1e3);
      br.range([0, 8], [Math.min(0, ...inf) * 1.2, Math.max(1, ...inf) * 1.2]); br.titles('load position (m)', 'force in the middle bottom chord member (kN): the influence line');
      br.line('i', [0, ...js.map((j) => T.J[j][0]), 8], [0, ...inf, 0], { color: '--c-B', width: 2 }); br.dots('c', [lx], [S.f[mid] / 1e3], { color: '--accent', size: 10 });
      plots.aux.draw({ xlim: [0, 8], cursor: lx, series: [{ x: [0, ...js.map((j) => T.J[j][0]), 8], y: [P, ...js.map((j) => solveTruss(T, { [j]: [0, -P] }).Ay), 0].map((v) => v / 1e3), color: '--c-B', label: 'left reaction (kN)' }, { x: [0, ...js.map((j) => T.J[j][0]), 8], y: [0, ...js.map((j) => solveTruss(T, { [j]: [0, -P] }).By), P].map((v) => v / 1e3), color: '--c-I', label: 'right reaction (kN)' }], xlabel: 'load position (m)' });
      const tmax = Math.max(...S.f), cmax = Math.min(...S.f);
      hud.set('a', `${T.M.length} members, ${T.J.length} joints: m + 3 = 2j = ${2 * T.J.length}, statically determinate; reactions ${fmt(S.Ay / 1e3)} and ${fmt(S.By / 1e3)} kN`);
      hud.set('b', `largest tension ${fmt(tmax / 1e3)} kN, largest compression ${fmt(-cmax / 1e3)} kN (compression members must also be checked for buckling)`);
      hud.set('c', 'method of joints: at every joint the member forces and loads add to zero in x and in y; members only push or pull along their length');
    }

    function torsionCase() {
      const ro = state.ro / 1e3, ri = ro * state.rr, G = MAT[state.mat].G, S = torsion(state.T, ro, ri, state.Lsh, G), solid = torsion(state.T, Math.sqrt(ro * ro - ri * ri), 0, state.Lsh, G), ar = SQ[2] / SQ[3], R = ro * 1.25;
      bare.range([-R * ar, R * ar], [-R, R]); bare.titles('', ': the cross-section, coloured by shear stress τ (bright = high)');
      const NX = 140, NY = 110, v = []; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const x = -R * ar + 2 * R * ar * (i + 0.5) / NX, y = -R + 2 * R * (j + 0.5) / NY, r = Math.hypot(x, y); v.push(r <= ro && r >= ri ? S.tau(r) / S.tauMax : -1); }
      bare.image('sec', v, NX, NY, { map: 'magma', norm: (q) => (q < 0 ? 0 : 0.15 + 0.85 * q) });
      const a = lin(0, 2 * Math.PI, 121); bare.line('o', a.map((t) => ro * Math.cos(t)), a.map((t) => ro * Math.sin(t)), { color: '--ink', width: 1.6 }); if (ri > 0) bare.line('i', a.map((t) => ri * Math.cos(t)), a.map((t) => ri * Math.sin(t)), { color: '--ink', width: 1.6 });
      const rs = lin(-ro, ro, 201); tr.range([-ro * 1e3, ro * 1e3], [0, S.tauMax / 1e6 * 1.15]); tr.titles('r (mm)', 'τ (MPa) across a diameter: zero at the centre, largest at the surface');
      tr.line('t', rs.map((r) => r * 1e3), rs.map((r) => (Math.abs(r) >= ri ? S.tau(Math.abs(r)) / 1e6 : NaN)), { color: '--c-I', width: 2.2 });
      const ks = lin(0, 0.95, 60), same = (k) => { const o = Math.sqrt(S.area / (Math.PI * (1 - k * k))); return torsion(state.T, o, o * k, state.Lsh, G); };
      br.range([0, 0.95], [0, 1.05]); br.titles('inner ÷ outer radius (same mass of material)', 'τmax (orange) and twist (blue), relative to a solid shaft');
      br.line('t', ks, ks.map((k) => same(k).tauMax / solid.tauMax), { color: '--c-I' }); br.line('p', ks, ks.map((k) => same(k).phi / solid.phi), { color: '--c-B' }); br.dots('c', [state.rr], [S.tauMax / solid.tauMax], { color: '--accent', size: 10 });
      const Ls = lin(0.1, 5, 50); plots.aux.draw({ xlim: [0.1, 5], cursor: state.Lsh, series: [{ x: Ls, y: Ls.map((l) => torsion(state.T, ro, ri, l, G).phi * 180 / Math.PI), color: '--c-B', label: 'angle of twist φ (°)' }], xlabel: 'shaft length (m)' });
      hud.set('a', `J = π/2 (r₀⁴ − rᵢ⁴) = ${fmt(S.J * 1e8, 3)}·10⁻⁸ m⁴: τmax = T r₀ / J = ${fmt(S.tauMax / 1e6)} MPa`);
      hud.set('b', `twist φ = T L / (G J) = ${fmt(S.phi * 180 / Math.PI)}° over ${state.Lsh} m; a solid shaft of the same mass: τmax ${fmt(solid.tauMax / 1e6)} MPa, φ ${fmt(solid.phi * 180 / Math.PI)}°`, ri > 0 ? 'good' : '');
      hud.set('c', 'the material near the centre barely works: moving it outward, into a tube, carries more torque for the same weight');
    }

    function holeCase() {
      const s = state.sig, kt = ktEllipse(state.ab), ar = SQ[2] / SQ[3], R = 4;
      bare.range([-R * ar, R * ar], [-R, R]); bare.titles('', ': σxx around a circular hole (radius 1) in a plate pulled left–right; bright = high');
      const NX = 160, NY = 120, v = []; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const x = -R * ar + 2 * R * ar * (i + 0.5) / NX, y = -R + 2 * R * (j + 0.5) / NY, q = kirsch(x, y, 1, 1); v.push(Number.isFinite(q) ? q : -2); }
      bare.image('f', v, NX, NY, { map: 'magma', norm: (q) => (q < -1.5 ? 0 : Math.max(0, Math.min(1, (q + 1) / 4))) });
      const a = lin(0, 2 * Math.PI, 121); bare.line('h', a.map(Math.cos), a.map(Math.sin), { color: '--ink', width: 1.6 }); put('3σ', bare.mx(0), bare.my(1.25)); put('3σ', bare.mx(0), bare.my(-1.25)); put('σ →', bare.mx(R * ar * 0.85), bare.my(0)); put('← σ', bare.mx(-R * ar * 0.85), bare.my(0));
      const ks = lin(0.2, 10, 80).map((q) => q); tr.range([0, 10], [0, 22]); tr.titles('hole width across ÷ length along the load', 'Kt = 1 + 2a/b (Inglis)'); tr.line('k', ks, ks.map(ktEllipse), { color: '--c-north' }); tr.dots('c', [state.ab], [kt], { color: '--accent', size: 10 });
      const lN = lin(2, 9, 120), sn = lN.map((l) => snCurve(10 ** l) / 1e6); br.range([2, 9], [0, 700]); br.titles('log₁₀ cycles to failure', 'stress amplitude (MPa): S–N curve of a steel (illustrative)');
      br.line('sn', lN, sn, { color: '--c-B', width: 2 }); br.line('se', [2, 9], [SN.Se / 1e6, SN.Se / 1e6], { color: '--ink-dim', width: 1, dashed: true });
      const Nn = life(s * 1e6), Nh = life(kt * s * 1e6), lc = (N) => (Number.isFinite(N) ? Math.log10(N) : 8.8);
      br.dots('nom', [lc(Nn)], [Math.min(700, s)], { color: '--c-v', size: 11 }); br.dots('hol', [lc(Nh)], [Math.min(700, kt * s)], { color: '--c-north', size: 11 });
      const ys = lin(1, 5, 100); plots.aux.draw({ xlim: [1, 5], series: [{ x: ys, y: ys.map((y) => kirsch(0, y, 1, s)), color: '--c-north', label: 'σxx (MPa) along the section through the hole' }, { x: [1, 5], y: [s, s], color: '--ink-dim', label: 'remote σ' }], xlabel: 'distance from the centre ÷ hole radius' });
      hud.set('a', `Kt = ${fmt(kt)}: a remote ${s} MPa becomes ${fmt(kt * s)} MPa at the edge of the hole${state.ab !== 1 ? ' (the field drawn is for the circle, Kt = 3)' : ''}`);
      hud.set('b', `fatigue life at ${s} MPa: ${Number.isFinite(Nn) ? fmt(Nn, 2) + ' cycles' : 'infinite (below the endurance limit)'}; at the hole: ${Number.isFinite(Nh) ? fmt(Nh, 2) + ' cycles' : 'infinite'}`, Number.isFinite(Nh) ? 'bad' : 'good');
      hud.set('c', 'the stress flows around the hole and crowds at its sides; cracks start there. Rounder holes and smooth fillets lower Kt; a sharp crack across the load is the worst case');
    }

    function proppedCase() {
      const L = 4, EI = 2e7, load = state.ltype === 'w' ? { w: state.w * 1e3 } : { P: state.Pb * 1e3, a: state.ab2 }, B = propped(L, load, EI), x = B.x;
      const ys = [B.y, B.simply.y].flat().map((v) => v * 1e3), ym = Math.max(1, ...ys.map(Math.abs)) * 1.3;
      sq.range([0, L], [-ym, ym * 0.4]); sq.titles('x (m)', 'deflection (mm): propped (green), simply supported (blue), free cantilever ÷ 10 (grey)');
      sq.line('f', x, B.free.y.map((v) => v * 1e2), { color: '--ink-dim', width: 1.4, dashed: true }); sq.line('s', x, B.simply.y.map((v) => v * 1e3), { color: '--c-B', width: 1.8 }); sq.line('p', x, B.y.map((v) => v * 1e3), { color: '--c-v', width: 2.6 });
      sq.line('wall', [0, 0], [-ym, ym * 0.4], { color: '--ink', width: 4 }); sq.dots('rol', [L], [0], { color: '--ink', size: 12 });
      const Ms = [B.M, B.simply.M].flat().map((v) => v / 1e3), mm = Math.max(1, ...Ms.map(Math.abs)) * 1.15;
      tr.range([0, L], [-mm, mm]); tr.titles('x (m)', 'bending moment (kN·m): propped (green), simply supported (blue)'); tr.line('s', x, B.simply.M.map((v) => v / 1e3), { color: '--c-B', width: 1.6 }); tr.line('p', x, B.M.map((v) => v / 1e3), { color: '--c-v', width: 2.2 });
      const Vm = Math.max(1, ...B.V.map((v) => Math.abs(v / 1e3))) * 1.2; br.range([0, L], [-Vm, Vm]); br.titles('x (m)', 'shear force (kN), propped'); br.line('v', x, B.V.map((v) => v / 1e3), { color: '--c-I', width: 2 });
      const as = lin(0.1, 3.9, 60); plots.aux.draw({ xlim: [0, L], cursor: state.ltype === 'P' ? state.ab2 : null, series: [{ x: as, y: as.map((a) => propped(L, { P: 1, a }, EI).R), color: '--c-v', label: 'roller reaction per unit point load, against where the load is' }], xlabel: 'load position (m)' });
      const Mmax = Math.max(...B.M.map(Math.abs)), Ms2 = Math.max(...B.simply.M.map(Math.abs)), W = state.ltype === 'w' ? state.w * L : state.Pb;
      hud.set('a', `roller reaction R = ${fmt(B.R / 1e3)} kN (${fmt(B.R / 1e3 / W, 3)} of the total load), wall moment ${fmt(B.M[0] / 1e3)} kN·m`);
      hud.set('b', `largest |M| ${fmt(Mmax / 1e3)} kN·m against ${fmt(Ms2 / 1e3)} for the simply supported beam; deflection ${fmt(Math.max(...B.y.map(Math.abs)) * 1e3)} mm against ${fmt(Math.max(...B.simply.y.map(Math.abs)) * 1e3)}`, 'good');
      hud.set('c', 'one support too many for statics alone: four unknowns, three equations. The missing equation is compatibility: the beam cannot move at the roller');
    }

    return {
      changed() { all.forEach((k) => k.show(false)); const c = state.case; (c === 'propped' ? [sq, tr, br] : [bare, tr, br]).forEach((k) => k.show(true)); ctx.setClock(0); },
      update() { all.forEach((k) => k.clear()); used = 0; pool.forEach((l) => { l.visible = false; }); ({ truss: trussCase, torsion: torsionCase, hole: holeCase, propped: proppedCase })[state.case](); },
      theme() { all.forEach((k) => k.theme()); },
    };
  },
};
