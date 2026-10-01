# RC01 — Release Candidate checklist

| Field | Value |
|---|---|
| Task ID | RC01 |
| Name | Release Candidate evidence, sign-off and rollback gate |
| Status | BLOCKED_BY_E01 / NOT_STARTED |
| Owner | Root/release integration |
| Dependencies | A03 DONE; B02 DONE; C03 DONE; D02 DONE; E01 DONE; A02/C02/Docker/CI gates PASS |
| Owned paths | `docs/implementation/tasks/RC01_RELEASE_CANDIDATE.md`, release evidence index, release/rollback runbooks and generated release artifacts |
| Forbidden paths | gameplay/economy/content definitions, Renderer, Animation, Asset pipeline contracts, Tutorial, PostgreSQL migrations `001/002`, API response contract, file/memory adapter removal, unapproved production artwork, tunnel secrets or credentials |
| Start time | Chưa bắt đầu — chỉ mở sau khi toàn bộ dependency hoàn tất |
| End time | Chưa xác định |

RC01 là gate phát hành cho prototype/demo MỠ FARM. Task này xác nhận bằng chứng đã tồn tại và có thể rollback; nó không mở thêm gameplay, không thay đổi economy/content numbers và không biến dữ liệu farm thành dữ liệu riêng tư. Người chơi vẫn vào thẳng farm, toàn bộ giao diện vẫn là tiếng Việt và Tutorial không được đưa trở lại.

## Release checklist

Checklist phải đạt đủ **12/12** trước khi ký RC. Mỗi mục phải có log hoặc artifact từ đúng commit được phát hành; kết quả local cũ không thay thế được bằng chứng của release commit.

- [ ] API contract và API regression tests PASS (`npm run test:api:full`), gồm direct entry, session, bootstrap, mutation và stable error envelope.
- [ ] PostgreSQL repository/integration tests PASS (`npm run test:api:postgres` với PostgreSQL disposable), migration `001` rồi `002` chạy lặp lại an toàn.
- [ ] A03 transaction/concurrency gate PASS: locking, state revision, idempotency replay/conflict, rollback và bounded serialization/deadlock retry.
- [ ] PostgreSQL runtime smoke PASS với `PERSISTENCE_DRIVER=postgres`: readiness thật, enter/session/bootstrap và toàn bộ mutation route không fallback sang file.
- [ ] C02 PostgreSQL Playwright E2E PASS trên database disposable: direct/existing entry, starter state, crop, market, building, animal, order, quest và restart/reload persistence.
- [ ] C03 mobile/PWA/accessibility PASS: `mobile-pwa`, orientation, touch boundary, keyboard/ARIA, contrast, viewport layout và API cache exclusion.
- [ ] D01/D02 operational gate PASS: bounded load, concurrency/idempotency/rollback invariants, metrics và không leak secret trong log.
- [ ] Backup/restore PASS trên source/target disposable riêng: dump, restore, migration rerun và fingerprint toàn bộ runtime tables khớp.
- [ ] Docker/Compose/release runtime PASS: `docker compose config --quiet`, API/Web build, migration profile, API health/readiness và smoke qua deployment path.
- [ ] B02 asset gate PASS: production artwork được duyệt, license/source/style/release approval đầy đủ, strict validation và visual review giữ nguyên asset/animation contract.
- [ ] Product acceptance PASS: direct entry, giao diện tiếng Việt, không Tutorial, prototype/demo disclosure và dữ liệu farm không được phân loại là riêng tư.
- [ ] Release controls PASS: version/commit/checksum, environment/secrets audit, observability review, rollback runbook và người có thẩm quyền ký phát hành.

Không được đánh dấu một mục là PASS chỉ vì command kết thúc với exit code 0 nếu test đã bị skip, dùng database dùng chung, dùng file adapter thay cho PostgreSQL hoặc thiếu artifact/log tương ứng. Skip phải được ghi rõ lý do và được reviewer chấp thuận.

## Evidence matrix

| Gate | Evidence bắt buộc | Trạng thái trước khi mở RC01 |
|---|---|---|
| A02 runtime | docs/implementation/tasks/A02_POSTGRES_API_WIRING.md; API/PG test log; readiness JSON; Compose smoke | DONE — parent review and CI evidence complete |
| A03 transaction | docs/implementation/tasks/A03_TRANSACTION_CONCURRENCY.md; PostgreSQL 20/20 log; race/rollback assertions | DONE — parent review and CI evidence complete |
| C02 browser | docs/implementation/tasks/C02_FUNCTIONAL_PLAYWRIGHT_E2E.md; desktop Chromium report trên disposable PG; remote CI runs 36660295559 and 36662455574 | DONE — parent review and CI evidence complete |
| C03 mobile/PWA | docs/implementation/tasks/C03_MOBILE_PWA_ACCESSIBILITY.md; mobile-pwa report 3/3; remote CI runs 36660295559 and 36662455574 | DONE — parent review and CI evidence complete |
| D01 observability | docs/implementation/tasks/D01_OBSERVABILITY_PERFORMANCE.md; metrics tests/log redaction evidence | DONE — parent review complete |
| D02 operations | docs/implementation/tasks/D02_LOAD_BACKUP_RESTORE.md; load JSON; backup/restore log; 15-table fingerprints; remote CI runs 36660295559 and 36662455574 | DONE — parent review and CI evidence complete |
| B02 assets | `docs/implementation/tasks/B02_PRODUCTION_ARTWORK.md`; inventory, license/source, style/release approval, visual sign-off | GATED — Wave 1 112/112 approved; 76 placeholders remain outside Wave 1 |
| Docker/CI | .github/workflows/ci.yml; remote run 36660295559 PASS for all 5 jobs; Compose/build logs | PASS for integration commit 628f7cd; release-commit rerun remains required |
| E01 tunnel | E01 runbook, token/secret audit, external smoke, stop/revoke and rollback evidence | QUEUED — không được mở trước các gate upstream |
| RC sign-off | commit SHA, artifact checksums, environment matrix, named reviewer approvals and rollback drill result | Chưa tạo |

