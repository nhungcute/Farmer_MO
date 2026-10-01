import { expect, test } from '@playwright/test';
import {
  advanceCharacterToLevelTwo,
  advanceServerClock,
  apiJson,
  captureBrowserErrors,
  clickGrid,
  enterFarm,
  installServerAlignedClock,
  placeBuilding,
  reloadFarm,
  selectTool,
  uniqueCharacterName,
} from './helpers.mjs';

test.describe('direct-entry desktop gameplay', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'The mobile project has a dedicated viewport suite.');
    await installServerAlignedClock(page);
  });

  test('new character enters once, completes a crop cycle, and resumes after reload', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('crop');
    await enterFarm(page, name);

    // Starter rice is ready immediately; interact with the displayed plot.
    await selectTool(page, 'harvest');
    const starter = await apiJson(page, '/api/game/bootstrap');
    const starterCrop = starter.crops.find((crop) => crop.plotId === starter.plots.find((plot) => plot.gridX === 8 && plot.gridY === 10)?.id);
    expect(starterCrop).toBeTruthy();
    const starterHarvest = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/crops/harvest');
    await clickGrid(page, 8, 10);
    expect((await starterHarvest).ok()).toBeTruthy();

    // Plant an empty starter plot, advance both clocks, then harvest it.
    await selectTool(page, 'plant');
    const emptyPlot = starter.plots.find((plot) => plot.gridX === 8 && plot.gridY === 13);
    expect(emptyPlot).toBeTruthy();
    const planted = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/crops/plant');
    await clickGrid(page, 8, 13);
    expect((await planted).ok()).toBeTruthy();
    await advanceServerClock(page, 120_001);

    await selectTool(page, 'harvest');
    const grownHarvest = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/crops/harvest');
    await clickGrid(page, 8, 13);
    expect((await grownHarvest).ok()).toBeTruthy();

    const beforeReload = await apiJson(page, '/api/game/bootstrap');
    expect(beforeReload.crops.some((crop) => crop.plotId === beforeReload.plots.find((plot) => plot.gridX === 8 && plot.gridY === 13)?.id)).toBe(false);
    expect(beforeReload.inventory.find((item) => item.itemId === 'rice')?.quantity).toBe(6);

    await reloadFarm(page, name);
    const afterReload = await apiJson(page, '/api/game/bootstrap');
    expect(afterReload.character.displayName).toBe(name);
    expect(afterReload.inventory.find((item) => item.itemId === 'rice')?.quantity).toBe(6);
    await noBrowserErrors();
  });

  test('existing character direct entry has no tutorial and one bootstrap on resume', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('same');
    await enterFarm(page, name);

    await page.locator('[data-panel="settings"]:visible').first().click();
    await page.locator('dialog [data-action="logout"]').click();
    await expect(page.locator('#login-form')).toBeVisible();
    const enterResponse = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/character/enter');
    await page.locator('#farmer-name').fill(name);
    await page.getByRole('button', { name: /Vào nông trại/u }).click();
    const enterBody = await (await enterResponse).json();
    expect(enterBody.status).toBe('existing');
    await expect(page.locator('#farm-canvas')).toBeVisible();
    await expect(page.locator('.tutorial, .tutorial-overlay, [data-tutorial]')).toHaveCount(0);

    await reloadFarm(page, name);
    await noBrowserErrors();
  });

  test('pond placement is persisted at the same grid position after reload', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('pond');
    await enterFarm(page, name);
    await advanceCharacterToLevelTwo(page);

    const placement = await placeBuilding(page, 'pond_small_lv1', 16, 10);
    expect(placement.object.definitionId).toBe('pond_small_lv1');
    expect(placement.object.gridX).toBe(16);
    expect(placement.object.gridY).toBe(10);

    await reloadFarm(page, name);
    const state = await apiJson(page, '/api/game/bootstrap');
    const pond = state.objects.find((object) => object.definitionId === 'pond_small_lv1');
    expect(pond).toMatchObject({ gridX: 16, gridY: 10, rotation: 0 });
    await noBrowserErrors();
  });

  test('coop creates one chicken, supports timed egg collection, and can feed again', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('coop');
    await enterFarm(page, name);
    await advanceCharacterToLevelTwo(page);

    const placement = await placeBuilding(page, 'chicken_coop_lv1', 16, 14);
    expect(placement.animal?.type).toBe('chicken_basic');
    const chickenId = placement.animal.id;
    // Level-up and placement above use the API to avoid coupling this flow to
    // the demo toolbar's single-cell build affordance. Reload once so the UI
    // has the server-created coop/chicken before canvas interactions begin.
    await reloadFarm(page, name);

    async function actOnChicken(tool, path) {
      await selectTool(page, tool);
      const mutation = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === path);
      await clickGrid(page, 17, 15);
      const response = await mutation;
      expect(response.ok()).toBeTruthy();
      expect(response.request().postDataJSON()).toEqual({ animalId: chickenId });
    }
    await actOnChicken('feed', '/api/animals/feed');

    await advanceServerClock(page, 600_001);
    await actOnChicken('collect', '/api/animals/collect');

    const buyFeed = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/market/buy');
    await selectTool(page, 'buy-feed');
    await buyFeed;

    await actOnChicken('feed', '/api/animals/feed');

    const state = await apiJson(page, '/api/game/bootstrap');
    expect(state.animals.filter((animal) => animal.id === chickenId)).toHaveLength(1);
    expect(state.inventory.find((item) => item.itemId === 'egg')?.quantity).toBe(1);
    expect(state.animals.find((animal) => animal.id === chickenId)?.productReadyAt).toEqual(expect.any(String));
    await noBrowserErrors();
  });
});

test.describe('mobile and PWA smoke', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'This suite is intentionally limited to the mobile project.');
    await installServerAlignedClock(page);
  });

  test('portrait asks for rotation, landscape keeps the canvas touch-safe, and PWA is standalone', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('mobile');
    await page.setViewportSize({ width: 390, height: 844 });
    await enterFarm(page, name);
    await expect(page.locator('.orientation')).toBeVisible();

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('.orientation')).toBeHidden();
    await expect.poll(async () => page.locator('#farm-canvas').evaluate((canvas) => getComputedStyle(canvas).touchAction)).toBe('none');
    const rendererTouchAction = await page.locator('#game-renderer-host canvas').evaluateAll((canvases) => canvases.map((canvas) => getComputedStyle(canvas).touchAction));
    expect(rendererTouchAction.length === 0 || rendererTouchAction.every((value) => value === 'none')).toBeTruthy();

    const manifestResponse = await page.request.get('/public/manifest.webmanifest');
    expect(manifestResponse.ok()).toBeTruthy();
    const manifest = await manifestResponse.json();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toEqual(expect.any(String));
    await noBrowserErrors();
  });
});
