// Thick polylines / segment sets (LineSegments2) with a preallocated buffer updated in place, for
// trails, graphs and contours that change every frame. One draw call per curve.
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { cssVar } from '../ui/theme.js';

export function createCurve(stage, { max = 2048, width = 2, color = '--c-B', opacity = 1, dashed = false, parent } = {}) {
  const g = new LineSegmentsGeometry();
  g.setPositions(new Float32Array(max * 6));
  const mat = new LineMaterial({ linewidth: width, worldUnits: false, transparent: opacity < 1, opacity, dashed, dashSize: 0.01, gapSize: 0.008 });
  const obj = new LineSegments2(g, mat);
  obj.frustumCulled = false;
  (parent || stage.scene).add(obj);
  const sz = stage.renderer.getSize(new (stage.THREE.Vector2)());
  mat.resolution.set(sz.x, sz.y);
  stage.onResize.push((w, h) => mat.resolution.set(w, h));
  const buf = g.attributes.instanceStart.data, a = buf.array;
  g.instanceCount = 0;
  const api = {
    object: obj, material: mat, colorVar: color,
    // flat [x0,y0,z0, x1,y1,z1, …] polyline
    set(pts, closed = false) {
      const n = pts.length / 3;
      let k = 0;
      for (let i = 0; i + 1 < n && k < max; i++, k++) for (let c = 0; c < 6; c++) a[6 * k + c] = pts[3 * i + c];
      if (closed && n > 2 && k < max) { for (let c = 0; c < 3; c++) { a[6 * k + c] = pts[3 * (n - 1) + c]; a[6 * k + 3 + c] = pts[c]; } k++; }
      g.instanceCount = k; buf.needsUpdate = true;
      if (dashed) obj.computeLineDistances();
      return api;
    },
    // flat [ax,ay,az, bx,by,bz, …] independent segments
    segments(seg) {
      const k = Math.min(max, seg.length / 6);
      for (let i = 0; i < 6 * k; i++) a[i] = seg[i];
      g.instanceCount = k; buf.needsUpdate = true;
      return api;
    },
    theme() { mat.color.set(cssVar(color)); },
  };
  api.theme();
  return api;
}
