# Observability contract

## API request metrics

`createApiServer` records one bounded metric event when every HTTP response emits `finish`.

- `requestId`: correlation value that is safe to place in a structured log; it is not retained as a metric label.
- `method`, normalized `route`, `status`, `durationMs`: request event fields.
- `total`, `errors`, `byStatus`: process counters.
- `routes[*].duration`: count, sum, max and cumulative buckets in milliseconds.
- Route IDs and query strings are normalized/removed. Cookies, payloads, session tokens, password values and database URLs are never recorded.
- At most 100 route labels are retained by default; excess labels use `OTHER /:route`.

The in-process report is intentionally read-only and reset-on-process-restart for the prototype. `GET /api/health/metrics` is disabled by default and is available only when `METRICS_PUBLIC=true`; expose it through an internal network or replace it with a protected exporter before production.

## Renderer metrics

The existing debug HUD is the renderer metric surface and must keep these fields stable:

| Field | Meaning |
|---|---|
| `fps` | rolling frame estimate |
| `dpr` | effective Pixi renderer resolution |
| `scene.objects` | reconciled entity count |
| `scene.visible` / `scene.culled` | viewport culling result |
| `scene.animated` | views with an active animation/tween |
| `scene.effects` | active one-shot effects |
| `camera.zoom` | current camera zoom |
| `atlasPages` | loaded atlas page count |

These fields are diagnostic only. They cannot change economy, inventory, XP, readiness timestamps or API behavior.

## D02 load-test handoff

The load scenario must collect request event logs and the metrics snapshot while exercising character enter, bootstrap, plant, harvest, market, order and one idempotent retry. The acceptance gate checks error count, p95 duration by route, memory growth and duplicate state transitions. It must run against an isolated test database and must never use a production database or log secrets.
