// Subject page (one file per subject: maths, physics…). The collapsible left bar lists its topics; the
// selected topic is mounted on the right. ?lab=<topic>&case=<case>&ex=<example> picks the view.
import { mountLab } from './lab.js';
import { initTheme } from './theme.js';
import { readUrl } from './urlstate.js';

export function startTopic({ name, labs: all }) {
  document.body.innerHTML = `<div class="topic">
    <header class="tbar">
      <a class="home" href="../../index.html" title="All subjects"><span class="logo">∇</span></a>
      <button class="btn" data-a="side" aria-expanded="true" title="Topics" aria-label="Topics">☰</button>
      <span class="crumb"><b>${name}</b> <span class="sep">›</span> <span class="cur"></span></span>
      <span class="spacer"></span>
      <button class="btn round" data-a="explain" aria-expanded="false" title="Explain (topic, case and example)" aria-label="Explain">?</button>
      <button class="btn" data-a="view" title="Reset view" aria-label="Reset view">⟲</button>
      <button class="btn" data-a="theme"></button>
      <button class="btn" data-a="panel" aria-expanded="true" title="Settings" aria-label="Settings">⚙&#xFE0E;</button>
    </header>
    <div class="shell">
      <nav class="side" aria-label="${name} topics">${all.map((l) => `<a href="?lab=${l.id}" data-lab="${l.id}">${l.title}</a>`).join('')}</nav>
      <div class="mount"></div>
    </div></div>`;
  const $ = (s) => document.querySelector(s), btn = (a) => $(`[data-a="${a}"]`);
  const mount = $('.mount');
  let cur = null, curId = null;

  const urlFor = (id, p) => {
    const qs = new URLSearchParams({ lab: id });
    if (p?.case) qs.set('case', p.case);
    if (p?.example) qs.set('ex', p.example);
    for (const [k, v] of Object.entries(p?.diff || {})) qs.set(k, String(v));
    return `${location.pathname}?${qs}`;
  };
  let urlTimer = 0;
  const onUrl = (p) => { clearTimeout(urlTimer); urlTimer = setTimeout(() => { try { history.replaceState(null, '', urlFor(curId, p)); } catch { /* file:// */ } }, 250); };

  function open(id, url = {}) {
    const def = all.find((l) => l.id === id) || all[0];
    cur?.dispose();
    curId = def.id;
    document.title = `${def.title} · ${name}`;
    for (const a of document.querySelectorAll('.side a')) a.setAttribute('aria-current', String(a.dataset.lab === def.id));
    $('.cur').textContent = def.title;
    cur = mountLab(def, mount, { url, onUrl });
    btn('explain').setAttribute('aria-expanded', 'false');
    cur.theme();
    window.__lab = cur;
  }

  const narrow = () => matchMedia('(max-width: 1100px)').matches;
  const side = (on) => { $('.topic').classList.toggle('side-closed', !on); btn('side').setAttribute('aria-expanded', String(on)); };
  for (const a of document.querySelectorAll('.side a')) a.addEventListener('click', (e) => { e.preventDefault(); open(a.dataset.lab); onUrl({}); if (narrow()) side(false); });
  btn('side').addEventListener('click', () => { const on = $('.topic').classList.contains('side-closed'); side(on); try { localStorage.setItem('labs-side', on ? 'open' : 'closed'); } catch { /* ignore */ } });
  let sideOpen = !narrow();
  try { if (!narrow() && localStorage.getItem('labs-side') === 'closed') sideOpen = false; } catch { /* ignore */ }
  side(sideOpen);
  btn('explain').addEventListener('click', () => btn('explain').setAttribute('aria-expanded', String(cur.toggleExplain())));
  btn('view').addEventListener('click', () => cur.resetView());
  btn('panel').addEventListener('click', (e) => { const c = $('.topic').classList.toggle('panel-closed'); e.currentTarget.setAttribute('aria-expanded', String(!c)); });
  if (matchMedia('(max-width: 760px)').matches) { $('.topic').classList.add('panel-closed'); btn('panel').setAttribute('aria-expanded', 'false'); }
  addEventListener('keydown', (e) => { if (!e.target.closest('input, select, textarea') && !e.metaKey && !e.ctrlKey && !e.altKey) cur?.key(e); });

  const u = readUrl();
  initTheme(btn('theme'), () => cur?.theme());
  open(u.params.lab, u);
  window.__topic = { labs: all.map((l) => l.id), open: (id) => open(id) };
}
