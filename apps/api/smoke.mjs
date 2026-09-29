import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "./src/server.mjs";

const { server } = createApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let cookie;
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...(options.headers ?? {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json();
  const setCookie = response.headers.get("set-cookie"); if (setCookie) cookie = setCookie.split(";")[0];
  return { response, payload };
}

try {
  const enter = await request("/api/character/enter", { method: "POST", body: { name: "Demo Farm" } });
  assert.equal(enter.response.status, 200); assert.equal(enter.payload.status, "created"); assert.equal("token" in enter.payload, false);
  const bootstrap = await request("/api/game/bootstrap");
  assert.equal(bootstrap.response.status, 200); assert.equal(bootstrap.payload.crops.length, 3); assert.equal("tutorial" in bootstrap.payload, false); assert.equal("tutorialEnabled" in bootstrap.payload.settings, false);
  const plotId = bootstrap.payload.plots[0].id;
  const harvest = await request("/api/crops/harvest", { method: "POST", body: { plotId }, headers: { "Idempotency-Key": crypto.randomUUID() } });
  assert.equal(harvest.response.status, 200); assert.equal(harvest.payload.harvested.quantity, 3);
  console.log("API smoke PASS");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
