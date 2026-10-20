// Builds each lab into ONE self-contained HTML file in web/ (JS + CSS inlined, maths pre-rendered
// to MathML with KaTeX), plus the catalogue web/index.html. npm is needed only here, never at runtime.
// Usage: node build.mjs [lab-id]
import { build } from 'esbuild';
import katex from 'katex';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
// labs/catalog.json is the map: topic → old notebook → animations. A lab is built when its source exists.
const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const labs = catalog.flatMap((t) => t.notebooks.flatMap((n) => n.animations.filter((a) => a.id).map((a) => ({ ...a, topic: t.topic }))))
  .filter((a) => existsSync(join(root, 'src', a.topic, a.id, 'main.js')));

// Symbols coloured like the objects they name: placeholder colours, swapped for CSS variables below.
const COLORS = { cB: ['#0000b1', '--c-B'], cE: ['#0000e1', '--c-E'], cI: ['#0000a1', '--c-I'], cF: ['#0000f1', '--c-F'], cv: ['#0000c1', '--c-v'] };
const macros = Object.fromEntries(Object.entries(COLORS).map(([k, [hex]]) => [`\\${k}`, `\\textcolor{#${hex}}{#1}`]));

function renderMath(html) {
  const tex = (s, displayMode) => {
    let out = katex.renderToString(s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), { output: 'mathml', displayMode, macros, throwOnError: true });
    for (const [hex, v] of Object.values(COLORS)) out = out.replaceAll(`mathcolor="${hex}"`, `style="color:var(${v})"`);
    return out;
  };
  return html.replace(/\$\$([\s\S]+?)\$\$/g, (_, s) => tex(s, true)).replace(/\\\(([\s\S]+?)\\\)/g, (_, s) => tex(s, false));
}

