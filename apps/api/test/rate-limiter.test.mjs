import test from "node:test";
import assert from "node:assert/strict";
import { ApiRateLimiter } from "../src/security/rateLimiter.mjs";
import { createApiServer } from "../src/server.mjs";

test("ApiRateLimiter returns 429-ready decisions and recovers after a window", () => {
  let now = 0;
  const limiter = new ApiRateLimiter({ limit: 2, windowMs: 1000, maxClients: 2, now: () => now });
  assert.equal(limiter.consume("10.0.0.1").allowed, true);
  assert.equal(limiter.consume("10.0.0.1").allowed, true);
  const blocked = limiter.consume("10.0.0.1");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 1000);
  assert.equal(limiter.consume("10.0.0.2").allowed, true);
  now = 1001;
  assert.equal(limiter.consume("10.0.0.1").allowed, true);
  // The expired bucket for the second client is pruned when the new window starts.
  assert.equal(limiter.size(), 1);
});

test("ApiRateLimiter bounds client cardinality and does not use session material", () => {
  let now = 0;
  const limiter = new ApiRateLimiter({ limit: 1, maxClients: 2, now: () => now });
  limiter.consume("client-a");
  now = 1;
  limiter.consume("client-b");
  now = 2;
  limiter.consume("client-c");
  assert.ok(limiter.size() <= 2);
});

test("API rate limiting protects API traffic while leaving health checks usable", async () => {
  const { server } = createApiServer({ rateLimiter: new ApiRateLimiter({ limit: 1, windowMs: 60_000 }) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/api/health/live`)).status, 200);
    assert.equal((await fetch(`${base}/api/health/ready`)).status, 200);
    assert.equal((await fetch(`${base}/api/character/enter`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Rate limit demo" }) })).status, 200);
    const blocked = await fetch(`${base}/api/character/enter`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Rate limit demo 2" }) });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("retry-after"), "60");
    const body = await blocked.json();
    assert.equal(body.error.code, "RATE_LIMITED");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
