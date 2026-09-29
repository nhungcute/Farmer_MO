import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Pool } from "pg";
import { applyMigrations } from "../../src/migrate.mjs";
import { PostgresFarmRepository } from "../../src/repositories/postgresFarmRepository.mjs";
import { createApiServer } from "../../src/server.mjs";

/*
 * These tests intentionally require an explicit PostgreSQL URL.  A normal
 * `npm run check` must remain a memory/file-only check, while the A02 gate
 * runs this file against an isolated disposable database, for example:
 *
 *   $env:POSTGRES_TEST_URL="postgresql://mo_farm:change_me@localhost:5432/mo_farm"
 *   $env:RUN_POSTGRES_INTEGRATION="1"
 *   node --test apps/api/test/postgres/postgres-integration.test.mjs
 *
 * The guard against accidental TRUNCATE is deliberate: this suite owns the
 * test database and never modifies a database unless both variables are set.
 */
const databaseUrl = process.env.POSTGRES_TEST_URL || (process.env.RUN_POSTGRES_INTEGRATION === "1" ? process.env.DATABASE_URL : "");
const enabled = Boolean(databaseUrl);
// The scenarios intentionally share one disposable character so each route
// can feed the next persistence assertion. Keep them deterministic even when
// Node's test runner is configured for parallel files.
const integration = (name, fn) => test(name, { skip: !enabled, concurrency: false }, fn);

let pool;
let repository;
let api;
let server;
let base;
let cookie;
let now;
let characterId;

const key = () => `pg-${crypto.randomUUID()}`;

