// Conic sections: a plane cutting a double cone in 3D (circle, ellipse, parabola, hyperbola), the
// focus–directrix definition with eccentricity, and the reflection property behind dishes and whispering
// galleries.
import * as THREE from 'three';
import { createChart } from '../../lib/viz/chart.js';
import { createCurve } from '../../lib/viz/curve.js';
import { cssVar } from '../../lib/ui/theme.js';
import { section, kind, eccentricity, polarConic } from './model.js';

const deg = Math.PI / 180, fmt = (v, d = 3) => (Number.isFinite(v) ? String(Number(v.toPrecision(d))) : '∞');
const SQ = [-3.2, -2.35, 6.4, 4.9];

export default {
  id: 'conics', title: 'Conic sections', size: 4.4, ortho: true, plain: true, cam: 'top', duration: 8,
  cameras: { top: { pos: [0, -0.01, 12] }, iso: { pos: [7, -7, 3.5], target: [0, 0, 0] } },
  camOf: (s) => (s.case === 'cone' ? 'iso' : 'top'),
  defaults: { alpha: 30, beta: 25, h: 1, e: 0.6, p: 1.6, nrays: 9 },
  cases: [
    { id: 'cone', label: 'Cutting a cone', set: {}, examples: [
      { id: 'circle', label: 'Flat cut: a circle', controls: ['beta'], set: { beta: 0 } },
      { id: 'parabola', label: 'Parallel to the side: a parabola', controls: ['beta'], set: { beta: 60 } },
      { id: 'hyperbola', label: 'Steep cut: both nappes', controls: ['beta'], set: { beta: 80 } },
    ] },
    { id: 'focus', label: 'Focus and directrix', set: {}, examples: [
      { id: 'circle', label: 'e → 0: a circle', controls: ['e'], set: { e: 0.05 } },
      { id: 'parabola', label: 'e = 1: parabola', controls: ['e'], set: { e: 1 } },
      { id: 'hyper', label: 'e = 1.5: hyperbola', controls: ['e'], set: { e: 1.5 } },
    ] },
    { id: 'reflect', label: 'Reflection', set: {}, examples: [
      { id: 'dish', label: 'Parabola: a dish antenna', controls: ['e'], set: { e: 1 } },
      { id: 'gallery', label: 'Ellipse: focus to focus', controls: ['e'], set: { e: 0.6 } },
    ] },
  ],
  controls: [
    { title: 'Cut', show: (s) => s.case === 'cone', items: [
      { id: 'alpha', label: 'Cone half-angle α', unit: '°', min: 15, max: 45, step: 1 }, { id: 'beta', label: 'Plane tilt β', unit: '°', min: 0, max: 85, step: 0.5 }, { id: 'h', label: 'Plane height', unit: '', min: 0.3, max: 2, step: 0.05 },
    ] },
    { title: 'Conic', show: (s) => s.case !== 'cone', items: [
      { id: 'e', label: 'Eccentricity e', unit: '', min: 0.02, max: 2, step: 0.01 }, { id: 'p', label: 'Semi-latus rectum p', unit: '', min: 0.5, max: 2.5, step: 0.05 },
      { id: 'nrays', label: 'Rays', unit: '', min: 3, max: 25, step: 1, show: (s) => s.case === 'reflect' },
    ] },
  ],
  hud: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }],

  setup(ctx) {
    const { state, time, hud, stage, scene } = ctx;
    const sq = createChart(ctx, { box: SQ, grid: true });
    const coneMat = new THREE.MeshLambertMaterial({ color: cssVar('--c-ref'), transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }), planeMat = new THREE.MeshLambertMaterial({ color: cssVar('--c-B'), transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    const cone = new THREE.Group(), plane = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), planeMat); scene.add(cone, plane);
    const cut = createCurve(stage, { max: 1600, width: 3.4, color: '--c-I' }), axis = createCurve(stage, { max: 2, width: 1.2, color: '--ink-dim' }), rays = createCurve(stage, { max: 200, width: 1.4, color: '--c-v' }), extra = createCurve(stage, { max: 20, width: 2, color: '--accent' });
    let ck = '';
    return {
      changed() {
        const c = state.case, v3 = c === 'cone'; stage.setOrtho(!v3); stage.controls.enableRotate = v3; stage.preset(v3 ? 'iso' : 'top');
        cone.visible = plane.visible = axis.object.visible = v3; sq.show(!v3); cut.object.visible = true; rays.object.visible = c === 'reflect'; extra.object.visible = c === 'focus'; ctx.setDuration(v3 ? 0 : 8);
      },
      update() {
        const c = state.case, u = (time.t % 8) / 8;
        if (c === 'cone') {
          const al = state.alpha * deg, be = state.beta * deg, H = 2.6, R = H * Math.tan(al);
          if (ck !== `${state.alpha}`) { ck = `${state.alpha}`; cone.clear(); for (const sgn of [1, -1]) { const m = new THREE.Mesh(new THREE.ConeGeometry(R, H, 64, 1, true), coneMat); m.rotation.x = sgn > 0 ? -Math.PI / 2 : Math.PI / 2; m.position.z = sgn * H / 2; cone.add(m); } }
          plane.rotation.set(be, 0, 0); plane.position.set(0, 0, state.h);
          const P = section(al, be, state.h, 800).filter(([, , z]) => Math.abs(z) <= H), seg = [];
          // join consecutive points of the same branch (even indices: +x, odd: −x)
          for (const off of [0, 1]) for (let i = off; i + 2 < P.length; i += 2) { const a = P[i], b = P[i + 2]; if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.3) seg.push(...a, ...b); }
          // close the ellipse/circle at its ends
          cut.segments(seg); axis.segments([0, 0, -H, 0, 0, H]);
          const k = kind(al, be), e = eccentricity(al, be);
          hud.set('a', `cone half-angle ${state.alpha}°, plane tilt ${state.beta}° → ${k}`); hud.set('b', `eccentricity e = sin β / cos α = ${fmt(e)}`, '');
          hud.set('c', 'tilt < 90° − α: closed curve · = 90° − α: parabola · > 90° − α: the plane cuts both halves (hyperbola)');
        } else {
          const e = state.e, p = state.p, ar = SQ[3] / SQ[2], W = 4; sq.range([-W, W], [-W * ar, W * ar]); sq.titles('x', c === 'focus' ? 'focus at the origin, directrix (dashed) at x = p/e' : 'rays leaving the focus and bouncing off the curve');
          const ths = Array.from({ length: 1441 }, (_, i) => -Math.PI + 2 * Math.PI * i / 1440), pts = ths.map((t) => { const r = polarConic(e, p, t); return r > 0 && r < 30 ? [r * Math.cos(t), r * Math.sin(t)] : null; });
          const seg = []; for (let i = 0; i + 1 < pts.length; i++) if (pts[i] && pts[i + 1] && Math.hypot(pts[i][0] - pts[i + 1][0], pts[i][1] - pts[i + 1][1]) < 1) seg.push(sq.mx(pts[i][0]), sq.my(pts[i][1]), 0.003, sq.mx(pts[i + 1][0]), sq.my(pts[i + 1][1]), 0.003); cut.segments(seg);
          sq.dots('f', [0], [0], { color: '--c-north', size: 12 });
          const aa = e < 1 ? p / (1 - e * e) : NaN, cc = e * aa;
          if (e < 1) sq.dots('f2', [-2 * cc], [0], { color: '--c-north', size: 12 }); else sq.dots('f2', [], [], { color: '--c-north' });
          if (c === 'focus') {
            const dx = p / e; sq.line('dir', [dx, dx], [-W * ar, W * ar], { color: '--ink-dim', dashed: true, width: 1.4 });
            let t = -Math.PI + 2 * Math.PI * u, r = polarConic(e, p, t); if (!(r > 0 && r < 30)) { t = 0; r = polarConic(e, p, 0); }
            const P = [r * Math.cos(t), r * Math.sin(t)]; extra.segments([sq.mx(0), sq.my(0), 0.004, sq.mx(P[0]), sq.my(P[1]), 0.004, sq.mx(P[0]), sq.my(P[1]), 0.004, sq.mx(dx), sq.my(P[1]), 0.004]); sq.dots('P', [P[0]], [P[1]], { color: '--accent', size: 11 });
            const PF = Math.hypot(...P), PD = Math.abs(dx - P[0]);
            hud.set('a', `distance to focus ${fmt(PF)} = e × distance to directrix ${fmt(PD)} (ratio ${fmt(PF / PD)})`); hud.set('b', e < 1 ? `ellipse: the two distances to the foci add up to 2a = ${fmt(2 * aa)}` : e === 1 ? 'parabola: equally far from the focus and the line' : 'hyperbola: the difference of the distances to the foci is constant');
            hud.set('c', 'e < 1 ellipse · e = 1 parabola · e > 1 hyperbola: one family, one number');
          } else {
            const ray = []; const N = state.nrays;
            for (let k = 0; k < N; k++) { const t = -Math.PI * 0.85 + 1.7 * Math.PI * k / (N - 1), r = polarConic(e, p, t); if (!(r > 0 && r < 6)) continue; const P = [r * Math.cos(t), r * Math.sin(t)];
              // tangent by derivative of the polar curve, then reflect the incoming direction
              const h = 1e-4, r2 = polarConic(e, p, t + h), Q = [r2 * Math.cos(t + h), r2 * Math.sin(t + h)], tx = Q[0] - P[0], ty = Q[1] - P[1], tl = Math.hypot(tx, ty), T = [tx / tl, ty / tl], d = [P[0] / r, P[1] / r], dot = d[0] * T[0] + d[1] * T[1], R = [2 * dot * T[0] - d[0], 2 * dot * T[1] - d[1]], L = e < 1 ? Math.hypot(P[0] + 2 * cc, P[1]) : 6;
              ray.push(sq.mx(0), sq.my(0), 0.002, sq.mx(P[0]), sq.my(P[1]), 0.002, sq.mx(P[0]), sq.my(P[1]), 0.002, sq.mx(P[0] + L * R[0]), sq.my(P[1] + L * R[1]), 0.002); }
            rays.segments(ray);
            hud.set('a', e === 1 ? 'parabola: every ray from the focus leaves parallel to the axis — and incoming parallel rays all meet at the focus' : e < 1 ? 'ellipse: every ray from one focus passes through the other' : 'hyperbola: reflected rays seem to come from the other focus');
            hud.set('b', 'the curve’s normal bisects the angle between the two focal lines'); hud.set('c', 'satellite dishes, car headlights, whispering galleries, kidney-stone lithotripters');
          }
        }
      },
      theme() { sq.theme(); cut.theme(); axis.theme(); rays.theme(); extra.theme(); coneMat.color.set(cssVar('--c-ref')); planeMat.color.set(cssVar('--c-B')); },
    };
  },
};
