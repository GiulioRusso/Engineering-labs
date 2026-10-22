// Polarization: the field of a plane wave drawn along z in 3D, the ellipse its tip traces, orientation and
// ellipticity, Jones calculus through a polarizer or a wave plate, Stokes parameters on the Poincaré
// sphere, and any state as the sum of two circular ones.
import * as THREE from 'three';
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { cssVar } from '../../lib/ui/theme.js';
import { field, ellipse, jones, element, apply, fromJones, power, stokes, circular } from './model.js';

const fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const deg = Math.PI / 180, SQL = [-4.3, -2.35, 4.2, 4.9], TR = [0.55, 0.55, 4.0, 2.0], BR = [0.55, -2.35, 4.0, 2.0], SQR = [0.35, -2.35, 4.2, 4.9];
const ELEMENTS = [['polarizer', 'Polarizer'], ['qwp', 'Quarter-wave plate'], ['hwp', 'Half-wave plate'], ['ret', 'Retarder Γ']];

export default {
  id: 'polarization', title: 'Polarization', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 4,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [7, -6, 4.5] } },
  camOf: (s) => (s.case === 'wave3d' || s.case === 'poincare' ? 'iso' : 'top'),
  defaults: { Ax: 1, Ay: 1, dl: 90, el: 'qwp', th: 45, G: 60, dop: 1, aR: 0.5, aL: 0.5, phi: 60 },
  cases: [
    { id: 'wave3d', label: 'The wave in 3D', set: {}, examples: [
      { id: 'linear', label: 'δ = 0: linear', controls: ['dl'], set: { dl: 0 } },
      { id: 'right', label: 'δ = −90°: right-hand circular', controls: ['dl'], set: { dl: -90 } },
    ] },
    { id: 'ellipse', label: 'The ellipse', set: { dl: 45, Ay: 0.6 }, examples: [
      { id: 'tilt', label: 'Linear, tilted', controls: ['Ay', 'dl'], set: { Ay: 0.5, dl: 0 } },
      { id: 'axes', label: 'δ = 90°, unequal: upright ellipse', controls: ['Ay', 'dl'], set: { Ay: 0.5, dl: 90 } },
    ] },
    { id: 'orient', label: 'Orientation and ellipticity', set: { Ay: 0.7, dl: 60 }, examples: [
      { id: 'swap', label: 'Equal amplitudes: ψ jumps 90°', controls: ['Ay', 'dl'], set: { Ay: 1, dl: 100 } },
    ] },
    { id: 'jones', label: 'Jones calculus', set: { Ax: 1, Ay: 0, dl: 0 }, examples: [
      { id: 'malus', label: 'Polarizer: Malus’ law', controls: ['el', 'th'], set: { el: 'polarizer', th: 60 } },
      { id: 'qwp', label: 'Quarter-wave at 45°: circular', controls: ['el', 'th'], set: { el: 'qwp', th: 45 } },
      { id: 'hwp', label: 'Half-wave at 20°: rotated 40°', controls: ['el', 'th'], set: { el: 'hwp', th: 20 } },
    ] },
    { id: 'poincare', label: 'Poincaré sphere', set: { Ay: 0.8, dl: 40 }, examples: [
      { id: 'partial', label: 'Partially polarized: inside the ball', controls: ['dop'], set: { dop: 0.5 } },
      { id: 'pole', label: 'Circular: at a pole', controls: ['Ay', 'dl'], set: { Ay: 1, dl: 90 } },
    ] },
    { id: 'circular', label: 'Circular basis', set: {}, examples: [
      { id: 'rotate', label: 'Phase φ rotates the line by φ/2', controls: ['phi'], set: { phi: 120 } },
      { id: 'ellipse', label: 'Unequal circles: an ellipse', controls: ['aR', 'aL'], set: { aR: 0.7, aL: 0.3 } },
    ] },
  ],
  controls: [
    { title: 'Wave', show: (s) => s.case !== 'circular', items: [
      { id: 'Ax', label: 'Amplitude Ax', unit: '', min: 0, max: 1, step: 0.01 }, { id: 'Ay', label: 'Amplitude Ay', unit: '', min: 0, max: 1, step: 0.01 },
      { id: 'dl', label: 'Phase δ (y behind x)', unit: '°', min: -180, max: 180, step: 1 },
      { id: 'dop', label: 'Degree of polarization', unit: '', min: 0, max: 1, step: 0.01, show: (s) => s.case === 'poincare' },
    ] },
    { title: 'Element', show: (s) => s.case === 'jones', items: [
      { id: 'el', label: 'Element', type: 'select', options: ELEMENTS }, { id: 'th', label: 'Axis angle θ', unit: '°', min: -90, max: 90, step: 1 },
      { id: 'G', label: 'Retardance Γ', unit: '°', min: 0, max: 360, step: 1, show: (s) => s.el === 'ret' },
    ] },
    { title: 'Circular parts', show: (s) => s.case === 'circular', items: [
      { id: 'aR', label: 'Right-hand amplitude', unit: '', min: 0, max: 1, step: 0.01 }, { id: 'aL', label: 'Left-hand amplitude', unit: '', min: 0, max: 1, step: 0.01 },
      { id: 'phi', label: 'Phase difference φ', unit: '°', min: -180, max: 180, step: 1 },
    ] },
  ],
  plots: [{ id: 'aux', title: '', xLabel: '', xUnit: '', yUnit: '' }],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, plots, stage, scene } = ctx;
    const sql = createChart(ctx, { box: SQL, grid: false }), sqr = createChart(ctx, { box: SQR, grid: false }), tr = createChart(ctx, { box: TR }), br = createChart(ctx, { box: BR }), all = [sql, sqr, tr, br];
    const vecs = createCurve(stage, { max: 400, width: 1.4, color: '--c-B' }), tip = createCurve(stage, { max: 400, width: 2.6, color: '--c-E' }), axes = createCurve(stage, { max: 40, width: 1.2, color: '--ink-dim' }), proj = createCurve(stage, { max: 800, width: 1.2, color: '--c-I' });
    const sphere = createCurve(stage, { max: 2000, width: 1, color: '--line' }), path = createCurve(stage, { max: 400, width: 2, color: '--c-I' }), now = createCurve(stage, { max: 4, width: 3, color: '--accent' });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: cssVar('--accent') })); scene.add(dot);
    const labels = ['H', 'V', '+45°', '−45°', 'L', 'R'].map((t) => { const l = ctx.label(t, 'axis'); scene.add(l); return l; });
    const three = [vecs, tip, axes, proj, sphere, path, now], RS = 2.2;
    const sph = []; for (let k = 0; k < 12; k++) for (let i = 0; i < 48; i++) { const p = Math.PI * k / 12, a = 2 * Math.PI * i / 48, b = 2 * Math.PI * (i + 1) / 48; sph.push(RS * Math.cos(a) * Math.cos(p), RS * Math.cos(a) * Math.sin(p), RS * Math.sin(a), RS * Math.cos(b) * Math.cos(p), RS * Math.cos(b) * Math.sin(p), RS * Math.sin(b)); }
    for (const la of [-60, -30, 0, 30, 60]) for (let i = 0; i < 48; i++) { const r = RS * Math.cos(la * deg), z = RS * Math.sin(la * deg), a = 2 * Math.PI * i / 48, b = 2 * Math.PI * (i + 1) / 48; sph.push(r * Math.cos(a), r * Math.sin(a), z, r * Math.cos(b), r * Math.sin(b), z); }
    const drawEllipse = (ch, Ax, Ay, d, key, col, wt) => { const L = 1.3, ar = SQL[3] / SQL[2]; ch.range([-L, L], [-L * ar, L * ar]); const ps = Array.from({ length: 121 }, (_, i) => field(Ax, Ay, d, 2 * Math.PI * i / 120)); ch.line(key, ps.map((p) => p[0]), ps.map((p) => p[1]), { color: col }); if (wt !== undefined) { const [x, y] = field(Ax, Ay, d, -wt); ch.line(`${key}v`, [0, x], [0, y], { color: '--accent', width: 3 }); ch.dots(`${key}d`, [x], [y], { color: '--accent', size: 10 }); } };
    return {
      changed() {
        const c = state.case, v3 = c === 'wave3d' || c === 'poincare'; stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        for (const k of all) k.show(false); for (const o of three) o.object.visible = false; dot.visible = c === 'poincare'; labels.forEach((l) => { l.visible = c === 'poincare'; });
        if (c === 'wave3d') for (const o of [vecs, tip, axes]) o.object.visible = true;
        if (c === 'poincare') for (const o of [sphere, path, now, axes]) o.object.visible = true;
        ({ wave3d: [], ellipse: [sql, tr, br], orient: [sql, tr, br], jones: [sql, sqr], poincare: [], circular: [sql, tr, br] })[c].forEach((k) => k.show(true));
        ctx.setClock(['wave3d', 'ellipse', 'circular'].includes(c) ? 4 : 0);
      },
      update() {
        const c = state.case, d = state.dl * deg, { Ax, Ay } = state, wt = 2 * Math.PI * (time.t % 4) / 4, E = ellipse(Ax, Ay, d);
        const hand = E.hand === 'linear' ? 'linear' : `${E.hand}-hand ${Math.abs(Math.abs(E.chi) - Math.PI / 4) < 0.01 ? 'circular' : 'elliptical'}`;
        if (c === 'wave3d') {
          // E along the propagation axis (drawn as x across, y up, z to the right in the scene's y)
          const Z = 6, n = 80, v = [], t = [], S = 1.6; for (let i = 0; i <= n; i++) { const z = -Z / 2 + Z * i / n, [ex, ey] = field(Ax, Ay, d, wt - Math.PI * z); if (i % 2 === 0) v.push(0, z, 0, ex * S, z, ey * S); t.push(ex * S, z, ey * S); } // wavelength = 2 scene units
          vecs.segments(v); tip.set(t);
          axes.segments([0, -Z / 2, 0, 0, Z / 2 + 0.5, 0]);
          hud.set('a', `Ax = ${Ax}, Ay = ${Ay}, δ = ${state.dl}°: ${hand}`); hud.set('b', 'blue arrows: E along the wave at one instant; orange: the curve of their tips'); hud.set('c', 'drag to rotate; look along the axis to see the ellipse');
          plots.aux.draw({ xlim: [0, 1], series: [{ x: Array.from({ length: 101 }, (_, i) => i / 100), y: Array.from({ length: 101 }, (_, i) => field(Ax, Ay, d, 2 * Math.PI * i / 100)[0]), color: '--c-B', label: 'Ex' }, { x: Array.from({ length: 101 }, (_, i) => i / 100), y: Array.from({ length: 101 }, (_, i) => field(Ax, Ay, d, 2 * Math.PI * i / 100)[1]), color: '--c-I', label: 'Ey over one period' }] });
        } else if (c === 'ellipse' || c === 'orient') {
          drawEllipse(sql, Ax, Ay, d, 'e', '--c-B', c === 'ellipse' ? wt : undefined); sql.titles('Ex', 'Ey: looking at the oncoming wave');
          const { psi, chi, a, b } = E; sql.line('maj', [-a * Math.cos(psi), a * Math.cos(psi)], [-a * Math.sin(psi), a * Math.sin(psi)], { color: '--c-v', dashed: true, width: 1.2 }); sql.line('min', [b * Math.sin(psi), -b * Math.sin(psi)], [-b * Math.cos(psi), b * Math.cos(psi)], { color: '--c-I', dashed: true, width: 1.2 });
          if (c === 'ellipse') {
            const ts = Array.from({ length: 201 }, (_, i) => i / 200); tr.range([0, 1], [-1.2, 1.2]); tr.titles('t / T', 'Ex(t) (blue), Ey(t) (orange): same frequency, shifted by δ'); tr.line('x', ts, ts.map((q) => field(Ax, Ay, d, 2 * Math.PI * q)[0]), { color: '--c-B' }); tr.line('y', ts, ts.map((q) => field(Ax, Ay, d, 2 * Math.PI * q)[1]), { color: '--c-I' });
            br.range([-180, 180], [-50, 50]); br.titles('δ (°)', `ellipticity χ (°) for Ay/Ax = ${fmt(Ay / (Ax || 1e-9))}`); const ds = Array.from({ length: 361 }, (_, i) => -180 + i); br.line('c', ds, ds.map((q) => ellipse(Ax, Ay, q * deg).chi / deg), { color: '--c-v' }); br.dots('now', [state.dl], [chi / deg], { color: '--accent', size: 10 });
          } else {
            const ds = Array.from({ length: 361 }, (_, i) => -180 + i);
            tr.range([-180, 180], [-95, 95]); tr.titles('δ (°)', 'orientation ψ (°) of the major axis'); tr.line('p', ds, ds.map((q) => ellipse(Ax, Ay, q * deg).psi / deg), { color: '--c-v' }); tr.dots('now', [state.dl], [psi / deg], { color: '--accent', size: 10 });
            br.range([-180, 180], [-50, 50]); br.titles('δ (°)', 'ellipticity χ (°): 0 linear, ±45 circular'); br.line('c', ds, ds.map((q) => ellipse(Ax, Ay, q * deg).chi / deg), { color: '--c-I' }); br.dots('now', [state.dl], [chi / deg], { color: '--accent', size: 10 });
          }
          hud.set('a', `${hand}: ψ = ${fmt(psi / deg)}°, χ = ${fmt(chi / deg)}°`); hud.set('b', `semi-axes a = ${fmt(a)}, b = ${fmt(b)}; tan |χ| = b/a = ${fmt(b / (a || 1e-9))}`);
          hud.set('c', 'tan 2ψ = 2AxAy cos δ / (Ax² − Ay²), sin 2χ = 2AxAy sin δ / (Ax² + Ay²)');
          const ds = Array.from({ length: 361 }, (_, i) => -180 + i); plots.aux.draw({ xlim: [-180, 180], cursor: state.dl, series: [{ x: ds, y: ds.map((q) => ellipse(Ax, Ay, q * deg).chi / deg), color: '--c-I', label: 'χ (°) vs δ (°)' }] });
        } else if (c === 'jones') {
          const G = state.el === 'qwp' ? Math.PI / 2 : state.el === 'hwp' ? Math.PI : state.G * deg, M = element(state.el === 'polarizer' ? 'polarizer' : 'retarder', state.th * deg, G), J = jones(Ax, Ay, d), O = apply(M, J), o = fromJones(O), Pi = power(J), Po = power(O);
          drawEllipse(sql, Ax, Ay, d, 'in', '--c-B'); sql.titles('Ex', 'Ey: input state'); drawEllipse(sqr, o.Ax, o.Ay, o.d, 'out', '--c-v'); sqr.titles('Ex', `after the ${ELEMENTS.find((q) => q[0] === state.el)[1].toLowerCase()}`);
          const th = state.th * deg; for (const ch of [sql, sqr]) ch.line('ax', [-1.2 * Math.cos(th), 1.2 * Math.cos(th)], [-1.2 * Math.sin(th), 1.2 * Math.sin(th)], { color: '--c-north', dashed: true, width: 1.2 });
          const ein = ellipse(Ax, Ay, d), eo = ellipse(o.Ax, o.Ay, o.d);
          hud.set('a', `in: ψ = ${fmt(ein.psi / deg)}°, χ = ${fmt(ein.chi / deg)}° → out: ψ = ${fmt(eo.psi / deg)}°, χ = ${fmt(eo.chi / deg)}°`);
          hud.set('b', state.el === 'polarizer' ? `transmitted power ${fmt(100 * Po / (Pi || 1))} %${Ay === 0 ? ` = cos²(${state.th}°) (Malus)` : ''}` : `power conserved (${fmt(100 * Po / (Pi || 1))} %): a retarder only reshapes`, state.el === 'polarizer' ? '' : 'good');
          hud.set('c', state.el === 'qwp' ? 'quarter-wave: delays one axis by 90° — linear at 45° becomes circular' : state.el === 'hwp' ? 'half-wave: mirrors the state about its axis — linear rotates by 2(θ − ψ)' : state.el === 'polarizer' ? 'polarizer: keeps only the component along its axis' : `retarder: delays the slow axis by Γ = ${state.G}°`);
          const ths = Array.from({ length: 181 }, (_, i) => -90 + i); plots.aux.draw({ xlim: [-90, 90], cursor: state.th, series: [state.el === 'polarizer' ? { x: ths, y: ths.map((t) => power(apply(element('polarizer', t * deg), J)) / (Pi || 1)), color: '--c-v', label: 'transmitted power vs polarizer angle (°)' } : { x: ths, y: ths.map((t) => { const q = fromJones(apply(element('retarder', t * deg, G), J)); return ellipse(q.Ax, q.Ay, q.d).chi / deg; }), color: '--c-v', label: 'output ellipticity χ (°) vs plate angle (°)' }] });
        } else if (c === 'poincare') {
          sphere.segments(sph); axes.segments([-RS * 1.3, 0, 0, RS * 1.3, 0, 0, 0, -RS * 1.3, 0, 0, RS * 1.3, 0, 0, 0, -RS * 1.3, 0, 0, RS * 1.3]);
          [[RS * 1.4, 0, 0], [-RS * 1.4, 0, 0], [0, RS * 1.4, 0], [0, -RS * 1.4, 0], [0, 0, RS * 1.4], [0, 0, -RS * 1.4]].forEach((p, i) => labels[i].position.set(...p));
          const S = stokes(Ax, Ay, d, state.dop), n = S[0] || 1, P = [S[1] / n * RS, S[2] / n * RS, S[3] / n * RS]; dot.position.set(...P); now.segments([0, 0, 0, ...P]);
          const pp = []; for (let i = 0; i <= 180; i++) { const q = stokes(Ax, Ay, (-180 + 2 * i) * deg, state.dop); pp.push(q[1] / n * RS, q[2] / n * RS, q[3] / n * RS); } path.set(pp);
          const E2 = ellipse(Ax, Ay, d), dp = Math.hypot(S[1], S[2], S[3]) / n;
          hud.set('a', `S = (${fmt(S[0])}, ${fmt(S[1])}, ${fmt(S[2])}, ${fmt(S[3])})`); hud.set('b', `longitude 2ψ = ${fmt(2 * E2.psi / deg)}°, latitude 2χ = ${fmt(2 * E2.chi / deg)}°; degree of polarization ${fmt(dp)}`);
          hud.set('c', 'equator: linear states · poles: circular · inside the ball: partially polarized; orange: all δ at this Ay/Ax');
          plots.aux.draw({ xlim: [-180, 180], cursor: state.dl, series: [1, 2, 3].map((k, j) => ({ x: Array.from({ length: 361 }, (_, i) => -180 + i), y: Array.from({ length: 361 }, (_, i) => stokes(Ax, Ay, (-180 + i) * deg, state.dop)[k] / n), color: ['--c-B', '--c-I', '--c-v'][j], label: `S${k}/S0` })) });
        } else {
          const { aR, aL } = state, ph = state.phi * deg, L = 1.3, ar = SQL[3] / SQL[2]; sql.range([-L, L], [-L * ar, L * ar]); sql.titles('Ex', 'right (blue) + left (orange) circular = sum (green)');
          const ring = (a) => Array.from({ length: 121 }, (_, i) => [a * Math.cos(2 * Math.PI * i / 120), a * Math.sin(2 * Math.PI * i / 120)]);
          sql.line('rR', ring(aR).map((p) => p[0]), ring(aR).map((p) => p[1]), { color: '--c-B', width: 1, dashed: true }); sql.line('rL', ring(aL).map((p) => p[0]), ring(aL).map((p) => p[1]), { color: '--c-I', width: 1, dashed: true });
          const R = [aR * Math.cos(wt - ph / 2), -aR * Math.sin(wt - ph / 2)], Lv = [aL * Math.cos(wt + ph / 2), aL * Math.sin(wt + ph / 2)], Sm = circular(aR, aL, ph, wt);
          sql.line('vR', [0, R[0]], [0, R[1]], { color: '--c-B', width: 3 }); sql.line('vL', [R[0], R[0] + Lv[0]], [R[1], R[1] + Lv[1]], { color: '--c-I', width: 3 }); sql.line('vS', [0, Sm[0]], [0, Sm[1]], { color: '--c-v', width: 2 });
          const tr2 = Array.from({ length: 121 }, (_, i) => circular(aR, aL, ph, 2 * Math.PI * i / 120)); sql.line('tr', tr2.map((p) => p[0]), tr2.map((p) => p[1]), { color: '--c-v', width: 1.4 });
          const ts = Array.from({ length: 201 }, (_, i) => i / 200); tr.range([0, 1], [-1.2, 1.2]); tr.titles('t / T', 'sum: Ex (blue), Ey (orange)'); tr.line('x', ts, ts.map((q) => circular(aR, aL, ph, 2 * Math.PI * q)[0]), { color: '--c-B' }); tr.line('y', ts, ts.map((q) => circular(aR, aL, ph, 2 * Math.PI * q)[1]), { color: '--c-I' });
          const ps = Array.from({ length: 361 }, (_, i) => -180 + i); br.range([-180, 180], [-95, 95]); br.titles('φ (°)', 'orientation of the result (°) = φ/2'); br.line('o', ps, ps.map((q) => q / 2), { color: '--c-v' }); br.dots('now', [state.phi], [state.phi / 2], { color: '--accent', size: 10 });
          const chi = Math.atan2(aL - aR, aL + aR);
          hud.set('a', aR === aL ? `equal circles: the sum is a line at φ/2 = ${fmt(state.phi / 2)}°` : `unequal: an ellipse, tan χ = (aL − aR)/(aL + aR) → χ = ${fmt(chi / deg)}°`); hud.set('b', 'a phase between the circular parts rotates the plane: optical activity, Faraday rotation');
          hud.set('c', 'linear and circular are two bases for the same states');
          plots.aux.draw({ xlim: [-180, 180], cursor: state.phi, series: [{ x: ps, y: ps.map((q) => q / 2), color: '--c-v', label: 'rotation (°) vs φ (°)' }] });
        }
      },
      theme() { for (const k of all) k.theme(); for (const o of three) o.theme(); dot.material.color.set(cssVar('--accent')); },
    };
  },
};
