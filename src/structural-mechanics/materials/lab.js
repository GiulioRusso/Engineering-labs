// Materials: a tensile test pulling a specimen to fracture (with optional unloading), plane stress on a
// rotating element and Mohr's circle, and an initially bent column approaching its Euler buckling load.
import { createChart } from '../../lib/viz/chart.js';
import { MATERIALS, stress, permanentSet, rotate, principal, ENDS, eulerLoad, mode, lambdaC, sigmaCr, amplification } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? '0' : String(Number(v.toPrecision(d)))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9];
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1 || 1));
const MOPT = Object.entries(MATERIALS).map(([k, v]) => [k, v.label]), EOPT = Object.entries(ENDS).map(([k, v]) => [k, v.label]);
const MPa = 1e6, deg = Math.PI / 180, E = 200e9, SY = 250e6;

// loading path in (ε, σ): up to εs, elastic unload to σ = 0, reload, then on to fracture
function path(m, es) {
  const up = (a, b, n) => lin(a, b, n).map((e) => [e, stress(m, e)]);
  if (!(es > 0 && es < m.ef)) return up(0, m.ef, 400);
  const s1 = stress(m, es), e0 = es - s1 / m.E, down = lin(0, 1, 60).map((u) => [es - u * (es - e0), s1 * (1 - u)]);
  return [...up(0, es, 200), ...down, ...down.slice().reverse(), ...up(es, m.ef, 200)];
}

