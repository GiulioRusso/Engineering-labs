// Headless captures: one PNG per scenario (web/media/<lab>/<scenario>.png), the catalogue thumbnail
// (web/media/<lab>.png) and an 8 s GIF of the first tour scenario (web/media/<lab>.gif).
// Usage: node tools/capture.mjs [lab-id] [--no-gif] [--theme light]
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
import { launch } from './browser.mjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const args = process.argv.slice(2), flag = (f) => args.includes(f);
const theme = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : 'dark';
const only = args.find((a) => !a.startsWith('--') && a !== theme);
const web = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
// every built lab: web/<topic>/<id>.html
const labs = readdirSync(web, { recursive: true }).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => f.slice(0, -5)).filter((id) => !only || id.endsWith(`/${only}`));
const browser = await launch();
if (!browser) { console.log('chrome not found'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const path of labs) {
  const id = path.split('/').pop();
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument((t) => { try { localStorage.setItem('labs-theme', t); } catch {} }, theme);
  await p.goto(pathToFileURL(join(web, `${path}.html`)).href, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__lab);
  mkdirSync(join(web, 'media', id), { recursive: true });
  const meta = await p.evaluate(() => ({ scenarios: window.__lab.scenarios, gif: window.__lab.gif }));
  for (const s of meta.scenarios) {
    await p.evaluate((sid) => { window.__lab.load(sid); window.__lab.setPlaying(true); }, s);
    await sleep(1600);
    const file = join(web, 'media', id, `${s}${theme === 'dark' ? '' : `-${theme}`}.png`);
    writeFileSync(file, await p.screenshot());
    console.log(`${id}/${s}.png`);
  }
  // thumbnail: the stage only, of the GIF scenario
  const g = meta.gif || { scenario: meta.scenarios[0] };
  await p.evaluate((sid) => { window.__lab.load(sid); window.__lab.setPlaying(true); }, g.scenario);
  await sleep(1600);
  const box = await p.$eval('#stage', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  writeFileSync(join(web, 'media', `${id}.png`), await p.screenshot({ clip: box }));
  if (!flag('--no-gif')) {
    await p.setViewport({ width: 960, height: 600 });
    await p.evaluate((sid) => { window.__lab.load(sid); window.__lab.setPlaying(true); }, g.scenario);
    await sleep(800);
    const enc = GIFEncoder(), fps = 10, n = 8 * fps;
    const t0 = Date.now();
    for (let k = 0; k < n; k++) {
      while (Date.now() < t0 + k * 1000 / fps) await sleep(5);
      const png = PNG.sync.read(Buffer.from(await p.screenshot()));
      const half = downsample(png);
      const pal = quantize(half.data, 128);
      enc.writeFrame(applyPalette(half.data, pal), half.width, half.height, { palette: pal, delay: 1000 / fps });
    }
    enc.finish();
    writeFileSync(join(web, 'media', `${id}.gif`), enc.bytes());
    console.log(`${id}.gif ${(enc.bytes().length / 1024).toFixed(0)} KB`);
  }
  await p.close();
}
await browser.close();

// 2× box downsample (sharper than nearest, keeps the GIF small)
function downsample(png) {
  const w = png.width >> 1, h = png.height >> 1, out = new Uint8Array(w * h * 4), d = png.data, W = png.width;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    const i = ((2 * y) * W + 2 * x) * 4 + c;
    out[(y * w + x) * 4 + c] = (d[i] + d[i + 4] + d[i + W * 4] + d[i + W * 4 + 4]) >> 2;
  }
  return { width: w, height: h, data: out };
}
