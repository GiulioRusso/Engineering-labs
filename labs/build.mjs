// Builds each lab into ONE self-contained HTML file in web/ (JS + CSS inlined, maths pre-rendered
// to MathML with KaTeX), plus the catalogue web/index.html. npm is needed only here, never at runtime.
// Usage: node build.mjs [lab-id]
import { build } from 'esbuild';
import katex from 'katex';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
const labs = readdirSync(join(root, 'src')).filter((d) => d !== 'lib' && existsSync(join(root, 'src', d, 'meta.json')));

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

async function buildLab(id) {
  const t0 = performance.now();
  const res = await build({
    entryPoints: [join(root, 'src', id, 'main.js')], bundle: true, minify: true, format: 'esm', target: ['es2020', 'safari15'],
    write: false, outdir: join(root, '.out'), legalComments: 'none', logLevel: 'warning',
  });
  const js = res.outputFiles.find((f) => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
  const css = res.outputFiles.find((f) => f.path.endsWith('.css'))?.text || '';
  let html = renderMath(readFileSync(join(root, 'src', id, 'index.html'), 'utf8'));
  html = html.replace('{{CSS}}', () => css).replace('{{JS}}', () => js);
  const out = join(root, 'web', `${id}.html`);
  writeFileSync(out, html);
  const kb = statSync(out).size / 1024;
  console.log(`${id.padEnd(22)} ${kb.toFixed(0).padStart(6)} KB  ${(performance.now() - t0).toFixed(0)} ms`);
  if (kb > 2048) throw new Error(`${id}: ${kb.toFixed(0)} KB exceeds the 2 MB budget`);
}

function buildCatalogue() {
  const cards = labs.map((id) => {
    const m = JSON.parse(readFileSync(join(root, 'src', id, 'meta.json'), 'utf8'));
    const thumb = existsSync(join(root, 'web', 'media', `${id}.png`)) ? `<img src="media/${id}.png" alt="" loading="lazy">` : '<div class="ph"></div>';
    return `<a class="card" href="${id}.html">${thumb}<div class="body"><div class="area">${m.area}</div><h2>${m.title}</h2><p>${m.blurb}</p></div></a>`;
  }).join('\n');
  const css = readFileSync(join(root, 'src', 'lib', 'lab.css'), 'utf8').split('/* ------------------------------------------------------------------ frame */')[0];
  writeFileSync(join(root, 'web', 'index.html'), `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Engineering Labs</title><meta name="description" content="3D interactive physics and engineering labs that run offline in the browser.">
<style>${css}
body { overflow: auto; }
main { max-width: 1100px; margin: 0 auto; padding: 28px 16px 60px; }
.top { display: flex; align-items: baseline; gap: 12px; }
h1 { font-size: 24px; margin: 0; } .top .spacer { flex: 1; }
.lead { color: var(--ink-dim); max-width: 720px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 22px; }
.card { display: block; text-decoration: none; color: inherit; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.card:hover { border-color: var(--accent); }
.card img, .card .ph { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: var(--panel-2); }
.card .body { padding: 12px 14px 14px; } .card h2 { font-size: 16px; margin: 2px 0 6px; } .card p { margin: 0; color: var(--ink-dim); font-size: 13px; }
.area { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); }
.btn { min-height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel-2); cursor: pointer; }
</style></head><body><main>
<div class="top"><h1>Engineering Labs</h1><span class="spacer"></span><button class="btn" id="theme">Light</button></div>
<p class="lead">Interactive 3D labs: drag things in the scene and watch the physics respond. Every page works offline, straight from the file.</p>
<div class="grid">
${cards}
</div></main>
<script>
const b = document.getElementById('theme'), r = document.documentElement;
let t = 'dark'; try { t = localStorage.getItem('labs-theme') || t; } catch {}
const apply = () => { r.dataset.theme = t; b.textContent = t === 'light' ? 'Dark' : 'Light'; };
b.onclick = () => { t = t === 'light' ? 'dark' : 'light'; try { localStorage.setItem('labs-theme', t); } catch {} apply(); };
apply();
</script></body></html>
`);
  console.log(`catalogue              ${labs.length} lab(s)`);
}

for (const id of labs) if (!only || only === id) await buildLab(id);
buildCatalogue();
