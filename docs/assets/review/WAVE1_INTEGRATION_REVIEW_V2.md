> Deployment references only: **SUPERSEDED / NON_CANONICAL / NOT_CURRENT_E01_RELEASE_PATH** (2026-10-01), reason `PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`. Any Named Tunnel mention below records the historical checkpoint. Current deployment: [`PERSISTENT_QUICK_TUNNEL`](../../implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md). Artwork findings and approvals below are unchanged.

# Wave 1 Integration Review V2

**Ngày review:** 2026-09-30
**Integration Owner:** /root
**Trạng thái kỹ thuật/style:** **PASS — Wave 1 DONE**
**Release approval:** **PENDING_OWNER_REVIEW** (approved=false cho mọi asset)

Phạm vi lần này là re-review Revision 2 có mục tiêu cho Chicken, Corn và Tomato, sau đó promote có chọn lọc. Rice và Carrot được giữ nguyên artwork đã pass; không mở Wave 2, Cloudflare Named Tunnel hoặc RC01.

## Kết quả theo owner

| Owner | Candidate | Technical | Style/identity | Animation/event | Revision result | Promotion |
|---|---:|---|---|---|---|---|
| ART-01 Chicken | 92/92 | PASS | PASS | PASS; EAT 5 frame, FEED_CONSUMED@2; WALK 6 frame × 4 hướng | Giảm micro-feather và glossy/high-frequency shading; khóa nguyên identity, scale, baseline và contract | PROMOTED |
| ART-02 Rice | 5/5 | PASS | PASS | N/A — crop stages tĩnh | UNCHANGED | PROMOTED |
| ART-03 Carrot | 5/5 | PASS | PASS | N/A — crop stages tĩnh | UNCHANGED | PROMOTED |
| ART-04 Corn | 5/5 | PASS | PASS | N/A — crop stages tĩnh | Stage 2/3 đã xóa detached alpha islands; mỗi stage còn một component nhìn thấy | PROMOTED |
| ART-05 Tomato | 5/5 | PASS | PASS | N/A — crop stages tĩnh | Seed/stage 1/2/3 đã xóa detached alpha islands; ready giữ nguyên; baseline y=230 | PROMOTED |

### Chicken

- Scale giữa NE/SE/SW/NW đạt tolerance: body height ±4%, body width ±5%, head guide ±4%.
- Baseline giữ y=230; anchor giữ (0.5, 0.9); canvas 256×256, RGBA, bốn hướng.
- Micro-detail giảm theo proxy edge-energy trung bình **21,83%**, nằm trong target 15–25%.
- Shading giữ volume mềm, giảm specular/high-frequency highlight, không đổi palette và identity.
- WALK có đủ 6 frame cho cả NE/SE/SW/NW, đọc được alternating foot/contact phase.
- EAT có đủ 5 frame cho cả bốn hướng, 10 FPS, loop=false, holdLast=true; frame 2 là contact và phát FEED_CONSUMED; không có body pop, head-size jump, torso teleport, feet teleport hoặc shadow jump.
- Pixi proof thật đã chạy qua các viewport desktop/mobile và hiển thị đủ 5 frame.

Evidence: [scale sheet](./chicken-direction-scale-comparison-v2.png), [runtime-size sheet](./chicken-runtime-size-comparison-v2.png), [EAT strip](./chicken-eat-se-strip-v2.png), [CHICKEN_PROOF_QA.json](./CHICKEN_PROOF_QA.json).

### Corn

crop_corn_stage_2 và crop_corn_stage_3 đã được sửa trong workspace owner. QA alpha với ngưỡng >=16 còn đúng một connected component cho mỗi stage; canonical IDs, 256×256 RGBA, baseline y=230, anchor (0.5,0.9), progression và mobile readability đều PASS.

### Tomato

crop_tomato_seed, stage_1, stage_2, stage_3 đã được sửa; crop_tomato_ready không đổi. QA alpha với ngưỡng >=16 còn một connected component cho từng frame, baseline y=230, 256×256 RGBA, canonical IDs, progression và mobile readability PASS.

## Cross-asset V2

Hai sheet V2 đã được review:

- [Desktop cross-asset review](./wave1-cross-asset-review-v2.png)
- [Mobile cross-asset review](./wave1-cross-asset-mobile-v2.png)

Perspective, relative scale, palette, outline/silhouette, lighting, shadow và mobile readability đều **PASS**. Chicken production atlas được dùng cho runtime stress thay vì một static texture proof.

## Promotion và provenance

Integration Owner đã promote:

- Chicken: 92/92
- Rice: 5/5
- Carrot: 5/5
- Corn: 5/5
- Tomato: 5/5

Tổng **112/112 canonical Wave 1 candidates** đã vào assets-src/**, được pack vào atlas/runtime manifest và có byte equality source-to-atlas cho 112 frame. Worker không ghi trực tiếp assets-src/**.

Inventory sau promote:

- 188 canonical source assets
- 112/188 production_ready
- 76/188 placeholder
- 0/188 approved

Mọi candidate giữ provenance source=internal-generated, creator/tool/toolVersion theo metadata thực tế. License vẫn là PENDING_OWNER_REVIEW; không suy diễn license và không set approved=true.

## Gate kỹ thuật

| Gate | Kết quả |
|---|---|
| npm run assets:build | PASS |
| npm run assets:validate | PASS — 188 assets, 10 animations |
| npm run assets:validate:strict | PASS — cảnh báo license pending được mong đợi |
| npm run renderer:test | PASS — 16/16 |
| npm run check | PASS |
| docker compose config --quiet | PASS |
| Source-to-atlas byte equality | PASS — 112/112 |
| Animation contract | PASS — IDLE 4, WALK 6, EAT 5; FEED_CONSUMED@2 |
| DPR 1 / DPR 2 | PASS |
| Mobile | PASS |
| Chicken stress | PASS — production atlas, 1/25/50/100 bản sao, 4 viewport, không lỗi |
| git diff --check | PASS |

Machine-readable evidence: [WAVE1_INTEGRATION_REVIEW_V2.json](./WAVE1_INTEGRATION_REVIEW_V2.json). Inventory: [PRODUCTION_ASSET_INVENTORY.md](../PRODUCTION_ASSET_INVENTORY.md).

## Status và giới hạn tiếp theo

- B02.1: **DONE**.
- B02.2-PROOF Revision 2: **DONE — owner APPROVED TO PROCEED**.
- B02.2-FULL: **DONE — Chicken 92/92**.
- **Wave 1: DONE** ở technical/style/promotion gate.
- Release/content/license approval vẫn **PENDING_OWNER_REVIEW**; approved=0.
- Wave 2, Cloudflare Named Tunnel và RC01: **CLOSED / NOT STARTED**.

Chờ owner duyệt style/license/content cuối cùng. Không regenerate Rice/Carrot, không đổi renderer/animation/asset contract và không mở scope tiếp theo trong revision này.
