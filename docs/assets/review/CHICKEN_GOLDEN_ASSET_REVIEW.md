# Chicken Golden Asset Review — Reference v1

| Trường | Giá trị |
|---|---|
| Trạng thái | REFERENCE ONLY — chưa phải production frame |
| Subtask | B02.2 — Golden Asset: Chicken |
| File | [`chicken-golden-style-reference-v1.png`](chicken-golden-style-reference-v1.png) |
| Kích thước tạo ra | `1254 × 1254` RGBA |
| Contract đích | `92` frame, mỗi frame `256 × 256`, sáu state × bốn hướng |
| Source | Internal generated visual reference |
| Tool | Built-in image generation tool |
| License/approval | PENDING owner/art review; chưa có `approvalRef` |

## Mục đích

Ảnh này là visual reference để asset/art owner đánh giá hướng Chicken: silhouette, body/wing/comb/beak, warm palette, top-left light và transparent background. Ảnh không được copy vào `assets-src/animals/chicken/`, không được đưa vào atlas và không được dùng để đặt `production_ready=true` hoặc `approved=true`.

## Vì sao chưa phải production candidate

- Chỉ có một tư thế/hướng tham chiếu; chưa có `NE`, `SE`, `SW`, `NW` đầy đủ.
- Chưa có sáu state `IDLE`, `WALK`, `EAT`, `HAPPY`, `SLEEP`, `PRODUCT_READY`.
- Chưa có 92 frame theo contract.
- Canvas `1254 × 1254` không khớp source contract `256 × 256`.
- Chưa có frame order, FPS, loop, holdLast hoặc event `FEED_CONSUMED@2`.
- Chưa có license/source/creator/tool evidence và approval record cho release.
- Chưa có technical, mobile, performance hoặc visual sign-off.

## Candidate conversion gate

Nếu asset owner chấp thuận hướng hình ảnh này, production work vẫn phải tạo source mới theo [`CHICKEN_PRODUCTION_CONTRACT.md`](../CHICKEN_PRODUCTION_CONTRACT.md):

1. Tạo đủ 92 frame source tại `assets-src/animals/chicken/`.
2. Giữ nguyên mọi ID, canvas, anchor, render offset, frame order, FPS, loop, holdLast và event.
3. Ghi metadata `source`, `creator`, `tool`, `toolVersion`, `license`, `technicalReview`, `styleReview` và `approvalRef`.
4. Chạy inventory, validate, pack, strict validation, preview, renderer test, mobile QA và performance QA.
5. Chỉ đề xuất `production_ready=true` sau technical review; chỉ owner/release approver mới được đặt `approved=true`.

B02.2 production vẫn giữ `BLOCKED` cho tới khi candidate 92 frame và evidence đầy đủ. B02.1 style direction đã `DONE` sau owner kết luận `APPROVED WITH MINOR REVISIONS`.

## GOLDEN CHICKEN PROOF V1 — B02.2-PROOF

| Trường | Giá trị |
|---|---|
| Trạng thái proof | `REVIEW` — technical evidence đã hoàn tất; style/art owner approval vẫn `PENDING` |
| Phạm vi | Proof riêng 11 frame, không phải bộ production 92 frame |
| Metadata | [`PROOF_METADATA.json`](../proof/chicken/PROOF_METADATA.json) |
| Pixi preview | [`chicken-proof-preview.html`](chicken-proof-preview.html) |
| Stress preview | [`chicken-stress-preview.html`](chicken-stress-preview.html) |
| QA evidence | [`CHICKEN_PROOF_QA.json`](CHICKEN_PROOF_QA.json) |
| QA runner | [`run-chicken-proof-qa.mjs`](../../../tools/run-chicken-proof-qa.mjs) |
| Scale desktop | [`chicken-scale-proof-v1.png`](chicken-scale-proof-v1.png) |
| Scale mobile | [`chicken-scale-proof-mobile-v1.png`](chicken-scale-proof-mobile-v1.png) |

Proof bao gồm bốn hướng thật `NE`, `SE`, `SW`, `NW`; `SE/IDLE` có 2 khung; `SE/WALK` có 3 khung; `SE/EAT` có 3 khung. Khung proof thứ hai của EAT đại diện cho contract frame `2` và phát event `FEED_CONSUMED@2` ở lớp trình bày. Tổng cộng có 11 file PNG, mỗi file `256 × 256` RGBA, alpha bounding-box bottom được chuẩn hoá tại `y=230` để tương thích anchor `0.5,0.9`.

Pixi preview đã được chạy bằng Pixi thật qua HTTP local; canvas xuất hiện và event `FEED_CONSUMED@2` được quan sát ở bốn viewport `932×430`, `915×412`, `844×390`, `740×360`, không có lỗi tải tài nguyên hoặc tràn ngang. Stress preview đã kiểm tra các mốc `1`, `25`, `50`, `100` bản sao ở cùng bốn viewport; evidence ghi FPS, DPR và bộ nhớ JavaScript khi Chromium cung cấp số liệu.

Có thể tái chạy bằng `python -m http.server 4174 --bind 127.0.0.1` rồi `node tools/run-chicken-proof-qa.mjs`; đặt `CHROME_PATH` nếu Chrome không ở đường dẫn mặc định của máy.

