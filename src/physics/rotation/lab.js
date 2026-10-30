// Rotation: four shapes race down a slope, a falling mass spins a spool, and a skater pulls in their
// arms. Drawing on the left; energy split and the motion over time on the right.
import { createChart } from '../../lib/viz/chart.js';
import { SHAPES, inertia, rollAccel, rollTime, spoolAccel, skaterI, armRadius, G } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '—');
const SQ = [-4.6, -2.35, 4.6, 4.6], TR = [1.0, 0.55, 3.5, 1.9], BR = [1.0, -2.35, 3.5, 1.9], deg = Math.PI / 180;
const L = 4, RD = 0.22, SHORT = { sphere: 'ball', disc: 'disc', shell: 'shell', hoop: 'hoop' }, KEYS = Object.keys(SHAPES), COL = { sphere: '--c-v', disc: '--c-B', shell: '--c-E', hoop: '--c-north' };
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

export default {
  id: 'rotation', title: 'Rotation and rolling', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4, loop: false,
  defaults: { th: 20 * deg, M: 1, m: 0.5, Ms: 2, R: 0.2, I0: 1, mp: 2, r1: 0.8, r2: 0.25, w0: 2 },
  cases: [
    { id: 'rolling', label: 'Rolling race', controls: ['th', 'M'], set: { th: 20 * deg, M: 1 }, examples: [
      { id: 'mass', label: 'Five times heavier: same race', set: { M: 5 } },
      { id: 'steep', label: 'Steeper slope: same order', set: { th: 40 * deg } },
    ] },
    { id: 'spool', label: 'Falling mass and spool', controls: ['m', 'Ms'], set: { m: 0.5, Ms: 2, R: 0.2 }, examples: [
      { id: 'heavy', label: 'Heavy spool: slow fall', set: { Ms: 8 } },
      { id: 'light', label: 'Light spool: almost free fall', set: { Ms: 0.1 } },
    ] },
    { id: 'spin', label: 'Spinning skater', controls: ['r2', 'mp'], set: { I0: 1, mp: 2, r1: 0.8, r2: 0.25, w0: 2 }, examples: [
      { id: 'out', label: 'Arms out: slows down', set: { r1: 0.25, r2: 0.8, w0: 5.7 } },
      { id: 'empty', label: 'No weights in the hands', set: { mp: 0.2 } },
    ] },
  ],
  controls: [
    { title: 'Slope', show: (s) => s.case === 'rolling', items: [
      { id: 'th', label: 'Angle θ', unit: '°', k: 1 / deg, min: 5 * deg, max: 60 * deg, step: deg },
      { id: 'M', label: 'Mass of each', unit: 'kg', min: 0.2, max: 10, step: 0.1 },
    ] },
    { title: 'Spool', show: (s) => s.case === 'spool', items: [
      { id: 'm', label: 'Falling mass m', unit: 'kg', min: 0.1, max: 5, step: 0.05 },
      { id: 'Ms', label: 'Spool mass', unit: 'kg', min: 0.1, max: 10, step: 0.1 },
    ] },
    { title: 'Skater', show: (s) => s.case === 'spin', items: [
      { id: 'mp', label: 'Weight in each hand', unit: 'kg', min: 0.1, max: 5, step: 0.1 },
      { id: 'r1', label: 'Arms from', unit: 'm', min: 0.2, max: 0.9, step: 0.01 },
      { id: 'r2', label: 'Arms to', unit: 'm', min: 0.2, max: 0.9, step: 0.01 },
      { id: 'w0', label: 'Spin at the start', unit: 'rad/s', min: 0.5, max: 8, step: 0.1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: 't', xUnit: 's', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    stage.controls.enableRotate = false;
    const sq = createChart(ctx, { box: SQ }), tr = createChart(ctx, { box: TR, xTicks: false }), br = createChart(ctx, { box: BR }), charts = [sq, tr, br];
    const pool = Array.from({ length: 10 }, () => { const l = ctx.label('', 'tick'); scene.add(l); return l; }); let nl = 0;
    const text = (t, x, y, ch = sq) => { if (nl >= pool.length) return; const l = pool[nl++]; l.element.textContent = t; l.position.set(ch.mx(x), ch.my(y), 0.02); l.visible = true; };
    const label = (t, X) => text(t, 0, 0, { mx: () => X, my: () => TR[1] - 0.18 }); // under a bar of the top-right chart (world units)
    let nk = 0; const keys = new Set();
    const seg = (pts, o) => { const k = `g${nk++}${o.color}${o.dashed ? 'd' : ''}`; keys.add(k); sq.line(k, pts.map((p) => p[0]), pts.map((p) => p[1]), o); };
    const circle = (cx, cy, r, n = 40) => lin(0, 2 * Math.PI, n).map((a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    // a wheel turned by angle phi: rim plus two spokes (the hoop is a thick rim only)
    const wheel = (cx, cy, r, phi, color, k) => {
      seg(circle(cx, cy, r), { color, width: k === 'hoop' ? 5 : 2.5 });
      for (const a of [phi, phi + Math.PI / 2]) seg([[cx - r * Math.cos(a), cy - r * Math.sin(a)], [cx + r * Math.cos(a), cy + r * Math.sin(a)]], { color, width: 1.5 });
    };
    const dur = () => (state.case === 'rolling' ? rollTime('hoop', state.th, L) + 0.4 : state.case === 'spool' ? Math.sqrt(2 * 1.6 / spoolAccel(state.m, state.Ms, state.R)) + 0.3 : 4);
    return {
      changed() { charts.forEach((c) => { c.show(false); c.show(true); }); sq.show(false); ctx.setClock(dur()); },
      update() {
        nl = 0; pool.forEach((l) => { l.visible = false; }); nk = 0; keys.forEach((k) => sq.hide(k));
        const c = state.case, t = time.t, D = dur();
        if (c === 'rolling') {
          const th = state.th, cs = Math.cos(th), sn = Math.sin(th), lane = 1.25;
          sq.range([-0.3, 5.7], [-0.5, 5.5]);
          KEYS.forEach((k, j) => {
            const y0 = lane * (3 - j), top = [0, y0 + L * sn], s = Math.min(L, 0.5 * rollAccel(k, th) * t * t);
            seg([top, [L * cs, y0], [0, y0], top], { color: '--ink-dim', width: 1.4 });
            const px = s * cs, py = top[1] - s * sn; // contact point; centre one radius off the slope
            wheel(px + RD * sn, py + RD * cs, RD, -s / RD, COL[k], k);
            text(SHAPES[k].label, L * cs + 0.75, y0 + 0.1);
          });
          // energy at the bottom: share in rotation
          tr.range([0.4, 4.6], [0, 1]); tr.titles('', 'share of the energy spent on spinning, c/(1 + c), with I = cMR²');
          KEYS.forEach((k, j) => { tr.stems(k, [j + 1], [SHAPES[k].c / (1 + SHAPES[k].c)], { color: COL[k], width: 14 }); label(SHORT[k], tr.mx(j + 1)); });
          br.range([0, D], [0, L]); br.titles('time t (s)', 'distance down the slope (m)');
          const ts = lin(0, D, 120);
          KEYS.forEach((k) => br.line(k, ts, ts.map((q) => Math.min(L, 0.5 * rollAccel(k, th) * q * q)), { color: COL[k], width: 2 }));
          br.line('now', [t, t], [0, L], { color: '--accent', dashed: true, width: 1 });
          plots.aux.draw({ xlim: [0, D], cursor: t, series: KEYS.map((k) => ({ x: ts, y: ts.map((q) => (q < rollTime(k, th, L) ? rollAccel(k, th) * q : NaN)), color: COL[k], label: `${SHAPES[k].label} speed (m/s)` })) });
          hud.set('a', `a = g sin θ/(1 + c): sphere ${fmt(rollAccel('sphere', th))}, disc ${fmt(rollAccel('disc', th))}, hollow sphere ${fmt(rollAccel('shell', th))}, hoop ${fmt(rollAccel('hoop', th))} m/s²`);
          hud.set('b', `times for ${L} m: ${KEYS.map((k) => `${SHORT[k]} ${fmt(rollTime(k, th, L))} s`).join(', ')}`);
          hud.set('c', `mass ${fmt(state.M)} kg and size cancel out: only the shape, c = I/MR², decides the order`);
        } else if (c === 'spool') {
          const a = spoolAccel(state.m, state.Ms, state.R), y = Math.min(1.6, 0.5 * a * t * t), v = a * Math.min(t, Math.sqrt(3.2 / a)), Rd = 0.4 + 0.25 * Math.sqrt(state.Ms / 10);
          sq.range([-2.5, 2.5], [-3.5, 1.5]);
          seg([[-0.15, 1.2], [0.15, 1.2], [0, 0], [-0.15, 1.2]], { color: '--ink-dim', width: 1.4 });
          wheel(0, 0, Rd, -1.5 * y / Rd, '--c-B', 'disc'); // turns with the drawn rope (drawn drop = 1.5 y)
          const yb = -0.6 - y * 1.5;
          seg([[Rd, 0], [Rd, yb + 0.2]], { color: '--ink', width: 1.2 });
          seg([[Rd - 0.2, yb - 0.2], [Rd + 0.2, yb - 0.2], [Rd + 0.2, yb + 0.2], [Rd - 0.2, yb + 0.2], [Rd - 0.2, yb - 0.2]], { color: '--c-I', width: 3 });
          text(`m = ${fmt(state.m)} kg`, Rd + 0.75, yb); text(`spool ${fmt(state.Ms)} kg`, -Rd - 0.7, 0);
          const I = inertia('disc', state.Ms, state.R), Kt = 0.5 * state.m * v * v, Kr = 0.5 * I * (v / state.R) ** 2, U0 = state.m * G * 1.6;
          tr.range([0.4, 3.6], [0, U0 * 1.1]); tr.titles('', 'energy (J): lost height mgh = ½mv² + ½Iω²');
          tr.stems('U', [1], [state.m * G * y], { color: '--c-E', width: 14 }); tr.stems('Kt', [2], [Kt], { color: '--c-I', width: 14 }); tr.stems('Kr', [3], [Kr], { color: '--c-B', width: 14 });
          label('mgh lost', tr.mx(1)); label('½mv²', tr.mx(2)); label('½Iω²', tr.mx(3));
          const ts = lin(0, D, 100);
          br.range([0, D], [0, 1.7]); br.titles('time t (s)', 'drop (m): with spool, free fall (dashed)');
          br.line('y', ts, ts.map((q) => Math.min(1.6, 0.5 * a * q * q)), { color: '--c-I' }); br.line('ff', ts, ts.map((q) => 0.5 * G * q * q), { color: '--ink-dim', dashed: true, width: 1.2 });
          br.line('now', [t, t], [0, 1.7], { color: '--accent', dashed: true, width: 1 });
          plots.aux.draw({ xlim: [0, D], cursor: t, series: [{ x: ts, y: ts.map((q) => Math.min(a * q, a * Math.sqrt(3.2 / a))), color: '--c-I', label: 'speed of the falling mass (m/s)' }] });
          hud.set('a', `a = mg/(m + I/R²) = ${fmt(a)} m/s² (free fall ${G}); the spool takes I/R² = Ms/2 = ${fmt(state.Ms / 2)} kg of "extra inertia"`);
          hud.set('b', `tension T = m(g − a) = ${fmt(state.m * (G - a))} N; torque TR = Iα spins the spool`);
          hud.set('c', `energy now: ½mv² ${fmt(Kt)} J + ½Iω² ${fmt(Kr)} J = mgh ${fmt(state.m * G * y)} J`);
        } else {
          const r = armRadius(t, state.r1, state.r2), I = skaterI(state.I0, state.mp, r), Lm = skaterI(state.I0, state.mp, state.r1) * state.w0, w = Lm / I;
          // angle: integrate ω(t) on the fly (cheap: fixed grid)
          let phi = 0; for (let q = 0; q < t; q += 0.01) phi += Lm / skaterI(state.I0, state.mp, armRadius(q, state.r1, state.r2)) * Math.min(0.01, t - q);
          sq.range([-1.5, 1.5], [-1.5, 1.5]);
          seg(circle(0, 0, 0.22), { color: '--c-B', width: 3 });
          for (const s of [1, -1]) {
            const hx = s * r * Math.cos(phi), hy = s * r * Math.sin(phi);
            seg([[s * 0.22 * Math.cos(phi), s * 0.22 * Math.sin(phi)], [hx, hy]], { color: '--ink', width: 2 });
            seg(circle(hx, hy, 0.05 + 0.03 * Math.sqrt(state.mp)), { color: '--c-I', width: 3 });
          }
          seg(lin(0, 2 * Math.PI, 60).map((a) => [Math.max(state.r1, state.r2) * Math.cos(a), Math.max(state.r1, state.r2) * Math.sin(a)]), { color: '--ink-dim', dashed: true, width: 1 });
          const ts = lin(0, 4, 160), Is = ts.map((q) => skaterI(state.I0, state.mp, armRadius(q, state.r1, state.r2)));
          const wmax = Lm / Math.min(...Is), Kmax = Lm * wmax / 2;
          tr.range([0, 4], [0, wmax * 1.15]); tr.titles('time t (s)', 'ω (rad/s): spin rate, and I (kg m², dashed)');
          tr.line('w', ts, Is.map((q) => Lm / q), { color: '--c-v' }); tr.line('I', ts, Is, { color: '--c-F', dashed: true, width: 1.4 }); tr.dots('q', [t], [w], { color: '--accent', size: 10 });
          br.range([0, 4], [0, Math.max(Kmax, Lm) * 1.15]); br.titles('time t (s)', 'L = Iω (J s, flat) and KE = L²/2I (J)');
          br.line('L', ts, ts.map(() => Lm), { color: '--c-B' }); br.line('K', ts, Is.map((q) => Lm * Lm / (2 * q)), { color: '--c-north' }); br.dots('q', [t], [Lm * Lm / (2 * I)], { color: '--accent', size: 10 });
          plots.aux.draw({ xlim: [0, 4], cursor: t, series: [{ x: ts, y: ts.map((q) => armRadius(q, state.r1, state.r2)), color: '--c-I', label: 'arm radius r (m)' }] });
          hud.set('a', `I = I_body + 2·m·r² = ${fmt(I)} kg m², ω = L/I = ${fmt(w)} rad/s (${fmt(w / (2 * Math.PI))} turns/s)`);
          hud.set('b', `angular momentum L = Iω = ${fmt(Lm)} J s: no outside torque, so it stays`);
          hud.set('c', `KE = L²/2I = ${fmt(Lm * Lm / (2 * I))} J: ${state.r2 < state.r1 ? 'pulling the weights in does work, so the energy goes up' : 'the arms let the weights out, so the energy goes down'}`);
        }
      },
      theme() { charts.forEach((k) => k.theme()); },
    };
  },
};
