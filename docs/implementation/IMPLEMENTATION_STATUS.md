# MO Farm — Implementation Status

Ngày cập nhật: 2026-09-29 15:43 UTC
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

Baseline gần nhất: `npm run check` PASS — renderer syntax 24 file, localization 73 key, renderer 16/16, API 12/12, PostgreSQL repository 5/5, asset 188/10 và strict atlas PASS. Playwright: 5 passed, 5 intentionally skipped across desktop/mobile projects. HEAD/origin: `966563cf522bfc1013ea9a89212dabe043116dd4`.

## Đang chạy và review

| Task ID | Tên | Checklist | Owner | Phụ thuộc | Owned paths | Trạng thái |
|---|---|---:|---|---|---|---|
| A01 | PostgreSQL runtime repository | 9/9 | Backend workstream | baseline | `apps/api/src/db/**`, `apps/api/src/repositories/**`, migration mới, Postgres tests | REVIEW |
| B01 | Production asset inventory/replacement contract | 7/7 | Asset workstream | asset pipeline v1 | `tools/asset-inventory.mjs`, `docs/assets/**`, task note | REVIEW |
| C01 | Playwright setup và E2E foundation | 6/6 | QA workstream | web/API baseline | `tests/e2e/**`, Playwright config, task note | REVIEW |
| D01 | Observability/performance instrumentation | 8/8 | Root/infrastructure | baseline | `apps/api/src/observability/**`, renderer debug metrics, instrumentation tests/docs | REVIEW |
| A02 | PostgreSQL API runtime wiring | 2/8 | Root/backend integration | A01 REVIEW | `apps/api/src/server.mjs`, migration CLI, API Docker/Compose integration, integration tests | RUNNING |

Các task RUNNING không được sửa shared canonical contract đồng thời. `package.json`, `package-lock.json`, `compose.yaml`, `.env.example`, `packages/content/index.mjs`, migration entry point, main web bootstrap và CI workflow do root quản lý khi cần tích hợp.

## Đã xếp hàng

| Task ID | Tên | Checklist | Phụ thuộc | Trạng thái |
|---|---|---:|---|---|
| A03 | Transaction/concurrency integration gate | 0/6 | A02 | QUEUED |
| B02 | Production artwork replacement | 0/8 | B01 + artwork được duyệt | QUEUED/BLOCKED nếu chưa có art |
| C02 | Functional Playwright E2E | 0/10 | A02 + C01 | QUEUED |
| C03 | Mobile/PWA/accessibility QA | 0/8 | C01 + C02 | QUEUED |
| D02 | Load test và backup/restore drill | 0/7 | A02 + D01 | QUEUED |
| E01 | Cloudflare Named Tunnel | 0/6 | A02 + C02 + D02 + Docker gate | QUEUED |
| RC01 | Release Candidate checklist | 0/12 | A03, B02, C03, D02, E01 | QUEUED |

## Ranh giới còn lại

- Runtime API hiện vẫn dùng `FarmStore` memory hoặc JSON `STATE_FILE`; PostgreSQL schema/migrate/seed mới là nền tham chiếu/hook.
- `pg` driver, numeric migration CLI và Compose migration loop đã được chuẩn bị; `PERSISTENCE_DRIVER=file` vẫn là mặc định demo cho tới khi A02 chứng minh parity/concurrency.
- Asset đang là placeholder nội bộ (`placeholder: true`); B01 chỉ chuẩn bị inventory và contract, không tự bịa production art.
- Chưa được gọi là Release Candidate cho tới khi persistence, E2E, mobile QA, performance, backup/restore, observability và deployment gate đạt checklist.
- Không thêm pig, cow, fishing, weather, social, multiplayer, guild, chat hoặc gameplay mới trong milestone này.

## Cách cập nhật

Mỗi task phải có file trong `docs/implementation/tasks/` với Task ID, status, owner, dependencies, owned/forbidden paths, deliverables, checklist, current/last/next activity, tests, blocker, start/end time. Chỉ chuyển `REVIEW` sau khi checklist và test có bằng chứng; chỉ chuyển `DONE` sau review.
