import http from "node:http";
import { URL } from "node:url";
import { ApiError, FarmStore } from "./store.mjs";

const JSON_LIMIT = 256 * 1024;
const statusFor = (code) => ({ INVALID_INPUT: 400, UNAUTHORIZED: 401, SESSION_EXPIRED: 401, NOT_FOUND: 404, NOT_ENOUGH_COINS: 409, NOT_ENOUGH_ITEM: 409, WAREHOUSE_FULL: 409, NOT_UNLOCKED: 409, PLOT_NOT_EMPTY: 409, CROP_NOT_READY: 409, BUILDING_COLLISION: 409, INVALID_ROTATION: 409, UNIQUE_BUILDING_EXISTS: 409, ORDER_NOT_COMPLETABLE: 409, ANIMAL_NOT_READY: 409, IDEMPOTENCY_KEY_REUSED: 409, RATE_LIMITED: 429, INTERNAL_ERROR: 500 }[code] ?? 400);
const parseCookies = (header = "") => Object.fromEntries(header.split(";").map((part) => part.trim().split("=")).filter(([key, value]) => key && value).map(([key, ...value]) => [key, value.join("=")]));
const requestId = () => crypto.randomUUID();

// Keep crypto import lazy-free for environments that expose it globally through node:crypto.
import crypto from "node:crypto";

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

function success(response, body, headers = {}) { send(response, 200, { ...body, requestId: body.requestId ?? requestId() }, headers); }
function errorResponse(response, error, id) {
  const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
  const message = error instanceof ApiError ? error.message : "Có lỗi máy chủ. Vui lòng thử lại.";
  const details = error instanceof ApiError ? error.details : {};
  if (!(error instanceof ApiError)) console.error(JSON.stringify({ event: "api.error", requestId: id, error: error?.stack ?? String(error) }));
  send(response, error instanceof ApiError ? error.status : statusFor(code), { error: { code, message, details }, requestId: id });
}

function idempotencyKey(request) { return request.headers["idempotency-key"]; }

export function createApiServer({ store = new FarmStore(), publicOrigin = process.env.PUBLIC_ORIGIN ?? "", environment = process.env.APP_ENV ?? "local" } = {}) {
  const server = http.createServer(async (request, response) => {
    const id = requestId();
    try {
      if (request.method === "OPTIONS") { response.writeHead(204, { "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type, idempotency-key", "access-control-allow-methods": "GET, POST, OPTIONS" }); response.end(); return; }
      const origin = request.headers.origin;
      if (publicOrigin && origin !== publicOrigin) throw new ApiError("UNAUTHORIZED", "Nguồn truy cập không hợp lệ.", 403);
      const url = new URL(request.url ?? "/", "http://localhost");
      const method = request.method ?? "GET";
      const route = `${method} ${url.pathname}`;
      if (route === "GET /api/health/live" || route === "GET /api/health/ready") { success(response, { status: "ok", service: "mo-farm-api", checks: { memory: "ok", content: "mvp-1" } }); return; }
      if (route === "GET /health/live" || route === "GET /health/ready") { success(response, { status: "ok", service: "mo-farm-api" }); return; }

      if (route === "POST /api/character/enter") {
        const body = await readJson(request); const result = store.enter(body?.name);
        const secure = environment === "demo" || environment === "production" ? "; Secure" : "";
        success(response, result, { "set-cookie": `mo_farm_session=${encodeURIComponent(result.token)}; HttpOnly; SameSite=Lax; Path=/${secure}`, "x-request-id": id });
        return;
      }

      const cookies = parseCookies(request.headers.cookie);
      const token = cookies.mo_farm_session ? decodeURIComponent(cookies.mo_farm_session) : undefined;
      const character = store.getCharacterBySession(token);
      if (route === "GET /api/game/bootstrap") { success(response, store.bootstrap(character), { "x-request-id": id }); return; }
      const key = idempotencyKey(request);
      if (route === "POST /api/crops/plant") { success(response, store.plant(character, await readJson(request), key), { "x-request-id": id }); return; }
      if (route === "POST /api/crops/harvest") { success(response, store.harvest(character, await readJson(request), key), { "x-request-id": id }); return; }
      if (route === "POST /api/buildings/place") { success(response, store.placeBuilding(character, await readJson(request), key), { "x-request-id": id }); return; }
      if (route === "POST /api/animals/feed") { success(response, store.feedAnimal(character, await readJson(request), key), { "x-request-id": id }); return; }
      if (route === "POST /api/animals/collect") { success(response, store.collectAnimal(character, await readJson(request), key), { "x-request-id": id }); return; }
      if (route === "POST /api/market/sell") { success(response, store.sell(character, await readJson(request), key), { "x-request-id": id }); return; }
      if (route === "POST /api/market/buy") { success(response, store.buy(character, await readJson(request), key), { "x-request-id": id }); return; }
      const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/complete$/u);
      if (method === "POST" && orderMatch) { success(response, store.completeOrder(character, decodeURIComponent(orderMatch[1]), await readJson(request), key), { "x-request-id": id }); return; }
      const questMatch = url.pathname.match(/^\/api\/quests\/([^/]+)\/claim$/u);
      if (method === "POST" && questMatch) { success(response, store.claimQuest(character, decodeURIComponent(questMatch[1]), await readJson(request), key), { "x-request-id": id }); return; }
      throw new ApiError("NOT_FOUND", "Không tìm thấy đường dẫn.", 404, { path: url.pathname });
    } catch (error) { errorResponse(response, error, id); }
  });
  return { server, store };
}

export async function start({ port = Number(process.env.PORT ?? 3001), host = process.env.HOST ?? "127.0.0.1", ...options } = {}) {
  const { server, store } = createApiServer(options);
  await new Promise((resolve) => server.listen(port, host, resolve));
  console.log(JSON.stringify({ event: "api.started", host, port }));
  return { server, store };
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) start();

