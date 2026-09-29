#!/usr/bin/env node

/**
 * Bounded PostgreSQL runtime load probe for D02.
 *
 * The probe is deliberately opt-in and uses uniquely named demo characters.
 * It does not truncate a database unless ALLOW_DESTRUCTIVE_LOAD_TEST=1 is
 * explicitly supplied. This keeps an accidental run from deleting farm data.
 */
import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;

const env = process.env;
const databaseUrl = env.LOAD_TEST_DATABASE_URL ?? env.DATABASE_URL;
const apiUrl = (env.LOAD_TEST_API_URL ?? "http://127.0.0.1:3001").replace(/\/$/u, "");
const integer = (name, fallback, { min = 1, max = 1000 } = {}) => {
  const parsed = Number(env[name] ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be an integer between ${min} and ${max}`);
  return parsed;
};
const concurrentEnters = integer("LOAD_TEST_CONCURRENT_ENTERS", 12, { max: 100 });
const mutationCount = integer("LOAD_TEST_MUTATIONS", 24, { max: 500 });
const duplicateCount = integer("LOAD_TEST_DUPLICATE_REQUESTS", 12, { max: 100 });
const mutationConcurrency = integer("LOAD_TEST_MUTATION_CONCURRENCY", 12, { max: 100 });
const timeoutMs = integer("LOAD_TEST_TIMEOUT_MS", 15_000, { min: 100, max: 120_000 });
const allowDestructive = env.ALLOW_DESTRUCTIVE_LOAD_TEST === "1";

if (!databaseUrl) throw new Error("LOAD_TEST_DATABASE_URL or DATABASE_URL is required");

const nowIso = () => new Date().toISOString();
const key = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return Number(sorted[index].toFixed(3));
}

function measureBucket() {
  return { total: 0, successes: 0, errors: 0, statuses: {}, durationsMs: [] };
}

function record(bucket, status, durationMs) {
  bucket.total += 1;
  if (status >= 200 && status < 400) bucket.successes += 1;
  else bucket.errors += 1;
  bucket.statuses[String(status)] = (bucket.statuses[String(status)] ?? 0) + 1;
  bucket.durationsMs.push(durationMs);
}

function summarize(bucket) {
  return {
    requests: bucket.total,
    successes: bucket.successes,
    errors: bucket.errors,
    statuses: bucket.statuses,
    latencyMs: {
      min: bucket.durationsMs.length ? Number(Math.min(...bucket.durationsMs).toFixed(3)) : 0,
      max: bucket.durationsMs.length ? Number(Math.max(...bucket.durationsMs).toFixed(3)) : 0,
      p50: percentile(bucket.durationsMs, 0.5),
      p95: percentile(bucket.durationsMs, 0.95),
      p99: percentile(bucket.durationsMs, 0.99),
      average: bucket.durationsMs.length ? Number((bucket.durationsMs.reduce((sum, value) => sum + value, 0) / bucket.durationsMs.length).toFixed(3)) : 0,
    },
  };
}

function cookieFrom(response) {
  const raw = response.headers.get("set-cookie") ?? "";
  return raw.split(";", 1)[0] || undefined;
}

async function request(path, { method = "GET", body, cookie, headers = {} } = {}, metrics) {
  const started = performance.now();
  const requestHeaders = { accept: "application/json", ...headers };
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  if (cookie) requestHeaders.cookie = cookie;
  let response;
  let data;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text();
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  } catch (error) {
    const duration = performance.now() - started;
    metrics.total += 1;
    metrics.errors += 1;
    metrics.durationsMs.push(duration);
    throw new Error(`request ${method} ${path} failed after ${duration.toFixed(1)}ms: ${error.message}`, { cause: error });
  }
  const duration = performance.now() - started;
  record(metrics, response.status, duration);
  return { response, data, cookie: cookieFrom(response), durationMs: duration };
}

async function query(pool, text, values = []) {
  const result = await pool.query(text, values);
  return result.rows;
}

async function snapshot(pool, characterId) {
  const tables = ["character", "farm", "farm_object", "plot", "crop_instance", "animal", "inventory_item", "warehouse", "farm_order", "order_line", "quest_progress", "game_session", "idempotency_record"];
  const filters = {
    character: "id = $1",
    farm: "character_id = $1",
    farm_object: "character_id = $1",
    plot: "character_id = $1",
    crop_instance: "plot_id IN (SELECT id FROM plot WHERE character_id = $1)",
    animal: "character_id = $1",
    inventory_item: "character_id = $1",
    warehouse: "character_id = $1",
    farm_order: "character_id = $1",
    order_line: "order_id IN (SELECT id FROM farm_order WHERE character_id = $1)",
    quest_progress: "character_id = $1",
    game_session: "character_id = $1",
    idempotency_record: "character_id = $1",
  };
  const counts = {};
  for (const table of tables) {
    const rows = await query(pool, `SELECT count(*)::int AS count FROM ${table} WHERE ${filters[table]}`, [characterId]);
    counts[table] = rows[0].count;
  }
  const character = await query(pool, "SELECT id, coins, state_revision FROM character WHERE id = $1", [characterId]);
  const idem = await query(pool, "SELECT action_type, key, request_hash FROM idempotency_record WHERE character_id = $1 ORDER BY action_type, key", [characterId]);
  return { character: character[0] ?? null, counts, idempotency: idem };
}

async function truncateIfRequested(pool) {
  if (!allowDestructive) return false;
  await pool.query("TRUNCATE TABLE game_session, idempotency_record, quest_progress, order_line, farm_order, animal, crop_instance, plot, farm_object, inventory_item, warehouse, farm, character RESTART IDENTITY CASCADE");
  return true;
}

async function main() {
  const pool = new Pool({ connectionString: databaseUrl, max: Math.max(8, mutationConcurrency + 4) });
  const startedAt = nowIso();
  const metricBuckets = { enter: measureBucket(), bootstrap: measureBucket(), mutation: measureBucket(), duplicate: measureBucket(), expectedError: measureBucket(), readiness: measureBucket() };
  try {
    await pool.query("SELECT 1");
    const truncated = await truncateIfRequested(pool);
    const health = await request("/api/health/ready", {}, metricBuckets.readiness);
    if (health.response.status !== 200 || health.data?.checks?.persistenceReady !== true) throw new Error(`PostgreSQL readiness failed: HTTP ${health.response.status} ${JSON.stringify(health.data)}`);

    // A shared normalized name proves the uniqueness race: one creation and
    // N-1 existing sessions must point at one character.
    const displayName = `D02 Load ${crypto.randomUUID().slice(0, 8)}`;
    const entered = await Promise.all(Array.from({ length: concurrentEnters }, () => request("/api/character/enter", { method: "POST", body: { name: displayName } }, metricBuckets.enter)));
    const created = entered.filter((item) => item.data?.status === "created");
    const existing = entered.filter((item) => item.data?.status === "existing");
    const ids = new Set(entered.map((item) => item.data?.character?.id));
    if (entered.some((item) => item.response.status !== 200) || created.length !== 1 || existing.length !== concurrentEnters - 1 || ids.size !== 1) {
      throw new Error(`Concurrent enter invariant failed: ${JSON.stringify({ created: created.length, existing: existing.length, ids: [...ids] })}`);
    }
    const characterId = entered[0].data.character.id;
    const cookie = entered[0].cookie;
    if (!cookie) throw new Error("Enter did not return a session cookie");

    const bootstrap = await request("/api/game/bootstrap", { cookie }, metricBuckets.bootstrap);
    if (bootstrap.response.status !== 200 || bootstrap.data?.character?.id !== characterId) throw new Error(`Bootstrap failed: HTTP ${bootstrap.response.status}`);
    const before = await snapshot(pool, characterId);
    const baseRevision = Number(before.character?.state_revision);
    const baseCoins = Number(before.character?.coins);
    if (!Number.isSafeInteger(baseCoins) || baseCoins < (mutationCount + 1) * 5) {
      throw new Error(`LOAD_TEST_MUTATIONS=${mutationCount} requires at least ${(mutationCount + 1) * 5} coins; character has ${baseCoins}`);
    }

    // Unique buys exercise row-lock serialization and revision increments.
    const uniqueResults = [];
    for (let offset = 0; offset < mutationCount; offset += mutationConcurrency) {
      const batch = await Promise.all(Array.from({ length: Math.min(mutationConcurrency, mutationCount - offset) }, (_, index) => {
        const idempotency = key(`d02-buy-${offset + index}`);
        return request("/api/market/buy", { method: "POST", body: { itemId: "chicken_feed", quantity: 1 }, cookie, headers: { "Idempotency-Key": idempotency } }, metricBuckets.mutation).then((result) => ({ ...result, idempotency }));
      }));
      uniqueResults.push(...batch);
    }
    if (uniqueResults.some((item) => item.response.status !== 200)) throw new Error(`Unique mutation failed: ${JSON.stringify(uniqueResults.filter((item) => item.response.status !== 200).map((item) => item.data))}`);

    // The same key is deliberately sent at once. Exactly one purchase is
    // allowed; all callers must replay its committed response.
    const duplicateKey = key("d02-duplicate");
    const duplicates = await Promise.all(Array.from({ length: duplicateCount }, () => request("/api/market/buy", { method: "POST", body: { itemId: "chicken_feed", quantity: 1 }, cookie, headers: { "Idempotency-Key": duplicateKey } }, metricBuckets.duplicate)));
    if (duplicates.some((item) => item.response.status !== 200) || duplicates.some((item) => item.data?.stateRevision !== duplicates[0].data?.stateRevision)) throw new Error("Duplicate idempotency requests did not replay one committed response");

    // A deterministic business error must leave state and idempotency untouched.
    const beforeFailure = await snapshot(pool, characterId);
    const failureKey = key("d02-failure");
    const failed = await request("/api/market/sell", { method: "POST", body: { itemId: "rice", quantity: 99 }, cookie, headers: { "Idempotency-Key": failureKey } }, metricBuckets.expectedError);
    if (failed.response.status !== 409 || failed.data?.error?.code !== "NOT_ENOUGH_ITEM") throw new Error(`Expected NOT_ENOUGH_ITEM, got HTTP ${failed.response.status} ${JSON.stringify(failed.data)}`);
    const afterFailure = await snapshot(pool, characterId);
    if (Number(afterFailure.character?.state_revision) !== Number(beforeFailure.character?.state_revision) || Number(afterFailure.character?.coins) !== Number(beforeFailure.character?.coins) || afterFailure.idempotency.some((item) => item.key === failureKey)) throw new Error("Failed mutation changed state or persisted idempotency record");

    const after = await snapshot(pool, characterId);
    const expectedRevision = baseRevision + mutationCount + 1;
    if (Number(after.character?.state_revision) !== expectedRevision) throw new Error(`Revision invariant failed: expected ${expectedRevision}, got ${after.character?.state_revision}`);
    if (Number(after.character?.coins) !== baseCoins - (mutationCount + 1) * 5) throw new Error(`Coin invariant failed: expected ${baseCoins - (mutationCount + 1) * 5}, got ${after.character?.coins}`);
    const duplicateRecords = after.idempotency.filter((item) => item.key === duplicateKey);
    if (duplicateRecords.length !== 1) throw new Error(`Expected one duplicate idempotency row, got ${duplicateRecords.length}`);
    const sessionRows = await query(pool, "SELECT count(*)::int AS count FROM game_session WHERE character_id = $1", [characterId]);
    if (Number(sessionRows[0].count) !== concurrentEnters) throw new Error(`Expected ${concurrentEnters} durable sessions, got ${sessionRows[0].count}`);

    const result = {
      task: "D02",
      status: "PASS",
      startedAt,
      finishedAt: nowIso(),
      configuration: { apiUrl, concurrentEnters, mutationCount, duplicateCount, mutationConcurrency, timeoutMs, truncated },
      characterId,
      invariants: { oneCharacter: true, oneCreatedEnter: true, durableSessions: Number(sessionRows[0].count), revisionBefore: baseRevision, revisionAfter: after.character.state_revision, expectedRevision, coinsBefore: baseCoins, coinsAfter: after.character.coins, expectedCoins: baseCoins - (mutationCount + 1) * 5, duplicateIdempotencyRows: duplicateRecords.length, rollbackPreserved: true },
      metrics: Object.fromEntries(Object.entries(metricBuckets).map(([name, bucket]) => [name, summarize(bucket)])),
      limits: { note: "Prototype baseline only; no production SLO/throughput threshold is inferred from this run.", databasePoolMax: Math.max(8, mutationConcurrency + 4) },
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ task: "D02", status: "FAIL", error: error.message, stack: error.stack }, null, 2));
  process.exitCode = 1;
});
