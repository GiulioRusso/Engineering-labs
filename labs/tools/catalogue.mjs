// The catalogue page: one card per subject, listing its topics.
// Written twice by build.mjs: labs/web/index.html and the repository's root index.html (`base` differs).
import { existsSync } from 'node:fs';
import { join } from 'node:path';


const HUE = {
  'analog-electronics': 28, circuits: 45, 'computer-science': 200, 'control-systems': 160, 'digital-electronics': 260,
  'electronic-warfare': 0, 'machine-learning': 300, maths: 220, physics: 190, 'signal-theory': 130,
};
// one simple line icon per subject (24×24, stroke = currentColor)
const ICON = {
  maths: '<path d="M18 5H7l6 7-6 7h11"/>',
  physics: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  'control-systems': '<rect x="9" y="3.5" width="6" height="5" rx="1"/><path d="M3 6h6M15 6h6v12H3V6"/><path d="M3 18l3-3m-3 3l3 3"/>',
  'computer-science': '<path d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16"/>',
  'digital-electronics': '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M12 2v4M15 2v4M9 18v4M12 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  'analog-electronics': '<circle cx="13" cy="12" r="7"/><path d="M2 12h7M9 8v8M9 10l6-4M9 14l6 4M15 6v-4M15 18v4"/>',
  circuits: '<path d="M2 12h4l2-4 3 8 3-8 3 8 2-4h3"/>',
  'electronic-warfare': '<path d="M12 20a8 8 0 0 1-8-8M12 16a4 4 0 0 1-4-4"/><circle cx="12" cy="12" r="1.5"/><path d="M12 12l7-7M15 4a8 8 0 0 1 5 5"/>',
  'machine-learning': '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l3 4M7 17l3-4M14 11l3-4M14 13l3 4"/>',
  'signal-theory': '<path d="M2 12c2.5-8 5-8 7.5 0s5 8 7.5 0 3.5-5 5-3"/>',
};
const icon = (k) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || '<circle cx="12" cy="12" r="8"/>'}</svg>`;
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
    if (!done.length) return `<div class="card soon" style="${style}"><span class="name">${icon(S.subject)}${esc(S.name)}</span><span class="sub">coming soon</span></div>`;
    nTopics += done.length;
    for (const t of done) index.push({ s: S.name, t: t.title, w: t.what, g: t.group || '', h: `${web}${S.subject}.html?lab=${t.id}` });
    const img = hasMedia(`${done[0].id}.png`) ? `<img src="${web}media/${done[0].id}.png" alt="" loading="lazy">` : '';
    const groups = [];
    for (const t of done) { const g = t.group || ''; if (groups.at(-1)?.g !== g) groups.push({ g, ts: [] }); groups.at(-1).ts.push(t); }
    return `<div class="card big" style="${style}"><a class="head" href="${web}${S.subject}.html">${img}<span class="name">${icon(S.subject)}${esc(S.name)}</span><span class="sub">${done.length} topics</span></a>
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
.topbar { display: flex; align-items: flex-start; justify-content: space-between; padding-block: 28px 10px; }
.brand { display: flex; align-items: center; gap: 18px; }
.brand h1 { margin: 0; font-size: clamp(28px, 4vw, 40px); letter-spacing: -.02em; line-height: 1.05; }
.brand .tag { color: var(--dim); font-size: 15px; margin-top: 6px; }
.brand .logo { width: 76px; height: 76px; flex: none; border-radius: 20px; background: linear-gradient(135deg, var(--accent), hsl(265 80% 66%)); display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 44px; box-shadow: 0 10px 30px color-mix(in srgb, var(--accent) 35%, transparent); }
.btn { border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; cursor: pointer; }
.btn:hover { border-color: var(--accent); }
.about { margin: 18px 0 20px; display: grid; gap: 6px; }
.about .lead { color: var(--ink); font-size: 16px; }
.about .by span { text-transform: uppercase; letter-spacing: .08em; font-size: 11.5px; font-weight: 700; color: var(--ink); margin-right: 6px; }
.about h3 { margin: 0 0 3px; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink); }
.about p { margin: 0; color: var(--dim); font-size: 13.5px; line-height: 1.45; }
.intro { color: var(--dim); font-size: 13px; margin: 0 0 14px; }
.intro b { color: var(--ink); font-weight: 600; } .intro a, .about a { color: var(--accent); }
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
.name .ic { width: 22px; height: 22px; flex: none; color: hsl(var(--hue) 70% 62%); }
:root[data-theme="light"] .name .ic { color: hsl(var(--hue) 70% 38%); }
.sub { font-size: 12.5px; color: var(--dim); padding-left: 30px; }
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
<div class="wrap topbar"><div class="brand"><span class="logo">∇</span><div><h1>Engineering Labs</h1><div class="tag">Interactive tutorials for engineering students</div></div></div><button class="btn" id="theme" title="Theme">☀</button></div>
<div class="wrap">
  <div class="about">
    <p class="lead">A collection of interactive tutorials for engineering subjects.</p>
    <p>Pick a subject, then a topic. Try the examples one by one; press <b>?</b> for the explanation.</p>
    <p class="by"><span>Author</span> Giulio Russo · <a href="https://github.com/GiulioRusso">GitHub</a> · <a href="https://www.linkedin.com/in/giuliorusso">LinkedIn</a></p>
  </div>
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
export const built = (labsRoot) => (subject, t) => { if (t.trace) return true; const f = t.from || t.id; return existsSync(join(labsRoot, 'src', ...(f.includes('/') ? f.split('/') : [subject, f]), 'lab.js')); };

export function counts(catalog, labsRoot) {
  const isBuilt = built(labsRoot);
  let done = 0, planned = 0;
  for (const S of catalog) for (const t of S.topics || []) isBuilt(S.subject, t) ? done++ : planned++;
  return { built: done, planned };
}
