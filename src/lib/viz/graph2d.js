// A 2D coordinate system drawn in the scene plane z = 0 (1 world unit = 1 graph unit): minor and major
// grid, axes, tick labels. Used for function graphs, the complex plane and optics benches.
import * as THREE from 'three';
import { createCurve } from './curve.js';
import { cssVar } from '../ui/theme.js';
import { label } from '../ui/stage.js';

// x, y: ranges in real units; k: world units per real unit (so a 40 m trajectory still fits the view);
// unit: appended to the outermost tick labels.
export function createGraph2D(stage, { x = [-5, 5], y = [-4, 4], step = 1, k = 1, unit = '', labels = true, parent } = {}) {
  const P = parent || stage.scene;
  const minor = createCurve(stage, { max: 600, width: 1, color: '--line', parent: P });
  const axes = createCurve(stage, { max: 4, width: 1.6, color: '--ink-dim', parent: P });
  const tick = [];
  function draw() {
    const seg = [], X0 = x[0] * k, X1 = x[1] * k, Y0 = y[0] * k, Y1 = y[1] * k;
    for (let v = Math.ceil(x[0] / step) * step; v <= x[1] + 1e-9; v += step) if (Math.abs(v) > 1e-9) seg.push(v * k, Y0, -0.001, v * k, Y1, -0.001);
    for (let v = Math.ceil(y[0] / step) * step; v <= y[1] + 1e-9; v += step) if (Math.abs(v) > 1e-9) seg.push(X0, v * k, -0.001, X1, v * k, -0.001);
    minor.segments(seg);
    axes.segments([X0, 0, 0, X1, 0, 0, 0, Y0, 0, 0, Y1, 0]);
    for (const t of tick) P.remove(t);
    tick.length = 0;
    if (!labels) return;
    const every = Math.max(1, Math.round((x[1] - x[0]) / step / 10)), txt = (v) => String(Number(v.toPrecision(3)));
    const xs = [], ys = [];
    for (let v = Math.ceil(x[0] / step) * step, i = 0; v <= x[1] + 1e-9; v += step, i++) if (Math.abs(v) > 1e-9 && i % every === 0) xs.push(v);
    for (let v = Math.ceil(y[0] / step) * step, i = 0; v <= y[1] + 1e-9; v += step, i++) if (Math.abs(v) > 1e-9 && i % every === 0) ys.push(v);
    xs.forEach((v, i) => { const l = label(`${txt(v)}${unit && i === xs.length - 1 ? ` ${unit}` : ''}`, 'tick'); l.position.set(v * k, -0.25 * step * k, 0); P.add(l); tick.push(l); });
    ys.forEach((v, i) => { const l = label(`${txt(v)}${unit && i === ys.length - 1 ? ` ${unit}` : ''}`, 'tick'); l.position.set(-0.3 * step * k, v * k, 0); P.add(l); tick.push(l); });
  }
  draw();
  return {
    minor, axes,
    set(nx, ny, nstep = step, nk = k) { x = nx; y = ny; step = nstep; k = nk; draw(); },
    theme() { minor.theme(); axes.theme(); },
    setVisible(v) { minor.object.visible = axes.object.visible = v; for (const t of tick) t.visible = v; },
  };
}

// A "nice" grid step for a span: 1, 2 or 5 × 10^n, about n steps across.
export function niceStep(span, n = 8) {
  const raw = span / n, m = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((f) => f * m).find((v) => v >= raw);
}

// Segments of y = f(x) sampled on [x0, x1], dropping pieces that leave the window or jump (asymptotes).
export function fnSegments(f, [x0, x1], [y0, y1], { n = 600, z = 0, map } = {}) {
  const out = [], span = y1 - y0;
  let px = x0, py = f(x0);
  for (let i = 1; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = f(x);
    const ok = Number.isFinite(py) && Number.isFinite(y) && Math.abs(y - py) < span && !(Math.max(py, y) < y0 || Math.min(py, y) > y1);
    if (ok) {
      const a = map ? map(px, Math.max(y0 - span, Math.min(y1 + span, py))) : [px, Math.max(y0 - span, Math.min(y1 + span, py)), z];
      const b = map ? map(x, Math.max(y0 - span, Math.min(y1 + span, y))) : [x, Math.max(y0 - span, Math.min(y1 + span, y)), z];
      out.push(...a, ...b);
    }
    px = x; py = y;
  }
  return out;
}

// A small marker dot with an optional label, for key points (roots, vertex, intercepts).
export function createDots(parent, n, { r = 0.06, color = '--ink' } = {}) {
  const mat = new THREE.MeshBasicMaterial(), geo = new THREE.SphereGeometry(r, 14, 10), dots = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, mat); const l = label(''); m.add(l); l.position.set(0, r * 3.2, 0); parent.add(m); dots.push({ m, l }); }
  return {
    // pts: [{ p: [x, y, z], text }]
    set(pts) { dots.forEach((d, i) => { const q = pts[i]; d.m.visible = !!q; if (q) { d.m.position.set(q.p[0], q.p[1], q.p[2] || 0); d.l.element.textContent = q.text || ''; d.l.visible = !!q.text; } }); },
    theme() { mat.color.set(cssVar(color)); },
  };
}
