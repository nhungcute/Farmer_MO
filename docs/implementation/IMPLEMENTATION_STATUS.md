# MO Farm — Implementation Status

Update date: 2026-10-01
Mốc hiện tại: **M4 — Production Persistence / Release Candidate foundation**

Đây vẫn là prototype/demo. Dữ liệu farm không được coi là riêng tư. Người chơi vào thẳng farm bằng tên hiển thị; Tutorial không tồn tại trong runtime. Toàn bộ giao diện là tiếng Việt.

## Baseline đã hoàn thành

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| API/gameplay vertical slice | DONE | npm run test:api:full |
| Content definitions và economy numbers | DONE | packages/content/index.mjs, mo_farm_docs/25_MVP_CONTENT_DEFINITIONS.md |
| Asset pipeline locked v1 | DONE | 188 source assets, 10 animation contracts, strict validation |
| PixiJS renderer + Canvas fallback | DONE | npm run renderer:test |
| Vietnamese UI/direct entry/PWA | DONE | apps/web/src/locales/vi-VN.js |
| PostgreSQL runtime, CI, backup foundation | DONE | npm run check, Compose, integration gates |

Các gate nền A01/A02/A03/C01/C02/C03/D01/D02 đã DONE theo các task note tương ứng. File/memory adapter vẫn được giữ cho test/demo compatibility đến Release Candidate.

## Task status

| Task ID | Tên | Trạng thái |
|---|---|---|
| A01 | PostgreSQL runtime repository | DONE |
| A02 | PostgreSQL API runtime wiring | DONE |
| A03 | Transaction/concurrency integration gate | DONE |
| B01 | Production asset inventory/replacement contract | DONE |
| B02 | Production artwork replacement | DONE - Wave 1 + Wave 2 release approved (188/188) |
| C01 | Playwright setup và E2E foundation | DONE |
| C02 | Functional Playwright E2E trên PostgreSQL | DONE |
| C03 | Mobile/PWA/accessibility QA | DONE |
| D01 | Observability/performance instrumentation | DONE |
| D02 | Load test và backup/restore drill | DONE |
| E01 | Persistent Cloudflare Quick Tunnel | **Repository implementation DONE; lifecycle isolation DONE; runtime BLOCKED_CONFIG / NOT_STARTED** |
| RC01 | Release Candidate checklist | **BLOCKED_BY_E01; NOT_STARTED** |

## B02 production artwork - 2026-10-01

Năm owner đã hoàn tất generation và Revision 2:

- ART-01 Chicken: 92/92, style/identity/animation PASS, promote.
- ART-02 Rice: 5/5, PASS, giữ nguyên và promote.
- ART-03 Carrot: 5/5, PASS, giữ nguyên và promote.
- ART-04 Corn: 5/5, detached alpha stage 2/3 đã sửa, PASS, promote.
- ART-05 Tomato: 5/5, detached alpha seed/stage 1/2/3 đã sửa, ready unchanged, PASS, promote.

