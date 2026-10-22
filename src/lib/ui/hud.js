// Live readouts. rows: [{ id, label }] or 'sep'. set(id, text, cls?) updates one value; ids without a row are ignored.
export function createHud(el, rows) {
  const vals = {};
  el.setAttribute('aria-live', 'off');
  for (const r of rows) {
    if (r === 'sep') { el.insertAdjacentHTML('beforeend', '<div class="sep"></div>'); continue; }
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="k">${r.label}</span><span class="v"></span>`;
    el.append(row);
    vals[r.id] = { v: row.lastChild, row };
  }
  return {
    set(id, text, cls = '') { const o = vals[id]; if (!o) return; if (o.v.textContent !== text) o.v.textContent = text; o.v.className = `v ${cls}`; },
    show(id, on) { vals[id]?.row.classList.toggle('hidden', !on); },
  };
}
