# E01 Named Tunnel restoration audit

Date: 2026-10-01
Previous HEAD: 5c8132f66ec11ed9fe3733317ddc2344eba3678f
Canonical deployment after correction: **NAMED_TUNNEL**
Scope: repository correction only; no blind revert, runtime startup, Cloudflare contact, hostname publication, public QA or RC01.

## Decisions for every changed path in 5c8132f

All 41 changed paths were inspected and classified below. A MODIFY entry can retain compatible subparts while replacing Quick-specific semantics; a SUPERSEDE entry preserves historical evidence without making it an active workflow.

| Previous changed path | Decision | Applied treatment |
|---|---|---|
| .dockerignore | KEEP | Keep .runtime excluded from build contexts. |
| .env.example | MODIFY | Restore token/hostname variables and fixed HTTPS origin guidance; no actual credentials. |
| .gitignore | KEEP | Keep local secrets and .runtime ignored. |
| MO_FARM_MERGE_ANIMATION_RENDERER_GUIDE.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| README.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| compose.tunnel.yaml | MODIFY | Keep independent project/network/restart/log limits; replace Quick command with Named run and native token mapping; readiness metrics stay internal. |
| compose.yaml | KEEP | Application services stay separate; explicitly named mo-farm-frontend remains. |
| docs/implementation/IMPLEMENTATION_STATUS.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| docs/implementation/TASK_DEPENDENCIES.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| docs/implementation/tasks/B02_PRODUCTION_ARTWORK.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| docs/implementation/tasks/E01_CLOUDFLARE_NAMED_TUNNEL.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| docs/implementation/tasks/E01_CLOUDFLARE_NAMED_TUNNEL_PREFLIGHT.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| docs/implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md | SUPERSEDE | Keep 5c8132f history and past test evidence; label SUPERSEDED / NON_CANONICAL / DEBUG EXPERIMENT, link current Named runbook. |
| docs/implementation/tasks/E01_PREFLIGHT_VALIDATOR.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| docs/implementation/tasks/E01_REMEDIATION.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| docs/implementation/tasks/RC01_RELEASE_CANDIDATE.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| docs/implementation/tasks/art/README.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| infra/cloudflared/named-tunnel-contract.json | MODIFY | Restore canonical Named contract with required fixed hostname/token, Nginx origin and persistent lifecycle invariants. |
| infra/cloudflared/quick-tunnel-contract.json | SUPERSEDE | Retain debugOnly=true, canonical=false, e01ReleasePath=false and explicit supersession reason; never satisfy E01 release preflight. |
| mo_farm_docs/00_MO_FARM_MASTER_SPEC.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/01_PRODUCT_VISION_AND_SCOPE.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/19_DOCKER_CLOUDFLARE_DEPLOY.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/20_PERFORMANCE_QA_TESTING.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/21_IMPLEMENTATION_ROADMAP.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/22_CODING_RULES_AND_ACCEPTANCE.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/23_HANDOFF_PROMPT_FOR_AI_CODER.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/27_INFRASTRUCTURE_AND_LOCAL_DEVELOPMENT.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/28_REQUIREMENT_TRACEABILITY_AND_QA.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/29_RISK_REGISTER.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/30_IMPLEMENTATION_STATUS.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| mo_farm_docs/README.md | MODIFY | Restore current Named Tunnel guidance/status/release relationships; retain separate lifecycle improvements and chronological evidence. |
| package.json | MODIFY | Replace Quick commands/syntax checks with Named tooling; preserve check and e01:app:update. |
| tests/e01-preflight.test.mjs | MODIFY | Keep negative config/lifecycle/hardening fixtures; require fixed Named credentials and reject Quick release paths. |
| tests/e01/proxy-security.test.mjs | MODIFY | Restore Named canonical contract assertion, mark Quick history debug-only and retain proxy/security assertions. |
| tests/e01/public-origin.test.mjs | MODIFY | Keep real local API exact-origin/session tests, bind fixed Named origin and reject Quick/wildcard origins. |
| tests/e01/quick-tunnel-runtime.test.mjs | MODIFY | Migrate into tests/e01/named-tunnel-runtime.test.mjs; preserve simulated isolation/rollback/lock/secrecy tests, replace Quick state cases with fixed-origin/connection cases. |
| tools/e01-preflight.mjs | MODIFY | Require fixed origin/hostname/token before startup; keep safe config loading, separate lifecycle checks and all hardening gates. |
| tools/lib/quick-tunnel-runtime.mjs | MODIFY | Adapt into tools/lib/named-tunnel-runtime.mjs, retaining lifecycle lock, safe Docker transport, inspections, app update and rollback; remove capture/generated-origin/state behavior. |
| tools/lib/quick-tunnel.mjs | REMOVE | Remove URL discovery/Quick validation; new Named helper validates fixed DNS/HTTPS. Retain lifetime comparison with fixed origin. |
| tools/quick-tunnel.mjs | MODIFY | Replace canonical CLI with tools/tunnel.mjs and e01:tunnel:start/status/stop. No Quick startup command remains. |
| tools/update-app.mjs | MODIFY | Reuse the same selective update entrypoint with Named runtime; keep --nginx option. |

