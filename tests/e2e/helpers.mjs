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
    await waitForFarmRenderer(page);
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
    await waitForFarmRenderer(page);
    await expect(page.locator('#farmer-name-label')).toHaveText(name);
    await expect.poll(() => bootstrap.length, { timeout: 10_000 }).toBe(1);
    await expect(page.locator('.tutorial, .tutorial-overlay, [data-tutorial]')).toHaveCount(0);
    await page.clock.runFor(100);
  } finally {
    page.off('request', listener);
  }
}

export async function waitForFarmRenderer(page) {
  await expect(page.locator('#game-renderer-host canvas[data-live-ready="true"]')).toBeVisible();
  await expect.poll(() => page.locator('#game-renderer-host').evaluate((host) =>
    typeof (host.__farmRenderer || host.querySelector('canvas')?.__farmRenderer)?.cellToScreen,
  )).toBe('function');
}

/** Project through the renderer actually receiving the user's pointer events. */
export async function gridPoint(page, gridX, gridY) {
  await waitForFarmRenderer(page);
  const point = await page.locator('#game-renderer-host').evaluate((host, cell) => {
    const canvas = host.querySelector('canvas');
    const renderer = host.__farmRenderer || canvas?.__farmRenderer;
    const position = renderer.cellToScreen(cell.x, cell.y);
    if (!position) return null;
    const bounds = canvas.getBoundingClientRect();
    return { x: position.clientX ?? bounds.x + position.x, y: position.clientY ?? bounds.y + position.y };
  }, { x: gridX, y: gridY });
  const viewport = page.viewportSize();
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 || (viewport && (point.x >= viewport.width || point.y >= viewport.height))) {
    throw new Error(`Grid cell ${gridX},${gridY} is outside the displayed renderer: ${JSON.stringify(point)}.`);
  }
  return point;
}

export async function clickGrid(page, gridX, gridY) {
  const point = await gridPoint(page, gridX, gridY);
  const unobstructed = await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('#game-renderer-host')), point);
  expect(unobstructed, `Grid cell ${gridX},${gridY} must receive a real canvas click`).toBe(true);
  await page.mouse.click(point.x, point.y);
}

export async function selectTool(page, tool) {
  const selector = `[data-tool="${tool}"]:visible`;
  const context = { plant: 'crops', harvest: 'crops', feed: 'animals', collect: 'animals', 'buy-feed': 'animals' }[tool];
  if (!await page.locator(selector).count() && context) {
    await page.locator(`[data-context="${context}"]`).click();
  }
  const button = page.locator(selector).first();
  await expect(button).toBeVisible();
  await button.click();
  if (tool !== 'buy-feed') await expect(page.locator(`[data-tool="${tool}"]`).first()).toHaveClass(/active/u);
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
