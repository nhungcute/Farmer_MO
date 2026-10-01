> **SUPERSEDED / NON_CANONICAL / NOT_CURRENT_E01_RELEASE_PATH (2026-10-01).** Reason: `PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`. This is an unchanged historical record of an earlier Named Tunnel decision. Its requirements, commands, statuses and test results describe that earlier checkpoint only. The current official deployment is **PERSISTENT_QUICK_TUNNEL**; use [`E01_PERSISTENT_QUICK_TUNNEL.md`](E01_PERSISTENT_QUICK_TUNNEL.md).

<details>
<summary>Archived text from previous HEAD 0b12ec44a31a33afeaf237b75b5c74b95e61ec8a; all canonical/current claims inside describe that historical snapshot</summary>

# E01 - Cloudflare Named Tunnel preflight

> **CANONICAL NAMED TUNNEL RESTORED after `5c8132f`.** The supersession notice and findings below preserve the original timeline/evidence. Current token/fixed-hostname/exact-origin preflight and independent lifecycle: [`E01_PERSISTENT_NAMED_TUNNEL.md`](E01_PERSISTENT_NAMED_TUNNEL.md). Old token-expansion/public-profile blockers describe the earlier implementation, not the current restored contract.

> **HISTORICAL INTERMEDIATE CHECKPOINT — SUPERSEDED / NON_CANONICAL.** The preflight findings below preserve the original timeline, including the temporary Quick Tunnel decision. The restored canonical preflight requires the Named Tunnel token, fixed hostname and exact HTTPS origin described in [`E01_PERSISTENT_NAMED_TUNNEL.md`](E01_PERSISTENT_NAMED_TUNNEL.md). Do not use the historical Quick Tunnel workflow as an E01 release path.

| Field | Value |
|---|---|
| Task | E01 - Cloudflare Named Tunnel |
| Run date | 2026-10-01 |
| Baseline | `4cf33ebda81f4f122df15be707c28c051f3ca225` |
| Scope | Read-only preflight; no public profile or tunnel started |
| Result | **BLOCKED_CONFIG** with **BLOCKED_SECURITY** findings |
| RC01 | `BLOCKED_BY_E01`, not started |

The Project Owner opened E01. The eight preflight tasks ran independently and did not edit shared files. The Integration Owner did not start the Docker public profile because required values are absent and public security blockers remain.

## Preflight results

| Task | Status | Files changed | Result |
|---|---|---|---|
| E01-01 Environment / secret | **BLOCKED_CONFIG** | None | Required production values are missing, defaulted, or placeholders. |
| E01-02 Docker / cloudflared | **BLOCKED_CONFIG** | None | Compose structure is valid, but token argument expansion and Named Tunnel ingress evidence are unresolved. |
| E01-03 Nginx / public origin | **BLOCKED_SECURITY** | None | Nginx routing is valid, but the web server exposes the whole `apps/web` tree and no fixed HTTPS origin is configured. |
| E01-04 API / PostgreSQL readiness | PASS (static) | None | PostgreSQL readiness, migration path, and no-fallback code paths are present; runtime proof is blocked by E01-01. |
| E01-05 Session / cookie / origin security | **BLOCKED_SECURITY** | None | Cookie/origin checks and request limits exist, but no effective rate limiter or public HTTPS/HSTS evidence was found. |
| E01-06 PWA / service worker | PASS (static) | None | Local Pixi bundle is present and `/api/**` is excluded from service-worker caching. Public HTTPS verification is pending. |
| E01-07 Public network / health QA plan | PASS (plan) | None | Smoke sequence and mobile viewport checks are defined; no public endpoint was contacted. |
| E01-08 Regression / release boundary | PASS | None | B02 and asset invariants are unchanged; RC01 remains not started. |

## Required environment status

Values are intentionally not printed.

```text
PERSISTENCE_DRIVER=DEFAULT        # effective file mode; E01 requires postgres
APP_ENV=DEFAULT                   # effective local mode; E01 requires demo
PUBLIC_ORIGIN=DEFAULT             # derives http://localhost:8080
COOKIE_SECURE=DEFAULT             # effective false
SESSION_SECRET=PLACEHOLDER        # repository example value
POSTGRES_PASSWORD=PLACEHOLDER     # repository example value
CLOUDFLARE_TUNNEL_TOKEN=MISSING   # no local injected value
CLOUDFLARE_HOSTNAME=PLACEHOLDER   # example hostname only
```

Required values before a retry:

```text
PERSISTENCE_DRIVER=postgres
APP_ENV=demo
PUBLIC_ORIGIN=https://<fixed-cloudflare-hostname>
COOKIE_SECURE=true
SESSION_SECRET=<non-default secret, at least 32 characters>
POSTGRES_PASSWORD=<non-default secret>
CLOUDFLARE_TUNNEL_TOKEN=<named-tunnel token>
CLOUDFLARE_HOSTNAME=<fixed hostname matching PUBLIC_ORIGIN>
```

Secrets must remain in a local ignored environment or secret store. They must not be pasted into chat, written to tracked files, or printed in logs, test output, or reports.

## Configuration and security blockers

1. `compose.yaml` uses the pinned `cloudflare/cloudflared:2025.9.1` image and waits for healthy Nginx. API and PostgreSQL have no host ports. The required origin `http://nginx:80` is documented, but no tracked Cloudflare ingress configuration or machine-checked mapping exists. The actual Named Tunnel route must be verified in the Cloudflare tunnel configuration.
2. The current Compose command uses `$${CLOUDFLARE_TUNNEL_TOKEN}` in a non-shell command. `docker compose --profile public config` renders the escaped expression literally; a real injected-token startup must prove that cloudflared receives the token. Do not start it with the current unverified behavior.
3. `apps/web/server.mjs` serves from the complete `apps/web` directory, and the web image copies that directory. Paths such as `/server.mjs`, `/Dockerfile`, `/README.md`, `/renderer-demo.html`, and `/src/*` are therefore publicly reachable through Nginx. The public image must serve only the intended public artifact or explicitly deny internal paths, with negative exposure tests.
4. The API has a 256 KiB JSON limit and exact `PUBLIC_ORIGIN` checks, but no effective rate-limiting implementation was found. Public HTTPS/HSTS and trusted-proxy behavior also require edge verification. E01 remains blocked until the critical controls are resolved or explicitly accepted by the owner.

## Static checks completed

```text
docker compose config --quiet                   PASS
docker compose --profile public config --quiet  PASS (syntax only; no token)
B02 asset inventory                             188 total / 188 production_ready / 188 approved / 0 placeholder
Wave 1 validator                                PASS
Wave 2 runtime validator                        PASS
Wave 2 release validator                        PASS
Renderer                                         16/16 PASS
API full tests                                   17/17 PASS
```

No services, PostgreSQL instance, cloudflared process, random Quick Tunnel, or public URL was started. No PNG, gameplay, economy, renderer, animation, or asset contract was changed.

## Retry gate

Do not start `docker compose --profile public up cloudflared` until all of the following are true:

- all required environment values are SET and non-default;
- the token is passed to cloudflared without being printed;
- the Named Tunnel hostname is fixed and maps to exactly `http://nginx:80`;
- the public web root cannot expose server/source/config files;
- rate limiting, security headers, CSP, trusted-proxy and HTTPS behavior have evidence;
- PostgreSQL migration and `/api/health/ready` pass through Nginx;
- public functional, mobile and PWA smoke tests pass;
- the full final validation command set passes again.

E01 status is **BLOCKED_CONFIG**. RC01 stays **BLOCKED_BY_E01 / NOT_STARTED**. Quick Tunnel fallback is prohibited.

</details>
