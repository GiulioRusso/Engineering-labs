// Topic page: one file per topic. A sidebar lists the topic's animations grouped by the original
// notebook; the selected one is mounted on the right. ?lab=<id> picks the animation.
import { mountLab } from './lab.js';
import { initTheme } from './theme.js';
import { readUrl } from './urlstate.js';

export function startTopic({ name, groups }) {
  const all = groups.flatMap((g) => g.labs);
  document.body.innerHTML = `<div class="topic">
    <header class="tbar">
      <a class="home" href="../../index.html" title="All topics"><span class="logo">∇</span><span class="wide">Labs</span></a>
      <span class="crumb">${name}</span>
      <select class="labsel" aria-label="Animation">${groups.map((g) => `<optgroup label="${g.notebook}.ipynb">${g.labs.map((l) => `<option value="${l.id}">${l.title}</option>`).join('')}</optgroup>`).join('')}</select>
      <span class="spacer"></span>
      <button class="btn" data-a="explain" aria-expanded="false">Explain</button>
      <button class="btn" data-a="tour">Tour</button>
      <span class="btn-group wide" role="group" aria-label="Camera">${['front', 'side', 'top', 'iso'].map((c, i) => `<button class="btn" data-cam="${c}" title="${c} view (${i + 1})">${c[0].toUpperCase() + c.slice(1)}</button>`).join('')}</span>
      <button class="btn wide" data-a="ortho" aria-pressed="false" title="Orthographic projection">Ortho</button>
      <button class="btn wide" data-a="reset" title="Reset scenario (R)">Reset</button>
      <button class="btn wide" data-a="link" title="Copy a link to this exact view">Copy link</button>
      <button class="btn" data-a="theme"></button>
      <button class="btn" data-a="panel" aria-expanded="true">Controls</button>
    </header>
    <div class="shell">
      <nav class="side" aria-label="${name} animations">${groups.map((g) => `<div class="nbg"><div class="nbn">${g.notebook}.ipynb</div>
        ${g.labs.map((l) => `<a href="?lab=${l.id}" data-lab="${l.id}"><b>${l.title}</b><span>${l.summary || ''}</span></a>`).join('')}</div>`).join('')}</nav>
      <div class="mount"></div>
    </div></div>`;
  const $ = (s) => document.querySelector(s), btn = (a) => $(`[data-a="${a}"]`);
  const mount = $('.mount');
  let cur = null, curId = null;

  const urlFor = (id, p) => {
    const qs = new URLSearchParams({ lab: id });
    if (p?.scenario) qs.set('scenario', p.scenario);
    for (const [k, v] of Object.entries(p?.diff || {})) qs.set(k, String(v));
    return `${location.pathname}?${qs}${p?.tour ? `#tour-${p.tour}` : ''}`;
  };
  let urlTimer = 0;
  const onUrl = (p) => { clearTimeout(urlTimer); urlTimer = setTimeout(() => { try { history.replaceState(null, '', urlFor(curId, p)); } catch { /* file:// */ } }, 250); };

  function open(id, url = {}) {
    const def = all.find((l) => l.id === id) || all[0];
    cur?.dispose();
    curId = def.id;
    document.title = `${def.title} · ${name}`;
    for (const a of document.querySelectorAll('.side a')) a.setAttribute('aria-current', String(a.dataset.lab === def.id));
    $('.labsel').value = def.id;
    cur = mountLab(def, mount, { url, onUrl });
    btn('tour').hidden = !cur.hasTour;
    btn('ortho').setAttribute('aria-pressed', 'false');
    btn('explain').setAttribute('aria-expanded', 'false');
    cur.theme();
    window.__lab = cur;
  }

  for (const a of document.querySelectorAll('.side a')) a.addEventListener('click', (e) => { e.preventDefault(); open(a.dataset.lab); onUrl({}); });
  $('.labsel').addEventListener('change', (e) => { open(e.target.value); onUrl({}); });
  btn('explain').addEventListener('click', () => btn('explain').setAttribute('aria-expanded', String(cur.toggleExplain())));
  btn('tour').addEventListener('click', () => cur.toggleTour());
  btn('ortho').addEventListener('click', (e) => e.currentTarget.setAttribute('aria-pressed', String(cur.toggleOrtho())));
  btn('reset').addEventListener('click', () => cur.reset());
  for (const b of document.querySelectorAll('[data-cam]')) b.addEventListener('click', () => cur.preset(b.dataset.cam));
  btn('link').addEventListener('click', async (e) => {
    const url = location.href.split(/[?#]/)[0] + urlFor(curId, cur.urlParams()).replace(location.pathname, '');
    try { await navigator.clipboard.writeText(url); e.currentTarget.textContent = 'Copied'; } catch { prompt('Link to this view:', url); }
    setTimeout(() => { btn('link').textContent = 'Copy link'; }, 1500);
  });
  btn('panel').addEventListener('click', (e) => { const c = $('.topic').classList.toggle('panel-closed'); e.currentTarget.setAttribute('aria-expanded', String(!c)); });
  if (matchMedia('(max-width: 760px)').matches) { $('.topic').classList.add('panel-closed'); btn('panel').setAttribute('aria-expanded', 'false'); }
  addEventListener('keydown', (e) => { if (!e.target.closest('input, select, textarea') && !e.metaKey && !e.ctrlKey && !e.altKey) cur?.key(e); });

  const u = readUrl();
  initTheme(btn('theme'), () => cur?.theme());
  open(u.params.lab, u);
  window.__topic = { labs: all.map((l) => l.id), open: (id) => open(id) };
}
