// Builds each lab into ONE self-contained HTML file in web/ (JS + CSS inlined, maths pre-rendered
// to MathML with KaTeX), plus the catalogue web/index.html. npm is needed only here, never at runtime.
// Usage: node build.mjs [lab-id]
import { build } from 'esbuild';
import katex from 'katex';
import { renderCatalogue, counts, visTitle } from './tools/catalogue.mjs';
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
  html = html.replace(/<!-- source-only -->[\s\S]*?<!-- \/source-only -->/, '').replace('/*{{CSS}}*/', () => css).replace('/*{{JS}}*/', () => js);
  mkdirSync(join(root, 'web', topic), { recursive: true });
  const out = join(root, 'web', topic, `${id}.html`);
  writeFileSync(out, html);
  const kb = statSync(out).size / 1024;
  console.log(`${id.padEnd(22)} ${kb.toFixed(0).padStart(6)} KB  ${(performance.now() - t0).toFixed(0)} ms`);
  if (kb > 2048) throw new Error(`${id}: ${kb.toFixed(0)} KB exceeds the 2 MB budget`);
}

function buildCatalogue() {
  const featured = 'coil-induction';
  writeFileSync(join(root, 'web', 'index.html'), renderCatalogue({ catalog, labsRoot: root, web: '', repo: '../../', featured }));
  writeFileSync(join(root, '..', 'index.html'), renderCatalogue({ catalog, labsRoot: root, web: 'labs/web/', repo: '', featured }));
  const c = counts(catalog, root);
  console.log(`catalogue              ${c.built} built, ${c.planned} planned, ${c.viaVis} notebooks via visualizers (labs/web/index.html and ../index.html)`);
}

for (const lab of labs) if (!only || only === lab.id) await buildLab(lab);
// TOPICS.md: the same map, readable on GitHub
writeFileSync(join(root, 'TOPICS.md'), ['# Topic map', '',
  'One animation (or more) for every original notebook, grouped like `legacy/notebooks/`. Generated from',
  '`catalog.json` by `build.mjs`: edit the JSON, not this file.', '',
  ...catalog.flatMap((t) => [`## ${t.name}`, '', '| Notebook | Animation | What you do | Status |', '|---|---|---|---|',
    ...t.notebooks.flatMap((n) => n.animations.map((a) => a.visualizer
      ? `| \`${n.notebook}\` | ${visTitle(a.visualizer)} | — | ${a.status === 'planned' ? 'planned (in the visualizer)' : 'covered'} |`
      : `| \`${n.notebook}\` | ${existsSync(join(root, 'src', t.topic, a.id, 'main.js')) ? `[${a.title}](web/${t.topic}/${a.id}.html)` : a.title} | ${a.what} | ${existsSync(join(root, 'src', t.topic, a.id, 'main.js')) ? 'done' : 'planned'} |`)), '']),
].join('\n'));
buildCatalogue();
