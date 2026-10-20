// Instanced arrow glyphs: one draw call for any number of arrows. Length and colour encode magnitude.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cmap } from './colormap.js';

export function createArrows(stage, max) {
  const shaft = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6).translate(0, 0.35, 0);
  const head = new THREE.ConeGeometry(0.16, 0.3, 10).translate(0, 0.85, 0);
  const geom = mergeGeometries([shaft, head]);
  const mat = new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(geom, mat, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  stage.scene.add(mesh);
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(),
    p = new THREE.Vector3(), m4 = new THREE.Matrix4(), col = new THREE.Color(), rgb = [0, 0, 0];
  return {
    mesh,
    // items: [{ p: [x,y,z], v: [vx,vy,vz] }]; len(|v|) -> world length; map/norm colour, or fixed `color`.
    set(items, { len, width, map, norm, color }) {
      let n = 0;
      for (const it of items) {
        const mag = Math.hypot(it.v[0], it.v[1], it.v[2]);
        if (!(mag > 0) || n >= max) continue;
        const L = len(mag);
        if (!(L > 0)) continue;
        d.set(it.v[0] / mag, it.v[1] / mag, it.v[2] / mag);
        q.setFromUnitVectors(up, d);
        s.set(width, L, width);
        m4.compose(p.set(it.p[0] - d.x * L / 2, it.p[1] - d.y * L / 2, it.p[2] - d.z * L / 2), q, s);
        mesh.setMatrixAt(n, m4);
        if (color) col.set(color); else { cmap(map, norm(mag), rgb); col.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace); }
        mesh.setColorAt(n, col);
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}