## Preserved security and data boundaries

Static-root allowlist, internal-path/symlink/traversal protection, bounded rate limiter/429, trusted proxy normalization, body limit, CSP/HSTS/nosniff/referrer/frame/Permissions-Policy headers, exact-origin validation, Secure/HttpOnly sessions, PWA /api/** exclusion and private PostgreSQL/API ingress remain intact. Their application implementation predates 5c8132f; correction preserves it without editing application code. Production assets, game rules, renderer/animation contracts and SQL schemas remain untouched.

Compatible KEEP details inside modified tooling: hidden-window Docker execution with secret-safe diagnostics; exclusive owner/PID lifecycle lock; separate application/tunnel Compose projects; safe selected inspection fields; selective API/web recreation; Nginx DNS reload and optional recreation; previous-image rollback; container ID/StartedAt/RestartCount checks. Removed semantics: generated trycloudflare URL discovery/log scraping, bootstrap origin, runtime-generated PUBLIC_ORIGIN, Quick .json/.env state reads/writes, stale-URL handling and canonical e01:quick commands. Named stop retains the configured fixed origin.

## Repository verification

PASS values are repository, local tests or simulated lifecycle evidence. No real Named Tunnel token, fixed hostname routing or public endpoint has been verified.

| Gate | Result |
|---|---|
| Application, tunnel, combined Compose config | PASS |
| Shared network and Nginx-only origin contract | PASS |
| Token environment mapping, no token arguments, no Quick release path | PASS |
| Simulated isolated app redeploy, process/origin invariants and image rollback | PASS |
| Secret-safe status/inspection and internal-only connection probe | PASS |
| Actual local E01 preflight | Expected BLOCKED_CONFIG, exit 2; all static gates PASS |
| Safe synthetic Named configuration preflight | PASS in tests; no real credentials required |
| E01 security | PASS, 40/40, no skips |
| Assets and strict output | PASS, 188 total/production_ready/approved, 0 placeholders |
| Wave 1 | PASS, 112 approved assets |
| Wave 2 | PASS, 76 exact source-to-atlas frames, 9 contracts, 7 frozen frames |
| Wave 2 release | PASS, 188/188 total approved |
| Renderer | PASS, 16/16 |
| API full suite | PASS, 20/20 |
| Aggregate npm run check | PASS |
| Docker build api/web | PASS, images only; no service startup |
| git diff --check | PASS |

The Wave 2 validator's generated-only timestamp change is restored to retain historical evidence. Connection status distinguishes CONNECTED/DISCONNECTED from an unavailable local probe (UNVERIFIED); app/probe failure does not imply a connector disconnect. Fixed hostname routing and http://nginx:80 mapping require owner verification during an explicitly requested later runtime phase.

## Final repository state

B02: DONE; E01 repository hardening: DONE; E01 tunnel lifecycle isolation: DONE; E01 runtime: BLOCKED_CONFIG; cloudflared: NOT_STARTED; Named Tunnel: NOT_STARTED; RC01: BLOCKED_BY_E01 / NOT_STARTED.

Current workflow: [E01_PERSISTENT_NAMED_TUNNEL.md](E01_PERSISTENT_NAMED_TUNNEL.md). Project Owner must configure ignored local Named token, fixed hostname, exact HTTPS origin and demo/PostgreSQL environment, then rerun preflight. Runtime startup remains a separate explicit task.
