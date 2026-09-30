# MO Farm — Task Dependencies

## Dependency graph

Baseline M0–M3

- A01 PostgreSQL repository → A02 API wiring → A03 transaction/concurrency gate.
- B01 asset inventory/contract → B02 production artwork replacement.
- C01 Playwright setup → C02 functional E2E → C03 mobile/PWA/accessibility QA.
- D01 observability instrumentation → D02 load and backup/restore drill.

A03 + C03 + D02 + approved B02 + Docker gate → E01 Cloudflare Named Tunnel.
A03 + B02 + C03 + D02 + E01 → RC01 Release Candidate.

## Parallel execution policy

- A01, B01, C01 và D01 có thể chạy song song vì owned paths khác nhau.
- ART-01 Chicken, ART-02 Rice, ART-03 Carrot, ART-04 Corn và ART-05 Tomato chạy song song trong workspace riêng.
- Worker không ghi assets-src/**, atlas, runtime manifest hoặc shared contract. Integration Owner chỉ promote sau REVIEW.
- Không regenerate Rice/Carrot khi re-review Chicken/Corn/Tomato.
- E01 không mở trước khi A03, B02, C03, D02 và Docker gate PASS.

## Current checkpoint — 2026-09-30

- DONE: A01, A02, A03, B01, C01, C02, C03, D01, D02.
- DONE: B02.1 style direction; B02.2-PROOF Revision 2 owner APPROVED TO PROCEED.
- DONE: B02 Wave 1 technical/style/promotion gate — 112/112 canonical candidates promoted.
- B02 release/content/license approval: REVIEW/PENDING_OWNER_REVIEW; 0 asset approved.
- Inventory: 188 total, 112 production_ready, 76 placeholder, 0 approved.
- Evidence: docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.md và .json.
- CLOSED: Wave 2, E01 Cloudflare Named Tunnel, RC01 Release Candidate.

## Gate rules

- Giữ nguyên asset ID/frame ID/FPS/loop/holdLast/event/pivot/anchor khi thay artwork.
- Chỉ set production_ready=true sau technical/style review và Integration Owner promotion.
- Chỉ set approved=true sau owner license/content approval có evidence.
- Không mở scope gameplay, Tutorial, renderer hoặc animation contract trong B02 revision này.
