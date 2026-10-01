import { expect, test } from '@playwright/test';
import {
  apiJson, captureBrowserErrors, clickGrid, enterFarm, gridPoint,
  installServerAlignedClock, selectTool, uniqueCharacterName,
  advanceCharacterToLevelTwo, reloadFarm,
} from './helpers.mjs';

const readyCell = { x: 8, y: 10 };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

async function dragFromCell(page, { x, y }, delta) {
  const point = await gridPoint(page, x, y);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + delta.x, point.y + delta.y, { steps: 12 });
  await page.mouse.up();
  await page.clock.runFor(80);
}

async function hudBounds(page) {
  return page.locator('.live-profile, .hud-resources, .live-toolbar').evaluateAll((elements) => elements.map((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  }));
}

function farmContents(farm) {
  return { plots: farm.plots, crops: farm.crops, inventory: farm.inventory, objects: farm.objects, animals: farm.animals };
}

test.describe('live farm canvas interactions', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Real mouse camera gestures are covered by the desktop project.');
    await installServerAlignedClock(page);
  });

  test('the live renderer initializes with the production Content Security Policy', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    const policy = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'";
    await page.route('**/', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
    });
    await enterFarm(page, uniqueCharacterName('csp'));
    await expect(page.locator('.game')).toHaveAttribute('data-renderer', 'pixi');
    await selectTool(page, 'harvest');
    const harvested = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/crops/harvest');
    await clickGrid(page, readyCell.x, readyCell.y);
    expect((await harvested).ok()).toBe(true);
    await noBrowserErrors();
  });

  test('dragging with harvest selected moves the view without harvesting', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    await enterFarm(page, uniqueCharacterName('drag'));
    await selectTool(page, 'harvest');
    const before = await apiJson(page, '/api/game/bootstrap');
    const start = await gridPoint(page, readyCell.x, readyCell.y);
    const hud = await hudBounds(page);
    const mutations = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname.startsWith('/api/')) mutations.push(request.url());
    });

    await dragFromCell(page, readyCell, { x: 115, y: -55 });
    const end = await gridPoint(page, readyCell.x, readyCell.y);
    expect(distance(start, end)).toBeGreaterThan(60);
    expect(await hudBounds(page)).toEqual(hud);
    expect(farmContents(await apiJson(page, '/api/game/bootstrap'))).toEqual(farmContents(before));
    expect(mutations, 'a drag gesture must never trigger a farm mutation').toEqual([]);
    await noBrowserErrors();
  });

  test('zoom and home controls transform the farm while the HUD stays fixed', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    await enterFarm(page, uniqueCharacterName('zoom'));
    const initial = await gridPoint(page, 8, 10);
    const initialOther = await gridPoint(page, 12, 10);
    const hud = await hudBounds(page);

    await page.locator('.live-camera [data-camera="in"]').click();
    await page.clock.runFor(80);
    const zoomed = await gridPoint(page, 8, 10);
    const zoomedOther = await gridPoint(page, 12, 10);
    expect(distance(zoomed, zoomedOther)).toBeGreaterThan(distance(initial, initialOther) * 1.05);
    expect(await hudBounds(page)).toEqual(hud);

    await dragFromCell(page, readyCell, { x: 80, y: -40 });
    await page.locator('.live-camera [data-camera="home"]').click();
    await page.clock.runFor(80);
    const centered = await gridPoint(page, 8, 10);
    const centeredOther = await gridPoint(page, 12, 10);
    expect(distance(centered, initial)).toBeLessThan(2);
    expect(Math.abs(distance(centered, centeredOther) - distance(initial, initialOther))).toBeLessThan(2);
    expect(await hudBounds(page)).toEqual(hud);
    await noBrowserErrors();
  });

  test('one canvas harvest removes the visible crop and increases the stored inventory', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    await enterFarm(page, uniqueCharacterName('live'));
    await selectTool(page, 'harvest');
    const before = await apiJson(page, '/api/game/bootstrap');
    const plot = before.plots.find((item) => item.gridX === readyCell.x && item.gridY === readyCell.y);
    expect(plot).toBeTruthy();
    expect(before.crops.some((crop) => crop.plotId === plot.id)).toBe(true);
    const riceBefore = before.inventory.find((item) => item.itemId === 'rice')?.quantity || 0;
    const point = await gridPoint(page, readyCell.x, readyCell.y);
    // Sample the visible crop itself; this catches a stale scene after a successful API call.
    const clip = { x: Math.floor(point.x - 16), y: Math.floor(point.y - 16), width: 32, height: 32 };
    const cropBefore = await page.screenshot({ clip, animations: 'disabled' });
    const harvested = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/crops/harvest');
    await clickGrid(page, readyCell.x, readyCell.y);
    const response = await harvested;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON()).toMatchObject({ plotId: plot.id });
    await page.clock.runFor(150);

    const after = await apiJson(page, '/api/game/bootstrap');
    expect(after.crops.some((crop) => crop.plotId === plot.id)).toBe(false);
    expect(after.inventory.find((item) => item.itemId === 'rice')?.quantity).toBeGreaterThan(riceBefore);
    const cropAfter = await page.screenshot({ clip, animations: 'disabled' });
    expect(cropBefore.equals(cropAfter), 'harvesting must visibly change the actual crop on the canvas').toBe(false);
    await noBrowserErrors();
  });

  test('choosing a building and placing it on the canvas creates a persisted object', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('place');
    await enterFarm(page, name);
    await advanceCharacterToLevelTwo(page);
    await reloadFarm(page, name);
    await page.locator('[data-tool="build"]').click();
    await page.locator('dialog [data-building="chicken_coop_lv1"]').click();
    await expect(page.locator('dialog')).not.toBeVisible();
    const placed = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/buildings/place');
    await clickGrid(page, 16, 14);
    expect((await placed).ok()).toBe(true);
    await page.clock.runFor(150);
    const state = await apiJson(page, '/api/game/bootstrap');
    expect(state.objects.filter((object) => object.definitionId === 'chicken_coop_lv1')).toEqual([
      expect.objectContaining({ gridX: 16, gridY: 14 }),
    ]);
    expect(state.animals).toHaveLength(1);
    await noBrowserErrors();
  });
});

