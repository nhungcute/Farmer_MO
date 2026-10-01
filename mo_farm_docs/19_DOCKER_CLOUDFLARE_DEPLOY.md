# 19 — DOCKER & CLOUDFLARE DEPLOYMENT

Canonical E01 deployment: **NAMED_TUNNEL** — dedicated Cloudflare Named Tunnel, fixed hostname, native environment token transport and ingress `http://nginx:80`. Independent cloudflared lifecycle introduced in `5c8132f` is retained. Quick Tunnel migration is historical/noncanonical; current runbook: [`E01_PERSISTENT_NAMED_TUNNEL.md`](../docs/implementation/tasks/E01_PERSISTENT_NAMED_TUNNEL.md).

## 1. Separate application and tunnel lifecycles

```text
APPLICATION: compose.yaml (mo-farm)
  db (PostgreSQL) + api + web + nginx
TUNNEL: compose.tunnel.yaml (mo-farm-tunnel)
  cloudflared

Internet → https://<fixed-hostname> → Cloudflare Named Tunnel
         → persistent cloudflared → http://nginx:80 → web / api → PostgreSQL
```

Application Compose owns stable network `mo-farm-frontend`; tunnel Compose joins it with `external: true`. Cloudflared resolves `nginx` through Docker DNS. Tunnel is image-only, with no build or application dependency. Only Nginx binds loopback `127.0.0.1:8080:80`; API, web and PostgreSQL have no host-published ports.

## 2. Repository correction only

Do not start application containers, PostgreSQL public runtime, cloudflared or RC01, contact Cloudflare, publish hostname or perform public QA in this correction task. Config validation and Docker image build do not start runtime.

```powershell
npm run e01:preflight
docker compose config --quiet
docker compose -f compose.tunnel.yaml config --quiet
```

Current runtime is **BLOCKED_CONFIG**: real owner environment, fixed hostname and Named Tunnel credentials are not yet validated. Cloudflared and Named Tunnel are **NOT_STARTED**; RC01 remains **BLOCKED_BY_E01 / NOT_STARTED**. Repository hardening and lifecycle isolation are signed off separately from actual runtime gates.

## 3. Named Tunnel configuration

Pinned image: `cloudflare/cloudflared:2025.9.1`; restart policy: `unless-stopped`; bounded log rotation.

```text
cloudflared tunnel --no-autoupdate run
TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
PUBLIC_ORIGIN=https://<CLOUDFLARE_HOSTNAME>
```

Token is supplied through the container environment, never command arguments. The owner provisions a dedicated Named Tunnel and fixed published hostname pointing only to `http://nginx:80`. Do not put token/password/cookies/database credentials in Git, logs or evidence. Do not use Quick Tunnel `--url` or `--token` arguments in canonical E01.

Active contract: `infra/cloudflared/named-tunnel-contract.json`. Preflight requires `PERSISTENCE_DRIVER=postgres`, `APP_ENV=demo`, `COOKIE_SECURE=true`, non-default session/database secrets, valid `DATABASE_URL`, `CLOUDFLARE_TUNNEL_TOKEN`, `CLOUDFLARE_HOSTNAME` and exact fixed HTTPS `PUBLIC_ORIGIN`. Its hostname must match CLOUDFLARE_HOSTNAME; localhost/IP/HTTP/trycloudflare/wildcard origins are rejected.

There is no runtime URL discovery, bootstrap origin or generated PUBLIC_ORIGIN. The canonical workflow does not depend on `.runtime/quick-tunnel.json` or `.runtime/quick-tunnel.env`.

## 4. Future runtime operator commands

Use only after the separate Project Owner runtime instruction and valid owner configuration:

```powershell
# Start/reuse Named Tunnel and validate fixed HTTPS public smoke.
npm run e01:tunnel:start
npm run e01:tunnel:status

# Selective API/web update, refresh Nginx routing, preserve cloudflared.
npm run e01:app:update
npm run e01:app:update -- --nginx

# Stop cloudflared only; retain application/database and fixed hostname config.
npm run e01:tunnel:stop
```

A healthy repeated start validates the existing tunnel without recreating it. App update builds/recreates API/web and refreshes Nginx upstream routing; `--nginx` selectively recreates Nginx. Never run tunnel `docker compose down` or `--force-recreate cloudflared` during normal app deployment. Verify tunnel container ID, StartedAt, RestartCount and fixed PUBLIC_ORIGIN before/after; unexpected changes report `TUNNEL_LIFECYCLE_REGRESSION`.

Stop does not delete data or turn a fixed Named Tunnel hostname into a stale generated URL. The endpoint is unavailable while disconnected, but its configured hostname remains fixed. Status is read-only, uses local connection/readiness evidence and makes no public endpoint requests.

## 5. Runtime acceptance still pending

Fixed hostname and PUBLIC_ORIGIN must remain unchanged after API/web rebuild and Nginx recreation. Independent container lifecycle avoids disrupting cloudflared during normal application deployment. Repair failing app services while leaving the tunnel alive.

Actual runtime QA must verify HTTPS smoke, enter/bootstrap/session/refresh/idempotent mutation, 188 approved assets, mobile matrix, static negative paths, browser Secure/HttpOnly/SameSite cookie, exact-origin validation, controlled bounded API 429 and persistence across a real selective update. Static/mock tests do not prove public operation. RC01 stays blocked until E01 actual runtime gates DONE, then becomes QUEUED / READY and waits for Project Owner.