Các bằng chứng phải cùng trỏ về một release commit. Evidence từ commit khác chỉ được dùng làm lịch sử tham khảo và không đủ để ký RC.

## Rollback and recovery

Trước khi phát hành phải lưu lại commit SHA, image digest, asset bundle checksum, migration version, environment configuration fingerprint (đã loại secret) và backup identifier. PostgreSQL backup phải được tạo từ database đã migrate và kiểm tra restore trên target disposable riêng.

Rollback tối thiểu phải thực hiện theo thứ tự:

1. Dừng traffic/release candidate theo runbook; giữ `/healthz` và `/api/health/ready` để quan sát trạng thái.
2. Revoke/stop E01 tunnel nếu tunnel đã được mở; không xóa log hoặc evidence của incident.
3. Quay API/Web về image digest và commit SHA đã được ký trước đó.
4. Chỉ chạy migration rollback nếu đã có migration rollback được review; không chạy SQL destructive ad-hoc và không sửa ngược `001/002`.
5. Nếu cần phục hồi dữ liệu, restore vào database đích được kiểm tra trước rồi chuyển traffic theo runbook; không ghi đè database nguồn khi chưa có approval.
6. Chạy smoke `/healthz`, `/api/health/ready`, direct entry, bootstrap và một mutation idempotent; ghi kết quả và quyết định mở lại traffic.

Rollback evidence phải ghi thời điểm, người thực hiện, commit/image trước và sau, database/backup identifier, kết quả smoke và các lỗi còn lại. RPO/RTO production không được suy ra từ D02 prototype baseline nếu chưa có SLO được phê duyệt.

## Sign-off

RC01 chỉ chuyển `QUEUED → REVIEW` khi 12 checklist items có evidence matrix đầy đủ, B02 và E01 đã đạt dependency, remote CI run của release commit PASS, và rollback runbook đã được dry-run. Chỉ chuyển `REVIEW → DONE` sau khi các owner sau ký:

- Backend/runtime owner: A02/A03, persistence, migration, transaction và rollback.
- QA/Web owner: C02/C03, browser artifacts, direct entry, Vietnamese UI và accessibility.
- Infrastructure/release owner: D01/D02, Docker/Compose, backup/restore, observability và deployment.
- Asset/content approver: B02 production artwork, license/source, style và release approval.
- Release approver: commit/artifact/environment audit, tunnel controls và quyết định phát hành.

Thiếu bất kỳ chữ ký, artifact, checksum hoặc blocker record nào thì RC01 vẫn giữ `QUEUED` hoặc `REVIEW`, không được báo `DONE`.

## Current activity

RC01 đang BLOCKED_BY_E01 / NOT_STARTED. Chưa chạy release, chưa start cloudflared hoặc tạo public URL/release artifact. A01/A02/A03/B01/C01/C02/C03/D01/D02/B02 đã DONE; E01 demo hiện là PERSISTENT_QUICK_TUNNEL, runtime BLOCKED_CONFIG vì thiếu ignored local demo/PostgreSQL configuration. Runbook: [`E01_PERSISTENT_QUICK_TUNNEL.md`](E01_PERSISTENT_QUICK_TUNNEL.md). Sau khi E01 actual runtime/public/preservation gates DONE, RC01 chỉ chuyển QUEUED / READY và chờ lệnh riêng từ Project Owner; không tự chạy RC01.

## Next activity

1. Parent review đã xác nhận A01/A02/A03/B01/C01/C02/C03/D01/D02/B02; giữ các evidence và chờ E01 runtime dependency.
2. Remote GitHub Actions run 36660295559 đã PASS 5/5 job; lưu artifact/log vào release evidence index và chờ parent review.
3. Cấp cấu hình owner-only cho E01 ngoài repository và chạy runtime preflight, external smoke cùng rollback/revoke drill.
4. Chỉ sau khi E01 PASS mới tạo release commit và chạy checklist RC01.

## Blocker

- B02 đã hoàn tất Wave 1 và Wave 2 với 188/188 asset đã được duyệt; không còn placeholder trong inventory production.
- E01 repository remediation đã PASS, nhưng E01 runtime vẫn BLOCKED_CONFIG cho tới khi cấu hình owner-only và external runtime evidence hoàn tất.
- Không có cơ sở để tuyên bố production SLO/RPO/RTO từ các prototype load/backup numbers hiện tại.

Không được bắt đầu RC01 bằng cách tự tạo artwork, tự phê duyệt license, bỏ qua skip, mở tunnel sớm, dùng database dùng chung hoặc thay đổi gameplay/API contract để làm checklist đạt.
