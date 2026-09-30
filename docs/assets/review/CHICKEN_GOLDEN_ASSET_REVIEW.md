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

B02.2 vẫn giữ `BLOCKED` cho tới khi candidate 92 frame và evidence đầy đủ. B02.1 style guide vẫn ở `REVIEW` chờ asset/art owner xác nhận.

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
