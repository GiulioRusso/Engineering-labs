// Control panel: Scenarios first, then the settings in named, collapsible groups, then Display.
// Every control has a label, its unit and an optional one-line hint; a hint may be a function of the
// state, so a mode switch can explain the mode currently selected.
//
// spec = { scenarios: [{ id, label, hint }], onScenario(id), controls: [group], display: [group] }
// group = { title, hint?, open = true, show?(state), items: [item] }
// item types:
//   { id, label, unit, min, max, step?, k = 1, log?, hint?, show? }          slider + number (SI in state, ×k shown)
//   { id, label, type: 'segmented', options: [[value, text]], hint? }       mode switch (radio group)
//   { id, label, type: 'select', options: [[value, text]], hint? }
//   { id, label, type: 'check', color?, hint? }                              toggle
//   { type: 'readout', label, value: (state) => string }                    computed value, read-only
const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
const text = (v, state) => (typeof v === 'function' ? v(state) : v || '');
let uid = 0;

export function createPanel(root, spec, state, onChange) {
  root.innerHTML = '';
  const syncs = [];

  // ---- scenarios
  if (spec.scenarios?.length) {
    const sec = html('<section class="psec"><h2>Scenarios</h2><p class="ghint">Ready-made experiments. Each one sets everything below.</p><div class="scenarios"></div></section>');
    const box = sec.querySelector('.scenarios');
    const btns = spec.scenarios.map((s) => {
      const b = html(`<button class="scen" aria-pressed="false"><b>${s.label}</b>${s.hint ? `<span>${s.hint}</span>` : ''}</button>`);
      b.addEventListener('click', () => spec.onScenario(s.id));
      box.append(b);
      return [s.id, b];
    });
    syncs.push(() => { for (const [id, b] of btns) b.setAttribute('aria-pressed', String(id === state.scenario)); });
    root.append(sec);
  }

  const groups = (list, heading, sub) => {
    if (!list?.length) return;
    root.append(html(`<h2 class="phead">${heading}</h2>`));
    if (sub) root.append(html(`<p class="ghint top">${sub}</p>`));
    for (const g of list) {
      const d = html(`<details class="group"${g.open === false ? '' : ' open'}><summary>${g.title}</summary></details>`);
      if (g.hint) d.append(html(`<p class="ghint">${g.hint}</p>`));
      for (const it of g.items) d.append(item(it));
      root.append(d);
      if (g.show) syncs.push(() => d.classList.toggle('hidden', !g.show(state)));
    }
  };

  function item(it) {
    const id = `c${++uid}`;
    let el, sync;
    const hint = html('<div class="hint"></div>');
    if (it.type === 'segmented') {
      el = html(`<div class="item"><div class="lbl" id="${id}">${it.label}</div><div class="seg" role="radiogroup" aria-labelledby="${id}"></div></div>`);
      const seg = el.querySelector('.seg');
      const bs = it.options.map(([v, t]) => {
        const b = html(`<button role="radio" aria-checked="false">${t}</button>`);
        b.addEventListener('click', () => { state[it.id] = v; onChange(it.id); });
        seg.append(b);
        return [v, b];
      });
      sync = () => { for (const [v, b] of bs) b.setAttribute('aria-checked', String(v === state[it.id])); };
    } else if (it.type === 'select') {
      el = html(`<div class="item"><div class="row"><label for="${id}">${it.label}</label><select id="${id}">${it.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div></div>`);
      const s = el.querySelector('select');
      s.addEventListener('change', () => { const o = it.options.find(([v]) => String(v) === s.value); state[it.id] = o ? o[0] : s.value; onChange(it.id); });
      sync = () => { s.value = String(state[it.id]); };
    } else if (it.type === 'check') {
      el = html(`<div class="item"><label class="toggle"><input type="checkbox"> ${it.color ? `<span class="swatch" style="background:var(${it.color})"></span>` : ''}<span>${it.label}</span></label></div>`);
      const c = el.querySelector('input');
      c.addEventListener('change', () => { state[it.id] = c.checked; onChange(it.id); });
      sync = () => { c.checked = !!state[it.id]; };
    } else if (it.type === 'readout') {
      el = html(`<div class="item"><div class="row"><span class="lbl">${it.label}</span><output class="ro"></output></div></div>`);
      const o = el.querySelector('output');
      sync = () => { o.textContent = it.value(state); };
    } else {
      const k = it.k ?? 1, lo = it.min, hi = it.max;
      el = html(`<div class="item"><div class="row"><label for="${id}">${it.label}</label>
        <span class="val"><input type="number" id="${id}" step="any" min="${lo * k}" max="${hi * k}"><span class="unit">${it.unit || ''}</span></span></div>
        <input type="range" min="0" max="1000" step="1" aria-label="${it.label}"></div>`);
      const num = el.querySelector('input[type=number]'), rng = el.querySelector('input[type=range]');
      const toU = (v) => (it.log ? Math.log(v / lo) / Math.log(hi / lo) : (v - lo) / (hi - lo)) * 1000;
      const fromU = (u) => (it.log ? lo * Math.pow(hi / lo, u / 1000) : lo + (hi - lo) * u / 1000);
      const snap = (v) => { v = Math.min(hi, Math.max(lo, v)); return it.step ? Number((Math.round(v / it.step) * it.step).toPrecision(12)) : Number(v.toPrecision(3)); };
      const fmt = (v) => String(Number(v.toPrecision(4)));
      rng.addEventListener('input', () => { state[it.id] = snap(fromU(Number(rng.value))); num.value = fmt(state[it.id] * k); onChange(it.id); });
      num.addEventListener('change', () => { const v = Number(num.value) / k; if (Number.isFinite(v)) { state[it.id] = snap(v); onChange(it.id); } sync(); });
      sync = () => { num.value = fmt(state[it.id] * k); rng.value = String(Math.round(toU(state[it.id]))); };
    }
    el.append(hint);
    const full = () => { sync(); const h = text(it.hint, state); hint.textContent = h; hint.hidden = !h; if (it.show) el.classList.toggle('hidden', !it.show(state)); };
    syncs.push(full);
    return el;
  }

  groups(spec.controls, 'Settings');
  groups(spec.display, 'Display', 'What is drawn in the scene. None of this changes the physics.');

  const api = { sync() { for (const f of syncs) f(); } };
  api.sync();
  return api;
}
