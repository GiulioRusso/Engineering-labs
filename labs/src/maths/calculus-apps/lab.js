// Using calculus: limits approached from both sides, curve sketching with f, f′ and f″, Newton's method
// zig-zagging to a root, the area between two curves, and a solid of revolution built from discs.
import * as THREE from 'three';
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { cssVar } from '../../lib/ui/theme.js';
import { LIMITS, SKETCH, d1, d2, zeros, newton, simpson, volume } from './model.js';

const fmt = (v, d = 4) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(d)))) : v === Infinity ? '∞' : '—');
const TOP = [-4.3, 0.55, 8.85, 2.0], BOT = [-4.3, -2.35, 8.85, 2.0], ROW = (k) => [-4.3, 2.55 - (k + 1) * (4.9 / 3) + 0.25, 8.85, 4.9 / 3 - 0.55];
const AREA = { lin: { label: 'x', f: (x) => x }, sq: { label: 'x²', f: (x) => x * x }, sqrt: { label: '√x', f: (x) => Math.sqrt(Math.max(0, x)) }, sin: { label: 'sin x', f: Math.sin }, cos: { label: 'cos x', f: Math.cos }, const: { label: '0.5', f: () => 0.5 } };
const REV = { lin: { label: 'r = x (cone)', f: (x) => x }, const: { label: 'r = 1 (cylinder)', f: () => 1 }, sqrt: { label: 'r = √x (paraboloid)', f: (x) => Math.sqrt(Math.max(0, x)) }, sphere: { label: 'r = √(1 − (x−1)²) (sphere)', f: (x) => Math.sqrt(Math.max(0, 1 - (x - 1) ** 2)) }, vase: { label: 'r = 0.6 + 0.3 sin 3x (vase)', f: (x) => 0.6 + 0.3 * Math.sin(3 * x) } };

