# MO Farm — Implementation Status

Ngày cập nhật: 2026-09-30
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
| B02 | Production artwork replacement | **RUNNING - Wave 2 technical/style promotion complete 76/76; owner content approval pending** |
| C01 | Playwright setup và E2E foundation | DONE |
| C02 | Functional Playwright E2E trên PostgreSQL | DONE |
| C03 | Mobile/PWA/accessibility QA | DONE |
| D01 | Observability/performance instrumentation | DONE |
| D02 | Load test và backup/restore drill | DONE |
| E01 | Cloudflare Named Tunnel | NOT_STARTED — CLOSED |
| RC01 | Release Candidate checklist | NOT_STARTED — CLOSED |

## B02 Wave 1 — 2026-09-30

Năm owner đã hoàn tất generation và Revision 2:

- ART-01 Chicken: 92/92, style/identity/animation PASS, promote.
- ART-02 Rice: 5/5, PASS, giữ nguyên và promote.
- ART-03 Carrot: 5/5, PASS, giữ nguyên và promote.
- ART-04 Corn: 5/5, detached alpha stage 2/3 đã sửa, PASS, promote.
- ART-05 Tomato: 5/5, detached alpha seed/stage 1/2/3 đã sửa, ready unchanged, PASS, promote.

Wave 1 đã promote **112/112 canonical candidates** vào assets-src/**, pack atlas và runtime manifest. Source-to-atlas byte equality đạt 112/112. Chicken production stress đã chạy trên atlas thật với 1/25/50/100 bản sao ở bốn viewport, không lỗi.

Inventory after Wave 2 targeted revision promotion:

- 188 canonical source assets
- 188 `production_ready=true` flags (112 approved Wave 1 + 76 Wave 2 technical/style pass)
- 188 technical production-ready entries plus 112 approved entries in the generated inventory
- 0 placeholder
- 112 approved
- license metadata của 188 asset là MO_FARM_INTERNAL_ASSET_POLICY_V1; content approval của Wave 2 vẫn PENDING_OWNER_REVIEW

Evidence: docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.md, docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.json, docs/assets/review/FINAL_OWNER_REVIEW_V2.md, docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md.

## Gate kỹ thuật gần nhất

- npm run assets:build: PASS.
- npm run assets:validate: PASS — 188 assets, 10 animations.
- npm run assets:validate:strict: PASS — 188 assets, canonical atlas output and metadata contracts.
- npm run assets:validate:wave1: PASS — 112/112 policy-approved, all 76 Wave 2 entries promoted, runtime/sidecar/frozen-asset parity.
- npm run renderer:test: PASS — 16/16.
- npm run check: PASS.
- docker compose config --quiet: PASS.
- Wave 2 final source-to-atlas 76/76, 9 animation contracts, DPR1/DPR2/mobile/zoom 1.30 runtime captures: PASS.
- git diff --check: PASS.

## Giới hạn và bước kế tiếp

B02 remains RUNNING for Project Owner content/release approval. All 76 Wave 2 assets passed targeted revision review and are technically/style promoted; `approved=true` remains limited to the 112 Wave 1 assets. Do not change renderer, animation, or asset contracts.

Wave 2 generation, targeted revision review, promotion and atlas rebuild are complete for 76/76 assets. Cloudflare Named Tunnel and RC01 remain CLOSED/NOT_STARTED; do not open them from technical artwork progress alone. No Wave 2 asset may become `approved=true` without Project Owner content/release approval.

## Quy tắc cập nhật

Mỗi task trong docs/implementation/tasks/ phải nêu Task ID, owner, dependencies, owned/forbidden paths, deliverables, checklist, tests, blocker và bằng chứng. Chỉ chuyển REVIEW khi có evidence; chỉ chuyển DONE sau khi gate tương ứng pass.
