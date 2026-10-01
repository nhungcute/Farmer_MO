# E01 — Persistent Quick Tunnel lifecycle

> **SUPERSEDED / NON_CANONICAL / DEBUG EXPERIMENT.** This document preserves the implementation, decisions and static results of historical commit `5c8132f`. Reason: `PROJECT_OWNER_CONFIRMED_EXISTING_NAMED_TUNNEL_PLAN`. Project Owner subsequently restored the canonical **NAMED_TUNNEL** plan with fixed hostname and token, retaining lifecycle isolation. Current release runbook: [`E01_PERSISTENT_NAMED_TUNNEL.md`](E01_PERSISTENT_NAMED_TUNNEL.md). Quick Tunnel, generated URL/origin and commands below are historical/debug-only and cannot satisfy current E01 preflight. All claims of “canonical”, current status, PASS or required configuration below are attributed to that historical checkpoint, not the restored deployment.

Date: 2026-10-01
Deployment model: **PERSISTENT_QUICK_TUNNEL**
Phase: **1 — repository implementation only**
Runtime: **BLOCKED_CONFIG** — ignored local demo/PostgreSQL configuration is absent
Cloudflared: **NOT_STARTED**
Public URL: **NOT_CREATED**
RC01: **BLOCKED_BY_E01 / NOT_STARTED**

This section records the temporary Quick Tunnel decision made at commit `5c8132f`; it is historical evidence only. The Named Tunnel plan, preflight reports, remediation evidence and `infra/cloudflared/named-tunnel-contract.json` are active again under the current runbook linked above. The Quick Tunnel configuration and generated-origin requirements below do not apply to the restored E01 deployment.

## Ownership and scope

- Task ID: E01-QT-01..06; integration owner: infrastructure/release workstream.
- Dependencies: A03, B02, C03 and D02 DONE; Docker/config/static regression gates required before repository migration sign-off.
- Owned paths: application/tunnel Compose, Cloudflare contract, E01 tooling/tests and deployment documentation.
- Forbidden changes: gameplay/economy, renderer/animation/asset contracts, PostgreSQL schema/game data, production secrets and unrelated containers.
- Deliverables: independently managed Quick Tunnel, strict URL capture, exact runtime PUBLIC_ORIGIN, selective app update, start/status/stop tools, static verification and this runbook.
- B02 remains DONE: 188/188 production_ready, 188/188 approved, 0 placeholders.

| Task | Repository deliverable | Runtime evidence |
|---|---|---|
| E01-QT-01 | Separate Compose projects and shared named network | Pending Phase 2 |
| E01-QT-02 | Pinned no-token Quick Tunnel contract | Pending Phase 2 |
| E01-QT-03 | Strict URL capture and ignored exact PUBLIC_ORIGIN state | Pending Phase 2 |
| E01-QT-04 | App update preserves tunnel container and process | Actual redeploy pending Phase 2 |
| E01-QT-05 | Idempotent start, safe status and tunnel-only stop | Pending Phase 2 |
| E01-QT-06 | Security/lifecycle static tests and regression | Final static evidence recorded by Integration Owner |

## Architecture and lifecycle

```text
Internet
  → https://<generated>.trycloudflare.com
  → cloudflared (compose.tunnel.yaml, project mo-farm-tunnel)
  → http://nginx:80
  → web / api
  → PostgreSQL (db)

Application project mo-farm: compose.yaml
  db + api + web + nginx; init profile: migrate + seed
Tunnel project mo-farm-tunnel: compose.tunnel.yaml
  cloudflared only

Shared frontend network: mo-farm-frontend
  owned by application Compose; external in tunnel Compose
Backend network: application-private PostgreSQL/API connectivity
```

Cloudflared resolves Nginx using Docker DNS on `mo-farm-frontend`. The application starts the network before the first tunnel startup. Tunnel has no build or Compose dependency on app services; API/web/Nginx recreation therefore does not recreate cloudflared. Only Nginx binds a host port, on loopback; API, web and PostgreSQL have no host port publication.

Pinned image: `cloudflare/cloudflared:2025.9.1`. Restart policy: `unless-stopped`. Bounded Docker log rotation prevents unbounded tunnel logs.

```text
cloudflared tunnel --no-autoupdate --url http://nginx:80
```

No tunnel token, credentials file, fixed hostname or Cloudflare dashboard setup is required. `infra/cloudflared/quick-tunnel-contract.json` is the active machine-readable contract:

```json
{
  "tunnelType": "quick",
  "originService": "http://nginx:80",
  "publicHostnameType": "ephemeral-trycloudflare",
  "hostnameSuffix": ".trycloudflare.com",
  "tokenRequired": false,
  "fixedHostnameRequired": false,
  "publicOriginMode": "runtime-generated-exact",
  "persistentContainerLifecycle": true,
  "appRedeployMustPreserveTunnel": true
}
```

## URL lifetime and security

The URL is **EPHEMERAL**. Preservation scope is **SAME CLOUDFLARED LIFETIME**. Keeping the same process/container alive during application updates minimizes URL changes; it does not guarantee a permanent URL. Stopping/restarting the process, recreating the container, host reboot or Cloudflare recreating the Quick Tunnel session may produce a new hostname. Docker restart policy restores availability but cannot promise the old URL. Quick Tunnels are intended for testing/development, have no uptime guarantee, and the URL stops working when cloudflared stops. Production/stable deployment should eventually use Named Tunnel. [Cloudflare Quick Tunnels documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Existing hardening remains required: restricted web static root and internal-path/traversal blocking, bounded API rate limiting, trusted Nginx forwarding, request body limits, CSP/security headers, Secure/HttpOnly cookies, PostgreSQL persistence and service worker bypass of `/api/**`.

URL capture validates the entire origin, not a loose substring: HTTPS, valid subdomain of `.trycloudflare.com`, no root `trycloudflare.com`, other domain, localhost, HTTP, port, path, query, fragment or credentials. No wildcard origin is allowed. Once discovered, API `PUBLIC_ORIGIN` equals the exact captured URL.

Ignored runtime files:

```text
.runtime/quick-tunnel.json   current URL, capturedAt, container identity/process state, status
.runtime/quick-tunnel.env    PUBLIC_ORIGIN=<exact-current-generated-HTTPS-origin>
.runtime/quick-tunnel.lock/owner.json   exclusive lock directory with PID/createdAt
```

State records container ID plus `startedAt` and `restartCount`; an unchanged container ID alone cannot prove the same process lifetime. Root `.env` remains the source for local secrets; generated runtime state/env must not duplicate them. Stop marks the URL stale; stale state is not reusable proof of a currently live URL. These files are ignored by Git and must not be committed or included as secret-bearing evidence.

## Phase 1 — static verification only

Do not run the start/update/stop examples below during Phase 1. Do not start application containers, cloudflared or a public URL. Build and config validation are allowed; no runtime/public PASS is inferred from static success.

Pre-start configuration requires:

- `PERSISTENCE_DRIVER=postgres`;
- `APP_ENV=demo`;
- `COOKIE_SECURE=true`;
- non-default `SESSION_SECRET`, at least 32 characters;
- non-default `POSTGRES_PASSWORD`, at least 16 characters;
- valid non-default PostgreSQL `DATABASE_URL` targeting the application database.

No `CLOUDFLARE_TUNNEL_TOKEN`, `TUNNEL_TOKEN`, `CLOUDFLARE_HOSTNAME` or preknown HTTPS public origin is needed. Preflight reports variable names/statuses only; never secret values. Validate the actual ignored local configuration with:

```powershell
npm run e01:preflight
```

Exit `0` means repository/config checks PASS, `2` means `BLOCKED_CONFIG`, `3` means a repository security blocker. Safe synthetic test configuration validates repository gates without authorizing runtime or creating real secrets. Current absent local configuration is an expected `BLOCKED_CONFIG`, not a claimed runtime pass.

Required Phase-1 regression:

```powershell
npm run test:e01:security
npm run e01:preflight
npm run assets:validate
npm run assets:validate:strict
npm run assets:validate:wave1
npm run assets:validate:wave2
npm run assets:validate:wave2-release
npm run renderer:test
npm run test:api:full
npm run check
docker compose config --quiet
docker compose -f compose.tunnel.yaml config --quiet
docker compose build --quiet api web
git diff --check
```

After final static regression, the Integration Owner records actual results and repository migration status here. Runtime remains `BLOCKED_CONFIG` if configuration is missing or `READY_FOR_QUICK_TUNNEL_START` if configuration is valid. Cloudflared remains NOT_STARTED and the URL NOT_CREATED. Commit/push repository changes only; wait for the explicit Project Owner instruction before Phase 2.

## Phase 2 — first start and repeat start

Run only after Project Owner explicitly requests public startup:

```powershell
npm run e01:quick:start
npm run e01:quick:status
```

The canonical first-start sequence is:

1. Validate repository/prerequisites and ignored demo/PostgreSQL configuration.
2. Start PostgreSQL (`db`) and wait for readiness; apply the existing idempotent migration job.
3. Start API/web/Nginx internally and verify readiness. Until capture, use exact nonpublic bootstrap origin `https://bootstrap.invalid`; public browser Origins are not accepted by that bootstrap value.
4. Start Quick Tunnel only if no cloudflared container is currently running. Never call tunnel `up` on an already running container.
5. Discover the current process/session URL from bounded logs and validate strict HTTPS origin structure.
6. Write ignored URL/process state and runtime PUBLIC_ORIGIN override.
7. Recreate API with the exact URL; cloudflared must keep running throughout.
8. Verify API readiness, Nginx health and public HTTPS `/`, `/api/health/ready`, `/healthz` smoke.
9. Record current tunnel state and report E01 RUNNING with full QA pending.

Repeated start with a healthy running tunnel reports `TUNNEL_ALREADY_RUNNING` and the same current URL, validates readiness/smoke and records current state without build/up/migration. If application state needs repair, it updates only those application services and still preserves cloudflared. Existing tunnel command/image/network/restart-policy/credential drift is rejected before reuse. A restart or URL rotation found during an operation is a regression, not silently accepted as success.

## Selective application update

```powershell
# Update API/web; reload Nginx to resolve recreated upstream containers.
npm run e01:app:update

# Also recreate Nginx when its configuration changes.
npm run e01:app:update -- --nginx
```

Update requires a live tunnel, validated current state and exact origin match. It records cloudflared ID, StartedAt, RestartCount and URL, builds API/web, selectively recreates API/web, and waits for readiness. Nginx reload resolves newly assigned upstream IPs; `--nginx` selectively recreates Nginx then reloads. Database and tunnel are not recreated, and volumes are retained. Afterward it independently rediscovers/verifies tunnel identity/lifetime and URL and performs public smoke. Any unexpected change reports `TUNNEL_LIFECYCLE_REGRESSION`.

Never use `docker compose down`, tunnel `--force-recreate`, tunnel stack rebuild or database volume deletion in a normal app update. If app update fails, repair/restart/roll back the affected app services while leaving cloudflared alive. If Nginx is briefly unavailable, public traffic can return transient origin/gateway errors and should recover on the same URL after readiness returns. Do not restart cloudflared as a routine app repair.

## Status, stop and logs

```powershell
npm run e01:quick:status

# Stop only cloudflared. Database/game state and application containers remain.
npm run e01:quick:stop

# Bounded recent tunnel logs; the public URL is not a credential.
docker compose -f compose.tunnel.yaml logs --tail 100 cloudflared
```

Status reports RUNNING/STOPPED, a safe container ID, current URL if known, Nginx/API/PostgreSQL health and PUBLIC_ORIGIN match PASS/FAIL. It must not print session secret, PostgreSQL password, cookies, database credentials or full expanded Docker environments. Tooling suppresses raw Docker output that could contain expanded secrets.

Stop targets cloudflared only and marks captured state stale. It does not delete PostgreSQL volume, reset the farm or claim the old URL is reusable. A later start may generate a new URL and must bind its exact origin again.

Lifecycle operations use an exclusive `.runtime/quick-tunnel.lock` directory containing `owner.json` with PID/createdAt. If interruption leaves a stale lock, verify that PID and prove no lifecycle CLI is active before removing only `owner.json` and then the empty lock directory. Never clear an active lock, delete runtime state or restart a healthy tunnel to clear a lock. Diagnose application readiness independently of tunnel lifetime.

## Required public QA and preservation evidence

Script smoke checks root/readiness/healthz only. The following browser/security/data tests remain **PENDING Phase 2**, even if smoke is successful:

- HTTPS `/` and `/api/health/ready`, display-name enter, farm bootstrap, all 188 approved assets, session/refresh and safe idempotent mutation.
- Actual browser cookie: HttpOnly, Secure, canonical SameSite; exact current PUBLIC_ORIGIN. Verify mismatched/wildcard Origins remain rejected.
- Mobile viewports 932×430, 915×412, 844×390 and 740×360: no overflow, correct canvas, usable touch controls, readable farm, no missing atlas or critical JS errors.
- Through the actual URL, `/server.mjs`, `/Dockerfile`, `/README.md`, `/package.json`, `/src/main.js`, `/.env`, `/.git/config`, `/node_modules/`, `/tools/`, `/docs/` return 403/404; traversal/internal paths remain blocked.
- Normal API traffic allowed and a minimal bounded burst reaches application rate-limit 429 with the expected response. Do not stress Cloudflare or count an edge capacity 429 as API limiter evidence.
- Farm/session data survive actual API/web rebuild and selective Nginx recreation; PostgreSQL volume is preserved.

For the critical preservation test, record tunnel ID, StartedAt, RestartCount, current URL and farm state, run a real `npm run e01:app:update` (also exercise `-- --nginx` where required), then verify identical tunnel/process fields and URL, working public application and persisted farm state. Evidence must include:

```text
URL before app update: URL-A
URL after app update:  URL-A
Container ID: SAME
StartedAt: SAME
RestartCount: SAME
Public application: PASS
Farm persistence: PASS
Result: PASS — URL PRESERVED
Scope: SAME CLOUDFLARED LIFETIME
```

Do not deliberately restart cloudflared to prove URL rotation. Retain a useful current URL. Evidence may include the public trycloudflare URL, sanitized status and timestamps; never secrets, cookies, database URLs/passwords or raw expanded environments.

## Status and release gate

| Condition | E01 runtime | RC01 |
|---|---|---|
| Repository ready, required local config absent | BLOCKED_CONFIG; no runtime started | BLOCKED_BY_E01 / NOT_STARTED |
| Repository/config ready, awaiting owner start | READY_FOR_QUICK_TUNNEL_START | BLOCKED_BY_E01 / NOT_STARTED |
| Tunnel active, public QA/preservation pending | RUNNING | BLOCKED_BY_E01 / NOT_STARTED |
| All required actual runtime gates PASS | DONE — PERSISTENT_QUICK_TUNNEL | QUEUED / READY; await Project Owner |

No RC01 work starts automatically. Production hostname migration is a future Named Tunnel decision, not part of this Phase-1 demo migration.

## Phase-1 integration evidence — 2026-10-01

Repository implementation: **DONE**. These results validate repository behavior and simulated lifecycle operations; actual public/session/mobile/data-preservation and live URL-preservation results remain pending Phase 2.

| Gate | Actual Phase-1 result |
|---|---|
| Application Compose / tunnel Compose | PASS — both config validators |
| Shared network / origin service | PASS — named `mo-farm-frontend`, target `http://nginx:80` |
| Quick Tunnel contract / Named supersession | PASS |
| Start / status / stop / app update | PASS — lifecycle tests; real status reports container NOT_CREATED |
| Repeated healthy start | PASS — no build/up/migration; no tunnel recreation |
| App redeploy isolation | PASS — simulated update preserves container/process/URL; live proof pending |
| Restart/URL drift detection | PASS — same-container restarts and unexpected rotations fail closed |
| App failure rollback | PASS — previous app image tags restored; tunnel/database untouched |
| PUBLIC_ORIGIN / exact Origin / cookies | PASS — synthetic runtime equality and real local API negative-origin/Secure/HttpOnly tests |
| Rate limit / static root / PWA API exclusion / security headers | PASS — existing hardening gates retained |
| `npm run test:e01:security` | PASS — 37/37, no skips |
| `npm run e01:preflight` with actual local configuration | Expected BLOCKED_CONFIG — missing demo/PostgreSQL values and non-default secrets; every static check PASS |
| Preflight with safe synthetic pre-start configuration | PASS — no token/hostname/PUBLIC_ORIGIN required |
| Preflight with safe synthetic exact generated origin | PASS — no public URL created |
| `npm run assets:validate` / `assets:validate:strict` | PASS — 188 assets, 10 animations |
| `npm run assets:validate:wave1` | PASS — 112 approved Wave 1 assets |
| `npm run assets:validate:wave2` | PASS — 76 source-to-atlas frames, 9 contracts, 7 frozen frames |
| `npm run assets:validate:wave2-release` | PASS — 188/188 production_ready and approved, 0 placeholders |
| `npm run renderer:test` | PASS — 16/16 |
| `npm run test:api:full` | PASS — 20/20 |
| `npm run check` | PASS — syntax, localization and all aggregate gates |
| `docker compose build --quiet api web` | PASS — images built; no containers started |
| `git diff --check` | PASS |

The Wave 2 validator refreshed only its historical evidence timestamp; that generated-only change was restored. Application code, gameplay/economy, renderer, animation contracts, production assets and PostgreSQL schema remain unchanged.

Final Phase-1 state: B02 **DONE**; E01 deployment model **PERSISTENT_QUICK_TUNNEL**; repository implementation **DONE**; runtime **BLOCKED_CONFIG**; cloudflared **NOT_STARTED**; public URL **NOT_CREATED**; RC01 **BLOCKED_BY_E01 / NOT_STARTED**. No app/tunnel service was started or stopped. The next step requires the explicit Project Owner command to start the tunnel and perform the actual public QA and URL-preservation runtime test.