test('mobile touch drag and pinch move the world without harvesting; a tap harvests', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Requires the touch-enabled mobile project.');
  await page.setViewportSize({ width: 844, height: 390 });
  await installServerAlignedClock(page);
  const noBrowserErrors = captureBrowserErrors(page);
  await enterFarm(page, uniqueCharacterName('touch'));
  await selectTool(page, 'harvest');
  const before = await apiJson(page, '/api/game/bootstrap');
  const start = await gridPoint(page, readyCell.x, readyCell.y);
  const hud = await hudBounds(page);
  const client = await context.newCDPSession(page);
  const touch = (x, y, id = 1) => ({ x, y, id });
  const dispatch = (type, touchPoints) => client.send('Input.dispatchTouchEvent', { type, touchPoints });
  await dispatch('touchStart', [touch(start.x, start.y)]);
  for (let step = 1; step <= 8; step++) await dispatch('touchMove', [touch(start.x + step * 10, start.y - step * 3)]);
  await dispatch('touchEnd', []);
  await page.clock.runFor(80);
  expect(distance(start, await gridPoint(page, readyCell.x, readyCell.y))).toBeGreaterThan(50);
  expect(farmContents(await apiJson(page, '/api/game/bootstrap'))).toEqual(farmContents(before));
  expect(await hudBounds(page)).toEqual(hud);

  const first = await gridPoint(page, 8, 10);
  const second = await gridPoint(page, 12, 10);
  const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  await dispatch('touchStart', [touch(center.x - 30, center.y), touch(center.x + 30, center.y, 2)]);
  await dispatch('touchMove', [touch(center.x - 44, center.y), touch(center.x + 44, center.y, 2)]);
  await dispatch('touchEnd', []);
  await page.clock.runFor(80);
  expect(distance(await gridPoint(page, 8, 10), await gridPoint(page, 12, 10))).toBeGreaterThan(distance(first, second) * 1.1);
  expect(farmContents(await apiJson(page, '/api/game/bootstrap'))).toEqual(farmContents(before));
  await client.detach();

  const harvested = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/crops/harvest');
  const point = await gridPoint(page, readyCell.x, readyCell.y);
  await page.touchscreen.tap(point.x, point.y);
  expect((await harvested).ok()).toBe(true);
  const after = await apiJson(page, '/api/game/bootstrap');
  expect(after.inventory.find((item) => item.itemId === 'rice')?.quantity).toBe(3);
  await noBrowserErrors();
});
