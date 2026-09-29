import { expect } from '@playwright/test';

let nameSequence = 0;

export function uniqueCharacterName(label = 'flow') {
  nameSequence += 1;
  // Keep the generated name within the canonical 2–24 Unicode character limit.
  return `E2E${label.slice(0, 4)}${Date.now().toString(36).slice(-8)}${nameSequence}`.slice(0, 24);
}

export function captureBrowserErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return async () => {
    expect(errors, 'browser console/page errors').toEqual([]);
  };
}

export async function installServerAlignedClock(page) {
  if (!page.clock?.install) {
    throw new Error('Playwright clock API is required; install @playwright/test 1.45 or newer.');
  }
  const now = await serverClock(page);
  await page.clock.install({ time: Date.parse(now) });
  return now;
}

export async function serverClock(page, advanceMs = 0) {
  const suffix = advanceMs ? `?advanceMs=${encodeURIComponent(advanceMs)}` : '';
  const response = await page.request.get(`/__e2e/clock${suffix}`);
  expect(response.ok(), 'E2E clock endpoint').toBeTruthy();
  const body = await response.json();
  expect(body.now).toEqual(expect.any(String));
  return body.now;
}

export async function advanceServerClock(page, milliseconds) {
  expect(milliseconds).toBeGreaterThanOrEqual(0);
  await serverClock(page, milliseconds);
  if (milliseconds > 0) await page.clock.fastForward(milliseconds);
}

export async function apiJson(page, path, { method = 'GET', body, key } = {}) {
  const result = await page.evaluate(async ({ path: requestPath, method: requestMethod, body: requestBody, key: requestKey }) => {
    const headers = { 'Content-Type': 'application/json' };
    if (requestMethod !== 'GET' && requestMethod !== 'HEAD') headers['Idempotency-Key'] = requestKey || crypto.randomUUID();
    const response = await fetch(requestPath, {
      method: requestMethod,
      credentials: 'include',
      headers,
      body: requestMethod === 'GET' || requestMethod === 'HEAD' ? undefined : JSON.stringify(requestBody ?? {}),
    });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
  }, { path, method, body, key });
  if (!result.ok) {
    throw new Error(`${method} ${path} returned ${result.status}: ${JSON.stringify(result.body)}`);
  }
  return result.body;
}

export async function enterFarm(page, name, { bootstrapRequests = 1 } = {}) {
  const bootstrap = [];
  const listener = (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/game/bootstrap') bootstrap.push(request);
  };
  page.on('request', listener);
  try {
    await page.goto('/');
    await expect(page.locator('#login-form')).toBeVisible();
    await page.locator('#farmer-name').fill(name);
    await page.getByRole('button', { name: /Vào nông trại/u }).click();
    await expect(page.locator('#farm-canvas')).toBeVisible();
    await expect(page.locator('#farmer-name-label')).toHaveText(name);
    await expect.poll(() => bootstrap.length, { timeout: 10_000 }).toBe(bootstrapRequests);
    await expect(page.locator('.tutorial, .tutorial-overlay, [data-tutorial]')).toHaveCount(0);
    // `page.clock.install()` freezes RAF as well as Date. Give Pixi and the
    // Canvas fallback one deterministic frame before the first grid tap.
    await page.clock.runFor(100);
  } finally {
    page.off('request', listener);
  }
}

export async function reloadFarm(page, name) {
  const bootstrap = [];
  const listener = (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/game/bootstrap') bootstrap.push(request);
  };
  page.on('request', listener);
  try {
    await page.reload();
    await expect(page.locator('#farm-canvas')).toBeVisible();
    await expect(page.locator('#farmer-name-label')).toHaveText(name);
    await expect.poll(() => bootstrap.length, { timeout: 10_000 }).toBe(1);
    await expect(page.locator('.tutorial, .tutorial-overlay, [data-tutorial]')).toHaveCount(0);
    await page.clock.runFor(100);
  } finally {
    page.off('request', listener);
  }
}

export async function clickGrid(page, gridX, gridY) {
  // Gameplay state is owned by the shell and the legacy Canvas fallback is a
  // supported renderer. Route synthetic grid taps to that stable input surface
  // so a headless WebGL implementation or a frozen RAF cannot make hit testing
  // flaky. Renderer-specific camera/pinch coverage remains in renderer tests.
  const host = page.locator('#game-renderer-host');
  if (await host.isVisible().catch(() => false)) {
    await host.evaluate((element) => { element.style.pointerEvents = 'none'; });
  }
  const target = page.locator('#farm-canvas');
  const box = await target.boundingBox();
  if (!box) throw new Error('Farm renderer canvas has no layout box.');

  const width = box.width;
  const height = box.height;
  // Canvas fallback uses its own 64x32 viewport fit.
  const zoom = Math.min(1.25, Math.max(0.45, Math.min((width - 36) / 1536, (height - 38) / 768) * 1.65));
  const originY = height * 0.5 - (768 * zoom) * 0.5;
  const x = width * 0.5 + (gridX - gridY) * 32 * zoom;
  const y = originY + (gridX + gridY + 1) * 16 * zoom;
  if (x < 2 || y < 2 || x > width - 2 || y > height - 2) throw new Error(`Grid cell ${gridX},${gridY} is outside viewport (${x},${y},${width},${height}).`);
  await page.mouse.click(box.x + x, box.y + y);
}

export async function selectTool(page, tool) {
  const button = page.locator(`[data-tool="${tool}"]`);
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveClass(/active/u);
}

export async function harvestStarterRice(page, count = 3) {
  await selectTool(page, 'harvest');
  for (const [gridX, gridY] of [[8, 10], [10, 10], [12, 10]].slice(0, count)) {
    const response = page.waitForResponse((item) => item.request().method() === 'POST' && new URL(item.url()).pathname === '/api/crops/harvest');
    await clickGrid(page, gridX, gridY);
    await response;
  }
}

export async function advanceCharacterToLevelTwo(page) {
  const before = await apiJson(page, '/api/game/bootstrap');
  const readyPlots = before.crops?.filter((crop) => new Date(crop.readyAt) <= new Date(before.serverNow)) ?? [];
  for (const crop of readyPlots.slice(0, 3)) {
    await apiJson(page, '/api/crops/harvest', { method: 'POST', body: { plotId: crop.plotId } });
  }
  const afterHarvest = await apiJson(page, '/api/game/bootstrap');
  const order = afterHarvest.orders?.find((item) => item.status === 'OPEN');
  if (!order) throw new Error('Expected an open starter order.');
  await apiJson(page, `/api/orders/${encodeURIComponent(order.id)}/complete`, { method: 'POST', body: {} });
  const afterOrder = await apiJson(page, '/api/game/bootstrap');
  expect(afterOrder.character.level).toBeGreaterThanOrEqual(2);
  return afterOrder;
}

export async function placeBuilding(page, definitionId, gridX, gridY) {
  return apiJson(page, '/api/buildings/place', {
    method: 'POST',
    body: { definitionId, gridX, gridY, rotation: 0 },
  });
}
