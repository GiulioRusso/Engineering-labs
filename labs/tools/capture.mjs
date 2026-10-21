// Headless captures for every animation: one PNG per scenario (web/media/<id>/<scenario>.png), the
// catalogue thumbnail (web/media/<id>.png) and, for animations that declare `gif`, an 8 s GIF.
// Usage: node tools/capture.mjs [topic] [--no-gif] [--only <animation-id>] [--theme light]
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
import { launch } from './browser.mjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const args = process.argv.slice(2), opt = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const theme = opt('--theme') || 'dark', onlyLab = opt('--only');
const topicArg = args.find((a, i) => !a.startsWith('--') && !['--theme', '--only'].includes(args[i - 1]));
const web = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const topics = readdirSync(web).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => f.slice(0, -5)).filter((t) => !topicArg || t === topicArg);
const browser = await launch();
if (!browser) { console.log('chrome not found'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const suffix = theme === 'dark' ? '' : `-${theme}`;

for (const topic of topics) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument((t) => { try { localStorage.setItem('labs-theme', t); } catch {} }, theme);
  await p.goto(pathToFileURL(join(web, `${topic}.html`)).href, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__topic && window.__lab);
  for (const id of await p.evaluate(() => window.__topic.labs)) {
    if (onlyLab && id !== onlyLab) continue;
    await p.setViewport({ width: 1440, height: 900 });
    await p.evaluate((x) => window.__topic.open(x), id);
    mkdirSync(join(web, 'media', id), { recursive: true });
    const meta = await p.evaluate(() => ({ scenarios: window.__lab.scenarios, gif: window.__lab.gif }));
    for (const s of meta.scenarios) {
      await p.evaluate((x) => { window.__lab.load(x); window.__lab.setPlaying(true); }, s);
      await sleep(1400);
      writeFileSync(join(web, 'media', id, `${s.replace("/", "--")}${suffix}.png`), await p.screenshot());
    }
    const g = meta.gif || { scenario: meta.scenarios[0] };
    await p.evaluate((x) => { window.__lab.load(x); window.__lab.setPlaying(true); }, g.scenario);
    await sleep(1400);
    const box = await p.$eval('.stage', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    if (!suffix) writeFileSync(join(web, 'media', `${id}.png`), await p.screenshot({ clip: box }));
    console.log(`${topic}/${id}: ${meta.scenarios.length} screenshots`);
    if (meta.gif && !args.includes('--no-gif') && !suffix) {
      await p.setViewport({ width: 960, height: 600 });
      await p.evaluate((x) => { window.__lab.load(x); window.__lab.setPlaying(true); }, g.scenario);
      await sleep(800);
      const enc = GIFEncoder(), fps = 10, t0 = Date.now();
      for (let k = 0; k < 8 * fps; k++) {
        while (Date.now() < t0 + k * 1000 / fps) await sleep(5);
        const half = downsample(PNG.sync.read(Buffer.from(await p.screenshot())));
        const pal = quantize(half.data, 128);
        enc.writeFrame(applyPalette(half.data, pal), half.width, half.height, { palette: pal, delay: 1000 / fps });
      }
      enc.finish();
      writeFileSync(join(web, 'media', `${id}.gif`), enc.bytes());
      console.log(`  ${id}.gif ${(enc.bytes().length / 1024).toFixed(0)} KB`);
    }
  }
  await p.close();
}
await browser.close();

function downsample(png) {
  const w = png.width >> 1, h = png.height >> 1, out = new Uint8Array(w * h * 4), d = png.data, W = png.width;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    const i = ((2 * y) * W + 2 * x) * 4 + c;
    out[(y * w + x) * 4 + c] = (d[i] + d[i + 4] + d[i + W * 4] + d[i + W * 4 + 4]) >> 2;
  }
  return { width: w, height: h, data: out };
}
