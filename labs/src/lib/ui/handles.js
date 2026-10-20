// Direct manipulation: drag scene objects with the pointer. Each handle names the axes it may move
// along; the drag plane faces the camera and the result keeps only the allowed components, so a
// drag never jumps when the view is edge-on.
//
// add({ object, axes: 'xz' | 'z' | …, get() -> [x, y, z], set([x, y, z]), hint, onStart?, onEnd? })
import * as THREE from 'three';

export function createHandles(stage, hintEl) {
  const el = stage.renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const items = [], plane = new THREE.Plane(), hit = new THREE.Vector3(), offset = new THREE.Vector3();
  let drag = null, hover = null;

  const pick = (e) => {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    let best = null;
    for (const it of items) {
      if (!it.object.visible || it.enabled === false) continue;
      const h = ray.intersectObject(it.object, true)[0];
      if (h && (!best || h.distance < best.h.distance)) best = { it, h };
    }
    return best;
  };
  const showHint = (e, text) => {
    if (!hintEl) return;
    const r = el.getBoundingClientRect();
    hintEl.style.display = text ? 'block' : 'none';
    if (text) { hintEl.textContent = text; hintEl.style.left = `${e.clientX - r.left + 14}px`; hintEl.style.top = `${e.clientY - r.top + 14}px`; }
  };

  el.addEventListener('pointerdown', (e) => {
    const b = pick(e);
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    el.setPointerCapture(e.pointerId);
    const p = new THREE.Vector3(...b.it.get());
    const n = new THREE.Vector3();
    stage.camera.getWorldDirection(n);
    plane.setFromNormalAndCoplanarPoint(n, b.h.point);
    offset.copy(p).sub(b.h.point);
    drag = { it: b.it, id: e.pointerId };
    stage.controls.enabled = false;
    b.it.onStart?.();
    showHint(e, b.it.hint);
  }, { capture: true });

  el.addEventListener('pointermove', (e) => {
    if (drag) {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, stage.camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const cur = drag.it.get(), next = [...cur], q = hit.add(offset);
      for (const [i, a] of ['x', 'y', 'z'].entries()) if (drag.it.axes.includes(a)) next[i] = q.getComponent(i);
      drag.it.set(next);
      showHint(e, drag.it.hint);
      return;
    }
    if (e.pointerType === 'touch') return;
    const b = pick(e);
    const it = b ? b.it : null;
    if (it !== hover) { hover = it; el.style.cursor = it ? 'grab' : ''; }
    showHint(e, it ? it.hint : '');
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const it = drag.it;
    drag = null;
    stage.controls.enabled = true;
    it.onEnd?.();
    showHint(e, '');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', (e) => { if (!drag) showHint(e, ''); });

  return { add(it) { items.push(it); return it; }, get dragging() { return drag?.it || null; } };
}
