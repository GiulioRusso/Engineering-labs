// A draggable knob: a visible sphere plus a larger invisible hit sphere, so it is easy to grab.
import * as THREE from 'three';
import { cssVar } from '../ui/theme.js';

export function createKnob(parent, colorVar = '--accent', r = 0.05) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.45 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(r * 2.6, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  g.add(ball, hit);
  parent.add(g);
  const api = { group: g, ball, material: mat, colorVar, set(p) { g.position.set(p[0], p[1], p[2] ?? 0); return api; }, get: () => g.position.toArray(), theme() { mat.color.set(cssVar(api.colorVar)); } };
  api.theme();
  return api;
}
