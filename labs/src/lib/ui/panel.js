// Control panel, top to bottom: Scenario (one click sets everything), the controls for that scenario
// in named groups, then View (what is drawn, collapsed). Hints are tooltips; a hint may be a function
// of the state, so a mode switch can explain the mode currently selected.
//
// spec = { scenarios: [{ id, label, hint, controls? }], onScenario(id), controls: [group], display: [group] }
//   scenario.controls: ids of the controls this scenario uses (default: all)
// group = { title, show?(state), items: [item] }
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
  const scenario = () => spec.scenarios?.find((s) => s.id === state.scenario);
  const used = (it) => !it.id || !scenario()?.controls || scenario().controls.includes(it.id);

  if (spec.scenarios?.length > 1) {
    const sec = html('<section class="psec"><h2>Scenario</h2><div class="scenarios"></div></section>');
    const box = sec.querySelector('.scenarios');
    const btns = spec.scenarios.map((s) => {
      const b = html(`<button class="scen" aria-pressed="false"${s.hint ? ` title="${s.hint}"` : ''}>${s.label}</button>`);
      b.addEventListener('click', () => spec.onScenario(s.id));
      box.append(b);
      return [s.id, b];
    });
    syncs.push(() => { for (const [id, b] of btns) b.setAttribute('aria-pressed', String(id === state.scenario)); });
    root.append(sec);
  }

  const groups = (list, box) => {
    for (const g of list || []) {
      const d = html(`<div class="group"><h3>${g.title}</h3></div>`);
      const items = g.items.map((it) => { const [el, vis] = item(it); d.append(el); return vis; });
      box.append(d);
      syncs.push(() => d.classList.toggle('hidden', (g.show && !g.show(state)) || !items.some((v) => v())));
    }
  };

  function item(it) {
    const id = `c${++uid}`;
    let el, sync;
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
    let vis = true;
    syncs.push(() => {
      sync();
      el.title = text(it.hint, state);
      vis = used(it) && (!it.show || it.show(state));
      el.classList.toggle('hidden', !vis);
    });
    return [el, () => vis];
  }

  const controls = html('<section class="psec"></section>');
  groups(spec.controls, controls);
  root.append(controls);
  if (spec.display?.length) {
    const view = html('<details class="psec view"><summary>View</summary></details>');
    groups(spec.display, view);
    root.append(view);
  }

  const api = { sync() { for (const f of syncs) f(); } };
  api.sync();
  return api;
}
