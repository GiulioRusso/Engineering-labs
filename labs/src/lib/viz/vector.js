// A single vector arrow (shaft + head + optional label), coloured by a semantic CSS variable.
import * as THREE from 'three';
import { label } from '../ui/stage.js';
import { cssVar } from '../ui/theme.js';

export function createVector(parent, colorVar, text = '', { radius = 0.0022 } = {}) {
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 14).translate(0, 0.5, 0), mat);
  g.add(shaft, head);
  const lb = text ? label(text) : null;
  if (lb) g.add(lb);
  parent.add(g);
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  const api = {
    group: g, material: mat, colorVar, label: lb, radius,
    // origin [x,y,z], direction v (any length), drawn length len (world units; ≤ 0 hides it)
    set(origin, v, len) {
      const m = Math.hypot(v[0], v[1], v[2]);
      g.visible = len > 1e-6 && m > 0;
      if (!g.visible) return api;
      d.set(v[0] / m, v[1] / m, v[2] / m);
      g.position.set(origin[0], origin[1], origin[2]);
      g.quaternion.setFromUnitVectors(up, d);
      const r = api.radius, hl = Math.min(r * 8, len * 0.4);
      shaft.scale.set(r, Math.max(1e-6, len - hl), r); head.position.y = len - hl; head.scale.set(r * 3, hl, r * 3);
      if (lb) lb.position.set(0, len + r * 6, 0);
      return api;
    },
    // from a to b
    between(a, b) { return api.set(a, [b[0] - a[0], b[1] - a[1], b[2] - a[2]], Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); },
    theme() { mat.color.set(cssVar(colorVar)); },
  };
  api.theme();
  return api;
}