async function call(path, { method = "GET", body, headers = {}, sessionCookie = cookie } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(sessionCookie ? { cookie: sessionCookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data };
}

async function startApi() {
  // The runtime accepts an injected repository in tests.  Supplying the
  // driver/database options as well keeps this assertion useful when the
  // production bootstrap constructs its own repository.
  repository = new PostgresFarmRepository({ pool, clock: () => now });
  api = createApiServer({
    repository,
    persistenceDriver: "postgres",
    databaseUrl,
    clock: () => now,
    sessionTtlMs: 7 * 24 * 60 * 60 * 1000,
  });
  ({ server } = api);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}

async function stopApi() {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  server = undefined;
  api = undefined;
}

before(async () => {
  if (!enabled) return;
  now = new Date("2026-09-30T08:00:00.000Z");
  await applyMigrations({ databaseUrl, driver: "postgres" });
  pool = new Pool({ connectionString: databaseUrl, max: 4 });
  // This suite is opt-in and is expected to point to a disposable database.
  await pool.query("TRUNCATE TABLE game_session, idempotency_record, quest_progress, order_line, farm_order, animal, crop_instance, plot, farm_object, inventory_item, warehouse, farm, character RESTART IDENTITY CASCADE");
  await startApi();
});

after(async () => {
  if (!enabled || !pool) return;
  await stopApi();
  await pool.end();
});

integration("PostgreSQL readiness is truthful and process liveness remains public", async () => {
  const live = await call("/api/health/live");
  assert.equal(live.response.status, 200);
  const ready = await call("/api/health/ready");
  assert.equal(ready.response.status, 200);
  assert.equal(ready.data.checks.persistence, "postgres");
  assert.equal(ready.data.checks.persistenceDriver, "postgres");
  assert.equal(ready.data.checks.persistenceReady, true);
});

integration("readiness reports unavailable PostgreSQL instead of a false ready", async () => {
  const broken = createApiServer({
    persistenceDriver: "postgres",
    repository: { health: async () => { const error = new Error("connection refused"); error.code = "ECONNREFUSED"; throw error; } },
  });
  await new Promise((resolve) => broken.server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${broken.server.address().port}/api/health/ready`);
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.status, "error");
    assert.equal(data.checks.persistence, "postgres");
    assert.equal(data.checks.persistenceDriver, "postgres");
    assert.equal(data.checks.persistenceReady, false);
  } finally {
    await new Promise((resolve, reject) => broken.server.close((error) => (error ? reject(error) : resolve())));
  }
});

integration("enter creates a PostgreSQL character and re-enter creates a durable session", async () => {
  const first = await call("/api/character/enter", { method: "POST", body: { name: "PG Integration" }, sessionCookie: undefined });
  assert.equal(first.response.status, 200);
  assert.equal(first.data.status, "created");
  characterId = first.data.character.id;
  const firstCookie = first.response.headers.get("set-cookie");
  assert.match(firstCookie, /mo_farm_session=/u);
  cookie = firstCookie.split(";")[0];

  const second = await call("/api/character/enter", { method: "POST", body: { name: "  pg   integration " }, sessionCookie: undefined });
  assert.equal(second.response.status, 200);
  assert.equal(second.data.status, "existing");
  assert.equal(second.data.character.id, characterId);
  const sessionCount = await pool.query("SELECT count(*)::int AS count FROM game_session WHERE character_id = $1", [characterId]);
  assert.equal(sessionCount.rows[0].count, 2);
});

integration("bootstrap loads starter state from PostgreSQL and keeps the session after API restart", async () => {
  const beforeRestart = await call("/api/game/bootstrap");
  assert.equal(beforeRestart.response.status, 200);
  assert.equal(beforeRestart.data.character.id, characterId);
  assert.equal(beforeRestart.data.plots.length, 6);
  assert.equal(beforeRestart.data.crops.length, 3);
  assert.deepEqual(beforeRestart.data.inventory, [{ itemId: "chicken_feed", quantity: 1 }]);

  await stopApi();
  await startApi();
  const afterRestart = await call("/api/game/bootstrap");
  assert.equal(afterRestart.response.status, 200);
  assert.equal(afterRestart.data.character.id, characterId);
  assert.equal(afterRestart.data.stateRevision, beforeRestart.data.stateRevision);
});

integration("plant and harvest persist transactionally with idempotency", async () => {
  const initial = await call("/api/game/bootstrap");
  const emptyPlot = initial.data.plots.find((plot) => !initial.data.crops.some((crop) => crop.plotId === plot.id));
  assert.ok(emptyPlot);
  const occupiedPlot = initial.data.plots.find((plot) => initial.data.crops.some((crop) => crop.plotId === plot.id));
  const failedKey = key();
  const failed = await call("/api/crops/plant", { method: "POST", body: { plotId: occupiedPlot.id, cropId: "rice" }, headers: { "Idempotency-Key": failedKey } });
  assert.equal(failed.response.status, 409);
  assert.equal(failed.data.error.code, "PLOT_NOT_EMPTY");
  const afterFailed = await call("/api/game/bootstrap");
  assert.equal(afterFailed.data.stateRevision, initial.data.stateRevision);
  const failedRecord = await pool.query("SELECT count(*)::int AS count FROM idempotency_record WHERE character_id = $1 AND key = $2", [characterId, failedKey]);
  assert.equal(failedRecord.rows[0].count, 0);
  const plantKey = key();
  const planted = await call("/api/crops/plant", { method: "POST", body: { plotId: emptyPlot.id, cropId: "rice" }, headers: { "Idempotency-Key": plantKey } });
  assert.equal(planted.response.status, 200);
  const retry = await call("/api/crops/plant", { method: "POST", body: { plotId: emptyPlot.id, cropId: "rice" }, headers: { "Idempotency-Key": plantKey } });
  assert.equal(retry.response.status, 200);
  assert.equal(retry.data.stateRevision, planted.data.stateRevision);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM crop_instance WHERE plot_id = $1", [emptyPlot.id])).rows[0].count, 1);

  // The three starter crops are ready at the fixed clock and are sufficient
  // to exercise harvest, quest progress and the order/market flows below.
  const readyPlot = initial.data.plots.find((plot) => initial.data.crops.some((crop) => crop.plotId === plot.id));
  const harvested = await call("/api/crops/harvest", { method: "POST", body: { plotId: readyPlot.id }, headers: { "Idempotency-Key": key() } });
  assert.equal(harvested.response.status, 200);
  assert.equal(harvested.data.harvested.quantity, 3);
  const duplicate = await call("/api/crops/harvest", { method: "POST", body: { plotId: readyPlot.id }, headers: { "Idempotency-Key": key() } });
  assert.equal(duplicate.response.status, 404);

  // Keep one additional ready harvest for the order after the market sell
  // flow. The starter state contains three ready plots by contract.
  const secondState = (await call("/api/game/bootstrap")).data;
  const secondReady = secondState.plots.find((plot) => secondState.crops.some((crop) => crop.plotId === plot.id));
  assert.ok(secondReady);
  const secondHarvest = await call("/api/crops/harvest", { method: "POST", body: { plotId: secondReady.id }, headers: { "Idempotency-Key": key() } });
  assert.equal(secondHarvest.response.status, 200);
});

integration("market buy/sell, pond and chicken coop use PostgreSQL mutations", async () => {
  // Raise only the persisted test character to the content-defined unlock
  // level; no production content or gameplay rule is changed by this setup.
  await pool.query("UPDATE character SET level = 2, xp = 100 WHERE id = $1", [characterId]);
  const buy = await call("/api/market/buy", { method: "POST", body: { itemId: "chicken_feed", quantity: 2 }, headers: { "Idempotency-Key": key() } });
  assert.equal(buy.response.status, 200);
  assert.equal(buy.data.purchased.cost, 10);

  const pond = await call("/api/buildings/place", { method: "POST", body: { definitionId: "pond_small_lv1", gridX: 17, gridY: 4, rotation: 0 }, headers: { "Idempotency-Key": key() } });
  assert.equal(pond.response.status, 200);
  assert.equal(pond.data.object.definitionId, "pond_small_lv1");

  const coop = await call("/api/buildings/place", { method: "POST", body: { definitionId: "chicken_coop_lv1", gridX: 17, gridY: 10, rotation: 0 }, headers: { "Idempotency-Key": key() } });
  assert.equal(coop.response.status, 200);
  assert.equal(coop.data.animal.type, "chicken_basic");

  const sold = await call("/api/market/sell", { method: "POST", body: { itemId: "rice", quantity: 3 }, headers: { "Idempotency-Key": key() } });
  assert.equal(sold.response.status, 200);
  assert.equal(sold.data.earned.coins, 24);
  return coop.data.animal.id;
});

let animalId;
integration("feed chicken, collect egg and preserve product state after reload", async () => {
  const state = await call("/api/game/bootstrap");
  animalId = state.data.animals[0]?.id;
  assert.ok(animalId);
  const feed = await call("/api/animals/feed", { method: "POST", body: { animalId }, headers: { "Idempotency-Key": key() } });
  assert.equal(feed.response.status, 200);
  const tooSoon = await call("/api/animals/collect", { method: "POST", body: { animalId }, headers: { "Idempotency-Key": key() } });
  assert.equal(tooSoon.response.status, 409);
  assert.equal(tooSoon.data.error.code, "ANIMAL_NOT_READY");
  now = new Date(now.getTime() + 600_000);
  const egg = await call("/api/animals/collect", { method: "POST", body: { animalId }, headers: { "Idempotency-Key": key() } });
  assert.equal(egg.response.status, 200);
  assert.equal(egg.data.collected.itemId, "egg");
  await stopApi();
  await startApi();
  const reloaded = await call("/api/game/bootstrap");
  assert.equal(reloaded.response.status, 200);
  assert.equal(reloaded.data.animals[0].productReadyAt, null);
  assert.equal(reloaded.data.inventory.find((item) => item.itemId === "egg")?.quantity, 1);
});

integration("complete order and claim quest persist rewards and idempotency records", async () => {
  const state = await call("/api/game/bootstrap");
  const order = state.data.orders.find((item) => item.status === "OPEN" && item.lines.every((line) => line.itemId === "rice" && line.quantity <= (state.data.inventory.find((entry) => entry.itemId === "rice")?.quantity ?? 0)));
  assert.ok(order, "an order must be completable from the persisted starter harvest");
  const completed = await call(`/api/orders/${order.id}/complete`, { method: "POST", body: {}, headers: { "Idempotency-Key": key() } });
  assert.equal(completed.response.status, 200);
  assert.equal(completed.data.order.status, "COMPLETED");

  const quest = (await call("/api/game/bootstrap")).data.quests.find((item) => item.questId === "first_harvest");
  assert.equal(quest.completed, true);
  const claimed = await call("/api/quests/first_harvest/claim", { method: "POST", body: {}, headers: { "Idempotency-Key": key() } });
  assert.equal(claimed.response.status, 200);
  assert.equal(claimed.data.quest.claimed, true);
  const records = await pool.query("SELECT count(*)::int AS count FROM idempotency_record WHERE character_id = $1", [characterId]);
  assert.ok(records.rows[0].count >= 8);
});

integration("A03 concurrent enter creates one character and durable sessions", async () => {
  const name = `A03Race${crypto.randomUUID().slice(0, 8)}`;
  const entries = await Promise.all(Array.from({ length: 12 }, () => repository.enter(name)));
  assert.equal(entries.filter((entry) => entry.status === "created").length, 1);
  assert.equal(entries.filter((entry) => entry.status === "existing").length, 11);
  const ids = new Set(entries.map((entry) => entry.character.id));
  assert.equal(ids.size, 1);
  const rows = await pool.query("SELECT count(*)::int AS characters, (SELECT count(*)::int FROM game_session WHERE character_id = $1) AS sessions FROM character WHERE id = $1", [entries[0].character.id]);
  assert.equal(rows.rows[0].characters, 1);
  assert.equal(rows.rows[0].sessions, 12);
});

integration("A03 concurrent PostgreSQL mutations serialize state revision without lost updates", async () => {
  const before = await repository.loadByCharacterId(characterId);
  const mutationCount = 12;
  const results = await Promise.all(Array.from({ length: mutationCount }, (_, index) => {
    const body = { itemId: "chicken_feed", quantity: 1 };
    return repository.mutate({
      characterId,
      actionType: "a03.market.buy",
      method: "buy",
      payload: body,
      key: `a03-buy-${index}-${crypto.randomUUID()}`,
      args: [body],
    });
  }));
  const after = await repository.loadByCharacterId(characterId);
  const beforeFeed = before.inventory.chicken_feed ?? 0;
  const afterFeed = after.inventory.chicken_feed ?? 0;
  assert.equal(afterFeed - beforeFeed, mutationCount);
  assert.equal(after.coins, before.coins - mutationCount * 5);
  assert.equal(after.stateRevision, before.stateRevision + mutationCount);
  assert.equal(new Set(results.map((result) => result.stateRevision)).size, mutationCount);
});

integration("A03 concurrent duplicate idempotency requests execute once and replay the same response", async () => {
  const before = await repository.loadByCharacterId(characterId);
  const body = { itemId: "chicken_feed", quantity: 1 };
  const keyValue = `a03-idempotent-${crypto.randomUUID()}`;
  const results = await Promise.all(Array.from({ length: 12 }, () => repository.mutate({
    characterId,
    actionType: "a03.market.buy.idempotent",
    method: "buy",
    payload: body,
    key: keyValue,
    args: [body],
  })));
  const after = await repository.loadByCharacterId(characterId);
  for (const result of results) assert.deepEqual(result, results[0]);
  assert.equal(after.inventory.chicken_feed, (before.inventory.chicken_feed ?? 0) + 1);
  assert.equal(after.coins, before.coins - 5);
  assert.equal(after.stateRevision, before.stateRevision + 1);
  const records = await pool.query("SELECT count(*)::int AS count FROM idempotency_record WHERE character_id = $1 AND action_type = $2 AND key = $3", [characterId, "a03.market.buy.idempotent", keyValue]);
  assert.equal(records.rows[0].count, 1);
});

integration("A03 reusing an idempotency key with a different payload is rejected without a second mutation", async () => {
  const before = await repository.loadByCharacterId(characterId);
  const keyValue = `a03-reuse-${crypto.randomUUID()}`;
  const outcomes = await Promise.allSettled([
    repository.mutate({ characterId, actionType: "a03.market.buy.reuse", method: "buy", payload: { itemId: "chicken_feed", quantity: 1 }, key: keyValue, args: [{ itemId: "chicken_feed", quantity: 1 }] }),
    repository.mutate({ characterId, actionType: "a03.market.buy.reuse", method: "buy", payload: { itemId: "chicken_feed", quantity: 2 }, key: keyValue, args: [{ itemId: "chicken_feed", quantity: 2 }] }),
  ]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejected = outcomes.find((outcome) => outcome.status === "rejected");
  assert.equal(rejected?.reason?.code, "IDEMPOTENCY_KEY_REUSED");
  const fulfilled = outcomes.find((outcome) => outcome.status === "fulfilled");
  const quantity = fulfilled?.value?.purchased?.quantity;
  assert.ok(quantity === 1 || quantity === 2);
  const after = await repository.loadByCharacterId(characterId);
  assert.equal(after.stateRevision, before.stateRevision + 1);
  assert.equal(after.coins, before.coins - 5 * quantity);
});

integration("A03 failed mutation rolls back state, revision and idempotency record", async () => {
  const before = await repository.loadByCharacterId(characterId);
  const actionType = "a03.rollback";
  const keyValue = `a03-rollback-${crypto.randomUUID()}`;
  await assert.rejects(() => repository.runMutation({
    characterId,
    actionType,
    key: keyValue,
    payload: { force: "rollback" },
    operation: async (client) => {
      await client.query("UPDATE character SET coins = coins + 999 WHERE id = $1", [characterId]);
      const error = new Error("forced business failure");
      error.code = "NOT_ENOUGH_COINS";
      throw error;
    },
  }), (error) => error.code === "NOT_ENOUGH_COINS");
  const after = await repository.loadByCharacterId(characterId);
  assert.equal(after.coins, before.coins);
  assert.equal(after.stateRevision, before.stateRevision);
  const records = await pool.query("SELECT count(*)::int AS count FROM idempotency_record WHERE character_id = $1 AND action_type = $2 AND key = $3", [characterId, actionType, keyValue]);
  assert.equal(records.rows[0].count, 0);
});

integration("session revoke is durable in PostgreSQL", async () => {
  const revoked = await call("/api/session/revoke", { method: "POST" });
  assert.equal(revoked.response.status, 200);
  assert.equal(revoked.data.revoked, true);
  const persisted = await pool.query("SELECT revoked_at IS NOT NULL AS revoked FROM game_session WHERE token_hash = encode(digest($1, 'sha256'), 'hex')", [decodeURIComponent(cookie.split("=")[1])]);
  assert.equal(persisted.rows.some((row) => row.revoked), true);
  const denied = await call("/api/game/bootstrap");
  assert.equal(denied.response.status, 401);
  assert.equal(denied.data.error.code, "UNAUTHORIZED");
});
