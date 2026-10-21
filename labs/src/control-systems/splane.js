// The s-plane: σ across, jω up, the unstable half-plane tinted, × / ○ for poles and zeros. Flat (2D, seen from
// above) by default; the 3D view adds the surface log|G(s)|, where poles are peaks and zeros pits.
import * as THREE from 'three';
import { createSurface } from '../lib/viz/surface.js';
import { createCurve } from '../lib/viz/curve.js';
import { evalTF, cabs } from './tf.js';

export const SX = [-5, 1.5], SY = [-3.5, 3.5];
const LO = -1.2, HI = 1.6, ZK = 0.5; // log10|G| clamp and height per decade
export const height = (g) => ZK * (Math.max(LO, Math.min(HI, Math.log10(g))) - LO);

export function createSPlane(ctx) {
  const { scene, stage } = ctx;
  const surf = createSurface(scene, { nx: 100, ny: 100, x: SX, y: SY, opacity: 0.78 });
  surf.mesh.material.depthWrite = false;
  const axes = createCurve(stage, { max: 2, width: 1.6, color: '--ink-dim' });
  axes.segments([SX[0], 0, 0, SX[1], 0, 0, 0, SY[0], 0, 0, SY[1], 0]);
  const rhp = new THREE.Mesh(new THREE.PlaneGeometry(SX[1], SY[1] - SY[0]), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  rhp.position.set(SX[1] / 2, 0, -0.002); scene.add(rhp);
  const crosses = createCurve(stage, { max: 80, width: 3, color: '--c-I' }), circles = createCurve(stage, { max: 400, width: 2.4, color: '--c-v' });
  const stems = createCurve(stage, { max: 40, width: 1, color: '--c-ref', dashed: true });
  const grid = createCurve(stage, { max: 40, width: 1, color: '--line' }), g = [];
  for (let v = -4; v <= 1; v++) g.push(v, SY[0], -0.003, v, SY[1], -0.003);
  for (let v = -3; v <= 3; v++) g.push(SX[0], v, -0.003, SX[1], v, -0.003);
  grid.segments(g);
  const tl = [];
  for (const [t, p] of [['σ', [SX[1] + 0.25, 0, 0]], ['jω', [0, SY[1] + 0.25, 0]], ['stable', [-2.5, SY[0] - 0.35, 0]], ['unstable', [0.75, SY[0] - 0.35, 0]]]) { const l = ctx.label(t, 'tick'); l.position.set(...p); scene.add(l); tl.push(l); }
  for (let v = -4; v <= 1; v++) if (v) { const l = ctx.label(String(v), 'tick'); l.position.set(v, -0.22, 0); scene.add(l); }
  for (const v of [-3, -2, -1, 1, 2, 3]) { const l = ctx.label(`${v}j`, 'tick'); l.position.set(0.25, v, 0); scene.add(l); }

  return {
    surf,
    // 2D: flat pole-zero map from above; 3D: the |G(s)| surface, orbit freely
    view(v3d) { surf.mesh.visible = stems.object.visible = v3d; ctx.stage.setOrtho(!v3d); ctx.stage.controls.enableRotate = v3d; },
    setTF(G) { surf.set((x, y) => height(cabs(evalTF(G, [x, y]))), { map: 'magma', norm: (z) => z / (ZK * (HI - LO)) }); },
    marks(poles, zeros = []) {
      const c = [], o = [], s = []; const r = 0.12;
      for (const [x, y] of poles) { if (x < SX[0] || x > SX[1] || Math.abs(y) > SY[1]) continue; c.push(x - r, y - r, 0.004, x + r, y + r, 0.004, x - r, y + r, 0.004, x + r, y - r, 0.004); s.push(x, y, 0, x, y, ZK * (HI - LO)); }
      for (const [x, y] of zeros) { if (x < SX[0] || x > SX[1] || Math.abs(y) > SY[1]) continue; for (let k = 0; k < 16; k++) { const a = 2 * Math.PI * k / 16, b = 2 * Math.PI * (k + 1) / 16; o.push(x + r * Math.cos(a), y + r * Math.sin(a), 0.004, x + r * Math.cos(b), y + r * Math.sin(b), 0.004); } }
      crosses.segments(c); circles.segments(o); stems.segments(s);
    },
    theme() { for (const k of [axes, crosses, circles, stems, grid]) k.theme(); rhp.material.color.set(ctx.cssVar('--c-north')); },
  };
}

export const VIEW3D = { id: 'view3d', label: '3D view: |G(s)| surface', type: 'check', hint: 'Poles become peaks; drag to orbit' };
export const camOf = (s) => (s.view3d ? 'iso' : 'top');
