import { expect, test } from '@playwright/test';
import {
  advanceCharacterToLevelTwo,
  apiJson,
  captureBrowserErrors,
  clickGrid,
  enterFarm,
  installServerAlignedClock,
  reloadFarm,
  selectTool,
  uniqueCharacterName,
} from './helpers.mjs';

const inventoryQuantity = (state, itemId) => state.inventory.find((item) => item.itemId === itemId)?.quantity || 0;
const dialog = (page) => page.locator('dialog.farm-dialog');

async function openPanel(page, panel) {
  await page.locator(`.side-nav [data-panel="${panel}"]`).click();
  await expect(dialog(page)).toBeVisible();
}

async function expectWithinViewport(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    dialog: (() => {
      const node = document.querySelector('dialog[open]');
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    })(),
  }));
  expect(dimensions.document.width).toBeLessThanOrEqual(dimensions.viewport.width + 1);
  expect(dimensions.document.height).toBeLessThanOrEqual(dimensions.viewport.height + 1);
  if (dimensions.dialog) {
    expect(dimensions.dialog.left).toBeGreaterThanOrEqual(-1);
    expect(dimensions.dialog.top).toBeGreaterThanOrEqual(-1);
    expect(dimensions.dialog.right).toBeLessThanOrEqual(dimensions.viewport.width + 1);
    expect(dimensions.dialog.bottom).toBeLessThanOrEqual(dimensions.viewport.height + 1);
  }
}

async function increment(page, kind, count) {
  for (let index = 0; index < count; index += 1) {
    await dialog(page).locator(`[data-step="${kind}"][data-delta="1"]`).click();
  }
}

