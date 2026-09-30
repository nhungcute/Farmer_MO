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
| Deliverables | Candidate generation evidence, task-local QA and Integration Owner review; no production replacement yet |
| Bắt đầu | 2026-09-30 |
| K?t th?c | Ch?a k?t th?c ? ch? Integration Owner cross-asset review v? release approval |
| Ho?t ??ng hi?n t?i | REVIEW handoff ? 112 candidates complete; Integration Owner cross-asset review pending |
| Ho?t ??ng g?n nh?t | Five owner generation tasks completed 112/112 canonical candidates with task-local QA PASS |
| Ho?t ??ng k? ti?p | Cross-asset visual/contract review; only then decide whether to promote into assets-src |
| Tests | `node tools/asset-inventory.mjs`; `npm run assets:validate`; `npm run assets:validate:strict` |
| Blocker | Promotion/release approval and license review remain pending; assets-src is unchanged |

## Subtask status

| Subtask | Trạng thái | Evidence |
|---|---|---|
| B02.1 — Production Art Style Lock | DONE — style direction approved with minor production notes | [`MO_FARM_PRODUCTION_STYLE_GUIDE.md`](../../assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md) |
| B02.2 — Golden Asset: Chicken | BLOCKED — contract đã khóa nhưng chưa có 92 production frame | [`CHICKEN_PRODUCTION_CONTRACT.md`](../../assets/CHICKEN_PRODUCTION_CONTRACT.md), 92 placeholder vẫn giữ nguyên |
| B02.2-PROOF ? Chicken proof checkpoint | DONE ? Revision 2 owner APPROVED TO PROCEED | [`CHICKEN_GOLDEN_ASSET_REVIEW.md`](../../assets/review/CHICKEN_GOLDEN_ASSET_REVIEW.md), [`CHICKEN_PROOF_QA.json`](../../assets/review/CHICKEN_PROOF_QA.json) |
| B02.2-FULL ? Chicken production set | RUNNING ? 92/92 candidates generated in `work/art-generation/chicken/**`; not promoted | [`CHICKEN_PRODUCTION_CONTRACT.md`](../../assets/CHICKEN_PRODUCTION_CONTRACT.md) |

## Parallel Art Wave 1 kickoff

The five asset-owner tasks completed real generation in parallel-safe isolated workspaces. All candidates are at `REVIEW`; Integration Owner cross-asset review is the next gate.

| Task | Owned asset type | Workspace | Status |
|---|---|---|---|
| ART-01 | Chicken / `animal_chicken` | `work/art-generation/chicken/**` | REVIEW ? real generation 92/92; task-local QA PASS |
| ART-02 | Rice | `work/art-generation/crops/rice/**` | REVIEW ? real generation 5/5; task-local QA PASS |
| ART-03 | Carrot | `work/art-generation/crops/carrot/**` | REVIEW ? real generation 5/5; task-local QA PASS |
| ART-04 | Corn | `work/art-generation/crops/corn/**` | REVIEW ? real generation 5/5; task-local QA PASS |
| ART-05 | Tomato | `work/art-generation/crops/tomato/**` | REVIEW ? real generation 5/5; task-local QA PASS |

Workers write only to their owned `work/art-generation/**` path; `assets-src/**`, manifests, atlas output and runtime remain unchanged. Each task reaches `REVIEW` only after complete canonical assets and task-local QA/metadata. Integration Owner review is required before promotion; Wave 2 is not started.

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
- Status hiện tại: `placeholder=188`, `production_ready=0`, `approved=0`.
- Category counts được xác nhận: terrain 5, buildings 3, crops 24, chicken 92, pond 19, effects 30, UI 15; animals chỉ có 1 animation contract và không có PNG riêng.
- Cả 188 asset đều thiếu `styleReview`, `technicalReview` và `approvalRef`; các trường này phải được bổ sung trước khi parent review.
- `tools/asset-inventory.mjs` và strict validator chỉ xác nhận metadata/contract kỹ thuật; PASS của chúng không tự chứng minh style approval, technical approval hoặc release approval.
- `assets-src/manifests/licenses.json` có 188/188 entry với `license=internal-placeholder` và `placeholder=true`; source được ghi là generated deterministic placeholder.
- `assets-src/style/style-sheet.md` xác nhận đây là placeholder style sheet và nêu rõ toàn bộ asset hiện tại không phải production art.
- Không tìm thấy bằng chứng release artwork, commercial/open-source license có thể dùng cho production, art-director style sign-off hoặc approval record.
- Không tự tạo/thay PNG và không thay đổi manifest contract trong khi blocker còn tồn tại.
- B02.1 đã khóa perspective, palette direction, lighting, alpha, scale, motion, mobile readability và approval model; style direction đã được owner xác nhận `APPROVED WITH MINOR REVISIONS`, nên B02.1 chuyển `DONE`.
- B02.2 đã khóa contract Chicken 92 frame, sáu state, bốn direction, canvas `256 × 256`, anchor `0.5,0.9`, `mirrorAllowed=false` và `FEED_CONSUMED@2`; chưa có candidate production để chuyển sang `REVIEW`.
- B02.2-PROOF là checkpoint kỹ thuật độc lập ở `REVIEW`: chỉ có 13 frame proof Revision 2 ngoài `assets-src`, không thay manifest/atlas, không đặt `production_ready` hoặc `approved` và không làm thay đổi trạng thái BLOCKED của B02 production.
- B02.2-FULL is `RUNNING`; 92 Chicken frames and 20 crop stages are complete in five isolated workspaces and await Integration Owner review.
- ART-01 through ART-05 are all at `REVIEW` with task-local QA PASS; no candidate is promoted.

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
