import test from "node:test";
import assert from "node:assert/strict";
import { ApiMetrics } from "../src/observability/metrics.mjs";
import { createApiServer } from "../src/server.mjs";

test("ApiMetrics records bounded route/status/duration data without query cardinality", () => {
  const metrics = new ApiMetrics({ maxRoutes: 2, clock: () => new Date("2026-09-29T00:00:00.000Z") });
  const first = metrics.recordRequest({ method: "GET", route: "GET /api/orders/123456789012345678901234/complete?secret=hidden", statusCode: 200, durationMs: 12.345, requestId: "request-1" });
  metrics.recordRequest({ method: "POST", route: "POST /api/crops/harvest", statusCode: 409, durationMs: 75 });
  metrics.recordRequest({ method: "GET", route: "GET /api/another/route", statusCode: 500, durationMs: 6000 });
  const snapshot = metrics.snapshot();

  assert.equal(first.route, "/api/orders/:id/complete");
  assert.equal(snapshot.total, 3);
  assert.equal(snapshot.errors, 1);
  assert.deepEqual(snapshot.byStatus, { "200": 1, "409": 1, "500": 1 });
  assert.ok(snapshot.routes["GET /api/orders/:id/complete"]);
  assert.ok(snapshot.routes["OTHER /:route"]);
  assert.equal(Object.keys(snapshot.routes).some((key) => key.includes("secret")), false);
  assert.equal(snapshot.routes["GET /api/orders/:id/complete"].duration.buckets["25"], 1);
});

test("ApiMetrics rejects invalid bucket configuration and reset clears state", () => {
  assert.throws(() => new ApiMetrics({ buckets: [0] }), /positive finite/);
  const metrics = new ApiMetrics();
  metrics.recordRequest({ method: "GET", route: "GET /", statusCode: 200, durationMs: 1 });
  metrics.reset();
  assert.equal(metrics.snapshot().total, 0);
});

test("API lifecycle records request metrics and exposes them only when enabled", async () => {
  const metrics = new ApiMetrics();
  const { server } = createApiServer({ metrics, exposeMetrics: true, clock: () => new Date("2026-09-29T00:00:00.000Z") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/api/health/live`);
    assert.equal(health.status, 200);
    const report = await fetch(`${base}/api/health/metrics`);
    const body = await report.json();
    assert.equal(report.status, 200);
    assert.ok(body.metrics.total >= 1);
    assert.ok(body.metrics.routes["GET /api/health/live"]);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
