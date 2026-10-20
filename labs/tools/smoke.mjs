// Loads every lab (and every scenario) from file:// in headless Chrome. Fails on a console error, an
// uncaught exception, any network request, a WebGL context loss or a blank scene. Prints frame times.
// Usage: node tools/smoke.mjs [lab-id]
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { launch } from './browser.mjs';

const web = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const labs = readdirSync(web).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => f.slice(0, -5))
  .filter((id) => !process.argv[2] || id === process.argv[2]);
const browser = await launch();
if (!browser) { console.log('chrome not found: skipping smoke test'); process.exit(0); }

let failures = 0;
const fail = (msg) => { console.log(`  FAIL ${msg}`); failures++; };

for (const page of ['index', ...labs]) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  const errors = [], requests = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('request', (r) => { if (!/^(file|data|blob|about):/.test(r.url())) requests.push(r.url()); });
  await p.goto(pathToFileURL(join(web, `${page}.html`)).href, { waitUntil: 'load' });
  if (page === 'index') {
    const cards = await p.$$eval('.card', (c) => c.length);
    if (cards !== labs.length && !process.argv[2]) fail(`index: ${cards} cards for ${labs.length} labs`);
    else console.log(`  ok   index (${cards} cards)`);
  } else {
    await p.waitForFunction(() => window.__lab, { timeout: 10000 });
    const gl = await p.evaluate(() => {
      const c = document.querySelector('#stage canvas'), g = c.getContext('webgl2'), ext = g.getExtension('WEBGL_debug_renderer_info');
      return ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });
    console.log(`${page}  (WebGL: ${gl})`);
    const scenarios = await p.evaluate(() => window.__lab.scenarios);
    for (const s of scenarios) {
      await p.evaluate((id) => { window.__lab.load(id); window.__lab.setPlaying(true); }, s);
      await new Promise((r) => setTimeout(r, 900));
      const box = await p.$eval('#stage', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
      const png = PNG.sync.read(Buffer.from(await p.screenshot({ clip: box })));
      // blank = almost no pixel differs from the background corner
      const d = png.data, bg = [d[0], d[1], d[2]];
      let differ = 0;
      for (let i = 0; i < d.length; i += 4 * 7) if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 30) differ++;
      const frac = differ / (d.length / 28);
      const lost = await p.evaluate(() => !!window.__labContextLost);
      if (frac < 0.02) fail(`${page}/${s}: blank scene (${(frac * 100).toFixed(1)} % non-background)`);
      else if (lost) fail(`${page}/${s}: WebGL context lost`);
      else console.log(`  ok   ${s.padEnd(16)} ${(frac * 100).toFixed(0)} % of the scene drawn`);
    }
    await p.evaluate(() => window.__lab.load('magnet-push'));
    await new Promise((r) => setTimeout(r, 3000));
    const f = await p.evaluate(() => window.__lab.stage.frameStats());
    const tm = await p.evaluate(() => window.__lab.timings);
    console.log(`  frame: update+render ${f.cpuMedian.toFixed(1)} ms median, ${f.cpuP95.toFixed(1)} ms p95; ` +
      `rAF interval ${f.intervalMedian.toFixed(1)} ms (n = ${f.n}); field lines ${tm.lines?.toFixed(1)} ms`);
  }
  for (const e of errors) fail(`${page}: console error: ${e}`);
  for (const r of requests) fail(`${page}: network request: ${r}`);
  await p.close();
}
await browser.close();
console.log(`smoke: ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
