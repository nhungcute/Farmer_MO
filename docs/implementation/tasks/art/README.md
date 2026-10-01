# B02 Production Artwork — Parallel Art Wave 1

Wave 1 có năm owner độc lập. Mỗi owner sở hữu trọn một loại asset và chỉ ghi vào workspace của mình. Integration Owner là tác nhân duy nhất promote vào assets-src/**, pack atlas và cập nhật runtime manifest.

| Task | Owner | Workspace | Canonical set | Trạng thái |
|---|---|---|---:|---|
| ART-01 | Chicken Asset Owner | work/art-generation/chicken/** | 92/92 | **DONE - content/license/release approved**, promoted |
| ART-02 | Rice Asset Owner | work/art-generation/crops/rice/** | 5/5 | **DONE - content/license/release approved**, promoted |
| ART-03 | Carrot Asset Owner | work/art-generation/crops/carrot/** | 5/5 | **DONE - content/license/release approved**, promoted |
| ART-04 | Corn Asset Owner | work/art-generation/crops/corn/** | 5/5 | **DONE - content/license/release approved**, promoted |
| ART-05 | Tomato Asset Owner | work/art-generation/crops/tomato/** | 5/5 | **DONE - content/license/release approved**, promoted |

## Quy tắc isolation

- Worker chỉ ghi work/art-generation/<asset>/**; không worker nào ghi assets-src/**, atlas, runtime, renderer, gameplay, economy, Tutorial, Cloudflare hoặc RC01.
- Rice và Carrot không bị regenerate trong Revision 2.
- Candidate phải giữ canonical ID, canvas 256×256, RGBA, baseline/anchor, frame order, FPS, loop, holdLast và event.
- Provenance uses truthful metadata. Wave 1 and Wave 2 use MO_FARM_INTERNAL_ASSET_POLICY_V1; all 188 assets are owner approved and there are no placeholders.
- Proof/review nằm ngoài production source và không được dùng để thay thế production atlas.

## Kết quả Wave 1 — Revision 2

- Chicken: 92/92 PASS. Đã giảm micro-detail và glossy shading; WALK 6 frame × 4 hướng; EAT 5 frame × 4 hướng, FEED_CONSUMED@2; identity/scale/baseline/contract giữ nguyên.
- Rice: 5/5 PASS, UNCHANGED.
- Carrot: 5/5 PASS, UNCHANGED.
- Corn: 5/5 PASS; stage 2/3 không còn detached alpha island.
- Tomato: 5/5 PASS; seed/stage 1/2/3 không còn detached alpha island, ready giữ nguyên, baseline y=230.

Integration Owner promoted **188/188** canonical candidates into assets-src/**, rebuilt atlases and verified runtime parity. Inventory: 188/188 production_ready=true, 188/188 approved=true, 0 placeholders; Wave 1=112 and Wave 2=76. Wave 2 approval: `docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md`.

Evidence:

- Wave 1 Integration Review V2: docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.md
- Machine-readable review: docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.json
- Desktop cross-asset sheet: docs/assets/review/wave1-cross-asset-review-v2.png
- Mobile cross-asset sheet: docs/assets/review/wave1-cross-asset-mobile-v2.png
- Final owner review: docs/assets/review/FINAL_OWNER_REVIEW_V2.md

## Gate đã chạy

npm run assets:build, npm run assets:validate, npm run assets:validate:strict, npm run assets:validate:wave1, npm run assets:validate:wave2-release (188/188 approved; 0 placeholders), npm run renderer:test (16/16), npm run check, docker compose config --quiet, atlas byte equality 188/188, DPR 1/2, mobile và Chicken stress production atlas đều PASS. git diff --check PASS.

Wave 1 and Wave 2 are DONE for technical/style/content/license/release/promotion. E01 Cloudflare Named Tunnel is QUEUED/NOT_STARTED and RC01 is QUEUED/BLOCKED_BY_E01.
