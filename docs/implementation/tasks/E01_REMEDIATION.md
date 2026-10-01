# E01 repository remediation

> **CANONICAL NAMED TUNNEL RESTORED after `5c8132f`.** Keep the chronological supersession notice and original remediation results below. The security hardening remains required; current native token/fixed origin and separate lifecycle workflow: [`E01_PERSISTENT_NAMED_TUNNEL.md`](E01_PERSISTENT_NAMED_TUNNEL.md).

> **HISTORICAL INTERMEDIATE CHECKPOINT — SUPERSEDED / NON_CANONICAL.** The remediation evidence below preserves the temporary Quick Tunnel checkpoint. Static-root/rate-limit/proxy/PWA hardening and Named Tunnel token/hostname/Quick Tunnel rejection remain current requirements. The active runbook is [`E01_PERSISTENT_NAMED_TUNNEL.md`](E01_PERSISTENT_NAMED_TUNNEL.md).

Date: 2026-10-01
Status: `BLOCKED_CONFIG` (repository hardening complete; owner-only runtime configuration is still absent)

This record closes the repository-side E01 remediation items. It does not start Docker's `public` profile, Cloudflare, a Quick Tunnel, a public hostname, or RC01. Secrets and hostname values remain outside Git and are never included in this report.

FIX-01 through FIX-06 were executed as independent parallel workstreams. The Integration Owner then reconciled the shared Compose, proxy, package-script, contract, and documentation changes before running the gates below.

## Six remediation tasks

| Task | Result | Evidence |
|---|---|---|
| E01-FIX-01 Web static root hardening | PASS | `apps/web/server.mjs`, staged `/app/apps/web/public` artifact, `tests/web/static-server.test.mjs` |
| E01-FIX-02 Cloudflared token transport | PASS | `compose.yaml`: pinned image, native `TUNNEL_TOKEN`, `tunnel --no-autoupdate run` |
| E01-FIX-03 Named Tunnel contract | PASS | `infra/cloudflared/named-tunnel-contract.json`, `tests/e01/proxy-security.test.mjs` |
| E01-FIX-04 API rate limiting | PASS | `apps/api/src/security/rateLimiter.mjs`, API wiring, `apps/api/test/rate-limiter.test.mjs` |
| E01-FIX-05 Proxy and HTTPS headers | PASS | `infra/nginx/nginx.conf`, `infra/nginx/conf.d/default.conf`, proxy security test |
| E01-FIX-06 Automated preflight | PASS | `tools/e01-preflight.mjs`, `tests/e01-preflight.test.mjs`, `npm run e01:preflight` |

## Contract now enforced

- Named Tunnel ingress target is the machine-readable value `http://nginx:80`.
- `CLOUDFLARE_HOSTNAME` and `PUBLIC_ORIGIN` must be supplied outside Git and must match exactly as an HTTPS hostname/origin pair.
- Cloudflared receives its token only through native `TUNNEL_TOKEN`; command arguments never contain a token.
- Quick Tunnel flags and `trycloudflare.com` are rejected by preflight.
- The web server exposes shell files and an allowlisted staged artifact/runtime tree. Source, server, Docker, repository, and directory-listing paths return 404.
- API requests use a bounded, expiring, non-cookie rate-limit key and return `429` with `Retry-After`. Health endpoints remain available for readiness checks.
- Nginx removes client-supplied forwarded chains, sets trusted proxy headers, limits request bodies, and emits security headers including conditional HSTS, CSP, Permissions-Policy, and `server_tokens off`.
- The service worker bypasses `/api/**` and never includes API paths in its static cache list.

## Verification

- `npm run test:e01:security`: PASS (15 tests).
- `npm run check:syntax`: PASS.
- `node tools/e01-preflight.mjs --json` with a synthetic valid environment: all repository/static checks PASS; no values are printed.
- With the actual local environment (currently absent), preflight returns `BLOCKED_CONFIG` and exit code 2. This is expected until the owner supplies non-default PostgreSQL, session, hostname, origin, cookie, and Cloudflare values through an ignored local environment.
- No container or tunnel was started during remediation.

## Next owner action

Configure the required values in the local ignored environment, then rerun the complete E01 runtime preflight. Confirm the Named Tunnel reaches only Nginx, readiness reflects PostgreSQL, no secret appears in logs, and rollback works. RC01 remains blocked until that runtime preflight passes.
