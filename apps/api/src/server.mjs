import http from "node:http";
import crypto from "node:crypto";
import { URL, fileURLToPath } from "node:url";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { ApiError, FarmStore } from "./store.mjs";
import { createApiMetrics } from "./observability/metrics.mjs";
import { PostgresFarmRepository } from "./repositories/postgresFarmRepository.mjs";
import pg from "pg";
import { checkPersistenceReadiness, resolvePersistenceDriver } from "./persistence/config.mjs";

const JSON_LIMIT = 256 * 1024;
const statusFor = (code) => ({ INVALID_INPUT: 400, UNAUTHORIZED: 401, SESSION_EXPIRED: 401, NOT_FOUND: 404, NOT_ENOUGH_COINS: 409, NOT_ENOUGH_ITEM: 409, WAREHOUSE_FULL: 409, NOT_UNLOCKED: 409, PLOT_NOT_EMPTY: 409, CROP_NOT_READY: 409, BUILDING_COLLISION: 409, INVALID_ROTATION: 409, UNIQUE_BUILDING_EXISTS: 409, ORDER_NOT_COMPLETABLE: 409, ANIMAL_NOT_READY: 409, IDEMPOTENCY_KEY_REUSED: 409, SERIALIZATION_RETRY_EXHAUSTED: 409, DEADLOCK_RETRY_EXHAUSTED: 409, PERSISTENCE_CONFLICT: 409, PERSISTENCE_UNAVAILABLE: 503, RATE_LIMITED: 429, INTERNAL_ERROR: 500 }[code] ?? 400);
const parseCookies = (header = "") => Object.fromEntries(header.split(";").map((part) => part.trim().split("=")).filter(([key, value]) => key && value).map(([key, ...value]) => [key, value.join("=")]));
const decodeCookie = (value) => { try { return decodeURIComponent(value); } catch { return undefined; } };
const requestId = () => crypto.randomUUID();

async function readJson(request) {
  let size = 0; const chunks = [];
  for await (const chunk of request) { size += chunk.length; if (size > JSON_LIMIT) throw new ApiError("INVALID_INPUT", "Dữ liệu gửi lên quá lớn.", 413); chunks.push(chunk); }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ApiError("INVALID_INPUT", "JSON không hợp lệ.", 400); }
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  response.end(JSON.stringify(body));
}

function success(response, body, headers = {}) {
  const responseId = headers["x-request-id"] ?? requestId();
  send(response, 200, { ...body, requestId: body.requestId ?? responseId }, headers);
}
function errorResponse(response, error, id) {
  const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
  const message = error instanceof ApiError ? error.message : "Có lỗi máy chủ. Vui lòng thử lại.";
  const details = error instanceof ApiError ? error.details : {};
  if (!(error instanceof ApiError)) console.error(JSON.stringify({ event: "api.error", requestId: id, error: error?.stack ?? String(error) }));
  send(response, error instanceof ApiError ? error.status : statusFor(code), { error: { code, message, details }, requestId: id });
}

