// The catalogue page: every topic of the original notebooks, each notebook with its animations.
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
export function renderCatalogue({ catalog, labsRoot, web, repo, featured }) {
  const isBuilt = (topic, id) => existsSync(join(labsRoot, 'src', topic, id, 'lab.js'));
  const hasMedia = (f) => existsSync(join(labsRoot, 'web', 'media', f));
  let built = 0, planned = 0, viaVis = 0;

  const sections = catalog.map((t) => {
    let tBuilt = 0, tTotal = 0;
    const vis = {}, tiles = [];
    for (const nb of t.notebooks) {
      const items = [];
      for (const a of nb.animations) {
        if (a.visualizer) {
          const v = (vis[a.visualizer] ??= { covered: [], planned: [] });
          (a.status === 'planned' ? v.planned : v.covered).push(nb.notebook);
          if (a.status !== 'planned') viaVis++;
          continue;
        }
        tTotal++;
        if (isBuilt(t.topic, a.id)) {
          built++; tBuilt++;
          const img = hasMedia(`${a.id}.png`) ? `<img src="${web}media/${a.id}.png" alt="" loading="lazy">` : '';
          items.push(`<a class="anim built" href="${web}${t.topic}.html?lab=${a.id}">${img}<span class="t">${esc(a.title)}</span><span class="d">${esc(a.what)}</span><span class="go">Open →</span></a>`);
        } else {
          planned++;
          items.push(`<div class="anim todo"><span class="t">${esc(a.title)}</span><span class="d">${esc(a.what)}</span></div>`);
        }
      }
      if (items.length) tiles.push(`<div class="tile${items.some((i) => i.includes('built')) ? ' has-built' : ''}"><div class="nb">${esc(nb.notebook)}.ipynb</div>${items.join('')}</div>`);
    }
    const visTiles = Object.entries(vis).map(([k, v]) => `<a class="tile vis" href="${repo}${VIS[k].href}">
      <div class="vis-head"><span class="t">${VIS[k].title}</span><span class="go">Open →</span></div>
      <p class="d">${VIS[k].what}</p>
      <div class="chips">${v.covered.map((n) => `<span class="chip">${esc(n)}</span>`).join('')}${v.planned.map((n) => `<span class="chip muted">${esc(n)} · planned</span>`).join('')}</div></a>`);
    const progress = tTotal ? `<span class="count">${tBuilt} / ${tTotal} built</span><span class="bar"><i style="width:${(100 * tBuilt / tTotal).toFixed(0)}%"></i></span>${tBuilt ? `<a class="open" href="${web}${t.topic}.html">Open ${esc(t.name)} →</a>` : ''}` : '<span class="count">step-by-step visualizer</span>';
    return { t, tBuilt, tTotal, html: `<section id="${t.topic}" style="--hue:${HUE[t.topic] ?? 210}">
      <header><h2>${esc(t.name)}</h2><div class="prog">${progress}</div></header>
      <div class="tiles">${visTiles.join('')}${tiles.join('')}</div></section>` };
  });

  const nav = sections.map(({ t, tBuilt, tTotal }) => `<a href="#${t.topic}" style="--hue:${HUE[t.topic] ?? 210}"><i></i>${esc(t.name)}${tTotal ? ` <small>${tBuilt}/${tTotal}</small>` : ''}</a>`).join('');
  const f = featured && catalog.flatMap((t) => t.notebooks.flatMap((n) => n.animations.map((a) => ({ ...a, topic: t.topic })))).find((a) => a.id === featured);
  const hero = f ? `<a class="feature" href="${web}${f.topic}.html?lab=${f.id}">
      ${hasMedia(`${f.id}.gif`) ? `<img src="${web}media/${f.id}.gif" alt="${esc(f.title)} animation">` : hasMedia(`${f.id}.png`) ? `<img src="${web}media/${f.id}.png" alt="">` : ''}
      <span class="cap"><b>${esc(f.title)}</b><span>${esc(f.what)}</span><span class="go">Open the animation →</span></span></a>` : '';

  return `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Engineering Labs</title>
<meta name="description" content="Interactive animations for every topic of the original notebooks. They run offline, straight from the file.">
<style>
:root { --bg:#0b0f15; --panel:#121821; --panel2:#18202b; --ink:#e8edf4; --dim:#97a3b3; --line:#232c38; --accent:#6aa8ff; color-scheme: dark; }
:root[data-theme="light"] { --bg:#f6f7f9; --panel:#ffffff; --panel2:#f0f3f7; --ink:#131820; --dim:#566070; --line:#dfe4ea; --accent:#1d4ed8; color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
.wrap { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding-block: 18px; }
.brand { font-weight: 700; letter-spacing: -.01em; font-size: 16px; display: flex; align-items: center; gap: 10px; }
.brand .logo { width: 26px; height: 26px; border-radius: 7px; background: var(--accent); display: grid; place-items: center; color: var(--bg); font-size: 14px; font-weight: 800; }
.btn { border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 8px; padding: 7px 12px; font: inherit; font-size: 13px; cursor: pointer; }
.btn:hover { border-color: var(--accent); }

.hero { display: grid; grid-template-columns: 1fr 1.25fr; gap: 36px; align-items: center; padding-block: 28px 40px; }
.hero h1 { font-size: clamp(32px, 4.6vw, 52px); line-height: 1.05; letter-spacing: -.025em; margin: 0 0 16px; }
.hero h1 em { font-style: normal; color: var(--accent); }
.hero p { color: var(--dim); font-size: 17px; margin: 0 0 22px; max-width: 520px; }
.stats { display: flex; gap: 10px; flex-wrap: wrap; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; min-width: 110px; }
.stat b { display: block; font-size: 22px; letter-spacing: -.02em; }
.stat span { font-size: 12px; color: var(--dim); }
.feature { display: block; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); background: var(--panel); transition: border-color .15s, transform .15s; }
.feature:hover { border-color: var(--accent); transform: translateY(-2px); }
.feature img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; }
.feature .cap { display: grid; gap: 2px; padding: 14px 16px 16px; }
.feature .cap span { color: var(--dim); font-size: 13px; }
.feature .cap .go { color: var(--accent); font-weight: 600; margin-top: 6px; }

nav.topics { position: sticky; top: 0; z-index: 5; background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line); padding: 10px 0; }
nav.topics .wrap { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
nav.topics a { white-space: nowrap; border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px 5px 10px; font-size: 13px; display: flex; align-items: center; gap: 7px; background: var(--panel); }
nav.topics a:hover { border-color: hsl(var(--hue) 70% 60%); }
nav.topics i { width: 8px; height: 8px; border-radius: 50%; background: hsl(var(--hue) 70% 58%); }
nav.topics small { color: var(--dim); font-size: 11px; }

section { padding: 34px 0 6px; scroll-margin-top: 56px; }
section header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; border-left: 3px solid hsl(var(--hue) 70% 58%); padding-left: 12px; }
section h2 { margin: 0; font-size: 21px; letter-spacing: -.01em; }
.prog { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--dim); }
.bar { width: 120px; height: 5px; border-radius: 3px; background: var(--panel2); overflow: hidden; }
.bar i { display: block; height: 100%; background: hsl(var(--hue) 70% 58%); }
.prog .open { background: hsl(var(--hue) 65% 50%); color: #fff; border-radius: 8px; padding: 6px 12px; font-weight: 600; font-size: 13px; }
.prog .open:hover { filter: brightness(1.1); }

.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(275px, 1fr)); gap: 12px; }
.tile { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; gap: 8px; align-content: start; }
.tile.has-built { grid-row: span 2; }
.nb { font: 11.5px ui-monospace, SFMono-Regular, Menlo, monospace; color: hsl(var(--hue) 60% 62%); }
:root[data-theme="light"] .nb { color: hsl(var(--hue) 70% 34%); }
.anim { display: grid; gap: 3px; border-radius: 9px; }
.anim .t { font-weight: 600; font-size: 14.5px; }
.anim .d { color: var(--dim); font-size: 13px; }
.anim.todo { padding: 8px 10px; background: var(--panel2); }
.anim.todo .t::after { content: "planned"; margin-left: 8px; font: 10.5px ui-monospace, Menlo, monospace; color: var(--dim); border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; vertical-align: 1px; }
.anim.built { padding: 0 0 4px; }
.anim.built img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); margin-bottom: 6px; transition: border-color .15s; }
.anim.built:hover img { border-color: var(--accent); }
.go { color: var(--accent); font-weight: 600; font-size: 13px; }
.tile.vis { grid-column: 1 / -1; border-color: hsl(var(--hue) 60% 45%); padding: 16px; }
.tile.vis:hover { border-color: var(--accent); }
.vis-head { display: flex; justify-content: space-between; align-items: baseline; }
.vis-head .t { font-weight: 700; font-size: 17px; }
.tile.vis .d { margin: 0; color: var(--dim); font-size: 13.5px; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip { font: 11.5px ui-monospace, Menlo, monospace; background: var(--panel2); border-radius: 5px; padding: 2px 7px; }
.chip.muted { color: var(--dim); }
footer { color: var(--dim); font-size: 13px; padding-block: 40px 60px; border-top: 1px solid var(--line); margin-top: 40px; }
footer code { font-size: 12px; background: var(--panel); padding: 1px 5px; border-radius: 4px; }
@media (max-width: 860px) { .hero { grid-template-columns: 1fr; } .tile.has-built { grid-row: auto; } section header { flex-direction: column; align-items: flex-start; } }
</style></head><body>
<div class="wrap topbar"><div class="brand"><span class="logo">∇</span>Engineering Labs</div><button class="btn" id="theme">Light</button></div>
<div class="wrap hero">
  <div>
    <h1>See the physics <em>move</em>.</h1>
    <p>An interactive animation for every topic of the original notebooks. Drag things in the 3D scene and
      watch fields, signals and systems respond, with the theory one click away. Everything runs offline,
      straight from the file.</p>
    <div class="stats">
      <div class="stat"><b>${built}</b><span>animations built</span></div>
      <div class="stat"><b>${planned}</b><span>planned</span></div>
      <div class="stat"><b>${viaVis}</b><span>notebooks in the visualizers</span></div>
    </div>
  </div>
  ${hero}
</div>
<nav class="topics"><div class="wrap">${nav}</div></nav>
<main class="wrap">${sections.map((s) => s.html).join('\n')}</main>
<footer class="wrap">Every page is a single file that works offline: double-click it. Source in <code>labs/src/&lt;topic&gt;/</code>,
  topic map in <code>labs/catalog.json</code>, original notebooks in <code>legacy/notebooks/</code>.</footer>
<script>
const b = document.getElementById('theme'), r = document.documentElement;
let t = 'dark'; try { t = localStorage.getItem('labs-theme') || t; } catch {}
const apply = () => { r.dataset.theme = t; b.textContent = t === 'light' ? 'Dark theme' : 'Light theme'; };
b.onclick = () => { t = t === 'light' ? 'dark' : 'light'; try { localStorage.setItem('labs-theme', t); } catch {} apply(); };
apply();
</script></body></html>
`;
}

export function counts(catalog, labsRoot) {
  let built = 0, planned = 0, viaVis = 0;
  for (const t of catalog) for (const n of t.notebooks) for (const a of n.animations) {
    if (a.visualizer) { if (a.status !== 'planned') viaVis++; } else if (existsSync(join(labsRoot, 'src', t.topic, a.id, 'lab.js'))) built++; else planned++;
  }
  return { built, planned, viaVis };
}
