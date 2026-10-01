> **SUPERSEDED / NON_CANONICAL / NOT_CURRENT_E01_RELEASE_PATH (2026-10-01).** Reason: `PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`. This is an unchanged historical record of an earlier Named Tunnel decision. Its requirements, commands, statuses and test results describe that earlier checkpoint only. The current official deployment is **PERSISTENT_QUICK_TUNNEL**; use [`E01_PERSISTENT_QUICK_TUNNEL.md`](E01_PERSISTENT_QUICK_TUNNEL.md).

<details>
<summary>Archived text from previous HEAD 0b12ec44a31a33afeaf237b75b5c74b95e61ec8a; all canonical/current claims inside describe that historical snapshot</summary>

# E01 — Persistent Named Tunnel lifecycle

Date: 2026-10-01
Previous baseline: `5c8132f`
Canonical deployment model: **NAMED_TUNNEL**
Scope: **repository correction only; runtime not authorized in this task**
E01 runtime: **BLOCKED_CONFIG** — real owner environment/token/hostname not validated
Cloudflared: **NOT_STARTED**
Named Tunnel: **NOT_STARTED**
RC01: **BLOCKED_BY_E01 / NOT_STARTED**

This is the canonical E01 deployment runbook. Project Owner confirmed the original plan requires a dedicated Cloudflare Named Tunnel, fixed hostname and tunnel token. The correction selectively retains independent lifecycle improvements from `5c8132f`; it does not blindly revert that commit. [`E01_PERSISTENT_QUICK_TUNNEL.md`](E01_PERSISTENT_QUICK_TUNNEL.md) remains **SUPERSEDED / NON_CANONICAL / DEBUG EXPERIMENT** history. Its tests/results describe that historical implementation and do not satisfy the restored release path.

## Ownership, dependencies and deliverables

- Task: E01 Named Tunnel restoration; owner: infrastructure/release integration.
- Dependencies: A03, B02, C03 and D02 DONE; required repository security/regression/Docker gates.
- Owned paths: Compose lifecycle/configuration, Named Tunnel contract, E01 tooling/tests and deployment documentation.
- Forbidden changes: gameplay/economy/content, renderer/animation/asset contracts, PostgreSQL schema/game state, real production secrets and unrelated containers.
- Deliverables: canonical Named Tunnel preflight/contract, independent cloudflared, idempotent start/status/tunnel-only stop, selective app update, static verification and audit of `5c8132f`.
- B02 remains DONE: 188 total assets, 188 production_ready, 188 approved, 0 placeholders.

Final classification of the relevant `5c8132f` changes and actual verification results are recorded by the Integration Owner after final regression. Static evidence and runtime evidence must remain distinct.

## Architecture and separate lifecycles

```text
Internet
  → https://<fixed-hostname>
  → dedicated Cloudflare Named Tunnel
  → persistent cloudflared (compose.tunnel.yaml, mo-farm-tunnel)
  → http://nginx:80
  → web / api
  → PostgreSQL (db)

Application: compose.yaml, project mo-farm
  db + api + web + nginx; one-shot init profile: migrate + seed
Tunnel: compose.tunnel.yaml, project mo-farm-tunnel
  cloudflared only

Frontend: stable mo-farm-frontend
  application-owned; external in tunnel Compose
Backend: application-private PostgreSQL/API connectivity
```

Cloudflared resolves `nginx` using Docker DNS on the shared network and reaches only `http://nginx:80`. API/web/PostgreSQL are not published on host ports; Nginx binds loopback only. Cloudflared has no build or application-service lifecycle dependency. API/web/Nginx selective recreation must never recreate or restart cloudflared.

Image: `cloudflare/cloudflared:2025.9.1`; `restart: unless-stopped`; bounded Docker log rotation. `TUNNEL_METRICS=0.0.0.0:2000` exposes cloudflared local readiness/metrics only inside the shared Docker network; it has no published host port. Canonical command and token transport:

```text
cloudflared tunnel --no-autoupdate run
TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
```

The owner-facing secret is `CLOUDFLARE_TUNNEL_TOKEN`; the container uses native `TUNNEL_TOKEN` environment. Never put token in command arguments or use `--token`. `--url http://nginx:80` is Quick Tunnel mode and is forbidden in the canonical release path. Token, session secret, password, cookies and database URL credentials must never be committed, printed, partially displayed or included in evidence.

