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
- Provenance phải là dữ liệu thật. Wave 1 dùng license MO_FARM_INTERNAL_ASSET_POLICY_V1; 76 asset ngoài Wave 1 vẫn là placeholder.
- Proof/review nằm ngoài production source và không được dùng để thay thế production atlas.

## Kết quả Wave 1 — Revision 2

- Chicken: 92/92 PASS. Đã giảm micro-detail và glossy shading; WALK 6 frame × 4 hướng; EAT 5 frame × 4 hướng, FEED_CONSUMED@2; identity/scale/baseline/contract giữ nguyên.
- Rice: 5/5 PASS, UNCHANGED.
- Carrot: 5/5 PASS, UNCHANGED.
- Corn: 5/5 PASS; stage 2/3 không còn detached alpha island.
- Tomato: 5/5 PASS; seed/stage 1/2/3 không còn detached alpha island, ready giữ nguyên, baseline y=230.

Integration Owner đã promote đủ **112/112** candidate canonical vào assets-src/**, pack atlas và xác nhận byte equality source-to-atlas. Inventory hiện có 112/188 production_ready, 76/188 placeholder, 112/188 approved.

Evidence:

- Wave 1 Integration Review V2: docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.md
- Machine-readable review: docs/assets/review/WAVE1_INTEGRATION_REVIEW_V2.json
- Desktop cross-asset sheet: docs/assets/review/wave1-cross-asset-review-v2.png
- Mobile cross-asset sheet: docs/assets/review/wave1-cross-asset-mobile-v2.png
- Final owner review: docs/assets/review/FINAL_OWNER_REVIEW_V2.md

## Gate đã chạy

npm run assets:build, npm run assets:validate, npm run assets:validate:strict, npm run assets:validate:wave1 (112/112 policy-approved; 76 untouched placeholders), npm run renderer:test (16/16), npm run check, docker compose config --quiet, atlas byte equality 112/112, DPR 1/2, mobile và Chicken stress production atlas đều PASS. git diff --check PASS.

Wave 1 is DONE for technical/style/content/license/release/promotion. B02 remains RUNNING while the 76 Wave 2 candidates wait at the Integration Owner review/promotion checkpoint. Cloudflare Named Tunnel and RC01 remain CLOSED/NOT_STARTED.
