# B02 — Production artwork replacement and approval

| Trường | Giá trị |
|---|---|
| ID | B02 |
| Tr?ng th?i | **DONE ? Wave 1 + Wave 2 release approved (188/188)** |
| Owner | Asset workstream / Integration Owner |
| Phụ thuộc | B01 DONE; canonical manifest và style guide |
| Owned paths | assets-src/** sau promote; docs/assets/**; work/art-generation/** theo từng owner |
| Không sửa | Renderer, animation contract, asset IDs, FPS, anchor, backend, gameplay, economy, Tutorial |
| Deliverables | 112/112 Wave 1 plus 76/76 Wave 2 candidates, owner QA, cross-asset review, atlas/runtime promotion |
| Bắt đầu | 2026-09-30 |
| Hoàn tất kỹ thuật | 2026-09-30 |
| Release approval | Wave 1 APPROVED; Wave 2 content/license/release APPROVED by Project Owner (76/76) |

## Subtask status

| Subtask | Trạng thái | Bằng chứng |
|---|---|---|
| B02.1 — Production Art Style Lock | DONE — approved with minor production notes | assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md |
| B02.2-PROOF Revision 2 | DONE — owner APPROVED TO PROCEED | docs/assets/review/CHICKEN_GOLDEN_ASSET_REVIEW.md, CHICKEN_PROOF_QA.json |
| B02.2-FULL | DONE — Chicken 92/92 | docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.md |
| Wave 1 | DONE - 112/112 promoted; content/license/release APPROVED | docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md |

## Wave 2 targeted revision promotion

The initial 7/76 promotion remained frozen. REV-06 Pond, REV-10 Terrain, REV-11 Effects and REV-12 UI passed read-only re-review and 69/69 additional PNGs were promoted; Wave 2 reached 76/76 technical/style production-ready. Project Owner then approved the exact 76-asset scope for content, license and release. Canonical records are `placeholder=false`, `production_ready=true`, `technicalReview=PASS`, `styleReview=PASS`, `licenseApproval=APPROVED`, `contentApproval=APPROVED`, `releaseApproval=APPROVED`, `approved=true`, and `approvalRef=docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md`. Evidence: `docs/assets/review/WAVE2_TARGETED_REVISION_REVIEW.md`, `docs/assets/review/WAVE2_REVISED_PROMOTION.json`, `docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md`.

## Wave 1 result

| Owner | Set | Technical | Style/identity | Animation/event | Promotion |
|---|---:|---|---|---|---|
| ART-01 Chicken | 92/92 | PASS | PASS | PASS — WALK 6 frame × 4 hướng; EAT 5 frame × 4 hướng; FEED_CONSUMED@2 | PROMOTED |
| ART-02 Rice | 5/5 | PASS | PASS | N/A | PROMOTED, unchanged |
| ART-03 Carrot | 5/5 | PASS | PASS | N/A | PROMOTED, unchanged |
| ART-04 Corn | 5/5 | PASS | PASS | N/A | PROMOTED — stage 2/3 alpha islands removed |
| ART-05 Tomato | 5/5 | PASS | PASS | N/A | PROMOTED — seed/stage 1/2/3 alpha islands removed; ready unchanged |

## Contract and provenance

- Canonical IDs, atlas groups, states, directions, frame counts, FPS, loop, holdLast, event, canvas 256×256, sourceScale, anchor (0.5,0.9) và baseline y=230 giữ nguyên.
- Production source được Integration Owner promote; workers không ghi trực tiếp assets-src/**.
- Chicken micro-detail giảm 21,83% theo proxy edge-energy; shading chuyển về soft illustrated volume và giữ identity.
- All 188 entries use source=internal-generated with truthful creator/tool/toolVersion provenance. License is MO_FARM_INTERNAL_ASSET_POLICY_V1; content/license/release approval is APPROVED for Wave 1 and Wave 2.

## Inventory và QA

Inventory: 188 assets, 188 `production_ready=true` flags, 188 `approved=true` flags (112 Wave 1 + 76 Wave 2), 0 placeholders. Atlas/runtime rebuild, sidecar parity, frozen PNG aggregate hash checks and source-to-slice byte equality passed for 76/76 Wave 2 frames. Final runtime QA covers 9 animation contracts plus DPR1, DPR2, mobile and zoom 1.30 captures.

Đã PASS:

- npm run assets:build
- npm run assets:validate
- npm run assets:validate:strict
- npm run assets:validate:wave1 (112/112 Wave 1 approved; Wave 2 scope 76/76 approved)
- npm run assets:validate:wave2-release (76/76 Wave 2 approved; 188/188 final inventory; PNG aggregate unchanged)
- npm run renderer:test (16/16)
- npm run check
- docker compose config --quiet
- DPR 1/2, mobile, Chicken production-atlas stress ở 1/25/50/100 bản sao
- git diff --check

Evidence: docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.md, docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.json, docs/assets/review/FINAL_OWNER_REVIEW_V2.md, docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md.

## Gate tiếp theo

Wave 1 and Wave 2 artwork/content/license/release are APPROVED by Project Owner. B02 is DONE. E01 demo now selects persistent Quick Tunnel; runtime BLOCKED_CONFIG, cloudflared NOT_STARTED, URL NOT_CREATED. RC01 remains BLOCKED_BY_E01 / NOT_STARTED; do not start either runtime or RC01 from this artwork checkpoint. Current deployment runbook: [`E01_PERSISTENT_QUICK_TUNNEL.md`](E01_PERSISTENT_QUICK_TUNNEL.md). Rice/Carrot, renderer, animation, and asset contracts remain unchanged.
