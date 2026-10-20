// Field lines: RK4 on the unit tangent B/|B| with step-doubling error control, rendered as one
// LineSegments2 (thick lines, one draw call) coloured by |B|.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { cmap } from './colormap.js';

// Vertex colours are linear in three.js; colormaps are sRGB.
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

// field(x, y, z, b) writes B into b and returns |B|. Stops when leaving `inside(x, y, z)`, when the
// line closes on its seed, at maxLen, or where |B| vanishes.
export function traceLine(field, seed, { dir = 1, hMin, hMax, tol, maxLen, inside }) {
  const b = [0, 0, 0], pts = [seed[0], seed[1], seed[2]], mags = [];
  const f = (x, y, z, o) => { const m = field(x, y, z, b); if (!(m > 0)) return 0; const s = dir / m; o[0] = b[0] * s; o[1] = b[1] * s; o[2] = b[2] * s; return m; };
  const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0];
  const rk4 = (p, h, out) => {
    if (!f(p[0], p[1], p[2], k1)) return false;
    f(p[0] + 0.5 * h * k1[0], p[1] + 0.5 * h * k1[1], p[2] + 0.5 * h * k1[2], k2);
    f(p[0] + 0.5 * h * k2[0], p[1] + 0.5 * h * k2[1], p[2] + 0.5 * h * k2[2], k3);
    f(p[0] + h * k3[0], p[1] + h * k3[1], p[2] + h * k3[2], k4);
    for (let i = 0; i < 3; i++) out[i] = p[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    return true;
  };
  let p = [...seed], h = hMax / 4, len = 0;
  mags.push(field(p[0], p[1], p[2], b));
  const a = [0, 0, 0], m = [0, 0, 0], c = [0, 0, 0];
  for (let n = 0; n < 6000 && len < maxLen; n++) {
    if (!rk4(p, h, a) || !rk4(p, h / 2, m) || !rk4(m, h / 2, c)) break;
    const err = Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
    if (err > tol && h > hMin) { h = Math.max(hMin, h / 2); continue; }
    p = [c[0], c[1], c[2]]; len += h;
    if (!inside(p[0], p[1], p[2])) break;
    pts.push(p[0], p[1], p[2]); mags.push(field(p[0], p[1], p[2], b));
    if (len > 8 * hMax && Math.hypot(p[0] - seed[0], p[1] - seed[1], p[2] - seed[2]) < 0.75 * h) { pts.push(seed[0], seed[1], seed[2]); mags.push(mags[0]); return { pts, mags, closed: true }; }
    if (err < tol / 32) h = Math.min(hMax, h * 2);
  }
  return { pts, mags, closed: false };
}

// Both directions from the seed, joined into one polyline.
export function traceBoth(field, seed, opt) {
  const fw = traceLine(field, seed, { ...opt, dir: 1 });
  if (fw.closed) return fw;
  const bw = traceLine(field, seed, { ...opt, dir: -1 });
  const pts = [], mags = [];
  for (let i = bw.mags.length - 1; i > 0; i--) { pts.push(bw.pts[3 * i], bw.pts[3 * i + 1], bw.pts[3 * i + 2]); mags.push(bw.mags[i]); }
  pts.push(...fw.pts); mags.push(...fw.mags);
  return { pts, mags, closed: false };
}

export function createFieldLines(stage, { width = 2.2 } = {}) {
  const geom = new LineSegmentsGeometry();
  const mat = new LineMaterial({ linewidth: width, vertexColors: true, worldUnits: false, transparent: true, opacity: 0.95 });
  const obj = new LineSegments2(geom, mat);
  stage.onResize.push((w, h) => mat.resolution.set(w, h));
  stage.scene.add(obj);
  let lines = [], colors = null;
  return {
    object: obj,
    get lines() { return lines; },
    // lines: [{ pts, mags }]; scale(|B|) -> [0, 1] colour coordinate
    set(newLines) {
      lines = newLines;
      let n = 0;
      for (const l of lines) n += Math.max(0, l.mags.length - 1);
      const pos = new Float32Array(n * 6);
      let o = 0;
      for (const l of lines) for (let i = 0; i + 1 < l.mags.length; i++) {
        for (let k = 0; k < 6; k++) pos[o + k] = l.pts[3 * i + k];
        o += 6;
      }
      colors = new Float32Array(n * 6);
      const g = new LineSegmentsGeometry();
      g.setPositions(pos);
      g.setColors(colors);
      obj.geometry.dispose();
      obj.geometry = g;
    },
    // Recolour in place: mag multiplier (e.g. |I(t)|) and normaliser.
    color(map, norm, mult = 1) {
      if (!colors) return;
      const c = [0, 0, 0];
      let o = 0;
      for (const l of lines) for (let i = 0; i + 1 < l.mags.length; i++) {
        cmap(map, norm(l.mags[i] * mult), c); colors[o] = lin(c[0]); colors[o + 1] = lin(c[1]); colors[o + 2] = lin(c[2]);
        cmap(map, norm(l.mags[i + 1] * mult), c); colors[o + 3] = lin(c[0]); colors[o + 4] = lin(c[1]); colors[o + 5] = lin(c[2]);
        o += 6;
      }
      const attr = obj.geometry.attributes;
      attr.instanceColorStart.data.needsUpdate = true;
    },
  };
}
