import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { ROOT } from './export-assets/lib.mjs';

const webPort = 4182;
const apiPort = 3112;
const outputDir = path.join(ROOT, 'docs/assets/review');
fs.mkdirSync(outputDir, { recursive: true });
const harness = spawn(process.execPath, ['tests/e2e/harness.mjs'], { cwd: ROOT, env: { ...process.env, PW_PORT: String(webPort), PW_API_PORT: String(apiPort), PW_PERSISTENCE_DRIVER: 'file' }, stdio: ['ignore', 'pipe', 'pipe'] });
const waitForServer = () => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Timed out waiting for runtime harness')), 30_000);
  harness.stdout.on('data', (chunk) => { if (String(chunk).includes('e2e.harness.started')) { clearTimeout(timer); resolve(); } });
  harness.stderr.on('data', (chunk) => process.stderr.write(chunk));
  harness.once('error', (error) => { clearTimeout(timer); reject(error); });
  harness.once('exit', (code) => { if (code && code !== 0) reject(new Error(`Runtime harness exited with ${code}`)); });
});
const captures = [
  { name: 'wave2-final-runtime-dpr1.png', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, zoom: 1 },
  { name: 'wave2-final-runtime-dpr2.png', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2, zoom: 1 },
  { name: 'wave2-final-runtime-mobile.png', viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, zoom: 1 },
  { name: 'wave2-final-runtime-zoom130.png', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, zoom: 1.3 },
];
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ channel: 'chrome' });
  for (const capture of captures) {
    const context = await browser.newContext({ viewport: capture.viewport, deviceScaleFactor: capture.deviceScaleFactor, locale: 'vi-VN' });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${webPort}/`, { waitUntil: 'networkidle' });
    await page.locator('#farmer-name').fill(`wave2-final-${capture.name}`);
    await page.locator('#login-form button[type="submit"]').click();
    await page.locator('#farm-canvas').waitFor({ state: 'visible' });
    await page.evaluate((zoom) => { document.documentElement.style.zoom = String(zoom); }, capture.zoom);
    await page.waitForTimeout(750);
    await page.screenshot({ path: path.join(outputDir, capture.name), fullPage: true });
    await context.close();
  }
  fs.writeFileSync(path.join(outputDir, 'WAVE2_FINAL_RUNTIME_CAPTURE.json'), `${JSON.stringify({ result: 'PASS', captures }, null, 2)}\n`);
  console.log('Wave 2 final runtime screenshots PASS: DPR1, DPR2, mobile and zoom 1.30 captures written.');
} finally {
  await browser?.close();
  harness.kill('SIGTERM');
}