## Canonical contract and fixed origin

`infra/cloudflared/named-tunnel-contract.json` is canonical:

```json
{
  "tunnelType": "named",
  "originService": "http://nginx:80",
  "tokenRequired": true,
  "fixedHostnameRequired": true,
  "hostnameSource": "CLOUDFLARE_HOSTNAME",
  "publicOriginSource": "PUBLIC_ORIGIN",
  "quickTunnelAllowed": false,
  "persistentContainerLifecycle": true,
  "appRedeployMustPreserveTunnel": true
}
```

Owner configuration supplies `CLOUDFLARE_HOSTNAME` and exact `PUBLIC_ORIGIN` before startup:

```text
PUBLIC_ORIGIN=https://<fixed-hostname>
host(PUBLIC_ORIGIN) == CLOUDFLARE_HOSTNAME
Published Named Tunnel hostname → http://nginx:80
```

Reject localhost, IP literals, HTTP, trycloudflare domains and wildcard origins. PUBLIC_ORIGIN is a canonical HTTPS origin with no credentials, path, query or fragment; hostname/origin matching must remain exact. No runtime origin bootstrap, generated URL scraping or automatic PUBLIC_ORIGIN replacement exists in canonical E01.

The public hostname remains fixed across normal app updates and cloudflared process/container restarts while the owner retains the configured Named Tunnel route. Connectivity may be interrupted while a process or origin is down; configured hostname stability is not an availability guarantee.

Quick Tunnel is temporary development/debug history only. Its contract is noncanonical and cannot pass E01 release preflight. Canonical tooling does not read or write `.runtime/quick-tunnel.json` or `.runtime/quick-tunnel.env`; no generated origin/runtime URL files are required. The only lifecycle runtime metadata is the ignored exclusive `.runtime/named-tunnel.lock/owner.json` directory lock with PID/createdAt. Do not put secrets in lock metadata.

## Repository-only validation and prerequisites

Do not start PostgreSQL for public deployment, application containers, cloudflared, Quick Tunnel or RC01; do not contact Cloudflare, publish a hostname or perform public QA in this correction task. Config/build/static tests are allowed and do not establish actual public runtime success.

Read-only preflight:

```powershell
npm run e01:preflight
```

Required owner environment:

- `PERSISTENCE_DRIVER=postgres`;
- `APP_ENV=demo`;
- `COOKIE_SECURE=true`;
- exact fixed `PUBLIC_ORIGIN=https://<CLOUDFLARE_HOSTNAME>`;
- valid nonplaceholder `CLOUDFLARE_HOSTNAME`;
- valid nondefault `SESSION_SECRET`, at least 32 characters;
- valid nondefault `POSTGRES_PASSWORD`, at least 16 characters;
- valid nondefault PostgreSQL `DATABASE_URL` for the internal database;
- valid nonplaceholder `CLOUDFLARE_TUNNEL_TOKEN`.

Secret reports contain variable names and only SET/MISSING/INVALID/DEFAULT/PLACEHOLDER, never values or fragments. Current owner environment is not validated, so actual preflight/runtime remains BLOCKED_CONFIG. Synthetic test configuration proves static behavior only, requires no real token and does not authorize runtime.

Required repository checks:

```powershell
npm run test:e01:security
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

Also verify compatible shared network configuration, tunnel image-only/no public port, native token transport, persistent restart policy and no cloudflared command in selective application update. Final check results and commit audit are added by the Integration Owner.

## Future runtime start

Do not execute these commands in this correction task. The owner first supplies secure ignored local environment, dedicated Named Tunnel token and fixed hostname/route, reruns preflight, and gives a separate runtime instruction.

```powershell
npm run e01:tunnel:start
```

Start validates preflight, builds/starts the internal application only as required, waits for PostgreSQL and runs the existing idempotent migration job, verifies API/web/Nginx readiness and checks cloudflared state. Reuse a healthy existing Named Tunnel without recreate; a stopped/not-created tunnel may be started. Validate the existing service against pinned command/image/network/restart/token contract before reuse. Wait for locally observed Named Tunnel connection, then smoke the fixed HTTPS `/`, `/api/health/ready` and `/healthz` endpoints. PUBLIC_ORIGIN stays fixed throughout; no URL discovery is performed.

Healthy repeated start is idempotent and validates without build/up/migration or cloudflared recreation. Start success alone does not close the full E01 public QA gate.

## Selective application update

```powershell
# Build/recreate API/web; reload Nginx to resolve new upstream IPs.
npm run e01:app:update

