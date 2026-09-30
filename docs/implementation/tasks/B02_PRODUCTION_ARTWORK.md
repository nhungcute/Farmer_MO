# B02 — Production artwork replacement contract audit

| Trường | Giá trị |
|---|---|
| ID | B02 |
| Tên | Production artwork replacement và approval audit |
| Trạng thái | RUNNING |
| Owner | Asset workstream / art approval |
| Phụ thuộc | B01 DONE; approved production artwork and approval evidence |
| Đường dẫn sở hữu | `assets-src/**` chỉ khi có artwork được duyệt; `docs/assets/**`; task này |
| Đường dẫn cấm sửa | Renderer, animation runtime, asset IDs/frame IDs, FPS, pivot/anchor, atlas schema, backend, gameplay, economy/content definitions, Tutorial |
| Deliverables | Candidate generation evidence, task-local QA, cross-asset review and partial promotion; release approval remains pending |
| Bắt đầu | 2026-09-30 |
| K?t th?c | Ch?a k?t th?c — ch? Chicken/Corn/Tomato revision, license v? release approval |
| Ho?t ??ng hi?n t?i | Wave 1 Integration Owner review complete with partial promotion — 10/112; Chicken/Corn/Tomato revision required |
| Ho?t ??ng g?n nh?t | Cross-asset review: Rice 5/5 and Carrot 5/5 promoted; three asset types blocked on visual revision |
| Ho?t ??ng k? ti?p | Targeted owner revision for Chicken/Corn/Tomato, then rerun asset/style review; no Wave 2 |
| Tests | `node tools/asset-inventory.mjs`; `npm run assets:validate`; `npm run assets:validate:strict` |
| Blocker | Chicken/Corn/Tomato visual revision plus license/release approval remain pending; E01/RC01 stay closed |

## Subtask status

| Subtask | Trạng thái | Evidence |
|---|---|---|
| B02.1 — Production Art Style Lock | DONE — style direction approved with minor production notes | [`MO_FARM_PRODUCTION_STYLE_GUIDE.md`](../../assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md) |
| ???ng d?n s? h?u | `assets-src/**` ch? do Integration Owner sau technical/style review; `docs/assets/**`; task n?y |
| B02.2-PROOF — Chicken proof checkpoint | DONE — Revision 2 owner APPROVED TO PROCEED | [`CHICKEN_GOLDEN_ASSET_REVIEW.md`](../../assets/review/CHICKEN_GOLDEN_ASSET_REVIEW.md), [`CHICKEN_PROOF_QA.json`](../../assets/review/CHICKEN_PROOF_QA.json) |
| B02.2-FULL — Chicken production set | RUNNING — 92/92 candidates generated; blocked pending visual revision, not promoted | [`CHICKEN_PRODUCTION_CONTRACT.md`](../../assets/CHICKEN_PRODUCTION_CONTRACT.md) |

## Parallel Art Wave 1 kickoff

The five asset-owner tasks completed real generation in parallel-safe isolated workspaces. Integration Owner cross-asset review is complete for this batch: Rice/Carrot passed and were promoted; Chicken/Corn/Tomato remain at revision.

| Task | Owned asset type | Workspace | Status |
|---|---|---|---|
| ART-01 | Chicken / `animal_chicken` | `work/art-generation/chicken/**` | RUNNING — 92/92; visual/style + EAT/WALK revision required |
| ART-02 | Rice | `work/art-generation/crops/rice/**` | DONE — 5/5 promoted; technical/style PASS; license pending |
| ART-03 | Carrot | `work/art-generation/crops/carrot/**` | DONE — 5/5 promoted; technical/style PASS; license pending |
| ART-04 | Corn | `work/art-generation/crops/corn/**` | RUNNING — 5/5; detached alpha fragments require revision |
| ART-05 | Tomato | `work/art-generation/crops/tomato/**` | RUNNING — 5/5; detached alpha fragments require revision |

Workers write only to their owned `work/art-generation/**` path. The Integration Owner promoted only passing Rice/Carrot candidates (10/112) and left Chicken/Corn/Tomato production sources unchanged pending revision. Wave 2 is not started.

## Checklist

- [x] Inventory đầy đủ source asset, animation contract và category hiện tại.
- [x] Kiểm tra placeholder/license/source metadata cho toàn bộ inventory.
- [x] Kiểm tra style sheet và release approval evidence.
- [x] Audit asset ID, frame order, FPS, loop/hold-last, event, pivot/anchor và atlas contract.
- [x] Chạy asset inventory và strict validation trên bộ placeholder hiện tại.
- [ ] Nhận đủ production artwork hoặc mapping replacement được duyệt.
- [ ] Nhận license/source evidence, style approval và release approval.
- [ ] Thay artwork, visual review và đóng B02.

## Kết quả audit ngày 2026-09-30

