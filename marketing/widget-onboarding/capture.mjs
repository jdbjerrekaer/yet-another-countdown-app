#!/usr/bin/env node
/**
 * Screenshot the widget-onboarding frames (light + dark) for marketing use.
 * The app itself renders these frames live — see
 * src/components/WidgetOnboardingFrames.
 *
 *   node marketing/widget-onboarding/capture.mjs              # en, both themes
 *   node marketing/widget-onboarding/capture.mjs --langs en,da,sv
 *   node marketing/widget-onboarding/capture.mjs --out-dir /tmp/frames
 *
 * Starts `npm run dev` itself and shuts it down afterwards.
 * puppeteer is resolved from ~/leadplatform/node_modules (not a dep here).
 *
 * ponytail: reuses the leadplatform puppeteer install instead of adding a
 * ~300 MB devDependency for a script that runs a few times a year. Add it as a
 * real devDependency if this ever runs in CI.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/Users/jonatanbjerrekaer/leadplatform/');
const puppeteer = require('puppeteer');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Export target. The app renders the frames live, so nothing here ships in the
// bundle — these PNGs are only for App Store / marketing material.
const OUT = arg('out-dir', path.join(ROOT, 'marketing/widget-onboarding/export'));
const PAGE = '/marketing/widget-onboarding/index.html';

const LANGS = arg('langs', 'en').split(',');
// 2x of a 520pt-wide frame is already wider than any iPhone screen; 3x only
// costs bundle size. Pass --scale 3 if a frame ever needs to be blown up.
const SCALE = Number(arg('scale', 2));
const THEMES = ['light', 'dark'];

/** Boot the Vite dev server and resolve with its origin. */
async function startDevServer() {
  const proc = spawn('npm', ['run', 'dev'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('dev server did not start in 60s')), 60_000);
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      const m = chunk.match(/https?:\/\/localhost:\d+/);
      if (m) {
        clearTimeout(timer);
        resolve(m[0]);
      }
    });
    proc.on('exit', (code) => reject(new Error(`dev server exited with ${code}`)));
  });
  return { proc, origin };
}

const { proc, origin } = await startDevServer();
await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: SCALE });

let written = 0;
let frameCount = 0;
try {
  for (const lang of LANGS) {
    for (const theme of THEMES) {
      const url = `${origin}${PAGE}?theme=${theme}&lang=${lang}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForSelector('.frame');
      // Let webfonts and the emoji glyph settle before capturing.
      await page.evaluate(() => document.fonts.ready);
      await new Promise((r) => setTimeout(r, 400));

      const names = await page.$$eval('.frame', (els) => els.map((el) => el.dataset.frame));
      frameCount = names.length;
      for (const name of names) {
        const el = await page.$(`.frame[data-frame="${name}"]`);
        const suffix = lang === 'en' ? '' : `.${lang}`;
        const file = path.join(OUT, `${name}.${theme}${suffix}.png`);
        await el.screenshot({ path: file, omitBackground: true });
        console.log(`✓ ${path.relative(ROOT, file)}`);
        written++;
      }
    }
  }
} finally {
  await browser.close();
  proc.kill('SIGTERM');
}

const expected = LANGS.length * THEMES.length * frameCount;
if (!frameCount || written !== expected) {
  console.error(`Expected ${expected} images, wrote ${written}`);
  process.exit(1);
}
console.log(`\n${written} images → ${path.relative(ROOT, OUT)}`);
process.exit(0);
