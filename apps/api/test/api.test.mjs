import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApiServer } from "../src/server.mjs";
import { FarmStore } from "../src/store.mjs";

let server; let store; let base; let cookie; let characterId; let now;
const key = () => crypto.randomUUID();
import crypto from "node:crypto";

async function call(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  return { response, data };
}

before(async () => {
  now = new Date("2026-09-29T08:00:00.000Z");
  ({ server, store } = createApiServer({ clock: () => now }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test("health endpoints are public", async () => {
  const { response, data } = await call("/api/health/live");
  assert.equal(response.status, 200); assert.equal(data.status, "ok"); assert.equal(data.error, undefined);
});

test("direct entry creates a farm, sets cookie, and never returns session token", async () => {
  const { response, data } = await call("/api/character/enter", { method: "POST", body: { name: "  Mỡ   Ú  " } });
  assert.equal(response.status, 200); assert.equal(data.status, "created"); assert.equal(data.character.coins, 1000); assert.equal("token" in data, false);
  const setCookie = response.headers.get("set-cookie"); assert.match(setCookie, /mo_farm_session=/u); assert.match(setCookie, /HttpOnly/u);
  cookie = setCookie.split(";")[0]; characterId = data.character.id;
});

test("bootstrap is direct-entry state with starter feed and no tutorial", async () => {
  const { response, data } = await call("/api/game/bootstrap");
  assert.equal(response.status, 200); assert.equal(data.contentVersion, "mvp-1"); assert.equal("tutorial" in data, false); assert.equal("tutorialEnabled" in data.settings, false); assert.equal(data.plots.length, 6); assert.equal(data.crops.length, 3);
  assert.deepEqual(data.inventory, [{ itemId: "chicken_feed", quantity: 1 }]); assert.equal(data.warehouse.capacity, 100); assert.equal(data.orders.length, 3);
});

test("harvest is idempotent and duplicate retry cannot duplicate inventory", async () => {
  const bootstrap = await call("/api/game/bootstrap"); const plotId = bootstrap.data.plots[0].id; const idempotency = key();
  const first = await call("/api/crops/harvest", { method: "POST", body: { plotId }, headers: { "Idempotency-Key": idempotency } });
  const retry = await call("/api/crops/harvest", { method: "POST", body: { plotId }, headers: { "Idempotency-Key": idempotency } });
  assert.equal(first.response.status, 200); assert.deepEqual({ ...retry.data, requestId: undefined }, { ...first.data, requestId: undefined }); assert.equal(first.data.harvested.quantity, 3);
  const after = await call("/api/game/bootstrap"); assert.equal(after.data.inventory.find((item) => item.itemId === "rice").quantity, 3); assert.equal(after.data.crops.length, 2);
});

test("plant uses server time and rejects client supplied timing", async () => {
  const bootstrap = await call("/api/game/bootstrap"); const emptyPlot = bootstrap.data.plots.find((plot) => !bootstrap.data.crops.some((crop) => crop.plotId === plot.id));
  const result = await call("/api/crops/plant", { method: "POST", body: { plotId: emptyPlot.id, cropId: "rice", readyAt: "1970-01-01T00:00:00.000Z" }, headers: { "Idempotency-Key": key() } });
  assert.equal(result.response.status, 200); assert.equal(result.data.crop.readyAt, "2026-09-29T08:02:00.000Z");
  const early = await call("/api/crops/harvest", { method: "POST", body: { plotId: emptyPlot.id }, headers: { "Idempotency-Key": key() } }); assert.equal(early.data.error.code, "CROP_NOT_READY");
});

test("market validates server price and supports chicken feed source", async () => {
  const buy = await call("/api/market/buy", { method: "POST", body: { itemId: "chicken_feed", quantity: 2, price: 0 }, headers: { "Idempotency-Key": key() } });
  assert.equal(buy.response.status, 200); assert.equal(buy.data.purchased.cost, 10);
  const forbidden = await call("/api/market/sell", { method: "POST", body: { itemId: "chicken_feed", quantity: 1 }, headers: { "Idempotency-Key": key() } }); assert.equal(forbidden.data.error.code, "INVALID_INPUT");
});

test("building, feed and collect use unlock, capacity and server timer", async () => {
  const character = store.characters.get(characterId); character.level = 2;
  const coop = await call("/api/buildings/place", { method: "POST", body: { definitionId: "chicken_coop_lv1", gridX: 17, gridY: 10, rotation: 0 }, headers: { "Idempotency-Key": key() } });
  assert.equal(coop.response.status, 200); assert.equal(coop.data.animal.type, "chicken_basic");
  const animalId = coop.data.animal.id;
  const feed = await call("/api/animals/feed", { method: "POST", body: { animalId }, headers: { "Idempotency-Key": key() } }); assert.equal(feed.response.status, 200);
  const tooSoon = await call("/api/animals/collect", { method: "POST", body: { animalId }, headers: { "Idempotency-Key": key() } }); assert.equal(tooSoon.data.error.code, "ANIMAL_NOT_READY");
  now = new Date(now.getTime() + 600_000);
  const collect = await call("/api/animals/collect", { method: "POST", body: { animalId }, headers: { "Idempotency-Key": key() } }); assert.equal(collect.response.status, 200); assert.equal(collect.data.collected.quantity, 1);
});

test("invalid session and missing idempotency key return canonical error envelope", async () => {
  const old = cookie; cookie = "mo_farm_session=invalid";
  const unauthorized = await call("/api/game/bootstrap"); assert.equal(unauthorized.response.status, 401); assert.equal(unauthorized.data.error.code, "UNAUTHORIZED"); assert.ok(unauthorized.data.requestId);
  cookie = "mo_farm_session=%";
  const malformedCookie = await call("/api/game/bootstrap"); assert.equal(malformedCookie.response.status, 401); assert.equal(malformedCookie.data.error.code, "UNAUTHORIZED");
  cookie = old;
  const missing = await call("/api/market/buy", { method: "POST", body: { itemId: "chicken_feed", quantity: 1 } }); assert.equal(missing.response.status, 400); assert.equal(missing.data.error.code, "INVALID_INPUT");
});

test("optional file adapter restores characters and hashed sessions", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mo-farm-state-"));
  try {
    const statePath = path.join(directory, "farm-state.json");
    const first = new FarmStore({ persistencePath: statePath, clock: () => now });
    const entered = first.enter("Persistence Demo");
    const second = new FarmStore({ persistencePath: statePath, clock: () => now });
    const restored = second.getCharacterBySession(entered.token);
    assert.equal(restored.displayName, "Persistence Demo");
    assert.equal("tutorialEnabled" in second.bootstrap(restored).settings, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
