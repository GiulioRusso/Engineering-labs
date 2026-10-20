// Slice plane: a colour-mapped magnitude image on a plane through the scene, recomputed on demand.
// orientation 'xz' (normal y, offset = y) or 'xy' (normal z, offset = z).
import * as THREE from 'three';
import { cmap } from './colormap.js';

export function createSlice(stage, { w, h, res = [160, 200] }) {
  const [nx, ny] = res, data = new Uint8Array(nx * ny * 4);
  const tex = new THREE.DataTexture(data, nx, ny, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.renderOrder = -1;
  stage.scene.add(mesh);
  const rgb = [0, 0, 0];
  const api = {
    mesh, orientation: 'xz', offset: 0, size: [w, h],
    place(orientation, offset) {
      api.orientation = orientation; api.offset = offset;
      mesh.rotation.set(0, 0, 0);
      if (orientation === 'xz') { mesh.rotation.x = Math.PI / 2; mesh.position.set(0, offset, 0); mesh.scale.set(w, h, 1); }
      else { mesh.position.set(0, 0, offset); mesh.scale.set(w, w, 1); }
    },
    // value(x, y, z) -> magnitude; norm -> [0, 1]
    compute(value, map, norm) {
      const [W, H] = api.orientation === 'xz' ? [w, h] : [w, w];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const u = (i + 0.5) / nx - 0.5, v = (j + 0.5) / ny - 0.5;
        const x = u * W, b = v * H;
        const val = api.orientation === 'xz' ? value(x, api.offset, b) : value(x, b, api.offset);
        cmap(map, norm(val), rgb);
        const o = 4 * (j * nx + i);
        const tt = norm(val);
        data[o] = rgb[0] * 255; data[o + 1] = rgb[1] * 255; data[o + 2] = rgb[2] * 255;
        data[o + 3] = 255 * Math.min(1, 0.06 + 1.1 * tt); // weak field fades out: the eye goes where the field is
      }
      tex.needsUpdate = true;
    },
  };
  api.place('xz', 0);
  return api;
}
