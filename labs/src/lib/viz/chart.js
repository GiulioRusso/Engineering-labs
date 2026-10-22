// A 2D chart drawn in the scene (crisp lines, tick labels): a box in world units mapping a data range.
// series are created on first use; values outside the range are clipped to the box.
import * as THREE from 'three';
import { createCurve } from './curve.js';
import { cssVar } from '../ui/theme.js';
import { cmap } from './colormap.js';
import { niceStep } from './graph2d.js';

const fmt = (v) => String(Number(v.toPrecision(3)));

export function createChart(ctx, { box = [-4, -2.5, 8, 5], x = [0, 1], y = [-1, 1], xTitle = '', yTitle = '', z = 0, xTicks = true, yTicks = true, grid: showGrid = true } = {}) {
  const { stage, scene } = ctx, [X0, Y0, W, H] = box, curves = {}, labels = [], points = {}, images = {};
  const frame = createCurve(stage, { max: 8, width: 1.4, color: '--ink-dim' }), grid = createCurve(stage, { max: 60, width: 1, color: '--line' });
  const zero = createCurve(stage, { max: 1, width: 1.2, color: '--ink-dim' });
  const tx = ctx.label(xTitle, 'tick'), ty = ctx.label('', 'tick'), cap = ctx.label('', 'tick'); scene.add(tx, ty, cap);
  // y axis name written along the axis (rotated); a caption (what the curves are) centred above the box
  const setY = (t) => { ty.element.innerHTML = ''; const sp = document.createElement('span'); sp.textContent = t; sp.style.cssText = 'display:inline-block;transform:rotate(-90deg);white-space:nowrap'; ty.element.append(sp); ty.userData.text = t; };
  setY(yTitle);
  let xr = x, yr = y;
  const mx = (v) => X0 + W * (v - xr[0]) / (xr[1] - xr[0]), my = (v) => Y0 + H * (Math.max(yr[0], Math.min(yr[1], v)) - yr[0]) / (yr[1] - yr[0]);
  function axes() {
    frame.segments([X0, Y0, z, X0 + W, Y0, z, X0, Y0, z, X0, Y0 + H, z]);
    for (const l of labels) l.visible = false;
    let k = 0; const g = [], put = (t, px, py) => { if (!labels[k]) { labels[k] = ctx.label('', 'tick'); scene.add(labels[k]); } labels[k].element.textContent = t; labels[k].position.set(px, py, z); labels[k].visible = true; k++; };
    const sx = niceStep(xr[1] - xr[0], 6), sy = niceStep(yr[1] - yr[0], 4);
    if (xTicks) for (let v = Math.ceil(xr[0] / sx) * sx; v <= xr[1] + 1e-9; v += sx) { g.push(mx(v), Y0, z, mx(v), Y0 + H, z); put(fmt(v), mx(v), Y0 - 0.18); }
    if (yTicks) for (let v = Math.ceil(yr[0] / sy) * sy; v <= yr[1] + 1e-9; v += sy) { g.push(X0, my(v), z, X0 + W, my(v), z); put(fmt(v), X0 - 0.3, my(v)); }
    grid.segments(showGrid ? g : []);
    zero.object.visible = yr[0] < 0 && yr[1] > 0; if (zero.object.visible) zero.segments([X0, my(0), z, X0 + W, my(0), z]);
    tx.position.set(X0 + W / 2, Y0 - 0.42, z); ty.position.set(X0 - 0.62, Y0 + H / 2, z); cap.position.set(X0 + W / 2, Y0 + H + 0.18, z);
  }
  axes();
  const curve = (key, o = {}) => (curves[key] ??= createCurve(stage, { max: o.max || 2200, width: o.width || 2.4, color: o.color || '--c-B', dashed: o.dashed }));
  return {
    mx, my,
    range(nx, ny) { xr = nx || xr; yr = ny || yr; axes(); },
    // titles('x name (unit)', 'y name (unit): caption'): text after the first ': ' becomes the caption
    titles(a, b = '') { const i = b.indexOf(': '), yn = i < 0 ? b : b.slice(0, i), c = i < 0 ? '' : b.slice(i + 2); tx.element.textContent = a; setY(yn); cap.element.textContent = c;
      const on = frame.object.visible; tx.visible = on && !!a; ty.visible = on && !!yn; cap.visible = on && !!c; },
    line(key, xs, ys, o) { const c = curve(key, o), p = []; for (let i = 0; i < xs.length; i++) if (xs[i] >= xr[0] && xs[i] <= xr[1] && Number.isFinite(ys[i])) p.push(mx(xs[i]), my(ys[i]), z + 0.002); c.set(p); c.object.visible = true; return c; },
    stems(key, xs, ys, o) { const c = curve(key, { width: 3, ...o }), p = []; for (let i = 0; i < xs.length; i++) if (xs[i] >= xr[0] && xs[i] <= xr[1]) p.push(mx(xs[i]), my(0), z + 0.002, mx(xs[i]), my(ys[i]), z + 0.002); c.segments(p); c.object.visible = true; return c; },
    // heatmap filling the box: values[j * nx + i] (i along x, j along y) mapped by norm to [0, 1], then colormap
    image(key, values, nx, ny, { map = 'magma', norm = (v) => v, rgb = null } = {}) { // rgb(k, out): own colour per pixel
      let I = images[key];
      if (!I || I.nx !== nx || I.ny !== ny) {
        if (I) { scene.remove(I.mesh); I.tex.dispose(); }
        const data = new Uint8Array(nx * ny * 4), tex = new THREE.DataTexture(data, nx, ny, THREE.RGBAFormat);
        tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, depthWrite: false }));
        mesh.position.set(X0 + W / 2, Y0 + H / 2, z - 0.004); scene.add(mesh);
        I = images[key] = { mesh, tex, data, nx, ny };
      }
      const out = [0, 0, 0];
      for (let k = 0; k < nx * ny; k++) { if (rgb) rgb(k, out); else cmap(map, norm(values[k]), out); I.data[4 * k] = out[0] * 255; I.data[4 * k + 1] = out[1] * 255; I.data[4 * k + 2] = out[2] * 255; I.data[4 * k + 3] = 255; }
      I.tex.needsUpdate = true; I.mesh.visible = true;
    },
    // scatter: up to 4000 dots of one colour
    dots(key, xs, ys, { color = '--c-B', size = 4 } = {}) {
      let P = points[key];
      if (!P) { P = points[key] = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size, sizeAttenuation: false })); P.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4000 * 3), 3)); P.frustumCulled = false; P.userData.color = color; P.material.color.set(cssVar(color)); scene.add(P); }
      const A = P.geometry.attributes.position, n = Math.min(4000, xs.length);
      for (let i = 0; i < n; i++) A.setXYZ(i, mx(xs[i]), my(ys[i]), z + 0.003);
      A.needsUpdate = true; P.geometry.setDrawRange(0, n); P.visible = true;
    },
    hide(key) { if (curves[key]) curves[key].object.visible = false; },
    clear() { for (const c of Object.values(curves)) c.object.visible = false; for (const P of Object.values(points)) P.visible = false; for (const I of Object.values(images)) I.mesh.visible = false; },
    show(on) { for (const c of [frame, grid, zero]) c.object.visible = on; if (!on) this.clear(); for (const l of [...labels, tx, ty, cap]) l.visible = on && l.element.textContent !== ''; if (on) axes(); },
    theme() { for (const c of [frame, grid, zero, ...Object.values(curves)]) c.theme(); for (const P of Object.values(points)) P.material.color.set(cssVar(P.userData.color)); },
  };
}
