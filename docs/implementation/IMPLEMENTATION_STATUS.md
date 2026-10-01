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
| E01 | Cloudflare Named Tunnel | QUEUED - NOT_STARTED (blocked until explicit post-B02 start) |
| RC01 | Release Candidate checklist | QUEUED - BLOCKED_BY_E01; NOT_STARTED |

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

## Gate kỹ thuật gần nhất

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

B02 is DONE. Wave 2 has explicit Project Owner content, license and release approval for exactly 76 assets; no artwork was regenerated and the reviewed PNG aggregate is unchanged. E01 is QUEUED and NOT_STARTED. RC01 is QUEUED and BLOCKED_BY_E01. Do not start E01, Cloudflare Named Tunnel, RC01 or public deployment until a separate explicit start command is issued. Renderer, animation, gameplay, economy and asset contracts remain unchanged.

Wave 2 generation, targeted revision review, promotion, atlas rebuild, final owner review and release approval are complete for 76/76 assets. E01 Cloudflare Named Tunnel is QUEUED/NOT_STARTED; RC01 is QUEUED/BLOCKED_BY_E01/NOT_STARTED.

## Quy tắc cập nhật

Mỗi task trong docs/implementation/tasks/ phải nêu Task ID, owner, dependencies, owned/forbidden paths, deliverables, checklist, tests, blocker và bằng chứng. Chỉ chuyển REVIEW khi có evidence; chỉ chuyển DONE sau khi gate tương ứng pass.
