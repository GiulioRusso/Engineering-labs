// Screenshot of the catalogue page (dev helper): node tools/shot-home.mjs <out.png>
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { launch } from './browser.mjs';
const b = await launch(), p = await b.newPage();
await p.setViewport({ width: 1440, height: 1700 });
await p.goto(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html')).href, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 600));
await p.screenshot({ path: process.argv[2], fullPage: false }); await b.close();
