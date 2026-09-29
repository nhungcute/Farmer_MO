import { expect, test } from '@playwright/test';
import {
  advanceServerClock,
  apiJson,
  captureBrowserErrors,
  enterFarm,
  installServerAlignedClock,
  reloadFarm,
  uniqueCharacterName,
} from './helpers.mjs';

// C02 is intentionally a separate opt-in suite. The harness refuses to start
// unless RUN_POSTGRES_E2E=1, so a normal C01 run can never truncate a database.
test.describe('PostgreSQL runtime functional flow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'The PostgreSQL gate runs once on desktop Chromium.');
    test.skip(process.env.PW_PERSISTENCE_DRIVER !== 'postgres', 'Run with PW_PERSISTENCE_DRIVER=postgres.');
    await installServerAlignedClock(page);
  });

  test('direct entry, gameplay mutations, idempotency and durable restart', async ({ page }) => {
    const noBrowserErrors = captureBrowserErrors(page);
    const name = uniqueCharacterName('pg');
    await enterFarm(page, name);

    const readiness = await page.request.get('/api/health/ready');
    expect(readiness.status()).toBe(200);
    const readinessBody = await readiness.json();
    expect(readinessBody.checks.persistenceDriver).toBe('postgres');
    expect(readinessBody.checks.persistenceReady).toBe(true);

    // A second entry creates a second durable session while resolving to the
    // same character, matching the existing HTTP contract.
    await page.locator('#logout').click();
    await expect(page.locator('#login-form')).toBeVisible();
    await page.locator('#farmer-name').fill(name);
    await page.locator('#login-form button[type="submit"]').click();
    await expect(page.locator('#farm-canvas')).toBeVisible();
    await expect(page.locator('.tutorial, .tutorial-overlay, [data-tutorial]')).toHaveCount(0);

    let state = await apiJson(page, '/api/game/bootstrap');
    expect(state.inventory).toContainEqual({ itemId: 'chicken_feed', quantity: 1 });
    expect(state.plots).toHaveLength(6);
    expect(state.crops).toHaveLength(3);

    // A failed mutation must roll back and must not consume its idempotency
    // key. The occupied starter plot remains occupied by the original crop.
    const occupiedPlot = state.crops[0].plotId;
    const beforeFailedRevision = state.stateRevision;
    const failedResponse = await page.request.post('/api/crops/plant', {
      data: { plotId: occupiedPlot, cropId: 'rice' },
      headers: { 'idempotency-key': `pg-failed-${crypto.randomUUID()}` },
    });
    expect(failedResponse.status()).toBe(409);
    expect((await failedResponse.json()).error.code).toBe('PLOT_NOT_EMPTY');
    state = await apiJson(page, '/api/game/bootstrap');
    expect(state.stateRevision).toBe(beforeFailedRevision);

    // Plant a new plot, replay the exact idempotency key, then advance the
    // server clock and harvest. Both mutations are persisted in PostgreSQL.
    const emptyPlot = state.plots.find((plot) => !state.crops.some((crop) => crop.plotId === plot.id));
    expect(emptyPlot).toBeTruthy();
    const plantKey = `pg-plant-${crypto.randomUUID()}`;
    const planted = await apiJson(page, '/api/crops/plant', { method: 'POST', body: { plotId: emptyPlot.id, cropId: 'rice' }, key: plantKey });
    const replayed = await apiJson(page, '/api/crops/plant', { method: 'POST', body: { plotId: emptyPlot.id, cropId: 'rice' }, key: plantKey });
    expect(replayed.stateRevision).toBe(planted.stateRevision);
    await advanceServerClock(page, 120_001);

    const readyStarter = state.crops[0];
    await apiJson(page, '/api/crops/harvest', { method: 'POST', body: { plotId: readyStarter.plotId } });
    await apiJson(page, '/api/crops/harvest', { method: 'POST', body: { plotId: state.crops[1].plotId } });
    await apiJson(page, '/api/crops/harvest', { method: 'POST', body: { plotId: emptyPlot.id } });

    state = await apiJson(page, '/api/game/bootstrap');
    expect(state.inventory.find((item) => item.itemId === 'rice')?.quantity).toBe(9);

    // Completing the starter order grants level 2, which unlocks pond and coop.
    const order = state.orders.find((item) => item.status === 'OPEN' && item.lines.length === 1 && item.lines[0].itemId === 'rice' && item.lines[0].quantity <= (state.inventory.find((item) => item.itemId === 'rice')?.quantity ?? 0));
    expect(order).toBeTruthy();
    const completed = await apiJson(page, `/api/orders/${encodeURIComponent(order.id)}/complete`, { method: 'POST', body: {} });
    expect(completed.order.status).toBe('COMPLETED');
    state = await apiJson(page, '/api/game/bootstrap');
    expect(state.character.level).toBeGreaterThanOrEqual(2);

    const sold = await apiJson(page, '/api/market/sell', { method: 'POST', body: { itemId: 'rice', quantity: 3 } });
    expect(sold.earned.coins).toBe(24);
    const bought = await apiJson(page, '/api/market/buy', { method: 'POST', body: { itemId: 'chicken_feed', quantity: 2 } });
    expect(bought.purchased.quantity).toBe(2);

    const pond = await apiJson(page, '/api/buildings/place', { method: 'POST', body: { definitionId: 'pond_small_lv1', gridX: 17, gridY: 4, rotation: 0 } });
    expect(pond.object.definitionId).toBe('pond_small_lv1');
    const coop = await apiJson(page, '/api/buildings/place', { method: 'POST', body: { definitionId: 'chicken_coop_lv1', gridX: 17, gridY: 10, rotation: 0 } });
    expect(coop.object.definitionId).toBe('chicken_coop_lv1');
    expect(coop.animal.type).toBe('chicken_basic');

    const animalId = coop.animal.id;
    const fed = await apiJson(page, '/api/animals/feed', { method: 'POST', body: { animalId } });
    expect(fed.animal.id).toBe(animalId);
    await advanceServerClock(page, 600_001);
    const egg = await apiJson(page, '/api/animals/collect', { method: 'POST', body: { animalId } });
    expect(egg.collected).toMatchObject({ itemId: 'egg', quantity: 1 });

    state = await apiJson(page, '/api/game/bootstrap');
    const harvestQuest = state.quests.find((quest) => quest.questId === 'first_harvest');
    expect(harvestQuest.completed).toBe(true);
    const claim = await apiJson(page, `/api/quests/${harvestQuest.questId}/claim`, { method: 'POST', body: {} });
    expect(claim.quest.claimed).toBe(true);

    // Restart the API process while retaining the database pool and browser
    // session cookie. Reload must reconstruct the full aggregate from PG.
    const restarted = await page.request.post('/__e2e/restart');
    expect(restarted.ok()).toBeTruthy();
    await reloadFarm(page, name);
    const afterRestart = await apiJson(page, '/api/game/bootstrap');
    expect(afterRestart.character.displayName).toBe(name);
    expect(afterRestart.objects.some((object) => object.definitionId === 'pond_small_lv1')).toBe(true);
    expect(afterRestart.objects.some((object) => object.definitionId === 'chicken_coop_lv1')).toBe(true);
    expect(afterRestart.inventory.find((item) => item.itemId === 'egg')?.quantity).toBe(1);
    expect(afterRestart.animals.find((animal) => animal.id === animalId)?.productReadyAt).toBeNull();
    expect(afterRestart.stateRevision).toBeGreaterThan(beforeFailedRevision);

    await noBrowserErrors();
  });
});
