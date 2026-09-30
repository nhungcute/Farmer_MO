# B02 — Production artwork replacement and approval

| Trường | Giá trị |
|---|---|
| ID | B02 |
| Trạng thái | RUNNING - Wave 1 content/license/release approved; 76 placeholders remain |
| Owner | Asset workstream / Integration Owner |
| Phụ thuộc | B01 DONE; canonical manifest và style guide |
| Owned paths | assets-src/** sau promote; docs/assets/**; work/art-generation/** theo từng owner |
| Không sửa | Renderer, animation contract, asset IDs, FPS, anchor, backend, gameplay, economy, Tutorial |
| Deliverables | 112/112 Wave 1 production candidates, owner QA, cross-asset V2 review, atlas/runtime promotion |
| Bắt đầu | 2026-09-30 |
| Hoàn tất kỹ thuật | 2026-09-30 |
| Release approval | APPROVED - MO_FARM_INTERNAL_ASSET_POLICY_V1 |

## Subtask status

| Subtask | Trạng thái | Bằng chứng |
|---|---|---|
| B02.1 — Production Art Style Lock | DONE — approved with minor production notes | assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md |
| B02.2-PROOF Revision 2 | DONE — owner APPROVED TO PROCEED | docs/assets/review/CHICKEN_GOLDEN_ASSET_REVIEW.md, CHICKEN_PROOF_QA.json |
| B02.2-FULL | DONE — Chicken 92/92 | docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.md |
| Wave 1 | DONE - 112/112 promoted; content/license/release APPROVED | docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md |

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
- Tất cả 112 entries dùng source=internal-generated và metadata creator/tool/toolVersion theo thực tế. License là MO_FARM_INTERNAL_ASSET_POLICY_V1; content/license/release approval đã APPROVED.

## Inventory và QA

Inventory: 188 assets, 112 production_ready, 76 placeholder, 112 approved. Atlas source-to-slice byte equality 112/112.

Đã PASS:

- npm run assets:build
- npm run assets:validate
- npm run assets:validate:strict
- npm run assets:validate:wave1 (112/112 policy-approved; 76 untouched placeholders)
- npm run renderer:test (16/16)
- npm run check
- docker compose config --quiet
- DPR 1/2, mobile, Chicken production-atlas stress ở 1/25/50/100 bản sao
- git diff --check

Evidence: docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.md, docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.json, docs/assets/review/FINAL_OWNER_REVIEW_V2.md, docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md.

## Gate tiếp theo

Wave 1 artwork/content/license/release is APPROVED by Project Owner. Wave 2 Integration Owner review is complete: Farmhouse, Warehouse, Chicken Coop and Crop Extras (7/76) are selected for technical/style promotion, while Pond, Terrain, Effects and UI require revision. Do not start Cloudflare Named Tunnel or open RC01. Rice/Carrot, renderer, animation, and asset contracts remain unchanged.