test.describe('design pack interactive panels', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!['chromium', 'mobile-chromium'].includes(testInfo.project.name), 'Run against desktop and landscape phone; PWA has a separate suite.');
    await page.setViewportSize(testInfo.project.name === 'chromium' ? { width: 1440, height: 900 } : { width: 844, height: 390 });
    await installServerAlignedClock(page);
  });

  test('warehouse filters items and sells the selected quantity with persisted balances', async ({ page }) => {
    const noErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('sale');
    await enterFarm(page, name);
    const starter = await apiJson(page, '/api/game/bootstrap');
    for (const crop of starter.crops.slice(0, 2)) {
      await apiJson(page, '/api/crops/harvest', { method: 'POST', body: { plotId: crop.plotId } });
    }
    await reloadFarm(page, name);
    const before = await apiJson(page, '/api/game/bootstrap');
    await openPanel(page, 'warehouse');
    await dialog(page).locator('[data-category="animals"]').click();
    await expect(dialog(page).locator('[data-item="rice"]')).toHaveCount(0);
    await expect(dialog(page).locator('[data-item="egg"]')).toBeVisible();
    await dialog(page).locator('[data-item="chicken_feed"]').click();
    await expect(dialog(page).locator('.item-detail h3')).toHaveText('Thức ăn gà');
    await expect(dialog(page).getByRole('button', { name: /^Bán/u })).toBeDisabled();
    await dialog(page).locator('[data-category="crops"]').click();
    await dialog(page).locator('[data-item="carrot"]').click();
    await expect(dialog(page).locator('[data-action="sell"]')).toBeDisabled();
    await dialog(page).locator('[data-item="rice"]').click();
    await increment(page, 'sell', 1);
    await expect(dialog(page).locator('.quantity-stepper output')).toHaveText('2');
    const sold = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/market/sell');
    await dialog(page).locator('[data-action="sell"]').click();
    expect((await sold).ok()).toBeTruthy();
    await expect(dialog(page).locator('[data-item="rice"] .item-count')).toHaveText(String(inventoryQuantity(before, 'rice') - 2));
    const after = await apiJson(page, '/api/game/bootstrap');
    expect(inventoryQuantity(after, 'rice')).toBe(inventoryQuantity(before, 'rice') - 2);
    expect(after.character.coins).toBe(before.character.coins + 16);
    await reloadFarm(page, name);
    await openPanel(page, 'warehouse');
    await expect(dialog(page).locator('[data-item="rice"] .item-count')).toHaveText(String(inventoryQuantity(after, 'rice')));
    await expectWithinViewport(page);
    await noErrors();
  });

  test('shop cart quantity checkout charges the API balance and updates stock', async ({ page }) => {
    const noErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('cart');
    await enterFarm(page, name);
    const before = await apiJson(page, '/api/game/bootstrap');
    await openPanel(page, 'shop');
    await expect(dialog(page).locator('[data-action="checkout"]')).toBeDisabled();
    await dialog(page).locator('[data-category="animals"]').click();
    await increment(page, 'feed', 2);
    await dialog(page).locator('[data-action="add-feed"]').click();
    await expect(dialog(page).locator('.cart-panel output')).toHaveText('3');
    await increment(page, 'cart', 1);
    await expect(dialog(page).locator('.cart-panel output')).toHaveText('4');
    await dialog(page).locator('[data-step="cart"][data-delta="-1"]').click();
    await expect(dialog(page).locator('.cart-summary')).toContainText('15');
    const bought = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/market/buy');
    await dialog(page).locator('[data-action="checkout"]').click();
    const response = await bought;
    expect(response.ok()).toBeTruthy();
    expect(response.request().postDataJSON()).toEqual({ itemId: 'chicken_feed', quantity: 3 });
    await expect(dialog(page).locator('.cart-empty')).toBeVisible();
    await expect(dialog(page).locator('[data-action="checkout"]')).toBeDisabled();
    const after = await apiJson(page, '/api/game/bootstrap');
    expect(after.character.coins).toBe(before.character.coins - 15);
    expect(inventoryQuantity(after, 'chicken_feed')).toBe(inventoryQuantity(before, 'chicken_feed') + 3);
    await expectWithinViewport(page);
    await noErrors();
  });

  test('shop disables checkout when the warehouse has insufficient room', async ({ page }) => {
    const noErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('room');
    await enterFarm(page, name);
    await apiJson(page, '/api/market/buy', { method: 'POST', body: { itemId: 'chicken_feed', quantity: 98 } });
    await reloadFarm(page, name);
    const before = await apiJson(page, '/api/game/bootstrap');
    await openPanel(page, 'shop');
    await dialog(page).locator('[data-category="animals"]').click();
    await increment(page, 'feed', 1);
    await dialog(page).locator('[data-action="add-feed"]').click();
    await expect(dialog(page).locator('[data-action="checkout"]')).toBeDisabled();
    await expect(dialog(page).locator('.cart-panel')).toContainText('Kho không đủ chỗ');
    await dialog(page).locator('[data-step="cart"][data-delta="-1"]').click();
    await expect(dialog(page).locator('[data-action="checkout"]')).toBeEnabled();
    await dialog(page).locator('[data-action="remove-feed"]').click();
    await expect(dialog(page).locator('.cart-empty')).toBeVisible();
    const after = await apiJson(page, '/api/game/bootstrap');
    expect(after.character.coins).toBe(before.character.coins);
    expect(inventoryQuantity(after, 'chicken_feed')).toBe(99);
    await noErrors();
  });

  test('shop refuses a cart above the remaining coin budget', async ({ page }) => {
    const noErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('coin');
    await enterFarm(page, name);
    const before = await apiJson(page, '/api/game/bootstrap');
    // Isolate the budget condition from capacity using a bootstrap fixture.
    // Real purchases and persisted balance deltas are covered in the cart test.
    await page.route('**/api/game/bootstrap', async (route) => {
      const response = await route.fetch();
      const state = await response.json();
      await route.fulfill({ response, json: { ...state, character: { ...state.character, coins: 25 } } });
    });
    await reloadFarm(page, name);
    await openPanel(page, 'shop');
    await dialog(page).locator('[data-category="animals"]').click();
    await increment(page, 'feed', 5);
    await dialog(page).locator('[data-action="add-feed"]').click();
    await expect(dialog(page).locator('.cart-panel output')).toHaveText('6');
    await expect(dialog(page).locator('[data-action="checkout"]')).toBeDisabled();
    await expect(dialog(page).locator('.cart-panel')).not.toContainText('Kho không đủ chỗ');
    await dialog(page).locator('[data-step="cart"][data-delta="-1"]').click();
    await expect(dialog(page).locator('[data-action="checkout"]')).toBeEnabled();
    // BrowserContext request bypasses the UI fixture and reads authoritative state.
    const after = await (await page.request.get('/api/game/bootstrap')).json();
    expect(after.character.coins).toBe(before.character.coins);
    expect(inventoryQuantity(after, 'chicken_feed')).toBe(inventoryQuantity(before, 'chicken_feed'));
    await noErrors();
  });

  test('seed unlocks follow the server level and selection changes the planting tool', async ({ page }) => {
    const noErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('seed');
    await enterFarm(page, name);
    await openPanel(page, 'shop');
    await expect(dialog(page).locator('[data-seed="rice"]')).toBeEnabled();
    for (const crop of ['carrot', 'corn', 'tomato']) await expect(dialog(page).locator(`[data-seed="${crop}"]`)).toBeDisabled();
    await dialog(page).locator('[data-seed="rice"]').click();
    await expect(dialog(page)).not.toBeVisible();
    await expect(page.locator('[data-tool="plant"]')).toHaveAttribute('aria-pressed', 'true');
    await advanceCharacterToLevelTwo(page);
    await reloadFarm(page, name);
    const before = await apiJson(page, '/api/game/bootstrap');
    await openPanel(page, 'shop');
    await expect(dialog(page).locator('[data-seed="carrot"]')).toBeEnabled();
    await expect(dialog(page).locator('[data-seed="corn"]')).toBeDisabled();
    await dialog(page).locator('[data-seed="carrot"]').click();
    await expect(page.locator('#crop-choice')).toHaveText('Cà rốt');
    await expect(page.locator('[data-tool="plant"]')).toHaveAttribute('aria-pressed', 'true');
    expect((await apiJson(page, '/api/game/bootstrap')).character.coins).toBe(before.character.coins);
    await noErrors();
  });

  test('harvest refreshes quest completion and the reward can be claimed once', async ({ page }) => {
    const noErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('gift');
    await enterFarm(page, name);
    await openPanel(page, 'quests');
    await expect(dialog(page).locator('[data-quest="first_harvest"]')).toBeDisabled();
    await page.keyboard.press('Escape');
    await selectTool(page, 'harvest');
    const harvested = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/crops/harvest');
    await clickGrid(page, 8, 10);
    expect((await harvested).ok()).toBeTruthy();
    await expect(page.locator('#quest-dot')).toBeVisible();
    await openPanel(page, 'quests');
    await expect(dialog(page).locator('[data-quest="first_harvest"]')).toBeEnabled();
    const before = await apiJson(page, '/api/game/bootstrap');
    await dialog(page).locator('[data-quest="first_harvest"]').click();
    await expect(dialog(page).locator('[data-quest="first_harvest"]')).toHaveText('✓ Đã nhận');
    await expect(dialog(page).locator('[data-quest="first_harvest"]')).toBeDisabled();
    const after = await apiJson(page, '/api/game/bootstrap');
    expect(after.character.coins).toBe(before.character.coins + 50);
    expect(after.character.xp).toBe(before.character.xp + 10);
    expect(after.quests.find((quest) => quest.questId === 'first_harvest')?.claimed).toBe(true);
    await reloadFarm(page, name);
    await openPanel(page, 'quests');
    await expect(dialog(page).locator('[data-quest="first_harvest"]')).toBeDisabled();
    await expect(dialog(page).locator('[data-quest="first_harvest"]')).toHaveText('✓ Đã nhận');
    await noErrors();
  });

  test('panels stay within the viewport and Escape restores the opening button focus', async ({ page }) => {
    const noErrors = captureBrowserErrors(page);
    await enterFarm(page, uniqueCharacterName('size'));
    await expectWithinViewport(page);
    for (const panel of ['warehouse', 'shop', 'quests', 'orders']) {
      const opener = page.locator(`.side-nav [data-panel="${panel}"]`);
      await opener.click();
      await expect(dialog(page)).toBeVisible();
      await expectWithinViewport(page);
      await page.keyboard.press('Escape');
      await expect(dialog(page)).not.toBeVisible();
      await expect(opener).toBeFocused();
    }
    await noErrors();
  });
});