async function buildLab({ id, topic }) {
  const t0 = performance.now();
  const res = await build({
    entryPoints: [join(root, 'src', topic, id, 'main.js')], bundle: true, minify: true, format: 'esm', target: ['es2020', 'safari15'],
    write: false, outdir: join(root, '.out'), legalComments: 'none', logLevel: 'warning',
  });
  const js = res.outputFiles.find((f) => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
  const css = res.outputFiles.find((f) => f.path.endsWith('.css'))?.text || '';
  let html = renderMath(readFileSync(join(root, 'src', topic, id, 'index.html'), 'utf8'));
  html = html.replace('/*{{CSS}}*/', () => css).replace('/*{{JS}}*/', () => js);
  mkdirSync(join(root, 'web', topic), { recursive: true });
  const out = join(root, 'web', topic, `${id}.html`);
  writeFileSync(out, html);
  const kb = statSync(out).size / 1024;
  console.log(`${id.padEnd(22)} ${kb.toFixed(0).padStart(6)} KB  ${(performance.now() - t0).toFixed(0)} ms`);
  if (kb > 2048) throw new Error(`${id}: ${kb.toFixed(0)} KB exceeds the 2 MB budget`);
}

const VIS = {
  algorithm: { title: 'Algorithm Visualizer', href: '../../visualizations/algorithm-visualization/web/index.html',
    what: 'Step forwards and backwards through real C++ runs: arrays, sorting, lists, trees, heaps, graphs, scheduling, synchronization.' },
  electronics: { title: 'Electronics Visualizer', href: '../../visualizations/electronics-visualization/web/index.html',
    what: 'Digital circuits gate by gate, with timing: gates, adders, latches, flip-flops, counters, state machines.' },
};

function buildCatalogue() {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let built = 0, planned = 0, viaVis = 0;
  const sections = catalog.map((t) => {
    const cards = [], visCovered = {}, visPlanned = {};
    for (const nb of t.notebooks) for (const a of nb.animations) {
      if (a.visualizer) { (a.status === 'planned' ? visPlanned : visCovered)[a.visualizer] ??= []; (a.status === 'planned' ? visPlanned : visCovered)[a.visualizer].push(nb.notebook); if (a.status !== 'planned') viaVis++; continue; }
      const ready = existsSync(join(root, 'src', t.topic, a.id, 'main.js'));
      ready ? built++ : planned++;
      const thumb = ready && existsSync(join(root, 'web', 'media', `${a.id}.png`)) ? `<img src="media/${a.id}.png" alt="" loading="lazy">` : '<div class="ph"></div>';
      const body = `${thumb}<div class="body"><div class="nb">${nb.notebook}</div><h3>${esc(a.title)}</h3><p>${esc(a.what)}</p>${ready ? '' : '<span class="badge">planned</span>'}</div>`;
      cards.push(ready ? `<a class="card" href="${t.topic}/${a.id}.html">${body}</a>` : `<div class="card planned">${body}</div>`);
    }
    for (const [k, nbs] of Object.entries(visCovered)) {
      const v = VIS[k], more = visPlanned[k] ? `<p class="todo">Planned in the visualizer: ${visPlanned[k].join(', ')}</p>` : '';
      cards.unshift(`<a class="card vis" href="${v.href}"><div class="body"><div class="nb">covers ${nbs.join(', ')}</div><h3>${v.title} →</h3><p>${v.what}</p>${more}</div></a>`);
    }
    return `<section id="${t.topic}"><h2>${t.name}</h2><div class="grid">${cards.join('\n')}</div></section>`;
  });
  const nav = catalog.map((t) => `<a href="#${t.topic}">${t.name}</a>`).join('');
  const css = readFileSync(join(root, 'src', 'lib', 'lab.css'), 'utf8').split('/* ------------------------------------------------------------------ frame */')[0];
  writeFileSync(join(root, 'web', 'index.html'), `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Engineering Labs</title><meta name="description" content="Interactive animations for every topic, organised like the original notebooks. They run offline.">
<style>${css}
body { overflow: auto; }
main { max-width: 1180px; margin: 0 auto; padding: 28px 16px 60px; }
.top { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
h1 { font-size: 24px; margin: 0; } .top .spacer { flex: 1; }
.lead { color: var(--ink-dim); max-width: 760px; }
nav { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 6px; }
nav a { color: var(--ink); text-decoration: none; border: 1px solid var(--line); border-radius: 20px; padding: 4px 11px; font-size: 13px; }
nav a:hover { border-color: var(--accent); }
section { margin-top: 30px; scroll-margin-top: 12px; } section h2 { font-size: 18px; margin: 0 0 10px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.card { display: block; position: relative; text-decoration: none; color: inherit; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
a.card:hover { border-color: var(--accent); }
.card img, .card .ph { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: var(--panel-2); }
.card.planned { opacity: .55; } .card.planned .ph { aspect-ratio: 16 / 4; }
.card.vis { border-color: var(--accent); grid-column: 1 / -1; }
.card .body { padding: 10px 12px 12px; } .card h3 { font-size: 15px; margin: 2px 0 4px; } .card p { margin: 0; color: var(--ink-dim); font-size: 13px; }
.card .todo { margin-top: 6px; font-size: 12px; }
.nb { font: 11px var(--mono); color: var(--accent); }
.badge { position: absolute; top: 8px; right: 8px; font: 11px var(--mono); background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 1px 6px; color: var(--ink-dim); }
.btn { min-height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel-2); cursor: pointer; }
</style></head><body><main>
<div class="top"><h1>Engineering Labs</h1><span class="spacer"></span><button class="btn" id="theme">Light</button></div>
<p class="lead">One interactive animation for every original notebook, organised by topic. Drag things in the scene and watch the
physics respond. Everything works offline, straight from the file. <b>${built}</b> built, <b>${planned}</b> planned, and
<b>${viaVis}</b> notebooks are covered by the two step-by-step visualizers.</p>
<nav>${nav}</nav>
${sections.join('\n')}
</main>
<script>
const b = document.getElementById('theme'), r = document.documentElement;
let t = 'dark'; try { t = localStorage.getItem('labs-theme') || t; } catch {}
const apply = () => { r.dataset.theme = t; b.textContent = t === 'light' ? 'Dark' : 'Light'; };
b.onclick = () => { t = t === 'light' ? 'dark' : 'light'; try { localStorage.setItem('labs-theme', t); } catch {} apply(); };
apply();
</script></body></html>
`);
  console.log(`catalogue              ${built} built, ${planned} planned, ${viaVis} notebooks via visualizers`);
}

for (const lab of labs) if (!only || only === lab.id) await buildLab(lab);
// TOPICS.md: the same map, readable on GitHub
writeFileSync(join(root, 'TOPICS.md'), ['# Topic map', '',
  'One animation (or more) for every original notebook, grouped like `legacy/notebooks/`. Generated from',
  '`catalog.json` by `build.mjs`: edit the JSON, not this file.', '',
  ...catalog.flatMap((t) => [`## ${t.name}`, '', '| Notebook | Animation | What you do | Status |', '|---|---|---|---|',
    ...t.notebooks.flatMap((n) => n.animations.map((a) => a.visualizer
      ? `| \`${n.notebook}\` | ${VIS[a.visualizer].title} | — | ${a.status === 'planned' ? 'planned (in the visualizer)' : 'covered'} |`
      : `| \`${n.notebook}\` | ${existsSync(join(root, 'src', t.topic, a.id, 'main.js')) ? `[${a.title}](web/${t.topic}/${a.id}.html)` : a.title} | ${a.what} | ${existsSync(join(root, 'src', t.topic, a.id, 'main.js')) ? 'done' : 'planned'} |`)), '']),
].join('\n'));
buildCatalogue();