export default {
  id: 'materials', title: 'Strength of materials', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 10, loop: false,
  defaults: { mat: 'steel', es: 0, sx: 80, sy: -20, txy: 30, th: 0, end: 'pinned', L: 3, d: 0.05 },
  cases: [
    { id: 'tensile', label: 'Tensile test', set: {}, examples: [
      { id: 'alu', label: 'Aluminium: stronger at first, breaks sooner', controls: ['mat'], set: { mat: 'aluminium' } },
      { id: 'brittle', label: 'Cast iron: brittle, no warning', controls: ['mat'], set: { mat: 'iron' } },
      { id: 'unload', label: 'Unload at 5 %: a permanent stretch', controls: ['es'], set: { es: 0.05 } },
    ] },
    { id: 'mohr', label: 'Mohr’s circle', set: {}, examples: [
      { id: 'principal', label: 'Principal angle: no shear', controls: ['th'], set: { th: 15.5 } },
      { id: 'maxshear', label: '45° further: maximum shear', controls: ['th'], set: { th: 60.5 } },
      { id: 'pure', label: 'Pure shear = tension and compression at 45°', controls: ['th'], set: { sx: 0, sy: 0, txy: 50, th: 45 } },
    ] },
    { id: 'buckling', label: 'Buckling', set: {}, examples: [
      { id: 'flagpole', label: 'Fixed–free: a quarter of the load', controls: ['end'], set: { end: 'free' } },
      { id: 'clamped', label: 'Fixed–fixed: four times the load', controls: ['end'], set: { end: 'fixed' } },
      { id: 'stocky', label: 'Short and stocky: it yields first', controls: ['L'], set: { L: 0.9 } },
    ] },
  ],
  controls: [
    { title: 'Specimen', show: (s) => s.case === 'tensile', items: [{ id: 'mat', label: 'Material', type: 'select', options: MOPT }, { id: 'es', label: 'Unload at strain (0 = never)', unit: '%', k: 100, min: 0, max: 0.3, step: 0.005 }] },
    { title: 'Plane stress', show: (s) => s.case === 'mohr', items: [
      { id: 'sx', label: 'σx', unit: 'MPa', min: -100, max: 100, step: 1 }, { id: 'sy', label: 'σy', unit: 'MPa', min: -100, max: 100, step: 1 },
      { id: 'txy', label: 'τxy', unit: 'MPa', min: -60, max: 60, step: 1 }, { id: 'th', label: 'Element angle θ', unit: '°', min: 0, max: 180, step: 0.5 },
    ] },
    { title: 'Steel column, solid round bar', show: (s) => s.case === 'buckling', items: [
      { id: 'end', label: 'Ends', type: 'select', options: EOPT }, { id: 'L', label: 'Length L', unit: 'm', min: 0.3, max: 6, step: 0.05 }, { id: 'd', label: 'Diameter d', unit: 'mm', k: 1e3, min: 0.01, max: 0.15, step: 0.001 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 16 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (ch, t, x, y) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(ch.mx(x), ch.my(y), 0.02); l.visible = true; };
    // segments drawn in a chart's data coordinates, keyed by order and colour
    let nk = 0; const keys = new Map();
    const seg = (ch, pts, o) => { const k = `g${nk++}${o.color}`; keys.set(`${charts.indexOf(ch)}${k}`, [ch, k]); ch.line(k, pts.map((p) => p[0]), pts.map((p) => p[1]), o); };
    const arrow = (ch, [x0, y0], [x1, y1], o) => { const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, s = o.head || 0.08; seg(ch, [[x0, y0], [x1, y1]], o); seg(ch, [[x1 - s * (ux + 0.6 * uy), y1 - s * (uy - 0.6 * ux)], [x1, y1], [x1 - s * (ux - 0.6 * uy), y1 - s * (uy + 0.6 * ux)]], o); };
    const circ = lin(0, 2 * Math.PI, 160);
    return {
      changed() { charts.forEach((c) => { c.show(false); c.show(true); }); if (state.case === 'tensile' || state.case === 'mohr') tr.show(false); if (state.case === 'buckling') sq.show(false); ctx.setClock(state.case === 'mohr' ? 0 : 10); },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; }); nk = 0; keys.forEach(([ch, k]) => ch.hide(k));
        const c = state.case, u = Math.min(1, time.t / 9.5);
        if (c === 'tensile') {
          const m = MATERIALS[state.mat], P = path(m, state.es), k = Math.max(1, Math.floor(u * P.length)), [e, s] = P[k - 1], broke = k === P.length;
          sq.range([0, 0.46], [0, 450]); sq.titles('strain ε', 'engineering stress σ (MPa)');
          for (const [id, M] of Object.entries(MATERIALS)) if (id !== state.mat) { const es = lin(0, M.ef, 200); sq.line(`o${id}`, es, es.map((x) => stress(M, x) / MPa), { color: '--c-ref', width: 1 }); }
          sq.hide(`o${state.mat}`);
          sq.line('p', P.slice(0, k).map((q) => q[0]), P.slice(0, k).map((q) => q[1] / MPa), { color: '--c-I', width: 2.6 }); sq.dots('q', [e], [s / MPa], { color: broke ? '--c-north' : '--accent', size: 12 });
          // the specimen: gauge length grows with strain (×1), width shrinks, a neck forms after the peak
          tr.range([-1.9, 1.9], [-0.5, 0.5]); const L0 = 1.2, len = L0 * (1 + e), neck = e > m.eu ? (e - m.eu) / (m.ef - m.eu + 1e-9) : 0, half = (x) => 0.16 * (1 - 0.4 * e) * (1 - 0.45 * neck * Math.exp(-((x / (0.15 * len)) ** 2)));
          const xs = lin(-len, len, 120), gap = broke ? 0.06 : 0, top = xs.map((x) => [x + Math.sign(x) * gap, half(x)]), bot = xs.map((x) => [x + Math.sign(x) * gap, -half(x)]);
          const left = (q) => q.filter((p) => p[0] < 0), right = (q) => q.filter((p) => p[0] >= 0);
          for (const side of [left, right]) { seg(tr, side(top), { color: '--c-B', width: 2.4 }); seg(tr, side(bot), { color: '--c-B', width: 2.4 }); }
          for (const sgn of [-1, 1]) seg(tr, [[sgn * len, 0.25], [sgn * (len + 0.35), 0.25], [sgn * (len + 0.35), -0.25], [sgn * len, -0.25], [sgn * len, 0.25]], { color: '--ink-dim', width: 2 });
          text(tr, broke ? 'fracture' : e > m.eu ? 'necking' : e > m.sy / m.E ? 'yielding: plastic' : 'elastic', 0, 0.38);
          const ez = 4 * m.sy / m.E, zs = lin(0, ez, 100); br.range([0, ez], [0, m.su / MPa * 1.1]); br.titles('strain ε (start of the test)', 'σ (MPa): slope E, 0.2 % offset dashed');
          br.line('z', zs, zs.map((x) => stress(m, x) / MPa), { color: '--c-I' }); if (!m.brittle) br.line('off', [0.002, 0.002 + m.su / m.E], [0, m.su / MPa], { color: '--ink-dim', dashed: true, width: 1.2 }); else br.hide('off');
          const set = state.es > 0 && state.es < m.ef ? permanentSet(m, state.es) : 0;
          hud.set('a', `${m.label}: ε = ${fmt(100 * e)} %, σ = ${fmt(s / MPa)} MPa${broke ? ' — broken' : ''}`, broke ? 'bad' : '');
          hud.set('b', `E = ${fmt(m.E / 1e9)} GPa · yield ${m.brittle ? '—' : `${fmt(m.sy / MPa)} MPa`} · ultimate ${fmt(m.su / MPa)} MPa · elongation at break ${fmt(100 * m.ef)} %`);
          hud.set('c', set ? `unloaded at ${fmt(100 * state.es)} %: it springs back along slope E and keeps ${fmt(100 * set)} % for good` : 'up to yield the bar springs back completely; past it, part of the stretch is permanent');
          const W = []; let acc = 0; for (let i = 1; i < k; i++) { acc += (P[i][0] - P[i - 1][0]) * (P[i][1] + P[i - 1][1]) / 2; W.push(acc / 1e6); }
          plots.aux.draw({ xlim: [0, P.length], cursor: k, series: [{ x: lin(1, k - 1, W.length), y: W, color: '--c-v', label: 'energy absorbed (MJ/m³) vs test progress' }] });
        } else if (c === 'mohr') {
          const { sx, sy, txy } = state, th = state.th * deg, r = rotate(sx, sy, txy, th), P = principal(sx, sy, txy), lim = Math.max(20, Math.abs(P.c) + P.R) * 1.15;
          sq.range([-lim, lim], [-lim, lim]); sq.titles('normal stress σ (MPa)', 'shear stress τ (MPa)');
          sq.line('c', circ.map((a) => P.c + P.R * Math.cos(a)), circ.map((a) => P.R * Math.sin(a)), { color: '--c-B', width: 2.4 });
          sq.line('x', [sx, sy], [txy, -txy], { color: '--ink-dim', dashed: true, width: 1.2 }); sq.dots('o', [sx, sy], [txy, -txy], { color: '--c-ref', size: 9 });
          sq.line('r', [r.sx, r.sy], [r.txy, -r.txy], { color: '--c-I', width: 2 }); sq.dots('X', [r.sx], [r.txy], { color: '--accent', size: 13 }); sq.dots('Y', [r.sy], [-r.txy], { color: '--c-I', size: 10 });
          sq.dots('p', [P.s1, P.s2], [0, 0], { color: '--c-v', size: 11 });
          text(sq, 'σ₁', P.s1, -lim * 0.08); text(sq, 'σ₂', P.s2, -lim * 0.08); text(sq, 'x′', r.sx, r.txy + lim * 0.08);
          // the element turned by θ, with the stresses on its faces
          tr.range([-1.9, 1.9], [-0.95, 0.95]); const h = 0.38, rot = (x, y) => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
          seg(tr, [[-h, -h], [h, -h], [h, h], [-h, h], [-h, -h]].map(([x, y]) => rot(x, y)), { color: '--ink', width: 2 });
          const sc = 0.4 / Math.max(1, ...[r.sx, r.sy, r.txy].map(Math.abs));
          for (const [nx, ny, sn] of [[1, 0, r.sx], [-1, 0, r.sx], [0, 1, r.sy], [0, -1, r.sy]]) {
            const L = sn * sc, p0 = rot(nx * (h + 0.04), ny * (h + 0.04)), p1 = rot(nx * (h + 0.04 + Math.abs(L)), ny * (h + 0.04 + Math.abs(L)));
            if (Math.abs(L) > 0.01) arrow(tr, sn > 0 ? p0 : p1, sn > 0 ? p1 : p0, { color: sn > 0 ? '--c-I' : '--c-B', width: 2.2, head: 0.07 });
            const t = r.txy * sc * (nx || -ny), a0 = rot(nx * (h + 0.02) - ny * t / 2, ny * (h + 0.02) + nx * t / 2), a1 = rot(nx * (h + 0.02) + ny * t / 2, ny * (h + 0.02) - nx * t / 2);
            if (Math.abs(t) > 0.01) arrow(tr, a1, a0, { color: '--c-F', width: 2, head: 0.06 });
          }
          text(tr, `θ = ${fmt(state.th)}°`, -1.5, 0.75);
          const ts = lin(0, 180, 181), R = ts.map((t) => rotate(sx, sy, txy, t * deg));
          br.range([0, 180], [-lim, lim]); br.titles('element angle θ (°)', 'σx′ (orange), τx′y′ (purple)'); br.line('s', ts, R.map((q) => q.sx), { color: '--c-I' }); br.line('t', ts, R.map((q) => q.txy), { color: '--c-F' });
          br.line('cur', [state.th, state.th], [-lim, lim], { color: '--ink-dim', dashed: true, width: 1 }); br.dots('q', [state.th, state.th], [r.sx, r.txy], { color: '--accent', size: 9 });
          hud.set('a', `at θ = ${fmt(state.th)}°: σx′ = ${fmt(r.sx)} MPa, σy′ = ${fmt(r.sy)} MPa, τx′y′ = ${fmt(r.txy)} MPa`);
          hud.set('b', `principal stresses σ₁ = ${fmt(P.s1)}, σ₂ = ${fmt(P.s2)} MPa at θp = ${fmt(P.thp / deg)}°; maximum shear R = ${fmt(P.R)} MPa`, Math.abs(r.txy) < 0.5 ? 'good' : '');
          hud.set('c', 'turning the element by θ moves its point round the circle by 2θ: same stress state, different faces');
          plots.aux.draw({ xlim: [0, 180], cursor: state.th, series: [{ x: ts, y: R.map((q) => q.sx + q.sy), color: '--c-v', label: 'σx′ + σy′ (MPa) vs θ (°): an invariant' }, { x: ts, y: R.map((q) => q.sy), color: '--c-B', label: 'σy′' }] });
        } else {
          const { K } = ENDS[state.end], L = state.L, d = state.d, I = Math.PI * d ** 4 / 64, A = Math.PI * d * d / 4, rg = d / 4, lam = K * L / rg, Pcr = sigmaCr(E, SY, lam) * A, Pe = eulerLoad(E, I, L, K), ratio = 0.97 * u;
          const e0 = L / 500, amp = amplification(ratio), defl = e0 * amp, show = 0.12 * L * amp / amplification(0.97);
          sq.range([-0.6 * L, 0.6 * L], [-0.1 * L, 1.1 * L]);
          const ss = lin(0, 1, 80), shape = (q) => mode(state.end, q);
          seg(sq, [[0, 0], [0, L]], { color: '--ink-dim', dashed: true, width: 1 }); seg(sq, ss.map((q) => [show * shape(q), q * L]), { color: '--c-B', width: 7 });
          // supports: a clamp (bar) or a pin (triangle pointing at the end; s = 1 below the bottom, −1 above the top)
          const tipX = show * shape(1), base = (y, fixed, s) => (fixed ? seg(sq, [[-0.12 * L, y], [0.12 * L, y]], { color: '--ink', width: 4 }) : seg(sq, [[0, y], [-0.05 * L, y - s * 0.07 * L], [0.05 * L, y - s * 0.07 * L], [0, y]], { color: '--ink', width: 2 }));
          base(0, state.end !== 'pinned', 1); if (state.end !== 'free') base(L, state.end === 'fixed', -1);
          arrow(sq, [tipX, 1.08 * L], [tipX, 1.005 * L], { color: '--c-north', width: 3, head: 0.03 * L }); text(sq, `P = ${fmt(ratio * Pcr / 1e3)} kN`, tipX + 0.2 * L, 1.06 * L);
          const lc = lambdaC(E, SY), ls = lin(10, 300, 300);
          tr.range([0, 300], [0, 300]); tr.titles('slenderness λ = KL/r', 'σ_cr (MPa): Euler (dashed), Johnson + Euler (green)');
          tr.line('e', ls, ls.map((l) => Math.PI ** 2 * E / l / l / MPa), { color: '--ink-dim', dashed: true, width: 1.2 }); tr.line('j', ls, ls.map((l) => sigmaCr(E, SY, l) / MPa), { color: '--c-v' }); tr.line('y', [0, 300], [SY / MPa, SY / MPa], { color: '--c-north', dashed: true, width: 1 }); tr.dots('q', [Math.min(300, lam)], [sigmaCr(E, SY, lam) / MPa], { color: '--accent', size: 11 });
          const rs = lin(0, 0.97, 100); br.range([0, 1], [0, 35]); br.titles('P / P_cr', 'bow ÷ initial bow: 1/(1 − P/P_cr)'); br.line('a', rs, rs.map(amplification), { color: '--c-I' }); br.dots('q', [ratio], [amp], { color: '--accent', size: 11 });
          hud.set('a', `${ENDS[state.end].label}, K = ${K}: λ = ${fmt(lam)} (${lam >= lc ? 'slender: Euler' : 'stocky: Johnson, yield governs'}), P_cr = ${fmt(Pcr / 1e3)} kN (Euler alone: ${fmt(Pe / 1e3)} kN)`, lam >= lc ? '' : 'bad');
          hud.set('b', `P = ${fmt(100 * ratio, 2)} % of P_cr: a ${fmt(e0 * 1e3, 2)} mm initial bow has grown to ${fmt(defl * 1e3, 3)} mm (drawn exaggerated)`);
          hud.set('c', 'P_cr = π²EI/(KL)²: double the length, a quarter of the load. The bar does not crush — it suddenly bends sideways');
          const Ls = lin(0.3, 6, 120);
          plots.aux.draw({ xlim: [0.3, 6], cursor: L, ylim: [0, Math.min(5 * Pcr, SY * A) / 1e3 * 1.1], series: Object.entries(ENDS).map(([k, v]) => ({ x: Ls, y: Ls.map((l) => sigmaCr(E, SY, v.K * l / rg) * A / 1e3), color: k === state.end ? '--c-v' : '--c-ref', label: `${v.label} P_cr (kN)${k === 'pinned' ? ' vs length L (m)' : ''}` })) });
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
