import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { ROOT } from './export-assets/lib.mjs';

const webPort = 4181;
const apiPort = 3111;
const baseURL = `http://127.0.0.1:${webPort}`;
const outputDir = path.join(ROOT, 'docs/assets/review');
fs.mkdirSync(outputDir, { recursive: true });

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for the review harness')), 30_000);
    const onData = (chunk) => {
      const text = String(chunk);
      if (text.includes('e2e.harness.started')) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => {
      if (code && code !== 0) { clearTimeout(timer); reject(new Error(`Review harness exited with ${code}`)); }
    });
  });
}

const harness = spawn(process.execPath, ['tests/e2e/harness.mjs'], {
  cwd: ROOT,
  env: { ...process.env, PW_PORT: String(webPort), PW_API_PORT: String(apiPort), PW_PERSISTENCE_DRIVER: 'file' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
try {
  await waitForServer(harness);
  browser = await chromium.launch({ channel: 'chrome' });
  const captures = [
    { name: 'wave2-production-runtime-dpr1.png', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
    { name: 'wave2-production-runtime-dpr2.png', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 },
    { name: 'wave2-production-runtime-mobile.png', viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 },
  ];
  for (const capture of captures) {
    const context = await browser.newContext({ viewport: capture.viewport, deviceScaleFactor: capture.deviceScaleFactor, locale: 'vi-VN' });
    const page = await context.newPage();
    await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
    await page.locator('#farmer-name').fill(`wave2-review-${capture.deviceScaleFactor}-${capture.viewport.width}`);
    await page.locator('#login-form button[type="submit"]').click();
    await page.locator('#farm-canvas').waitFor({ state: 'visible' });
    await page.waitForTimeout(750);
    await page.screenshot({ path: path.join(outputDir, capture.name), fullPage: true });
    await context.close();
  }
  console.log('Wave 2 production runtime screenshots PASS: DPR1, DPR2 and mobile captures written.');
} finally {
  await browser?.close();
  harness.kill('SIGTERM');
}