Wave 1 đã promote **112/112 canonical candidates** vào assets-src/**, pack atlas và runtime manifest. Source-to-atlas byte equality đạt 112/112. Chicken production stress đã chạy trên atlas thật với 1/25/50/100 bản sao ở bốn viewport, không lỗi.

Current inventory after Wave 2 release approval:

- 188 canonical source assets
- 188 `production_ready=true` metadata flags
- 188 `approved=true` metadata flags (112 Wave 1 + 76 Wave 2)
- 0 placeholders
- license metadata for all 188 assets is MO_FARM_INTERNAL_ASSET_POLICY_V1
- Wave 2 content/license/release approval is recorded in docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md

Evidence: docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.md, docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.json, docs/assets/review/FINAL_OWNER_REVIEW_V2.md, docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md, docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md.

## Gate kỹ thuật trước đợt khôi phục Quick Tunnel

Các kết quả dưới đây là evidence của checkpoint đã có. Kết quả kiểm tra cho đợt khôi phục hiện tại phải được ghi riêng trong runbook E01 sau khi chạy lại đầy đủ.

- npm run assets:build: PASS.
- npm run assets:validate: PASS — 188 assets, 10 animations.
- npm run assets:validate:strict: PASS — 188 assets, canonical atlas output and metadata contracts.
- npm run assets:validate:wave1: PASS - 112/112 Wave 1 approved; Wave 2 scope 76/76 approved; runtime/sidecar/frozen-asset parity.
- npm run assets:validate:wave2-release: PASS - exact 76-asset scope, approval references, PNG immutability hashes, inventory and atlas coverage.
- npm run renderer:test: PASS — 16/16.
- npm run check: PASS.
- docker compose config --quiet: PASS.
- Wave 2 final source-to-atlas 76/76, 9 animation contracts, DPR1/DPR2/mobile/zoom 1.30 runtime captures: PASS.
- Wave 2 final owner review package: FINAL-06..FINAL-13, 8/8 groups and 76/76 assets, technical/style/mobile/provenance/license eligibility PASS; Project Owner release approval recorded in `docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md`.
- git diff --check: PASS.

## Giới hạn và bước kế tiếp

B02 is DONE: 188/188 production_ready, 188/188 approved, 0 placeholders. Project Owner selected **PERSISTENT_QUICK_TUNNEL** as the canonical E01 release path on 2026-10-01 (`PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`). The application and cloudflared use separate Compose lifecycles. Existing security hardening remains required. The current remaining runtime blocker is absent ignored local configuration, not a Cloudflare token/domain requirement. RC01 remains **BLOCKED_BY_E01 / NOT_STARTED**.

Phase 1 is repository-only: no application container or tunnel is started and no trycloudflare URL is created. After static gates pass, repository migration can be recorded DONE while runtime stays `BLOCKED_CONFIG` (or `READY_FOR_QUICK_TUNNEL_START` when valid local configuration exists). Wait for the explicit Project Owner command before Phase 2 public runtime QA and URL-preservation test. Current runbook and integration evidence: [`E01_PERSISTENT_QUICK_TUNNEL.md`](tasks/E01_PERSISTENT_QUICK_TUNNEL.md).

## E01 initial preflight checkpoint - 2026-10-01

Historical Named Tunnel checkpoint — **SUPERSEDED / NON_CANONICAL / NOT_CURRENT_E01_RELEASE_PATH**, reason `PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`. The persistent Quick Tunnel runbook above defines current deployment. Findings and results below describe the original checkpoint.

The eight E01 preflight tasks completed read-only inspection. That initial checkpoint found **BLOCKED_CONFIG** because the required production environment was absent and **BLOCKED_SECURITY** findings for unresolved cloudflared token expansion, missing machine-checked Named Tunnel ingress mapping, public web source exposure, and absent effective rate limiting. The repository-side findings were resolved by E01-FIX-01 through E01-FIX-06; the current remaining blocker is owner-only runtime configuration. No public profile, tunnel or public endpoint was started. Historical evidence: `docs/implementation/tasks/E01_CLOUDFLARE_NAMED_TUNNEL_PREFLIGHT.md`.

RC01 remains **BLOCKED_BY_E01 / NOT_STARTED**.

## E01 repository remediation - 2026-10-01

Historical pre-migration remediation — **SUPERSEDED / NON_CANONICAL / NOT_CURRENT_E01_RELEASE_PATH** for deployment decisions, reason `PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`. Named Tunnel token/hostname requirements below are historical; static-root, rate-limit, proxy and PWA hardening remain in effect.

The six repository-side remediation tasks are complete: web static-root hardening, historical token-transport analysis, machine-readable tunnel contract, bounded API rate limiting, proxy/HTTPS security headers, and automated status-only preflight. Evidence and verification are recorded in `docs/implementation/tasks/E01_REMEDIATION.md`; Named Tunnel token/hostname findings remain historical and non-canonical.

The current local environment still has no owner-supplied production values, so `npm run e01:preflight` correctly returns `BLOCKED_CONFIG` (exit code 2). No public profile, tunnel, Quick Tunnel, public hostname, or RC01 was started.

## E01 persistent Quick Tunnel migration - 2026-10-01

- Deployment model: **PERSISTENT_QUICK_TUNNEL**; origin service `http://nginx:80`.
- App stack: `compose.yaml` (`db`, `api`, `web`, `nginx`); tunnel stack: `compose.tunnel.yaml` (`cloudflared` only).
- Shared network: application-managed `mo-farm-frontend`, external in tunnel stack.
- No token, fixed hostname or preknown public origin is required; preflight still requires PostgreSQL demo configuration and non-default session/database secrets.
- Ignored `.runtime/quick-tunnel.json` and `.runtime/quick-tunnel.env` synchronize exact generated PUBLIC_ORIGIN and track container/process lifetime.
- App updates preserve tunnel ID, StartedAt, RestartCount and URL; unexpected changes are `TUNNEL_LIFECYCLE_REGRESSION`.
- URL is ephemeral. Preservation scope: **SAME CLOUDFLARED LIFETIME**. Named Tunnel remains historical/non-canonical and is not an E01 release path; any stable-hostname migration requires a new Project Owner decision.
- Runtime: **BLOCKED_CONFIG**; cloudflared **NOT_STARTED**; public URL **NOT_CREATED**. No public/runtime PASS is claimed.
- Repository implementation: **DONE**; lifecycle isolation: **DONE**. Fresh Phase-1 validation PASS: E01 security 52/52 with no skips, focused lifecycle 28/28, preflight 15/15, renderer 16/16, API 20/20, all asset/Wave release gates, aggregate check, both Compose validators and API/web build. Actual local preflight remains BLOCKED_CONFIG (exit 2); every static check passes. Evidence is recorded in the current E01 runbook; live URL preservation is not yet tested.
- Public QA, mobile matrix, cookies, persistence and actual redeploy-preservation test are pending Phase 2. RC01 stays blocked; after E01 DONE it becomes QUEUED/READY and waits for Project Owner.

## Quy tắc cập nhật

Mỗi task trong docs/implementation/tasks/ phải nêu Task ID, owner, dependencies, owned/forbidden paths, deliverables, checklist, tests, blocker và bằng chứng. Chỉ chuyển REVIEW khi có evidence; chỉ chuyển DONE sau khi gate tương ứng pass.
