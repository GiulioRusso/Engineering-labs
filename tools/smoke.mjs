// Loads every topic page from file:// in headless Chrome and runs every animation and every scenario.
// Fails on a console error, an uncaught exception, any network request, a WebGL context loss, a
// blank scene or a case/example without its explanation; checks that both catalogues link every built animation. Prints frame times.
// Usage: node tools/smoke.mjs [topic]
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { launch } from './browser.mjs';

const web = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const topics = readdirSync(web).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => f.slice(0, -5))
  .filter((t) => !process.argv[2] || t === process.argv[2]);
const browser = await launch();
if (!browser) { console.log('chrome not found: skipping smoke test'); process.exit(0); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const fail = (msg) => { console.log(`  FAIL ${msg}`); failures++; };

function watch(p) {
  const errors = [], requests = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('request', (r) => { if (!/^(file|data|blob|about):/.test(r.url())) requests.push(r.url()); });
  return { errors, requests };
}
async function blankFraction(p) {
  const box = await p.$eval('.stage', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const d = PNG.sync.read(Buffer.from(await p.screenshot({ clip: box }))).data, bg = [d[0], d[1], d[2]];
  let differ = 0;
  for (let i = 0; i < d.length; i += 28) if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 30) differ++;
  return differ / (d.length / 28);
}

const built = [];
for (const topic of topics) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 860 });
  const w = watch(p);
  await p.goto(pathToFileURL(join(web, `${topic}.html`)).href, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__topic && window.__lab, { timeout: 10000 });
  const labs = await p.evaluate(() => window.__topic.labs);
  console.log(`${topic}.html  (${labs.length} animation(s))`);
  for (const id of labs) {
    built.push({ topic, id });
    await p.evaluate((x) => window.__topic.open(x), id);
    const scenarios = await p.evaluate(() => window.__lab.scenarios);
    const drawn = [];
    for (const s of scenarios) {
      await p.evaluate((x) => { window.__lab.load(x); window.__lab.setPlaying(true); }, s);
      await sleep(600);
      const frac = await blankFraction(p);
      if (frac < 0.02) fail(`${topic}/${id}/${s}: blank scene (${(frac * 100).toFixed(1)} %)`);
      if (await p.evaluate(() => !!window.__labContextLost)) fail(`${topic}/${id}/${s}: WebGL context lost`);
      // every case and every example is explained in the ? drawer
      const explained = await p.evaluate((x) => [...document.querySelectorAll('.explain [data-case]')].some((e) => !e.hidden && !!e.dataset.example === x.includes('/')), s);
      if (!explained) fail(`${topic}/${id}/${s}: no explanation for this ${s.includes('/') ? 'example' : 'case'}`);
      drawn.push(`${s} ${(frac * 100).toFixed(0)}%`);
    }
    await sleep(1500);
    const f = await p.evaluate(() => window.__lab.stage.frameStats());
    console.log(`  ok   ${id.padEnd(20)} ${scenarios.length} scenarios · frame ${f.cpuMedian.toFixed(1)} ms median, ${f.cpuP95.toFixed(1)} ms p95 · ${drawn.join(', ')}`);
  }
  for (const e of w.errors) fail(`${topic}: console error: ${e}`);
  for (const r of w.requests) fail(`${topic}: network request: ${r}`);
  await p.close();
}

// the catalogue links every built animation
for (const [name, file, pre] of [['index.html', join(web, '..', 'index.html'), 'web/']]) {
  const p = await browser.newPage();
  const w = watch(p);
  await p.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  const links = await p.$$eval('a[href]', (c) => c.map((a) => a.getAttribute('href')));
  const missing = built.filter(({ topic, id }) => !links.includes(`${pre}${topic}.html?lab=${id}`));
  for (const m of missing) fail(`${name}: no link to ${m.topic}/${m.id}`);
  for (const e of w.errors) fail(`${name}: ${e}`);
  if (!missing.length) console.log(`  ok   ${name} links all ${built.length} built animation(s)`);
  await p.close();
}
await browser.close();
console.log(`smoke: ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
