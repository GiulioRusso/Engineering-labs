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
// labs/catalog.json is the map: subject → topics. A topic is built from src/<subject>/<from or id>/lab.js
// (`from` may name another subject: "maths/vector-fields"); `cases` keeps only some of that lab's cases,
// so one lab can serve several topics.
const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const srcOf = (subject, t) => { const f = t.from || t.id; return join(root, 'src', ...(f.includes('/') ? f.split('/') : [subject, f])); };
const hasLab = (subject, t) => existsSync(join(srcOf(subject, t), 'lab.js'));

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

async function buildSubject(S) {
  const topics = (S.topics || []).filter((t) => hasLab(S.subject, t));
  if (!topics.length) return;
  const t0 = performance.now();
  const dirs = [...new Set(topics.map((t) => srcOf(S.subject, t)))];
  const entry = [
    "import '../lib/lab.css';",
    "import { startTopic } from '../lib/ui/topic.js';",
    ...dirs.map((d, i) => `import L${i} from ${JSON.stringify(join(d, 'lab.js'))};`),
    'const sub = (L, t) => { const cases = t.cases ? L.cases.filter((c) => t.cases.includes(c.id)) : L.cases;',
    "  return { ...L, ...t, cases, gif: L.gif && cases.some((c) => c.id === L.gif.scenario.split('/')[0]) ? L.gif : undefined }; };",
    `startTopic({ name: ${JSON.stringify(S.name)}, labs: [${topics.map((t) => `sub(L${dirs.indexOf(srcOf(S.subject, t))}, ${JSON.stringify({ id: t.id, title: t.title, group: t.group, cases: t.cases })})`).join(', ')}] });`,
  ].join('\n');
  const res = await build({
    stdin: { contents: entry, resolveDir: join(root, 'src', S.subject), sourcefile: `${S.subject}-entry.js`, loader: 'js' },
    bundle: true, minify: true, format: 'esm', target: ['es2020', 'safari15'], write: false, outdir: join(root, '.out'),
    legalComments: 'none', logLevel: 'warning',
  });
  const js = res.outputFiles.find((f) => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
  const css = res.outputFiles.find((f) => f.path.endsWith('.css'))?.text || '';
  const templates = topics.map((t) => {
    const f = join(srcOf(S.subject, t), 'explain.html');
    return `<template id="explain-${t.id}">${existsSync(f) ? renderMath(readFileSync(f, 'utf8')) : ''}</template>`;
  }).join('\n');
  const html = readFileSync(join(root, 'src', 'lib', 'topic.html'), 'utf8')
    .replace(/<!-- source-only -->[\s\S]*?<!-- \/source-only -->\n?/, '')
    .replace('{{TITLE}}', `${S.name} · Engineering Labs`)
    .replace('{{DESCRIPTION}}', `Interactive ${S.name.toLowerCase()}: ${topics.map((t) => t.title).join(', ')}.`)
    .replace('/*{{CSS}}*/', () => css).replace('<!--{{TEMPLATES}}-->', () => templates).replace('/*{{JS}}*/', () => js);
  const out = join(root, 'web', `${S.subject}.html`);
  writeFileSync(out, html);
  const kb = statSync(out).size / 1024;
  console.log(`${`${S.subject}.html`.padEnd(26)} ${String(topics.length).padStart(2)} topic(s) ${kb.toFixed(0).padStart(6)} KB  ${(performance.now() - t0).toFixed(0)} ms`);
  if (kb > 3072) throw new Error(`${S.subject}: ${kb.toFixed(0)} KB exceeds the 3 MB budget`);
}

for (const S of catalog) if (!only || only === S.subject) await buildSubject(S);

// catalogue: labs/web/index.html and the repository root index.html
writeFileSync(join(root, 'web', 'index.html'), renderCatalogue({ catalog, labsRoot: root, web: '', repo: '../../' }));
writeFileSync(join(root, '..', 'index.html'), renderCatalogue({ catalog, labsRoot: root, web: 'labs/web/', repo: '' }));
const c = counts(catalog, root);
console.log(`catalogue                  ${c.built} built, ${c.planned} planned`);

// TOPICS.md: the same map, readable on GitHub
writeFileSync(join(root, 'TOPICS.md'), ['# Topic map', '',
  'Each subject is one file, `web/<subject>.html`. Generated from `catalog.json` by `build.mjs`: edit the JSON, not this file.', '',
  ...catalog.flatMap((S) => [`## ${S.name}`, '',
    ...(S.visualizer ? [`In the ${visTitle(S.visualizer)}.`, ''] : []),
    ...(S.topics ? ['| Topic | What you do | Status |', '|---|---|---|',
      ...S.topics.map((t) => `| ${hasLab(S.subject, t) ? `[${t.title}](web/${S.subject}.html?lab=${t.id})` : t.title} | ${t.what} | ${hasLab(S.subject, t) ? 'done' : 'planned'} |`), ''] : [])]),
].join('\n'));
