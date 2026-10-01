# E01 CANONICAL QUICK TUNNEL RESTORATION

Date: 2026-10-01 (Asia/Bangkok)

Historical Phase-1 repository-correction report. The statuses and next-step boundary below describe that completed checkpoint. Current E01 is DONE — PERSISTENT_QUICK_TUNNEL with runtime RUNNING / CONNECTED; see [Phase-2 runtime acceptance](E01_QUICK_TUNNEL_RUNTIME_ACCEPTANCE.md) and the [canonical runbook](E01_PERSISTENT_QUICK_TUNNEL.md). RC01 is QUEUED / READY, NOT_STARTED and awaits a separate Project Owner command.

Previous HEAD: `0b12ec44a31a33afeaf237b75b5c74b95e61ec8a`

Scope: repository and planning correction under the final Project Owner decision. Existing work was reviewed and completed without blindly reverting commits. No application or tunnel container was started, restarted, recreated or stopped. No public URL was created, public QA performed or RC01 started.

| Field | Result |
|---|---|
| CANONICAL DEPLOYMENT | **PERSISTENT_QUICK_TUNNEL** |
| PUBLIC DOMAIN | `*.trycloudflare.com` — domain form, never an allowed Origin wildcard |
| CUSTOM DOMAIN REQUIRED | NO |
| FIXED HOSTNAME | NO |
| TOKEN REQUIRED | NO |
| ORIGIN | `http://nginx:80` |
| PUBLIC_ORIGIN MODE | **RUNTIME_GENERATED_EXACT** |
| IMAGE | `cloudflare/cloudflared:2025.9.1` |
| COMMAND | `tunnel --no-autoupdate --url http://nginx:80` |
| RESTART POLICY | `unless-stopped` |
| INDEPENDENT CLOUDFLARED LIFECYCLE | PASS — separate Compose projects |
| APP UPDATE PRESERVES CLOUDFLARED | PASS — mocked lifecycle tests; actual public redeploy proof pending |
| SHARED NETWORK | PASS — explicit `mo-farm-frontend`, target resolved as `nginx` |
| QUICK TUNNEL CONTRACT | PASS |
| NAMED TUNNEL | SUPERSEDED — excluded from canonical preflight |
| CANONICAL PLAN UPDATED | PASS |
| PREFLIGHT | BLOCKED_CONFIG — every static check PASS |
| SECURITY | PASS — repository checks and local/mocked tests; public verification pending |
| PWA | PASS — API cache exclusion retained; public mobile QA pending |

This is the official public deployment, not temporary debug tooling. Named Tunnel historical records are marked `SUPERSEDED`, `NON_CANONICAL`, `NOT_CURRENT_E01_RELEASE_PATH`, with reason `PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`. Their historical bodies are preserved.

The current URL should remain unchanged while the same cloudflared process/session survives. It is not permanent. Process exit, container restart/recreation, Docker host reboot, Cloudflare termination or explicit operator stop/restart can change it. The restart policy improves availability without preserving a restarted session's URL.

Start reuses a healthy tunnel and reports `TUNNEL_ALREADY_RUNNING`. Captured URLs are strictly validated before writing ignored `.runtime/quick-tunnel.json` and `.runtime/quick-tunnel.env`; only the exact generated origin is injected into application configuration. Application updates compare tunnel ID, start timestamp, restart count and URL before/after, failing with `TUNNEL_LIFECYCLE_REGRESSION` on unexpected changes. Runtime files contain no application secrets.

Review fixes include a bounded exact-origin Nginx probe before reporting CONNECTED, PostgreSQL-backed readiness before tunnel creation, application-only rollback covering optional Nginx updates and start repair, safe runtime state recovery and stricter Compose preflight checks. Changed bind-mounted Nginx configuration still requires operator repair if it prevents recovery. Existing static routing, traversal/symlink protections, rate limits, body limits, proxy normalization, security headers, protected cookies, exact Origin checks and API cache exclusion remain intact.

| Validation | Result |
|---|---|
| `npm run test:e01:security` | PASS — 52/52, no skips |
| `npm run assets:validate` | PASS — 188 assets, 10 animations |
| `npm run assets:validate:strict` | PASS — 188 assets, 10 animations |
| `npm run assets:validate:wave1` | PASS — 112 approved Wave 1 assets |
| `npm run assets:validate:wave2` | PASS — 76 exact atlas frames, 9 contracts, 7 frozen frames |
| `npm run assets:validate:wave2-release` | PASS — 188 approved/production-ready assets, 0 placeholders |
| `npm run renderer:test` | PASS — 16/16 |
| `npm run test:api:full` | PASS — 20/20 |
| `npm run check` | PASS |
| `docker compose config --quiet` | PASS |
| `docker compose -f compose.tunnel.yaml config --quiet` | PASS |
| `docker compose build --quiet api web` | PASS — build only |
| `git diff --check` | PASS |
| `npm run e01:preflight` | Expected BLOCKED_CONFIG, native exit 2; all static checks PASS |
| `npm run e01:quick:status` | PASS — read-only; container and URL NOT_CREATED |

The Wave 2 validator's timestamp-only generated change was restored to the original bytes. No artwork, gameplay, renderer, database schema or game state was changed. Historical artwork records received deployment-scope annotations only.

Actual local configuration still requires `PERSISTENCE_DRIVER=postgres`, `APP_ENV=demo`, `COOKIE_SECURE=true`, non-default `SESSION_SECRET` and `POSTGRES_PASSWORD`, and a valid PostgreSQL `DATABASE_URL`. Pre-start `PUBLIC_ORIGIN`, Cloudflare hostname and tunnel tokens are not prerequisites. Synthetic pre-start and exact-origin tests pass without creating a URL.

| Phase state | Result |
|---|---|
| B02 | DONE |
| E01 repository implementation | DONE |
| E01 lifecycle isolation | DONE |
| E01 runtime | BLOCKED_CONFIG |
| CLOUDFLARED | NOT_STARTED — CLI reports STOPPED; container NOT_CREATED |
| QUICK TUNNEL | NOT_STARTED |
| PUBLIC URL | NOT_CREATED |
| RC01 | BLOCKED_BY_E01 / NOT_STARTED |

Actual URL preservation during a real application redeploy remains a mandatory E01 completion gate. Public HTTPS/session/bootstrap/idempotent-mutation/asset checks, negative static paths and mobile QA at 932x430, 915x412, 844x390 and 740x360 remain pending. Do not intentionally restart cloudflared to demonstrate URL rotation.

Next: wait for the explicit Project Owner runtime command. Follow the [canonical runbook](E01_PERSISTENT_QUICK_TUNNEL.md) for that phase. Commit title: `make persistent quick tunnel canonical deployment`; the final SHA and verified origin/main state are recorded in the delivery message.
