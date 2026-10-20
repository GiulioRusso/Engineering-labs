// Builds ONE self-contained HTML file per topic in web/<topic>.html, holding every animation of that
// topic (JS + CSS inlined, theory pre-rendered to MathML with KaTeX), plus the catalogue pages.
// npm is needed only here, never at runtime.   Usage: node build.mjs [topic]
import { build } from 'esbuild';
import katex from 'katex';
import { renderCatalogue, counts, visTitle } from './tools/catalogue.mjs';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];
// labs/catalog.json is the map: topic → original notebook → animations. An animation is built when
// src/<topic>/<id>/lab.js exists.
const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const hasLab = (topic, id) => existsSync(join(root, 'src', topic, id, 'lab.js'));

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

async function buildTopic(t) {
  const groups = t.notebooks.map((n) => ({ notebook: n.notebook, labs: n.animations.filter((a) => a.id && hasLab(t.topic, a.id)) })).filter((g) => g.labs.length);
  if (!groups.length) return;
  const t0 = performance.now();
  const labs = groups.flatMap((g) => g.labs);
  const entry = [
    "import '../lib/lab.css';",
    "import { startTopic } from '../lib/ui/topic.js';",
    ...labs.map((a, i) => `import L${i} from './${a.id}/lab.js';`),
    ...labs.map((a, i) => `L${i}.summary ||= ${JSON.stringify(a.what)};`),
    `startTopic({ name: ${JSON.stringify(t.name)}, groups: [${groups.map((g) => `{ notebook: ${JSON.stringify(g.notebook)}, labs: [${g.labs.map((a) => `L${labs.indexOf(a)}`).join(', ')}] }`).join(', ')}] });`,
  ].join('\n');
  const res = await build({
    stdin: { contents: entry, resolveDir: join(root, 'src', t.topic), sourcefile: `${t.topic}-entry.js`, loader: 'js' },
    bundle: true, minify: true, format: 'esm', target: ['es2020', 'safari15'], write: false, outdir: join(root, '.out'),
    legalComments: 'none', logLevel: 'warning',
  });
  const js = res.outputFiles.find((f) => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
  const css = res.outputFiles.find((f) => f.path.endsWith('.css'))?.text || '';
  const templates = labs.map((a) => {
    const f = join(root, 'src', t.topic, a.id, 'explain.html');
    return `<template id="explain-${a.id}">${existsSync(f) ? renderMath(readFileSync(f, 'utf8')) : ''}</template>`;
  }).join('\n');
  const html = readFileSync(join(root, 'src', 'lib', 'topic.html'), 'utf8')
    .replace(/<!-- source-only -->[\s\S]*?<!-- \/source-only -->\n?/, '')
    .replace('{{TITLE}}', `${t.name} · Engineering Labs`)
    .replace('{{DESCRIPTION}}', `Interactive ${t.name.toLowerCase()} animations: ${labs.map((a) => a.title).join(', ')}.`)
    .replace('/*{{CSS}}*/', () => css).replace('<!--{{TEMPLATES}}-->', () => templates).replace('/*{{JS}}*/', () => js);
  const out = join(root, 'web', `${t.topic}.html`);
  writeFileSync(out, html);
  const kb = statSync(out).size / 1024;
  console.log(`${`${t.topic}.html`.padEnd(26)} ${String(labs.length).padStart(2)} animation(s) ${kb.toFixed(0).padStart(6)} KB  ${(performance.now() - t0).toFixed(0)} ms`);
  if (kb > 3072) throw new Error(`${t.topic}: ${kb.toFixed(0)} KB exceeds the 3 MB budget`);
}

for (const t of catalog) if (!only || only === t.topic) await buildTopic(t);

// catalogue: labs/web/index.html and the repository root index.html
const featured = 'coil-induction';
writeFileSync(join(root, 'web', 'index.html'), renderCatalogue({ catalog, labsRoot: root, web: '', repo: '../../', featured }));
writeFileSync(join(root, '..', 'index.html'), renderCatalogue({ catalog, labsRoot: root, web: 'labs/web/', repo: '', featured }));
const c = counts(catalog, root);
console.log(`catalogue                  ${c.built} built, ${c.planned} planned, ${c.viaVis} notebooks via visualizers`);

// TOPICS.md: the same map, readable on GitHub
writeFileSync(join(root, 'TOPICS.md'), ['# Topic map', '',
  'Every original notebook and its animations, grouped like `legacy/notebooks/`. Each topic is one file,',
  '`web/<topic>.html`. Generated from `catalog.json` by `build.mjs`: edit the JSON, not this file.', '',
  ...catalog.flatMap((t) => [`## ${t.name}`, '', '| Notebook | Animation | What you do | Status |', '|---|---|---|---|',
    ...t.notebooks.flatMap((n) => n.animations.map((a) => a.visualizer
      ? `| \`${n.notebook}\` | ${visTitle(a.visualizer)} | — | ${a.status === 'planned' ? 'planned (in the visualizer)' : 'covered'} |`
      : `| \`${n.notebook}\` | ${hasLab(t.topic, a.id) ? `[${a.title}](web/${t.topic}.html?lab=${a.id})` : a.title} | ${a.what} | ${hasLab(t.topic, a.id) ? 'done' : 'planned'} |`)), '']),
].join('\n'));
