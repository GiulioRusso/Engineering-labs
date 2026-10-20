// Shared headless-Chrome launcher for smoke.mjs and capture.mjs (puppeteer-core + the system Chrome).
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CANDIDATES = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

export function chromePath() { return CANDIDATES.find((p) => p && existsSync(p)); }

export async function launch() {
  const executablePath = chromePath();
  if (!executablePath) return null;
  return puppeteer.launch({
    executablePath, headless: true,
    args: ['--allow-file-access-from-files', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--hide-scrollbars'],
  });
}
