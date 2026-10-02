import { expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

/** Isolated screen evidence; integrated gameplay must be tested separately. */
export async function mountScreen(page, { id, props = {}, html, modal = false } = {}) {
  await page.route('**/ui-fixture', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html lang="vi"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/ui/foundation/foundation.css"><style>body{margin:0;background:#96c966}#fixture{min-height:100dvh}#fixture>button{margin:12px}</style><body><main id="fixture" class="farm-ui"></main></body></html>',
  }));
  await page.goto('/ui-fixture');
  await page.evaluate(async ({ id, props, html, modal }) => {
    const foundation = await import('/src/ui/foundation/index.js');
    const root = document.querySelector('#fixture');
    if (id) {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = `/src/ui/screens/${id}/screen.css`;
      document.head.append(css);
      const screen = await import(`/src/ui/screens/${id}/index.js`);
      root.innerHTML = screen.renderScreen(props);
    } else root.innerHTML = html;
    window.fixtureCleanup = foundation.attachFoundation(root);
    if (modal) foundation.openFarmModal(root.querySelector('dialog'));
    await foundation.paintFarmIcons(root);
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, { id, props, html, modal });
}

export async function expectNoOverflow(page) {
  const bounds = await page.evaluate(() => ({ width: innerWidth, actual: document.documentElement.scrollWidth }));
  expect(bounds.actual).toBeLessThanOrEqual(bounds.width + 1);
}

export async function saveScreenEvidence(page, task, name) {
  const directory = path.resolve('docs/ui/evidence', task);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`), animations: 'disabled' });
}
