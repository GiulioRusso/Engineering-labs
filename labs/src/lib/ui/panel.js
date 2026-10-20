// Control panel, always in the same order: Scenarios, Parameters, Layers, Time.
// Parameters are stored in SI in `state`; `k` scales them for display (e.g. k = 100 shows metres as cm).
//
// spec.params entries:
//   { id, label, unit, min, max, step, k = 1, log = false, show?: (state) => bool }   slider + number
//   { id, label, type: 'select', options: [[value, text], …], show? }
//   { id, label, type: 'check', show? }
// spec.layers: [{ id, label, color? }] -> boolean state[id]
export function createPanel(root, spec, state, onChange) {
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const rows = [];

  root.append(el('<h2 id="h-scen">Scenarios</h2>'));
  const scen = el('<div class="scenarios" role="group" aria-labelledby="h-scen"></div>');
  const scenBtns = {};
  for (const s of spec.scenarios) {
    const b = el(`<button class="btn" aria-pressed="false">${s.label}</button>`);
    b.addEventListener('click', () => spec.onScenario(s.id));
    scen.append(b); scenBtns[s.id] = b;
  }
  root.append(scen);

  root.append(el('<h2>Parameters</h2>'));
  for (const p of spec.params) {
    const id = `p-${p.id}`;
    let row, sync;
    if (p.type === 'select') {
      row = el(`<div class="param"><label for="${id}">${p.label}</label><select id="${id}">${p.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>`);
      const s = row.querySelector('select');
      s.addEventListener('change', () => { state[p.id] = typeof p.options[0][0] === 'number' ? Number(s.value) : s.value; onChange(p.id); });
      sync = () => { s.value = String(state[p.id]); };
    } else if (p.type === 'check') {
      row = el(`<label class="toggle param"><input type="checkbox" id="${id}"> ${p.label}</label>`);
      const c = row.querySelector('input');
      c.addEventListener('change', () => { state[p.id] = c.checked; onChange(p.id); });
      sync = () => { c.checked = !!state[p.id]; };
    } else {
      const k = p.k ?? 1, lo = p.min, hi = p.max;
      row = el(`<div class="param"><label for="${id}">${p.label}</label>
        <span class="num"><input type="number" id="${id}" step="any" min="${lo * k}" max="${hi * k}"
          aria-label="${p.label} in ${p.unit}"> ${p.unit}</span>
        <input type="range" min="0" max="1000" step="1" aria-label="${p.label}" aria-describedby="${id}"></div>`);
      const num = row.querySelector('input[type=number]'), rng = row.querySelector('input[type=range]');
      const toU = (v) => (p.log ? Math.log(v / lo) / Math.log(hi / lo) : (v - lo) / (hi - lo)) * 1000;
      const fromU = (u) => (p.log ? lo * Math.pow(hi / lo, u / 1000) : lo + (hi - lo) * u / 1000);
      const snap = (v) => {
        v = Math.min(hi, Math.max(lo, v));
        return p.step ? Math.round(v / p.step) * p.step : Number(v.toPrecision(3));
      };
      rng.addEventListener('input', () => { state[p.id] = snap(fromU(Number(rng.value))); num.value = fmt(state[p.id] * k); onChange(p.id); });
      num.addEventListener('change', () => {
        const v = Number(num.value) / k;
        if (Number.isFinite(v)) { state[p.id] = snap(v); onChange(p.id); }
        sync();
      });
      sync = () => { num.value = fmt(state[p.id] * k); rng.value = String(Math.round(toU(state[p.id]))); };
    }
    root.append(row);
    rows.push({ p, row, sync });
  }

  root.append(el('<h2>Layers</h2>'));
  for (const l of spec.layers) {
    if (l.options) {
      const row = el(`<div class="param"><label for="l-${l.id}">${l.label}</label><select id="l-${l.id}">${l.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>`);
      const s = row.querySelector('select');
      s.addEventListener('change', () => { state[l.id] = s.value; onChange(l.id); });
      root.append(row);
      rows.push({ p: l, row, sync: () => { s.value = String(state[l.id]); } });
      continue;
    }
    const row = el(`<label class="toggle"><input type="checkbox"> ${l.color ? `<span class="swatch" style="background:var(${l.color})"></span>` : ''}${l.label}</label>`);
    const c = row.querySelector('input');
    c.addEventListener('change', () => { state[l.id] = c.checked; onChange(l.id); });
    root.append(row);
    rows.push({ p: l, row, sync: () => { c.checked = !!state[l.id]; } });
  }

  root.append(el('<h2>Time</h2>'));
  const time = el(`<div>
    <div class="timebar"><button class="btn" data-a="play" aria-label="Play"></button>
      <button class="btn" data-a="step" aria-label="Step forward" title="Step">Step</button>
      <input type="range" min="0" max="1000" value="0" aria-label="Scrub time"><span class="t">0 s</span></div>
    <div class="param"><label for="p-speed">Speed</label><span class="num"><output id="p-speed-out"></output>×</span>
      <input id="p-speed" type="range" min="0" max="1000" aria-label="Playback speed"></div></div>`);
  root.append(time);

  function fmt(v) { return Number(v.toPrecision(4)).toString(); }
  const api = {
    sync() {
      for (const r of rows) { r.sync(); r.row.classList.toggle('hidden', r.p.show ? !r.p.show(state) : false); }
      for (const [id, b] of Object.entries(scenBtns)) b.setAttribute('aria-pressed', String(id === state.scenario));
    },
    time: {
      play: time.querySelector('[data-a=play]'), step: time.querySelector('[data-a=step]'),
      scrub: time.querySelector('.timebar input'), label: time.querySelector('.t'),
      speed: time.querySelector('#p-speed'), speedOut: time.querySelector('#p-speed-out'),
    },
  };
  api.sync();
  return api;
}
