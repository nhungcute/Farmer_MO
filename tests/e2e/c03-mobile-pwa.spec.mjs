import { expect, test } from '@playwright/test';
import { captureBrowserErrors, enterFarm, installServerAlignedClock, uniqueCharacterName } from './helpers.mjs';

function assertC03Project(testInfo) {
  test.skip(testInfo.project.name !== 'mobile-pwa', 'C03 runs in the mobile-pwa project so service workers remain enabled only for this gate.');
}

function contrastRatio(foreground, background) {
  const channels = (value) => {
    const match = String(value).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/u);
    if (!match) return null;
    return match.slice(1, 4).map((channel) => Number(channel) / 255);
  };
  const toLinear = (channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const fg = channels(foreground);
  const bg = channels(background);
  if (!fg || !bg) return null;
  const luminance = (rgb) => 0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);
  const light = Math.max(luminance(fg), luminance(bg));
  const dark = Math.min(luminance(fg), luminance(bg));
  return (light + 0.05) / (dark + 0.05);
}

test.describe('C03 mobile, PWA and accessibility gate', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    assertC03Project(testInfo);
    await installServerAlignedClock(page);
  });

  test('direct entry remains usable in both orientations with touch-safe controls', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await enterFarm(page, uniqueCharacterName('c03'));
    await expect(page.locator('.orientation')).toBeVisible();
    await expect(page.locator('.orientation[role="status"]')).toHaveAttribute('aria-live', 'polite');

    // 740×360 is the minimum landscape acceptance viewport from the UI/PWA
    // specification; the existing C01 smoke also covers 844×390.
    await page.setViewportSize({ width: 740, height: 360 });
    await expect(page.locator('.orientation')).toBeHidden();
    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.bodyHeight).toBeLessThanOrEqual(layout.viewportHeight + 1);

    const canvasInfo = await page.locator('canvas').evaluateAll((canvases) => canvases.map((canvas) => ({
      id: canvas.id,
      touchAction: getComputedStyle(canvas).touchAction,
      width: canvas.getBoundingClientRect().width,
      height: canvas.getBoundingClientRect().height,
    })));
    expect(canvasInfo.length).toBeGreaterThan(0);
    expect(canvasInfo.every((canvas) => canvas.touchAction === 'none' && canvas.width > 0 && canvas.height > 0)).toBeTruthy();

    const touchTargets = await page.locator('button:visible').evaluateAll((buttons) => buttons.map((button) => ({
      label: button.innerText.trim(),
      width: button.getBoundingClientRect().width,
      height: button.getBoundingClientRect().height,
      html: button.outerHTML.slice(0, 180),
      inViewport: (() => { const rect = button.getBoundingClientRect(); return rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth; })(),
    })));
    const userTargets = touchTargets.filter((button) => button.inViewport);
    expect(userTargets.length).toBeGreaterThan(1);
    expect(userTargets.every((button) => button.label.length > 0 && button.width >= 44 && button.height >= 44)).toBeTruthy();

    // The active renderer surface must consume touch gestures without making
    // the page itself scroll. This covers the pan/pinch input contract at the
    // browser boundary; camera math is covered by renderer unit tests.
    const renderer = page.locator('#game-renderer-host canvas').filter({ visible: true }).first();
    const surface = await renderer.count() ? renderer : page.locator('#farm-canvas');
    const box = await surface.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    // Playwright's synthetic pointer events do not create a browser pointer
    // stream, so the production pointer-capture call would otherwise report
    // a test-only DOMException. Real touch input still uses pointer capture.
    await surface.evaluate((canvas) => { canvas.setPointerCapture = () => {}; });
    await surface.dispatchEvent('pointerdown', { bubbles: true, pointerId: 11, pointerType: 'touch', clientX: box.x + 100, clientY: box.y + 100, isPrimary: true });
    await surface.dispatchEvent('pointerdown', { bubbles: true, pointerId: 12, pointerType: 'touch', clientX: box.x + 160, clientY: box.y + 100, isPrimary: false });
    await surface.dispatchEvent('pointermove', { bubbles: true, pointerId: 11, pointerType: 'touch', clientX: box.x + 80, clientY: box.y + 100, isPrimary: true });
    await surface.dispatchEvent('pointermove', { bubbles: true, pointerId: 12, pointerType: 'touch', clientX: box.x + 180, clientY: box.y + 100, isPrimary: false });
    await surface.dispatchEvent('pointerup', { bubbles: true, pointerId: 11, pointerType: 'touch', clientX: box.x + 80, clientY: box.y + 100, isPrimary: true });
    await surface.dispatchEvent('pointerup', { bubbles: true, pointerId: 12, pointerType: 'touch', clientX: box.x + 180, clientY: box.y + 100, isPrimary: false });
    expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual({ x: 0, y: 0 });
    await noBrowserErrors();
  });

  test('manifest and service worker provide an installable Vietnamese shell', async ({ page }) => {
    const response = await page.request.get('/public/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/manifest+json');
    const manifest = await response.json();
    expect(manifest).toMatchObject({ lang: 'vi-VN', display: 'standalone', orientation: 'any' });
    expect(manifest.start_url).toEqual(expect.any(String));
    expect(manifest.scope).toEqual(expect.any(String));

    await page.goto('/');
    await expect.poll(async () => page.evaluate(() => navigator.serviceWorker?.getRegistration().then(Boolean) ?? false), { timeout: 10_000 }).toBeTruthy();
    const worker = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return {
        scope: registration.scope,
        scriptURL: registration.active?.scriptURL || '',
        state: registration.active?.state || '',
        controller: Boolean(navigator.serviceWorker.controller),
        cacheNames: await caches.keys(),
      };
    });
    expect(worker.scope).toContain('/');
    expect(worker.scriptURL).toContain('/sw.js');
    expect(['activated', 'activating']).toContain(worker.state);
    expect(worker.cacheNames).toContain('mo-farm-static-v2');
  });

  test('Vietnamese controls are keyboard reachable, labelled and readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#login-form')).toBeVisible();
    const loginSemantics = await page.evaluate(() => ({
      language: document.documentElement.lang,
      labelFor: document.querySelector('label[for="farmer-name"]')?.htmlFor,
      required: document.querySelector('#farmer-name')?.required,
      submitName: document.querySelector('#login-form button')?.innerText.trim(),
    }));
    expect(loginSemantics).toMatchObject({ language: 'vi', labelFor: 'farmer-name', required: true });
    expect(loginSemantics.submitName).toBeTruthy();

    await page.locator('#farmer-name').focus();
    await page.keyboard.press('Tab');
    // The form's submit button is the next focusable control after the input.
    expect(await page.evaluate(() => ({ tag: document.activeElement?.tagName, outline: getComputedStyle(document.activeElement).outlineStyle }))).toEqual({ tag: 'BUTTON', outline: 'solid' });
    await page.locator('#farmer-name').fill(uniqueCharacterName('a11y'));
    await page.keyboard.press('Enter');
    await expect(page.locator('#farm-canvas')).toBeVisible();

    const controls = await page.locator('button:visible').evaluateAll((buttons) => buttons.map((button) => ({
      text: button.innerText.trim(),
      type: button.getAttribute('type'),
      name: button.getAttribute('aria-label') || button.innerText.trim(),
    })));
    expect(controls.length).toBeGreaterThanOrEqual(11);
    expect(controls.every((control) => control.type === 'button' && control.name.length > 0)).toBeTruthy();
    await expect(page.locator('.toolbar')).toHaveAttribute('aria-label', /.+/u);
    await expect(page.locator('#farm-canvas')).toHaveAttribute('aria-label', /.+/u);

    const contrast = await page.locator('.tool:visible, .logout:visible').evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      let background = style.backgroundColor;
      let parent = element.parentElement;
      while (parent && background.endsWith(', 0)')) {
        background = getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      return { text: element.innerText.trim(), color: style.color, background };
    }));
    const ratios = contrast.map(({ color, background }) => {
      const parse = (value) => value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/u)?.slice(1, 4).map(Number);
      const fg = parse(color); const bg = parse(background);
      if (!fg || !bg) return 0;
      const luminance = (rgb) => rgb.reduce((sum, channel, index) => sum + [0.2126, 0.7152, 0.0722][index] * ((channel /= 255) <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4), 0);
      const light = Math.max(luminance(fg), luminance(bg)); const dark = Math.min(luminance(fg), luminance(bg));
      return (light + 0.05) / (dark + 0.05);
    });
    expect(ratios.every((ratio) => ratio >= 4.5)).toBeTruthy();
    expect(contrastRatio('rgb(244, 247, 239)', 'rgb(32, 75, 55)')).toBeGreaterThan(4.5);
  });
});
