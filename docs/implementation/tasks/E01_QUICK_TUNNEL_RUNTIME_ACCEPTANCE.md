# E01 — Persistent Quick Tunnel runtime acceptance

Date: **2026-10-01, Asia/Bangkok (UTC+07:00)**. Runtime acceptance ran **11:59:27–12:02:48** local time (`04:59:27.762Z`–`05:02:48.767Z`).

**E01: DONE — PERSISTENT_QUICK_TUNNEL.** Runtime remains **RUNNING / CONNECTED** at [the public demo](https://francisco-ohio-camcorder-industrial.trycloudflare.com). Actual preflight PASS; PostgreSQL/API/web/Nginx healthy; exact PUBLIC_ORIGIN MATCH. B02 remains DONE. **RC01: QUEUED / READY, NOT_STARTED**; await a separate Project Owner command.

This records actual Phase-2 acceptance after the Project Owner continuation request. The [canonical runbook](E01_PERSISTENT_QUICK_TUNNEL.md) and [Phase-1 restoration report](E01_CANONICAL_QUICK_TUNNEL_RESTORATION.md) retain earlier repository-only evidence separately. Named Tunnel remains SUPERSEDED / NON_CANONICAL / NOT_CURRENT_E01_RELEASE_PATH.

## Evidence

- [Runtime acceptance, redeploy, persistence and final rate-limit result](../evidence/e01-2026-10-01/runtime-qa.json).
- [Public HTTPS, API, Origin, cookie, static-boundary and asset checks](../evidence/e01-2026-10-01/public-qa.json).
- [Mobile browser, touch, layout and PWA checks](../evidence/e01-2026-10-01/mobile-qa.json).
- [Read-only verification after interruption](../evidence/e01-2026-10-01/resume-verification.json).
- [SHA-256 checksums for the archived JSON reports and screenshots](../evidence/e01-2026-10-01/SHA256SUMS.txt).

The public report's rate-limit field is the earlier NOT_RUN checkpoint. The rate-limit test subsequently completed after functional/mobile QA; the final PASS, request count, Retry-After and recovery are in `runtime-qa.json`.

## Actual tunnel preservation

Repeated `npm run e01:quick:start` returned `TUNNEL_ALREADY_RUNNING` and retained tunnel identity. A real `npm run e01:app:update -- --nginx` rebuilt/recreated API, web and Nginx; the tunnel and PostgreSQL container remained unchanged.

| Tunnel field | Before app redeploy | After app redeploy |
|---|---|---|
| Public URL | `https://francisco-ohio-camcorder-industrial.trycloudflare.com` | `https://francisco-ohio-camcorder-industrial.trycloudflare.com` |
| Container ID | `09bdb7c21343bc44085f16bdb35531c8cddf92e81996f6ab8091fca08bd3ca09` | `09bdb7c21343bc44085f16bdb35531c8cddf92e81996f6ab8091fca08bd3ca09` |
| StartedAt | `2026-10-01T04:52:44.115964882Z` | `2026-10-01T04:52:44.115964882Z` |
| RestartCount | `0` | `0` |

| Application service | Container ID before | Container ID after | Result |
|---|---|---|---|
| API | `7857f763948bb805e075c8be2c62d1e13b71ccaf8d14258b39a23d9c17fc3d7c` | `924ec0e1d0de87e65944f7ccb3224af94b9467bc5a3c041d09f87a34de9d7f30` | CHANGED |
| web | `7023b577613964ec237c009fe7fb4700fb8b7e687e06c9caff1a19f39e9fb7f3` | `447b2816ccfda8a4dedbf7355562f3079140286219f3d1b24d45585e49d59abc` | CHANGED |
| Nginx | `ac19d38a11474a501c8f7407cef3c4e7b0d4e6fd40cc6c8228255c7040c5e143` | `8ee5c4432c706affecc86d590ac6d6a4e0d9ff5d5b54a96adc8480b2cc921a78` | CHANGED |
| PostgreSQL | `2ba8639c0172148c40beb2d8f555f2e1b56547daae542b5a21420c71b9bce209` | `2ba8639c0172148c40beb2d8f555f2e1b56547daae542b5a21420c71b9bce209` | UNCHANGED |

**PASS — QUICK TUNNEL URL PRESERVED DURING APP REDEPLOY.** Public application health, the same session/character/farm, harvested crop state, inventory and persisted idempotency replay all passed after redeploy; the browser resumed successfully. Scope: **SAME CLOUDFLARED LIFETIME**. No deliberate tunnel restart/stop was performed. The URL remains ephemeral and may change after process/session/container restart or Cloudflare termination; `unless-stopped` does not make it permanent.

## Public API and security acceptance

| Gate | Actual result |
|---|---|
| HTTPS `/` and `/api/health/ready` | PASS — HTTP 200, TLS verified, PostgreSQL persistence ready |
| Display-name entry, session and bootstrap | PASS — browser entry, canvas visible, private session; unauthenticated bootstrap 401 |
| Safe idempotent mutation | PASS — starter rice harvest added 3 rice, left 2 crops; retry response matched |
| Session cookie | PASS — present, Secure, HttpOnly, canonical SameSite policy, Path=/; no session token in response body |
| Exact Origin | PASS — captured origin allowed; other trycloudflare session, wildcard origin, null and deceptive suffix all rejected with 403 |
| Headers | PASS — CSP self, HSTS, nosniff, Referrer-Policy, frame protection and Permissions-Policy |
| Static negative paths | PASS — all 15 requests returned 404, including all 10 required paths and traversal probes |
| Approved assets | PASS — 188/188 approved and production-ready, 0 placeholders, all 188 frames covered |
| Public atlas bytes | PASS — 6 atlas pages, 12 JSON/PNG URLs HTTP 200; every SHA-256 matched repository bytes |
| Browser/PWA | PASS — zero page/console errors, zero failed assets, zero cached `/api/**` entries |
| API rate limit | PASS — bounded burst reached application 429 within 120 requests (cap 125, concurrency 4), Retry-After 37 seconds; recovered to expected unauthenticated 401 |

Required public static negatives: `/server.mjs`, `/Dockerfile`, `/README.md`, `/package.json`, `/src/main.js`, `/.env`, `/.git/config`, `/node_modules/`, `/tools/`, `/docs/`. Additional 404 checks cover `/renderer-demo.html`, `/src/`, double-encoded traversal, encoded parent slash and backslash traversal. Exact request paths and results remain in the public JSON evidence.

## Mobile acceptance

| Viewport | DPR | Result | Screenshot |
|---|---|---|---|
| 932×430 | 2 | PASS | [932×430](../evidence/e01-2026-10-01/mobile-932x430.png) |
| 915×412 | 2 | PASS | [915×412](../evidence/e01-2026-10-01/mobile-915x412.png) |
| 844×390 | 2 | PASS | [844×390](../evidence/e01-2026-10-01/mobile-844x390.png) |
| 740×360 | 2 | PASS | [740×360](../evidence/e01-2026-10-01/mobile-740x360.png) |

All four touch-enabled landscape viewports had document/body dimensions equal to the viewport, no page overflow, visible correctly sized Canvas fallback with DPR-2 backing dimensions and named 44-pixel-high controls. Touch selection of the plant and inspect tools passed. Some trailing toolbar controls were outside the initial viewport; this acceptance does not claim that every control was simultaneously visible or individually exercised. Session reload and name-entry screen open/close passed. All 12 atlas files loaded; no critical JavaScript errors or failed assets occurred. The secure service worker controlled each page with 41 cached entries and no API entries. The current UI has no separate content panel; the open/close check exercised the name-entry screen.

## Runtime corrections and retained data

The first public check found duplicate `X-Content-Type-Options: nosniff` from upstream web plus Nginx. Adding `proxy_hide_header X-Content-Type-Options` at Nginx server scope kept one canonical header for both web and API proxy responses. Nginx-only reload preserved the tunnel, public header checks passed, and `npm run test:e01:security` was rerun **52/52 PASS**.

Ignored `.env` supplies cryptographically generated session/database secrets. The existing PostgreSQL volume was retained; its role password was synchronized with the ignored configuration so Docker network authentication succeeds. No game data or volume was deleted. Local Nginx uses `127.0.0.1:8081` because port 8080 belongs to an unrelated service. No secret values, cookie values or database connection credentials are recorded here.

## Verification after interruption

At **13:20:54 Asia/Bangkok** (`2026-10-01T06:20:54.232Z`), read-only checks confirmed the accepted tunnel URL, full container ID, StartedAt and RestartCount were unchanged. API, web, Nginx and PostgreSQL retained their post-redeploy container IDs and remained healthy. Runtime preflight passed; public `/`, `/api/health/ready` and `/healthz` returned HTTP 200 with one `X-Content-Type-Options: nosniff` value. PostgreSQL readiness and exact PUBLIC_ORIGIN matched. The E01 regression suite passed **52/52** again, and `nginx -t` passed. No redeploy or tunnel lifecycle operation was performed during this continuation.

The original seven JSON reports and four screenshots were copied unchanged from ignored local QA output into the evidence directory. The additional resumption report records the checks above; `SHA256SUMS.txt` covers all twelve JSON/image artifacts. The earlier rate-limit NOT_RUN checkpoint remains intact, with its final result in the runtime report as noted above.

All required E01 runtime gates are complete. Preserve the running tunnel during subsequent application maintenance. RC01 remains QUEUED / READY and NOT_STARTED until separately requested by Project Owner; this E01 acceptance is not RC01 sign-off or a production SLO/RPO/RTO claim.
