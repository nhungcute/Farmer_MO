# MO Farm — Task Dependencies

## Dependency graph

Baseline M0–M3

- A01 PostgreSQL repository → A02 API wiring → A03 transaction/concurrency gate.
- B01 asset inventory/contract → B02 production artwork replacement.
- C01 Playwright setup → C02 functional E2E → C03 mobile/PWA/accessibility QA.
- D01 observability instrumentation → D02 load and backup/restore drill.

A03 + C03 + D02 + approved B02 + Docker gate → E01 Persistent Named Tunnel.
A03 + B02 + C03 + D02 + E01 → RC01 Release Candidate.

## Parallel execution policy

- A01, B01, C01 và D01 có thể chạy song song vì owned paths khác nhau.
- ART-01 Chicken, ART-02 Rice, ART-03 Carrot, ART-04 Corn và ART-05 Tomato chạy song song trong workspace riêng.
- Worker không ghi assets-src/**, atlas, runtime manifest hoặc shared contract. Integration Owner chỉ promote sau REVIEW.
- Không regenerate Rice/Carrot khi re-review Chicken/Corn/Tomato.
- E01 không mở trước khi A03, B02, C03, D02 và Docker gate PASS.

## Current checkpoint ? 2026-10-01

- DONE: A01, A02, A03, B01, C01, C02, C03, D01, D02.
- DONE: B02.1 style direction; B02.2-PROOF Revision 2 owner APPROVED TO PROCEED.
- B02 Wave 1: DONE - 112/112 canonical candidates promoted; content/license/release APPROVED.
- B02: DONE ? Wave 2 release approval recorded for all 76 assets; canonical inventory is 188/188 production_ready, 188/188 approved, 0 placeholders.
- Inventory: 188 total; metadata flags production_ready=188, approved=188, placeholder=0. Wave 1=112 approved; Wave 2=76 approved.
- Evidence: Wave 1 review/approval records plus docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md and npm run assets:validate:wave2-release.
- RELEASE: Wave 2 ART-06 through ART-13 are approved 76/76. Canonical E01 model is **NAMED_TUNNEL**; runtime **BLOCKED_CONFIG** because real owner environment/token/fixed hostname are not yet validated. Cloudflared/Named Tunnel **NOT_STARTED**. RC01 **BLOCKED_BY_E01 / NOT_STARTED**. Current runbook: [`E01_PERSISTENT_NAMED_TUNNEL.md`](tasks/E01_PERSISTENT_NAMED_TUNNEL.md).

## E01 initial preflight checkpoint - 2026-10-01

Historical Named Tunnel checkpoint, superseded during `5c8132f`; canonical Named Tunnel subsequently restored with independent lifecycle in the current runbook above. Original findings follow unchanged.

- Eight read-only preflight tasks completed: E01-01 through E01-08.
- E01 status: **BLOCKED_CONFIG** because required non-default production/demo environment values and the Named Tunnel token/hostname are absent.
- Security status at the initial checkpoint: **BLOCKED_SECURITY** because public web source exposure, unresolved cloudflared token expansion/ingress evidence, and missing effective rate limiting required resolution before public access.
- No container or tunnel was started. Initial evidence is in `docs/implementation/tasks/E01_CLOUDFLARE_NAMED_TUNNEL_PREFLIGHT.md`; remediation evidence is in `docs/implementation/tasks/E01_REMEDIATION.md`.
- RC01 status: **BLOCKED_BY_E01 / NOT_STARTED**.

## E01 remediation checkpoint - 2026-10-01

Historical pre-migration verification; its original results remain below. Current requirements are in the restored Named Tunnel runbook above.

- E01-FIX-01 through E01-FIX-06 are complete and pass repository/static verification.
- `npm run test:e01:security` passes 15 tests; the status-only validator reports all static checks PASS with a synthetic valid environment.
- The real local environment remains absent, therefore `npm run e01:preflight` is intentionally `BLOCKED_CONFIG` until the owner supplies ignored local secrets and the exact HTTPS hostname/origin pair.
- No public profile, Cloudflare process, Quick Tunnel, or RC01 was started. See `docs/implementation/tasks/E01_REMEDIATION.md`.

## E01 persistent Quick Tunnel migration - 2026-10-01

**Historical `5c8132f`: SUPERSEDED / NON_CANONICAL / DEBUG EXPERIMENT.** The following requirements/status progression describe that checkpoint only; current E01 is NAMED_TUNNEL.

- E01-QT-01..06 cover Compose separation, Quick Tunnel contract, exact runtime URL/PUBLIC_ORIGIN, isolated application update, start/status/stop tooling and static regression.
- Phase 1 must finish repository/static gates without starting any application or tunnel container. Missing local configuration means **BLOCKED_CONFIG**, otherwise **READY_FOR_QUICK_TUNNEL_START**; no token/domain requirement remains.
- Phase 2 starts only on an explicit Project Owner command. Capture current URL, complete public/mobile/security/persistence QA and perform a real application redeploy proving identical cloudflared ID, StartedAt, RestartCount and URL.
- Preservation scope is **SAME CLOUDFLARED LIFETIME**. URL is ephemeral and may rotate on process/session restart. Runtime QA pending means **RUNNING**; all required runtime gates PASS means **DONE — PERSISTENT_QUICK_TUNNEL**.
- RC01 remains **BLOCKED_BY_E01 / NOT_STARTED**. After E01 DONE, transition only to **QUEUED / READY** and await Project Owner; do not start RC01 automatically.

## E01 canonical Named Tunnel restoration - 2026-10-01

- Selectively preserve compatible `5c8132f` changes: separate tunnel lifecycle, shared stable network, app-update isolation and security hardening. Audit relevant changes as KEEP/MODIFY/SUPERSEDE/REMOVE.
- Canonical Named contract requires token/fixed hostname, exact configured HTTPS PUBLIC_ORIGIN, and only origin `http://nginx:80`; Quick Tunnel/generated origin cannot satisfy preflight.
- Correction task is repository/static/build only. No runtime start, Cloudflare contact, public hostname publication or public QA; real owner preflight/runtime remains BLOCKED_CONFIG and cloudflared/Named Tunnel NOT_STARTED.
- Future actual runtime/update test requires unchanged tunnel ID/StartedAt/RestartCount and fixed PUBLIC_ORIGIN, public endpoint readiness and persistent farm data.
- RC01 remains BLOCKED_BY_E01 / NOT_STARTED. Actual E01 runtime DONE allows only QUEUED / READY pending Project Owner; no automatic RC01 start.

## Gate rules

- Giữ nguyên asset ID/frame ID/FPS/loop/holdLast/event/pivot/anchor khi thay artwork.
- Chỉ set production_ready=true sau technical/style review và Integration Owner promotion.
- Chỉ set approved=true sau owner license/content approval có evidence.
- Không mở scope gameplay, Tutorial, renderer hoặc animation contract trong B02 revision này.