function repositoryApiError(error) {
  if (error instanceof ApiError) return error;
  const code = error?.code;
  if (["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "08000", "08003", "08006", "57P01", "57P03", "28P01"].includes(code)) return new ApiError("PERSISTENCE_UNAVAILABLE", "Kho dữ liệu hiện không khả dụng.", 503);
  if (code === "40001") return new ApiError("SERIALIZATION_RETRY_EXHAUSTED", "Dữ liệu vừa được thay đổi. Vui lòng thử lại.", 409);
  if (code === "40P01") return new ApiError("DEADLOCK_RETRY_EXHAUSTED", "Giao dịch bị xung đột. Vui lòng thử lại.", 409);
  if (code === "PERSISTENCE_UNAVAILABLE") return new ApiError("PERSISTENCE_UNAVAILABLE", "Kho dữ liệu hiện không khả dụng.", 503);
  if (code === "PERSISTENCE_CONFLICT") return new ApiError("PERSISTENCE_CONFLICT", "Dữ liệu vừa được thay đổi. Vui lòng thử lại.", 409);
  const known = new Set(["INVALID_INPUT", "UNAUTHORIZED", "SESSION_EXPIRED", "NOT_FOUND", "NOT_ENOUGH_COINS", "NOT_ENOUGH_ITEM", "WAREHOUSE_FULL", "NOT_UNLOCKED", "PLOT_NOT_EMPTY", "CROP_NOT_READY", "BUILDING_COLLISION", "INVALID_ROTATION", "UNIQUE_BUILDING_EXISTS", "ORDER_NOT_COMPLETABLE", "ANIMAL_NOT_READY", "IDEMPOTENCY_KEY_REUSED"]);
  if (known.has(code)) return new ApiError(code, error.message, statusFor(code), error.details ?? {});
  return error;
}

function idempotencyKey(request) { return request.headers["idempotency-key"]; }

export function createApiServer({ store, repository, persistenceDriver, databaseUrl = process.env.DATABASE_URL, pool, clock, sessionTtlMs, metrics = createApiMetrics({ logRequests: process.env.LOG_LEVEL === "debug" }), exposeMetrics = process.env.METRICS_PUBLIC === "true", publicOrigin = process.env.PUBLIC_ORIGIN ?? "", environment = process.env.APP_ENV ?? "local" } = {}) {
  const driver = resolvePersistenceDriver(persistenceDriver ?? (repository ? "postgres" : (process.env.PERSISTENCE_DRIVER ?? "file")));
  if (driver === "postgres" && !repository) {
    if (!databaseUrl) throw new Error("DATABASE_URL is required when PERSISTENCE_DRIVER=postgres");
    const PgPool = pg.Pool ?? pg.default?.Pool;
    repository = new PostgresFarmRepository({ pool: pool ?? new PgPool({ connectionString: databaseUrl }), clock, sessionTtlMs });
  }
  const postgres = Boolean(repository);
  store ??= postgres ? undefined : new FarmStore({ clock, sessionTtlMs });
  const active = repository ?? store;
  const mutation = async (character, actionType, method, body, key, args = [body], requestPayload = body) => repository
    ? repository.mutate({ characterId: character.id, actionType, method, payload: requestPayload, key, args })
    : store[method](character, ...args, key);
  const ready = async () => {
    const result = await checkPersistenceReadiness({ driver, repository, store });
    return { status: result.ready ? "ok" : "error", persistence: result };
  };
  const server = http.createServer(async (request, response) => {
    const startedAt = performance.now();
    const method = request.method ?? "GET";
    let requestPath = "/";
    try { requestPath = new URL(request.url ?? "/", "http://localhost").pathname; } catch { /* route parser below returns a normal error */ }
    const id = requestId();
    response.once("finish", () => {
      const event = metrics.recordRequest({ method, route: requestPath, statusCode: response.statusCode, durationMs: performance.now() - startedAt, requestId: id });
      if (metrics.logRequests) console.log(JSON.stringify(event));
    });
    try {
      if (request.method === "OPTIONS") {
        const requestedOrigin = request.headers.origin;
        const cors = publicOrigin && requestedOrigin === publicOrigin ? { "access-control-allow-origin": requestedOrigin, "vary": "Origin" } : {};
        response.writeHead(204, { "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type, idempotency-key", "access-control-allow-methods": "GET, POST, OPTIONS", ...cors }); response.end(); return;
      }
      const origin = request.headers.origin;
      // Browser requests carry Origin; allow origin-less health checks and local CLI calls.
      if (publicOrigin && origin && origin !== publicOrigin) throw new ApiError("UNAUTHORIZED", "Nguồn truy cập không hợp lệ.", 403);
      if (origin && publicOrigin === origin) {
        response.setHeader("access-control-allow-origin", origin);
        response.setHeader("access-control-allow-credentials", "true");
        response.setHeader("vary", "Origin");
      }
      const url = new URL(request.url ?? "/", "http://localhost");
      const route = `${method} ${url.pathname}`;
      if (route === "GET /api/health/metrics") {
        if (!exposeMetrics) throw new ApiError("NOT_FOUND", "Không tìm thấy đường dẫn.", 404, { path: url.pathname });
        success(response, { status: "ok", service: "mo-farm-api", metrics: metrics.snapshot() }, { "x-request-id": id });
        return;
      }
      if (route === "GET /api/health/live") { success(response, { status: "ok", service: "mo-farm-api", version: "1.0.0", checks: { memory: "ok", process: "ok", content: "mvp-1" } }); return; }
      if (route === "GET /api/health/ready" || route === "GET /api/health") {
        const check = await ready();
        const persistence = check.persistence;
        const checks = { memory: "ok", process: "ok", content: "mvp-1", persistence: persistence.driver === "file" ? "prototype-file-adapter" : "postgres", persistenceDriver: persistence.driver, persistenceReady: persistence.ready, persistenceCheck: persistence.check };
        if (check.status !== "ok") { send(response, 503, { status: "error", service: "mo-farm-api", version: "1.0.0", checks, requestId: id }); return; }
        success(response, { status: "ok", service: "mo-farm-api", version: "1.0.0", checks }); return;
      }
      if (route === "GET /healthz" || route === "GET /health/live") { success(response, { status: "ok", service: "mo-farm-api" }); return; }
      if (route === "GET /health/ready") { const check = await ready(); const persistence = check.persistence; const checks = { persistence: persistence.driver === "file" ? "prototype-file-adapter" : "postgres", persistenceDriver: persistence.driver, persistenceReady: persistence.ready, persistenceCheck: persistence.check }; if (check.status !== "ok") { send(response, 503, { status: "error", service: "mo-farm-api", checks, requestId: id }); return; } success(response, { status: "ok", service: "mo-farm-api", checks }); return; }

      if (route === "POST /api/character/enter") {
        const body = await readJson(request); const result = await active.enter(body?.name);
        const { token, ...publicResult } = result;
        const sameSite = ["Strict", "Lax", "None"].includes(process.env.COOKIE_SAME_SITE) ? process.env.COOKIE_SAME_SITE : "Lax";
        const secure = String(process.env.COOKIE_SECURE).toLowerCase() === "true" || environment === "demo" || environment === "production" || sameSite === "None" ? "; Secure" : "";
        success(response, publicResult, { "set-cookie": `mo_farm_session=${encodeURIComponent(token)}; HttpOnly; SameSite=${sameSite}; Path=/${secure}`, "x-request-id": id });
        return;
      }

      const cookies = parseCookies(request.headers.cookie);
      const token = cookies.mo_farm_session ? decodeCookie(cookies.mo_farm_session) : undefined;
      if (route === "POST /api/session/revoke") {
        const revoked = token ? await active.revokeSession(token) : false;
        success(response, { revoked }, { "set-cookie": "mo_farm_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/", "x-request-id": id });
        return;
      }
      const character = await active.getCharacterBySession(token);
      if (route === "GET /api/game/bootstrap") { success(response, await active.bootstrap(character), { "x-request-id": id }); return; }
      const key = idempotencyKey(request);
      if (route === "POST /api/crops/plant") { const body = await readJson(request); success(response, await mutation(character, "crops.plant", "plant", body, key), { "x-request-id": id }); return; }
      if (route === "POST /api/crops/harvest") { const body = await readJson(request); success(response, await mutation(character, "crops.harvest", "harvest", body, key), { "x-request-id": id }); return; }
      if (route === "POST /api/buildings/place") { const body = await readJson(request); success(response, await mutation(character, "buildings.place", "placeBuilding", body, key), { "x-request-id": id }); return; }
      if (route === "POST /api/animals/feed") { const body = await readJson(request); success(response, await mutation(character, "animals.feed", "feedAnimal", body, key), { "x-request-id": id }); return; }
      if (route === "POST /api/animals/collect") { const body = await readJson(request); success(response, await mutation(character, "animals.collect", "collectAnimal", body, key), { "x-request-id": id }); return; }
      if (route === "POST /api/market/sell") { const body = await readJson(request); success(response, await mutation(character, "market.sell", "sell", body, key), { "x-request-id": id }); return; }
      if (route === "POST /api/market/buy") { const body = await readJson(request); success(response, await mutation(character, "market.buy", "buy", body, key), { "x-request-id": id }); return; }
      const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/complete$/u);
      if (method === "POST" && orderMatch) { const body = await readJson(request); const orderId = decodeURIComponent(orderMatch[1]); success(response, await mutation(character, "orders.complete", "completeOrder", body, key, [orderId, body], { orderId, body }), { "x-request-id": id }); return; }
      const questMatch = url.pathname.match(/^\/api\/quests\/([^/]+)\/claim$/u);
      if (method === "POST" && questMatch) { const body = await readJson(request); const questId = decodeURIComponent(questMatch[1]); success(response, await mutation(character, `quests.${questId}.claim`, "claimQuest", body, key, [questId, body], { questId, body }), { "x-request-id": id }); return; }
      throw new ApiError("NOT_FOUND", "Không tìm thấy đường dẫn.", 404, { path: url.pathname });
    } catch (error) { errorResponse(response, repositoryApiError(error), id); }
  });
  return { server, store, repository, metrics, ready };
}

export async function start({ port = Number(process.env.PORT ?? 3001), host = process.env.HOST ?? "127.0.0.1", ...options } = {}) {
  const { server, store } = createApiServer(options);
  await new Promise((resolve) => server.listen(port, host, resolve));
  console.log(JSON.stringify({ event: "api.started", host, port }));
  return { server, store };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) start();