# Also selectively recreate Nginx for a configuration change.
npm run e01:app:update -- --nginx
```

Record cloudflared ID, StartedAt, RestartCount and configured fixed PUBLIC_ORIGIN. Build/recreate only API/web, optionally recreate Nginx, refresh upstream routing and wait for application readiness. Never recreate PostgreSQL or delete its volume. Verify the same tunnel container/process and fixed PUBLIC_ORIGIN afterward, then run public smoke only in an authorized runtime phase. Unexpected tunnel lifecycle or origin change reports `TUNNEL_LIFECYCLE_REGRESSION`.

Do not run `docker compose down` across the tunnel stack or `--force-recreate cloudflared` for normal app deployment. On app failure, repair/restart/roll back only affected app services while leaving the tunnel alive. Temporary Nginx downtime may produce origin errors until readiness returns; the configured fixed hostname remains unchanged.

## Read-only status and tunnel-only stop

```powershell
npm run e01:tunnel:status
npm run e01:tunnel:stop

# Bounded recent tunnel logs; never include credentials in copied evidence.
docker compose -f compose.tunnel.yaml logs --tail 100 cloudflared
```

Status reports cloudflared RUNNING/STOPPED, Named Tunnel CONNECTED/DISCONNECTED/NOT_STARTED, Nginx/API/PostgreSQL health, PUBLIC_ORIGIN MATCH/MISMATCH, hostname CONFIGURED/INVALID and separate tunnelConfiguration MATCH/MISMATCH. It probes internal `http://cloudflared:2000/ready` with Node in a running API or web container, independently of Nginx health: HTTP 200 means CONNECTED and 503 means DISCONNECTED. When both probe containers are stopped or the local endpoint is unreachable, the connection result is UNVERIFIED because disconnection cannot be established. Process RUNNING, historical logs or missing/changed local token alone must not invent connection/disconnection. Status makes no public hostname/Cloudflare requests, mutates no state and prints no token/session/password/database credentials. Runtime start still waits for positively verified CONNECTED before public smoke.

Stop stops cloudflared only. It does not delete database volume, reset farm state or invalidate/change the configured fixed hostname. Public service becomes unavailable while the tunnel is stopped; the hostname is not a stale generated URL.

Lifecycle commands use the ignored `.runtime/named-tunnel.lock/owner.json` directory lock. If interruption leaves a stale lock, verify its PID and prove no lifecycle CLI is active before removing only owner.json and the empty directory. Never clear an active lock or restart a healthy tunnel to clear a lock.

## Security and pending runtime acceptance

Keep the web static allowlist, internal-path/symlink/traversal protection, bounded API limiter/429, trusted proxy normalization, body limit, CSP, HSTS policy, nosniff, Referrer-Policy, frame/Permissions-Policy protection, Secure/HttpOnly cookies, exact-origin validation and PWA bypass of `/api/**`. Nginx remains the application ingress; PostgreSQL and API must not become directly public.

Actual runtime QA is NOT_STARTED and must verify HTTPS smoke, display-name enter/bootstrap, 188 approved assets, session/refresh/idempotent mutation, Secure/HttpOnly/canonical SameSite cookie, negative static paths, a controlled bounded API rate-limit 429, mobile viewports 932×430/915×412/844×390/740×360 and persistent farm state. Perform a real API/web redeploy and optional Nginx recreation, proving identical cloudflared ID/StartedAt/RestartCount and fixed PUBLIC_ORIGIN plus working public endpoint/data. Static lifecycle mocks do not replace this evidence.

After repository gates PASS, repository hardening and lifecycle isolation can be DONE while actual E01 runtime stays BLOCKED_CONFIG and cloudflared/Named Tunnel NOT_STARTED. RC01 remains BLOCKED_BY_E01 / NOT_STARTED. E01 runtime becomes DONE only after actual required runtime gates PASS; RC01 then becomes QUEUED / READY and awaits Project Owner, never starts automatically.

</details>
