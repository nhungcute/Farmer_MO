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

- Remote CI runs `36660295559` (commit `628f7cd`), `36662455574` (commit `7651d6a`) and parent-review closure run `36663637314` (commit `5cf15f7`) are PASS across all 5 jobs; E01 and RC01 remain dependency-gated.
- Documentation templates for E01 and RC01 are prepared, but neither runtime task is open.
- RUNNING: B02 Integration Owner review after Parallel Art Wave 1 generation; C03 and D02 have DONE evidence.
- REVIEW: none for A01/A02/A03/B01/C01/C02/C03/D01/D02; parent review completed with local and remote CI evidence.
- DONE: A01, A02, A03, B01, C01, C02, C03, D01, D02; API prototype, content definitions, asset pipeline, Pixi renderer, Vietnamese direct-entry web shell, Docker/Nginx/PWA foundation.
- REVIEW subtask: B02.1 style direction đã `DONE` với owner kết luận `APPROVED WITH MINOR REVISIONS`; B02.2 production contract tại `docs/assets/CHICKEN_PRODUCTION_CONTRACT.md` vẫn khóa và chưa có đủ production frame.
- DONE checkpoint: B02.2-PROOF Revision 2 is owner `APPROVED TO PROCEED`; evidence remains outside `assets-src` and does not change manifest/atlas.
- REVIEW checkpoint: B02.2-FULL generation is complete: 92 Chicken frames + 20 crop stages, all five task workspaces at `REVIEW` with technical QA PASS; promotion is not started.
- REVIEW handoff: Parallel Art Wave 1 completed ART-01 Chicken 92/92, ART-02 Rice 5/5, ART-03 Carrot 5/5, ART-04 Corn 5/5 and ART-05 Tomato 5/5; all candidate files remain under `work/art-generation/**`.
- BLOCKED: B02 production promotion/release approval until Integration Owner cross-asset review and license/style gates pass; E01 Cloudflare remains upstream-gated.