export default {
  id: 'calculus-apps', title: 'Using calculus', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [3, -6.5, 4] } },
  camOf: (s) => (s.case === 'revolve' ? 'iso' : 'top'),
  defaults: { lim: 'removable', sk: 'cubic', nx0: 1, nf: 'sqrt2', af: 'lin', ag: 'sq', aa: 0, ab: 1, rf: 'lin', ra: 0, rb: 2 },
  cases: [
    { id: 'limit', label: 'Limits', set: {}, examples: [
      { id: 'jump', label: 'A jump: left ≠ right', controls: ['lim'], set: { lim: 'jump' } },
      { id: 'inf', label: 'Blows up: infinite limit', controls: ['lim'], set: { lim: 'infinite' } },
      { id: 'sinc', label: 'sin x / x → 1', controls: ['lim'], set: { lim: 'sinc' } },
      { id: 'wild', label: 'sin(1/x): no limit', controls: ['lim'], set: { lim: 'wild' } },
    ] },
    { id: 'sketch', label: 'Curve sketching', set: {}, examples: [
      { id: 'quartic', label: 'x⁴ − 2x²: two minima', controls: ['sk'], set: { sk: 'quartic' } },
      { id: 'flat', label: 'x³: flat but not a turn', controls: ['sk'], set: { sk: 'flat' } },
      { id: 'bump', label: 'x e^(−x²)', controls: ['sk'], set: { sk: 'bump' } },
    ] },
    { id: 'newton', label: "Newton's method", set: {}, examples: [
      { id: 'far', label: 'Start far away', controls: ['nx0'], set: { nx0: 4 } },
      { id: 'cube', label: 'x³ − 2x + 2: it cycles', controls: ['nx0'], set: { nf: 'cycle', nx0: 0 } },
      { id: 'cos', label: 'cos x = x', controls: ['nx0'], set: { nf: 'cosx', nx0: 1 } },
    ] },
    { id: 'area', label: 'Area between curves', set: {}, examples: [
      { id: 'sincos', label: 'sin and cos over [0, π]', controls: ['aa', 'ab'], set: { af: 'sin', ag: 'cos', aa: 0, ab: 3.1416 } },
      { id: 'sqrt', label: '√x and x²', controls: ['af', 'ag'], set: { af: 'sqrt', ag: 'sq', aa: 0, ab: 1 } },
    ] },
    { id: 'revolve', label: 'Solids of revolution', set: {}, examples: [
      { id: 'cyl', label: 'Cylinder: πr²h', controls: ['rf'], set: { rf: 'const', ra: 0, rb: 3 } },
      { id: 'sphere', label: 'Sphere: 4/3 πr³', controls: ['rf'], set: { rf: 'sphere', ra: 0, rb: 2 } },
      { id: 'vase', label: 'A vase', controls: ['rf'], set: { rf: 'vase', ra: 0, rb: 3 } },
    ] },
  ],
  controls: [
    { title: 'Limit', show: (s) => s.case === 'limit', items: [{ id: 'lim', label: 'Function', type: 'select', options: Object.entries(LIMITS).map(([k, v]) => [k, v.label]) }] },
    { title: 'Function', show: (s) => s.case === 'sketch', items: [{ id: 'sk', label: 'f(x)', type: 'select', options: Object.entries(SKETCH).map(([k, v]) => [k, v.label]) }] },
    { title: 'Newton', show: (s) => s.case === 'newton', items: [
      { id: 'nf', label: 'Equation', type: 'segmented', options: [['sqrt2', 'x² = 2'], ['cosx', 'cos x = x'], ['cycle', 'x³ − 2x + 2 = 0']] }, { id: 'nx0', label: 'Starting guess x₀', unit: '', min: -4, max: 4, step: 0.01 },
    ] },
    { title: 'Curves', show: (s) => s.case === 'area', items: [
      { id: 'af', label: 'f', type: 'select', options: Object.entries(AREA).map(([k, v]) => [k, v.label]) }, { id: 'ag', label: 'g', type: 'select', options: Object.entries(AREA).map(([k, v]) => [k, v.label]) },
      { id: 'aa', label: 'From a', unit: '', min: -3, max: 3, step: 0.01 }, { id: 'ab', label: 'To b', unit: '', min: -3, max: 4, step: 0.01 },
    ] },
    { title: 'Profile', show: (s) => s.case === 'revolve', items: [
      { id: 'rf', label: 'Radius r(x)', type: 'select', options: Object.entries(REV).map(([k, v]) => [k, v.label]) }, { id: 'ra', label: 'From x', unit: '', min: 0, max: 2, step: 0.01 }, { id: 'rb', label: 'To x', unit: '', min: 0.5, max: 3, step: 0.01 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    const top = createChart(ctx, { box: TOP }), bot = createChart(ctx, { box: BOT }), rows = [0, 1, 2].map((k) => createChart(ctx, { box: ROW(k) })), all = [top, bot, ...rows];
    const solid = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ color: cssVar('--c-B'), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })), disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.04, 48), new THREE.MeshLambertMaterial({ color: cssVar('--accent') }));
    solid.rotation.z = -Math.PI / 2; disc.rotation.z = Math.PI / 2; scene.add(solid, disc);
    const fill = createCurve(stage, { max: 200, width: 2, color: '--c-v', opacity: 0.5 }), axis = createCurve(stage, { max: 4, width: 1.4, color: '--ink-dim' }), prof = createCurve(stage, { max: 400, width: 3, color: '--c-I' });
    const NF = { sqrt2: { f: (x) => x * x - 2, label: 'x² − 2', root: Math.SQRT2 }, cosx: { f: (x) => Math.cos(x) - x, label: 'cos x − x', root: 0.739085133 }, cycle: { f: (x) => x ** 3 - 2 * x + 2, label: 'x³ − 2x + 2', root: -1.769292354 } };
    return {
      changed() {
        const c = state.case, v3 = c === 'revolve'; stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        for (const k of all) k.show(false); fill.object.visible = false; solid.visible = disc.visible = axis.object.visible = prof.object.visible = v3;
        (c === 'sketch' ? rows : c === 'revolve' ? [] : [top, bot]).forEach((k) => k.show(true)); ctx.setClock(c === 'limit' || c === 'newton' || c === 'revolve' ? 8 : 0);
      },
      update() {
        const c = state.case, u = (time.t % 8) / 8;
        if (c === 'limit') {
          const L = LIMITS[state.lim], a = L.a, W = 2, xs = Array.from({ length: 2001 }, (_, i) => a - W + 2 * W * i / 2000).filter((x) => Math.abs(x - a) > 1e-3), ys = xs.map(L.f), cap = 6;
          top.range([a - W, a + W], [-cap / 2, cap]); top.titles('x', `f(x) = ${L.label}: f is not defined at x = ${a}`);
          top.line('l', xs.filter((x) => x < a), ys.filter((_, i) => xs[i] < a).map((v) => Math.max(-cap, Math.min(cap, v))), { color: '--c-I', width: 2 }); top.line('r', xs.filter((x) => x > a), ys.filter((_, i) => xs[i] > a).map((v) => Math.max(-cap, Math.min(cap, v))), { color: '--c-B', width: 2 });
          const dl = 1.5 * 10 ** (-3 * u), pl = L.f(a - dl), pr = L.f(a + dl);
          top.dots('pl', [a - dl], [Math.max(-cap, Math.min(cap, pl))], { color: '--c-I', size: 11 }); top.dots('pr', [a + dl], [Math.max(-cap, Math.min(cap, pr))], { color: '--c-B', size: 11 });
          if (L.L != null && Number.isFinite(L.L)) top.dots('hole', [a], [L.L], { color: '--accent', size: 9 }); else top.dots('hole', [], [], { color: '--accent' });
          const ks = Array.from({ length: 13 }, (_, i) => -i / 2), vl = ks.map((k) => L.f(a - 10 ** k)), vr = ks.map((k) => L.f(a + 10 ** k));
          bot.range([-6, 0], [-cap / 2, cap]); bot.titles('log₁₀ distance from a', 'values from the left (orange) and from the right (blue)'); bot.line('vl', ks, vl.map((v) => Math.max(-cap, Math.min(cap, v))), { color: '--c-I' }); bot.line('vr', ks, vr.map((v) => Math.max(-cap, Math.min(cap, v))), { color: '--c-B' }); bot.dots('dl', ks, vl.map((v) => Math.max(-cap, Math.min(cap, v))), { color: '--c-I', size: 6 }); bot.dots('dr', ks, vr.map((v) => Math.max(-cap, Math.min(cap, v))), { color: '--c-B', size: 6 });
          hud.set('a', `x = ${a} − ${dl.toExponential(1)}: f = ${fmt(pl)};  x = ${a} + ${dl.toExponential(1)}: f = ${fmt(pr)}`);
          hud.set('b', L.kind === 'removable' ? `both sides → ${L.L}: the limit exists, even though f(${a}) does not` : L.kind === 'jump' ? 'left → −1, right → +1: different, so no limit' : L.kind === 'infinite' ? 'both sides grow without bound: limit = +∞' : 'it never settles: oscillates between −1 and 1 ever faster', L.kind === 'removable' ? 'good' : 'bad');
          hud.set('c', 'a limit asks where f is heading as x gets close to a — not what f does at a');
          plots.aux.draw({ xlim: [-6, 0], series: [{ x: ks, y: vr.map((v) => Math.max(-cap, Math.min(cap, v))), color: '--c-B', label: 'f(a + 10^k) vs k' }] });
        } else if (c === 'sketch') {
          const f = SKETCH[state.sk].f, xs = Array.from({ length: 601 }, (_, i) => -2.5 + 5 * i / 600), y = xs.map(f), y1 = xs.map((x) => d1(f, x)), y2 = xs.map((x) => d2(f, x));
          const crit = zeros((x) => d1(f, x), -2.5, 2.5), infl = zeros((x) => d2(f, x), -2.5, 2.5), rng = (a) => { const m = Math.max(1, ...a.map(Math.abs)); return [-m * 1.1, m * 1.1]; };
          rows[0].range([-2.5, 2.5], rng(y)); rows[0].titles('', `f(x) = ${SKETCH[state.sk].label}: green rising, red falling`);
          rows[0].line('up', xs, y.map((v, i) => (y1[i] > 0 ? v : NaN)), { color: '--c-v', width: 3 }); rows[0].line('dn', xs, y.map((v, i) => (y1[i] <= 0 ? v : NaN)), { color: '--c-north', width: 3 });
          rows[0].dots('c', crit, crit.map(f), { color: '--accent', size: 10 }); rows[0].dots('i', infl, infl.map(f), { color: '--c-I', size: 8 });
          rows[1].range([-2.5, 2.5], rng(y1)); rows[1].titles('', "f′(x): its sign says rising (+) or falling (−)"); rows[1].line('d', xs, y1, { color: '--c-B' }); rows[1].dots('c', crit, crit.map(() => 0), { color: '--accent', size: 10 });
          rows[2].range([-2.5, 2.5], rng(y2)); rows[2].titles('x', "f″(x): + bends up (∪), − bends down (∩)"); rows[2].line('d', xs, y2, { color: '--c-E' }); rows[2].dots('i', infl, infl.map(() => 0), { color: '--c-I', size: 8 });
          for (const r of rows) { crit.slice(0, 6).forEach((x0, i) => r.line(`v${i}`, [x0, x0], [-1e3, 1e3], { color: '--ink-dim', dashed: true, width: 1 })); for (let i = crit.length; i < 6; i++) r.hide(`v${i}`); }
          const kind = (x0) => { const s = d2(f, x0); return Math.abs(s) < 1e-3 ? (Math.sign(d1(f, x0 - 0.05)) === Math.sign(d1(f, x0 + 0.05)) ? 'flat (no turn)' : '?') : s > 0 ? 'minimum' : 'maximum'; };
          hud.set('a', crit.length ? crit.map((x0) => `x = ${fmt(x0, 3)}: ${kind(x0)}`).join(' · ') : 'no critical points'); hud.set('b', infl.length ? `inflection points (orange): ${infl.map((x) => fmt(x, 3)).join(', ')}` : 'no inflection points');
          hud.set('c', 'f′ = 0 gives candidates; f″ (or the sign change of f′) decides what they are');
          plots.aux.draw({ xlim: [-2.5, 2.5], series: [{ x: xs, y, color: '--c-B', label: 'f(x)' }] });
        } else if (c === 'newton') {
          const N = NF[state.nf], f = N.f, xs = newton(f, state.nx0, 8), steps = Math.min(xs.length - 1, Math.floor(u * 10)), W = 4.5;
          const gx = Array.from({ length: 601 }, (_, i) => -W + 2 * W * i / 600); top.range([-W, W], [-8, 8]); top.titles('x', `f(x) = ${N.label}: follow the tangent down to the axis`); top.line('f', gx, gx.map((x) => Math.max(-20, Math.min(20, f(x)))), { color: '--c-B' });
          const zig = []; for (let i = 0; i < steps; i++) { zig.push([xs[i], 0], [xs[i], f(xs[i])], [xs[i + 1], 0]); } top.line('z', zig.map((p) => p[0]), zig.map((p) => Math.max(-20, Math.min(20, p[1]))), { color: '--c-I', width: 1.6 }); top.dots('x', xs.slice(0, steps + 1), xs.slice(0, steps + 1).map(() => 0), { color: '--accent', size: 9 });
          const err = xs.map((x) => Math.log10(Math.abs(x - N.root) + 1e-16)); bot.range([0, 8], [-16, 1]); bot.titles('step', 'log₁₀ |error|: digits of accuracy roughly double each step'); bot.line('e', err.map((_, i) => i), err, { color: '--c-v' }); bot.dots('e', err.map((_, i) => i).slice(0, steps + 1), err.slice(0, steps + 1), { color: '--c-v', size: 8 });
          hud.set('a', `xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ):  ${xs.slice(0, steps + 1).map((x) => fmt(x, 6)).join(' → ')}`); hud.set('b', `true root ${fmt(N.root, 8)}`);
          hud.set('c', state.nf === 'cycle' && Math.abs(state.nx0) < 0.3 ? 'from 0 it bounces 0 → 1 → 0 → 1…: Newton can cycle' : 'replace the curve by its tangent, solve the straight line, repeat');
          plots.aux.draw({ xlim: [0, 8], series: [{ x: err.map((_, i) => i), y: err, color: '--c-v', label: 'log₁₀ error vs step' }] });
        } else if (c === 'area') {
          const f = AREA[state.af].f, g = AREA[state.ag].f, a = Math.min(state.aa, state.ab), b = Math.max(state.aa, state.ab), xs = Array.from({ length: 601 }, (_, i) => -3 + 7 * i / 600);
          top.range([-3, 4], [-2, 4]); top.titles('x', `f = ${AREA[state.af].label} (blue), g = ${AREA[state.ag].label} (orange); the area between, from ${fmt(a, 3)} to ${fmt(b, 3)}`);
          top.line('f', xs, xs.map(f), { color: '--c-B' }); top.line('g', xs, xs.map(g), { color: '--c-I' });
          const sx = Array.from({ length: 120 }, (_, i) => a + (b - a) * (i + 0.5) / 120), seg = []; for (const x of sx) seg.push(top.mx(x), top.my(Math.min(f(x), g(x))), 0.003, top.mx(x), top.my(Math.max(f(x), g(x))), 0.003);
          fill.segments(seg); fill.object.visible = true;
          const net = simpson((x) => f(x) - g(x), a, b), abs = simpson((x) => Math.abs(f(x) - g(x)), a, b, 2000), cross = zeros((x) => f(x) - g(x), a, b);
          const cx2 = sx, cum = []; let s = 0; for (const x of cx2) { s += (f(x) - g(x)) * (b - a) / 120; cum.push(s); }
          bot.range([a - 0.01, b + 0.01], [Math.min(0, ...cum) - 0.1, Math.max(0, ...cum) + 0.1]); bot.titles('x', 'running ∫ (f − g) dx'); bot.line('c', cx2, cum, { color: '--c-v' });
          hud.set('a', `∫(f − g) dx = ${fmt(net)} (signed),  ∫|f − g| dx = ${fmt(abs)} (area)`); hud.set('b', cross.length ? `the curves cross at ${cross.map((x) => fmt(x, 3)).join(', ')}: split the integral there` : 'no crossing inside: one integral is enough');
          hud.set('c', 'area = ∫ (top − bottom) dx: thin vertical strips of height f − g');
          plots.aux.draw({ xlim: [a, b], series: [{ x: cx2, y: cx2.map((x) => f(x) - g(x)), color: '--c-v', label: 'f − g' }] });
        } else {
          const R = REV[state.rf].f, a = Math.min(state.ra, state.rb), b = Math.max(state.ra, state.rb), off = -(a + b) / 2, pts = [];
          for (let i = 0; i <= 120; i++) { const x = a + (b - a) * i / 120; pts.push(new THREE.Vector2(Math.max(1e-4, R(x)), x + off)); }
          solid.geometry.dispose(); solid.geometry = new THREE.LatheGeometry(pts, 64); solid.geometry.computeVertexNormals();
          const xd = a + (b - a) * u, rd = Math.max(0.001, R(xd)); disc.position.set(xd + off, 0, 0); disc.scale.set(rd, 1, rd);
          axis.segments([off + a - 0.5, 0, 0, off + b + 0.5, 0, 0]); const p = []; for (let i = 0; i <= 120; i++) { const x = a + (b - a) * i / 120; p.push(x + off, 0, R(x)); } prof.set(p);
          const V = volume(R, a, b), partial = volume(R, a, xd);
          hud.set('a', `${REV[state.rf].label} on [${fmt(a, 3)}, ${fmt(b, 3)}] spun around the x axis`); hud.set('b', `V = π ∫ r(x)² dx = ${fmt(V)} (discs up to the orange one: ${fmt(partial)})`);
          hud.set('c', state.rf === 'sphere' ? `sphere of radius 1: 4π/3 = ${fmt(4 * Math.PI / 3)}` : state.rf === 'lin' ? `cone: πr²h/3 = ${fmt(Math.PI * b * b * (b - a) / 3)} when starting at 0` : 'each slice is a thin disc of area πr² and thickness dx');
          const xs = Array.from({ length: 101 }, (_, i) => a + (b - a) * i / 100); plots.aux.draw({ xlim: [a, b], cursor: xd, series: [{ x: xs, y: xs.map((x) => Math.PI * R(x) ** 2), color: '--c-B', label: 'disc area πr(x)² vs x' }] });
        }
      },
      theme() { for (const k of all) k.theme(); axis.theme(); prof.theme(); fill.theme(); solid.material.color.set(cssVar('--c-B')); disc.material.color.set(cssVar('--accent')); },
    };
  },
};
