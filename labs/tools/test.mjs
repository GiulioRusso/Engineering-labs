// Runs every src/**/*.test.js. A test file exports `tests`: { name: () => void } and uses `check`.
// Usage: node tools/test.mjs [filter]
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '../../src');
const filter = process.argv[2] || '';
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.test.js') && p.includes(filter)) files.push(p);
  }
})(root);

let pass = 0, fail = 0;
for (const f of files.sort()) {
  const { tests } = await import(pathToFileURL(f));
  console.log(`\n${relative(root, f)}`);
  for (const [name, fn] of Object.entries(tests)) {
    const t0 = performance.now();
    try {
      const note = fn();
      console.log(`  ok    ${name}${note ? `  (${note})` : ''}  ${(performance.now() - t0).toFixed(0)} ms`);
      pass++;
    } catch (e) {
      console.log(`  FAIL  ${name}\n        ${e.message}`);
      fail++;
    }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