Scale proof dùng terrain, luống lúa, ao nước, chuồng gà và nhà chính hiện tại làm placeholder để kiểm tra tỷ lệ. Các placeholder này chỉ là môi trường đo, không phải production art. Proof Chicken nằm ngoài `assets-src`, không được đưa vào production atlas và không thay đổi manifest/runtime. Metadata giữ `placeholder=true`, `production_ready=false`, `approved=false`; license và style/owner approval vẫn chờ xác nhận.

`B02.2-PROOF` được phép ở `REVIEW` như một checkpoint kỹ thuật độc lập. `B02.2-FULL` vẫn `QUEUED` và B02 production vẫn `BLOCKED`: chưa tạo đủ 92 frame, chưa thay placeholder production, chưa có style approval hoặc release approval. Sau checkpoint này phải dừng chờ owner duyệt trước khi tạo frame còn lại.

Phần proof 11 frame ở trên là Revision 1 và được giữ lại để truy vết. **Revision 2 bên dưới là bằng chứng hiện hành** cho B02.2-PROOF; không dùng số frame hoặc event index của Revision 1 để mở B02.2-FULL.

## GOLDEN CHICKEN PROOF V2 — REVISION 2

Owner đã duyệt **style direction với minor revisions**. Concept Chicken không đổi; palette, facial identity, mắt, mào, mỏ, silhouette, lighting top-left, shadow bottom-right, canvas `256×256` và anchor `0.5,0.9` được khóa. Revision 2 chỉ chuẩn hóa tỷ lệ, giảm micro-detail/high-frequency highlight và bổ sung motion proof; không redesign.

Scale normalization dùng phép fit **đồng nhất theo tỷ lệ** trước khi đặt vào canvas proof; không kéo giãn riêng trục X/Y và không thêm transform ở runtime. Đây là proof-source normalization để giữ proportions, không phải production atlas transform.

| Hạng mục review | Kết quả | Bằng chứng / ghi chú |
|---|---|---|
| Direction scale | **PASS** | [`chicken-direction-scale-comparison-v2.png`](chicken-direction-scale-comparison-v2.png); body proxy width `147–158 px`, mean `153.5 px` trong `±5%`; height `196 px` ở cả bốn hướng trong `±4%`; head guide `84–88 px`, mean `86.5 px` trong `±4%` |
| Micro-detail | **PASS** | [`chicken-runtime-size-comparison-v2.png`](chicken-runtime-size-comparison-v2.png); alpha-masked edge-energy proxy mean giảm `21.83%` trên 11 frame dùng chung; per-frame range được ghi trong QA, cần final visual owner review |
| Shading | **PASS** | Giảm specular/high-frequency highlight, giữ palette và soft volume; không chuyển thành flat/simple |
| EAT SE 5-frame motion | **PASS** | [`chicken-eat-se-strip-v2.png`](chicken-eat-se-strip-v2.png); đủ frame `0,1,2,3,4`, `10 FPS`, `loop=false`, `holdLast=true`; frame `0→1→2` hạ đầu/thân, `2` contact, `3→4` nâng lại |
| `FEED_CONSUMED` | **PASS** | Contract frame `2`, proof array index `2`; Pixi preview quan sát được `FEED_CONSUMED@2` |
| Baseline / anchor | **PASS** | Baseline target `y=230`, observed bottom `[230]`, jitter `0 px`, anchor marker `(128,230)` |
| Technical QA | **PASS** | [`CHICKEN_PROOF_QA.json`](CHICKEN_PROOF_QA.json) ghi browser/mobile/stress/image evidence và command matrix |

Revision 2 giữ identity lock cho eye design, comb topology, beak shape, feather palette, wing motif, tail motif, leg color và overall proportion. Proof gồm 13 frame: bốn direction key, `SE/IDLE` 2 frame, `SE/WALK` 3 frame và `SE/EAT` đủ 5 frame. Các frame nằm ngoài `assets-src`, không đưa vào atlas/manifest/runtime và không đặt `production_ready=true` hoặc `approved=true`.

Preview Pixi thật tại [`chicken-proof-preview.html`](chicken-proof-preview.html) chạy đủ EAT 5 frame; stress preview vẫn giữ các mốc `1/25/50/100` và bốn viewport mobile. QA chi tiết và hash frame nằm trong [`CHICKEN_PROOF_QA.json`](CHICKEN_PROOF_QA.json). Có thể xem scale desktop/mobile của môi trường placeholder tại [`chicken-scale-proof-v1.png`](chicken-scale-proof-v1.png) và [`chicken-scale-proof-mobile-v1.png`](chicken-scale-proof-mobile-v1.png); các ảnh này chỉ phục vụ kiểm tra tỷ lệ, không phải production art.

`B02.1`: **DONE — style direction approved with minor production notes**. `B02.2-PROOF Revision 2`: **REVIEW — technical evidence hoàn tất**. `style approval`: **PENDING FINAL OWNER REVIEW**. `B02.2-FULL`: **QUEUED**. `full 92 production`: **NOT STARTED**. Không mở Crop/Pond/Building và không tạo thêm production frame trước final owner review.
