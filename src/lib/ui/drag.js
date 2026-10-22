// Pointer drag on a handle: move(dx, dy) while dragging, end(dx, dy) on release.
export function onDrag(handle, { start, move, end }) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); handle.setPointerCapture(e.pointerId);
    const x0 = e.clientX, y0 = e.clientY; start?.(); document.body.classList.add('dragging');
    const mv = (ev) => move(ev.clientX - x0, ev.clientY - y0);
    const up = (ev) => { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up); document.body.classList.remove('dragging'); end?.(ev.clientX - x0, ev.clientY - y0); };
    handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up);
  });
}
// localStorage that never throws (private windows, blocked storage)
export const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };
