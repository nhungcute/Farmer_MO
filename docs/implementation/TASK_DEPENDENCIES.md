# MO Farm — Task Dependencies

## Dependency graph

```text
Baseline M0–M3
 ├── A01 PostgreSQL repository ──> A02 API wiring ──> A03 transaction/concurrency gate
 │                                  └───────────────> C02 functional E2E
 ├── B01 asset inventory/contract ──> B02 production artwork replacement
 ├── C01 Playwright setup ──────────> C02 functional E2E ──> C03 mobile/PWA/a11y QA
 └── D01 observability instrumentation ──> D02 load + backup/restore drill

A03 + C03 + D02 + approved B02 + Docker gate ──> E01 Cloudflare Named Tunnel
A03 + B02 + C03 + D02 + E01 ──> RC01 Release Candidate checklist
```

## Parallel execution policy

Được chạy song song:

- A01 với B01, C01 và D01 vì owned paths khác nhau.
- C01 có thể tạo test harness trước khi A02 nối PostgreSQL; các test cần persistence thật phải giữ `test.skip` có lý do hoặc chờ C02.
- B01 không thay manifest, asset ID, frame ID, FPS, pivot, anchor hay renderer.

Không được bắt đầu:

- A02 trước khi A01 ở `REVIEW` và có repository/migration evidence.
- C02 trước khi C01 và A02 có endpoint/test environment ổn định.
- B02 trước khi inventory/contract B01 được review và artwork được cung cấp/duyệt.
- D02 trước khi D01 có metric names và load scenario rõ ràng.
- E01 trước khi A02, core E2E và local Docker checks PASS.

## Shared file ownership

Root là owner tạm thời của `package.json`, `package-lock.json`, `compose.yaml`, `.env.example`, `packages/content/index.mjs`, migration entry point, `apps/api/src/server.mjs`, `apps/web/src/main.js`, CI workflow và hai status file này. Workstream phải gửi yêu cầu thay đổi thay vì sửa đồng thời.

## Current checkpoint

- RUNNING: A02.
- REVIEW: A01, B01, C01, D01.
- DONE: API prototype, content definitions, asset pipeline, Pixi renderer, Vietnamese direct-entry web shell, Docker/Nginx/PWA foundation.
- BLOCKED: B02 production art nếu chưa có artwork được duyệt; E01 Cloudflare cho tới khi các gate upstream PASS.
