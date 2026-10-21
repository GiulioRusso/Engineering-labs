// The catalogue page: one card per subject, listing its topics.
// Written twice by build.mjs: labs/web/index.html and the repository's root index.html (`base` differs).
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const VIS = {
  algorithm: { title: 'Algorithm Visualizer', href: 'visualizations/algorithm-visualization/web/index.html',
    what: 'Step forwards and backwards through real C++ runs: arrays, sorting, lists, trees, heaps, graphs, scheduling, synchronization.' },
  electronics: { title: 'Electronics Visualizer', href: 'visualizations/electronics-visualization/web/index.html',
    what: 'Digital circuits gate by gate, with timing diagrams: gates, adders, latches, flip-flops, counters, state machines.' },
};
export const visTitle = (k) => VIS[k].title;

const HUE = {
  'analog-electronics': 28, circuits: 45, 'computer-science': 200, 'control-systems': 160, 'digital-electronics': 260,
  'electronic-warfare': 0, 'machine-learning': 300, maths: 220, physics: 190, 'signal-theory': 130,
};
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// labsRoot: absolute path of labs/; web: path from the page to labs/web/; repo: path from the page to the repo root.
export function renderCatalogue({ catalog, labsRoot, web, repo }) {
  const isBuilt = built(labsRoot);
  const hasMedia = (f) => existsSync(join(labsRoot, 'web', 'media', f));
  const index = []; // search index: every built topic
  let nTopics = 0;

  const cards = catalog.map((S) => {
    const done = (S.topics || []).filter((t) => isBuilt(S.subject, t));
    const style = `--hue:${HUE[S.subject] ?? 210}`;
    if (S.visualizer) {
      const v = VIS[S.visualizer];
      index.push({ s: S.name, t: v.title, w: v.what, h: `${repo}${v.href}` });
      return `<a class="card" style="${style}" href="${repo}${v.href}"><span class="name"><i></i>${esc(S.name)}</span><span class="sub">${v.title}</span></a>`;
    }
    if (!done.length) return `<div class="card soon" style="${style}"><span class="name"><i></i>${esc(S.name)}</span><span class="sub">coming soon</span></div>`;
    nTopics += done.length;
    for (const t of done) index.push({ s: S.name, t: t.title, w: t.what, g: t.group || '', h: `${web}${S.subject}.html?lab=${t.id}` });
    const img = hasMedia(`${done[0].id}.png`) ? `<img src="${web}media/${done[0].id}.png" alt="" loading="lazy">` : '';
    const groups = [];
    for (const t of done) { const g = t.group || ''; if (groups.at(-1)?.g !== g) groups.push({ g, ts: [] }); groups.at(-1).ts.push(t); }
    return `<div class="card big" style="${style}"><a class="head" href="${web}${S.subject}.html">${img}<span class="name"><i></i>${esc(S.name)}</span><span class="sub">${done.length} topics</span></a>
      <details class="list"><summary>Topics</summary>${groups.map(({ g, ts }) => `${g ? `<div class="grp">${esc(g)}</div>` : ''}${ts.map((t) => `<a href="${web}${S.subject}.html?lab=${t.id}">${esc(t.title)}</a>`).join('')}`).join('')}</details></div>`;
  });

  return `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Engineering Labs</title>
<meta name="description" content="Interactive lessons in maths, physics and engineering by Giulio Russo. They run offline, straight from the file.">
<meta name="author" content="Giulio Russo">
<style>
:root { --bg:#0b0f15; --panel:#121821; --panel2:#18202b; --ink:#e8edf4; --dim:#97a3b3; --line:#232c38; --accent:#6aa8ff; color-scheme: dark; }
:root[data-theme="light"] { --bg:#f6f7f9; --panel:#ffffff; --panel2:#f0f3f7; --ink:#131820; --dim:#566070; --line:#dfe4ea; --accent:#1d4ed8; color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 0 16px; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding-block: 18px 6px; }
.brand { font-weight: 700; font-size: 17px; display: flex; align-items: center; gap: 10px; }
.brand .logo { width: 28px; height: 28px; border-radius: 7px; background: var(--accent); display: grid; place-items: center; color: var(--bg); font-weight: 800; }
.btn { border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; cursor: pointer; }
.btn:hover { border-color: var(--accent); }
.intro { color: var(--dim); font-size: 14px; margin: 4px 0 16px; max-width: 680px; }
.intro b { color: var(--ink); font-weight: 600; } .intro a { color: var(--accent); }
.search { position: relative; margin-bottom: 18px; }
.search input { width: 100%; padding: 11px 14px 11px 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: inherit; }
.search input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.search::before { content: "⌕"; position: absolute; left: 13px; top: 8px; font-size: 19px; color: var(--dim); }
.results { display: grid; gap: 4px; padding-bottom: 60px; } .results[hidden], main[hidden] { display: none; }
.results a { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; padding: 9px 12px; border-radius: 9px; background: var(--panel); border: 1px solid var(--line); }
.results a:hover { border-color: var(--accent); }
.results .t { font-weight: 600; } .results .s { font-size: 12px; color: var(--dim); text-align: right; } .results .w { grid-column: 1 / -1; font-size: 13px; color: var(--dim); }
.results .none { color: var(--dim); padding: 8px 2px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; padding-bottom: 60px; }
.grid.big { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; padding-bottom: 14px; align-items: start; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; display: grid; gap: 2px; align-content: start; }
a.card:hover, .card .head:hover img { border-color: hsl(var(--hue) 70% 58%); }
.card.big { padding: 10px; }
.card .head { display: grid; gap: 2px; padding: 0 4px 4px; }
.card img { width: calc(100% + 8px); margin: 0 -4px 8px; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); }
.name { font-weight: 650; display: flex; align-items: center; gap: 8px; }
.name i { width: 9px; height: 9px; border-radius: 50%; background: hsl(var(--hue) 70% 58%); }
.sub { font-size: 12.5px; color: var(--dim); padding-left: 17px; }
.soon { opacity: .55; }
.list { border-top: 1px solid var(--line); margin-top: 4px; }
.list summary { cursor: pointer; font-size: 13px; color: var(--dim); padding: 7px 4px 3px; list-style: none; }
.list summary::-webkit-details-marker { display: none; }
.list summary::after { content: " ▸"; } .list[open] summary::after { content: " ▾"; }
.list .grp { font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--dim); font-weight: 700; padding: 8px 4px 2px; }
.list a { display: block; font-size: 13.5px; padding: 4px 4px; border-radius: 6px; }
.list a:hover { background: var(--panel2); color: var(--accent); }
footer { color: var(--dim); font-size: 12.5px; padding: 0 16px 40px; }
</style></head><body>
<div class="wrap topbar"><div class="brand"><span class="logo">∇</span>Engineering Labs</div><button class="btn" id="theme" title="Theme">☀</button></div>
<div class="wrap">
  <p class="intro">Interactive lessons for <b>${nTopics} topics</b> in maths, physics and engineering: drag things in 3D, change one thing at a time, read the explanation. Everything runs offline, straight from the file. By <b>Giulio Russo</b> · <a href="https://github.com/GiulioRusso/Engineering-scripts">source</a></p>
  <div class="search"><input id="q" type="search" placeholder="Search topics: pendulum, Bode, eigenvector…" aria-label="Search topics" autocomplete="off"></div>
  <div class="results" id="results" hidden></div>
</div>
<main class="wrap" id="cards"><div class="grid big">${cards.filter((c) => c.includes('card big')).join('\n')}</div>
<div class="grid">${cards.filter((c) => !c.includes('card big')).join('\n')}</div></main>
<script>
const INDEX = ${JSON.stringify(index).replace(/</g, '\\u003c')};
const b = document.getElementById('theme'), r = document.documentElement;
let t = 'dark'; try { t = localStorage.getItem('labs-theme') || t; } catch {}
const apply = () => { r.dataset.theme = t; b.textContent = t === 'light' ? '☾' : '☀'; };
b.onclick = () => { t = t === 'light' ? 'dark' : 'light'; try { localStorage.setItem('labs-theme', t); } catch {} apply(); };
apply();
const q = document.getElementById('q'), res = document.getElementById('results'), cards = document.getElementById('cards');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
q.addEventListener('input', () => {
  const words = norm(q.value).split(/\\s+/).filter(Boolean);
  res.hidden = !words.length; cards.hidden = !!words.length;
  if (!words.length) return;
  const hits = INDEX.filter((e) => { const h = norm(e.t + ' ' + e.w + ' ' + e.s + ' ' + (e.g || '')); return words.every((w) => h.includes(w)); });
  res.innerHTML = hits.length ? hits.map((e) => '<a href="' + e.h + '"><span class="t">' + esc(e.t) + '</span><span class="s">' + esc(e.s) + (e.g ? ' · ' + esc(e.g) : '') + '</span><span class="w">' + esc(e.w) + '</span></a>').join('') : '<div class="none">No topic matches.</div>';
});
q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = res.querySelector('a'); if (a) location.href = a.href; } });
</script></body></html>
`;
}

// built(labsRoot)(subject, topic): does src/<subject>/<from or id>/lab.js exist (see build.mjs)
export const built = (labsRoot) => (subject, t) => { const f = t.from || t.id; return existsSync(join(labsRoot, 'src', ...(f.includes('/') ? f.split('/') : [subject, f]), 'lab.js')); };

export function counts(catalog, labsRoot) {
  const isBuilt = built(labsRoot);
  let done = 0, planned = 0;
  for (const S of catalog) for (const t of S.topics || []) isBuilt(S.subject, t) ? done++ : planned++;
  return { built: done, planned };
}
