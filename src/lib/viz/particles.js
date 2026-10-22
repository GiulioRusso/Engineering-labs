// Particles that flow along precomputed field lines with speed ∝ |B| (capped near singularities).
// Positions live in one BufferAttribute updated in place each frame.
import * as THREE from 'three';

export function createParticles(stage, { count = 1500, size = 3.2 } = {}) {
  const pos = new Float32Array(count * 3);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.PointsMaterial({ size, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false });
  const obj = new THREE.Points(geom, mat);
  obj.frustumCulled = false;
  stage.scene.add(obj);
  let P = [], lines = [];

  // lines: [{ pts, mags }] — arc length tables are built here.
  function setLines(newLines) {
    lines = newLines.filter((l) => l.mags.length > 2).map((l) => {
      const n = l.mags.length, s = new Float64Array(n);
      for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(l.pts[3 * i] - l.pts[3 * i - 3], l.pts[3 * i + 1] - l.pts[3 * i - 2], l.pts[3 * i + 2] - l.pts[3 * i - 1]);
      return { ...l, s, len: s[n - 1] };
    });
    const total = lines.reduce((a, l) => a + l.len, 0);
    P = [];
    if (!total) { geom.setDrawRange(0, 0); return; }
    // Deterministic spread proportional to line length (golden-ratio offsets, no RNG).
    for (const [li, l] of lines.entries()) {
      const n = Math.round(count * l.len / total);
      for (let k = 0; k < n && P.length < count; k++) P.push({ li, s: l.len * ((k + 0.5) / n + 0.618 * li) % l.len, i: 0 });
    }
    geom.setDrawRange(0, P.length);
    advance(0, 0, 1);
  }

  // speed: metres per second at |B| = bRef; sign flips the flow direction.
  function advance(dt, speed, bRef) {
    for (let k = 0; k < P.length; k++) {
      const p = P[k], l = lines[p.li], n = l.mags.length;
      let i = p.i;
      while (i < n - 2 && l.s[i + 1] < p.s) i++;
      while (i > 0 && l.s[i] > p.s) i--;
      const m = Math.min(3, l.mags[i] / bRef);
      p.s += speed * m * dt;
      if (p.s >= l.len) { p.s -= l.len; i = 0; } else if (p.s < 0) { p.s += l.len; i = n - 2; }
      while (i < n - 2 && l.s[i + 1] < p.s) i++;
      while (i > 0 && l.s[i] > p.s) i--;
      p.i = i;
      const u = (p.s - l.s[i]) / ((l.s[i + 1] - l.s[i]) || 1);
      for (let c = 0; c < 3; c++) pos[3 * k + c] = l.pts[3 * i + c] + u * (l.pts[3 * i + 3 + c] - l.pts[3 * i + c]);
    }
    geom.attributes.position.needsUpdate = true;
  }
  return { object: obj, setLines, advance, material: mat };
}
