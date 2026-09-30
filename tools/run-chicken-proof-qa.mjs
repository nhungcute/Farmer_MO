import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const baseUrl = 'http://127.0.0.1:4174/docs/assets/review';
const executablePath = process.env.CHROME_PATH
  ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
const viewports = [
  { width: 932, height: 430 },
  { width: 915, height: 412 },
  { width: 844, height: 390 },
  { width: 740, height: 360 },
];
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
const qaPath = 'docs/assets/review/CHICKEN_PROOF_QA.json';
let previous = {};
try {
  previous = JSON.parse(await readFile(qaPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const result = {
  ...previous,
  qaVersion: 'B02.2-PROOF-QA-v2',
  generatedAt: new Date().toISOString(),
  browser: 'Google Chrome via Playwright executablePath',
  proofPreview: { viewports: [], pixiCanvas: true, eatEvent: false, errors: [] },
  stressPreview: { viewports: [], cloneCounts: {}, errors: [] },
};

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  await page.goto(`${baseUrl}/chicken-proof-preview.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__chickenProofReady === true);
  const initial = await page.evaluate(() => ({
    canvas: Boolean(document.querySelector('#pixi-root canvas')),
    status: document.querySelector('#status')?.textContent ?? '',
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));
  await page.selectOption('#state', 'EAT');
  await page.selectOption('#direction', 'SE');
  await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('FEED_CONSUMED@2'));
  const eatEventStatus = await page.locator('#status').textContent();
  await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('khung 5/5'));
  const eatFinalStatus = await page.locator('#status').textContent();
  result.proofPreview.viewports.push({ ...viewport, ...initial, eatEventStatus, eatFinalStatus, eatFrameCount: 5, errors });
  result.proofPreview.eatEvent ||= eatEventStatus.includes('FEED_CONSUMED@2');
  result.proofPreview.errors.push(...errors);
  await page.close();
}

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  await page.goto(`${baseUrl}/chicken-stress-preview.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__chickenStressReady === true);
  const viewportResult = await page.evaluate(() => ({
    canvas: Boolean(document.querySelector('#pixi-root canvas')),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));
  for (const count of [1, 25, 50, 100]) {
    await page.selectOption('#clone-count', String(count));
    await page.waitForFunction((expected) => window.__chickenStressSnapshot?.count === expected && window.__chickenStressSnapshot.fps !== null, count);
    result.stressPreview.cloneCounts[count] ??= [];
    result.stressPreview.cloneCounts[count].push({
      ...viewport,
      ...viewportResult,
      snapshot: await page.evaluate(() => window.__chickenStressSnapshot),
      errors,
    });
  }
  result.stressPreview.viewports.push({ ...viewport, ...viewportResult, errors });
  result.stressPreview.errors.push(...errors);
  await page.close();
}

await browser.close();
if (result.revision2?.pixiEatFiveFrame) {
  result.revision2.pixiEatFiveFrame.viewports = result.proofPreview.viewports;
  result.revision2.pixiEatFiveFrame.status = result.proofPreview.eatEvent
    && result.proofPreview.viewports.every((item) => item.eatFinalStatus.includes('khung 5/5'))
    ? 'PASS'
    : 'FAIL';
}
await writeFile(qaPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
const failures = [
  ...result.proofPreview.viewports.flatMap((item) => [
    ...(item.errors ?? []),
    ...(!item.canvas ? ['proof canvas missing'] : []),
    ...(item.horizontalOverflow ? ['proof viewport overflow'] : []),
  ]),
  ...result.stressPreview.viewports.flatMap((item) => [
    ...(item.errors ?? []),
    ...(!item.canvas ? ['stress canvas missing'] : []),
    ...(item.horizontalOverflow ? ['stress viewport overflow'] : []),
  ]),
  ...(result.proofPreview.eatEvent ? [] : ['FEED_CONSUMED@2 not observed']),
  ...(result.proofPreview.viewports.every((item) => item.eatFinalStatus.includes('khung 5/5') && item.eatEventStatus.includes('FEED_CONSUMED@2')) ? [] : ['EAT preview did not expose five frames']),
];
if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
}
console.log(JSON.stringify(result, null, 2));
