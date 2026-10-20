// Height-field surface z = f(x, y) on a regular grid, coloured by a colormap, with optional contour
// lines (marching squares). Positions and colours are updated in place.
import * as THREE from 'three';
import { cmap } from './colormap.js';

export function createSurface(parent, { nx = 120, ny = 120, x = [-1, 1], y = [-1, 1], opacity = 0.92 } = {}) {
  const geom = new THREE.PlaneGeometry(x[1] - x[0], y[1] - y[0], nx - 1, ny - 1);
  geom.translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, 0);
  geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nx * ny * 3), 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: opacity < 1, opacity });
  const mesh = new THREE.Mesh(geom, mat);
  parent.add(mesh);
  const P = geom.attributes.position, C = geom.attributes.color, Z = new Float64Array(nx * ny), rgb = [0, 0, 0];
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const api = {
    mesh, nx, ny, x, y, Z,
    // f(x, y) -> height; colour from norm(height) unless color(x, y, z) -> [0,1] is given.
    set(f, { map = 'viridis', norm, color, zScale = 1, clamp = Infinity } = {}) {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < nx * ny; i++) { const v = f(P.getX(i), P.getY(i)); Z[i] = v; if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
      const nm = norm || ((v) => (v - lo) / (hi - lo || 1));
      for (let i = 0; i < nx * ny; i++) {
        const v = Z[i], zz = Math.max(-clamp, Math.min(clamp, Number.isFinite(v) ? v : clamp));
        P.setZ(i, zz * zScale);
        cmap(map, color ? color(P.getX(i), P.getY(i), v) : nm(v), rgb);
        C.setXYZ(i, lin(rgb[0]), lin(rgb[1]), lin(rgb[2]));
      }
      P.needsUpdate = true; C.needsUpdate = true; geom.computeVertexNormals();
      return { lo, hi };
    },
    // Contour segments of the last f at the given levels, lifted to z·zScale (+ offset). Flat segment list.
    contours(levels, { zScale = 1, lift = 0, flat = null, clamp = Infinity } = {}) {
      const out = [], gx = (i) => P.getX(i), gy = (i) => P.getY(i);
      for (const L of levels) for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) {
        const idx = [j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i], pts = [];
        for (let e = 0; e < 4; e++) {
          const a = idx[e], b = idx[(e + 1) % 4], za = Z[a] - L, zb = Z[b] - L;
          if (!Number.isFinite(za) || !Number.isFinite(zb)) continue;
          if ((za < 0) !== (zb < 0)) { const u = za / (za - zb); pts.push(gx(a) + u * (gx(b) - gx(a)), gy(a) + u * (gy(b) - gy(a))); }
        }
        const z = flat ?? Math.max(-clamp, Math.min(clamp, L)) * zScale + lift;
        for (let p = 0; p + 3 < pts.length; p += 4) out.push(pts[p], pts[p + 1], z, pts[p + 2], pts[p + 3], z);
      }
      return out;
    },
  };
  return api;
}
