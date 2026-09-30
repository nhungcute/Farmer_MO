# MO Farm — Implementation Status

Ngày cập nhật: 2026-09-30 16:00 UTC
Mốc hiện tại: **M4 — Production Persistence / Release Candidate foundation**

Đây vẫn là prototype/demo. Dữ liệu farm không được coi là riêng tư. Người chơi vào thẳng farm bằng tên hiển thị; Tutorial không tồn tại trong runtime.

## Baseline đã hoàn thành

| Hạng mục | Checklist | Trạng thái | Bằng chứng |
|---|---:|---|---|
| API/gameplay vertical slice | 9/9 | DONE | `npm run test:api:full` |
| Content definitions và economy numbers | 8/8 | DONE | `packages/content/index.mjs`, `mo_farm_docs/25_MVP_CONTENT_DEFINITIONS.md` |
| Asset pipeline locked v1 | 6/6 | DONE | 188 frame, 10 clip, 6 atlas; strict validation |
| PixiJS renderer + Canvas fallback | 14/14 | DONE | `npm run renderer:test`, renderer syntax check |
| Vietnamese UI/direct entry/PWA | 7/7 | DONE | `apps/web/src/locales/vi-VN.js`, web smoke |
| Docker/Nginx/CI/backup foundation | 7/7 | DONE | Compose config/build/smoke |

Baseline gần nhất: `npm run check` PASS — renderer syntax 24 file, localization 73 key, renderer 16/16, API 17/17, PostgreSQL repository 6/6, PostgreSQL integration 14/14, asset 188/10 và strict atlas PASS. C01 direct-entry scoped: 5 passed, 5 intentionally skipped; aggregate cùng C03: 8 passed, 19 intentionally skipped; C02 PostgreSQL: 1 passed, 2 intentionally skipped trên ba project; D02 load/backup: PASS. Commit baseline trước khi bổ sung CI gate: `789f037` đã push lên `origin/main`; CI gate integration commit: `628f7cd`; commit hiện tại xem bằng Git.

CI reproducibility gate đã bổ sung các job PostgreSQL repository/runtime, C02/C03 browser, và D02 load/backup-restore. Local analog đã PASS: PostgreSQL 20/20, C02 Chromium 1/1, C03 mobile-pwa 3/3, D02 load và backup/restore 15 bảng. GitHub Actions runs `36660295559` và `36662455574` cho các commit tích hợp `628f7cd` và `7651d6a` đều PASS 5/5 job: [run 36660295559](https://github.com/nhungcute/Farmer_MO/actions/runs/36660295559), [run 36662455574](https://github.com/nhungcute/Farmer_MO/actions/runs/36662455574); parent-review closure run [36663637314](https://github.com/nhungcute/Farmer_MO/actions/runs/36663637314) cũng PASS 5/5 job.

## Đã review và hoàn tất

| Task ID | Tên | Checklist | Owner | Phụ thuộc | Owned paths | Trạng thái |
|---|---|---:|---|---|---|---|
| A01 | PostgreSQL runtime repository | 9/9 | Backend workstream | baseline | `apps/api/src/db/**`, `apps/api/src/repositories/**`, migration mới, Postgres tests | DONE |
| B01 | Production asset inventory/replacement contract | 7/7 | Asset workstream | asset pipeline v1 | `tools/asset-inventory.mjs`, `docs/assets/**`, task note | DONE |
| C01 | Playwright setup và E2E foundation | 6/6 | QA workstream | web/API baseline | `tests/e2e/**`, Playwright config, task note | DONE |
| D01 | Observability/performance instrumentation | 8/8 | Root/infrastructure | baseline | `apps/api/src/observability/**`, renderer debug metrics, instrumentation tests/docs | DONE |
| A02 | PostgreSQL API runtime wiring | 8/8 | Root/backend integration | A01 DONE | apps/api/src/server.mjs, migration CLI, API Docker/Compose integration, integration tests | DONE |
| A03 | Transaction/concurrency integration gate | 6/6 | Backend workstream | A02 DONE | apps/api/test/postgres, task note | DONE |
| C02 | Functional Playwright E2E tren PostgreSQL | 9/9 | QA/Web integration | A02 + C01 DONE | tests/e2e/c02-postgres.spec.mjs, harness/config | DONE |
| C03 | Mobile/PWA/accessibility QA | 9/9 | QA/Web integration | C01 + C02 DONE | tests/e2e/c03-mobile-pwa.spec.mjs, styles/accessibility, task note | DONE |
| D02 | Load test và backup/restore drill | 7/7 | Runtime/infrastructure | A02 + A03 + D01 DONE | tools/load-test, tools/backup-restore, task note | DONE |

Các task RUNNING không được sửa shared canonical contract đồng thời. `package.json`, `package-lock.json`, `compose.yaml`, `.env.example`, `packages/content/index.mjs`, migration entry point, main web bootstrap và CI workflow do root quản lý khi cần tích hợp.

## Đã xếp hàng

| Task ID | Tên | Checklist | Phụ thuộc | Trạng thái |
|---|---|---:|---|---|
| B02 | Production artwork replacement | 5/8 | B01 + artwork được duyệt | BLOCKED — chưa có artwork production |
| E01 | Cloudflare Named Tunnel | 0/12 | A03 + B02 + C03 + D02 + Docker gate | QUEUED |
| RC01 | Release Candidate checklist | 0/12 | A03, B02, C03, D02, E01 | QUEUED |

B02 subtask checkpoint: **B02.1 style lock đang `REVIEW`** sau khi tạo [`MO_FARM_PRODUCTION_STYLE_GUIDE.md`](../assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md); **B02.2 Chicken contract đã khóa nhưng `BLOCKED`** vì 92 production frame, license/source evidence và owner approval chưa có. Không chuyển B02 tổng sang `DONE`, không mở E01/RC01 và không bắt đầu crop/building/pond trước khi Chicken được review.

B02.2 proof checkpoint: **`B02.2-PROOF` đang `REVIEW`** với 11 frame ngoài production, Pixi preview, scale desktop/mobile và stress evidence ở [`CHICKEN_GOLDEN_ASSET_REVIEW.md`](../assets/review/CHICKEN_GOLDEN_ASSET_REVIEW.md). Đây chỉ là technical checkpoint; **`B02.2-FULL` vẫn `QUEUED`**, B02 tổng vẫn `BLOCKED`, chưa thay asset placeholder và chưa có style/art owner approval. Không tạo 92 frame còn lại cho tới khi owner duyệt proof.

## Ranh giới còn lại

- Runtime API chon ro PERSISTENCE_DRIVER=file hoac postgres; file/JSON FarmStore van la mac dinh prototype, con postgres da chay enter/session/bootstrap va tat ca mutation qua transaction repository.
- pg driver, numeric migration CLI, BOM-safe migration runner va Compose migration loop da duoc chuan bi; readiness PostgreSQL tra 503 khi DB unavailable.
- Asset đang là placeholder nội bộ (`placeholder: true`); B01 chỉ chuẩn bị inventory và contract, không tự bịa production art.
- Chưa được gọi là Release Candidate cho tới khi persistence, E2E, mobile QA, performance, backup/restore, observability và deployment gate đạt checklist.
- Không thêm pig, cow, fishing, weather, social, multiplayer, guild, chat hoặc gameplay mới trong milestone này.

## Cách cập nhật

Mỗi task phải có file trong `docs/implementation/tasks/` với Task ID, status, owner, dependencies, owned/forbidden paths, deliverables, checklist, current/last/next activity, tests, blocker, start/end time. Chỉ chuyển `REVIEW` sau khi checklist và test có bằng chứng; chỉ chuyển `DONE` sau review.