- Inventory deterministic hiện có **188 source assets**, **10 animation contracts** và **8 categories**.
- Status hi?n t?i: `placeholder=178`, `production_ready=10`, `approved=0`; the 10 promoted crop entries retain `license=PENDING_OWNER_REVIEW`.
- Category counts được xác nhận: terrain 5, buildings 3, crops 24, chicken 92, pond 19, effects 30, UI 15; animals chỉ có 1 animation contract và không có PNG riêng.
- Cả 188 asset đều thiếu `styleReview`, `technicalReview` và `approvalRef`; các trường này phải được bổ sung trước khi parent review.
- `tools/asset-inventory.mjs` và strict validator chỉ xác nhận metadata/contract kỹ thuật; PASS của chúng không tự chứng minh style approval, technical approval hoặc release approval.
- `assets-src/manifests/licenses.json` has 178 placeholder entries and 10 promoted internal-generated entries; promoted licenses remain `PENDING_OWNER_REVIEW`.
- `assets-src/style/style-sheet.md` remains the baseline placeholder style reference for unpromoted inventory; Wave 1 promoted evidence is recorded in `docs/assets/review/WAVE1_INTEGRATION_REVIEW.json`.
- Rice/Carrot have technical/style sign-off and promotion evidence; no release license or approval record exists yet. Chicken/Corn/Tomato have revision findings.
- Only Rice/Carrot PNGs were promoted by the Integration Owner; canonical IDs and contract values were preserved. Blocked types were not changed.
- B02.1 đã khóa perspective, palette direction, lighting, alpha, scale, motion, mobile readability và approval model; style direction đã được owner xác nhận `APPROVED WITH MINOR REVISIONS`, nên B02.1 chuyển `DONE`.
- B02.2 contract remains locked for Chicken (92 frames, six states, four directions, `256 × 256`, anchor `0.5,0.9`, `FEED_CONSUMED@2`); full candidates exist but visual/style revision is required before promotion.
- B02.2-PROOF Revision 2 is DONE / owner APPROVED TO PROCEED; evidence remains outside `assets-src` and does not set `production_ready` or `approved`.
- B02.2-FULL is `RUNNING`; 92 Chicken frames and 20 crop stages remain in isolated workspaces, with Rice/Carrot promoted and Chicken/Corn/Tomato held for revision.
- ART-01 through ART-05 completed generation; Rice and Carrot are promoted, while Chicken/Corn/Tomato are `RUNNING` for targeted revision. No candidate is promoted for those three types.

## Wave 1 Integration review — 2026-09-30

- **Rice:** technical PASS, style PASS, `PROMOTED` 5/5.
- **Carrot:** technical PASS, style PASS, `PROMOTED` 5/5.
- **Chicken:** technical PASS; style and animation revision required for glossy shading/micro-detail plus WALK/EAT visual proof; blocked.
- **Corn:** technical PASS; detached alpha fragments in stage 2/3 require revision; blocked.
- **Tomato:** technical PASS; detached alpha fragments in seed/stage 1/2/3 require revision; blocked.
- **Wave 1 promotion:** **10/112**; production inventory **10/188 ready, 178/188 placeholders, 0 approved**.
- **Provenance:** promoted entries use `source=internal-generated`; `license=PENDING_OWNER_REVIEW`; no `approved=true` is set.
- **Gates:** `npm run assets:build`, asset validation/strict validation, renderer tests, `npm run check`, Docker Compose config and `git diff --check` pass.
- **Next:** targeted owner revision only for Chicken/Corn/Tomato. Do not open Wave 2, Cloudflare or RC01.

## Contract audit

Các contract hiện tại vẫn giữ đúng thông tin cần bảo toàn khi thay artwork:

- static asset ID, source path, canvas/source scale, atlas, anchor và render offset;
- animation ID, state, direction, frame ID/order, FPS, loop và hold-last;
- event `FEED_CONSUMED` trên frame 2 của các hướng `animal_chicken.EAT`;
- bốn hướng gà `NE`, `SE`, `SW`, `NW` và các state runtime hiện có;
- các pond/effect/crop timelines theo contract trong `animation-manifest.json`.

Validation hiện tại đạt:

```text
Asset inventory PASS: 188 assets, 10 animations, 8 categories.
Asset validation PASS: 188 assets, 10 animations.
Asset strict validation PASS: 188 assets, 10 animations.
```

Các kết quả trên chỉ xác nhận tính đúng của placeholder và contract; chúng không phải bằng chứng artwork đã được duyệt để phát hành.

## Điều kiện mở B02

B02 chỉ chuyển sang RUNNING khi có đủ:

1. source artwork cho từng ID trong inventory hoặc một mapping replacement được phê duyệt;
2. bằng chứng license/source/creator/tool cho từng asset;
3. style approval của target release;
4. xác nhận kỹ thuật không đổi ID/frame order/FPS/loop/hold-last/event/pivot/anchor/atlas nếu không có change review riêng;
5. strict validation và visual review đạt trước khi đưa vào bundle.

Không mở Cloudflare hoặc RC artwork gate từ B02 khi các bằng chứng trên còn thiếu.
